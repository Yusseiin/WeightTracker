import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { PressureEntry } from './types';
import { withFileLock, writeJsonAtomic } from './storage';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const PRESSURE_DIR = path.join(CONFIG_PATH, 'pressure');

// File path for user's pressure data
const getPressurePath = (userId: string) => path.join(PRESSURE_DIR, `${userId}.json`);

// Ensure pressure directory exists
async function ensurePressureDir(): Promise<void> {
  try {
    await fs.mkdir(PRESSURE_DIR, { recursive: true });
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
  return `pressure-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all pressure entries for a user
export async function getPressureEntries(userId: string): Promise<PressureEntry[]> {
  await ensurePressureDir();
  const filePath = getPressurePath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, return empty array
    return [];
  }
}

// Get all pressure entries for specific date (multiple entries per day)
export async function getPressureEntriesForDate(userId: string, date: string): Promise<PressureEntry[]> {
  const entries = await getPressureEntries(userId);
  return entries.filter(e => e.date === date);
}

// Get today's pressure entries (multiple per day)
export async function getTodayPressure(userId: string): Promise<PressureEntry[]> {
  return getPressureEntriesForDate(userId, getTodayDate());
}

// Get pressure entry by ID
export async function getPressureEntryById(userId: string, id: string): Promise<PressureEntry | null> {
  const entries = await getPressureEntries(userId);
  return entries.find(e => e.id === id) || null;
}

// Save all pressure entries (atomic write; callers hold the per-file lock)
async function savePressureEntries(userId: string, entries: PressureEntry[]): Promise<void> {
  await writeJsonAtomic(getPressurePath(userId), entries);
}

// Create a new pressure entry (always creates new, never updates)
export async function createPressureEntry(
  userId: string,
  systolic: number,
  diastolic: number,
  date?: string,
  timestamp?: string,
  notes?: string
): Promise<PressureEntry> {
  return withFileLock(getPressurePath(userId), async () => {
    const entries = await getPressureEntries(userId);
    const entryDate = date || getTodayDate();
    const now = new Date().toISOString();

    // Always create new entry
    const newEntry: PressureEntry = {
      id: generateId(),
      author: userId,
      date: entryDate,
      systolic,
      diastolic,
      timestamp: timestamp || now,
      updatedAt: now
    };
    if (notes) { newEntry.notes = notes; }
    entries.push(newEntry);
    await savePressureEntries(userId, entries);
    return newEntry;
  });
}

// Update pressure entry by ID
export async function updatePressureById(
  userId: string,
  id: string,
  systolic: number,
  diastolic: number,
  timestamp?: string,
  notes?: string
): Promise<PressureEntry | null> {
  return withFileLock(getPressurePath(userId), async () => {
    const entries = await getPressureEntries(userId);
    const existingIndex = entries.findIndex(e => e.id === id);
    const now = new Date().toISOString();

    if (existingIndex === -1) {
      return null; // Entry not found
    }

    // Update existing entry
    entries[existingIndex].systolic = systolic;
    entries[existingIndex].diastolic = diastolic;
    if (timestamp) {
      entries[existingIndex].timestamp = timestamp;
    }
    if (notes !== undefined) {
      entries[existingIndex].notes = notes || undefined;
    }
    entries[existingIndex].updatedAt = now;
    await savePressureEntries(userId, entries);
    return entries[existingIndex];
  });
}

// Delete pressure entry by ID
export async function deletePressureById(userId: string, id: string): Promise<boolean> {
  return withFileLock(getPressurePath(userId), async () => {
    const entries = await getPressureEntries(userId);
    const existingIndex = entries.findIndex(e => e.id === id);

    if (existingIndex === -1) {
      return false; // Entry not found
    }

    entries.splice(existingIndex, 1);
    await savePressureEntries(userId, entries);
    // Clean up associated photo if any
    const { deletePhoto } = await import('./photos');
    await deletePhoto(userId, 'pressure', id);
    return true;
  });
}

// Re-export client-safe functions from pressure-utils
export { formatPressure, getPressureCategory } from './pressure-utils';
