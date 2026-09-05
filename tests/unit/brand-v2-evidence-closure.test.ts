import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  SHIPPED_GEOMETRY_MODEL_CLASS,
  WEB_FONT_BINARY_CLASS,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from '@/lib/brand-v2-evidence-closure';
import { MOBILE_SHELL_CLOSURE_ENTRIES } from '@/lib/brand-v2-mobile-shell-evidence';
import {
  HOME_CLOSURE_ENTRIES,
  HOME_NON_IMPORT_CLASSES,
} from '@/lib/brand-v2-home-evidence';

const ROOT = process.cwd();

const FONT_BINARY = 'public/fonts/Tektur-latin-wdth-wght.woff2';
const GEOMETRY_MODEL = 'public/models/so101/so101.urdf';

/** Bytes to put back, whatever the assertion in between did. */
const restore: Array<{ path: string; bytes: Buffer }> = [];

afterEach(() => {
  while (restore.length > 0) {
    const entry = restore.pop() as { path: string; bytes: Buffer };
    writeFileSync(join(ROOT, entry.path), entry.bytes);
  }
});

/** Appends a byte to a shipped file, so its digest moves and nothing else. */
function plantByte(path: string): void {
  const bytes = readFileSync(join(ROOT, path));
  restore.push({ path, bytes });
  writeFileSync(join(ROOT, path), Buffer.concat([bytes, Buffer.from([0x0a])]));
}

function homeFingerprint(): string {
  return deriveEvidenceClosure({
    root: ROOT,
    entries: HOME_CLOSURE_ENTRIES,
    nonImportClasses: HOME_NON_IMPORT_CLASSES,
  }).fingerprint;
}

describe('evidence closure derivation', () => {
  it('reaches past the entries into what they actually import', () => {
    const closure = deriveEvidenceClosure({
      root: ROOT,
      entries: MOBILE_SHELL_CLOSURE_ENTRIES,
    });

    expect(closure.entries).toEqual([...MOBILE_SHELL_CLOSURE_ENTRIES].sort());
    expect(closure.modules.length).toBeGreaterThan(closure.entries.length);
    // The four transitive inputs the handwritten list this replaced omitted:
    // a helper every shell primitive composes its classes through, the spec
    // that performs the measurement, the stylesheet the tokens live in, and
    // the drawer's own primitive.
    expect(closure.modules).toContain('lib/utils.ts');
    expect(closure.modules).toContain('tests/e2e/brand-v2-mobile-shell.spec.ts');
    expect(closure.assets).toContain('app/globals.css');
    expect(closure.files).toEqual(
      [...closure.modules, ...closure.assets].sort(),
    );
  });

  it('gives a different fingerprint to a different set of entries', () => {
    const mobile = deriveEvidenceClosure({
      root: ROOT,
      entries: MOBILE_SHELL_CLOSURE_ENTRIES,
    });
    const home = deriveEvidenceClosure({
      root: ROOT,
      entries: HOME_CLOSURE_ENTRIES,
    });

    expect(mobile.fingerprint).not.toEqual(home.fingerprint);
  });

  it('binds the declared facts as tightly as the files', () => {
    const withoutFacts = deriveEvidenceClosure({
      root: ROOT,
      entries: MOBILE_SHELL_CLOSURE_ENTRIES,
    });
    const withFacts = deriveEvidenceClosure({
      root: ROOT,
      entries: MOBILE_SHELL_CLOSURE_ENTRIES,
      facts: ['rail-device:one'],
    });
    const otherFacts = deriveEvidenceClosure({
      root: ROOT,
      entries: MOBILE_SHELL_CLOSURE_ENTRIES,
      facts: ['rail-device:two'],
    });

    expect(withFacts.fingerprint).not.toEqual(withoutFacts.fingerprint);
    expect(withFacts.fingerprint).not.toEqual(otherFacts.fingerprint);
  });

  it('refuses to derive a closure from no entries', () => {
    expect(() => deriveEvidenceClosure({ root: ROOT, entries: [] })).toThrow(
      /at least one entry point/i,
    );
  });

  it('refuses an entry the scan never saw', () => {
    expect(() =>
      deriveEvidenceClosure({
        root: ROOT,
        entries: [...MOBILE_SHELL_CLOSURE_ENTRIES, 'lib/not-a-real-module.ts'],
      }),
    ).toThrow(/lib\/not-a-real-module\.ts/);
  });

  it('refuses a computed specifier it does not account for', () => {
    // The article template names its body with a template literal. Without a
    // declared allowance the closure has no idea which modules that reaches,
    // and saying nothing would be the omission this mechanism exists to
    // remove.
    expect(() =>
      deriveEvidenceClosure({
        root: ROOT,
        entries: ['app/(content)/[domain]/[slug]/page.tsx'],
      }),
    ).toThrow(/computed specifier this closure does not account for/);
  });

  it('refuses an allowance whose claimed cover has holes in it', () => {
    // The allowance is only true of a closure that already holds every
    // article body. Granted to one that does not, it must not quietly hold.
    expect(() =>
      deriveEvidenceClosure({
        root: ROOT,
        entries: ['app/(content)/[domain]/[slug]/page.tsx'],
        computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
      }),
    ).toThrow(/module\(s\) under that prefix are outside the closure/);
  });

  it('refuses an allowance that covers nothing', () => {
    expect(() =>
      deriveEvidenceClosure({
        root: ROOT,
        entries: MOBILE_SHELL_CLOSURE_ENTRIES,
        computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
      }),
    ).toThrow(/writes none/);
  });

  it('holds every article body when it walks the whole site', () => {
    const graph = evidenceClosureGraph(ROOT);
    const closure = deriveEvidenceClosure({
      root: ROOT,
      entries: routeEntryModules(graph),
      computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
    });

    const bodies = closure.modules.filter((path) => path.endsWith('.mdx'));
    expect(bodies.length).toBeGreaterThan(40);
    expect(
      graph.modules.filter(
        (path) => path.endsWith('.mdx') && !closure.modules.includes(path),
      ),
    ).toEqual([]);
  });

  it('resolves the article template to the family of bodies it can name', () => {
    const graph = evidenceClosureGraph(ROOT);
    const template = 'app/(content)/[domain]/[slug]/page.tsx';
    const computed = graph.computedDependenciesByModule.get(template) ?? [];

    expect(computed).toHaveLength(1);
    expect(computed[0].specifier).toBe('@/content/${domain}/${slug}.mdx');
    expect(computed[0].kind).toBe('dynamic');
    // One interpolation stands for one path segment, so the family is
    // exactly the bodies two levels under content/ and not every module
    // anywhere beneath it.
    expect(computed[0].targets).toEqual(
      graph.modules.filter((path) => /^content\/[^/]+\/[^/]+\.mdx$/.test(path)),
    );
    expect(computed[0].targets.length).toBeGreaterThan(40);

    const [resolved] = graph
      .firstPartySpecifiersIn([template])
      .filter((entry) => entry.resolution === 'computed');
    expect(resolved.computedTargets).toEqual(computed[0].targets);
    expect(resolved.path).toBeNull();

    // The family stays out of the edge walk on purpose. Folding it in would
    // make every article route reach every article body, and the per-route
    // Tektur attribution reads that walk.
    expect(
      [...(graph.edges.get(template) ?? [])].filter((path) =>
        path.startsWith('content/'),
      ),
    ).toEqual([]);
  });

  it('refuses an allowance whose specifier names a family the closure does not hold', () => {
    const graph = evidenceClosureGraph(ROOT);
    const bodies = graph.modules.filter((path) => path.startsWith('content/'));
    // Every body but one is an entry, so the prefix claim is one module
    // short and the resolved family is the same module short. Before the
    // specifier resolved, only the prefix claim could catch this.
    expect(() =>
      deriveEvidenceClosure({
        root: ROOT,
        entries: [
          'app/(content)/[domain]/[slug]/page.tsx',
          ...bodies.slice(1),
        ],
        computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT],
      }),
    ).toThrow(new RegExp(`outside the closure, starting with ${bodies[0].replace(/[.[\]()]/g, '\\$&')}`));
  });

  it('covers each declared non-import dependency class, and each one separately', () => {
    // The input that used to pass: the import closure could not see the face
    // every glyph is drawn with or the geometry every hardware figure is
    // derived from, so either could be replaced wholesale while the
    // committed sweep still read as current.
    const closure = deriveEvidenceClosure({
      root: ROOT,
      entries: HOME_CLOSURE_ENTRIES,
      nonImportClasses: HOME_NON_IMPORT_CLASSES,
    });
    const byClass = new Map(
      closure.nonImportDependencies.map((members) => [
        members.classId,
        members.files,
      ]),
    );
    expect(byClass.get(WEB_FONT_BINARY_CLASS.id)).toContain(FONT_BINARY);
    expect(byClass.get(SHIPPED_GEOMETRY_MODEL_CLASS.id)).toContain(
      GEOMETRY_MODEL,
    );
    // The URDF names the meshes actually drawn, so stopping at the URDF
    // would hash the description of the robot and none of its shape.
    expect(
      (byClass.get(SHIPPED_GEOMETRY_MODEL_CLASS.id) ?? []).filter((path) =>
        path.endsWith('.glb'),
      ).length,
    ).toBeGreaterThan(5);
    for (const files of byClass.values()) {
      for (const path of files) expect(closure.files).toContain(path);
    }

    // The accepted half: the same derivation is stable while nothing moves.
    const baseline = homeFingerprint();
    expect(homeFingerprint()).toEqual(baseline);

    // One plant per class, so neither class is carried by the other.
    plantByte(FONT_BINARY);
    const withPlantedFont = homeFingerprint();
    expect(withPlantedFont).not.toEqual(baseline);

    plantByte(GEOMETRY_MODEL);
    expect(homeFingerprint()).not.toEqual(withPlantedFont);
  });

  it('refuses a declared class that covers nothing', () => {
    // A class that resolves no member reads as coverage it does not provide.
    expect(() =>
      deriveEvidenceClosure({
        root: ROOT,
        entries: HOME_CLOSURE_ENTRIES,
        nonImportClasses: [
          { ...WEB_FONT_BINARY_CLASS, extensions: ['.nothing-ships-this'] },
        ],
      }),
    ).toThrow(/covers nothing/);
  });

  it('leaves the non-import classes out of a closure that does not declare them', () => {
    const declared = deriveEvidenceClosure({
      root: ROOT,
      entries: HOME_CLOSURE_ENTRIES,
      nonImportClasses: HOME_NON_IMPORT_CLASSES,
    });
    const undeclared = deriveEvidenceClosure({
      root: ROOT,
      entries: HOME_CLOSURE_ENTRIES,
    });
    expect(undeclared.files).not.toContain(FONT_BINARY);
    expect(declared.fingerprint).not.toEqual(undeclared.fingerprint);
  });

  it('derives route entries covering every public segment file', () => {
    const graph = evidenceClosureGraph(ROOT);
    const entries = routeEntryModules(graph);

    expect(entries).toContain('app/layout.tsx');
    expect(entries).toContain('app/page.tsx');
    expect(entries).toContain('mdx-components.tsx');
    expect(entries).toContain('app/(content)/[domain]/[slug]/page.tsx');
    expect(new Set(entries).size).toEqual(entries.length);
  });
});
