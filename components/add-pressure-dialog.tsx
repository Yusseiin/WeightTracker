"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { HeartPulse, FileText } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/hooks/use-translation';
import { getPressureCategory } from '@/lib/pressure-utils';
import { cn } from '@/lib/utils';
import { PhotoCapture } from './photo-capture';

interface AddPressureDialogProps {
  onAddPressure: (systolic: number, diastolic: number, date?: string, timestamp?: string, notes?: string) => Promise<any>;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  photosEnabled?: boolean;
  notesEnabled?: boolean;
}

export function AddPressureDialog({
  onAddPressure,
  isLoading = false,
  open: controlledOpen,
  onOpenChange,
  photosEnabled,
  notesEnabled
}: AddPressureDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [systolicInput, setSystolicInput] = useState<string>('');
  const [diastolicInput, setDiastolicInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Initialize inputs when dialog opens
  useEffect(() => {
    if (open) {
      setSystolicInput('');
      setDiastolicInput('');
      setDateInput(format(new Date(), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(), 'HH:mm'));
      setNotesInput('');
      setPendingPhotos([]);
    }
  }, [open]);

  // Handle dialog open/close
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  const handleSave = async () => {
    const systolic = parseInt(systolicInput) || 0;
    const diastolic = parseInt(diastolicInput) || 0;

    if (systolic < 50 || systolic > 300 || diastolic < 30 || diastolic > 200 || !dateInput) return;

    // Build timestamp from the selected date and time
    let timestamp: string | undefined;
    if (timeInput && dateInput) {
      const [hours, minutes] = timeInput.split(':').map(Number);
      const date = parseISO(dateInput);
      date.setHours(hours, minutes, 0, 0);
      timestamp = date.toISOString();
    }

    setIsSubmitting(true);
    try {
      const entry = await onAddPressure(systolic, diastolic, dateInput, timestamp, notesInput || undefined);
      if (pendingPhotos.length > 0 && entry?.id) {
        for (const photo of pendingPhotos) {
          const formData = new FormData();
          formData.append('photo', photo);
          await fetch(`/api/photos/pressure/${entry.id}`, { method: 'POST', body: formData });
        }
      }
      setPendingPhotos([]);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const systolicValue = parseInt(systolicInput) || 0;
  const diastolicValue = parseInt(diastolicInput) || 0;
  const canSave =
    systolicInput !== '' &&
    diastolicInput !== '' &&
    dateInput !== '' &&
    systolicValue >= 50 &&
    systolicValue <= 300 &&
    diastolicValue >= 30 &&
    diastolicValue <= 200;

  // Get category for preview
  const previewCategory = canSave ? getPressureCategory(systolicValue, diastolicValue) : null;

  const formContent = (
    <div className="space-y-6">
      {/* Pressure inputs */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="systolic">{t('pressure.systolic')}</Label>
            <Input
              id="systolic"
              type="number"
              placeholder={t('pressure.systolicPlaceholder')}
              value={systolicInput}
              onChange={(e) => setSystolicInput(e.target.value)}
              className="text-lg text-center"
              min={50}
              max={300}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="diastolic">{t('pressure.diastolic')}</Label>
            <Input
              id="diastolic"
              type="number"
              placeholder={t('pressure.diastolicPlaceholder')}
              value={diastolicInput}
              onChange={(e) => setDiastolicInput(e.target.value)}
              className="text-lg text-center"
              min={30}
              max={200}
            />
          </div>
        </div>

        {/* Preview category */}
        {previewCategory && (
          <div className={cn("text-center text-sm", previewCategory.color)}>
            {t('pressure.category', { category: previewCategory.label })}
          </div>
        )}

        {/* Date and Time inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">{t('common.date')}</Label>
            <Input
              id="date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">{t('common.time')}</Label>
            <Input
              id="time"
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notes input */}
      {notesEnabled && (
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('common.notes')} ({t('common.optional')})
          </Label>
          <Textarea
            id="notes"
            placeholder={t('pressure.notesPlaceholder')}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* Photo capture */}
      {photosEnabled && (
        <PhotoCapture entryType="pressure" entryId={null} onPhotosChange={setPendingPhotos} />
      )}
    </div>
  );

  // Only render trigger button in uncontrolled mode
  const TriggerButton = !isControlled ? (
    <Button
      size="lg"
      variant="outline"
      className="fixed bottom-6 left-42 rounded-full shadow-lg h-14 w-14 z-50 border-red-500/50"
    >
      <HeartPulse className="h-6 w-6 text-red-500" />
      <span className="sr-only">{t('pressure.addAria')}</span>
    </Button>
  ) : null;

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        {TriggerButton && (
          <DrawerTrigger asChild>
            {TriggerButton}
          </DrawerTrigger>
        )}
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle className="flex items-center gap-2 justify-center">
              <HeartPulse className="h-5 w-5 text-red-500" />
              {t('pressure.addTitle')}
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
              disabled={isSubmitting || isLoading || !canSave}
            >
              {isSubmitting ? t('common.saving') : t('common.add')}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {TriggerButton && (
        <DialogTrigger asChild>
          {TriggerButton}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-red-500" />
            {t('pressure.addTitle')}
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
            disabled={isSubmitting || isLoading || !canSave}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t('common.saving') : t('common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
