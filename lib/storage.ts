import { promises as fs } from 'fs';
import path from 'path';

// In-process, per-key mutex.
//
// Data is stored as one JSON file per user per type, and every mutation is a
// read-modify-write. Node's async fs means two concurrent requests can interleave
// (A reads, B reads, A writes, B writes -> A's change is lost). withFileLock
// serializes operations that share a key (the file path), so each read-modify-write
// runs to completion before the next one starts.
//
// This only guards a single process. Running multiple instances against the same
// data directory would still race - but that isn't a supported deployment.
const tails = new Map<string, Promise<unknown>>();

export function withFileLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  // Queue behind whatever is currently running/pending for this key.
  const prev = tails.get(key) ?? Promise.resolve();
  const run = prev.then(() => task());

  // The stored tail swallows errors so one failed op doesn't wedge the chain.
  const tail: Promise<unknown> = run.then(() => undefined, () => undefined);
  tails.set(key, tail);

  // Drop the map entry once this is the last op in the chain, so the map doesn't
  // grow without bound. If someone queued after us, they replaced the tail and we
  // leave it alone.
  tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });

  return run;
}

// Write JSON atomically: write to a temp file, then rename over the target.
// rename() is atomic on a single filesystem, so a concurrent reader sees either
// the old file or the new one - never a truncated/partial file. This lets reads
// stay lock-free.
export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  // Writes to a given path are serialized by withFileLock, so a per-process temp
  // name can't collide with another writer of the same file.
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmpPath, filePath);
}
