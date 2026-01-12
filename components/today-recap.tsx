"use client";

import { useMemo } from 'react';
import { isToday, parseISO } from 'date-fns';
import { Scale, Droplets, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { WeightEntry, WaterEntry, WaterUnit, GoalSettings } from '@/lib/types';
import { formatWaterAmount } from '@/lib/water-utils';
import { formatDateForRecap } from '@/lib/date-utils';
import { calculateWaterStreak, calculateProgress, getCurrentWeekWeightChange, getCurrentMonthWeightChange } from '@/lib/goals';

interface TodayRecapProps {
  entries: WeightEntry[];
  todayWater: WaterEntry | null;
  unit: 'kg' | 'lb';
  waterUnit: WaterUnit;
  goals?: GoalSettings;
  waterEntries?: WaterEntry[];
}

export function TodayRecap({ entries, todayWater, unit, waterUnit, goals, waterEntries = [] }: TodayRecapProps) {
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
                <div className="text-sm text-muted-foreground">No entries</div>
              )}
            </div>
          </div>

          {/* Water section */}
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
                  <span>{waterStreak} day streak</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">water</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
