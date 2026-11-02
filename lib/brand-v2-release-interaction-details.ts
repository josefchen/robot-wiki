import { z } from 'zod';
const text = z.string();
const nonempty = text.min(1);
const number = z.number().finite();
const paint = z.object({
  foreground: text,
  background: text,
  weight: number,
  underline: z.boolean(),
  borders: z.array(number),
  radius: number
}).strict();

/** Raw, compact readings from each actually driven release state. Large
 * targets are represented by their population and two minima; every target
 * needing an exception retains its measured geometry and nearest neighbours. */
export const releaseInteractionDetailsSchema = z.object({
  forcedColors: z.boolean(),
  systemText: nonempty,
  systemCanvas: nonempty,
  inputs: z.array(z.object({
    id: nonempty,
    kind: nonempty,
    name: text,
    labels: z.array(text),
    value: text,
    disabled: z.boolean()
  }).strict()),
  tables: z.array(z.object({
    id: nonempty,
    frame: text,
    name: text,
    headers: z.array(text),
    unassociated: z.array(text),
    sortButtons: number.int().nonnegative(),
    ariaSort: number.int().nonnegative(),
    cells: z.array(z.object({
      rowIndex: number.int().nonnegative(),
      row: text,
      column: text,
      text,
      align: text
    }).strict()),
    scroll: z.object({
      width: number,
      scrollWidth: number,
      tabIndex: number,
      name: text
    }).strict().nullable()
  }).strict()),
  segmented: z.array(z.object({
    id: nonempty,
    name: text,
    borders: z.array(number),
    nestedFrames: number.int().nonnegative(),
    controls: z.array(z.object({
      id: nonempty,
      text,
      semantic: text.nullable(),
      selected: z.boolean(),
      disabled: z.boolean(),
      paint
    }).strict()).min(1)
  }).strict()),
  targets: z.object({
    count: number.int().nonnegative(),
    large: z.object({
      count: number.int().nonnegative(),
      minWidth: number.nonnegative().nullable(),
      minHeight: number.nonnegative().nullable()
    }).strict(),
    small: z.array(z.object({
      id: nonempty,
      registeredId: text.nullable(),
      tag: text,
      role: text.nullable(),
      width: number.nonnegative(),
      height: number.nonnegative(),
      inlineText: text,
      parentWidth: number.nonnegative(),
      nearestTargetClearance: number.nullable(),
      nearestSmallCentre: number.nullable(),
      nativePointer: z.boolean(),
      nonRectangular: z.boolean().optional(),
      fragmented: z.boolean().optional(),
      fragments: z.array(z.object({
        x: number,
        y: number,
        width: number,
        height: number
      }).strict()).optional(),
      name: text.optional(),
      x: number.optional(),
      y: number.optional(),
      nearestTarget: z.object({
        id: nonempty,
        name: text,
        tag: text,
        x: number,
        y: number,
        width: number,
        height: number
      }).strict().nullable().optional()
    }).strict())
  }).strict(),
  instruments: z.array(z.object({
    id: nonempty,
    component: text,
    name: text,
    controls: number.int().nonnegative(),
    descriptions: z.array(z.object({
      text: nonempty,
      binding: nonempty,
      role: text.nullable(),
      live: text.nullable()
    }).strict())
  }).strict())
}).strict();
export type ReleaseInteractionDetails = z.infer<typeof releaseInteractionDetailsSchema>;
export type ReleaseTargetRegistry = readonly {
  id: string;
  targetSize?: {
    minimumPx: number;
    exceptions: readonly {
      kind: string;
      criterion: string;
      reason: string;
    }[];
  };
  pointerAlternative?: string;
}[];
export function persistentInputLabelProblems(data: ReleaseInteractionDetails): string[] {
  return data.inputs.flatMap(input => [...(!input.name.trim() ? [`${input.id}: accessible input name is empty`] : []), ...(!input.labels.some(label => label.trim()) ? [`${input.id}: persistent visible input label is missing`] : [])]);
}
export function segmentedControlProblems(data: ReleaseInteractionDetails): string[] {
  const failures: string[] = [];
  const transparent = (value: string) => /^(?:transparent|rgba\(0, 0, 0, 0\))$/.test(value);
  const channels = (value: string) => {
    const hex = /^#([a-f\d]{6})$/i.exec(value);
    if (hex) return [0, 2, 4].map(at => parseInt(hex[1].slice(at, at + 2), 16)).join(',');
    return /^rgba?\(([^)]+)\)/.exec(value)?.[1].split(/[, /]+/).slice(0, 3).map(Number).join(',') ?? value.toLowerCase();
  };
  const ink = (value: string) => channels(value) === channels(data.forcedColors ? data.systemText : '#1c1c1a');
  for (const group of data.segmented) {
    if (!group.name.trim()) failures.push(`${group.id}: segmented control has no group name`);
    if (group.nestedFrames > 0) failures.push(`${group.id}: independently framed nested segments`);
    const inactive = group.controls.filter(control => !control.selected && !control.disabled);
    for (const control of group.controls) {
      if (!control.text.trim() || control.semantic === null) failures.push(`${control.id}: segment lacks text or persistent state`);
      if (!control.selected) continue;
      const p = control.paint;
      const weightStep = inactive.length > 0 && inactive.every(other => p.weight - other.paint.weight >= 200);
      const rule = p.borders.some((width, index) => width >= 1 && inactive.some(other => other.paint.borders[index] < width));
      // The owner-approved research-page successor retires the old lime fill
      // and the redundant outer boxes, while retaining a single group and
      // non-colour selected cue. No per-segment four-sided frame is allowed.
      const ground = transparent(p.background) || data.forcedColors && channels(p.background) === channels(data.systemCanvas);
      if (!ink(p.foreground) || !ground || p.radius !== 0) failures.push(`${control.id}: selected segment is not unfilled square ink`);
      if (!p.underline && !rule && !weightStep) failures.push(`${control.id}: selected segment has no underline, rule or weight cue`);
    }
  }
  return failures;
}
export function targetSizeProblems(data: ReleaseInteractionDetails, registry: ReleaseTargetRegistry): string[] {
  const failures: string[] = [];
  const {
    targets
  } = data;
  if (targets.count !== targets.large.count + targets.small.length) failures.push('target census does not reconcile');
  if (targets.large.count > 0 && (targets.large.minWidth === null || targets.large.minWidth < 24 || targets.large.minHeight === null || targets.large.minHeight < 24)) failures.push('large-target minima do not meet 24px');
  if (targets.large.count === 0 && (targets.large.minWidth !== null || targets.large.minHeight !== null)) failures.push('empty large-target population has invented minima');
  for (const target of targets.small) {
    if (target.width >= 24 && target.height >= 24 && !target.nonRectangular) failures.push(`${target.id}: large target misclassified as an exception`);
    const owner = registry.find(row => row.id === target.registeredId);
    if (!owner?.pointerAlternative?.trim()) failures.push(`${target.id}: no registered equivalent pointer action`);
    if (!target.nativePointer) failures.push(`${target.id}: undersized custom target has no measured native pointer alternative`);
    const allowed = owner?.targetSize?.exceptions ?? [];
    const inline = target.inlineText.trim().length > 0 && allowed.some(exception => exception.kind === 'inline' && exception.reason.trim() && exception.criterion.includes('2.5.8'));
    const spaced = (target.nearestTargetClearance === null || target.nearestTargetClearance >= 12) && (target.nearestSmallCentre === null || target.nearestSmallCentre >= 24) && allowed.some(exception => exception.kind === 'spacing' && exception.reason.trim() && exception.criterion.includes('2.5.8'));
    if (!inline && !spaced) failures.push(`${target.id}: ${target.width}×${target.height}px without a verified registered inline or spacing exception`);
  }
  return failures;
}
export function currentStateDescriptionProblems(data: ReleaseInteractionDetails): string[] {
  return data.instruments.filter(instrument => instrument.controls > 0 && !instrument.descriptions.some(description => description.text.trim() && description.binding.trim())).map(instrument => `${instrument.id}: stateful instrument has no bound current-state description`);
}
export function releaseInteractionDetailProblems(data: ReleaseInteractionDetails, registry: ReleaseTargetRegistry): string[] {
  return [...persistentInputLabelProblems(data), ...segmentedControlProblems(data), ...targetSizeProblems(data, registry), ...currentStateDescriptionProblems(data)];
}
