import { Bar, ChartSvg, DirectLabel } from '@/components/motion/chart';
import { FigureFrame, FigureStage } from '@/components/motion/figure-frame';
import { COMPANIES } from '@/data/companies';
import { SEGMENT_LABELS, SEGMENT_ORDER, segmentCounts } from '@/lib/market-map';

const WIDTH = 320;
const ROW = 24;
const LABEL_WIDTH = 160;
const BAR_HEIGHT = 12;
/** Room after the longest bar for its count. */
const COUNT_ROOM = 30;

/**
 * The market map's static poster on home: every company in the registry,
 * counted by segment, drawn on the shared graphite stage. The counts are
 * computed from `data/companies` at build time, so the poster shows the
 * map's real contents rather than a placeholder of it.
 */
export function MarketMapPoster({ className }: { className?: string }) {
  const counts = segmentCounts(COMPANIES);
  const most = Math.max(...SEGMENT_ORDER.map((segment) => counts[segment]));
  const span = WIDTH - LABEL_WIDTH - COUNT_ROOM;
  const height = SEGMENT_ORDER.length * ROW;

  return (
    <FigureFrame
      figureId="preview:market-map"
      className={className}
      heading="Companies per segment"
      caption={`All ${COMPANIES.length} companies on the market map, counted by segment.`}
      stage={
        <FigureStage className="px-3 py-2">
          <ChartSvg width={WIDTH} height={height}>
            {SEGMENT_ORDER.map((segment, index) => {
              const top = index * ROW;
              const length = (counts[segment] / most) * span;
              const baseline = top + ROW / 2 + 5;
              return (
                <g key={segment}>
                  <DirectLabel x={0} y={baseline}>
                    {SEGMENT_LABELS[segment]}
                  </DirectLabel>
                  <Bar
                    x={LABEL_WIDTH}
                    y={top + (ROW - BAR_HEIGHT) / 2}
                    width={length}
                    height={BAR_HEIGHT}
                    role="measurement"
                  />
                  <DirectLabel x={LABEL_WIDTH + length + 6} y={baseline}>
                    {counts[segment]}
                  </DirectLabel>
                </g>
              );
            })}
          </ChartSvg>
        </FigureStage>
      }
    />
  );
}
