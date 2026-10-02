import { FigureFrame, FigureStage } from '@/components/motion/figure-frame';
import {
  Bar,
  ChartAxes,
  ChartLegend,
  ChartSvg,
  ConstraintHatch,
  DirectLabel,
  LineTrace,
  PointMarker,
  SmallMultiples,
  UncertaintyBand,
  linearScale,
  type ChartPoint,
} from '@/components/motion/chart';

const WIDTH = 480;
const HEIGHT = 220;
const plot = { left: 44, right: 460, top: 28, bottom: 176 };
const x = linearScale([0, 10], [plot.left, plot.right]);
const y = linearScale([0, 1], [plot.bottom, plot.top]);
const trace: ChartPoint[] = [0, 2, 4, 6, 8, 10].map((t) => [x(t), y(0.2 + t * 0.06)]);
const upper: ChartPoint[] = trace.map(([px, py]) => [px, py - 12]);
const lower: ChartPoint[] = trace.map(([px, py]) => [px, py + 12]);

/** Every primitive once, in the shared frame, as the check and tests see it. */
export function ChartFixtureFigure({ id = 'fixture:chart-primitives' }: { id?: string }) {
  return (
    <FigureFrame
      figureId={id}
      kicker="Primitive fixture"
      heading="Every chart primitive draws from the same tokens"
      controls={<button type="button">Show the target</button>}
      adjust={<button type="button">Reset</button>}
      caption="Each chart primitive once, drawn from the motion tokens on the graphite stage."
      method={<p>Drawn from fixed fixture values, not measured data.</p>}
      source="Robot Wiki test fixture."
      stage={
        <FigureStage
          footer={
            <ChartLegend
              items={[
                { role: 'state', label: 'estimate', mark: 'line' },
                { role: 'reference', label: 'target', mark: 'dash' },
                { role: 'measurement', label: 'reading', mark: 'dot' },
                { role: 'value', label: 'score', mark: 'bar' },
                { role: 'constraint', label: 'limit', mark: 'hatch' },
                { role: 'state', label: 'spread', mark: 'band' },
              ]}
            />
          }
        >
          <ChartSvg width={WIDTH} height={HEIGHT}>
            <ChartAxes plot={plot} x={x} y={y} xTicks={[0, 5, 10]} yTicks={[0, 0.5, 1]} xLabel="steps" yLabel="success" />
            <ConstraintHatch id="fixture-hatch" x={x(8)} y={plot.top} width={x(10) - x(8)} height={plot.bottom - plot.top} />
            <UncertaintyBand upper={upper} lower={lower} role="state" />
            <LineTrace points={trace} role="state" />
            <LineTrace points={[[plot.left, y(0.8)], [plot.right, y(0.8)]]} role="reference" />
            <Bar x={x(1)} y={y(0.3)} width={16} height={plot.bottom - y(0.3)} role="value" />
            <PointMarker x={x(4)} y={y(0.5)} role="measurement" />
            <PointMarker x={x(6)} y={y(0.6)} role="measurement" shape="cross" />
            <DirectLabel x={x(10)} y={y(0.8) - 6} anchor="end" role="reference">target</DirectLabel>
          </ChartSvg>
          <ChartSvg width={WIDTH} height={150}>
            <SmallMultiples
              plot={{ left: 44, right: 460, top: 20, bottom: 118 }}
              labels={['left arm', 'right arm']}
              x={x}
              xTicks={[0, 5, 10]}
              xLabel="steps"
              renderPanel={(panel) => (
                <LineTrace
                  points={[[panel.left, panel.bottom], [panel.right, panel.top]]}
                  role="state"
                />
              )}
            />
          </ChartSvg>
        </FigureStage>
      }
    />
  );
}
