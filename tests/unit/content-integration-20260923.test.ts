import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITATIONS, citationLabel } from '../../data/citations';
import {
  BASELINE_KINDS,
  buildManifest,
  compareBaseline,
  sha256,
  validateApprovedDeltas,
  type ApprovedDelta,
  type BaselineBundle,
  type BaselineKind,
} from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';
import { headReanchorFor, ledgerAt, sealedHash, showAt } from './helpers/continuation-merge-ledger';
import { RELEASE_BASE as CONTINUATION_RELEASE_BASE } from '../helpers/continuation-integration';

/**
 * The 2026-09-23 content integration merged release/seo-content-fixes onto
 * the release base 754ae58 and corrected the V-JEPA 2-AC FLOP estimate in the
 * world-model cost table. Its approvals are one contiguous block appended
 * right after the release base's ledger, so later appends never move them.
 */
const root = resolve(import.meta.dirname, '../..');
const RELEASE_BASE = '754ae5893e0f6a7ba3a8e6a8d53c8beaf3cb8394';
const PREFIX = 'content-integration-20260923-';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const approvals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries;
const truth = collectArticleTruthManifests();
const currentHash = (kind: BaselineKind, memberId: string) =>
  Object.values(truth).find((m) => m.kind === kind)?.members.find((m) => m.id === memberId)?.hash;

const members: Array<[BaselineKind, string]> = [
  ['prose', 'article:classical/calibration'],
  ['prose', 'article:manipulation/action-spaces'],
  ['prose', 'article:world-models/model-based-robot-learning'],
  ['prose', 'article:world-models/world-models-vs-simulators'],
  ['relationships', 'article:classical/calibration'],
  ['relationships', 'article:manipulation/action-spaces'],
  ['relationships', 'article:world-models/world-models-vs-simulators'],
  ['article-metadata', 'article-fact-frontmatter:classical/calibration'],
  ['article-metadata', 'article-fact-frontmatter:manipulation/action-spaces'],
  ['article-metadata', 'article-fact-frontmatter:world-models/world-models-vs-simulators'],
  ['article-metadata', 'citation-rendering:label-and-meta'],
  ['article-metadata', 'citation:llama-3-herd-2024'],
  ['article-metadata', 'citation:shiu-ahmad-1989'],
];

function bundle(old: boolean): BaselineBundle {
  const manifests = Object.fromEntries(
    BASELINE_KINDS.map((kind) => {
      const manifest = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
      const selected = members.filter(([k]) => k === kind).flatMap(([, id]) => {
        if (old) return sealedHash(kind, id) === sha256('missing') ? [] : [{ id, hash: sealedHash(kind, id) }];
        return Object.values(truth).flatMap((m) => (m.kind === kind ? m.members.filter((v) => v.id === id) : []));
      });
      return [kind, { ...manifest, members: selected, memberCount: selected.length }];
    }),
  ) as BaselineBundle['manifests'];
  return {
    schemaVersion: 1,
    source: { commit: RELEASE_BASE, tree: '', trackedWorktreeClean: false },
    tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' },
    manifests,
    manifestRoots: Object.fromEntries(BASELINE_KINDS.map((k) => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'],
    rootHash: '',
  };
}

describe('content integration of 2026-09-23', () => {
  it('appends one contiguous block of exact approvals after the intact release-base ledger', () => {
    const base = ledgerAt(RELEASE_BASE);
    expect(approvals.slice(0, base.length)).toEqual(base);
    expect(base.some((entry) => entry.id.startsWith(PREFIX))).toBe(false);
    const block = approvals.slice(base.length, base.length + members.length);
    expect(block.every((entry) => entry.id.startsWith(PREFIX))).toBe(true);
    expect(approvals.filter((entry) => entry.id.startsWith(PREFIX))).toEqual(block);
    expect(block.map((entry) => [entry.manifest, entry.memberId])).toEqual(members);
    expect(validateApprovedDeltas(block)).toEqual([]);
    for (const entry of block) {
      expect(entry).toMatchObject({
        oldHash: sealedHash(entry.manifest, entry.memberId),
        responsibleMilestone: 'content integration, 2026-09-23',
        disposition: 'permanent',
      });
      expect(entry).toEqual(ledgerAt(CONTINUATION_RELEASE_BASE).find(prior => prior.id === entry.id));
      expect(headReanchorFor(approvals, entry.manifest, entry.memberId)?.newHash)
        .toBe(currentHash(entry.manifest, entry.memberId));
      expect(entry.ownerApproval).toMatch(/^Owner-delegated approval: Josef Chen delegated release decisions to the delegated release reviewer on 2026-09-22\/23 \('you think and decide all'\); approved after primary-source verification of \S/);
    }
    expect(headReanchorFor(approvals, 'article-metadata', 'citation-rendering:label-and-meta')?.id)
      .toBe('continuation-merge-2026-09-24-tech-withdrawal-citation-rendering');
    expect(approvals.find(a => a.id === 'main-merge-20260924-citation-rendering'))
      .toMatchObject({
        oldHash: sealedHash('article-metadata', 'citation-rendering:label-and-meta'),
        newHash: '03de761700f6c1776eeeb9336c009832040f21d39951916c7a20c6025b1e9e53',
      });
    expect(approvals.find(a => a.id === 'continuation-merge-2026-09-23-1940-article-metadata-citation-rendering-label-and-meta'))
      .toMatchObject({
        oldHash: sealedHash('article-metadata', 'citation-rendering:label-and-meta'),
        newHash: '3373e6623166e653a62074c4d156e1e5a454dfb89f5c56691ce6d35521ade5f2',
      });
    expect(approvals.find(a => a.id === 'continuation-merge-2026-09-23-article-metadata-citation-rendering-label-and-meta'))
      .toEqual(ledgerAt('ac65cf4').find(a => a.id === 'continuation-merge-2026-09-23-article-metadata-citation-rendering-label-and-meta'));
  });

  it('approves the changed members only with every exact entry present and unmutated', () => {
    const block = members.map(([kind, id]) => headReanchorFor(approvals, kind, id)!);
    expect(block).toHaveLength(members.length);
    const graph = approvals.filter((entry) =>
      members.some(([kind, id]) => entry.manifest === kind && entry.memberId === id),
    );
    expect(compareBaseline(bundle(true), bundle(false), graph).ok).toBe(true);
    for (const approval of block) {
      expect(compareBaseline(bundle(true), bundle(false), graph.filter((a) => a.id !== approval.id)).ok).toBe(false);
      expect(compareBaseline(bundle(true), bundle(false), graph.map((a) => (a.id === approval.id ? { ...a, newHash: '0'.repeat(64) } : a))).ok).toBe(false);
    }
  });

  it('adds exactly the two verified citations and leaves every earlier registry entry untouched', () => {
    const before = showAt(RELEASE_BASE, 'data/citations.ts');
    const baseIds = [...before.matchAll(/^ {4}id: ['"]([^'"]+)['"],$/gm)].map((m) => m[1]);
    expect(new Set(baseIds).size).toBe(baseIds.length);
    // Every registry entry the release base carried is still present, except the
    // later Control closeout which retired the unused Åström member and the
    // later Technology.org withdrawal which retired the HTTP 403 secondary.
    const current = read('data/citations.ts');
    const retired = new Set(['astrom-murray-2008', 'technology-org-deployed-2026']);
    const laterCorrected = new Set(['astrom-murray-2008', 'kalman-1960', 'kroger-ocado-closures-2025', 'technology-org-deployed-2026']);
    for (const id of baseIds) expect(CITATIONS.some((c) => c.id === id), id).toBe(!retired.has(id));
    expect(before).toContain("id: 'astrom-murray-2008'");
    expect(before).toContain("id: 'technology-org-deployed-2026'");
    expect(CITATIONS.some((c) => c.id === 'astrom-murray-2008')).toBe(false);
    expect(CITATIONS.some((c) => c.id === 'technology-org-deployed-2026')).toBe(false);
    const block = (source: string, id: string) => {
      const at = source.search(new RegExp(`^ {4}id: ['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"],$`, 'm'));
      return source.slice(at, source.indexOf('\n  },', at));
    };
    for (const id of baseIds.filter((id) => !laterCorrected.has(id))) {
      expect(block(current, id), id).toBe(block(before, id));
    }
    expect(before).toContain('which introduced the');
    expect(current).toContain('does not prove historical LQR priority');
    expect(CITATIONS.find((c) => c.id === 'kalman-1960')).toMatchObject({
      year: 1960,
      url: 'https://doi.org/10.1109/9780470544334.ch8',
    });
    expect(CITATIONS.find((c) => c.id === 'kroger-ocado-closures-2025')?.url).toContain(
      'web.archive.org/web/20251118224554/',
    );
    expect(CITATIONS.map((c) => c.id).filter((id) => !baseIds.includes(id)).sort()).toEqual([
      'agility-digit-production', 'figure-bmw-production-2025', 'lei-cycle-time-definition',
      'lei-takt-time-definition', 'llama-3-herd-2024', 'nasa-availability-prediction-analysis',
      'shiu-ahmad-1989', 'tesla-q1-2026-update',
    ]);
    expect(CITATIONS).toHaveLength(baseIds.length + 6);
    expect(CITATIONS.find((c) => c.id === 'agility-digit-production')).toMatchObject({
      year: 'n.d.',
      accessedOn: '2026-09-24',
      url: 'https://www.agilityrobotics.com/',
    });
    expect(CITATIONS.find((c) => c.id === 'figure-bmw-production-2025')).toMatchObject({
      year: 2025,
      url: 'https://www.figure.ai/news/production-at-bmw',
    });
    expect(CITATIONS.find((c) => c.id === 'tesla-q1-2026-update')).toMatchObject({
      year: 2026,
      url: 'https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q1-2026-Update.pdf',
    });
    for (const id of ['lei-cycle-time-definition', 'lei-takt-time-definition']) {
      expect(CITATIONS.find(c => c.id === id)).toMatchObject({ year: 'n.d.', accessedOn: '2026-09-22' });
    }
    expect(CITATIONS.find(c => c.id === 'nasa-availability-prediction-analysis')).toMatchObject({
      year: 1994, url: 'https://llis.nasa.gov/lesson/841',
    });
    expect(CITATIONS.find((c) => c.id === 'llama-3-herd-2024')).toEqual({
      id: 'llama-3-herd-2024',
      title: 'The Llama 3 Herd of Models',
      authors: ['Aaron Grattafiori', 'Abhimanyu Dubey', 'Abhinav Jauhri'],
      year: 2024,
      arxiv: '2407.21783',
      url: 'https://arxiv.org/abs/2407.21783',
      type: 'paper',
    });
    expect(CITATIONS.find((c) => c.id === 'shiu-ahmad-1989')).toEqual({
      id: 'shiu-ahmad-1989',
      title: 'Calibration of wrist-mounted robotic sensors by solving homogeneous transform equations of the form AX=XB',
      authors: ['Y. C. Shiu', 'S. Ahmad'],
      year: 1989,
      venue: 'IEEE Trans. Robotics and Automation',
      url: 'https://doi.org/10.1109/70.88014',
      type: 'paper',
    });
    expect(citationLabel(CITATIONS.find((c) => c.id === 'shiu-ahmad-1989')!)).toBe('Shiu 1989');
  });

  it('states the V-JEPA 2-AC FLOP estimate at the order its paper inputs imply', () => {
    // V-JEPA 2 (arXiv 2506.09985): ~300M predictor (Sec. 3.1); one step is a
    // 16 x 16 feature map plus an action and a pose token; CEM uses 800
    // samples x 10 refinement steps at horizon 1 (App. B.2, Table 3).
    // Llama 3 8B decode is ~2 x 8e9 FLOP per token.
    const perPass = 2 * 300e6 * (16 * 16 + 2);
    const token = 2 * 8e9;
    expect(Math.round(Math.log10(perPass / token))).toBe(1);
    expect(Math.round(Math.log10((800 * 10 * perPass) / token))).toBe(5);
    const table = read('components/mdx/text-tables.tsx');
    expect(table).toContain("'~10x per latent step; ~10^5x per planned action (800 samples x 10 refinements)'");
    expect(table).not.toContain('10^2 to 10^3x per planned action');
    expect(read('content/world-models/world-models-vs-simulators.mdx')).toContain(
      'the FLOP row is a derived order-of-magnitude estimate, not a measurement',
    );
  });
});
