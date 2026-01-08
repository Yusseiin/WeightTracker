"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { WeightEntry, EntryFormData, UserSettings } from '@/lib/types';

interface UseWeightEntriesReturn {
  entries: WeightEntry[];
  settings: UserSettings;
  isLoading: boolean;
  deletingId: string | null;
  addEntry: (data: EntryFormData) => Promise<void>;
  updateEntry: (id: string, data: Partial<EntryFormData>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  refreshEntries: () => Promise<void>;
}

export function useWeightEntries(
  initialEntries: WeightEntry[],
  initialSettings: UserSettings
): UseWeightEntriesReturn {
  const [entries, setEntries] = useState<WeightEntry[]>(initialEntries);
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/entries');
      const result = await response.json();
      if (result.success) {
        setEntries(result.data);
      }
    } catch (error) {
      console.error('Failed to refresh entries:', error);
    }
  }, []);

  const addEntry = useCallback(async (data: EntryFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        // Add new entry to the beginning (sorted by timestamp desc)
        setEntries(prev => {
          const newEntries = [result.data, ...prev];
          // Re-sort to ensure proper order
          return newEntries.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
        showSuccessToast('Entry added successfully!');
      } else {
        showErrorToast(result.error || 'Failed to add entry');
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add entry';
      showErrorToast(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateEntry = useCallback(async (id: string, data: Partial<EntryFormData>) => {
    const previousEntries = entries;

    // Optimistic update
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, ...data } : e
    ));

    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        // Update with server response and re-sort
        setEntries(prev => {
          const updated = prev.map(e => e.id === id ? result.data : e);
          return updated.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
        showSuccessToast('Entry updated');
      } else {
        // Rollback on failure
        setEntries(previousEntries);
        showErrorToast(result.error || 'Failed to update entry');
      }
    } catch {
      // Rollback on error
      setEntries(previousEntries);
      showErrorToast('Failed to update entry');
    }
  }, [entries]);

  const deleteEntry = useCallback(async (id: string) => {
    setDeletingId(id);

    // Optimistic update
    const previousEntries = entries;
    setEntries(prev => prev.filter(e => e.id !== id));

    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Entry deleted');
      } else {
        // Rollback on failure
        setEntries(previousEntries);
        showErrorToast(result.error || 'Failed to delete entry');
      }
    } catch (error) {
      // Rollback on error
      setEntries(previousEntries);
      showErrorToast('Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  }, [entries]);

  const updateSettings = useCallback(async (data: Partial<UserSettings>) => {
    setIsLoading(true);
    const previousSettings = settings;

    // Optimistic update
    setSettings(prev => ({ ...prev, ...data }));

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        showSuccessToast('Settings updated');
      } else {
        // Rollback on failure
        setSettings(previousSettings);
        showErrorToast(result.error || 'Failed to update settings');
      }
    } catch (error) {
      // Rollback on error
      setSettings(previousSettings);
      showErrorToast('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  return {
    entries,
    settings,
    isLoading,
    deletingId,
    addEntry,
    updateEntry,
    deleteEntry,
    updateSettings,
    refreshEntries
  };
}
