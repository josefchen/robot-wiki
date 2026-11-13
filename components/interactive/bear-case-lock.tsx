'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { INSTRUMENT_TOGGLE_CLASS, InstrumentFigure } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  HEIGHT,
  PARTS,
  PREMISES,
  TURN,
  WIDTH,
  liftFor,
  movingAt,
  opens,
  statusOf,
  type Part,
  type PremiseId,
} from '@/components/iso/figures/bear-lock';

/**
 * BearCaseLock: what would prove the bears wrong, for the frontier
 * bear-case module, drawn as a pin-tumbler lock cut open in front of its
 * pins (components/iso/figures/bear-lock.ts).
 *
 * The bear case rests on four premises, and the article names one result
 * that would break each. One pin stack per premise: a result not yet shown
 * leaves its key pin standing above the shear line, partial evidence leaves
 * it closer, and the result itself sets it on the line. The plug, the one
 * lit part, turns only when all four sit on the line. Each pin starts where
 * the bear-case watchlist's November 2026 call puts it; the toggles suppose a
 * result arrives. Nothing moves until a toggle is pressed; reduced motion
 * jumps to the end state.
 */

export type Supposed = Record<PremiseId, boolean>;
export const NONE_SUPPOSED: Supposed = { commercial: false, generalization: false, 'form-factor': false, plateau: false };

/** The settled pose for a set of supposed results: each pin's lift, and the plug's turn. */
export function poseFor(supposed: Supposed) {
  const lifts = PREMISES.map((premise) => liftFor(premise.id, supposed[premise.id]));
  return { lifts, turn: opens(lifts) ? TURN : 0 };
}

const countSupposed = (supposed: Supposed) => PREMISES.filter((premise) => supposed[premise.id]).length;
/** Pins the watchlist calls partial and the reader has not supposed. */
const countPartial = (supposed: Supposed) => PREMISES.filter((premise) => !supposed[premise.id] && statusOf(premise.id) === 'partial').length;

/** The readout, in words: what is supposed, and whether the lock holds. */
export function readoutFor(supposed: Supposed, turn: number) {
  const count = countSupposed(supposed);
  if (count === 0) {
    const partial = countPartial(supposed);
    return `None of 4 shown yet${partial ? `, ${partial} partly` : ''} · locked`;
  }
  if (count < PREMISES.length) return `Supposing ${count} of 4 · still locked`;
  return turn >= TURN - 1e-3 ? 'All 4 supposed · the plug turns' : 'All 4 supposed · pins reach the line';
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <Line d={part.inner} tone="faint" /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  if (part.fill === 'top') return <path className="iso-top" d={part.d} />;
  return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
}

const r2 = (value: number) => Number(value.toFixed(2));
/** How fast a pin and the plug follow their targets (seconds). */
const PIN_TAU = 0.11;
const TURN_TAU = 0.16;
const follow = (from: number, to: number, dt: number, tau: number) => {
  const next = from + (to - from) * (1 - Math.exp(-dt / tau));
  return Math.abs(to - next) < 0.004 ? to : next;
};

export function BearCaseLock({ className }: { className?: string }) {
  const groupLabel = useId();
  const drawingId = `${useId()}-drawing`;
  const [supposed, setSupposed] = useState<Supposed>(NONE_SUPPOSED);
  const [pose, setPose] = useState(() => poseFor(NONE_SUPPOSED));
  const current = useRef(pose);
  const target = useMemo(() => poseFor(supposed), [supposed]);

  // Move the pins and the plug toward the supposed state: the pins move only while the plug is home, and the plug turns only once every pin is on the line.
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const { lifts, turn } = current.current;
      const home = turn === 0;
      const nextLifts = home ? lifts.map((lift, index) => follow(lift, target.lifts[index]!, dt, PIN_TAU)) : lifts;
      const turnTo = target.turn > 0 && opens(nextLifts) ? target.turn : 0;
      const nextTurn = follow(turn, turnTo, dt, TURN_TAU);
      const next = { lifts: nextLifts, turn: nextTurn };
      current.current = next;
      setPose(next);
      const settled = nextTurn === target.turn && nextLifts.every((lift, index) => lift === target.lifts[index]);
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const moving = useMemo(() => movingAt(pose.lifts, pose.turn), [pose]);
  const onLine = pose.lifts.filter((lift) => lift === 0).length;
  const turned = pose.turn >= TURN - 1e-3;

  return (
    <InstrumentFigure
      figureId="bear-case-lock"
      className={className}
      kicker="What would prove the bears wrong"
      heading="Four results would overturn robotics skepticism"
      controls={
        <div role="group" aria-labelledby={groupLabel} data-preset-group="" className="grid justify-items-start gap-1">
          <span id={groupLabel} className="font-sans text-[13px] text-text-dim">
            Suppose this result arrives
          </span>
          <div data-brand-control-id="control:segmented" data-brand-surface-id="surface:flat" className="figure-tab-row inline-flex max-w-full flex-wrap">
            {PREMISES.map((premise) => (
              <button
                key={premise.id}
                type="button"
                data-brand-control-id="control:selection"
                data-pagefind-ignore
                aria-pressed={supposed[premise.id]}
                onClick={() => {
                  const next = { ...supposed, [premise.id]: !supposed[premise.id] };
                  // Reduced motion jumps straight to the new state instead of moving the pins and the plug.
                  if (typeof window.matchMedia === 'function' && asksForStillness()) {
                    current.current = poseFor(next);
                    setPose(current.current);
                  }
                  setSupposed(next);
                }}
                data-testid={`bear-lock-${premise.id}`}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {premise.label}
              </button>
            ))}
          </div>
        </div>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="The plug turns only when all four pins sit on the lit line"
          readout={readoutFor(supposed, pose.turn)}
          status="Watchlist status; heights illustrative"
          data-testid="bear-lock-stage-frame"
        >
          <div
            data-testid="bear-lock-drawing"
            data-lifts={pose.lifts.map(r2).join(',')}
            data-turn={r2((pose.turn * 180) / Math.PI)}
            data-on-line={onLine}
            data-open={turned ? 'true' : 'false'}
          >
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              label={`A pin-tumbler lock cut open in front of its four pin stacks, one per premise of the bear case. ${onLine} of 4 pins sit on the shear line; the plug ${turned ? 'has turned and the bolt is drawn back' : 'is held and the bolt stays in its keeper'}.`}
              describedBy={drawingId}
            >
              {PARTS.map((part, index) => {
                if (part.kind !== 'slot') return <PartView key={index} part={part} />;
                return (
                  <g key={part.slot} data-part={part.slot}>
                    {moving[part.slot].map((child, n) => (child.kind === 'slot' ? null : <PartView key={n} part={child} />))}
                  </g>
                );
              })}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="Each result answers one doubt, and all four must arrive to overturn skepticism; none had by November 2026."
      method={
        <>
          <p>
            Each pin starts at the watchlist&apos;s November 2026 call: not met for the deployment and the cost
            analysis, partial for the unseen homes and the scaling law.
          </p>
          <p id={drawingId}>
            The drawing is a pin-tumbler lock cut open in front of its pins, one stack per premise. The plug turns
            only when every pin split sits on the lit shear line.
          </p>
        </>
      }
      source="Results from the article's final section; status calls from the bear-case watchlist (November 2026)."
    />
  );
}
