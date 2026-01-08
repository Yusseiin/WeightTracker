"use client";

import { useState } from 'react';
import { Droplets, GlassWater, RotateCcw, Pencil } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WATER_AMOUNTS, WATER_AMOUNTS_OZ, type WaterEntry, type WaterUnit, ML_PER_OZ } from '@/lib/types';
import { formatWaterAmount, ozToMl } from '@/lib/water-utils';

interface AddWaterDialogProps {
  todayWater: WaterEntry | null;
  onAddWater: (amount: number) => Promise<void>;
  onResetWater: () => Promise<void>;
  isLoading?: boolean;
  waterUnit: WaterUnit;
}

export function AddWaterDialog({
  todayWater,
  onAddWater,
  onResetWater,
  isLoading = false,
  waterUnit
}: AddWaterDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const currentAmount = todayWater?.amount || 0;

  const getAmountToAdd = (): number => {
    if (isCustomMode) {
      const amount = parseInt(customAmount) || 0;
      // Convert oz to ml for storage if using imperial
      return waterUnit === 'oz' ? ozToMl(amount) : amount;
    }
    return parseInt(selectedAmount) || 0;
  };

  // Get the amounts based on unit
  const amounts = waterUnit === 'oz' ? WATER_AMOUNTS_OZ : WATER_AMOUNTS;
  const unitLabel = waterUnit === 'oz' ? 'oz' : 'ml';

  const handleAdd = async () => {
    const amount = getAmountToAdd();
    if (amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddWater(amount);
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

  const canAdd = isCustomMode ? (parseInt(customAmount) || 0) > 0 : !!selectedAmount;

  const FormContent = () => (
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
        <ToggleGroup
          type="single"
          value={isCustomMode ? 'custom' : selectedAmount}
          onValueChange={handlePresetSelect}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem
            value={WATER_AMOUNTS.cup.toString()}
            aria-label={waterUnit === 'oz' ? 'Cup (8oz)' : 'Cup (200ml)'}
            className="flex-1 flex-col h-auto py-3"
          >
            <GlassWater className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">Cup</span>
            <span className="text-xs text-muted-foreground">
              {waterUnit === 'oz' ? '8oz' : '200ml'}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value={WATER_AMOUNTS.halfLiter.toString()}
            aria-label={waterUnit === 'oz' ? '17oz' : 'Half liter (500ml)'}
            className="flex-1 flex-col h-auto py-3"
          >
            <Droplets className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">{waterUnit === 'oz' ? '17oz' : '0.5L'}</span>
            <span className="text-xs text-muted-foreground">
              {waterUnit === 'oz' ? '~500ml' : '500ml'}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value={WATER_AMOUNTS.liter.toString()}
            aria-label={waterUnit === 'oz' ? '34oz' : 'One liter (1000ml)'}
            className="flex-1 flex-col h-auto py-3"
          >
            <Droplets className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">{waterUnit === 'oz' ? '34oz' : '1L'}</span>
            <span className="text-xs text-muted-foreground">
              {waterUnit === 'oz' ? '~1L' : '1000ml'}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="custom"
            aria-label="Custom amount"
            className="flex-1 flex-col h-auto py-3"
          >
            <Pencil className="h-5 w-5 mb-1" />
            <span className="text-sm font-medium">Custom</span>
            <span className="text-xs text-muted-foreground">{unitLabel}</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Custom amount input - only shown when custom is selected */}
        {isCustomMode && (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                type="number"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pr-12"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {unitLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Reset button */}
      <Button
        variant="outline"
        onClick={handleReset}
        disabled={isSubmitting || isLoading || currentAmount === 0}
        className="w-full"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset to 0
      </Button>
    </div>
  );

  // Render Drawer on mobile
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} handleOnly>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            variant="outline"
            className="fixed bottom-6 left-6 rounded-full shadow-lg h-14 w-14 z-50 border-primary/50"
          >
            <Droplets className="h-6 w-6 text-primary" />
            <span className="sr-only">Add water</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              Add Water
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto touch-pan-y">
            <FormContent />
          </div>
          <DrawerFooter>
            <Button
              onClick={handleAdd}
              disabled={isSubmitting || isLoading || !canAdd}
              className="w-full"
            >
              {isSubmitting ? 'Adding...' : 'Add Water'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Render Dialog on desktop
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="fixed bottom-6 left-6 rounded-full shadow-lg h-14 w-14 z-50 border-primary/50"
        >
          <Droplets className="h-6 w-6 text-primary" />
          <span className="sr-only">Add water</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Add Water
          </DialogTitle>
        </DialogHeader>
        <FormContent />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleAdd}
            disabled={isSubmitting || isLoading || !canAdd}
          >
            {isSubmitting ? 'Adding...' : 'Add Water'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
