import { promises as fs } from 'fs';
import path from 'path';
import { BodyMeasurementEntry } from './types';

const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const BODY_MEASUREMENTS_DIR = path.join(CONFIG_PATH, 'body-measurements');

const getBodyMeasurementsPath = (userId: string) =>
  path.join(BODY_MEASUREMENTS_DIR, `${userId}.json`);

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(BODY_MEASUREMENTS_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

function generateId(): string {
  return `bm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function getBodyMeasurements(userId: string): Promise<BodyMeasurementEntry[]> {
  await ensureDir();
  const filePath = getBodyMeasurementsPath(userId);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const entries: BodyMeasurementEntry[] = JSON.parse(data);
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    return [];
  }
}

export async function getBodyMeasurementById(
  userId: string,
  id: string
): Promise<BodyMeasurementEntry | null> {
  const entries = await getBodyMeasurements(userId);
  return entries.find((e) => e.id === id) || null;
}

async function saveAll(userId: string, entries: BodyMeasurementEntry[]): Promise<void> {
  await ensureDir();
  const filePath = getBodyMeasurementsPath(userId);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}

export async function createBodyMeasurement(
  userId: string,
  data: { timestamp: string; measurements: Record<string, number>; notes?: string }
): Promise<BodyMeasurementEntry> {
  const entries = await getBodyMeasurements(userId);
  const now = new Date().toISOString();
  const newEntry: BodyMeasurementEntry = {
    id: generateId(),
    author: userId,
    timestamp: data.timestamp,
    measurements: data.measurements,
    updatedAt: now,
  };
  if (data.notes) newEntry.notes = data.notes;
  entries.push(newEntry);
  await saveAll(userId, entries);
  return newEntry;
}

export async function updateBodyMeasurement(
  userId: string,
  id: string,
  data: { timestamp?: string; measurements?: Record<string, number>; notes?: string }
): Promise<BodyMeasurementEntry | null> {
  const entries = await getBodyMeasurements(userId);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  if (data.timestamp) entries[idx].timestamp = data.timestamp;
  if (data.measurements) entries[idx].measurements = data.measurements;
  if (data.notes !== undefined) entries[idx].notes = data.notes || undefined;
  entries[idx].updatedAt = now;
  await saveAll(userId, entries);
  return entries[idx];
}

export async function deleteBodyMeasurement(userId: string, id: string): Promise<boolean> {
  const entries = await getBodyMeasurements(userId);
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  await saveAll(userId, filtered);
  // Cascade: clean up any attached photos
  const { deletePhoto } = await import('./photos');
  await deletePhoto(userId, 'body-measurement', id);
  return true;
}
