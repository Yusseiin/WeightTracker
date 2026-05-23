"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Ruler, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { PhotoCapture } from './photo-capture';
import {
  BodyMeasurementEntry,
  BodyMeasurementPreset,
  CM_PER_INCH,
  MeasurementUnit,
} from '@/lib/types';

interface AddBodyMeasurementDialogProps {
  presets: BodyMeasurementPreset[];
  unit: MeasurementUnit;
  onAdd: (data: {
    timestamp: string;
    measurements: Record<string, number>;
    notes?: string;
  }) => Promise<BodyMeasurementEntry | undefined>;
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photosEnabled?: boolean;
}

export function AddBodyMeasurementDialog({
  presets,
  unit,
  onAdd,
  isLoading = false,
  open,
  onOpenChange,
  photosEnabled,
}: AddBodyMeasurementDialogProps) {
  const isMobile = useIsMobile();
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [notesInput, setNotesInput] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Max value in the user's current display unit (server caps at 500cm)
  const maxDisplayValue = unit === 'in' ? 500 / CM_PER_INCH : 500;

  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => a.order - b.order),
    [presets]
  );

  useEffect(() => {
    if (open) {
      setDateInput(format(new Date(), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(), 'HH:mm'));
      setValues({});
      setNotesInput('');
      setPendingPhotos([]);
      setFieldErrors({});
      setFormError(null);
    }
  }, [open]);

  const filledCount = Object.values(values).filter((v) => v.trim() !== '').length;
  const canSave = filledCount > 0 && dateInput !== '';

  const handleSave = async () => {
    setFormError(null);

    // Validate each filled field
    const nextErrors: Record<string, string> = {};
    const measurements: Record<string, number> = {};

    for (const preset of sortedPresets) {
      const raw = values[preset.id];
      if (!raw || raw.trim() === '') continue;
      const num = parseFloat(raw);
      if (!Number.isFinite(num)) {
        nextErrors[preset.id] = 'Not a number';
        continue;
      }
      if (num <= 0) {
        nextErrors[preset.id] = 'Must be greater than 0';
        continue;
      }
      if (num > maxDisplayValue) {
        nextErrors[preset.id] = `Max ${maxDisplayValue.toFixed(1)} ${unit}`;
        continue;
      }
      measurements[preset.id] = unit === 'in' ? num * CM_PER_INCH : num;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError('Please fix the highlighted measurements');
      return;
    }

    if (Object.keys(measurements).length === 0) {
      setFormError('Enter at least one measurement');
      return;
    }

    if (!dateInput) {
      setFormError('Pick a date');
      return;
    }

    const date = parseISO(dateInput);
    if (timeInput) {
      const [hours, minutes] = timeInput.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    const timestamp = date.toISOString();

    setIsSubmitting(true);
    try {
      const entry = await onAdd({
        timestamp,
        measurements,
        notes: notesInput || undefined,
      });

      // onAdd returns undefined when the request failed — keep dialog open
      if (!entry) {
        setFormError('Could not save. Check the values and try again.');
        return;
      }

      if (pendingPhotos.length > 0) {
        for (const photo of pendingPhotos) {
          const formData = new FormData();
          formData.append('photo', photo);
          await fetch(`/api/photos/body-measurement/${entry.id}`, {
            method: 'POST',
            body: formData,
          });
        }
      }
      setPendingPhotos([]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className="space-y-6">
      {formError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bm-date">Date</Label>
          <Input
            id="bm-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bm-time">Time</Label>
          <Input
            id="bm-time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
        </div>
      </div>

      {sortedPresets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No measurement presets configured. Add some in Settings.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedPresets.map((preset) => {
            const error = fieldErrors[preset.id];
            return (
              <div key={preset.id} className="grid grid-cols-3 items-start gap-2">
                <Label
                  htmlFor={`bm-${preset.id}`}
                  className={`${preset.color} col-span-1 pt-2`}
                >
                  {preset.label}
                </Label>
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      id={`bm-${preset.id}`}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={0}
                      max={maxDisplayValue}
                      placeholder="0.0"
                      value={values[preset.id] ?? ''}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, [preset.id]: e.target.value }));
                        if (fieldErrors[preset.id]) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next[preset.id];
                            return next;
                          });
                        }
                      }}
                      aria-invalid={!!error}
                      className={error ? 'border-destructive' : ''}
                    />
                    <span className="text-sm text-muted-foreground w-6">{unit}</span>
                  </div>
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="bm-notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Notes (optional)
        </Label>
        <Textarea
          id="bm-notes"
          placeholder="Any notes..."
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          rows={2}
        />
      </div>

      {photosEnabled && (
        <PhotoCapture
          entryType="body-measurement"
          entryId={null}
          onPhotosChange={setPendingPhotos}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle className="flex items-center gap-2 justify-center">
              <Ruler className="h-5 w-5" />
              Add Measurements
            </DrawerTitle>
            <DrawerDescription className="text-center">
              Record a new body measurement session.
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-auto px-4">
            <div className="pb-4">{formContent}</div>
          </ScrollArea>
          <DrawerFooter className="pt-2 border-t shrink-0">
            <Button onClick={handleSave} disabled={isSubmitting || isLoading || !canSave}>
              {isSubmitting ? 'Saving...' : 'Add'}
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Add Measurements
          </DialogTitle>
          <DialogDescription>
            Record a new body measurement session.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">{formContent}</ScrollArea>
        <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || isLoading || !canSave}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
