import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  KOL_BACKLOG_CONTINUITY_DIR, keepsKolBacklogObligations, kolBacklogPredecessor, kolBacklogSuccessorPaths,
  loadKolBacklogReview, verifyKolBacklogSource,
} from '../../lib/audit-kol-backlog-continuity';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preDomainPass } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
// The newer domain-pass layer hands back the KOL backlog successor of a rewritten article.
const read = (path: string) => preDomainPass(path);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /kol backlog continuity drift/;

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('KOL backlog 2026-10-05 article successors', () => {
  const review = loadKolBacklogReview(root);

  it('rebuilds every reviewed successor into its recorded predecessor', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(kolBacklogSuccessorPaths());
    expect(review.sources.length).toBeGreaterThan(0);
    for (const source of review.sources) {
      expect(source.after.path).toMatch(/^content\/[a-z-]+\/[a-z0-9-]+\.mdx$/);
      const live = read(source.after.path);
      const prior = kolBacklogPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(kolBacklogPredecessor(root, source.after, live)).toBe(live);
      // The older layers see the pre-batch article, never the live one.
      expect(seoPassPredecessor(root, source.before, live)).not.toEqual(live);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(kolBacklogPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(() => verifyKolBacklogSource(source, drifted)).toThrow(drift);
  });

  it('admits only added lines and appended frontmatter citation ids', () => {
    const prior = '---\ntitle: "A"\ncitations:\n  - a-2020\nseeAlso:\n  - "x/y"\n---\n\nOne.\n\nTwo <Cite id="a-2020" />.\n';
    const added = prior.replace('  - a-2020\n', '  - a-2020\n  - b-2026\n').replace('One.\n', 'One.\n\nNew <Cite id="b-2026" />.\n');
    const path = 'content/x/y.mdx';
    expect(keepsKolBacklogObligations(path, prior, added)).toBe(true);
    expect(keepsKolBacklogObligations(path, prior, added.replace('Two', 'Too'))).toBe(false);
    expect(keepsKolBacklogObligations(path, prior, added.replace('title: "A"', 'title: "B"'))).toBe(false);
    expect(keepsKolBacklogObligations(path, prior, added.replace('  - b-2026\n', '  - b-2026\n  - a-2020\n'))).toBe(false);
    expect(keepsKolBacklogObligations(path, prior, added.replace('  - a-2020\n  - b-2026\n', '  - b-2026\n  - a-2020\n')))
      .toBe(false);
    expect(keepsKolBacklogObligations('components/x.tsx', prior, added)).toBe(false);
  });

  it('rejects a review that drifted from its pinned bytes', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kol-backlog-continuity-test-'));
    scratchRoots.push(tmp);
    cpSync(join(root, KOL_BACKLOG_CONTINUITY_DIR), join(tmp, KOL_BACKLOG_CONTINUITY_DIR), { recursive: true });
    const path = join(tmp, KOL_BACKLOG_CONTINUITY_DIR, 'source-transition.json');
    writeFileSync(path, readFileSync(path, 'utf8').replace('"kol-backlog-20261005"', '"kol-backlog-drift"'));
    expect(() => loadKolBacklogReview(tmp)).toThrow(drift);
    const [source] = review.sources;
    expect(() => kolBacklogPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
  });
});
