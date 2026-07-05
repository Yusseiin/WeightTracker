"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Droplets, Trash2 } from 'lucide-react';
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
import { type WaterEntry, type WaterUnit } from '@/lib/types';
import { mlToOz, ozToMl, validateWaterAmountInput } from '@/lib/water-utils';
import { cn } from '@/lib/utils';

interface EditWaterDialogProps {
  entry: WaterEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, amount: number, timestamp?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  waterUnit: WaterUnit;
}

// Trim trailing zeros for a clean initial display value ("16.90" → "16.9").
function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function EditWaterDialog({
  entry,
  open,
  onOpenChange,
  onSave,
  onDelete,
  waterUnit
}: EditWaterDialogProps) {
  const [amountInput, setAmountInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isMobile = useIsMobile();

  const unitLabel = waterUnit === 'oz' ? 'oz' : 'ml';

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
      const displayAmount =
        waterUnit === 'oz'
          ? trimZeros(mlToOz(entry.amount).toFixed(2))
          : entry.amount.toString();
      setAmountInput(displayAmount);
      setDateInput(entry.date);
      setTimeInput(formatTimeFromTimestamp(entry.timestamp) || format(new Date(), 'HH:mm'));
    }
  }, [entry, open, waterUnit]);

  const amountError = validateWaterAmountInput(amountInput);
  const amountValue = parseFloat(amountInput) || 0;
  const canSave = amountError === null && amountValue > 0;

  const handleSave = async () => {
    if (!entry || !canSave) return;

    // Convert to ml for storage if using imperial
    const amountMl = waterUnit === 'oz' ? ozToMl(amountValue) : amountValue;

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
      await onSave(entry.id, amountMl, timestamp);
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
      <div className="space-y-4">
        {/* Amount input */}
        <div className="space-y-2">
          <Label htmlFor="edit-water-amount" className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            Amount
          </Label>
          <div className="relative">
            <Input
              id="edit-water-amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="Enter amount"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className={cn(
                "pr-12 text-lg text-center",
                amountError && amountInput.trim() !== '' && 'border-destructive'
              )}
              aria-invalid={!!amountError && amountInput.trim() !== ''}
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {unitLabel}
            </span>
          </div>
          {amountError && amountInput.trim() !== '' && (
            <p className="text-xs text-destructive">{amountError}</p>
          )}
        </div>

        {/* Date input */}
        <div className="space-y-2">
          <Label htmlFor="edit-water-date">Date</Label>
          <Input
            id="edit-water-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
        </div>

        {/* Time input */}
        <div className="space-y-2">
          <Label htmlFor="edit-water-time">Time</Label>
          <Input
            id="edit-water-time"
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
          <AlertDialogTitle>Delete water entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this water entry.
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
                <Droplets className="h-5 w-5 text-primary" />
                Edit Water
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
              <Droplets className="h-5 w-5 text-primary" />
              Edit Water
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
