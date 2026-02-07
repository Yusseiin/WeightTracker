"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Syringe, MapPin, FileText, Trash2, ArrowLeftRight } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhotoCapture } from './photo-capture';
import { useIsMobile } from '@/hooks/use-mobile';
import type { InjectionEntry, InjectionSettings } from '@/lib/types';

interface EditInjectionDialogProps {
  entry: InjectionEntry | null;
  injectionSettings: InjectionSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: { dose?: number; siteId?: string; timestamp?: string; date?: string; notes?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  photosEnabled?: boolean;
}

export function EditInjectionDialog({
  entry,
  injectionSettings,
  open,
  onOpenChange,
  onSave,
  onDelete,
  photosEnabled
}: EditInjectionDialogProps) {
  const [selectedDose, setSelectedDose] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  // Get the medication for this entry
  const medication = useMemo(() => {
    if (!entry) return null;
    return injectionSettings.medications?.find(m => m.id === entry.medicationId) || null;
  }, [entry, injectionSettings.medications]);

  // Reset inputs when entry changes
  useEffect(() => {
    if (entry && open) {
      setSelectedDose(entry.dose);
      setSelectedSiteId(entry.siteId);
      setDateInput(entry.date);
      setNotesInput(entry.notes || '');
      // Extract time from timestamp
      if (entry.timestamp) {
        try {
          setTimeInput(format(parseISO(entry.timestamp), 'HH:mm'));
        } catch {
          setTimeInput(format(new Date(), 'HH:mm'));
        }
      } else {
        setTimeInput(format(new Date(), 'HH:mm'));
      }
    }
  }, [entry, open]);

  const handleSave = async () => {
    if (!entry || selectedDose === null || !selectedSiteId || !dateInput) return;

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
      await onSave(entry.id, {
        dose: selectedDose,
        siteId: selectedSiteId,
        date: dateInput,
        timestamp,
        notes: notesInput || undefined
      });
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

  const canSave = selectedDose !== null && selectedSiteId !== '' && dateInput !== '';

  const formContent = entry && medication ? (
    <div className="space-y-6">
      {/* Medication info (read-only) */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2">
          <Syringe className={`h-4 w-4 ${medication.color}`} />
          <span className="font-medium">{medication.name}</span>
        </div>
      </div>

      {/* Dose selector */}
      <div className="space-y-2">
        <Label>Dose ({medication.unit})</Label>
        <div className="grid grid-cols-3 gap-2">
          {medication.availableDoses.map((dose) => (
            <Button
              key={dose}
              type="button"
              variant={selectedDose === dose ? "default" : "outline"}
              onClick={() => setSelectedDose(dose)}
              className="h-12"
            >
              {dose} {medication.unit}
            </Button>
          ))}
        </div>
      </div>

      {/* Injection site selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Injection Site
        </Label>
        <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
          <SelectTrigger>
            <SelectValue placeholder="Select injection site" />
          </SelectTrigger>
          <SelectContent>
            {injectionSettings.injectionSites?.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Notes input */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Notes (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="Any notes about this injection..."
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          rows={2}
        />
      </div>

      {/* Photo capture */}
      {photosEnabled && entry && (
        <>
          <PhotoCapture
            entryType="injection"
            entryId={entry.id}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push(`/compare-photos?type=injection&entry=${entry.id}`)}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            Compare Photos
          </Button>
        </>
      )}

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
  ) : null;

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete injection entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this injection entry.
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
                <Syringe className="h-5 w-5 text-teal-500" />
                Edit Injection
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
              <Syringe className="h-5 w-5 text-teal-500" />
              Edit Injection
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
