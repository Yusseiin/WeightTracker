import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { MedicationEntry } from './types';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const MEDICATION_DIR = path.join(CONFIG_PATH, 'medications');

// File path for user's medication data
const getMedicationPath = (userId: string) => path.join(MEDICATION_DIR, `${userId}.json`);

// Ensure medication directory exists
async function ensureMedicationDir(): Promise<void> {
  try {
    await fs.mkdir(MEDICATION_DIR, { recursive: true });
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
  return `med-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all medication entries for a user
export async function getMedicationEntries(userId: string): Promise<MedicationEntry[]> {
  await ensureMedicationDir();
  const filePath = getMedicationPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, return empty array
    return [];
  }
}

// Get all medication entries for specific date
export async function getMedicationEntriesForDate(userId: string, date: string): Promise<MedicationEntry[]> {
  const entries = await getMedicationEntries(userId);
  return entries.filter(e => e.date === date);
}

// Get today's medication entries
export async function getTodayMedications(userId: string): Promise<MedicationEntry[]> {
  return getMedicationEntriesForDate(userId, getTodayDate());
}

// Get medication entry by ID
export async function getMedicationEntryById(userId: string, id: string): Promise<MedicationEntry | null> {
  const entries = await getMedicationEntries(userId);
  return entries.find(e => e.id === id) || null;
}

// Save all medication entries
async function saveMedicationEntries(userId: string, entries: MedicationEntry[]): Promise<void> {
  await ensureMedicationDir();
  const filePath = getMedicationPath(userId);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}

// Create a new medication entry
export async function createMedicationEntry(
  userId: string,
  medicationId: string,
  taken: boolean,
  date?: string,
  timestamp?: string,
  dose?: number | null,
  notes?: string
): Promise<MedicationEntry> {
  const entries = await getMedicationEntries(userId);
  const entryDate = date || getTodayDate();
  const now = new Date().toISOString();

  // Check if entry already exists for this medication on this date
  const existingIndex = entries.findIndex(
    e => e.date === entryDate && e.medicationId === medicationId
  );

  if (existingIndex !== -1) {
    // Update existing entry
    entries[existingIndex].taken = taken;
    entries[existingIndex].timestamp = timestamp || now;
    entries[existingIndex].updatedAt = now;
    // Handle dose: set if provided, remove if null
    if (dose !== undefined) {
      if (dose === null) {
        delete entries[existingIndex].dose;
      } else {
        entries[existingIndex].dose = dose;
      }
    }
    if (notes !== undefined) {
      entries[existingIndex].notes = notes || undefined;
    }
    await saveMedicationEntries(userId, entries);
    return entries[existingIndex];
  }

  // Create new entry
  const newEntry: MedicationEntry = {
    id: generateId(),
    author: userId,
    date: entryDate,
    medicationId,
    taken,
    timestamp: timestamp || now,
    updatedAt: now
  };
  // Add dose if provided
  if (dose !== undefined && dose !== null) {
    newEntry.dose = dose;
  }
  if (notes) { newEntry.notes = notes; }
  entries.push(newEntry);
  await saveMedicationEntries(userId, entries);
  return newEntry;
}

// Update medication entry by ID
export async function updateMedicationById(
  userId: string,
  id: string,
  taken: boolean,
  timestamp?: string,
  date?: string,
  dose?: number | null,
  notes?: string
): Promise<MedicationEntry | null> {
  const entries = await getMedicationEntries(userId);
  const existingIndex = entries.findIndex(e => e.id === id);
  const now = new Date().toISOString();

  if (existingIndex === -1) {
    return null; // Entry not found
  }

  // Update existing entry
  entries[existingIndex].taken = taken;
  if (timestamp) {
    entries[existingIndex].timestamp = timestamp;
  }
  if (date) {
    entries[existingIndex].date = date;
  }
  // Handle dose: set if provided, remove if null
  if (dose !== undefined) {
    if (dose === null) {
      delete entries[existingIndex].dose;
    } else {
      entries[existingIndex].dose = dose;
    }
  }
  if (notes !== undefined) {
    entries[existingIndex].notes = notes || undefined;
  }
  entries[existingIndex].updatedAt = now;
  await saveMedicationEntries(userId, entries);
  return entries[existingIndex];
}

// Delete medication entry by ID
export async function deleteMedicationById(userId: string, id: string): Promise<boolean> {
  const entries = await getMedicationEntries(userId);
  const existingIndex = entries.findIndex(e => e.id === id);

  if (existingIndex === -1) {
    return false; // Entry not found
  }

  entries.splice(existingIndex, 1);
  await saveMedicationEntries(userId, entries);
  // Clean up associated photo if any
  const { deletePhoto } = await import('./photos');
  await deletePhoto(userId, 'medication', id);
  return true;
}
