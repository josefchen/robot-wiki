/**
 * Hull outlines that read the same on the server and in every browser.
 *
 * A convex solid's fill and outline are its hull, which starts at the corner
 * with the least x. Two corners whose x differs only in the last bits (the
 * two ends of a slanted rod, a box seen edge on) can swap places between one
 * JavaScript engine's sines and cosines and another's, so the server's path
 * and the browser's can start at different corners and hydration reports a
 * mismatch, although both draw the same polygon. Starting each closed
 * polygon at its least rounded point makes the two strings equal.
 */
import type { SolidPaths } from './iso-kit.ts';

/** A single closed polygon path (M…L…Z), rotated to start at its least point; anything else as it is. */
export function steadyPath(d: string): string {
  const match = /^M([^MZ]*)Z$/.exec(d);
  if (!match) return d;
  const points = match[1]!.split('L');
  const key = (p: string) => p.split(' ').map(Number) as [number, number];
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = key(points[i]!);
    const [bx, by] = key(points[best]!);
    if (ax < bx || (ax === bx && ay < by)) best = i;
  }
  return `M${[...points.slice(best), ...points.slice(0, best)].join('L')}Z`;
}

/** A solid's hull paths, each started at its least point. */
export const steadySolid = (paths: SolidPaths): SolidPaths => ({
  ...paths,
  fill: steadyPath(paths.fill),
  outline: steadyPath(paths.outline),
  top: steadyPath(paths.top),
});
