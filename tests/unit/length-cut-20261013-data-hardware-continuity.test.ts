import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DATA_HARDWARE_CUT_CONTINUITY_DIR, dataHardwareCutPredecessor, dataHardwareCutSuccessorPaths,
  keepsDataHardwareCutObligations, loadDataHardwareCutReview, uncorrectedDataHardwareArticle,
  verifyDataHardwareCutSource,
} from '../../lib/audit-length-cut-data-hardware-continuity';
import { MIN_BODY_SOURCES, type LengthCutDrops } from '../../lib/audit-length-cut-world-models-continuity';
import { DID_YOU_KNOW } from '../../data/did-you-know';
import { preDataHardwareCut, preFrontierLengthCut, preImageMounts, preSeoPass } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /data-hardware cut continuity drift/;
const blank = { bytes: 0, sha256: '' };
const slugs = ['data-bottleneck', 'datasets', 'evaluation-crisis', 'hardware-taxonomy', 'industrial-deployment',
  'robot-learning-stack', 'teleop-rigs'];
const paths = slugs.map((slug) => `content/data-hardware/${slug}.mdx`);
const body = (bytes: Buffer) => bytes.toString().replace(/^---\n[\s\S]*?\n---\n/, '');
const words = (bytes: Buffer) => body(bytes).split(/\s+/).filter(Boolean).length;
const sources = (bytes: Buffer) => new Set([...body(bytes).matchAll(/<Cite id="([^"]+)"/g)].map((m) => m[1]));
/** An article's pins, as [test under tests/, how many, disposition], in review order. */
const pinsOf = (slug: string, counts: ReadonlyArray<readonly [string, number, string?]>) =>
  counts.flatMap(([test, n, disposition = 'moved']) =>
    Array.from({ length: n }, () => [`content/data-hardware/${slug}.mdx`, `tests/${test}`, disposition]));
// A reader spec selects rendered text: MDX's escaped dollar renders bare, and a
// spec literal escapes its own quote character or is a regular expression.
const selects = (spec: string, text: string) => {
  const rendered = text.replaceAll('\\$', '$');
  return [rendered, rendered.replaceAll("'", "\\'"), rendered.replaceAll('"', '\\"')].some((form) =>
    [`'${form}'`, `"${form}"`, `/${form}/`, `/^${form}/`].some((literal) => spec.includes(literal)));
};

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('data-hardware domain pass and length cut 2026-10-13 article successors', () => {
  const review = loadDataHardwareCutReview(root);

  it('reviews the seven data-hardware articles under the owner instruction', () => {
    expect(dataHardwareCutSuccessorPaths()).toEqual(paths);
    expect(review.sources.map(({ after }) => after.path)).toEqual(paths);
    expect(review.ownerApproval).toContain(
      '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
    expect(review.ownerApproval).toContain('Not release approval.');
  });

  it('rebuilds every reviewed successor into its recorded predecessor, which the older layers still decide', () => {
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = dataHardwareCutPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(dataHardwareCutPredecessor(root, source.after, live)).toBe(live);
      // Older checks read the rebuilt bytes through the shared helper chain:
      // the image-mount layer, which now sits innermost and mounts no image
      // on these articles, hands this layer its successor, the frontier layer leaves
      // the data-hardware articles alone, and the SEO-pass reader still
      // rebuilds its own earlier article from them.
      expect(sha(preImageMounts(source.after.path))).toBe(source.after.sha256);
      expect(sha(preDataHardwareCut(source.after.path))).toBe(source.before.sha256);
      expect(sha(preFrontierLengthCut(source.after.path))).toBe(source.before.sha256);
      expect(preSeoPass(source.after.path)).not.toEqual(prior);
    }
  });

  it('cuts each article by words and keeps 30 sources, listing every drop and addition with its claim', () => {
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = dataHardwareCutPredecessor(root, source.before, live);
      expect(sources(live).size).toBeGreaterThanOrEqual(MIN_BODY_SOURCES);
      expect(words(live)).toBeLessThan(words(prior));
      for (const list of [...Object.values(source.dropped), ...Object.values(source.added)]) {
        for (const { value, claim } of list) {
          expect(value.length).toBeGreaterThan(0);
          expect(claim.length).toBeGreaterThanOrEqual(12);
        }
      }
      // Every added source is cited in the body and listed in the frontmatter.
      const head = live.toString().match(/^---\n[\s\S]*?\n---\n/)![0];
      for (const { value } of source.added.citations) {
        expect(sources(live).has(value)).toBe(true);
        expect(head).toContain(`  - ${value}\n`);
      }
    }
  });

  it('lists the pins the pass moved or retired, and the tests follow them', () => {
    const pinned = review.sources.flatMap(({ after, pins }) => pins.map((pin) => ({ ...pin, path: after.path })));
    const amazon = 'e2e/amazon-industrial-originals.spec.ts';
    const symbotic = 'e2e/symbotic-a3-originals.spec.ts';
    const ifr = 'e2e/ifr-industrial-originals.spec.ts';
    expect(pinned.map(({ path, test, disposition }) => [path, test, disposition])).toEqual([
      ...pinsOf('data-bottleneck', [['unit/robomind-hours-evidence.test.ts', 1, 'retired'], ['e2e/data-bottleneck.spec.ts', 4]]),
      ...pinsOf('datasets', [['unit/robomind-disclosure-evidence.test.ts', 7, 'retired'],
        ['unit/robomind-hours-evidence.test.ts', 4, 'retired']]),
      ...pinsOf('evaluation-crisis', [['unit/evaluation-benchmark-originals.test.ts', 2, 'retired'],
        ['unit/evaluation-statistics-originals.test.ts', 3, 'retired'], ['unit/final-seven-closure-evidence.test.ts', 1, 'retired'],
        ['unit/motion-data-hardware.test.ts', 1, 'retired']]),
      ...pinsOf('hardware-taxonomy', [['unit/hardware-taxonomy-source.test.ts', 4, 'retired'],
        ['unit/vla-performance-source-context.test.ts', 7, 'retired']]),
      ...pinsOf('industrial-deployment', [['unit/ifr-industrial-originals.test.ts', 17, 'retired'],
        ['unit/industrial-perception-truth-repair.test.ts', 3, 'retired'], ['unit/motion-data-hardware.test.ts', 1, 'retired'],
        ['unit/retained-cross-article.test.ts', 1, 'retired'], ['unit/round6-remaining-repairs-continuity.test.ts', 1, 'retired'],
        ['e2e/industrial-deployment.spec.ts', 3], ['e2e/industrial-citation-refresh.spec.ts', 1],
        ['e2e/industrial-release-evidence.spec.ts', 1], ['e2e/residual-release-industrial.spec.ts', 1],
        ['e2e/economics-local-evidence.spec.ts', 1], ['e2e/economics-release-evidence.spec.ts', 1],
        ['e2e/industrial-cost-reader.spec.ts', 1],
        [amazon, 4], [amazon, 2, 'retired'], [amazon, 1], [amazon, 2, 'retired'], [amazon, 1], [amazon, 1, 'retired'],
        [symbotic, 2], [symbotic, 4, 'retired'], [symbotic, 1], [symbotic, 1, 'retired'],
        [ifr, 1], [ifr, 8, 'retired'], [ifr, 1]]),
      ...pinsOf('teleop-rigs', [['unit/did-you-know.test.ts', 1], ['unit/pricing-provenance.test.ts', 1, 'retired'],
        ['unit/pricing-provenance.test.ts', 1], ['unit/pricing-provenance.test.ts', 3, 'retired'],
        ['unit/teleop-rigs-originals.test.ts', 1, 'retired'], ['e2e/teleop-rigs.spec.ts', 1]]),
    ]);
    for (const { path, test, phrase, disposition, to, reason } of pinned) {
      const live = read(path).toString();
      const prior = preDataHardwareCut(path).toString();
      const spec = read(test).toString();
      expect(reason?.length ?? 0).toBeGreaterThan(40);
      expect(prior).toContain(phrase);
      expect(live).not.toContain(phrase);
      if (test.startsWith('tests/e2e/')) {
        // A reader spec checks the rendered page: it no longer selects the cut
        // wording, and a moved pin selects the live wording in its place.
        expect(selects(spec, phrase), `${test} still selects: ${phrase}`).toBe(false);
        if (disposition === 'moved') {
          expect(live).toContain(to);
          expect(selects(spec, to!), `${test} selects: ${to}`).toBe(true);
        } else {
          expect(disposition).toBe('retired');
        }
      } else if (disposition === 'retired') {
        // The test keeps its assertion and reads the pre-pass article.
        expect(spec).toContain('preDataHardwareCut(');
      } else {
        expect(disposition).toBe('moved');
        expect(live).toContain(to);
      }
    }
    // The home-page fact follows the corrected ACT sentence, and the pricing
    // test holds the live article to the paper's build cost.
    const moved = pinned.filter(({ disposition, test }) => disposition === 'moved' && test.startsWith('tests/unit/'));
    expect(moved.map(({ test }) => test)).toEqual(['tests/unit/did-you-know.test.ts', 'tests/unit/pricing-provenance.test.ts']);
    expect(DID_YOU_KNOW.find(({ id }) => id === 'act-ten-minutes')?.passage).toBe(moved[0].to);
    expect(read('tests/unit/pricing-provenance.test.ts').toString()).toContain('preDataHardwareCut(');
  });

  it('records the two corrected stat strips: World Robotics 2026 on industrial and the ALOHA note on teleop', () => {
    const corrected = review.sources.flatMap(({ after, corrected }) => corrected.map((c) => ({ ...c, path: after.path })));
    expect(corrected.map(({ path }) => path)).toEqual(
      ['content/data-hardware/industrial-deployment.mdx', 'content/data-hardware/teleop-rigs.mdx']);
    for (const { path, before, after, reason } of corrected) {
      const live = read(path).toString();
      expect(reason.length).toBeGreaterThan(40);
      expect(live).toContain(after);
      expect(live).not.toContain(before);
    }
    const [industrial, teleop] = corrected;
    expect(industrial.before).toContain('value="4,663,698"');
    expect(industrial.after).toContain('value="5 million"');
    expect(industrial.after).toContain('value="59%"');
    expect(teleop.before).toContain('note="Community estimate below is not an itemized vendor quote"');
    expect(teleop.after).toContain("note=\"the ACT paper's $18k ALOHA build cost is not a vendor quote\"");
    expect(teleop.after).toContain('value="not disclosed"');
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(dataHardwareCutPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(dataHardwareCutPredecessor(root, { path: 'content/frontier/dexterity.mdx', ...blank }, drifted))
      .toBe(drifted);
    expect(() => verifyDataHardwareCutSource(source, drifted)).toThrow(drift);
  });

  it('admits a corrected block only whole, once, with a reason, and only in data-hardware', () => {
    const cites = Array.from({ length: 31 }, (_, i) => `<Cite id="s${i}" />`).join(' ');
    const block = '<div className="stats">\n  <Stat label="a" value="1" />\n</div>';
    const prior = ['---', 'title: "A"', 'citations:', '  - s0', '---', '', `Kept claim ${cites}.`, '', block, '',
      'A recap <Cite id="s0" />.', '', '## Next', '', 'Closing words.', ''].join('\n');
    const fixedBlock = block.replace('value="1"', 'value="2"');
    const cut = prior.replace('A recap <Cite id="s0" />.\n\n', '').replace(block, fixedBlock);
    const dropped: LengthCutDrops = {
      citations: [{ value: 's0', claim: 'A recap with one source' }], numbers: [{ value: '0', claim: 'A recap with one source' }],
      links: [], terms: [],
    };
    const added: LengthCutDrops = { citations: [], numbers: [], links: [], terms: [] };
    const reason = 'The tile had no source in the article and gives way to a cited figure.';
    const path = 'content/data-hardware/x.mdx';
    const keeps = (current: string, corrected: { before: string; after: string; reason: string }[]) =>
      keepsDataHardwareCutObligations(path, prior, current, dropped, added, [], corrected);
    expect(keeps(cut, [{ before: block, after: fixedBlock, reason }])).toBe(true);
    expect(uncorrectedDataHardwareArticle(prior, cut, [{ before: block, after: fixedBlock, reason }]))
      .toBe(prior.replace('A recap <Cite id="s0" />.\n\n', ''));
    // An unrecorded block change, a short reason, or a correction outside data-hardware.
    expect(keeps(cut, [])).toBe(false);
    expect(keeps(cut, [{ before: block, after: fixedBlock, reason: 'stale' }])).toBe(false);
    expect(keepsDataHardwareCutObligations('content/frontier/x.mdx', prior, cut, dropped, added, [],
      [{ before: block, after: fixedBlock, reason }])).toBe(false);
    // Only part of a block, or a block the earlier article did not hold.
    expect(uncorrectedDataHardwareArticle(prior, cut, [{ before: 'value="1"', after: 'value="2"', reason }])).toBeNull();
    expect(uncorrectedDataHardwareArticle(prior, cut, [{ before: fixedBlock, after: block, reason }])).toBeNull();
    // An unrecorded added source is refused.
    const withNew = cut.replace('Closing words.', 'Closing words <Cite id="s99" />.');
    expect(keeps(withNew, [{ before: block, after: fixedBlock, reason }])).toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'length-cut-data-hardware-continuity-test-'));
      scratchRoots.push(tmp);
      const dir = DATA_HARDWARE_CUT_CONTINUITY_DIR;
      cpSync(join(root, dir), join(tmp, dir), { recursive: true });
      const file = join(tmp, dir, 'source-transition.json');
      if (mode === 'missing') rmSync(file);
      else if (mode === 'corrupt') writeFileSync(file, mode);
      else writeFileSync(file, readFileSync(file, 'utf8')
        .replace('"length-cut-20261013-data-hardware"', '"length-cut-drift"'));
      expect(() => loadDataHardwareCutReview(tmp)).toThrow(drift);
      expect(() => dataHardwareCutPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
