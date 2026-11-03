/** Exact accounting for later source-floor rows in historical ledger tests. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLedger, type ClaimRecord, type LedgerSection } from '../../lib/audit-ledger';
import { historicalGit } from './historical-git';

export const LEDGER_ADDITIONS_REVIEW = 'tests/fixtures/history/ledger-additions-review.json';
// BEGIN ledger additions review pin
const pin = {"bytes":22817,"sha256":"4e056a46b982d3f67f2ddabdb710cd5aa5dfe2006d6be9dae68981bfbae259bc"};
// END ledger additions review pin
const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const drift = 'historical ledger additions drift';
export const ledgerRowIdentity = (row: ClaimRecord) => sha(JSON.stringify([
  row.claim, row.sourceChecked, row.verdict, row.note,
  row.citationId, row.sourceUrl, row.supportingPassage,
]));
type SectionReview = { slug: string; originalRows: number; additions: string[] };
type LedgerReview = { path: string; historicalRequest: string[]; sections: SectionReview[] };
type Review = { schemaVersion: string; rationale: string; ledgers: LedgerReview[] };
const parsedArchives = new Map<string, LedgerSection[]>();

/**
 * The parser still sees every current row. This check first proves every old
 * tuple/evidence field is retained in order, then binds the exact appended rows
 * and requires their current evidence checks to pass. Its return is accounting,
 * not a filtered ledger or a replacement for current whole-ledger acceptance.
 */
export function verifyLedgerAdditions(section: Pick<LedgerSection, 'slug' | 'ledgerPath' | 'claimRows' | 'claimRecords'>, root = process.cwd()): {
  originalRows: number; addedRows: number; currentRows: number;
} {
  const bytes = readFileSync(join(root, LEDGER_ADDITIONS_REVIEW));
  if (bytes.length !== pin.bytes || sha(bytes) !== pin.sha256) throw new Error(drift);
  const review = JSON.parse(bytes.toString('utf8')) as Review;
  const scope = ['audit/classical.md', 'audit/manipulation.md', 'audit/rl-sim2real.md',
    'audit/world-models.md', 'audit/data-hardware.md', 'audit/frontier.md', 'audit/adjacent.md'];
  if (review.schemaVersion !== 'historical-ledger-additions-v1' || review.rationale.length < 100 ||
    JSON.stringify(review.ledgers.map((ledger) => ledger.path)) !== JSON.stringify(scope)) throw new Error(drift);
  const ledger = review.ledgers.find(({ path }) => path === section.ledgerPath);
  const named = ledger?.sections.find(({ slug }) => slug === section.slug);
  if (!ledger || !named || ledger.historicalRequest.join('\0') !==
    ['show', `e10bba28c9088b3639e34032ba2b921849b4b4b4:${ledger.path}`].join('\0')) throw new Error(drift);
  const historical = historicalGit(ledger.historicalRequest, { cwd: root, encoding: 'utf8', neutralVocabulary: true });
  // Re-read and verify the archive every time; cache only its parsed form under
  // the verified content hash, so later archive mutations still fail closed.
  const key = `${ledger.path}:${sha(historical)}`;
  if (!parsedArchives.has(key)) parsedArchives.set(key, parseLedger(ledger.path, historical, new Set()));
  const before = parsedArchives.get(key)!.find(({ slug }) => slug === section.slug);
  const originals = section.claimRecords.slice(0, named.originalRows);
  const additions = section.claimRecords.slice(named.originalRows);
  if (!before || before.claimRows !== named.originalRows ||
    section.claimRows !== section.claimRecords.length ||
    JSON.stringify(originals.map(ledgerRowIdentity)) !== JSON.stringify(before.claimRecords.map(ledgerRowIdentity)) ||
    JSON.stringify(additions.map(ledgerRowIdentity)) !== JSON.stringify(named.additions) ||
    additions.some(({ evidenceFailures }) => evidenceFailures.length > 0)) throw new Error(drift);
  return { originalRows: named.originalRows, addedRows: additions.length, currentRows: section.claimRows };
}
