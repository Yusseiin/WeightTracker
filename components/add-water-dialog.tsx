"use client";

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Droplets, RotateCcw, Pencil } from 'lucide-react';
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
import { type WaterDayTotal, type WaterUnit, type WaterPreset } from '@/lib/types';
import { formatWaterAmount, ozToMl, validateWaterAmountInput } from '@/lib/water-utils';
import { DynamicIcon } from './dynamic-icon';
import { cn } from '@/lib/utils';

interface AddWaterDialogProps {
  todayWater: WaterDayTotal | null;
  onAddWater: (amount: number) => Promise<void>;
  onResetWater: () => Promise<void>;
  isLoading?: boolean;
  waterUnit: WaterUnit;
  waterPresets: WaterPreset[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // History mode: when enabled, the user can pick a date/time and each add is
  // stored as its own timestamped entry (via onAddWaterEntry).
  historyEnabled?: boolean;
  onAddWaterEntry?: (amount: number, date?: string, timestamp?: string) => Promise<void>;
}

export function AddWaterDialog({
  todayWater,
  onAddWater,
  onResetWater,
  isLoading = false,
  waterUnit,
  waterPresets,
  open: controlledOpen,
  onOpenChange,
  historyEnabled = false,
  onAddWaterEntry
}: AddWaterDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const isMobile = useIsMobile();

  // Initialize date/time to "now" whenever the dialog opens (history mode only)
  useEffect(() => {
    if (open && historyEnabled) {
      setDateInput(format(new Date(), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(), 'HH:mm'));
    }
  }, [open, historyEnabled]);

  const currentAmount = todayWater?.amount || 0;

  const getAmountToAdd = (): number => {
    if (isCustomMode) {
      const amount = parseFloat(customAmount) || 0;
      // Convert oz to ml for storage if using imperial
      return waterUnit === 'oz' ? ozToMl(amount) : amount;
    }
    return parseInt(selectedAmount) || 0;
  };

  const customAmountError = isCustomMode
    ? validateWaterAmountInput(customAmount)
    : null;

  const unitLabel = waterUnit === 'oz' ? 'oz' : 'ml';

  const handleAdd = async () => {
    const amount = getAmountToAdd();
    if (amount <= 0) return;

    setIsSubmitting(true);
    try {
      if (historyEnabled && onAddWaterEntry) {
        // Build a timestamp from the selected date + time
        let timestamp: string | undefined;
        if (timeInput && dateInput) {
          const [hours, minutes] = timeInput.split(':').map(Number);
          const d = parseISO(dateInput);
          d.setHours(hours, minutes, 0, 0);
          timestamp = d.toISOString();
        }
        await onAddWaterEntry(amount, dateInput || undefined, timestamp);
      } else {
        await onAddWater(amount);
      }
      setSelectedAmount('');
      setCustomAmount('');
      setIsCustomMode(false);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetSelect = (value: string) => {
    if (value === 'custom') {
      setIsCustomMode(true);
      setSelectedAmount('');
    } else {
      setSelectedAmount(value);
      setIsCustomMode(false);
      setCustomAmount('');
    }
  };

  const handleReset = async () => {
    setIsSubmitting(true);
    try {
      await onResetWater();
      setSelectedAmount('');
      setCustomAmount('');
      setIsCustomMode(false);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAdd = isCustomMode
    ? customAmountError === null && (parseFloat(customAmount) || 0) > 0
    : !!selectedAmount;

  const formContent = (
    <div className="space-y-6">
      {/* Current amount display */}
      <div className="text-center p-4 bg-muted rounded-lg">
        <div className="text-sm text-muted-foreground mb-1">Today&apos;s Total</div>
        <div className="text-3xl font-bold text-primary">
          {formatWaterAmount(currentAmount, waterUnit)}
        </div>
      </div>

      {/* Water amount selection */}
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {waterPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.amount.toString())}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-1 rounded-md border text-sm transition-colors",
                selectedAmount === preset.amount.toString() && !isCustomMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <DynamicIcon name={preset.icon} className="h-5 w-5 mb-1 text-blue-500" />
              <span className="text-xs font-medium truncate w-full text-center">{preset.label}</span>
              <span className="text-xs text-muted-foreground">
                {formatWaterAmount(preset.amount, waterUnit)}
              </span>
            </button>
          ))}
        </div>

        {/* Custom amount input - only shown when custom is selected */}
        {isCustomMode && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className={cn(
                    "pr-12",
                    customAmountError && customAmount.trim() !== '' && 'border-destructive'
                  )}
                  aria-invalid={!!customAmountError && customAmount.trim() !== ''}
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {unitLabel}
                </span>
              </div>
            </div>
            {customAmountError && customAmount.trim() !== '' && (
              <p className="text-xs text-destructive">{customAmountError}</p>
            )}
          </div>
        )}
      </div>

      {/* Date and Time inputs - only in history mode */}
      {historyEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="water-date">Date</Label>
            <Input
              id="water-date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="water-time">Time</Label>
            <Input
              id="water-time"
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Custom and Reset buttons row */}
      <div className="flex gap-2">
        <Button
          variant={isCustomMode ? "default" : "outline"}
          onClick={() => handlePresetSelect('custom')}
          className="flex-1"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Custom
        </Button>
        {/* In history mode individual entries are removed from the table instead */}
        {!historyEnabled && (
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting || isLoading || currentAmount === 0}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to 0
          </Button>
        )}
      </div>
    </div>
  );

  // Only render trigger button in uncontrolled mode
  const TriggerButton = !isControlled ? (
    <Button
      size="lg"
      variant="outline"
      className="fixed bottom-6 left-6 rounded-full shadow-lg h-14 w-14 z-50 border-primary/50"
    >
      <Droplets className="h-6 w-6 text-primary" />
      <span className="sr-only">Add water</span>
    </Button>
  ) : null;

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {TriggerButton && (
          <DrawerTrigger asChild>
            {TriggerButton}
          </DrawerTrigger>
        )}
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle className="flex items-center gap-2 justify-center">
              <Droplets className="h-5 w-5 text-primary" />
              Add Water
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-auto px-4">
            <div className="pb-4">
              {formContent}
            </div>
          </ScrollArea>
          <DrawerFooter className="pt-2 border-t shrink-0">
            <Button
              onClick={handleAdd}
              disabled={isSubmitting || isLoading || !canAdd}
            >
              {isSubmitting ? 'Adding...' : 'Add Water'}
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
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerButton && (
        <DialogTrigger asChild>
          {TriggerButton}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Add Water
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
            onClick={handleAdd}
            disabled={isSubmitting || isLoading || !canAdd}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Adding...' : 'Add Water'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
