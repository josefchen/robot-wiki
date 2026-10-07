import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DOMAIN_PASS_CONTINUITY_DIR, domainPassCheckerPredecessor, domainPassPredecessor, domainPassSuccessorPaths,
  keepsDomainPassObligations, loadDomainPassCheckerReview, loadDomainPassReview, verifyDomainPassSource,
} from '../../lib/audit-domain-pass-continuity';
import { seoPassCheckerPredecessor, seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /domain pass continuity drift/;

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('domain pass 2026-10-06 article successors', () => {
  const review = loadDomainPassReview(root);

  it('rebuilds every reviewed successor into its recorded predecessor', () => {
    expect(review.sources.map(({ after }) => after.path)).toEqual(domainPassSuccessorPaths());
    expect(review.sources.length).toBeGreaterThan(0);
    for (const source of review.sources) {
      expect(source.after.path).toMatch(/^content\/[a-z0-9-]+\/[a-z0-9-]+\.mdx$/);
      const live = read(source.after.path);
      const prior = domainPassPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      expect(domainPassPredecessor(root, source.after, live)).toBe(live);
      // The older layers see the pre-pass article, never the live one.
      expect(seoPassPredecessor(root, source.before, live)).not.toEqual(live);
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const [source] = review.sources;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(domainPassPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(() => verifyDomainPassSource(source, drifted)).toThrow(drift);
  });

  it('admits rewritten prose and appended citations but keeps every mount, citation and field', () => {
    const prior = [
      '---', 'title: "A"', 'citations:', '  - a-2020', 'seeAlso:', '  - "x/y"', '---', '',
      'One long sentence <Cite id="a-2020" />.', '', '<Figure id="f" />', '',
      '<Callout type="note">Boxed fact <Cite id="a-2020" />.</Callout>', '',
    ].join('\n');
    const rewritten = prior
      .replace('  - a-2020\n', '  - a-2020\n  - b-2026\n')
      .replace('One long sentence', 'Short <Cite id="b-2026" />, and')
      .replace('<Callout type="note">Boxed fact <Cite id="a-2020" />.</Callout>', 'Plain fact <Cite id="a-2020" />.');
    const path = 'content/x/y.mdx';
    expect(keepsDomainPassObligations(path, prior, rewritten)).toBe(true);
    // A citation the article had is no longer cited.
    expect(keepsDomainPassObligations(path, prior, rewritten.replaceAll('<Cite id="a-2020" />', ''))).toBe(false);
    // A figure mount is removed, changed or added.
    expect(keepsDomainPassObligations(path, prior, rewritten.replace('<Figure id="f" />\n', ''))).toBe(false);
    expect(keepsDomainPassObligations(path, prior, rewritten.replace('<Figure id="f" />', '<Figure id="g" />'))).toBe(false);
    expect(keepsDomainPassObligations(path, prior, rewritten.replace('<Figure id="f" />', '<Figure id="f" />\n\n<Chart />')))
      .toBe(false);
    // A frontmatter field changes, or the citation list is reordered.
    expect(keepsDomainPassObligations(path, prior, rewritten.replace('title: "A"', 'title: "B"'))).toBe(false);
    expect(keepsDomainPassObligations(path, prior, rewritten.replace('  - a-2020\n  - b-2026\n', '  - b-2026\n  - a-2020\n')))
      .toBe(false);
    expect(keepsDomainPassObligations('components/x.tsx', prior, rewritten)).toBe(false);
  });

  it('rejects a review that drifted from its pinned bytes', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'domain-pass-continuity-test-'));
    scratchRoots.push(tmp);
    cpSync(join(root, DOMAIN_PASS_CONTINUITY_DIR), join(tmp, DOMAIN_PASS_CONTINUITY_DIR), { recursive: true });
    const path = join(tmp, DOMAIN_PASS_CONTINUITY_DIR, 'source-transition.json');
    writeFileSync(path, readFileSync(path, 'utf8').replace('"domain-pass-20261006"', '"domain-pass-drift"'));
    expect(() => loadDomainPassReview(tmp)).toThrow(drift);
    const [source] = review.sources;
    expect(() => domainPassPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
  });
});

describe('domain pass 2026-10-06 checker revision', () => {
  const checkerPath = 'lib/audit-local-basis.ts';
  const checker = read(checkerPath);
  const review = loadDomainPassCheckerReview(root);
  const checkerDrift = /domain pass checker continuity drift/;
  const hashOf = (line: string) => line.match(/currentTestHash: '([0-9a-f]{64})'/)![1];

  it('hands the reviewed checker its SEO-pass head and passes other bytes through', () => {
    const before = domainPassCheckerPredecessor(root, checker);
    expect([before.length, sha(before)]).toEqual([review.before.bytes, review.before.sha256]);
    expect([checker.length, sha(checker)]).toEqual([review.after.bytes, review.after.sha256]);
    expect(domainPassCheckerPredecessor(root, before)).toBe(before);
    const drifted = Buffer.concat([checker, Buffer.from('\n')]);
    expect(domainPassCheckerPredecessor(root, drifted)).toBe(drifted);
    // The SEO-pass layer decides the rebuilt head exactly as it did before the pass.
    expect(seoPassCheckerPredecessor(root, checker)).toEqual(seoPassCheckerPredecessor(root, before));
  });

  it('re-pins only the reviewed live hash of each suite the passes brought up to date', () => {
    const current = checker.toString();
    const before = domainPassCheckerPredecessor(root, checker).toString();
    expect(review.edits.length).toBeGreaterThan(0);
    for (const edit of review.edits) {
      expect(edit.before).toMatch(/^ {4}currentTestHash: '[0-9a-f]{64}',\n$/);
      expect(edit.after).toMatch(/^ {4}currentTestHash: '[0-9a-f]{64}',\n$/);
      expect(hashOf(edit.after)).toBe(sha(read(edit.suite)));
      expect(hashOf(edit.before)).not.toBe(sha(read(edit.suite)));
      expect(current.split(`  '${edit.suite}': {\n`)).toHaveLength(2);
      expect(current.split(edit.after)).toHaveLength(2);
      expect(before.split(edit.before)).toHaveLength(2);
    }
    expect(current.split('\n').filter((line, index) => line !== before.split('\n')[index]))
      .toHaveLength(review.edits.length);
  });

  it('rejects a missing, corrupt or retargeted checker review', () => {
    for (const mode of ['missing', 'corrupt', 'retargeted', 'moved'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'domain-pass-checker-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, DOMAIN_PASS_CONTINUITY_DIR), join(tmp, DOMAIN_PASS_CONTINUITY_DIR), { recursive: true });
      const path = join(tmp, DOMAIN_PASS_CONTINUITY_DIR, 'checker-transition.json');
      const text = readFileSync(path, 'utf8');
      if (mode === 'missing') rmSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else if (mode === 'retargeted') writeFileSync(path, text.replace(`"bytes": ${review.before.bytes}`, `"bytes": ${review.before.bytes + 1}`));
      else writeFileSync(path, text.replace(`"suite": "${review.edits[0].suite}"`, '"suite": "tests/unit/other.test.ts"'));
      expect(() => domainPassCheckerPredecessor(tmp, checker)).toThrow(checkerDrift);
    }
  });
});
