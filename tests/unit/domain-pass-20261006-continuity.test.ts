import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DOMAIN_PASS_CONTINUITY_DIR, DROPPED_FOR_PRIMARIES, correctedSource, domainPassCheckerPredecessor, domainPassPredecessor,
  domainPassSuccessorPaths, keepsDomainPassObligations, keepsRedoneSource, loadDomainPassCheckerReview, loadDomainPassReview,
  verifyDomainPassSource,
} from '../../lib/audit-domain-pass-continuity';
import { parallelLocalCheckerPredecessor } from '../../lib/audit-parallel-local-continuity';
import { seoPassCheckerPredecessor, seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preFigureMounts } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
// The newer word-budget trim and figure-mount layers hand back the domain-pass successor first,
// and the parallel-local checker layer hands back the domain-pass checker.
const read = (path: string) => path === 'lib/audit-local-basis.ts'
  ? parallelLocalCheckerPredecessor(root, preFigureMounts(path)) : preFigureMounts(path);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /domain pass continuity drift/;
const correctedSources = ['components/interactive/reliability-compounding.tsx', 'data/glossary.ts'];

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
      if (!correctedSources.includes(source.after.path)) {
        expect(source.after.path).toMatch(/^content\/[a-z0-9-]+\/[a-z0-9-]+\.mdx$/);
      }
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

  it('admits the corrected rl-for-robotics description exactly, and only on that article', () => {
    const path = 'content/rl-sim2real/rl-for-robotics.mdx';
    const source = review.sources.find(({ after }) => after.path === path)!;
    const live = read(path);
    const line = (bytes: Buffer) => String(bytes).match(/^description: .*$/m)![0];
    const article = (description: string) => ['---', 'title: "R"', description, '---', '', 'Prose.', ''].join('\n');
    const prior = article(line(domainPassPredecessor(root, source.before, live)));
    const fixed = article(line(live));
    expect(prior).toContain('A labelled constant-rate toy contrasts simulation');
    expect(fixed).toContain('An illustrative constant-rate model compares simulation');
    expect(keepsDomainPassObligations(path, prior, fixed)).toBe(true);
    // The same swap on another article, any other wording or its reverse is still a changed field.
    expect(keepsDomainPassObligations('content/rl-sim2real/offline-rl.mdx', prior, fixed)).toBe(false);
    expect(keepsDomainPassObligations(path, prior, fixed.replace('real runs', 'robot runs'))).toBe(false);
    expect(keepsDomainPassObligations(path, fixed, prior)).toBe(false);
    expect(keepsDomainPassObligations(path, prior, fixed.replace('title: "R"', 'title: "S"'))).toBe(false);
  });

  it('admits the two QA source corrections exactly, and only on their own files', () => {
    for (const path of correctedSources) {
      const source = review.sources.find(({ after }) => after.path === path)!;
      const live = read(path).toString();
      const prior = domainPassPredecessor(root, source.before, read(path)).toString();
      expect(live).not.toEqual(prior);
      expect(keepsDomainPassObligations(path, prior, live)).toBe(true);
      expect(keepsDomainPassObligations(correctedSources.find((other) => other !== path)!, prior, live)).toBe(false);
      expect(keepsDomainPassObligations(path, prior, `${live}\n`)).toBe(false);
      expect(keepsDomainPassObligations(path, live, prior)).toBe(false);
    }
    // The chart's corrected file carries the PAD fix; the live file is the marble-run redo of it.
    const chartPath = correctedSources[0];
    const chartSource = review.sources.find(({ after }) => after.path === chartPath)!;
    const chartPrior = domainPassPredecessor(root, chartSource.before, read(chartPath)).toString();
    expect(correctedSource(chartPath, chartPrior)).toContain('const PAD = { top: 30, right: 14, bottom: 46, left: 58 };');
    expect(read(correctedSources[1]).toString()).not.toContain('not a contradiction but');
  });

  it('admits the reliability-gap control move only as the recorded swaps', () => {
    const path = correctedSources[0];
    const source = review.sources.find(({ after }) => after.path === path)!;
    const live = read(path).toString();
    const prior = domainPassPredecessor(root, source.before, read(path)).toString();
    const corrected = correctedSource(path, prior)!;
    // The job-length slider leaves the main view only on a mount with a preset set, in the corrected file and in its redo.
    for (const text of [corrected, live]) {
      expect(text).toContain('          {presetSet ? null : stepsField}\n');
      expect(text).toContain('          {presetSet ? stepsField : null}\n          <InstrumentReset onClick={reset} />\n');
    }
    // Keeping the slider in the main view on the reliability-gap mount, or
    // leaving the PAD fix out, is a different file.
    const keptInMainView = corrected.replace('{presetSet ? null : stepsField}', '{stepsField}');
    expect(keepsDomainPassObligations(path, prior, keptInMainView)).toBe(false);
    const unpadded = corrected.replace('bottom: 46, left: 58 }', 'bottom: 46, left: 44 }');
    expect(unpadded).not.toEqual(corrected);
    expect(keepsDomainPassObligations(path, prior, unpadded)).toBe(false);
    expect(keepsDomainPassObligations(path, prior, live.replace('{presetSet ? null : stepsField}', '{stepsField}'))).toBe(false);
  });

  it('admits the marble-run redo of the reliability chart only over its corrected file, keeping its named passages and recorded bytes', () => {
    const path = correctedSources[0];
    const source = review.sources.find(({ after }) => after.path === path)!;
    const live = read(path).toString();
    const prior = domainPassPredecessor(root, source.before, read(path)).toString();
    const corrected = correctedSource(path, prior)!;
    expect(live).toContain("from '@/components/iso/figures/marble-run'");
    expect(corrected).not.toContain('marble-run');
    expect(keepsRedoneSource(path, corrected, live)).toBe(true);
    expect(keepsDomainPassObligations(path, prior, live)).toBe(true);
    // Any other bytes, a changed headline, caption, prop, takeaway or slider, are refused.
    expect(keepsRedoneSource(path, corrected, `${live}\n`)).toBe(false);
    for (const [from, to] of [
      ["evaluation: 'At 95% per step, half of 14-step jobs fail',", "evaluation: 'At 95% per step, most 14-step jobs fail',"],
      ["  home: 'Even a robot that rarely slips", "  home: 'Even a robot that seldom slips"],
      ['defaultSteps?: number;', 'defaultSteps?: number | undefined;'],
      ['reports ${successPct} episode success after', 'shows ${successPct} episode success after'],
      ['min={1}', 'min={2}'],
    ] as const) {
      expect(live.split(from).length, from).toBe(2);
      expect(keepsRedoneSource(path, corrected, live.replace(from, to)), from).toBe(false);
    }
    // Over the uncorrected file, on another path, or as the corrected file itself, it is no redo.
    expect(keepsRedoneSource(path, prior, live)).toBe(false);
    expect(keepsRedoneSource(correctedSources[1], corrected, live)).toBe(false);
    expect(keepsRedoneSource(path, corrected, corrected)).toBe(false);
  });

  it('exempts only the listed secondary ids on their own articles, for the owner sweep reason', () => {
    expect(DROPPED_FOR_PRIMARIES.reason).toBe('owner sweep 20260929: secondary sources dropped for primaries');
    // Named ids per path, no patterns: widening the list is a reviewed gate change that fails here first.
    expect(Object.fromEntries(DROPPED_FOR_PRIMARIES.ids)).toEqual({
      'content/frontier/bear-case.mdx': ['unitree-profit-2026'],
      'content/frontier/competing-theses.mdx': ['figure-8hr-shift-2026'],
      'content/frontier/dexterity.mdx': ['wikipedia-humanoid-hand-2026'],
      'content/frontier/reliability-gap.mdx': ['figure-8hr-shift-2026'],
    });
    const prior = [
      '---', 'title: "A"', 'citations:', '  - a-2020', '  - figure-8hr-shift-2026', '  - c-2021', '---', '',
      'Primary <Cite id="a-2020" />. Press <Cite id="figure-8hr-shift-2026" />.', '',
      'Other <Cite id="c-2021" />.', '', '<Figure id="f" />', '',
    ].join('\n');
    // The press id leaves the body and the list; its primary is appended.
    const rewritten = prior
      .replace('  - figure-8hr-shift-2026\n  - c-2021\n', '  - c-2021\n  - b-2026\n')
      .replace('Press <Cite id="figure-8hr-shift-2026" />', 'Primary <Cite id="b-2026" />');
    const gap = 'content/frontier/reliability-gap.mdx';
    expect(keepsDomainPassObligations(gap, prior, rewritten)).toBe(true);
    expect(keepsDomainPassObligations('content/frontier/competing-theses.mdx', prior, rewritten)).toBe(true);
    // The same rewrite on an article with no listed ids, or on one that lists another id, still fails.
    expect(keepsDomainPassObligations('content/x/y.mdx', prior, rewritten)).toBe(false);
    expect(keepsDomainPassObligations('content/frontier/bear-case.mdx', prior, rewritten)).toBe(false);
    // Any other dropped id still fails, in the body or in the list.
    expect(keepsDomainPassObligations(gap, prior, rewritten.replace('Other <Cite id="c-2021" />', 'Other'))).toBe(false);
    expect(keepsDomainPassObligations(gap, prior, rewritten.replace('  - c-2021\n', ''))).toBe(false);
    expect(keepsDomainPassObligations(gap, prior, rewritten.replace('  - a-2020\n', ''))).toBe(false);
    // A look-alike id is not covered: nothing is matched by prefix or pattern.
    const lookalike = prior.replaceAll('figure-8hr-shift-2026', 'figure-8hr-shift-2025');
    expect(keepsDomainPassObligations(gap, lookalike,
      lookalike.replace('  - figure-8hr-shift-2025\n', '').replace('Press <Cite id="figure-8hr-shift-2025" />', 'Primary')))
      .toBe(false);
    // A listed id may leave, but it may not move: re-listing it later is a reorder.
    expect(keepsDomainPassObligations(gap, prior, rewritten.replace('  - b-2026\n', '  - b-2026\n  - figure-8hr-shift-2026\n')))
      .toBe(false);
    // Mounts and other frontmatter fields still bind on a listed article.
    expect(keepsDomainPassObligations(gap, prior, rewritten.replace('<Figure id="f" />', ''))).toBe(false);
    expect(keepsDomainPassObligations(gap, prior, rewritten.replace('title: "A"', 'title: "B"'))).toBe(false);
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
