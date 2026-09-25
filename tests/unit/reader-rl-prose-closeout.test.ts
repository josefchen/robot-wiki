import { readFileSync } from 'node:fs';
import { showAt } from './helpers/continuation-merge-ledger';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import {
  BASELINE_KINDS, buildManifest, compareBaseline, sha256,
  type ApprovedDelta, type BaselineBundle,
} from '@/lib/brand-v2-baseline';
import { preservedApprovalPacket } from '../helpers/continuation-integration';
import { readerTruthAt } from '../helpers/reader-integration';

const root = resolve(import.meta.dirname, '../..');
const base = '280d8661a49feb16e45ef337e7cb46a794211004';
const checkpoint = 'f880e137e9f0c35fd383cb9cdafe5a38ec25d29d';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => showAt(base, path);
const paths = [
  'content/manipulation/rl-finetuning.mdx',
  'content/rl-sim2real/why-rl-locomotion.mdx',
];
const destinations = [
  'content/manipulation/pi-line.mdx',
  'content/rl-sim2real/sim2real-transfer.mdx',
];
const [rl, why] = paths.map(read);
const paragraphs = (text: string) => matter(text).content.split('\n\n');
const paragraph = (text: string, phrase: string) => paragraphs(text).find(p => p.includes(phrase))!;
const cites = (text: string) => [...text.matchAll(/<Cite\s+id="([^"]+)"\s*\/>/g)].map(m => m[1]);
const members = [
  ['prose', 'article:manipulation/rl-finetuning'],
  ['prose', 'article:rl-sim2real/why-rl-locomotion'],
  ['relationships', 'article:manipulation/rl-finetuning'],
  ['relationships', 'article:rl-sim2real/why-rl-locomotion'],
] as const;

function approvalBundle(old: boolean): BaselineBundle {
  const articles = paths.map(path => ({ path, parsed: matter(before(path)) }));
  const sources = old ? [
    buildManifest('prose', articles.map(({ path, parsed }) => ({
      id: `article:${path.slice(8, -4)}`, value: { path, body: parsed.content.trim() },
    }))),
    buildManifest('relationships', articles.map(({ path, parsed }) => {
      const matches = (pattern: RegExp) => [...parsed.content.trim().matchAll(pattern)].map(m => m[1]).sort();
      return {
        id: `article:${path.slice(8, -4)}`,
        value: {
          seeAlso: parsed.data.seeAlso,
          citations: matches(/<Cite\s+id=["']([^"']+)["']/g),
          terms: matches(/<Term\s+id=["']([^"']+)["']/g),
          internalLinks: matches(/\]\((\/[^)#?]+\/?)(?:#[^)]+)?\)/g),
        },
      };
    })),
  ] : readerTruthAt(checkpoint, paths);
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => {
    const scaffold = buildManifest(kind, [{ id: 'fixture:unchanged', value: 'bounded comparison' }]);
    const selected = sources.find(m => m.kind === kind)?.members
      .filter(m => members.some(([k, id]) => kind === k && m.id === id)) ?? [];
    return [kind, { ...scaffold, members: selected, memberCount: selected.length }];
  })) as BaselineBundle['manifests'];
  return {
    schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false },
    tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' },
    manifests,
    manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'],
    rootHash: '',
  };
}

describe('bounded RL reader prose closeout, zero original completions', () => {
  it.each(paths)('keeps citation clusters inline without forced Source breaks in %s', path => {
    const source = read(path);
    expect(source).not.toMatch(/<br\s*\/>\s*Source:/);
    expect(source).not.toMatch(/Source:\s*<Cite/);
    expect(source).not.toMatch(/<Cite[^>]+\/>\s*\.\s*\./);
    expect(cites(source)).toEqual(cites(before(path)));
  });

  it('changes only the source separator in the 28 non-duplicate source-break paragraphs', () => {
    let checked = 0;
    for (const path of paths) {
      for (const p of paragraphs(before(path)).filter(p => p.includes('<br />Source:'))) {
        if (p.includes('DextrAH-RGB')) continue;
        const inline = p.replace(/[ \t]*<br \/>Source: /g, ' ');
        expect(read(path)).toContain(inline);
        checked += 1;
      }
    }
    expect(checked).toBe(28);
  });

  it('replaces the duplicated Recap throughput paragraph with a locally cited task-scoped summary', () => {
    const old = paragraph(before(paths[0]), 'The report evaluates a static bimanual setup');
    const summary = paragraph(rl, "Recap's on-robot experience");
    expect(summary).toBeDefined();
    expect(rl).not.toContain(old);
    expect(read(destinations[0])).toContain(old);
    expect(summary.split(/\s+/).length).toBeLessThan(old.split(/\s+/).length);
    for (const phrase of [
      'more than doubles successful completions per hour',
      'double-shot espresso and the diverse-laundry evaluation',
      'offline RL plus task-specific demonstration fine-tuning',
      'static bimanual setup', 'button-up-shirt test', '11-item-type laundry training set',
      '[pi-line evaluation details](/manipulation/pi-line/)',
    ]) expect(summary).toContain(phrase);
    expect(cites(summary)).toEqual(['pistar06-2025']);
  });

  it('keeps both failure-reduction accounts and the laundry and box-stage exclusions in a concise summary', () => {
    const old = paragraph(before(paths[0]), "Keep the report's qualifications");
    const summary = paragraph(rl, 'The paper qualifies its reliability claims');
    expect(summary).toBeDefined();
    expect(rl).not.toContain(old);
    expect(read(destinations[0])).toContain(old);
    expect(summary.split(/\s+/).length).toBeLessThan(old.split(/\s+/).length);
    for (const phrase of [
      'Section VI-C', '“about a factor of two,”', 'Figure 8', '“more than 2×.”',
      '“90%+” success summary excludes diverse laundry', 'separate stages',
      'does not establish strictly greater than 90% end-to-end success for every application',
      '[task-by-task qualifications](/manipulation/pi-line/)',
    ]) expect(summary).toContain(phrase);
    expect(cites(summary)).toEqual(['pistar06-2025']);
    expect(rl).toContain('5:30am to 11:30pm');
    expect(rl).toContain('13 hours straight');
    expect(rl).toContain("Physical Intelligence's own reported results, not independent replication");
  });

  it('replaces the DextrAH duplicate with a qualified teacher-student summary and its detailed destination', () => {
    const old = paragraph(before(paths[1]), 'In its DextrAH-RGB example');
    const summary = paragraph(why, "Isaac Lab v1 describes DextrAH-RGB's");
    expect(summary).toBeDefined();
    expect(why).not.toContain(old);
    expect(read(destinations[1])).toContain(old);
    expect(summary.split(/\s+/).length).toBeLessThan(old.split(/\s+/).length);
    for (const phrase of [
      'privileged-state RL teacher', 'stereo-RGB student',
      'KUKA arm with an Allegro hand', '[sim-to-real explanation](/rl-sim2real/sim2real-transfer/)',
    ]) expect(summary).toContain(phrase);
    expect(cites(summary)).toEqual(['isaac-lab-2025']);
    expect(summary).not.toMatch(/first system|universal|zero-shot|100%/);
  });

  it('joins the Play2Perfect result to the per-task explanation without extending its scope', () => {
    const result = paragraph(why, 'Play2Perfect trains');
    expect(result).toMatch(/^Play2Perfect trains/);
    expect(result).toContain('CAD-derived sparse-reward assembly tasks and transfers zero-shot');
    expect(result).toContain('60% success on insertions with 0.5 mm clearance <Cite id="play2perfect-2026" />.');
    expect(result).toContain('What these results share is per-task engineering.');
    expect(result).toContain("Play2Perfect's clearance number comes from a pipeline built around its task family.");
    expect(result).toContain('the ranges were not all hand-tuned');
    expect(cites(result)).toEqual(['play2perfect-2026', 'openai-rubiks-cube-2019']);
    const indentedFragment = /^[ \t]+Play2Perfect trains/m;
    expect(before(paths[1])).toMatch(indentedFragment);
    expect('\n\nPlay2Perfect trains').not.toMatch(indentedFragment);
    expect(why).not.toMatch(indentedFragment);
  });

  it('preserves scoped metadata, fallback wrappers and citation coverage', () => {
    for (const path of paths) {
      expect(matter(read(path)).data).toEqual(matter(before(path)).data);
      expect(read(path).match(/<\/?span\b[^>]*>/g)).toEqual(before(path).match(/<\/?span\b[^>]*>/g));
      expect(cites(read(path))).toEqual(cites(before(path)));
      for (const id of cites(read(path))) expect(CITATIONS.some(citation => citation.id === id)).toBe(true);
    }
    // Whole-file/catalog preservation is checked in the checkpoint receipt, not
    // frozen here against an old commit where unrelated future work would fail.
  });

  it('appends exactly the four current-native member deltas to the unchanged approval prefix', () => {
    const path = 'contract/brand-v2-approved-deltas.json';
    const current = preservedApprovalPacket(checkpoint);
    const previous: ApprovedDelta[] = JSON.parse(before(path)).entries;
    expect(current.slice(0, previous.length)).toEqual(previous);
    const added = current.filter(a => a.id.startsWith('reader-rl-prose-20260923-'));
    expect(added.map(a => [a.manifest, a.memberId])).toEqual(members);
    expect(current.slice(previous.length, previous.length + members.length)).toEqual(added);
    expect(compareBaseline(approvalBundle(true), approvalBundle(false), added).ok).toBe(true);
  });

  it.each(members)('rejects missing or mutated approval for %s / %s', (kind, memberId) => {
    const approvals: ApprovedDelta[] = JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries
      .filter((a: ApprovedDelta) => a.id.startsWith('reader-rl-prose-20260923-'));
    const previous = approvalBundle(true), current = approvalBundle(false);
    expect(compareBaseline(previous, current, approvals).ok).toBe(true);
    const selected = approvals.filter(a => a.manifest === kind && a.memberId === memberId);
    expect(selected).toHaveLength(1);
    expect(compareBaseline(previous, current, approvals.filter(a => a.id !== selected[0].id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      const mutated = approvals.map(a => a.id === selected[0].id
        ? { ...a, [endpoint]: sha256('wrong endpoint') } : a);
      expect(compareBaseline(previous, current, mutated).ok).toBe(false);
    }
  });
});
