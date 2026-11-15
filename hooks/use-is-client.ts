import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true afterwards. Use it to read
 * browser-only values (like localStorage) during render without a hydration
 * mismatch and without a setState-in-effect round trip.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
