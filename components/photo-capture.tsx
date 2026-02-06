"use client";

import { useState, useRef, useEffect } from 'react';
import { Camera, ImageIcon, X, Loader2, Maximize2, Download } from 'lucide-react';
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
import { compressImage } from '@/lib/image-utils';

export type PhotoEntryType = 'weight' | 'medication' | 'injection' | 'steps' | 'pressure';

interface PhotoCaptureProps {
  entryType: PhotoEntryType;
  entryId: string | null;              // null when creating new entry (deferred upload)
  existingPhotoUrl?: string | null;    // For edit dialogs
  onPhotoChange?: (file: File | null) => void; // For add dialogs (deferred upload)
}

export function PhotoCapture({
  entryType,
  entryId,
  existingPhotoUrl,
  onPhotoChange,
}: PhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Check for existing photo when in edit mode
  useEffect(() => {
    if (existingPhotoUrl && entryId) {
      setIsLoading(true);
      fetch(existingPhotoUrl, { method: 'HEAD' })
        .then(r => {
          if (r.ok) {
            setPreviewUrl(existingPhotoUrl);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setPreviewUrl(null);
    }
  }, [existingPhotoUrl, entryId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress before anything
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], 'photo.jpg', { type: 'image/jpeg' });

      // Show preview
      const url = URL.createObjectURL(compressed);
      setPreviewUrl(url);

      if (onPhotoChange) {
        onPhotoChange(compressedFile);
      }

      // If we have an entryId (edit mode), upload immediately
      if (entryId) {
        await uploadPhoto(compressedFile);
      }
    } catch {
      // Failed to compress, ignore
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const uploadPhoto = async (file: File) => {
    if (!entryId) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await fetch(`/api/photos/${entryType}/${entryId}`, {
        method: 'POST',
        body: formData,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setShowDeleteConfirm(false);
    if (onPhotoChange) onPhotoChange(null);

    // If we have an entryId, delete from server
    if (entryId) {
      await fetch(`/api/photos/${entryType}/${entryId}`, { method: 'DELETE' });
    }
  };

  const handleDownload = async () => {
    if (!previewUrl) return;
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entryType}-photo.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Download failed
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading photo...</span>
      </div>
    );
  }

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

      {previewUrl ? (
        // Photo preview with remove and fullscreen buttons
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Entry photo"
            className="h-32 w-full object-cover rounded-md"
            onError={() => { setPreviewUrl(null); if (onPhotoChange) onPhotoChange(null); }}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 h-6 w-6 flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1 h-6 w-6 flex items-center justify-center hover:bg-black/80"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      ) : (
        // Camera + file picker buttons
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-1" />
            Camera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            Gallery
          </Button>
        </div>
      )}

      {/* Fullscreen Photo Overlay */}
      {fullscreen && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setFullscreen(false)}
        >
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
            >
              <Download className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <img
            src={previewUrl}
            alt="Full screen photo"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
            onError={() => setFullscreen(false)}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the photo. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
