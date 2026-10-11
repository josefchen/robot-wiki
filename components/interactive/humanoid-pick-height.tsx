'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage, PresetGroup, type Preset } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  DirectLabel,
  StageAnnotation,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import { useEasedValue } from '@/components/motion/use-eased-value';
import { GR2_RESULTS, formatSuccess } from '@/lib/wbc-decomposition';
import { MOTION_STAGE } from '@/lib/motion-tokens';

/**
 * HumanoidPickHeight: Gemini Robotics 2's whole-body picks on Apollo 2
 * with Inspire hands, by where the object sits. Success falls the lower
 * the robot has to reach: 76.3% from a shelf, 68.4% from a table, 45.7%
 * from the floor, against 89.6% for gripper insertion on a fixed-base
 * Franka Duo. DeepMind's whole-body rates average several tasks per
 * category and are vendor-reported.
 *
 * The one control picks the object's place. The humanoid line drawing
 * glides between its standing reach and its crouch on the motion curve
 * (reduced motion jumps), and the matching bar takes the accent. Every
 * bar stays in view, so the order is the first thing the reader sees.
 * The drawing is illustrative; every rate comes from lib/wbc-decomposition.
 */

type PlaceId = 'shelf' | 'table' | 'floor';
const PLACES: readonly (Preset<PlaceId> & { task: string; words: string })[] = [
  { id: 'shelf', label: 'A shelf', task: 'pick from shelf', words: 'from a shelf' },
  { id: 'table', label: 'A table', task: 'pick from table', words: 'from a table' },
  { id: 'floor', label: 'The floor', task: 'pick from floor', words: 'from the floor' },
];
export const DEFAULT_PLACE: PlaceId = 'floor';

const rate = (task: string) => {
  const row = GR2_RESULTS.find((r) => r.task === task);
  if (!row) throw new Error(`HumanoidPickHeight: no Gemini Robotics 2 row "${task}"`);
  return row.success;
};
export const PICK_RATES: Record<PlaceId, number> = {
  shelf: rate('pick from shelf'),
  table: rate('pick from table'),
  floor: rate('pick from floor'),
};
export const INSERTION_RATE = rate('precise insertion');

const WIDTH = 340;
const HEIGHT = 246;
const GROUND = 200;
const ANKLE = { x: 58, y: GROUND - 4 };
const SHIN = 36;
const THIGH = 36;
const TORSO = 46;
const UPPER_ARM = 27;
const FOREARM = 27;

/** Segment directions in degrees (0 is to the right, 90 straight up), one pose per place. */
type Pose = readonly [shin: number, thigh: number, torso: number, upperArm: number, forearm: number];
const POSES: Record<PlaceId, Pose> = {
  shelf: [90, 90, 86, 42, 28],
  table: [90, 90, 74, -22, -10],
  floor: [55, 160, 30, -82, -88],
};
const ORDER: readonly PlaceId[] = ['shelf', 'table', 'floor'];

const f = (v: number) => Number(v.toFixed(2));
const rad = (deg: number) => (deg * Math.PI) / 180;
const step = (p: { x: number; y: number }, length: number, deg: number) => ({
  x: p.x + length * Math.cos(rad(deg)),
  y: p.y - length * Math.sin(rad(deg)),
});

/** The joints of the drawing at a pose. */
export function joints(pose: Pose) {
  const [shin, thigh, torso, upperArm, forearm] = pose;
  const knee = step(ANKLE, SHIN, shin);
  const hip = step(knee, THIGH, thigh);
  const shoulder = step(hip, TORSO, torso);
  const neck = step(shoulder, 5, torso);
  const head = step(neck, 9, torso);
  const elbow = step(shoulder, UPPER_ARM, upperArm);
  const hand = step(elbow, FOREARM, forearm);
  return { knee, hip, shoulder, neck, head, elbow, hand };
}

/** The pose a fractional place index (0 shelf, 1 table, 2 floor) eases through. */
function poseAt(index: number): Pose {
  const i = Math.max(0, Math.min(ORDER.length - 2, Math.floor(index)));
  const t = Math.max(0, Math.min(1, index - i));
  const a = POSES[ORDER[i]];
  const b = POSES[ORDER[i + 1]];
  return a.map((v, k) => v + (b[k] - v) * t) as unknown as Pose;
}

/** Where each object sits, under the hand of its pose. */
const OBJECT_AT: Record<PlaceId, { x: number; y: number }> = Object.fromEntries(
  ORDER.map((id) => {
    const { hand } = joints(POSES[id]);
    return [id, { x: f(hand.x - 6), y: f(hand.y + 3) }];
  }),
) as Record<PlaceId, { x: number; y: number }>;
const OBJECT = 12;

const BAR_LEFT = 186;
const BAR_RIGHT = 328;
const sx = linearScale([0, 100], [BAR_LEFT, BAR_RIGHT]);
/** Each bar sits at the height of its object. */
const BAR_Y: Record<PlaceId, number> = {
  shelf: f(OBJECT_AT.shelf.y + OBJECT / 2),
  table: f(OBJECT_AT.table.y + OBJECT / 2),
  floor: GROUND - 18,
};
const AXIS_Y = GROUND;
const TICKS = [0, 50, 100] as const;

function describe(place: PlaceId): string {
  const chosen = PLACES.find((p) => p.id === place)!;
  return `Gemini Robotics 2 on Apollo 2 with Inspire hands succeeds on ${formatSuccess(PICK_RATES[place])} of whole-body picks ${chosen.words}; picks from a shelf reach ${formatSuccess(PICK_RATES.shelf)}, from a table ${formatSuccess(PICK_RATES.table)} and from the floor ${formatSuccess(PICK_RATES.floor)}, against ${formatSuccess(INSERTION_RATE)} for gripper insertion on the Franka Duo.`;
}

function Furniture() {
  const ink = CHART_STRUCTURE.labelSecondary;
  const shelf = OBJECT_AT.shelf.y + OBJECT;
  const table = OBJECT_AT.table.y + OBJECT;
  return (
    <g data-scene-part="furniture" fill="none" stroke={ink} strokeWidth={CHART_STROKE.structure}>
      <line x1={OBJECT_AT.shelf.x - 8} y1={shelf} x2={164} y2={shelf} />
      <line x1={164} y1={shelf - 30} x2={164} y2={GROUND} />
      <line x1={OBJECT_AT.table.x - 8} y1={table} x2={150} y2={table} />
      <line x1={146} y1={table} x2={146} y2={GROUND} />
      <line x1={OBJECT_AT.table.x - 2} y1={table} x2={OBJECT_AT.table.x - 2} y2={GROUND} />
    </g>
  );
}

function Humanoid({ index }: { index: number }) {
  const ink = CHART_STRUCTURE.label;
  const { knee, hip, shoulder, neck, head, elbow, hand } = joints(poseAt(index));
  const pt = (p: { x: number; y: number }) => `${f(p.x)},${f(p.y)}`;
  return (
    <g data-testid="pick-humanoid" fill="none" stroke={ink} strokeWidth={CHART_STROKE.trace} strokeLinecap="round" strokeLinejoin="round">
      <line x1={ANKLE.x - 6} y1={GROUND} x2={ANKLE.x + 12} y2={GROUND} strokeWidth={CHART_STROKE.trace + 1} />
      <polyline points={`${pt(ANKLE)} ${pt(knee)} ${pt(hip)}`} />
      <line x1={f(hip.x)} y1={f(hip.y)} x2={f(shoulder.x)} y2={f(shoulder.y)} strokeWidth={CHART_STROKE.trace + 3} />
      <line x1={f(shoulder.x)} y1={f(shoulder.y)} x2={f(neck.x)} y2={f(neck.y)} />
      <circle cx={f(head.x)} cy={f(head.y)} r={7} fill={MOTION_STAGE.background} />
      <polyline points={`${pt(shoulder)} ${pt(elbow)} ${pt(hand)}`} />
      {[knee, hip, shoulder, elbow].map((j, k) => (
        <circle key={k} cx={f(j.x)} cy={f(j.y)} r={2.2} fill={MOTION_STAGE.background} strokeWidth={CHART_STROKE.structure} />
      ))}
    </g>
  );
}

export function HumanoidPickHeight({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const citationFor = useCitationLookup();
  const source = citationFor('gemini-robotics-2-2026');
  const [place, setPlace] = useState<PlaceId>(DEFAULT_PLACE);
  const index = useEasedValue(ORDER.indexOf(place));
  const accent = roleColour('highlight');
  const muted = roleColour('reference');
  const insertionX = f(sx(INSERTION_RATE));

  return (
    <InstrumentFigure
      figureId="humanoid-pick-height"
      className={className}
      kicker="Whole-body picking"
      heading="Lower objects are harder for a whole-body humanoid"
      controls={<PresetGroup label="The object sits on" presets={PLACES} value={place} onChange={setPlace} testId="pick-height-place" />}
      stage={
        <FigureStage footer={<StageStatus>Drawing illustrative; rates as published</StageStatus>}>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`A humanoid robot reaching for an object ${PLACES.find((p) => p.id === place)!.words}. Bars show how often its whole-body picks succeed: ${formatSuccess(PICK_RATES.shelf)} from a shelf, ${formatSuccess(PICK_RATES.table)} from a table, ${formatSuccess(PICK_RATES.floor)} from the floor.`}
            aria-describedby={descriptionId}
            data-testid="pick-height-stage"
          >
            <line x1={8} y1={GROUND} x2={170} y2={GROUND} stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure} />
            <Furniture />
            {ORDER.map((id) => (
              <rect
                key={id}
                data-testid={`pick-object-${id}`}
                data-chosen={id === place ? 'yes' : 'no'}
                x={OBJECT_AT[id].x}
                y={id === 'floor' ? GROUND - OBJECT : OBJECT_AT[id].y}
                width={OBJECT}
                height={OBJECT}
                fill={MOTION_STAGE.background}
                stroke={id === place ? accent : CHART_STRUCTURE.labelSecondary}
                strokeWidth={id === place ? CHART_STROKE.trace + 0.5 : CHART_STROKE.structure}
              />
            ))}
            <Humanoid index={index} />
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.slice(1).map((t) => (
                <line key={t} x1={f(sx(t))} y1={22} x2={f(sx(t))} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={BAR_LEFT} y1={AXIS_Y} x2={BAR_RIGHT} y2={AXIS_Y} />
            </g>
            {TICKS.map((t) => (
              <text key={t} data-scene-tick="" x={f(sx(t))} y={AXIS_Y + 6} dominantBaseline="hanging" textAnchor={t === 0 ? 'start' : t === 100 ? 'end' : 'middle'} fontSize={CHART_TYPE.tickPx} fill={CHART_STRUCTURE.labelSecondary}>
                {t}
              </text>
            ))}
            <text data-scene-axis="" x={BAR_RIGHT} y={AXIS_Y + 6} dy="1.5em" dominantBaseline="hanging" textAnchor="end" fontSize={CHART_TYPE.axisPx} fill={CHART_STRUCTURE.labelSecondary}>
              picks that succeeded (%)
            </text>
            <g data-series="insertion">
              <line x1={insertionX} y1={22} x2={insertionX} y2={AXIS_Y} stroke={muted} strokeWidth={CHART_STROKE.reference} strokeDasharray={CHART_STROKE.dash} />
              <text x={BAR_RIGHT} y={14} textAnchor="end" fontSize={CHART_TYPE.labelPx} fill="var(--role-reference-text)">
                gripper insertion {formatSuccess(INSERTION_RATE)}
              </text>
            </g>
            {PLACES.map((p) => {
              const y = BAR_Y[p.id];
              const chosen = p.id === place;
              const label = `${formatSuccess(PICK_RATES[p.id])} ${p.words}`;
              return (
                <g key={p.id} data-testid={`pick-bar-${p.id}`} data-chosen={chosen ? 'yes' : 'no'}>
                  <rect
                    data-chart-role={chosen ? 'highlight' : 'value'}
                    x={BAR_LEFT}
                    y={y - 2}
                    width={f(sx(PICK_RATES[p.id]) - BAR_LEFT)}
                    height={4}
                    fill={chosen ? accent : CHART_STRUCTURE.labelSecondary}
                  />
                  {chosen ? (
                    <StageAnnotation x={BAR_LEFT} y={y - 8} lines={[label]} />
                  ) : (
                    <DirectLabel x={BAR_LEFT} y={y - 8}>
                      {label}
                    </DirectLabel>
                  )}
                </g>
              );
            })}
          </PlotStage>
        </FigureStage>
      }
      caption={`Gemini Robotics 2's humanoid succeeded on ${Math.round(PICK_RATES.shelf)}% of shelf picks but ${Math.round(PICK_RATES.floor)}% of floor picks.`}
      method={
        <>
          <div>
            Google DeepMind reports Gemini Robotics 2 driving Apollo 2 with Inspire hands &quot;from feet to
            fingertips&quot;. Its whole-body rates average several tasks per category: picking from a shelf, from a
            table and from the floor. The dashed line is precise gripper insertion on the fixed-base Franka Duo with
            Robotiq grippers, under the same model. The rates are vendor-reported, with no external replication.
          </div>
          <div>The humanoid drawing and its poses are illustrative; they are not Apollo 2&apos;s measured motion.</div>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Whole-body pick success by where the object sits"
            description={describe(place)}
            rowHeader="object sits on"
            columns={[{ header: 'picks that succeeded (%)', numeric: true }]}
            rows={[
              ...PLACES.map((p) => ({ label: p.label.toLowerCase(), values: [PICK_RATES[p.id].toFixed(1)] })),
              { label: 'gripper insertion (Franka Duo)', values: [INSERTION_RATE.toFixed(1)] },
            ]}
          />
        </>
      }
      source={
        <span data-testid="pick-height-source">
          {source ? (
            <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener" className="underline-offset-2">
              {source.label}
            </a>
          ) : (
            'Google DeepMind, Gemini Robotics 2'
          )}
          , vendor-reported.
        </span>
      }
    />
  );
}
