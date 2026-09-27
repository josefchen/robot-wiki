import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import {
  ACTION_DECODE_SCENE,
  actionDecodeFrame,
} from '@/components/motion/scenes/action-decode';
import {
  FLOW_TRANSPORT_SCENE,
  flowTransportFrame,
} from '@/components/motion/scenes/flow-transport';
import { ACTION_DIMS, binIndex, generateActionChunk, tokenForBin } from '@/lib/action-tokenization';
import { generateFlowField, integrateFlow } from '@/lib/flow-matching';

type Decision = 'keep' | 'restyle' | 'rethink' | 'replace' | 'remove' | 'add';
interface InventoryRow {
  article: string;
  element: string;
  occurrence?: number;
  decision: Decision;
  teachingGoal: string;
  reason: string;
  sceneId?: string;
}

const root = process.cwd();
const inventory = JSON.parse(readFileSync(join(root, 'docs/design/motion-manipulation-inventory.json'), 'utf8')) as InventoryRow[];
describe('manipulation teaching inventory', () => {
  it('accounts for every mounted interactive and first-party figure exactly once', () => {
    const sourceRows: string[] = [];
    const articles = readdirSync(join(root, 'content/manipulation'))
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => name.slice(0, -4));
    for (const article of articles) {
      const mdx = readFileSync(join(root, 'content/manipulation', `${article}.mdx`), 'utf8');
      const imported = [...mdx.matchAll(/^import\s+\{\s*([A-Z]\w+)\s*\}\s+from\s+'@\/components\/(?:interactive|motion\/scenes|mdx)\//gm)]
        .map((match) => match[1]);
      const widgets = new Set(imported);
      for (const match of mdx.matchAll(/<([A-Z][a-zA-Z0-9]+)\b[^>]*>/g)) {
        const [, tag] = match;
        if (widgets.has(tag)) {
          if (!inventory.some((row) => row.article === article && row.element === tag && row.decision === 'add')) {
            sourceRows.push(`${article}:${tag}`);
          }
        }
        if (tag === 'Image') {
          const imageId = match[0].match(/\bid="([^"]+)"/)?.[1];
          expect(imageId, `${article} has an unregistered figure`).toBeTruthy();
          sourceRows.push(`${article}:Image:${imageId}`);
        }
      }
      for (const tag of imported) expect(mdx, `${article}:${tag} is imported but not mounted`).toContain(`<${tag}`);
    }
    const recorded = inventory.filter((row) => row.decision !== 'add').map((row) => `${row.article}:${row.element}`);
    for (const row of inventory) expect(articles, `unknown article ${row.article}`).toContain(row.article);
    expect(recorded.sort()).toEqual(sourceRows.sort());
    const keyed = inventory.filter((row) => row.decision !== 'add')
      .map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(new Set(keyed).size).toBe(keyed.length);
  });

  it('gives every decision a concrete goal and registers each added scene', () => {
    const sceneIds = new Set(['diffusion-denoising', 'action-decode', 'flow-transport']);
    for (const row of inventory) {
      expect(row.teachingGoal.length, `${row.article}:${row.element} needs a goal`).toBeGreaterThan(25);
      expect(row.reason.length, `${row.article}:${row.element} needs a decision rationale`).toBeGreaterThan(25);
      if (row.sceneId) expect(sceneIds.has(row.sceneId)).toBe(true);
      if (row.decision === 'add') {
        expect(row.sceneId).toBeTruthy();
        const mdx = readFileSync(join(root, 'content/manipulation', `${row.article}.mdx`), 'utf8');
        expect(mdx).toContain(`<${row.element}`);
      }
    }
  });
});

describe('manipulation scene models', () => {
  it('turns the existing toy vector into one bin and a sequential token stream', () => {
    const chunk = generateActionChunk();
    const end = posterTime(beatSpans(ACTION_DECODE_SCENE.beats));
    const frame = actionDecodeFrame(end);
    expect(frame.value).toBe(chunk[0][7]);
    expect(frame.bin).toBe(binIndex(chunk[0][7]));
    expect(frame.token).toBe(tokenForBin(frame.bin));
    expect(frame.visibleTokens).toHaveLength(ACTION_DIMS.length);
    expect(actionDecodeFrame(end)).toEqual(frame);
    expect(ACTION_DECODE_SCENE.beats).toHaveLength(4);
    expect(ACTION_DECODE_SCENE.beats.map((b) => b.caption)).toEqual(
      ACTION_DECODE_SCENE.beats.map(() => expect.stringMatching(/[.!?]$/)),
    );
  });

  it('moves the same seeded action samples through model time without easing them', () => {
    const spans = beatSpans(FLOW_TRANSPORT_SCENE.beats);
    const sample = generateFlowField().samples[0];
    const path = integrateFlow(sample, 10);
    const before = flowTransportFrame(spans[1].start);
    const midway = flowTransportFrame((spans[1].start + spans[1].end) / 2);
    const after = flowTransportFrame(spans[1].end);
    expect(before.positions[0].x).toBeCloseTo(path[0].x);
    expect(midway.positions[0].x).toBeCloseTo(path[5].x, 1);
    expect(after.positions[0].x).toBeCloseTo(path[10].x);
    expect(flowTransportFrame(spans[1].end)).toEqual(after);
    expect(FLOW_TRANSPORT_SCENE.beats[1].linear).toBe(true);
    expect(FLOW_TRANSPORT_SCENE.beats).toHaveLength(4);
  });
});
