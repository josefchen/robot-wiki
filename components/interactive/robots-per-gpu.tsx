'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PresetGroup, type Preset } from '@/components/ui/instrument';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid, Wire } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { LENS, PARTS, TILES, TILE_PATHS, WIDTH, HEIGHT, type LiveId, type Part } from '@/components/iso/figures/gpu-test-bench';

/**
 * RobotsPerGpu: how many simulated robots practise at once, drawn as a
 * graphics card open on a test bench. Rudin and colleagues scaled from the
 * 128 robots typical of CPU simulators to 16,384 on one workstation GPU,
 * and trained their deployed walking policy with 4,096 robots in under
 * twenty minutes.
 *
 * The card's cooler is set aside so its chip shows. The chip's face is a
 * grid of 128 tiles, and each tile is one block of 128 robots: a magnifier
 * over the first tile shows its 128 robots as dots, the CPU-era count. The
 * one control picks the count, and the tiles fill or empty in reading order
 * to 1, 32 or all 128 lit; the lit tiles are the one accent. Reduced motion
 * jumps. Every count is the paper's; the tiles only draw it.
 */

export const ROBOTS_PER_SQUARE = 128;
type CountId = 'cpu' | 'policy' | 'gpu';
export const COUNTS: readonly (Preset<CountId> & { robots: number; note: string })[] = [
  { id: 'cpu', label: '128', robots: 128, note: 'typical of CPU simulators' },
  { id: 'policy', label: '4,096', robots: 4096, note: 'trained the deployed walking policy in under 20 minutes' },
  { id: 'gpu', label: '16,384', robots: 16384, note: 'the most on one workstation GPU' },
];
export const DEFAULT_COUNT: CountId = 'gpu';

const thousands = (n: number) => n.toLocaleString('en-US');
const countOf = (id: CountId) => COUNTS.find((c) => c.id === id)!;
/** How many tiles a count lights: one per 128 robots. */
export const tilesFor = (robots: number) => robots / ROBOTS_PER_SQUARE;

/** The readout: the count and how it compares with the CPU era, from the same table as the tiles. */
export function readoutFor(id: CountId): string {
  const squares = tilesFor(countOf(id).robots);
  return `${thousands(countOf(id).robots)} robots: ${squares === 1 ? 'the CPU-era count' : `${thousands(squares)} times the CPU-era count`}`;
}

function describe(id: CountId): string {
  const count = COUNTS.find((c) => c.id === id)!;
  return `${thousands(count.robots)} simulated robots practise at once, ${count.note}, which is ${count.robots / ROBOTS_PER_SQUARE} times the 128 typical of CPU simulators; each square in the grid stands for 128 robots.`;
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

/** A tile's share of being lit when the lighting front stands at `front` tiles. */
const litShare = (front: number, k: number) => Math.max(0, Math.min(1, front - k));
const round = (v: number) => Math.round(v * 100) / 100;
/** The first render's lighting: the default count, settled. */
const REST_FRONT = tilesFor(countOf(DEFAULT_COUNT).robots);

const TILE_STYLE = { stroke: 'var(--anatomy-faint)', strokeWidth: 0.5 } as const;
const LIT_STYLE = { fill: 'var(--anatomy-lit)', fillOpacity: 0.5, stroke: 'var(--anatomy-lit)', strokeWidth: 0.5 } as const;
const LENS_TILE_STYLE = { fill: 'var(--anatomy-lit)', fillOpacity: 0.16, stroke: 'var(--anatomy-lit)', strokeWidth: 0.6 } as const;

export function RobotsPerGpu({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const rudin = citationFor('rudin-2021');
  const isaacGym = citationFor('isaac-gym-2021');
  const [countId, setCountId] = useState<CountId>(DEFAULT_COUNT);
  const count = countOf(countId);
  const squares = tilesFor(count.robots);
  const times = squares === 1 ? 'the CPU-era count' : `${thousands(squares)} times the CPU-era count`;

  const stageLabel = `A graphics card open on a test bench, its chip's face a grid of squares, each 128 simulated robots: ${thousands(count.robots)} robots fill ${squares} of the ${TILES} squares, ${times}. A magnifier over the first square shows its 128 robots.`;

  const tilesRef = useRef<SVGGElement>(null);
  const front = useRef(REST_FRONT);

  // The lighting front runs through the tiles in reading order to the chosen count, about a hundred tiles a second.
  useEffect(() => {
    const calm = asksForStillness();
    const lit = [...(tilesRef.current?.querySelectorAll<SVGPathElement>('[data-lit-tile]') ?? [])];
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const gap = squares - front.current;
      const step = Math.max(110 * dt, Math.abs(gap) * (1 - Math.exp(-dt / 0.25)));
      front.current = calm || Math.abs(gap) <= step ? squares : front.current + Math.sign(gap) * step;
      lit.forEach((tile, k) => tile.setAttribute('opacity', String(round(litShare(front.current, k)))));
      frame = front.current === squares ? 0 : requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [squares]);

  const liveView = (id: LiveId) => {
    if (id === 'tiles') {
      return (
        <g key={id} ref={tilesRef} data-series="robots">
          {TILE_PATHS.map((d, k) => (
            <g key={k} data-square={k} data-chart-role={k === 0 ? 'highlight' : 'value'}>
              <path className="iso-top" style={TILE_STYLE} d={d} />
              <path data-lit-tile="" style={LIT_STYLE} opacity={litShare(REST_FRONT, k)} d={d} />
            </g>
          ))}
        </g>
      );
    }
    return (
      <g key={id} data-testid="robots-lens">
        <path className="iso-fill" d={LENS.glass} />
        <path className="iso-top" d={LENS.glass} />
        <path style={LENS_TILE_STYLE} d={LENS.tile} />
        <Dots points={LENS.robots} size={0.42} tone="hi" />
        <Line d={LENS.glass} tone="mid" />
      </g>
    );
  };

  return (
    <InstrumentFigure
      figureId="robots-per-gpu"
      className={className}
      kicker="Massively parallel simulation"
      heading="One graphics chip trains thousands of robots at once"
      controls={<PresetGroup label="Robots practising at once" presets={COUNTS} value={countId} onChange={setCountId} testId="robots-count" />}
      stage={
        <AnatomyStage
          viewWidth={WIDTH}
          hint="Each lit tile on the chip is 128 robots"
          readout={readoutFor(countId)}
          status="Counts from the paper; one tile per 128 robots"
          data-testid="robots-stage"
          data-squares={squares}
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            label={stageLabel}
            describedBy={descriptionId}
          >
            {PARTS.map((part, k) => (part.kind === 'live' ? liveView(part.id) : <PartView key={k} part={part} />))}
          </IsoFigure>
        </AnatomyStage>
      }
      caption="On one graphics chip, Rudin's team simulated 16,384 robots at once, against 128 typical of CPU simulators."
      method={
        <>
          <div>
            Isaac Gym kept the physics and the policy training on one GPU, passing simulation buffers straight to the
            learning code without round trips through the CPU; its authors report 2 to 3 orders of magnitude
            improvement over a CPU simulator feeding a GPU network. On it, Rudin and colleagues scaled from 128
            robots, typical of CPU implementations, to 16,384 on one workstation GPU, and trained their deployment
            policy with 4,096 robots in under 20 minutes.
          </div>
          <div>
            The drawing is a graphics card with its cooler set aside. Each of the 128 tiles on its chip stands for
            128 robots, so the first tile, under the magnifier, is the CPU-era count and the whole chip is the
            paper&apos;s 16,384. The tiles are a way of counting; a real chip lays out its cores differently.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Simulated robots at once"
            description={describe(countId)}
            rowHeader="robots at once"
            columns={[{ header: 'times the CPU-era 128', numeric: true }, { header: 'in the paper' }]}
            rows={COUNTS.map((c) => ({ label: thousands(c.robots), values: [String(c.robots / ROBOTS_PER_SQUARE), c.note] }))}
          />
        </>
      }
      source={
        <span data-testid="robots-source">
          {rudin ? (
            <a data-brand-control-id="control:link-focus" href={rudin.url} target="_blank" rel="noopener" className="underline-offset-2">
              {rudin.label}
            </a>
          ) : (
            'Rudin and colleagues'
          )}
          ;{' '}
          {isaacGym ? (
            <a data-brand-control-id="control:link-focus" href={isaacGym.url} target="_blank" rel="noopener" className="underline-offset-2">
              {isaacGym.label}
            </a>
          ) : (
            'Isaac Gym'
          )}
          .
        </span>
      }
    />
  );
}
