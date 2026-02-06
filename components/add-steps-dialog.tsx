"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Footprints } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { PhotoCapture } from './photo-capture';

interface AddStepsDialogProps {
  onAddSteps: (steps: number, date?: string, timestamp?: string) => Promise<any>;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  photosEnabled?: boolean;
}

export function AddStepsDialog({
  onAddSteps,
  isLoading = false,
  open: controlledOpen,
  onOpenChange,
  photosEnabled
}: AddStepsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [stepsInput, setStepsInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const isMobile = useIsMobile();

  // Initialize inputs when dialog opens
  useEffect(() => {
    if (open) {
      setStepsInput('');
      setDateInput(format(new Date(), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(), 'HH:mm'));
      setPendingPhoto(null);
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
      const entry = await onAddSteps(steps, dateInput, timestamp);
      if (pendingPhoto && entry?.id) {
        const formData = new FormData();
        formData.append('photo', pendingPhoto);
        await fetch(`/api/photos/steps/${entry.id}`, { method: 'POST', body: formData });
      }
      setPendingPhoto(null);
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
          <p className="text-xs text-muted-foreground text-center">
            Max 5 digits (99,999)
          </p>
        </div>

        {/* Date and Time inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Photo capture */}
      {photosEnabled && (
        <PhotoCapture entryType="steps" entryId={null} onPhotoChange={setPendingPhoto} />
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
      <span className="sr-only">Add steps</span>
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 justify-center">
              <Footprints className="h-5 w-5 text-green-500" />
              Add Steps
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            {formContent}
          </ScrollArea>
          <DrawerFooter className="pt-4">
            <Button
              onClick={handleSave}
              disabled={isSubmitting || isLoading || !canSave}
            >
              {isSubmitting ? 'Saving...' : 'Add Steps'}
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
            Add Steps
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
            disabled={isSubmitting || isLoading || !canSave}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Add Steps'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
