"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { ArrowLeft, ArrowLeftRight, Maximize2, Download, X, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import type { PhotoEntryType } from './photo-capture';
import { useTranslation } from '@/hooks/use-translation';

interface SelectedEntry {
  id: string;
  label: string;
  indices: number[];
}

interface CarouselPhoto {
  url: string;
  label: string;
}

interface EntryCandidate {
  id: string;
  label: string;
  date: string;
}

const ENTRY_API_MAP: Record<PhotoEntryType, string> = {
  weight: '/api/entries',
  steps: '/api/steps',
  pressure: '/api/pressure',
  medication: '/api/medications',
  injection: '/api/injections',
  'body-measurement': '/api/body-measurements',
};

function formatEntryLabel(
  entryType: PhotoEntryType,
  entry: Record<string, unknown>,
  weightUnit: 'kg' | 'lb'
): string {
  const dateStr = (entry.timestamp || entry.date) as string;
  let date: string;
  try {
    date = format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    date = dateStr as string;
  }

  switch (entryType) {
    case 'weight':
      return `${date} — ${entry.weight} ${weightUnit}`;
    case 'steps':
      return `${date} — ${entry.steps} steps`;
    case 'pressure':
      return `${date} — ${entry.systolic}/${entry.diastolic}`;
    case 'medication':
      return `${date} — ${entry.medicationId}`;
    case 'injection':
      return `${date} — ${entry.dose} ${(entry as Record<string, unknown>).unit || 'mg'}`;
    case 'body-measurement': {
      const measurements = entry.measurements as Record<string, number> | undefined;
      const count = measurements ? Object.keys(measurements).length : 0;
      return `${date} — ${count} measurement${count === 1 ? '' : 's'}`;
    }
    default:
      return date;
  }
}

export function ComparePhotosPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryType = (searchParams.get('type') || 'weight') as PhotoEntryType;
  const initialEntryId = searchParams.get('entry') || '';

  const [allCandidates, setAllCandidates] = useState<EntryCandidate[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([]);
  const [pickerValue, setPickerValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Carousel state
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselPhotos, setCarouselPhotos] = useState<CarouselPhoto[]>([]);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselCurrent, setCarouselCurrent] = useState(0);

  // Track carousel position
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCarouselCurrent(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  // Load initial data
  useEffect(() => {
    if (!entryType || !initialEntryId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [photosRes, entriesRes, initialPhotosRes, settingsRes] = await Promise.all([
          fetch(`/api/photos?type=${entryType}`).then(r => r.json()),
          fetch(ENTRY_API_MAP[entryType]).then(r => r.json()),
          fetch(`/api/photos/${entryType}/${initialEntryId}?list=true`).then(r => r.json()),
          fetch('/api/settings').then(r => r.json()),
        ]);

        // Resolve user's weight unit (defaults to kg if unset / failed)
        const resolvedUnit: 'kg' | 'lb' =
          settingsRes?.success && settingsRes.data?.unit === 'lb' ? 'lb' : 'kg';

        // Build entry map
        const entries: Record<string, unknown>[] = entriesRes.success
          ? (entriesRes.data || [])
          : (Array.isArray(entriesRes) ? entriesRes : []);
        const entryMap = new Map<string, Record<string, unknown>>();
        for (const e of entries) {
          entryMap.set(e.id as string, e);
        }

        // Set initial selected entry
        const initialEntry = entryMap.get(initialEntryId);
        const initialIndices = initialPhotosRes.success && Array.isArray(initialPhotosRes.data)
          ? initialPhotosRes.data
          : [];
        const initialLabel = initialEntry
          ? formatEntryLabel(entryType, initialEntry, resolvedUnit)
          : 'Current';

        setSelectedEntries([{ id: initialEntryId, label: initialLabel, indices: initialIndices }]);

        // Build all candidates (entries with photos)
        const photoCounts: Record<string, number> = photosRes.success ? photosRes.data : {};
        const candidateList: EntryCandidate[] = [];
        for (const [entryId, count] of Object.entries(photoCounts)) {
          if (count === 0) continue;
          const entry = entryMap.get(entryId);
          if (entry) {
            const dateStr = (entry.timestamp || entry.date) as string;
            candidateList.push({
              id: entryId,
              label: formatEntryLabel(entryType, entry, resolvedUnit),
              date: dateStr,
            });
          }
        }
        candidateList.sort((a, b) => b.date.localeCompare(a.date));
        setAllCandidates(candidateList);
      } catch {
        // Failed to load
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [entryType, initialEntryId]);

  // Available candidates (exclude already selected)
  const availableCandidates = useMemo(() => {
    const selectedIds = new Set(selectedEntries.map(e => e.id));
    return allCandidates.filter(c => !selectedIds.has(c.id));
  }, [allCandidates, selectedEntries]);

  // Add an entry to comparison
  const handleAddEntry = useCallback(async () => {
    if (!pickerValue) return;
    const candidate = allCandidates.find(c => c.id === pickerValue);
    if (!candidate) return;

    try {
      const res = await fetch(`/api/photos/${entryType}/${pickerValue}?list=true`).then(r => r.json());
      const indices = res.success && Array.isArray(res.data) ? res.data : [];
      setSelectedEntries(prev => [...prev, { id: pickerValue, label: candidate.label, indices }]);
      setPickerValue('');
    } catch {
      // Failed
    }
  }, [pickerValue, allCandidates, entryType]);

  // Remove an entry from comparison
  const handleRemoveEntry = useCallback((entryId: string) => {
    setSelectedEntries(prev => prev.filter(e => e.id !== entryId));
  }, []);

  // Build all photos for carousel
  const allPhotos: CarouselPhoto[] = useMemo(() => {
    return selectedEntries.flatMap(entry =>
      entry.indices.map(idx => ({
        url: `/api/photos/${entryType}/${entry.id}?index=${idx}`,
        label: entry.label,
      }))
    );
  }, [selectedEntries, entryType]);

  const handlePhotoClick = useCallback((photoUrl: string) => {
    const index = allPhotos.findIndex(p => p.url === photoUrl);
    setCarouselPhotos(allPhotos);
    setCarouselStartIndex(index >= 0 ? index : 0);
    setCarouselCurrent(index >= 0 ? index : 0);
    setShowCarousel(true);
  }, [allPhotos]);

  const handleDownload = useCallback(async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${entryType}-photo.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch {
      // Download failed
    }
  }, [entryType]);

  const handleGoBack = () => {
    router.push('/#history');
    router.refresh();
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              {t('photos.compareTitle')}
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container px-4 py-4 max-w-4xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          ) : (
            <>
              {/* Entry picker */}
              <div className="flex gap-2">
                <Select value={pickerValue} onValueChange={setPickerValue}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={
                      availableCandidates.length === 0
                        ? t('photos.noMoreEntries')
                        : t('photos.selectEntryToAdd')
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCandidates.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddEntry}
                  disabled={!pickerValue}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Selected entries grid */}
              {selectedEntries.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border border-dashed rounded-md">
                  {t('photos.noEntriesSelected')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEntries.map(entry => (
                    <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                      {/* Entry header */}
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium truncate">{entry.label}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleRemoveEntry(entry.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {/* Photo grid */}
                      {entry.indices.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('photos.noPhotos')}</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {entry.indices.map(idx => {
                            const url = `/api/photos/${entryType}/${entry.id}?index=${idx}`;
                            return (
                              <div key={idx} className="relative h-24 w-full">
                                <Image
                                  src={url}
                                  alt={t('photos.photoAlt', { n: idx + 1 })}
                                  fill
                                  sizes="(max-width: 768px) 33vw, 200px"
                                  unoptimized
                                  className="object-cover rounded-md cursor-pointer"
                                  onClick={() => handlePhotoClick(url)}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePhotoClick(url)}
                                  className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-0.5 h-5 w-5 flex items-center justify-center hover:bg-black/80"
                                >
                                  <Maximize2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Fullscreen carousel overlay */}
      {showCarousel && carouselPhotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95"
          onClick={() => setShowCarousel(false)}
        >
          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <span className="text-white/80 text-sm">
              {carouselCurrent + 1} / {carouselPhotos.length}
              {carouselPhotos[carouselCurrent] && (
                <span className="ml-2 text-white/60">— {carouselPhotos[carouselCurrent].label}</span>
              )}
            </span>
            <div className="flex gap-2">
              {carouselPhotos.length > 1 && (
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
                  if (carouselPhotos[carouselCurrent]) {
                    handleDownload(carouselPhotos[carouselCurrent].url);
                  }
                }}
                className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowCarousel(false)}
                className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Carousel */}
          <div className="w-full max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <Carousel
              opts={{ startIndex: carouselStartIndex, loop: false }}
              setApi={setCarouselApi}
              className="w-full"
            >
              <CarouselContent>
                {carouselPhotos.map((photo, idx) => (
                  <CarouselItem key={idx}>
                    <div className="relative h-[80vh] w-full">
                      <Image
                        src={photo.url}
                        alt={t('photos.photoAlt', { n: idx + 1 })}
                        fill
                        sizes="(max-width: 768px) 100vw, 90vw"
                        unoptimized
                        className="object-contain rounded-md"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      )}
    </div>
  );
}
