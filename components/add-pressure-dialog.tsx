"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { HeartPulse, Clock, Calendar } from 'lucide-react';
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
import { getPressureCategory } from '@/lib/pressure-utils';
import { cn } from '@/lib/utils';

interface AddPressureDialogProps {
  onAddPressure: (systolic: number, diastolic: number, date?: string, timestamp?: string) => Promise<void>;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddPressureDialog({
  onAddPressure,
  isLoading = false,
  open: controlledOpen,
  onOpenChange
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  // Initialize inputs when dialog opens
  useEffect(() => {
    if (open) {
      setSystolicInput('');
      setDiastolicInput('');
      setDateInput(format(new Date(), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(), 'HH:mm'));
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
      await onAddPressure(systolic, diastolic, dateInput, timestamp);
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
            <Label htmlFor="systolic">Systolic (upper)</Label>
            <Input
              id="systolic"
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
            <Label htmlFor="diastolic">Diastolic (lower)</Label>
            <Input
              id="diastolic"
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

        {/* Date input */}
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date
          </Label>
          <Input
            id="date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="text-lg"
          />
        </div>

        {/* Time input */}
        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time of measurement
          </Label>
          <Input
            id="time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="text-lg"
          />
        </div>
      </div>
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
      <span className="sr-only">Add blood pressure</span>
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
              <HeartPulse className="h-5 w-5 text-red-500" />
              Add Blood Pressure
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
            Add Blood Pressure
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
            {isSubmitting ? 'Saving...' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
