import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LABEL_MARGIN, layoutLabels } from '../../components/explainers/label-layout.js';
import { labelProblems, type StageLabel } from '../../lib/explainer-labels';

type Item = { ax: number; ay: number; w: number; h: number; text: string };
const STAGE = { width: 708, height: 443 };

const asLabels = (items: Item[], boxes: { x: number; y: number; w: number; h: number }[]): StageLabel[] =>
  items.map(({ text }, i) => ({ kind: 'label', text, ...boxes[i] }));

const laidOut = (items: Item[], obstacles: { x: number; y: number; w: number; h: number }[] = []) =>
  layoutLabels(items, { ...STAGE, obstacles });

// The bare placement the layout replaced: centred above the anchor, never clamped or separated.
const bare = (items: Item[]) => items.map(({ ax, ay, w, h }) => ({ x: ax - w / 2, y: ay - 10 - h, w, h }));

// Two labels on one anchor and one whose anchor lies beyond the right edge.
const FIXTURE: Item[] = [
  { text: 'First on the anchor', ax: 354, ay: 220, w: 140, h: 26 },
  { text: 'Second on the anchor', ax: 354, ay: 220, w: 150, h: 26 },
  { text: 'Anchor beyond the edge', ax: 820, ay: 200, w: 170, h: 26 },
];

describe('explainer stage label layout', () => {
  it('keeps the fixture inside the stage with no overlap', () => {
    const placed = laidOut(FIXTURE);
    expect(labelProblems(asLabels(FIXTURE, placed.map(({ box }) => box)), STAGE)).toEqual([]);
    for (const { box } of placed) {
      expect(box.x).toBeGreaterThanOrEqual(LABEL_MARGIN);
      expect(box.x + box.w).toBeLessThanOrEqual(STAGE.width - LABEL_MARGIN);
    }
  });

  it('fails the fixture when the clamp and the push-apart are off', () => {
    const problems = labelProblems(asLabels(FIXTURE, bare(FIXTURE)), STAGE);
    expect(problems).toContain('"First on the anchor" overlaps "Second on the anchor" by 140 x 26 px');
    expect(problems.some((p) => p.startsWith('"Anchor beyond the edge" runs') && p.endsWith('past the stage right edge'))).toBe(true);
  });

  it('ends every leader on its own anchor', () => {
    const placed = laidOut(FIXTURE);
    placed.forEach(({ leader }, i) => {
      expect(leader).not.toBeNull();
      expect([leader!.x1, leader!.y1]).toEqual([FIXTURE[i].ax, FIXTURE[i].ay]);
    });
  });

  it('keeps a label in its spot above the anchor when nothing is in the way', () => {
    const [{ box, leader }] = laidOut([{ text: 'Base', ax: 300, ay: 300, w: 60, h: 26 }]);
    expect(box).toEqual({ x: 270, y: 264, w: 60, h: 26 });
    expect(leader).toEqual({ x1: 300, y1: 300, x2: 300, y2: 290 });
  });

  it('moves a label off the interaction prompt and below an anchor at the top edge', () => {
    const prompt = { x: 580, y: 10, w: 116, h: 18 };
    const items = [
      { text: 'Leader', ax: 640, ay: 50, w: 70, h: 26 },
      { text: 'Clamp', ax: 200, ay: -20, w: 60, h: 26 },
      { text: 'Landmark it knows', ax: 420, ay: 4, w: 130, h: 26 },
    ];
    const placed = laidOut(items, [prompt]).map(({ box }) => box);
    const labels = [...asLabels(items, placed), { kind: 'prompt', text: 'Drag this hand', ...prompt } as StageLabel];
    expect(labelProblems(labels, STAGE)).toEqual([]);
    expect(placed[2].y).toBeGreaterThan(4);
  });

  it('reports clipping by an ancestor and every edge a box runs past', () => {
    const problems = labelProblems([
      { kind: 'card', text: 'Shoulder lift', x: -8, y: 420, w: 300, h: 40, clippedBy: 'section.explainer' },
    ], STAGE);
    expect(problems).toEqual([
      '"Shoulder lift" runs 8 px past the stage left edge',
      '"Shoulder lift" runs 17 px past the stage bottom edge',
      '"Shoulder lift" is clipped by section.explainer',
    ]);
  });

  it('leaves the placing to the kit: no scene positions its own labels', () => {
    for (const id of ['arm', 'humanoid', 'hand', 'reaching', 'upright', 'flying', 'path', 'grip', 'mug', 'whereami', 'puppeteer', 'worlds']) {
      const source = readFileSync(`components/explainers/scenes/${id}.js`, 'utf8');
      expect(source, id).not.toMatch(/\.el\.style\.(left|top|transform)|layoutLabels|\.tag\b/);
    }
  });
});
