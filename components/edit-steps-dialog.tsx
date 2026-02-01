"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Footprints, Trash2 } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { type StepsEntry } from '@/lib/types';

interface EditStepsDialogProps {
  entry: StepsEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, steps: number, timestamp?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function EditStepsDialog({
  entry,
  open,
  onOpenChange,
  onSave,
  onDelete
}: EditStepsDialogProps) {
  const [stepsInput, setStepsInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      setStepsInput(entry.steps.toString());
      setTimeInput(formatTimeFromTimestamp(entry.timestamp) || format(new Date(), 'HH:mm'));
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
      await onSave(entry.id, steps, timestamp);
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
          <Label htmlFor="steps">Steps</Label>
          <div className="relative">
            <Input
              id="steps"
              type="number"
              placeholder="Enter steps (0-99999)"
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              className="text-lg text-center pr-16"
              min={0}
              max={99999}
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              steps
            </span>
          </div>
        </div>

        {/* Time input */}
        <div className="space-y-2">
          <Label htmlFor="edit-time">Time</Label>
          <Input
            id="edit-time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
        </div>

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
          <AlertDialogTitle>Delete steps entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this steps entry.
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
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 justify-center">
                <Footprints className="h-5 w-5 text-green-500" />
                Edit Steps
              </DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="flex-1 px-4 max-h-[60vh]">
              {formContent}
            </ScrollArea>
            <DrawerFooter className="pt-4">
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
              <Footprints className="h-5 w-5 text-green-500" />
              Edit Steps
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
