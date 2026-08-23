/**
 * Deterministic converter: research/04-market-map-companies.json →
 * data/companies.ts.
 *
 * The research file is the source of truth. This script copies every field
 * (including `aka`, which the visualization feature needs for expanded
 * cards) with stable key order and a module-scope Zod parse so an invalid
 * row fails the build. Do not hand-edit the generated file.
 *
 *   node scripts/generate-companies.ts
 *   npm run generate:companies
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { companySchema, type Company } from '../data/schemas/company.ts';

const root = join(import.meta.dirname, '..');
const SOURCE = join(root, 'research', '04-market-map-companies.json');
const DEST = join(root, 'data', 'companies.ts');

const COMPANY_KEYS = [
  'id',
  'name',
  'aka',
  'website',
  'logo',
  'hq',
  'founded',
  'segment',
  'subSegment',
  'description',
  'approach',
  'totalRaisedUsd',
  'latestRound',
  'status',
  'deployments',
  'openSource',
  'sources',
  'confidence',
] as const;

const HQ_KEYS = ['city', 'country'] as const;
const ROUND_KEYS = [
  'type',
  'amountUsd',
  'date',
  'valuationUsd',
  'leadInvestors',
  'sourceUrl',
] as const;
const SOURCE_KEYS = ['url', 'title', 'asOf'] as const;

function fail(message: string): never {
  console.error(`generate:companies: FAILED — ${message}`);
  process.exit(1);
}

function indent(level: number): string {
  return '  '.repeat(level);
}

function emitString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function emitPrimitive(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return emitString(value);
  return String(value);
}

function emitArray(values: readonly unknown[], level: number): string {
  if (values.length === 0) return '[]';
  const inner = values
    .map((item) => `${indent(level + 1)}${emitValue(item, level + 1)}`)
    .join(',\n');
  return `[\n${inner},\n${indent(level)}]`;
}

function emitObject(
  record: Record<string, unknown>,
  keys: readonly string[],
  level: number,
  optionalKeys: readonly string[] = [],
): string {
  const lines = keys.flatMap((key) => {
    if (!(key in record)) {
      if (optionalKeys.includes(key)) return [];
      fail(`missing key "${key}" on object at indent ${level}`);
    }
    return [
      `${indent(level + 1)}${key}: ${emitValue(record[key], level + 1)},`,
    ];
  });
  return `{\n${lines.join('\n')}\n${indent(level)}}`;
}

function emitValue(value: unknown, level: number): string {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return emitPrimitive(value);
  }
  if (Array.isArray(value)) {
    if (value.every((item) => item && typeof item === 'object' && 'url' in item)) {
      return emitArrayOfObjects(value as Array<Record<string, unknown>>, SOURCE_KEYS, level);
    }
    return emitArray(value, level);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('city' in record && 'country' in record) {
      return emitObject(record, HQ_KEYS, level);
    }
    if ('amountUsd' in record && 'leadInvestors' in record) {
      return emitObject(record, ROUND_KEYS, level, ['sourceUrl']);
    }
    if ('url' in record && 'asOf' in record) {
      return emitObject(record, SOURCE_KEYS, level);
    }
    fail(`unrecognised object shape: ${Object.keys(record).join(',')}`);
  }
  fail(`unsupported value type: ${typeof value}`);
}

function emitArrayOfObjects(
  values: Array<Record<string, unknown>>,
  keys: readonly string[],
  level: number,
): string {
  if (values.length === 0) return '[]';
  const inner = values
    .map((item) => `${indent(level + 1)}${emitObject(item, keys, level + 1)}`)
    .join(',\n');
  return `[\n${inner},\n${indent(level)}]`;
}

function emitCompany(company: Company, level: number): string {
  return emitObject(company as unknown as Record<string, unknown>, COMPANY_KEYS, level);
}

const raw = JSON.parse(readFileSync(SOURCE, 'utf8')) as unknown;
if (!Array.isArray(raw)) fail('research source is not an array');

const parsed = companySchema.array().safeParse(raw);
if (!parsed.success) {
  const sample = parsed.error.issues
    .slice(0, 12)
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  fail(`research JSON failed companySchema (${parsed.error.issues.length} issue(s))\n${sample}`);
}

const companies = parsed.data;
if (companies.length !== 111) {
  fail(`expected 111 companies, got ${companies.length}`); // 111 since the 2026-08-18 audit removed the duplicate galaxea-ai-robot row
}

const body = companies
  .map((company) => `${indent(1)}${emitCompany(company, 1)}`)
  .join(',\n');

const file = `/**
 * Market-map company data. Generated from
 * research/04-market-map-companies.json by scripts/generate-companies.ts.
 *
 * Do not edit by hand. Regenerate with \`npm run generate:companies\`.
 *
 * \`aka\` is carried through from the research source (expanded cards
 * need it). \`website\` is the official homepage when known, else null.
 * \`logo\` is an image-registry id or null. Unknown funding stays null;
 * never invent a number. Conflicting tracker figures stay as the snapshot
 * value plus their sources, rather than being averaged or silently
 * replaced.
 *
 * Parsed at module scope so an invalid row fails \`next build\`.
 */
import { z } from 'zod';
import { companySchema, type Company } from './schemas/company.ts';

export type { Company } from './schemas/company.ts';

const ROWS: Company[] = [
${body},
];

/** Zod-validated rows; an invalid entry throws at import time. */
export const COMPANIES: Company[] = z.array(companySchema).parse(ROWS);
`;

writeFileSync(DEST, file);
console.log(
  `generate:companies: wrote ${companies.length} rows to data/companies.ts`,
);
