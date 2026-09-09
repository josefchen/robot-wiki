import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { CITATIONS } from '../../data/citations';

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const out = process.env.DR_READER_OUT;
const run = process.env.DR_READER_RUN ?? 'reader';
const base = process.env.RANDOMIZATION_READER_URL ?? '';

type Evidence = {
  identity: string;
  boundedAssertionsComplete: boolean;
  input?: { path: string; sha256: string };
  steps: unknown[];
  captures: unknown[];
  gaps: unknown[];
  denied: string[];
  errors: string[];
};

function evidence(info: TestInfo): Evidence {
  const path = out && join(out, `${run}.inputs.json`);
  return {
    identity: info.title, boundedAssertionsComplete: false,
    ...(path ? { input: { path, sha256: hash(path) } } : {}),
    steps: [], captures: [], gaps: [], denied: [], errors: [],
  };
}

async function capture(page: Page, info: TestInfo, row: Evidence, state: string) {
  if (!out) return;
  const path = join(out, `${run}-${info.title.replace(/[^a-z0-9]+/gi, '-')}-${state}.png`);
  await page.mouse.move(1, 1);
  await page.screenshot({ path, animations: 'disabled' });
  row.captures.push({ path, sha256: hash(path), state, at: new Date().toISOString(), viewport: page.viewportSize(), url: page.url() });
}

async function open(page: Page, row: Evidence, slug: string) {
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return route.continue();
    row.denied.push(url.href);
    return route.abort();
  });
  page.on('pageerror', error => row.errors.push(String(error)));
  await page.goto(`${base}/rl-sim2real/${slug}/`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('h1')).toBeVisible();
}

async function centered(locator: Locator) {
  await locator.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

async function containment(locator: Locator, page: Page, row: Evidence, state: string) {
  const box = await locator.boundingBox();
  row.steps.push({ state, box });
  expect(box, state).not.toBeNull();
  const view = page.viewportSize()!;
  expect(box!.x, state).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, state).toBeLessThanOrEqual(view.width + 1);
  expect(box!.y, state).toBeGreaterThanOrEqual(view.width === 375 ? 60 : 0);
  expect(box!.y + box!.height, state).toBeLessThanOrEqual(view.height + 1);
}

async function focusProof(locator: Locator, row: Evidence) {
  await expect(locator).toBeFocused();
  const style = await locator.evaluate(element => {
    const s = getComputedStyle(element);
    return { outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, outlineOffset: s.outlineOffset, focusVisible: element.matches(':focus-visible') };
  });
  row.steps.push({ focus: style });
  expect(style.focusVisible).toBe(true);
  expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(style.outlineColor).toBe('rgb(36, 95, 255)');
}

async function axe(page: Page, row: Evidence, selector: string, state: string) {
  const result = await new AxeBuilder({ page }).include(selector).analyze();
  row.steps.push({ state, axe: { violations: result.violations, incomplete: result.incomplete } });
  if (result.incomplete.length) row.gaps.push({ state, kind: 'axe-incomplete', rules: result.incomplete.map(item => item.id) });
  expect(result.violations, `${state}: scoped Axe`).toEqual([]);
}

async function fonts(page: Page, row: Evidence, selectors: string[]) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  for (const selector of selectors) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    expect(nodeId, selector).toBeGreaterThan(0);
    const actual = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    row.steps.push({ selector, platformFonts: actual.fonts });
    expect(actual.fonts.length, selector).toBeGreaterThan(0);
    for (const font of actual.fonts) {
      expect(font.isCustomFont, `${selector}: ${font.familyName}`).toBe(true);
      expect(font.familyName).toMatch(/Tektur|Newsreader|IBM Plex (Sans|Mono)|KaTeX/);
    }
  }
  await cdp.detach();
}

async function finish(page: Page, info: TestInfo, row: Evidence) {
  row.steps.push({ overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(row.errors).toEqual([]);
  expect(row.denied).toEqual([]);
  row.boundedAssertionsComplete = true;
  await info.attach('reader-evidence', { body: JSON.stringify(row, null, 2), contentType: 'application/json' });
}

async function save(page: Page, info: TestInfo, row: Evidence) {
  if (info.status !== info.expectedStatus) await capture(page, info, row, 'failure').catch(() => {});
  if (out) writeFileSync(join(out, `${run}-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`), JSON.stringify({ ...row, runnerStatusAtFinally: info.status, result: row.boundedAssertionsComplete ? 'passed-executed-assertions' : 'incomplete-see-terminal-log' }, null, 2) + '\n');
}

// Independent authored-model oracle: do not import the component's calculations.
function expected(mu: number, range: number) {
  const point = 0.97 * Math.exp(-((mu - 0.8) ** 2) / (2 * 0.09 ** 2));
  const excess = Math.max(0, Math.abs(mu - 0.8) - range);
  const dr = (0.93 - 0.55 * range) * Math.exp(-(excess ** 2) / (2 * 0.1 ** 2));
  return { point, dr };
}

async function setRange(input: Locator, target: number, step: number) {
  await input.focus();
  await input.press('Home');
  const minimum = Number(await input.getAttribute('min'));
  for (let value = minimum; value < target; value += step) await input.press('ArrowRight');
  await expect(input).toHaveValue(String(target));
}

async function modelState(panel: Locator, row: Evidence, mu: number, range: number) {
  const value = expected(mu, range);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  await expect(panel.getByTestId('point-readout')).toHaveText(pct(value.point));
  await expect(panel.getByTestId('dr-readout')).toHaveText(pct(value.dr));
  await expect(panel.getByTestId('real-mu-readout')).toHaveText(mu.toFixed(2));
  await expect(panel.getByTestId('ft-explanation')).toContainText(value.point > value.dr ? 'point curve is higher' : 'DR curve is higher');
  const markers = await panel.locator('[data-testid$="-marker"]').evaluateAll(nodes => nodes.map(node => ({
    id: node.getAttribute('data-testid'), x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')),
  })));
  for (const marker of markers) {
    const success = marker.id === 'point-marker' ? value.point : value.dr;
    expect(marker.x).toBeCloseTo(56 + (mu - 0.2) / 1.3 * 568, 1);
    expect(marker.y).toBeCloseTo(296 - success * 276, 1);
  }
  // Every sampled polyline coordinate is compared with the independent formula.
  for (const kind of ['point', 'dr'] as const) {
    const coordinates = (await panel.getByTestId(`${kind}-curve`).getAttribute('points'))!.split(' ').map(pair => pair.split(',').map(Number));
    expect(coordinates).toHaveLength(65);
    coordinates.forEach(([x, y], index) => {
      const sampleMu = 0.2 + index / 64 * 1.3;
      expect(x).toBeCloseTo(56 + index / 64 * 568, 1);
      expect(Math.abs(y - (296 - expected(sampleMu, range)[kind] * 276))).toBeLessThan(0.04);
    });
  }
  row.steps.push({ model: { mu, range, ...value, markers, sampleCoordinatesChecked: 130 } });
}

async function exercisePanel(page: Page, panel: Locator, info: TestInfo, row: Evidence, defaultRange: number) {
  const mu = panel.getByRole('slider').nth(0);
  const range = panel.getByRole('slider').nth(1);
  await expect(mu).toHaveAttribute('min', '20');
  await expect(mu).toHaveAttribute('max', '150');
  await expect(mu).toHaveAttribute('step', '1');
  await expect(range).toHaveAttribute('min', '10');
  await expect(range).toHaveAttribute('max', '65');
  await expect(range).toHaveAttribute('step', '5');
  await modelState(panel, row, 0.8, defaultRange);
  await centered(panel.getByTestId('point-readout'));
  await capture(page, info, row, 'default-chart');
  for (const width of [10, defaultRange * 100, 65]) {
    await setRange(range, width, 5);
    await focusProof(range, row);
    for (const friction of [20, 80, 150]) {
      await setRange(mu, friction, 1);
      await focusProof(mu, row);
      await modelState(panel, row, friction / 100, width / 100);
    }
  }
  // An interior point away from the center disproves the old "inside means point wins" shortcut.
  await setRange(range, 35, 5);
  await setRange(mu, 110, 1);
  await modelState(panel, row, 1.1, 0.35);
  await centered(panel.getByTestId('point-readout'));
  await capture(page, info, row, 'changed-chart');
  const reset = panel.getByRole('button', { name: 'Reset', exact: true });
  await reset.focus();
  await reset.press('Enter');
  await expect(reset).toBeFocused();
  await expect(range).toHaveValue(String(defaultRange * 100));
  await modelState(panel, row, 0.8, defaultRange);
  await expect(panel).toContainText('All values and the falling DR peak are local assumptions');
  await expect(panel).toContainText('not measured robot performance');
  await centered(reset);
  await capture(page, info, row, 'reset-focus');
  // Open the accessible chart description, and retain any independent scoped red.
  const summary = panel.locator('summary');
  if (await summary.count()) { await summary.focus(); await summary.press('Enter'); }
  await axe(page, row, `[aria-describedby="${await panel.locator('svg').getAttribute('aria-describedby')}"]`, 'chart');
}

for (const width of [375, 1440]) {
  test.describe(`randomization ${width}`, () => {
    test.use({ viewport: { width, height: width === 375 ? 812 : 900 } });
    for (const slug of ['sim2real-transfer', 'why-rl-locomotion']) {
      test(`citation reader ${slug} at ${width}`, async ({ page }, info) => {
        test.setTimeout(180_000);
        const row = evidence(info);
        try {
          await open(page, row, slug);
          await capture(page, info, row, 'heading');
          const ids = slug === 'sim2real-transfer' ? ['peng-2018', 'tobin-2017', 'openai-rubiks-cube-2019'] : ['openai-rubiks-cube-2019'];
          for (const id of ids) {
            const citation = CITATIONS.find(item => item.id === id)!;
            const chips = page.locator(`div.prose [data-cite-id="${id}"]`);
            expect(await chips.count()).toBeGreaterThan(0);
            for (let index = 0; index < await chips.count(); index++) {
              const chip = chips.nth(index);
              const link = chip.locator('a').first();
              const tooltip = chip.getByRole('tooltip');
              await expect(link).toHaveAttribute('href', citation.url);
              await expect(link).toHaveAttribute('target', '_blank');
              await expect(link).toHaveAttribute('rel', /noopener/);
              await centered(link);
              await link.hover();
              await expect(tooltip).toBeVisible();
              await containment(tooltip, page, row, `${id}/${index}/hover`);
              await page.mouse.move(1, 1);
              await link.focus();
              await expect(tooltip).toBeVisible();
              await containment(tooltip, page, row, `${id}/${index}/focus`);
              if (index === 0) await capture(page, info, row, `${id}-focus`);
              const jump = chip.getByRole('link', { name: `Jump to the full reference for ${citation.title}`, exact: true });
              await page.keyboard.press('Tab');
              await expect(jump).toBeFocused();
              await page.keyboard.press('Enter');
              const ref = page.locator(`[data-reference-id="${id}"]`);
              await expect(ref).toBeInViewport();
              if (citation.authors.length === 19) {
                const show = ref.getByRole('button', { name: 'Show all 19 authors', exact: true });
                if (await show.count()) { await show.focus(); await show.press('Enter'); }
              }
              await expect(ref.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
              await expect(ref.getByRole('link', { name: citation.title, exact: true })).toHaveAttribute('href', citation.url);
              if (index === 0) {
                await centered(ref);
                await capture(page, info, row, `${id}-reference`);
                await containment(ref, page, row, `${id}/full-reference`);
                await fonts(page, row, [`[data-reference-id="${id}"] [data-author-names]`]);
              }
              // Pointer-click the in-page reference affordance, without fetching the external source.
              await centered(link);
              await jump.click();
              await expect(ref).toBeInViewport();
            }
          }
          const source = readFileSync(join(process.cwd(), `content/rl-sim2real/${slug}.mdx`), 'utf8');
          const paragraphs = source.split(/\n\s*\n/).filter(p => !p.startsWith('<') && !p.startsWith(' ') && ids.some(id => p.includes(`<Cite id="${id}"`)));
          const rendered = await page.locator('div.prose p').evaluateAll(nodes => nodes.map(node => {
            const copy = node.cloneNode(true) as HTMLElement;
            copy.querySelectorAll('[data-cite-id], [role=tooltip]').forEach(cite => cite.remove());
            return copy.textContent!.replace(/\s+/g, ' ').trim();
          }));
          for (const paragraph of paragraphs) {
            const plain = norm(paragraph.replace(/<Cite[^>]+\/>/g, '').replace(/<[^>]+>/g, '').replace(/\*\*/g, ''));
            expect(rendered).toContain(plain);
          }
          row.steps.push({ fullSourceCorrectParagraphs: paragraphs.length });
          await fonts(page, row, ['h1', 'div.prose > p', '[data-reference-id] [data-author-names]']);
          await axe(page, row, 'article', 'article-default');
          const math = page.locator('.katex-display');
          row.steps.push({ equationCount: await math.count(), notApplicableReason: await math.count() === 0 ? 'No display equation on either affected article.' : undefined });
          await finish(page, info, row);
        } finally { await save(page, info, row); }
      });
    }

    test(`ordinary friction reader at ${width}`, async ({ page }, info) => {
      test.setTimeout(180_000);
      const row = evidence(info);
      try {
        await open(page, row, 'sim2real-transfer');
        const panel = page.locator('div.prose > div:has(> [data-testid="ft-explanation"])');
        await expect(panel).toHaveCount(1);
        await exercisePanel(page, panel, info, row, 0.35);
        const quiz = page.locator('[data-self-check]');
        const choice = quiz.getByRole('radio', { name: 'A separately trained adaptation module', exact: true });
        await choice.focus(); await choice.press('Space');
        await expect(choice).toBeFocused();
        await expect(quiz).toContainText('not a control-frequency or gradient-update claim');
        await expect(quiz).toContainText('50 state-action steps');
        await expect(quiz).toContainText('asynchronously using the latest estimate');
        row.steps.push({ preservedRmaFeedback: true });
        await axe(page, row, '[data-self-check]', 'RMA-revealed');
        await fonts(page, row, ['[data-testid="ft-explanation"]', '[data-testid="real-mu-readout"]']);
        await finish(page, info, row);
      } finally { await save(page, info, row); }
    });

    test(`prediction friction reader at ${width}`, async ({ page }, info) => {
      test.setTimeout(180_000);
      const row = evidence(info);
      try {
        await open(page, row, 'sim2real-transfer');
        const prediction = page.locator('[data-predict]');
        const details = prediction.locator('[data-reveal]');
        const summary = details.locator('summary').first();
        const radios = prediction.getByRole('radio');
        await expect(details).not.toHaveAttribute('open', '');
        await expect(radios).toHaveCount(3);
        await summary.focus(); await summary.press('Enter');
        await expect(details).toHaveAttribute('open', '');
        await expect(prediction.locator('input:checked')).toHaveCount(0);
        await summary.press('Enter');
        for (let index = 0; index < 3; index++) {
          const radio = radios.nth(index);
          await radio.focus(); await radio.press('Space');
          await expect(radio).toBeChecked();
          await expect(radio).toBeFocused();
          await expect(details).toHaveAttribute('open', '');
          await expect(prediction.locator('[data-reason][data-selected="true"]')).toHaveCount(1);
          await centered(radio);
          await capture(page, info, row, `choice-${index}`);
        }
        await expect(prediction).toContainText('not Peng paper results');
        await expect(prediction).toContainText('not a measured law of domain randomization');
        const panel = prediction.locator('div:has(> [data-testid="ft-explanation"])');
        await exercisePanel(page, panel, info, row, 0.65);
        await expect(page.locator('div.prose > div:has(> [data-testid="ft-explanation"])').getByRole('slider').nth(1)).toHaveValue('35');
        await summary.focus(); await summary.press('Enter');
        await expect(details).not.toHaveAttribute('open', '');
        await summary.press('Enter');
        await expect(details).toHaveAttribute('open', '');
        await modelState(panel, row, 0.8, 0.65);
        row.steps.push({ chooseRevealChangeResetAndNativeDisclosure: true, independentMountDefaults: true });
        await axe(page, row, '[data-predict]', 'prediction-revealed');
        await finish(page, info, row);
      } finally { await save(page, info, row); }
    });
  });
}
