import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import recmaLazyMounts, {
  ARTICLE_MOUNTS_MODULE,
  LAZY_MDX_CLIENT_MODULES,
  isLazyMountSpecifier,
} from '@/lib/recma-lazy-mounts.mjs';

/**
 * Articles load each client component they mount as its own chunk: the
 * recma plugin re-points their widget imports at the mount registry, whose
 * exports are next/dynamic wrappers. These tests pin that every widget an
 * article can import has a wrapper naming the right module and export, so
 * no widget silently falls back into a shared eager chunk.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const lazySource = read('components/mdx/lazy-mounts.tsx');
const mountsSource = read('components/mdx/article-mounts.tsx');

/** name -> { specifier, exportName } for every next/dynamic wrapper. */
const lazyEntries = new Map(
  [
    ...lazySource.matchAll(
      /export const ([A-Z]\w*) = dynamic\(\(\) =>\s*import\('([^']+)'\)\.then\(\(m\) => m\.(\w+)\),?\s*\);/g,
    ),
  ].map((match) => [match[1] as string, { specifier: match[2] as string, exportName: match[3] as string }]),
);

function exportedComponent(path: string): string {
  const match = /^export function ([A-Z][A-Za-z0-9]*)/m.exec(read(path));
  if (!match) throw new Error(`${path} exports no component`);
  return match[1] as string;
}

describe('lazy mount registry', () => {
  it('is a Client Component module, so each import() is its own chunk', () => {
    expect(lazySource.startsWith("'use client';")).toBe(true);
    expect(mountsSource).not.toMatch(/^['"]use client['"]/);
  });

  it('wraps every interactive widget under its own name and module', () => {
    const widgets = readdirSync(join(ROOT, 'components', 'interactive')).filter((file) =>
      file.endsWith('.tsx'),
    );
    expect(widgets.length).toBeGreaterThan(50);
    for (const file of widgets) {
      const specifier = `@/components/interactive/${file.replace(/\.tsx$/, '')}`;
      const name = exportedComponent(`components/interactive/${file}`);
      expect(lazyEntries.get(name), name).toEqual({ specifier, exportName: name });
    }
  });

  it('wraps the client MDX tables articles import', () => {
    for (const specifier of LAZY_MDX_CLIENT_MODULES) {
      const path = `${specifier.replace(/^@\//, '')}.tsx`;
      expect(read(path).startsWith("'use client';"), path).toBe(true);
      const name = exportedComponent(path);
      expect(lazyEntries.get(name), name).toEqual({ specifier, exportName: name });
    }
  });

  it('exports every wrapper from the server mount registry', () => {
    for (const name of lazyEntries.keys()) {
      const reexported = new RegExp(`^  ${name},$`, 'm').test(mountsSource);
      const wrapped = mountsSource.includes(
        `export const ${name} = withCitationRecords('${name}', Lazy${name});`,
      );
      expect(reexported !== wrapped, name).toBe(true);
    }
  });

  it('covers every client component an article imports', () => {
    const contentRoot = join(ROOT, 'content');
    let rewritten = 0;
    for (const domain of readdirSync(contentRoot)) {
      for (const file of readdirSync(join(contentRoot, domain))) {
        if (!file.endsWith('.mdx')) continue;
        const source = readFileSync(join(contentRoot, domain, file), 'utf8');
        for (const match of source.matchAll(/^import \{([^}]+)\} from '([^']+)';$/gm)) {
          const specifier = match[2] as string;
          if (!isLazyMountSpecifier(specifier)) {
            // Anything else an article imports must render on the server.
            if (specifier.startsWith('@/components/')) {
              const path = `${specifier.slice(2)}.tsx`;
              expect(read(path), `${domain}/${file} imports ${specifier}`).not.toMatch(
                /^['"]use client['"]/,
              );
            }
            continue;
          }
          for (const name of (match[1] as string).split(',').map((part) => part.trim())) {
            expect(lazyEntries.get(name)?.specifier, `${domain}/${file}: ${name}`).toBe(
              specifier,
            );
            rewritten += 1;
          }
        }
      }
    }
    expect(rewritten).toBeGreaterThan(50);
  });
});

describe('recma-lazy-mounts', () => {
  const importOf = (source: string, names: string[], kind = 'ImportSpecifier') => ({
    type: 'ImportDeclaration',
    specifiers: names.map((name) => ({
      type: kind,
      imported: { type: 'Identifier', name },
      local: { type: 'Identifier', name },
    })),
    source: { type: 'Literal', value: source, raw: `'${source}'` },
  });
  type ImportNode = ReturnType<typeof importOf>;
  const run = (body: ImportNode[]) => {
    const tree = { type: 'Program', body };
    (recmaLazyMounts() as (tree: unknown) => void)(tree);
    return tree.body.map((node) => node.source.value);
  };

  it('re-points widget and client-table imports at the mount registry', () => {
    expect(
      run([
        importOf('@/components/interactive/planar-fk-arm', ['PlanarFkArm']),
        importOf('@/components/mdx/policy-chunking-table', ['PolicyChunkingTable']),
      ]),
    ).toEqual([ARTICLE_MOUNTS_MODULE, ARTICLE_MOUNTS_MODULE]);
  });

  it('leaves every other import alone', () => {
    expect(
      run([
        importOf('@/components/mdx/text-tables', ['EvalShiftTable']),
        importOf('react', ['Fragment']),
      ]),
    ).toEqual(['@/components/mdx/text-tables', 'react']);
  });

  it('rejects a default or namespace widget import instead of guessing', () => {
    expect(() =>
      run([importOf('@/components/interactive/planar-fk-arm', ['Arm'], 'ImportDefaultSpecifier')]),
    ).toThrow(/must be imported by name/);
  });
});
