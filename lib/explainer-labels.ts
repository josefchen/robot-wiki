/**
 * Geometry rules for the explainer stage labels (VAL-OPUS-043), shared by the step sweep
 * (scripts/check-explainer-labels.ts) and its unit tests.
 *
 * A stage label is an anchored label, the interaction prompt or the part card drawn over the stage.
 * Boxes are in CSS pixels relative to the stage's top-left corner.
 */
export type StageLabel = {
  kind: 'label' | 'prompt' | 'card';
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The nearest ancestor outside the stage whose overflow clips part of the box, if any. */
  clippedBy?: string | null;
};

/** Sub-pixel slack, so boxes that only touch or round differently do not count. */
const SLACK = 0.5;

const name = (label: StageLabel) => `"${label.text.replace(/\s+/g, ' ').trim().slice(0, 60)}"`;

export function labelProblems(labels: StageLabel[], stage: { width: number; height: number }): string[] {
  const problems: string[] = [];
  for (const label of labels) {
    const past = [
      ['left', -label.x],
      ['top', -label.y],
      ['right', label.x + label.w - stage.width],
      ['bottom', label.y + label.h - stage.height],
    ] as const;
    for (const [edge, by] of past) {
      if (by > SLACK) problems.push(`${name(label)} runs ${Math.round(by)} px past the stage ${edge} edge`);
    }
    if (label.clippedBy) problems.push(`${name(label)} is clipped by ${label.clippedBy}`);
  }
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      const a = labels[i], b = labels[j];
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (w > SLACK && h > SLACK) {
        problems.push(`${name(a)} overlaps ${name(b)} by ${Math.round(w)} x ${Math.round(h)} px`);
      }
    }
  }
  return problems;
}
