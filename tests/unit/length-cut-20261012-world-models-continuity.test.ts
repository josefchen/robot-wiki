import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { domainPassPredecessor, domainPassSuccessorPaths } from '../../lib/audit-domain-pass-continuity';
import {
  WORLD_MODELS_LENGTH_CUT_CONTINUITY_DIR, MIN_BODY_SOURCES, keepsWorldModelsLengthCutObligations,
  loadWorldModelsLengthCutReview, verifyWorldModelsLengthCutSource, worldModelsLengthCutPredecessor,
  worldModelsLengthCutSuccessorPaths, type LengthCutDrops,
} from '../../lib/audit-length-cut-world-models-continuity';
import { preWorldModelsLengthCut } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /world-models length cut continuity drift/;
const blank = { bytes: 0, sha256: '' };
const paths = ['evaluation', 'generative-sim', 'generative-video', 'jepa', 'latent-dynamics',
  'model-based-robot-learning', 'taxonomy', 'world-models-vs-simulators']
  .map((slug) => `content/world-models/${slug}.mdx`);

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('world-models length cut 2026-10-12 article successors', () => {
  const review = loadWorldModelsLengthCutReview(root);

  it('reviews exactly the eight world-models articles, under the owner instruction', () => {
    expect(worldModelsLengthCutSuccessorPaths()).toEqual(paths);
    expect(review.ownerApproval).toContain(
      '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
    expect(review.rationale).toContain('2026-10-12 16:50');
  });

  it('rebuilds every reviewed successor into its recorded predecessor, which the domain-pass layer still decides', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(worldModelsLengthCutSuccessorPaths());
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = worldModelsLengthCutPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(worldModelsLengthCutPredecessor(root, source.after, live)).toBe(live);
      // Older checks read the rebuilt bytes through the shared helper chain.
      expect(sha(preWorldModelsLengthCut(source.after.path))).toBe(source.before.sha256);
      // The 2026-10-06 domain pass is the next layer down for every world-models article.
      expect(domainPassSuccessorPaths()).toContain(source.after.path);
      expect(domainPassPredecessor(root, { path: source.after.path, ...blank }, prior)).not.toEqual(prior);
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
    expect(worldModelsLengthCutPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(worldModelsLengthCutPredecessor(root, { path: 'content/frontier/bear-case.mdx', ...blank }, drifted))
      .toBe(drifted);
    expect(() => verifyWorldModelsLengthCutSource(source, drifted)).toThrow(drift);
  });

  it('admits only shorter text that accounts for every drop and keeps anchors, mounts, links, terms and 30 sources', () => {
    const keeps = keepsWorldModelsLengthCutObligations;
    const cites = Array.from({ length: 31 }, (_, i) => `<Cite id="s${i}" />`).join(' ');
    const prior = [
      '---', 'title: "A"', '---', '',
      "import { JepaPlanning } from '@/components/interactive/jepa-planning';", '',
      `Kept claim ${cites} in the [guide](/x/z) and a <Term id="t">term</Term>.`, '',
      'A recap that repeats 12 links and the [guide](/x/z) <Cite id="s0" />.', '',
      '<JepaPlanning className="my-6" />', '', '## Next', '', 'Closing words.', '',
    ].join('\n');
    const cut = prior.replace('A recap that repeats 12 links and the [guide](/x/z) <Cite id="s0" />.\n\n', '');
    const dropped: LengthCutDrops = {
      citations: [{ value: 's0', claim: 'A recap that repeats 12 links' }],
      numbers: [{ value: '0', claim: 'A recap that repeats 12 links' }, { value: '12', claim: 'A recap that repeats 12 links' }],
      links: [{ value: '/x/z', claim: 'A recap that repeats 12 links' }],
      terms: [],
    };
    const path = 'content/x/y.mdx';
    expect(keeps(path, prior, cut, dropped, [])).toBe(true);
    expect(keeps(path, prior, prior, dropped, [])).toBe(false);
    expect(keeps('components/x.tsx', prior, cut, dropped, [])).toBe(false);
    // An unrecorded drop, a recorded drop that did not happen, or an added number.
    expect(keeps(path, prior, cut, { ...dropped, numbers: dropped.numbers.slice(1) }, [])).toBe(false);
    expect(keeps(path, prior, cut, { ...dropped, terms: [{ value: 't', claim: 'not really cut' }] }, [])).toBe(false);
    expect(keeps(path, prior, cut.replace('Closing words.', 'Closing 7.'), dropped, [])).toBe(false);
    // A link target, glossary id or heading anchor gone for good.
    expect(keeps(path, prior, cut.replace('[guide](/x/z)', 'guide'), {
      ...dropped, links: [...dropped.links, { value: '/x/z', claim: 'Kept claim in the guide' }],
    }, [])).toBe(false);
    expect(keeps(path, prior, cut.replace('<Term id="t">term</Term>', 'term'), {
      ...dropped, terms: [{ value: 't', claim: 'Kept claim in the guide' }],
    }, [])).toBe(false);
    expect(keeps(path, prior, cut.replace('## Next', '## Later'), dropped, [])).toBe(false);
    expect(keeps(path, prior, cut.replace('## Next', '<span id="next" />\n## Later'), dropped, [])).toBe(true);
    // The frontmatter, an import or a mount changed beside the cut.
    expect(keeps(path, prior, cut.replace('title: "A"', 'title: "B"'), dropped, [])).toBe(false);
    expect(keeps(path, prior, cut.replace(/import [^\n]+\n\n/, ''), dropped, [])).toBe(false);
    expect(keeps(path, prior, cut.replace('className="my-6"', 'className="my-8"'), dropped, [])).toBe(false);
    // Fewer than 30 distinct sources left in the body.
    const thin = cut.replace(/ <Cite id="s(?:[12][0-9]|30)" \/>/g, '');
    const thinDrops = Array.from({ length: 21 }, (_, i) => ({ value: `s${i + 10}`, claim: 'Kept claim with every source' }));
    expect(keeps(path, prior, thin, {
      ...dropped, citations: [...dropped.citations, ...thinDrops],
      numbers: [...dropped.numbers, ...thinDrops.flatMap(({ value, claim }) => [{ value: value.slice(1), claim }])],
    }, [])).toBe(false);
    // Pins: a retired pin's text is gone, a moved pin's new wording is present.
    const test = 'tests/unit/x.test.ts';
    expect(keeps(path, prior, cut, dropped, [{ test, phrase: 'A recap that repeats', disposition: 'retired' }])).toBe(true);
    expect(keeps(path, prior, cut, dropped, [{ test, phrase: 'Kept claim', disposition: 'retired' }])).toBe(false);
    expect(keeps(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'moved', to: 'Closing words' }])).toBe(true);
    expect(keeps(path, prior, cut, dropped,
      [{ test, phrase: 'A recap that repeats', disposition: 'moved', to: 'new wording' }])).toBe(false);
  });

  it('records the retired and moved pins, and the retiring tests no longer pin the cut text', () => {
    const pins = review.sources.flatMap(({ after, pins }) => pins.map((pin) => ({ ...pin, path: after.path })));
    expect(pins.map(({ path, phrase }) => [path.split('/').pop(), phrase.slice(0, 24)])).toEqual([
      ['generative-video.mdx', 'Starchild-1 adds audio <'],
      ['generative-video.mdx', 'In February 2026 Runway '],
      ['generative-video.mdx', 'Two October 2026 papers '],
      ['jepa.mdx', '76.5'], ['jepa.mdx', '39.7%'], ['jepa.mdx', '32 frames at 8 fps'], ['jepa.mdx', 'one second'],
      ['jepa.mdx', '77.3% top-1 accuracy on '], ['jepa.mdx', 'In September 2026, Haora'],
      ['jepa.mdx', 'Leonardo Toso, Yann LeCu'],
    ]);
    for (const { path, phrase, disposition, to, toPath, test, reason } of pins) {
      const live = read(path).toString();
      expect(toPath).toBeUndefined();
      expect(reason?.length).toBeGreaterThan(40);
      expect(live).not.toContain(phrase);
      if (disposition === 'moved') {
        expect(live).toContain(to);
        if (test.startsWith('tests/helpers/kol-backlog-')) {
          // The KOL step helpers keep the paragraph as their batch wrote it, as a record.
          expect(read(test).toString()).toContain(phrase.slice(0, 60));
        } else {
          // A test that bound the old wording binds the new wording instead.
          expect(read(test).toString()).toContain(to);
          expect(read(test).toString()).not.toContain(phrase);
        }
      } else {
        expect(read(test).toString()).not.toContain(`'${phrase}'`);
      }
    }
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'length-cut-world-models-continuity-test-'));
      scratchRoots.push(tmp);
      const dir = WORLD_MODELS_LENGTH_CUT_CONTINUITY_DIR;
      cpSync(join(root, dir), join(tmp, dir), { recursive: true });
      const path = join(tmp, dir, 'source-transition.json');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8')
        .replace('"length-cut-20261012-world-models"', '"length-cut-drift"'));
      expect(() => loadWorldModelsLengthCutReview(tmp)).toThrow(drift);
      expect(() => worldModelsLengthCutPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
