import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { maskMarkdownCode, scanJsxTags } from './brand-v2-jsx-elements.ts';

/**
 * Articles carry no boxed Callout or Aside panel: a real fact becomes one
 * cited sentence and a disclaimer is cut (VAL-OPUS-151). Both components stay
 * registered in mdx-components.tsx, so an article can still mount one; this
 * scan keeps them out and deliberately has no allowlist.
 */

export const BOXES: ReadonlySet<string> = new Set(['Callout', 'Aside']);
const ALIAS = new RegExp(`\\b(?:${[...BOXES].join('|')})\\s+as\\s+([A-Za-z_$][\\w$]*)`, 'g');
const BOX_NAME = new RegExp(`\\b(?:${[...BOXES].join('|')})\\b|components/ui/(?:callout|aside)\\b`);

export type BoxUse = { line: number; text: string };

export function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return mdxFiles(full);
    return /\.mdx?$/.test(entry.name) ? [full] : [];
  });
}

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Local names an import binds a box to, as in `import { Callout as Note }`. */
function importAliases(code: string): Set<string> {
  const aliases = new Set<string>();
  for (const statement of code.matchAll(/^import\s[^;]*?\sfrom\s/gm)) {
    for (const match of statement[0].matchAll(ALIAS)) aliases.add(match[1]);
  }
  return aliases;
}

/**
 * Opening box tags an MDX source mounts, under the registered name, an import
 * alias or a namespace (`<UI.Aside>`). Code examples and comments mount nothing.
 */
export function boxElements(source: string): BoxUse[] {
  const code = maskMarkdownCode(source);
  const aliases = importAliases(code);
  return scanJsxTags(code)
    .filter((tag) => !tag.closing && (aliases.has(tag.name) || BOXES.has(tag.name.slice(tag.name.lastIndexOf('.') + 1))))
    .map((tag) => ({ line: lineAt(source, tag.index), text: `<${tag.name}${tag.attributes}>` }));
}

/** Import or export statements that bring a box into an article, mounted or not. */
export function boxImports(source: string): BoxUse[] {
  const code = maskMarkdownCode(source);
  const uses: BoxUse[] = [];
  for (const statement of code.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s*['"][^'"]+['"]/gm)) {
    if (BOX_NAME.test(statement[0])) {
      uses.push({ line: lineAt(source, statement.index!), text: statement[0].replace(/\s+/g, ' ') });
    }
  }
  return uses;
}

/** Every box use under `contentDir`, as `path:line: text`, relative to `root`. */
export function boxUses(contentDir: string, root: string): string[] {
  return mdxFiles(contentDir).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...boxImports(source), ...boxElements(source)]
      .sort((a, b) => a.line - b.line)
      .map((use) => `${relative(root, file)}:${use.line}: ${use.text}`);
  });
}
