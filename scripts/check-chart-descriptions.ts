/**
 * Chart-description enforcement gate (VAL-EDU-026).
 *
 * Wired into validate:content beside the existing checkers. Two halves:
 *
 * 1. Wiring check: every component file in the registry below must import
 *    ChartDescription from the primitive and render it. A retrofitted
 *    chart whose description was deleted fails here, naming the file.
 *
 * 2. Rule check: the authored default-state takeaway for every registered
 *    chart must pass the four mechanical rules in
 *    lib/chart-description-rules.ts (two digit-bearing tokens, both plotted
 *    quantity names, no banned opener, cross-chart uniqueness after digit
 *    normalisation).
 *
 * The registry of default texts lives in lib/chart-descriptions.ts (not in
 * the components, because the gate runs under Node, prebuild, no bundler,
 * while the components build their live descriptions from props and state
 * at render time). The registry is compared against the rendered DOM by
 * tests/e2e/chart-description-registry.spec.ts: it loads every entry's
 * route from the static export and asserts the registry text equals the
 * rendered DEFAULT-state description innerText, with the population
 * derived from the registry itself (all entries, never a hand-maintained
 * route subset). That backstop pins the DEFAULT state only; per-state
 * truth comes from deriving the varying clause at render time inside the
 * component, which this Node gate cannot see.
 *
 * Exits non-zero on any finding. Proved by mutation in the feature
 * handoff: removed description, banned opener, one-digit description and
 * a digit-normalised duplicate each fail the gate naming the component,
 * and the restored tree passes.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { CHART_DESCRIPTIONS } from '../lib/chart-descriptions.ts';
import {
  validateChartDescriptionCoverage,
  validateChartDescriptions,
  type ChartMountCount,
} from '../lib/chart-description-rules.ts';


const ruleProblems = validateChartDescriptions(CHART_DESCRIPTIONS);

const root = join(import.meta.dirname, '..');

/**
 * The primitive's own definition and the barrel that re-exports it are not
 * mounts; every other component file that renders `<ChartDescription>` is
 * part of the population whether or not anyone remembered to register it.
 */
const NON_MOUNT_FILES = new Set([
  'components/ui/chart-description.tsx',
  'components/ui/index.ts',
]);

/**
 * Word-boundary JSX check: "<ChartDescription" followed by whitespace, ">"
 * or "/>", so a renamed tag like <ChartDescriptionDisabled> does not
 * satisfy the sweep (the primitive feature's mutation proof caught exactly
 * that hole).
 */
const MOUNT_PATTERN = /<ChartDescription(?=[\s>/])/g;

function sweepMounts(dir: string): ChartMountCount[] {
  const found: ChartMountCount[] = [];
  const walk = (absolute: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = join(absolute, entry.name);
      if (entry.isDirectory()) {
        walk(child);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;
      const file = relative(root, child).split(sep).join('/');
      if (NON_MOUNT_FILES.has(file)) continue;
      const mounts = (readFileSync(child, 'utf8').match(MOUNT_PATTERN) ?? [])
        .length;
      if (mounts > 0) found.push({ file, mounts });
    }
  };
  walk(dir);
  return found.sort((a, b) => a.file.localeCompare(b.file));
}

const mounts = sweepMounts(join(root, 'components'));

// Coverage check over the DERIVED population: an unregistered mount is a
// loud failure naming its file, and a registered file that lost its mount
// (the VAL-EDU-026(a) deleted-description mutation) fails the same way.
const coverageProblems = validateChartDescriptionCoverage(
  mounts,
  CHART_DESCRIPTIONS,
);

// Registered files must still exist; a stale path would otherwise report
// only as "renders no mount", which reads as a deleted description rather
// than a moved file.
const missingFiles = CHART_DESCRIPTIONS.filter(
  (entry) => !existsSync(join(root, entry.file)),
).map((entry) => ({
  component: entry.component,
  message: `${entry.file} does not exist`,
}));

const problems = [...ruleProblems, ...coverageProblems, ...missingFiles];
if (problems.length > 0) {
  console.error(`chart-descriptions: FAILED (${problems.length} finding(s))`);
  for (const p of problems) console.error(`  ${p.component}: ${p.message}`);
  process.exit(1);
}
const mountTotal = mounts.reduce((sum, m) => sum + m.mounts, 0);
console.log(
  `chart-descriptions: OK (${mountTotal} <ChartDescription> mount(s) swept from ${mounts.length} component file(s); all covered by ${CHART_DESCRIPTIONS.length} registered description(s) passing the five rules)`,
);
