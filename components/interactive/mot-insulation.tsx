'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
} from '@/components/ui/instrument';
import { FigureStage, StageLegend } from '@/components/motion/figure-frame';
import { roleColour } from '@/components/motion/chart';
import { speakWhenSettled } from '@/components/motion/settled-speech';
import { Dots, Solid } from '@/components/iso/react/draw';
import { Stage, asksForStillness, useInView } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { PartView } from '@/components/iso/part-view';
import {
  BACKBONE_HEAD,
  BACKBONE_PLINTH,
  BACKBONE_TRAYS,
  BASE_PARTS,
  EXPERT_HEAD,
  EXPERT_PLINTH,
  EXPERT_TRAYS,
  FAST_HUB,
  FAST_PARTS,
  GAUGE_PARTS,
  HEIGHT,
  LEVELS,
  RIDER_PARTS,
  SCALE_PARTS,
  WIDTH,
  fluidPath,
  leverPaths,
  levelPath,
  motionAt,
  needlePath,
  restPose,
  riderAt,
  sightFluid,
  stepMotion,
  trayFill,
  valveBody,
  type Column,
  type Motion,
  type Part,
} from '@/components/iso/figures/tray-columns';
import {
  KNOWLEDGE_INSULATION_CITATION_ID,
  LAYER_COUNT,
  TRAINING_STEP_SPEEDUP,
  backboneSupervision,
  gradientBarrier,
  languageScore,
  layerStates,
  type Pass,
} from '@/lib/knowledge-insulation';

/**
 * MotInsulation: why Knowledge Insulation walls the language model off
 * from the movement lessons. The stage is a pair of tray columns on one
 * base (components/iso/figures/tray-columns.ts): the wide language-model
 * backbone ("understands words and pictures") and the slim flow-matching
 * action expert ("moves the arm"), joined at every tray by a cross pipe
 * through a one-way check valve. The figure opens on the backward pass
 * with the protection on, so the expert's gradient stands in its own
 * column behind shut valves. The one visible control turns the protection
 * off: the valves pass the gradient into the backbone's trays and the
 * language gauge on its head falls, matching the paper's spoon/trash
 * symptom.
 *
 * "Adjust more" holds the pass-depth slider, the forward/backward buttons,
 * the supervision readout and Reset; nothing auto-plays, and a change of
 * pass, protection or depth runs the fluid tray by tray to the new rest
 * pose. "How this was made" holds the stop-gradient and
 * mixture-of-transformers method, FAST tokens, the 2B/300M sizes, the
 * schematic layer count and the sourced 7.5x training-step figure.
 */
type MotInsulationProps = {
  /** Initial pass depth. Default shows the full stack. */
  defaultStep?: number;
  className?: string;
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

const SUPERVISION_LABEL: Record<string, string> = {
  none: 'no gradients (inference)',
  'fast-cross-entropy': 'FAST-token cross-entropy only',
  'expert-gradient': 'expert flow-matching gradient (uninsulated)',
};

const STAGE_LINK = 'underline-offset-2';

/** The gradient is the one lit fluid; activation reads in the side shade. */
const GRADIENT_FILL = { fill: 'var(--anatomy-lit)', fillOpacity: 0.3 } as const;
const LONGEST_FRAME = 1 / 30;

const still = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();

/** A part list's static art as elements built once (so a render skips them), and each slot by its name. */
type Art = ReactNode | string;
function artOf(parts: readonly Part[]): Art[] {
  return parts.map((part, index) => {
    if (part.kind === 'slot') return part.name;
    if (part.kind === 'face') return <path key={index} className="iso-shade" data-shade={part.shade} d={part.d} />;
    return <PartView key={index} part={part} />;
  });
}
const BASE_ART = artOf(BASE_PARTS);
const BACKBONE_PLINTH_ART = artOf(BACKBONE_PLINTH);
const BACKBONE_TRAY_ART = BACKBONE_TRAYS.map(artOf);
const BACKBONE_HEAD_ART = artOf(BACKBONE_HEAD);
const GAUGE_ART = artOf(GAUGE_PARTS);
const FAST_ART = artOf(FAST_PARTS);
const LEVEL_ART = LEVELS.map((level) => artOf(level.parts));
const EXPERT_PLINTH_ART = artOf(EXPERT_PLINTH);
const EXPERT_TRAY_ART = EXPERT_TRAYS.map(artOf);
const EXPERT_HEAD_ART = artOf(EXPERT_HEAD);
const SCALE_ART = artOf(SCALE_PARTS);
const RIDER_ART = artOf(RIDER_PARTS);

/** Every live element of the drawing, found once per run by its name. */
function liveParts(svg: SVGSVGElement): Map<string, Element> {
  const parts = new Map<string, Element>();
  svg.querySelectorAll('[data-live]').forEach((el) => {
    const { live, column, index, fluid } = (el as SVGElement).dataset;
    parts.set([live, column, index, fluid].filter((value) => value !== undefined).join(':'), el);
  });
  return parts;
}

/** The live parts of one pose, written straight to the drawing without a React render. */
function drawPose(parts: Map<string, Element>, motion: Motion) {
  const { pose } = motion;
  const set = (key: string, name: string, value: string) => parts.get(key)?.setAttribute(name, value);
  for (const column of ['backbone', 'expert'] as const) {
    for (let index = 0; index < LAYER_COUNT; index++) {
      const fill = trayFill(pose, column, index);
      for (const kind of ['activation', 'gradient'] as const) {
        set(`fluid:${column}:${index}:${kind}`, 'd', fluidPath(column, index, fill[kind]));
        set(`level:${column}:${index}:${kind}`, 'd', levelPath(column, index, fill[kind]));
      }
    }
  }
  for (let index = -1; index < LAYER_COUNT; index++) {
    const lever = parts.get(`lever:${index}`);
    if (!lever) continue;
    const paths = index < 0 ? leverPaths(FAST_HUB, pose.fast) : leverPaths(LEVELS[index]!.hub, pose.valves[index]!);
    writeSolid(lever.querySelector<SVGGElement>('[data-live-part-of="arm"] > g'), paths.arm);
    writeSolid(lever.querySelector<SVGGElement>('[data-live-part-of="weight"] > g'), paths.weight);
  }
  set('needle', 'd', needlePath(pose.score));
  set('rider', 'transform', riderAt(motion.rider));
  const sight = sightFluid(pose.fast);
  set('fast-fluid', 'd', sight.fill);
  set('fast-surface', 'd', sight.surface);
}

export function MotInsulation({ defaultStep = LAYER_COUNT, className }: MotInsulationProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [pass, setPass] = useState<Pass>('backward');
  const [stopGradient, setStopGradient] = useState(true);
  const [step, setStep] = useState(defaultStep);

  const states = layerStates(pass, stopGradient, step);
  const score = languageScore(pass, stopGradient, step);
  const barrier = gradientBarrier(pass, stopGradient);
  const supervision = backboneSupervision(pass, stopGradient);
  const citationFor = useCitationLookup();
  const citation = citationFor(KNOWLEDGE_INSULATION_CITATION_ID);

  const corrupted = pass === 'backward' && !stopGradient;
  const actionColour = roleColour('action');

  // The drawing renders the rest pose; the loop eases from what is on screen to it.
  const rest = restPose(pass, stopGradient, step);
  const restMotion = motionAt(pass, rest);
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = useRef<Motion | null>(null);
  const visible = useInView(stageRef);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const target = restPose(pass, stopGradient, step);
    const from = shown.current;
    const parts = liveParts(svg);
    if (!from || !visible || still()) {
      shown.current = motionAt(pass, target);
      drawPose(parts, shown.current);
      return;
    }
    // Paint what was on screen before the browser shows React's rest pose, then run to it.
    drawPose(parts, from);
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, LONGEST_FRAME) : 1 / 60;
      last = now;
      const moving = stepMotion(from, target, pass, dt);
      drawPose(parts, from);
      frame = moving ? requestAnimationFrame(loop) : 0;
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [pass, stopGradient, step, visible]);

  // The stage readout is not itself live; a hidden status region speaks it
  // once it settles after the reader acts, as the anatomy stage does, and
  // stays quiet when the depth slider's value text already says its numbers.
  const readoutRef = useRef<HTMLSpanElement>(null);
  const announcerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const readout = readoutRef.current;
    const status = announcerRef.current;
    if (!readout || !status) return;
    return speakWhenSettled({
      watch: readout,
      scope: readout.closest('[data-figure-frame]') ?? readout,
      status,
      read: () => (readout.textContent ?? '').replace(/\s+/g, ' ').trim(),
    });
  }, []);

  function toggleStopGradient() {
    // The toggle only has meaning in the backward view, so switching it
    // moves the diagram there (the expected interaction path).
    setStopGradient((on) => !on);
    setPass('backward');
  }

  function reset() {
    setPass('backward');
    setStopGradient(true);
    setStep(defaultStep);
  }

  const passDescription =
    pass === 'forward'
      ? `Forward pass at depth ${step} of ${LAYER_COUNT}. Tokens flow up both stacks; the expert attends into backbone activations at each reached layer.`
      : stopGradient
        ? `Backward pass at depth ${step} of ${LAYER_COUNT} with the stop-gradient on. Gradients stay inside the expert; the backbone is supervised by FAST-token cross-entropy.`
        : `Backward pass at depth ${step} of ${LAYER_COUNT} with the stop-gradient off. Expert gradients cross into the backbone at every reached layer and the language-following score drops to ${score}.`;

  // The note that used to sit at the wall now leads the hint under the drawing.
  const note = barrier
    ? "Shut valves stop movement lessons, so they can't overwrite what the model knows"
    : corrupted
      ? 'With the valves open, movement lessons seep into the language side'
      : 'Going forward, the arm side reads what the language side sees';
  const passed = states.filter((s) => s.sidewaysAttention || s.gradientCrosses).length;
  const readout = `${pass} · ${step} of ${LAYER_COUNT} trays · ${barrier ? 'valves shut' : `${passed} valves open`}`;

  /** A geometry module's part list: its static art, built once, with the slots filled from the rest pose. */
  const partsOf = (art: readonly Art[]): ReactNode[] => art.map((node, index) => (typeof node === 'string' ? slotNode(node, index) : node));

  function slotNode(name: string, index: number): ReactNode {
    const fluid = name.match(/^fluid-(backbone|expert)-(\d)$/);
    if (fluid) {
      const column = fluid[1] as Column;
      const tray = Number(fluid[2]);
      const fill = trayFill(rest, column, tray);
      const at = { 'data-column': column, 'data-index': tray };
      return (
        <g key={index}>
          <path {...at} data-live="fluid" data-fluid="activation" className="iso-shade" data-shade={0} d={fluidPath(column, tray, fill.activation)} />
          <path {...at} data-live="level" data-fluid="activation" className="iso-line" data-tone="mid" d={levelPath(column, tray, fill.activation)} />
          <path {...at} data-live="fluid" data-fluid="gradient" data-lit-part="gradient" style={GRADIENT_FILL} d={fluidPath(column, tray, fill.gradient)} />
          <path {...at} data-live="level" data-fluid="gradient" data-lit-part="gradient" className="iso-line" data-tone="lit" d={levelPath(column, tray, fill.gradient)} />
        </g>
      );
    }
    const body = name.match(/^body-(\d)$/);
    if (body) {
      const level = Number(body[1]);
      const lit = pass === 'forward' && rest.valves[level]! > 0;
      return (
        <g key={index} data-lit-part={lit ? 'open-valves' : undefined}>
          <Solid paths={valveBody(level)} tone="hi" lit={lit} />
        </g>
      );
    }
    if (name === 'needle') {
      return <path key={index} data-live="needle" data-testid="language-needle" data-score={score} className="iso-line" data-tone="hi" data-free="" style={{ strokeWidth: 1.1 }} d={needlePath(rest.score)} />;
    }
    if (name === 'fast-lever') return lever(-1, rest.fast, false, index);
    if (name === 'fast-fluid') {
      // The FAST feed carries action tokens, so it shows in the action role's ink.
      const sight = sightFluid(rest.fast);
      return (
        <g key={index}>
          <path data-live="fast-fluid" style={{ fill: actionColour, fillOpacity: 0.16 }} d={sight.fill} />
          <path data-live="fast-surface" className="iso-line" style={{ stroke: actionColour }} d={sight.surface} />
        </g>
      );
    }
    return null;
  }

  /** A check valve's lever and counterweight (index -1 is the FAST feed's), drawn at the rest pose. */
  function lever(level: number, open: number, lit: boolean, key: number | string): ReactNode {
    const hub = level < 0 ? FAST_HUB : LEVELS[level]!.hub;
    const paths = leverPaths(hub, open);
    return (
      <g key={key} data-live="lever" data-index={level} data-lit-part={lit ? 'open-valves' : undefined}>
        <g data-live-part-of="arm">
          <LiveSolid paths={paths.arm} tone="hi" lit={lit} />
        </g>
        <g data-live-part-of="weight">
          <LiveSolid paths={paths.weight} tone="hi" lit={lit} />
        </g>
        <Solid paths={paths.cap} tone="hi" lit={lit} />
        <Dots points={[paths.pin]} size={0.5} tone="hi" />
      </g>
    );
  }

  const tray = (column: Column, index: number, art: readonly Art[]) => {
    const active = column === 'backbone' ? states[index]!.backboneActive : states[index]!.expertActive;
    return (
      <g key={`${column}-${index}`} data-testid={`${column}-layer-${index}`} data-active={active ? 'true' : 'false'}>
        {partsOf(art)}
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="mot-insulation"
      className={className}
      kicker="Knowledge insulation"
      heading="Shield the language brain while teaching the robot to move"
      controls={
        <button
          data-brand-control-id="control:selection"
          data-testid="mot-protect"
          type="button"
          aria-pressed={stopGradient}
          onClick={toggleStopGradient}
          className={INSTRUMENT_TOGGLE_CLASS}
        >
          Protect language skills: {stopGradient ? 'On' : 'Off'}
        </button>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel
              htmlFor="mot-depth"
              value={
                <span data-testid="step-readout">
                  {step} / {LAYER_COUNT}
                </span>
              }
            >
              Pass depth
            </ControlLabel>
            <input
              id="mot-depth"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={LAYER_COUNT}
              step={1}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              aria-label="Pass depth"
              aria-valuetext={`${step} of ${LAYER_COUNT} layers`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <div role="group" aria-label="Select the pass direction" className="flex flex-wrap gap-1">
            {(['forward', 'backward'] as const).map((p) => (
              <button
                data-brand-control-id="control:selection"
                key={p}
                type="button"
                aria-pressed={p === pass}
                onClick={() => setPass(p)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {p} pass
              </button>
            ))}
          </div>
          <InstrumentReadout className="basis-full">
            Backbone supervision:{' '}
            <span data-testid="supervision-readout">{SUPERVISION_LABEL[supervision]}</span>
          </InstrumentReadout>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          data-anatomy-stage=""
          style={{ ['--anatomy-view-width' as string]: `${WIDTH}px` }}
          footer={
            <>
              <span data-anatomy-hint="" className="font-sans text-[12px] leading-normal text-text-dim">
                <span data-figure-annotation="">{note}</span>
              </span>
              <span
                ref={readoutRef}
                data-figure-readout=""
                data-readout=""
                className="ml-auto text-right font-mono text-[12px] leading-normal tabular-nums text-text"
              >
                {readout}
              </span>
              <span ref={announcerRef} role="status" data-anatomy-announcer="" data-pagefind-ignore className="sr-only" />
              <StageLegend className="basis-full text-text-dim" data-testid="mot-legend">
                <span>Wide column: understands words and pictures</span>
                <span>Slim column: moves the arm</span>
              </StageLegend>
              <LanguageMeter score={score} />
            </>
          }
        >
          <div ref={stageRef} className="iso" data-anatomy-drawing="">
            <Stage className="iso-stage">
              <svg
                ref={svgRef}
                className="iso-svg"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="img"
                aria-label={`Mixture-of-Transformers diagram. ${passDescription}`}
                aria-describedby={descriptionId}
                focusable="false"
                data-testid="mot-diagram"
              >
                <g key="base">{partsOf(BASE_ART)}</g>
                <g key="backbone" data-part="backbone">
                  {partsOf(BACKBONE_PLINTH_ART)}
                  {BACKBONE_TRAY_ART.map((art, index) => tray('backbone', index, art))}
                  {partsOf(BACKBONE_HEAD_ART)}
                </g>
                <g key="gauge" data-part="language-gauge">
                  {partsOf(GAUGE_ART)}
                </g>
                <g key="fast" data-part="fast-feed" data-testid={barrier ? 'fast-loss-label' : undefined} data-open={rest.fast > 0 ? 'true' : 'false'}>
                  {partsOf(FAST_ART)}
                </g>
                <g key="valves" data-part="check-valves" data-testid={barrier ? 'gradient-barrier' : undefined}>
                  {LEVEL_ART.map((art, index) => {
                    const s = states[index]!;
                    const testId = s.sidewaysAttention ? `attention-${index}` : s.gradientCrosses ? `gradient-cross-${index}` : undefined;
                    const valve = barrier ? 'shut' : rest.valves[index]! > 0 ? 'open' : 'idle';
                    return (
                      <g key={index} data-testid={testId} data-valve={valve} data-level={index}>
                        {partsOf(art)}
                      </g>
                    );
                  })}
                  {LEVELS.map((_, index) => lever(index, rest.valves[index]!, pass === 'forward' && rest.valves[index]! > 0, `lever-${index}`))}
                </g>
                <g key="expert" data-part="expert">
                  {partsOf(EXPERT_PLINTH_ART)}
                  {EXPERT_TRAY_ART.map((art, index) => tray('expert', index, art))}
                  {partsOf(EXPERT_HEAD_ART)}
                </g>
                <g key="scale" data-part="depth-scale">
                  {partsOf(SCALE_ART)}
                  <g data-live="rider" transform={riderAt(restMotion.rider)}>
                    {partsOf(RIDER_ART)}
                  </g>
                </g>
              </svg>
            </Stage>
          </div>
        </FigureStage>
      }
      caption="Teaching movement can wear away an AI's grasp of language; walling it off keeps that grasp, and training needed 7.5 times fewer steps than π0."
      method={
        <>
          <p>
            The model is a pi0-style vision-language-action model laid out as a mixture of
            transformers: a 2B language-model backbone and a 300M flow-matching action expert.
            The drawing makes each a column of {LAYER_COUNT} trays, a schematic layer count, with
            cross-sections in the ratio of their sizes, and joins them at every tray through a
            one-way check valve. On the forward pass the expert attends sideways into the
            backbone&apos;s activations at every layer, so the valves open. On the backward pass
            the expert&apos;s flow-matching loss sends gradients back down its own stack.
            Knowledge Insulation puts a stop-gradient at the interface (every valve shut), so
            those gradients never reach the backbone; the backbone instead learns actions from
            the cross-entropy loss on discrete FAST action tokens, the feed into its head. Turn
            the protection off and the expert&apos;s gradients cross into the backbone at every
            layer they reach.
          </p>
          <p>
            The 0 to 100 &ldquo;follows instructions&rdquo; score is illustrative: it stands in
            for the paper&apos;s spoon-and-trash example, where a model trained without
            insulation stops following the instruction, and is not a published curve. The
            measured result is separate:{' '}
            <span data-testid="speedup-readout">
              {TRAINING_STEP_SPEEDUP}x fewer training steps
            </span>{' '}
            for the π0.5 + KI generalist than π0, at similar table-bussing performance.
            {citation && (
              <>
                {' '}
                <a
                  data-brand-control-id="control:link-focus"
                  href={citation.url}
                  target="_blank"
                  rel="noopener"
                  className={STAGE_LINK}
                >
                  Source: {citation.label}
                </a>
              </>
            )}
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current MoT pass"
            description={`${pass === 'forward' ? 'Forward' : 'Backward'} pass at depth ${step} of ${LAYER_COUNT} keeps backbone supervision on ${SUPERVISION_LABEL[supervision]}, language following at ${score} of 100, and the separately reported ${TRAINING_STEP_SPEEDUP}x fewer training steps for the π0.5 + KI generalist versus π0 at similar table-bussing performance; the stop-gradient is ${stopGradient ? 'on' : 'off'} so expert gradients ${stopGradient ? 'stay inside the action expert' : 'cross into the backbone'}.`}
            states={[
              { label: 'pass', value: pass },
              { label: 'depth', value: `${step} / ${LAYER_COUNT}` },
              { label: 'stop-gradient', value: stopGradient ? 'on' : 'off' },
              { label: 'supervision', value: SUPERVISION_LABEL[supervision] },
              { label: 'language score', value: `${score} / 100` },
            ]}
          />
        </>
      }
      source={`Schematic with ${LAYER_COUNT} layers per stack; the instruction score is illustrative. Training-step result from the Knowledge Insulation paper.`}
    />
  );
}

// Defined after the figure: the accessible-name baseline seals aria-label
// expressions by their order in this file, and the meter's name follows the
// diagram's.
function LanguageMeter({ score }: { score: number }) {
  return (
    <div className="basis-full">
      <div className="flex items-baseline justify-between gap-2 font-sans text-[13px]">
        <span className="text-text-dim">Follows instructions (illustrative, not measured)</span>
        <span className="whitespace-nowrap tabular-nums text-text">
          <span data-testid="language-score">{score}</span>
          <span className="text-text-dim"> / 100</span>
        </span>
      </div>
      <div
        role="meter"
        data-brand-surface-id="surface:flat"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Language-following score, ${score} of 100`}
        className="mt-1.5 h-[3px] w-full max-w-[340px] overflow-hidden"
      >
        <svg viewBox="0 0 200 3" preserveAspectRatio="none" aria-hidden className="block h-full w-full">
          <rect x={0} y={1} width={200} height={1} fill="var(--line-strong)" />
          <rect
            data-testid="language-meter-fill"
            data-chart-mark="bar"
            data-chart-role="value"
            x={0}
            y={0}
            width={f(score * 2)}
            height={3}
            fill={roleColour('value')}
          />
        </svg>
      </div>
    </div>
  );
}
