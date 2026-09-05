import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  componentElementTree,
  declaredComponentNames,
  importedNames,
  maskMarkdownCode,
  maskScriptComments,
  scanJsxTags,
} from '@/lib/brand-v2-jsx-elements';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract/brand-v2-registries.json'), 'utf8'),
) as {
  interactive: {
    mounts: Array<{
      id: string;
      ownerPath: string;
      props: string;
      containers: Array<{
        component: string;
        sourcePath: string | null;
        controlKinds: string[];
      }>;
    }>;
  };
};

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

/** The component names a document provides for itself. */
function providedNames(path: string, extra: readonly string[] = []): Set<string> {
  const text = read(path);
  return new Set([
    ...importedNames(text).keys(),
    ...declaredComponentNames(text),
    ...extra,
  ]);
}

describe('jsx element tree', () => {
  it('closes a tag at the real bracket, not at one inside a quoted value', () => {
    // `content/frontier/reliability-gap.mdx` really ships this attribute, and
    // a `[^>]*` scan reads the tag as closing inside the string, which makes
    // every element after it nest one level too deep.
    const tags = scanJsxTags('<Stat label="solved bar" value=">1,000h" />');
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe('Stat');
    expect(tags[0].selfClosing).toBe(true);
    expect(tags[0].attributes).toContain('">1,000h"');
    expect(
      scanJsxTags('<Chart data={{ a: 1 }} render={(x) => <b>{x}</b>} />')[0]
        .selfClosing,
    ).toBe(true);
  });

  it('reads nesting out of the document rather than out of the mount', () => {
    const path = 'content/data-hardware/evaluation-crisis.mdx';
    const names = providedNames(path, ['PredictThenReveal']);
    const mounts = componentElementTree({
      text: read(path),
      path,
      componentNames: names,
    }).filter(({ name }) => name === 'ReliabilityCompounding');
    expect(mounts).toHaveLength(2);
    expect(mounts[0].ancestors).toEqual([]);
    expect(mounts[1].ancestors).toEqual(['PredictThenReveal']);
    // The two mounts differ in their props as well, and the tree does not
    // read the props: stripping the second mount's own configuration leaves
    // it exactly as nested as it was.
    const unconfigured = read(path).replace(
      'defaultPerStep={0.95} defaultSteps={14} ',
      '',
    );
    expect(unconfigured).not.toEqual(read(path));
    const after = componentElementTree({
      text: unconfigured,
      path,
      componentNames: names,
    }).filter(({ name }) => name === 'ReliabilityCompounding');
    expect(after.map(({ ancestors }) => ancestors)).toEqual([
      [],
      ['PredictThenReveal'],
    ]);
  });

  it('does not read a fenced code example as a mount', () => {
    const text = [
      'Prose before.',
      '',
      '```tsx',
      '<PredictThenReveal>',
      '  <ReliabilityCompounding />',
      '```',
      '',
      '<ReliabilityCompounding className="my-6" />',
      '',
    ].join('\n');
    const masked = maskMarkdownCode(text);
    expect(masked).toHaveLength(text.length);
    const tree = componentElementTree({
      text,
      path: 'content/example.mdx',
      componentNames: new Set(['PredictThenReveal', 'ReliabilityCompounding']),
    });
    expect(tree.map(({ name, ancestors }) => [name, ancestors])).toEqual([
      ['ReliabilityCompounding', []],
    ]);
  });

  it('refuses a tree it cannot read rather than reporting no ancestors', () => {
    expect(() =>
      componentElementTree({
        text: '<PredictThenReveal>\n<ReliabilityCompounding />\n',
        path: 'content/broken.mdx',
        componentNames: new Set([
          'PredictThenReveal',
          'ReliabilityCompounding',
        ]),
      }),
    ).toThrow(/leaves <PredictThenReveal> unclosed/);
    expect(() =>
      componentElementTree({
        text: '<Aside><Callout></Aside></Callout>',
        path: 'content/broken.mdx',
        componentNames: new Set(['Aside', 'Callout']),
      }),
    ).toThrow(/closes <\/Aside>/);
  });

  it('masks comments in place so recorded offsets stay usable', () => {
    const text = "const a = 1; // the block's title\nconst b = '//not a comment';";
    const masked = maskScriptComments(text);
    expect(masked).toHaveLength(text.length);
    expect(masked).not.toContain("block's");
    expect(masked).toContain("'//not a comment'");
  });

  it('separates value imports from the type names a generic would look like', () => {
    const names = importedNames(
      [
        "import type { MDXComponents } from 'mdx/types';",
        "import { Aside, Card as Panel } from '@/components/ui';",
        "import Link from 'next/link';",
      ].join('\n'),
    );
    expect([...names.keys()].sort()).toEqual(['Aside', 'Link', 'Panel']);
    expect(names.get('Panel')).toBe('@/components/ui');
    expect(names.has('MDXComponents')).toBe(false);
  });

  it('agrees with the containers the registry generated for every mount', () => {
    // The registry's structural field is re-derived here from the documents
    // themselves, so a census that stopped walking the tree cannot leave a
    // stale `containers` array standing. The census resolves an MDX
    // document's component names through `mdx-components.tsx`; this
    // derivation takes every capitalized tag the document writes, which is
    // an independent route to the same set on markdown that has no generics.
    const byOwner = new Map<string, typeof REGISTRY.interactive.mounts>();
    for (const mount of REGISTRY.interactive.mounts) {
      byOwner.set(mount.ownerPath, [
        ...(byOwner.get(mount.ownerPath) ?? []),
        mount,
      ]);
    }
    expect(byOwner.size).toBeGreaterThan(0);
    let nested = 0;
    for (const [ownerPath, mounts] of byOwner) {
      const text = read(ownerPath);
      const names = ownerPath.endsWith('.mdx')
        ? new Set(
            scanJsxTags(maskMarkdownCode(text))
              .map(({ name }) => name)
              .filter((name) => /^[A-Z]/.test(name)),
          )
        : providedNames(ownerPath);
      const tree = componentElementTree({ text, path: ownerPath, componentNames: names });
      for (const mount of mounts) {
        const component = mount.id.split(':')[2];
        const ordinal = Number(mount.id.split(':')[3]);
        const occurrence = tree.filter(({ name }) => name === component)[
          ordinal - 1
        ];
        expect(occurrence, mount.id).toBeDefined();
        expect(
          mount.containers.map(({ component: name }) => name),
          mount.id,
        ).toEqual(occurrence.ancestors);
        if (mount.containers.length > 0) nested += 1;
      }
    }
    // A derivation that found nothing anywhere would agree with a registry
    // that recorded nothing anywhere.
    expect(nested).toBeGreaterThan(0);
  });
});
