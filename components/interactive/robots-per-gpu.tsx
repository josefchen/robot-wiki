'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, DirectLabel, StageAnnotation, roleColour } from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';

/**
 * RobotsPerGpu: how many simulated robots practise at once. Rudin and
 * colleagues scaled from the 128 robots typical of CPU simulators to
 * 16,384 on one workstation GPU, and trained their deployed walking policy
 * with 4,096 robots in under twenty minutes. Each square of the grid is
 * 128 robots, so the CPU-era count is one square and the GPU's is all 128.
 *
 * The one control picks the count. The squares fill or empty in reading
 * order on the motion curve; reduced motion jumps. Every count is the
 * paper's; the grid only draws it.
 */

export const ROBOTS_PER_SQUARE = 128;
type CountId = 'cpu' | 'policy' | 'gpu';
export const COUNTS: readonly (Preset<CountId> & { robots: number; note: string })[] = [
  { id: 'cpu', label: '128', robots: 128, note: 'typical of CPU simulators' },
  { id: 'policy', label: '4,096', robots: 4096, note: 'trained the deployed walking policy in under 20 minutes' },
  { id: 'gpu', label: '16,384', robots: 16384, note: 'the most on one workstation GPU' },
];
export const DEFAULT_COUNT: CountId = 'gpu';

const COLUMNS = 16;
const ROWS = 8;
const CELL = 18;
const SQUARE = 10;
const LEFT = 26;
const TOP = 46;
const WIDTH = 340;
const HEIGHT = TOP + ROWS * CELL + 14;
const f = (v: number) => Number(v.toFixed(2));
const thousands = (n: number) => n.toLocaleString('en-US');

function describe(id: CountId): string {
  const count = COUNTS.find((c) => c.id === id)!;
  return `${thousands(count.robots)} simulated robots practise at once, ${count.note}, which is ${count.robots / ROBOTS_PER_SQUARE} times the 128 typical of CPU simulators; each square in the grid stands for 128 robots.`;
}

export function RobotsPerGpu({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const rudin = citationFor('rudin-2021');
  const isaacGym = citationFor('isaac-gym-2021');
  const [countId, setCountId] = useState<CountId>(DEFAULT_COUNT);
  const count = COUNTS.find((c) => c.id === countId)!;
  const squares = count.robots / ROBOTS_PER_SQUARE;
  const shown = useEasedValue(squares);
  const accent = roleColour('highlight');
  const times = squares === 1 ? 'the CPU-era count' : `${thousands(squares)} times the CPU-era count`;

  return (
    <InstrumentFigure
      figureId="robots-per-gpu"
      className={className}
      kicker="Massively parallel simulation"
      heading="One graphics chip trains thousands of robots at once"
      controls={<PresetGroup label="Robots practising at once" presets={COUNTS} value={countId} onChange={setCountId} testId="robots-count" />}
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A grid of squares, each 128 simulated robots: ${thousands(count.robots)} robots fill ${squares} of the 128 squares, ${times}.`}
            aria-describedby={descriptionId}
            data-testid="robots-stage"
            data-squares={squares}
          >
            <StageAnnotation x={LEFT} y={16} lines={[`${thousands(count.robots)} robots: ${times}`]} />
            <text x={LEFT} y={34} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              {count.note}
            </text>
            <rect
              x={LEFT - 3}
              y={TOP - 3}
              width={COLUMNS * CELL}
              height={ROWS * CELL}
              fill="none"
              stroke={CHART_STRUCTURE.grid}
              strokeWidth={CHART_STROKE.structure}
            />
            <g data-series="robots">
              {Array.from({ length: COLUMNS * ROWS }, (_, k) => {
                const fill = Math.max(0, Math.min(1, shown - k));
                if (fill <= 0) return null;
                const x = LEFT + (k % COLUMNS) * CELL;
                const y = TOP + Math.floor(k / COLUMNS) * CELL;
                const first = k === 0;
                return (
                  <rect
                    key={k}
                    data-square={k}
                    data-chart-role={first ? 'highlight' : 'value'}
                    x={f(x)}
                    y={f(y)}
                    width={SQUARE}
                    height={SQUARE}
                    fill={first ? accent : CHART_STRUCTURE.labelSecondary}
                    opacity={f(fill)}
                  />
                );
              })}
            </g>
            <DirectLabel x={LEFT + COLUMNS * CELL - 3} y={HEIGHT - 2} anchor="end">
              each square is 128 robots
            </DirectLabel>
          </PlotStage>
        </FigureStage>
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
            Each square is 128 robots. The first square, in the accent, is the CPU-era count, so the grid shows the
            same scale-up the paper reports.
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
