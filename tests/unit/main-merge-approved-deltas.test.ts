import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  approvedDeltaPath, sha256, validateApprovedDeltas, type ApprovedDelta,
} from '../../lib/brand-v2-baseline';
import { committedSource } from '../helpers/continuation-integration';

const registerPath = 'contract/brand-v2-approved-deltas.json';
const mainRef = '51568b3adcafa98ac40800aee13869502ddd5e06';
const localRef = 'addbf58ad4386de53144c30b87d9144019accba2';
const rawMain = committedSource(mainRef, registerPath);
const rawLocal = committedSource(localRef, registerPath);
const main: ApprovedDelta[] = JSON.parse(rawMain).entries;
const local: ApprovedDelta[] = JSON.parse(rawLocal).entries;
const merged: ApprovedDelta[] = JSON.parse(readFileSync(registerPath, 'utf8')).entries;
const collisionIds = [
  'sweeps-registry-gensim15-20260917-1',
  'sweeps-registry-mp7-20260917-1',
  'single-leftovers-rg6-20260917-1',
];
const resolutions = [
  ['main-merge-20260924-control-prose', 'prose', 'article:classical/control', 21],
  ['main-merge-20260924-industrial-prose', 'prose', 'article:data-hardware/industrial-deployment', 23],
  ['main-merge-20260924-control-relationships', 'relationships', 'article:classical/control', 4],
  ['main-merge-20260924-citation-rendering', 'article-metadata', 'citation-rendering:label-and-meta', 44],
] as const;
const archive = JSON.parse(readFileSync(
  'audit/evidence/main-merge-integration-20260924/approval-branch-collisions.json', 'utf8',
));
// Later appends after the two-parent merge, in ledger order: the imported
// manipulation packet integration of 2026-09-24 re-anchored the eight members
// its three article corrections moved (robot-learning-roadmap prose and
// frontmatter; action-spaces and foundation-models prose, relationships and
// frontmatter). The imported stack-classical packet integration of 2026-09-24
// then re-anchored the five members it moved (calibration prose and frontmatter;
// ros2-for-ml-engineers frontmatter; robot-learning-stack prose and frontmatter).
// The imported world-rl packet integration of 2026-09-24 then re-anchored the
// four members it moved (world-models-vs-simulators prose and frontmatter;
// model-based-robot-learning prose and frontmatter; its relationships members
// were unchanged because every inline citation was retained).
// Each entry brackets its member from the seal to the current value; the merge
// resolutions stay in place as history.
const packetAppends = [
  'continuation-merge-2026-09-24-manipulation-import-prose-action-spaces',
  'continuation-merge-2026-09-24-manipulation-import-relationships-action-spaces',
  'continuation-merge-2026-09-24-manipulation-import-frontmatter-action-spaces',
  'continuation-merge-2026-09-24-manipulation-import-prose-foundation-models',
  'continuation-merge-2026-09-24-manipulation-import-relationships-foundation-models',
  'continuation-merge-2026-09-24-manipulation-import-frontmatter-foundation-models',
  'continuation-merge-2026-09-24-manipulation-import-prose-robot-learning-roadmap',
  'continuation-merge-2026-09-24-manipulation-import-frontmatter-robot-learning-roadmap',
] as const;
const stackClassicalWorldRlAppends = [
  'continuation-merge-2026-09-24-stack-classical-import-prose-calibration',
  'continuation-merge-2026-09-24-stack-classical-import-frontmatter-calibration',
  'continuation-merge-2026-09-24-stack-classical-import-frontmatter-ros2-for-ml-engineers',
  'continuation-merge-2026-09-24-stack-classical-import-prose-robot-learning-stack',
  'continuation-merge-2026-09-24-stack-classical-import-frontmatter-robot-learning-stack',
  'continuation-merge-2026-09-24-world-rl-import-prose-world-models-vs-simulators',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-world-models-vs-simulators',
  'continuation-merge-2026-09-24-world-rl-import-prose-model-based-robot-learning',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-model-based-robot-learning',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-offline-rl',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-evaluation',
] as const;
const techWithdrawalAppends = [
  'continuation-merge-2026-09-24-tech-withdrawal-prose-industrial-deployment',
  'continuation-merge-2026-09-24-tech-withdrawal-prose-bear-case',
  'continuation-merge-2026-09-24-tech-withdrawal-prose-competing-theses',
  'continuation-merge-2026-09-24-tech-withdrawal-prose-reliability-gap',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-industrial-deployment',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-bear-case',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-competing-theses',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-reliability-gap',
  'continuation-merge-2026-09-24-tech-withdrawal-interactive-deployment-dashboard',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-industrial-deployment',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-bear-case',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-competing-theses',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-reliability-gap',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-rendering',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-agility-digit-production',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-figure-bmw-production-2025',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-technology-org-deployed-2026',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-tesla-q1-2026-update',
] as const;
// The search-states treatment of 2026-09-25 then registered the labelled
// clear control's accessible name, the one literal that treatment added to
// the search interface.
const searchStatesAppends = [
  'brand-v2-search-clear-control-name',
] as const;

describe('two-parent exact approval reconciliation', () => {
  it('retains every main approval in order and appends exactly seven local-only approvals', () => {
    const mainIds = new Set(main.map(x => x.id));
    const localOnly = local.filter(x => !mainIds.has(x.id));
    expect([main.length, local.length, localOnly.length, merged.length]).toEqual([1558, 1104, 7, 1607]);
    expect(merged.slice(0, main.length)).toEqual(main);
    expect(merged.slice(main.length, main.length + localOnly.length)).toEqual(localOnly);
    expect(merged.slice(main.length + localOnly.length).map(x => x.id))
      .toEqual([...resolutions.map(x => x[0]), ...packetAppends, ...techWithdrawalAppends, ...stackClassicalWorldRlAppends, ...searchStatesAppends]);
    expect(new Set(merged.map(x => x.id)).size).toBe(merged.length);
    expect(validateApprovedDeltas(merged)).toEqual([]);
  });

  it('keeps all three conflicting local payloads as exact parent evidence, not duplicate active IDs', () => {
    expect(archive.schemaVersion).toBe('approval-branch-collisions-v1');
    expect([archive.mainRef, archive.localRef]).toEqual([mainRef, localRef]);
    expect([archive.mainRegisterSha256, archive.localRegisterSha256])
      .toEqual([sha256(rawMain), sha256(rawLocal)]);
    expect(archive.collisions.map((x: { originalId: string }) => x.originalId)).toEqual(collisionIds);
    for (const collision of archive.collisions) {
      const active = main.find(x => x.id === collision.originalId);
      const prior = local.find(x => x.id === collision.originalId);
      expect(collision.active).toEqual(active);
      expect(collision.retainedLocal).toEqual(prior);
      expect(active).not.toEqual(prior);
      expect(merged.filter(x => x.id === collision.originalId)).toEqual([active]);
    }
    const mainById = new Map(main.map(x => [x.id, x]));
    expect(local.filter(x => mainById.has(x.id) &&
      JSON.stringify(x) !== JSON.stringify(mainById.get(x.id))).map(x => x.id)).toEqual(collisionIds);
    const rg6 = archive.collisions[2];
    expect(approvedDeltaPath([rg6.active], rg6.active.oldHash, rg6.active.newHash).status)
      .toBe('approved');
    expect(approvedDeltaPath([rg6.retainedLocal], rg6.active.oldHash, rg6.active.newHash).status)
      .toBe('missing');
  });

  it('accepts the exact reconciled endpoints but rejects omitted, corrupted and unapproved paths', () => {
    for (const [id, manifest, memberId, count] of resolutions) {
      const edges = merged.filter(x => x.manifest === manifest && x.memberId === memberId);
      const resolution = edges.find(x => x.id === id)!;
      const prior = edges.slice(0, edges.indexOf(resolution));
      const path = [...prior, resolution];
      expect(resolution.id).toBe(id);
      expect(resolution.reconciles).toEqual(prior.map(x => ({
        id: x.id, oldHash: x.oldHash, newHash: x.newHash,
      })));
      expect(resolution.reconciles).toHaveLength(count);
      expect(approvedDeltaPath(path, resolution.oldHash, resolution.newHash).status).toBe('approved');
      expect(approvedDeltaPath(prior, resolution.oldHash, resolution.newHash).status)
        .toBe('missing');
      expect(approvedDeltaPath(path.slice(1), resolution.oldHash, resolution.newHash).status)
        .toBe('ambiguous');
      expect(approvedDeltaPath(path.map((edge, index) => index === 0
        ? { ...edge, newHash: '0'.repeat(64) } : edge),
      resolution.oldHash, resolution.newHash).status).toBe('ambiguous');
      expect(approvedDeltaPath(path, resolution.oldHash, '0'.repeat(64)).status).toBe('ambiguous');
    }
    expect(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:data-hardware/industrial-deployment').at(-1)?.id)
      .toBe('continuation-merge-2026-09-24-tech-withdrawal-prose-industrial-deployment');
    expect(merged.filter(x => x.manifest === 'article-metadata'
      && x.memberId === 'citation-rendering:label-and-meta').at(-1)?.id)
      .toBe('continuation-merge-2026-09-24-tech-withdrawal-citation-rendering');
    expect(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:classical/calibration').at(-1)?.id)
      .toBe('continuation-merge-2026-09-24-stack-classical-import-prose-calibration');
    expect(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:world-models/world-models-vs-simulators').at(-1)?.id)
      .toBe('continuation-merge-2026-09-24-world-rl-import-prose-world-models-vs-simulators');
  });
});
