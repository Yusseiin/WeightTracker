"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Pill, Clock, Calendar, Trash2, Check, X, AlertTriangle, ArrowLeftRight, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose
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
import { PhotoCapture } from './photo-capture';
import { useIsMobile } from '@/hooks/use-mobile';
import { DynamicIcon } from './dynamic-icon';
import { type MedicationEntry, type MedicationPreset } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface EditMedicationDialogProps {
  entry: MedicationEntry | null;
  medicationPresets: MedicationPreset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, taken: boolean, timestamp?: string, date?: string, dose?: number | null, notes?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  photosEnabled?: boolean;
  notesEnabled?: boolean;
}

export function EditMedicationDialog({
  entry,
  medicationPresets,
  open,
  onOpenChange,
  onSave,
  onDelete,
  photosEnabled,
  notesEnabled
}: EditMedicationDialogProps) {
  const [takenInput, setTakenInput] = useState(false);
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [doseInput, setDoseInput] = useState<number | undefined>(undefined);
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Get the medication preset info
  const preset = entry ? medicationPresets.find(p => p.id === entry.medicationId) : null;

  // Format time from ISO timestamp for display
  const formatTimeFromTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return '';
    try {
      return format(parseISO(timestamp), 'HH:mm');
    } catch {
      return '';
    }
  };

  // Reset inputs when entry changes
  useEffect(() => {
    if (entry && open) {
      setTakenInput(entry.taken);
      setDateInput(entry.date);
      setTimeInput(formatTimeFromTimestamp(entry.timestamp) || format(new Date(), 'HH:mm'));
      setDoseInput(entry.dose);
      setNotesInput(entry.notes || '');
    }
  }, [entry, open]);

  const handleSave = async () => {
    if (!entry) return;

    // Build timestamp from the selected date and time
    let timestamp: string | undefined;
    if (timeInput && dateInput) {
      const [hours, minutes] = timeInput.split(':').map(Number);
      const date = parseISO(dateInput);
      date.setHours(hours, minutes, 0, 0);
      timestamp = date.toISOString();
    }

    // Only pass date if it changed
    const newDate = dateInput !== entry.date ? dateInput : undefined;

    // Determine dose to pass for dosage mode medications
    const isDosageMode = preset?.trackingMode === 'dosage';
    const doseToSave = isDosageMode
      ? (takenInput ? doseInput : null)
      : undefined;

    setIsSubmitting(true);
    try {
      await onSave(entry.id, takenInput, timestamp, newDate, doseToSave, notesInput || undefined);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !onDelete) return;

    setIsSubmitting(true);
    try {
      await onDelete(entry.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = entry ? (
    <div className="space-y-6">
      {/* Medication info */}
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <div className={cn("p-2 rounded-full", takenInput ? "bg-green-500/20" : "bg-muted")}>
          <DynamicIcon
            name={preset?.icon || 'Pill'}
            className={cn("h-6 w-6", takenInput ? "text-green-500" : preset?.color || "text-purple-500")}
          />
        </div>
        <div>
          <div className="font-medium">{preset?.label || t('medication.unknownMedication')}</div>
        </div>
      </div>

      {/* Taken status toggle */}
      <div className="space-y-2">
        <Label>{t('medication.status')}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={takenInput ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2",
              takenInput && "bg-green-500 hover:bg-green-600"
            )}
            onClick={() => setTakenInput(true)}
          >
            <Check className="h-4 w-4" />
            {t('medication.taken')}
          </Button>
          <Button
            type="button"
            variant={!takenInput ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2",
              !takenInput && "bg-red-500 hover:bg-red-600"
            )}
            onClick={() => setTakenInput(false)}
          >
            <X className="h-4 w-4" />
            {t('medication.notTaken')}
          </Button>
        </div>
      </div>

      {/* Dose input for dosage-mode medications */}
      {preset?.trackingMode === 'dosage' && takenInput && (
        <div className="space-y-2">
          <Label htmlFor="edit-medication-dose">{t('medication.dose')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="edit-medication-dose"
              type="number"
              min="0"
              step="any"
              placeholder={t('medication.enterDose')}
              value={doseInput ?? ''}
              onChange={(e) => setDoseInput(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="text-lg flex-1"
            />
            <span className="text-muted-foreground">
              {preset.unit || t('medication.units')}
            </span>
          </div>
          {preset.schedule?.expectedDose !== undefined && (
            <p className="text-xs text-muted-foreground">
              {t('medication.expected', { dose: preset.schedule.expectedDose, unit: preset.unit || t('medication.units') })}
            </p>
          )}
          {preset.schedule?.expectedDose !== undefined &&
           doseInput !== undefined &&
           doseInput !== preset.schedule.expectedDose && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{t('medication.doseDiffersFromExpected', { dose: preset.schedule.expectedDose, unit: preset.unit || t('medication.units') })}</span>
            </div>
          )}
        </div>
      )}

      {/* Date and Time inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-medication-date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('common.date')}
          </Label>
          <Input
            id="edit-medication-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="text-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-medication-time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('common.time')}
          </Label>
          <Input
            id="edit-medication-time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="text-lg"
          />
        </div>
      </div>

      {/* Notes */}
      {notesEnabled && (
        <div className="space-y-2">
          <Label htmlFor="edit-medication-notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('common.notes')} ({t('common.optional')})
          </Label>
          <Textarea
            id="edit-medication-notes"
            placeholder={t('medication.notesAboutEntry')}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* Photo capture */}
      {photosEnabled && entry && (
        <>
          <PhotoCapture
            entryType="medication"
            entryId={entry.id}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push(`/compare-photos?type=medication&entry=${entry.id}`)}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            {t('medication.comparePhotos')}
          </Button>
        </>
      )}

      {/* Delete button */}
      {onDelete && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('medication.deleteEntry')}
        </Button>
      )}
    </div>
  ) : null;

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('medication.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('medication.deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <>
        {deleteConfirmDialog}
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader className="shrink-0">
              <DrawerTitle className="flex items-center gap-2 justify-center">
                <Pill className="h-5 w-5 text-purple-500" />
                {t('medication.editTitle')}
              </DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="flex-1 overflow-auto px-4">
              <div className="pb-4">
                {formContent}
              </div>
            </ScrollArea>
            <DrawerFooter className="pt-2 border-t shrink-0">
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.saving') : t('common.save')}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {deleteConfirmDialog}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              {t('medication.editTitle')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {formContent}
          </ScrollArea>
          <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
