import { promises as fs } from 'fs';
import path from 'path';

// Config directory - configurable via env for Docker/Unraid
const CONFIG_PATH = process.env.CONFIG_PATH || '/config';

// Per-user JSON files that hold an array of entries, each carrying an `author` field.
// (Named `{username}.json` inside their own subdirectory.)
const ENTRY_DIRS = [
  'entries',
  'water',
  'steps',
  'pressure',
  'medications',
  'injections',
  'body-measurements',
];

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Read + parse a JSON file, or return null if it doesn't exist.
async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw error;
  }
}

// Every destination path that must be free before we start, so a rename never
// silently overwrites data that already belongs to the new username.
function targetPaths(newUsername: string): string[] {
  const targets: string[] = [];
  for (const dir of [...ENTRY_DIRS, 'settings']) {
    targets.push(path.join(CONFIG_PATH, dir, `${newUsername}.json`));
  }
  targets.push(path.join(CONFIG_PATH, 'photos', newUsername));
  targets.push(path.join(CONFIG_PATH, `entries-${newUsername}.json`));
  targets.push(path.join(CONFIG_PATH, `settings-${newUsername}.json`));
  return targets;
}

// Throw if any destination already exists (refuse to clobber existing data).
export async function assertRenameTargetsFree(newUsername: string): Promise<void> {
  for (const target of targetPaths(newUsername)) {
    if (await pathExists(target)) {
      throw new Error('Data already exists for the new username; refusing to overwrite it');
    }
  }
}

// Move an entry-array file, rewriting the `author` field on each item.
async function migrateArrayFile(
  from: string,
  to: string,
  oldUsername: string,
  newUsername: string,
): Promise<void> {
  const data = await readJsonIfExists(from);
  if (data === null) return;

  const rewritten = Array.isArray(data)
    ? data.map((item) =>
        item && typeof item === 'object' && (item as { author?: string }).author === oldUsername
          ? { ...item, author: newUsername }
          : item,
      )
    : data;

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.writeFile(to, JSON.stringify(rewritten, null, 2), 'utf-8');
  await fs.unlink(from);
}

// Move a settings object file, rewriting its `userId`.
async function migrateSettingsFile(from: string, to: string, newUsername: string): Promise<void> {
  const data = await readJsonIfExists(from);
  if (data === null) return;

  const rewritten =
    data && typeof data === 'object' && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>), userId: newUsername }
      : data;

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.writeFile(to, JSON.stringify(rewritten, null, 2), 'utf-8');
  await fs.unlink(from);
}

// Move the photos directory. Photo filenames embed entryType/entryId/index,
// not the username, so no in-file rewrite is needed.
async function migratePhotosDir(oldUsername: string, newUsername: string): Promise<void> {
  const from = path.join(CONFIG_PATH, 'photos', oldUsername);
  const to = path.join(CONFIG_PATH, 'photos', newUsername);
  if (!(await pathExists(from))) return;
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}

// Migrate every per-user file/dir from oldUsername to newUsername.
// Callers must have already validated the new username and confirmed it is unique
// in users.json; this handles only the on-disk data.
export async function renameUserData(oldUsername: string, newUsername: string): Promise<void> {
  await assertRenameTargetsFree(newUsername);

  for (const dir of ENTRY_DIRS) {
    await migrateArrayFile(
      path.join(CONFIG_PATH, dir, `${oldUsername}.json`),
      path.join(CONFIG_PATH, dir, `${newUsername}.json`),
      oldUsername,
      newUsername,
    );
  }

  await migrateSettingsFile(
    path.join(CONFIG_PATH, 'settings', `${oldUsername}.json`),
    path.join(CONFIG_PATH, 'settings', `${newUsername}.json`),
    newUsername,
  );

  // Legacy flat-file layout (pre-subdirectory installs).
  await migrateArrayFile(
    path.join(CONFIG_PATH, `entries-${oldUsername}.json`),
    path.join(CONFIG_PATH, `entries-${newUsername}.json`),
    oldUsername,
    newUsername,
  );
  await migrateSettingsFile(
    path.join(CONFIG_PATH, `settings-${oldUsername}.json`),
    path.join(CONFIG_PATH, `settings-${newUsername}.json`),
    newUsername,
  );

  await migratePhotosDir(oldUsername, newUsername);
}
