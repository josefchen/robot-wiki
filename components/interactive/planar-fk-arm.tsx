'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import {
  DEFAULT_ANGLES_DEG,
  JOINT_LIMIT_DEG,
  LINK_LENGTHS,
  planarForwardKinematics,
  totalReach,
} from '@/lib/planar-fk';

/**
 * PlanarFkArm: the 2D forward-kinematics visualizer for the classical
 * kinematics module. Three revolute joints drive a planar arm; sliders set
 * each joint angle relative to its parent link, and the readout reports the
 * joint angles plus the end-effector position computed by the running sum
 * of link vectors (the planar form of the FK transform product).
 *
 * Interactive contract: typed props, deterministic render, visible numeric
 * readouts, reset control, keyboard-accessible native sliders with ARIA
 * labels, fixed viewBox (no layout shift), no JS-driven motion (scrub-only,
 * reduced-motion safe by construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 246;
const ORIGIN_X = 170;
const ORIGIN_Y = 130;
const REACH = totalReach(LINK_LENGTHS);
// The reach disc keeps 100 units of radius so the axis names sit outside it.
const REACH_PX = 100;
const SCALE = REACH_PX / REACH;
const LINK_WIDTH = CHART_STROKE.trace * 2.5;

const JOINT_META = [
  { id: 'fk-joint-1', label: 'Base joint' },
  { id: 'fk-joint-2', label: 'Elbow joint' },
  { id: 'fk-joint-3', label: 'Wrist joint' },
] as const;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

/** Signed fixed-point readout, instrument style: "+0.42" / "-1.03". */
function formatSigned(v: number): string {
  const s = v.toFixed(2);
  return s.startsWith('-') ? s : `+${s}`;
}

function toSvgX(x: number): number {
  return f(ORIGIN_X + x * SCALE);
}

function toSvgY(y: number): number {
  return f(ORIGIN_Y - y * SCALE);
}

const structure = {
  stroke: CHART_STRUCTURE.axes,
  strokeWidth: CHART_STROKE.structure,
  opacity: CHART_STRUCTURE.axesOpacity,
};

/** The base frame and the reachable-workspace boundary: fixed geometry. */
function Workspace() {
  const reference = roleColour('reference');
  return (
    <>
      <g data-scene-structure="base-frame">
        <line x1={ORIGIN_X - REACH_PX} y1={ORIGIN_Y} x2={ORIGIN_X + REACH_PX} y2={ORIGIN_Y} {...structure} />
        <line x1={ORIGIN_X} y1={ORIGIN_Y - REACH_PX} x2={ORIGIN_X} y2={ORIGIN_Y + REACH_PX} {...structure} />
      </g>
      <circle
        data-series="fk-reach"
        data-chart-role="reference"
        cx={ORIGIN_X}
        cy={ORIGIN_Y}
        r={REACH_PX}
        fill="none"
        stroke={reference}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <text
        data-scene-axis=""
        x={ORIGIN_X + REACH_PX + 6}
        y={ORIGIN_Y + 4}
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        +x
      </text>
      <text
        data-scene-axis=""
        x={ORIGIN_X + 6}
        y={ORIGIN_Y - REACH_PX - 6}
        fontSize={CHART_TYPE.axisPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        +y
      </text>
      <text
        data-scene-note=""
        x={WIDTH - 6}
        y={HEIGHT - 8}
        textAnchor="end"
        fontSize={CHART_TYPE.axisPx}
        fill={reference}
      >
        reach {REACH.toFixed(2)}
      </text>
    </>
  );
}

export function PlanarFkArm({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const [angles, setAngles] = useState<number[]>([...DEFAULT_ANGLES_DEG]);

  const { pivots, effector } = planarForwardKinematics(LINK_LENGTHS, angles);

  // Rendering chain: base pivot, intermediate joints, then the effector tip.
  const points = [...pivots, effector];

  function setJoint(index: number, value: number): void {
    setAngles((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function reset(): void {
    setAngles([...DEFAULT_ANGLES_DEG]);
  }

  const state = roleColour('state');
  const highlight = roleColour('highlight');

  return (
    <InstrumentFigure
      figureId="planar-fk-arm"
      className={className}
      heading="Three-link planar arm"
      controls={
        <>
          {JOINT_META.map((joint, i) => (
            <ControlField key={joint.id}>
              <ControlLabel
                htmlFor={joint.id}
                value={
                  <span data-testid={`fk-theta-${i + 1}`}>{angles[i]}°</span>
                }
              >
                {joint.label}
              </ControlLabel>
              <input
                id={joint.id}
                type="range"
                data-brand-control-id="control:input"
                min={-JOINT_LIMIT_DEG}
                max={JOINT_LIMIT_DEG}
                step={1}
                value={angles[i]}
                onChange={(e) => setJoint(i, Number(e.target.value))}
                aria-label={`${joint.label} angle in degrees, currently ${angles[i]}`}
                className={INSTRUMENT_SLIDER_CLASS}
              />
            </ControlField>
          ))}
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="fk-links" swatch={<LegendSwatch role="state" mark="line" />}>
                  links
                </LegendItem>
                <LegendItem series="fk-effector" swatch={<LegendSwatch role="highlight" mark="dot" />}>
                  current end-effector position
                </LegendItem>
                <LegendItem series="fk-reach" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  reach
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                end effector x{' '}
                <span data-testid="fk-ee-x" style={{ color: highlight }}>
                  {formatSigned(effector.x)}
                </span>{' '}
                y{' '}
                <span data-testid="fk-ee-y" style={{ color: highlight }}>
                  {formatSigned(effector.y)}
                </span>{' '}
                link units
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current arm pose"
                description={`With base ${angles[0]} degrees, elbow ${angles[1]} degrees and wrist ${angles[2]} degrees the end effector sits at x ${formatSigned(effector.x)}, y ${formatSigned(effector.y)} link units; those three link lengths are 1.00, 0.75 and 0.55.`}
                states={[
                  { label: 'base', value: `${angles[0]}°` },
                  { label: 'elbow', value: `${angles[1]}°` },
                  { label: 'wrist', value: `${angles[2]}°` },
                  { label: 'end effector x', value: formatSigned(effector.x) },
                  { label: 'end effector y', value: formatSigned(effector.y) },
                ]}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Planar three-link arm. Base angle ${angles[0]} degrees, elbow ${angles[1]} degrees, wrist ${angles[2]} degrees. End effector at x ${formatSigned(effector.x)}, y ${formatSigned(effector.y)} link units.`}
            aria-describedby={descriptionId}
          >
            <Workspace />
            <g data-series="fk-links" data-chart-role="state">
              {points.slice(0, -1).map((p, i) => {
                const q = points[i + 1];
                return (
                  <line
                    key={`link-${i}`}
                    data-testid={`fk-link-${i + 1}`}
                    x1={toSvgX(p.x)}
                    y1={toSvgY(p.y)}
                    x2={toSvgX(q.x)}
                    y2={toSvgY(q.y)}
                    stroke={state}
                    strokeWidth={LINK_WIDTH}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Joint hubs: the base ring, then the elbow and wrist pivots. */}
              {pivots.map((p, i) => (
                <circle
                  key={`joint-${i}`}
                  cx={toSvgX(p.x)}
                  cy={toSvgY(p.y)}
                  r={i === 0 ? LINK_WIDTH + 2 : LINK_WIDTH - 0.5}
                  fill={i === 0 ? 'none' : state}
                  stroke={i === 0 ? state : 'none'}
                  strokeWidth={i === 0 ? CHART_STROKE.trace : 0}
                />
              ))}
            </g>
            <g
              data-testid="fk-effector-marker"
              data-series="fk-effector"
              data-chart-role="highlight"
              data-selection="end effector"
            >
              <circle
                cx={toSvgX(effector.x)}
                cy={toSvgY(effector.y)}
                r={CHART_STROKE.markerRadius + 3}
                fill="none"
                stroke={highlight}
                strokeWidth={CHART_STROKE.trace}
              />
              <circle
                cx={toSvgX(effector.x)}
                cy={toSvgY(effector.y)}
                r={CHART_STROKE.markerRadius - 1.5}
                fill={highlight}
              />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption="Each joint angle is relative to its parent link, so moving the base joint swings the whole arm."
      source="Computed schematic on chosen link lengths 1.00, 0.75 and 0.55; the tip is the running sum of the three link vectors."
    />
  );
}
