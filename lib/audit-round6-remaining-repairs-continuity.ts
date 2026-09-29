/**
 * Exact successor reviews for six pinned files that the round-6 repairs of
 * 2026-09-29 changed. The citation chip now closes its hover popup when the
 * reader follows its jump link. Two industrial specs and the economics spec
 * follow the current article wording, the instrument-frame mount and the
 * hydration-safe slider helper. The world-model taxonomy description is short
 * enough for a search snippet, and the classical-closure suite has a 60-second
 * budget. A prior review, recorded run or the checker itself still names each
 * archived predecessor. The artifact reader admits the live file only as the
 * named exact edit list over that archive, after checking it against the
 * phrases the prior review requires, and hands every later check the archived
 * bytes. The checker revision is admitted the same way. No old review, run,
 * receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDataHardwareMotionReview } from './audit-data-hardware-motion-continuity.ts';

const directory = 'audit/evidence/motion-round6-remaining-repairs-20260929/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceDrift = 'round6 remaining repairs source continuity drift';
const checkerDrift = 'round6 remaining repairs checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name?: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string;
};
type SourceReview = Omit<Review, 'before' | 'after'> & {
  sources: { name: string; before: Artifact; after: Artifact }[];
};
/**
 * Where the archived bytes are still gated: the round-5 reader-pins review's
 * after endpoint, the recorded economics browser run, the data-hardware motion
 * review's current endpoint, the industrial-release dependency review's
 * current binding, or the checker's own reviewed test hash.
 */
type Prior = 'reader-pins' | 'economics-run' | 'data-hardware' | 'release-dependency' | 'checker';
type Repair = {
  name: string;
  path: string;
  snapshot: string;
  beforeBytes: number;
  beforeHash: string;
  afterBytes: number;
  afterHash: string;
  prior: Prior;
  edits: readonly (readonly [string, string])[];
  insertionOnly: boolean;
  /** The article body below the frontmatter must be byte-identical. */
  frontmatterOnly: boolean;
  /** Checks the prior records rely on; each must read exactly once before and after. */
  preserved: readonly string[];
};

function applyExact(
  before: string,
  edits: readonly (readonly [string, string])[],
  label: string,
): string {
  let expected = before;
  for (const [from, to] of edits) {
    const parts = expected.split(from);
    if (parts.length !== 2) throw new Error(label);
    // Joined rather than String#replace: a `$'` in the text would be read as
    // a replacement pattern.
    expected = parts.join(to);
  }
  return expected;
}

function reviewed(review: { schemaVersion: string; reviewedBy: string; rationale: string; observedAt: string },
  schemaVersion: string, label: string): void {
  if (review.schemaVersion !== schemaVersion || !review.reviewedBy || review.rationale.length <= 80 ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
    throw new Error(label);
  }
}

const repairs: readonly Repair[] = [
  {
    name: 'cite-jump-closes-hover',
    path: 'components/ui/cite.tsx',
    snapshot: `${directory}cite-before.tsx.txt`,
    beforeBytes: 11289,
    beforeHash: 'acc039e8d5913e5356bd2c00d989cfa29d9722470d5f0e2a6b17fe102d78e50a',
    afterBytes: 11563,
    afterHash: '96b9f9cd9dcc0eb9bf16246b9828879955bd8b53260679ea9381d95746709507',
    prior: 'reader-pins',
    edits: [[
      '            href={referenceHref}',
      [
        '            href={referenceHref}',
        '            onClick={() => {',
        '              // The jump scrolls the entry under the fixed popup, which a',
        '              // pending hover grace would otherwise keep over its title.',
        '              clearTimeout(leaveTimer.current);',
        '              setHovered(false);',
        '            }}',
      ].join('\n'),
    ]],
    insertionOnly: true,
    frontmatterOnly: false,
    preserved: [],
  },
  {
    name: 'citation-refresh-current-wording',
    path: 'tests/e2e/industrial-citation-refresh.spec.ts',
    snapshot: `${directory}industrial-citation-refresh-spec-before.ts.txt`,
    beforeBytes: 7755,
    beforeHash: '95600b9dab16e74280ccd31ef3ae25f0b8374c95c9e37fe8a870000488598777',
    afterBytes: 7769,
    afterHash: '2299b9b4fe4d46fb12981693d5f3212b8f1c61484a72527d8140027b65ab9be5',
    prior: 'reader-pins',
    edits: [
      [
        "    await expect(page.locator('#main-content')).toContainText('not a measured intervention rate');",
        "    await expect(page.locator('#main-content')).toContainText('no measured intervention rate behind it');",
      ],
      [
        "    checkedText.push('not a measured intervention rate', 'no published success rate');",
        "    checkedText.push('no measured intervention rate behind it', 'no published success rate');",
      ],
    ],
    insertionOnly: false,
    frontmatterOnly: false,
    preserved: [
      '      await expect(tooltip).toContainText(canonical!.definition);',
      "    for (const value of ['4,663,698', '542,076', '54%']) {",
      "    await expect(page.locator('#main-content')).toContainText('no published success rate');",
      "  const dashboardLinkStatus = (await page.request.get('/frontier/reliability-gap/')).status();",
      '  expect(dashboardLinkStatus).toBe(200); expect(errors).toEqual([]);',
    ],
  },
  {
    name: 'economics-instrument-frame',
    path: 'tests/e2e/economics-release-evidence.spec.ts',
    snapshot: `${directory}economics-release-evidence-spec-before.ts.txt`,
    beforeBytes: 6921,
    beforeHash: '08a18673e6d717979eab85b3eb5f5b637d80dd1c8c042f4785630b12118daf70',
    afterBytes: 6952,
    afterHash: '0ec2a0eae15a7507aec8b53cd9a48a213fbeeede42be3a73ab33cbffcb03ae5e',
    prior: 'economics-run',
    edits: [
      [
        "  const mount = page.locator('div.prose > div.rounded-md:has([data-testid=\"payback-months\"])');",
        "  const mount = page.locator('div.prose > [data-brand-module-signature=\"instrument-frame\"]:has([data-testid=\"payback-months\"])');",
      ],
      [
        "    await expect(page.locator('p').filter({ hasText: /^This calculator is an authored worked example/ })).toContainText('not a sourced arm-price quote');",
        "    await expect(page.locator('p').filter({ hasText: /^This calculator is an authored worked example/ })).toContainText('no sourced arm-price quote');",
      ],
    ],
    insertionOnly: false,
    frontmatterOnly: false,
    preserved: [
      "    await expect(slider.locator('xpath=following-sibling::p')).toContainText('not a sourced arm-price quote');",
      "    await expect(mount).not.toContainText('$25k-$80k');",
      '      await expect(mount.getByTestId(id)).toHaveText(o.display[i]);',
      "    await expect(mount.getByTestId('payback-verdict')).toHaveText(o.paysBack ? 'Pays back inside 24 months' : 'Outside a 24-month horizon');",
      "    await expect(page.locator('p').filter({ hasText: 'The calculator above reports capital cost per modeled pick' })).toContainText('It does not include running costs.');",
      '  expect(errors).toEqual([]);',
    ],
  },
  {
    name: 'industrial-deployment-hydrated-slider',
    path: 'tests/e2e/industrial-deployment.spec.ts',
    snapshot: `${directory}industrial-deployment-spec-before.ts.txt`,
    beforeBytes: 19972,
    beforeHash: '8e6864787ba4df19332ce4c08d08c475e68b7999f701f367b9b0c607bd05720d',
    afterBytes: 20004,
    afterHash: '7dd10d5236af121c4d612064030943a2123d454c28dc6fb9d0f8f6e2645f4c8b',
    prior: 'data-hardware',
    edits: [[
      "import { setSlider } from './slider';",
      "import { setHydratedSlider as setSlider } from './interaction-ready';",
    ]],
    insertionOnly: false,
    frontmatterOnly: false,
    preserved: [],
  },
  {
    name: 'taxonomy-search-description',
    path: 'content/world-models/taxonomy.mdx',
    snapshot: `${directory}taxonomy-before.mdx`,
    beforeBytes: 14704,
    beforeHash: '05b9c7e4aab79c6111146e3d7e894a9ce791f306e47e4d709a6b1b5b4cc8f793',
    afterBytes: 14625,
    afterHash: '5001d094d742e151f4226a370f945a6629633b213b5497ab42dbcf80d7d511c0',
    prior: 'release-dependency',
    edits: [[
      'description: "An editorial comparison of six world-model example groups: what they predict, in what representation, and for what purpose. The survey-defined functional criterion is decision-relevant prediction, not visual plausibility alone."',
      'description: "A world model predicts how an environment evolves in a form useful for a robot\'s decisions. Six example groups compared, from DreamerV3 to V-JEPA 2."',
    ]],
    insertionOnly: false,
    frontmatterOnly: true,
    preserved: [],
  },
  {
    name: 'classical-closure-suite-budget',
    path: 'tests/unit/classical-closure-evidence.test.ts',
    snapshot: `${directory}classical-closure-evidence-before.test.ts.txt`,
    beforeBytes: 16267,
    beforeHash: '42cfb7e1f3f5d73652d11fe6950188dde4aeb1d7928cc0100f1d223c70ec6a38',
    afterBytes: 16288,
    afterHash: 'cf53d3e938e03ddeef8028aa289edecaee34eb30e5a943756fad8d3bf35b4eb9',
    prior: 'checker',
    edits: [[
      "describe('classical closure native evidence and preservation', () => {",
      "describe('classical closure native evidence and preservation', { timeout: 60_000 }, () => {",
    ]],
    insertionOnly: false,
    frontmatterOnly: false,
    preserved: [],
  },
];

const checkerBefore = {
  path: `${directory}audit-local-basis-before.ts.txt`,
  bytes: 113858,
  sha256: '647d182bb6090f369f13a9a7076f2b6fad242f09ff0886d08c40b51fe01043e0',
};

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const assertions = (source: string) => source.split('\n').filter((line) => line.includes('expect(')).length;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const testHashLine = (sha256: string) => `    currentTestHash: '${sha256}',\n`;
const suite = repairs.find((repair) => repair.prior === 'checker')!;

function readJson<T>(root: string, path: string): T {
  return JSON.parse(readFileSync(join(root, path), 'utf8')) as T;
}

/**
 * Confirm that the prior record still names the archived bytes and return the
 * phrases it requires present in, and absent from, the live file.
 */
function priorRequirements(root: string, repair: Repair): { present: string[]; absent: string[] } {
  const endpoint = (artifact: Artifact | undefined) =>
    same(artifact, repair.path, repair.beforeBytes, repair.beforeHash);
  if (repair.prior === 'reader-pins') {
    const pins = readJson<SourceReview>(root, 'audit/evidence/motion-round5-reader-pins-20260929/source-transition.json');
    const pin = pins.sources?.filter((source) => source.after?.path === repair.path) ?? [];
    if (pin.length !== 1 || !endpoint(pin[0].after)) throw new Error(sourceDrift);
    return { present: [], absent: [] };
  }
  if (repair.prior === 'economics-run') {
    const run = readJson<{ test?: Artifact }>(root, 'audit/evidence/economics-release-20260923/browser-run.json');
    if (!endpoint(run.test)) throw new Error(sourceDrift);
    return { present: [], absent: [] };
  }
  if (repair.prior === 'data-hardware') {
    const entry = loadDataHardwareMotionReview(root).entries
      .filter((candidate) => candidate.current.path === repair.path);
    if (entry.length !== 1 || !endpoint(entry[0].current)) throw new Error(sourceDrift);
    return { present: entry[0].requiredPresent, absent: entry[0].requiredAbsent };
  }
  if (repair.prior === 'release-dependency') {
    const dependencies = readJson<{ bindings: { current?: Artifact; preservedText?: string[] }[] }>(root,
      'audit/evidence/industrial-release-20260924/dependency-review.json');
    const binding = dependencies.bindings.filter((candidate) => candidate.current?.path === repair.path);
    if (binding.length !== 1 || !endpoint(binding[0].current) || !binding[0].preservedText?.length) {
      throw new Error(sourceDrift);
    }
    return { present: binding[0].preservedText, absent: [] };
  }
  const checker = readFileSync(join(root, checkerBefore.path));
  if (checker.length !== checkerBefore.bytes || digest(checker) !== checkerBefore.sha256 ||
    checker.toString().split(testHashLine(repair.beforeHash)).length !== 2) {
    throw new Error(sourceDrift);
  }
  return { present: [], absent: [] };
}

/**
 * Verify one named repair as the exact edit list over its archive. Throws
 * unless every edit, preserved check and prior requirement holds.
 */
function verifiedRepair(root: string, repair: Repair, live: Buffer): Buffer {
  const review = readJson<SourceReview>(root, `${directory}source-transition.json`);
  reviewed(review, 'round6-remaining-repairs-source-continuity-v1', sourceDrift);
  const binding = review.sources?.find((source) => source.name === repair.name);
  const historical = readFileSync(join(root, repair.snapshot));
  const before = historical.toString();
  const current = live.toString();
  const prior = priorRequirements(root, repair);
  const head = frontmatter(before);
  if (review.name !== 'remaining-repairs' || review.sources?.length !== repairs.length ||
    !binding || !same(binding.before, repair.snapshot, repair.beforeBytes, repair.beforeHash) ||
    !same(binding.after, repair.path, repair.afterBytes, repair.afterHash) ||
    historical.length !== repair.beforeBytes || digest(historical) !== repair.beforeHash ||
    live.length !== repair.afterBytes || digest(live) !== repair.afterHash ||
    applyExact(before, repair.edits, sourceDrift) !== current ||
    (repair.insertionOnly && repair.edits.some(([from, to]) => !to.startsWith(`${from}\n`))) ||
    (repair.frontmatterOnly && (head === undefined || frontmatter(current) === undefined ||
      before.slice(head.length) !== current.slice(frontmatter(current)!.length))) ||
    assertions(before) !== assertions(current) ||
    repair.preserved.some((text) => before.split(text).length !== 2 || current.split(text).length !== 2) ||
    prior.present.some((phrase) => !current.includes(phrase)) ||
    prior.absent.some((phrase) => current.includes(phrase))) {
    throw new Error(sourceDrift);
  }
  return historical;
}

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no named repair, and any bytes other than the
 * reviewed repair come back unchanged, so those checks still decide them. The
 * reviewed repair is verified as the exact edit list over its archived
 * predecessor, which is returned.
 */
export function round6RemainingRepairPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const repair = repairs.find((candidate) => candidate.path === ref.path);
  if (!repair || live.length !== repair.afterBytes) return live;
  const liveHash = digest(live);
  if (liveHash !== repair.afterHash || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return verifiedRepair(root, repair, live);
}

const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { round6ProseRestorePredecessor } from './audit-round6-prose-restores-continuity.ts';",
    "import { round6ProseRestorePredecessor } from './audit-round6-prose-restores-continuity.ts';\n" +
      "import { round6RemainingRepairPredecessor } from './audit-round6-remaining-repairs-continuity.ts';",
  ],
  [
    '  const current = round6ProseRestorePredecessor(root, ref, readBoundedLocalFile(root, ref.path));\n',
    '  const current = round6ProseRestorePredecessor(root, ref,\n' +
      '    round6RemainingRepairPredecessor(root, ref, readBoundedLocalFile(root, ref.path)));\n',
  ],
  // The one reviewed live version of the classical-closure suite moves to the
  // budget-only successor verified below.
  [testHashLine(suite.beforeHash), testHashLine(suite.afterHash)],
];

/** The round6 prose-restores predecessor and every checker it passes through. */
const historicalCheckers = new Map([
  ['ab4e3d50ed3961a293d1e8b8a664d8e8de1f2f1e5cd93ee08785d5402a9465c6', 113723],
  ['0efa34b7fe0e0e021ca5e7811a642398e79aa636ac607e85affe77e7a5abf756', 113447],
  ['4287a7e100aab9fe914d4b19b38773910b723f7c98dcc80849c069d0bfe8aa69', 113223],
  ['65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b', 112672],
  ['8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507', 112303],
  ['c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c', 111975],
  ['7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6', 111934],
  ['4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d', 111186],
]);

/**
 * Older checker bytes pass through. The current checker is admitted only as
 * the exact remaining-repairs reader revision above the round6 prose-restores
 * head, and only while its new classical-closure test hash names the exact
 * budget-only edit of the archived suite.
 */
export function round6RemainingRepairsCheckerPredecessor(root: string, live: Buffer): Buffer {
  const liveHash = digest(live);
  if (liveHash === checkerBefore.sha256 && live.length === checkerBefore.bytes) return live;
  if (historicalCheckers.get(liveHash) === live.length) return live;
  const review = readJson<Review>(root, `${directory}checker-transition.json`);
  const historical = readFileSync(join(root, checkerBefore.path));
  reviewed(review, 'round6-remaining-repairs-checker-revision-v1', checkerDrift);
  const archivedSuite = readFileSync(join(root, suite.snapshot));
  const budgeted = Buffer.from(applyExact(archivedSuite.toString(), suite.edits, checkerDrift));
  if (review.name !== 'remaining-repairs-reader' ||
    !same(review.before, checkerBefore.path, checkerBefore.bytes, checkerBefore.sha256) ||
    review.after?.path !== 'lib/audit-local-basis.ts' ||
    historical.length !== checkerBefore.bytes || digest(historical) !== checkerBefore.sha256 ||
    live.length !== review.after.bytes || liveHash !== review.after.sha256 ||
    archivedSuite.length !== suite.beforeBytes || digest(archivedSuite) !== suite.beforeHash ||
    budgeted.length !== suite.afterBytes || digest(budgeted) !== suite.afterHash ||
    assertions(archivedSuite.toString()) !== assertions(budgeted.toString()) ||
    applyExact(historical.toString(), checkerEdits, checkerDrift) !== live.toString()) {
    throw new Error(checkerDrift);
  }
  return historical;
}
