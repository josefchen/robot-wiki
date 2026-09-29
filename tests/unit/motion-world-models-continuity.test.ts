import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import {
  approvedDeltaPath, compareBaseline, sha256, stableJson,
  type ApprovedDelta, type BaselineBundle,
} from '@/lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '@/scripts/brand-v2-baseline';
import { createLocalArtifactReader } from '@/lib/audit-local-basis';
import { reviewedDataHardwareChecker } from '@/lib/audit-data-hardware-motion-continuity';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path));
const baseline = JSON.parse(read('evidence/brand-v2/baseline/baseline.json').toString()) as BaselineBundle;
const approvals = JSON.parse(read('contract/brand-v2-approved-deltas.json').toString()).entries as ApprovedDelta[];
const review = JSON.parse(read('audit/evidence/industrial-release-20260924/dependency-review.json').toString());
const priorReview = read('audit/evidence/motion-world-models-20260927/dependency-review-before.json');
const slugs = [
  'evaluation', 'generative-sim', 'generative-video', 'jepa', 'latent-dynamics',
  'model-based-robot-learning', 'taxonomy', 'world-models-vs-simulators',
];
const truth = collectArticleTruthManifests();

describe('world-model motion prose and retained local-basis continuity', () => {
  it.each(slugs)('retains the humanizer endpoint and exact subsequent edges for %s', (slug) => {
    const id = `article:world-models/${slug}`;
    const path = `content/world-models/${slug}.mdx`;
    const previous = execFileSync('git', ['show', `68fd2b8:${path}`], { cwd: root, encoding: 'utf8' });
    const oldHash = sha256(stableJson({ path, body: matter(previous).content.trim() }));
    const currentHash = truth.prose.members.find((member) => member.id === id)?.hash;
    const edges = approvals.filter((entry) => entry.manifest === 'prose' && entry.memberId === id);
    const latest = edges.at(-1)!;
    const humanizer = edges.find((entry) =>
      entry.id === `motion-world-models-humanizer-v3-20260927-prose-${slug}`)!;
    const sealed = baseline.manifests.prose.members.find((member) => member.id === id)?.hash ?? sha256('missing');
    expect(humanizer).toBeDefined();
    // Later scoped passes append plain edges after the humanizer endpoint:
    // the s12 citation attachment on generative-sim, then the round-5
    // first-screen c/d mount swaps on three of these articles.
    const subsequent = edges.slice(edges.indexOf(humanizer) + 1);
    expect(subsequent.map((entry) => entry.id)).toEqual([
      ...(slug === 'generative-sim' ? ['motion-scrutiny-s12-20260928-prose-generative-sim-citation-attachment'] : []),
      ...(['generative-sim', 'generative-video', 'latent-dynamics'].includes(slug)
        ? [`round5-first-screen-cd-20260929-prose-${slug}`] : []),
    ]);
    let endpoint = humanizer.newHash;
    for (const entry of subsequent) {
      expect(entry.oldHash).toBe(endpoint);
      endpoint = entry.newHash;
    }
    if (subsequent.length > 0) {
      expect(approvedDeltaPath(edges.slice(0, -1), sealed, currentHash!).status).not.toBe('approved');
    } else {
      expect(latest).toBe(humanizer);
    }
    expect(latest.newHash).toBe(currentHash);
    expect(humanizer.oldHash).toBe(slug === 'taxonomy' ? sealed : oldHash);
    expect(approvedDeltaPath(edges.filter((entry) => entry !== humanizer && !subsequent.includes(entry)), sealed, oldHash).status).toBe('approved');
    expect(approvedDeltaPath(edges, sealed, currentHash!).status).toBe('approved');
    expect(approvedDeltaPath(edges.slice(0, -1), sealed, currentHash!).status).not.toBe('approved');
    expect(approvedDeltaPath([...edges.slice(0, -1), { ...latest, newHash: sha256('wrong endpoint') }],
      sealed, currentHash!).status).not.toBe('approved');
    if (slug === 'taxonomy') {
      expect(latest.reconciles).toEqual(edges.slice(0, -1).map(({ id, oldHash, newHash }) =>
        ({ id, oldHash, newHash })));
      expect(approvedDeltaPath([...edges.slice(0, -1), {
        ...latest, reconciles: latest.reconciles!.slice(1),
      }], sealed, currentHash!).status).not.toBe('approved');
    }
  });

  it('keeps the previous complete dependency review and historical taxonomy dependency intact', () => {
    expect(sha256(priorReview)).toBe('e9a82ba7e4ef259dead9ec4af0e087353a286366420075ae65f5168d704002e8');
    const previous = JSON.parse(priorReview.toString());
    const prior = previous.bindings.find((binding: { historical: { path: string } }) =>
      binding.historical.path === 'content/world-models/taxonomy.mdx');
    const current = review.bindings.find((binding: { historical: { path: string } }) =>
      binding.historical.path === 'content/world-models/taxonomy.mdx');
    expect(prior).toBeDefined();
    expect(current).toEqual({ ...prior, current: {
      path: 'content/world-models/taxonomy.mdx',
      bytes: read('content/world-models/taxonomy.mdx').length,
      sha256: sha256(read('content/world-models/taxonomy.mdx')),
    }, rationale: expect.stringContaining(prior.rationale) });
    expect(review.bindings.filter((binding: { historical: { path: string } }) =>
      binding.historical.path !== 'content/world-models/taxonomy.mdx')).toEqual(
        previous.bindings.filter((binding: { historical: { path: string } }) =>
          binding.historical.path !== 'content/world-models/taxonomy.mdx'),
      );
    expect(sha256(read('content/world-models/taxonomy.mdx'))).toBe(current.current.sha256);
    expect(current.current.sha256).not.toBe(prior.current.sha256);
    expect(current.preservedText.every((text: string) =>
      read('content/world-models/taxonomy.mdx').toString().includes(text))).toBe(true);
    expect(createLocalArtifactReader(root)(current.historical))
      .toEqual(read(current.snapshot.path));
  });

  it('pins the checker handoff without changing historical recipe bytes', () => {
    const transition = JSON.parse(read('audit/evidence/motion-world-models-20260927/checker-transition.json').toString());
    const former = read(transition.before.path);
    const current = read('audit/evidence/motion-data-hardware-20260927/audit-local-basis-before.ts.txt');
    expect(former.length).toBe(transition.before.bytes);
    expect(sha256(former)).toBe(transition.before.sha256);
    expect(current.length).toBe(transition.after.bytes);
    expect(sha256(current)).toBe(transition.after.sha256);
    expect(reviewedDataHardwareChecker(root,
      read('audit/evidence/motion-frontier-adjacent-home-20260927/audit-local-basis-before.ts.txt'))).toBe(true);
    const preserved = former.toString();
    const changed = current.toString();
    expect(changed).toContain("next.before.sha256 === record.after.sha256");
    expect(changed).toContain("priorReview.equals(readBoundedLocalFile(root");
    expect(changed.slice(changed.indexOf('// These inert snapshots describe actual past runs')))
      .toBe(preserved.slice(preserved.indexOf('// These inert snapshots describe actual past runs')));
  });

  it('does not allow a wrong current article endpoint through the baseline', () => {
    const manifests = { ...baseline.manifests, ...truth };
    const current = { ...baseline, manifests };
    const selected = approvals.filter((entry) => entry.id.startsWith('motion-world-models-humanizer-v3-20260927-'));
    expect(selected).toHaveLength(8);
    for (const entry of selected) {
      const mutated = approvals.map((candidate) => candidate.id === entry.id
        ? { ...candidate, newHash: sha256('wrong endpoint') } : candidate);
      expect(compareBaseline(baseline, current, mutated).failures.some((failure) =>
        failure.manifest === 'prose' && failure.memberId === entry.memberId)).toBe(true);
    }
  });
});
