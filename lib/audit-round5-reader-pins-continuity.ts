/**
 * Exact successor reviews for five reader files that the industrial and
 * Control corrected-disposition records still pin at their pre-repair bytes.
 * Two 2026-09-28 repairs changed them: the retained-reader repair pointed the
 * Control and industrial citation-refresh specs at the instrument-frame mount
 * and waits for hydration before a lab is operated, and the shared-reader
 * repair added the author-list id, the single open citation tooltip and the
 * Home/End keys of an overflowing term tooltip. Each record keeps reading the
 * bytes its recorded browser run used. The live file is admitted only as the
 * named exact edit list over that archived predecessor, and the checker
 * revision is the same kind of exact successor. No old review, run, receipt,
 * capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = 'audit/evidence/motion-round5-reader-pins-20260929/';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceDrift = 'round5 reader pins source continuity drift';
const checkerDrift = 'round5 reader pins checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = {
  schemaVersion: string; name?: string; before: Artifact; after: Artifact;
  reviewedBy: string; rationale: string; observedAt: string;
};
type SourceReview = Omit<Review, 'before' | 'after'> & {
  sources: { name: string; before: Artifact; after: Artifact; consumers: string[] }[];
};

function applyExact(
  before: string,
  edits: readonly (readonly [string, string])[],
  label: string,
): string {
  let expected = before;
  for (const [from, to] of edits) {
    if (expected.split(from).length !== 2) throw new Error(label);
    expected = expected.replace(from, to);
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

const controlSpecEdits: readonly (readonly [string, string])[] = [
  [
    [
      "import { setSlider } from './slider';",
      "import { mkdirSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
    ].join('\n'),
    [
      "import { setHydratedSlider as setSlider, waitForHydration } from './interaction-ready';",
      "import { writeFileSync } from 'node:fs';",
    ].join('\n'),
  ],
  [
    "    .locator('div.prose > div.rounded-md:has([data-testid=\"pendulum-scene\"]), div.prose > div.rounded-none:has([data-testid=\"pendulum-scene\"])')",
    "    .locator('div.prose > [data-brand-module-signature=\"instrument-frame\"]:has([data-testid=\"pendulum-scene\"])')",
  ],
  [
    [
      "  test('observes corrected sources, quiz and both labs at desktop and mobile', async ({ browser }) => {",
      "    const evidence = join(import.meta.dirname, '../../audit/evidence/control-citation-closeout-20260924');",
      "    mkdirSync(evidence, { recursive: true });",
    ].join('\n'),
    "  test('observes corrected sources, quiz and both labs at desktop and mobile', async ({ browser }, info) => {",
  ],
  [
    [
      "      await page.getByRole('button', { name: /run the simulation/i }).first().click();",
      "      await expect(page.getByRole('button', { name: /pause the simulation/i }).first()).toBeVisible();",
      "      await page.getByRole('button', { name: /pause the simulation/i }).first().click();",
    ].join('\n'),
    [
      "      const run = pendulum(page).getByRole('button', { name: /run the simulation/i });",
      "      await waitForHydration(run);",
      "      await run.click();",
      "      await expect(pendulum(page).getByRole('button', { name: /pause the simulation/i })).toBeVisible();",
      "      await pendulum(page).getByRole('button', { name: /pause the simulation/i }).click();",
    ].join('\n'),
  ],
  [
    [
      "      writeFileSync(join(evidence, `control-${width}.dom.json`), JSON.stringify(dom, null, 2) + '\\n');",
      "      await page.screenshot({ path: join(evidence, `control-${width}.png`) });",
    ].join('\n'),
    [
      "      writeFileSync(info.outputPath(`control-${width}.dom.json`), JSON.stringify(dom, null, 2) + '\\n');",
      "      await page.screenshot({ path: info.outputPath(`control-${width}.png`) });",
    ].join('\n'),
  ],
  [
    "    const before = await scene.boundingBox();",
    [
      "    const before = await scene.boundingBox();",
      "    await waitForHydration(pendulum(page).getByRole('button', { name: /run the simulation/i }));",
    ].join('\n'),
  ],
  [
    "    // Default gains: the loop settles into its small steady lean.",
    [
      "    // Default gains: the loop settles into its small steady lean.",
      "    await waitForHydration(pendulum(page).getByRole('button', { name: /run the simulation/i }));",
    ].join('\n'),
  ],
  [
    [
      "    await page.goto(ROUTE);",
      "    await pendulum(page).getByRole('button', { name: /run the simulation/i }).click();",
    ].join('\n'),
    [
      "    await page.goto(ROUTE);",
      "    await waitForHydration(pendulum(page).getByRole('button', { name: /run the simulation/i }));",
      "    await pendulum(page).getByRole('button', { name: /run the simulation/i }).click();",
    ].join('\n'),
  ],
  [
    "    const kd = pendulum(page).getByRole('slider', { name: /derivative gain kd/i });",
    [
      "    const kd = pendulum(page).getByRole('slider', { name: /derivative gain kd/i });",
      "    await waitForHydration(kd);",
    ].join('\n'),
  ],
  [
    [
      "    await page.goto(ROUTE);",
      "    // A click that lands between first paint and hydration is swallowed",
      "    // and the simulation never starts, so the click is replayed until the",
      "    // paused→running toggle is observable as the button's swapped",
      "    // accessible name. The label check runs before every replay, so a",
      "    // registered click is never toggled back off.",
    ].join('\n'),
    "    await page.goto(ROUTE);",
  ],
  [
    [
      "    for (let attempt = 0; attempt < 60; attempt += 1) {",
      "      if ((await pauseButton.count()) === 1) break;",
      "      if ((await runButton.count()) === 1) await runButton.click();",
      "      await page.waitForTimeout(30);",
      "    }",
    ].join('\n'),
    [
      "    await waitForHydration(runButton);",
      "    await runButton.click();",
    ].join('\n'),
  ],
  [
    "    // torque -> position: native disabled + non-numeric unbounded label.",
    [
      "    // torque -> position: native disabled + non-numeric unbounded label.",
      "    await waitForHydration(lab.getByTestId('impedance-hardware-position'));",
    ].join('\n'),
  ],
];

const refreshSpecEdits: readonly (readonly [string, string])[] = [
  [
    "  return page.locator('div.prose > div.rounded-md:has([data-testid=\"payback-months\"])');",
    "  return page.locator('div.prose > [data-brand-module-signature=\"instrument-frame\"]:has([data-testid=\"payback-months\"])');",
  ],
];

const referencesEdits: readonly (readonly [string, string])[] = [
  [
    '                <AuthorList',
    [
      '                <AuthorList',
      '                  id={citation.id}',
    ].join('\n'),
  ],
];

const citeEdits: readonly (readonly [string, string])[] = [
  [
    "import { useId, useLayoutEffect, useRef, useState } from 'react';",
    [
      "import { useId, useLayoutEffect, useRef, useState } from 'react';",
      '',
      'const citeTooltipListeners = new Set<(id: string) => void>();',
      '',
      "/** One citation tooltip is exposed at a time. A focus move must not leave the previous chip's hover-grace popup open. */",
      'function claimCiteTooltip(id: string) {',
      '  for (const listener of citeTooltipListeners) listener(id);',
      '}',
    ].join('\n'),
  ],
  [
    '  const revealed = (hovered || focused) && !dismissed;',
    [
      '  const revealed = (hovered || focused) && !dismissed;',
      '',
      '  useLayoutEffect(() => {',
      '    const listener = (id: string) => {',
      '      if (id === tooltipId) return;',
      '      // Keyboard focus on this chip outranks a hover claim elsewhere.',
      '      if (rootRef.current?.contains(document.activeElement)) return;',
      '      clearTimeout(leaveTimer.current);',
      '      setHovered(false);',
      '      setFocused(false);',
      '    };',
      '    citeTooltipListeners.add(listener);',
      '    return () => {',
      '      citeTooltipListeners.delete(listener);',
      '    };',
      '  }, [tooltipId]);',
      '',
      '  useLayoutEffect(() => {',
      '    if (revealed) claimCiteTooltip(tooltipId);',
      '  }, [revealed, tooltipId]);',
    ].join('\n'),
  ],
];

const termEdits: readonly (readonly [string, string])[] = [
  [
    '        ref={tooltipRef}',
    [
      '        ref={tooltipRef}',
      '        onKeyDown={(event) => {',
      '          const tip = event.currentTarget;',
      '          if (tip.scrollHeight <= tip.clientHeight + 1) return;',
      "          if (event.key !== 'Home' && event.key !== 'End') return;",
      '          // Native End on this overflow tooltip scrolls only a few pixels,',
      '          // so the final caveat stays outside the clip. Pin both ends.',
      '          event.preventDefault();',
      "          const next = event.key === 'Home' ? 0 : tip.scrollHeight;",
      '          tip.scrollTop = next;',
      '          requestAnimationFrame(() => {',
      '            if (tooltipRef.current) tooltipRef.current.scrollTop = next;',
      '          });',
      '        }}',
    ].join('\n'),
  ],
];

const controlConsumers = ['control-citation-removed-1-20260924', 'control-citation-removed-2-20260924'];
const industrialConsumers = [
  'industrial-correction-37-20260923',
  'industrial-correction-47-20260923',
  'industrial-correction-48-20260923',
];

/**
 * `preserved` lists the checks the correction records rely on; they must
 * read identically before and after. Component edits are insertions only.
 */
const pins = [
  {
    name: 'control-spec-hydrated-instrument',
    path: 'tests/e2e/control.spec.ts',
    snapshot: `${directory}control-spec-before.ts.txt`,
    beforeBytes: 24950,
    beforeHash: '880e59fc67247ba0fcaab03f110bcb0008d1ce336375e926adca044325efb5fb',
    afterBytes: 24751,
    afterHash: 'c99b16fdeebf05cb45f47778f1bd1e5259034dfa617385981ebd8f60d102e561',
    edits: controlSpecEdits,
    insertionOnly: false,
    consumers: controlConsumers,
    preserved: [
      "      expect(text).not.toMatch(/more than 95%|>95%|Kalman's 1960|Åström and Murray/i);",
      "      await expect(page.locator('[data-cite-id=\"astrom-murray-2008\"]')).toHaveCount(0);",
      "      await expect(page.locator('[data-cite-id=\"kalman-1960\"]')).toHaveCount(0);",
      "      await expect(zn).toHaveAttribute('href', 'https://doi.org/10.1115/1.2899060');",
      "      await expect(lqr).toHaveAttribute('href', 'https://underactuated.mit.edu/');",
      "      await expect(page.locator('#ref-ziegler-nichols-1942')).toHaveCount(1);",
      "      await expect(page.locator('#ref-tedrake-underactuated')).toHaveCount(1);",
    ],
  },
  {
    name: 'citation-refresh-instrument-frame',
    path: 'tests/e2e/industrial-citation-refresh.spec.ts',
    snapshot: `${directory}industrial-citation-refresh-spec-before.ts.txt`,
    beforeBytes: 7721,
    beforeHash: '1381b60615d6e3ca1ded42d7af7004f2955178799e4664d7274014c8566e92e8',
    afterBytes: 7755,
    afterHash: '95600b9dab16e74280ccd31ef3ae25f0b8374c95c9e37fe8a870000488598777',
    edits: refreshSpecEdits,
    insertionOnly: false,
    consumers: industrialConsumers,
    preserved: [
      '      await expect(tooltip).toContainText(canonical!.definition);',
      "    for (const value of ['4,663,698', '542,076', '54%']) {",
      "  const dashboardLinkStatus = (await page.request.get('/frontier/reliability-gap/')).status();",
      '  expect(dashboardLinkStatus).toBe(200); expect(errors).toEqual([]);',
    ],
  },
  {
    name: 'references-author-id',
    path: 'components/article/references.tsx',
    snapshot: `${directory}references-before.tsx.txt`,
    beforeBytes: 4091,
    beforeHash: '17297ca5f25d6c7d2c2273fef8510767454a617fcb01bf6a02d0ee17b5235223',
    afterBytes: 4126,
    afterHash: '6510b07a5469b722ce55b7c18377b46a85cbeca016135d3f4626d765af883348',
    edits: referencesEdits,
    insertionOnly: true,
    consumers: industrialConsumers,
    preserved: [],
  },
  {
    name: 'cite-single-open-tooltip',
    path: 'components/ui/cite.tsx',
    snapshot: `${directory}cite-before.tsx.txt`,
    beforeBytes: 10428,
    beforeHash: 'adcd78810e82e9284fb149a008616170d6e9ae9468629668d2ea9d859eaad055',
    afterBytes: 11289,
    afterHash: 'acc039e8d5913e5356bd2c00d989cfa29d9722470d5f0e2a6b17fe102d78e50a',
    edits: citeEdits,
    insertionOnly: true,
    consumers: industrialConsumers,
    preserved: [],
  },
  {
    name: 'term-overflow-keys',
    path: 'components/ui/term.tsx',
    snapshot: `${directory}term-before.tsx.txt`,
    beforeBytes: 7417,
    beforeHash: '6af4846e55b78003e67a1928d0c7cbcffefc0c11df6d650a2197b0ed6da8d09c',
    afterBytes: 8043,
    afterHash: 'e465a4219d4865534d837112ffa6133423309c6a61a45e9bdbae37b772ca44ae',
    edits: termEdits,
    insertionOnly: true,
    consumers: industrialConsumers,
    preserved: [],
  },
] as const;

const consumerPackets = [
  'audit/evidence/industrial-release-20260924/corrections.json',
  'audit/evidence/classical-closure-20260923/corrections.json',
];

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const assertions = (source: string) => source.split('\n').filter((line) => line.includes('expect(')).length;

/** Every correction record that still pins this predecessor, in packet order. */
function consumersOf(root: string, pin: typeof pins[number]): string[] {
  return consumerPackets.flatMap((packet) =>
    (JSON.parse(readFileSync(join(root, packet), 'utf8')) as { id: string; dependencies: Artifact[] }[])
      .filter((record) => record.dependencies.some((dependency) =>
        same(dependency, pin.path, pin.beforeBytes, pin.beforeHash)))
      .map((record) => record.id));
}

/** The exact predecessor a correction record pins, as its recorded run used it. */
export function round5ReaderPinEndpoint(ref: Artifact): boolean {
  return pins.some((pin) => same(ref, pin.path, pin.beforeBytes, pin.beforeHash));
}

/**
 * Verify the named successor of one pinned reader file and return the
 * archived predecessor bytes the correction records' runs observed.
 */
export function retainedRound5ReaderPinSource(root: string, path: string, live: Buffer): Buffer {
  const pin = pins.find((candidate) => candidate.path === path);
  if (!pin) throw new Error(sourceDrift);
  const review = JSON.parse(readFileSync(join(root, `${directory}source-transition.json`), 'utf8')) as SourceReview;
  reviewed(review, 'round5-reader-pins-source-continuity-v1', sourceDrift);
  const binding = review.sources?.find((source) => source.name === pin.name);
  const historical = readFileSync(join(root, pin.snapshot));
  const before = historical.toString();
  const current = live.toString();
  if (review.name !== 'retained-reader-pins' || review.sources?.length !== pins.length ||
    !binding || !same(binding.before, pin.snapshot, pin.beforeBytes, pin.beforeHash) ||
    !same(binding.after, pin.path, pin.afterBytes, pin.afterHash) ||
    JSON.stringify(binding.consumers) !== JSON.stringify(pin.consumers) ||
    JSON.stringify(consumersOf(root, pin)) !== JSON.stringify(pin.consumers) ||
    historical.length !== pin.beforeBytes || digest(historical) !== pin.beforeHash ||
    live.length !== pin.afterBytes || digest(live) !== pin.afterHash ||
    applyExact(before, pin.edits, sourceDrift) !== current ||
    (pin.insertionOnly && pin.edits.some(([from, to]) => !to.startsWith(`${from}\n`))) ||
    assertions(before) !== assertions(current) ||
    pin.preserved.some((text) => before.split(text).length !== 2 || current.split(text).length !== 2)) {
    throw new Error(sourceDrift);
  }
  return historical;
}

const checkerBefore = {
  path: `${directory}audit-local-basis-before.ts.txt`,
  bytes: 113223,
  sha256: '4287a7e100aab9fe914d4b19b38773910b723f7c98dcc80849c069d0bfe8aa69',
};
const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { retainedRound5FirstScreenCdArticle, round5FirstScreenCdEndpoint } from './audit-round5-first-screen-cd-continuity.ts';",
    "import { retainedRound5FirstScreenCdArticle, round5FirstScreenCdEndpoint } from './audit-round5-first-screen-cd-continuity.ts';\n" +
      "import { retainedRound5ReaderPinSource, round5ReaderPinEndpoint } from './audit-round5-reader-pins-continuity.ts';",
  ],
  [
    '  if (round5FirstScreenCdEndpoint(ref)) {\n' +
      '    return retainedRound5FirstScreenCdArticle(root, ref.path, current);\n' +
      '  }\n',
    '  if (round5FirstScreenCdEndpoint(ref)) {\n' +
      '    return retainedRound5FirstScreenCdArticle(root, ref.path, current);\n' +
      '  }\n' +
      '  if (round5ReaderPinEndpoint(ref)) {\n' +
      '    return retainedRound5ReaderPinSource(root, ref.path, current);\n' +
      '  }\n',
  ],
];

/**
 * Older checker bytes pass through. The current checker is admitted only as
 * the exact reader revision above the preserved round5 first-screen c/d head.
 */
export function round5ReaderPinsCheckerPredecessor(root: string, live: Buffer): Buffer {
  if (digest(live) === checkerBefore.sha256 && live.length === checkerBefore.bytes) return live;
  const historicalHashes = new Map([
    ['65e58379b7b6a1eec832ee82cf3c6cd9c5f33f5f2fe626129b2c6323e7aa405b', 112672],
    ['8e377d397001f936b4bc21583db07c0317d1431c757b4359501e1dd64bd8c507', 112303],
    ['c74133b3c4435b396ec29acc1bd659f1dfdcc2dbd7b10709c15862ba3dce184c', 111975],
    ['7ffcf091f4fd8bdf8652eca51919d941c77aeae6f55e6cdc755e7e200dbdbcd6', 111934],
    ['4b1007a7e78d9ea05c34415cc869d0c11ef937c1e9158136041b4c102afdf84d', 111186],
  ]);
  if (historicalHashes.get(digest(live)) === live.length) return live;
  const review = JSON.parse(readFileSync(join(root, `${directory}checker-transition.json`), 'utf8')) as Review;
  const historical = readFileSync(join(root, checkerBefore.path));
  reviewed(review, 'round5-reader-pins-checker-revision-v1', checkerDrift);
  if (review.name !== 'reader-pin-readers' ||
    review.before.path !== checkerBefore.path || review.before.bytes !== checkerBefore.bytes ||
    review.before.sha256 !== checkerBefore.sha256 ||
    review.after.path !== 'lib/audit-local-basis.ts' ||
    historical.length !== checkerBefore.bytes || digest(historical) !== checkerBefore.sha256 ||
    live.length !== review.after.bytes || digest(live) !== review.after.sha256 ||
    applyExact(historical.toString(), checkerEdits, checkerDrift) !== live.toString()) {
    throw new Error(checkerDrift);
  }
  return historical;
}
