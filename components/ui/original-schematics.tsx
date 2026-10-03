import type { ReactNode } from 'react';
import {
  CHART_STROKE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  CHART_VIEW_WIDTH,
  DirectLabel,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { GripperGlyph } from '@/components/motion/gripper-glyph';
import { PlotStage } from '@/components/ui/instrument';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * The site's original schematics, drawn on the figure stage so their labels
 * use the stage type scale. An image file cannot: its text is set in the
 * file and shrinks with the picture. The registry in data/images.ts stays
 * the record for each drawing (alt text, credit, licence); the alt text is
 * the drawing's accessible name.
 */
export type OriginalSchematic = {
  /** The technical name above the headline, six words or fewer. */
  kicker: string;
  /** The frame headline: the drawing's takeaway, ten words or fewer. */
  heading: string;
  /** The frame's one caption line, 20 words or fewer. */
  caption: string;
  /** The method, terms and sources, inside "How this was made". */
  method: ReactNode;
  /** Draws the stage; `describedBy` is the id of the frame's caption. */
  draw: (label: string, describedBy: string) => ReactNode;
};

const W = CHART_VIEW_WIDTH;
const LEFT = 16;
const RIGHT = W - LEFT;
/** Stage units per CSS pixel of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const LABEL_ASCENT = CHART_TYPE.labelPx * TEXT_UNITS * CHART_TYPE.ascent;

/*
 * Covariate shift. The curves keep the shapes of the first drawing: a
 * corridor of demonstrated paths, three demonstrations inside it, and the
 * robot's own run that starts on a demonstration and drifts out. The note
 * points at where the run crosses the corridor's lower edge.
 */
const COVARIATE_HEIGHT = 192;
const CORRIDOR =
  'M16 46.6 C93 4.6 159 88.6 324 39.6 L324 76 C159 125 93 41 16 83 Z';
const DEMONSTRATIONS = [
  'M16 62 C93 24.2 159 102.6 324 60.6',
  'M16 67.6 C93 20 159 111 324 55',
  'M16 64.8 C93 29.8 159 97 324 66.2',
];
const ROLLOUT = 'M16 64.8 C71 32.6 115 78.8 159 111 C203 143.2 258 140.4 305.3 132';
const ROLLOUT_END = { x: 305.3, y: 132 };
/** Heading of the run's last segment, from its final control point. */
const ROLLOUT_HEADING = (Math.atan2(132 - 140.4, 305.3 - 258) * 180) / Math.PI;
const EXIT = { x: 114.4, y: 77.4 };
const EXIT_NOTE_Y = 154;

function CovariateShiftDrawing({ label, describedBy }: { label: string; describedBy: string }) {
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
          paths a person showed it
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
        <DirectLabel x={RIGHT + 8} y={118} role="state" anchor="end">
          the robot alone
        </DirectLabel>
      </g>
      <GripperGlyph
        x={ROLLOUT_END.x + 7}
        y={ROLLOUT_END.y + 1.2}
        angle={ROLLOUT_HEADING}
        size={13}
        testId="covariate-gripper"
      />
      <StageAnnotation
        x={LEFT}
        y={EXIT_NOTE_Y}
        lines={['First slip: from here on', 'it has no examples to copy']}
        from={[EXIT.x, EXIT_NOTE_Y - LABEL_ASCENT - 3]}
        target={[EXIT.x, EXIT.y]}
      />
    </PlotStage>
  );
}

/*
 * Temporal ensembling. Three plans the robot made at the last three steps
 * each suggest a move for now; the drawing fans the three suggestions out
 * of the gripper, each arrow as thick as its weight, and the move the robot
 * makes is their weighted blend. The drawing uses a larger m than the
 * reference code so the three weights differ visibly; the method says so.
 */
const TE_HEIGHT = 214;
const ILLUSTRATIVE_M = 0.5;
const REFERENCE_M = 0.01;
const GRIP = { x: 44, y: 120 };
const TIP_X = 168;
const ARROW_HEAD = 7;
const ARROW_WIDTH = 4;

const RAW_WEIGHTS = [0, 1, 2].map((i) => Math.exp(-ILLUSTRATIVE_M * i));
const WEIGHT_SUM = RAW_WEIGHTS.reduce((sum, weight) => sum + weight, 0);

const PLANS = [
  { name: 'oldest plan', tipY: 48 },
  { name: 'next plan', tipY: 120 },
  { name: 'newest plan', tipY: 192 },
].map((plan, i) => ({
  ...plan,
  weight: RAW_WEIGHTS[i],
  share: RAW_WEIGHTS[i] / WEIGHT_SUM,
}));

const BLEND_Y = PLANS.reduce((sum, plan) => sum + plan.share * plan.tipY, 0);

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/** A straight arrow from the gripper to (x, y), its head filled. */
function Arrow({
  x,
  y,
  width,
  role,
  testId,
  share,
}: {
  x: number;
  y: number;
  width: number;
  role: 'action' | 'highlight';
  testId?: string;
  share?: number;
}) {
  const angle = Math.atan2(y - GRIP.y, x - GRIP.x);
  const back = { x: x - ARROW_HEAD * Math.cos(angle), y: y - ARROW_HEAD * Math.sin(angle) };
  const spread = ARROW_HEAD * 0.6 + width / 2;
  const left = { x: back.x + spread * Math.sin(angle), y: back.y - spread * Math.cos(angle) };
  const right = { x: back.x - spread * Math.sin(angle), y: back.y + spread * Math.cos(angle) };
  const colour = roleColour(role);
  return (
    <g data-chart-mark="arrow" data-chart-role={role} data-testid={testId} data-share={share}>
      <line
        x1={GRIP.x + 4}
        y1={GRIP.y}
        x2={round2(back.x)}
        y2={round2(back.y)}
        stroke={colour}
        strokeWidth={round2(width)}
        strokeLinecap="round"
      />
      <path
        d={`M${round2(x)} ${round2(y)} L${round2(left.x)} ${round2(left.y)} L${round2(right.x)} ${round2(right.y)} Z`}
        fill={colour}
      />
    </g>
  );
}

function TemporalEnsemblingDrawing({ label, describedBy }: { label: string; describedBy: string }) {
  return (
    <PlotStage viewBox={`0 0 ${W} ${TE_HEIGHT}`} aria-label={label} aria-describedby={describedBy}>
      <g data-series="suggested-moves">
        {PLANS.map((plan) => (
          <g key={plan.name}>
            <Arrow
              x={TIP_X}
              y={plan.tipY}
              width={ARROW_WIDTH * plan.weight}
              role="action"
              testId="te-suggestion"
              share={round2(plan.share)}
            />
            <DirectLabel x={TIP_X + 10} y={plan.tipY + 5} role="action">
              {`${plan.name}, ${Math.round(plan.share * 100)}%`}
            </DirectLabel>
          </g>
        ))}
      </g>
      <g data-series="blended-move">
        <Arrow x={TIP_X + 4} y={BLEND_Y} width={CHART_STROKE.trace} role="highlight" testId="te-blend" />
      </g>
      <GripperGlyph x={GRIP.x} y={GRIP.y} size={16} testId="te-gripper" />
      <StageAnnotation x={TIP_X + 14} y={BLEND_Y + 5} lines={['the move it makes']} />
    </PlotStage>
  );
}

const CODE = 'font-mono text-xs';

/** The inline drawings, keyed by image registry id. */
export const ORIGINAL_SCHEMATICS: Readonly<Record<string, OriginalSchematic>> = {
  'covariate-shift': {
    kicker: 'Covariate shift',
    heading: 'One small slip, and the robot leaves familiar ground',
    caption:
      'Robots trained by copying only learn the situations they were shown; one slip lands them somewhere new, where slips grow.',
    method: (
      <>
        <p>
          A schematic, not data. A robot trained by behavior cloning learns from the states an
          expert visited (the shaded corridor of demonstrations). Running on its own, it visits
          its own states, and the two drift apart after its first mistake: from there it is
          outside anything it was trained on, so its next mistake is likely to be larger.
        </p>
        <p>
          The mismatch between the training states and the states the robot reaches is called
          covariate shift, or distribution shift. Ross, Gordon and Bagnell (2011) showed that the
          resulting cost can grow with the square of the task length, and proposed DAgger, which
          has an expert label the states the robot actually visits.
        </p>
      </>
    ),
    draw: (label, describedBy) => <CovariateShiftDrawing label={label} describedBy={describedBy} />,
  },
  'temporal-ensembling': {
    kicker: 'Temporal ensembling',
    heading: 'Three overlapping plans vote; the oldest gets the loudest voice',
    caption:
      'Blending several overlapping plans smooths the robot’s motion, so one odd prediction jerks the arm less.',
    method: (
      <>
        <p>
          A schematic, not data. In ACT the robot asks its policy for a fresh chunk of future moves
          at every control step, so the chunks issued at earlier steps each still hold a prediction
          for the current move. Temporal ensembling averages those predictions, and the oldest gets
          the largest weight.
        </p>
        <p>
          Counting from the oldest (i = 0), prediction i gets the raw weight{' '}
          <span className={CODE}>w_i = exp(−m·i)</span>; the weights are then divided by their sum.
          The drawing uses <span className={CODE}>m = {ILLUSTRATIVE_M}</span> so the three weights
          differ visibly: raw {PLANS.map((plan) => plan.weight.toFixed(2)).join(', ')}, which is{' '}
          {PLANS.map((plan) => `${Math.round(plan.share * 100)}%`).join(', ')} of the vote. The ACT
          reference code uses <span className={CODE}>m = {REFERENCE_M}</span>, which makes the
          weights almost equal.
        </p>
      </>
    ),
    draw: (label, describedBy) => (
      <TemporalEnsemblingDrawing label={label} describedBy={describedBy} />
    ),
  },
};
