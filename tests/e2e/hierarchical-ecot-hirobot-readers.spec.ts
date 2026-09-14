import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CITATIONS } from '../../data/citations';

const evidenceRoot = process.env.ROBOT_WIKI_EVIDENCE_ROOT;
const observations = new WeakMap<Page, { consoleErrors: string[]; pageErrors: string[]; blockedRequests: string[] }>();
const required = [
  'content/manipulation/hierarchical.mdx', 'data/citations.ts', 'data/glossary.ts',
  'tests/e2e/hierarchical-ecot-hirobot-readers.spec.ts', 'components/interactive/hierarchy-timescales.tsx',
  'components/ui/cite.tsx', 'components/ui/term.tsx', 'components/article/references.tsx',
  'components/article/author-list.tsx', 'playwright.config.ts',
];

test.beforeAll(() => {
  if (!evidenceRoot) return; // Ordinary discovery/CI does not claim a Mission capture.
  const file = process.env.ROBOT_WIKI_GATE_INPUTS;
  expect(file).toBeTruthy();
  const manifest = JSON.parse(readFileSync(file!, 'utf8'));
  expect(manifest.requiredStage).toBe('ecot-hirobot-reader-v1:readers');
  expect(manifest.readerBaseURL).toBe('http://127.0.0.1:3272');
  expect(process.env.ROBOT_WIKI_SCOPED_READER_URL).toBe(manifest.readerBaseURL);
  for (const name of [...required, resolve(evidenceRoot, 'playwright.ecot.config.ts'),
    resolve(evidenceRoot, 'runtime-preparation.json'), resolve(evidenceRoot, 'fonts.cjs')]) {
    const path = resolve(name), bytes = readFileSync(path);
    const identity = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    expect(manifest.requiredInputs[path], `required ${name}`).toEqual(identity);
    expect(manifest.inputs[path], `captured ${name}`).toEqual(identity);
  }
});

test.beforeEach(async ({ page, context }) => {
  const record = { consoleErrors: [] as string[], pageErrors: [] as string[], blockedRequests: [] as string[] };
  observations.set(page, record);
  page.on('console', m => { if (m.type() === 'error') record.consoleErrors.push(m.text()); });
  page.on('pageerror', e => record.pageErrors.push(e.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      record.blockedRequests.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/manipulation/hierarchical/');
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

test.afterEach(async ({ page }, info) => {
  const record = observations.get(page)!;
  const rendering = await page.evaluate(() => ({
    width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
    titleFont: getComputedStyle(document.querySelector('h1')!).fontFamily,
    bodyFont: getComputedStyle(document.body).fontFamily,
    fontFaces: [...document.fonts].map(f => ({ family: f.family, status: f.status, weight: f.weight })),
    focusedTag: document.activeElement?.tagName, focusedId: document.activeElement?.id,
  }));
  await info.attach('reader-observations', { body: Buffer.from(JSON.stringify({ ...record, rendering }, null, 2)), contentType: 'application/json' });
  expect(record.pageErrors).toEqual([]);
  expect(rendering.scrollWidth).toBeLessThanOrEqual(rendering.width + 1);
});

async function capture(page: Page, locator: Locator, name: string, info: TestInfo) {
  if (!evidenceRoot) return;
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const top = await page.evaluate(() => scrollY) + box!.y;
  const height = page.viewportSize()!.height;
  const count = Math.max(1, Math.ceil(box!.height / (height - 180)));
  for (let i = 0; i < count; i++) {
    await page.evaluate(y => scrollTo(0, y), Math.max(0, top - 100 + i * (height - 180)));
    await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
    await page.screenshot({ path: info.outputPath(`${name}-${i}.png`), animations: 'disabled' });
  }
  writeFileSync(info.outputPath(`${name}.json`), JSON.stringify({
    name, text: await locator.innerText(), box, viewport: page.viewportSize(), slices: count,
  }, null, 2) + '\n');
}

test('final ECoT prose, Hi Robot bullet and coupled Stat remain readable', async ({ page }, info) => {
  const paragraphs = [
    page.locator('p').filter({ hasText: /^ECoT trains a/ }),
    page.locator('p').filter({ hasText: /^The paper reports a 28-percentage-point/ }),
    page.locator('p').filter({ hasText: /^The main evaluation already keeps/ }),
    page.locator('li').filter({ hasText: /^Hi Robot uses two separately trained policies/ }),
  ];
  for (const [i, p] of paragraphs.entries()) {
    await expect(p).toHaveCount(1);
    await capture(page, p, `final-prose-${i}`, info);
  }
  await expect(paragraphs[1]).toContainText('66% versus 44%');
  await expect(paragraphs[1]).toContainText('64% versus 30%');
  await expect(paragraphs[1]).toContainText('314 trials per approach');
  await expect(paragraphs[2]).toContainText('not the recipe behind the main Table 1');
  await expect(paragraphs[3]).toContainText('low-level instruction violations');
  const stat = page.getByText('learned hierarchies', { exact: true });
  await expect(stat).toHaveCount(1);
  const statBox = stat.locator('..');
  await expect(statBox).toContainText('2025');
  await expect(statBox).toContainText('Hi Robot, π0.5');
  await capture(page, statBox, 'final-stat', info);
});

for (const id of ['ecot-2024', 'hi-robot-2025']) {
  test(`${id}: short citation metadata and full expanded reference`, async ({ page }, info) => {
    const c = CITATIONS.find(c => c.id === id)!;
    const chip = page.locator(`[data-cite-id="${id}"]`).first();
    const outbound = chip.locator('a').first();
    await outbound.scrollIntoViewIfNeeded();
    await outbound.focus();
    const tip = chip.getByRole('tooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(c.title);
    await expect(tip).toContainText(String(c.year));
    await expect(outbound).toHaveAttribute('href', c.url);
    await expect(outbound).toHaveAttribute('rel', 'noopener noreferrer');
    // Inline metadata is intentionally short; it does not certify the full author list.
    if (evidenceRoot) await page.screenshot({ path: info.outputPath(`${id}-short-tooltip.png`) });
    await page.keyboard.press('Escape');
    await expect(tip).not.toBeVisible();
    await expect(outbound).toBeFocused();
    await chip.getByRole('link', { name: `Jump to the full reference for ${c.title}` }).click();
    const reference = page.locator(`#ref-${id}`);
    await expect(reference).toBeInViewport();
    const expand = reference.getByRole('button', { name: `Show all ${c.authors.length} authors`, exact: true });
    if (await expand.count()) await expand.click();
    await expect(reference.locator('[data-author-names]')).toHaveText(c.authors.join(', '));
    await expect(reference.locator('[data-reference-source-link]')).toHaveAttribute('href', c.url);
    await expect(reference).toContainText(String(c.year));
    await capture(page, reference, `${id}-full-reference`, info);
  });
}

test('hierarchy selector, keyboard playhead, detail and reset remain functional', async ({ page }, info) => {
  const group = page.getByRole('group', { name: 'Select a system overlay' });
  await group.scrollIntoViewIfNeeded();
  const buttons = group.locator('button[aria-pressed]');
  expect(await buttons.count()).toBe(4);
  const states = [];
  for (let i = 0; i < 4; i++) {
    const button = buttons.nth(i);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('system-detail')).toBeVisible();
    const slider = page.getByRole('slider');
    await slider.focus();
    await slider.press('End');
    await expect(slider).toHaveValue('2000');
    await expect(page.getByTestId('playhead-readout')).toContainText('2000');
    states.push({ system: await button.innerText(), detail: await page.getByTestId('system-detail').innerText() });
  }
  await page.getByRole('button', { name: /reset/i }).click();
  await expect(page.getByRole('slider')).toHaveValue('0');
  await capture(page, group.locator('..'), 'hierarchy-controls', info);
  await info.attach('all-four-systems', { body: Buffer.from(JSON.stringify(states, null, 2)), contentType: 'application/json' });
});

test('affected VLA glossary link and Back observations remain explicit', async ({ page }, info) => {
  const paragraph = page.locator('p').filter({ hasText: /^ECoT trains a/ });
  const term = paragraph.locator('[data-term-id="vision-language-action-model"]');
  const link = term.locator('a').first();
  await link.scrollIntoViewIfNeeded();
  await link.focus();
  const tip = term.getByRole('tooltip');
  await expect(tip).toBeVisible();
  if (evidenceRoot) await page.screenshot({ path: info.outputPath('vla-term-tooltip.png') });
  await page.keyboard.press('Escape');
  const escapeStillVisible = await tip.isVisible(); // Shared Term Escape debt is an observation, not waived acceptance.
  await link.click();
  await expect(page).toHaveURL(/\/glossary\/?#vision-language-action-model/);
  await expect(page.locator('#vision-language-action-model')).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/\/manipulation\/hierarchical/);
  const backFocus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id }));
  await info.attach('term-escape-and-back-focus', { body: Buffer.from(JSON.stringify({ escapeStillVisible, backFocus }, null, 2)), contentType: 'application/json' });
});
