'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { INSTRUMENT_SECONDARY_CONTROL_CLASS, InstrumentFigure, PresetGroup } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { HEIGHT, PARTS, WIDTH, movingAt, type LivePart, type Slot } from '@/components/iso/figures/cam-follower-bench';
import {
  MODES,
  STILL_MODE,
  inHole,
  pegAt,
  readoutFor,
  runAt,
  runSeconds,
  settledPose,
  switchAt,
  switchSeconds,
  type ModeId,
  type Pose,
} from '@/lib/noise-or-edit';

/**
 * NoiseOrEdit: why RL that only steers a frozen policy's noise is capped by
 * what the policy already makes, and how a small edit on its action gets
 * past that, for the RL fine-tuning article, drawn as a cam-and-follower
 * bench (components/iso/figures/cam-follower-bench.ts).
 *
 * The frozen cam is the base policy, the dial its noise, the follower's place
 * its action; the darker strip on the fixture plate is every place the cam
 * can put the peg, the one lit part, and the hole the task needs lies just
 * past it (lib/noise-or-edit.ts). "Noise only" (DSRL) settles on the best
 * dial setting and still drops the peg short; "Noise and an edit" (EXPO)
 * adds a short turn of the micrometer and drops it in. "Run the search"
 * turns the dial once round, so the reader sees every noise land on the
 * strip. Reduced motion jumps to each result.
 */

function PartView({ part }: { part: LivePart }): ReactNode {
  if (part.kind === 'solid') {
    return <Solid paths={part.paths} tone={part.tone} lit={part.lit} crease={part.crease} inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined} />;
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.fill === 'paper') return <path className="iso-fill" d={part.d} />;
  if (part.fill === 'top') return <path className="iso-top" d={part.d} />;
  return <path className="iso-shade" data-shade={part.fill} d={part.d} />;
}

/** The static drawing between the live slots, built once. */
const RUNS: Array<{ slot: Slot } | { parts: ReactNode }> = (() => {
  const runs: Array<{ slot: Slot } | { parts: ReactNode }> = [];
  let current: ReactNode[] = [];
  PARTS.forEach((part, index) => {
    if (part.kind === 'slot') {
      runs.push({ parts: <g key={`static-${index}`}>{current}</g> });
      runs.push({ slot: part.slot });
      current = [];
      return;
    }
    current.push(<PartView key={index} part={part} />);
  });
  runs.push({ parts: <g key="static-end">{current}</g> });
  return runs;
})();

const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();
const r2 = (value: number) => Number(value.toFixed(2));

type Motion = { kind: 'run' | 'switch'; mode: ModeId; from: Pose; start: number } | null;

export function NoiseOrEdit({ className }: { className?: string }) {
  const drawingId = `${useId()}-drawing`;
  const [mode, setMode] = useState<ModeId>(STILL_MODE);
  const [pose, setPose] = useState<Pose>(settledPose(STILL_MODE));
  const [motion, setMotion] = useState<Motion>(null);
  const poseRef = useRef(pose);

  // Play a run or a switch on requestAnimationFrame, from the pose it started at.
  useEffect(() => {
    if (!motion) return;
    let frame = 0;
    const length = motion.kind === 'run' ? runSeconds(motion.mode) : switchSeconds;
    const tick = (now: number) => {
      const t = Math.max(0, (now - motion.start) / 1000);
      const next = motion.kind === 'run' ? runAt(motion.mode, t, motion.from) : switchAt(motion.mode, t, motion.from);
      poseRef.current = next;
      setPose(next);
      if (t < length) frame = requestAnimationFrame(tick);
      else setMotion(null);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion]);

  const jumpTo = (next: ModeId) => {
    poseRef.current = settledPose(next);
    setPose(poseRef.current);
    setMotion(null);
  };

  const choose = (next: ModeId) => {
    setMode(next);
    // Reduced motion jumps straight to the new result.
    if (calm()) jumpTo(next);
    else setMotion({ kind: 'switch', mode: next, from: poseRef.current, start: performance.now() });
  };

  const running = motion?.kind === 'run';
  const slots = useMemo<Record<Slot, ReactNode>>(() => {
    const live = movingAt({ ...pose, locked: mode === 'noise' && pose.edit < 0.05 });
    const group = (slot: Slot) => (
      <g key={slot} data-part={slot}>
        {live[slot].map((part, n) => (
          <PartView key={n} part={part} />
        ))}
      </g>
    );
    return { cam: group('cam'), 'dial-pulley': group('dial-pulley'), dial: group('dial'), follower: group('follower'), head: group('head'), peg: group('peg') };
  }, [pose, mode]);

  const x = pegAt(pose.deg, pose.edit);
  const settled = pose.phase === 'done';
  const landed = settled ? (inHole(x) ? 'in' : 'short') : 'moving';

  return (
    <InstrumentFigure
      figureId="noise-or-edit"
      className={className}
      kicker="Frozen base policy"
      heading="Steering the noise finds only actions the policy already makes"
      controls={
        <>
          <PresetGroup<ModeId> label="What RL may change" presets={MODES} value={mode} onChange={choose} testId="noise-or-edit" />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            onClick={() => {
              if (running) {
                // Stop where the run is: the bench settles on its result.
                jumpTo(mode);
                return;
              }
              // Reduced motion jumps to the run's result instead of playing it.
              if (calm()) jumpTo(mode);
              else setMotion({ kind: 'run', mode, from: poseRef.current, start: performance.now() });
            }}
            data-testid="noise-or-edit-run"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {running ? 'Stop the search' : 'Run the search'}
          </button>
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Dark strip: every place the frozen cam can put the peg"
          readout={readoutFor(mode, pose)}
          status="Schematic: an illustrative cam, hole and edit; nothing is measured"
          data-testid="noise-or-edit-stage-frame"
        >
          <div data-testid="noise-or-edit-drawing" data-mode={mode} data-deg={r2(pose.deg % 360)} data-edit={r2(pose.edit)} data-drop={r2(pose.drop)} data-phase={pose.phase} data-landed={landed}>
            <IsoFigure
              width={WIDTH}
              height={HEIGHT}
              describedBy={drawingId}
              label={`A frozen pear-shaped cam, turned by a dial, pushes a follower and a slide that carries a lit peg over a fixture plate. A darker strip on the plate marks every place the cam can put the peg; the hole lies just past it. ${
                landed === 'in'
                  ? 'With the micrometer edit added, the peg has dropped into the hole.'
                  : landed === 'short'
                    ? 'With the noise steered as well as it can be and the edit locked, the peg has dropped onto the strip, short of the hole.'
                    : 'The bench is moving.'
              }`}
            >
              {RUNS.map((run) => ('slot' in run ? slots[run.slot] : run.parts))}
            </IsoFigure>
          </div>
        </AnatomyStage>
      }
      caption="DSRL steers a frozen policy's noise, so it reaches only actions the policy already makes. EXPO adds a small edit that can step past them."
      method={
        <>
          <p>
            A diffusion or flow policy turns a noise sample into an action. DSRL keeps the pretrained policy frozen
            and runs RL over that noise. Dong and Finn give the cost: whatever noise is chosen, the result is still
            an action the model already knows how to produce, so a skill the model never learned cannot be found
            that way. EXPO instead pairs the base policy with a lightweight edit policy that shifts actions toward
            higher value, keeping each edit small, and the base keeps training on the edited actions that worked.
          </p>
          <p id={drawingId}>
            The drawing is that difference on a cam bench. The frozen cam is the base policy and the dial on the
            stand at the front, belted to the camshaft, is its noise. The follower rides the cam and pushes the
            slide, so the follower&apos;s place is the action: whatever the dial reads, the lit peg lands on the
            darker strip in the fixture plate, between the cam&apos;s lowest and highest lift. The hole the task
            needs is just past the strip. With the micrometer locked (noise only), the best the search can do is
            turn the cam&apos;s nose to the follower, and the peg still drops short. With the edit free, the same
            setting plus a small turn of the micrometer moves the peg past the strip and into the hole.
          </p>
          <p>
            Schematic: one action, an illustrative cam, hole and edit, and no number is measured. In Dong and
            colleagues&apos; comparison on six real tasks, EXPO-FT reached 30 of 30 trials on average, where DSRL
            averaged 19 of 30.
          </p>
        </>
      }
      source="Wagenmaker and colleagues, DSRL (2025); Dong and colleagues, EXPO (2025) and EXPO-FT (2026); Dong and Finn (2026)."
    />
  );
}
