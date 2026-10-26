import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EXPLAINER_MOUNTS } from '../../components/explainers/mounts';
import {
  EXPLAINER_IMPORT, EXPLAINER_MOUNT_CONTINUITY_DIR, explainerMountPredecessor, explainerMountSuccessorPaths,
  keepsExplainerMountObligations, loadExplainerMountReview, verifyExplainerMountSource,
} from '../../lib/audit-explainer-mount-continuity';
import { answerOptionsPredecessor } from '../../lib/audit-answer-options-continuity';
import { createLocalArtifactReader } from '../../lib/audit-local-basis';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { preAnswerOptions, preExplainerMounts, preSeoPass } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
// No newer layer precedes this one, so the live article is itself the successor.
const read = (path: string) => readFileSync(join(root, path));
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const drift = /explainer-mount continuity drift/;
const blank = { bytes: 0, sha256: '' };
const ARTICLES = Object.values(EXPLAINER_MOUNTS).map(({ article }) => `content/${article}.mdx`).sort();

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('explainer mounts 2026-10-26 article successors', () => {
  const review = loadExplainerMountReview(root);

  it('reviews exactly the twelve home articles that mount an explainer', () => {
    expect(ARTICLES).toHaveLength(12);
    expect([...explainerMountSuccessorPaths()].sort()).toEqual(ARTICLES);
    expect(review.sources.map(({ after }) => after.path).sort()).toEqual(ARTICLES);
  });

  it('rebuilds every reviewed successor into the committed bytes the older layers and proofs still decide', () => {
    for (const source of review.sources) {
      const path = source.after.path;
      const live = read(path);
      const prior = explainerMountPredecessor(root, source.before, live);
      expect([prior.length, sha(prior)]).toEqual([source.before.bytes, source.before.sha256]);
      // The rebuilt bytes are the article as committed before the mount.
      expect(prior).toEqual(execFileSync('git', ['show', `${source.archivedFrom}:${path}`], { cwd: root }));
      expect(prior.toString()).not.toContain('ExplainerFigure');
      expect(explainerMountPredecessor(root, source.after, live)).toBe(live);
      expect(keepsExplainerMountObligations(path, prior.toString(), live.toString())).toBe(true);
      // The artifact readers see this layer first, and every older layer
      // receives the rebuilt bytes instead of the live article.
      expect(preExplainerMounts(path)).toEqual(prior);
      expect(preAnswerOptions(path)).toEqual(answerOptionsPredecessor(root, { path, ...blank }, prior));
      expect(seoPassPredecessor(root, source.before, live)).toEqual(prior);
      expect(preSeoPass(path)).not.toEqual(live);
    }
  });

  it('hands the local artifact reader the article bytes older proofs pinned', () => {
    for (const source of review.sources) {
      expect(createLocalArtifactReader(root)(source.before))
        .toEqual(explainerMountPredecessor(root, source.before, read(source.after.path)));
    }
  });

  it('passes other bytes through and rejects a successor whose edits no longer replay', () => {
    const source = review.sources.find(({ after }) => after.path === 'content/classical/kinematics.mdx')!;
    const drifted = Buffer.concat([read(source.after.path), Buffer.from('\n')]);
    expect(explainerMountPredecessor(root, source.before, drifted)).toBe(drifted);
    expect(explainerMountPredecessor(root, { path: 'content/classical/control.mdx', ...blank }, drifted)).toBe(drifted);
    expect(() => verifyExplainerMountSource(source, drifted)).toThrow(drift);
    const replaced = { ...source, edits: [{ before: 'Inverse kinematics seeks', after: 'Inverse kinematics finds' }] };
    expect(() => verifyExplainerMountSource(replaced, read(source.after.path))).toThrow(drift);
    const misPinned = { ...source, before: { ...source.before, sha256: '0'.repeat(64) } };
    expect(() => verifyExplainerMountSource(misPinned, read(source.after.path))).toThrow(drift);
  });

  it('admits only the import, the row\'s mount and cue, and /how-robots-work/ links around existing words', () => {
    const path = 'content/classical/kinematics.mdx';
    const { cue } = EXPLAINER_MOUNTS.reaching;
    const prior = [
      '---', 'title: Demo', '---', '', "import { PlanarFkArm } from '@/components/interactive/planar-fk-arm';", '',
      'A serial arm is a chain of 6 links <Cite id="demo-2024" />.', '',
      'Inverse kinematics seeks angles <Cite id="demo-2024" />.', '', 'Closed forms exist.', '',
    ].join('\n');
    const mounted = prior
      .replace("planar-fk-arm';\n", `planar-fk-arm';\n\n${EXPLAINER_IMPORT}\n`)
      .replace('seeks angles <Cite id="demo-2024" />.', `seeks angles <Cite id="demo-2024" />. ${cue}\n\n<ExplainerFigure id="reaching" />`);
    const linked = mounted.replace('A serial arm is a chain', '[A serial arm is a chain](/how-robots-work/#arm)');
    expect(keepsExplainerMountObligations(path, prior, mounted)).toBe(true);
    expect(keepsExplainerMountObligations(path, prior, linked)).toBe(true);
    expect(keepsExplainerMountObligations(path, prior, prior)).toBe(false);
    // Another article, a second mount, the wrong explainer, a missing cue or import, or any other change.
    expect(keepsExplainerMountObligations('content/classical/control.mdx', prior, mounted)).toBe(false);
    const withLink = prior.replace('A serial arm is a chain', '[A serial arm is a chain](/how-robots-work/#arm)');
    expect(keepsExplainerMountObligations(path, withLink, mounted), 'a /how-robots-work/ link dropped').toBe(false);
    for (const [base, from, to] of [
      [linked, 'id="reaching"', 'id="arm"'],
      [linked, ` ${cue}`, ''],
      [linked, 'the figure below', 'the figure above'],
      [linked, `${EXPLAINER_IMPORT}\n`, ''],
      [linked, '<ExplainerFigure id="reaching" />', '<ExplainerFigure id="reaching" />\n\n<ExplainerFigure id="reaching" />'],
      [linked, 'of 6 links', 'of six links'],
      [linked, '<Cite id="demo-2024" />.', '<Cite id="demo-2025" />.'],
      [linked, 'Closed forms exist.', 'Closed forms [exist](/classical/control/).'],
      [mounted, 'A serial arm is a chain', '[A serial arm is a chain](/classical/control/)'],
      [mounted, 'A serial arm is a chain', '[A serial arm](/how-robots-work/#arm) is one chain'],
    ] as const) {
      const mutated = base.replace(from, to);
      expect(mutated, from).not.toBe(base);
      expect(keepsExplainerMountObligations(path, prior, mutated), `${from} -> ${to}`).toBe(false);
    }
    // A linking article that mounts nothing may only gain /how-robots-work/ links.
    const linking = 'content/manipulation/bc-foundations.mdx';
    expect(keepsExplainerMountObligations(linking, prior, prior.replace('A serial arm', '[A serial arm](/how-robots-work/#puppeteer)'))).toBe(true);
    expect(keepsExplainerMountObligations(linking, prior, mounted)).toBe(false);
  });

  it('rejects a missing, corrupt or renamed review', () => {
    const [source] = review.sources;
    for (const mode of ['missing', 'corrupt', 'renamed'] as const) {
      const tmp = mkdtempSync(join(tmpdir(), 'explainer-mount-continuity-test-'));
      scratchRoots.push(tmp);
      cpSync(join(root, EXPLAINER_MOUNT_CONTINUITY_DIR), join(tmp, EXPLAINER_MOUNT_CONTINUITY_DIR), { recursive: true });
      const file = join(tmp, EXPLAINER_MOUNT_CONTINUITY_DIR, 'source-transition.json');
      if (mode === 'missing') rmSync(file);
      else if (mode === 'corrupt') writeFileSync(file, mode);
      else writeFileSync(file, readFileSync(file, 'utf8').replace('"explainer-mounts-20261026"', '"explainer-mounts-drift"'));
      expect(() => loadExplainerMountReview(tmp)).toThrow(drift);
      expect(() => explainerMountPredecessor(tmp, source.before, read(source.after.path))).toThrow(drift);
    }
  });
});
