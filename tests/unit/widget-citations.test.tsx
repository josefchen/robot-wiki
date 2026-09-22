import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CitationRecordsProvider,
  CiteRef as RecordCiteRef,
} from '@/components/article/citation-records';
import { CiteRef as RegistryCiteRef } from '@/components/mdx/cite-ref';
import { CITATIONS } from '@/data/citations';
import {
  WIDGET_CITATION_IDS,
  citationRecords,
  widgetCitationRecords,
  type CitingWidget,
} from '@/lib/widget-citations';

/**
 * The citation registry stays on the server: client widgets render only
 * the records lib/widget-citations.ts resolves for them. These tests pin
 * the three ways that can drift: a widget that looks sources up but is not
 * mounted with records, a chip id written into a widget's JSX that its
 * entry does not supply, and a client module that imports the registry
 * back into the browser.
 */

const ROOT = process.cwd();
const INTERACTIVE = join(ROOT, 'components', 'interactive');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function componentName(source: string): string {
  const match = /^export function ([A-Z][A-Za-z0-9]*)/m.exec(source);
  if (!match) throw new Error('widget exports no component');
  return match[1] as string;
}

const widgetSources = readdirSync(INTERACTIVE)
  .filter((file) => file.endsWith('.tsx'))
  .map((file) => {
    const source = readFileSync(join(INTERACTIVE, file), 'utf8');
    return { file: `components/interactive/${file}`, source, name: componentName(source) };
  });

const citing = widgetSources.filter(
  ({ source }) =>
    source.includes('useCitationLookup') ||
    /import \{[^}]*\bCiteRef\b[^}]*\} from '@\/components\/article\/citation-records'/.test(
      source,
    ),
);

describe('widget citation records', () => {
  it('finds the widgets that link to primary sources', () => {
    expect(citing.map(({ name }) => name).sort()).toEqual(
      Object.keys(WIDGET_CITATION_IDS).sort(),
    );
  });

  it('mounts every citing widget under its records in the article registry', () => {
    const mounts = read('components/mdx/article-mounts.tsx');
    for (const { name } of citing) {
      expect(mounts, name).toContain(
        `export const ${name} = withCitationRecords('${name}', Lazy${name});`,
      );
    }
  });

  it('supplies every chip id a widget writes into its own JSX', () => {
    for (const { name, source } of citing) {
      const supplied = new Set(WIDGET_CITATION_IDS[name as CitingWidget]());
      for (const match of source.matchAll(/<CiteRef\s+[^>]*?\bid=["']([^"']+)["']/g)) {
        expect(supplied.has(match[1] as string), `${name} chip ${match[1]}`).toBe(true);
      }
      for (const match of source.matchAll(/citationFor\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        expect(supplied.has(match[1] as string), `${name} lookup ${match[1]}`).toBe(true);
      }
    }
  });

  it('resolves every supplied id in the registry, and only those', () => {
    for (const widget of Object.keys(WIDGET_CITATION_IDS) as CitingWidget[]) {
      const records = widgetCitationRecords(widget);
      expect(records.length, widget).toBeGreaterThan(0);
      expect(new Set(records.map(({ id }) => id)).size).toBe(records.length);
    }
    expect(() => citationRecords(['not-a-registered-citation'])).toThrow(
      /unknown citation id/,
    );
    // A widget's records are a small slice of the bibliography, which is
    // the point: the registry itself never ships.
    const all = widgetCitationRecords(
      ...(Object.keys(WIDGET_CITATION_IDS) as CitingWidget[]),
    );
    expect(all.length).toBeLessThan(CITATIONS.length / 2);
  });

  it('renders the same chip markup as the registry-backed MDX resolver', () => {
    const id = 'knowledge-insulation-paper-2025';
    // useId values count renders; everything else must match byte for byte.
    const markup = (container: HTMLElement) =>
      container.innerHTML.replace(/_r_[0-9a-z]+_/g, 'ID');
    const fromRegistry = markup(render(<RegistryCiteRef id={id} />).container);
    const fromRecords = markup(
      render(
        <CitationRecordsProvider records={citationRecords([id])}>
          <RecordCiteRef id={id} />
        </CitationRecordsProvider>,
      ).container,
    );
    expect(fromRecords).toBe(fromRegistry);
    expect(fromRecords).toContain(`data-cite-id="${id}"`);
  });

  it('throws outside production when a widget looks up an id it was not given', () => {
    expect(() =>
      render(
        <CitationRecordsProvider records={[]}>
          <RecordCiteRef id="knowledge-insulation-paper-2025" />
        </CitationRecordsProvider>,
      ),
    ).toThrow(/was not supplied to this widget/);
  });
});

/**
 * Value imports reachable from each 'use client' module. Type-only imports
 * are erased and never reach a bundle, so they are not edges.
 */
function clientReach(): Map<string, string[]> {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(tsx?|mjs)$/.test(entry)) files.push(path);
    }
  };
  for (const dir of ['app', 'components', 'lib']) walk(join(ROOT, dir));

  const resolveSpecifier = (specifier: string, from: string): string | null => {
    const base = specifier.startsWith('@/')
      ? join(ROOT, specifier.slice(2))
      : specifier.startsWith('.')
        ? resolve(dirname(from), specifier)
        : null;
    if (base === null) {
      const parts = specifier.split('/');
      return `package:${specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]}`;
    }
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
  };

  const edges = new Map<string, string[]>();
  const depsOf = (file: string): string[] => {
    const cached = edges.get(file);
    if (cached) return cached;
    const text = readFileSync(file, 'utf8');
    const deps: string[] = [];
    for (const match of text.matchAll(
      /^(?:import|export)\s+(?!type\b)([^;]*?)\bfrom\s+['"]([^'"]+)['"]/gms,
    )) {
      if (/^\{\s*(?:type\s+\w+\s*,?\s*)+\}$/.test((match[1] as string).trim())) continue;
      const target = resolveSpecifier(match[2] as string, file);
      if (target) deps.push(target);
    }
    for (const match of text.matchAll(/^import\s+['"]([^'"]+)['"]/gm)) {
      const target = resolveSpecifier(match[1] as string, file);
      if (target) deps.push(target);
    }
    edges.set(file, deps);
    return deps;
  };

  const reach = new Map<string, string[]>();
  for (const file of files) {
    if (!/^['"]use client['"]/m.test(readFileSync(file, 'utf8').slice(0, 300))) continue;
    const seen = new Set<string>();
    const stack = [file];
    while (stack.length > 0) {
      const next = stack.pop() as string;
      if (seen.has(next)) continue;
      seen.add(next);
      if (!next.startsWith('package:')) stack.push(...depsOf(next));
    }
    reach.set(
      relative(ROOT, file),
      [...seen].map((path) => (path.startsWith('package:') ? path : relative(ROOT, path))),
    );
  }
  return reach;
}

describe('client bundle boundary', () => {
  const reach = clientReach();

  it('scans the client modules', () => {
    expect(reach.has('components/interactive/comparison-matrix.tsx')).toBe(true);
    expect(reach.size).toBeGreaterThan(60);
  });

  it.each([
    ['the citation registry', 'data/citations.ts'],
    ['the server-side citation resolver', 'lib/widget-citations.ts'],
    ['the MDX citation resolver', 'components/mdx/cite-ref.tsx'],
  ])('keeps %s out of every client module graph', (_label, forbidden) => {
    const offenders = [...reach]
      .filter(([, reached]) => reached.includes(forbidden))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
