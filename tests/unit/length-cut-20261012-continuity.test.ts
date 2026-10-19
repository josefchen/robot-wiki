import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { domainPassSuccessorPaths } from '../../lib/audit-domain-pass-continuity';
import { figureMountPredecessor, figureMountSuccessorPaths } from '../../lib/audit-figure-mount-continuity';
import { wordBudgetTrimPredecessor, wordBudgetTrimSuccessorPaths } from '../../lib/audit-word-budget-trim-continuity';
import {
  LENGTH_CUT_CONTINUITY_DIR, MIN_BODY_SOURCES, keepsLengthCutObligations, lengthCutPredecessor,
  lengthCutSuccessorPaths, loadLengthCutReview, verifyLengthCutSource, type LengthCutDrops,
} from '../../lib/audit-length-cut-continuity';
import { preImageMounts } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
// The newer image-mount layer of 2026-10-13 hands back the cut's successor first.
const read = (path: string) => preImageMounts(path);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /length cut continuity drift/;
const blank = { bytes: 0, sha256: '' };
// The three domain passes of the 2026-10-12 humanize pass share this one review.
const articles: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['classical', ['calibration', 'control', 'grasp-planning', 'kinematics', 'motion-planning', 'perception',
    'ros2-for-ml-engineers', 'scene-representation', 'state-estimation']],
  ['manipulation', ['action-chunking', 'action-spaces', 'bc-foundations', 'comparison-matrix', 'cross-embodiment',
    'diffusion-policy', 'foundation-models', 'generalist-policies', 'hierarchical', 'knowledge-insulation',
    'pi-line', 'realtime-execution', 'rl-finetuning', 'robot-learning-roadmap', 'vla-models']],
  ['rl-sim2real', ['humanoid-wbc', 'legged-locomotion', 'offline-rl', 'parallel-sim-rl', 'reward-design-mpc',
    'rl-for-robotics', 'sim2real-transfer', 'why-rl-locomotion']],
];
const paths = articles.flatMap(([domain, slugs]) => slugs.map((slug) => `content/${domain}/${slug}.mdx`));
// A figure mount recorded over the live article (the three manipulation mounts of 2026-10-15, after the image
// mounts) sits above this layer, not under it: the layer rebuilds the live bytes themselves.
const mountedOnTop = (path: string) => {
  const live = readFileSync(join(root, path));
  return !figureMountPredecessor(root, { path, ...blank }, live).equals(live);
};

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('length cut 2026-10-12 article successors', () => {
  const review = loadLengthCutReview(root);

  it('reviews exactly the 32 manipulation, classical and rl-sim2real articles, under the owner instruction', () => {
    expect(lengthCutSuccessorPaths()).toEqual(paths);
    expect(review.ownerApproval).toContain(
      '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
  });

  it('rebuilds every reviewed successor into its recorded predecessor, which the older layers still decide', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(lengthCutSuccessorPaths());
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = lengthCutPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(lengthCutPredecessor(root, source.after, live)).toBe(live);
      if (wordBudgetTrimSuccessorPaths().includes(source.after.path)) {
        // The word-budget trim of 2026-10-10 is the next layer down for its two articles.
        expect(wordBudgetTrimPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      } else if (figureMountSuccessorPaths().includes(source.after.path) && !mountedOnTop(source.after.path)) {
        expect(figureMountPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
      } else if (domainPassSuccessorPaths().includes(source.after.path)) {
        expect(domainPassSuccessorPaths()).toContain(source.after.path);
      } else {
        // An article no older layer holds: its predecessor is the head bytes the review archived.
        expect(source.archivedFrom).toMatch(/^[0-9a-f]{40}$/);
      }
    }
  });

  it('lists every dropped citation, number, link and glossary occurrence with the claim it came from', () => {
    for (const source of review.sources) {
      const body = read(source.after.path).toString().replace(/^---\n[\s\S]*?\n---\n/, '');
      expect(new Set([...body.matchAll(/<Cite id="([^"]+)"/g)].map((m) => m[1])).size)
        .toBeGreaterThanOrEqual(MIN_BODY_SOURCES);
      for (const list of Object.values(source.dropped)) {
        for (const { value, claim } of list) {
          expect(value.length).toBeGreaterThan(0);
          expect(claim.length).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(lengthCutPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(lengthCutPredecessor(root, { path: 'content/frontier/bear-case.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyLengthCutSource(source, drifted)).toThrow(drift);
  });

  it('admits only shorter text that accounts for every drop and keeps anchors, mounts, links, terms and 30 sources', () => {
    const cites = Array.from({ length: 31 }, (_, i) => `<Cite id="s${i}" />`).join(' ');
    const prior = [
      '---', 'title: "A"', '---', '',
      "import { CalibrationChain } from '@/components/interactive/calibration-chain';", '',
      `Kept claim ${cites} in the [guide](/x/z) and a <Term id="t">term</Term>.`, '',
      'A recap that repeats 12 links and the [guide](/x/z) <Cite id="s0" />.', '',
      '<CalibrationChain className="my-6" />', '', '## Next', '', 'Closing words.', '',
    ].join('\n');
    const cut = prior.replace('A recap that repeats 12 links and the [guide](/x/z) <Cite id="s0" />.\n\n', '');
    const dropped: LengthCutDrops = {
      citations: [{ value: 's0', claim: 'A recap that repeats 12 links' }],
      numbers: [{ value: '0', claim: 'A recap that repeats 12 links' }, { value: '12', claim: 'A recap that repeats 12 links' }],
      links: [{ value: '/x/z', claim: 'A recap that repeats 12 links' }],
      terms: [],
    };
    const path = 'content/x/y.mdx';
    expect(keepsLengthCutObligations(path, prior, cut, dropped, [])).toBe(true);
    expect(keepsLengthCutObligations(path, prior, prior, dropped, [])).toBe(false);
    expect(keepsLengthCutObligations('components/x.tsx', prior, cut, dropped, [])).toBe(false);
    // An unrecorded drop, a recorded drop that did not happen, or an added number.
    expect(keepsLengthCutObligations(path, prior, cut, { ...dropped, numbers: dropped.numbers.slice(1) }, [])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut, { ...dropped, terms: [{ value: 't', claim: 'not really cut' }] }, [])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut.replace('Closing words.', 'Closing 7.'), dropped, [])).toBe(false);
    // A link target, glossary id or heading anchor gone for good.
    expect(keepsLengthCutObligations(path, prior, cut.replace('[guide](/x/z)', 'guide'), {
      ...dropped, links: [...dropped.links, { value: '/x/z', claim: 'Kept claim in the guide' }],
    }, [])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut.replace('<Term id="t">term</Term>', 'term'), {
      ...dropped, terms: [{ value: 't', claim: 'Kept claim in the guide' }],
    }, [])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut.replace('## Next', '## Later'), dropped, [])).toBe(false);
    expect(keepsLengthCutObligations(path, prior,
      cut.replace('## Next', '<span id="next" />\n## Later'), dropped, [])).toBe(true);
    // The frontmatter, an import or a mount changed beside the cut.
    expect(keepsLengthCutObligations(path, prior, cut.replace('title: "A"', 'title: "B"'), dropped, [])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut.replace(/import [^\n]+\n\n/, ''), dropped, [])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut.replace('className="my-6"', 'className="my-8"'), dropped, [])).toBe(false);
    // Fewer than 30 distinct sources left in the body.
    const thin = cut.replace(/ <Cite id="s(?:[12][0-9]|30)" \/>/g, '');
    const thinDrops = Array.from({ length: 21 }, (_, i) => ({ value: `s${i + 10}`, claim: 'Kept claim with every source' }));
    expect(keepsLengthCutObligations(path, prior, thin, {
      ...dropped, citations: [...dropped.citations, ...thinDrops],
      numbers: [...dropped.numbers, ...thinDrops.flatMap(({ value, claim }) => [{ value: value.slice(1), claim }])],
    }, [])).toBe(false);
    // Pins: a retired pin's text is gone, a moved pin's new wording is present.
    const test = 'tests/unit/x.test.ts';
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'retired' }])).toBe(true);
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'Kept claim', disposition: 'retired' }])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'moved', to: 'Closing words' }])).toBe(true);
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'moved', to: 'new wording' }])).toBe(false);
    // A pin moved to another article: the phrase left this one; the other article must be a content article.
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'moved', to: 'new wording', toPath: 'content/x/z.mdx' }]))
      .toBe(true);
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'Kept claim', disposition: 'moved', to: 'new wording', toPath: 'content/x/z.mdx' }])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'moved', to: 'new wording', toPath: path }])).toBe(false);
    expect(keepsLengthCutObligations(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'retired', toPath: 'content/x/z.mdx' }])).toBe(false);
  });

  it('binds every pin moved to another article to that article\'s live text', () => {
    const moved = review.sources.flatMap(({ pins }) => pins.filter(({ toPath }) => toPath !== undefined));
    expect(moved.length).toBeGreaterThan(0);
    for (const { toPath, to } of moved) expect(read(toPath!).toString()).toContain(to);
    // Each moved pin's phrase left its own article, and the test it names still binds the new wording.
    for (const source of review.sources) {
      for (const { toPath, phrase, test } of source.pins.filter(({ toPath }) => toPath !== undefined)) {
        expect(read(source.after.path).toString()).not.toContain(phrase);
        expect(toPath).not.toBe(source.after.path);
        expect(read(test).length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'length-cut-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, LENGTH_CUT_CONTINUITY_DIR), join(tmp, LENGTH_CUT_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, LENGTH_CUT_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"length-cut-20261012"', '"length-cut-drift"'));
      expect(() => loadLengthCutReview(tmp)).toThrow(drift);
      expect(() => lengthCutPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
