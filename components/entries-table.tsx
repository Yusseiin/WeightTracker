"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Droplets, Scale, Footprints, HeartPulse, Pill, Syringe, Info, Camera, Maximize2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { DynamicIcon } from '@/components/dynamic-icon';
import { formatWaterAmount } from '@/lib/water-utils';
import { formatDateForTable } from '@/lib/date-utils';
import { getPressureCategory } from '@/lib/pressure-utils';
import type { WeightEntry, WaterEntry, WaterUnit, DateFormatSettings, CustomActivity, StepsEntry, PressureEntry, FeatureToggles, MedicationEntry, MedicationPreset, InjectionEntry, InjectionSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EditStepsDialog } from '@/components/edit-steps-dialog';
import { EditPressureDialog } from '@/components/edit-pressure-dialog';
import { EditMedicationDialog } from '@/components/edit-medication-dialog';
import { EditInjectionDialog } from '@/components/edit-injection-dialog';
import { DynamicIcon as MedIcon } from './dynamic-icon';
import { Check, X } from 'lucide-react';

type TableView = 'weight' | 'steps' | 'pressure' | 'medication' | 'injections';

interface EntriesTableProps {
  entries: WeightEntry[];
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  onRowClick: (entry: WeightEntry) => void;
  waterEntries?: WaterEntry[];
  stepsEntries?: StepsEntry[];
  pressureEntries?: PressureEntry[];
  medicationEntries?: MedicationEntry[];
  medicationPresets?: MedicationPreset[];
  injectionEntries?: InjectionEntry[];
  injectionSettings?: InjectionSettings;
  dateFormat?: DateFormatSettings;
  activities: CustomActivity[];
  features?: FeatureToggles;
  onUpdateSteps?: (id: string, steps: number, timestamp?: string) => Promise<void>;
  onDeleteSteps?: (id: string) => Promise<void>;
  onUpdatePressure?: (id: string, systolic: number, diastolic: number, timestamp?: string) => Promise<void>;
  onDeletePressure?: (id: string) => Promise<void>;
  onUpdateMedication?: (id: string, taken: boolean, timestamp?: string, date?: string, dose?: number | null) => Promise<void>;
  onDeleteMedication?: (id: string) => Promise<void>;
  onUpdateInjection?: (id: string, updates: { dose?: number; siteId?: string; timestamp?: string; date?: string; notes?: string }) => Promise<void>;
  onDeleteInjection?: (id: string) => Promise<void>;
  photosEnabled?: boolean;
  photoRefreshKey?: number;
}

function TrainingIcon({ activityId, activities }: { activityId: string; activities: CustomActivity[] }) {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) {
    return <DynamicIcon name="HelpCircle" className="h-4 w-4 text-muted-foreground" />;
  }
  return <DynamicIcon name={activity.icon} className={cn('h-4 w-4', activity.color)} />;
}

function SleepIndicator({ quality }: { quality: number }) {
  const colors = ['bg-green-500', 'bg-orange-500', 'bg-red-500'];
  return <span className={`w-3 h-3 rounded-full inline-block ${colors[quality]}`} />;
}

function PhotoPopover({ entryType, entryId, onFullscreen }: { entryType: string; entryId: string; onFullscreen: (urls: string[], startIndex: number) => void }) {
  const [indices, setIndices] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open && !loaded) {
      fetch(`/api/photos/${entryType}/${entryId}?list=true`)
        .then(r => r.json())
        .then(result => {
          if (result.success) setIndices(result.data);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    }
  };

  const allUrls = indices.map(idx => `/api/photos/${entryType}/${entryId}?index=${idx}`);

  return (
    <Popover onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <span onClick={(e) => e.stopPropagation()} className="inline-flex cursor-pointer">
          <Camera className="h-4 w-4 text-muted-foreground" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-xs p-2" side="right">
        <div className={indices.length > 1 ? "grid grid-cols-2 gap-1.5" : ""}>
          {indices.map((idx, i) => {
            const url = allUrls[i];
            return (
              <div key={idx} className="relative">
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="max-w-36 max-h-36 rounded-md object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => onFullscreen(allUrls, i)}
                  className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-0.5 h-5 w-5 flex items-center justify-center hover:bg-black/80"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        {loaded && indices.length === 0 && (
          <p className="text-xs text-muted-foreground">No photos</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function EntriesTable({
  entries,
  unit,
  waterUnit,
  onRowClick,
  waterEntries = [],
  stepsEntries = [],
  pressureEntries = [],
  medicationEntries = [],
  medicationPresets = [],
  injectionEntries = [],
  injectionSettings,
  dateFormat,
  activities,
  features,
  onUpdateSteps,
  onDeleteSteps,
  onUpdatePressure,
  onDeletePressure,
  onUpdateMedication,
  onDeleteMedication,
  onUpdateInjection,
  onDeleteInjection,
  photosEnabled,
  photoRefreshKey
}: EntriesTableProps) {
  const [currentView, setCurrentView] = useState<TableView>('weight');
  const [editingStepsEntry, setEditingStepsEntry] = useState<StepsEntry | null>(null);
  const [editingPressureEntry, setEditingPressureEntry] = useState<PressureEntry | null>(null);
  const [editingMedicationEntry, setEditingMedicationEntry] = useState<MedicationEntry | null>(null);
  const [editingInjectionEntry, setEditingInjectionEntry] = useState<InjectionEntry | null>(null);
  const [photoCounts, setPhotoCounts] = useState<Map<string, number>>(new Map());
  const [fullscreenPhotos, setFullscreenPhotos] = useState<{ urls: string[]; startIndex: number } | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselCurrent, setCarouselCurrent] = useState(0);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  const fetchPhotoCounts = useCallback(() => {
    if (!photosEnabled) return;
    const typeMap: Record<TableView, string> = {
      weight: 'weight', steps: 'steps', pressure: 'pressure',
      medication: 'medication', injections: 'injection'
    };
    const entryType = typeMap[currentView];
    if (!entryType) return;
    fetch(`/api/photos?type=${entryType}`)
      .then(r => r.json())
      .then(result => {
        if (result.success) setPhotoCounts(new Map(Object.entries(result.data as Record<string, number>)));
      })
      .catch(() => {});
  }, [currentView, photosEnabled]);

  useEffect(() => {
    fetchPhotoCounts();
  }, [fetchPhotoCounts, photoRefreshKey, internalRefreshKey]);

  // Create a map of water entries by date for quick lookup
  const waterByDate = useMemo(() => {
    const map = new Map<string, WaterEntry>();
    for (const entry of waterEntries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [waterEntries]);

  // Create a map of steps entries by date for quick lookup
  const stepsByDate = useMemo(() => {
    const map = new Map<string, StepsEntry>();
    for (const entry of stepsEntries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [stepsEntries]);

  // Create a map of pressure entries by date for quick lookup
  const pressureByDate = useMemo(() => {
    const map = new Map<string, PressureEntry>();
    for (const entry of pressureEntries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [pressureEntries]);

  const waterEnabled = features?.waterEnabled ?? true;
  const stepsEnabled = features?.stepsEnabled ?? false;
  const pressureEnabled = features?.pressureEnabled ?? false;
  const medicationEnabled = features?.medicationEnabled ?? false;
  const injectionsEnabled = features?.injectionsEnabled ?? false;
  const showViewSwitcher = stepsEnabled || pressureEnabled || medicationEnabled || injectionsEnabled;

  // Calculate differences and add water data for weight entries
  const entriesWithDiff = entries.map((entry, index) => {
    const previousEntry = entries[index + 1];
    const diff = previousEntry
      ? Math.round((entry.weight - previousEntry.weight) * 10) / 10
      : 0;
    // Get water for this entry's date
    const entryDate = format(new Date(entry.timestamp), 'yyyy-MM-dd');
    const water = waterByDate.get(entryDate);
    return {
      ...entry,
      diff,
      water: water?.amount || 0,
    };
  });

  // Sort steps entries by date (newest first), then by timestamp
  const sortedStepsEntries = useMemo(() => {
    return [...stepsEntries].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // Same date, sort by timestamp descending
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  }, [stepsEntries]);

  // Sort pressure entries by date (newest first), then by timestamp
  const sortedPressureEntries = useMemo(() => {
    return [...pressureEntries].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // Same date, sort by timestamp descending
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  }, [pressureEntries]);

  // Sort medication entries by date (newest first), then by timestamp
  const sortedMedicationEntries = useMemo(() => {
    return [...medicationEntries].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // Same date, sort by timestamp descending
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  }, [medicationEntries]);

  // Sort injection entries by date (newest first), then by timestamp
  const sortedInjectionEntries = useMemo(() => {
    return [...injectionEntries].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // Same date, sort by timestamp descending
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  }, [injectionEntries]);

  // Check if we have any data for the current view
  const hasWeightData = entries.length > 0;
  const hasStepsData = stepsEntries.length > 0;
  const hasPressureData = pressureEntries.length > 0;
  const hasMedicationData = medicationEntries.length > 0;
  const hasInjectionData = injectionEntries.length > 0;

  // If no data at all and no features enabled, show empty state
  if (!hasWeightData && !hasStepsData && !hasPressureData && !hasMedicationData && !hasInjectionData) {
    return (
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-lg font-semibold mb-2">History</h3>
          <div className="flex h-25 items-center justify-center text-muted-foreground">
            No entries yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Weight table (default view)
  const renderWeightTable = () => {
    if (entriesWithDiff.length === 0) {
      return (
        <div className="flex h-25 items-center justify-center text-muted-foreground">
          No weight entries yet
        </div>
      );
    }
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            {photosEnabled && <th className="py-2 px-1 w-8"><span className="sr-only">Photo</span></th>}
            <th className="text-left py-2 px-1 font-medium">Date</th>
            <th className="text-center py-2 px-0.5 font-medium w-10">Train</th>
            <th className="text-center py-2 px-0.5 font-medium w-10">Sleep</th>
            <th className="text-right py-2 px-0.5 font-medium">Weight</th>
            <th className="text-right py-2 px-0.5 font-medium w-14">Diff</th>
            {waterEnabled && (
              <th className="text-right py-2 px-1 font-medium w-14">
                <Droplets className="h-4 w-4 inline text-blue-500" />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entriesWithDiff.map((entry) => (
            <tr
              key={entry.id}
              onClick={() => onRowClick(entry)}
              className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {photosEnabled && (
                <td className="py-2 px-1 text-center w-8">
                  {(photoCounts.get(entry.id) || 0) > 0 && (
                    <PhotoPopover entryType="weight" entryId={entry.id} onFullscreen={(urls, startIndex) => { setFullscreenPhotos({ urls, startIndex }); setCarouselCurrent(startIndex); }} />
                  )}
                </td>
              )}
              <td className="py-2 px-1 whitespace-nowrap">
                {formatDateForTable(entry.timestamp, dateFormat)}
              </td>
              <td className="py-2 px-0.5 text-center">
                <div className="flex justify-center">
                  <TrainingIcon activityId={entry.training} activities={activities} />
                </div>
              </td>
              <td className="py-2 px-0.5 text-center">
                <div className="flex justify-center">
                  <SleepIndicator quality={entry.sleep} />
                </div>
              </td>
              <td className="py-2 px-0.5 text-right whitespace-nowrap">
                {entry.weight} {unit}
              </td>
              <td className={`py-2 px-0.5 text-right whitespace-nowrap ${
                entry.diff > 0
                  ? 'text-red-500'
                  : entry.diff < 0
                    ? 'text-green-500'
                    : 'text-muted-foreground'
              }`}>
                {entry.diff === 0
                  ? '-'
                  : entry.diff > 0
                    ? `+${entry.diff}`
                    : entry.diff}
              </td>
              {waterEnabled && (
                <td className="py-2 px-1 text-right whitespace-nowrap text-blue-500">
                  {entry.water > 0 ? formatWaterAmount(entry.water, waterUnit) : '-'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Steps table - uses stepsEntries directly
  const renderStepsTable = () => {
    if (sortedStepsEntries.length === 0) {
      return (
        <div className="flex h-25 items-center justify-center text-muted-foreground">
          No steps recorded yet
        </div>
      );
    }
    const canEdit = !!onUpdateSteps;
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            {photosEnabled && <th className="py-2 px-1 w-8"><span className="sr-only">Photo</span></th>}
            <th className="text-left py-2 px-1 font-medium">Date</th>
            <th className="text-right py-2 px-1 font-medium">Steps</th>
          </tr>
        </thead>
        <tbody>
          {sortedStepsEntries.map((entry) => {
            return (
              <tr
                key={entry.id}
                onClick={canEdit ? () => setEditingStepsEntry(entry) : undefined}
                className={cn(
                  "border-b last:border-0",
                  canEdit && "cursor-pointer hover:bg-muted/50 transition-colors"
                )}
              >
                {photosEnabled && (
                  <td className="py-2 px-1 text-center w-8">
                    {(photoCounts.get(entry.id) || 0) > 0 && (
                      <PhotoPopover entryType="steps" entryId={entry.id} onFullscreen={(urls, startIndex) => { setFullscreenPhotos({ urls, startIndex }); setCarouselCurrent(startIndex); }} />
                    )}
                  </td>
                )}
                <td className="py-2 px-1 whitespace-nowrap">
                  {formatDateTimeForTable(entry.timestamp, dateFormat)}
                </td>
                <td className="py-2 px-1 text-right whitespace-nowrap text-green-500">
                  {entry.steps.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // Format date and time from ISO timestamp for table display
  // Uses formatDateForTable which already includes time based on settings
  const formatDateTimeForTable = (timestamp: string | undefined, dateFormatSettings?: DateFormatSettings): string => {
    if (!timestamp) return '-';
    try {
      return formatDateForTable(timestamp, dateFormatSettings);
    } catch {
      return '-';
    }
  };

  // Pressure table - uses pressureEntries directly
  const renderPressureTable = () => {
    if (sortedPressureEntries.length === 0) {
      return (
        <div className="flex h-25 items-center justify-center text-muted-foreground">
          No pressure recorded yet
        </div>
      );
    }
    const canEdit = !!onUpdatePressure;
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            {photosEnabled && <th className="py-2 px-1 w-8"><span className="sr-only">Photo</span></th>}
            <th className="text-left py-2 px-1 font-medium">Date</th>
            <th className="text-right py-2 px-1 font-medium">Pressure</th>
            <th className="text-left py-2 px-1 font-medium">Category</th>
          </tr>
        </thead>
        <tbody>
          {sortedPressureEntries.map((entry) => {
            const category = getPressureCategory(entry.systolic, entry.diastolic);
            return (
              <tr
                key={entry.id}
                onClick={canEdit ? () => setEditingPressureEntry(entry) : undefined}
                className={cn(
                  "border-b last:border-0",
                  canEdit && "cursor-pointer hover:bg-muted/50 transition-colors"
                )}
              >
                {photosEnabled && (
                  <td className="py-2 px-1 text-center w-8">
                    {(photoCounts.get(entry.id) || 0) > 0 && (
                      <PhotoPopover entryType="pressure" entryId={entry.id} onFullscreen={(urls, startIndex) => { setFullscreenPhotos({ urls, startIndex }); setCarouselCurrent(startIndex); }} />
                    )}
                  </td>
                )}
                <td className="py-2 px-1 whitespace-nowrap">
                  {formatDateTimeForTable(entry.timestamp, dateFormat)}
                </td>
                <td className="py-2 px-1 text-right whitespace-nowrap text-red-500">
                  {entry.systolic}/{entry.diastolic}
                </td>
                <td className={cn("py-2 px-1 whitespace-nowrap", category.color)}>
                  {category.label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // Medication table
  const renderMedicationTable = () => {
    if (sortedMedicationEntries.length === 0) {
      return (
        <div className="flex h-25 items-center justify-center text-muted-foreground">
          No medications recorded yet
        </div>
      );
    }
    const canEdit = !!onUpdateMedication;
    // Check if any medication preset uses dosage mode
    const hasDosageMeds = medicationPresets.some(p => p.trackingMode === 'dosage');
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            {photosEnabled && <th className="py-2 px-1 w-8"><span className="sr-only">Photo</span></th>}
            <th className="text-left py-2 px-1 font-medium">Date</th>
            <th className="text-left py-2 px-1 font-medium">Medication</th>
            {hasDosageMeds && (
              <th className="text-right py-2 px-1 font-medium">Dose</th>
            )}
            <th className="text-center py-2 px-1 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedMedicationEntries.map((entry) => {
            const preset = medicationPresets.find(p => p.id === entry.medicationId);
            const isDosageMode = preset?.trackingMode === 'dosage';
            return (
              <tr
                key={entry.id}
                onClick={canEdit ? () => setEditingMedicationEntry(entry) : undefined}
                className={cn(
                  "border-b last:border-0",
                  canEdit && "cursor-pointer hover:bg-muted/50 transition-colors"
                )}
              >
                {photosEnabled && (
                  <td className="py-2 px-1 text-center w-8">
                    {(photoCounts.get(entry.id) || 0) > 0 && (
                      <PhotoPopover entryType="medication" entryId={entry.id} onFullscreen={(urls, startIndex) => { setFullscreenPhotos({ urls, startIndex }); setCarouselCurrent(startIndex); }} />
                    )}
                  </td>
                )}
                <td className="py-2 px-1 whitespace-nowrap">
                  {formatDateTimeForTable(entry.timestamp, dateFormat)}
                </td>
                <td className="py-2 px-1 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {preset && (
                      <MedIcon name={preset.icon} className={cn("h-4 w-4", preset.color)} />
                    )}
                    <span>{preset?.label || 'Unknown'}</span>
                  </div>
                </td>
                {hasDosageMeds && (
                  <td className="py-2 px-1 text-right whitespace-nowrap">
                    {isDosageMode && entry.dose !== undefined ? (
                      <span className={cn(
                        preset?.schedule?.expectedDose !== undefined &&
                        entry.dose !== preset.schedule.expectedDose
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : ""
                      )}>
                        {entry.dose} {preset?.unit || 'units'}
                      </span>
                    ) : isDosageMode ? (
                      <span className="text-muted-foreground">-</span>
                    ) : null}
                  </td>
                )}
                <td className="py-2 px-1 text-center">
                  {entry.taken ? (
                    <span className="inline-flex items-center gap-1 text-green-500">
                      <Check className="h-4 w-4" />
                      <span className="sr-only">Taken</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Not taken</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // Injection table
  const renderInjectionTable = () => {
    if (sortedInjectionEntries.length === 0) {
      return (
        <div className="flex h-25 items-center justify-center text-muted-foreground">
          No injections recorded yet
        </div>
      );
    }
    const canEdit = !!onUpdateInjection;
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-center py-2 px-1 font-medium w-8">
              <span className="sr-only">Notes</span>
            </th>
            {photosEnabled && <th className="py-2 px-1 w-8"><span className="sr-only">Photo</span></th>}
            <th className="text-left py-2 px-1 font-medium">Date</th>
            <th className="text-left py-2 px-1 font-medium">Medication</th>
            <th className="text-right py-2 px-1 font-medium">Dose</th>
            <th className="text-left py-2 px-1 font-medium">Site</th>
          </tr>
        </thead>
        <tbody>
          {sortedInjectionEntries.map((entry) => {
            const medication = injectionSettings?.medications?.find(m => m.id === entry.medicationId);
            const site = injectionSettings?.injectionSites?.find(s => s.id === entry.siteId);
            return (
              <tr
                key={entry.id}
                onClick={canEdit ? () => setEditingInjectionEntry(entry) : undefined}
                className={cn(
                  "border-b last:border-0",
                  canEdit && "cursor-pointer hover:bg-muted/50 transition-colors"
                )}
              >
                <td className="py-2 px-1 text-center">
                  {entry.notes && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex cursor-pointer"
                        >
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto max-w-xs p-3" side="right">
                        <p className="text-sm">{entry.notes}</p>
                      </PopoverContent>
                    </Popover>
                  )}
                </td>
                {photosEnabled && (
                  <td className="py-2 px-1 text-center w-8">
                    {(photoCounts.get(entry.id) || 0) > 0 && (
                      <PhotoPopover entryType="injection" entryId={entry.id} onFullscreen={(urls, startIndex) => { setFullscreenPhotos({ urls, startIndex }); setCarouselCurrent(startIndex); }} />
                    )}
                  </td>
                )}
                <td className="py-2 px-1 whitespace-nowrap">
                  {formatDateTimeForTable(entry.timestamp, dateFormat)}
                </td>
                <td className="py-2 px-1 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Syringe className={cn("h-4 w-4", medication?.color || 'text-teal-500')} />
                    <span className={medication?.color || 'text-muted-foreground'}>{medication?.name || 'Unknown'}</span>
                  </div>
                </td>
                <td className={cn("py-2 px-1 text-right whitespace-nowrap", medication?.color || 'text-teal-500')}>
                  {entry.dose} {medication?.unit || 'mg'}
                </td>
                <td className="py-2 px-1 whitespace-nowrap text-muted-foreground">
                  {site?.label || 'Unknown'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <Card className="py-0">
      <CardContent className="px-0 sm:px-2">
        {/* View Switcher */}
        {showViewSwitcher && (
          <div className="flex justify-center py-2 border-b">
            <ToggleGroup
              type="single"
              value={currentView}
              onValueChange={(value) => value && setCurrentView(value as TableView)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="weight" aria-label="Weight view">
                <Scale className="h-4 w-4" />
              </ToggleGroupItem>
              {stepsEnabled && (
                <ToggleGroupItem value="steps" aria-label="Steps view">
                  <Footprints className="h-4 w-4" />
                </ToggleGroupItem>
              )}
              {pressureEnabled && (
                <ToggleGroupItem value="pressure" aria-label="Pressure view">
                  <HeartPulse className="h-4 w-4" />
                </ToggleGroupItem>
              )}
              {medicationEnabled && (
                <ToggleGroupItem value="medication" aria-label="Medication view">
                  <Pill className="h-4 w-4" />
                </ToggleGroupItem>
              )}
              {injectionsEnabled && (
                <ToggleGroupItem value="injections" aria-label="Injections view">
                  <Syringe className="h-4 w-4" />
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          </div>
        )}

        <div className="overflow-x-auto">
          {currentView === 'weight' && renderWeightTable()}
          {currentView === 'steps' && stepsEnabled && renderStepsTable()}
          {currentView === 'pressure' && pressureEnabled && renderPressureTable()}
          {currentView === 'medication' && medicationEnabled && renderMedicationTable()}
          {currentView === 'injections' && injectionsEnabled && renderInjectionTable()}
        </div>
      </CardContent>

      {/* Edit Steps Dialog */}
      {onUpdateSteps && (
        <EditStepsDialog
          entry={editingStepsEntry}
          open={!!editingStepsEntry}
          onOpenChange={(open) => { if (!open) { setEditingStepsEntry(null); setInternalRefreshKey(k => k + 1); } }}
          onSave={onUpdateSteps}
          onDelete={onDeleteSteps}
          photosEnabled={photosEnabled}
        />
      )}

      {/* Edit Pressure Dialog */}
      {onUpdatePressure && (
        <EditPressureDialog
          entry={editingPressureEntry}
          open={!!editingPressureEntry}
          onOpenChange={(open) => { if (!open) { setEditingPressureEntry(null); setInternalRefreshKey(k => k + 1); } }}
          onSave={onUpdatePressure}
          onDelete={onDeletePressure}
          photosEnabled={photosEnabled}
        />
      )}

      {/* Edit Medication Dialog */}
      {onUpdateMedication && (
        <EditMedicationDialog
          entry={editingMedicationEntry}
          medicationPresets={medicationPresets}
          open={!!editingMedicationEntry}
          onOpenChange={(open) => { if (!open) { setEditingMedicationEntry(null); setInternalRefreshKey(k => k + 1); } }}
          onSave={onUpdateMedication}
          onDelete={onDeleteMedication}
          photosEnabled={photosEnabled}
        />
      )}

      {/* Edit Injection Dialog */}
      {onUpdateInjection && injectionSettings && (
        <EditInjectionDialog
          entry={editingInjectionEntry}
          injectionSettings={injectionSettings}
          open={!!editingInjectionEntry}
          onOpenChange={(open) => { if (!open) { setEditingInjectionEntry(null); setInternalRefreshKey(k => k + 1); } }}
          onSave={onUpdateInjection}
          onDelete={onDeleteInjection}
          photosEnabled={photosEnabled}
        />
      )}

      {/* Fullscreen Photo Overlay */}
      {fullscreenPhotos && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={() => setFullscreenPhotos(null)}
        >
          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            {fullscreenPhotos.urls.length > 1 ? (
              <span className="text-white/80 text-sm">
                {carouselCurrent + 1} / {fullscreenPhotos.urls.length}
              </span>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {fullscreenPhotos.urls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); carouselApi?.scrollPrev(); }}
                    disabled={!carouselApi?.canScrollPrev()}
                    className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); carouselApi?.scrollNext(); }}
                    disabled={!carouselApi?.canScrollNext()}
                    className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30 disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const url = fullscreenPhotos.urls[carouselCurrent];
                  if (!url) return;
                  fetch(url)
                    .then(r => r.blob())
                    .then(blob => {
                      const downloadUrl = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = downloadUrl;
                      a.download = 'photo.jpg';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(downloadUrl);
                    })
                    .catch(() => {});
                }}
                className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenPhotos(null)}
                className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {fullscreenPhotos.urls.length > 1 ? (
            <div className="w-full max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <Carousel
                opts={{ startIndex: fullscreenPhotos.startIndex, loop: false }}
                setApi={(api) => {
                  setCarouselApi(api);
                  if (api) {
                    const onSelect = () => setCarouselCurrent(api.selectedScrollSnap());
                    api.on('select', onSelect);
                    onSelect();
                  }
                }}
                className="w-full"
              >
                <CarouselContent>
                  {fullscreenPhotos.urls.map((url, idx) => (
                    <CarouselItem key={idx}>
                      <div className="flex items-center justify-center h-[80vh]">
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="max-w-full max-h-full object-contain rounded-md"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          ) : (
            <img
              src={fullscreenPhotos.urls[0]}
              alt="Full screen photo"
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-md"
              onClick={(e) => e.stopPropagation()}
              onError={() => setFullscreenPhotos(null)}
            />
          )}
        </div>
      )}
    </Card>
  );
}
