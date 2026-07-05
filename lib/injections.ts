import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { InjectionEntry } from './types';
import { withFileLock, writeJsonAtomic } from './storage';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const INJECTIONS_DIR = path.join(CONFIG_PATH, 'injections');

// File path for user's injection data
const getInjectionsPath = (userId: string) => path.join(INJECTIONS_DIR, `${userId}.json`);

// Ensure injections directory exists
async function ensureInjectionsDir(): Promise<void> {
  try {
    await fs.mkdir(INJECTIONS_DIR, { recursive: true });
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
  return `inj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all injection entries for a user
export async function getInjectionEntries(userId: string): Promise<InjectionEntry[]> {
  await ensureInjectionsDir();
  const filePath = getInjectionsPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, return empty array
    return [];
  }
}

// Get all injection entries for specific date
export async function getInjectionEntriesForDate(userId: string, date: string): Promise<InjectionEntry[]> {
  const entries = await getInjectionEntries(userId);
  return entries.filter(e => e.date === date);
}

// Get today's injection entries
export async function getTodayInjections(userId: string): Promise<InjectionEntry[]> {
  return getInjectionEntriesForDate(userId, getTodayDate());
}

// Get injection entry by ID
export async function getInjectionEntryById(userId: string, id: string): Promise<InjectionEntry | null> {
  const entries = await getInjectionEntries(userId);
  return entries.find(e => e.id === id) || null;
}

// Get the last injection entry (most recent)
export async function getLastInjection(userId: string): Promise<InjectionEntry | null> {
  const entries = await getInjectionEntries(userId);
  if (entries.length === 0) return null;

  // Sort by timestamp descending and return the most recent
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return sorted[0];
}

// Save all injection entries (atomic write; callers hold the per-file lock)
async function saveInjectionEntries(userId: string, entries: InjectionEntry[]): Promise<void> {
  await writeJsonAtomic(getInjectionsPath(userId), entries);
}

// Create a new injection entry
export async function createInjectionEntry(
  userId: string,
  medicationId: string,
  dose: number,
  siteId: string,
  date?: string,
  timestamp?: string,
  notes?: string
): Promise<InjectionEntry> {
  return withFileLock(getInjectionsPath(userId), async () => {
    const entries = await getInjectionEntries(userId);
    const entryDate = date || getTodayDate();
    const now = new Date().toISOString();

    // Create new entry (injections are not one-per-day, each is unique)
    const newEntry: InjectionEntry = {
      id: generateId(),
      author: userId,
      date: entryDate,
      medicationId,
      dose,
      siteId,
      timestamp: timestamp || now,
      updatedAt: now
    };

    if (notes) {
      newEntry.notes = notes;
    }

    entries.push(newEntry);
    await saveInjectionEntries(userId, entries);
    return newEntry;
  });
}

// Update injection entry by ID
export async function updateInjectionById(
  userId: string,
  id: string,
  updates: {
    dose?: number;
    siteId?: string;
    timestamp?: string;
    date?: string;
    notes?: string;
  }
): Promise<InjectionEntry | null> {
  return withFileLock(getInjectionsPath(userId), async () => {
    const entries = await getInjectionEntries(userId);
    const existingIndex = entries.findIndex(e => e.id === id);
    const now = new Date().toISOString();

    if (existingIndex === -1) {
      return null; // Entry not found
    }

    // Update existing entry
    if (updates.dose !== undefined) {
      entries[existingIndex].dose = updates.dose;
    }
    if (updates.siteId !== undefined) {
      entries[existingIndex].siteId = updates.siteId;
    }
    if (updates.timestamp !== undefined) {
      entries[existingIndex].timestamp = updates.timestamp;
    }
    if (updates.date !== undefined) {
      entries[existingIndex].date = updates.date;
    }
    if (updates.notes !== undefined) {
      entries[existingIndex].notes = updates.notes;
    }
    entries[existingIndex].updatedAt = now;

    await saveInjectionEntries(userId, entries);
    return entries[existingIndex];
  });
}

// Delete injection entry by ID
export async function deleteInjectionById(userId: string, id: string): Promise<boolean> {
  return withFileLock(getInjectionsPath(userId), async () => {
    const entries = await getInjectionEntries(userId);
    const existingIndex = entries.findIndex(e => e.id === id);

    if (existingIndex === -1) {
      return false; // Entry not found
    }

    entries.splice(existingIndex, 1);
    await saveInjectionEntries(userId, entries);
    // Clean up associated photo if any
    const { deletePhoto } = await import('./photos');
    await deletePhoto(userId, 'injection', id);
    return true;
  });
}
