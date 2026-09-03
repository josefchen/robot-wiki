import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  scanAnnotationAssignments,
  stripComments,
} from '@/lib/brand-v2-annotation-scan';

/**
 * Writer discovery used to be a search for quoted primitive IDs, which is
 * wrong in both directions: it cannot see `device:${device}` or
 * `surfaceIds[level]`, and it counts a read-only comparison such as
 * `dataset.brandSurfaceId !== 'surface:bounded-dark-instrument'` as a
 * definition. These fixtures pin both directions, plus the fail-closed
 * behaviour on an assignment no finite enumeration can resolve.
 */
const ROOT = process.cwd();

const fixtures: string[] = [];

function fixtureRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'annotation-scan-'));
  fixtures.push(root);
  const base: Record<string, string> = {
    'app/layout.tsx': [
      "import { Shell } from '@/components/shell';",
      'export default function Layout({ children }: { children: unknown }) {',
      '  return <Shell>{children}</Shell>;',
      '}',
    ].join('\n'),
    'app/page.tsx': 'export default function Page() {\n  return <main />;\n}\n',
    'components/shell.tsx':
      'export function Shell({ children }: { children: unknown }) {\n  return <div>{children}</div>;\n}\n',
    'lib/keep.ts': 'export const KEEP = 1;\n',
    'content/domain/article.mdx': '# Article\n',
    'mdx-components.tsx': [
      "import type { MDXComponents } from 'mdx/types';",
      'export function useMDXComponents(components: MDXComponents): MDXComponents {',
      '  return {',
      '    ...components,',
      '  };',
      '}',
    ].join('\n'),
    ...files,
  };
  for (const [path, contents] of Object.entries(base)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents, 'utf8');
  }
  return root;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('brand primitive annotation assignments', () => {
  it('resolves the finite dynamic writers this repository ships', () => {
    const scan = scanAnnotationAssignments(ROOT);

    const deviceWrite = scan.writes.find(
      (write) => write.module === 'components/ui/brand-device.tsx',
    );
    expect(deviceWrite?.form).toBe('parameter');
    expect([...(deviceWrite?.ids ?? [])].sort()).toEqual([
      'device:dot-grid',
      'device:outer-rail',
      'device:registration-cross',
      'device:section-rule',
    ]);

    const cardWrites = scan.writes.filter(
      (write) =>
        write.module === 'components/ui/card.tsx' && write.kind === 'surface',
    );
    expect(cardWrites.length).toBe(2);
    for (const write of cardWrites) {
      expect([...write.ids].sort()).toEqual(['surface:flat', 'surface:raised']);
    }

    const surfaceWrite = scan.writes.find(
      (write) => write.module === 'components/ui/surface.tsx',
    );
    expect([...(surfaceWrite?.ids ?? [])].sort()).toEqual([
      'surface:bounded-dark-instrument',
      'surface:flat',
      'surface:floating',
      'surface:raised',
    ]);
  });

  it('excludes read-only comparisons from the writer set', () => {
    const scan = scanAnnotationAssignments(ROOT);
    for (const [id, owners] of Object.entries(scan.ownersById)) {
      expect(
        owners,
        `${id} must not be owned by a module that only reads the annotation`,
      ).not.toContain('lib/brand-v2-reference-rubric.ts');
      expect(owners).not.toContain('lib/brand-v2-primitive-discovery.ts');
    }
    expect(scan.ownersById['surface:bounded-dark-instrument']).toEqual([
      'components/ui/surface.tsx',
    ]);
  });

  it('separates a variant a reachable call site never supplies', () => {
    const scan = scanAnnotationAssignments(ROOT);
    // components/ui/card.tsx can assign surface:raised, and every reachable
    // <Card> omits `level`, so the module defines the ID without supplying it.
    expect(scan.ownersById['surface:raised']).toContain('components/ui/card.tsx');
    expect(scan.productionOwnersById['surface:raised']).toEqual([]);
    expect(scan.productionOwnersById['surface:flat']).toContain(
      'components/ui/card.tsx',
    );
  });

  it('strips comments before reading assignments', () => {
    expect(
      stripComments('const a = 1; // data-brand-surface-id="surface:ghost"'),
    ).toBe('const a = 1; ');
    expect(stripComments('/* data-brand-control-id="control:ghost" */ x')).toBe(
      ' x',
    );
    expect(stripComments("const url = 'https://example.com/a'; // tail")).toBe(
      "const url = 'https://example.com/a'; ",
    );
  });

  it('ignores an annotation that only appears in a comment', () => {
    const root = fixtureRoot({
      'components/documented.tsx': [
        'export function Documented() {',
        '  // Renders data-brand-surface-id="surface:ghost" in a later feature.',
        '  return <div data-brand-surface-id="surface:flat" />;',
        '}',
      ].join('\n'),
      'app/page.tsx': [
        "import { Documented } from '@/components/documented';",
        'export default function Page() {',
        '  return <Documented />;',
        '}',
      ].join('\n'),
    });
    const scan = scanAnnotationAssignments(root);
    expect(scan.surfaceIds).toEqual(['surface:flat']);
  });

  it('rejects a computed assignment instead of under-reporting', () => {
    const root = fixtureRoot({
      'components/computed.tsx': [
        'export function Computed({ kind }: { kind: string }) {',
        '  return <div data-brand-surface-id={`surface:${kind.toLowerCase()}`} />;',
        '}',
      ].join('\n'),
    });
    expect(() => scanAnnotationAssignments(root)).toThrow(
      /interpolates a computed expression/,
    );
  });

  it('rejects a parameter whose variants are not a closed union', () => {
    const root = fixtureRoot({
      'components/open.tsx': [
        'export function Open({ level }: { level: string }) {',
        '  return <div data-brand-surface-id={`surface:${level}`} />;',
        '}',
      ].join('\n'),
    });
    expect(() => scanAnnotationAssignments(root)).toThrow(
      /cannot enumerate the variants of level/,
    );
  });

  it('rejects a call site that passes a computed variant', () => {
    const root = fixtureRoot({
      'components/panel.tsx': [
        "type Level = 'flat' | 'raised';",
        'export function Panel({ level = \'flat\' }: { level?: Level }) {',
        '  return <div data-brand-surface-id={`surface:${level}`} />;',
        '}',
      ].join('\n'),
      'app/page.tsx': [
        "import { Panel } from '@/components/panel';",
        'export default function Page({ chosen }: { chosen: string }) {',
        '  return <Panel level={chosen} />;',
        '}',
      ].join('\n'),
    });
    expect(() => scanAnnotationAssignments(root)).toThrow(
      /passes a computed level/,
    );
  });

  it('rejects an unregistered ID shape', () => {
    const root = fixtureRoot({
      'components/wrong.tsx': [
        'export function Wrong() {',
        '  return <div data-brand-surface-id="control:selection" />;',
        '}',
      ].join('\n'),
    });
    expect(() => scanAnnotationAssignments(root)).toThrow(
      /is not a surface ID/,
    );
  });

  it('rejects an annotation authored in an MDX body it cannot resolve', () => {
    const root = fixtureRoot({
      'components/documented.tsx': [
        'export function Documented() {',
        '  return <div data-brand-surface-id="surface:flat" />;',
        '}',
      ].join('\n'),
      'content/domain/article.mdx':
        '# Article\n\n<div data-brand-surface-id="surface:flat" />\n',
    });
    expect(() => scanAnnotationAssignments(root)).toThrow(
      /assigns a brand primitive annotation in MDX/,
    );
  });

  it('resolves a variant a reachable call site does supply', () => {
    const root = fixtureRoot({
      'components/panel.tsx': [
        "type Level = 'flat' | 'raised';",
        'export function Panel({ level = \'flat\' }: { level?: Level }) {',
        '  return <div data-brand-surface-id={`surface:${level}`} />;',
        '}',
      ].join('\n'),
      'app/page.tsx': [
        "import { Panel } from '@/components/panel';",
        'export default function Page() {',
        '  return <Panel level="raised" />;',
        '}',
      ].join('\n'),
    });
    const scan = scanAnnotationAssignments(root);
    expect(scan.productionOwnersById['surface:raised']).toEqual([
      'components/panel.tsx',
    ]);
    expect(scan.productionOwnersById['surface:flat']).toEqual([]);
    expect(scan.unmountedOwnersById['surface:flat']).toEqual([
      'components/panel.tsx',
    ]);
  });
});
