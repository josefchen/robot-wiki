import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

const repository = process.cwd();

function fileHashes(directory: string): Record<string, string> {
  const result: Record<string, string> = {};
  function visit(relative: string) {
    for (const entry of readdirSync(join(directory, relative), { withFileTypes: true })) {
      const path = join(relative, entry.name);
      if (entry.isDirectory()) visit(path);
      else result[path] = createHash('sha256').update(readFileSync(join(directory, path))).digest('hex');
    }
  }
  visit('');
  return result;
}

it('rebuilds changed article search into the same files as a clean build and mirrors only that generation', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'search-rebuild-'));
  try {
    const source = readFileSync(join(repository, 'scripts/build-search.ts'), 'utf8');
    const dependency = "'../lib/structured-search.ts'";
    expect(source.split(dependency)).toHaveLength(2);
    // Run the complete production command in isolated output roots. Only
    // import resolution changes: structured data and Pagefind remain real.
    const isolatedSource = source.replace(dependency, JSON.stringify(pathToFileURL(join(repository, 'lib/structured-search.ts')).href));
    const makeSite = (name: string) => {
      const root = join(scratch, name);
      mkdirSync(join(root, 'scripts'), { recursive: true });
      mkdirSync(join(root, 'out'));
      writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
      writeFileSync(join(root, 'scripts/build-search.ts'), isolatedSource);
      symlinkSync(join(repository, 'node_modules'), join(root, 'node_modules'), 'dir');
      return root;
    };
    const writeArticle = (root: string, title: string, body: string) => {
      writeFileSync(join(root, 'out/index.html'), `<!doctype html><html lang="en"><head><title>${title}</title></head><body><main data-pagefind-body><h1>${title}</h1><p>${body}</p></main></body></html>`);
    };
    const build = (root: string) => {
      const result = spawnSync(process.execPath, [join(root, 'scripts/build-search.ts')], {
        cwd: root, encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024,
      });
      expect(result.error).toBeUndefined();
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    };
    const reused = makeSite('reused');
    writeArticle(reused, 'Orchard archive', 'An obsolete orchard record names apples, pears and plums.');
    build(reused);
    const previous = fileHashes(join(reused, 'out/pagefind'));
    const title = 'Robot planning';
    const body = 'The replacement article describes robot paths, contact forces and action queues.';
    writeArticle(reused, title, body);
    build(reused);

    const clean = makeSite('clean');
    writeArticle(clean, title, body);
    build(clean);
    const expected = fileHashes(join(clean, 'out/pagefind'));
    expect(expected['pagefind.js']).toBeDefined();
    expect(expected).not.toEqual(previous);
    expect(fileHashes(join(reused, 'out/pagefind'))).toEqual(expected);
    expect(fileHashes(join(reused, 'public/pagefind'))).toEqual(expected);
    expect(fileHashes(join(clean, 'public/pagefind'))).toEqual(expected);
    expect(readFileSync(join(reused, 'out/search-index.json'))).toEqual(readFileSync(join(reused, 'public/search-index.json')));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}, 60_000);
