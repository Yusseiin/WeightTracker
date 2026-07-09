"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Droplets, ArrowLeftRight, FileText } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { DynamicIcon } from '@/components/dynamic-icon';
import { PhotoCapture } from './photo-capture';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/hooks/use-translation';
import type { WeightEntry, EntryFormData, WaterDayTotal, WaterUnit, CustomActivity } from '@/lib/types';
import { mlToOz, ozToMl } from '@/lib/water-utils';
import { formatDateForTooltip } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface EditEntryDialogProps {
  entry: WeightEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<EntryFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  waterEntries: WaterDayTotal[];
  onUpdateWater: (date: string, amount: number) => Promise<void>;
  activities: CustomActivity[];
  photosEnabled?: boolean;
  notesEnabled?: boolean;
  bodyFatEnabled?: boolean;
  // When water history mode is on, water is managed as individual entries in the
  // history table, so the per-day water field is hidden here (editing it would
  // collapse a day's individual inserts into one).
  waterHistoryEnabled?: boolean;
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
  onUpdateWater,
  activities,
  photosEnabled,
  notesEnabled,
  bodyFatEnabled,
  waterHistoryEnabled
}: EditEntryDialogProps) {
  const [weight, setWeight] = useState<string>('');
  const [training, setTraining] = useState<string>('');
  const [sleep, setSleep] = useState<'0' | '1' | '2'>('0');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [water, setWater] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [bodyFatInput, setBodyFatInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setWeight(entry.weight.toString());
      setTraining(entry.training);
      setSleep(entry.sleep.toString() as '0' | '1' | '2');
      const entryDate = new Date(entry.timestamp);
      const entryDateStr = format(entryDate, 'yyyy-MM-dd');
      setDate(entryDateStr);
      setTime(format(entryDate, 'HH:mm'));

      setNotesInput(entry.notes || '');
      setBodyFatInput(entry.bodyFat?.toString() || '');

      // Get water for this date
      const waterEntry = waterEntries.find(w => w.date === entryDateStr);
      const waterMl = waterEntry?.amount || 0;
      // Convert to display unit; preserve up to 2 decimals for oz and trim trailing zeros
      if (waterUnit === 'oz') {
        setWater(
          waterMl > 0
            ? mlToOz(waterMl).toFixed(2).replace(/\.?0+$/, '')
            : ''
        );
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
        training: training,
        sleep: parseInt(sleep) as 0 | 1 | 2,
        timestamp,
        notes: notesInput || undefined,
        bodyFat: bodyFatInput ? parseFloat(bodyFatInput) : undefined
      });

      // Save the per-day water total only in non-history mode. In history mode
      // water is managed as individual entries, so we must not overwrite them here.
      if (!waterHistoryEnabled) {
        const waterValue = parseFloat(water) || 0;
        // Convert to ml if using oz
        const waterMl = waterUnit === 'oz' ? ozToMl(waterValue) : waterValue;
        await onUpdateWater(date, waterMl);
      }

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

  const formContent = (
    <div className="space-y-6">
      {/* Date and Time inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-date">{t('common.date')}</Label>
          <Input
            id="edit-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-time">{t('common.time')}</Label>
          <Input
            id="edit-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      {/* Weight and Water inputs */}
      <div className={cn("grid gap-4", waterHistoryEnabled ? "grid-cols-1" : "grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor="edit-weight">{t('weight.weightLabel', { unit })}</Label>
          <Input
            id="edit-weight"
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="text-lg text-center"
          />
        </div>
        {/* Per-day water field hidden in history mode (managed per-entry instead) */}
        {!waterHistoryEnabled && (
          <div className="space-y-2">
            <Label htmlFor="edit-water" className="flex items-center gap-1">
              <Droplets className="h-4 w-4 text-blue-500 pointer-events-none" />
              {t('water.waterLabel', { unit: waterUnit })}
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
        )}
      </div>

      {/* Body Fat % */}
      {bodyFatEnabled && (
        <div className="space-y-2">
          <Label htmlFor="edit-bodyFat">{t('weight.bodyFat')}</Label>
          <Input
            id="edit-bodyFat"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={bodyFatInput}
            onChange={(e) => setBodyFatInput(e.target.value)}
            placeholder={t('weight.bodyFatPlaceholder')}
            className="text-lg text-center"
          />
        </div>
      )}

      {/* Activity type toggle */}
      <div className="space-y-2">
        <Label>{t('weight.activity')}</Label>
        <div className="grid grid-cols-4 gap-2">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setTraining(activity.id)}
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
        <Label>{t('weight.sleepQuality')}</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSleep('0')}
            className={cn(
              "flex items-center justify-center py-3 px-2 rounded-md border text-sm transition-colors",
              sleep === '0'
                ? "border-green-500 bg-green-500/20 text-green-600"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            {t('weight.sleepGood')}
          </button>
          <button
            type="button"
            onClick={() => setSleep('1')}
            className={cn(
              "flex items-center justify-center py-3 px-2 rounded-md border text-sm transition-colors",
              sleep === '1'
                ? "border-orange-500 bg-orange-500/20 text-orange-600"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
            {t('weight.sleepFair')}
          </button>
          <button
            type="button"
            onClick={() => setSleep('2')}
            className={cn(
              "flex items-center justify-center py-3 px-2 rounded-md border text-sm transition-colors",
              sleep === '2'
                ? "border-red-500 bg-red-500/20 text-red-600"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            {t('weight.sleepPoor')}
          </button>
        </div>
      </div>

      {/* Notes */}
      {notesEnabled && (
        <div className="space-y-2">
          <Label htmlFor="edit-notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('common.notes')} ({t('common.optional')})
          </Label>
          <Textarea
            id="edit-notes"
            placeholder={t('weight.notesEditPlaceholder')}
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
            entryType="weight"
            entryId={entry.id}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push(`/compare-photos?type=weight&entry=${entry.id}`)}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            {t('weight.comparePhotos')}
          </Button>
        </>
      )}
    </div>
  );

  const footerButtons = (
    <div className="flex gap-2 w-full">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            disabled={isDeleting || isSaving}
            className="flex-1"
          >
            {isDeleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('weight.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('weight.deleteDescription', { date: formattedDate })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        onClick={handleSave}
        disabled={isSaving || isDeleting || !weight}
        className="flex-1"
      >
        {isSaving ? t('common.saving') : t('common.save')}
      </Button>
    </div>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>{t('weight.editTitle')}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-auto px-4">
            <div className="pb-4">
              {formContent}
            </div>
          </ScrollArea>
          <DrawerFooter className="pt-2 border-t shrink-0">
            {footerButtons}
            <DrawerClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('weight.editTitle')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {formContent}
        </ScrollArea>
        <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">{t('common.cancel')}</Button>
          </DialogClose>
          {footerButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
