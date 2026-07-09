"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Syringe, MapPin, FileText, AlertCircle, RotateCw } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { PhotoCapture } from './photo-capture';
import type { InjectableMedication, InjectionSitePreset, InjectionEntry } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';

interface AddInjectionDialogProps {
  medications: InjectableMedication[];
  injectionSites: InjectionSitePreset[];
  injectionEntries: InjectionEntry[];
  onAddInjection: (medicationId: string, dose: number, siteId: string, date?: string, timestamp?: string, notes?: string) => Promise<any>;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdateNextRotation?: (medicationId: string, siteId: string) => void;
  nextRotationOverrides?: Record<string, string>;
  photosEnabled?: boolean;
  notesEnabled?: boolean;
}

export function AddInjectionDialog({
  medications,
  injectionSites,
  injectionEntries,
  onAddInjection,
  isLoading = false,
  open: controlledOpen,
  onOpenChange,
  onUpdateNextRotation,
  nextRotationOverrides = {},
  photosEnabled,
  notesEnabled
}: AddInjectionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
  const [selectedDose, setSelectedDose] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedNextSiteId, setSelectedNextSiteId] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Get selected medication
  const selectedMedication = useMemo(() =>
    medications.find(m => m.id === selectedMedicationId) || null,
    [medications, selectedMedicationId]
  );

  // Find the last injection for the selected medication
  const lastInjectionForMedication = useMemo(() => {
    if (!selectedMedicationId || !injectionEntries.length) return null;

    // Filter by selected medication and sort by timestamp descending
    const filtered = injectionEntries
      .filter(e => e.medicationId === selectedMedicationId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return filtered[0] || null;
  }, [selectedMedicationId, injectionEntries]);

  // Calculate days since last injection for this medication
  const daysSinceLastInjection = useMemo(() => {
    if (!lastInjectionForMedication) return null;
    return differenceInDays(new Date(), new Date(lastInjectionForMedication.timestamp));
  }, [lastInjectionForMedication]);

  // Only suggest a site if user has explicitly set a next rotation override
  const suggestedSiteId = useMemo(() => {
    if (injectionSites.length === 0) return '';

    // Only use manual override - no automatic suggestions
    if (selectedMedicationId && nextRotationOverrides[selectedMedicationId]) {
      const overrideSite = injectionSites.find(s => s.id === nextRotationOverrides[selectedMedicationId]);
      if (overrideSite) return overrideSite.id;
    }

    // No automatic suggestions - return empty
    return '';
  }, [injectionSites, selectedMedicationId, nextRotationOverrides]);

  // Initialize inputs when dialog opens
  useEffect(() => {
    if (open) {
      // Set default medication if only one exists
      if (medications.length === 1) {
        setSelectedMedicationId(medications[0].id);
      } else {
        setSelectedMedicationId('');
      }
      setSelectedDose(null);
      setSelectedSiteId('');
      setSelectedNextSiteId('');
      setDateInput(format(new Date(), 'yyyy-MM-dd'));
      setTimeInput(format(new Date(), 'HH:mm'));
      setNotesInput('');
      setPendingPhotos([]);
    }
  }, [open, medications]);

  // Update site when medication changes (auto-suggest based on medication's last injection)
  useEffect(() => {
    if (selectedMedicationId && suggestedSiteId) {
      setSelectedSiteId(suggestedSiteId);
      // Leave next rotation empty - user must manually select
      setSelectedNextSiteId('');
    }
  }, [selectedMedicationId, suggestedSiteId]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  const handleSave = async () => {
    if (!selectedMedicationId || selectedDose === null || !selectedSiteId || !dateInput) return;

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
      const entry = await onAddInjection(
        selectedMedicationId,
        selectedDose,
        selectedSiteId,
        dateInput,
        timestamp,
        notesInput || undefined
      );
      // Upload photo if one was captured
      if (pendingPhotos.length > 0 && entry?.id) {
        for (const photo of pendingPhotos) {
          const formData = new FormData();
          formData.append('photo', photo);
          await fetch(`/api/photos/injection/${entry.id}`, { method: 'POST', body: formData });
        }
      }
      // Save the next rotation preference if callback provided
      if (onUpdateNextRotation && selectedNextSiteId) {
        onUpdateNextRotation(selectedMedicationId, selectedNextSiteId);
      }
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSave =
    selectedMedicationId !== '' &&
    selectedDose !== null &&
    selectedSiteId !== '' &&
    dateInput !== '';

  // No medications configured - show setup message
  if (medications.length === 0) {
    const emptyContent = (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">{t('injection.noMedicationsConfigured')}</p>
        <p className="text-sm text-muted-foreground">
          {t('injection.addInSettings')}
        </p>
      </div>
    );

    if (isMobile) {
      return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 justify-center">
                <Syringe className="h-5 w-5 text-teal-500" />
                {t('injection.logInjection')}
              </DrawerTitle>
            </DrawerHeader>
            {emptyContent}
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">{t('common.close')}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5 text-teal-500" />
              {t('injection.logInjection')}
            </DialogTitle>
          </DialogHeader>
          {emptyContent}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.close')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const formContent = (
    <div className="space-y-6">
      {/* Medication selector */}
      {medications.length > 1 && (
        <div className="space-y-2">
          <Label>{t('injection.medication')}</Label>
          <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
            <SelectTrigger>
              <SelectValue placeholder={t('injection.selectMedication')} />
            </SelectTrigger>
            <SelectContent>
              {medications.map((med) => (
                <SelectItem key={med.id} value={med.id}>
                  <span className={med.color}>{med.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Last injection info for selected medication */}
      {selectedMedication && lastInjectionForMedication && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Syringe className="h-4 w-4" />
            {t('injection.lastInjection', { name: selectedMedication.name })}
          </div>
          <div className="font-medium">
            {daysSinceLastInjection === 0 ? t('common.today') :
             daysSinceLastInjection === 1 ? t('injection.yesterday') :
             t('injection.daysAgo', { n: daysSinceLastInjection ?? 0 })}
            {' - '}
            {lastInjectionForMedication.dose} {selectedMedication.unit}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t('injection.site')}: {injectionSites.find(s => s.id === lastInjectionForMedication.siteId)?.label || t('injection.unknownSite')}
          </div>
        </div>
      )}

      {/* Dose selector */}
      {selectedMedication && (
        <div className="space-y-2">
          <Label>{t('injection.doseWithUnit', { unit: selectedMedication.unit })}</Label>
          <div className="grid grid-cols-3 gap-2">
            {selectedMedication.availableDoses.map((dose) => (
              <Button
                key={dose}
                type="button"
                variant={selectedDose === dose ? "default" : "outline"}
                onClick={() => setSelectedDose(dose)}
                className="h-12"
              >
                {dose} {selectedMedication.unit}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Injection site selector - only show when medication is selected */}
      {selectedMedication && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('injection.injectionSite')}
            {suggestedSiteId === selectedSiteId && selectedSiteId && (
              <span className="text-xs text-green-500">{t('injection.suggested')}</span>
            )}
          </Label>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger>
              <SelectValue placeholder={t('injection.selectInjectionSite')} />
            </SelectTrigger>
            <SelectContent>
              {injectionSites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  <span className="flex items-center gap-2">
                    {site.label}
                    {site.id === suggestedSiteId && (
                      <span className="text-xs text-green-500">{t('injection.suggested')}</span>
                    )}
                    {site.id === lastInjectionForMedication?.siteId && (
                      <span className="text-xs text-muted-foreground">{t('injection.last')}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Next rotation site selector - only show when medication and site are selected */}
      {selectedMedication && selectedSiteId && injectionSites.length > 1 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            {t('injection.nextRotation')}
          </Label>
          <Select value={selectedNextSiteId} onValueChange={setSelectedNextSiteId}>
            <SelectTrigger>
              <SelectValue placeholder={t('injection.selectNextRotation')} />
            </SelectTrigger>
            <SelectContent>
              {injectionSites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date and Time inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">{t('common.date')}</Label>
          <Input
            id="date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">{t('common.time')}</Label>
          <Input
            id="time"
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
          />
        </div>
      </div>

      {/* Notes input */}
      {notesEnabled && (
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('common.notes')} ({t('common.optional')})
          </Label>
          <Textarea
            id="notes"
            placeholder={t('injection.notesPlaceholder')}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* Photo capture */}
      {photosEnabled && (
        <PhotoCapture
          entryType="injection"
          entryId={null}
          onPhotosChange={setPendingPhotos}
        />
      )}
    </div>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle className="flex items-center gap-2 justify-center">
              <Syringe className="h-5 w-5 text-teal-500" />
              {t('injection.logInjection')}
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
              disabled={isSubmitting || isLoading || !canSave}
            >
              {isSubmitting ? t('common.saving') : t('injection.logInjection')}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-teal-500" />
            {t('injection.logInjection')}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {formContent}
        </ScrollArea>
        <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || isLoading || !canSave}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t('common.saving') : t('injection.logInjection')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
