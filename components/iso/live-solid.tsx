import { forwardRef } from 'react';
import type { SolidPaths, Tone } from './iso-kit';

/**
 * A solid whose shape the live code rebuilds each frame (a crank that turns,
 * a pen that rides a trace). It paints exactly as the kit's Solid does,
 * fill, the four side shades, top, crease, bevel and outline, but always
 * renders all of its paths, so `writeSolid` can replace each `d` in place
 * without a React render, even when a shade is empty in one pose and not in
 * the next.
 */
export const LiveSolid = forwardRef<SVGGElement, { paths: SolidPaths; tone?: Tone; lit?: boolean; crease?: Tone }>(
  function LiveSolid({ paths, tone = 'hi', lit = false, crease = 'faint' }, ref) {
    return (
      <g ref={ref} className="iso-solid" data-lit={lit ? '' : undefined}>
        <path className="iso-fill" data-live-part="fill" d={paths.fill} />
        {[0, 1, 2, 3].map((shade) => (
          <path key={shade} className="iso-shade" data-shade={shade} data-live-part={`shade-${shade}`} d={paths.shades[shade] ?? ''} />
        ))}
        <path className="iso-top" data-live-part="top" d={paths.top} />
        <path className="iso-line iso-crease" data-tone={crease} data-live-part="crease" d={paths.crease} />
        <path className="iso-line iso-bevel" data-tone={crease} data-live-part="bevel" d={paths.bevel ?? ''} />
        <path className="iso-line iso-edge" data-tone={tone} data-live-part="edge" d={paths.outline} />
      </g>
    );
  },
);

/** Write a rebuilt shape into a LiveSolid's paths. */
export function writeSolid(group: SVGGElement | null, paths: SolidPaths) {
  if (!group) return;
  const set = (part: string, d: string) => group.querySelector(`[data-live-part="${part}"]`)?.setAttribute('d', d);
  set('fill', paths.fill);
  for (let shade = 0; shade < 4; shade++) set(`shade-${shade}`, paths.shades[shade] ?? '');
  set('top', paths.top);
  set('crease', paths.crease);
  set('bevel', paths.bevel ?? '');
  set('edge', paths.outline);
}
