/**
 * Author-metadata sweep (VAL-BUILD citation integrity).
 *
 * For every citation in data/citations.ts it can reach, query an
 * authoritative metadata source and compare the registry entry's author
 * names, year and title against the record, using the pure comparison in
 * lib/crossref-authors.ts:
 *
 *  - DOI-bearing urls (56 of 319 as of 2026-08-20): api.crossref.org.
 *  - arxiv.org abs/pdf urls (147 of 319; every one also carries the
 *    schema's bare `arxiv` id field): the arXiv Atom API
 *    (https://export.arxiv.org/api/query?id_list=<id>), projected by
 *    lib/arxiv-authors.ts into the same record shape, so the comparison
 *    rules are shared, not duplicated.
 *
 * Family names and year are hard equality (modulo diacritics/hyphenation);
 * given names are flagged both when they contradict the record and when
 * they expand an initial the source publishes only as an initial (the
 * from-memory-expansion pattern this sweep was created to catch; see the
 * author-field policy in the header of data/citations.ts). arXiv publishes
 * full given names, so the expansion class mostly does not arise there,
 * but a contradicted given name ("Vikram" vs "Vikash") is flagged the same
 * way. PREPRINT RULE: an arXiv entry whose `venue` names a conference or
 * journal cites the PUBLISHED version, and a preprint byline and the
 * published byline can legitimately differ, so for those entries the sweep
 * reports only family-name mismatches and contradicted given names — never
 * a year, title or author-count divergence against the preprint record.
 *
 * DOCUMENTED RESIDUE — what no automated author check can reach. The 116
 * remaining citations (count re-derivable: node -e over data/citations.ts,
 * filtering out DOI-bearing and arxiv.org urls) carry neither a DOI nor an
 * arXiv id, so no machine-readable byline exists for them. By registry
 * `type`: `docs` (vendor and regulator documentation, GitHub repos, FDA
 * 510(k) records, ISO standard pages), `blog` (lab and company posts),
 * `press` (news releases and news coverage), and `paper` (a handful of
 * web-hosted papers and technical reports whose landing pages expose no
 * structured byline: NeurIPS-proceedings HTML, a Berkeley course PDF, a
 * Nature article whose landing page is not the DOI url, a NVIDIA lab
 * technical report PDF). Their author fields are verified by the
 * per-claim content audits (see audit/) rather than by this sweep. Do not
 * invent a checker for them: a scraped HTML byline is not authoritative
 * the way Crossref and the arXiv API are.
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
 * Pragmatics: Crossref responses are cached in .crossref-cache/ (gitignored)
 * keyed by DOI, arXiv Atom responses in .arxiv-cache/ keyed by a
 * comma-joined sorted id batch (arXiv serves up to ~100 ids per query, so
 * a full sweep is two requests, and re-runs are free). arXiv asks for one
 * request every three seconds, so batch fetches wait BETWEEN_ARXIV_MS
 * between them; a fetch that still fails is reported as UNVERIFIED (exit
 * stays 0 for transient network failures alone — never let flakiness train
 * people to ignore the gate) while an actual metadata mismatch is loud and
 * exits 1.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { CITATIONS } from '../data/citations.ts';
import { extractDoi } from '../lib/citation-links.ts';
import {
  compareCitationAuthors,
  crossrefAuthorExceptionProblems,
  isDocumentedDivergence,
  parseCrossrefRecord,
  type AuthorDivergence,
  type CrossrefWorkRecord,
} from '../lib/crossref-authors.ts';
import { extractArxivId, parseArxivAtom } from '../lib/arxiv-authors.ts';
import { CROSSREF_AUTHOR_EXCEPTIONS } from '../data/crossref-author-exceptions.ts';

const CROSSREF_CACHE_DIR = join(process.cwd(), '.crossref-cache');
const ARXIV_CACHE_DIR = join(process.cwd(), '.arxiv-cache');
const MAILTO = 'robot-wiki-citation-audit@example.org'; // polite-pool identifier
const FETCH_TIMEOUT_MS = 20_000;
const BETWEEN_FETCH_MS = 150;
const BETWEEN_ARXIV_MS = 3_100; // arXiv asks for >= 1 request / 3 seconds
const ARXIV_BATCH_SIZE = 100;

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
  await mkdir(CROSSREF_CACHE_DIR, { recursive: true });
  const cachePath = join(CROSSREF_CACHE_DIR, `${doi.replace(/\//g, '_')}.json`);
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

/**
 * Fetch Atom entries for a batch of bare arXiv ids (one request per batch,
 * cached). Returns the ids the batch could NOT resolve, so the sweep can
 * report them UNVERIFIED rather than skipping them silently.
 */
async function fetchArxivBatch(
  ids: string[],
): Promise<{ records: Map<string, CrossrefWorkRecord>; unresolved: string[]; error?: string }> {
  await mkdir(ARXIV_CACHE_DIR, { recursive: true });
  const key = ids.slice().sort().join(',');
  // sha1 digest: a 100-id batch key is over filesystem name limits.
  const cachePath = join(
    ARXIV_CACHE_DIR,
    `${createHash('sha1').update(key).digest('hex')}.xml`,
  );
  let xml: string | null = null;
  if (existsSync(cachePath)) {
    xml = await readFile(cachePath, 'utf8');
  } else {
    const url = `https://export.arxiv.org/api/query?id_list=${key}&max_results=${ARXIV_BATCH_SIZE}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': `robot-wiki-citation-audit/1.0 (mailto:${MAILTO})` } });
      clearTimeout(timer);
      if (!response.ok) {
        // Don't cache failures; a later run should retry.
        return { records: new Map(), unresolved: ids, error: `HTTP ${response.status}` };
      }
      xml = await response.text();
      await writeFile(cachePath, xml);
    } catch (error) {
      return {
        records: new Map(),
        unresolved: ids,
        error: error instanceof Error ? error.message : 'network error',
      };
    }
  }
  const records = parseArxivAtom(xml);
  const unresolved = ids.filter((id) => !records.has(id));
  return { records, unresolved };
}

interface SweepResult {
  divergences: { id: string; source: string; kind: string; problem: string }[];
  unverified: { id: string; source: string; error: string }[];
  doiChecked: number;
  arxivChecked: number;
}

async function sweepArxiv(
  targets: { id: string; arxivId: string }[],
): Promise<SweepResult> {
  const result: SweepResult = { divergences: [], unverified: [], doiChecked: 0, arxivChecked: 0 };
  for (let i = 0; i < targets.length; i += ARXIV_BATCH_SIZE) {
    const batch = targets.slice(i, i + ARXIV_BATCH_SIZE);
    const { records, error } = await fetchArxivBatch(batch.map((t) => t.arxivId));
    const byArxivId = new Map(CITATIONS.map((c) => [c.arxiv ?? extractArxivId(c.url) ?? '', c]));
    for (const target of batch) {
      const citation = byArxivId.get(target.arxivId)!;
      const record = records.get(target.arxivId);
      if (record === undefined) {
        result.unverified.push({
          id: target.id,
          source: `arXiv ${target.arxivId}`,
          error: error ?? 'no Atom entry for this id',
        });
        continue;
      }
      result.arxivChecked++;
      const raw: AuthorDivergence[] = compareCitationAuthors(
        {
          id: citation.id,
          authors: citation.authors,
          year: citation.year,
          title: citation.title,
          ...(citation.venue !== undefined ? { venue: citation.venue } : {}),
        },
        record,
        'arXiv',
      );
      for (const d of raw) {
        if (isDocumentedDivergence(d, CROSSREF_AUTHOR_EXCEPTIONS)) continue;
        result.divergences.push({ id: citation.id, source: `arXiv ${target.arxivId}`, kind: d.kind, problem: d.problem });
      }
    }
    if (i + ARXIV_BATCH_SIZE < targets.length) {
      await new Promise((r) => setTimeout(r, BETWEEN_ARXIV_MS));
    }
  }
  return result;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  // Hard error, not a warning: an author-scoped exception without an
  // authorIndex used to mute its class for EVERY author position on its
  // id, so a malformed exceptions file is itself a finding (2026-08-20).
  const exceptionProblems = crossrefAuthorExceptionProblems(CROSSREF_AUTHOR_EXCEPTIONS);
  if (exceptionProblems.length > 0) {
    console.error('MALFORMED EXCEPTIONS in data/crossref-author-exceptions.ts:');
    for (const problem of exceptionProblems) console.error(`  ${problem}`);
    console.error('\nFix the file: author-scoped entries must name one authorIndex each.');
    return 1;
  }

  const matchesFilter = (id: string): boolean => args.id === undefined || id === args.id;
  const doiTargets = CITATIONS.filter((c) => {
    const doi = c.url ? extractDoi(c.url) : null;
    return doi !== null && matchesFilter(c.id);
  });
  const arxivTargets = CITATIONS
    .filter((c) => {
      if (c.url ? extractDoi(c.url) : null) return false;
      return extractArxivId(c.url) !== null && matchesFilter(c.id);
    })
    .map((c) => ({ id: c.id, arxivId: extractArxivId(c.url)! }));
  if (doiTargets.length === 0 && arxivTargets.length === 0) {
    console.error(`No DOI-bearing or arXiv citations${args.id ? ` matching id ${args.id}` : ''}.`);
    return 1;
  }

  // Derived residue census (see the DOCUMENTED RESIDUE section of this
  // header): the citations no automated author check can reach, counted
  // by registry type so a drift in the registry shows up here.
  const residueByType = new Map<string, number>();
  for (const c of CITATIONS) {
    if (c.url ? extractDoi(c.url) : null) continue;
    if (extractArxivId(c.url) !== null) continue;
    residueByType.set(c.type, (residueByType.get(c.type) ?? 0) + 1);
  }
  const residue = [...residueByType.values()].reduce((a, b) => a + b, 0);

  const doiResult: SweepResult = { divergences: [], unverified: [], doiChecked: 0, arxivChecked: 0 };
  for (const citation of doiTargets) {
    const doi = extractDoi(citation.url)!;
    const { record, error } = await cachedFetchWork(doi);
    if (record === null) {
      doiResult.unverified.push({ id: citation.id, source: `Crossref ${doi}`, error: error ?? 'unparseable Crossref payload' });
    } else {
      doiResult.doiChecked++;
      const raw: AuthorDivergence[] = compareCitationAuthors(
        { id: citation.id, authors: citation.authors, year: citation.year, title: citation.title },
        record,
      );
      for (const d of raw) {
        if (isDocumentedDivergence(d, CROSSREF_AUTHOR_EXCEPTIONS)) continue;
        doiResult.divergences.push({ id: citation.id, source: `Crossref ${doi}`, kind: d.kind, problem: d.problem });
      }
    }
    await new Promise((r) => setTimeout(r, BETWEEN_FETCH_MS));
  }
  const arxivResult = await sweepArxiv(arxivTargets);

  const divergences = [...doiResult.divergences, ...arxivResult.divergences];
  const unverified = [...doiResult.unverified, ...arxivResult.unverified];
  const checked = doiResult.doiChecked + arxivResult.arxivChecked;

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          total: CITATIONS.length,
          doiCitations: doiTargets.length,
          arxivCitations: arxivTargets.length,
          checked,
          residueByType: Object.fromEntries(residueByType),
          divergences,
          unverified,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `Registry: ${CITATIONS.length} citations, ${doiTargets.length} DOI-bearing + ${arxivTargets.length} arXiv, ${checked} verified against their source.`,
    );
    console.log(
      `No automated author check reaches ${residue} citations (${[...residueByType.entries()].map(([t, n]) => `${n} ${t}`).join(', ')}); see the DOCUMENTED RESIDUE section of this script's header.`,
    );
    if (divergences.length > 0) {
      console.log(`\nDIVERGENCES (${divergences.length}):`);
      for (const d of divergences) {
        console.log(`  [${d.id}] ${d.source}`);
        console.log(`    ${d.problem}`);
      }
    } else {
      console.log('\nNo divergences.');
    }
    if (unverified.length > 0) {
      console.log(`\nUNVERIFIED (transient, not a failure):`);
      for (const u of unverified) console.log(`  [${u.id}] ${u.source}: ${u.error}`);
    }
  }
  return divergences.length > 0 ? 1 : 0;
}

main().then((code) => process.exit(code));
