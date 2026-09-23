import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BASELINE_KINDS, buildManifest, compareBaseline, sha256,
  type ApprovedDelta, type BaselineBundle,
} from '../../lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';
import { committedSource, preservedApprovalPacket } from '../helpers/continuation-integration';
import { READER_RELEASE_BASE } from '../helpers/reader-integration';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const ledger = 'contract/brand-v2-approved-deltas.json';
const approvals: ApprovedDelta[] = JSON.parse(read(ledger)).entries;
const integrated = approvals.filter(a => a.id.startsWith('continuation-merge-2026-09-23-1745-'));
const truth = collectArticleTruthManifests();
const sealed: BaselineBundle = JSON.parse(read('evidence/brand-v2/baseline/baseline.json'));
const paths = [...new Set(integrated.map(a => `content/${a.memberId.slice('article:'.length)}.mdx`))];

function bundle(old: boolean): BaselineBundle {
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const source = old ? sealed.manifests[kind] : Object.values(truth).find(m => m.kind === kind);
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
    expect(read(path)).toBe(committedSource('ebf13b4', path));
  });

  it.each(integrated)('rejects missing and mutated merged endpoints for $id', entry => {
    const before = bundle(true), current = bundle(false);
    expect(compareBaseline(before, current, integrated).ok).toBe(true);
    expect(compareBaseline(before, current, integrated.filter(a => a.id !== entry.id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      expect(compareBaseline(before, current, integrated.map(a => a.id === entry.id
        ? { ...a, [endpoint]: sha256('wrong merged endpoint') } : a)).ok).toBe(false);
    }
  });
});
