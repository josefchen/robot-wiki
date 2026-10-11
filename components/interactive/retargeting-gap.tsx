'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  PlotStage,
  SliderRow,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, DirectLabel, StageAnnotation, roleColour } from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * RetargetingGap: why human motion copied onto a robot needs fixing
 * before a tracking policy learns from it. A person's walking pose is
 * copied joint for joint onto a robot whose legs are a different length,
 * keeping the person's hip height. A shorter robot's feet then float above
 * the floor; a longer robot's sink into it. Retargeting studies report
 * such artifacts (foot sliding, penetration) and find that they reduce
 * tracking-policy robustness; H2O filters out motions a privileged
 * imitator cannot track.
 *
 * The one control is the robot's leg length compared with the person's.
 * The robot redraws at once and the gap between its foot and the floor
 * glides to its new size on the motion curve; reduced motion jumps. The
 * bodies and the 90 centimetre hip height are illustrative.
 */

export const RATIO_MIN = 70;
export const RATIO_MAX = 130;
export const DEFAULT_RATIO = 75;
/** Illustrative hip height of the person, in centimetres. */
export const PERSON_HIP_CM = 90;

/** How far the robot's lower foot sits from the floor, in cm: positive floats, negative sinks. */
export const footGapCm = (ratioPercent: number) => Math.round(PERSON_HIP_CM * (1 - ratioPercent / 100));

const WIDTH = 340;
const HEIGHT = 238;
const FLOOR = 204;
const PERSON_X = 60;
const ROBOT_X = 170;
/** The text column right of the robot, and the gap bracket just left of it. */
const TEXT_X = 238;
const BRACKET_X = 228;
/** The person's leg: thigh and shin lengths, and the walking pose's angles from straight down (degrees). */
const THIGH = 46;
const SHIN = 46;
const FRONT_HIP = 22;
const FRONT_KNEE = -6;
const BACK_HIP = -18;
const BACK_KNEE = -16;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Height of the hip above the lower foot for a leg scaled by `scale`. */
const legDrop = (scale: number) =>
  Math.max(
    scale * (THIGH * Math.cos(rad(FRONT_HIP)) + SHIN * Math.cos(rad(FRONT_HIP + FRONT_KNEE))),
    scale * (THIGH * Math.cos(rad(BACK_HIP)) + SHIN * Math.cos(rad(BACK_HIP + BACK_KNEE))),
  );
/** The person stands on the floor; the hip height is copied to the robot. */
const HIP_Y = FLOOR - legDrop(1);
const f = (v: number) => Number(v.toFixed(2));

function leg(hipX: number, scale: number, hipDeg: number, kneeDeg: number) {
  const knee = { x: hipX + scale * THIGH * Math.sin(rad(hipDeg)), y: HIP_Y + scale * THIGH * Math.cos(rad(hipDeg)) };
  const foot = { x: knee.x + scale * SHIN * Math.sin(rad(hipDeg + kneeDeg)), y: knee.y + scale * SHIN * Math.cos(rad(hipDeg + kneeDeg)) };
  return { knee, foot };
}

/** A walking figure from the hip up and down, every length scaled by `scale`. */
function Body({ x, scale, dashed, testId }: { x: number; scale: number; dashed?: boolean; testId: string }) {
  const ink = dashed ? roleColour('reference') : CHART_STRUCTURE.label;
  const front = leg(x, scale, FRONT_HIP, FRONT_KNEE);
  const back = leg(x, scale, BACK_HIP, BACK_KNEE);
  const shoulderY = HIP_Y - scale * 52;
  const pt = (p: { x: number; y: number }) => `${f(p.x)},${f(p.y)}`;
  return (
    <g
      data-testid={testId}
      fill="none"
      stroke={ink}
      strokeWidth={CHART_STROKE.trace}
      strokeDasharray={dashed ? CHART_STROKE.dash : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points={`${pt({ x, y: HIP_Y })} ${pt(back.knee)} ${pt(back.foot)} ${f(back.foot.x + 10 * scale)},${f(back.foot.y)}`} />
      <polyline points={`${pt({ x, y: HIP_Y })} ${pt(front.knee)} ${pt(front.foot)} ${f(front.foot.x + 10 * scale)},${f(front.foot.y)}`} />
      <line x1={x} y1={HIP_Y} x2={x} y2={f(shoulderY)} strokeWidth={CHART_STROKE.trace + (dashed ? 0 : 2)} />
      <polyline points={`${x},${f(shoulderY + 4)} ${f(x - 10 * scale)},${f(shoulderY + 24 * scale)} ${f(x - 4 * scale)},${f(shoulderY + 44 * scale)}`} />
      <circle cx={x} cy={f(shoulderY - 11 * scale)} r={f(8 * scale)} fill={MOTION_STAGE.background} />
    </g>
  );
}

function describe(ratio: number): string {
  const gap = footGapCm(ratio);
  const where = gap > 0 ? `float ${gap} cm above the floor` : gap < 0 ? `sink ${-gap} cm into the floor` : 'land on the floor';
  return `Copying a person's walking pose joint for joint, with the person's 90 cm hip height, onto a robot whose legs are ${ratio}% as long makes its feet ${where}; only at 100% do they land exactly.`;
}

const SAMPLE_RATIOS = [70, 85, 100, 115, 130] as const;

export function RetargetingGap({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const sliderId = `${uid}-ratio`;
  const citationFor = useCitationLookup();
  const artifacts = citationFor('gmr-retargeting-2025');
  const filtering = citationFor('h2o-2024');
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const scale = useEasedValue(ratio / 100);
  const accent = roleColour('highlight');
  const gap = footGapCm(ratio);
  const footY = f(HIP_Y + legDrop(scale));
  const showGap = Math.abs(footY - FLOOR) > 1.5;
  const note = gap > 0 ? `Feet float ${gap} cm above the floor` : gap < 0 ? `Feet sink ${-gap} cm into the floor` : 'Same proportions: the feet land';
  const noteLines = gap > 0 ? ['Feet float', `${gap} cm up`] : gap < 0 ? ['Feet sink', `${-gap} cm down`] : ['Feet land'];
  const headTop = (k: number) => f(HIP_Y - k * 52 - 19 * k);

  return (
    <InstrumentFigure
      figureId="retargeting-gap"
      className={className}
      kicker="Motion retargeting"
      heading="Copied human poses misplace a robot's feet"
      controls={
        <SliderRow
          htmlFor={sliderId}
          label="Robot's leg length"
          value={<span data-testid="retargeting-ratio">{ratio}% as long</span>}
        >
          <input
            id={sliderId}
            type="range"
            data-brand-control-id="control:input"
            min={RATIO_MIN}
            max={RATIO_MAX}
            step={5}
            value={ratio}
            onChange={(e) => setRatio(Number(e.target.value))}
            aria-label={`Robot's leg length as a percentage of the person's, currently ${ratio}`}
            aria-valuetext={`${ratio}%; ${note.toLowerCase()}`}
            className={INSTRUMENT_SLIDER_CLASS}
          />
        </SliderRow>
      }
      stage={
        <FigureStage footer={<StageStatus>Illustrative bodies</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A person walking, and a robot given the same joint angles and hip height with legs ${ratio}% as long. ${note}.`}
            aria-describedby={descriptionId}
            data-testid="retargeting-stage"
          >
            <line x1={6} y1={FLOOR} x2={334} y2={FLOOR} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
            <line x1={PERSON_X - 40} y1={f(HIP_Y)} x2={BRACKET_X + 4} y2={f(HIP_Y)} stroke={CHART_STRUCTURE.labelSecondary} strokeWidth={CHART_STROKE.structure} strokeDasharray="2 4" />
            <text x={TEXT_X} y={f(HIP_Y + 4)} fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
              same hip height
            </text>
            <Body x={PERSON_X} scale={1} dashed testId="retargeting-person" />
            <Body x={ROBOT_X} scale={scale} testId="retargeting-robot" />
            <DirectLabel x={PERSON_X} y={f(headTop(1) - 8)} anchor="middle">
              person
            </DirectLabel>
            <DirectLabel x={ROBOT_X} y={f(headTop(scale) - 8)} anchor="middle">
              robot
            </DirectLabel>
            {showGap ? (
              <g data-testid="retargeting-gap" data-chart-role="highlight" stroke={accent} strokeWidth={CHART_STROKE.structure}>
                <line x1={BRACKET_X} y1={footY} x2={BRACKET_X} y2={FLOOR} />
                <line x1={BRACKET_X - 5} y1={footY} x2={BRACKET_X + 5} y2={footY} />
                <line x1={BRACKET_X - 5} y1={FLOOR} x2={BRACKET_X + 5} y2={FLOOR} />
              </g>
            ) : null}
            <StageAnnotation x={TEXT_X} y={FLOOR - 34} lines={noteLines} />
          </PlotStage>
        </FigureStage>
      }
      caption="Joint-for-joint copies onto other proportions leave robot feet floating or sunk, which hurts tracking policies."
      method={
        <>
          <div>
            Motion data from people is retargeted to a robot before a whole-body policy learns to track it. The
            simplest copy keeps the person&apos;s joint angles and hip height; on a robot with shorter legs the feet
            then float, and with longer legs they sink into the floor. Retargeting studies report artifacts such as
            foot sliding and self-penetration that significantly reduce tracking-policy robustness, particularly for
            dynamic or long sequences. H2O filters out retargeted motions that a privileged imitator cannot track.
          </div>
          <div>
            The bodies, the walking pose and the 90 cm hip height are illustrative; no robot&apos;s measurements are
            drawn.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Where the robot's feet end up"
            description={describe(ratio)}
            rowHeader="robot legs (% of the person's)"
            columns={[{ header: 'lower foot above the floor (cm)', numeric: true }]}
            rows={[...new Set([...SAMPLE_RATIOS, ratio])]
              .sort((a, b) => a - b)
              .map((r) => ({ label: String(r), values: [String(footGapCm(r))] }))}
          />
        </>
      }
      source={
        <span data-testid="retargeting-source">
          {artifacts ? (
            <a data-brand-control-id="control:link-focus" href={artifacts.url} target="_blank" rel="noopener" className="underline-offset-2">
              {artifacts.label}
            </a>
          ) : (
            'motion retargeting study'
          )}
          ;{' '}
          {filtering ? (
            <a data-brand-control-id="control:link-focus" href={filtering.url} target="_blank" rel="noopener" className="underline-offset-2">
              {filtering.label}
            </a>
          ) : (
            'H2O'
          )}
          .
        </span>
      }
    />
  );
}
