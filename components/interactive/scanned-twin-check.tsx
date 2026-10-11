'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, StageAnnotation, roleColour } from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';

/**
 * ScannedTwinCheck: a 3D-scanned copy of a lab is not automatically a
 * faithful one. Kadian and colleagues measured how well success in such a
 * simulated lab predicted success on the real robot: a correlation of
 * 0.18, because agents exploited the simulator's collision dynamics. After
 * they tuned the simulation parameters the correlation rose to 0.844.
 *
 * The one control picks the simulator. The bar glides between the two
 * published correlations on the motion curve, with the other value kept
 * as a dashed reference; reduced motion jumps. Both values are the
 * paper's.
 */

type SimId = 'scanned' | 'tuned';
export const SIMS: readonly (Preset<SimId> & { correlation: number; text: string; note: string })[] = [
  { id: 'scanned', label: 'As scanned', correlation: 0.18, text: '0.18', note: 'because agents exploited its collision dynamics' },
  { id: 'tuned', label: 'Parameters tuned', correlation: 0.844, text: '0.844', note: 'after the simulation parameters were tuned' },
];
export const DEFAULT_SIM: SimId = 'scanned';

const WIDTH = 340;
const HEIGHT = 146;
const LEFT = 12;
const RIGHT = 328;
const BAR_Y = 70;
const BAR_HEIGHT = 18;
const AXIS_Y = BAR_Y + BAR_HEIGHT + 8;
const TICKS = [0, 0.25, 0.5, 0.75, 1];
const sx = (v: number) => LEFT + v * (RIGHT - LEFT);
const f = (v: number) => Number(v.toFixed(2));

const STATEMENT: Record<SimId, string> = {
  scanned: 'Sim scores barely predict real ones',
  tuned: 'Sim scores now track real ones',
};

function describe(id: SimId): string {
  const sim = SIMS.find((s) => s.id === id)!;
  const other = SIMS.find((s) => s.id !== id)!;
  return `In a 3D-scanned lab, success in simulation correlated with success on the real robot at ${sim.text}, ${sim.note}, against ${other.text} ${id === 'scanned' ? 'after the simulation parameters were tuned' : 'as first scanned'}; a correlation of 1 would mean simulation predicts the real result exactly.`;
}

export function ScannedTwinCheck({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('kadian-2019');
  const [simId, setSimId] = useState<SimId>(DEFAULT_SIM);
  const sim = SIMS.find((s) => s.id === simId)!;
  const other = SIMS.find((s) => s.id !== simId)!;
  const shown = useEasedValue(sim.correlation);
  const accent = roleColour('highlight');
  const end = f(sx(shown));

  return (
    <InstrumentFigure
      figureId="scanned-twin-check"
      className={className}
      kicker="Real-to-sim evaluation"
      heading="A scanned twin predicted the real robot only after tuning"
      controls={<PresetGroup label="The scanned lab's simulator" presets={SIMS} value={simId} onChange={setSimId} testId="twin-sim" />}
      stage={
        <FigureStage footer={<StageStatus>Correlations as reported</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A bar from 0 to 1 showing how well simulated success predicts real success: ${sim.text} with the simulator ${sim.label.toLowerCase()}, against ${other.text} ${simId === 'scanned' ? 'once tuned' : 'as scanned'}.`}
            aria-describedby={descriptionId}
            data-testid="twin-stage"
            data-correlation={sim.text}
          >
            <StageAnnotation x={LEFT} y={16} lines={[`${sim.text}: ${STATEMENT[simId]}`]} />
            <text x={LEFT} y={36} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              {sim.note}
            </text>
            <rect x={LEFT} y={BAR_Y} width={RIGHT - LEFT} height={BAR_HEIGHT} fill="none" stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure} />
            <g data-series="correlation" data-chart-role="highlight">
              <rect data-testid="twin-bar" x={LEFT} y={BAR_Y} width={f(end - LEFT)} height={BAR_HEIGHT} fill={accent} />
            </g>
            <g data-series="other" data-testid="twin-other" data-chart-role="reference">
              <line
                x1={f(sx(other.correlation))}
                y1={BAR_Y - 6}
                x2={f(sx(other.correlation))}
                y2={BAR_Y + BAR_HEIGHT + 6}
                stroke={roleColour('reference')}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <text
                x={f(sx(other.correlation))}
                y={BAR_Y - 10}
                textAnchor={other.correlation > 0.5 ? 'end' : 'start'}
                fontSize={CHART_TYPE.labelPx}
                fill="var(--role-reference-text)"
              >
                {other.id === 'scanned' ? `as scanned, ${other.text}` : `once tuned, ${other.text}`}
              </text>
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={LEFT} y1={AXIS_Y} x2={RIGHT} y2={AXIS_Y} />
              {TICKS.map((t) => (
                <line key={t} x1={f(sx(t))} y1={AXIS_Y} x2={f(sx(t))} y2={AXIS_Y + CHART_STROKE.tickLength} />
              ))}
            </g>
            <text x={LEFT} y={AXIS_Y + 18} fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
              0, no link
            </text>
            <text x={RIGHT} y={AXIS_Y + 18} textAnchor="end" fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
              1, predicts real exactly
            </text>
            <text x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              correlation of simulated with real success
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="A 3D-scanned lab predicted real robot success poorly, a correlation of 0.18, until tuning raised it to 0.844."
      method={
        <>
          <div>
            Kadian and colleagues compared how agents scored in a simulated, 3D-scanned copy of a lab with how the
            same agents scored on the real robot. The correlation between the two was 0.18, because agents exploited
            the simulator&apos;s collision dynamics; tuning the simulation parameters raised it to 0.844.
          </div>
          <div>
            The bar shows the correlation for the chosen simulator and the dashed line the other. A scanned scene
            copies how the lab looks; the figure&apos;s point is that its physics still has to be checked against the
            real robot.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="How well simulated success predicts real success"
            description={describe(simId)}
            rowHeader="simulator"
            columns={[{ header: 'correlation with real success', numeric: true }, { header: 'why' }]}
            rows={SIMS.map((s) => ({ label: s.label, values: [s.text, s.note] }))}
          />
        </>
      }
      source={
        <span data-testid="twin-source">
          {source ? (
            <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener" className="underline-offset-2">
              {source.label}
            </a>
          ) : (
            'Kadian and colleagues'
          )}
          .
        </span>
      }
    />
  );
}
