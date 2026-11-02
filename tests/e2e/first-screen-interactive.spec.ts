import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';
import { firstScreenPopulation } from './helpers/first-screen-population';
import { measureFirstScreen } from './helpers/first-screen-measure';
import { derivedExclusions, findCue, FIRST_SCREEN_LIMITS, populationFailures, type FirstScreenMeasurement } from '../helpers/first-screen-contract';

/**
 * VAL-EDU-045 / VAL-OPUS-147, owner-authorized successor (2026-11-02).
 *
 * The authoritative educational-ux contract counts control-only mounts and
 * derives exclusions. The prior SVG-first walk skipped an earlier working
 * comparison table/scene and sometimes chose a closed Adjust more diagram.
 * This successor joins the existing widget, scene, explainer and clip
 * authorities plus authored MDX controls, reconciles every DOM mount, and
 * grades the earliest rendered control region. The 300-word, one-H2 and
 * 1600px limits and the cue pattern list are unchanged. A mount without a
 * rendered non-decorative SVG records clause (c) as inapplicable explicitly.
 * Population/hidden-fold/control-only mutation proofs live beside this spec
 * in first-screen-contract.spec.ts and the focused unit population tests.
 */
const population = firstScreenPopulation();
const outDir = join(process.cwd(), 'out');
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const proofSourcePaths = [
  'tests/e2e/first-screen-interactive.spec.ts',
  'tests/e2e/helpers/first-screen-measure.ts',
  'tests/e2e/helpers/first-screen-population.ts',
  'tests/helpers/first-screen-contract.ts',
  'contract/brand-v2-registries.json',
  'data/modules.ts',
  'lib/motion-scene-registry.ts',
  'lib/motion-clips.ts',
  'components/explainers/mounts.ts',
  'data/images.ts',
];
const proofSources = proofSourcePaths.map((path) => {
  const bytes = readFileSync(join(process.cwd(), path));
  return { path, bytes: bytes.length, sha256: digest(bytes) };
});
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

test.describe('VAL-EDU-045 article prose reaches an interactive', () => {
  let server: StaticExportServer;
  const measured: FirstScreenMeasurement[] = [];
  const configured: FirstScreenMeasurement[] = [];
  const withoutProse: string[] = [];
  const configuredOverflow: Array<{ route: string; overflow: number }> = [];
  const exportFiles: Array<{ route: string; path: string; bytes: number; sha256: string }> = [];

  test.beforeAll(async ({ browser }, testInfo) => {
    expect(existsSync(outDir), 'run npm run build first: this spec grades the shipped export').toBe(true);
    server = await startStaticExportServer(outDir);
    // Per-route budgets include both the sealed 1440px measurement and the
    // requested reflow profile. This changes observation time, not limits.
    test.setTimeout(20_000 + population.routes.length * 6_000);
    const viewport = testInfo.project.use.viewport ?? { width: 1280, height: 720 };
    for (const route of population.routes) {
      const relativePath = `${route.slice(1)}index.html`;
      const html = readFileSync(join(outDir, relativePath));
      const htmlDigest = digest(html);
      exportFiles.push({ route, path: `out/${relativePath}`, bytes: html.length, sha256: htmlDigest });
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      try {
        await page.goto(`http://127.0.0.1:${server.port}${route}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(measureFirstScreen, { route, componentNames: population.componentNames });
        if (result) measured.push(result);
        else withoutProse.push(route);
        if (viewport.width !== 1440 || viewport.height !== 900) {
          await page.setViewportSize(viewport);
          const reflowed = await page.evaluate(measureFirstScreen, { route, componentNames: population.componentNames });
          if (reflowed) configured.push(reflowed);
          else withoutProse.push(`${route} at ${viewport.width}px`);
        } else if (result) configured.push(result);
        configuredOverflow.push({ route, overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) });
        expect(digest(readFileSync(join(outDir, relativePath))), `${route}: export remained unchanged during measurement`).toBe(htmlDigest);
      } finally { await page.close(); }
    }
    const evidenceDir = process.env.FIRST_SCREEN_EVIDENCE_DIR ?? join(process.cwd(), 'test-results', 'first-screen');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, `${testInfo.project.name}.json`), JSON.stringify({
      assertionIds: ['VAL-EDU-045', 'VAL-OPUS-147'],
      observedAt: new Date().toISOString(),
      sourceCommit,
      proofSources,
      exportFiles,
      exportRootSha256: digest(JSON.stringify(exportFiles)),
      viewport: { width: 1440, height: 900 },
      requestedViewport: viewport,
      expectedMounts: population.expected,
      measured,
      configured,
      exclusions: derivedExclusions(population.routes, population.expected),
      populationFailures: populationFailures(population.routes, population.expected, measured),
      limits: FIRST_SCREEN_LIMITS,
    }, null, 2) + '\n');
  });

  test.afterAll(async () => { await server?.stop(); });

  test('the corpus is non-empty and every published article was measured', () => {
    expect(withoutProse).toEqual([]);
    expect(populationFailures(population.routes, population.expected, measured)).toEqual([]);
  });

  test('exclusions equal the registry and rendered difference, with reasons', () => {
    expect(populationFailures(population.routes, population.expected, measured)).toEqual([]);
    const expected = derivedExclusions(population.routes, population.expected);
    const actual = measured.filter((measurement) => measurement.first === null).map((measurement) => measurement.route).sort();
    expect(actual).toEqual(expected.map((entry) => entry.route).sort());
    for (const entry of expected) expect(entry.reason.length).toBeGreaterThan(20);
  });

  test('clause (a): at most 300 rendered words precede the first interactive', () => {
    expect(populationFailures(population.routes, population.expected, measured)).toEqual([]);
    expect(measured.flatMap(({ route, first }) => first && first.precedingWords > FIRST_SCREEN_LIMITS.words ? [`${route}: ${first.precedingWords} words`] : [])).toEqual([]);
  });

  test('clause (b): at most one h2 precedes the first interactive', () => {
    expect(populationFailures(population.routes, population.expected, measured)).toEqual([]);
    expect(measured.flatMap(({ route, first }) => first && first.precedingH2 > FIRST_SCREEN_LIMITS.headings ? [`${route}: ${first.precedingH2Texts.join(' | ')}`] : [])).toEqual([]);
  });

  test('clause (c): the first non-decorative svg sits within 1600px of the document top', () => {
    expect(populationFailures(population.routes, population.expected, measured)).toEqual([]);
    expect(measured.flatMap(({ route, first }) => first?.topEdge !== null && first && first.topEdge > FIRST_SCREEN_LIMITS.svgTop ? [`${route}: ${first.topEdge}px`] : [])).toEqual([]);
    for (const { route, first } of measured) {
      if (first?.topEdge === null) expect(first.noSvgReason, route).toContain('no rendered non-decorative SVG');
    }
  });

  test('clause (d): an operating cue naming a rendered control sits in the adjacent prose', () => {
    expect(populationFailures(population.routes, population.expected, measured)).toEqual([]);
    expect(measured.flatMap(({ route, first }) => first && !findCue(first.adjacentParagraphs.map((paragraph) => paragraph.text), first.controlLabels) ? [route] : [])).toEqual([]);
  });

  test('the cue is outside any gated reveal, since a closed details hides its body from innerText', () => {
    const inScope = measured.filter((measurement) => measurement.first);
    expect(inScope.length).toBeGreaterThan(0);
    for (const { route, first } of inScope) {
      const cue = findCue(first!.adjacentParagraphs.map((paragraph) => paragraph.text), first!.controlLabels);
      expect(cue, route).not.toBeNull();
      expect(first!.adjacentParagraphs.find((paragraph) => paragraph.text === cue?.paragraph)?.cited, `${route}: cue paragraph has a contextual source`).toBe(true);
    }
  });

  test('the requested viewport preserves every mount and its operating cue without document overflow', () => {
    expect(populationFailures(population.routes, population.expected, configured)).toEqual([]);
    expect(configuredOverflow.filter(({ overflow }) => overflow > 1)).toEqual([]);
    for (const { route, first } of configured) {
      if (first) expect(findCue(first.adjacentParagraphs.map((paragraph) => paragraph.text), first.controlLabels), route).not.toBeNull();
    }
  });
});
