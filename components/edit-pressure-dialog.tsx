"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { HeartPulse, Trash2, ArrowLeftRight, FileText } from 'lucide-react';
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
import { type PressureEntry } from '@/lib/types';
import { getPressureCategory } from '@/lib/pressure-utils';
import { cn } from '@/lib/utils';

interface EditPressureDialogProps {
  entry: PressureEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, systolic: number, diastolic: number, timestamp?: string, notes?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  photosEnabled?: boolean;
  notesEnabled?: boolean;
}

export function EditPressureDialog({
  entry,
  open,
  onOpenChange,
  onSave,
  onDelete,
  photosEnabled,
  notesEnabled
}: EditPressureDialogProps) {
  const [systolicInput, setSystolicInput] = useState<string>('');
  const [diastolicInput, setDiastolicInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

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
      setSystolicInput(entry.systolic.toString());
      setDiastolicInput(entry.diastolic.toString());
      setTimeInput(formatTimeFromTimestamp(entry.timestamp) || format(new Date(), 'HH:mm'));
      setNotesInput(entry.notes || '');
    }
  }, [entry, open]);

  const handleSave = async () => {
    if (!entry) return;

    const systolic = parseInt(systolicInput) || 0;
    const diastolic = parseInt(diastolicInput) || 0;

    if (systolic < 50 || systolic > 300 || diastolic < 30 || diastolic > 200) return;

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
      await onSave(entry.id, systolic, diastolic, timestamp, notesInput || undefined);
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

  const systolicValue = parseInt(systolicInput) || 0;
  const diastolicValue = parseInt(diastolicInput) || 0;
  const canSave =
    systolicInput !== '' &&
    diastolicInput !== '' &&
    systolicValue >= 50 &&
    systolicValue <= 300 &&
    diastolicValue >= 30 &&
    diastolicValue <= 200;

  // Get category for preview
  const previewCategory = canSave ? getPressureCategory(systolicValue, diastolicValue) : null;

  const formContent = entry ? (
    <div className="space-y-6">
      {/* Pressure inputs */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-systolic">Systolic (upper)</Label>
            <Input
              id="edit-systolic"
              type="number"
              placeholder="e.g. 120"
              value={systolicInput}
              onChange={(e) => setSystolicInput(e.target.value)}
              className="text-lg text-center"
              min={50}
              max={300}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-diastolic">Diastolic (lower)</Label>
            <Input
              id="edit-diastolic"
              type="number"
              placeholder="e.g. 80"
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
            Category: {previewCategory.label}
          </div>
        )}

        {/* Time input */}
        <div className="space-y-2">
          <Label htmlFor="edit-pressure-time">Time</Label>
          <Input
            id="edit-pressure-time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
        </div>

        {/* Notes */}
        {notesEnabled && (
          <div className="space-y-2">
            <Label htmlFor="edit-pressure-notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes (optional)
            </Label>
            <Textarea
              id="edit-pressure-notes"
              placeholder="Any notes about this entry..."
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
              entryType="pressure"
              entryId={entry.id}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(`/compare-photos?type=pressure&entry=${entry.id}`)}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Compare Photos
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
            Delete Entry
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete pressure entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this blood pressure entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
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
                <HeartPulse className="h-5 w-5 text-red-500" />
                Edit Blood Pressure
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
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
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
              <HeartPulse className="h-5 w-5 text-red-500" />
              Edit Blood Pressure
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {formContent}
          </ScrollArea>
          <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={isSubmitting || !canSave}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
