"use client";

import { Fragment, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Camera, Images } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BodyMeasurementEntry,
  BodyMeasurementPreset,
  CM_PER_INCH,
  MeasurementUnit,
} from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';

function display(cm: number, unit: MeasurementUnit): string {
  const v = unit === 'in' ? cm / CM_PER_INCH : cm;
  return v.toFixed(1);
}

interface BodyMeasurementsTableProps {
  entries: BodyMeasurementEntry[];
  presets: BodyMeasurementPreset[];
  unit: MeasurementUnit;
  photoCounts: Record<string, number>;
  onEdit: (entry: BodyMeasurementEntry) => void;
  onCompare: (entry: BodyMeasurementEntry) => void;
}

export function BodyMeasurementsTable({
  entries,
  presets,
  unit,
  photoCounts,
  onEdit,
  onCompare,
}: BodyMeasurementsTableProps) {
  const { t } = useTranslation();
  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => a.order - b.order),
    [presets]
  );

  const [expanded, setExpanded] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('bodyMeasurements.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('bodyMeasurements.noMeasurements')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('bodyMeasurements.history')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('bodyMeasurements.summary')}</TableHead>
                <TableHead className="text-right">{t('bodyMeasurements.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isExpanded = expanded === entry.id;
                const entryDate = parseISO(entry.timestamp);
                const photoCount = photoCounts[entry.id] ?? 0;

                // Build condensed summary: first 3 measurements in preset order
                const presentInOrder = sortedPresets.filter(
                  (p) => entry.measurements[p.id] != null
                );
                const summaryItems = presentInOrder.slice(0, 3);
                const remaining = presentInOrder.length - summaryItems.length;

                return (
                  <Fragment key={entry.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{format(entryDate, 'dd MMM yyyy')}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(entryDate, 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          {summaryItems.map((preset) => (
                            <span key={preset.id} className="whitespace-nowrap">
                              <span className={preset.color}>{preset.label}</span>{' '}
                              {display(entry.measurements[preset.id], unit)} {unit}
                            </span>
                          ))}
                          {remaining > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {t('bodyMeasurements.moreCount', { n: remaining })}
                            </span>
                          )}
                          {photoCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Camera className="h-3 w-3" />
                              {photoCount}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {photoCount > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCompare(entry);
                            }}
                            title={t('bodyMeasurements.comparePhotos')}
                          >
                            <Images className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(entry);
                          }}
                          title={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
                            {sortedPresets
                              .filter((p) => entry.measurements[p.id] != null)
                              .map((preset) => (
                                <div key={preset.id} className="flex justify-between text-sm">
                                  <span className={preset.color}>{preset.label}</span>
                                  <span className="font-mono">
                                    {display(entry.measurements[preset.id], unit)} {unit}
                                  </span>
                                </div>
                              ))}
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground pb-2 italic">
                              {entry.notes}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
