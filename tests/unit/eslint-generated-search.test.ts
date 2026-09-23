import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const eslint = new ESLint({ cwd: root });

describe('lint scope for the generated search mirror', () => {
  it('treats both copies of the generated Pagefind bundle as build output', async () => {
    for (const path of ['out/pagefind/pagefind.js', 'public/pagefind/pagefind.js']) {
      expect(await eslint.isPathIgnored(resolve(root, path)), path).toBe(true);
    }
  });

  it('continues to lint first-party search source and its generation script', async () => {
    for (const path of [
      'components/search/search-interface.tsx',
      'scripts/build-search.ts',
      'tests/unit/eslint-generated-search.test.ts',
    ]) {
      expect(await eslint.isPathIgnored(resolve(root, path)), path).toBe(false);
    }
  });
});
