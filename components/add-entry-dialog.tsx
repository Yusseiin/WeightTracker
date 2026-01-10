"use client";

import { useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
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
import { DynamicIcon } from '@/components/dynamic-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EntryFormData, CustomActivity } from '@/lib/types';
import { cn } from '@/lib/utils';

// Form validation schema
const entrySchema = z.object({
  weight: z.coerce.number().positive('Weight must be positive'),
  training: z.string().min(1, 'Activity is required'),
  sleep: z.enum(['0', '1', '2']),
  timestamp: z.string().min(1, 'Date is required')
});

type FormValues = {
  weight: number;
  training: string;
  sleep: '0' | '1' | '2';
  timestamp: string;
};

interface AddEntryDialogProps {
  onSubmit: (data: EntryFormData) => Promise<void>;
  unit: 'kg' | 'lb';
  activities: CustomActivity[];
}

export function AddEntryDialog({ onSubmit, unit, activities }: AddEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  // Get first activity ID as default
  const defaultActivityId = activities[0]?.id || 'rest';

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
      training: defaultActivityId,
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
        training: data.training,
        sleep: parseInt(data.sleep) as 0 | 1 | 2,
        timestamp: new Date(data.timestamp).toISOString()
      });
      setOpen(false);
      reset({
        weight: '' as unknown as number,
        training: defaultActivityId,
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
        <div className="grid grid-cols-4 gap-2">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setValue('training', activity.id)}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-1 rounded-md border text-sm transition-colors",
                training === activity.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <DynamicIcon name={activity.icon} className={cn('h-5 w-5 mb-1', activity.color)} />
              <span className="text-xs truncate w-full text-center">{activity.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sleep quality toggle */}
      <div className="space-y-2">
        <Label>Sleep Quality</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setValue('sleep', '0')}
            className={cn(
              "flex items-center justify-center py-3 px-2 rounded-md border text-sm transition-colors",
              sleep === '0'
                ? "border-green-500 bg-green-500/20 text-green-600"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            Good
          </button>
          <button
            type="button"
            onClick={() => setValue('sleep', '1')}
            className={cn(
              "flex items-center justify-center py-3 px-2 rounded-md border text-sm transition-colors",
              sleep === '1'
                ? "border-orange-500 bg-orange-500/20 text-orange-600"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
            Fair
          </button>
          <button
            type="button"
            onClick={() => setValue('sleep', '2')}
            className={cn(
              "flex items-center justify-center py-3 px-2 rounded-md border text-sm transition-colors",
              sleep === '2'
                ? "border-red-500 bg-red-500/20 text-red-600"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            Poor
          </button>
        </div>
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

  const TriggerButton = (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 z-50 md:relative md:bottom-auto md:right-auto md:rounded-md md:h-auto md:w-auto md:px-4 md:py-2"
    >
      <Plus className="h-6 w-6 md:h-4 md:w-4 md:mr-2" />
      <span className="sr-only md:not-sr-only">Add Entry</span>
    </Button>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Weight Entry</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <FormContent />
          </ScrollArea>
          <DrawerFooter className="pt-4">
            <Button
              type="submit"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
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
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Weight Entry</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <FormContent />
        </ScrollArea>
        <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
