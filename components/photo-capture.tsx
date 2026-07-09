"use client";

import { useState, useRef, useEffect } from 'react';
import { Camera, ImageIcon, X, Loader2, Maximize2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { compressImage } from '@/lib/image-utils';
import { useTranslation } from '@/hooks/use-translation';

export type PhotoEntryType = 'weight' | 'medication' | 'injection' | 'steps' | 'pressure' | 'body-measurement';

interface PhotoItem {
  url: string;
  index?: number;      // server index (for existing photos)
  file?: File;         // local file (for pending uploads)
  isExisting: boolean;
}

interface PhotoCaptureProps {
  entryType: PhotoEntryType;
  entryId: string | null;              // null when creating new entry (deferred upload)
  onPhotosChange?: (files: File[]) => void; // For add dialogs (deferred upload)
}

export function PhotoCapture({
  entryType,
  entryId,
  onPhotosChange,
}: PhotoCaptureProps) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselCurrent, setCarouselCurrent] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load existing photos when in edit mode
  useEffect(() => {
    if (!entryId) {
      setPhotos([]);
      return;
    }
    setIsLoading(true);
    fetch(`/api/photos/${entryType}/${entryId}?list=true`)
      .then(r => r.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          setPhotos(result.data.map((idx: number) => ({
            url: `/api/photos/${entryType}/${entryId}?index=${idx}`,
            index: idx,
            isExisting: true,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [entryType, entryId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], 'photo.jpg', { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(compressed);

      const newItem: PhotoItem = {
        url: previewUrl,
        file: compressedFile,
        isExisting: false,
      };

      if (entryId) {
        // Edit mode: upload immediately
        setUploadingCount(c => c + 1);
        try {
          const formData = new FormData();
          formData.append('photo', compressedFile);
          const res = await fetch(`/api/photos/${entryType}/${entryId}`, {
            method: 'POST',
            body: formData,
          });
          const result = await res.json();
          if (result.success) {
            newItem.index = result.data.index;
            newItem.url = `/api/photos/${entryType}/${entryId}?index=${result.data.index}`;
            newItem.isExisting = true;
            newItem.file = undefined;
          }
        } finally {
          setUploadingCount(c => c - 1);
        }
      }

      setPhotos(prev => {
        const updated = [...prev, newItem];
        if (onPhotosChange) {
          onPhotosChange(updated.filter(p => p.file).map(p => p.file!));
        }
        return updated;
      });
    } catch {
      // Compression failed
    }

    e.target.value = '';
  };

  const handleRemove = async (photoIndex: number) => {
    const photo = photos[photoIndex];
    if (!photo) return;

    // Revoke blob URL if local
    if (photo.url.startsWith('blob:')) {
      URL.revokeObjectURL(photo.url);
    }

    // Delete from server if existing
    if (photo.isExisting && entryId && photo.index !== undefined) {
      await fetch(`/api/photos/${entryType}/${entryId}?index=${photo.index}`, { method: 'DELETE' });
    }

    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== photoIndex);
      if (onPhotosChange) {
        onPhotosChange(updated.filter(p => p.file).map(p => p.file!));
      }
      return updated;
    });
    setDeleteTarget(null);
  };

  const handleDownload = async (url: string) => {
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
  };

  // Track carousel position (must be before early returns to satisfy Rules of Hooks)
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCarouselCurrent(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('photos.loadingPhotos')}</span>
      </div>
    );
  }

  const fullscreenPhoto = fullscreenIndex !== null ? photos[fullscreenIndex] : null;
  const useCarouselView = fullscreenPhoto && photos.length > 1;

  return (
    <div className="space-y-2">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo thumbnails grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div key={photo.url} className="relative">
              <img
                src={photo.url}
                alt={t('photos.photoAlt', { n: idx + 1 })}
                className="h-24 w-full object-cover rounded-md"
                onError={() => {
                  setPhotos(prev => prev.filter((_, i) => i !== idx));
                }}
              />
              {uploadingCount > 0 && !photo.isExisting && !photo.file && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setDeleteTarget(idx)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 h-5 w-5 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenIndex(idx)}
                className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-0.5 h-5 w-5 flex items-center justify-center hover:bg-black/80"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Camera + file picker buttons - always visible */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-1" />
          {t('photos.camera')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          <ImageIcon className="h-4 w-4 mr-1" />
          {t('photos.gallery')}
        </Button>
      </div>

      {/* Fullscreen Photo Overlay */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={() => setFullscreenIndex(null)}
        >
          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            {useCarouselView ? (
              <span className="text-white/80 text-sm">
                {carouselCurrent + 1} / {photos.length}
              </span>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {useCarouselView && (
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
                  const url = useCarouselView ? photos[carouselCurrent]?.url : fullscreenPhoto.url;
                  if (url) handleDownload(url);
                }}
                className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenIndex(null)}
                className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {useCarouselView ? (
            <div className="w-full max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <Carousel
                opts={{ startIndex: fullscreenIndex!, loop: false }}
                setApi={setCarouselApi}
                className="w-full"
              >
                <CarouselContent>
                  {photos.map((photo, idx) => (
                    <CarouselItem key={idx}>
                      <div className="flex items-center justify-center h-[80vh]">
                        <img
                          src={photo.url}
                          alt={t('photos.photoAlt', { n: idx + 1 })}
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
              src={fullscreenPhoto.url}
              alt={t('photos.fullscreenAlt')}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-md"
              onClick={(e) => e.stopPropagation()}
              onError={() => setFullscreenIndex(null)}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('photos.deletePhotoTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('photos.deletePhotoDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget !== null) handleRemove(deleteTarget); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
