"use client";

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Droplets } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DynamicIcon } from '@/components/dynamic-icon';
import { formatWaterAmount } from '@/lib/water-utils';
import { formatDateForTable } from '@/lib/date-utils';
import type { WeightEntry, WaterEntry, WaterUnit, DateFormatSettings, CustomActivity } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EntriesTableProps {
  entries: WeightEntry[];
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  onRowClick: (entry: WeightEntry) => void;
  waterEntries?: WaterEntry[];
  dateFormat?: DateFormatSettings;
  activities: CustomActivity[];
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

export function EntriesTable({ entries, unit, waterUnit, onRowClick, waterEntries = [], dateFormat, activities }: EntriesTableProps) {
  // Create a map of water entries by date for quick lookup
  const waterByDate = useMemo(() => {
    const map = new Map<string, WaterEntry>();
    for (const entry of waterEntries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [waterEntries]);

  if (entries.length === 0) {
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

  // Calculate differences and add water data
  const entriesWithDiff = entries.map((entry, index) => {
    const previousEntry = entries[index + 1];
    const diff = previousEntry
      ? Math.round((entry.weight - previousEntry.weight) * 10) / 10
      : 0;
    // Get water for this entry's date
    const entryDate = format(new Date(entry.timestamp), 'yyyy-MM-dd');
    const water = waterByDate.get(entryDate);
    return { ...entry, diff, water: water?.amount || 0 };
  });

  return (
    <Card className="py-0">
      <CardContent className="px-0 sm:px-2 pt-4">
        <h3 className="text-lg font-semibold mb-0 px-2 sm:px-0">History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-1 font-medium">Date</th>
                <th className="text-center py-2 px-0.5 font-medium w-10">Train</th>
                <th className="text-center py-2 px-0.5 font-medium w-10">Sleep</th>
                <th className="text-right py-2 px-0.5 font-medium">Weight</th>
                <th className="text-right py-2 px-0.5 font-medium w-14">Diff</th>
                <th className="text-right py-2 px-1 font-medium w-14">
                  <Droplets className="h-4 w-4 inline text-blue-500" />
                </th>
              </tr>
            </thead>
            <tbody>
              {entriesWithDiff.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => onRowClick(entry)}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                >
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
                  <td className="py-2 px-1 text-right whitespace-nowrap text-blue-500">
                    {entry.water > 0 ? formatWaterAmount(entry.water, waterUnit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
