"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { InjectionEntry } from '@/lib/types';

interface UseInjectionsReturn {
  todayInjections: InjectionEntry[];
  injectionEntries: InjectionEntry[];
  lastInjection: InjectionEntry | null;
  isLoading: boolean;
  createInjection: (medicationId: string, dose: number, siteId: string, date?: string, timestamp?: string, notes?: string) => Promise<void>;
  updateInjectionById: (id: string, updates: { dose?: number; siteId?: string; timestamp?: string; date?: string; notes?: string }) => Promise<void>;
  deleteInjection: (id: string) => Promise<void>;
  refreshInjections: () => Promise<void>;
}

export function useInjections(
  initialInjectionEntries: InjectionEntry[] | null = [],
  initialLastInjection: InjectionEntry | null = null
): UseInjectionsReturn {
  // Ensure arrays are never null
  const safeInitialEntries = initialInjectionEntries || [];

  // Calculate today's injections from all entries
  const today = new Date().toISOString().split('T')[0];
  const initialTodayInjections = safeInitialEntries.filter(e => e.date === today);

  const [todayInjections, setTodayInjections] = useState<InjectionEntry[]>(initialTodayInjections);
  const [injectionEntries, setInjectionEntries] = useState<InjectionEntry[]>(safeInitialEntries);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate last injection from all entries (use initialLastInjection as fallback for SSR)
  const lastInjection = injectionEntries.length > 0
    ? [...injectionEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : initialLastInjection;

  const refreshInjections = useCallback(async () => {
    try {
      const [todayResponse, allResponse] = await Promise.all([
        fetch('/api/injections'),
        fetch('/api/injections?all=true')
      ]);

      const todayResult = await todayResponse.json();
      const allResult = await allResponse.json();

      if (todayResult.success) {
        setTodayInjections(todayResult.data);
      }
      if (allResult.success) {
        setInjectionEntries(allResult.data);
      }
    } catch {
      console.error('Failed to refresh injection data');
    }
  }, []);

  const createInjection = useCallback(async (
    medicationId: string,
    dose: number,
    siteId: string,
    date?: string,
    timestamp?: string,
    notes?: string
  ) => {
    setIsLoading(true);

    const now = new Date().toISOString();
    const entryDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Create optimistic entry
    const optimisticEntry: InjectionEntry = {
      id: `temp-${Date.now()}`,
      author: '',
      date: entryDate,
      medicationId,
      dose,
      siteId,
      timestamp: timestamp || now,
      updatedAt: now
    };

    if (notes) {
      optimisticEntry.notes = notes;
    }

    // Optimistic update
    const previousTodayInjections = todayInjections;
    const previousEntries = injectionEntries;

    if (entryDate === today) {
      setTodayInjections(prev => [...prev, optimisticEntry]);
    }
    setInjectionEntries(prev => [...prev, optimisticEntry]);

    try {
      const response = await fetch('/api/injections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId, dose, siteId, date, timestamp, notes })
      });

      const result = await response.json();

      if (result.success) {
        // Replace optimistic entry with server response
        const replaceEntry = (entries: InjectionEntry[]) =>
          entries.map(e => e.id === optimisticEntry.id ? result.data : e);

        if (entryDate === today) {
          setTodayInjections(replaceEntry);
        }
        setInjectionEntries(replaceEntry);

        showSuccessToast('Injection logged');
      } else {
        // Rollback
        setTodayInjections(previousTodayInjections);
        setInjectionEntries(previousEntries);
        showErrorToast(result.error || 'Failed to log injection');
      }
    } catch {
      // Rollback
      setTodayInjections(previousTodayInjections);
      setInjectionEntries(previousEntries);
      showErrorToast('Failed to log injection');
    } finally {
      setIsLoading(false);
    }
  }, [todayInjections, injectionEntries]);

  const updateInjectionById = useCallback(async (
    id: string,
    updates: { dose?: number; siteId?: string; timestamp?: string; date?: string; notes?: string }
  ) => {
    setIsLoading(true);

    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Optimistic update
    const previousTodayInjections = todayInjections;
    const previousEntries = injectionEntries;

    const updateEntry = (entries: InjectionEntry[]) =>
      entries.map(e => e.id === id
        ? {
            ...e,
            ...(updates.dose !== undefined && { dose: updates.dose }),
            ...(updates.siteId !== undefined && { siteId: updates.siteId }),
            ...(updates.timestamp !== undefined && { timestamp: updates.timestamp }),
            ...(updates.date !== undefined && { date: updates.date }),
            ...(updates.notes !== undefined && { notes: updates.notes }),
            updatedAt: now
          }
        : e
      );

    // Handle date changes
    const entry = injectionEntries.find(e => e.id === id);
    const oldDate = entry?.date;
    const newDate = updates.date || oldDate;

    if (oldDate === today && newDate !== today) {
      // Moving from today to another day
      setTodayInjections(prev => prev.filter(e => e.id !== id));
    } else if (oldDate !== today && newDate === today) {
      // Moving to today
      const updatedEntry = entry ? { ...entry, ...updates, updatedAt: now } : null;
      if (updatedEntry) {
        setTodayInjections(prev => [...prev, updatedEntry as InjectionEntry]);
      }
    } else {
      setTodayInjections(updateEntry);
    }
    setInjectionEntries(updateEntry);

    try {
      const response = await fetch('/api/injections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });

      const result = await response.json();

      if (result.success) {
        // Replace with server response
        const replaceEntry = (entries: InjectionEntry[]) =>
          entries.map(e => e.id === id ? result.data : e);

        setTodayInjections(replaceEntry);
        setInjectionEntries(replaceEntry);

        showSuccessToast('Injection updated');
      } else {
        // Rollback
        setTodayInjections(previousTodayInjections);
        setInjectionEntries(previousEntries);
        showErrorToast(result.error || 'Failed to update injection');
      }
    } catch {
      // Rollback
      setTodayInjections(previousTodayInjections);
      setInjectionEntries(previousEntries);
      showErrorToast('Failed to update injection');
    } finally {
      setIsLoading(false);
    }
  }, [todayInjections, injectionEntries]);

  const deleteInjection = useCallback(async (id: string) => {
    setIsLoading(true);

    // Optimistic update
    const previousTodayInjections = todayInjections;
    const previousEntries = injectionEntries;

    const removeEntry = (entries: InjectionEntry[]) => entries.filter(e => e.id !== id);

    setTodayInjections(removeEntry);
    setInjectionEntries(removeEntry);

    try {
      const response = await fetch(`/api/injections?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Injection entry deleted');
      } else {
        // Rollback
        setTodayInjections(previousTodayInjections);
        setInjectionEntries(previousEntries);
        showErrorToast(result.error || 'Failed to delete injection');
      }
    } catch {
      // Rollback
      setTodayInjections(previousTodayInjections);
      setInjectionEntries(previousEntries);
      showErrorToast('Failed to delete injection');
    } finally {
      setIsLoading(false);
    }
  }, [todayInjections, injectionEntries]);

  return {
    todayInjections,
    injectionEntries,
    lastInjection,
    isLoading,
    createInjection,
    updateInjectionById,
    deleteInjection,
    refreshInjections
  };
}
