"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Footprints, FileText } from 'lucide-react';
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
import { PhotoCapture } from './photo-capture';

interface AddStepsDialogProps {
  onAddSteps: (steps: number, date?: string, timestamp?: string, notes?: string) => Promise<any>;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  photosEnabled?: boolean;
  notesEnabled?: boolean;
}

export function AddStepsDialog({
  onAddSteps,
  isLoading = false,
  open: controlledOpen,
  onOpenChange,
  photosEnabled,
  notesEnabled
}: AddStepsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [stepsInput, setStepsInput] = useState<string>('');
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
      setStepsInput('');
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
    const steps = parseInt(stepsInput) || 0;
    if (steps < 0 || steps > 99999 || !dateInput) return;

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
      const entry = await onAddSteps(steps, dateInput, timestamp, notesInput || undefined);
      if (pendingPhotos.length > 0 && entry?.id) {
        for (const photo of pendingPhotos) {
          const formData = new FormData();
          formData.append('photo', photo);
          await fetch(`/api/photos/steps/${entry.id}`, { method: 'POST', body: formData });
        }
      }
      setPendingPhotos([]);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSave = stepsInput !== '' && dateInput !== '' && parseInt(stepsInput) >= 0 && parseInt(stepsInput) <= 99999;

  const formContent = (
    <div className="space-y-6">
      {/* Steps input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="number"
              placeholder={t('steps.enterSteps')}
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              className="text-lg text-center pr-16"
              min={0}
              max={99999}
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {t('steps.unit')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('steps.maxDigits')}
          </p>
        </div>

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
            placeholder={t('steps.notesPlaceholder')}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* Photo capture */}
      {photosEnabled && (
        <PhotoCapture entryType="steps" entryId={null} onPhotosChange={setPendingPhotos} />
      )}
    </div>
  );

  // Only render trigger button in uncontrolled mode
  const TriggerButton = !isControlled ? (
    <Button
      size="lg"
      variant="outline"
      className="fixed bottom-6 left-24 rounded-full shadow-lg h-14 w-14 z-50 border-green-500/50"
    >
      <Footprints className="h-6 w-6 text-green-500" />
      <span className="sr-only">{t('steps.addAria')}</span>
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
              <Footprints className="h-5 w-5 text-green-500" />
              {t('steps.addTitle')}
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
              {isSubmitting ? t('common.saving') : t('steps.addTitle')}
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
            <Footprints className="h-5 w-5 text-green-500" />
            {t('steps.addTitle')}
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
            {isSubmitting ? t('common.saving') : t('steps.addTitle')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
