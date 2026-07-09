"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Ruler, FileText, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/hooks/use-translation';
import { PhotoCapture } from './photo-capture';
import {
  BodyMeasurementEntry,
  BodyMeasurementPreset,
  CM_PER_INCH,
  MeasurementUnit,
} from '@/lib/types';

interface EditBodyMeasurementDialogProps {
  entry: BodyMeasurementEntry | null;
  presets: BodyMeasurementPreset[];
  unit: MeasurementUnit;
  onUpdate: (
    id: string,
    data: { timestamp?: string; measurements?: Record<string, number>; notes?: string }
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photosEnabled?: boolean;
}

export function EditBodyMeasurementDialog({
  entry,
  presets,
  unit,
  onUpdate,
  onDelete,
  open,
  onOpenChange,
  photosEnabled,
}: EditBodyMeasurementDialogProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [notesInput, setNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => a.order - b.order),
    [presets]
  );

  // Max value in the user's current display unit (server caps at 500cm)
  const maxDisplayValue = unit === 'in' ? 500 / CM_PER_INCH : 500;

  useEffect(() => {
    if (open && entry) {
      const ts = parseISO(entry.timestamp);
      setDateInput(format(ts, 'yyyy-MM-dd'));
      setTimeInput(format(ts, 'HH:mm'));
      const initial: Record<string, string> = {};
      for (const preset of presets) {
        const cmValue = entry.measurements[preset.id];
        if (cmValue == null) continue;
        const display = unit === 'in' ? cmValue / CM_PER_INCH : cmValue;
        initial[preset.id] = display.toFixed(1);
      }
      setValues(initial);
      setNotesInput(entry.notes ?? '');
      setFieldErrors({});
      setFormError(null);
    }
  }, [open, entry, presets, unit]);

  if (!entry) return null;

  const filledCount = Object.values(values).filter((v) => v.trim() !== '').length;
  const canSave = filledCount > 0 && dateInput !== '';

  const handleSave = async () => {
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    const measurements: Record<string, number> = {};

    for (const preset of sortedPresets) {
      const raw = values[preset.id];
      if (!raw || raw.trim() === '') continue;
      const num = parseFloat(raw);
      if (!Number.isFinite(num)) {
        nextErrors[preset.id] = t('bodyMeasurement.errorNotANumber');
        continue;
      }
      if (num <= 0) {
        nextErrors[preset.id] = t('bodyMeasurement.errorMustBePositive');
        continue;
      }
      if (num > maxDisplayValue) {
        nextErrors[preset.id] = t('bodyMeasurement.errorMax', { max: maxDisplayValue.toFixed(1), unit });
        continue;
      }
      measurements[preset.id] = unit === 'in' ? num * CM_PER_INCH : num;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError(t('bodyMeasurement.errorFixHighlighted'));
      return;
    }

    if (Object.keys(measurements).length === 0) {
      setFormError(t('bodyMeasurement.errorEnterAtLeastOne'));
      return;
    }

    if (!dateInput) {
      setFormError(t('bodyMeasurement.errorPickDate'));
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
      const ok = await onUpdate(entry.id, {
        timestamp,
        measurements,
        notes: notesInput,
      });
      if (!ok) {
        setFormError(t('bodyMeasurement.errorCouldNotSave'));
        return;
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(entry.id);
      setConfirmDelete(false);
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
          <Label htmlFor="bm-edit-date">{t('common.date')}</Label>
          <Input
            id="bm-edit-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bm-edit-time">{t('common.time')}</Label>
          <Input
            id="bm-edit-time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
        </div>
      </div>

      {sortedPresets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('bodyMeasurement.noPresets')}
        </p>
      ) : (
        <div className="space-y-3">
          {sortedPresets.map((preset) => {
            const error = fieldErrors[preset.id];
            return (
              <div key={preset.id} className="grid grid-cols-3 items-start gap-2">
                <Label
                  htmlFor={`bm-edit-${preset.id}`}
                  className={`${preset.color} col-span-1 pt-2`}
                >
                  {preset.label}
                </Label>
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      id={`bm-edit-${preset.id}`}
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
        <Label htmlFor="bm-edit-notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('common.notes')} ({t('common.optional')})
        </Label>
        <Textarea
          id="bm-edit-notes"
          placeholder={t('bodyMeasurement.notesPlaceholder')}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          rows={2}
        />
      </div>

      {photosEnabled && (
        <PhotoCapture entryType="body-measurement" entryId={entry.id} />
      )}
    </div>
  );

  const deleteAlert = (
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('bodyMeasurement.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('bodyMeasurement.deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader className="shrink-0">
              <DrawerTitle className="flex items-center gap-2 justify-center">
                <Ruler className="h-5 w-5" />
                {t('bodyMeasurement.editTitle')}
              </DrawerTitle>
              <DrawerDescription className="text-center">
                {t('bodyMeasurement.editDescription')}
              </DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="flex-1 overflow-auto px-4">
              <div className="pb-4">{formContent}</div>
            </ScrollArea>
            <DrawerFooter className="pt-2 border-t shrink-0">
              <Button onClick={handleSave} disabled={isSubmitting || !canSave}>
                {isSubmitting ? t('common.saving') : t('common.save')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        {deleteAlert}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              {t('bodyMeasurement.editTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('bodyMeasurement.editDescription')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">{formContent}</ScrollArea>
          <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !canSave}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {deleteAlert}
    </>
  );
}
