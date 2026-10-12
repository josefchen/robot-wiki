'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import {
  FRAME,
  HEIGHT,
  PARTS,
  WIDTH,
  cableOf,
  cardMatrix,
  leverParts,
  leverCss,
  meterArc,
  needleOf,
  plugParts,
  plugTransform,
  scaleOf,
  screenMatrix,
  type Command,
  type Panel,
  type Part,
} from '@/components/iso/figures/twin-screen-console';
import {
  ACTIONS,
  INITIAL_STATE,
  REALISM_SCORE,
  ROLLOUT_STEPS,
  SENSITIVITY_THRESHOLD,
  actionSensitivity,
  rollout,
  type ActionId,
  type Conditioning,
  type SceneState,
} from '@/lib/action-conditioning';

/**
 * One start frame splits into two imagined futures, one per command, drawn
 * as a twin-screen video console. Each screen is fed by its own command
 * box, a shift lever in a gate cabled to a jack under the screen. A video
 * model that listens to the action is the console with both plugs seated:
 * each screen plays the future its command causes. One that ignores the
 * action is the console with the plugs pulled: both screens play the same
 * likely future. Two meters between the screens read the scores: action
 * sensitivity swings below its threshold mark when the plugs are out, and
 * realism reads 0.91 either way, because both draw equally sharp video. The
 * futures are hand-set in lib/action-conditioning.ts; every screen frame
 * comes from `rollout`. "Play the futures" replays the imagined frames one
 * at a time and is the only motion besides the eased levers, plugs and
 * needles; reduced motion keeps the still frames.
 */
type ActionConditioningProps = {
  /** First command. Default 'push-left'. */
  defaultActionA?: ActionId;
  /** Second command. Default 'lift'. */
  defaultActionB?: ActionId;
  /** Initial video model. Default 'strong' (listens to the action). */
  defaultConditioning?: Conditioning;
  className?: string;
};

/** Frame-local geometry, in the frame's own units (150 by 80): the table, the block and the gripper's reach. */
const SLAB_Y = 58;
const SLAB = 4;
const BLOCK = 22;
const MARGIN = 6;
const SPAN = FRAME.w - 2 * MARGIN - BLOCK;
const RISE = 26;
const FINGER = 11;
const PALM = 4;
const GOAL = { from: 0.04, to: 0.26 };

const blockLeft = (blockX: number) => MARGIN + blockX * SPAN;
const GRIPPER_X = blockLeft(INITIAL_STATE.blockX) + BLOCK / 2;
const tipY = (gripperY: number) => SLAB_Y - BLOCK - 2 - gripperY * RISE;

/** Sensitivity meter: full scale 0.6, so the 0.30 threshold sits at the top of its arc. */
const SENSITIVITY_FULL_SCALE = 0.6;
/** Seconds per imagined frame while the futures play. */
const FRAME_S = 0.7;

const MODEL_LABEL: Record<Conditioning, string> = {
  strong: 'Listens to the action',
  weak: 'Ignores the action',
};

function actionLabel(id: ActionId): string {
  return ACTIONS.find((a) => a.id === id)?.label ?? id;
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();
const box = (x: number, y: number, w: number, h: number) => `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
const SCALE_FREE = { vectorEffect: 'non-scaling-stroke' } as const;

/** The table in the frame, the goal zone on its left end and the glass behind them: scenery, not data. */
function FrameScenery() {
  const goalX = blockLeft(GOAL.from);
  const goalW = blockLeft(GOAL.to) + BLOCK - goalX;
  const goalH = BLOCK + 6;
  return (
    <g data-scene-structure="frame">
      <path className="iso-shade" data-shade="3" d={box(0, 0, FRAME.w, FRAME.h)} />
      <path data-part="goal" className="iso-shade" data-shade="1" d={box(goalX, SLAB_Y - goalH, goalW, goalH)} />
      <path className="iso-line" data-tone="faint" d={box(goalX, SLAB_Y - goalH, goalW, goalH)} />
      <path className="iso-top" d={box(MARGIN, SLAB_Y, FRAME.w - 2 * MARGIN, SLAB)} />
      <path className="iso-line" data-tone="lo" d={`${box(MARGIN, SLAB_Y, FRAME.w - 2 * MARGIN, SLAB)}M${MARGIN + 14} ${SLAB_Y + SLAB}V${FRAME.h}M${FRAME.w - MARGIN - 14} ${SLAB_Y + SLAB}V${FRAME.h}`} />
    </g>
  );
}

/** A two-finger gripper on a stem that reaches down from the frame's top edge: palm and fingers as closed outlines. */
function Gripper({ gripperY, ghost = false }: { gripperY: number; ghost?: boolean }) {
  const tip = tipY(gripperY);
  const palmY = tip - FINGER - PALM;
  const reach = BLOCK / 2 + 4;
  const finger = 2.4;
  return (
    <path
      data-part={ghost ? 'gripper-earlier' : 'gripper'}
      className="iso-line"
      data-tone={ghost ? 'faint' : 'hi'}
      d={`${ghost ? '' : `M${f(GRIPPER_X)} 0V${f(palmY)}`}${box(GRIPPER_X - reach, palmY, 2 * reach, PALM)}${box(GRIPPER_X - reach, palmY + PALM, finger, FINGER)}${box(GRIPPER_X + reach - finger, palmY + PALM, finger, FINGER)}`}
    />
  );
}

/** A block on the table: the last imagined frame solid and lit, earlier frames faint outlines. */
function Block({ state, final, testId }: { state: SceneState; final: boolean; testId?: string }) {
  return (
    <rect
      data-testid={testId}
      data-part={final ? 'block' : 'block-earlier'}
      x={f(blockLeft(state.blockX))}
      y={SLAB_Y - BLOCK}
      width={BLOCK}
      height={BLOCK}
      style={{
        ...SCALE_FREE,
        fill: final ? 'var(--anatomy-face)' : 'none',
        stroke: final ? 'var(--anatomy-lit)' : 'var(--anatomy-lo)',
        strokeWidth: final ? 1.1 : 0.6,
      }}
    />
  );
}

/** One screen's picture: every imagined frame up to `shown`, earlier ones faint, the last one solid. */
function Future({ panel, frames, shown }: { panel: 'a' | 'b'; frames: SceneState[]; shown: number }) {
  const last = Math.max(0, Math.min(ROLLOUT_STEPS, shown));
  return (
    <>
      <FrameScenery />
      {frames.slice(0, last).map((state, k) => (
        <Gripper key={`g${k}`} gripperY={state.gripperY} ghost />
      ))}
      {frames.slice(0, last + 1).map((state, k) => (
        <Block key={k} state={state} final={k === last} testId={k === 0 ? undefined : `block-${panel}-${k}`} />
      ))}
      <Gripper gripperY={frames[last]!.gripperY} />
    </>
  );
}

function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <Line d={part.inner} tone={part.innerTone ?? 'faint'} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  if (part.kind === 'dots') return <Dots points={part.points} size={part.size} tone={part.tone} />;
  if (part.kind === 'fill') {
    if (part.shade === 'paper') return <path className="iso-fill" d={part.d} />;
    if (part.shade === 'top') return <path className="iso-top" d={part.d} />;
    return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  }
  return null;
}

/** The note under the console: what the reader should take from the two futures. */
function noteLines(sameAction: boolean, diverged: boolean): readonly [string, string] {
  if (sameAction) return ['Same command twice:', 'the same future, by definition'];
  return diverged
    ? ['Two commands, two different futures:', 'the model is listening']
    : ['Same future for both commands:', 'the model ignored the robot'];
}

const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && asksForStillness();
const PLUG_SECONDS = 0.45;

export function ActionConditioning({
  defaultActionA = 'push-left',
  defaultActionB = 'lift',
  defaultConditioning = 'strong',
  className,
}: ActionConditioningProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const clip = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const [actionA, setActionA] = useState<ActionId>(defaultActionA);
  const [actionB, setActionB] = useState<ActionId>(defaultActionB);
  const [conditioning, setConditioning] = useState<Conditioning>(defaultConditioning);
  // While the futures play, the frame each screen has reached; null when both show every frame.
  const [playing, setPlaying] = useState<number | null>(null);

  const framesA = rollout({ action: actionA, conditioning });
  const framesB = rollout({ action: actionB, conditioning });
  const sensitivity = actionSensitivity({ actionA, actionB, conditioning });
  const sameAction = actionA === actionB;
  const diverged = sensitivity > SENSITIVITY_THRESHOLD;
  const nameA = actionLabel(actionA);
  const nameB = actionLabel(actionB);
  const model = MODEL_LABEL[conditioning].toLowerCase();
  const score = sensitivity.toFixed(3);
  const threshold = SENSITIVITY_THRESHOLD.toFixed(2);
  const realism = REALISM_SCORE.toFixed(2);
  const plugged = conditioning === 'strong';
  const note = noteLines(sameAction, diverged);

  const description = sameAction
    ? `Both commands are ${nameA.toLowerCase()}, so the two imagined futures are the same by definition: action sensitivity is ${score} against the ${threshold} threshold, and visual realism stays ${realism} for both models.`
    : `With a model that ${model}, ${nameA.toLowerCase()} and ${nameB.toLowerCase()} lead to ${diverged ? 'different futures' : 'nearly the same future'} across ${ROLLOUT_STEPS} imagined frames: action sensitivity is ${score}, ${diverged ? 'above' : 'below'} the ${threshold} threshold, while visual realism stays ${realism} for both models.`;

  // The plugs and the sensitivity needle ease to the chosen model; the loop writes them through refs.
  const plugRefs = useRef<Record<Panel, SVGGElement | null>>({ a: null, b: null });
  const cableRefs = useRef<Record<Panel, SVGGElement | null>>({ a: null, b: null });
  const needleRef = useRef<SVGPathElement>(null);
  const shown = useRef({ out: plugged ? 0 : 1, needle: sensitivity / SENSITIVITY_FULL_SCALE });
  const target = { out: plugged ? 0 : 1, needle: Math.min(1, sensitivity / SENSITIVITY_FULL_SCALE) };

  useEffect(() => {
    const still = calm();
    // The loop restarts whenever the model or the score changes, so its goal is fixed for this run.
    const goal = { out: plugged ? 0 : 1, needle: Math.min(1, sensitivity / SENSITIVITY_FULL_SCALE) };
    let frame = 0;
    let last = performance.now();
    const draw = () => {
      const s = shown.current;
      for (const panel of ['a', 'b'] as const) {
        plugRefs.current[panel]?.setAttribute('transform', plugTransform(s.out));
        const wire = cableRefs.current[panel];
        if (wire) {
          const c = cableOf(panel, s.out);
          const points = [c.from, ...c.via, c.to];
          wire.querySelector('path')?.setAttribute('d', `M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`);
          const ends = wire.querySelectorAll('circle');
          ends[0]?.setAttribute('cx', f(c.from[0]));
          ends[0]?.setAttribute('cy', f(c.from[1]));
        }
      }
      needleRef.current?.setAttribute('d', needleOf('sensitivity', s.needle));
    };
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(now - last, 64)) / 1000;
      last = now;
      const s = shown.current;
      const ease = (value: number, to: number) => (still || Math.abs(to - value) < 0.002 ? to : value + (to - value) * (1 - Math.exp(-dt / PLUG_SECONDS)));
      s.out = ease(s.out, goal.out);
      s.needle = ease(s.needle, goal.needle);
      draw();
      frame = s.out === goal.out && s.needle === goal.needle ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [plugged, sensitivity]);

  // "Play the futures": the levers go to their commands and each screen plays its imagined frames one by one.
  useEffect(() => {
    if (playing === null) return;
    // After the last imagined frame the console is back at rest.
    const timer = window.setTimeout(
      () => setPlaying((k) => (k === null || k + 1 > ROLLOUT_STEPS ? null : k + 1)),
      FRAME_S * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [playing]);

  function play() {
    if (playing !== null) {
      setPlaying(null);
      return;
    }
    if (calm()) return;
    setPlaying(0);
  }

  function reset() {
    setPlaying(null);
    setActionA(defaultActionA);
    setActionB(defaultActionB);
    setConditioning(defaultConditioning);
  }

  const frameShown = playing ?? ROLLOUT_STEPS;
  const leverCommand = (command: Command) => (playing === 0 ? 'neutral' : command);
  const readout =
    playing === null
      ? `action sensitivity ${score} · realism ${realism}`
      : playing === 0
        ? `start frame · realism ${realism}`
        : `imagined frame ${Math.min(ROLLOUT_STEPS, playing)} of ${ROLLOUT_STEPS} · realism ${realism}`;
  const sensitivityScale = scaleOf('sensitivity', SENSITIVITY_THRESHOLD / SENSITIVITY_FULL_SCALE);
  const realismScale = scaleOf('realism', 0.5);
  const restPlug = plugTransform(plugged ? 0 : 1);
  const leverStyle = { transitionProperty: 'transform', transitionDuration: 'var(--motion-beat-short)', transitionTimingFunction: 'var(--motion-ease-smooth)' } as const;

  const cable = (panel: Panel) => {
    const c = cableOf(panel, plugged ? 0 : 1);
    const points = [c.from, ...c.via, c.to];
    return (
      <g key={`cable-${panel}`} ref={(el) => void (cableRefs.current[panel] = el)} className="iso-wire" data-tone="lo">
        <path className="iso-line" data-tone="lo" d={`M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`} />
        <circle className="iso-wire-end" cx={f(c.from[0])} cy={f(c.from[1])} r={1.2} />
        <circle className="iso-wire-end" cx={f(c.to[0])} cy={f(c.to[1])} r={1.2} />
      </g>
    );
  };

  const slot = (id: Extract<Part, { kind: 'slot' }>['id']) => {
    if (id === 'screen-a' || id === 'screen-b') {
      const panel = id === 'screen-a' ? 'a' : 'b';
      const frames = panel === 'a' ? framesA : framesB;
      const command = panel === 'a' ? actionA : actionB;
      return (
        <g key={id} data-testid={`screen-${panel}`} data-command={command} transform={screenMatrix(panel)}>
          <defs>
            <clipPath id={`${clip}-${panel}`}>
              <path d={box(0, 0, FRAME.w, FRAME.h)} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip}-${panel})`}>
            <Future panel={panel} frames={frames} shown={frameShown} />
          </g>
        </g>
      );
    }
    if (id === 'start-card') {
      return (
        <g key={id} data-testid="initial-frame" data-frame="now" transform={cardMatrix}>
          <defs>
            <clipPath id={`${clip}-card`}>
              <path d={box(0, 0, FRAME.w, FRAME.h)} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip}-card)`}>
            <FrameScenery />
            <Block state={INITIAL_STATE} final={false} />
            <Gripper gripperY={INITIAL_STATE.gripperY} />
          </g>
          <path className="iso-line" data-tone="lo" d={box(0, 0, FRAME.w, FRAME.h)} />
        </g>
      );
    }
    if (id === 'meters') {
      return (
        <g key={id} data-testid="score-meters" data-sensitivity={score} data-realism={realism}>
          <path className="iso-line" data-tone="faint" d={meterArc('sensitivity')} />
          <path className="iso-line" data-tone="lo" d={sensitivityScale.minor} />
          <path className="iso-line" data-tone="hi" d={sensitivityScale.major} />
          <path ref={needleRef} className="iso-line" data-tone="hi" data-free="end" d={needleOf('sensitivity', target.needle)} />
          <path className="iso-line" data-tone="faint" d={meterArc('realism')} />
          <path className="iso-line" data-tone="lo" d={realismScale.minor} />
          <path className="iso-line" data-tone="mid" d={realismScale.major} />
          <path className="iso-line" data-tone="hi" data-free="end" d={needleOf('realism', REALISM_SCORE)} />
        </g>
      );
    }
    if (id === 'plug-a' || id === 'plug-b') {
      const panel = id === 'plug-a' ? 'a' : 'b';
      return (
        <g key={id}>
          {cable(panel)}
          <g ref={(el) => void (plugRefs.current[panel] = el)} transform={restPlug} data-testid={`plug-${panel}`} data-seated={plugged ? '' : undefined}>
            {plugParts(panel).map((part, k) => (
              <PartView key={k} part={part as Exclude<Part, { kind: 'slot' }>} />
            ))}
          </g>
        </g>
      );
    }
    const panel = id === 'lever-a' ? 'a' : 'b';
    const command = panel === 'a' ? actionA : actionB;
    return (
      <g key={id} data-testid={`lever-${panel}`} data-command={command} style={{ ...leverStyle, transform: leverCss(leverCommand(command)) }} className="motion-reduce:transition-none">
        {leverParts(panel).map((part, k) => (
          <PartView key={k} part={part as Exclude<Part, { kind: 'slot' }>} />
        ))}
      </g>
    );
  };

  const stage = (
    <AnatomyStage
      viewWidth={WIDTH}
      // The drawing holds no words, so the screens are named here, under it.
      hint={
        <>
          <span data-testid="rollout-panel-a" data-command={actionA}>
            Left screen: {nameA.toLowerCase()}
          </span>
          {'; '}
          <span data-testid="rollout-panel-b" data-command={actionB}>
            right screen: {nameB.toLowerCase()}
          </span>
          {'. '}
          <span data-testid="action-note">{note.join(' ')}</span>
        </>
      }
      readout={readout}
      status="Illustrative: a toy model, not a trained video model."
      data-testid="action-conditioning-stage"
    >
      <IsoFigure
        width={WIDTH}
        height={HEIGHT}
        label={`A twin-screen video console: one start frame splits into two imagined futures, ${nameA.toLowerCase()} and ${nameB.toLowerCase()}, from a video model that ${model}. Each screen is fed by its own command lever, ${plugged ? 'plugged in' : 'with its plug pulled'}. ${note.join(' ')}.`}
        describedBy={descriptionId}
      >
        {PARTS.map((part, index) => (part.kind === 'slot' ? slot(part.id) : <PartView key={index} part={part} />))}
      </IsoFigure>
    </AnatomyStage>
  );

  return (
    <InstrumentFigure
      figureId="action-conditioning"
      className={className}
      kicker="The action test"
      heading="A good video model shows different futures for different actions"
      controls={
        <>
          <PresetGroup<Conditioning>
            label="Video model"
            presets={[
              { id: 'strong', label: MODEL_LABEL.strong },
              { id: 'weak', label: MODEL_LABEL.weak },
            ]}
            value={conditioning}
            onChange={(next) => {
              setPlaying(null);
              setConditioning(next);
            }}
            testId="video-model"
          />
          <button
            type="button"
            data-brand-control-id="control:secondary-action"
            onClick={play}
            data-testid="play-futures"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            {playing !== null ? 'Stop' : 'Play the futures'}
          </button>
        </>
      }
      adjust={
        <>
          <PresetGroup<ActionId>
            label="First command"
            presets={ACTIONS.map((a) => ({ id: a.id, label: a.label }))}
            value={actionA}
            onChange={(next) => {
              setPlaying(null);
              setActionA(next);
            }}
            testId="command-a"
          />
          <PresetGroup<ActionId>
            label="Second command"
            presets={ACTIONS.map((a) => ({ id: a.id, label: a.label }))}
            value={actionB}
            onChange={(next) => {
              setPlaying(null);
              setActionB(next);
            }}
            testId="command-b"
          />
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={stage}
      caption="AI video can look realistic yet ignore what the robot does; for planning, the imagined future must change when the action changes."
      method={
        <>
          <p>
            The photo standing on top of the console is the shared start: a block on a table, a gripper above
            it and a goal zone on the left. Each screen plays what a video model imagines after one command,
            with the {ROLLOUT_STEPS} imagined frames drawn on top of each other, earlier ones faint. The command
            comes from the lever on the desk in front of the screen: left for push left, right for push right,
            back for lift. A model that listens is the console with both plugs seated, so it slides the block
            for a push and raises the gripper for a lift. A model that ignores the action is the console with the
            plugs pulled: it imagines the block drifting toward the goal for every command, because that is what
            most successful task videos show.
          </p>
          <p>
            What tells the two models apart is action sensitivity, the upper meter between the screens: the
            average distance between the two imagined futures, frame by frame, with block position and gripper
            height each measured from 0 to 1. Above {threshold}, the long mark at the top of its scale, the
            futures genuinely differ. For the current pair it is{' '}
            <span data-testid="sensitivity-readout">{score}</span>. Visual realism, the lower meter, is held at{' '}
            <span data-testid="realism-readout">{realism}</span> for both models on purpose: both draw equally
            sharp video, so realism alone cannot show whether a model follows the action.
          </p>
          <p>
            The futures are hand-set for this toy, not produced by a trained video model, and the plug stands for
            how strongly a model uses the action, not for a real connector.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current pair of imagined futures"
            description={description}
            states={[
              { label: 'video model', value: model },
              { label: 'first command', value: nameA.toLowerCase() },
              { label: 'second command', value: nameB.toLowerCase() },
              { label: 'action sensitivity', value: score },
              { label: 'visual realism', value: realism },
            ]}
          />
        </>
      }
    />
  );
}
