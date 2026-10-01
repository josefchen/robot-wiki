import type { ReactNode } from 'react';
import {
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  ChartAxes,
  DirectLabel,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import { PlotStage } from '@/components/ui/instrument';

/**
 * The site's original schematics, drawn on the figure stage so their labels
 * use the stage type scale. An image file cannot: its text is set in the
 * file and shrinks with the picture. The registry in data/images.ts stays
 * the record for each drawing (alt text, credit, licence); the alt text is
 * the drawing's accessible name.
 */
export type OriginalSchematic = {
  /** The frame title: a short noun phrase. */
  title: string;
  /** The frame's one caption line, 20 words or fewer. */
  caption: string;
  /** Draws the stage; `describedBy` is the id of the frame's caption. */
  draw: (label: string, describedBy: string) => ReactNode;
};

const W = CHART_VIEW_WIDTH;
const LEFT = 16;
const RIGHT = W - LEFT;
/** Baseline offset that centres a tick-size label on a row. */
const TICK_MIDLINE = CHART_TYPE.tickPx * 0.36;

function StageNote({
  x,
  y,
  anchor = 'start',
  children,
}: {
  x: number;
  y: number;
  anchor?: 'start' | 'end';
  children: ReactNode;
}) {
  return (
    <text
      data-scene-note=""
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={CHART_TYPE.axisPx}
      fill={CHART_STRUCTURE.labelSecondary}
    >
      {children}
    </text>
  );
}

function RowLabel({ y, children }: { y: number; children: ReactNode }) {
  return (
    <text
      data-scene-tick=""
      x={LEFT}
      y={y + TICK_MIDLINE}
      fontSize={CHART_TYPE.tickPx}
      fill={CHART_STRUCTURE.labelSecondary}
    >
      {children}
    </text>
  );
}

/*
 * Covariate shift. The curves keep the shapes of the first drawing: a
 * corridor of demonstrated states, three demonstrations inside it, and a
 * rollout that starts on a demonstration and drifts out. The ring sits
 * where the rollout crosses the corridor's lower edge.
 */
const COVARIATE_HEIGHT = 174;
const CORRIDOR =
  'M16 46.6 C93 4.6 159 88.6 324 39.6 L324 76 C159 125 93 41 16 83 Z';
const DEMONSTRATIONS = [
  'M16 62 C93 24.2 159 102.6 324 60.6',
  'M16 67.6 C93 20 159 111 324 55',
  'M16 64.8 C93 29.8 159 97 324 66.2',
];
const ROLLOUT = 'M16 64.8 C71 32.6 115 78.8 159 111 C203 143.2 258 140.4 305.3 132';
const EXIT = { x: 114.4, y: 77.4 };
const EXIT_LABEL_Y = 160;

function CovariateShiftDrawing({ label, describedBy }: { label: string; describedBy: string }) {
  const ringRadius = CHART_STROKE.markerRadius + 2;
  return (
    <PlotStage
      viewBox={`0 0 ${W} ${COVARIATE_HEIGHT}`}
      aria-label={label}
      aria-describedby={describedBy}
    >
      <g data-series="demonstrations">
        <path
          data-chart-mark="band"
          data-chart-role="reference"
          d={CORRIDOR}
          fill={roleColour('reference')}
          fillOpacity={CHART_UNCERTAINTY.fillAlpha}
          stroke="none"
        />
        {DEMONSTRATIONS.map((d) => (
          <path
            key={d}
            data-chart-mark="line"
            data-chart-role="reference"
            d={d}
            fill="none"
            stroke={roleColour('reference')}
            strokeWidth={CHART_STROKE.reference}
            strokeDasharray={CHART_STROKE.dash}
          />
        ))}
        <DirectLabel x={LEFT} y={23} role="reference">
          expert demonstrations (training)
        </DirectLabel>
      </g>
      <g data-series="policy-rollout">
        <path
          data-chart-mark="line"
          data-chart-role="state"
          d={ROLLOUT}
          fill="none"
          stroke={roleColour('state')}
          strokeWidth={CHART_STROKE.trace}
          strokeLinecap="round"
        />
        <DirectLabel x={RIGHT} y={124} role="state" anchor="end">
          policy rollout
        </DirectLabel>
      </g>
      <g data-scene-structure="leader">
        <line
          x1={EXIT.x}
          x2={EXIT.x}
          y1={EXIT.y + ringRadius + 3}
          y2={EXIT_LABEL_Y - CHART_TYPE.labelPx * CHART_TYPE.ascent - 3}
          stroke={CHART_STRUCTURE.axes}
          strokeWidth={CHART_STROKE.structure}
          opacity={CHART_STRUCTURE.axesOpacity}
        />
      </g>
      <g>
        <circle
          data-chart-mark="halo"
          data-chart-role="highlight"
          cx={EXIT.x}
          cy={EXIT.y}
          r={ringRadius}
          fill="none"
          stroke={roleColour('highlight')}
          strokeWidth={CHART_STROKE.trace}
        />
        <DirectLabel x={LEFT} y={EXIT_LABEL_Y} role="highlight">
          leaves the training distribution
        </DirectLabel>
      </g>
    </PlotStage>
  );
}

/*
 * Temporal ensembling. Three chunks issued one step apart each hold a
 * prediction for the current step t, and the bars below weight those three
 * predictions oldest first. The drawing uses a larger m than the reference
 * code so the three weights differ visibly; the notes say so.
 */
const TE_HEIGHT = 290;
const TE_LEFT = 112;
const TE_AXIS_Y = 100;
const CHUNK_STEPS = 3;
const CHUNK_HEIGHT = 12;
const BAR_HEIGHT = 10;
const BAR_SCALE = 150;
const ILLUSTRATIVE_M = 0.5;
const REFERENCE_M = 0.01;
const WEIGHTS_Y = 167;
const step = linearScale([-2, 3], [TE_LEFT, RIGHT]);

function stepName(s: number): string {
  if (s === 0) return 't';
  return s > 0 ? `t+${s}` : `t-${-s}`;
}

const CHUNKS = [-2, -1, 0].map((issued, i) => ({
  issued,
  label: `issued at ${stepName(issued)}`,
  weight: Math.exp(-ILLUSTRATIVE_M * i),
  chunkY: 44 + i * 20,
  barY: 186 + i * 20,
}));

function TemporalEnsemblingDrawing({ label, describedBy }: { label: string; describedBy: string }) {
  const now = step(0);
  return (
    <PlotStage viewBox={`0 0 ${W} ${TE_HEIGHT}`} aria-label={label} aria-describedby={describedBy}>
      <text
        data-scene-axis=""
        x={LEFT}
        y={22}
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.label}
      >
        chunks in flight
      </text>
      <ChartAxes
        plot={{ left: TE_LEFT, right: RIGHT, top: 30, bottom: TE_AXIS_Y }}
        x={step}
        y={(value) => value}
        xTicks={[-2, -1, 0, 1, 2]}
        formatX={stepName}
        xLabel="control steps"
        grid={false}
        yAxis={false}
      />
      {CHUNKS.map((chunk) => (
        <g key={chunk.issued}>
          <RowLabel y={chunk.chunkY}>{chunk.label}</RowLabel>
          <rect
            data-chart-mark="span"
            data-chart-role="action"
            x={step(chunk.issued)}
            y={chunk.chunkY - CHUNK_HEIGHT / 2}
            width={step(chunk.issued + CHUNK_STEPS) - step(chunk.issued)}
            height={CHUNK_HEIGHT}
            fill="none"
            stroke={roleColour('action')}
            strokeWidth={CHART_STROKE.reference}
          />
        </g>
      ))}
      <g>
        <line
          data-chart-mark="line"
          data-chart-role="highlight"
          x1={now}
          x2={now}
          y1={30}
          y2={TE_AXIS_Y}
          stroke={roleColour('highlight')}
          strokeWidth={CHART_STROKE.reference}
          strokeDasharray={CHART_STROKE.dash}
        />
        {CHUNKS.map((chunk) => (
          <circle
            key={chunk.issued}
            data-chart-mark="dot"
            data-chart-role="highlight"
            cx={now}
            cy={chunk.chunkY}
            r={CHART_STROKE.markerRadius}
            fill={roleColour('highlight')}
          />
        ))}
        <DirectLabel x={now} y={22} role="highlight" anchor="middle">
          a_t
        </DirectLabel>
      </g>
      <text
        data-scene-axis=""
        x={LEFT}
        y={WEIGHTS_Y}
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.label}
      >
        ensemble weights
      </text>
      <StageNote x={RIGHT} y={WEIGHTS_Y} anchor="end">
        raw w_i = exp(-m i)
      </StageNote>
      {CHUNKS.map((chunk) => {
        const width = chunk.weight * BAR_SCALE;
        return (
          <g key={chunk.issued}>
            <RowLabel y={chunk.barY}>{chunk.label}</RowLabel>
            <Bar
              x={TE_LEFT}
              y={chunk.barY - BAR_HEIGHT / 2}
              width={width}
              height={BAR_HEIGHT}
              role="value"
            />
            <DirectLabel x={TE_LEFT + width + 6} y={chunk.barY + 5} role="value">
              {chunk.weight.toFixed(2)}
            </DirectLabel>
          </g>
        );
      })}
      <StageNote x={LEFT} y={257}>
        oldest first; divide by sum
      </StageNote>
      <StageNote x={LEFT} y={276}>
        {`illustration m=${ILLUSTRATIVE_M}; reference m=${REFERENCE_M}`}
      </StageNote>
    </PlotStage>
  );
}

/** The inline drawings, keyed by image registry id. */
export const ORIGINAL_SCHEMATICS: Readonly<Record<string, OriginalSchematic>> = {
  'covariate-shift': {
    title: 'Covariate shift',
    caption:
      'Each small error moves the policy into states the expert never visited, where its next error is larger.',
    draw: (label, describedBy) => <CovariateShiftDrawing label={label} describedBy={describedBy} />,
  },
  'temporal-ensembling': {
    title: 'Temporal ensembling',
    caption:
      'Three overlapping chunks each predict the current action; the oldest gets the largest weight.',
    draw: (label, describedBy) => (
      <TemporalEnsemblingDrawing label={label} describedBy={describedBy} />
    ),
  },
};
