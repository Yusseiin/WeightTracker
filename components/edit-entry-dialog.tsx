"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sofa, Dumbbell, Activity, Droplets } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { WeightEntry, EntryFormData, WaterEntry, WaterUnit } from '@/lib/types';
import { mlToOz, ozToMl } from '@/lib/water-utils';
import { formatDateForTooltip } from '@/lib/date-utils';

interface EditEntryDialogProps {
  entry: WeightEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<EntryFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  waterEntries: WaterEntry[];
  onUpdateWater: (date: string, amount: number) => Promise<void>;
}

export function EditEntryDialog({
  entry,
  open,
  onOpenChange,
  onSave,
  onDelete,
  unit,
  waterUnit,
  waterEntries,
  onUpdateWater
}: EditEntryDialogProps) {
  const [weight, setWeight] = useState<string>('');
  const [training, setTraining] = useState<'0' | '1' | '2'>('0');
  const [sleep, setSleep] = useState<'0' | '1' | '2'>('0');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [water, setWater] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setWeight(entry.weight.toString());
      setTraining(entry.training.toString() as '0' | '1' | '2');
      setSleep(entry.sleep.toString() as '0' | '1' | '2');
      const entryDate = new Date(entry.timestamp);
      const entryDateStr = format(entryDate, 'yyyy-MM-dd');
      setDate(entryDateStr);
      setTime(format(entryDate, 'HH:mm'));

      // Get water for this date
      const waterEntry = waterEntries.find(w => w.date === entryDateStr);
      const waterMl = waterEntry?.amount || 0;
      // Convert to display unit
      if (waterUnit === 'oz') {
        setWater(waterMl > 0 ? Math.round(mlToOz(waterMl)).toString() : '');
      } else {
        setWater(waterMl > 0 ? waterMl.toString() : '');
      }
    }
  }, [entry, waterEntries, waterUnit]);

  const handleSave = async () => {
    if (!entry || !weight) return;

    setIsSaving(true);
    try {
      // Combine date and time into timestamp
      const timestamp = new Date(`${date}T${time}`).toISOString();

      await onSave(entry.id, {
        weight: parseFloat(weight),
        training: parseInt(training) as 0 | 1 | 2,
        sleep: parseInt(sleep) as 0 | 1 | 2,
        timestamp
      });

      // Save water if value provided
      const waterValue = parseFloat(water) || 0;
      // Convert to ml if using oz
      const waterMl = waterUnit === 'oz' ? ozToMl(waterValue) : waterValue;
      await onUpdateWater(date, waterMl);

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    setIsDeleting(true);
    try {
      await onDelete(entry.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = entry
    ? formatDateForTooltip(entry.timestamp)
    : '';

  const FormContent = () => (
    <div className="space-y-6">
      {/* Date and Time inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-date">Date</Label>
          <Input
            id="edit-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-time">Time</Label>
          <Input
            id="edit-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      {/* Weight and Water inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-weight">Weight ({unit})</Label>
          <Input
            id="edit-weight"
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="text-lg text-center"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-water" className="flex items-center gap-1">
            <Droplets className="h-4 w-4 text-blue-500 pointer-events-none" />
            Water ({waterUnit})
          </Label>
          <Input
            id="edit-water"
            type="number"
            step="1"
            min="0"
            value={water}
            onChange={(e) => setWater(e.target.value)}
            placeholder="0"
            className="text-lg text-center"
          />
        </div>
      </div>

      {/* Activity type toggle */}
      <div className="space-y-2">
        <Label>Activity</Label>
        <ToggleGroup
          type="single"
          value={training}
          onValueChange={(v) => v && setTraining(v as '0' | '1' | '2')}
          className="justify-center flex-wrap"
          variant="outline"
        >
          <ToggleGroupItem value="0" aria-label="Rest" className="flex-1 min-w-20">
            <Sofa className="h-4 w-4 mr-2" />
            Rest
          </ToggleGroupItem>
          <ToggleGroupItem value="1" aria-label="Weights" className="flex-1 min-w-20">
            <Dumbbell className="h-4 w-4 mr-2" />
            Weights
          </ToggleGroupItem>
          <ToggleGroupItem value="2" aria-label="Cardio" className="flex-1 min-w-20">
            <Activity className="h-4 w-4 mr-2" />
            Cardio
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Sleep quality toggle */}
      <div className="space-y-2">
        <Label>Sleep Quality</Label>
        <ToggleGroup
          type="single"
          value={sleep}
          onValueChange={(v) => v && setSleep(v as '0' | '1' | '2')}
          className="justify-center flex-wrap"
          variant="outline"
        >
          <ToggleGroupItem
            value="0"
            aria-label="Good sleep"
            className="flex-1 min-w-20 data-[state=on]:bg-green-500/20 data-[state=on]:text-green-600 data-[state=on]:border-green-500 data-[state=on]:border data-[state=on]:z-10"
          >
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            Good
          </ToggleGroupItem>
          <ToggleGroupItem
            value="1"
            aria-label="Fair sleep"
            className="flex-1 min-w-20 data-[state=on]:bg-orange-500/20 data-[state=on]:text-orange-600 data-[state=on]:border-orange-500 data-[state=on]:border data-[state=on]:z-10"
          >
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
            Fair
          </ToggleGroupItem>
          <ToggleGroupItem
            value="2"
            aria-label="Poor sleep"
            className="flex-1 min-w-20 data-[state=on]:bg-red-500/20 data-[state=on]:text-red-600 data-[state=on]:border-red-500 data-[state=on]:border data-[state=on]:z-10"
          >
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            Poor
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );

  const FooterButtons = () => (
    <div className="flex gap-2 w-full">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            disabled={isDeleting || isSaving}
            className="flex-1"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the weight entry from {formattedDate}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        onClick={handleSave}
        disabled={isSaving || isDeleting || !weight}
        className="flex-1"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );

  // Render Drawer on mobile
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} handleOnly>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Entry</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto touch-pan-y">
            <FormContent />
          </div>
          <DrawerFooter>
            <FooterButtons />
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>
        <FormContent />
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <FooterButtons />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
