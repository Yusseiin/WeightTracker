"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { useTranslation } from '@/hooks/use-translation';
import type { WeightEntry, EntryFormData, UserSettings } from '@/lib/types';
import { checkWeeklyGoalAchievement, checkMonthlyGoalAchievement } from '@/lib/goals';

interface UseWeightEntriesReturn {
  entries: WeightEntry[];
  settings: UserSettings;
  isLoading: boolean;
  deletingId: string | null;
  addEntry: (data: EntryFormData) => Promise<WeightEntry | undefined>;
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
  const { t } = useTranslation();

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
        const newEntry = result.data as WeightEntry;

        // Check for weight goal achievements before updating state
        const weeklyGoal = settings.goals?.weeklyWeightGoal;
        const monthlyGoal = settings.goals?.monthlyWeightGoal;
        const weekStartsOn = settings.goals?.weekStartsOn ?? 1;

        const weeklyAchievement = weeklyGoal
          ? checkWeeklyGoalAchievement(entries, newEntry, weeklyGoal, weekStartsOn)
          : null;
        const monthlyAchievement = monthlyGoal
          ? checkMonthlyGoalAchievement(entries, newEntry, monthlyGoal)
          : null;

        // Add new entry to the beginning (sorted by timestamp desc)
        setEntries(prev => {
          const newEntries = [newEntry, ...prev];
          // Re-sort to ensure proper order
          return newEntries.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });

        // Show motivational toasts for goal achievements
        if (monthlyAchievement?.achieved) {
          showSuccessToast(`🏆 ${monthlyAchievement.message}`);
        } else if (weeklyAchievement?.achieved) {
          showSuccessToast(`🔥 ${weeklyAchievement.message}`);
        } else {
          showSuccessToast(t('toasts.weight.added'));
        }

        return newEntry;
      } else {
        showErrorToast(result.error || t('toasts.weight.addError'));
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toasts.weight.addError');
      showErrorToast(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [entries, settings, t]);

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
        showSuccessToast(t('toasts.weight.updated'));
      } else {
        // Rollback on failure
        setEntries(previousEntries);
        showErrorToast(result.error || t('toasts.weight.updateError'));
      }
    } catch {
      // Rollback on error
      setEntries(previousEntries);
      showErrorToast(t('toasts.weight.updateError'));
    }
  }, [entries, t]);

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
        showSuccessToast(t('toasts.weight.deleted'));
      } else {
        // Rollback on failure
        setEntries(previousEntries);
        showErrorToast(result.error || t('toasts.weight.deleteError'));
      }
    } catch {
      // Rollback on error
      setEntries(previousEntries);
      showErrorToast(t('toasts.weight.deleteError'));
    } finally {
      setDeletingId(null);
    }
  }, [entries, t]);

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
        showSuccessToast(t('toasts.weight.settingsUpdated'));
      } else {
        // Rollback on failure
        setSettings(previousSettings);
        showErrorToast(result.error || t('toasts.weight.settingsError'));
      }
    } catch {
      // Rollback on error
      setSettings(previousSettings);
      showErrorToast(t('toasts.weight.settingsError'));
    } finally {
      setIsLoading(false);
    }
  }, [settings, t]);

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
