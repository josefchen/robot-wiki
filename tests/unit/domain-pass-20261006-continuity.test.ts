import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DOMAIN_PASS_CONTINUITY_DIR, domainPassCheckerPredecessor, domainPassPredecessor, domainPassSuccessorPaths,
  keepsDomainPassObligations, loadDomainPassCheckerReview, loadDomainPassReview, verifyDomainPassSource,
} from '../../lib/audit-domain-pass-continuity';
import { figureMountPredecessor } from '../../lib/audit-figure-mount-continuity';
import { seoPassCheckerPredecessor, seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';

const root = resolve(import.meta.dirname, '../..');
// The newer figure-mount layer hands back the domain-pass successor first.
const read = (path: string) => figureMountPredecessor(root, { path, bytes: 0, sha256: '' }, readFileSync(join(root, path)));
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

  it('admits only the exact Stat corrections the classical sweep named, on their own article', () => {
    const stat = (attributes: string) => [
      '---', 'title: "K"', 'citations:', '  - a-2020', '---', '', `<${attributes} />`, '', 'Text <Cite id="a-2020" />.', '',
    ].join('\n');
    const prior = stat('Stat label="SO-101 revolute joints" value="6" note="the arm in the 3D playground"');
    const fixed = stat('Stat label="SO-101 arm joints" value="5" note="plus a gripper, in the 3D playground"');
    expect(keepsDomainPassObligations('content/classical/kinematics.mdx', prior, fixed)).toBe(true);
    // The same swap on another article, or any other value on the named one, is still a changed mount.
    expect(keepsDomainPassObligations('content/classical/control.mdx', prior, fixed)).toBe(false);
    expect(keepsDomainPassObligations('content/classical/kinematics.mdx', prior, fixed.replace('value="5"', 'value="4"')))
      .toBe(false);
    expect(keepsDomainPassObligations('content/classical/kinematics.mdx', fixed, prior)).toBe(false);
  });

  it('admits the corrected pendulum prediction exactly, and only on control', () => {
    const path = 'content/classical/control.mdx';
    const source = review.sources.find(({ after }) => after.path === path)!;
    const live = read(path);
    const prediction = (bytes: Buffer) => String(bytes).match(/<PredictThenReveal\b[^>]*>/)![0];
    const article = (mount: string) => ['---', 'title: "C"', '---', '', mount, '', '</PredictThenReveal>', ''].join('\n');
    const prior = article(prediction(domainPassPredecessor(root, source.before, live)));
    const fixed = article(prediction(live));
    expect(fixed).not.toEqual(prior);
    expect(keepsDomainPassObligations(path, prior, fixed)).toBe(true);
    // The same swap on another article, a partial one or its reverse is still a changed mount.
    expect(keepsDomainPassObligations('content/classical/kinematics.mdx', prior, fixed)).toBe(false);
    expect(keepsDomainPassObligations(path, prior, fixed.replace('sags to a steep lean', 'falls'))).toBe(false);
    expect(keepsDomainPassObligations(path, fixed, prior)).toBe(false);
  });

  it('admits the sourced why-rl-locomotion insertion tile exactly, and only on that article', () => {
    const path = 'content/rl-sim2real/why-rl-locomotion.mdx';
    const source = review.sources.find(({ after }) => after.path === path)!;
    const live = read(path);
    const tile = (bytes: Buffer) => String(bytes).match(/<Stat label="(?:Manipulation equivalent|Sim-to-real insertion)"[^>]*\/>/)![0];
    const article = (mount: string) => ['---', 'title: "W"', '---', '', mount, ''].join('\n');
    const prior = article(tile(domainPassPredecessor(root, source.before, live)));
    const fixed = article(tile(live));
    expect(prior).toContain('<Stat label="Manipulation equivalent" value="none" note="no four-minute number exists in 2026" />');
    expect(fixed).toContain('<Stat label="Sim-to-real insertion" value="60%" note="Play2Perfect, 0.5 mm clearance (CoRL 2026)" />');
    expect(keepsDomainPassObligations(path, prior, fixed)).toBe(true);
    // The same swap on another article, any other value or its reverse is still a changed mount.
    expect(keepsDomainPassObligations('content/rl-sim2real/sim2real-transfer.mdx', prior, fixed)).toBe(false);
    expect(keepsDomainPassObligations(path, prior, fixed.replace('value="60%"', 'value="90%"'))).toBe(false);
    expect(keepsDomainPassObligations(path, prior, fixed.replace('Sim-to-real insertion', 'Manipulation equivalent')))
      .toBe(false);
    expect(keepsDomainPassObligations(path, fixed, prior)).toBe(false);
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
