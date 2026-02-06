import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { StepsEntry } from './types';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const STEPS_DIR = path.join(CONFIG_PATH, 'steps');

// File path for user's steps data
const getStepsPath = (userId: string) => path.join(STEPS_DIR, `${userId}.json`);

// Ensure steps directory exists
async function ensureStepsDir(): Promise<void> {
  try {
    await fs.mkdir(STEPS_DIR, { recursive: true });
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
  return `steps-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get all steps entries for a user
export async function getStepsEntries(userId: string): Promise<StepsEntry[]> {
  await ensureStepsDir();
  const filePath = getStepsPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, return empty array
    return [];
  }
}

// Get all steps entries for specific date (multiple entries per day)
export async function getStepsEntriesForDate(userId: string, date: string): Promise<StepsEntry[]> {
  const entries = await getStepsEntries(userId);
  return entries.filter(e => e.date === date);
}

// Get today's steps entries (multiple per day)
export async function getTodaySteps(userId: string): Promise<StepsEntry[]> {
  return getStepsEntriesForDate(userId, getTodayDate());
}

// Get steps entry by ID
export async function getStepsEntryById(userId: string, id: string): Promise<StepsEntry | null> {
  const entries = await getStepsEntries(userId);
  return entries.find(e => e.id === id) || null;
}

// Save all steps entries
async function saveStepsEntries(userId: string, entries: StepsEntry[]): Promise<void> {
  await ensureStepsDir();
  const filePath = getStepsPath(userId);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}

// Create a new steps entry (always creates new, never updates)
export async function createStepsEntry(userId: string, steps: number, date?: string, timestamp?: string): Promise<StepsEntry> {
  // Clamp to max 5 digits (99999)
  const clampedSteps = Math.min(Math.max(0, Math.floor(steps)), 99999);

  const entries = await getStepsEntries(userId);
  const entryDate = date || getTodayDate();
  const now = new Date().toISOString();

  // Always create new entry
  const newEntry: StepsEntry = {
    id: generateId(),
    author: userId,
    date: entryDate,
    steps: clampedSteps,
    timestamp: timestamp || now,
    updatedAt: now
  };
  entries.push(newEntry);
  await saveStepsEntries(userId, entries);
  return newEntry;
}

// Update steps entry by ID
export async function updateStepsById(userId: string, id: string, steps: number, timestamp?: string): Promise<StepsEntry | null> {
  // Clamp to max 5 digits (99999)
  const clampedSteps = Math.min(Math.max(0, Math.floor(steps)), 99999);

  const entries = await getStepsEntries(userId);
  const existingIndex = entries.findIndex(e => e.id === id);
  const now = new Date().toISOString();

  if (existingIndex === -1) {
    return null; // Entry not found
  }

  // Update existing entry
  entries[existingIndex].steps = clampedSteps;
  if (timestamp) {
    entries[existingIndex].timestamp = timestamp;
  }
  entries[existingIndex].updatedAt = now;
  await saveStepsEntries(userId, entries);
  return entries[existingIndex];
}

// Delete steps entry by ID
export async function deleteStepsById(userId: string, id: string): Promise<boolean> {
  const entries = await getStepsEntries(userId);
  const existingIndex = entries.findIndex(e => e.id === id);

  if (existingIndex === -1) {
    return false; // Entry not found
  }

  entries.splice(existingIndex, 1);
  await saveStepsEntries(userId, entries);
  // Clean up associated photo if any
  const { deletePhoto } = await import('./photos');
  await deletePhoto(userId, 'steps', id);
  return true;
}

// Format steps for display
export function formatSteps(steps: number): string {
  return steps.toLocaleString();
}
