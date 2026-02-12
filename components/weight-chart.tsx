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
  GoalSettings,
  InjectionEntry,
  InjectionSettings,
  ChartCombination
} from '@/lib/types';
import { DEFAULT_CHART_COMBINATIONS } from '@/lib/types';
import { DynamicIcon } from '@/components/dynamic-icon';

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
const INJECTION_COLOR = 'hsl(174, 72%, 40%)'; // teal
const BODY_FAT_COLOR = 'hsl(330, 81%, 60%)';

// Mapping from Tailwind color classes to HSL for injection medications
const MEDICATION_COLOR_MAP: Record<string, string> = {
  'text-teal-500': 'hsl(174, 72%, 40%)',
  'text-blue-500': 'hsl(210, 100%, 50%)',
  'text-purple-500': 'hsl(270, 76%, 55%)',
  'text-green-500': 'hsl(142, 76%, 36%)',
  'text-orange-500': 'hsl(25, 95%, 53%)',
  'text-red-500': 'hsl(0, 84%, 60%)',
  'text-pink-500': 'hsl(330, 81%, 60%)',
  'text-indigo-500': 'hsl(239, 84%, 67%)',
  'text-yellow-500': 'hsl(48, 96%, 53%)',
  'text-cyan-500': 'hsl(188, 94%, 43%)',
};

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
  // Injection data
  injectionEntries?: InjectionEntry[];
  injectionSettings?: InjectionSettings;
  // Feature flags & goals
  features?: FeatureToggles;
  goals?: GoalSettings;
  // Chart configuration
  chartCombinations?: ChartCombination[];
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
  injectionEntries = [],
  injectionSettings,
  features,
  goals,
  chartCombinations
}: WeightChartProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [medTimeFilter, setMedTimeFilter] = useState<MedicationTimeFilter>('30d');
  const lineColor = CHART_COLORS[chartColor];

  // Get active chart combinations (enabled and sorted by order)
  const activeCombinations = useMemo(() => {
    const combinations = chartCombinations || DEFAULT_CHART_COMBINATIONS;
    return combinations
      .filter(c => c.enabled)
      .filter(c => {
        // Filter based on feature flags
        const chartsAvailable = c.charts.every(chart => {
          if (chart === 'weight') return true;
          if (chart === 'water') return features?.waterEnabled ?? true;
          if (chart === 'steps') return features?.stepsEnabled ?? false;
          if (chart === 'pressure') return features?.pressureEnabled ?? false;
          if (chart === 'medication') return features?.medicationEnabled ?? false;
          if (chart === 'injections') return features?.injectionsEnabled ?? false;
          if (chart === 'bodyfat') return features?.bodyFatEnabled ?? false;
          return false;
        });
        return chartsAvailable;
      })
      .sort((a, b) => a.order - b.order);
  }, [chartCombinations, features]);

  // Initialize currentView to first enabled combination
  const [currentView, setCurrentView] = useState<string>(() => {
    const combinations = chartCombinations || DEFAULT_CHART_COMBINATIONS;
    const firstEnabled = combinations.find(c => c.enabled);
    return firstEnabled?.id || 'weight';
  });

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
      ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length)
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

  // Body fat chart data (from weight entries that have bodyFat)
  const { bodyFatChartData, bodyFatAverage, minBodyFat, maxBodyFat } = useMemo(() => {
    const cutoffDate = getCutoffDate(timeFilter);
    const filteredEntries = cutoffDate
      ? entries.filter(e => isAfter(new Date(e.timestamp), cutoffDate))
      : entries;
    const entriesWithBodyFat = filteredEntries.filter(e => e.bodyFat != null);
    const sortedEntries = [...entriesWithBodyFat].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const data = sortedEntries.map(entry => ({
      date: entry.timestamp,
      bodyFat: entry.bodyFat!,
      formattedDate: formatDateForAxis(entry.timestamp, dateFormat)
    }));
    const values = sortedEntries.map(e => e.bodyFat!);
    const avg = values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    return { bodyFatChartData: data, bodyFatAverage: avg, minBodyFat: min, maxBodyFat: max };
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

  // Get medication filter for current view (empty array means show all)
  const currentMedicationFilter = useMemo(() => {
    const combination = activeCombinations.find(c => c.id === currentView);
    return combination?.injectionMedicationIds || [];
  }, [activeCombinations, currentView]);

  // Injection chart data - restructured to support multiple medications with filtering
  const { injectionChartData, uniqueMedications } = useMemo(() => {
    if (!injectionSettings?.medications || injectionSettings.medications.length === 0) {
      return { injectionChartData: [], uniqueMedications: [] };
    }

    const cutoffDate = getCutoffDate(timeFilter);

    // Filter entries by time
    let filteredEntries = cutoffDate
      ? injectionEntries.filter(e => isAfter(new Date(e.timestamp), cutoffDate))
      : injectionEntries;

    // Filter entries by selected medications (if filter is set)
    if (currentMedicationFilter.length > 0) {
      filteredEntries = filteredEntries.filter(e => currentMedicationFilter.includes(e.medicationId));
    }

    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Get unique medications used in entries (filtered)
    const medicationIds = [...new Set(sortedEntries.map(e => e.medicationId))];
    let uniqueMeds = medicationIds
      .map(id => injectionSettings.medications.find(m => m.id === id))
      .filter((m): m is typeof injectionSettings.medications[0] => m !== undefined);

    // If filter is set but no entries match, still show the selected medications for reference
    if (currentMedicationFilter.length > 0 && uniqueMeds.length === 0) {
      uniqueMeds = currentMedicationFilter
        .map(id => injectionSettings.medications.find(m => m.id === id))
        .filter((m): m is typeof injectionSettings.medications[0] => m !== undefined);
    }

    // Create chart data with ALL medication dose fields in each data point
    const chartData = sortedEntries.map(entry => {
      const site = injectionSettings.injectionSites?.find(s => s.id === entry.siteId);

      // Create base entry with null doses for ALL unique medications
      const dataPoint: Record<string, unknown> = {
        date: entry.timestamp,
        formattedDate: formatDateForAxis(entry.timestamp, dateFormat),
        site: site?.label || 'Unknown',
      };

      // Initialize ALL medication dose fields to null first
      uniqueMeds.forEach(med => {
        dataPoint[`dose_${med.id}`] = null;
        dataPoint[`name_${med.id}`] = med.name;
        dataPoint[`unit_${med.id}`] = med.unit;
      });

      // Set the actual dose for the medication used in this entry
      const medication = injectionSettings.medications.find(m => m.id === entry.medicationId);
      if (medication) {
        dataPoint[`dose_${medication.id}`] = entry.dose;
      }

      return dataPoint;
    });

    return { injectionChartData: chartData, uniqueMedications: uniqueMeds };
  }, [injectionEntries, injectionSettings, timeFilter, dateFormat, currentMedicationFilter]);

  // Pre-compute merged line chart data (for combined weight + pressure + injections charts)
  const mergedLineChartData = useMemo(() => {
    const dataMap = new Map<string, Record<string, unknown>>();

    // Collect all unique dates from all data sources first
    const allDates = new Set<string>();
    weightChartData.forEach(e => allDates.add(e.date.substring(0, 10)));
    pressureChartData.forEach(e => allDates.add(e.date.substring(0, 10)));
    injectionChartData.forEach(e => allDates.add(String(e.date).substring(0, 10)));
    bodyFatChartData.forEach(e => allDates.add(e.date.substring(0, 10)));

    // Initialize all dates with null values for all possible fields
    allDates.forEach(key => {
      dataMap.set(key, {
        date: key,
        formattedDate: '',
        weight: null,
        systolic: null,
        diastolic: null,
        bodyFat: null,
      });
    });

    // Add weight data
    weightChartData.forEach(entry => {
      const key = entry.date.substring(0, 10);
      const existing = dataMap.get(key) || {};
      dataMap.set(key, {
        ...existing,
        date: entry.date,
        formattedDate: entry.formattedDate,
        weight: entry.weight
      });
    });

    // Add pressure data
    pressureChartData.forEach(entry => {
      const key = entry.date.substring(0, 10);
      const existing = dataMap.get(key) || {};
      dataMap.set(key, {
        ...existing,
        date: (existing.formattedDate ? existing.date : entry.date),
        formattedDate: existing.formattedDate || entry.formattedDate,
        systolic: entry.systolic,
        diastolic: entry.diastolic
      });
    });

    // Add injection data (medication dose fields)
    injectionChartData.forEach(entry => {
      const key = String(entry.date).substring(0, 10);
      const existing = dataMap.get(key) || {};
      dataMap.set(key, {
        ...existing,
        ...entry,
        date: (existing.formattedDate ? existing.date : entry.date),
        formattedDate: existing.formattedDate || entry.formattedDate,
      });
    });

    // Add body fat data
    bodyFatChartData.forEach(entry => {
      const key = entry.date.substring(0, 10);
      if (dataMap.has(key)) {
        const existing = dataMap.get(key)!;
        existing.bodyFat = entry.bodyFat;
      }
    });

    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
  }, [weightChartData, pressureChartData, injectionChartData, bodyFatChartData]);

  // Pre-compute merged bar chart data (for combined water + steps + medication charts)
  const mergedBarChartData = useMemo(() => {
    const dataMap = new Map<string, Record<string, unknown>>();

    // Add water data
    waterChartData.forEach(entry => {
      dataMap.set(entry.date, {
        ...dataMap.get(entry.date),
        date: entry.date,
        formattedDate: entry.formattedDate,
        water: entry.amount
      });
    });

    // Add steps data
    stepsChartData.forEach(entry => {
      const existing = dataMap.get(entry.date) || {};
      dataMap.set(entry.date, {
        ...existing,
        date: entry.date,
        formattedDate: entry.formattedDate,
        steps: entry.steps
      });
    });

    // Add medication data
    medicationChartData.forEach(entry => {
      const existing = dataMap.get(entry.date) || {};
      dataMap.set(entry.date, {
        ...existing,
        date: entry.date,
        formattedDate: entry.formattedDate,
        adherence: entry.adherence,
        taken: entry.taken,
        total: entry.total
      });
    });

    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
  }, [waterChartData, stepsChartData, medicationChartData]);

  const chartConfig: ChartConfig = {
    weight: { label: `Weight (${unit})`, color: lineColor },
    water: { label: `Water (${waterUnit})`, color: WATER_COLOR },
    steps: { label: 'Steps', color: STEPS_COLOR },
    systolic: { label: 'Systolic', color: SYSTOLIC_COLOR },
    diastolic: { label: 'Diastolic', color: DIASTOLIC_COLOR },
    adherence: { label: 'Adherence %', color: 'hsl(270, 76%, 55%)' },
    dose: { label: 'Dose', color: INJECTION_COLOR },
    bodyFat: { label: 'Body Fat %', color: BODY_FAT_COLOR },
  };

  // Calculate Y-axis domain for weight chart
  const allWeightValues = [minWeight, maxWeight];
  if (targetWeight) allWeightValues.push(targetWeight);
  const yMin = Math.floor(Math.min(...allWeightValues) - 2);
  const yMax = Math.ceil(Math.max(...allWeightValues) + 0);

  // Render weight chart
  const renderWeightChart = () => (
    <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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

  // Render standalone body fat chart
  const renderBodyFatChart = () => {
    const bfYMin = Math.floor(minBodyFat - 2);
    const bfYMax = Math.ceil(maxBodyFat + 2);

    return (
      <LineChart data={bodyFatChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
          domain={[bfYMin, bfYMax]}
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
                  <div className="font-medium" style={{ color: BODY_FAT_COLOR }}>
                    {data.bodyFat}%
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="bodyFat"
          stroke={BODY_FAT_COLOR}
          strokeWidth={2}
          dot={{ r: 0, fill: BODY_FAT_COLOR }}
          activeDot={{ r: 4, fill: BODY_FAT_COLOR, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
        />
        {bodyFatAverage > 0 && (
          <ReferenceLine
            y={bodyFatAverage}
            stroke={BODY_FAT_COLOR}
            strokeDasharray="5 5"
            strokeOpacity={0.6}
          />
        )}
      </LineChart>
    );
  };

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

  // Render injection chart with multiple medication lines and separate Y-axes
  const renderInjectionChart = () => {
    // First medication is on left, rest are on right
    const rightAxesCount = Math.max(0, uniqueMedications.length - 1);
    // Only add extra margin if more than 1 axis on right side
    const rightMargin = rightAxesCount > 1 ? 5 : 10;

    return (
      <LineChart
        data={injectionChartData}
        margin={{
          top: 10,
          right: rightMargin,
          left: 0,
          bottom: 15
        }}
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
        {/* Render a separate Y-axis for each medication with its own scale */}
        {uniqueMedications.map((medication, index) => {
          const color = MEDICATION_COLOR_MAP[medication.color] || INJECTION_COLOR;
          const isFirst = index === 0;
          const textAnchor = isFirst ? 'end' : 'start';

          return (
            <YAxis
              key={medication.id}
              yAxisId={medication.id}
              orientation={isFirst ? 'left' : 'right'}
              width={35}
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={(props: { x: number; y: number; payload: { value: number } }) => (
                <text x={props.x} y={props.y} style={{ fill: color }} fontSize={10} textAnchor={textAnchor} dominantBaseline="middle">
                  {props.payload.value}
                </text>
              )}
            />
          );
        })}
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              const data = payload[0].payload;

              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatDateForTooltip(data.date, dateFormat)}
                  </div>
                  {uniqueMedications.map(med => {
                    const dose = data[`dose_${med.id}`];
                    if (dose === null || dose === undefined) return null;
                    const medColor = MEDICATION_COLOR_MAP[med.color] || INJECTION_COLOR;
                    return (
                      <div key={med.id} className="font-medium" style={{ color: medColor }}>
                        {med.name}: {dose} {med.unit}
                      </div>
                    );
                  })}
                  <div className="text-xs text-muted-foreground mt-1">
                    Site: {data.site}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        {uniqueMedications.length > 1 && (
          <Legend
            formatter={(value) => {
              const med = uniqueMedications.find(m => `dose_${m.id}` === value);
              return med?.name || value;
            }}
          />
        )}
        {uniqueMedications.map((medication) => {
          const color = MEDICATION_COLOR_MAP[medication.color] || INJECTION_COLOR;
          return (
            <Line
              key={medication.id}
              yAxisId={medication.id}
              type="monotone"
              dataKey={`dose_${medication.id}`}
              name={`dose_${medication.id}`}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 4 }}
              connectNulls={true}
            />
          );
        })}
      </LineChart>
    );
  };

  // Render the appropriate chart based on current view (combination id)
  const renderChart = () => {
    // Find the current combination
    const combination = activeCombinations.find(c => c.id === currentView);
    if (!combination) return renderWeightChart(); // Fallback

    // If it's a single chart, render it directly
    if (combination.charts.length === 1) {
      const chart = combination.charts[0];
      switch (chart) {
        case 'weight': return renderWeightChart();
        case 'water': return renderWaterChart();
        case 'steps': return renderStepsChart();
        case 'pressure': return renderPressureChart();
        case 'medication': return renderMedicationChart();
        case 'injections': return renderInjectionChart();
        case 'bodyfat': return renderBodyFatChart();
      }
    }

    // For combined charts, render based on type
    if (combination.chartType === 'line') {
      return renderCombinedLineChart(combination);
    } else {
      return renderCombinedBarChart(combination);
    }
  };

  // Render combined line chart (weight, pressure, injections)
  const renderCombinedLineChart = (combination: ChartCombination) => {
    const hasWeight = combination.charts.includes('weight');
    const hasPressure = combination.charts.includes('pressure');
    const hasInjections = combination.charts.includes('injections');
    const hasBodyFat = combination.charts.includes('bodyfat');

    // Count right-side axes: pressure (if weight exists) + injections (all if weight/pressure, else all-1)
    let rightAxisCount = 0;
    if (hasPressure && hasWeight) rightAxisCount++;
    if (hasInjections) {
      // If no weight and no pressure, first injection is on left
      const injectionsOnRight = (!hasWeight && !hasPressure) ? uniqueMedications.length - 1 : uniqueMedications.length;
      rightAxisCount += injectionsOnRight;
    }
    // Small margin per axis (axes have width=30, so just add a bit of padding)
    const rightMargin = rightAxisCount > 0 ? 5 : 10;

    return (
      <LineChart data={mergedLineChartData} margin={{ top: 15, right: rightMargin, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="formattedDate"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          className="fill-muted-foreground"
        />
        {hasWeight && (
          <YAxis
            yAxisId="weight"
            orientation="left"
            width={35}
            domain={[yMin, yMax]}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tick={(props: { x: number; y: number; payload: { value: number } }) => (
              <text x={props.x} y={props.y} style={{ fill: lineColor }} fontSize={10} textAnchor="end" dominantBaseline="middle">
                {props.payload.value}
              </text>
            )}
          />
        )}
        {hasPressure && (
          <YAxis
            yAxisId="pressure"
            orientation={hasWeight ? 'right' : 'left'}
            width={35}
            domain={['auto', 'auto']}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tick={(props: { x: number; y: number; payload: { value: number } }) => (
              <text x={props.x} y={props.y} style={{ fill: SYSTOLIC_COLOR }} fontSize={10} textAnchor={hasWeight ? 'start' : 'end'} dominantBaseline="middle">
                {props.payload.value}
              </text>
            )}
          />
        )}
        {/* Injection Y-Axes - one per medication, all visible with colored tick numbers */}
        {hasInjections && uniqueMedications.map((medication, index) => {
          const color = MEDICATION_COLOR_MAP[medication.color] || INJECTION_COLOR;
          // First injection axis: on left if no weight/pressure, otherwise on right
          const orientation = (!hasWeight && !hasPressure && index === 0) ? 'left' : 'right';
          const textAnchor = orientation === 'left' ? 'end' : 'start';

          return (
            <YAxis
              key={medication.id}
              yAxisId={`injection_${medication.id}`}
              orientation={orientation}
              width={35}
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={(props: { x: number; y: number; payload: { value: number } }) => (
                <text x={props.x} y={props.y} style={{ fill: color }} fontSize={10} textAnchor={textAnchor} dominantBaseline="middle">
                  {props.payload.value}
                </text>
              )}
            />
          );
        })}
        {hasBodyFat && (
          <YAxis
            yAxisId="bodyfat"
            orientation="right"
            width={35}
            domain={['auto', 'auto']}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tick={(props: { x: number; y: number; payload: { value: number } }) => (
              <text x={props.x} y={props.y} style={{ fill: BODY_FAT_COLOR }} fontSize={10} textAnchor="start" dominantBaseline="middle">
                {props.payload.value}%
              </text>
            )}
          />
        )}
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatDateForTooltip(data.date, dateFormat)}
                  </div>
                  {hasWeight && data.weight != null && (
                    <div className="font-medium" style={{ color: lineColor }}>
                      Weight: {data.weight} {unit}
                    </div>
                  )}
                  {hasPressure && data.systolic != null && (
                    <div className="font-medium">
                      <span style={{ color: SYSTOLIC_COLOR }}>{data.systolic}</span>
                      <span className="text-muted-foreground">/</span>
                      <span style={{ color: DIASTOLIC_COLOR }}>{data.diastolic}</span>
                      <span className="text-muted-foreground ml-1">mmHg</span>
                    </div>
                  )}
                  {/* Injection data in tooltip */}
                  {hasInjections && uniqueMedications.map(med => {
                    const dose = data[`dose_${med.id}`];
                    if (dose == null) return null;
                    const medColor = MEDICATION_COLOR_MAP[med.color] || INJECTION_COLOR;
                    return (
                      <div key={med.id} className="font-medium" style={{ color: medColor }}>
                        {med.name}: {dose} {med.unit}
                      </div>
                    );
                  })}
                  {hasBodyFat && data.bodyFat != null && (
                    <div className="font-medium" style={{ color: BODY_FAT_COLOR }}>
                      Body Fat: {data.bodyFat}%
                    </div>
                  )}
                  {hasInjections && data.site && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Site: {data.site}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        {hasWeight && (
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            name="Weight"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 0 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        )}
        {hasPressure && (
          <>
            <Line
              yAxisId="pressure"
              type="monotone"
              dataKey="systolic"
              name="Systolic"
              stroke={SYSTOLIC_COLOR}
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
            <Line
              yAxisId="pressure"
              type="monotone"
              dataKey="diastolic"
              name="Diastolic"
              stroke={DIASTOLIC_COLOR}
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </>
        )}
        {/* Injection lines - one per medication */}
        {hasInjections && uniqueMedications.map((medication) => {
          const color = MEDICATION_COLOR_MAP[medication.color] || INJECTION_COLOR;
          return (
            <Line
              key={medication.id}
              yAxisId={`injection_${medication.id}`}
              type="monotone"
              dataKey={`dose_${medication.id}`}
              name={medication.name}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          );
        })}
        {hasBodyFat && (
          <Line
            yAxisId="bodyfat"
            type="monotone"
            dataKey="bodyFat"
            name="Body Fat %"
            stroke={BODY_FAT_COLOR}
            strokeWidth={2}
            dot={{ r: 0 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        )}
        {/* Reference lines for weight average and target */}
        {hasWeight && weightAverage > 0 && (
          <ReferenceLine
            yAxisId="weight"
            y={weightAverage}
            stroke={lineColor}
            strokeDasharray="5 5"
            strokeOpacity={0.6}
            label={{ value: `${weightAverage} ${unit}`, position: 'left', fontSize: 11, fill: lineColor }}
          />
        )}
        {hasWeight && targetWeight && (
          <ReferenceLine
            yAxisId="weight"
            y={targetWeight}
            stroke="hsl(142, 76%, 36%)"
            strokeDasharray="3 3"
            label={{ value: `${targetWeight} ${unit}`, position: 'left', fontSize: 11, fill: 'hsl(142, 76%, 36%)' }}
          />
        )}
        {/* Reference line for body fat average */}
        {hasBodyFat && bodyFatAverage > 0 && (
          <ReferenceLine
            yAxisId="bodyfat"
            y={bodyFatAverage}
            stroke={BODY_FAT_COLOR}
            strokeDasharray="5 5"
            strokeOpacity={0.6}
            label={{ value: `${bodyFatAverage}%`, position: 'right', fontSize: 11, fill: BODY_FAT_COLOR }}
          />
        )}
      </LineChart>
    );
  };

  // Render combined bar chart (water, steps, medication)
  const renderCombinedBarChart = (combination: ChartCombination) => {
    const hasWater = combination.charts.includes('water');
    const hasSteps = combination.charts.includes('steps');
    const hasMedication = combination.charts.includes('medication');

    return (
      <BarChart data={mergedBarChartData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
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
                  {data.water !== undefined && (
                    <div className="font-medium text-blue-500">
                      Water: {formatWaterAmount(data.water, waterUnit)}
                    </div>
                  )}
                  {data.steps !== undefined && (
                    <div className="font-medium text-green-500">
                      Steps: {data.steps.toLocaleString()}
                    </div>
                  )}
                  {data.adherence !== undefined && (
                    <div className="font-medium text-purple-500">
                      Meds: {data.taken}/{data.total} ({data.adherence}%)
                    </div>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        {hasWater && <Bar dataKey="water" name="Water" fill={WATER_COLOR} radius={[4, 4, 0, 0]} />}
        {hasSteps && <Bar dataKey="steps" name="Steps" fill={STEPS_COLOR} radius={[4, 4, 0, 0]} />}
        {hasMedication && <Bar dataKey="adherence" name="Medication %" fill="hsl(270, 76%, 55%)" radius={[4, 4, 0, 0]} />}
      </BarChart>
    );
  };

  // Get empty message for current combination
  const getEmptyMessageForCombination = () => {
    const combination = activeCombinations.find(c => c.id === currentView);
    if (!combination) return 'No data available.';

    // Check each chart in the combination
    for (const chart of combination.charts) {
      switch (chart) {
        case 'weight':
          if (entries.length === 0) return 'No weight entries yet. Add your first weight entry!';
          break;
        case 'water':
          if (waterEntries.length === 0) return 'No water entries yet. Start tracking your water intake!';
          break;
        case 'steps':
          if (stepsEntries.length === 0) return 'No step entries yet. Start tracking your daily steps!';
          break;
        case 'pressure':
          if (pressureEntries.length === 0) return 'No blood pressure readings yet. Add your first reading!';
          break;
        case 'medication':
          if (medicationPresets.length === 0) return 'No medications configured. Add medications in Settings.';
          break;
        case 'injections':
          if (!injectionSettings?.medications?.length) return 'No injectable medications configured. Add medications in Settings.';
          break;
        case 'bodyfat':
          if (!entries.some(e => e.bodyFat != null)) return 'No body fat entries yet. Add body fat % to your weight entries!';
          break;
      }
    }
    return `No ${combination.name.toLowerCase()} data yet.`;
  };

  // Check if current combination has data
  const hasDataForCombination = () => {
    const combination = activeCombinations.find(c => c.id === currentView);
    if (!combination) return false;

    return combination.charts.some(chart => {
      switch (chart) {
        case 'weight': return entries.length > 0;
        case 'water': return waterEntries.length > 0;
        case 'steps': return stepsEntries.length > 0;
        case 'pressure': return pressureEntries.length > 0;
        case 'medication': return medicationPresets.length > 0;
        case 'injections': return injectionSettings?.medications && injectionSettings.medications.length > 0;
        case 'bodyfat': return entries.some(e => e.bodyFat != null);
        default: return false;
      }
    });
  };

  // Empty state
  if (!hasDataForCombination()) {
    return (
      <Card className="h-full flex flex-col py-2">
        <CardHeader className="pb-2 py-0 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <ToggleGroup
              type="single"
              value={currentView}
              onValueChange={(v) => v && setCurrentView(v)}
              variant="outline"
              size="sm"
            >
              {activeCombinations.map(combination => (
                <ToggleGroupItem key={combination.id} value={combination.id} aria-label={combination.name}>
                  <DynamicIcon name={combination.icon} className="h-4 w-4" />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center py-0">
          <div className="text-muted-foreground text-sm text-center">
            {getEmptyMessageForCombination()}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if current combination includes medication chart (for time filter)
  const currentCombination = activeCombinations.find(c => c.id === currentView);
  const hasMedicationChart = currentCombination?.charts.includes('medication') ?? false;

  return (
    <Card className="h-full flex flex-col py-2">
      <CardHeader className="pb-0 py-0 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            value={currentView}
            onValueChange={(v) => v && setCurrentView(v)}
            variant="outline"
            size="sm"
          >
            {activeCombinations.map(combination => (
              <ToggleGroupItem key={combination.id} value={combination.id} aria-label={combination.name}>
                <DynamicIcon name={combination.icon} className="h-4 w-4" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {hasMedicationChart && currentCombination?.charts.length === 1 ? (
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
