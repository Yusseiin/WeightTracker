"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { WaterDayTotal, WaterEntry } from '@/lib/types';
import { getProgressMilestone, calculateRawProgress } from '@/lib/goals';

interface UseWaterReturn {
  todayWater: WaterDayTotal | null;
  waterEntries: WaterDayTotal[];
  waterInserts: WaterEntry[];
  isLoading: boolean;
  addWater: (amount: number) => Promise<void>;
  resetWater: () => Promise<void>;
  refreshWater: () => Promise<void>;
  updateWater: (date: string, amount: number) => Promise<void>;
  createWaterEntry: (amount: number, date?: string, timestamp?: string) => Promise<void>;
  updateWaterById: (id: string, amount: number, timestamp?: string) => Promise<void>;
  deleteWaterById: (id: string) => Promise<void>;
}

export function useWater(
  initialWater: WaterDayTotal | null,
  initialWaterEntries: WaterDayTotal[] = [],
  dailyWaterGoal?: number | null,
  initialWaterInserts: WaterEntry[] = []
): UseWaterReturn {
  const [todayWater, setTodayWater] = useState<WaterDayTotal | null>(initialWater);
  const [waterEntries, setWaterEntries] = useState<WaterDayTotal[]>(initialWaterEntries);
  const [waterInserts, setWaterInserts] = useState<WaterEntry[]>(initialWaterInserts);
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
      ? { ...prev, amount: optimisticAmount }
      : { date: new Date().toISOString().split('T')[0], amount: optimisticAmount }
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

        // Check for milestone achievements if there's a goal
        if (dailyWaterGoal && dailyWaterGoal > 0) {
          const prevAmount = previousWater?.amount || 0;
          const newAmount = result.data.amount;
          const prevPercent = calculateRawProgress(prevAmount, dailyWaterGoal);
          const newPercent = calculateRawProgress(newAmount, dailyWaterGoal);

          const milestone = getProgressMilestone(prevPercent, newPercent);
          if (milestone) {
            showSuccessToast(`${milestone.emoji} ${milestone.message}`);
          } else {
            showSuccessToast(`Added ${amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}`);
          }
        } else {
          showSuccessToast(`Added ${amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}`);
        }
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
  }, [todayWater, dailyWaterGoal]);

  const resetWater = useCallback(async () => {
    setIsLoading(true);

    // Optimistic update
    const previousWater = todayWater;
    setTodayWater(prev => prev ? { ...prev, amount: 0 } : null);

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
        updated[existingIndex] = { ...updated[existingIndex], amount };
        return updated;
      }
      return [...prev, { date, amount }];
    });

    // Update todayWater if we're updating today's entry
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      setTodayWater(prev => prev
        ? { ...prev, amount }
        : { date, amount }
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

  // The individual inserts are the source of truth in history mode. Deriving the
  // daily totals + today's total from them lets every view update instantly and
  // keeps a single authoritative reload path.
  const recomputeFromInserts = useCallback((inserts: WaterEntry[]) => {
    setWaterInserts(inserts);
    const totalsByDate = new Map<string, number>();
    for (const e of inserts) {
      totalsByDate.set(e.date, (totalsByDate.get(e.date) ?? 0) + e.amount);
    }
    const totals = Array.from(totalsByDate, ([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setWaterEntries(totals);
    const today = new Date().toISOString().split('T')[0];
    setTodayWater(totals.find(t => t.date === today) ?? { date: today, amount: 0 });
  }, []);

  // Reload the individual inserts from the server and re-derive every view.
  const refreshWaterData = useCallback(async () => {
    try {
      const res = await fetch('/api/water?entries=true');
      const result = await res.json();
      if (result.success) recomputeFromInserts(result.data);
    } catch {
      console.error('Failed to refresh water data');
    }
  }, [recomputeFromInserts]);

  const createWaterEntry = useCallback(async (amount: number, date?: string, timestamp?: string) => {
    // Optimistically add the entry so every view updates immediately
    const previous = waterInserts;
    const now = new Date().toISOString();
    const optimistic: WaterEntry = {
      id: `temp-${now}-${Math.random().toString(36).slice(2, 8)}`,
      author: '',
      date: date || now.split('T')[0],
      amount,
      timestamp: timestamp || now,
      updatedAt: now,
    };
    recomputeFromInserts([...previous, optimistic]);
    setIsLoading(true);
    try {
      const response = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date, timestamp })
      });
      const result = await response.json();
      if (result.success) {
        await refreshWaterData(); // reconcile the server-assigned id (single fetch)
        showSuccessToast(`Added ${amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}`);
      } else {
        recomputeFromInserts(previous);
        showErrorToast(result.error || 'Failed to add water');
      }
    } catch {
      recomputeFromInserts(previous);
      showErrorToast('Failed to add water');
    } finally {
      setIsLoading(false);
    }
  }, [waterInserts, recomputeFromInserts, refreshWaterData]);

  const updateWaterById = useCallback(async (id: string, amount: number, timestamp?: string) => {
    const previous = waterInserts;
    const optimistic = previous.map(e =>
      e.id === id
        ? { ...e, amount, ...(timestamp ? { timestamp } : {}), updatedAt: new Date().toISOString() }
        : e
    );
    recomputeFromInserts(optimistic);
    setIsLoading(true);
    try {
      const response = await fetch('/api/water', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, amount, timestamp })
      });
      const result = await response.json();
      if (result.success) {
        await refreshWaterData();
        showSuccessToast('Water updated');
      } else {
        recomputeFromInserts(previous);
        showErrorToast(result.error || 'Failed to update water');
      }
    } catch {
      recomputeFromInserts(previous);
      showErrorToast('Failed to update water');
    } finally {
      setIsLoading(false);
    }
  }, [waterInserts, recomputeFromInserts, refreshWaterData]);

  const deleteWaterById = useCallback(async (id: string) => {
    // Optimistic removal is authoritative (the id is gone), so no refetch needed
    const previous = waterInserts;
    recomputeFromInserts(previous.filter(e => e.id !== id));
    setIsLoading(true);
    try {
      const response = await fetch(`/api/water?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        showSuccessToast('Water entry deleted');
      } else {
        recomputeFromInserts(previous);
        showErrorToast(result.error || 'Failed to delete water entry');
      }
    } catch {
      recomputeFromInserts(previous);
      showErrorToast('Failed to delete water entry');
    } finally {
      setIsLoading(false);
    }
  }, [waterInserts, recomputeFromInserts]);

  return {
    todayWater,
    waterEntries,
    waterInserts,
    isLoading,
    addWater,
    resetWater,
    refreshWater,
    updateWater,
    createWaterEntry,
    updateWaterById,
    deleteWaterById
  };
}
