"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { PressureEntry } from '@/lib/types';

interface UsePressureReturn {
  todayPressure: PressureEntry[];
  pressureEntries: PressureEntry[];
  isLoading: boolean;
  createPressure: (systolic: number, diastolic: number, date?: string, timestamp?: string) => Promise<PressureEntry | undefined>;
  updatePressureById: (id: string, systolic: number, diastolic: number, timestamp?: string) => Promise<void>;
  deletePressure: (id: string) => Promise<void>;
  refreshPressure: () => Promise<void>;
}

export function usePressure(
  initialTodayPressure: PressureEntry[] = [],
  initialPressureEntries: PressureEntry[] = []
): UsePressureReturn {
  const [todayPressure, setTodayPressure] = useState<PressureEntry[]>(initialTodayPressure);
  const [pressureEntries, setPressureEntries] = useState<PressureEntry[]>(initialPressureEntries);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPressure = useCallback(async () => {
    try {
      const response = await fetch('/api/pressure');
      const result = await response.json();
      if (result.success) {
        setTodayPressure(result.data);
      }
    } catch {
      console.error('Failed to refresh pressure data');
    }
  }, []);

  const createPressure = useCallback(async (systolic: number, diastolic: number, date?: string, timestamp?: string) => {
    setIsLoading(true);

    const now = new Date().toISOString();
    const entryDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Create optimistic entry
    const optimisticEntry: PressureEntry = {
      id: `temp-${Date.now()}`,
      author: '',
      date: entryDate,
      systolic,
      diastolic,
      timestamp: timestamp || now,
      updatedAt: now
    };

    // Optimistic update
    const previousTodayPressure = todayPressure;
    const previousEntries = pressureEntries;

    if (entryDate === today) {
      setTodayPressure(prev => [...prev, optimisticEntry]);
    }
    setPressureEntries(prev => [...prev, optimisticEntry]);

    try {
      const response = await fetch('/api/pressure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systolic, diastolic, date, timestamp })
      });

      const result = await response.json();

      if (result.success) {
        // Replace optimistic entry with server response
        if (entryDate === today) {
          setTodayPressure(prev =>
            prev.map(e => e.id === optimisticEntry.id ? result.data : e)
          );
        }
        setPressureEntries(prev =>
          prev.map(e => e.id === optimisticEntry.id ? result.data : e)
        );

        showSuccessToast(`Blood pressure: ${systolic}/${diastolic}`);

        return result.data as PressureEntry;
      } else {
        // Rollback
        setTodayPressure(previousTodayPressure);
        setPressureEntries(previousEntries);
        showErrorToast(result.error || 'Failed to add pressure');
      }
    } catch {
      // Rollback
      setTodayPressure(previousTodayPressure);
      setPressureEntries(previousEntries);
      showErrorToast('Failed to add pressure');
    } finally {
      setIsLoading(false);
    }
  }, [todayPressure, pressureEntries]);

  const updatePressureById = useCallback(async (id: string, systolic: number, diastolic: number, timestamp?: string) => {
    setIsLoading(true);

    const now = new Date().toISOString();

    // Optimistic update
    const previousTodayPressure = todayPressure;
    const previousEntries = pressureEntries;

    const updateEntry = (entries: PressureEntry[]) =>
      entries.map(e => e.id === id
        ? { ...e, systolic, diastolic, timestamp: timestamp || e.timestamp, updatedAt: now }
        : e
      );

    setTodayPressure(updateEntry);
    setPressureEntries(updateEntry);

    try {
      const response = await fetch('/api/pressure', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, systolic, diastolic, timestamp })
      });

      const result = await response.json();

      if (result.success) {
        // Replace with server response
        const replaceEntry = (entries: PressureEntry[]) =>
          entries.map(e => e.id === id ? result.data : e);

        setTodayPressure(replaceEntry);
        setPressureEntries(replaceEntry);

        showSuccessToast('Blood pressure updated');
      } else {
        // Rollback
        setTodayPressure(previousTodayPressure);
        setPressureEntries(previousEntries);
        showErrorToast(result.error || 'Failed to update pressure');
      }
    } catch {
      // Rollback
      setTodayPressure(previousTodayPressure);
      setPressureEntries(previousEntries);
      showErrorToast('Failed to update pressure');
    } finally {
      setIsLoading(false);
    }
  }, [todayPressure, pressureEntries]);

  const deletePressure = useCallback(async (id: string) => {
    setIsLoading(true);

    // Optimistic update
    const previousTodayPressure = todayPressure;
    const previousEntries = pressureEntries;

    const removeEntry = (entries: PressureEntry[]) => entries.filter(e => e.id !== id);

    setTodayPressure(removeEntry);
    setPressureEntries(removeEntry);

    try {
      const response = await fetch(`/api/pressure?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Pressure entry deleted');
      } else {
        // Rollback
        setTodayPressure(previousTodayPressure);
        setPressureEntries(previousEntries);
        showErrorToast(result.error || 'Failed to delete pressure');
      }
    } catch {
      // Rollback
      setTodayPressure(previousTodayPressure);
      setPressureEntries(previousEntries);
      showErrorToast('Failed to delete pressure');
    } finally {
      setIsLoading(false);
    }
  }, [todayPressure, pressureEntries]);

  return {
    todayPressure,
    pressureEntries,
    isLoading,
    createPressure,
    updatePressureById,
    deletePressure,
    refreshPressure
  };
}
