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
 * The registry of default texts lives here, not in the components, because
 * the gate runs under Node (prebuild, no bundler) and the components build
 * their live descriptions from props and state at render time. Keep a
 * component's entry text in sync with its default render; VAL-EDU-023/024
 * e2e checks compare the rendered DOM against the chart itself, so a
 * drifting registry entry is caught downstream even though this gate
 * cannot see the DOM.
 *
 * Exits non-zero on any finding. Proved by mutation in the feature
 * handoff: removed description, banned opener, one-digit description and
 * a digit-normalised duplicate each fail the gate naming the component,
 * and the restored tree passes.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  validateChartDescriptionCoverage,
  validateChartDescriptions,
  type ChartDescriptionEntry,
  type ChartMountCount,
} from '../lib/chart-description-rules.ts';

/**
 * Default-state takeaways at each chart's default configuration, exactly
 * as the component renders them (verified in a browser; see the feature
 * handoff). The text is also asserted against the rendered DOM by the
 * chart-descriptions e2e spec, which is what keeps this registry honest.
 */
export const CHART_DESCRIPTIONS: ChartDescriptionEntry[] = [
  {
    component: 'ReliabilityCompounding',
    file: 'components/interactive/reliability-compounding.tsx',
    quantityNames: ['episode success', 'steps'],
    text: 'At 95.0 percent per-step success, episode success is 21.5% at 30 steps and 0.6% at the 100-step end of the plotted range, crossing 50 percent at 14 steps as the per-step odds compound over the episode length.',
  },
  {
    component: 'EgoScaleScaling',
    file: 'components/interactive/egoscale-scaling.tsx',
    quantityNames: ['loss', 'hours'],
    text: 'Validation loss falls from 0.0240 at 1k hours to 0.0150 at 20k hours, the end of the measured range, while task completion rises from 0.30 to 0.71; past that boundary the dashed extrapolation to the 100k h horizon reads 0.0102 if the law holds against 0.0150 at the plateau, the shaded scenario band between them is a scenario bracket and not a confidence interval, the completion fit stays below the 90 percent solved bar until 111k hours, and it exceeds 100 percent past 250k hours, which the chart flags instead of drawing.',
  },
  {
    component: 'DataScaleChart',
    file: 'components/interactive/data-scale-chart.tsx',
    quantityNames: ['hours', 'tokens'],
    text: 'Demonstration hours span 350 h (DROID) to 20,854 h (EgoScale) across 7 robot and human datasets, while pretraining tokens span 300B (GPT-3) to 15T (Llama 3), 9 orders of magnitude apart with no honest hour-to-token exchange rate between the lanes; your 15-rig farm at the dedicated farm rate projects 15,000 h per year, reaching OXE scale in 8 mo and 100x OXE in 66.7 yr.',
  },
  {
    component: 'GaitDiagram',
    file: 'components/interactive/gait-diagram.tsx',
    quantityNames: ['feet', 'duty'],
    text: 'In the walk, always 3 feet down at duty factor 0.75, and the footfall offsets around the cycle are (LH at 0%, LF at 25%, RH at 50%, RF at 75%); at the current phase of 0% the feet down are RF + LH + RH.',
  },
  {
    component: 'TrainingTimeChart',
    file: 'components/interactive/training-time-chart.tsx',
    quantityNames: ['wall-clock', 'envs'],
    text: 'Wall-clock to the target reward falls steeply from 3.6 h at 64 envs to 4.0 min at the current 4,096 envs, then flattens toward 1.5 min at 16,384: the knee sits near 1,024 envs where simulation overtakes the fixed per-iteration costs, and the Rudin flat-terrain measurement (under 4 min) sits at 4,096 envs.',
  },
  {
    component: 'ControlLoopBudget',
    file: 'components/interactive/control-loop-budget.tsx',
    quantityNames: ['inference', 'ms'],
    text: 'A 3.0B-parameter model takes 52.6 ms of inference against the 20 ms budget of a 50 Hz loop, missing 2 deadlines and running at 19 Hz; inference stays under budget only below about 1.1B parameters, and beyond the pi0 3B and pi0-L 9.1B measured anchors the scaling is modeled rather than measured.',
  },
];

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
