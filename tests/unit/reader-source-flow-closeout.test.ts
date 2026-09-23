import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import {
  BASELINE_KINDS, buildManifest, compareBaseline, sha256,
  type ApprovedDelta, type BaselineBundle,
} from '@/lib/brand-v2-baseline';
import { collectArticleTruthManifests } from '../../scripts/brand-v2-baseline';

const root = resolve(import.meta.dirname, '../..');
const base = '328ae3600521c094c464b3ddc7ba62c159f95882';
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const before = (path: string) => execFileSync('git', ['show', `${base}:${path}`], {
  cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
const cases = [
  { path: 'content/classical/scene-representation.mdx', blocks: 14, breaks: 0 },
  { path: 'content/world-models/generative-sim.mdx', blocks: 0, breaks: 2 },
  { path: 'content/rl-sim2real/rl-for-robotics.mdx', blocks: 0, breaks: 7 },
];
const members = cases.map(({ path }) => `article:${path.slice(8, -4)}`);
const cites = (text: string) => [...text.matchAll(/<Cite\s+id="([^"]+)"\s*\/>/g)].map(m => m[1]);
const blockSource = /\.\s+<span className="block">Source: (<Cite id="[^"]+" \/>)<\/span>/g;
const breakSource = /\.?[ \t]*<br \/>Source: /g;
const inlineSources = (text: string) => text
  .replace(blockSource, ' $1.')
  .replace(breakSource, ' ')
  .replace(
    'reward hacking. The [reward-design](/rl-sim2real/reward-design-mpc) module explains the distinction <Cite id="eureka-2024" />.',
    'reward hacking <Cite id="eureka-2024" />. The [reward-design](/rl-sim2real/reward-design-mpc) module explains the distinction.',
  );
const approvals = () => (JSON.parse(read('contract/brand-v2-approved-deltas.json')).entries as ApprovedDelta[])
  .filter(a => a.id.startsWith('reader-source-flow-20260923-'));

function bundle(old: boolean): BaselineBundle {
  const source = old
    ? buildManifest('prose', cases.map(({ path }) => ({
      id: `article:${path.slice(8, -4)}`,
      value: { path, body: matter(before(path)).content.trim() },
    })))
    : collectArticleTruthManifests().prose;
  const manifests = Object.fromEntries(BASELINE_KINDS.map(kind => [
    kind,
    buildManifest(kind, kind === 'prose'
      ? source.members.filter(m => members.includes(m.id)).map(m => ({ id: m.id, value: m.value! }))
      : [{ id: 'fixture:unchanged', value: 'bounded source-flow comparison' }]),
  ])) as BaselineBundle['manifests'];
  return {
    schemaVersion: 1, source: { commit: base, tree: '', trackedWorktreeClean: false },
    tools: { node: '', npm: '', playwright: '', next: '', typescript: '', vitest: '', lockfileSha256: '' },
    manifests,
    manifestRoots: Object.fromEntries(BASELINE_KINDS.map(k => [k, manifests[k].rootHash])) as BaselineBundle['manifestRoots'],
    rootHash: '',
  };
}

describe('bounded remaining reader Source flow, zero original completions', () => {
  it.each(cases)('keeps the source chips inline in $path', ({ path, blocks, breaks }) => {
    const old = before(path), current = read(path);
    expect([...old.matchAll(blockSource)]).toHaveLength(blocks);
    expect([...old.matchAll(breakSource)]).toHaveLength(breaks);
    expect(blocks + breaks).toBeGreaterThan(0);
    expect(current).not.toMatch(/(?:<br\s*\/>|<span className="block">)\s*Source:/);
    expect(current).not.toMatch(/Source:\s*<Cite/);
    expect(current).not.toMatch(/\.\s*<Cite[^>]+\/>\s*\./);
    expect(current).not.toMatch(/<Cite[^>]+\/>\s*\.\s*\./);
  });

  it.each(cases)('changes only demonstrated Source separators and their terminators in $path', ({ path }) => {
    const old = before(path), current = read(path);
    expect(current).not.toBe(old);
    expect(current).toBe(inlineSources(old));
    expect(cites(current)).toEqual(cites(old));
  });

  it.each(cases)('preserves all scientific text, numbers, equations, links and metadata in $path', ({ path }) => {
    const old = before(path), current = read(path);
    const prose = (text: string) => inlineSources(text).replace(/<Cite\s+id="[^"]+"\s*\/>/g, '');
    expect(prose(current)).toBe(prose(old));
    expect(matter(current).data).toEqual(matter(old).data);
    expect(cites(current)).toEqual(cites(old));
    expect([...new Set(cites(current))].sort()).toEqual([...matter(current).data.citations].sort());
    for (const id of cites(current)) expect(CITATIONS.some(c => c.id === id)).toBe(true);
    // Only the exact Source-only block wrappers are removed. Other positioning
    // wrappers, components, controls and paragraph boundaries remain untouched.
    const otherTags = (text: string) => text
      .replace(/<span className="block">Source: <Cite id="[^"]+" \/><\/span>/g, '')
      .match(/<\/?span\b[^>]*>/g);
    expect(otherTags(current)).toEqual(otherTags(old));
  });

  it('leaves all projective TSDF and near-surface qualifications byte-identical', () => {
    const path = cases[0].path;
    const section = (text: string) => text.split('### Signed-distance fields\n')[1]
      .split('### Meshes, and then neural fields')[0];
    expect(section(read(path))).toBe(section(before(path)));
    for (const phrase of [
      'projective TSDF from a true discrete signed-distance field',
      'correct exactly at the surface or for an isolated point measurement',
      'approximate pseudo-Euclidean distance metric',
      'Near the zero level set',
      'assumes the field gradient is orthogonal',
      'trilinearly interpolated field values',
    ]) expect(section(read(path))).toContain(phrase);
  });

  it('leaves TD3 reduction, rather than elimination, byte-identical', () => {
    const path = cases[2].path;
    const lineage = (text: string) => text.split('\n\n')
      .find(p => p.startsWith('The continuous-control lineage'));
    expect(lineage(read(path))).toBe(lineage(before(path)));
    expect(lineage(read(path))).toContain('reduced its effects with clipped double critics, delayed policy updates and target policy smoothing');
  });

  it('attaches Eureka to its scientific qualification rather than the following navigation sentence', () => {
    expect(read(cases[1].path)).toContain(
      'this is an interpretability claim, not a requirement that every reward be manually inspected or a comparative study of reward hacking <Cite id="eureka-2024" />. The [reward-design](/rl-sim2real/reward-design-mpc) module explains the distinction.',
    );
  });

  it('binds only three actual native prose deltas after the unchanged 1059-entry prefix', () => {
    const path = 'contract/brand-v2-approved-deltas.json';
    const previous: ApprovedDelta[] = JSON.parse(before(path)).entries;
    const current: ApprovedDelta[] = JSON.parse(read(path)).entries;
    expect(previous).toHaveLength(1059);
    expect(current.slice(0, previous.length)).toEqual(previous);
    expect(approvals().map(a => [a.manifest, a.memberId])).toEqual(members.map(id => ['prose', id]));
    expect(current.slice(previous.length, previous.length + members.length)).toEqual(approvals());
    expect(compareBaseline(bundle(true), bundle(false), approvals()).ok).toBe(true);
  });

  it.each(members)('rejects missing, wrong-old and wrong-new native approval for %s', memberId => {
    const previous = bundle(true), current = bundle(false), added = approvals();
    const selected = added.filter(a => a.manifest === 'prose' && a.memberId === memberId);
    expect(selected).toHaveLength(1);
    expect(compareBaseline(previous, current, added).ok).toBe(true);
    expect(compareBaseline(previous, current, added.filter(a => a.id !== selected[0].id)).ok).toBe(false);
    for (const endpoint of ['oldHash', 'newHash'] as const) {
      const mutated = added.map(a => a.id === selected[0].id
        ? { ...a, [endpoint]: sha256('wrong source-flow endpoint') } : a);
      expect(compareBaseline(previous, current, mutated).ok).toBe(false);
    }
  });
});
