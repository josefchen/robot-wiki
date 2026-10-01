import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import {
  BASELINE_KINDS, approvedDeltaPath, buildManifest, compareBaseline, sha256,
  type ApprovedDelta, type BaselineBundle,
} from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';
import { committedSource, preservedApprovalPacket } from '../helpers/continuation-integration';
import { READER_RELEASE_BASE, readerTruthAt } from '../helpers/reader-integration';
import { finalSevenBefore } from '../helpers/residual-integration';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const ledger = 'contract/brand-v2-approved-deltas.json';
const approvals: ApprovedDelta[] = JSON.parse(read(ledger)).entries;
const integrated = approvals.filter(a => a.id.startsWith('continuation-merge-2026-09-23-1745-'));
const truth = collectArticleTruthManifests();
const sealed: BaselineBundle = JSON.parse(read('evidence/brand-v2/baseline/baseline.json'));
const paths = [...new Set(integrated.map(a => `content/${a.memberId.slice('article:'.length)}.mdx`))];

function bundle(old: boolean, historical = false): BaselineBundle {
  const historicalTruth = historical ? readerTruthAt('ebf13b4', paths) : [];
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const source = old ? sealed.manifests[kind]
      : (historical ? historicalTruth : Object.values(truth)).find(m => m.kind === kind);
    const members = source?.members.filter(m =>
      integrated.some(a => a.manifest === kind && a.memberId === m.id)) ?? [];
    return [kind, { ...buildManifest(kind, [{ id: 'fixture:unchanged', value: 'merged scaffold' }]), members, memberCount: members.length }];
  })) as BaselineBundle['manifests'];
  return { ...sealed, manifests };
}

// The figure migration (e4784342..511806df) moved some reviewed articles one
// step further: each changed article continues its prose chain with exactly
// one plain edge from its prior endpoint, and an unchanged one stays on it.
const FIGURE_MIGRATION_BASE = 'e4784342';
function throughFigureMigration(path: string, id: string, endpoint: string, hashOf: (text: string) => string) {
  expect(hashOf(committedSource(FIGURE_MIGRATION_BASE, path))).toBe(endpoint);
  if (committedSource(FIGURE_MIGRATION_BASE, path) === read(path)) {
    expect(hashOf(read(path))).toBe(endpoint);
    return;
  }
  const edges = approvals.filter(a => a.manifest === 'prose' && a.memberId === id && a.oldHash === endpoint);
  expect(edges).toHaveLength(1);
  expect(edges[0].id).toMatch(/figure-migration-20261001-prose-/);
  expect(edges[0].reconciles).toBeUndefined();
  expect(hashOf(read(path))).toBe(edges[0].newHash);
}

describe('merged reader corrections preserve production additions and exact approvals', () => {
  it('retains the production prefix and every mission transaction in order', () => {
    const production: ApprovedDelta[] = JSON.parse(committedSource(READER_RELEASE_BASE, ledger)).entries;
    expect(approvals.slice(0, production.length)).toEqual(production);
    preservedApprovalPacket('9a5ed060c65721201674bbd2bb1e59f58e5c637a');
    expect(integrated).toHaveLength(16);
    expect(paths).toHaveLength(11);
  });

  it.each(paths)('preserves the reviewed combined article %s', path => {
    if (path === 'content/data-hardware/data-bottleneck.mdx') {
      expect(finalSevenBefore(path)).toBe(committedSource('ebf13b4', path));
      // The merged endpoint from ba934e6 is preserved; the educational
      // convergence pass (2026-09-26) carries the article to its current
      // text through its approved-deltas entry, the way the rl-finetuning
      // branch below pins the humanizer pass.
      const hashOf = (text: string) => buildManifest('prose', [{
        id: 'article:data-hardware/data-bottleneck',
        value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const mergeEndpoint = integrated.find(a =>
        a.manifest === 'prose' && a.memberId === 'article:data-hardware/data-bottleneck')!;
      expect(mergeEndpoint.newHash).toBe('50ad873040d9937b43cd27cc5b15cadc2fd5d58c23c678547970881d0f17c6a8');
      // ba934e6 is the final-seven closure endpoint of the same member.
      const closure = approvals.find(a => a.id === 'final-seven-closure-20260923-2')!;
      expect(hashOf(committedSource('ba934e6', path))).toBe(closure.newHash);
      const pass = approvals.find(a => a.id === 'educational-convergence-20260926-prose-data-bottleneck')!;
      const motion = approvals.find(a => a.id ===
        'motion-data-hardware-humanizer-v3-20260927-prose-data-bottleneck')!;
      expect(hashOf(committedSource('711118e8^', path))).toBe(pass.newHash);
      expect(motion.oldHash).toBe(pass.newHash);
      // The round-5 pinned-leftover repair (f41cf895) then moved the first
      // interactive ahead of its motion scene with one plain edge.
      const round5 = approvals.find(a => a.id ===
        'round5-pinned-leftovers-20260928-prose-data-bottleneck')!;
      expect(hashOf(committedSource('f41cf895^', path))).toBe(motion.newHash);
      expect(round5.oldHash).toBe(motion.newHash);
      expect(round5.reconciles).toBeUndefined();
      throughFigureMigration(path, 'article:data-hardware/data-bottleneck', round5.newHash, hashOf);
      expect(round5.newHash).toBe('2a399628a0d3d47c483619e0563664aa50e82ca704050c69ccb7d44a73f8a161');
      expect(read(path)).toContain('Real-world robot data is different. Every hour of it');
    } else if (path.startsWith('content/data-hardware/')) {
      const slug = path.slice('content/data-hardware/'.length, -4);
      const id = `article:data-hardware/${slug}`;
      const hashOf = (text: string) => buildManifest('prose', [{
        id, value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const motion = approvals.find(a => a.id ===
        `motion-data-hardware-humanizer-v3-20260927-prose-${slug}`)!;
      const beforeMotion = hashOf(committedSource('711118e8^', path));
      expect(motion.oldHash === beforeMotion ||
        motion.reconciles?.some(edge => edge.newHash === beforeMotion)).toBeTruthy();
      const qualification = approvals.find(a => a.id ===
        `motion-data-hardware-source-qualification-20260927-prose-${slug}`);
      if (qualification) expect(qualification.oldHash === motion.newHash ||
        qualification.reconciles?.some(edge => edge.id === motion.id &&
          edge.newHash === motion.newHash)).toBeTruthy();
      expect(hashOf(read(path))).toBe((qualification ?? motion).newHash);
    } else if (path === 'content/world-models/taxonomy.mdx') {
      const before = 'The six example groups below are this article\'s selection, not an exhaustive or universally agreed scientific taxonomy.';
      const after = before.replace("article's selection", "article's authored selection");
      const source = committedSource('ebf13b4', path);
      expect(source.split(before)).toHaveLength(2);
      // The educational cue pass (2026-09-26) appended the first-screen
      // operating cue sentence to the panel paragraph; its approved-deltas
      // entry carries the article to its current text.
      const cue = ' Try each group in turn and the panel swaps what it predicts; the JEPA group carries an explicit no-decoder marker.';
      expect(committedSource('68fd2b8', path)).toBe(source.replace(before, after)
        .replace('selecting a panel is not a benchmark comparison between the named systems.',
          `selecting a panel is not a benchmark comparison between the named systems.${cue}`));
      const hashOf = (text: string) => buildManifest('prose', [{
        id: 'article:world-models/taxonomy',
        value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const pass = approvals.find(a => a.id === 'educational-cue-20260926-prose-taxonomy')!;
      expect(hashOf(committedSource('68fd2b8', path))).toBe(pass.newHash);
      const next = approvals.find(a => a.id === 'motion-world-models-humanizer-v3-20260927-prose-taxonomy')!;
      expect(hashOf(read(path))).toBe(next.newHash);
      expect(next.reconciles?.some(a => a.id === pass.id)).toBe(true);
    } else if (path.startsWith('content/world-models/')) {
      const id = `article:${path.slice(8, -4)}`;
      const hashOf = (text: string) => buildManifest('prose', [{
        id, value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const merged = integrated.find(a => a.manifest === 'prose' && a.memberId === id)!;
      expect(hashOf(committedSource('ebf13b4', path))).toBe(merged.newHash);
      const pass = approvals.find(a => a.id ===
        `motion-world-models-humanizer-v3-20260927-prose-${path.slice('content/world-models/'.length, -4)}`)!;
      expect(hashOf(committedSource('68fd2b8', path))).toBe(pass.oldHash);
      if (path === 'content/world-models/generative-sim.mdx') {
        expect(hashOf(committedSource('a6298625', path))).toBe(pass.newHash);
        const prose = approvals.find(a => a.id ===
          'motion-scrutiny-s12-20260928-prose-generative-sim-citation-attachment')!;
        expect(prose).toMatchObject({
          manifest: 'prose', memberId: id, oldHash: pass.newHash,
          newHash: '4b18ebca49f3165a16d99e7cf26f234067e41ab20c4c2f20da24ca5408e2a32d',
        });
        // The round-5 first-screen c/d pass later swapped two mount blocks;
        // its plain edge continues from the s12 endpoint.
        const moved = approvals.find(a => a.id === 'round5-first-screen-cd-20260929-prose-generative-sim')!;
        expect(moved).toMatchObject({ manifest: 'prose', memberId: id, oldHash: prose.newHash });
        throughFigureMigration(path, id, moved.newHash, hashOf);

        const relationship = approvals.find(a => a.id ===
          'motion-scrutiny-s12-20260928-relationships-generative-sim-citation')!;
        expect(relationship).toMatchObject({
          manifest: 'relationships', memberId: id,
          oldHash: 'b6dec2d3600c39707607ef01d9a9657493939964398d1ab46d6733983451a34d',
          newHash: 'fe9ee3b3cce0506268f5f916dc5c7577bdf11418014d355d30aa5e4b2dd76c3d',
        });
        expect(truth.relationships.members.find(m => m.id === id)?.hash).toBe(relationship.newHash);
        const relationshipEdges = approvals.filter(a => a.manifest === 'relationships' && a.memberId === id);
        const sealedHash = sealed.manifests.relationships.members.find(m => m.id === id)!.hash;
        expect(approvedDeltaPath(relationshipEdges, sealedHash, relationship.newHash).status).toBe('approved');
        expect(approvedDeltaPath(relationshipEdges.filter(a => a !== relationship),
          sealedHash, relationship.newHash).status).not.toBe('approved');
        expect(approvedDeltaPath(relationshipEdges.map(a => a === relationship
          ? { ...a, oldHash: sha256('wrong S12 relationship predecessor') } : a),
        sealedHash, relationship.newHash).status).not.toBe('approved');
        expect(approvedDeltaPath(relationshipEdges.map(a => a === relationship
          ? { ...a, newHash: sha256('wrong S12 relationship endpoint') } : a),
        sealedHash, relationship.newHash).status).not.toBe('approved');
      } else {
        const moved = approvals.find(a => a.id ===
          `round5-first-screen-cd-20260929-prose-${path.slice('content/world-models/'.length, -4)}`);
        if (moved) expect(moved.oldHash).toBe(pass.newHash);
        throughFigureMigration(path, id, (moved ?? pass).newHash, hashOf);
      }
    } else if (path === 'content/frontier/bear-case.mdx') {
      const source = committedSource('ebf13b4', path);
      expect(source).toContain('lastReviewed: "2026-08-18"');
      expect(source).toContain('technology-org-deployed-2026');
      const beforeMotion = committedSource('b9e318b', path);
      const hashOf = (text: string) => buildManifest('prose', [{
        id: 'article:frontier/bear-case',
        value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const motion = approvals.find(a => a.id ===
        'motion-frontier-adjacent-home-humanizer-v3-20260927-prose-bear-case')!;
      expect(motion.reconciles?.some(a => a.newHash === hashOf(beforeMotion))).toBe(true);
      expect(hashOf(read(path))).toBe(motion.newHash);
      expect(read(path)).toContain('lastReviewed: "2026-09-24"');
      expect(read(path)).toContain('agility-digit-production');
      expect(read(path)).not.toContain('technology-org-deployed-2026');
    } else if (path === 'content/manipulation/rl-finetuning.mdx') {
      // The merged endpoint from ebf13b4 is preserved; the manipulation
      // humanizer pass with the EXPO-FT intake (owner decision 20260925)
      // carries the article to its current text through its approved-deltas
      // entry.
      const hashOf = (text: string) => buildManifest('prose', [{
        id: 'article:manipulation/rl-finetuning',
        value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const mergeEndpoint = integrated.find(a =>
        a.manifest === 'prose' && a.memberId === 'article:manipulation/rl-finetuning')!.newHash;
      expect(hashOf(committedSource('ebf13b4', path))).toBe(mergeEndpoint);
      const pass = approvals.find(a => a.id === 'humanizer-manipulation-v3-20260925-prose-rl-finetuning')!;
      expect(hashOf(read(path))).toBe(pass.newHash);
      expect(read(path)).toContain('EXPO-FT');
    } else if (path === 'content/classical/scene-representation.mdx' || path.startsWith('content/rl-sim2real/')) {
      const id = `article:${path.slice(8, -4)}`;
      const hashOf = (text: string) => buildManifest('prose', [{
        id, value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const prior = integrated.find(a => a.manifest === 'prose' && a.memberId === id)!;
      expect(hashOf(committedSource('ebf13b4', path))).toBe(prior.newHash);
      const isClassical = path.startsWith('content/classical/');
      const pass = approvals.find(a => a.id === (isClassical
        ? 'motion-classical-humanizer-v3-20260927-prose-scene-representation'
        : `motion-rl-sim2real-humanizer-v3-20260927-prose-${path.slice('content/rl-sim2real/'.length, -4)}`))!;
      expect(pass.oldHash).toBe(hashOf(committedSource(isClassical ? 'ebf13b4' : '8368034', path)));
      expect(hashOf(read(path))).toBe(pass.newHash);
    } else expect(read(path)).toBe(committedSource('ebf13b4', path));
  });

  it.each(integrated)('rejects missing and mutated merged endpoints for $id', entry => {
    const before = bundle(true), current = bundle(false, true);
    expect(compareBaseline(before, current, integrated).ok).toBe(true);
    expect(compareBaseline(before, current, integrated.filter(a => a.id !== entry.id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      expect(compareBaseline(before, current, integrated.map(a => a.id === entry.id
        ? { ...a, [endpoint]: sha256('wrong merged endpoint') } : a)).ok).toBe(false);
    }
  });

  it.each(integrated)('also requires the complete current graph for $memberId', entry => {
    const graph = approvals.filter(a => integrated.some(member =>
      a.manifest === member.manifest && a.memberId === member.memberId));
    const currentHash = Object.values(truth).find(m => m.kind === entry.manifest)!
      .members.find(m => m.id === entry.memberId)!.hash;
    const head = graph.findLast(a => a.manifest === entry.manifest && a.memberId === entry.memberId &&
      a.newHash === currentHash)!;
    expect(head).toBeDefined();
    expect(compareBaseline(bundle(true), bundle(false), graph).ok).toBe(true);
    expect(compareBaseline(bundle(true), bundle(false), graph.filter(a => a.id !== head.id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      expect(compareBaseline(bundle(true), bundle(false), graph.map(a => a.id === head.id
        ? { ...a, [endpoint]: sha256('wrong current merged endpoint') } : a)).ok).toBe(false);
    }
  });
});
