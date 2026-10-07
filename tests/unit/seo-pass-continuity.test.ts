import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalArtifactReader } from '../../lib/audit-local-basis';
import {
  seoPassCheckerPredecessor, seoPassPredecessor, verifySeoPassSource, verifySeoPassSpec,
  type SeoPassEdit, type SeoPassSource, type SeoPassSpec,
} from '../../lib/audit-seo-pass-continuity';
import { preDomainPass, preReaderFirst } from '../helpers/seo-pass';

const root = resolve(import.meta.dirname, '../..');
const dir = 'audit/evidence/seo-pass-20261002/';
// The SEO-pass successors as the reader-first layer hands them back.
const read = (path: string) => preReaderFirst(path);
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(read(`${dir}source-transition.json`).toString()) as { sources: SeoPassSource[] };
const source = (path: string) => review.sources.find(({ after }) => after.path === path)!;
const control = source('content/classical/control.mdx');
const sourceDrift = /seo pass source continuity drift/;
const checkerDrift = /seo pass checker continuity drift/;

const scratchRoots: string[] = [];
function scratch(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'seo-pass-test-'));
  scratchRoots.push(tmp);
  cpSync(join(root, dir), join(tmp, dir), { recursive: true });
  return tmp;
}
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

describe('seo pass source successors', () => {
  it('hands every reviewed successor its rebuilt pre-pass bytes', () => {
    expect(review.sources).toHaveLength(57);
    for (const s of review.sources) {
      const live = read(s.after.path);
      expect([live.length, sha(live)]).toEqual([s.after.bytes, s.after.sha256]);
      const prior = seoPassPredecessor(root, s.before, live);
      expect([prior.length, sha(prior)]).toEqual([s.before.bytes, s.before.sha256]);
      expect(seoPassPredecessor(root, s.after, live)).toBe(live);
    }
  });

  it('gives the artifact reader the pre-pass bytes for a reference an older review holds', () => {
    const reader = createLocalArtifactReader(root);
    const prior = reader(control.before);
    expect([prior.length, sha(prior)]).toEqual([control.before.bytes, control.before.sha256]);
    expect(reader(control.after)).toEqual(read(control.after.path));
  });

  it('passes through bytes that are not a reviewed successor', () => {
    const drifted = Buffer.concat([read(control.after.path), Buffer.from('\n')]);
    expect(seoPassPredecessor(root, control.before, drifted)).toBe(drifted);
    const unreviewed = read('data/citations.ts');
    expect(seoPassPredecessor(root,
      { path: 'data/citations.ts', bytes: 1, sha256: '0'.repeat(64) }, unreviewed)).toBe(unreviewed);
  });

  it('rejects a missing source review', () => {
    const tmp = scratch();
    unlinkSync(join(tmp, dir, 'source-transition.json'));
    expect(() => seoPassPredecessor(tmp, control.before, read(control.after.path)))
      .toThrow(/seo pass source continuity drift: ENOENT/);
  });

  it('rejects a source review that drifted from its pinned bytes', () => {
    const tmp = scratch();
    const path = join(tmp, dir, 'source-transition.json');
    const text = readFileSync(path, 'utf8');
    const drifted = text.replace('"name": "classical/control"', '"name": "classical/control-drift"');
    expect(drifted).not.toBe(text);
    writeFileSync(path, drifted);
    expect(() => seoPassPredecessor(tmp, control.before, read(control.after.path))).toThrow(sourceDrift);
  });
});

// A record forged over the pre-pass bytes, so each mutation is caught by the
// obligation it breaks rather than by the byte pins.
const prior = verifySeoPassSource(control, read(control.after.path)).toString();
const pin = (text: string) => ({ path: control.after.path, bytes: Buffer.byteLength(text), sha256: sha(text) });
function forge(edits: SeoPassEdit[]): [SeoPassSource, Buffer] {
  const post = edits.reduce((text, { before, after }) => text.split(before).join(after), prior);
  return [{ ...control, before: pin(prior), after: pin(post), edits }, Buffer.from(post)];
}
const related = (n: number) => `seeAlso:\n${['rl-sim2real/legged-locomotion', 'manipulation/realtime-execution',
  'data-hardware/industrial-deployment', 'classical/kinematics'].slice(0, n).map((s) => `  - "${s}"\n`).join('')}`;
const withList = (n: number) => control.edits.map((e) => e.region === 'see-also' ? { ...e, after: related(n) } : e);
const mount = '<PendulumController defaultKp={9.5} className="mt-3" />';
const plus = (edit: SeoPassEdit) => forge([...control.edits, edit]);

describe('seo pass source obligations', () => {
  it('admits the reviewed successor and a forged copy of it', () => {
    const rebuilt = verifySeoPassSource(control, read(control.after.path));
    expect([rebuilt.length, sha(rebuilt)]).toEqual([control.before.bytes, control.before.sha256]);
    const [forged, live] = forge(control.edits);
    expect(verifySeoPassSource(forged, live).toString()).toBe(prior);
  });

  it.each([
    ['live bytes other than the reviewed successor',
      () => [control, Buffer.concat([read(control.after.path), Buffer.from('\n')])]],
    ['no edits', () => forge([])],
    ['an edit that changes nothing', () => plus({ region: 'body', before: mount, after: mount })],
    ['an unknown region', () => forge([control.edits[0], { ...control.edits[1], region: 'lead' as 'body' }])],
    ['a second see-also edit', () => plus({ region: 'see-also', before: mount, after: `${mount} ` })],
    ['one related article', () => forge(withList(1))],
    ['four related articles', () => forge(withList(4))],
    ['a body edit inside the frontmatter',
      () => plus({ region: 'body', before: 'domain: classical\n', after: 'domain: classical\nreviewNote: drift\n' })],
    ['a changed number', () => plus({ region: 'body', before: mount, after: mount.replace('9.5', '9.0') })],
    ['a changed citation order',
      () => plus({ region: 'body', before: mount, after: `${mount}\n<Cite id="tedrake-underactuated" />` })],
    ['an edit whose text is not unique',
      () => [{ ...control, edits: [...control.edits, { region: 'body', before: 'zzz', after: 'the' }] },
        read(control.after.path)]],
  ] as [string, () => [SeoPassSource, Buffer]][])('rejects %s', (_, make) => {
    const [forged, live] = make();
    expect(() => verifySeoPassSource(forged, live)).toThrow(sourceDrift);
  });
});

const specReview = JSON.parse(read(`${dir}spec-transition.json`).toString()) as { sources: SeoPassSpec[] };
const spec = specReview.sources.find(({ after }) => after.path === 'tests/e2e/kinematics.spec.ts')!;
const specDrift = /seo pass spec continuity drift/;

describe('seo pass end-to-end spec successors', () => {
  it('hands every reviewed spec successor its pre-pass bytes', () => {
    expect(specReview.sources).toHaveLength(39);
    for (const s of specReview.sources) {
      const live = read(s.after.path);
      expect([live.length, sha(live)]).toEqual([s.after.bytes, s.after.sha256]);
      const prior = seoPassPredecessor(root, s.before, live);
      expect([prior.length, sha(prior)]).toEqual([s.before.bytes, s.before.sha256]);
      expect(seoPassPredecessor(root, s.after, live)).toBe(live);
    }
  });

  it('gives the artifact reader the pre-pass spec for a reference an older review holds', () => {
    const prior = createLocalArtifactReader(root)(spec.before);
    expect([prior.length, sha(prior)]).toEqual([spec.before.bytes, spec.before.sha256]);
  });

  it('passes through spec bytes that are not the reviewed successor', () => {
    const drifted = Buffer.concat([read(spec.after.path), Buffer.from('\n')]);
    expect(seoPassPredecessor(root, spec.before, drifted)).toBe(drifted);
  });

  it('rejects a missing or drifted spec review', () => {
    for (const mode of ['missing', 'drifted'] as const) {
      const tmp = scratch();
      const path = join(tmp, dir, 'spec-transition.json');
      if (mode === 'missing') unlinkSync(path);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"name": "kinematics"', '"name": "kinematics-drift"'));
      expect(() => seoPassPredecessor(tmp, spec.before, read(spec.after.path))).toThrow(specDrift);
    }
  });

  it('rejects a successor that drops a check, a non-spec path, or an edit that changes nothing', () => {
    const prior = verifySeoPassSpec(spec, read(spec.after.path)).toString();
    const pinOf = (text: string) => ({ path: spec.after.path, bytes: Buffer.byteLength(text), sha256: sha(text) });
    const line = prior.split('\n').find((l) => l.includes('expect(') && prior.split(`${l}\n`).length === 2)!;
    const marker = '    // seo-pass-dropped-check\n';
    const dropped = prior.replace(`${line}\n`, () => marker);
    const forged = { ...spec, before: pinOf(prior), after: pinOf(dropped), edits: [{ before: `${line}\n`, after: marker }] };
    expect(() => verifySeoPassSpec(forged, Buffer.from(dropped))).toThrow(specDrift);
    // The same forgery with the check kept is admitted, so the drop is what fails.
    const swapped = prior.replace(`${line}\n`, () => `${marker}${line}\n`);
    expect(verifySeoPassSpec({ ...forged, after: pinOf(swapped), edits: [{ before: `${line}\n`, after: `${marker}${line}\n` }] },
      Buffer.from(swapped)).toString()).toBe(prior);
    const kept = { ...spec, before: pinOf(prior), after: pinOf(dropped), edits: [{ before: line, after: line }] };
    expect(() => verifySeoPassSpec(kept, Buffer.from(dropped))).toThrow(specDrift);
    const moved = { ...spec, after: { ...spec.after, path: 'content/classical/kinematics.mdx' } };
    expect(() => verifySeoPassSpec(moved, read(spec.after.path))).toThrow(specDrift);
  });
});

describe('seo pass checker revision', () => {
  // The SEO-pass revision, as the domain-pass checker layer hands it back.
  const checker = preDomainPass('lib/audit-local-basis.ts');

  it('hands the reviewed checker its figure-migration head and passes other bytes through', () => {
    const before = seoPassCheckerPredecessor(root, checker);
    expect([before.length, sha(before)])
      .toEqual([114190, 'df2ad1d487103f41f8b939a67aa15d61ceb63843b9ef3d9b2c39353070e14fe5']);
    expect(seoPassCheckerPredecessor(root, before)).toBe(before);
    const drifted = Buffer.concat([checker, Buffer.from('\n')]);
    expect(seoPassCheckerPredecessor(root, drifted)).toBe(drifted);
  });

  it('rejects a missing, corrupt or retargeted checker review', () => {
    for (const mode of ['missing', 'corrupt', 'retargeted'] as const) {
      const tmp = scratch();
      const path = join(tmp, dir, 'checker-transition.json');
      if (mode === 'missing') unlinkSync(path);
      else if (mode === 'corrupt') writeFileSync(path, mode);
      else writeFileSync(path, readFileSync(path, 'utf8').replace('"bytes": 114190', '"bytes": 114191'));
      expect(() => seoPassCheckerPredecessor(tmp, checker)).toThrow(checkerDrift);
    }
  });
});

describe('seo pass reveal revision', () => {
  const path = 'components/article/commit-to-reveal.tsx';
  const live = read(path);
  // The catalog reference the six sim2real proofs hold, older than the pass.
  const catalog = { path, bytes: 12571, sha256: '8642903b3584b2a79ecb27fefbf2cf8652dd86f4600eaa7a5ce6aa03224c4190' };
  const revealDrift = /seo pass reveal continuity drift/;

  it('hands an older reference the shared-ui endpoint and passes other bytes through', () => {
    const before = seoPassPredecessor(root, catalog, live);
    expect([before.length, sha(before)])
      .toEqual([12895, 'cd89e02019c260f36f091bae34b1deeffebbfe5128025f7dbe3b99b43140f4d4']);
    expect(seoPassPredecessor(root, { path, bytes: live.length, sha256: sha(live) }, live)).toBe(live);
    expect(seoPassPredecessor(root, catalog, before)).toBe(before);
    const drifted = Buffer.concat([live, Buffer.from('\n')]);
    expect(seoPassPredecessor(root, catalog, drifted)).toBe(drifted);
  });

  it('gives the artifact reader the catalog bytes through the shared-ui layer', () => {
    const prior = createLocalArtifactReader(root)(catalog);
    expect([prior.length, sha(prior)]).toEqual([catalog.bytes, catalog.sha256]);
  });

  it('rejects a missing, corrupt or retargeted reveal review', () => {
    for (const mode of ['missing', 'corrupt', 'retargeted'] as const) {
      const tmp = scratch();
      const review = join(tmp, dir, 'reveal-transition.json');
      if (mode === 'missing') unlinkSync(review);
      else if (mode === 'corrupt') writeFileSync(review, mode);
      else writeFileSync(review, readFileSync(review, 'utf8').replace('"bytes": 12895', '"bytes": 12896'));
      expect(() => seoPassPredecessor(tmp, catalog, live)).toThrow(revealDrift);
    }
  });
});
