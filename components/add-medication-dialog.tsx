"use client";

import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Pill, Check, X, Minus, Calendar, Clock, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { DynamicIcon } from './dynamic-icon';
import { PhotoCapture } from './photo-capture';
import type { MedicationPreset, MedicationEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

// Three states: 'unselected' (no entry), 'taken', 'not_taken'
type MedicationState = 'unselected' | 'taken' | 'not_taken';

// Dose selection mode for dosage-mode medications
type DoseSelectionMode = 'preset' | 'custom';

interface LocalMedicationState {
  state: MedicationState;
  date: string;
  time: string;
  dose?: number;
  doseMode: DoseSelectionMode;
  expanded: boolean;
  existingEntryId?: string;
  originalState: MedicationState;
  originalDate: string;
  originalTime: string;
  originalDose?: number;
}

interface AddMedicationDialogProps {
  medicationPresets: MedicationPreset[];
  todayMedications: MedicationEntry[];
  onToggleMedication: (medicationId: string, taken: boolean, date?: string, timestamp?: string, dose?: number | null) => Promise<any>;
  onDeleteMedication?: (id: string) => Promise<void>;
  isLoading?: boolean;
  photosEnabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddMedicationDialog({
  medicationPresets = [],
  todayMedications = [],
  onToggleMedication,
  onDeleteMedication,
  isLoading = false,
  photosEnabled,
  open: controlledOpen,
  onOpenChange
}: AddMedicationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Local state for all medications (not persisted until Done is pressed)
  const [localStates, setLocalStates] = useState<Record<string, LocalMedicationState>>({});
  // Pending photos per medication (keyed by medication ID)
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, File[]>>({});

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open) {
      setPendingPhotos({});
      const now = new Date();
      const todayDate = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');

      const initialStates: Record<string, LocalMedicationState> = {};
      for (const preset of medicationPresets) {
        // Check if there's an existing entry for this medication today
        const existingEntry = todayMedications.find(e => e.medicationId === preset.id && e.date === todayDate);

        if (existingEntry) {
          const entryTime = existingEntry.timestamp
            ? format(parseISO(existingEntry.timestamp), 'HH:mm')
            : currentTime;
          const currentState: MedicationState = existingEntry.taken ? 'taken' : 'not_taken';
          const expectedDose = preset.schedule?.expectedDose;
          // Determine dose mode based on whether existing dose matches expected
          const isCustomDose = existingEntry.dose !== undefined && existingEntry.dose !== expectedDose;

          initialStates[preset.id] = {
            state: currentState,
            date: existingEntry.date,
            time: entryTime,
            dose: existingEntry.dose,
            doseMode: isCustomDose ? 'custom' : 'preset',
            expanded: true, // Existing entries start expanded
            existingEntryId: existingEntry.id,
            originalState: currentState,
            originalDate: existingEntry.date,
            originalTime: entryTime,
            originalDose: existingEntry.dose
          };
        } else {
          // For dosage mode medications, initialize with expected dose if available
          const expectedDose = preset.schedule?.expectedDose;
          initialStates[preset.id] = {
            state: 'unselected',
            date: todayDate,
            time: currentTime,
            dose: expectedDose, // Pre-select preset dose
            doseMode: 'preset', // Default to preset mode
            expanded: false, // Start collapsed
            existingEntryId: undefined,
            originalState: 'unselected',
            originalDate: todayDate,
            originalTime: currentTime,
            originalDose: undefined
          };
        }
      }
      setLocalStates(initialStates);
    }
  }, [open, medicationPresets, todayMedications]);

  // Update local state for a medication
  const handleSetState = (medicationId: string, newState: MedicationState) => {
    setLocalStates(prev => ({
      ...prev,
      [medicationId]: { ...prev[medicationId], state: newState }
    }));
  };

  // Update date for a medication
  const handleDateChange = (medicationId: string, date: string) => {
    setLocalStates(prev => ({
      ...prev,
      [medicationId]: { ...prev[medicationId], date }
    }));
  };

  // Update time for a medication
  const handleTimeChange = (medicationId: string, time: string) => {
    setLocalStates(prev => ({
      ...prev,
      [medicationId]: { ...prev[medicationId], time }
    }));
  };

  // Update dose for a medication
  const handleDoseChange = (medicationId: string, dose: number | undefined) => {
    setLocalStates(prev => ({
      ...prev,
      [medicationId]: { ...prev[medicationId], dose }
    }));
  };

  // Toggle expanded state for a medication
  const handleToggleExpanded = (medicationId: string) => {
    setLocalStates(prev => ({
      ...prev,
      [medicationId]: { ...prev[medicationId], expanded: !prev[medicationId].expanded }
    }));
  };

  // Set dose mode (preset or custom)
  const handleDoseModeChange = (medicationId: string, mode: DoseSelectionMode, preset: MedicationPreset) => {
    setLocalStates(prev => {
      const newDose = mode === 'preset' ? preset.schedule?.expectedDose : prev[medicationId].dose;
      return {
        ...prev,
        [medicationId]: { ...prev[medicationId], doseMode: mode, dose: newDose }
      };
    });
  };

  // Check if there are any changes to save
  const hasChanges = useMemo(() => {
    return Object.entries(localStates).some(([, state]) => {
      return state.state !== state.originalState ||
             state.date !== state.originalDate ||
             state.time !== state.originalTime ||
             state.dose !== state.originalDose;
    });
  }, [localStates]);

  // Save all changes when Done is pressed
  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const [medicationId, state] of Object.entries(localStates)) {
        const hasStateChanged = state.state !== state.originalState;
        const hasDateTimeChanged = state.date !== state.originalDate || state.time !== state.originalTime;
        const hasDoseChanged = state.dose !== state.originalDose;

        // Skip if nothing changed
        if (!hasStateChanged && !hasDateTimeChanged && !hasDoseChanged) continue;

        if (state.state === 'unselected') {
          // Delete the entry if it was previously set
          if (onDeleteMedication && state.existingEntryId) {
            await onDeleteMedication(state.existingEntryId);
          }
        } else {
          // Build timestamp from date and time
          let timestamp: string | undefined;
          if (state.date && state.time) {
            const [hours, minutes] = state.time.split(':').map(Number);
            const date = parseISO(state.date);
            date.setHours(hours, minutes, 0, 0);
            timestamp = date.toISOString();
          }

          // Get the preset to check if it's dosage mode
          const preset = medicationPresets.find(p => p.id === medicationId);
          const isDosageMode = preset?.trackingMode === 'dosage';

          // Pass dose for dosage mode medications (null to clear if not taken)
          const doseToSave = isDosageMode
            ? (state.state === 'taken' ? state.dose : null)
            : undefined;

          // Create or update entry
          const entry = await onToggleMedication(medicationId, state.state === 'taken', state.date, timestamp, doseToSave);

          // Upload pending photo if any
          const photos = pendingPhotos[medicationId] || [];
          if (photos.length > 0 && entry?.id) {
            for (const photo of photos) {
              const formData = new FormData();
              formData.append('photo', photo);
              await fetch(`/api/photos/medication/${entry.id}`, { method: 'POST', body: formData });
            }
          }
        }
      }
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Count taken medications for today (from local state)
  const takenCount = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return Object.values(localStates).filter(s => s.date === today && s.state === 'taken').length;
  }, [localStates]);

  const formContent = medicationPresets.length === 0 ? (
    <div className="py-8 text-center text-muted-foreground">
      <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>No medications configured</p>
      <p className="text-sm mt-1">Add medications in Settings</p>
    </div>
  ) : (
    <div className="space-y-2">
      {medicationPresets.map((preset) => {
        const localState = localStates[preset.id];
        if (!localState) return null;

        const state = localState.state;
        const isExpanded = localState.expanded;
        const isDosageMode = preset.trackingMode === 'dosage';
        const expectedDose = preset.schedule?.expectedDose;

        // Compact view (not expanded)
        if (!isExpanded) {
          return (
            <button
              key={preset.id}
              onClick={() => handleToggleExpanded(preset.id)}
              disabled={isLoading || isSaving}
              className={cn(
                "w-full p-3 rounded-lg border transition-colors flex items-center gap-3",
                "hover:bg-muted/80",
                state === 'taken' && "bg-green-500/10 border-green-500/30",
                state === 'not_taken' && "bg-red-500/10 border-red-500/30",
                state === 'unselected' && "bg-muted/50 border-border"
              )}
            >
              <div className={cn(
                "p-2 rounded-full",
                state === 'taken' && "bg-green-500/20",
                state === 'not_taken' && "bg-red-500/20",
                state === 'unselected' && "bg-muted"
              )}>
                <DynamicIcon
                  name={preset.icon}
                  className={cn(
                    "h-5 w-5",
                    state === 'taken' && "text-green-500",
                    state === 'not_taken' && "text-red-500",
                    state === 'unselected' && preset.color
                  )}
                />
              </div>
              <span className={cn(
                "flex-1 font-medium text-left",
                state === 'taken' && "text-green-600 dark:text-green-400",
                state === 'not_taken' && "text-red-600 dark:text-red-400"
              )}>
                {preset.label}
              </span>
              {state === 'taken' && (
                <Check className="h-5 w-5 text-green-500" />
              )}
              {state === 'not_taken' && (
                <X className="h-5 w-5 text-red-500" />
              )}
            </button>
          );
        }

        // Expanded view
        return (
          <div
            key={preset.id}
            className={cn(
              "p-4 rounded-lg border transition-colors",
              state === 'taken' && "bg-green-500/10 border-green-500/30",
              state === 'not_taken' && "bg-red-500/10 border-red-500/30",
              state === 'unselected' && "bg-muted/50 border-border"
            )}
          >
            {/* Header row with icon, label, and action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleExpanded(preset.id)}
                className={cn(
                  "p-2 rounded-full",
                  state === 'taken' && "bg-green-500/20",
                  state === 'not_taken' && "bg-red-500/20",
                  state === 'unselected' && "bg-muted"
                )}
              >
                <DynamicIcon
                  name={preset.icon}
                  className={cn(
                    "h-5 w-5",
                    state === 'taken' && "text-green-500",
                    state === 'not_taken' && "text-red-500",
                    state === 'unselected' && preset.color
                  )}
                />
              </button>
              <span className={cn(
                "flex-1 font-medium",
                state === 'taken' && "text-green-600 dark:text-green-400",
                state === 'not_taken' && "text-red-600 dark:text-red-400"
              )}>
                {preset.label}
              </span>

              {/* Three-state toggle buttons */}
              <div className="flex items-center gap-1">
                {/* Not taken button */}
                <button
                  onClick={() => handleSetState(preset.id, 'not_taken')}
                  disabled={isLoading || isSaving}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    state === 'not_taken'
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                  )}
                  title="Mark as not taken"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Unselect button (only show if not already unselected) */}
                {state !== 'unselected' && onDeleteMedication && (
                  <button
                    onClick={() => handleSetState(preset.id, 'unselected')}
                    disabled={isLoading || isSaving}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted-foreground/20 transition-colors"
                    title="Clear selection"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                )}

                {/* Taken button */}
                <button
                  onClick={() => handleSetState(preset.id, 'taken')}
                  disabled={isLoading || isSaving}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    state === 'taken'
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-green-500/20 hover:text-green-500"
                  )}
                  title="Mark as taken"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Date and time inputs */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 flex-1">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={localState.date}
                  onChange={(e) => handleDateChange(preset.id, e.target.value)}
                  className="h-8 text-sm"
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center gap-1 flex-1">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="time"
                  value={localState.time}
                  onChange={(e) => handleTimeChange(preset.id, e.target.value)}
                  className="h-8 text-sm"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Dose selection for dosage-mode medications - show when expanded */}
            {isDosageMode && (
              <div className="mt-3 space-y-2">
                <span className="text-sm text-muted-foreground">Dose:</span>
                <div className="flex items-center gap-2">
                  {/* Preset dose button */}
                  {expectedDose !== undefined && (
                    <Button
                      type="button"
                      variant={localState.doseMode === 'preset' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDoseModeChange(preset.id, 'preset', preset)}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {expectedDose} {preset.unit || 'units'}
                    </Button>
                  )}
                  {/* Custom dose button */}
                  <Button
                    type="button"
                    variant={localState.doseMode === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDoseModeChange(preset.id, 'custom', preset)}
                    disabled={isSaving}
                    className={expectedDose !== undefined ? 'flex-1' : 'w-full'}
                  >
                    Custom
                  </Button>
                </div>

                {/* Custom dose input (only show when custom mode is selected) */}
                {localState.doseMode === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Enter dose"
                      value={localState.dose ?? ''}
                      onChange={(e) => handleDoseChange(preset.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="h-8 text-sm flex-1"
                      disabled={isSaving}
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">
                      {preset.unit || 'units'}
                    </span>
                  </div>
                )}

                {/* Warning if custom dose differs from expected */}
                {localState.doseMode === 'custom' &&
                 expectedDose !== undefined &&
                 localState.dose !== undefined &&
                 localState.dose !== expectedDose && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Dose differs from expected ({expectedDose} {preset.unit || 'units'})</span>
                  </div>
                )}
              </div>
            )}

            {/* Photo capture */}
            {photosEnabled && (
              <div className="mt-3">
                <PhotoCapture
                  entryType="medication"
                  entryId={null}
                  onPhotosChange={(files) => setPendingPhotos(prev => ({ ...prev, [preset.id]: files }))}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Only render trigger button in uncontrolled mode
  const TriggerButton = !isControlled ? (
    <Button
      size="lg"
      variant="outline"
      className="fixed bottom-6 left-60 rounded-full shadow-lg h-14 w-14 z-50 border-purple-500/50"
    >
      <Pill className="h-6 w-6 text-purple-500" />
      <span className="sr-only">Track medications</span>
    </Button>
  ) : null;

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {TriggerButton && (
          <DrawerTrigger asChild>
            {TriggerButton}
          </DrawerTrigger>
        )}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 justify-center">
              <Pill className="h-5 w-5 text-purple-500" />
              Medications
              {medicationPresets.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({takenCount}/{medicationPresets.length})
                </span>
              )}
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            {formContent}
          </ScrollArea>
          <DrawerFooter className="pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? 'Saving...' : 'Done'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerButton && (
        <DialogTrigger asChild>
          {TriggerButton}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-purple-500" />
            Medications
            {medicationPresets.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({takenCount}/{medicationPresets.length})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {formContent}
        </ScrollArea>
        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="w-full sm:w-auto"
          >
            {isSaving ? 'Saving...' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
