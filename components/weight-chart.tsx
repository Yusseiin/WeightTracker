"use client";

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { subMonths, isAfter } from 'date-fns';
import {
  ChartContainer,
  type ChartConfig
} from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateForAxis, formatDateForTooltip } from '@/lib/date-utils';
import type { WeightEntry, TimeFilter, ChartColor, DateFormatSettings } from '@/lib/types';

// Color mapping for chart
const CHART_COLORS: Record<ChartColor, string> = {
  primary: 'hsl(var(--primary))',
  blue: 'hsl(210, 100%, 50%)',
  green: 'hsl(142, 76%, 36%)',
  orange: 'hsl(25, 95%, 53%)',
  purple: 'hsl(270, 76%, 55%)'
};

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeight?: number | null;
  unit: 'kg' | 'lb';
  chartColor?: ChartColor;
  dateFormat?: DateFormatSettings;
}

export function WeightChart({ entries, targetWeight, unit, chartColor = 'primary', dateFormat }: WeightChartProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const lineColor = CHART_COLORS[chartColor];

  const { chartData, average, minWeight, maxWeight } = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date | null = null;

    switch (timeFilter) {
      case '1m':
        cutoffDate = subMonths(now, 1);
        break;
      case '3m':
        cutoffDate = subMonths(now, 3);
        break;
      case '6m':
        cutoffDate = subMonths(now, 6);
        break;
    }

    // Filter entries by time
    const filteredEntries = cutoffDate
      ? entries.filter(e => isAfter(new Date(e.timestamp), cutoffDate))
      : entries;

    // Sort by timestamp ascending for chart display
    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Transform for chart
    const data = sortedEntries.map(entry => ({
      date: entry.timestamp,
      weight: entry.weight,
      formattedDate: formatDateForAxis(entry.timestamp, dateFormat)
    }));

    // Calculate statistics
    const weights = sortedEntries.map(e => e.weight);
    const avg = weights.length > 0
      ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10
      : 0;
    const min = weights.length > 0 ? Math.min(...weights) : 0;
    const max = weights.length > 0 ? Math.max(...weights) : 0;

    return {
      chartData: data,
      average: avg,
      minWeight: min,
      maxWeight: max
    };
  }, [entries, timeFilter, dateFormat]);

  const chartConfig: ChartConfig = {
    weight: {
      label: `Weight (${unit})`,
      color: lineColor
    }
  };

  // Calculate Y-axis domain with padding, including target weight
  const allValues = [minWeight, maxWeight];
  if (targetWeight) {
    allValues.push(targetWeight);
  }
  const yMin = Math.floor(Math.min(...allValues) - 2);
  const yMax = Math.ceil(Math.max(...allValues) + 0);

  if (entries.length === 0) {
    return (
      <Card className="h-full flex flex-col py-2">
        <CardHeader className="pb-2 py-0 shrink-0">
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center py-0">
          <div className="text-muted-foreground text-sm">
            No entries yet. Add your first weight entry!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col py-2">
      <CardHeader className="pb-0 py-0 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Progress</CardTitle>
          <ToggleGroup
            type="single"
            value={timeFilter}
            onValueChange={(v) => v && setTimeFilter(v as TimeFilter)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="6m">6M</ToggleGroupItem>
            <ToggleGroupItem value="3m">3M</ToggleGroupItem>
            <ToggleGroupItem value="1m">1M</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="flex-1 py-0 min-h-0">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={[yMin, yMax]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              className="fill-muted-foreground"
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="text-xs text-muted-foreground mb-1">
                        {formatDateForTooltip(data.date, dateFormat)}
                      </div>
                      <div className="font-medium">
                        {data.weight} {unit}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 0, fill: lineColor }}
              activeDot={{ r: 4, fill: lineColor, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
            {/* Average reference line */}
            {average > 0 && (
              <ReferenceLine
                y={average}
                stroke={lineColor}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                label={{
                  value: `${average} ${unit}`,
                  position: 'left',
                  fontSize: 11,
                  fill: lineColor
                }}
              />
            )}
            {/* Target weight reference line */}
            {targetWeight && (
              <ReferenceLine
                y={targetWeight}
                stroke="hsl(142, 76%, 36%)"
                strokeDasharray="3 3"
                label={{
                  value: `${targetWeight} ${unit}`,
                  position: 'left',
                  fontSize: 11,
                  fill: 'hsl(142, 76%, 36%)'
                }}
              />
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

