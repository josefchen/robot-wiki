'use client';

import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { useInView, useLoop } from '@/components/iso/react/live';
import {
  HEIGHT,
  PARTS,
  SLED_PARTS,
  WIDTH,
  alongTrack,
  cockedStroke,
  headParts,
  knobParts,
  lensGlass,
  mugOffset,
  mugParts,
  mugTransform,
  pictureOf,
  pushTimeline,
  rodBack,
  rodFront,
  scuffAt,
  switchParts,
  type Part,
  type Pose,
  type Push,
  type Script,
} from '@/components/iso/figures/push-bench';
import {
  CONTACT_TIME_S,
  DEFAULT_FORCE_N,
  FRICTION_MU,
  GRAVITY_MS2,
  INITIAL_LAYERS,
  INITIAL_MUG,
  MASS_KG,
  MAX_FORCE_N,
  MIN_FORCE_N,
  TRACK_MAX_M,
  type LayerState,
  type MugState,
  applyPush,
  displacementForForce,
  formatCentimetres,
  formatCm,
  pushTestNote,
  setLayer,
} from '@/lib/appearance-physics-push';

/**
 * The push test, drawn as a push bench. A projector on a post throws the
 * picture of a mug onto a friction plate; a spring plunger on a wheeled sled
 * fires along the plate. The three layers of a simulated scene are three
 * things on the bench: the picture is the projector's light, the shape,
 * weight and friction are the real mug (set on the plate from its stand at
 * the back, its weighted base and felt pad underneath), and the solver is
 * what lets a struck mug move. With only the picture, the plunger shoots
 * straight through the light. With the mug on the plate the same plunger
 * strikes it and it slides by d = v²/2μg along the ruler; the picture stays
 * where the projector throws it. Every number comes from
 * lib/appearance-physics-push.ts; motion starts only from a reader's
 * control, and reduced motion jumps to the result.
 */
type AppearancePhysicsPushProps = {
  /** Initial push strength in newtons. Default 4. */
  defaultForceN?: number;
  className?: string;
};

type Scene = 'picture' | 'physics';

const PHYSICS_LAYERS: LayerState = { appearance: true, physics: true, simulation: true };

/** The slide plays this many times slower than the real one, so the eye can follow it. */
const SLOW = 4;

function newtons(force: number): string {
  return `${force} ${force === 1 ? 'newton' : 'newtons'}`;
}

function sceneOf(layers: LayerState): Scene | null {
  if (layers.appearance && !layers.physics) return 'picture';
  if (layers.appearance && layers.physics && layers.simulation) return 'physics';
  return null;
}

/** The note under the bench: what the reader should see in the current state. */
function noteLines(layers: LayerState, mug: MugState): readonly [string, string] {
  if (!layers.physics) {
    return layers.appearance
      ? ['Pushed, but it is only a picture:', 'no weight or friction, so it stays put']
      : ['No picture and no physics:', 'there is nothing here to push'];
  }
  if (!layers.simulation) return ['Shape, weight and friction are there,', 'but no solver works out the motion'];
  if (mug.effectivePushes === 0) return ['Weight and friction are in place,', 'so a push will now slide the mug'];
  if (mug.position >= TRACK_MAX_M - 1e-9) return ['With weight and friction underneath,', 'the pushes slid it to the table’s end'];
  return ['With weight and friction underneath,', 'the same push slides the mug along'];
}

const LAYER_BUTTONS: ReadonlyArray<{ id: keyof LayerState; label: string }> = [
  { id: 'appearance', label: 'Picture' },
  { id: 'physics', label: 'Shape, weight and friction' },
  { id: 'simulation', label: 'Physics solver' },
];

const onOff = (on: boolean) => (on ? 'on' : 'off');

/** The slide's numbers for a push strength, from the model: launch speed, friction's slowing, free distance. */
function physicsOf(forceN: number) {
  return {
    v0: (forceN * CONTACT_TIME_S) / MASS_KG,
    decel: FRICTION_MU * GRAVITY_MS2,
    free: displacementForForce(forceN) * 1000,
    slow: SLOW,
  };
}

/** The pose the bench rests in for a scene. */
function restOf(layers: LayerState, mug: MugState, forceN: number): Pose {
  const last = mug.history.length >= 2 ? mug.history[mug.history.length - 2]! : 0;
  return {
    c: layers.physics ? last * 1000 : 0,
    s: cockedStroke(forceN),
    x: mug.position * 1000,
    parked: layers.physics ? 0 : 1,
  };
}

function PartView({ part }: { part: Part }) {
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
  if (part.kind === 'wire') return <Wire from={part.from} to={part.to} via={part.via} tone={part.tone} />;
  if (part.kind === 'fill') {
    if (part.shade === 'paper') return <path className="iso-fill" d={part.d} />;
    if (part.shade === 'top') return <path className="iso-top" d={part.d} />;
    return <path className="iso-shade" data-shade={part.shade} d={part.d} />;
  }
  return null;
}

const PICTURE = pictureOf();
const LIGHT = { fill: 'var(--anatomy-lit)' } as const;
const LENS_GLASS = lensGlass();
const MUG_PARTS = mugParts();

/** The mug's accent parts drawn plain while it waits on its stand. */
function plainUnlessPlaced(part: Part, placed: boolean): Part {
  if (placed) return part;
  if (part.kind === 'solid' && part.lit) return { ...part, lit: false };
  if (part.kind === 'line' && part.tone === 'lit') return { ...part, tone: 'hi' };
  return part;
}

export function AppearancePhysicsPush({
  defaultForceN = DEFAULT_FORCE_N,
  className,
}: AppearancePhysicsPushProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const forceId = `${id}-force`;
  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS);
  const [mug, setMug] = useState<MugState>(INITIAL_MUG);
  const [forceN, setForceN] = useState(defaultForceN);
  // The pose React draws first, on the server and at hydration; the loop owns the moving parts after that.
  const [first] = useState<Pose>(() => restOf(layers, mug, forceN));

  const scene = sceneOf(layers);
  const solves = layers.physics && layers.simulation;
  const atTrackEnd = mug.position >= TRACK_MAX_M - 1e-9;
  const moved = formatCentimetres(mug.position);
  const pushes = `${mug.effectivePushes} ${mug.effectivePushes === 1 ? 'push' : 'pushes'}`;
  const note = pushTestNote(layers);

  // ------------------------------------------------------------ the bench in motion
  const rootRef = useRef<SVGGElement>(null);
  const sledRef = useRef<SVGGElement>(null);
  const knobRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const rodBackRef = useRef<SVGGElement>(null);
  const rodFrontRef = useRef<SVGGElement>(null);
  const coilBackRef = useRef<SVGPathElement>(null);
  const coilFrontRef = useRef<SVGPathElement>(null);
  const mugRef = useRef<SVGGElement>(null);
  const ghostsRef = useRef<SVGGElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);
  const pose = useRef<Pose>({ ...first });
  const goal = useRef<Pose>({ ...first });
  const pending = useRef<Push | null>(null);
  const script = useRef<{ run: Script; t: number } | null>(null);

  const draw = useCallback((p: Pose, phase: string) => {
    sledRef.current?.setAttribute('transform', alongTrack(p.c));
    knobRef.current?.setAttribute('transform', alongTrack(p.s));
    headRef.current?.setAttribute('transform', alongTrack(p.s));
    writeSolid(rodBackRef.current, rodBack(p.s));
    const front = rodFront(p.s);
    writeSolid(rodFrontRef.current, front.rod);
    coilBackRef.current?.setAttribute('d', front.back);
    coilFrontRef.current?.setAttribute('d', front.front);
    const lift = 14 * 4 * p.parked * (1 - p.parked);
    mugRef.current?.setAttribute('transform', mugTransform(mugOffset(p.x, lift, p.parked)));
    // A scuff shows once the mug has slid off the place it stood.
    ghostsRef.current?.querySelectorAll<SVGPathElement>('[data-at]').forEach((ghost) => {
      const at = Number(ghost.dataset.at);
      ghost.style.visibility = p.parked < 0.5 && p.x > at + 2 ? '' : 'hidden';
    });
    if (phaseRef.current) phaseRef.current.textContent = phase;
    if (restRef.current) restRef.current.hidden = phase !== '';
  }, []);

  const visible = useInView(rootRef);
  const kick = useLoop((dt, calm) => {
    const p = pose.current;
    const g = goal.current;
    if (!script.current && pending.current) {
      const ready = p.parked === g.parked;
      if (ready || calm) {
        const run = pending.current;
        script.current = { run: pushTimeline(p, run, physicsOf(run.forceN)), t: 0 };
        // Once the push is under way, the bench comes to rest where it leaves the sled and the mug.
        g.c = run.c;
        g.x = run.to;
        pending.current = null;
      }
    }
    if (script.current) {
      const run = script.current;
      run.t = calm ? run.run.duration : run.t + dt;
      if (run.t >= run.run.duration) {
        script.current = null;
        Object.assign(p, run.run.at(run.run.duration).pose);
      } else {
        const now = run.run.at(run.t);
        Object.assign(p, now.pose);
        draw(p, now.phase);
        return true;
      }
    }
    const ease = (value: number, to: number, seconds: number) =>
      calm || Math.abs(to - value) < 0.05 ? to : value + (to - value) * (1 - Math.exp(-dt / seconds));
    p.c = ease(p.c, g.c, 0.3);
    p.s = ease(p.s, g.s, 0.16);
    p.x = ease(p.x, g.x, 0.3);
    p.parked = calm || Math.abs(g.parked - p.parked) < 0.01 ? g.parked : p.parked + (g.parked - p.parked) * (1 - Math.exp(-dt / 0.24));
    const carrying = p.parked !== g.parked;
    draw(p, carrying ? (g.parked < p.parked ? 'setting the mug on the plate' : 'lifting the mug off the plate') : '');
    return pending.current !== null || p.c !== g.c || p.s !== g.s || p.x !== g.x || p.parked !== g.parked;
  }, visible);

  // Every change of scene, strength or result moves the bench's goal; a push also queues its script.
  const settle = useCallback(
    (nextLayers: LayerState, nextMug: MugState, nextForce: number, push: Push | null) => {
      goal.current = restOf(nextLayers, nextMug, nextForce);
      if (push) {
        // Until the push starts, the mug is set down where it stands now and the sled waits where it is.
        goal.current.x = push.from;
        goal.current.c = pose.current.c;
        script.current = null;
        pending.current = push;
      } else if (!nextLayers.physics) {
        // Taking the mug off ends any push still playing.
        script.current = null;
        pending.current = null;
      }
      kick();
    },
    [kick],
  );

  // The scuffs a new render adds take their visibility from the drawn pose at once, before paint.
  useLayoutEffect(() => {
    draw(pose.current, phaseRef.current?.textContent ?? '');
  }, [mug.history.length, layers.physics, draw]);

  function pushOf(current: MugState, nextLayers: LayerState, force: number): { next: MugState; push: Push } {
    const result = applyPush(current, nextLayers, force);
    const body = nextLayers.physics;
    return {
      next: result.state,
      push: {
        c: body ? current.position * 1000 : 0,
        from: current.position * 1000,
        to: result.state.position * 1000,
        body,
        moves: result.moved,
        forceN: force,
      },
    };
  }

  /** Back to the picture alone: the mug returns to its stand and every push is forgotten. */
  function rest(force: number) {
    setLayers(INITIAL_LAYERS);
    setMug(INITIAL_MUG);
    settle(INITIAL_LAYERS, INITIAL_MUG, force, null);
  }

  function choose(next: Scene) {
    if (next === 'picture') {
      rest(forceN);
      return;
    }
    // The physics scene opens on the push already answered, so its first
    // frame shows the slide instead of waiting for a second click.
    const { next: answered, push } = pushOf(INITIAL_MUG, PHYSICS_LAYERS, forceN);
    setLayers(PHYSICS_LAYERS);
    setMug(answered);
    settle(PHYSICS_LAYERS, answered, forceN, push);
  }

  function toggle(layer: keyof LayerState) {
    const next = setLayer(layers, layer, !layers[layer]);
    setLayers(next);
    settle(next, mug, forceN, null);
  }

  function push() {
    const { next, push: run } = pushOf(mug, layers, forceN);
    setMug(next);
    settle(layers, next, forceN, run);
  }

  function strength(value: number) {
    setForceN(value);
    settle(layers, mug, value, null);
  }

  function reset() {
    setForceN(defaultForceN);
    rest(defaultForceN);
  }

  const sceneName = scene === 'picture'
    ? 'Picture only'
    : scene === 'physics'
      ? 'Picture plus physics'
      : `Picture ${onOff(layers.appearance)}, shape, weight and friction ${onOff(layers.physics)}, physics solver ${onOff(layers.simulation)}`;
  const force = newtons(forceN);
  const description = !layers.physics
    ? layers.appearance
      ? `With only the picture, a push of ${force} leaves the mug at ${moved}: a picture has no shape, weight or friction for a solver to push against.`
      : `With neither the picture nor the physics, a push of ${force} has nothing to act on and the mug stays at ${moved}.`
    : !layers.simulation
      ? `Shape, weight and friction are in place but the solver is off, so a push of ${force} leaves the mug at ${moved}.`
      : `With shape, weight and friction under the picture, the solver turns each push of ${force} into a slide: the mug has moved ${moved} after ${pushes}.`;

  const switchNow = switchParts(layers.appearance);
  const frontAtFirst = rodFront(first.s);
  const sledSlot = (slot: string) => {
    if (slot === 'knob') {
      return (
        <g key="knob" ref={knobRef} transform={alongTrack(first.s)}>
          {knobParts().map((part, k) => (
            <PartView key={k} part={part} />
          ))}
        </g>
      );
    }
    if (slot === 'rod-back') return <LiveSolid key="rod-back" ref={rodBackRef} paths={rodBack(first.s)} tone="mid" />;
    return (
      <g key="front">
        <path ref={coilBackRef} className="iso-line" data-tone="lo" d={frontAtFirst.back} />
        <LiveSolid ref={rodFrontRef} paths={frontAtFirst.rod} tone="mid" />
        <path ref={coilFrontRef} className="iso-line" data-tone="mid" d={frontAtFirst.front} />
        <g ref={headRef} transform={alongTrack(first.s)}>
          {headParts().map((part, k) => (
            <PartView key={k} part={part} />
          ))}
        </g>
      </g>
    );
  };

  const slot = (slotId: string) => {
    if (slotId === 'switch') {
      return (
        <g key="switch" data-part="lamp-switch" data-on={layers.appearance ? '' : undefined}>
          <Solid paths={switchNow.bezel} tone="lo" />
          <Solid paths={switchNow.rocker} tone="hi" />
          <path className="iso-fill" d={switchNow.lamp} style={layers.appearance ? LIGHT : undefined} />
          <Line d={switchNow.lamp} tone={layers.appearance ? 'lit' : 'lo'} />
          <Line d={switchNow.lampRing} tone="lo" />
        </g>
      );
    }
    if (slotId === 'ghosts') {
      return (
        <g key="ghosts" ref={ghostsRef}>
          {layers.physics
            ? mug.history.slice(0, -1).map((p, i) => (
                <path
                  key={i}
                  data-testid="motion-ghost"
                  data-part="scuff"
                  data-at={Math.round(p * 1000)}
                  className="iso-line"
                  data-tone="lo"
                  d={scuffAt(p * 1000)}
                />
              ))
            : null}
        </g>
      );
    }
    if (slotId === 'picture') {
      return layers.appearance ? (
        <g key="picture" data-testid="mug-appearance" data-part="picture">
          <path d={PICTURE.beam} style={{ ...LIGHT, opacity: 0.07 }} />
          <path d={PICTURE.patch} style={{ ...LIGHT, opacity: 0.12 }} />
          <path d={PICTURE.table} style={{ ...LIGHT, opacity: 0.12 }} />
          <Line d={PICTURE.patch} tone="lit" />
          <g opacity={0.5}>
            <Line d={PICTURE.beamEdges} tone="lit" />
          </g>
          <Line d={PICTURE.lines} tone="lit" />
          <path d={LENS_GLASS} style={LIGHT} />
        </g>
      ) : null;
    }
    if (slotId === 'plunger') {
      return (
        <g key="plunger" ref={sledRef} data-part="plunger" transform={alongTrack(first.c)}>
          {[...SLED_PARTS.far, ...SLED_PARTS.middle, ...SLED_PARTS.near].map((part, k) =>
            part.kind === 'slot' ? sledSlot(part.id) : <PartView key={k} part={part} />,
          )}
        </g>
      );
    }
    return (
      <g
        key="mug"
        ref={mugRef}
        data-testid="mug"
        data-part="mug-body"
        data-position-mm={Math.round(mug.position * 1000)}
        data-on-plate={layers.physics ? '' : undefined}
        transform={mugTransform(mugOffset(first.x, 0, first.parked))}
      >
        {/* The real mug is the part to watch once it is on the plate; waiting on its stand it is drawn plain. */}
        {MUG_PARTS.map((part, k) => (
          <PartView key={k} part={plainUnlessPlaced(part, layers.physics)} />
        ))}
      </g>
    );
  };

  const stage = (
    <AnatomyStage
      viewWidth={WIDTH}
      hint={<span data-testid="push-note">{noteLines(layers, mug).join(' ')}</span>}
      readout={
        <>
          <span ref={phaseRef} data-push-phase="" />
          <span ref={restRef}>
            mug moved <span data-testid="displacement-readout">{moved}</span>
          </span>
        </>
      }
      status="illustrative, not measured"
      data-testid="push-bench"
    >
      <IsoFigure
        width={WIDTH}
        height={HEIGHT}
        label={`A push bench where the mug on a table has moved ${moved} with ${sceneName.toLowerCase()}`}
        describedBy={descriptionId}
      >
        <g ref={rootRef}>
          {PARTS.map((part, k) => (part.kind === 'slot' ? slot(part.id) : <PartView key={k} part={part} />))}
        </g>
      </IsoFigure>
    </AnatomyStage>
  );

  return (
    <InstrumentFigure
      figureId="appearance-physics-push"
      className={className}
      kicker="The push test"
      heading="A realistic picture of a mug cannot be pushed"
      controls={
        <>
          <PresetGroup<Scene>
            label="What is in the scene?"
            presets={[
              { id: 'picture', label: 'Picture only' },
              { id: 'physics', label: 'Picture plus physics' },
            ]}
            value={scene}
            onChange={choose}
            testId="push-scene"
          />
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={atTrackEnd && solves ? undefined : push}
            aria-disabled={(atTrackEnd && solves) || undefined}
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Push the mug
          </button>
        </>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor={forceId} value={newtons(forceN)}>
              Push strength
            </ControlLabel>
            <input
              id={forceId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_FORCE_N}
              max={MAX_FORCE_N}
              step={1}
              value={forceN}
              onChange={(e) => strength(Number(e.target.value))}
              aria-label={`Push strength, currently ${newtons(forceN)}`}
              aria-valuetext={newtons(forceN)}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="gentle" high="hard" />
          </ControlField>
          <div role="group" aria-label="Layers" className="flex flex-wrap gap-2">
            {LAYER_BUTTONS.map((b) => (
              <button
                data-brand-control-id="control:selection"
                key={b.id}
                type="button"
                aria-pressed={layers[b.id]}
                onClick={() => toggle(b.id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {b.label}
              </button>
            ))}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={stage}
      caption="AI can generate convincing 3D scenes, but a robot cannot train in them until someone adds shape, weight and friction underneath."
      method={
        <>
          <p>
            The scene has three layers, drawn as a push bench. The picture is what a renderer or a
            generative model draws: here, the light a projector throws onto the plate. The physics proxy
            adds what a solver needs: the real mug, with its shape, a mass of {MASS_KG} kilograms and a
            friction coefficient of {FRICTION_MU} at its felt pad. The simulation layer is the solver,
            which turns each push into motion.
          </p>
          <p>
            &ldquo;Picture plus physics&rdquo; sets the mug on the plate from its stand; &ldquo;Adjust
            more&rdquo; switches each layer on its own. Each push is an authored impulse held for {CONTACT_TIME_S} seconds, {newtons(defaultForceN)}{' '}
            by default and {MIN_FORCE_N} to {MAX_FORCE_N} newtons with the push-strength slider, which
            cocks the plunger further. Friction stops the mug after d = v&sup2;/(2&mu;g), so the default
            push slides it {formatCentimetres(displacementForForce(defaultForceN))}; the bench plays the
            slide {SLOW} times slower than real time. The table is {formatCentimetres(TRACK_MAX_M)} long
            and the mug stops at its end.
          </p>
          <p data-testid="push-test-note">
            <span className="font-medium text-text">{note.title}.</span> {note.body} The numbers are
            authored for this schematic, not measured on a real mug.
          </p>
          <ChartDescription
            id={descriptionId}
            form="state"
            open
            summary="Current push-test layers"
            description={description}
            states={[
              { label: 'picture', value: onOff(layers.appearance) },
              { label: 'shape, weight and friction', value: onOff(layers.physics) },
              { label: 'physics solver', value: onOff(layers.simulation) },
              { label: 'push strength', value: newtons(forceN) },
              { label: 'moved', value: formatCm(mug.position) },
              { label: 'pushes that moved it', value: String(mug.effectivePushes) },
            ]}
          />
        </>
      }
    />
  );
}
