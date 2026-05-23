"use client";

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BodyMeasurementEntry,
  BodyMeasurementPreset,
  CM_PER_INCH,
  MeasurementUnit,
} from '@/lib/types';

// Tailwind color class -> HSL string (matches weight-chart MEDICATION_COLOR_MAP, extended)
const COLOR_MAP: Record<string, string> = {
  'text-slate-500': 'hsl(215, 16%, 47%)',
  'text-teal-500': 'hsl(174, 72%, 40%)',
  'text-blue-500': 'hsl(210, 100%, 50%)',
  'text-purple-500': 'hsl(270, 76%, 55%)',
  'text-green-500': 'hsl(142, 76%, 36%)',
  'text-emerald-500': 'hsl(160, 84%, 39%)',
  'text-orange-500': 'hsl(25, 95%, 53%)',
  'text-red-500': 'hsl(0, 84%, 60%)',
  'text-pink-500': 'hsl(330, 81%, 60%)',
  'text-indigo-500': 'hsl(239, 84%, 67%)',
  'text-yellow-500': 'hsl(48, 96%, 53%)',
  'text-cyan-500': 'hsl(188, 94%, 43%)',
};

function colorFor(preset: BodyMeasurementPreset): string {
  return COLOR_MAP[preset.color] || 'hsl(215, 16%, 47%)';
}

function toDisplay(cm: number, unit: MeasurementUnit): number {
  return unit === 'in' ? cm / CM_PER_INCH : cm;
}

interface BodyMeasurementsChartProps {
  entries: BodyMeasurementEntry[];
  presets: BodyMeasurementPreset[];
  unit: MeasurementUnit;
}

export function BodyMeasurementsChart({
  entries,
  presets,
  unit,
}: BodyMeasurementsChartProps) {
  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => a.order - b.order),
    [presets]
  );

  const [singleId, setSingleId] = useState<string>(sortedPresets[0]?.id ?? '');

  // Chart data: each point is { ts (ms), <presetId>: displayValue, ... }
  const chartData = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return sorted.map((e) => {
      const point: Record<string, number> = { ts: new Date(e.timestamp).getTime() };
      for (const [id, cm] of Object.entries(e.measurements)) {
        point[id] = parseFloat(toDisplay(cm, unit).toFixed(2));
      }
      return point;
    });
  }, [entries, unit]);

  const singlePreset = sortedPresets.find((p) => p.id === singleId);
  const singleAvg = useMemo(() => {
    if (!singlePreset) return null;
    const values = chartData.map((p) => p[singlePreset.id]).filter((v) => typeof v === 'number');
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }, [chartData, singlePreset]);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Measurements Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No measurements recorded yet. Add your first entry to see the chart.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurements Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combined">
          <TabsList className="mb-4">
            <TabsTrigger value="combined">Combined</TabsTrigger>
            <TabsTrigger value="single">Single</TabsTrigger>
          </TabsList>

          <TabsContent value="combined">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  scale="time"
                  tickFormatter={(v) => format(new Date(v), 'MMM d')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{ value: unit, angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip
                  labelFormatter={(v) => format(new Date(v as number), 'PPP p')}
                  formatter={(value: number, name: string) => {
                    const preset = sortedPresets.find((p) => p.id === name);
                    return [`${value} ${unit}`, preset?.label ?? name];
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    const preset = sortedPresets.find((p) => p.id === value);
                    return preset?.label ?? value;
                  }}
                />
                {sortedPresets.map((preset) => (
                  <Line
                    key={preset.id}
                    type="monotone"
                    dataKey={preset.id}
                    stroke={colorFor(preset)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="single">
            <div className="space-y-4">
              <Select value={singleId} onValueChange={setSingleId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Pick a measurement" />
                </SelectTrigger>
                <SelectContent>
                  {sortedPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {singlePreset ? (
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="ts"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      scale="time"
                      tickFormatter={(v) => format(new Date(v), 'MMM d')}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{
                        value: unit,
                        angle: -90,
                        position: 'insideLeft',
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      labelFormatter={(v) => format(new Date(v as number), 'PPP p')}
                      formatter={(value: number) => [`${value} ${unit}`, singlePreset.label]}
                    />
                    {singleAvg != null && (
                      <ReferenceLine
                        y={singleAvg}
                        stroke={colorFor(singlePreset)}
                        strokeDasharray="4 4"
                        label={{
                          value: `avg ${singleAvg.toFixed(1)}`,
                          position: 'right',
                          fontSize: 11,
                          fill: colorFor(singlePreset),
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey={singlePreset.id}
                      stroke={colorFor(singlePreset)}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Pick a measurement to display.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

