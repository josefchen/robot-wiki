import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ADJACENT_CUT_CONTINUITY_DIR, adjacentCutPredecessor, adjacentCutSuccessorPaths,
  keepsAdjacentCutObligations, loadAdjacentCutReview, uncorrectedAdjacentArticle,
  verifyAdjacentCutSource,
} from '../../lib/audit-length-cut-adjacent-continuity';
import { MIN_BODY_SOURCES, type LengthCutDrops } from '../../lib/audit-length-cut-world-models-continuity';
import { preAdjacentCut, preFrontierLengthCut, preImageMounts, preSeoPass } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
// The newer image-mount layer (the adjacent images of bundle B, 2026-10-15) hands back the cut's successor first.
const read = (path: string) => preImageMounts(path);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /adjacent cut continuity drift/;
const blank = { bytes: 0, sha256: '' };
const slugs = ['autonomous-vehicles', 'drones', 'space', 'surgical'];
const paths = slugs.map((slug) => `content/adjacent/${slug}.mdx`);
const body = (bytes: Buffer) => bytes.toString().replace(/^---\n[\s\S]*?\n---\n/, '');
const words = (bytes: Buffer) => body(bytes).split(/\s+/).filter(Boolean).length;
const sources = (bytes: Buffer) => new Set([...body(bytes).matchAll(/<Cite id="([^"]+)"/g)].map((m) => m[1]));
const lead = (bytes: Buffer) => body(bytes).split(/\n\s*\n/).map((part) => part.trim())
  .find((part) => part.length > 0 && !/^(import |<|#)/.test(part)) ?? '';
const plain = (text: string) => text.replace(/<Cite [^>]*\/>/g, '').replace(/<[^>]+>/g, '');

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('adjacent domain pass and length cut 2026-10-14 article successors', () => {
  const review = loadAdjacentCutReview(root);

  it('reviews the four adjacent articles under the owner instruction', () => {
    expect(adjacentCutSuccessorPaths()).toEqual(paths);
    expect(review.sources.map(({ after }) => after.path)).toEqual(paths);
    expect(review.ownerApproval).toContain(
      '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
    expect(review.ownerApproval).toContain('Not release approval.');
  });

  it('rebuilds every reviewed successor into its recorded predecessor, which the older layers still decide', () => {
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = adjacentCutPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(adjacentCutPredecessor(root, source.after, live)).toBe(live);
      // Older checks read the rebuilt bytes through the shared helper chain:
      // the image-mount layer, which mounted images on the cut articles after
      // this pass, hands this layer its successor, the frontier layer hands
      // the rebuilt bytes on, and the SEO-pass reader still rebuilds its own
      // earlier article from them.
      expect(sha(preImageMounts(source.after.path))).toBe(source.after.sha256);
      expect(sha(preAdjacentCut(source.after.path))).toBe(source.before.sha256);
      expect(preFrontierLengthCut(source.after.path).length).toBeGreaterThan(0);
      expect(preSeoPass(source.after.path)).not.toEqual(live);
    }
  });

  it('cuts each article by words and keeps 30 sources, listing every drop and addition with its claim', () => {
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = adjacentCutPredecessor(root, source.before, live);
      expect(sources(live).size).toBeGreaterThanOrEqual(MIN_BODY_SOURCES);
      expect(words(live)).toBeLessThan(words(prior) * 0.85);
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
      // The lead is the takeaway in at most two sentences and 60 words.
      const opening = plain(lead(live));
      expect(opening.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(60);
      expect(opening.split(/(?<=[.?!])\s+(?=[A-Z])/).length).toBeLessThanOrEqual(2);
    }
  });

  it('lists the pin the pass moved, and the test follows it', () => {
    const pinned = review.sources.flatMap(({ after, pins }) => pins.map((pin) => ({ ...pin, path: after.path })));
    expect(pinned.map(({ test, disposition }) => [test, disposition]))
      .toEqual([['tests/unit/autonomous-vehicles-originals.test.ts', 'moved']]);
    for (const { path, test, phrase, to, reason } of pinned) {
      const live = read(path).toString();
      const spec = read(test).toString();
      expect(reason?.length ?? 0).toBeGreaterThan(40);
      expect(preAdjacentCut(path).toString()).toContain(phrase);
      expect(live).not.toContain(phrase);
      expect(live).toContain(to);
      // The test keeps its assertion on the reviewed wording and holds the live article to the moved one.
      expect(spec).toContain('preAdjacentCut(');
      expect(spec).toContain(to!.slice(0, 60));
    }
  });

  it('records no corrected component block: every figure and table mount stays exactly as it was', () => {
    expect(review.sources.flatMap(({ corrected }) => corrected)).toEqual([]);
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(adjacentCutPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(adjacentCutPredecessor(root, { path: 'content/frontier/dexterity.mdx', ...blank }, drifted))
      .toBe(drifted);
    expect(() => verifyAdjacentCutSource(source, drifted)).toThrow(drift);
  });

  it('keeps every earlier link target, admitting only its trailing-slash form', () => {
    const cites = Array.from({ length: 31 }, (_, i) => `<Cite id="s${i}" />`).join(' ');
    const prior = ['---', 'title: "A"', 'citations:', '  - s0', '---', '', `Kept claim ${cites}.`, '',
      'A recap that links [drones](/adjacent/drones) and says more words here.', ''].join('\n');
    const none: LengthCutDrops = { citations: [], numbers: [], links: [], terms: [] };
    const path = 'content/adjacent/x.mdx';
    const slash = prior.replace('A recap that links [drones](/adjacent/drones) and says more words here.',
      'It links [drones](/adjacent/drones/).');
    const elsewhere = prior.replace('A recap that links [drones](/adjacent/drones) and says more words here.',
      'It links [space](/adjacent/space/).');
    const dropLink: LengthCutDrops = { ...none, links: [{ value: '/adjacent/drones', claim: 'A recap that links drones' }] };
    const addLink = (to: string): LengthCutDrops => ({ ...none, links: [{ value: to, claim: 'It links the page again' }] });
    expect(keepsAdjacentCutObligations(path, prior, slash, dropLink, addLink('/adjacent/drones/'), [], [])).toBe(true);
    expect(keepsAdjacentCutObligations(path, prior, elsewhere, dropLink, addLink('/adjacent/space/'), [], [])).toBe(false);
  });

  it('admits a corrected block only whole, once, with a reason, and only in adjacent', () => {
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
    const path = 'content/adjacent/x.mdx';
    const keeps = (current: string, corrected: { before: string; after: string; reason: string }[]) =>
      keepsAdjacentCutObligations(path, prior, current, dropped, added, [], corrected);
    expect(keeps(cut, [{ before: block, after: fixedBlock, reason }])).toBe(true);
    expect(uncorrectedAdjacentArticle(prior, cut, [{ before: block, after: fixedBlock, reason }]))
      .toBe(prior.replace('A recap <Cite id="s0" />.\n\n', ''));
    // An unrecorded block change, a short reason, or a correction outside adjacent.
    expect(keeps(cut, [])).toBe(false);
    expect(keeps(cut, [{ before: block, after: fixedBlock, reason: 'stale' }])).toBe(false);
    expect(keepsAdjacentCutObligations('content/frontier/x.mdx', prior, cut, dropped, added, [],
      [{ before: block, after: fixedBlock, reason }])).toBe(false);
    // Only part of a block, or a block the earlier article did not hold.
    expect(uncorrectedAdjacentArticle(prior, cut, [{ before: 'value="1"', after: 'value="2"', reason }])).toBeNull();
    expect(uncorrectedAdjacentArticle(prior, cut, [{ before: fixedBlock, after: block, reason }])).toBeNull();
    // An unrecorded added source is refused.
    const withNew = cut.replace('Closing words.', 'Closing words <Cite id="s99" />.');
    expect(keeps(withNew, [{ before: block, after: fixedBlock, reason }])).toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'length-cut-adjacent-continuity-test-'));
      scratchRoots.push(tmp);
      const dir = ADJACENT_CUT_CONTINUITY_DIR;
      cpSync(join(root, dir), join(tmp, dir), { recursive: true });
      const file = join(tmp, dir, 'source-transition.json');
      if (mode === 'missing') rmSync(file);
      else if (mode === 'corrupt') writeFileSync(file, mode);
      else writeFileSync(file, readFileSync(file, 'utf8')
        .replace('"length-cut-20261014-adjacent"', '"length-cut-drift"'));
      expect(() => loadAdjacentCutReview(tmp)).toThrow(drift);
      expect(() => adjacentCutPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
