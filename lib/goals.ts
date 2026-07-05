import { WaterDayTotal, WeightEntry, WeekStartsOn } from './types';
import { subDays, subWeeks, subMonths, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

/**
 * Calculate the water streak - consecutive days meeting the daily water goal
 * @param waterEntries - Array of water entries
 * @param dailyGoal - Daily water goal in ml
 * @returns Number of consecutive days the goal was met (including today if applicable)
 */
export function calculateWaterStreak(
  waterEntries: WaterDayTotal[],
  dailyGoal: number
): number {
  if (!dailyGoal || dailyGoal <= 0 || waterEntries.length === 0) {
    return 0;
  }

  // Sort entries by date descending (newest first)
  const sortedEntries = [...waterEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Create a map of date -> amount for quick lookup
  const dateAmountMap = new Map<string, number>();
  for (const entry of sortedEntries) {
    dateAmountMap.set(entry.date, entry.amount);
  }

  let streak = 0;
  let currentDate = new Date();

  // Start from today or yesterday depending on whether today's goal is met
  const todayStr = format(currentDate, 'yyyy-MM-dd');
  const todayAmount = dateAmountMap.get(todayStr) || 0;

  // If today's goal is met, include it and start checking from yesterday
  if (todayAmount >= dailyGoal) {
    streak = 1;
    currentDate = subDays(currentDate, 1);
  } else {
    // Today's goal not met yet - check if yesterday started a streak
    currentDate = subDays(currentDate, 1);
  }

  // Count consecutive days going backwards
  while (true) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const amount = dateAmountMap.get(dateStr) || 0;

    if (amount >= dailyGoal) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else {
      break;
    }

    // Safety limit - don't go back more than 365 days
    if (streak > 365) break;
  }

  return streak;
}

/**
 * Calculate progress percentage (capped at 100)
 */
export function calculateProgress(current: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

/**
 * Calculate raw progress percentage (can exceed 100)
 */
export function calculateRawProgress(current: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.round((current / goal) * 100);
}

/**
 * Get motivational message based on progress milestone
 */
export function getProgressMilestone(
  prevPercent: number,
  newPercent: number
): { message: string; emoji: string } | null {
  // Check if we crossed a milestone
  if (newPercent >= 100 && prevPercent < 100) {
    return { message: "Goal achieved! Amazing work!", emoji: "🎉" };
  }
  if (newPercent >= 75 && prevPercent < 75) {
    return { message: "75% there! Keep it up!", emoji: "💪" };
  }
  if (newPercent >= 50 && prevPercent < 50) {
    return { message: "Halfway to your goal!", emoji: "🌊" };
  }
  if (newPercent >= 25 && prevPercent < 25) {
    return { message: "Great start! 25% done!", emoji: "👍" };
  }
  // Overachiever message for going beyond 100%
  if (newPercent > 100 && prevPercent <= 100) {
    return { message: `Overachiever! ${newPercent}% of goal!`, emoji: "🏆" };
  }

  return null;
}

/**
 * Get weight change for a specific week
 * @returns weight change in the period (negative = lost weight, positive = gained weight)
 */
function getWeeklyWeightChange(entries: WeightEntry[], weekStartDate: Date, weekStartsOn: WeekStartsOn = 1): number | null {
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn });
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn });

  // Get entries within this week
  const weekEntries = entries.filter(e => {
    const entryDate = new Date(e.timestamp);
    return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
  });

  if (weekEntries.length < 2) return null;

  // Sort by timestamp
  const sorted = weekEntries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Return difference between last and first entry of the week
  return sorted[sorted.length - 1].weight - sorted[0].weight;
}

/**
 * Get weight change for a specific month
 */
function getMonthlyWeightChange(entries: WeightEntry[], monthDate: Date): number | null {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  // Get entries within this month
  const monthEntries = entries.filter(e => {
    const entryDate = new Date(e.timestamp);
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
  });

  if (monthEntries.length < 2) return null;

  // Sort by timestamp
  const sorted = monthEntries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Return difference between last and first entry of the month
  return sorted[sorted.length - 1].weight - sorted[0].weight;
}

/**
 * Check if a weight change meets the goal
 * Goal can be negative (weight loss) or positive (weight gain)
 */
function meetsWeightGoal(actualChange: number | null, goalChange: number): boolean {
  if (actualChange === null) return false;

  // For weight loss goals (negative), actual change should be <= goal (more negative = better)
  // For weight gain goals (positive), actual change should be >= goal
  if (goalChange < 0) {
    return actualChange <= goalChange;
  } else {
    return actualChange >= goalChange;
  }
}

/**
 * Calculate weekly weight goal streak
 * @returns Number of consecutive weeks the goal was met
 */
export function calculateWeeklyWeightStreak(
  entries: WeightEntry[],
  weeklyGoal: number,
  weekStartsOn: WeekStartsOn = 1
): number {
  if (!weeklyGoal || entries.length === 0) return 0;

  let streak = 0;
  let currentWeek = new Date();

  // Check current week first
  const currentWeekChange = getWeeklyWeightChange(entries, currentWeek, weekStartsOn);
  if (meetsWeightGoal(currentWeekChange, weeklyGoal)) {
    streak = 1;
    currentWeek = subWeeks(currentWeek, 1);
  } else {
    // Current week not met, start from last week
    currentWeek = subWeeks(currentWeek, 1);
  }

  // Count consecutive weeks going backwards
  for (let i = 0; i < 52; i++) { // Max 52 weeks
    const weekChange = getWeeklyWeightChange(entries, currentWeek, weekStartsOn);
    if (meetsWeightGoal(weekChange, weeklyGoal)) {
      streak++;
      currentWeek = subWeeks(currentWeek, 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate monthly weight goal streak
 * @returns Number of consecutive months the goal was met
 */
export function calculateMonthlyWeightStreak(
  entries: WeightEntry[],
  monthlyGoal: number
): number {
  if (!monthlyGoal || entries.length === 0) return 0;

  let streak = 0;
  let currentMonth = new Date();

  // Check current month first
  const currentMonthChange = getMonthlyWeightChange(entries, currentMonth);
  if (meetsWeightGoal(currentMonthChange, monthlyGoal)) {
    streak = 1;
    currentMonth = subMonths(currentMonth, 1);
  } else {
    // Current month not met, start from last month
    currentMonth = subMonths(currentMonth, 1);
  }

  // Count consecutive months going backwards
  for (let i = 0; i < 12; i++) { // Max 12 months
    const monthChange = getMonthlyWeightChange(entries, currentMonth);
    if (meetsWeightGoal(monthChange, monthlyGoal)) {
      streak++;
      currentMonth = subMonths(currentMonth, 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get the current week's weight change
 * @returns Weight change in kg (negative = lost, positive = gained), or null if not enough data
 */
export function getCurrentWeekWeightChange(entries: WeightEntry[], weekStartsOn: WeekStartsOn = 1): number | null {
  return getWeeklyWeightChange(entries, new Date(), weekStartsOn);
}

/**
 * Get the current month's weight change
 * @returns Weight change in kg (negative = lost, positive = gained), or null if not enough data
 */
export function getCurrentMonthWeightChange(entries: WeightEntry[]): number | null {
  return getMonthlyWeightChange(entries, new Date());
}

/**
 * Check if a new weight entry meets the weekly goal and return a motivational message
 */
export function checkWeeklyGoalAchievement(
  entries: WeightEntry[],
  newEntry: WeightEntry,
  weeklyGoal: number,
  weekStartsOn: WeekStartsOn = 1
): { achieved: boolean; message: string } | null {
  if (!weeklyGoal) return null;

  // Include the new entry
  const allEntries = [...entries, newEntry];
  const currentWeekChange = getWeeklyWeightChange(allEntries, new Date(), weekStartsOn);

  if (meetsWeightGoal(currentWeekChange, weeklyGoal)) {
    const messages = [
      "Nice one, really!",
      "You treated yourself well, wow!",
      "Be proud of yourself!",
      "Crushing it this week!",
      "Your dedication shows!",
      "Amazing progress!",
    ];
    return {
      achieved: true,
      message: messages[Math.floor(Math.random() * messages.length)]
    };
  }

  return null;
}

/**
 * Check if a new weight entry meets the monthly goal and return a motivational message
 */
export function checkMonthlyGoalAchievement(
  entries: WeightEntry[],
  newEntry: WeightEntry,
  monthlyGoal: number
): { achieved: boolean; message: string } | null {
  if (!monthlyGoal) return null;

  // Include the new entry
  const allEntries = [...entries, newEntry];
  const currentMonthChange = getMonthlyWeightChange(allEntries, new Date());

  if (meetsWeightGoal(currentMonthChange, monthlyGoal)) {
    const messages = [
      "Monthly goal achieved! Outstanding!",
      "What a month! You're incredible!",
      "A whole month of success!",
      "You made this month count!",
      "Consistency pays off!",
    ];
    return {
      achieved: true,
      message: messages[Math.floor(Math.random() * messages.length)]
    };
  }

  return null;
}
