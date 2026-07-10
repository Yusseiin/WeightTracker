"use client";

import { useState, useCallback } from 'react';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import { useTranslation } from '@/hooks/use-translation';
import type { WaterDayTotal, WaterEntry, WaterUnit } from '@/lib/types';
import { getProgressMilestone, calculateRawProgress } from '@/lib/goals';
import { formatWaterAmount } from '@/lib/water-utils';

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
  initialWaterInserts: WaterEntry[] = [],
  waterUnit: WaterUnit = 'ml'
): UseWaterReturn {
  const [todayWater, setTodayWater] = useState<WaterDayTotal | null>(initialWater);
  const [waterEntries, setWaterEntries] = useState<WaterDayTotal[]>(initialWaterEntries);
  const [waterInserts, setWaterInserts] = useState<WaterEntry[]>(initialWaterInserts);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

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
            showSuccessToast(t('toasts.water.added', { amount: formatWaterAmount(amount, waterUnit) }));
          }
        } else {
          showSuccessToast(t('toasts.water.added', { amount: formatWaterAmount(amount, waterUnit) }));
        }
      } else {
        // Rollback
        setTodayWater(previousWater);
        showErrorToast(result.error || t('toasts.water.addError'));
      }
    } catch {
      // Rollback
      setTodayWater(previousWater);
      showErrorToast(t('toasts.water.addError'));
    } finally {
      setIsLoading(false);
    }
  }, [todayWater, dailyWaterGoal, waterUnit, t]);

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
        showSuccessToast(t('toasts.water.reset'));
      } else {
        // Rollback
        setTodayWater(previousWater);
        showErrorToast(result.error || t('toasts.water.resetError'));
      }
    } catch {
      // Rollback
      setTodayWater(previousWater);
      showErrorToast(t('toasts.water.resetError'));
    } finally {
      setIsLoading(false);
    }
  }, [todayWater, t]);

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

    // Update todayWater if we're updating today's entry. Use the server's current
    // day (from the last known today) rather than the browser's UTC date, which
    // can disagree with the server timezone near a day boundary.
    const today = todayWater?.date;
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

        showSuccessToast(t('toasts.water.updated'));
      } else {
        // Rollback
        setWaterEntries(previousEntries);
        setTodayWater(previousTodayWater);
        showErrorToast(result.error || t('toasts.water.updateError'));
      }
    } catch {
      // Rollback
      setWaterEntries(previousEntries);
      setTodayWater(previousTodayWater);
      showErrorToast(t('toasts.water.updateError'));
    } finally {
      setIsLoading(false);
    }
  }, [waterEntries, todayWater, t]);

  // Aggregate the individual inserts into the daily-totals list + the inserts list.
  // NOTE: today's total is deliberately NOT derived here. The client can't reliably
  // know the server's timezone "today" (deriving it from the browser's UTC date made
  // the dashboard meter flip to 0 in the evening for negative-UTC users), so today's
  // total is always taken from the server via GET /api/water instead.
  const applyInserts = useCallback((inserts: WaterEntry[]) => {
    setWaterInserts(inserts);
    const totalsByDate = new Map<string, number>();
    for (const e of inserts) {
      totalsByDate.set(e.date, (totalsByDate.get(e.date) ?? 0) + e.amount);
    }
    setWaterEntries(
      Array.from(totalsByDate, ([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  }, []);

  // Reload the inserts (history table/chart) and today's total (server-authoritative,
  // timezone-correct) together, then re-derive every view.
  const refreshWaterData = useCallback(async () => {
    try {
      const [todayRes, entriesRes] = await Promise.all([
        fetch('/api/water'),
        fetch('/api/water?entries=true'),
      ]);
      const [today, entries] = await Promise.all([todayRes.json(), entriesRes.json()]);
      if (entries.success) applyInserts(entries.data);
      if (today.success) setTodayWater(today.data);
    } catch {
      console.error('Failed to refresh water data');
    }
  }, [applyInserts]);

  const createWaterEntry = useCallback(async (amount: number, date?: string, timestamp?: string) => {
    // Optimistically add the entry so the history table/chart update immediately
    const previousInserts = waterInserts;
    const previousToday = todayWater;
    const now = new Date().toISOString();
    // Bucket the optimistic entry under the server's current day (from the last known
    // today), not the browser's UTC date.
    const serverToday = todayWater?.date;
    const optimistic: WaterEntry = {
      id: `temp-${now}-${Math.random().toString(36).slice(2, 8)}`,
      author: '',
      date: date || serverToday || now.split('T')[0],
      amount,
      timestamp: timestamp || now,
      updatedAt: now,
    };
    applyInserts([...previousInserts, optimistic]);
    // Optimistically bump the dashboard meter only when the entry is for the current day
    if (!date || date === serverToday) {
      setTodayWater(prev => (prev ? { ...prev, amount: prev.amount + amount } : prev));
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date, timestamp })
      });
      const result = await response.json();
      if (result.success) {
        await refreshWaterData(); // reconcile ids + take today's total from the server
        showSuccessToast(t('toasts.water.added', { amount: formatWaterAmount(amount, waterUnit) }));
      } else {
        applyInserts(previousInserts);
        setTodayWater(previousToday);
        showErrorToast(result.error || t('toasts.water.addError'));
      }
    } catch {
      applyInserts(previousInserts);
      setTodayWater(previousToday);
      showErrorToast(t('toasts.water.addError'));
    } finally {
      setIsLoading(false);
    }
  }, [waterInserts, todayWater, applyInserts, refreshWaterData, waterUnit, t]);

  const updateWaterById = useCallback(async (id: string, amount: number, timestamp?: string) => {
    const previousInserts = waterInserts;
    const previousToday = todayWater;
    const optimistic = previousInserts.map(e =>
      e.id === id
        ? { ...e, amount, ...(timestamp ? { timestamp } : {}), updatedAt: new Date().toISOString() }
        : e
    );
    applyInserts(optimistic);
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
        showSuccessToast(t('toasts.water.updated'));
      } else {
        applyInserts(previousInserts);
        setTodayWater(previousToday);
        showErrorToast(result.error || t('toasts.water.updateError'));
      }
    } catch {
      applyInserts(previousInserts);
      setTodayWater(previousToday);
      showErrorToast(t('toasts.water.updateError'));
    } finally {
      setIsLoading(false);
    }
  }, [waterInserts, todayWater, applyInserts, refreshWaterData, t]);

  const deleteWaterById = useCallback(async (id: string) => {
    const previousInserts = waterInserts;
    const previousToday = todayWater;
    applyInserts(previousInserts.filter(e => e.id !== id));
    setIsLoading(true);
    try {
      const response = await fetch(`/api/water?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        await refreshWaterData(); // keep today's total server-authoritative
        showSuccessToast(t('toasts.water.deleted'));
      } else {
        applyInserts(previousInserts);
        setTodayWater(previousToday);
        showErrorToast(result.error || t('toasts.water.deleteError'));
      }
    } catch {
      applyInserts(previousInserts);
      setTodayWater(previousToday);
      showErrorToast(t('toasts.water.deleteError'));
    } finally {
      setIsLoading(false);
    }
  }, [waterInserts, todayWater, applyInserts, refreshWaterData, t]);

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
