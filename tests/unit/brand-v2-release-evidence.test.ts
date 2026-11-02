import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  RELEASE_PROFILES, releaseSourceFingerprint, releaseStateProblems,
  releaseMapShard,
  type ReleaseProfile, type ReleaseStateArtifact,
} from '@/lib/brand-v2-release-evidence';

function artifact(): ReleaseStateArtifact {
  return {
    version: 1, sourceFingerprint: 'a'.repeat(64), exportFingerprint: 'c'.repeat(64), group: 'routes', expectedStateIds: ['route:/'],
    cases: [{ id: 'route:/', route: '/', state: 'default', steps: ['navigate', 'settle', 'profile'], profiles: RELEASE_PROFILES.map((plan): ReleaseProfile => ({
      id: plan.id, viewport: { width: plan.width, height: plan.height, dpr: plan.dpr },
      ...(plan.zoomBase ? { requestedCssViewport: { width: plan.zoomBase.width / 2, height: plan.zoomBase.height / 2 } } : {}),
      mainCount: 1, visibleTextCount: 5, fontsLoaded: true, documentOverflowPx: 0,
      axeViolations: [], semanticFailures: [], hiddenRequiredContent: [], requiredDisclosureIds: [], disclosures: [], focus: [],
      textSizes: plan.textOnly ? [{ selector: 'p', baselinePx: 16, actualPx: 32, visible: true, clipped: false }] : [],
      residue: { elements: 10, colourValues: 2, findings: [] },accessibility:{counts:{textRuns:5},findings:[],tables:[],graphics:[],scrollRegions:[],svgText:[]}, forcedColorsActive: Boolean(plan.forcedColors), reducedMotion: Boolean(plan.reducedMotion), stateBefore: 'state-1', stateAfter: 'state-1',
      ...(plan.reducedMotion ? { motion: { windowMs: 3000, cssAnimations: [], geometryBefore: 'same', geometryAfter: 'same', canvases: [] } } : {}),
    })) }],
  };
}
const expected = { fingerprint: 'a'.repeat(64), exportFingerprint: 'c'.repeat(64), group: 'routes', stateIds: ['route:/'] };

describe('final release state evidence', () => {
  it('accepts complete measured observations and includes every sealed half viewport', () => {
    expect(releaseStateProblems(artifact(), expected)).toEqual([]);
    const phone = RELEASE_PROFILES.find(({ id }) => id === 'zoom-equivalent-200-375x812')!;
    expect(phone).toMatchObject({ width: 187, height: 406, dpr: 2, zoomBase: { width: 375, height: 812 } });
  });

  it.each([
    ['stale fingerprint', (a: ReleaseStateArtifact) => { a.sourceFingerprint = 'b'.repeat(64); }],
    ['stale export', (a: ReleaseStateArtifact) => { a.exportFingerprint = 'd'.repeat(64); }],
    ['state residue', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].residue.findings = ['legacy-signal']; }],
    ['missing case', (a: ReleaseStateArtifact) => { a.cases = []; }],
    ['extra case', (a: ReleaseStateArtifact) => { a.cases.push({ ...a.cases[0], id: 'unknown' }); }],
    ['duplicate case', (a: ReleaseStateArtifact) => { a.cases.push(a.cases[0]); }],
    ['wrong declared plan', (a: ReleaseStateArtifact) => { a.expectedStateIds = ['different']; }],
    ['missing profile', (a: ReleaseStateArtifact) => { a.cases[0].profiles.pop(); }],
    ['wrong viewport', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].viewport.width = 375; }],
    ['wrong DPR', (a: ReleaseStateArtifact) => { a.cases[0].profiles.find(({ id }) => id.startsWith('zoom'))!.viewport.dpr = 1; }],
    ['concealed rounding', (a: ReleaseStateArtifact) => { delete a.cases[0].profiles.find(({ id }) => id.startsWith('zoom'))!.requestedCssViewport; }],
    ['Axe violation', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].axeViolations = ['color-contrast']; }],
    ['overflow', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].documentOverflowPx = 1; }],
    ['missing main', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].mainCount = 0; }],
    ['missing fonts', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].fontsLoaded = false; }],
    ['state changed by probe', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].stateAfter = 'other'; }],
    ['hidden content', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].hiddenRequiredContent = ['article paragraph']; }],
    ['unmeasured disclosure', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].requiredDisclosureIds = ['citation:one']; }],
    ['inaccessible disclosure', (a: ReleaseStateArtifact) => { a.cases[0].profiles[0].requiredDisclosureIds = ['citation:one']; a.cases[0].profiles[0].disclosures = [{ id: 'citation:one', reached: true, keyboard: false, textPresent: true, restored: true }]; }],
    ['text not doubled', (a: ReleaseStateArtifact) => { a.cases[0].profiles.find(({ id }) => id === 'text-only-200')!.textSizes[0].actualPx = 16; }],
    ['text clipped', (a: ReleaseStateArtifact) => { a.cases[0].profiles.find(({ id }) => id === 'text-only-200')!.textSizes[0].clipped = true; }],
    ['no text-only population', (a: ReleaseStateArtifact) => { a.cases[0].profiles.find(({ id }) => id === 'text-only-200')!.textSizes = []; }],
    ['fake pass override', (a: ReleaseStateArtifact) => { Object.assign(a, { passed: true }); }],
    ['missing motion window', (a: ReleaseStateArtifact) => { delete a.cases[0].profiles.find(({ reducedMotion }) => reducedMotion)!.motion; }],
    ['moving reduced-motion drawing', (a: ReleaseStateArtifact) => { a.cases[0].profiles.find(({ reducedMotion }) => reducedMotion)!.motion!.geometryAfter = 'moved'; }],
  ])('rejects %s', (_name, mutate) => {
    const value = artifact(); mutate(value);
    expect(releaseStateProblems(value, expected).length).toBeGreaterThan(0);
  });

  it('does not permit a narrowed empty expected population', () => {
    expect(releaseStateProblems(artifact(), { ...expected, stateIds: [] })).toContain('release evidence: invalid expected population');
  });

  it('binds proof to all source/test/contract bytes, including new untracked inputs', () => {
    const root = mkdtempSync(join(tmpdir(), 'release-evidence-'));
    try {
      mkdirSync(join(root, 'lib')); writeFileSync(join(root, 'lib/input.ts'), 'export const n = 1;');
      const before = releaseSourceFingerprint(root);
      writeFileSync(join(root, 'lib/input.ts'), 'export const n = 2;');
      expect(releaseSourceFingerprint(root)).not.toBe(before);
      const changed = releaseSourceFingerprint(root);
      mkdirSync(join(root, 'tests')); writeFileSync(join(root, 'tests/added.ts'), 'throw new Error("bad");');
      expect(releaseSourceFingerprint(root)).not.toBe(changed);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('partitions exact map states without duplication and refuses invalid or empty shards', () => {
    const states = Array.from({ length: 11 }, (_, i) => `state:${i}`);
    const shards = Array.from({ length: 3 }, (_, i) => releaseMapShard(`${i + 1}/3`, states));
    expect(shards.flatMap(({ stateIds }) => stateIds).sort()).toEqual([...states].sort());
    expect(new Set(shards.flatMap(({ stateIds }) => stateIds)).size).toBe(states.length);
    expect(() => releaseMapShard('0/3', states)).toThrow('must be I/N');
    expect(() => releaseMapShard('4/3', states)).toThrow('must be I/N');
    expect(() => releaseMapShard('12/12', states)).toThrow('empty applicable population');
  });
});
