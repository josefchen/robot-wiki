/**
 * Build-time validation for the data registries that Client Components
 * import.
 *
 * These registries used to parse themselves with zod at module scope. That
 * made every client surface rendering them (the comparison matrix, dataset
 * and teleop-rig tables, the thesis explorer, the milestones watchlist, the
 * policy-chunking table, structured search over methods and companies)
 * ship zod and the parse to the browser, only to re-validate constant,
 * already-typed rows on every page view. The rows now stay plain typed data, and the schemas run here, on
 * the server.
 *
 * Callers:
 * - the article template's generateStaticParams, so a malformed row fails
 *   `next build` (and therefore `npm run vercel-build`) exactly as the
 *   module-scope parse did;
 * - scripts/validate-content.ts, the prebuild content gate;
 * - tests/unit/registry-validation.test.ts.
 *
 * Beyond passing the schema, the parsed value must serialize identically to
 * the rows the widgets import: zod strips unknown keys and rebuilds objects
 * in schema key order, so a mismatch means the browser would render
 * something other than what was validated.
 *
 * Server and test code only: importing this module from a Client Component
 * would bring zod back into the browser bundle. Relative .ts imports so the
 * prebuild script can load it under plain node.
 */
import type { ZodType } from 'zod';
import { COMPANIES } from '../data/companies.ts';
import { DATASETS } from '../data/datasets.ts';
import { METHODS } from '../data/methods.ts';
import { TELEOP_RIGS } from '../data/teleop-rigs.ts';
import { companySchema } from '../data/schemas/company.ts';
import { datasetSchema } from '../data/schemas/dataset.ts';
import { methodSchema } from '../data/schemas/method.ts';
import { teleopRigSchema } from '../data/schemas/teleop-rig.ts';
import { MILESTONES } from './bear-case.ts';
import { milestonesSchema } from './bear-case-schema.ts';
import { THESES } from './competing-theses.ts';
import { thesesSchema } from './competing-theses-schema.ts';

type RegistryCheck = { name: string; rows: unknown; schema: ZodType };

const CLIENT_REGISTRIES: readonly RegistryCheck[] = [
  { name: 'data/methods.ts METHODS', rows: METHODS, schema: methodSchema.array() },
  { name: 'data/datasets.ts DATASETS', rows: DATASETS, schema: datasetSchema.array() },
  {
    name: 'data/teleop-rigs.ts TELEOP_RIGS',
    rows: TELEOP_RIGS,
    schema: teleopRigSchema.array(),
  },
  { name: 'lib/competing-theses.ts THESES', rows: THESES, schema: thesesSchema },
  {
    name: 'data/companies.ts COMPANIES',
    rows: COMPANIES,
    schema: companySchema.array(),
  },
  { name: 'lib/bear-case.ts MILESTONES', rows: MILESTONES, schema: milestonesSchema },
];

let validated = false;

/**
 * Parses every client-imported registry against its schema; throws naming
 * the registry on the first failure. Idempotent: the rows are constants, so
 * the work runs once per process.
 */
export function validateClientRegistries(): void {
  if (validated) return;
  for (const { name, rows, schema } of CLIENT_REGISTRIES) {
    const result = schema.safeParse(rows);
    if (!result.success) {
      throw new Error(`registry-validation: ${name} is invalid\n${result.error.message}`);
    }
    if (JSON.stringify(result.data) !== JSON.stringify(rows)) {
      throw new Error(
        `registry-validation: ${name} parses to a different value than the rows ` +
          'the widgets import (an undeclared key or a reordered object); make the ' +
          'row literal match its schema',
      );
    }
  }
  validated = true;
}
