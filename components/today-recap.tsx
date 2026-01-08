"use client";

import { useMemo } from 'react';
import { isToday, parseISO } from 'date-fns';
import { Scale, Droplets } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { WeightEntry, WaterEntry, WaterUnit } from '@/lib/types';
import { formatWaterAmount } from '@/lib/water-utils';
import { formatDateForRecap } from '@/lib/date-utils';

interface TodayRecapProps {
  entries: WeightEntry[];
  todayWater: WaterEntry | null;
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
}

export function TodayRecap({ entries, todayWater, unit, waterUnit }: TodayRecapProps) {
  const { todayWeight, lastWeight, lastWeightDate } = useMemo(() => {
    if (entries.length === 0) {
      return { todayWeight: null, lastWeight: null, lastWeightDate: null };
    }

    // Sort by timestamp descending
    const sorted = [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Check if latest entry is today
    const latest = sorted[0];
    const latestDate = parseISO(latest.timestamp);

    if (isToday(latestDate)) {
      return {
        todayWeight: latest.weight,
        lastWeight: null,
        lastWeightDate: null
      };
    }

    // No today entry, use last weight
    return {
      todayWeight: null,
      lastWeight: latest.weight,
      lastWeightDate: formatDateForRecap(latestDate)
    };
  }, [entries]);

  const waterAmount = todayWater?.amount || 0;
  const hasWeight = todayWeight !== null || lastWeight !== null;

  return (
    <Card className="py-2 shrink-0">
      <CardContent className="py-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Today</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-0">
          {/* Weight section */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              {hasWeight ? (
                <>
                  <div className="text-lg font-semibold">
                    {todayWeight ?? lastWeight} {unit}
                  </div>
                  {lastWeightDate && (
                    <div className="text-xs text-muted-foreground">
                      last: {lastWeightDate}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No entries</div>
              )}
            </div>
          </div>

          {/* Water section */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Droplets className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="text-lg font-semibold">
                {formatWaterAmount(waterAmount, waterUnit)}
              </div>
              <div className="text-xs text-muted-foreground">water</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
