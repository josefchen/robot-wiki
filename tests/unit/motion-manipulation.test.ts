import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionTokenization } from '@/components/interactive/action-tokenization';
import { FlowMatchingTrajectory } from '@/components/interactive/flow-matching-trajectory';
import {
  ACTION_DIMS,
  BIN_COUNT,
  binIndex,
  generateActionChunk,
  tokenForBin,
} from '@/lib/action-tokenization';
import { endpointDispersion, generateFlowField, PI0_STEPS } from '@/lib/flow-matching';
import { SCENE_TARGETS } from '@/lib/motion-scene-registry';

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
const readArticle = (article: string) =>
  readFileSync(join(root, 'content/manipulation', `${article}.mdx`), 'utf8');
const escapeMarkup = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

describe('manipulation teaching inventory', () => {
  it('accounts for every mounted interactive and first-party figure exactly once', () => {
    const sourceRows: string[] = [];
    const articles = readdirSync(join(root, 'content/manipulation'))
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => name.slice(0, -4));
    for (const article of articles) {
      const mdx = readArticle(article);
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
    const mounted = inventory.filter((row) => row.decision !== 'add' && row.decision !== 'remove');
    const recorded = mounted.map((row) => `${row.article}:${row.element}`);
    for (const row of inventory) expect(articles, `unknown article ${row.article}`).toContain(row.article);
    expect(recorded.sort()).toEqual(sourceRows.sort());
    const keyed = inventory.map((row) => `${row.article}:${row.element}:${row.occurrence ?? 1}`);
    expect(new Set(keyed).size).toBe(keyed.length);
  });

  it('gives every decision a concrete goal, registers each added scene and unmounts removed ones', () => {
    const sceneIds = new Set(
      SCENE_TARGETS.filter((target) => target.route.startsWith('/manipulation/')).map((target) => target.id),
    );
    expect([...sceneIds]).toContain('diffusion-denoising');
    for (const row of inventory) {
      expect(row.teachingGoal.length, `${row.article}:${row.element} needs a goal`).toBeGreaterThan(25);
      expect(row.reason.length, `${row.article}:${row.element} needs a decision rationale`).toBeGreaterThan(25);
      if (row.sceneId) expect(sceneIds.has(row.sceneId)).toBe(true);
      const mdx = readArticle(row.article);
      if (row.decision === 'add') {
        expect(row.sceneId).toBeTruthy();
        expect(mdx).toContain(`<${row.element}`);
      }
      if (row.decision === 'remove') {
        expect(row.sceneId).toBeUndefined();
        expect(mdx).not.toMatch(new RegExp(`<${row.element}\\b`));
      }
    }
  });
});

describe('manipulation merged figures', () => {
  const merged = [
    ['vla-models', 'ActionTokenization', 'ActionDecode'],
    ['pi-line', 'FlowMatchingTrajectory', 'FlowTransport'],
  ] as const;

  it('mounts one figure per concept, with the lab in place of its scene', () => {
    for (const [article, lab, scene] of merged) {
      const mdx = readArticle(article);
      expect(mdx.match(new RegExp(`<${lab}\\b`, 'g')), article).toHaveLength(1);
      expect(mdx, article).not.toContain(`<${scene}`);
      expect(inventory.find((row) => row.article === article && row.element === scene)?.decision)
        .toBe('remove');
    }
    const routes = merged.map(([article]) => `/manipulation/${article}/`);
    expect(SCENE_TARGETS.filter((target) => routes.includes(target.route))).toEqual([]);
  });

  it('shows the former decode beats in the tokenization lab at its default step', () => {
    // Beats: the step-7 value, its bin of 256, and seven tokens in decode order.
    const chunk = generateActionChunk();
    const value = chunk[0][7];
    const tokens = ACTION_DIMS.map((_, i) => tokenForBin(binIndex(chunk[i][7])));
    const markup = renderToStaticMarkup(createElement(ActionTokenization));
    expect(markup).toContain(`${ACTION_DIMS[0].label} = ${value.toFixed(3)}`);
    expect(markup).toContain(`bin ${binIndex(value)} of ${BIN_COUNT - 1}`);
    expect(markup).toContain(`token ${escapeMarkup(tokens[0])}`);
    // The main view writes each token as its word number, in decode order.
    const stream = markup.slice(
      markup.indexOf('data-testid="token-stream"'),
      markup.indexOf('</ol>', markup.indexOf('data-testid="token-stream"')),
    );
    let cursor = 0;
    for (const [i] of tokens.entries()) {
      const word = `word ${binIndex(chunk[i][7])}`;
      const at = stream.indexOf(word, cursor);
      expect(at, word).toBeGreaterThan(-1);
      cursor = at + 1;
    }
    expect(markup).toContain(`${ACTION_DIMS.length} sequential decodes per control step`);
  });

  it('reaches the former transport beats from the step presets', () => {
    // Beats: the ten-step transport and the one-step endpoint left short of the modes.
    const field = generateFlowField();
    const oneStep = endpointDispersion(field, 1);
    const tenSteps = endpointDispersion(field, PI0_STEPS);
    expect(oneStep).toBeGreaterThan(5 * tenSteps);
    const preset = renderToStaticMarkup(createElement(FlowMatchingTrajectory));
    expect(preset).toContain(`k = ${PI0_STEPS} Euler steps`);
    expect(preset).toContain(`>${tenSteps.toFixed(2)}<`);
    for (const label of ['1 step', `${PI0_STEPS} steps (π0)`]) expect(preset).toContain(`>${label}</button>`);
    const single = renderToStaticMarkup(createElement(FlowMatchingTrajectory, { defaultSteps: 1 }));
    expect(single).toContain('k = 1 Euler step');
    expect(single).toContain(`>${oneStep.toFixed(2)}<`);
  });
});
