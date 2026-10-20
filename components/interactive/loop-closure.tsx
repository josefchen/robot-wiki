'use client';

import { memo, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  SliderRow,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { CROP_TABLE, HEIGHT, PARTS, WIDTH, movingAt, type TablePart } from '@/components/iso/figures/chain-map-table';
import {
  CLOSE_SECONDS,
  DRIFT_RANGE,
  DRIFT_STEP,
  DRIVEN_LEGS,
  JOINTS,
  LEG_M,
  OPENING_DRIFT,
  clampDrift,
  closeShareAt,
  movingReadout,
  printed,
  readoutFor,
  valueTextFor,
} from '@/lib/loop-closure';

/**
 * LoopClosure: why recognising a place it has mapped lets a robot pull its
 * drifted map back into shape, for the scene-representation article, drawn
 * as a chain-map table (components/iso/figures/chain-map-table.ts).
 *
 * A jointed chain lies on a printed floor plan: a link for every leg the
 * robot drove, a pin on a glide puck for every pose it remembered, and a
 * torsion spring at every pin holding the turn it measured. Each measured
 * turn comes up a little short, so the chain swings wide of the plan and its
 * end comes round short of the start. The rover on the last link sees the
 * start again: the lit bar on its front is that view, one leg straight
 * ahead, and its socket misses the start post by the drift. "Close the loop"
 * seats the socket on the post: every spring gives by its share of the
 * least-squares correction (lib/loop-closure.ts) and the chain settles back
 * onto the plan. The drift slider sets how far each turn is off. Reduced
 * motion jumps.
 */

/** How quickly the chain follows a new drift, seconds. */
const FOLLOW_SECONDS = 0.2;

const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

/** Parts built once and slid into place: the same array every frame, so React skips them. */
const GroupBody = memo(function GroupBody({ parts }: { parts: readonly TablePart[] }) {
  return parts.map((part, n) => <PartView key={n} part={part} />);
});

function PartView({ part }: { part: TablePart }): ReactNode {
  if (part.kind === 'group') {
    return (
      <g transform={`translate(${part.dx} ${part.dy})`}>
        <GroupBody parts={part.parts} />
      </g>
    );
  }
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  // The plan sheet's printed ground and the pole's painted bands: shades, not parts.
  if (part.kind === 'face') {
    if (part.fill === 'void') return <path className="iso-shade" data-shade="0" style={{ fill: 'color-mix(in srgb, var(--anatomy-lo) 55%, var(--anatomy-paper))' }} d={part.d} />;
    return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
  }
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}

const hundredth = (value: number) => Math.round(value * 100) / 100;

/** The table, which never moves, drawn once: every part before the chain's slot. */
const SLOT_AT = PARTS.findIndex((part) => part.kind === 'slot');
const StaticTable = memo(function StaticTable() {
  return PARTS.slice(0, SLOT_AT).map((part, index) => (part.kind === 'slot' ? null : <PartView key={index} part={part} />));
});

export function LoopClosure({ className }: { className?: string }) {
  const driftId = useId();
  const drawingId = `${useId()}-drawing`;
  /** The table runs on past the frame; its parts are cropped to the drawing. */
  const cropId = `lc-crop-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  /** The drift the reader has set, whether the loop is (or is closing) closed, and the chain as drawn. */
  const [drift, setDrift] = useState(OPENING_DRIFT);
  const [closed, setClosed] = useState(false);
  const [table, setTable] = useState({ drift: OPENING_DRIFT, share: 0 });
  const live = useRef({ target: OPENING_DRIFT, drift: OPENING_DRIFT, share: 0, from: 0, to: 0, start: 0 });
  const frame = useRef(0);

  const tick = useCallback(function step(now: number, last: number) {
    const s = live.current;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    const k = 1 - Math.exp(-dt / FOLLOW_SECONDS);
    s.drift += (s.target - s.drift) * k;
    if (Math.abs(s.target - s.drift) < 0.005) s.drift = s.target;
    if (s.share !== s.to) {
      // The close runs on its own eased clock, over CLOSE_SECONDS for a full close, less for a part of one.
      const span = Math.abs(s.to - s.from) || 1;
      const t = (now - s.start) / 1000 / span;
      s.share = s.from + (s.to - s.from) * closeShareAt(t);
      if (t >= CLOSE_SECONDS) s.share = s.to;
    }
    setTable({ drift: s.drift, share: s.share });
    const moving = s.drift !== s.target || s.share !== s.to;
    frame.current = moving ? requestAnimationFrame((t) => step(t, now)) : 0;
  }, []);

  const kick = useCallback(() => {
    if (frame.current) return;
    const start = performance.now();
    frame.current = requestAnimationFrame((t) => tick(t, start));
  }, [tick]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const setTo = (value: number) => {
    const next = clampDrift(value);
    const s = live.current;
    s.target = next;
    setDrift(next);
    if (calm()) {
      s.drift = next;
      setTable({ drift: next, share: s.share });
      return;
    }
    kick();
  };

  const toggle = () => {
    const s = live.current;
    const to = closed ? 0 : 1;
    setClosed(!closed);
    s.from = s.share;
    s.to = to;
    s.start = performance.now();
    if (calm()) {
      s.share = to;
      s.from = to;
      setTable({ drift: s.drift, share: to });
      return;
    }
    kick();
  };

  const moving = movingAt(table);
  const settled = table.share === 0 || table.share === 1;
  const shownClosed = table.share === 1;
  const words = printed(drift);
  const readout = settled ? readoutFor(drift, shownClosed) : movingReadout(table.drift, table.share, closed);

  return (
    <InstrumentFigure
      figureId="loop-closure"
      className={className}
      kicker="Loop closure"
      heading="Recognising the start pulls the drifted map back into shape"
      controls={
        <>
          <SliderRow htmlFor={driftId} label="How far each turn is off" value={<span data-testid="lc-drift">{drift.toFixed(1)} degrees</span>}>
            <input
              id={driftId}
              type="range"
              data-brand-control-id="control:input"
              min={DRIFT_RANGE[0]}
              max={DRIFT_RANGE[1]}
              step={DRIFT_STEP}
              value={drift}
              onChange={(e) => setTo(Number(e.target.value))}
              aria-valuetext={valueTextFor(drift, closed)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </SliderRow>
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={toggle}
            data-testid="lc-close"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {closed ? 'Open the loop' : 'Close the loop'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Close the loop: every spring gives a little and the chain settles onto the plan"
          readout={readout}
          status="Illustrative course and drift; each joint's share is that chain's exact least-squares solution"
          data-testid="lc-stage"
        >
          <div data-testid="lc-drawing" data-drift={hundredth(table.drift)} data-share={hundredth(table.share)}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={
                closed
                  ? `A jointed chain on a plotting table, a robot's map of one lap round a corridor. With each measured turn ${drift.toFixed(1)} degrees short, the loop is closed: the lit bar's socket sits on the start post, the springs at ${JOINTS} joints share ${words.lap} degrees, and the worst pose lies ${words.worstClosed} m off the plan.`
                  : `A jointed chain on a plotting table, a robot's map of one lap round a corridor. With each measured turn ${drift.toFixed(1)} degrees short, the chain swings wide of the plan and the lit bar, the camera's view of the start, misses the start post by ${words.gap} m.`
              }
            >
              <defs>
                <clipPath id={cropId}>
                  <rect x={0} y={0} width={WIDTH} height={HEIGHT} />
                </clipPath>
              </defs>
              <g clipPath={CROP_TABLE ? `url(#${cropId})` : undefined}>
                <StaticTable />
              </g>
              {PARTS.slice(SLOT_AT).map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                return (
                  <g key={part.slot} data-part={part.slot}>
                    {moving[part.slot].map((child, n) => (
                      <PartView key={n} part={child} />
                    ))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Small errors in every measured turn bend a robot's map; recognising the start ties its two ends, and every joint takes back a share."
      method={
        <>
          <p>
            A robot that maps as it drives places each pose from the one before, so every small error in a measured
            turn bends the rest of the map and the drift grows with distance. Coming back to a place it has mapped and
            recognising it gives one more measurement: where that old place is from here. Once it is checked, it ties
            the end of the map to its start, and the back end spreads the loop&apos;s error along the whole chain
            instead of dumping it on the last pose, as monocular ORB-SLAM does with similarity alignment and Essential
            Graph optimization. This works because smoothing keeps the past poses in the graph, free to move. A revisit
            can reduce drift and in some cases correct it; it does not promise to remove all of it.
          </p>
          <p id={drawingId}>
            The drawing is a chain-map table. A printed floor plan shows a corridor round a block of rooms, with a ring
            at every place the robot truly stopped. On it lies a jointed chain, the robot&apos;s map of its lap: a
            steel link for every {LEG_M} m leg it drove, a pin on a glide puck for every pose it remembered, and a
            torsion spring at every pin, its legs on posts on the two links, holding the turn it measured. The first
            link is clamped to the start post. The last carries a small rover whose camera looks ahead at a ranging
            pole beside the start, and the lit bar on its front is that view, one leg straight ahead, ending in a square
            socket that fits the post&apos;s square spigot one way only. Closing the loop seats it, and every spring
            gives by its share.
          </p>
          <p>
            Illustrative: a loop of {DRIVEN_LEGS + 1} legs of {LEG_M} m round a block, and every measured turn short by
            between 0.2 and 1.8 times the drift set, more on the early legs, averaging it. Each joint&apos;s share is the
            smallest set of corrections, weighted alike, that puts the socket on the post facing the right way, solved
            by repeated linearisation as a pose-graph back end does. The springs are all alike, so they cannot tell
            which turns were worse, and a little error stays.
          </p>
        </>
      }
      source="Cadena and colleagues (2016); Mur-Artal, Montiel and Tardós, ORB-SLAM (2015); Dellaert and Kaess (2006)."
    />
  );
}
