"use client";

import { useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { format } from 'date-fns';
import { Plus, Sofa, Dumbbell, Activity } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { EntryFormData } from '@/lib/types';

// Form validation schema
const entrySchema = z.object({
  weight: z.coerce.number().positive('Weight must be positive'),
  training: z.enum(['0', '1', '2']),
  sleep: z.enum(['0', '1', '2']),
  timestamp: z.string().min(1, 'Date is required')
});

type FormValues = {
  weight: number;
  training: '0' | '1' | '2';
  sleep: '0' | '1' | '2';
  timestamp: string;
};

interface AddEntryDialogProps {
  onSubmit: (data: EntryFormData) => Promise<void>;
  unit: 'kg' | 'lb';
}

export function AddEntryDialog({ onSubmit, unit }: AddEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(entrySchema) as Resolver<FormValues>,
    defaultValues: {
      weight: '' as unknown as number,
      training: '0',
      sleep: '0',
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    }
  });

  const training = watch('training');
  const sleep = watch('sleep');

  const handleFormSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        weight: data.weight,
        training: parseInt(data.training) as 0 | 1 | 2,
        sleep: parseInt(data.sleep) as 0 | 1 | 2,
        timestamp: new Date(data.timestamp).toISOString()
      });
      setOpen(false);
      reset({
        weight: '' as unknown as number,
        training: '0',
        sleep: '0',
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm")
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const FormContent = () => (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Weight input */}
      <div className="space-y-2">
        <Label htmlFor="weight">Weight ({unit})</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          placeholder={`e.g., 75.5`}
          {...register('weight')}
          className="text-lg"
        />
        {errors.weight && (
          <p className="text-sm text-destructive">{errors.weight.message}</p>
        )}
      </div>

      {/* Activity type toggle */}
      <div className="space-y-2">
        <Label>Activity</Label>
        <ToggleGroup
          type="single"
          value={training}
          onValueChange={(v) => v && setValue('training', v as '0' | '1' | '2')}
          className="justify-start flex-wrap"
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
          onValueChange={(v) => v && setValue('sleep', v as '0' | '1' | '2')}
          className="justify-start flex-wrap"
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

      {/* Date/time input */}
      <div className="space-y-2">
        <Label htmlFor="timestamp">Date & Time</Label>
        <Input
          id="timestamp"
          type="datetime-local"
          {...register('timestamp')}
        />
        {errors.timestamp && (
          <p className="text-sm text-destructive">{errors.timestamp.message}</p>
        )}
      </div>
    </form>
  );

  // Render Drawer on mobile
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} handleOnly>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 z-50"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Add entry</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Weight Entry</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto touch-pan-y">
            <FormContent />
          </div>
          <DrawerFooter>
            <Button
              type="submit"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Weight Entry</DialogTitle>
        </DialogHeader>
        <FormContent />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
