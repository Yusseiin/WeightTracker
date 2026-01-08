import { promises as fs } from 'fs';
import path from 'path';
import { WeightEntry, UserSettings, DEFAULT_USER_ID, DateFormatSettings } from './types';
import { DEFAULT_DATE_FORMAT } from './date-utils';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';

// New folder structure
const ENTRIES_DIR = path.join(CONFIG_PATH, 'entries');
const SETTINGS_DIR = path.join(CONFIG_PATH, 'settings');

// New file paths
const getEntriesPath = (userId: string) => path.join(ENTRIES_DIR, `${userId}.json`);
const getSettingsPath = (userId: string) => path.join(SETTINGS_DIR, `${userId}.json`);

// Legacy file paths for migration
const getLegacyEntriesPath = (userId: string) => path.join(CONFIG_PATH, `entries-${userId}.json`);
const getLegacySettingsPath = (userId: string) => path.join(CONFIG_PATH, `settings-${userId}.json`);

// Check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Ensure all config directories exist
async function ensureDataDirs(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_PATH, { recursive: true });
    await fs.mkdir(ENTRIES_DIR, { recursive: true });
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
  } catch {
    // Directories already exist
  }
}

// Migrate data from old structure to new structure for a user
async function migrateUserDataIfNeeded(userId: string): Promise<void> {
  const legacyEntriesPath = getLegacyEntriesPath(userId);
  const legacySettingsPath = getLegacySettingsPath(userId);
  const newEntriesPath = getEntriesPath(userId);
  const newSettingsPath = getSettingsPath(userId);

  // Migrate entries
  const legacyEntriesExist = await fileExists(legacyEntriesPath);
  const newEntriesExist = await fileExists(newEntriesPath);

  if (legacyEntriesExist && !newEntriesExist) {
    await ensureDataDirs();
    const data = await fs.readFile(legacyEntriesPath, 'utf-8');
    await fs.writeFile(newEntriesPath, data, 'utf-8');
    await fs.unlink(legacyEntriesPath);
  }

  // Migrate settings
  const legacySettingsExist = await fileExists(legacySettingsPath);
  const newSettingsExist = await fileExists(newSettingsPath);

  if (legacySettingsExist && !newSettingsExist) {
    await ensureDataDirs();
    const data = await fs.readFile(legacySettingsPath, 'utf-8');
    await fs.writeFile(newSettingsPath, data, 'utf-8');
    await fs.unlink(legacySettingsPath);
  }
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============ ENTRIES ============

export async function getEntries(userId: string = DEFAULT_USER_ID): Promise<WeightEntry[]> {
  await ensureDataDirs();
  await migrateUserDataIfNeeded(userId);
  const filePath = getEntriesPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const entries: WeightEntry[] = JSON.parse(data);
    // Sort by timestamp descending (newest first)
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    // File doesn't exist yet, return empty array
    return [];
  }
}

export async function addEntry(
  data: Omit<WeightEntry, 'id'>,
  userId: string = DEFAULT_USER_ID
): Promise<WeightEntry> {
  await ensureDataDirs();
  await migrateUserDataIfNeeded(userId);
  const filePath = getEntriesPath(userId);

  const entries = await getEntries(userId);

  const newEntry: WeightEntry = {
    ...data,
    id: generateId(),
    author: userId
  };

  entries.push(newEntry);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');

  return newEntry;
}

export async function updateEntry(
  entryId: string,
  data: Partial<Omit<WeightEntry, 'id' | 'author'>>,
  userId: string = DEFAULT_USER_ID
): Promise<WeightEntry | null> {
  await ensureDataDirs();
  await migrateUserDataIfNeeded(userId);
  const filePath = getEntriesPath(userId);

  const entries = await getEntries(userId);
  const index = entries.findIndex(e => e.id === entryId);

  if (index === -1) {
    return null;
  }

  entries[index] = { ...entries[index], ...data };
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');

  return entries[index];
}

export async function deleteEntry(
  entryId: string,
  userId: string = DEFAULT_USER_ID
): Promise<boolean> {
  await ensureDataDirs();
  await migrateUserDataIfNeeded(userId);
  const filePath = getEntriesPath(userId);

  const entries = await getEntries(userId);
  const filteredEntries = entries.filter(e => e.id !== entryId);

  if (filteredEntries.length === entries.length) {
    return false; // Entry not found
  }

  await fs.writeFile(filePath, JSON.stringify(filteredEntries, null, 2), 'utf-8');
  return true;
}

// ============ SETTINGS ============

const defaultSettings = (userId: string): UserSettings => ({
  userId,
  unit: 'kg',
  waterUnit: 'ml',
  targetWeight: null,
  chartColor: 'primary',
  dateFormat: DEFAULT_DATE_FORMAT,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export async function getSettings(userId: string = DEFAULT_USER_ID): Promise<UserSettings> {
  await ensureDataDirs();
  await migrateUserDataIfNeeded(userId);
  const filePath = getSettingsPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const settings = JSON.parse(data);
    // Add chartColor if missing (backward compatibility)
    if (!settings.chartColor) {
      settings.chartColor = 'primary';
    }
    // Add waterUnit if missing (backward compatibility)
    if (!settings.waterUnit) {
      settings.waterUnit = 'ml';
    }
    // Add dateFormat if missing (backward compatibility)
    if (!settings.dateFormat) {
      settings.dateFormat = DEFAULT_DATE_FORMAT;
    }
    return settings;
  } catch {
    // File doesn't exist, create with defaults
    const settings = defaultSettings(userId);
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    return settings;
  }
}

export async function updateSettings(
  data: Partial<Omit<UserSettings, 'userId' | 'createdAt'>>,
  userId: string = DEFAULT_USER_ID
): Promise<UserSettings> {
  await ensureDataDirs();
  await migrateUserDataIfNeeded(userId);
  const filePath = getSettingsPath(userId);

  const current = await getSettings(userId);
  const updated: UserSettings = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
