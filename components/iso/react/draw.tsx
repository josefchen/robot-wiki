/*
 * Server-safe drawing components for the isometric figure kit. Copied from
 * the kit's react/draw.tsx (MIT, see components/iso/LICENSE). Changes: the
 * kit's own card (Plate and its legend swatches) is removed, because an
 * isometric figure sits in the site's figure frame, and IsoFigure takes the
 * id of the words that describe the drawing and an optional phone fit.
 */
import * as React from "react";
import { pathOf, type Flat, type LineTone, type SolidPaths, type Tone } from "../iso-kit";
import type { PhoneFit } from "../phone-fit";
import { Stage } from "./live";

interface SolidProps {
  paths: SolidPaths;
  tone?: Tone;
  crease?: Tone | "none";
  halo?: boolean;
  lit?: boolean;
  flat?: boolean;
  /** A dashed outline, so a part reads apart from a like-shaped neighbour without colour. */
  dashed?: boolean;
  className?: string;
  inner?: React.ReactNode;
  children?: React.ReactNode;
}

export function Solid({ paths, tone = "hi", crease = "faint", halo = false, lit = false, flat = false, dashed, className, inner, children }: SolidProps) {
  return (
    <g className={className ? `iso-solid ${className}` : "iso-solid"} data-lit={lit ? "" : undefined}>
      {halo ? <path className="iso-halo" d={paths.fill} /> : null}
      <path className="iso-fill" d={paths.fill} />
      {flat ? null : paths.shades.map((d, shade) => (d ? <path key={shade} className="iso-shade" data-shade={shade} d={d} /> : null))}
      {flat ? null : <path className="iso-top" d={paths.top} />}
      {crease === "none" || !paths.crease ? null : <path className="iso-line iso-crease" data-tone={crease} d={paths.crease} />}
      {crease === "none" || !paths.bevel ? null : <path className="iso-line iso-bevel" data-tone={crease} d={paths.bevel} />}
      {inner}
      <path className="iso-line iso-edge" data-tone={tone} data-dashed={dashed ? "" : undefined} d={paths.outline} />
      {children}
    </g>
  );
}

interface LineProps {
  d: string;
  tone?: LineTone;
  dotted?: boolean;
  dashed?: boolean;
  flow?: boolean;
  className?: string;
  free?: boolean | "start" | "end";
}

export function Line({ d, tone = "lo", dotted = false, dashed = false, flow = false, className, free }: LineProps) {
  if (!d) return null;
  return (
    <path
      className={className ? `iso-line ${className}` : "iso-line"}
      data-tone={tone}
      data-dotted={dotted ? "" : undefined}
      data-dashed={dashed ? "" : undefined}
      data-flow={flow ? "" : undefined}
      data-free={free === true ? "" : free || undefined}
      d={d}
    />
  );
}

interface WireProps {
  from: Flat;
  to: Flat;
  via?: Flat[];
  tone?: LineTone;
  dotted?: boolean;
  dashed?: boolean;
  flow?: boolean;
  ends?: "both" | "from" | "to" | "none";
  size?: number;
}

const tenth = (value: number) => Math.round(value * 10) / 10;

export function Wire({ from, to, via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 }: WireProps) {
  return (
    <g className="iso-wire" data-tone={tone}>
      <Line d={pathOf([from, ...via, to])} tone={tone} dotted={dotted} dashed={dashed} flow={flow} />
      {ends === "both" || ends === "from" ? <circle className="iso-wire-end" cx={tenth(from[0])} cy={tenth(from[1])} r={size} /> : null}
      {ends === "both" || ends === "to" ? <circle className="iso-wire-end" cx={tenth(to[0])} cy={tenth(to[1])} r={size} /> : null}
    </g>
  );
}

export function Dots({ points, size = 0.5, tone = "mid", pulse = false }: { points: Flat[]; size?: number; tone?: Tone; pulse?: boolean }) {
  return (
    <g className="iso-dots" data-tone={tone}>
      {points.map(([x, y], index) => (
        <circle
          key={index}
          cx={tenth(x)}
          cy={tenth(y)}
          r={size}
          data-pulse={pulse ? "" : undefined}
          style={pulse ? ({ "--pulse-at": `${(index * 137) % 1600}ms` } as React.CSSProperties) : undefined}
        />
      ))}
    </g>
  );
}

export function FaceText({
  transform,
  children,
  size = 3,
  tone = "mid",
  anchor = "start",
}: {
  transform: string;
  children: React.ReactNode;
  size?: number;
  tone?: Tone;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text className="iso-face-text" data-tone={tone} transform={transform} fontSize={size} textAnchor={anchor}>
      {children}
    </text>
  );
}

interface IsoFigureProps {
  width: number;
  height: number;
  label: string;
  /**
   * Id of the element that describes the drawing in words: the figure's chart description, or, for a
   * drawing with no data behind it, the method paragraph that explains how to read the drawing.
   */
  describedBy?: string;
  /**
   * The machine's own window, shown on a phone in place of the full viewBox
   * (components/iso/phone-fit.ts). Only for a drawing narrower than its viewBox.
   */
  fit?: PhoneFit;
  className?: string;
  children: React.ReactNode;
}

export function IsoFigure({ width, height, label, describedBy, fit, className, children }: IsoFigureProps) {
  return (
    <Stage className={className ? `iso-stage ${className}` : "iso-stage"}>
      <svg
        className="iso-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        aria-describedby={describedBy}
        focusable="false"
        data-phone-fit={fit ? "" : undefined}
        style={fit ? ({ "--iso-fit-aspect": fit.aspect, "--iso-fit-transform": fit.transform } as React.CSSProperties) : undefined}
      >
        {fit ? <g className="iso-fit">{children}</g> : children}
      </svg>
    </Stage>
  );
}
