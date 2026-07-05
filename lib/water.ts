import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { WaterEntry, WaterDayTotal } from './types';
import { withFileLock, writeJsonAtomic } from './storage';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const WATER_DIR = path.join(CONFIG_PATH, 'water');

// File path for user's water data
const getWaterPath = (userId: string) => path.join(WATER_DIR, `${userId}.json`);

// Ensure water directory exists
async function ensureWaterDir(): Promise<void> {
  try {
    await fs.mkdir(WATER_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// Generate unique ID
function generateId(): string {
  return `water-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Normalize a stored row into a well-formed per-insert entry.
// Legacy data stored one aggregate row per day WITHOUT a timestamp; treat each
// such row as a single insert and backfill its timestamp so old files keep working.
function normalizeEntry(
  raw: Partial<WaterEntry> & { date: string; amount: number }
): WaterEntry {
  return {
    id: raw.id ?? `water-legacy-${raw.date}`,
    author: raw.author ?? '',
    date: raw.date,
    amount: raw.amount,
    timestamp: raw.timestamp ?? raw.updatedAt ?? `${raw.date}T12:00:00.000Z`,
    updatedAt: raw.updatedAt ?? raw.timestamp ?? `${raw.date}T12:00:00.000Z`,
  };
}

// Get all per-insert water entries for a user (raw rows, normalized)
export async function getWaterEntries(userId: string): Promise<WaterEntry[]> {
  await ensureWaterDir();
  const filePath = getWaterPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const rows = JSON.parse(data) as Array<Partial<WaterEntry> & { date: string; amount: number }>;
    return rows.map(normalizeEntry);
  } catch {
    // File doesn't exist, return empty array
    return [];
  }
}

// Sum per-insert entries into one total per day, sorted by date ascending.
function aggregateByDay(entries: WaterEntry[]): WaterDayTotal[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.amount);
  }
  return Array.from(totals, ([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Get daily totals for every day (what the chart and history table consume)
export async function getWaterDailyTotals(userId: string): Promise<WaterDayTotal[]> {
  return aggregateByDay(await getWaterEntries(userId));
}

// Get the aggregated total for a specific date
export async function getWaterEntry(userId: string, date: string): Promise<WaterDayTotal> {
  const entries = await getWaterEntries(userId);
  const amount = entries
    .filter(e => e.date === date)
    .reduce((sum, e) => sum + e.amount, 0);
  return { date, amount };
}

// Get today's aggregated total
export async function getTodayWater(userId: string): Promise<WaterDayTotal> {
  return getWaterEntry(userId, getTodayDate());
}

// Save all water entries (atomic write; callers hold the per-file lock)
async function saveWaterEntries(userId: string, entries: WaterEntry[]): Promise<void> {
  await writeJsonAtomic(getWaterPath(userId), entries);
}

// Add a new water insert for today; returns today's new daily total
export async function addWater(userId: string, amount: number): Promise<WaterDayTotal> {
  return withFileLock(getWaterPath(userId), async () => {
    const entries = await getWaterEntries(userId);
    const today = getTodayDate();
    const now = new Date().toISOString();

    entries.push({
      id: generateId(),
      author: userId,
      date: today,
      amount,
      timestamp: now,
      updatedAt: now,
    });
    await saveWaterEntries(userId, entries);

    const total = entries
      .filter(e => e.date === today)
      .reduce((sum, e) => sum + e.amount, 0);
    return { date: today, amount: total };
  });
}

// Reset today's water to 0 by removing all of today's inserts
export async function resetTodayWater(userId: string): Promise<WaterDayTotal> {
  return withFileLock(getWaterPath(userId), async () => {
    const today = getTodayDate();
    const entries = (await getWaterEntries(userId)).filter(e => e.date !== today);
    await saveWaterEntries(userId, entries);
    return { date: today, amount: 0 };
  });
}

// Set a day's total to an explicit amount (used when editing a day's total).
// Replaces that day's inserts with a single insert; amount <= 0 clears the day.
export async function setWaterAmount(userId: string, date: string, amount: number): Promise<WaterDayTotal> {
  return withFileLock(getWaterPath(userId), async () => {
    const now = new Date().toISOString();
    const entries = (await getWaterEntries(userId)).filter(e => e.date !== date);

    if (amount > 0) {
      entries.push({
        id: generateId(),
        author: userId,
        date,
        amount,
        timestamp: `${date}T12:00:00.000Z`,
        updatedAt: now,
      });
    }
    await saveWaterEntries(userId, entries);
    return { date, amount: amount > 0 ? amount : 0 };
  });
}

// ============ Individual entries (water history mode) ============

// Get all individual water inserts, newest first (for the history table)
export async function getWaterInserts(userId: string): Promise<WaterEntry[]> {
  const entries = await getWaterEntries(userId);
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Add a single water insert at a chosen date/time; returns that day's new total
export async function addWaterEntry(
  userId: string,
  amount: number,
  date?: string,
  timestamp?: string
): Promise<WaterDayTotal> {
  return withFileLock(getWaterPath(userId), async () => {
    const entries = await getWaterEntries(userId);
    const now = new Date().toISOString();
    const entryDate = date || getTodayDate();

    entries.push({
      id: generateId(),
      author: userId,
      date: entryDate,
      amount,
      timestamp: timestamp || now,
      updatedAt: now,
    });
    await saveWaterEntries(userId, entries);

    const total = entries
      .filter(e => e.date === entryDate)
      .reduce((sum, e) => sum + e.amount, 0);
    return { date: entryDate, amount: total };
  });
}

// Update a single water insert by id
export async function updateWaterEntry(
  userId: string,
  id: string,
  data: { amount?: number; date?: string; timestamp?: string }
): Promise<WaterEntry | null> {
  return withFileLock(getWaterPath(userId), async () => {
    const entries = await getWaterEntries(userId);
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) {
      return null;
    }

    entries[index] = {
      ...entries[index],
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.date ? { date: data.date } : {}),
      ...(data.timestamp ? { timestamp: data.timestamp } : {}),
      updatedAt: new Date().toISOString(),
    };
    await saveWaterEntries(userId, entries);
    return entries[index];
  });
}

// Delete a single water insert by id
export async function deleteWaterEntry(userId: string, id: string): Promise<boolean> {
  return withFileLock(getWaterPath(userId), async () => {
    const entries = await getWaterEntries(userId);
    const filtered = entries.filter(e => e.id !== id);
    if (filtered.length === entries.length) {
      return false; // Not found
    }
    await saveWaterEntries(userId, filtered);
    return true;
  });
}

// Format water amount for display
export function formatWaterAmount(ml: number): string {
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${liters.toFixed(1)}L`;
  }
  return `${ml}ml`;
}
