"use client";

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { subMonths, subDays, isAfter, parseISO, format, eachDayOfInterval, startOfDay } from 'date-fns';
import { Scale, Droplets, Footprints, HeartPulse, Pill } from 'lucide-react';
import {
  ChartContainer,
  type ChartConfig
} from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatDateForAxis, formatDateForTooltip } from '@/lib/date-utils';
import { formatWaterAmount } from '@/lib/water-utils';
import { getPressureCategory } from '@/lib/pressure-utils';
import type {
  WeightEntry,
  TimeFilter,
  ChartColor,
  DateFormatSettings,
  WaterEntry,
  WaterUnit,
  StepsEntry,
  PressureEntry,
  MedicationEntry,
  MedicationPreset,
  FeatureToggles,
  GoalSettings
} from '@/lib/types';

// Color mapping for chart
const CHART_COLORS: Record<ChartColor, string> = {
  primary: 'hsl(var(--primary))',
  blue: 'hsl(210, 100%, 50%)',
  green: 'hsl(142, 76%, 36%)',
  orange: 'hsl(25, 95%, 53%)',
  purple: 'hsl(270, 76%, 55%)'
};

// Specific colors for different chart types
const WATER_COLOR = 'hsl(210, 100%, 50%)';
const STEPS_COLOR = 'hsl(142, 76%, 36%)';
const SYSTOLIC_COLOR = 'hsl(0, 84%, 60%)';
const DIASTOLIC_COLOR = 'hsl(210, 100%, 50%)';

type ChartView = 'weight' | 'water' | 'steps' | 'pressure' | 'medication';
type MedicationTimeFilter = '7d' | '14d' | '30d' | 'all';

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeight?: number | null;
  unit: 'kg' | 'lb';
  chartColor?: ChartColor;
  dateFormat?: DateFormatSettings;
  // New data props
  waterEntries?: WaterEntry[];
  waterUnit?: WaterUnit;
  stepsEntries?: StepsEntry[];
  pressureEntries?: PressureEntry[];
  medicationEntries?: MedicationEntry[];
  medicationPresets?: MedicationPreset[];
  // Feature flags & goals
  features?: FeatureToggles;
  goals?: GoalSettings;
}

export function WeightChart({
  entries,
  targetWeight,
  unit,
  chartColor = 'primary',
  dateFormat,
  waterEntries = [],
  waterUnit = 'ml',
  stepsEntries = [],
  pressureEntries = [],
  medicationEntries = [],
  medicationPresets = [],
  features,
  goals
}: WeightChartProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [medTimeFilter, setMedTimeFilter] = useState<MedicationTimeFilter>('30d');
  const [currentView, setCurrentView] = useState<ChartView>('weight');
  const lineColor = CHART_COLORS[chartColor];

  // Feature flags
  const stepsEnabled = features?.stepsEnabled ?? false;
  const pressureEnabled = features?.pressureEnabled ?? false;
  const medicationEnabled = features?.medicationEnabled ?? false;

  // Goals
  const dailyWaterGoal = goals?.dailyWaterGoal ?? null;
  const dailyStepsGoal = goals?.dailyStepsGoal ?? null;

  // Get cutoff date based on time filter
  const getCutoffDate = (filter: TimeFilter): Date | null => {
    const now = new Date();
    switch (filter) {
      case '1m': return subMonths(now, 1);
      case '3m': return subMonths(now, 3);
      case '6m': return subMonths(now, 6);
      default: return null;
    }
  };

  // Weight chart data
  const { weightChartData, weightAverage, minWeight, maxWeight } = useMemo(() => {
    const cutoffDate = getCutoffDate(timeFilter);

    const filteredEntries = cutoffDate
      ? entries.filter(e => isAfter(new Date(e.timestamp), cutoffDate))
      : entries;

    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const data = sortedEntries.map(entry => ({
      date: entry.timestamp,
      weight: entry.weight,
      formattedDate: formatDateForAxis(entry.timestamp, dateFormat)
    }));

    const weights = sortedEntries.map(e => e.weight);
    const avg = weights.length > 0
      ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10
      : 0;
    const min = weights.length > 0 ? Math.min(...weights) : 0;
    const max = weights.length > 0 ? Math.max(...weights) : 0;

    return {
      weightChartData: data,
      weightAverage: avg,
      minWeight: min,
      maxWeight: max
    };
  }, [entries, timeFilter, dateFormat]);

  // Water chart data
  const { waterChartData, waterAverage } = useMemo(() => {
    const cutoffDate = getCutoffDate(timeFilter);

    const filteredEntries = cutoffDate
      ? waterEntries.filter(e => isAfter(parseISO(e.date), cutoffDate))
      : waterEntries;

    const sortedEntries = [...filteredEntries].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );

    const data = sortedEntries.map(entry => ({
      date: entry.date,
      amount: entry.amount,
      formattedDate: formatDateForAxis(entry.date, dateFormat)
    }));

    const amounts = sortedEntries.map(e => e.amount);
    const avg = amounts.length > 0
      ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
      : 0;

    return {
      waterChartData: data,
      waterAverage: avg
    };
  }, [waterEntries, timeFilter, dateFormat]);

  // Steps chart data
  const { stepsChartData, stepsAverage } = useMemo(() => {
    const cutoffDate = getCutoffDate(timeFilter);

    const filteredEntries = cutoffDate
      ? stepsEntries.filter(e => isAfter(parseISO(e.date), cutoffDate))
      : stepsEntries;

    const sortedEntries = [...filteredEntries].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );

    const data = sortedEntries.map(entry => ({
      date: entry.date,
      steps: entry.steps,
      formattedDate: formatDateForAxis(entry.date, dateFormat)
    }));

    const steps = sortedEntries.map(e => e.steps);
    const avg = steps.length > 0
      ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length)
      : 0;

    return {
      stepsChartData: data,
      stepsAverage: avg
    };
  }, [stepsEntries, timeFilter, dateFormat]);

  // Pressure chart data
  const pressureChartData = useMemo(() => {
    const cutoffDate = getCutoffDate(timeFilter);

    const filteredEntries = cutoffDate
      ? pressureEntries.filter(e => isAfter(new Date(e.timestamp), cutoffDate))
      : pressureEntries;

    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sortedEntries.map(entry => ({
      date: entry.timestamp,
      systolic: entry.systolic,
      diastolic: entry.diastolic,
      formattedDate: formatDateForAxis(entry.timestamp, dateFormat)
    }));
  }, [pressureEntries, timeFilter, dateFormat]);

  // Medication chart data
  const medicationChartData = useMemo(() => {
    if (medicationPresets.length === 0) return [];

    const now = new Date();
    let startDate: Date;

    switch (medTimeFilter) {
      case '7d': startDate = subDays(now, 7); break;
      case '14d': startDate = subDays(now, 14); break;
      case '30d': startDate = subDays(now, 30); break;
      default: {
        // Find earliest entry date or use 30 days ago
        const dates = medicationEntries.map(e => parseISO(e.date));
        startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : subDays(now, 30);
      }
    }

    // Generate all dates in range
    const dateRange = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(now) });

    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEntries = medicationEntries.filter(e => e.date === dateStr);
      const takenCount = dayEntries.filter(e => e.taken).length;
      const total = medicationPresets.length;
      const adherence = total > 0 ? Math.round((takenCount / total) * 100) : 0;

      return {
        date: dateStr,
        adherence,
        taken: takenCount,
        total,
        formattedDate: formatDateForAxis(dateStr, dateFormat)
      };
    });
  }, [medicationEntries, medicationPresets, medTimeFilter, dateFormat]);

  const chartConfig: ChartConfig = {
    weight: { label: `Weight (${unit})`, color: lineColor },
    water: { label: `Water (${waterUnit})`, color: WATER_COLOR },
    steps: { label: 'Steps', color: STEPS_COLOR },
    systolic: { label: 'Systolic', color: SYSTOLIC_COLOR },
    diastolic: { label: 'Diastolic', color: DIASTOLIC_COLOR },
    adherence: { label: 'Adherence %', color: 'hsl(270, 76%, 55%)' }
  };

  // Calculate Y-axis domain for weight chart
  const allWeightValues = [minWeight, maxWeight];
  if (targetWeight) allWeightValues.push(targetWeight);
  const yMin = Math.floor(Math.min(...allWeightValues) - 2);
  const yMax = Math.ceil(Math.max(...allWeightValues) + 0);

  // Get empty state message
  const getEmptyMessage = () => {
    switch (currentView) {
      case 'weight': return 'No weight entries yet. Add your first weight entry!';
      case 'water': return 'No water entries yet. Start tracking your water intake!';
      case 'steps': return 'No step entries yet. Start tracking your daily steps!';
      case 'pressure': return 'No blood pressure readings yet. Add your first reading!';
      case 'medication': return medicationPresets.length === 0
        ? 'No medications configured. Add medications in Settings.'
        : 'No medication data yet. Start tracking your medications!';
    }
  };

  // Check if current view has data
  const hasData = () => {
    switch (currentView) {
      case 'weight': return entries.length > 0;
      case 'water': return waterEntries.length > 0;
      case 'steps': return stepsEntries.length > 0;
      case 'pressure': return pressureEntries.length > 0;
      case 'medication': return medicationPresets.length > 0;
    }
  };

  // Render weight chart
  const renderWeightChart = () => (
    <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
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
      {weightAverage > 0 && (
        <ReferenceLine
          y={weightAverage}
          stroke={lineColor}
          strokeDasharray="5 5"
          strokeOpacity={0.6}
          label={{ value: `${weightAverage} ${unit}`, position: 'left', fontSize: 11, fill: lineColor }}
        />
      )}
      {targetWeight && (
        <ReferenceLine
          y={targetWeight}
          stroke="hsl(142, 76%, 36%)"
          strokeDasharray="3 3"
          label={{ value: `${targetWeight} ${unit}`, position: 'left', fontSize: 11, fill: 'hsl(142, 76%, 36%)' }}
        />
      )}
    </LineChart>
  );

  // Render water chart
  const renderWaterChart = () => (
    <BarChart data={waterChartData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
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
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        fontSize={12}
        className="fill-muted-foreground"
        tickFormatter={(value) => formatWaterAmount(value, waterUnit)}
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
                <div className="font-medium text-blue-500">
                  {formatWaterAmount(data.amount, waterUnit)}
                </div>
              </div>
            );
          }
          return null;
        }}
      />
      <Bar dataKey="amount" fill={WATER_COLOR} radius={[4, 4, 0, 0]} />
      {waterAverage > 0 && (
        <ReferenceLine
          y={waterAverage}
          stroke={WATER_COLOR}
          strokeDasharray="5 5"
          strokeOpacity={0.6}
          label={{ value: formatWaterAmount(waterAverage, waterUnit), position: 'left', fontSize: 11, fill: WATER_COLOR }}
        />
      )}
      {dailyWaterGoal && (
        <ReferenceLine
          y={dailyWaterGoal}
          stroke="hsl(142, 76%, 36%)"
          strokeDasharray="3 3"
          label={{ value: formatWaterAmount(dailyWaterGoal, waterUnit), position: 'left', fontSize: 11, fill: 'hsl(142, 76%, 36%)' }}
        />
      )}
    </BarChart>
  );

  // Render steps chart
  const renderStepsChart = () => (
    <BarChart data={stepsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
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
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        fontSize={12}
        className="fill-muted-foreground"
        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`}
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
                <div className="font-medium text-green-500">
                  {data.steps.toLocaleString()} steps
                </div>
              </div>
            );
          }
          return null;
        }}
      />
      <Bar dataKey="steps" fill={STEPS_COLOR} radius={[4, 4, 0, 0]} />
      {stepsAverage > 0 && (
        <ReferenceLine
          y={stepsAverage}
          stroke={STEPS_COLOR}
          strokeDasharray="5 5"
          strokeOpacity={0.6}
          label={{ value: `${stepsAverage >= 1000 ? `${(stepsAverage / 1000).toFixed(1)}k` : stepsAverage}`, position: 'left', fontSize: 11, fill: STEPS_COLOR }}
        />
      )}
      {dailyStepsGoal && (
        <ReferenceLine
          y={dailyStepsGoal}
          stroke="hsl(25, 95%, 53%)"
          strokeDasharray="3 3"
          label={{ value: `${dailyStepsGoal >= 1000 ? `${(dailyStepsGoal / 1000).toFixed(0)}k` : dailyStepsGoal}`, position: 'left', fontSize: 11, fill: 'hsl(25, 95%, 53%)' }}
        />
      )}
    </BarChart>
  );

  // Render pressure chart
  const renderPressureChart = () => (
    <LineChart data={pressureChartData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
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
        domain={['auto', 'auto']}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        fontSize={12}
        className="fill-muted-foreground"
      />
      <Tooltip
        content={({ active, payload }) => {
          if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            const category = getPressureCategory(data.systolic, data.diastolic);
            return (
              <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="text-xs text-muted-foreground mb-1">
                  {formatDateForTooltip(data.date, dateFormat)}
                </div>
                <div className="font-medium">
                  <span className="text-red-500">{data.systolic}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-blue-500">{data.diastolic}</span>
                  <span className="text-muted-foreground ml-1">mmHg</span>
                </div>
                <div className={`text-xs mt-1 ${category.color}`}>
                  {category.label}
                </div>
              </div>
            );
          }
          return null;
        }}
      />
      <Legend
        verticalAlign="top"
        height={24}
        formatter={(value) => <span className="text-xs">{value === 'systolic' ? 'Systolic' : 'Diastolic'}</span>}
      />
      <Line
        type="monotone"
        dataKey="systolic"
        stroke={SYSTOLIC_COLOR}
        strokeWidth={2}
        dot={{ r: 0, fill: SYSTOLIC_COLOR }}
        activeDot={{ r: 4, fill: SYSTOLIC_COLOR, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
      />
      <Line
        type="monotone"
        dataKey="diastolic"
        stroke={DIASTOLIC_COLOR}
        strokeWidth={2}
        dot={{ r: 0, fill: DIASTOLIC_COLOR }}
        activeDot={{ r: 4, fill: DIASTOLIC_COLOR, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
      />
      <ReferenceLine y={120} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" strokeOpacity={0.5} />
      <ReferenceLine y={80} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" strokeOpacity={0.5} />
    </LineChart>
  );

  // Render medication chart
  const renderMedicationChart = () => {
    // Get color based on adherence percentage
    const getBarColor = (adherence: number) => {
      if (adherence >= 100) return 'hsl(142, 76%, 36%)'; // green
      if (adherence >= 50) return 'hsl(45, 93%, 47%)'; // yellow
      if (adherence > 0) return 'hsl(25, 95%, 53%)'; // orange
      return 'hsl(0, 84%, 60%)'; // red
    };

    return (
      <BarChart data={medicationChartData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
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
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          className="fill-muted-foreground"
          tickFormatter={(value) => `${value}%`}
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
                  <div className="font-medium text-purple-500">
                    {data.taken}/{data.total} taken ({data.adherence}%)
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
          {medicationChartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.adherence)} />
          ))}
        </Bar>
        <ReferenceLine y={100} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" strokeOpacity={0.5} />
      </BarChart>
    );
  };

  // Render the appropriate chart based on current view
  const renderChart = () => {
    switch (currentView) {
      case 'weight': return renderWeightChart();
      case 'water': return renderWaterChart();
      case 'steps': return renderStepsChart();
      case 'pressure': return renderPressureChart();
      case 'medication': return renderMedicationChart();
    }
  };

  // Empty state
  if (!hasData()) {
    return (
      <Card className="h-full flex flex-col py-2">
        <CardHeader className="pb-2 py-0 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <ToggleGroup
              type="single"
              value={currentView}
              onValueChange={(v) => v && setCurrentView(v as ChartView)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="weight" aria-label="Weight">
                <Scale className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="water" aria-label="Water">
                <Droplets className="h-4 w-4" />
              </ToggleGroupItem>
              {stepsEnabled && (
                <ToggleGroupItem value="steps" aria-label="Steps">
                  <Footprints className="h-4 w-4" />
                </ToggleGroupItem>
              )}
              {pressureEnabled && (
                <ToggleGroupItem value="pressure" aria-label="Pressure">
                  <HeartPulse className="h-4 w-4" />
                </ToggleGroupItem>
              )}
              {medicationEnabled && (
                <ToggleGroupItem value="medication" aria-label="Medication">
                  <Pill className="h-4 w-4" />
                </ToggleGroupItem>
              )}
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center py-0">
          <div className="text-muted-foreground text-sm text-center">
            {getEmptyMessage()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col py-2">
      <CardHeader className="pb-0 py-0 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            value={currentView}
            onValueChange={(v) => v && setCurrentView(v as ChartView)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="weight" aria-label="Weight">
              <Scale className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="water" aria-label="Water">
              <Droplets className="h-4 w-4" />
            </ToggleGroupItem>
            {stepsEnabled && (
              <ToggleGroupItem value="steps" aria-label="Steps">
                <Footprints className="h-4 w-4" />
              </ToggleGroupItem>
            )}
            {pressureEnabled && (
              <ToggleGroupItem value="pressure" aria-label="Pressure">
                <HeartPulse className="h-4 w-4" />
              </ToggleGroupItem>
            )}
            {medicationEnabled && (
              <ToggleGroupItem value="medication" aria-label="Medication">
                <Pill className="h-4 w-4" />
              </ToggleGroupItem>
            )}
          </ToggleGroup>
          {currentView === 'medication' ? (
            <Select value={medTimeFilter} onValueChange={(v) => setMedTimeFilter(v as MedicationTimeFilter)}>
              <SelectTrigger className="w-17.5 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="14d">14d</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="w-17.5 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="6m">6M</SelectItem>
                <SelectItem value="3m">3M</SelectItem>
                <SelectItem value="1m">1M</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 py-0 min-h-0">
        <ChartContainer config={chartConfig} className="h-full w-full">
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
