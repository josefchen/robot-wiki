/**
 * Robot safety standards and EU rules by date, each date from its own
 * primary record (read 2026-10-26 and 2026-10-27):
 *
 * - ISO 10218-1:2025 and ISO 10218-2:2025: ISO catalogue life cycle,
 *   "60.60 2025-02-05 International Standard published" on both pages.
 * - ANSI/A3 R15.06-2025: A3 store, "Published with all three parts on
 *   October 29, 2025" (parts 1 and 2 approved August 21, part 3 October 7).
 * - ISO/CD 25785-1: ISO catalogue, "30.60 2026-07-08 Close of comment
 *   period"; the later stages (30.92, 30.99, 40.00) carry no date.
 * - Regulation (EU) 2023/1230: Article 54 as corrected (OJ L 169,
 *   4.7.2023: "for '14 January 2027', read '20 January 2027'"); Annex I
 *   Part A item 5 lists "Safety components with fully or partially
 *   self-evolving behaviour using machine learning approaches ensuring
 *   safety functions".
 * - AI Act: the Commission's policy page, "rules for high-risk AI systems
 *   embedded into regulated products (Annex I) have an extended transition
 *   period until 2 August 2028".
 *
 * Standards are dated by publication, the humanoid draft by the close of
 * its comment period, and the two EU laws by the day they apply.
 */

export interface SafetyRule {
  id: string;
  /** The stage label: what the rule is. */
  label: string;
  /** The table's row name. */
  row: string;
  /** What happened on the date. */
  event: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** The date in words, as the table and description print it. */
  dateText: string;
  citationIds: readonly string[];
}

export const MACHINERY_RULE_ID = 'eu-machinery-regulation';
export const HUMANOID_DRAFT_ID = 'iso-25785-1';
export const AI_ACT_ID = 'eu-ai-act';

export const SAFETY_RULES: readonly SafetyRule[] = [
  {
    id: 'iso-10218',
    label: 'ISO 10218 robot safety standard, parts 1 and 2',
    row: 'ISO 10218-1:2025 and ISO 10218-2:2025',
    event: 'published',
    date: '2025-02-05',
    dateText: '5 February 2025',
    citationIds: ['iso-10218-1-2025', 'iso-10218-2-2025'],
  },
  {
    id: 'r15-06',
    label: 'US adoption, ANSI/A3 R15.06-2025, three parts',
    row: 'ANSI/A3 R15.06-2025, parts 1 to 3',
    event: 'published',
    date: '2025-10-29',
    dateText: '29 October 2025',
    citationIds: ['a3-r1506-2025-store'],
  },
  {
    id: HUMANOID_DRAFT_ID,
    label: 'Humanoid draft ISO/CD 25785-1',
    row: 'ISO/CD 25785-1, the humanoid draft',
    event: 'comment period closed; next stage not dated',
    date: '2026-07-08',
    dateText: '8 July 2026',
    citationIds: ['iso-cd-25785-1'],
  },
  {
    id: MACHINERY_RULE_ID,
    label: 'EU Machinery Regulation, learned safety parts',
    row: 'EU Machinery Regulation 2023/1230',
    event: 'applies',
    date: '2027-01-20',
    dateText: '20 January 2027',
    citationIds: ['eu-machinery-regulation-2023'],
  },
  {
    id: AI_ACT_ID,
    label: 'EU AI Act, high-risk AI in regulated products',
    row: 'EU AI Act, high-risk AI in Annex I products',
    event: 'applies',
    date: '2028-08-02',
    dateText: '2 August 2028',
    citationIds: ['eu-ai-act-framework-2026'],
  },
];

export const SAFETY_RULE_SOURCES: readonly string[] = [
  ...new Set(SAFETY_RULES.flatMap((rule) => rule.citationIds)),
];

/** The date as a fractional year, for placing it on the time axis. */
export function fractionalYear(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const start = Date.UTC(y, 0, 1);
  const next = Date.UTC(y + 1, 0, 1);
  return y + (Date.UTC(y, m - 1, d) - start) / (next - start);
}

export function ruleOf(id: string): SafetyRule {
  const rule = SAFETY_RULES.find((r) => r.id === id);
  if (!rule) throw new Error(`safety-rules-timeline: no rule "${id}"`);
  return rule;
}
