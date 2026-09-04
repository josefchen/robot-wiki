import { describe, expect, it } from 'vitest';
import {
  ARTICLE_BODY_COMPUTED_IMPORT,
  deriveEvidenceClosure,
  evidenceClosureGraph,
  routeEntryModules,
} from '@/lib/brand-v2-evidence-closure';
import { MOBILE_SHELL_CLOSURE_ENTRIES } from '@/lib/brand-v2-mobile-shell-evidence';
import { HOME_CLOSURE_ENTRIES } from '@/lib/brand-v2-home-evidence';

const ROOT = process.cwd();

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
