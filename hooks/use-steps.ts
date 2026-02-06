"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { StepsEntry } from '@/lib/types';

interface UseStepsReturn {
  todaySteps: StepsEntry[];
  stepsEntries: StepsEntry[];
  isLoading: boolean;
  createSteps: (steps: number, date?: string, timestamp?: string) => Promise<StepsEntry | undefined>;
  updateStepsById: (id: string, steps: number, timestamp?: string) => Promise<void>;
  deleteSteps: (id: string) => Promise<void>;
  refreshSteps: () => Promise<void>;
}

export function useSteps(
  initialTodaySteps: StepsEntry[] = [],
  initialStepsEntries: StepsEntry[] = []
): UseStepsReturn {
  const [todaySteps, setTodaySteps] = useState<StepsEntry[]>(initialTodaySteps);
  const [stepsEntries, setStepsEntries] = useState<StepsEntry[]>(initialStepsEntries);
  const [isLoading, setIsLoading] = useState(false);

  const refreshSteps = useCallback(async () => {
    try {
      const response = await fetch('/api/steps');
      const result = await response.json();
      if (result.success) {
        setTodaySteps(result.data);
      }
    } catch {
      console.error('Failed to refresh steps data');
    }
  }, []);

  const createSteps = useCallback(async (steps: number, date?: string, timestamp?: string) => {
    setIsLoading(true);

    const now = new Date().toISOString();
    const entryDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Create optimistic entry
    const optimisticEntry: StepsEntry = {
      id: `temp-${Date.now()}`,
      author: '',
      date: entryDate,
      steps,
      timestamp: timestamp || now,
      updatedAt: now
    };

    // Optimistic update
    const previousTodaySteps = todaySteps;
    const previousEntries = stepsEntries;

    if (entryDate === today) {
      setTodaySteps(prev => [...prev, optimisticEntry]);
    }
    setStepsEntries(prev => [...prev, optimisticEntry]);

    try {
      const response = await fetch('/api/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, date, timestamp })
      });

      const result = await response.json();

      if (result.success) {
        // Replace optimistic entry with server response
        if (entryDate === today) {
          setTodaySteps(prev =>
            prev.map(e => e.id === optimisticEntry.id ? result.data : e)
          );
        }
        setStepsEntries(prev =>
          prev.map(e => e.id === optimisticEntry.id ? result.data : e)
        );

        showSuccessToast(`Steps: ${steps.toLocaleString()}`);

        return result.data as StepsEntry;
      } else {
        // Rollback
        setTodaySteps(previousTodaySteps);
        setStepsEntries(previousEntries);
        showErrorToast(result.error || 'Failed to add steps');
      }
    } catch {
      // Rollback
      setTodaySteps(previousTodaySteps);
      setStepsEntries(previousEntries);
      showErrorToast('Failed to add steps');
    } finally {
      setIsLoading(false);
    }
  }, [todaySteps, stepsEntries]);

  const updateStepsById = useCallback(async (id: string, steps: number, timestamp?: string) => {
    setIsLoading(true);

    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Optimistic update
    const previousTodaySteps = todaySteps;
    const previousEntries = stepsEntries;

    const updateEntry = (entries: StepsEntry[]) =>
      entries.map(e => e.id === id
        ? { ...e, steps, timestamp: timestamp || e.timestamp, updatedAt: now }
        : e
      );

    setTodaySteps(updateEntry);
    setStepsEntries(updateEntry);

    try {
      const response = await fetch('/api/steps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, steps, timestamp })
      });

      const result = await response.json();

      if (result.success) {
        // Replace with server response
        const replaceEntry = (entries: StepsEntry[]) =>
          entries.map(e => e.id === id ? result.data : e);

        setTodaySteps(replaceEntry);
        setStepsEntries(replaceEntry);

        showSuccessToast('Steps updated');
      } else {
        // Rollback
        setTodaySteps(previousTodaySteps);
        setStepsEntries(previousEntries);
        showErrorToast(result.error || 'Failed to update steps');
      }
    } catch {
      // Rollback
      setTodaySteps(previousTodaySteps);
      setStepsEntries(previousEntries);
      showErrorToast('Failed to update steps');
    } finally {
      setIsLoading(false);
    }
  }, [todaySteps, stepsEntries]);

  const deleteSteps = useCallback(async (id: string) => {
    setIsLoading(true);

    // Optimistic update
    const previousTodaySteps = todaySteps;
    const previousEntries = stepsEntries;

    const removeEntry = (entries: StepsEntry[]) => entries.filter(e => e.id !== id);

    setTodaySteps(removeEntry);
    setStepsEntries(removeEntry);

    try {
      const response = await fetch(`/api/steps?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Steps entry deleted');
      } else {
        // Rollback
        setTodaySteps(previousTodaySteps);
        setStepsEntries(previousEntries);
        showErrorToast(result.error || 'Failed to delete steps');
      }
    } catch {
      // Rollback
      setTodaySteps(previousTodaySteps);
      setStepsEntries(previousEntries);
      showErrorToast('Failed to delete steps');
    } finally {
      setIsLoading(false);
    }
  }, [todaySteps, stepsEntries]);

  return {
    todaySteps,
    stepsEntries,
    isLoading,
    createSteps,
    updateStepsById,
    deleteSteps,
    refreshSteps
  };
}
