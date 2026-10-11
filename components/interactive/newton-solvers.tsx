'use client';

import { useId, useState, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, StageAnnotation, roleColour } from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * NewtonSolvers: Newton keeps several physics solvers behind one
 * interface and hands each kind of material to the one built for it.
 * NVIDIA's overview lists MuJoCo and Featherstone in generalized
 * coordinates, SemiImplicit, XPBD and Kamino in maximal coordinates, VBD
 * for rigid bodies, particles, cloth and soft bodies, implicit MPM for
 * particle-based continuum materials, and Style3D cloth. The release post
 * credits Kamino with closed-chain mechanisms and couples a VBD cable
 * solver with MuJoCo Warp, Newton's primary backend.
 *
 * The one control picks a material. Its route through the shared
 * interface glides to that material's solver on the motion curve; reduced
 * motion jumps. Four of the eight solvers are drawn; the routing is the
 * sources', the drawing a schematic.
 */

type MaterialId = 'robot' | 'linkage' | 'cloth' | 'continuum';
export const MATERIALS: readonly (Preset<MaterialId> & { name: string; solver: readonly string[]; handles: string })[] = [
  { id: 'robot', label: 'Robot arms and legs', name: 'robot', solver: ['MuJoCo', 'Warp'], handles: "jointed robots in generalized coordinates, as Newton's primary backend" },
  { id: 'linkage', label: 'Closed-chain linkages', name: 'linkage', solver: ['Kamino'], handles: 'closed-chain mechanisms, credited to Disney Research' },
  { id: 'cloth', label: 'Cloth and cables', name: 'cloth', solver: ['VBD'], handles: 'rigid bodies, particles, cloth and soft bodies; the cable solver coupled to MuJoCo Warp' },
  { id: 'continuum', label: 'Sand-like materials', name: 'sand', solver: ['implicit', 'MPM'], handles: 'particle-based continuum materials' },
];
export const DEFAULT_MATERIAL: MaterialId = 'robot';
/** Every solver NVIDIA's overview lists behind Newton's one interface. */
export const LISTED_SOLVERS = ['MuJoCo', 'Featherstone', 'SemiImplicit', 'XPBD', 'Kamino', 'VBD', 'implicit MPM', 'Style3D'] as const;

const WIDTH = 340;
const HEIGHT = 190;
const COLUMN = 79;
const GAP = 6;
const LEFT = 3;
const ICON_TOP = 32;
const ICON_BOTTOM = 76;
const NAME_Y = 92;
const BAR_TOP = 104;
const BAR_HEIGHT = 22;
const BOX_TOP = 146;
const BOX_HEIGHT = 38;
const centre = (k: number) => LEFT + k * (COLUMN + GAP) + COLUMN / 2;
const f = (v: number) => Number(v.toFixed(2));
const solverName = (m: (typeof MATERIALS)[number]) => m.solver.join(' ');

function describe(id: MaterialId): string {
  const m = MATERIALS.find((x) => x.id === id)!;
  return `Newton routes ${m.label.toLowerCase()} to ${solverName(m)}, which handles ${m.handles}; the drawing shows 4 of the ${LISTED_SOLVERS.length} solvers NVIDIA's overview lists behind one interface.`;
}

/** The small line drawing above each solver, centred on (0, 0) with its base at ICON_BOTTOM. */
function Icon({ id }: { id: MaterialId }): ReactNode {
  const h = ICON_BOTTOM - ICON_TOP;
  switch (id) {
    case 'robot':
      return (
        <>
          <rect x={-14} y={h - 6} width={28} height={6} />
          <path d={`M0 ${h - 6} L-6 ${h - 26} L14 ${h - 38}`} />
          <path d={`M14 ${h - 38} l6 -4 M14 ${h - 38} l6 4`} />
          <circle cx={-6} cy={h - 26} r={2.5} fill={MOTION_STAGE.background} />
        </>
      );
    case 'linkage':
      return (
        <>
          <line x1={-24} y1={h} x2={24} y2={h} />
          <path d={`M-16 ${h} L-10 ${h - 30} L14 ${h - 22} L16 ${h} `} />
          {[[-16, h], [-10, h - 30], [14, h - 22], [16, h]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={2.5} fill={MOTION_STAGE.background} />
          ))}
        </>
      );
    case 'cloth':
      return (
        <>
          <line x1={-22} y1={4} x2={22} y2={4} />
          <path d={`M-18 4 C-20 16 -14 26 -18 ${h - 6} Q-9 ${h} 0 ${h - 6} Q9 ${h - 12} 18 ${h - 4} C14 26 20 16 18 4`} />
          <path d={`M-6 4 C-8 18 -2 26 -4 ${h - 6} M6 4 C4 18 10 26 8 ${h - 9}`} strokeDasharray="2 2" />
        </>
      );
    case 'continuum':
      return (
        <>
          {[
            [0, 14], [-4, 20], [4, 20], [-8, 26], [0, 26], [8, 26], [-12, 32], [-4, 32], [4, 32], [12, 32],
            [-16, 38], [-8, 38], [0, 38], [8, 38], [16, 38], [-20, 44], [-12, 44], [-4, 44], [4, 44], [12, 44], [20, 44],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y - 1.5} r={1.6} fill="currentColor" stroke="none" />
          ))}
        </>
      );
  }
}

export function NewtonSolvers({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const overview = citationFor('state-of-simulation-2026');
  const release = citationFor('newton-manipulation-blog-2026');
  const [materialId, setMaterialId] = useState<MaterialId>(DEFAULT_MATERIAL);
  const index = MATERIALS.findIndex((m) => m.id === materialId);
  const material = MATERIALS[index];
  const x = f(centre(useEasedValue(index)));
  const accent = roleColour('highlight');

  return (
    <InstrumentFigure
      figureId="newton-solvers"
      className={className}
      kicker="Multi-solver physics"
      heading="One physics library, one solver per material"
      controls={<PresetGroup label="What is being simulated" presets={MATERIALS} value={materialId} onChange={setMaterialId} testId="newton-material" />}
      stage={
        <FigureStage footer={<StageStatus>Schematic; four of eight solvers</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Four materials above four solvers, joined through one Newton interface: ${material.label.toLowerCase()} go to ${solverName(material)}.`}
            aria-describedby={descriptionId}
            data-testid="newton-stage"
            data-material={materialId}
          >
            <StageAnnotation x={LEFT} y={14} lines={[`${material.label} go to ${solverName(material)}`]} />
            {MATERIALS.map((m, k) => {
              const chosen = m.id === materialId;
              const colour = chosen ? accent : CHART_STRUCTURE.labelSecondary;
              return (
                <g key={m.id} data-material-column={m.id} data-chosen={chosen || undefined}>
                  <g
                    transform={`translate(${centre(k)} ${ICON_TOP})`}
                    fill="none"
                    stroke={colour}
                    color={colour}
                    strokeWidth={CHART_STROKE.structure + (chosen ? 0.5 : 0)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Icon id={m.id} />
                  </g>
                  <text x={centre(k)} y={NAME_Y} textAnchor="middle" fontSize={CHART_TYPE.labelPx} fill={chosen ? CHART_STRUCTURE.label : CHART_STRUCTURE.labelSecondary}>
                    {m.name}
                  </text>
                  <line x1={centre(k)} y1={NAME_Y + 5} x2={centre(k)} y2={BAR_TOP} stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure} />
                  <line x1={centre(k)} y1={BAR_TOP + BAR_HEIGHT} x2={centre(k)} y2={BOX_TOP} stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure} />
                  <rect
                    data-solver={solverName(m)}
                    x={centre(k) - COLUMN / 2}
                    y={BOX_TOP}
                    width={COLUMN}
                    height={BOX_HEIGHT}
                    fill={MOTION_STAGE.background}
                    stroke={chosen ? accent : CHART_STRUCTURE.axes}
                    strokeWidth={CHART_STROKE.structure + (chosen ? 1 : 0)}
                  />
                  <text
                    x={centre(k)}
                    y={BOX_TOP + BOX_HEIGHT / 2 + (m.solver.length === 1 ? 4 : -3)}
                    textAnchor="middle"
                    fontSize={CHART_TYPE.labelPx}
                    fill={chosen ? accent : CHART_STRUCTURE.label}
                  >
                    {m.solver.map((line, i) => (
                      <tspan key={line} x={centre(k)} dy={i === 0 ? 0 : '1.15em'}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            <rect x={LEFT} y={BAR_TOP} width={WIDTH - 2 * LEFT} height={BAR_HEIGHT} fill={MOTION_STAGE.background} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
            <text x={WIDTH / 2} y={BAR_TOP + BAR_HEIGHT / 2 + 4} textAnchor="middle" fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.label}>
              Newton: one interface
            </text>
            <g data-testid="newton-route" data-route-x={x} data-chart-role="highlight" stroke={accent} strokeWidth={CHART_STROKE.trace} strokeLinecap="round">
              <line x1={x} y1={NAME_Y + 5} x2={x} y2={BAR_TOP} />
              <line x1={x} y1={BAR_TOP + BAR_HEIGHT} x2={x} y2={BOX_TOP} />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Newton routes each material to its own solver, such as MuJoCo Warp for robot joints."
      method={
        <>
          <div>
            Newton is an open-source GPU physics engine co-developed by Disney Research, Google DeepMind and NVIDIA,
            with MuJoCo Warp as its primary backend. NVIDIA&apos;s overview lists eight solvers behind one interface:
            MuJoCo and Featherstone in generalized coordinates; SemiImplicit, XPBD and Kamino in maximal coordinates;
            VBD for rigid bodies, particles, cloth and soft bodies; implicit MPM for particle-based continuum
            materials; and Style3D cloth. The release post credits Kamino with closed-chain mechanisms and couples a
            VBD cable solver two-way with MuJoCo Warp.
          </div>
          <div>
            The drawing shows four of the eight, one per material. Sand is this figure&apos;s example of a
            particle-based continuum material; the overview does not name it.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Which solver handles which material"
            description={describe(materialId)}
            rowHeader="what is simulated"
            columns={[{ header: 'solver' }, { header: 'what the sources say it handles' }]}
            rows={MATERIALS.map((m) => ({ label: m.label, values: [solverName(m), m.handles] }))}
          />
        </>
      }
      source={
        <span data-testid="newton-source">
          {overview ? (
            <a data-brand-control-id="control:link-focus" href={overview.url} target="_blank" rel="noopener" className="underline-offset-2">
              {overview.label}
            </a>
          ) : (
            "NVIDIA's overview"
          )}
          ;{' '}
          {release ? (
            <a data-brand-control-id="control:link-focus" href={release.url} target="_blank" rel="noopener" className="underline-offset-2">
              {release.label}
            </a>
          ) : (
            'the Newton 1.0 post'
          )}
          .
        </span>
      }
    />
  );
}
