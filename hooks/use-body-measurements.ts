"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { BodyMeasurementEntry } from '@/lib/types';

interface UseBodyMeasurementsReturn {
  entries: BodyMeasurementEntry[];
  isLoading: boolean;
  addEntry: (data: {
    timestamp: string;
    measurements: Record<string, number>;
    notes?: string;
  }) => Promise<BodyMeasurementEntry | undefined>;
  updateEntry: (
    id: string,
    data: { timestamp?: string; measurements?: Record<string, number>; notes?: string }
  ) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function sortDesc(entries: BodyMeasurementEntry[]): BodyMeasurementEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function useBodyMeasurements(
  initialEntries: BodyMeasurementEntry[] = []
): UseBodyMeasurementsReturn {
  const [entries, setEntries] = useState<BodyMeasurementEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/body-measurements');
      const result = await response.json();
      if (result.success) {
        setEntries(sortDesc(result.data));
      }
    } catch {
      console.error('Failed to refresh body measurements');
    }
  }, []);

  const addEntry = useCallback(
    async (data: { timestamp: string; measurements: Record<string, number>; notes?: string }) => {
      setIsLoading(true);
      const now = new Date().toISOString();
      const optimistic: BodyMeasurementEntry = {
        id: `temp-${Date.now()}`,
        author: '',
        timestamp: data.timestamp,
        measurements: data.measurements,
        notes: data.notes,
        updatedAt: now,
      };
      const previous = entries;
      setEntries(sortDesc([...entries, optimistic]));

      try {
        const response = await fetch('/api/body-measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.success) {
          setEntries((prev) =>
            sortDesc(prev.map((e) => (e.id === optimistic.id ? result.data : e)))
          );
          showSuccessToast('Measurement saved');
          return result.data as BodyMeasurementEntry;
        }
        setEntries(previous);
        showErrorToast(result.error || 'Failed to save measurement');
      } catch {
        setEntries(previous);
        showErrorToast('Failed to save measurement');
      } finally {
        setIsLoading(false);
      }
    },
    [entries]
  );

  const updateEntry = useCallback(
    async (
      id: string,
      data: { timestamp?: string; measurements?: Record<string, number>; notes?: string }
    ) => {
      setIsLoading(true);
      const previous = entries;
      const now = new Date().toISOString();
      setEntries((prev) =>
        sortDesc(
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...(data.timestamp ? { timestamp: data.timestamp } : {}),
                  ...(data.measurements ? { measurements: data.measurements } : {}),
                  ...(data.notes !== undefined ? { notes: data.notes || undefined } : {}),
                  updatedAt: now,
                }
              : e
          )
        )
      );

      try {
        const response = await fetch('/api/body-measurements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...data }),
        });
        const result = await response.json();
        if (result.success) {
          setEntries((prev) => sortDesc(prev.map((e) => (e.id === id ? result.data : e))));
          showSuccessToast('Measurement updated');
          return true;
        }
        setEntries(previous);
        showErrorToast(result.error || 'Failed to update measurement');
        return false;
      } catch {
        setEntries(previous);
        showErrorToast('Failed to update measurement');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [entries]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      setIsLoading(true);
      const previous = entries;
      setEntries((prev) => prev.filter((e) => e.id !== id));

      try {
        const response = await fetch(`/api/body-measurements?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (result.success) {
          showSuccessToast('Measurement deleted');
        } else {
          setEntries(previous);
          showErrorToast(result.error || 'Failed to delete measurement');
        }
      } catch {
        setEntries(previous);
        showErrorToast('Failed to delete measurement');
      } finally {
        setIsLoading(false);
      }
    },
    [entries]
  );

  return { entries, isLoading, addEntry, updateEntry, deleteEntry, refresh };
}
