import { useState } from 'react';

const UNSET = Symbol('unset');

/**
 * True during the render in which any value in `deps` differs (Object.is) from
 * the previous render, including the first one. Lets a component reset local
 * state while rendering instead of in an effect:
 *
 *   if (useDepsChanged([open, entry]) && open && entry) { setName(entry.name); }
 *
 * React re-runs the component right away when state is set during render, so
 * the reset lands before anything is painted (no flash of stale values).
 * See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 *
 * `deps` must be props, state or memoized values - not objects created inline
 * during render, which would differ on every render.
 */
export function useDepsChanged(deps: readonly unknown[]): boolean {
  const [prev, setPrev] = useState<readonly unknown[] | typeof UNSET>(UNSET);
  const changed =
    prev === UNSET ||
    prev.length !== deps.length ||
    deps.some((dep, i) => !Object.is(dep, prev[i]));
  if (changed) setPrev(deps);
  return changed;
}
