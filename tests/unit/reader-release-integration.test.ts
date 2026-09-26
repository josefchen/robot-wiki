import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import {
  BASELINE_KINDS, buildManifest, compareBaseline, sha256,
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
      expect(hashOf(read(path))).toBe(pass.newHash);
      expect(read(path)).toContain('Real-world robot data is different. Every hour of it');
    } else if (path === 'content/world-models/taxonomy.mdx') {
      const before = 'The six example groups below are this article\'s selection, not an exhaustive or universally agreed scientific taxonomy.';
      const after = before.replace("article's selection", "article's authored selection");
      const source = committedSource('ebf13b4', path);
      expect(source.split(before)).toHaveLength(2);
      // The educational cue pass (2026-09-26) appended the first-screen
      // operating cue sentence to the panel paragraph; its approved-deltas
      // entry carries the article to its current text.
      const cue = ' Try each group in turn and the panel swaps what it predicts; the JEPA group carries an explicit no-decoder marker.';
      expect(read(path)).toBe(source.replace(before, after)
        .replace('selecting a panel is not a benchmark comparison between the named systems.',
          `selecting a panel is not a benchmark comparison between the named systems.${cue}`));
      const hashOf = (text: string) => buildManifest('prose', [{
        id: 'article:world-models/taxonomy',
        value: { path, body: matter(text).content.trim() },
      }]).members[0].hash;
      const pass = approvals.find(a => a.id === 'educational-cue-20260926-prose-taxonomy')!;
      expect(hashOf(read(path))).toBe(pass.newHash);
    } else if (path === 'content/frontier/bear-case.mdx') {
      const source = committedSource('ebf13b4', path);
      expect(source).toContain('lastReviewed: "2026-08-18"');
      expect(source).toContain('technology-org-deployed-2026');
      expect(read(path)).toBe(committedSource('b9e318b', path));
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
    const sealedHash = sealed.manifests[entry.manifest].members.find(m => m.id === entry.memberId)!.hash;
    const head = graph.findLast(a => a.manifest === entry.manifest && a.memberId === entry.memberId
      && a.oldHash === sealedHash && a.newHash === currentHash)!;
    expect(head).toBeDefined();
    expect(compareBaseline(bundle(true), bundle(false), graph).ok).toBe(true);
    expect(compareBaseline(bundle(true), bundle(false), graph.filter(a => a.id !== head.id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      expect(compareBaseline(bundle(true), bundle(false), graph.map(a => a.id === head.id
        ? { ...a, [endpoint]: sha256('wrong current merged endpoint') } : a)).ok).toBe(false);
    }
  });
});
