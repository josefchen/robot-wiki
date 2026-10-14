import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { domainPassPredecessor, domainPassSuccessorPaths } from '../../lib/audit-domain-pass-continuity';
import { figureMountPredecessor, figureMountSuccessorPaths } from '../../lib/audit-figure-mount-continuity';
import {
  FRONTIER_LENGTH_CUT_CONTINUITY_DIR, frontierLengthCutPredecessor, frontierLengthCutSuccessorPaths,
  keepsFrontierLengthCutObligations, loadFrontierLengthCutReview, uncorrectedFrontierArticle,
  verifyFrontierLengthCutSource,
} from '../../lib/audit-length-cut-frontier-continuity';
import { MIN_BODY_SOURCES, type LengthCutDrops } from '../../lib/audit-length-cut-world-models-continuity';
import { preFrontierLengthCut } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /frontier length cut continuity drift/;
const blank = { bytes: 0, sha256: '' };
const paths = ['bear-case', 'competing-theses', 'dexterity', 'generalization', 'reliability-gap', 'safety-and-assurance']
  .map((slug) => `content/frontier/${slug}.mdx`);
/** Dexterity's pins, as [spec under tests/, how many, disposition], in review order. */
const dexterityPins = (counts: ReadonlyArray<readonly [string, number, string?]>) =>
  counts.flatMap(([test, n, disposition = 'moved']) =>
    Array.from({ length: n }, () => ['content/frontier/dexterity.mdx', `tests/${test}`, disposition]));
// A spec literal escapes the quote character it is written in.
const literals = (text: string) => [`'${text.replaceAll("'", "\\'")}'`, `"${text.replaceAll('"', '\\"')}"`];
const holds = (spec: string, text: string) =>
  [text, text.replaceAll("'", "\\'"), text.replaceAll('"', '\\"')].some((form) => spec.includes(form));

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('frontier length cut 2026-10-13 article successors', () => {
  const review = loadFrontierLengthCutReview(root);

  it('reviews the six cut frontier articles, under the owner instruction, dexterity from its later base', () => {
    expect(frontierLengthCutSuccessorPaths()).toEqual(paths);
    expect(review.ownerApproval).toContain(
      '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
    expect(review.sources.map(({ after }) => after.path)).toEqual(paths);
    // Five were cut from a3137297; dexterity was cut after the images-a landing, from 9a0a3ae5.
    expect(review.sources.map(({ archivedFrom }) => archivedFrom.slice(0, 8))).toEqual(
      ['a3137297', 'a3137297', '9a0a3ae5', 'a3137297', 'a3137297', 'a3137297']);
  });

  it('rebuilds every reviewed successor into its recorded predecessor, which the older layers still decide', () => {
    for (const source of review.sources) {
      const live = read(source.after.path);
      const prior = frontierLengthCutPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(frontierLengthCutPredecessor(root, source.after, live)).toBe(live);
      // Older checks read the rebuilt bytes through the shared helper chain.
      expect(sha(preFrontierLengthCut(source.after.path))).toBe(source.before.sha256);
      // The figure-mount layer is next for competing theses, the 2026-10-06 domain pass for the rest,
      // dexterity included.
      const ref = { path: source.after.path, ...blank };
      if (source.after.path.endsWith('competing-theses.mdx')) {
        expect(figureMountSuccessorPaths()).toContain(source.after.path);
        expect(figureMountPredecessor(root, ref, prior)).not.toEqual(prior);
      } else {
        expect(domainPassSuccessorPaths()).toContain(source.after.path);
        expect(domainPassPredecessor(root, ref, prior)).not.toEqual(prior);
      }
    }
  });

  it('cuts each article by words and keeps 30 sources, listing every drop with the claim it came from', () => {
    const words = (bytes: Buffer) => bytes.toString().replace(/^---\n[\s\S]*?\n---\n/, '').split(/\s+/).length;
    for (const source of review.sources) {
      const live = read(source.after.path);
      const body = live.toString().replace(/^---\n[\s\S]*?\n---\n/, '');
      expect(new Set([...body.matchAll(/<Cite id="([^"]+)"/g)].map((m) => m[1])).size)
        .toBeGreaterThanOrEqual(MIN_BODY_SOURCES);
      expect(words(live)).toBeLessThan(words(frontierLengthCutPredecessor(root, source.before, live)));
      for (const list of Object.values(source.dropped)) {
        for (const { value, claim } of list) {
          expect(value.length).toBeGreaterThan(0);
          expect(claim.length).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });

  it('lists the pins the cut moved or retired, and the reader specs follow them', () => {
    const pinned = review.sources.flatMap(({ after, pins }) => pins.map((pin) => ({ ...pin, path: after.path })));
    expect(pinned.map(({ path, test, disposition }) => [path, test, disposition])).toEqual([
      ['content/frontier/competing-theses.mdx', 'tests/e2e/brooks-theses-readers.spec.ts', 'moved'],
      ['content/frontier/competing-theses.mdx', 'tests/e2e/brooks-theses-readers.spec.ts', 'retired'],
      ['content/frontier/competing-theses.mdx', 'tests/e2e/thesis-economics-readers.spec.ts', 'moved'],
      ...dexterityPins([
        ['e2e/dexterity-brooks-readers.spec.ts', 2], ['e2e/dexterity-brooks-remaining-readers.spec.ts', 1],
        ['e2e/dexterity-figure-holson-remaining-readers.spec.ts', 4], ['e2e/dexterity.spec.ts', 5],
        ['unit/dexterity-brooks-remaining-source.test.ts', 1], ['unit/dexterity-brooks-source.test.ts', 2],
        ['unit/dexterity-figure-holson-remaining-source.test.ts', 3], ['unit/dexterity-figure15-source.test.ts', 1, 'retired'],
        ['helpers/kol-backlog-20261001.ts', 3], ['helpers/kol-backlog-20261005.ts', 1],
        ['helpers/kol-backlog-20261007.ts', 1], ['helpers/kol-backlog-20261009.ts', 1],
        ['helpers/kol-backlog-20261012.ts', 3],
      ]),
      ['content/frontier/safety-and-assurance.mdx', 'tests/helpers/kol-backlog-20261012.ts', 'moved'],
    ]);
    for (const { path, test, phrase, disposition, to, reason } of pinned) {
      const live = read(path).toString();
      const spec = read(test).toString();
      expect(reason?.length ?? 0).toBeGreaterThan(40);
      expect(live).not.toContain(phrase);
      if (disposition === 'moved' && test.startsWith('tests/helpers/kol-backlog-')) {
        // The KOL batch helper keeps the paragraph as its batch wrote it, as a record.
        expect(live).toContain(to);
        expect(holds(spec, phrase)).toBe(true);
      } else if (disposition === 'moved') {
        expect(live).toContain(to);
        expect(literals(to!).some((literal) => spec.includes(literal)), `${test} selects: ${to}`).toBe(true);
        expect(holds(spec, phrase), `${test} still selects: ${phrase}`).toBe(false);
      } else if (path.endsWith('competing-theses.mdx')) {
        // The thesis explorer's form-factor card keeps the fact, and the spec checks it there.
        expect(read('lib/competing-theses.ts').toString()).toContain(phrase);
        expect(spec).toContain(`await expect(detail).toContainText('${phrase}');`);
      } else {
        // The Figure hand card keeps the unassigned comparison, and the source test checks it there.
        const card = `A${phrase.slice(1)}`;
        expect(read('lib/dexterous-hands.ts').toString()).toContain(card);
        expect(spec).toContain(`expect(readFileSync('lib/dexterous-hands.ts', 'utf8')).toContain('${card}');`);
      }
    }
  });

  it('records the two corrected blocks: the reliability self-check and the competing-theses stat strip', () => {
    const corrected = review.sources.flatMap(({ after, corrected }) => corrected.map((c) => ({ ...c, path: after.path })));
    expect(corrected.map(({ path }) => path)).toEqual(
      ['content/frontier/competing-theses.mdx', 'content/frontier/reliability-gap.mdx']);
    for (const { path, before, after, reason } of corrected) {
      const live = read(path).toString();
      expect(reason.length).toBeGreaterThan(40);
      expect(live).toContain(after);
      expect(live).not.toContain(before);
    }
    const [stats, selfCheck] = corrected;
    expect(stats.before).toContain('value="~300k h"');
    expect(stats.after).toContain('value="$3.5B"');
    expect(selfCheck.before).toContain('detection is not prevention');
    expect(selfCheck.after).not.toContain('recover failures it has not seen');
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(frontierLengthCutPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(frontierLengthCutPredecessor(root, { path: 'content/adjacent/space.mdx', ...blank }, drifted))
      .toBe(drifted);
    expect(() => verifyFrontierLengthCutSource(source, drifted)).toThrow(drift);
  });

  it('admits a corrected block only whole, once, with a reason, and never as a way to add a source', () => {
    const cites = Array.from({ length: 31 }, (_, i) => `<Cite id="s${i}" />`).join(' ');
    const block = '<div className="stats">\n  <Stat label="a" value="1" />\n</div>';
    const prior = ['---', 'title: "A"', '---', '', `Kept claim ${cites}.`, '', block, '',
      'A recap <Cite id="s0" />.', '', '## Next', '', 'Closing words.', ''].join('\n');
    const fixedBlock = block.replace('value="1"', 'value="2"');
    const cut = prior.replace('A recap <Cite id="s0" />.\n\n', '').replace(block, fixedBlock);
    const dropped: LengthCutDrops = {
      citations: [{ value: 's0', claim: 'A recap with one source' }], numbers: [{ value: '0', claim: 'A recap with one source' }],
      links: [], terms: [],
    };
    const reason = 'The tile had no source in the article and gives way to a cited figure.';
    const path = 'content/frontier/x.mdx';
    const keeps = (current: string, corrected: { before: string; after: string; reason: string }[]) =>
      keepsFrontierLengthCutObligations(path, prior, current, dropped, [], corrected);
    expect(keeps(cut, [{ before: block, after: fixedBlock, reason }])).toBe(true);
    expect(uncorrectedFrontierArticle(prior, cut, [{ before: block, after: fixedBlock, reason }]))
      .toBe(prior.replace('A recap <Cite id="s0" />.\n\n', ''));
    // An unrecorded block change, a short reason, or a correction outside the frontier.
    expect(keeps(cut, [])).toBe(false);
    expect(keeps(cut, [{ before: block, after: fixedBlock, reason: 'stale' }])).toBe(false);
    expect(keepsFrontierLengthCutObligations('content/world-models/x.mdx', prior, cut, dropped, [],
      [{ before: block, after: fixedBlock, reason }])).toBe(false);
    // Only part of a block, or a block the earlier article did not hold.
    expect(keeps(cut, [{ before: 'value="1"', after: 'value="2"', reason }])).toBe(false);
    expect(keeps(cut, [{ before: fixedBlock, after: block, reason }])).toBe(false);
    // Text outside the corrected block still has to keep every obligation.
    expect(keeps(cut.replace('Closing words.', 'Closing 7.'), [{ before: block, after: fixedBlock, reason }])).toBe(false);
    expect(keeps(prior.replace(block, fixedBlock), [{ before: block, after: fixedBlock, reason }])).toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'length-cut-frontier-continuity-test-'));
      scratchRoots.push(tmp);
      const dir = FRONTIER_LENGTH_CUT_CONTINUITY_DIR;
      cpSync(join(root, dir), join(tmp, dir), { recursive: true });
      const file = join(tmp, dir, 'source-transition.json');
      if (mode === 'missing') rmSync(file);
      else if (mode === 'corrupt') writeFileSync(file, mode);
      else writeFileSync(file, readFileSync(file, 'utf8')
        .replace('"length-cut-20261013-frontier"', '"length-cut-drift"'));
      expect(() => loadFrontierLengthCutReview(tmp)).toThrow(drift);
      expect(() => frontierLengthCutPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
