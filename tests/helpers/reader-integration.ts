import matter from 'gray-matter';
import {
  buildManifest, isRenderedValueStateTokenAt,
} from '../../lib/brand-v2-baseline';
import { committedSource } from './continuation-integration';

export const READER_RELEASE_BASE = '334ca9c4ecbcb46ce92b9409195f2626425d6fc4';

// Transaction endpoints come from actual immutable article bytes, not from the
// approval hashes. Live merged endpoints are checked separately by the release
// integration tests, including missing and mutated approval controls.
export function readerTruthAt(ref: string, paths: readonly string[]) {
  const articles = paths.map(path => ({
    path, source: committedSource(ref, path),
    parsed: matter(committedSource(ref, path)),
  }));
  return [
    buildManifest('prose', articles.map(({ path, parsed }) => ({
      id: `article:${path.slice(8, -4)}`,
      value: { path, body: parsed.content.trim() },
    }))),
    buildManifest('relationships', articles.map(({ path, parsed }) => {
      const matches = (pattern: RegExp) => [...parsed.content.trim().matchAll(pattern)]
        .map(match => match[1]).sort();
      return {
        id: `article:${path.slice(8, -4)}`,
        value: {
          seeAlso: parsed.data.seeAlso,
          citations: matches(/<Cite\s+id=["']([^"']+)["']/g),
          terms: matches(/<Term\s+id=["']([^"']+)["']/g),
          internalLinks: matches(/\]\((\/[^)#?]+\/?)(?:#[^)]+)?\)/g),
        },
      };
    })),
    buildManifest('value-states', [{ id: 'fixture:unchanged', value: 'historical state scaffold' }, ...articles.flatMap(({ path, source }) => {
      const entries = [];
      const rendered = 'not disclosed';
      let offset = 0, ordinal = 0;
      while ((offset = source.indexOf(rendered, offset)) !== -1) {
        ordinal += 1;
        if (isRenderedValueStateTokenAt(source, rendered, offset)) {
          const id = `state-site:${path}:not-disclosed:${ordinal}`;
          entries.push({ id, value: { id, state: 'not-disclosed', rendered } });
        }
        offset += rendered.length;
      }
      return entries;
    })]),
  ];
}
