import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const PHOTOS_DIR = path.join(CONFIG_PATH, 'photos');

// Entry types that support photos
export type PhotoEntryType = 'weight' | 'medication' | 'injection' | 'steps' | 'pressure';

const VALID_ENTRY_TYPES: PhotoEntryType[] = ['weight', 'medication', 'injection', 'steps', 'pressure'];

// Get the directory for a user's photos
const getUserPhotosDir = (userId: string) => path.join(PHOTOS_DIR, userId);

// Get the file path for a specific photo
const getPhotoPath = (userId: string, entryType: PhotoEntryType, entryId: string) =>
  path.join(getUserPhotosDir(userId), `${entryType}-${entryId}.jpg`);

async function ensurePhotosDir(userId: string): Promise<void> {
  await fs.mkdir(getUserPhotosDir(userId), { recursive: true });
}

export function isValidEntryType(type: string): type is PhotoEntryType {
  return VALID_ENTRY_TYPES.includes(type as PhotoEntryType);
}

export async function savePhoto(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string,
  imageBuffer: Buffer
): Promise<string> {
  await ensurePhotosDir(userId);
  const filePath = getPhotoPath(userId, entryType, entryId);
  await fs.writeFile(filePath, imageBuffer);
  return `/api/photos/${entryType}/${entryId}`;
}

export async function getPhoto(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string
): Promise<Buffer | null> {
  const filePath = getPhotoPath(userId, entryType, entryId);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deletePhoto(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string
): Promise<boolean> {
  const filePath = getPhotoPath(userId, entryType, entryId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function hasPhoto(
  userId: string,
  entryType: PhotoEntryType,
  entryId: string
): Promise<boolean> {
  const filePath = getPhotoPath(userId, entryType, entryId);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listPhotosForType(
  userId: string,
  entryType: PhotoEntryType
): Promise<string[]> {
  const dir = getUserPhotosDir(userId);
  try {
    const files = await fs.readdir(dir);
    const prefix = `${entryType}-`;
    const suffix = '.jpg';
    return files
      .filter(f => f.startsWith(prefix) && f.endsWith(suffix))
      .map(f => f.slice(prefix.length, -suffix.length));
  } catch {
    return [];
  }
}
