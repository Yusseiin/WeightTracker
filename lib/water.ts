import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { WaterEntry } from './types';

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

// Get all water entries for a user
export async function getWaterEntries(userId: string): Promise<WaterEntry[]> {
  await ensureWaterDir();
  const filePath = getWaterPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, return empty array
    return [];
  }
}

// Get water entry for specific date
export async function getWaterEntry(userId: string, date: string): Promise<WaterEntry | null> {
  const entries = await getWaterEntries(userId);
  return entries.find(e => e.date === date) || null;
}

// Get today's water entry
export async function getTodayWater(userId: string): Promise<WaterEntry | null> {
  return getWaterEntry(userId, getTodayDate());
}

// Save all water entries
async function saveWaterEntries(userId: string, entries: WaterEntry[]): Promise<void> {
  await ensureWaterDir();
  const filePath = getWaterPath(userId);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}

// Add water to today's total (creates entry if doesn't exist)
export async function addWater(userId: string, amount: number): Promise<WaterEntry> {
  const entries = await getWaterEntries(userId);
  const today = getTodayDate();
  const existingIndex = entries.findIndex(e => e.date === today);

  if (existingIndex !== -1) {
    // Update existing entry
    entries[existingIndex].amount += amount;
    entries[existingIndex].updatedAt = new Date().toISOString();
    await saveWaterEntries(userId, entries);
    return entries[existingIndex];
  } else {
    // Create new entry for today
    const newEntry: WaterEntry = {
      id: generateId(),
      author: userId,
      date: today,
      amount,
      updatedAt: new Date().toISOString()
    };
    entries.push(newEntry);
    await saveWaterEntries(userId, entries);
    return newEntry;
  }
}

// Reset today's water to 0
export async function resetTodayWater(userId: string): Promise<WaterEntry> {
  const entries = await getWaterEntries(userId);
  const today = getTodayDate();
  const existingIndex = entries.findIndex(e => e.date === today);

  if (existingIndex !== -1) {
    // Reset existing entry
    entries[existingIndex].amount = 0;
    entries[existingIndex].updatedAt = new Date().toISOString();
    await saveWaterEntries(userId, entries);
    return entries[existingIndex];
  } else {
    // Create new entry with 0
    const newEntry: WaterEntry = {
      id: generateId(),
      author: userId,
      date: today,
      amount: 0,
      updatedAt: new Date().toISOString()
    };
    entries.push(newEntry);
    await saveWaterEntries(userId, entries);
    return newEntry;
  }
}

// Set water amount for a specific date (create or update)
export async function setWaterAmount(userId: string, date: string, amount: number): Promise<WaterEntry> {
  const entries = await getWaterEntries(userId);
  const existingIndex = entries.findIndex(e => e.date === date);

  if (existingIndex !== -1) {
    // Update existing entry
    entries[existingIndex].amount = amount;
    entries[existingIndex].updatedAt = new Date().toISOString();
    await saveWaterEntries(userId, entries);
    return entries[existingIndex];
  } else {
    // Create new entry for that date
    const newEntry: WaterEntry = {
      id: generateId(),
      author: userId,
      date,
      amount,
      updatedAt: new Date().toISOString()
    };
    entries.push(newEntry);
    await saveWaterEntries(userId, entries);
    return newEntry;
  }
}

// Format water amount for display
export function formatWaterAmount(ml: number): string {
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${liters.toFixed(1)}L`;
  }
  return `${ml}ml`;
}
