import { historicalGit } from '../helpers/historical-git';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { readCitationRegistrySource } from '../../lib/citation-registry-source';
import { keepsSourceRegistryObligations, sourceRegistryPredecessor, verifySourceRegistryReview,
  SOURCE_REGISTRY_REVIEW_FILE, type SourceRegistryReview } from '../../lib/audit-source-registry-continuity';

const entry = { id: 'paper-2024', title: 'A paper', authors: ['Ada Author'], year: 2024, url: 'https://example.org/paper', type: 'paper' };
const moduleText = (values: unknown[]) => `export const CITATIONS = ${JSON.stringify(values)} as const;`;

describe('primary-source registry successor', () => {
  it('reads only literal data, preserving the full registry and rejecting executable/duplicate input', () => {
    expect(readCitationRegistrySource(readFileSync('data/citations.ts', 'utf8'))).toEqual(CITATIONS);
    for (const text of [
      'export const CITATIONS = getRegistry();',
      'export const CITATIONS = [...imported];',
      moduleText([entry, entry]),
      'export const CITATIONS = [{id:"paper-2024",id:"other"}];',
    ]) expect(() => readCitationRegistrySource(text)).toThrow();
  });

  it('permits new primary identities and rejects erased sources, aliases and unreviewed metadata changes', () => {
    const prior = moduleText([entry]);
    const added = { ...entry, id: 'other-2025', title: 'A different paper', year: 2025, url: 'https://example.org/other' };
    expect(keepsSourceRegistryObligations(prior, moduleText([entry, added]), [])).toBe(true);
    expect(keepsSourceRegistryObligations(prior, moduleText([added]), [])).toBe(false);
    expect(keepsSourceRegistryObligations(prior, moduleText([entry, { ...added, url: entry.url }]), [])).toBe(false);
    expect(keepsSourceRegistryObligations(prior, moduleText([{ ...entry, title: 'Another claim' }]), [])).toBe(false);
  });

  it('requires an exact sourced date correction and cannot use it to rewrite authors or URLs', () => {
    const before = { ...entry, type: 'docs' as const };
    const after = { ...before, year: 'n.d.' as const, accessedOn: '2026-11-02' };
    const change = { id: entry.id, before, after, sourceUrl: entry.url,
      reason: 'The official document has no publication date. This dated fresh primary read preserves its full author list, title and canonical source URL.' };
    expect(keepsSourceRegistryObligations(moduleText([before]), moduleText([after]), [change])).toBe(true);
    expect(keepsSourceRegistryObligations(moduleText([before]), moduleText([after]), [])).toBe(false);
    expect(keepsSourceRegistryObligations(moduleText([before]), moduleText([after]), [change, change])).toBe(false);
    const renamed = { ...after, authors: ['Someone Else'] };
    expect(keepsSourceRegistryObligations(moduleText([before]), moduleText([renamed]), [{ ...change, after: renamed }])).toBe(false);
  });

  it('rebuilds the actual prior registry and rejects tampered current bytes or historical pins', () => {
    const review = JSON.parse(readFileSync(SOURCE_REGISTRY_REVIEW_FILE, 'utf8')) as SourceRegistryReview;
    const live = readFileSync('data/citations.ts');
    const prior = verifySourceRegistryReview(review, live);
    expect(prior).toEqual(historicalGit(['show', `${review.archivedFrom}:data/citations.ts`], { maxBuffer: 8 * 1024 * 1024 }));
    expect(sourceRegistryPredecessor(process.cwd(), review.after, live)).toBe(live);
    expect(sourceRegistryPredecessor(process.cwd(), review.before, live)).toEqual(prior);
    expect(() => verifySourceRegistryReview({ ...review, before: { ...review.before, sha256: '0'.repeat(64) } }, live)).toThrow();
    expect(() => verifySourceRegistryReview(review, Buffer.concat([live, Buffer.from('\n')]))).toThrow();
  }, 20_000); // Full 1,545-entry AST comparison plus negative replays, also under parallel load.
});
