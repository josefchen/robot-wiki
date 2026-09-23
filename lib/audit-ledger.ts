/**
 * Registry-to-ledger reconciliation for the content-integrity audit.
 *
 * The six per-domain audit assertions (VAL-AUDIT-001..006) quantify over
 * "the complete reconciled, non-empty published population" of a domain,
 * derived at validation time from the module registry on one side and,
 * independently, from the per-article claim ledgers in `audit/` on the
 * other. Both sets must be non-empty and equal.
 *
 * That reconciliation is the half a machine can carry. It cannot read a
 * paper for you: whether a ledger row's verdict is *true* is settled by
 * the fetched source quoted in the row, not by anything here. What this
 * module rules out is the failure that reached this repository twice —
 * a ledger that looks complete because nobody compared it against the
 * registry that grew underneath it. Five articles published 2026-08-22
 * sat unaudited for a fortnight while `audit/README.md` claimed "every
 * published article", and the claim was checkable the whole time.
 *
 * The population is derived on both sides, never listed. A hardcoded
 * slug array here would go stale in exactly the way it is meant to
 * detect.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { LOCAL_BASIS_REQUIRED_TARGETS, parseLocalBasisCatalog, validateLocalBasisPlan,
  type LocalBasisContext, type LocalBasisResult } from './audit-local-basis.ts';

/** A domain's ledger and the assertion, if any, that quantifies over it. */
export interface AuditLedger {
  readonly domain: string;
  readonly ledgerPath: string;
  /**
   * `null` for `adjacent`, which has a ledger and published articles but
   * no per-domain assertion of its own in VAL-AUDIT-001..006. It is still
   * reconciled: a published article with no audit record is a defect
   * whether or not an assertion happens to name its domain.
   */
  readonly assertionId: string | null;
}

export const AUDIT_LEDGERS: readonly AuditLedger[] = [
  {
    domain: 'manipulation',
    ledgerPath: 'audit/manipulation.md',
    assertionId: 'VAL-AUDIT-001',
  },
  {
    domain: 'rl-sim2real',
    ledgerPath: 'audit/rl-sim2real.md',
    assertionId: 'VAL-AUDIT-002',
  },
  {
    domain: 'world-models',
    ledgerPath: 'audit/world-models.md',
    assertionId: 'VAL-AUDIT-003',
  },
  {
    domain: 'data-hardware',
    ledgerPath: 'audit/data-hardware.md',
    assertionId: 'VAL-AUDIT-004',
  },
  {
    domain: 'classical',
    ledgerPath: 'audit/classical.md',
    assertionId: 'VAL-AUDIT-005',
  },
  {
    domain: 'frontier',
    ledgerPath: 'audit/frontier.md',
    assertionId: 'VAL-AUDIT-006',
  },
  {
    domain: 'adjacent',
    ledgerPath: 'audit/adjacent.md',
    assertionId: null,
  },
];

/** One article's audit record, as parsed out of its domain ledger. */
export interface LedgerSection {
  readonly slug: string;
  readonly ledgerPath: string;
  /** Claim rows across every table under the article's heading(s). */
  readonly claimRows: number;
  /** Claim texts whose "Source checked" cell is empty. */
  readonly unsourcedRows: readonly string[];
  /** Rows missing any required, separately recorded evidence field. */
  readonly unevidencedRows: readonly { claim: string; source: string }[];
  readonly claimRecords: readonly ClaimRecord[];
  /** Domain-level summary errors, attached once to the first section. */
  readonly summaryFailures: readonly string[];
  /** How many rows carry each kind of evidence, for non-vacuity. */
  readonly evidenceKinds: Readonly<Record<string, number>>;
  /**
   * Rows whose verdict settles nothing: the claim was not checked, or the
   * outcome is written in a vocabulary this grader does not know.
   */
  readonly unresolvedRows: readonly { claim: string; verdict: string }[];
  /** Rows in a table shape that carries no verdict column at all. */
  readonly unverdictedRows: readonly string[];
  /** Rows whose verdict is `recorded-inconsistency`. */
  readonly recordedInconsistencyRows: number;
}

export type CoverageFailureKind =
  | 'empty-population'
  | 'unaudited-published-article'
  | 'audited-unpublished-article'
  | 'vacuous-section'
  | 'unsourced-claim'
  | 'unevidenced-claim'
  | 'unresolved-claim'
  | 'unverdicted-claim'
  | 'ledger-summary-mismatch';

export interface CoverageFailure {
  readonly kind: CoverageFailureKind;
  readonly domain: string;
  readonly message: string;
}

export interface DomainCoverage {
  readonly domain: string;
  readonly assertionId: string | null;
  readonly ledgerPath: string;
  readonly publishedCount: number;
  readonly auditedCount: number;
  readonly claimRows: number;
  /** How many claim rows carry each kind of per-claim evidence. */
  readonly evidenceKinds: Readonly<Record<string, number>>;
  readonly failures: readonly CoverageFailure[];
}

export interface CoverageSummary {
  readonly ok: boolean;
  readonly publishedCount: number;
  readonly auditedCount: number;
  readonly claimRows: number;
  /** How many claim rows carry each kind of per-claim evidence. */
  readonly evidenceKinds: Readonly<Record<string, number>>;
  readonly failures: readonly CoverageFailure[];
}

/**
 * `## slug.mdx`, `### slug.mdx`, `## slug.mdx (continued)`,
 * `## slug.mdx (per-cell audit of data/methods.ts, 18 rows)`. A heading
 * that is not an article filename (`## Summary`) does not match.
 */
const ARTICLE_HEADING = /^#{2,3}\s+([a-z0-9][a-z0-9-]*)\.mdx\b/;
const TABLE_SEPARATOR = /^\|[\s:|-]+\|$/;

/**
 * Split a GFM table row on its unescaped delimiters.
 *
 * A quoted spec-sheet excerpt inside a cell can itself contain `|`. Splitting
 * naively shifted every later column left, so two rows in
 * `audit/data-hardware.md` presented `Chipset` and `273 GB/s` where their
 * verdict lives - values no verdict grader could recognise, from rows that
 * were in fact verified.
 */
function cells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined);
  return inner
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}

/**
 * The index of the column that names the source a row was checked
 * against. Ledgers use both a three-column shape (`Claim | Source
 * checked | Verdict`) and a five-column one (`# | Claim (quoted) |
 * Source checked | Verdict | Note`), so the column is found by its
 * header rather than by position. A table with no such column is not a
 * claim table this gate can grade, and saying so is the point: a silent
 * skip would let a whole article's rows disappear from the count.
 */
function sourceColumn(header: readonly string[], ledgerPath: string): number {
  const index = header.findIndex((cell) => /source/i.test(cell));
  if (index === -1) {
    throw new Error(
      `${ledgerPath}: claim table has no source column (headers: ${header.join(' | ')})`,
    );
  }
  return index;
}

/**
 * The index of the column holding the outcome of the check, or -1 when the
 * table shape has none.
 */
function verdictColumn(header: readonly string[]): number {
  return header.findIndex((cell) => /verdict/i.test(cell));
}

function noteColumn(header: readonly string[]): number {
  return header.findIndex((cell) => /note/i.test(cell));
}

/**
 * What a ledger verdict cell settles.
 *
 * `contract/content-audit.md` is explicit that "a claim the validator could
 * not check must be reported as a failure, not skipped", so an unresolved
 * row is a defect and not a note. `recorded-inconsistency` is the separate
 * outcome the frontier ledger registers as `S`: the source WAS fetched and
 * read, and what it says disagrees with itself; the row records which
 * reading the wiki follows and why. That is a checked claim with a closed
 * outcome, so it passes - but only when it actually carries the source and
 * the note that make it one.
 *
 * `unrecognised` exists so a verdict vocabulary that grows cannot grow past
 * this grader in silence. A cell nobody here can classify fails.
 */
export type VerdictClass =
  | 'passing'
  | 'recorded-inconsistency'
  | 'unresolved'
  | 'unrecognised';

const PASSING_VERDICT_HEADS = new Set([
  'v',
  'verified',
  'verified-by-convention',
  'c',
  'corrected',
  'cut',
  'n/a',
  'a',
]);

export function classifyVerdict(
  raw: string,
  context: { readonly source: string; readonly note: string },
): VerdictClass {
  // `**corrected**`, `C (was "eight", ...)`, `V (exclusion recorded)`: the
  // outcome is the leading token, and the parenthesis is its explanation.
  const plain = raw.replace(/\*+/g, '').trim();
  if (plain === '') return 'unrecognised';
  if (/could not check/i.test(plain)) return 'unresolved';
  // The leading word, which is the outcome; everything after it is the
  // explanation ("C (was \"eight\"...)", "Cut (claim removed...)",
  // "V (exclusion recorded...)", "C twice over: ...").
  const head = (/^[a-z/]+(?:-[a-z]+)*/i.exec(plain)?.[0] ?? '').toLowerCase();
  if (head === 'unresolved') return 'unresolved';
  if (head === 's') {
    return context.source !== '' && context.note !== ''
      ? 'recorded-inconsistency'
      : 'unresolved';
  }
  if (PASSING_VERDICT_HEADS.has(head)) return 'passing';
  return 'unrecognised';
}

function claimColumn(header: readonly string[]): number {
  const index = header.findIndex((cell) => /claim/i.test(cell));
  return index === -1 ? 0 : index;
}

/**
 * The bases on which a row may rest without naming a fetched document.
 *
 * A claim that a number follows from another number, or from this
 * repository's own code, is checkable without leaving the tree. Everything
 * else has to name something a reader can go and read.
 */
const NON_FETCH_BASES = [
  /\barithmetic\b/i,
  /\bderivation\b/i,
  /\bby definition\b/i,
  /\binternal\b/i,
  /\bregistry\b/i,
  /\bthis (?:file|table|ledger)\b/i,
  /\bchecked symbolically\b/i,
  /\bcomponents?\b/i,
  /\binteractives?\b/i,
  /(?:^|\s)Int:\s/,
  /\barticle'?s own\b/i,
  /\bcited inline\b/i,
  /\bfrontmatter\b/i,
];

/**
 * Something a reader can follow: a URL, a bare host, a DOI, an arXiv id, a
 * repository path, or a citation-registry id.
 */
const LOCATOR_PATTERNS = [
  /https?:\/\/\S+/i,
  /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|org|net|edu|gov|io|ai|dev|co|uk|de|jp|cn|eu|info|website|tech)\b/i,
  /\b10\.\d{4,9}\/\S+/,
  /\barxiv[:\s]*\d{4}\.\d{4,5}/i,
  /\b(?:app|components|content|data|lib|scripts|public)\/[\w./-]+\.[a-z]{2,4}\b/,
];

/**
 * Legacy-pointer triage for recovering incomplete records. This weak
 * classifier supplies NO required field and can never make a row pass.
 */
function legacyEvidencePointer(
  source: string,
  registryIds: ReadonlySet<string>,
): {
  readonly kind:
    | 'citation-id'
    | 'locator'
    | 'passage'
    | 'named-document'
    | 'non-fetch';
  readonly value: string;
} | null {
  const cell = source.replace(/\*+/g, '').trim();
  if (cell === '') return null;
  for (const id of cell.matchAll(/`([^`]+)`/g)) {
    if (registryIds.has(id[1])) return { kind: 'citation-id', value: id[1] };
  }
  for (const word of cell.matchAll(/[a-z0-9][a-z0-9-]{3,}/gi)) {
    if (registryIds.has(word[0])) return { kind: 'citation-id', value: word[0] };
  }
  for (const pattern of LOCATOR_PATTERNS) {
    const match = pattern.exec(cell);
    if (match) return { kind: 'locator', value: match[0] };
  }
  // "DP paper, Sec. 3.1", "ACT paper Table III + Sec. III": the document is
  // named in the section's own preamble and the cell points at the passage
  // inside it. That is a per-claim evidence field, and it is what most rows
  // in the older ledgers carry.
  const passage = PASSAGE_POINTER.exec(cell);
  if (passage && DOCUMENT_NAME.test(cell)) {
    return { kind: 'passage', value: passage[0] };
  }
  for (const pattern of NON_FETCH_BASES) {
    const match = pattern.exec(cell);
    if (match) return { kind: 'non-fetch', value: match[0] };
  }
  // "π0 paper", "GR2 blog", "Isaac-GR00T repo, License section": a named
  // document with no locator. Weaker than a URL, and still evidence a
  // reader can go and find; a cell with none of the five is not.
  // The qualifier has to name something: a bare "note" or "page" is a word,
  // not a document, so a match with no proper name and no number in it is
  // not evidence.
  const named = [
    ...cell.matchAll(new RegExp(NAMED_DOCUMENT.source, 'gi')),
    ...cell.matchAll(new RegExp(AUTHOR_YEAR.source, 'g')),
  ].find(([match]) => /[A-Z\u03a0\u03c00-9]/.test(match));
  if (named) return { kind: 'named-document', value: named[0] };
  const quoted = QUOTED_PASSAGE.exec(cell);
  if (quoted) return { kind: 'passage', value: quoted[0].slice(0, 60) };
  return null;
}

/** A document noun, qualified by the name of the thing it belongs to. */
const NAMED_DOCUMENT =
  /(?:[A-Za-zπ0-9À-ɏ][\w.\-–—/À-ɏ]*\s+){1,6}(?:papers?|preprint|blogs?|posts?|essays?|articles?|surveys?|reports?|announcements?|releases?|model card|cards?|repos?|repository|pdfs?|pages?|docs?|documentation|standards?|manuals?|datasheets?|specs?|specification|proceedings|thesis|books?|chapters?|notes?|videos?|talks?|filing|10-k|press ?kit|newsroom|readme|changelog|licen[cs]e|tables?|figures?|datasets?|benchmarks?|leaderboards?)\b/i;

/** `Rudin 2021`, `Park et al. 2017`, `TechCrunch (2026-03-09)`. */
const AUTHOR_YEAR =
  /\b[A-Z][A-Za-z\u00c0-\u024f-]+(?:\s+et al\.?)?[\s,]*\(?\d{4}(?:-\d{2}-\d{2})?\)?/;

/** A passage the checker copied out of the source it read. */
const QUOTED_PASSAGE = /["“][^"”]{20,}["”]/;

/** Where inside a document the claim was read. */
const PASSAGE_POINTER =
  /(?:§|\bsec(?:tion)?\.?\s*[\dIVX]|\btable\s*[\dIVX]|\bfig(?:ure)?\.?\s*[\dIVX]|\bapp(?:endix)?\.?\s*[A-Z\d]|\bch(?:apter)?\.?\s*[\dIVX]|\bp{1,2}\.\s*\d|\babstract\b|\bcaption\b|\bconclusion\b|\bintroduction\b|\bmethods?\b|\breadme\b|\bdatasheet\b|\bspec sheet\b)/i;

/** Something named as the document the passage is inside. */
const DOCUMENT_NAME =
  /(?:\bpaper\b|\breport\b|\bpreprint\b|\bstandard\b|\bmanual\b|\bdocs?\b|\bpage\b|\bblog\b|\brelease\b|\bcard\b|["“][^"”]{4,}["”]|\b[A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*)*\b|π\d)/;

export type ClaimEvidence = {
  readonly citationId: string;
  readonly sourceUrl: string;
  readonly supportingPassage: string;
};

const nonempty = z.string().trim().min(1);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const pairedEvidenceSchema = z.object({
  partId: nonempty,
  citationId: z.string(),
  sourceUrl: z.string(),
  supportingPassage: z.string(),
}).strict();
const compoundPlanSchema = z.object({
  id: nonempty,
  ledgerPath: nonempty,
  articleSlug: nonempty,
  rowOrdinal: z.number().int().positive(),
  originalCellsDigest: digestSchema,
  kind: z.enum(['frontmatter-p1', 'explicit-parts']),
  parts: z.array(z.object({
    id: nonempty,
    text: nonempty,
    requiredCitationIds: z.array(nonempty).min(1),
  }).strict()).min(1),
  planReview: z.object({
    reviewedBy: nonempty,
    rationale: nonempty,
    planDigest: digestSchema,
  }).strict().nullable(),
  evidence: z.array(pairedEvidenceSchema),
  adjudications: z.array(z.object({
    partId: nonempty,
    outcome: z.enum(['supported', 'unresolved', 'contradicted']),
    reviewedBy: nonempty,
    rationale: nonempty,
    evidenceDigest: digestSchema,
  }).strict()),
}).strict();

/** One format, audit/compound-evidence.json; unknown/partial keys fail closed. */
export type CompoundPlan = z.infer<typeof compoundPlanSchema>;
export type AuditEvidenceContext = {
  readonly localBasis?: LocalBasisContext;
  readonly compoundPlans?: unknown;
  /** Canonical article frontmatter, never derived from available evidence. */
  readonly articleCitations?: Readonly<Record<string, readonly string[]>>;
};

const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Order: original claim, source checked, verdict, note; no evidence fields. */
export function originalClaimDigest(
  record: Pick<ClaimRecord, 'claim' | 'sourceChecked' | 'verdict' | 'note'>,
): string {
  return digest([record.claim, record.sourceChecked, record.verdict, record.note]);
}

/** These hashes detect stale review inputs, NOT semantic truth or retrieval. */
export function compoundPlanDigest(plan: CompoundPlan): string {
  return digest([plan.id, plan.ledgerPath, plan.articleSlug, plan.rowOrdinal,
    plan.originalCellsDigest, plan.kind, plan.parts]);
}

export function compoundPartDigest(plan: CompoundPlan, partId: string): string {
  return digest([compoundPlanDigest(plan), partId,
    plan.evidence.filter((item) => item.partId === partId)
      .map(({ citationId, sourceUrl, supportingPassage }) =>
        [citationId, sourceUrl, supportingPassage])]);
}

export function parseCompoundPlans(input: unknown): CompoundPlan[] {
  const parsed = z.array(compoundPlanSchema).safeParse(input);
  if (!parsed.success) throw new Error(`compound evidence format: ${parsed.error.message}`);
  const ids = new Set<string>();
  const targets = new Set<string>();
  for (const plan of parsed.data) {
    if (ids.has(plan.id)) throw new Error(`duplicate compound plan ID: ${plan.id}`);
    ids.add(plan.id);
    const target = JSON.stringify([plan.ledgerPath, plan.articleSlug, plan.rowOrdinal]);
    if (targets.has(target)) throw new Error(`duplicate compound row target: ${target}`);
    targets.add(target);
  }
  return parsed.data;
}

type CompoundResult = {
  readonly planId: string;
  readonly evidence: readonly z.infer<typeof pairedEvidenceSchema>[];
  readonly structuralFailures: readonly string[];
  readonly adjudicationFailures: readonly string[];
};

export type ClaimRecord = ClaimEvidence & {
  readonly claim: string;
  readonly line: number;
  readonly sourceChecked: string;
  readonly note: string;
  readonly verdict: string;
  readonly outcome: VerdictClass;
  readonly evidenceFailures: readonly string[];
  readonly compound?: CompoundResult;
  readonly localBasis?: LocalBasisResult;
  /** A lead for recovery, never evidence or an exemption. */
  readonly legacyPointer: ReturnType<typeof legacyEvidencePointer>;
};

/** Structural completeness, not proof that the passage supports the claim. */
export function claimEvidence(
  fields: ClaimEvidence,
  registryIds: ReadonlySet<string>,
): string[] {
  const failures: string[] = [];
  if (!registryIds.has(fields.citationId)) {
    failures.push('Citation ID must name exactly one registered source');
  }
  try {
    const url = new URL(fields.sourceUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username || url.password || /\s/.test(fields.sourceUrl)
    ) {
      throw new Error('not an uncredentialed HTTP(S) source URL');
    }
  } catch {
    failures.push('Source URL fetched must be a complete HTTP(S) URL');
  }
  if (
    fields.supportingPassage.trim() === '' ||
    /^(?:[-–—]+|n\/a|none|tbd|verbatim|see (?:above|source)|same (?:page|source)|not (?:recorded|available)|https?:\/\/\S+|abstract|readme|(?:sec(?:tion)?\.?|table|fig(?:ure)?\.?|chapter|p{1,2}\.)\s*[\dIVXA-Z.-]+)\.?$/i.test(fields.supportingPassage)
  ) {
    failures.push('Supporting passage must contain the passage actually read, not a locator or placeholder');
  }
  return failures;
}

function evidenceFields(header: readonly string[], row: readonly string[]): ClaimEvidence {
  const cell = (name: string) =>
    row[header.findIndex((value) => value.toLowerCase() === name)]?.trim() ?? '';
  return {
    citationId: cell('citation id').replace(/^`([^`]+)`$/, '$1'),
    sourceUrl: cell('source url fetched').replace(/^<([^>]+)>$/, '$1'),
    supportingPassage: cell('supporting passage'),
  };
}

function checkEvidenceHeaders(header: readonly string[], ledgerPath: string): void {
  const allowed = new Set(['citation id', 'source url fetched', 'supporting passage', 'evidence plan']);
  const seen = new Set<string>();
  for (const value of header) {
    const name = value.toLowerCase();
    if (!/^(?:citation\b|source\s*url\b|supporting\s*passage\b|evidence\b)/i.test(name)) continue;
    if (!allowed.has(name) || seen.has(name)) {
      throw new Error(`${ledgerPath}: ambiguous or unsupported evidence header: ${value}`);
    }
    seen.add(name);
  }
}

// This is an exact legacy P1 batch format, not a classifier of arbitrary prose.
const P1_BATCH = /^Frontmatter citations resolve to the intended documents \(([^)]+)\)$/;
const exactSet = (a: readonly string[], b: readonly string[]) =>
  a.length > 0 && a.length === new Set(a).size && b.length === new Set(b).size &&
  a.length === b.length && a.every((value) => b.includes(value));

/** Shared exact external-pair checks; legacy messages and digests stay unchanged. */
export function validateExternalPairs(
  parts: readonly { id: string; requiredCitationIds: readonly string[] }[],
  evidence: readonly (ClaimEvidence & { partId: string })[],
  registryIds: ReadonlySet<string>,
): string[] {
  if (parts.length === 0 && evidence.length === 0) return [];
  const structural: string[] = [];
  const pairs = parts.flatMap((part) => {
    if (new Set(part.requiredCitationIds).size !== part.requiredCitationIds.length ||
      part.requiredCitationIds.some((id) => !registryIds.has(id))) {
      structural.push(`compound part ${part.id} needs distinct registered required IDs`);
    }
    return part.requiredCitationIds.map((id) => JSON.stringify([part.id, id]));
  });
  const supplied = evidence.map((item) => JSON.stringify([item.partId, item.citationId]));
  // A work's arXiv metadata and official proceedings can establish different
  // identity fields. Preserve each fetched URL/passage pair, while requiring
  // the same exact set of required parts/citations and rejecting duplicate URLs.
  const sourceItems = evidence.map((item) =>
    JSON.stringify([item.partId, item.citationId, item.sourceUrl]));
  if (!exactSet(pairs, [...new Set(supplied)]) ||
    new Set(sourceItems).size !== sourceItems.length) {
    structural.push('compound item coverage must equal every required (part, citation) pair; duplicate source items and extras fail');
  }
  for (const item of evidence) {
    for (const failure of claimEvidence(item, registryIds)) {
      structural.push(`compound item ${item.partId}/${item.citationId}: ${failure}`);
    }
  }
  return structural;
}

function compoundEvidence(
  plan: CompoundPlan,
  record: Pick<ClaimRecord, 'claim' | 'sourceChecked' | 'verdict' | 'note'>,
  binding: string,
  scalar: ClaimEvidence,
  registryIds: ReadonlySet<string>,
  canonicalCitations: readonly string[] | undefined,
): CompoundResult {
  const structural: string[] = [];
  const adjudication: string[] = [];
  if (binding !== plan.id) structural.push('compound row is missing its exact Evidence plan binding');
  if (originalClaimDigest(record) !== plan.originalCellsDigest) {
    structural.push('compound original-cell digest is stale');
  }
  if (Object.values(scalar).some((value) => value !== '')) {
    structural.push('compound evidence cannot mix scalar fields with paired items');
  }
  const partIds = plan.parts.map((part) => part.id);
  if (new Set(partIds).size !== partIds.length) structural.push('duplicate compound part IDs');
  const required = plan.parts.flatMap((part) => part.requiredCitationIds);
  const batch = P1_BATCH.exec(record.claim);
  if (batch && plan.kind !== 'frontmatter-p1') structural.push('P1 batch requires the frontmatter-p1 kind');
  if (plan.kind === 'frontmatter-p1') {
    const declared = batch?.[1].split(',').map((id) => id.trim()) ?? [];
    if (!canonicalCitations || !exactSet(required, declared) ||
      !exactSet(declared, canonicalCitations) ||
      plan.parts.some((part) => part.requiredCitationIds.length !== 1)) {
      structural.push('P1 required citation set must exactly equal the original batch AND canonical frontmatter');
    }
  }
  structural.push(...validateExternalPairs(plan.parts, plan.evidence, registryIds));
  if (!plan.planReview || plan.planReview.planDigest !== compoundPlanDigest(plan)) {
    adjudication.push('compound plan review is missing or stale; changed/reduced plans need source-auditor review');
  }
  if (!exactSet(partIds, plan.adjudications.map((review) => review.partId))) {
    adjudication.push('compound source adjudication coverage must equal every part without duplicates or extras');
  }
  for (const review of plan.adjudications) {
    if (review.evidenceDigest !== compoundPartDigest(plan, review.partId)) {
      adjudication.push(`stale source adjudication for compound part ${review.partId}`);
    }
    if (review.outcome !== 'supported') {
      adjudication.push(`compound part ${review.partId} remains ${review.outcome}`);
    }
  }
  return { planId: plan.id, evidence: plan.evidence,
    structuralFailures: structural, adjudicationFailures: adjudication };
}

/**
 * Parse one domain ledger into one record per audited article.
 *
 * Sections for the same article are folded together: `audit/frontier.md`
 * splits four of its articles across a first pass and a `(continued)`
 * pass, and those are one article's record, not two.
 */
export function parseLedger(
  ledgerPath: string,
  markdown: string,
  registryIds: ReadonlySet<string> = new Set(),
  context: AuditEvidenceContext = {},
): LedgerSection[] {
  const plans = parseCompoundPlans(context.compoundPlans === undefined ? [] : context.compoundPlans);
  const localContext = context.localBasis ? { ...context.localBasis,
    catalog: parseLocalBasisCatalog(context.localBasis.catalog) } : undefined;
  const typedPlans = localContext?.catalog.plans ?? [];
  for (const typed of typedPlans) {
    if (plans.some(p => p.id === typed.id || (p.ledgerPath === typed.ledgerPath &&
      p.articleSlug === typed.articleSlug && p.rowOrdinal === typed.rowOrdinal))) {
      throw new Error('duplicate cross-catalog plan ID or row target');
    }
  }
  const localPlans = plans.filter((plan) => plan.ledgerPath === ledgerPath);
  const usedPlans = new Set<string>();
  const seenBindings = new Set<string>();
  const order: string[] = [];
  const rows = new Map<string, number>();
  const unsourced = new Map<string, string[]>();
  const unresolved = new Map<string, { claim: string; verdict: string }[]>();
  const unverdicted = new Map<string, string[]>();
  const recorded = new Map<string, number>();
  const unevidenced = new Map<string, { claim: string; source: string }[]>();
  const evidenceKinds = new Map<string, Record<string, number>>();
  const records = new Map<string, ClaimRecord[]>();

  let slug: string | null = null;
  let header: string[] | null = null;

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  for (const [lineIndex, line] of lines.entries()) {
    const heading = ARTICLE_HEADING.exec(line);
    if (heading) {
      slug = heading[1];
      header = null;
      if (!rows.has(slug)) {
        order.push(slug);
        rows.set(slug, 0);
        unsourced.set(slug, []);
        unresolved.set(slug, []);
        unverdicted.set(slug, []);
        recorded.set(slug, 0);
        unevidenced.set(slug, []);
        evidenceKinds.set(slug, {});
        records.set(slug, []);
      }
      continue;
    }
    if (line.startsWith('#')) {
      // Any other heading closes the article section it follows, so prose
      // tables under `## Summary` are never counted as claims.
      slug = null;
      header = null;
      continue;
    }
    if (slug === null || !line.trim().startsWith('|')) {
      if (line.trim() === '') header = header === null ? null : header;
      continue;
    }
    if (TABLE_SEPARATOR.test(line.trim())) continue;
    if (header === null || TABLE_SEPARATOR.test(lines[lineIndex + 1]?.trim() ?? '')) {
      header = cells(line);
      checkEvidenceHeaders(header, ledgerPath);
      continue;
    }
    const row = cells(line);
    if (row.length > header.length) throw new Error(`${ledgerPath}: extra unheaded evidence cells`);
    const source = row[sourceColumn(header, ledgerPath)] ?? '';
    const claim = row[claimColumn(header)] ?? '';
    rows.set(slug, (rows.get(slug) ?? 0) + 1);
    if (source === '') {
      unsourced.get(slug)?.push(claim);
    }
    const fields = evidenceFields(header, row);
    const noteIndex = noteColumn(header);
    const note = noteIndex === -1 ? '' : (row[noteIndex] ?? '');
    const verdictIndex = verdictColumn(header);
    const verdict = row[verdictIndex] ?? '';
    const binding = row[header.findIndex((name) => name.toLowerCase() === 'evidence plan')] ?? '';
    if (binding && seenBindings.has(binding)) throw new Error(`${ledgerPath}: duplicate evidence plan binding ${binding}`);
    if (binding) seenBindings.add(binding);
    const plan = localPlans.find((candidate) =>
      candidate.articleSlug === slug && candidate.rowOrdinal === rows.get(slug));
    const typedPlan = typedPlans.find(p => p.ledgerPath === ledgerPath &&
      p.articleSlug === slug && p.rowOrdinal === rows.get(slug));
    let localBasis: LocalBasisResult | undefined;
    let compound: CompoundResult | undefined;
    let evidenceFailures: string[];
    if (typedPlan && localContext) {
      usedPlans.add(typedPlan.id);
      localBasis = validateLocalBasisPlan(typedPlan, { claim, sourceChecked: source, verdict, note },
        binding, fields, registryIds, localContext);
      evidenceFailures = [...localBasis.failures];
      if (P1_BATCH.test(claim)) evidenceFailures.push('P1 batch cannot use typed local evidence');
    } else if (plan) {
      usedPlans.add(plan.id);
      compound = compoundEvidence(plan, { claim, sourceChecked: source, verdict, note },
        binding, fields, registryIds, context.articleCitations?.[slug]);
      evidenceFailures = [...compound.structuralFailures, ...compound.adjudicationFailures];
    } else if (binding || P1_BATCH.test(claim)) {
      evidenceFailures = ['compound Evidence plan is missing; scalar evidence cannot certify this batch'];
    } else {
      evidenceFailures = claimEvidence(fields, registryIds);
    }
    if (!typedPlan && evidenceFailures.length === 0 &&
      Object.hasOwn(LOCAL_BASIS_REQUIRED_TARGETS, `${ledgerPath}:${slug}:${rows.get(slug)}`)) {
      evidenceFailures.push('typed local evidence required for this closed local obligation; scalar/legacy fallback forbidden');
    }
    if (claim === '') evidenceFailures.push('Claim text must not be empty');
    if (evidenceFailures.length > 0) {
      unevidenced.get(slug)?.push({ claim, source });
    } else {
      const counts = evidenceKinds.get(slug)!;
      for (const kind of localBasis ? [localBasis.kind] : ['citation-id', 'locator', 'passage']) {
        counts[kind] = (counts[kind] ?? 0) + 1;
      }
    }
    const outcome = classifyVerdict(verdict, { source, note });
    records.get(slug)?.push({
      claim, line: lineIndex + 1, verdict, outcome, ...fields, evidenceFailures,
      sourceChecked: source, note, ...(compound ? { compound } : {}), ...(localBasis ? { localBasis } : {}),
      legacyPointer: legacyEvidencePointer([source, claim, note].join(' ~ '), registryIds),
    });
    // The verdict, which nothing used to read. The reconciliation counted
    // a row that says "UNRESOLVED - could not check" exactly as it counted
    // a row that says "verified", so unresolved work was reported as
    // completed coverage by the gate that was supposed to prove it.
    if (verdictIndex === -1) {
      unverdicted.get(slug)?.push(claim);
      continue;
    }
    if (verdict.replace(/\*+/g, '').trim() === '') {
      unverdicted.get(slug)?.push(claim);
      continue;
    }
    switch (outcome) {
      case 'passing':
        break;
      case 'recorded-inconsistency':
        recorded.set(slug, (recorded.get(slug) ?? 0) + 1);
        break;
      default:
        unresolved.get(slug)?.push({ claim, verdict });
    }
  }

  for (const plan of [...localPlans, ...typedPlans.filter(p => p.ledgerPath === ledgerPath)]) {
    if (!usedPlans.has(plan.id)) throw new Error(`${ledgerPath}: unbound compound plan ${plan.id}`);
  }
  const sections: LedgerSection[] = order.map((articleSlug) => ({
    slug: articleSlug,
    ledgerPath,
    claimRows: rows.get(articleSlug) ?? 0,
    unsourcedRows: unsourced.get(articleSlug) ?? [],
    unresolvedRows: unresolved.get(articleSlug) ?? [],
    unverdictedRows: unverdicted.get(articleSlug) ?? [],
    recordedInconsistencyRows: recorded.get(articleSlug) ?? 0,
    unevidencedRows: unevidenced.get(articleSlug) ?? [],
    evidenceKinds: evidenceKinds.get(articleSlug) ?? {},
    claimRecords: records.get(articleSlug) ?? [],
    summaryFailures: [],
  }));
  const expected = ledgerSummary(sections);
  const summaries = [...markdown.matchAll(/<!-- audit-summary:start -->[\s\S]*?<!-- audit-summary:end -->/g)];
  const outsideSummary = markdown.replace(/<!-- audit-summary:start -->[\s\S]*?<!-- audit-summary:end -->/g, '');
  const competingSummary = /^#{2,3}\s+(?!Historical:)[^\n]*\bsummary\b/im.test(outsideSummary);
  if (sections.length > 0 && (summaries.length !== 1 || summaries[0][0] !== expected || competingSummary)) {
    sections[0] = {
      ...sections[0],
      summaryFailures: [
        `${ledgerPath}: the current ledger summary is missing, duplicated, conflicts with an unlabelled legacy summary, or does not equal the parsed row outcomes; regenerate it without changing claim verdicts or evidence`,
      ],
    };
  }
  return sections;
}

/** Deterministic row-unit summary. Missing proof is separate from an auditor's verdict. */
export function ledgerSummary(sections: readonly LedgerSection[]): string {
  const records = sections.flatMap((section) => section.claimRecords);
  const head = (record: ClaimRecord) => record.verdict.replace(/\*+/g, '').trim().toLowerCase();
  const passing = records.filter((record) => record.outcome === 'passing');
  const corrected = passing.filter((record) => /^(?:c|corrected)\b/.test(head(record))).length;
  const cut = passing.filter((record) => /^cut\b/.test(head(record))).length;
  const incomplete = records.filter((record) => record.evidenceFailures.length > 0).length;
  return [
    '<!-- audit-summary:start -->',
    '## Current ledger summary',
    '',
    'Counting unit: parsed claim rows across all article sections, including continuations.',
    'Recorded verdicts are not proof of source verification. Incomplete evidence fails the audit.',
    '',
    `- Articles with records: ${sections.length}`,
    `- Claim rows: ${records.length}`,
    `- Recorded verified: ${passing.length - corrected - cut}`,
    `- Recorded corrected: ${corrected}`,
    `- Recorded cut: ${cut}`,
    `- Recorded source inconsistencies: ${records.filter((record) => record.outcome === 'recorded-inconsistency').length}`,
    `- Unresolved or unrecognised verdicts: ${records.filter((record) => ['unresolved', 'unrecognised'].includes(record.outcome)).length}`,
    `- Complete evidence records: ${records.length - incomplete}`,
    `- Incomplete evidence records: ${incomplete}`,
    '',
    '<!-- audit-summary:end -->',
  ].join('\n');
}

/** Update only accounting prose. Legacy claim rows and verdicts remain verbatim. */
export function withLedgerSummary(markdown: string, sections: readonly LedgerSection[]): string {
  if (!/^# [^\n]+\n/.test(markdown)) {
    throw new Error('the ledger needs a level-one title before inserting its summary');
  }
  const narrative = markdown
    .replace(/<!-- audit-summary:start -->[\s\S]*?<!-- audit-summary:end -->\n*/g, '')
    .replace(/^#{2,3}\s+(?!Historical:)([^\n]*(?:\bsummary\b|\baddendum\b)[^\n]*)$/gim,
      (heading, title: string) => `${heading.match(/^#+/)![0]} Historical: ${title}`);
  const titleEnd = narrative.indexOf('\n');
  if (titleEnd < 0) throw new Error('the ledger has no title and narrative to summarise');
  return `${narrative.slice(0, titleEnd)}\n\n${ledgerSummary(sections)}\n\n${narrative.slice(titleEnd + 1).trimStart()}`;
}

export interface ReconcileInput {
  readonly domain: string;
  readonly assertionId: string | null;
  readonly ledgerPath: string;
  readonly published: readonly string[];
  readonly sections: readonly LedgerSection[];
}

/** Reconcile one domain's published population against its ledger. */
export function reconcileDomain(input: ReconcileInput): DomainCoverage {
  const { domain, assertionId, ledgerPath, published, sections } = input;
  const failures: CoverageFailure[] = [];
  const audited = new Set(sections.map((section) => section.slug));

  if (published.length === 0 || audited.size === 0) {
    failures.push({
      kind: 'empty-population',
      domain,
      message: `${domain}: population is empty (${published.length} published, ${audited.size} audited); an empty set satisfies every property, so it fails closed`,
    });
  }

  for (const slug of published) {
    if (!audited.has(slug)) {
      failures.push({
        kind: 'unaudited-published-article',
        domain,
        message: `${domain}: published article \`${slug}\` has no section in ${ledgerPath}`,
      });
    }
  }

  const publishedSet = new Set(published);
  for (const section of sections) {
    for (const message of section.summaryFailures) {
      failures.push({ kind: 'ledger-summary-mismatch', domain, message });
    }
    if (!publishedSet.has(section.slug)) {
      failures.push({
        kind: 'audited-unpublished-article',
        domain,
        message: `${domain}: ${ledgerPath} audits \`${section.slug}\`, which the registry does not publish`,
      });
      continue;
    }
    if (section.claimRows === 0) {
      failures.push({
        kind: 'vacuous-section',
        domain,
        message: `${domain}: \`${section.slug}\` has a heading in ${ledgerPath} but no checked claim`,
      });
    }
    for (const claim of section.unsourcedRows) {
      failures.push({
        kind: 'unsourced-claim',
        domain,
        message: `${domain}: \`${section.slug}\` records a claim with no source checked: "${claim}"`,
      });
    }
    for (const { claim, source } of section.unevidencedRows) {
      const record = section.claimRecords.find((row) =>
        row.claim === claim && row.sourceChecked === source);
      const compoundFailure = record?.compound || record?.localBasis ||
        record?.evidenceFailures.some((failure) => failure.startsWith('compound'));
      failures.push({
        kind: 'unevidenced-claim',
        domain,
        message: compoundFailure
          ? `${domain}: \`${section.slug}\` compound claim "${claim.slice(0, 90)}" fails: ${record!.evidenceFailures.join('; ')}`
          : `${domain}: \`${section.slug}\` records "${source.slice(0, 60)}" as the source for "${claim.slice(0, 90)}", but lacks a complete per-claim Citation ID, Source URL fetched, or Supporting passage; a token elsewhere in the row is not evidence`,
      });
    }
    for (const { claim, verdict } of section.unresolvedRows) {
      failures.push({
        kind: 'unresolved-claim',
        domain,
        message: `${domain}: \`${section.slug}\` records verdict "${verdict.slice(0, 60)}" for "${claim.slice(0, 90)}"; contract/content-audit.md requires a claim the validator could not check to be reported as a failure, not skipped`,
      });
    }
    for (const claim of section.unverdictedRows) {
      failures.push({
        kind: 'unverdicted-claim',
        domain,
        message: `${domain}: \`${section.slug}\` records a claim in a table with no verdict column, so its outcome is unstated: "${claim.slice(0, 90)}"`,
      });
    }
  }

  return {
    domain,
    assertionId,
    ledgerPath,
    publishedCount: published.length,
    auditedCount: audited.size,
    claimRows: sections.reduce((total, s) => total + s.claimRows, 0),
    evidenceKinds: sections.reduce<Record<string, number>>((totals, section) => {
      for (const [kind, count] of Object.entries(section.evidenceKinds)) {
        totals[kind] = (totals[kind] ?? 0) + count;
      }
      return totals;
    }, {}),
    failures,
  };
}

/**
 * Each field must occur on EVERY claim, not somewhere in the corpus.
 */
const REQUIRED_EVIDENCE_KINDS = ['citation-id', 'locator', 'passage'] as const;

export function summarise(
  coverage: readonly DomainCoverage[],
): CoverageSummary {
  const evidenceKinds: Record<string, number> = {};
  for (const domain of coverage) {
    for (const [kind, count] of Object.entries(domain.evidenceKinds)) {
      evidenceKinds[kind] = (evidenceKinds[kind] ?? 0) + count;
    }
  }
  const failures = [...coverage.flatMap((domain) => domain.failures)];
  for (const kind of REQUIRED_EVIDENCE_KINDS) {
    const claimRows = coverage.reduce((total, domain) => total + domain.claimRows, 0);
    const localRows = (evidenceKinds['authored-local'] ?? 0) + (evidenceKinds['mixed-local'] ?? 0);
    if (claimRows === 0 || (evidenceKinds[kind] ?? 0) + localRows !== claimRows) {
      failures.push({
        kind: 'unevidenced-claim',
        domain: 'all',
        message: localRows === 0
          ? `${evidenceKinds[kind] ?? 0}/${claimRows} claim rows carry complete ${kind} evidence; every claim requires all three fields`
          : `${(evidenceKinds[kind] ?? 0) + localRows}/${claimRows} rows carry complete ${kind} or fully adjudicated typed-local evidence`,
      });
    }
  }
  return {
    ok: failures.length === 0 && coverage.length > 0,
    publishedCount: coverage.reduce((n, d) => n + d.publishedCount, 0),
    auditedCount: coverage.reduce((n, d) => n + d.auditedCount, 0),
    claimRows: coverage.reduce((n, d) => n + d.claimRows, 0),
    evidenceKinds,
    failures,
  };
}
