"use client";

import { useState, useCallback } from 'react';
import { estimateMap, isValidMap } from '@/lib/pressure-utils';

// State for the MAP field in the blood pressure dialogs. The field follows the
// (SYS + 2 x DIA) / 3 estimate until the user types their own value. Clearing
// the field doesn't refill it mid-edit; it shows the estimate as a placeholder
// and saves the estimate. `reset` returns to following the estimate.
export function useMapInput(systolic: number, diastolic: number, readingValid: boolean) {
  // null = follow the estimate; a string = what the user typed
  const [override, setOverride] = useState<string | null>(null);

  const estimate = readingValid ? estimateMap(systolic, diastolic) : null;
  const hasOwnValue = override !== null && override.trim() !== '';
  const parsed = hasOwnValue ? parseInt(override, 10) : estimate;

  const onChange = useCallback((value: string) => setOverride(value), []);
  const reset = useCallback(() => setOverride(null), []);

  // Load a stored reading. A stored MAP equal to the estimate is treated as
  // "following the estimate", so editing SYS/DIA keeps it in sync; a different
  // value is the user's own and is left alone.
  const init = useCallback((storedMap: number | undefined, sys: number, dia: number) => {
    setOverride(storedMap !== undefined && storedMap !== estimateMap(sys, dia) ? String(storedMap) : null);
  }, []);

  return {
    /** What the input displays. */
    value: override ?? (estimate !== null ? String(estimate) : ''),
    /** Current estimate, or null while the reading is incomplete. */
    estimate,
    /** True when the user has entered a value that differs from the estimate. */
    isCustom: hasOwnValue && parsed !== estimate,
    /** A typed value must be within range; an empty field falls back to the estimate. */
    isValid: !hasOwnValue || isValidMap(parsed),
    /** Value to send when saving (undefined while the reading is incomplete). */
    valueForSave: parsed ?? undefined,
    onChange,
    reset,
    init,
  };
}
