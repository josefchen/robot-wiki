/**
 * Crossref author-metadata sweep (VAL-BUILD citation integrity).
 *
 * For every citation in data/citations.ts whose url carries a DOI, query
 * api.crossref.org/works/<doi> and compare the registry entry's author
 * names, year and title against the record, using the pure comparison in
 * lib/crossref-authors.ts. Family names and year are hard equality (modulo
 * diacritics/hyphenation); given names are flagged both when they contradict
 * the record and when they expand an initial the source publishes only as an
 * initial (the from-memory-expansion pattern this sweep was created to
 * catch; see the author-field policy in the header of data/citations.ts).
 *
 * Deliberately NOT wired into the build, for the same reason as
 * check:links and check:citations: dozens of network calls per run would
 * make every build slow and fail offline. It is a separate command that
 * MUST be run whenever a citation is added or an author field is edited:
 *
 *   npm run check:crossref-authors
 *   npm run check:crossref-authors -- --id ott-2010   # one entry
 *   npm run check:crossref-authors -- --json         # machine-readable
 *
 * Pragmatics: responses are cached in .crossref-cache/ (gitignored) keyed
 * by DOI, so re-runs are free and rate limits are respected; a DOI whose
 * fetch still fails is reported as UNVERIFIED (exit stays 0 for transient
 * network failures alone — never let flakiness train people to ignore the
 * gate) while an actual metadata mismatch is loud and exits 1.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CITATIONS } from '../data/citations.ts';
import { extractDoi } from '../lib/citation-links.ts';
import {
  compareCitationAuthors,
  isDocumentedDivergence,
  parseCrossrefRecord,
  type AuthorDivergence,
  type CrossrefWorkRecord,
} from '../lib/crossref-authors.ts';
import { CROSSREF_AUTHOR_EXCEPTIONS } from '../data/crossref-author-exceptions.ts';

const CACHE_DIR = join(process.cwd(), '.crossref-cache');
const MAILTO = 'robot-wiki-citation-audit@example.org'; // polite-pool identifier
const FETCH_TIMEOUT_MS = 20_000;
const BETWEEN_FETCH_MS = 150;

interface Args {
  id?: string;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--id' && argv[i + 1]) {
      args.id = argv[++i];
    } else if (argv[i] === '--json') {
      args.json = true;
    }
  }
  return args;
}

async function cachedFetchWork(doi: string): Promise<{ record: CrossrefWorkRecord | null; error?: string }> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${doi.replace(/\//g, '_')}.json`);
  if (existsSync(cachePath)) {
    const cached = JSON.parse(await readFile(cachePath, 'utf8')) as { record: CrossrefWorkRecord | null };
    return { record: cached.record };
  }
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${MAILTO}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': `robot-wiki-citation-audit/1.0 (mailto:${MAILTO})` } });
    clearTimeout(timer);
    if (!response.ok) {
      // Don't cache failures; a later run should retry.
      return { record: null, error: `HTTP ${response.status}` };
    }
    const record = parseCrossrefRecord(await response.json());
    await writeFile(cachePath, JSON.stringify({ record, fetched: new Date().toISOString() }));
    return { record };
  } catch (error) {
    return { record: null, error: error instanceof Error ? error.message : 'network error' };
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const targets = CITATIONS.filter((c) => {
    const doi = c.url ? extractDoi(c.url) : null;
    if (doi === null) return false;
    return args.id === undefined || c.id === args.id;
  });
  if (targets.length === 0) {
    console.error(`No DOI-bearing citations${args.id ? ` matching id ${args.id}` : ''}.`);
    return 1;
  }

  const divergences: { id: string; doi: string; kind: string; problem: string }[] = [];
  const unverified: { id: string; doi: string; error: string }[] = [];
  let checked = 0;
  const total = CITATIONS.length;

  for (const citation of targets) {
    const doi = extractDoi(citation.url)!;
    const { record, error } = await cachedFetchWork(doi);
    if (record === null) {
      unverified.push({ id: citation.id, doi, error: error ?? 'unparseable Crossref payload' });
    } else {
      checked++;
      const raw: AuthorDivergence[] = compareCitationAuthors(
        { id: citation.id, authors: citation.authors, year: citation.year, title: citation.title },
        record,
      );
      for (const d of raw) {
        if (isDocumentedDivergence(d, CROSSREF_AUTHOR_EXCEPTIONS)) continue;
        divergences.push({ id: citation.id, doi, kind: d.kind, problem: d.problem });
      }
    }
    await new Promise((r) => setTimeout(r, BETWEEN_FETCH_MS));
  }

  if (args.json) {
    console.log(JSON.stringify({ total, doiCitations: targets.length, checked, divergences, unverified }, null, 2));
  } else {
    console.log(`Registry: ${total} citations, ${targets.length} DOI-bearing, ${checked} verified against Crossref.`);
    if (divergences.length > 0) {
      console.log(`\nDIVERGENCES (${divergences.length}):`);
      for (const d of divergences) {
        console.log(`  [${d.id}] ${d.doi}`);
        console.log(`    ${d.problem}`);
      }
    } else {
      console.log('\nNo divergences.');
    }
    if (unverified.length > 0) {
      console.log(`\nUNVERIFIED (transient, not a failure):`);
      for (const u of unverified) console.log(`  [${u.id}] ${u.doi}: ${u.error}`);
    }
  }
  return divergences.length > 0 ? 1 : 0;
}

main().then((code) => process.exit(code));
