import type { ReactNode } from 'react';
import type { Flat, LineTone, SolidPaths, Tone } from './iso-kit';
import { Dots, Line, Solid, Wire } from './react/draw';

/**
 * The drawn parts a figure's geometry module lists in painter's order: a
 * solid, a line on a face, a row of screw dots or a wire between two parts.
 * A module adds its own kinds (slots the live code fills) beside these.
 */
export type IsoPart =
  | { kind: 'solid'; paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone | 'none'; inner?: string }
  | { kind: 'line'; d: string; tone?: LineTone; free?: boolean | 'start' | 'end' }
  | { kind: 'dots'; points: Flat[]; size?: number; tone?: Tone }
  | { kind: 'wire'; from: Flat; to: Flat; via: Flat[]; tone?: LineTone };

/** One drawn part. `inner` is the kit's line markup for seams under a solid's outline. */
export function PartView({ part }: { part: IsoPart }): ReactNode {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
}
