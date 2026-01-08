"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { WaterEntry } from '@/lib/types';

interface UseWaterReturn {
  todayWater: WaterEntry | null;
  waterEntries: WaterEntry[];
  isLoading: boolean;
  addWater: (amount: number) => Promise<void>;
  resetWater: () => Promise<void>;
  refreshWater: () => Promise<void>;
  updateWater: (date: string, amount: number) => Promise<void>;
}

export function useWater(initialWater: WaterEntry | null, initialWaterEntries: WaterEntry[] = []): UseWaterReturn {
  const [todayWater, setTodayWater] = useState<WaterEntry | null>(initialWater);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>(initialWaterEntries);
  const [isLoading, setIsLoading] = useState(false);

  const refreshWater = useCallback(async () => {
    try {
      const response = await fetch('/api/water');
      const result = await response.json();
      if (result.success) {
        setTodayWater(result.data);
      }
    } catch {
      console.error('Failed to refresh water data');
    }
  }, []);

  const addWater = useCallback(async (amount: number) => {
    setIsLoading(true);

    // Optimistic update
    const previousWater = todayWater;
    const optimisticAmount = (todayWater?.amount || 0) + amount;
    setTodayWater(prev => prev
      ? { ...prev, amount: optimisticAmount, updatedAt: new Date().toISOString() }
      : { id: 'temp', author: '', date: '', amount: optimisticAmount, updatedAt: new Date().toISOString() }
    );

    try {
      const response = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const result = await response.json();

      if (result.success) {
        setTodayWater(result.data);
        // Update waterEntries with the new/updated entry
        setWaterEntries(prev => {
          const existingIndex = prev.findIndex(e => e.date === result.data.date);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = result.data;
            return updated;
          }
          return [...prev, result.data];
        });
        showSuccessToast(`Added ${amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}`);
      } else {
        // Rollback
        setTodayWater(previousWater);
        showErrorToast(result.error || 'Failed to add water');
      }
    } catch {
      // Rollback
      setTodayWater(previousWater);
      showErrorToast('Failed to add water');
    } finally {
      setIsLoading(false);
    }
  }, [todayWater]);

  const resetWater = useCallback(async () => {
    setIsLoading(true);

    // Optimistic update
    const previousWater = todayWater;
    setTodayWater(prev => prev ? { ...prev, amount: 0, updatedAt: new Date().toISOString() } : null);

    try {
      const response = await fetch('/api/water', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setTodayWater(result.data);
        // Update waterEntries with the reset entry
        setWaterEntries(prev => {
          const existingIndex = prev.findIndex(e => e.date === result.data.date);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = result.data;
            return updated;
          }
          return [...prev, result.data];
        });
        showSuccessToast('Water reset to 0');
      } else {
        // Rollback
        setTodayWater(previousWater);
        showErrorToast(result.error || 'Failed to reset water');
      }
    } catch {
      // Rollback
      setTodayWater(previousWater);
      showErrorToast('Failed to reset water');
    } finally {
      setIsLoading(false);
    }
  }, [todayWater]);

  const updateWater = useCallback(async (date: string, amount: number) => {
    setIsLoading(true);

    // Optimistic update
    const previousEntries = waterEntries;
    const previousTodayWater = todayWater;

    setWaterEntries(prev => {
      const existingIndex = prev.findIndex(e => e.date === date);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], amount, updatedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, { id: 'temp', author: '', date, amount, updatedAt: new Date().toISOString() }];
    });

    // Update todayWater if we're updating today's entry
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      setTodayWater(prev => prev
        ? { ...prev, amount, updatedAt: new Date().toISOString() }
        : { id: 'temp', author: '', date, amount, updatedAt: new Date().toISOString() }
      );
    }

    try {
      const response = await fetch('/api/water', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, amount })
      });

      const result = await response.json();

      if (result.success) {
        // Update waterEntries with the server response
        setWaterEntries(prev => {
          const existingIndex = prev.findIndex(e => e.date === result.data.date);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = result.data;
            return updated;
          }
          return [...prev, result.data];
        });

        // Update todayWater if applicable
        if (date === today) {
          setTodayWater(result.data);
        }

        showSuccessToast('Water updated');
      } else {
        // Rollback
        setWaterEntries(previousEntries);
        setTodayWater(previousTodayWater);
        showErrorToast(result.error || 'Failed to update water');
      }
    } catch {
      // Rollback
      setWaterEntries(previousEntries);
      setTodayWater(previousTodayWater);
      showErrorToast('Failed to update water');
    } finally {
      setIsLoading(false);
    }
  }, [waterEntries, todayWater]);

  return {
    todayWater,
    waterEntries,
    isLoading,
    addWater,
    resetWater,
    refreshWater,
    updateWater
  };
}
