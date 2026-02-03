"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import type { MedicationEntry } from '@/lib/types';

interface UseMedicationsReturn {
  todayMedications: MedicationEntry[];
  medicationEntries: MedicationEntry[];
  isLoading: boolean;
  createMedication: (medicationId: string, taken: boolean, date?: string, timestamp?: string, dose?: number | null) => Promise<void>;
  updateMedicationById: (id: string, taken: boolean, timestamp?: string, date?: string, dose?: number | null) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  refreshMedications: () => Promise<void>;
}

export function useMedications(
  initialTodayMedications: MedicationEntry[] = [],
  initialMedicationEntries: MedicationEntry[] = []
): UseMedicationsReturn {
  const [todayMedications, setTodayMedications] = useState<MedicationEntry[]>(initialTodayMedications);
  const [medicationEntries, setMedicationEntries] = useState<MedicationEntry[]>(initialMedicationEntries);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMedications = useCallback(async () => {
    try {
      const response = await fetch('/api/medications');
      const result = await response.json();
      if (result.success) {
        setTodayMedications(result.data);
      }
    } catch {
      console.error('Failed to refresh medication data');
    }
  }, []);

  const createMedication = useCallback(async (medicationId: string, taken: boolean, date?: string, timestamp?: string, dose?: number | null) => {
    setIsLoading(true);

    const now = new Date().toISOString();
    const entryDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Check if entry already exists for this medication on this date
    const existingEntry = medicationEntries.find(
      e => e.date === entryDate && e.medicationId === medicationId
    );

    // Create optimistic entry
    const optimisticEntry: MedicationEntry = {
      id: existingEntry?.id || `temp-${Date.now()}`,
      author: '',
      date: entryDate,
      medicationId,
      taken,
      timestamp: timestamp || now,
      updatedAt: now,
      ...(dose !== undefined && dose !== null && { dose })
    };

    // Optimistic update
    const previousTodayMedications = todayMedications;
    const previousEntries = medicationEntries;

    if (existingEntry) {
      // Update existing
      const updateEntry = (entries: MedicationEntry[]) =>
        entries.map(e => (e.date === entryDate && e.medicationId === medicationId) ? optimisticEntry : e);

      if (entryDate === today) {
        setTodayMedications(updateEntry);
      }
      setMedicationEntries(updateEntry);
    } else {
      // Add new
      if (entryDate === today) {
        setTodayMedications(prev => [...prev, optimisticEntry]);
      }
      setMedicationEntries(prev => [...prev, optimisticEntry]);
    }

    try {
      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId, taken, date, timestamp, dose })
      });

      const result = await response.json();

      if (result.success) {
        // Replace optimistic entry with server response
        const replaceOrAdd = (entries: MedicationEntry[]) => {
          const idx = entries.findIndex(e => e.id === optimisticEntry.id ||
            (e.date === entryDate && e.medicationId === medicationId));
          if (idx !== -1) {
            return entries.map((e, i) => i === idx ? result.data : e);
          }
          return [...entries, result.data];
        };

        if (entryDate === today) {
          setTodayMedications(replaceOrAdd);
        }
        setMedicationEntries(replaceOrAdd);

        showSuccessToast(taken ? 'Medication taken' : 'Medication updated');
      } else {
        // Rollback
        setTodayMedications(previousTodayMedications);
        setMedicationEntries(previousEntries);
        showErrorToast(result.error || 'Failed to update medication');
      }
    } catch {
      // Rollback
      setTodayMedications(previousTodayMedications);
      setMedicationEntries(previousEntries);
      showErrorToast('Failed to update medication');
    } finally {
      setIsLoading(false);
    }
  }, [todayMedications, medicationEntries]);

  const updateMedicationById = useCallback(async (id: string, taken: boolean, timestamp?: string, date?: string, dose?: number | null) => {
    setIsLoading(true);

    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Optimistic update
    const previousTodayMedications = todayMedications;
    const previousEntries = medicationEntries;

    const updateEntry = (entries: MedicationEntry[]) =>
      entries.map(e => {
        if (e.id !== id) return e;
        const updated = { ...e, taken, timestamp: timestamp || e.timestamp, date: date || e.date, updatedAt: now };
        if (dose !== undefined) {
          if (dose === null) {
            delete updated.dose;
          } else {
            updated.dose = dose;
          }
        }
        return updated;
      });

    // If date changed, we need to handle todayMedications specially
    const entry = medicationEntries.find(e => e.id === id);
    const oldDate = entry?.date;
    const newDate = date || oldDate;

    if (oldDate === today && newDate !== today) {
      // Moving from today to another day - remove from todayMedications
      setTodayMedications(prev => prev.filter(e => e.id !== id));
    } else if (oldDate !== today && newDate === today) {
      // Moving to today - add to todayMedications
      const updatedEntry = entry ? { ...entry, taken, timestamp: timestamp || entry.timestamp, date: newDate, updatedAt: now } : null;
      if (updatedEntry) {
        setTodayMedications(prev => [...prev, updatedEntry]);
      }
    } else {
      setTodayMedications(updateEntry);
    }
    setMedicationEntries(updateEntry);

    try {
      const response = await fetch('/api/medications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, taken, timestamp, date, dose })
      });

      const result = await response.json();

      if (result.success) {
        // Replace with server response
        const replaceEntry = (entries: MedicationEntry[]) =>
          entries.map(e => e.id === id ? result.data : e);

        setTodayMedications(replaceEntry);
        setMedicationEntries(replaceEntry);

        showSuccessToast('Medication updated');
      } else {
        // Rollback
        setTodayMedications(previousTodayMedications);
        setMedicationEntries(previousEntries);
        showErrorToast(result.error || 'Failed to update medication');
      }
    } catch {
      // Rollback
      setTodayMedications(previousTodayMedications);
      setMedicationEntries(previousEntries);
      showErrorToast('Failed to update medication');
    } finally {
      setIsLoading(false);
    }
  }, [todayMedications, medicationEntries]);

  const deleteMedication = useCallback(async (id: string) => {
    setIsLoading(true);

    // Optimistic update
    const previousTodayMedications = todayMedications;
    const previousEntries = medicationEntries;

    const removeEntry = (entries: MedicationEntry[]) => entries.filter(e => e.id !== id);

    setTodayMedications(removeEntry);
    setMedicationEntries(removeEntry);

    try {
      const response = await fetch(`/api/medications?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Medication entry deleted');
      } else {
        // Rollback
        setTodayMedications(previousTodayMedications);
        setMedicationEntries(previousEntries);
        showErrorToast(result.error || 'Failed to delete medication');
      }
    } catch {
      // Rollback
      setTodayMedications(previousTodayMedications);
      setMedicationEntries(previousEntries);
      showErrorToast('Failed to delete medication');
    } finally {
      setIsLoading(false);
    }
  }, [todayMedications, medicationEntries]);

  return {
    todayMedications,
    medicationEntries,
    isLoading,
    createMedication,
    updateMedicationById,
    deleteMedication,
    refreshMedications
  };
}
