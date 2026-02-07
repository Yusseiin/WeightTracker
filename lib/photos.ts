import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const PHOTOS_DIR = path.join(CONFIG_PATH, 'photos');

// Entry types that support photos
export type PhotoEntryType = 'weight' | 'medication' | 'injection' | 'steps' | 'pressure';

const VALID_ENTRY_TYPES: PhotoEntryType[] = ['weight', 'medication', 'injection', 'steps', 'pressure'];

// Get the directory for a user's photos
const getUserPhotosDir = (userId: string) => path.join(PHOTOS_DIR, userId);

// Legacy path: {entryType}-{entryId}.jpg
const getLegacyPhotoPath = (userId: string, entryType: PhotoEntryType, entryId: string) =>
  path.join(getUserPhotosDir(userId), `${entryType}-${entryId}.jpg`);

// Indexed path: {entryType}-{entryId}-{index}.jpg
const getIndexedPhotoPath = (userId: string, entryType: PhotoEntryType, entryId: string, index: number) =>
  path.join(getUserPhotosDir(userId), `${entryType}-${entryId}-${index}.jpg`);

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ensurePhotosDir(userId: string): Promise<void> {
  await fs.mkdir(getUserPhotosDir(userId), { recursive: true });
}

export function isValidEntryType(type: string): type is PhotoEntryType {
  return VALID_ENTRY_TYPES.includes(type as PhotoEntryType);
}

// List all photo indices for a specific entry (handles legacy + indexed files)
export async function listPhotosForEntry(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string
): Promise<number[]> {
  const dir = getUserPhotosDir(userId);
  try {
    const files = await fs.readdir(dir);
    const prefix = `${entryType}-${entryId}`;
    const indices: number[] = [];

    for (const f of files) {
      // Legacy single-photo: {type}-{id}.jpg -> treat as index 0
      if (f === `${prefix}.jpg`) {
        indices.push(0);
        continue;
      }
      // Indexed: {type}-{id}-{N}.jpg
      const match = f.match(new RegExp(`^${escapeRegex(prefix)}-(\\d+)\\.jpg$`));
      if (match) {
        indices.push(parseInt(match[1]));
      }
    }
    return indices.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

// Get the next available photo index for an entry
export async function getNextPhotoIndex(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string
): Promise<number> {
  const indices = await listPhotosForEntry(userId, entryType, entryId);
  return indices.length === 0 ? 0 : Math.max(...indices) + 1;
}

// Save a photo at the next available index, returns the index used
export async function savePhoto(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string,
  imageBuffer: Buffer
): Promise<number> {
  await ensurePhotosDir(userId);
  const index = await getNextPhotoIndex(userId, entryType, entryId);
  const filePath = getIndexedPhotoPath(userId, entryType, entryId, index);
  await fs.writeFile(filePath, imageBuffer);
  return index;
}

// Get a specific photo by index (handles legacy fallback for index 0)
export async function getPhoto(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string,
  index: number = 0
): Promise<Buffer | null> {
  // Try indexed path first
  const indexedPath = getIndexedPhotoPath(userId, entryType, entryId, index);
  try {
    return await fs.readFile(indexedPath);
  } catch {
    // For index 0, also try legacy path
    if (index === 0) {
      const legacyPath = getLegacyPhotoPath(userId, entryType, entryId);
      try {
        return await fs.readFile(legacyPath);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Delete a specific photo by index
export async function deletePhotoByIndex(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string,
  index: number
): Promise<boolean> {
  // Try indexed path first
  const indexedPath = getIndexedPhotoPath(userId, entryType, entryId, index);
  try {
    await fs.unlink(indexedPath);
    return true;
  } catch {
    // For index 0, also try legacy path
    if (index === 0) {
      const legacyPath = getLegacyPhotoPath(userId, entryType, entryId);
      try {
        await fs.unlink(legacyPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

// Delete ALL photos for an entry
export async function deletePhotos(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string
): Promise<void> {
  const indices = await listPhotosForEntry(userId, entryType, entryId);
  for (const idx of indices) {
    await deletePhotoByIndex(userId, entryType, entryId, idx);
  }
}

// Backward-compatible alias - deletes all photos for an entry
// Used by lib delete cascades (data.ts, medication.ts, steps.ts, pressure.ts, injections.ts)
export async function deletePhoto(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string
): Promise<boolean> {
  await deletePhotos(userId, entryType, entryId);
  return true;
}

// List all entries that have photos for a given type, with counts
export async function listPhotosForType(
  userId: string,
  entryType: PhotoEntryType
): Promise<Record<string, number>> {
  const dir = getUserPhotosDir(userId);
  try {
    const files = await fs.readdir(dir);
    const prefix = `${entryType}-`;
    const counts: Record<string, number> = {};

    for (const f of files) {
      if (!f.startsWith(prefix) || !f.endsWith('.jpg')) continue;

      const withoutPrefix = f.slice(prefix.length, -4); // remove prefix and .jpg

      // Legacy: {id} (no dash-number suffix, the id itself may contain dashes)
      // Indexed: {id}-{N}
      // We need to distinguish: try matching trailing -\d+ as index
      const indexMatch = withoutPrefix.match(/^(.+)-(\d+)$/);
      if (indexMatch) {
        const entryId = indexMatch[1];
        counts[entryId] = (counts[entryId] || 0) + 1;
      } else {
        // Legacy single photo
        const entryId = withoutPrefix;
        counts[entryId] = (counts[entryId] || 0) + 1;
      }
    }
    return counts;
  } catch {
    return {};
  }
}
