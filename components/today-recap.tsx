"use client";

import { useMemo, useState, useEffect } from 'react';
import { isToday, parseISO, differenceInDays, format } from 'date-fns';
import { Scale, Droplets, Flame, Footprints, HeartPulse, Pill, Syringe, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WeightEntry, WaterDayTotal, WaterUnit, GoalSettings, StepsEntry, PressureEntry, FeatureToggles, MedicationEntry, MedicationPreset, MedicationSchedule, InjectionEntry, InjectionSettings } from '@/lib/types';
import { formatWaterAmount } from '@/lib/water-utils';
import { formatDateForRecap } from '@/lib/date-utils';
import { calculateWaterStreak, calculateProgress, getCurrentWeekWeightChange, getCurrentMonthWeightChange } from '@/lib/goals';
import { getPressureCategory } from '@/lib/pressure-utils';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

// Check if a medication is due today based on its schedule
function isMedicationDueToday(schedule: MedicationSchedule | undefined, today: Date): boolean {
  // No schedule = always due (backward compatibility)
  if (!schedule) return true;

  switch (schedule.type) {
    case 'daily':
      return true;
    case 'weekly':
      // Check if today's day of week is in the schedule
      return schedule.daysOfWeek?.includes(today.getDay()) ?? false;
    case 'interval':
      // Check if today is on the interval from start date
      if (!schedule.startDate || !schedule.intervalDays) return false;
      const start = parseISO(schedule.startDate);
      const daysDiff = differenceInDays(today, start);
      return daysDiff >= 0 && daysDiff % schedule.intervalDays === 0;
    default:
      return true;
  }
}

interface TodayRecapProps {
  entries: WeightEntry[];
  todayWater: WaterDayTotal | null;
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  goals?: GoalSettings;
  waterEntries?: WaterDayTotal[];
  todaySteps?: StepsEntry[];
  todayPressure?: PressureEntry[];
  todayMedications?: MedicationEntry[];
  medicationPresets?: MedicationPreset[];
  features?: FeatureToggles;
  injectionEntries?: InjectionEntry[];
  injectionSettings?: InjectionSettings;
}

export function TodayRecap({
  entries,
  todayWater,
  unit,
  waterUnit,
  goals,
  waterEntries = [],
  todaySteps = [],
  todayPressure = [],
  todayMedications = [],
  medicationPresets = [],
  features,
  injectionEntries = [],
  injectionSettings
}: TodayRecapProps) {
  const { t } = useTranslation();
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

  // Calculate water goal progress and streak
  const dailyWaterGoal = goals?.dailyWaterGoal;
  const waterProgress = dailyWaterGoal ? calculateProgress(waterAmount, dailyWaterGoal) : 0;
  const waterStreak = dailyWaterGoal ? calculateWaterStreak(waterEntries, dailyWaterGoal) : 0;

  // Calculate actual weight changes for the period
  const weeklyWeightGoal = goals?.weeklyWeightGoal;
  const monthlyWeightGoal = goals?.monthlyWeightGoal;
  const weekStartsOn = goals?.weekStartsOn ?? 1;
  const weeklyChange = weeklyWeightGoal ? getCurrentWeekWeightChange(entries, weekStartsOn) : null;
  const monthlyChange = monthlyWeightGoal ? getCurrentMonthWeightChange(entries) : null;

  // Get color based on progress toward goal
  // Red = going wrong direction (negative progress)
  // Orange = 0-49% progress
  // Yellow = 50-74% progress
  // Light green = 75-99% progress
  // Green = 100%+ goal achieved
  const getWeightChangeColor = (change: number, goal: number): string => {
    // Calculate progress percentage (can be negative if going wrong direction)
    // For loss goals: goal=-100, change=-50 means 50% progress
    // For loss goals: goal=-100, change=+10 means going wrong direction
    // For gain goals: goal=+10, change=+5 means 50% progress
    // For gain goals: goal=+10, change=-5 means going wrong direction
    let progress: number;

    if (goal < 0) {
      // Weight loss goal
      if (change > 0) {
        // Gained weight when trying to lose = negative progress
        progress = -1;
      } else if (change === 0) {
        progress = 0;
      } else {
        // Lost weight = positive progress
        progress = Math.abs(change) / Math.abs(goal);
      }
    } else {
      // Weight gain goal
      if (change < 0) {
        // Lost weight when trying to gain = negative progress
        progress = -1;
      } else if (change === 0) {
        progress = 0;
      } else {
        // Gained weight = positive progress
        progress = change / goal;
      }
    }

    // Color gradient based on progress
    if (progress >= 1) return 'text-green-600';      // 100%+ = goal achieved
    if (progress >= 0.75) return 'text-green-500';   // 75-99%
    if (progress >= 0.5) return 'text-yellow-500';   // 50-74%
    if (progress > 0) return 'text-orange-500';      // 0.1-49%
    return 'text-red-500';                            // 0 or negative (wrong direction)
  };

  // Calculate steps - sum all today's steps entries
  const stepsAmount = useMemo(() => {
    return todaySteps.reduce((sum, entry) => sum + entry.steps, 0);
  }, [todaySteps]);
  const dailyStepsGoal = goals?.dailyStepsGoal;
  const stepsProgress = dailyStepsGoal ? calculateProgress(stepsAmount, dailyStepsGoal) : 0;

  // Get latest pressure entry for today
  const latestPressure = useMemo(() => {
    if (todayPressure.length === 0) return null;
    // Sort by timestamp descending and get the latest
    return [...todayPressure].sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    )[0];
  }, [todayPressure]);

  // Get pressure category
  const pressureCategory = latestPressure
    ? getPressureCategory(latestPressure.systolic, latestPressure.diastolic)
    : null;

  // Count enabled features for grid layout
  const waterEnabled = features?.waterEnabled ?? true;
  const stepsEnabled = features?.stepsEnabled ?? false;
  const pressureEnabled = features?.pressureEnabled ?? false;
  const medicationEnabled = features?.medicationEnabled ?? false;
  const injectionsEnabled = features?.injectionsEnabled ?? false;

  // Collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem('todayRecapCollapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
    setIsHydrated(true);
  }, []);

  // Persist collapse state (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('todayRecapCollapsed', String(isCollapsed));
    }
  }, [isCollapsed, isHydrated]);

  // Calculate medication status (only count medications due today)
  const medicationCount = useMemo(() => {
    const today = new Date();
    const todayDate = format(today, 'yyyy-MM-dd');

    // Filter to only medications due today
    const dueTodayPresets = medicationPresets.filter(preset =>
      isMedicationDueToday(preset.schedule, today)
    );

    const total = dueTodayPresets.length;
    const taken = dueTodayPresets.filter(preset => {
      const entry = todayMedications.find(
        m => m.medicationId === preset.id && m.date === todayDate
      );
      return entry?.taken === true;
    }).length;

    return { taken, total };
  }, [todayMedications, medicationPresets]);

  // Get recent injections (last 3, sorted by timestamp descending)
  const recentInjections = useMemo(() => {
    if (!injectionEntries.length || !injectionSettings) return [];

    // Sort by timestamp descending and take last 3
    const sorted = [...injectionEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 3);

    return sorted.map(entry => {
      const medication = injectionSettings.medications?.find(m => m.id === entry.medicationId);
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      return {
        id: entry.id,
        medicationName: medication?.name || t('dashboard.recap.unknown'),
        dose: entry.dose,
        unit: medication?.unit || 'mg',
        timestamp: `${dateStr} ${timeStr}`,
        color: medication?.color || 'text-teal-500'
      };
    });
  }, [injectionEntries, injectionSettings, t]);

  return (
    <Card className="py-2 shrink-0">
      <CardContent className="py-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{t('common.today')}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 px-2 text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? (
              <>
                <span className="text-xs mr-1">{t('dashboard.show')}</span>
                <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                <span className="text-xs mr-1">{t('dashboard.hide')}</span>
                <ChevronUp className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        <div className={cn("space-y-4 mt-0 transition-all duration-200", isCollapsed && "hidden")}>
          {/* Row 1: Weight and Water */}
          <div className={cn("grid gap-4", waterEnabled ? "grid-cols-2" : "grid-cols-1")}>
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
                        {t('dashboard.recap.last', { date: lastWeightDate })}
                      </div>
                    )}
                    {/* Weight changes */}
                    {(weeklyChange !== null || monthlyChange !== null) && (
                      <div className="mt-1 flex items-center gap-3 text-xs">
                        {weeklyChange !== null && weeklyWeightGoal && (
                          <div className={`flex items-center gap-1 font-medium ${getWeightChangeColor(weeklyChange, weeklyWeightGoal)}`}>
                            <span>W</span>
                            <span>{weeklyChange >= 0 ? '+' : ''}{weeklyChange.toFixed(1)}</span>
                          </div>
                        )}
                        {monthlyChange !== null && monthlyWeightGoal && (
                          <div className={`flex items-center gap-1 font-medium ${getWeightChangeColor(monthlyChange, monthlyWeightGoal)}`}>
                            <span>M</span>
                            <span>{monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">{t('dashboard.recap.noEntries')}</div>
                )}
              </div>
            </div>

            {/* Water section - only if enabled */}
            {waterEnabled && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Droplets className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">
                      {formatWaterAmount(waterAmount, waterUnit)}
                    </div>
                    {dailyWaterGoal && (
                      <div className="text-xs text-muted-foreground">
                        / {formatWaterAmount(dailyWaterGoal, waterUnit)}
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {dailyWaterGoal && (
                    <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${waterProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Streak or "water" label */}
                  {dailyWaterGoal && waterStreak > 0 ? (
                    <div className="mt-1 flex items-center gap-1 text-xs text-orange-500">
                      <Flame className="h-3 w-3" />
                      <span>{t('dashboard.recap.dayStreak', { n: waterStreak })}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">{t('dashboard.recap.water')}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Steps (full width) - only if enabled */}
          {stepsEnabled && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Footprints className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">
                    {stepsAmount.toLocaleString()}
                  </div>
                  {dailyStepsGoal && (
                    <div className="text-xs text-muted-foreground">
                      / {dailyStepsGoal.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {dailyStepsGoal && (
                  <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${stepsProgress}%` }}
                    />
                  </div>
                )}

                <div className="text-xs text-muted-foreground">{t('dashboard.recap.steps')}</div>
              </div>
            </div>
          )}

          {/* Row 3: Pressure and Medication together - only if at least one is enabled */}
          {(pressureEnabled || medicationEnabled) && (
            <div className="grid grid-cols-2 gap-4">
              {/* Pressure section - only if enabled */}
              {pressureEnabled && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10">
                    <HeartPulse className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    {latestPressure ? (
                      <>
                        <div className="text-lg font-semibold">
                          {latestPressure.systolic}/{latestPressure.diastolic}
                        </div>
                        {pressureCategory && (
                          <div className={cn("text-xs", pressureCategory.color)}>
                            {pressureCategory.label}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground">{t('dashboard.recap.notRecorded')}</div>
                        <div className="text-xs text-muted-foreground">{t('dashboard.recap.pressure')}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Medication section - only if enabled */}
              {medicationEnabled && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/10">
                    <Pill className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    {medicationPresets.length === 0 ? (
                      <>
                        <div className="text-sm text-muted-foreground">{t('dashboard.recap.noMedsSet')}</div>
                        <div className="text-xs text-muted-foreground">{t('dashboard.recap.medication')}</div>
                      </>
                    ) : medicationCount.total === 0 ? (
                      <>
                        <div className="text-sm text-muted-foreground">{t('dashboard.recap.noneDue')}</div>
                        <div className="text-xs text-muted-foreground">{t('dashboard.recap.medication')}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-semibold">
                          {medicationCount.taken}/{medicationCount.total}
                        </div>
                        <div className={cn(
                          "text-xs",
                          medicationCount.taken === medicationCount.total
                            ? "text-green-500"
                            : medicationCount.taken > 0
                            ? "text-yellow-500"
                            : "text-muted-foreground"
                        )}>
                          {medicationCount.taken === medicationCount.total
                            ? t('dashboard.recap.allTaken')
                            : medicationCount.taken > 0
                            ? t('dashboard.recap.partiallyTaken')
                            : t('dashboard.recap.noneTaken')}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 4: Injections - only if enabled */}
          {injectionsEnabled && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-teal-500/10">
                  <Syringe className="h-5 w-5 text-teal-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{t('dashboard.recap.injections')}</span>
              </div>
              {recentInjections.length > 0 ? (
                <div className="space-y-1 pl-10">
                  {recentInjections.map(injection => (
                    <div key={injection.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", injection.color)}>
                          {injection.medicationName}
                        </span>
                        <span className="text-muted-foreground">
                          {injection.dose} {injection.unit}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {injection.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pl-10 text-sm text-muted-foreground">
                  {injectionSettings?.medications?.length
                    ? t('dashboard.recap.noInjectionsLogged')
                    : t('dashboard.recap.noMedicationsSet')}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
