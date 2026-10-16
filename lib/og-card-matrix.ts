import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The sealed OG/X matrix, read from the contract itself.
 *
 * `contract/design-integrity.md` §20 lists every exported card and the
 * route that owns it, and the destinations that share the site card. The
 * generator has to fail when registry truth stops equalling that list
 * (§20: "A future publish requires an owner-approved contract update"), so
 * the list is parsed from the sealed document rather than restated in code
 * where it could be edited to agree with whatever the registry says.
 */
export const OG_MATRIX_SOURCE = 'contract/design-integrity.md';

export type OgMatrixRow = {
  row: number;
  /** `site` for row 1, otherwise the article route, e.g. `/classical/control/`. */
  routeOwner: string;
  assetPath: string;
  /** `site` or `<domain>/<slug>`, the corpus card identifier. */
  cardId: string;
};

export type OgMatrix = {
  rows: OgMatrixRow[];
  /** The non-article destinations sealed to the site card. */
  siteDestinations: string[];
  /** The structured-image corpus size the contract seals. */
  structuredImageCount: number;
};

const SECTION = /^## 20\. Exact (\d+)-OG matrix$/;
const ROW = /^\| (\d+) \| (.+?) \| `(\/og\/[^`]+\.png)` \|$/;
const DESTINATION = /^(\d+)\. `(\/[^`]*)`$/;
const STRUCTURED = /contains exactly (\d+) article assets/;

export function parseOgMatrix(markdown: string): OgMatrix {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => SECTION.test(line));
  if (start === -1) {
    throw new Error(`${OG_MATRIX_SOURCE} has no "## 20. Exact N-OG matrix" section`);
  }
  const declared = Number((SECTION.exec(lines[start]) as RegExpExecArray)[1]);
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  const section = lines.slice(start + 1, end === -1 ? undefined : end);

  const rows: OgMatrixRow[] = [];
  const siteDestinations: string[] = [];
  let structuredImageCount = Number.NaN;
  for (const line of section) {
    const row = ROW.exec(line);
    if (row) {
      const number = Number(row[1]);
      const owner = row[2];
      const assetPath = row[3];
      if (number === 1) {
        if (assetPath !== '/og/robot-wiki.png') {
          throw new Error(`Matrix row 1 seals ${assetPath}, not the site card`);
        }
        rows.push({ row: number, routeOwner: 'site', assetPath, cardId: 'site' });
        continue;
      }
      const route = /^`(\/[a-z0-9-]+\/[a-z0-9-]+\/)`$/.exec(owner);
      if (!route) throw new Error(`Matrix row ${number} names no article route: ${owner}`);
      const [, domain, slug] = route[1].split('/');
      if (assetPath !== `/og/${domain}/${slug}.png`) {
        throw new Error(
          `Matrix row ${number} pairs ${route[1]} with ${assetPath}, not its slug-bearing card`,
        );
      }
      rows.push({ row: number, routeOwner: route[1], assetPath, cardId: `${domain}/${slug}` });
      continue;
    }
    const destination = DESTINATION.exec(line);
    if (destination) {
      if (Number(destination[1]) !== siteDestinations.length + 1) {
        throw new Error(`Site-card destination list is out of order at ${line}`);
      }
      siteDestinations.push(destination[2]);
      continue;
    }
    const structured = STRUCTURED.exec(line);
    if (structured) structuredImageCount = Number(structured[1]);
  }
  rows.forEach(({ row }, index) => {
    if (row !== index + 1) throw new Error(`Matrix rows are not numbered 1..N at row ${row}`);
  });
  if (rows.length !== declared) {
    throw new Error(`The matrix heading seals ${declared} cards; the table lists ${rows.length}`);
  }
  if (rows[0]?.cardId !== 'site') throw new Error('Matrix row 1 is not the site card');
  if (new Set(rows.map(({ assetPath }) => assetPath)).size !== rows.length) {
    throw new Error('The sealed matrix repeats an asset');
  }
  if (siteDestinations.length === 0 || new Set(siteDestinations).size !== siteDestinations.length) {
    throw new Error('The sealed site-card destination list is empty or repeats a route');
  }
  if (!Number.isInteger(structuredImageCount)) {
    throw new Error('The sealed matrix states no structured-image corpus size');
  }
  if (structuredImageCount !== (rows.length - 1) * 2) {
    throw new Error(
      `The sealed structured-image corpus is ${structuredImageCount} files; ${rows.length - 1} articles need ${(rows.length - 1) * 2}`,
    );
  }
  return { rows, siteDestinations, structuredImageCount };
}

export function readOgMatrix(root: string): OgMatrix {
  return parseOgMatrix(readFileSync(join(root, OG_MATRIX_SOURCE), 'utf8'));
}

/**
 * The difference between the sealed card population and the one the corpus
 * derives from the registry; empty when they agree.
 */
export function ogMatrixDrift(
  matrix: OgMatrix,
  corpus: ReadonlyArray<{ cardId: string; cardPath: string }>,
): string[] {
  const sealed = new Map(matrix.rows.map((row) => [row.cardId, row.assetPath]));
  const derived = new Map(corpus.map(({ cardId, cardPath }) => [cardId, cardPath]));
  const drift: string[] = [];
  for (const [cardId, assetPath] of sealed) {
    if (!derived.has(cardId)) drift.push(`sealed ${cardId} (${assetPath}) is not in the registry corpus`);
    else if (derived.get(cardId) !== assetPath) {
      drift.push(`${cardId} ships ${derived.get(cardId)}; the matrix seals ${assetPath}`);
    }
  }
  for (const [cardId, cardPath] of derived) {
    if (!sealed.has(cardId)) {
      drift.push(`registry card ${cardId} (${cardPath}) is not in the sealed matrix; an owner-approved contract update must add it first`);
    }
  }
  return drift;
}
