"use client";

import { useMemo } from 'react';
import { parseISO, differenceInDays, format } from 'date-fns';
import { AlertCircle, Check, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from './dynamic-icon';
import { cn } from '@/lib/utils';
import type { MedicationPreset, MedicationEntry, MedicationSchedule } from '@/lib/types';

interface MedicationReminderBannerProps {
  medicationPresets: MedicationPreset[];
  todayMedications: MedicationEntry[];
  onOpenMedicationDialog: () => void;
}

// Check if a medication is due today based on its schedule
function isMedicationDueToday(schedule: MedicationSchedule | undefined, today: Date): boolean {
  // No schedule = always due (backward compatibility)
  if (!schedule) return true;

  switch (schedule.type) {
    case 'daily':
      return true;
    case 'weekly':
      // Check if today's day of week is in the schedule
      return schedule.daysOfWeek?.includes(today.getDay()) ?? false;
    case 'interval':
      // Check if today is on the interval from start date
      if (!schedule.startDate || !schedule.intervalDays) return false;
      const start = parseISO(schedule.startDate);
      const daysDiff = differenceInDays(today, start);
      return daysDiff >= 0 && daysDiff % schedule.intervalDays === 0;
    default:
      return true;
  }
}

// Check if a medication has been properly taken
function isMedicationTaken(
  preset: MedicationPreset,
  todayMedications: MedicationEntry[],
  todayDate: string
): boolean {
  const entry = todayMedications.find(
    e => e.medicationId === preset.id && e.date === todayDate
  );

  if (!entry) return false;

  // For boolean mode, just check if taken is true
  if (preset.trackingMode !== 'dosage') {
    return entry.taken;
  }

  // For dosage mode, check if taken is true and dose is provided
  return entry.taken && entry.dose !== undefined;
}

export function MedicationReminderBanner({
  medicationPresets,
  todayMedications,
  onOpenMedicationDialog
}: MedicationReminderBannerProps) {
  const today = useMemo(() => new Date(), []);
  const todayDate = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);

  // Get medications that are due today but not yet taken
  const dueMedications = useMemo(() => {
    return medicationPresets.filter(preset => {
      // Check if due today based on schedule
      if (!isMedicationDueToday(preset.schedule, today)) {
        return false;
      }

      // Check if already taken
      return !isMedicationTaken(preset, todayMedications, todayDate);
    });
  }, [medicationPresets, todayMedications, today, todayDate]);

  // Don't render if no medications are due
  if (dueMedications.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-amber-700 dark:text-amber-300">
            Medications due today
          </h3>
          <ul className="mt-2 space-y-1.5">
            {dueMedications.map(preset => (
              <li key={preset.id} className="flex items-center gap-2 text-sm">
                <DynamicIcon
                  name={preset.icon}
                  className={cn("h-4 w-4", preset.color)}
                />
                <span className="text-amber-800 dark:text-amber-200">
                  {preset.label}
                </span>
                {preset.trackingMode === 'dosage' && preset.schedule?.expectedDose && (
                  <span className="text-amber-600 dark:text-amber-400">
                    - {preset.schedule.expectedDose} {preset.unit || 'units'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
          onClick={onOpenMedicationDialog}
        >
          <Check className="h-4 w-4 mr-1" />
          Mark Taken
        </Button>
      </div>
    </div>
  );
}
