"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBodyMeasurements } from '@/hooks/use-body-measurements';
import { AddBodyMeasurementDialog } from './add-body-measurement-dialog';
import { EditBodyMeasurementDialog } from './edit-body-measurement-dialog';
import { BodyMeasurementsChart } from './body-measurements-chart';
import { BodyMeasurementsTable } from './body-measurements-table';
import {
  BodyMeasurementEntry,
  BodyMeasurementPreset,
  MeasurementUnit,
} from '@/lib/types';

interface BodyMeasurementsPageProps {
  initialEntries: BodyMeasurementEntry[];
  initialPresets: BodyMeasurementPreset[];
  initialUnit: MeasurementUnit;
  photosEnabled: boolean;
}

export function BodyMeasurementsPage({
  initialEntries,
  initialPresets,
  initialUnit,
  photosEnabled,
}: BodyMeasurementsPageProps) {
  const router = useRouter();
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } =
    useBodyMeasurements(initialEntries);

  const [presets] = useState<BodyMeasurementPreset[]>(initialPresets);
  const [unit] = useState<MeasurementUnit>(initialUnit);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BodyMeasurementEntry | null>(null);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});

  // Refresh photo counts whenever the entries list changes
  useEffect(() => {
    if (!photosEnabled) return;
    let cancelled = false;
    fetch('/api/photos?type=body-measurement')
      .then((r) => r.json())
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.data && typeof result.data === 'object') {
          setPhotoCounts(result.data as Record<string, number>);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entries, photosEnabled]);

  const handleCompare = (entry: BodyMeasurementEntry) => {
    router.push(`/compare-photos?type=body-measurement&entry=${entry.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Body Measurements</h1>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} disabled={presets.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </header>

        {presets.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No measurement presets configured yet.
            </p>
            <Button
              variant="link"
              onClick={() => router.push('/settings')}
              className="mt-2"
            >
              Configure in Settings
            </Button>
          </div>
        ) : (
          <>
            <BodyMeasurementsChart entries={entries} presets={presets} unit={unit} />

            <BodyMeasurementsTable
              entries={entries}
              presets={presets}
              unit={unit}
              photoCounts={photoCounts}
              onEdit={(e) => setEditTarget(e)}
              onCompare={handleCompare}
            />
          </>
        )}

        <AddBodyMeasurementDialog
          presets={presets}
          unit={unit}
          onAdd={addEntry}
          isLoading={isLoading}
          open={addOpen}
          onOpenChange={setAddOpen}
          photosEnabled={photosEnabled}
        />

        <EditBodyMeasurementDialog
          entry={editTarget}
          presets={presets}
          unit={unit}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          photosEnabled={photosEnabled}
        />
      </div>
    </div>
  );
}
