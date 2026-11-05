import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readReleaseBuildStamp } from './brand-v2-release-build.ts';
import type { FrameEvidence } from '../tests/e2e/helpers/interactive-frame-evidence.ts';
export const RELEASE_FRAME_DATA_PATH = 'evidence/brand-v2/release/figure-data.json';
export const RELEASE_FRAME_VIEWPORTS = ['1440x900', '375x812'] as const;
const text = z.string();
const number = z.number().finite();
const swatch = z.object({
  tag: text,
  stroke: text.nullable(),
  fill: text.nullable(),
  dash: text.nullable(),
  strokeWidth: text.nullable(),
  points: text.nullable().optional(),
}).strict();
export const frameDataSchema = z.object({
  labels: z.array(z.object({
    seriesIds: z.array(text),
    via: z.enum(['label-for', 'legend']),
    visibleText: text,
    inPlot: z.boolean(),
    hidden: z.array(text)
  }).strict()),
  legend: z.array(z.object({
    text,
    seriesId: text.nullable(),
    swatch: swatch.nullable(),
    paintFailures: z.array(text).optional()
  }).strict()),
  series: z.record(text, z.object({
    paints: z.array(text),
    geometries: z.array(text),
    labelled: z.boolean(),
    marks: number.int().nonnegative()
  }).strict()),
  physicalNeedles: z.array(z.object({
    id: z.enum(['pendulum-gravity-arrow', 'pendulum-push-arrow']),
    topPaths: z.array(text),
    visible: z.boolean(),
  }).strict()).optional(),
  seriesDeclarations: z.array(text).optional(),
  accentMarks: z.array(z.object({
    seriesId: text.nullable(),
    onRole: z.boolean(),
    at: text
  }).strict()),
  retiredMarks: z.array(z.object({
    paint: text,
    at: text
  }).strict()),
  canvasCount: number.int().nonnegative(),
  circles: z.array(z.object({
    cx: number,
    cy: number,
    r: number
  }).strict()),
  seriesRects: z.array(z.object({
    seriesId: text,
    x: number,
    y: number,
    width: number,
    height: number
  }).strict()),
  text,
  sourceBindings: z.array(z.object({
    citationId: text.nullable(),
    href: text,
    label: text
  }).strict()),
  controls: z.array(z.object({
    index: number.int().nonnegative(),
    tag: text,
    type: text,
    id: text,
    testId: text,
    label: text,
    group: text.optional(),
    value: text.nullable(),
    min: text.nullable(),
    max: text.nullable(),
    step: text.nullable(),
    checked: z.boolean().nullable(),
    pressed: text.nullable(),
    selected: text.nullable(),
    disabled: z.boolean()
  }).strict()),
  readouts: z.array(z.object({
    key: text,
    text,
    visible: z.boolean()
  }).strict()),
  svgMarks: z.array(z.object({
    tag: text,
    seriesId: text.nullable(),
    testId: text,
    id: text,
    ownerTestId: text.optional(),
    overviewCell: text.optional(),
    effectiveOpacity: number.optional(),
    displayed: z.boolean().optional(),
    plotTransform: z.object({ a: number, b: number, c: number, d: number, e: number, f: number }).strict().nullable().optional(),
    attrs: z.record(text, text),
    viewBox: text
  }).strict()),
  svgTexts: z.array(z.object({
    seriesId: text.nullable(),
    text,
    x: number.nullable(),
    y: number.nullable(),
    testId: text,
    ownerTestId: text.optional(),
    overviewCell: text.optional(),
    dy: text.nullable().optional(),
    painted: z.boolean().optional(),
    paintFailures: z.array(text).optional(),
  }).strict()),
  htmlMarks: z.array(z.object({
    seriesId: text.nullable(),
    ownerTestId: text,
    tag: text,
    box: z.object({ x: number, y: number, width: number, height: number }).strict(),
    parentBox: z.object({ x: number, y: number, width: number, height: number }).strict(),
    widthStyle: text,
    opacity: number,
  }).strict()).optional(),
  methodCards: z.array(z.object({ id: text, text, visible: z.boolean(), paintFailures: z.array(text).optional() }).strict()).optional(),
  declaredBindings: z.array(z.object({
    element: text,
    attributes: z.record(text, text)
  }).strict()),
  tables: z.array(z.object({
    headers: z.array(text),
    thCount: number.int().nonnegative(),
    scopedThCount: number.int().nonnegative(),
    sortable: z.boolean(),
    ariaSortCount: number.int().nonnegative(),
    sortStates: z.array(z.object({ column: text, direction: text }).strict()).optional(),
    naCells: z.array(z.object({
      column: text
    }).strict()),
    notDisclosedColumns: z.array(text),
    notDisclosedCount: number.int().nonnegative(),
    blankCellCount: number.int().nonnegative(),
    approxCellCount: number.int().nonnegative(),
    numericColumns: z.array(z.object({
      header: text,
      rightAligned: z.boolean()
    }).strict()),
    cells: z.array(z.object({
      row: text,
      column: text,
      text
    }).strict())
  }).strict())
}).strict();
export type RawFrameData = z.infer<typeof frameDataSchema>;
export const releaseFrameSchema = frameDataSchema.extend({
  route: text.min(1),
  routeText: text,
  mountId: text.min(1),
  sourceId: text.min(1),
  viewport: z.enum(RELEASE_FRAME_VIEWPORTS)
}).strict();
export type ReleaseFrameReading = z.infer<typeof releaseFrameSchema>;
export const releaseFrameArtifactSchema = z.object({
  version: z.literal(1),
  sourceFingerprint: text.regex(/^[a-f0-9]{64}$/),
  exportFingerprint: text.regex(/^[a-f0-9]{64}$/),
  mountIds: z.array(text.min(1)).min(1),
  frames: z.array(releaseFrameSchema).min(1)
}).strict();
export type ReleaseFrameArtifact = z.infer<typeof releaseFrameArtifactSchema>;
export function readReleaseFrameData(root: string, mounts: readonly {
  id: string;
  sourceId: string;
  route: string;
}[], artifact?: unknown): ReleaseFrameArtifact {
  const build = readReleaseBuildStamp(root);
  return validateReleaseFrameData(artifact ?? JSON.parse(readFileSync(join(root, RELEASE_FRAME_DATA_PATH), 'utf8')), {
    source: build.sourceAfter,
    exported: build.exportFingerprint,
    mounts
  });
}
export function validateReleaseFrameData(input: unknown, expected: {
  source: string;
  exported: string;
  mounts: readonly {
    id: string;
    sourceId: string;
    route: string;
  }[];
}): ReleaseFrameArtifact {
  const artifact = releaseFrameArtifactSchema.parse(input);
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
  if (!expected.mounts.length) throw Error('empty independent frame population');
  if (artifact.sourceFingerprint !== expected.source || artifact.exportFingerprint !== expected.exported) throw Error('stale frame source/export evidence');
  if (!same(artifact.mountIds, expected.mounts.map(m => m.id))) throw Error('frame mount population differs');
  const wanted = expected.mounts.flatMap(m => RELEASE_FRAME_VIEWPORTS.map(v => m.id + '|' + v));
  if (!same(artifact.frames.map(f => f.mountId + '|' + f.viewport), wanted)) throw Error('missing, extra or duplicate frame/viewport');
  for (const f of artifact.frames) {
    const m = expected.mounts.find(m => m.id === f.mountId)!;
    if (f.sourceId !== m.sourceId || f.route !== m.route) throw Error('misbound frame ' + f.mountId);
  }
  return artifact;
}
/** Keep the producer DTO compatible with the existing independently measured
 * frame; no expectation or caller-supplied pass bit belongs in this record. */
export type FrameDataProducer = FrameEvidence & {
  viewport: (typeof RELEASE_FRAME_VIEWPORTS)[number];
};
