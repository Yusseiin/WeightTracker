"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Footprints, Trash2, ArrowLeftRight, FileText } from 'lucide-react';
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
import { useTranslation } from '@/hooks/use-translation';
import { type StepsEntry } from '@/lib/types';

interface EditStepsDialogProps {
  entry: StepsEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, steps: number, timestamp?: string, notes?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  photosEnabled?: boolean;
  notesEnabled?: boolean;
}

export function EditStepsDialog({
  entry,
  open,
  onOpenChange,
  onSave,
  onDelete,
  photosEnabled,
  notesEnabled
}: EditStepsDialogProps) {
  const [stepsInput, setStepsInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

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
      setStepsInput(entry.steps.toString());
      setTimeInput(formatTimeFromTimestamp(entry.timestamp) || format(new Date(), 'HH:mm'));
      setNotesInput(entry.notes || '');
    }
  }, [entry, open]);

  const handleSave = async () => {
    if (!entry) return;

    const steps = parseInt(stepsInput) || 0;
    if (steps < 0 || steps > 99999) return;

    // Build timestamp from the entry's date and the selected time
    let timestamp: string | undefined;
    if (timeInput && entry.date) {
      const [hours, minutes] = timeInput.split(':').map(Number);
      const date = parseISO(entry.date);
      date.setHours(hours, minutes, 0, 0);
      timestamp = date.toISOString();
    }

    setIsSubmitting(true);
    try {
      await onSave(entry.id, steps, timestamp, notesInput || undefined);
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

  const canSave = stepsInput !== '' && parseInt(stepsInput) >= 0 && parseInt(stepsInput) <= 99999;

  const formContent = entry ? (
    <div className="space-y-6">
      {/* Steps input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="steps">{t('steps.stepsLabel')}</Label>
          <div className="relative">
            <Input
              id="steps"
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
        </div>

        {/* Time input */}
        <div className="space-y-2">
          <Label htmlFor="edit-time">{t('common.time')}</Label>
          <Input
            id="edit-time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
        </div>

        {/* Notes */}
        {notesEnabled && (
          <div className="space-y-2">
            <Label htmlFor="edit-steps-notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('common.notes')} ({t('common.optional')})
            </Label>
            <Textarea
              id="edit-steps-notes"
              placeholder={t('steps.notesEditPlaceholder')}
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
              entryType="steps"
              entryId={entry.id}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(`/compare-photos?type=steps&entry=${entry.id}`)}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              {t('steps.comparePhotos')}
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
            {t('steps.deleteEntry')}
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('steps.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('steps.deleteDescription')}
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
                <Footprints className="h-5 w-5 text-green-500" />
                {t('steps.editTitle')}
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
                disabled={isSubmitting || !canSave}
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
              <Footprints className="h-5 w-5 text-green-500" />
              {t('steps.editTitle')}
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
              disabled={isSubmitting || !canSave}
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
