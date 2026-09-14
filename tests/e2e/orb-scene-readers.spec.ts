import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CITATIONS, citationMeta } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';

const ARTICLE = '/classical/scene-representation/';
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const settle = (page: Page) => page.evaluate(() => new Promise<void>(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
type Proof = { states: Record<string, unknown>[]; captures: Record<string, unknown>[]; errors: string[]; navigations: string[] };
const proofs = new WeakMap<Page, Proof>();

test.beforeEach(async ({ context, page }) => {
  const proof: Proof = { states: [], captures: [], errors: [], navigations: [] };
  proofs.set(page, proof);
  page.on('pageerror', e => proof.errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') proof.errors.push(e.text()); });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) proof.navigations.push(frame.url()); });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      proof.errors.push(`blocked external request: ${url.href}`);
      return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    const install = () => {
      if (!document.documentElement || document.getElementById('orb-reader-motion')) return;
      const style = document.createElement('style');
      style.id = 'orb-reader-motion';
      // Next's development indicator is not shipped reader UI. It was reproduced
      // covering the final caveat; exclude only its portal, retaining page/console
      // error assertions and the text hit-test. No first-party surface is hidden.
      style.textContent = 'nextjs-portal{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
      document.documentElement.append(style);
    };
    new MutationObserver(install).observe(document, { childList: true, subtree: true });
    install();
  });
});

async function capture(page: Page, info: TestInfo, name: string) {
  await settle(page);
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  proofs.get(page)!.captures.push({ name, path, sha256: hash(path), at: new Date().toISOString(),
    viewport: page.viewportSize(), url: page.url() });
}

test.afterEach(async ({ page }, info) => {
  const proof = proofs.get(page)!;
  try { await capture(page, info, 'terminal'); } finally {
    const input = process.env.ROBOT_WIKI_GATE_INPUTS;
    const path = info.outputPath('reader-proof.json');
    mkdirSync(info.outputDir, { recursive: true });
    writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), title: info.title,
      project: info.project.name, viewport: page.viewportSize(), status: info.status,
      fixtureOnlyOverlayHidden: 'nextjs-portal; production surfaces unchanged',
      input: input ? { path: input, sha256: hash(input) } : null, ...proof,
      limitation: 'Scoped reader evidence only. Recorded Back/Escape failures and Axe incompletes are not acceptance.',
    }, null, 2) + '\n');
  }
  expect(proof.errors).toEqual([]);
});

async function open(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await settle(page);
}

async function bounds(page: Page, target: Locator) {
  await settle(page);
  const geometry = await target.evaluate(e => {
    const b = e.getBoundingClientRect();
    const headers = [...document.querySelectorAll('header')].filter(h => {
      const s = getComputedStyle(h), r = h.getBoundingClientRect();
      return ['sticky', 'fixed'].includes(s.position) && r.width > 0 && r.height > 0 && r.top <= 0;
    });
    return { x: b.x, y: b.y, width: b.width, height: b.height,
      headerBottom: Math.max(0, ...headers.map(h => h.getBoundingClientRect().bottom)),
      clientHeight: e.clientHeight, scrollHeight: e.scrollHeight, scrollTop: e.scrollTop,
      clientWidth: e.clientWidth, scrollWidth: e.scrollWidth,
      tabIndex: (e as HTMLElement).tabIndex };
  });
  const vp = page.viewportSize()!;
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.x + geometry.width).toBeLessThanOrEqual(vp.width + 1);
  expect(geometry.y).toBeGreaterThanOrEqual(geometry.headerBottom);
  expect(geometry.y + geometry.height).toBeLessThanOrEqual(vp.height + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  return geometry;
}

/** Text range geometry, not mere DOM presence, proves the final caveat can be read. */
async function finalTextVisible(page: Page, target: Locator, text: string) {
  const result = await target.evaluate((element, ending) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const start = node.textContent?.indexOf(ending) ?? -1;
      if (start < 0) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + ending.length);
      const clip = element.getBoundingClientRect();
      const rects = [...range.getClientRects()].map(r => {
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        const owner = node!.parentElement;
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
          unobstructed: hit === owner || Boolean(hit?.contains(owner)),
          hit: hit?.tagName ?? null };
      });
      return { found: true, rects, clip: { left: clip.left, right: clip.right, top: clip.top, bottom: clip.bottom },
        viewport: { width: innerWidth, height: innerHeight } };
    }
    return { found: false, rects: [], clip: null, viewport: { width: innerWidth, height: innerHeight } };
  }, text);
  expect(result.found).toBe(true);
  expect(result.rects.length).toBeGreaterThan(0);
  for (const rect of result.rects) {
    expect(rect.unobstructed, `final text obstructed by ${rect.hit}`).toBe(true);
    expect(rect.left).toBeGreaterThanOrEqual(Math.max(0, result.clip!.left) - 1);
    expect(rect.right).toBeLessThanOrEqual(Math.min(result.viewport.width, result.clip!.right) + 1);
    expect(rect.top).toBeGreaterThanOrEqual(Math.max(0, result.clip!.top) - 1);
    expect(rect.bottom).toBeLessThanOrEqual(Math.min(result.viewport.height, result.clip!.bottom) + 1);
  }
  proofs.get(page)!.states.push({ kind: 'final-readable-text', text, ...result });
}

async function axe(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).analyze();
  proofs.get(page)!.states.push({ kind: 'axe', label, violations: result.violations, incomplete: result.incomplete });
  expect(result.violations).toEqual([]);
}

test('ORB readers: qualified prose, short Cite metadata and full footnote authors', async ({ page }, info) => {
  await open(page, ARTICLE);
  const prose = page.locator('.prose');
  for (const qualification of [
    'candidates, which require geometric validation', 'discard an immature map',
    'geometric and covisibility checks', 'gravity-direction checks',
    'slow motion can leave inertial initialization poorly constrained',
    'This is not a guarantee that every revisit removes all error',
    'This is not a universal ranking of the cost of every false match against every missed match',
    'motion information can also inform this belief', "Direct Sparse Odometry's formulation",
  ]) await expect(prose).toContainText(qualification);

  for (const id of ['orb-slam-2015', 'orb-slam3-2021']) {
    const citation = CITATIONS.find(c => c.id === id)!;
    const chips = prose.locator(`[data-cite-id="${id}"]`);
    for (let i = 0; i < await chips.count(); i++) {
      const chip = chips.nth(i), link = chip.locator('a[target="_blank"]'), tip = chip.getByRole('tooltip');
      await link.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.mouse.move(1, 1);
      await settle(page);
      await link.hover();
      await expect(tip).toBeVisible();
      await expect(tip.locator('span').first()).toHaveText(citation.title);
      await expect(tip.locator('span').last()).toHaveText(citationMeta(citation));
      await expect(link).toHaveAttribute('href', citation.url);
      await bounds(page, tip);
      const hoverText = await tip.innerText();
      await page.mouse.move(1, 1);
      await link.focus();
      await expect(tip).toBeVisible();
      expect(await tip.innerText()).toBe(hoverText);
      const geometry = await bounds(page, tip);
      if (geometry.scrollHeight > geometry.clientHeight + 1) {
        await page.keyboard.press('Tab');
        await expect(tip).toBeFocused();
        await page.keyboard.press('End');
        await settle(page);
      }
      await finalTextVisible(page, tip, String(citation.year));
      proofs.get(page)!.states.push({ kind: 'cite', id, occurrence: i, hoverText, geometry,
        intentionalShortByline: citation.authors.length > 3 });
      await capture(page, info, `cite-${id}-${i}`);
      await page.keyboard.press('Escape');
      proofs.get(page)!.states.push({ kind: 'cite-escape', id, visible: await tip.isVisible() });
      await link.evaluate(e => e.blur());
    }
    const jump = chips.first().locator(`a[href="#ref-${id}"]`);
    await jump.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await jump.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
    const ref = page.locator(`[data-reference-id="${id}"]`);
    await expect(ref).toBeInViewport();
    await expect(ref.locator('[data-author-names]')).toHaveText(citation.authors.join(', '));
    expect(await ref.getByRole('button').count()).toBe(0); // ORB has3/5 authors; collapse starts above8.
    await expect(ref.locator('[data-reference-source-link]')).toHaveAttribute('href', citation.url);
    await ref.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await finalTextVisible(page, ref, citation.authors.at(-1)!);
    await capture(page, info, `reference-${id}`);
  }
  for (const caveat of ['slow motion can leave inertial initialization poorly constrained',
    'This is not a universal ranking of the cost of every false match against every missed match']) {
    const p = prose.locator(':scope > p').filter({ hasText: caveat }).first();
    await p.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await finalTextVisible(page, p, caveat);
    await capture(page, info, caveat.startsWith('slow') ? 'orb3-prose' : 'false-match-prose');
  }
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - innerWidth,
    math: [...document.querySelectorAll('.prose .katex-display')].map(e => ({
      scroll: e.scrollWidth, client: e.clientWidth, overflowX: getComputedStyle(e).overflowX,
    })),
  }));
  expect(overflow.document).toBeLessThanOrEqual(0);
  proofs.get(page)!.states.push({ kind: 'text-math-overflow', ...overflow });
  await axe(page, 'article-resting');
});

test('ORB readers: complete definitions, readable final caveats and observed history', async ({ page }, info) => {
  for (const id of ['loop-closure', 'place-recognition']) {
    await open(page, ARTICLE);
    const definition = GLOSSARY.find(t => t.id === id)!.definition;
    const finalText = id === 'loop-closure' ? 'This is not a guarantee that every revisit removes all error.'
      : 'Geometric verification and robust estimation can mitigate outliers, but do not establish a universal ranking of every false match against every missed match.';
    const term = page.locator(`.prose [data-term-id="${id}"]`), trigger = term.locator('a.term-link'), tip = term.getByRole('tooltip');
    await trigger.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.mouse.move(1, 1);
    await settle(page);
    const documentY = () => term.evaluate(e => e.getBoundingClientRect().top + scrollY);
    const before = await documentY();
    await trigger.hover();
    await expect(tip).toBeVisible();
    await expect(tip.locator('span').last()).toHaveText(definition);
    const hover = normalize(await tip.innerText());
    await bounds(page, tip);
    await page.mouse.move(1, 1);
    await trigger.focus();
    expect(normalize(await tip.innerText())).toBe(hover);
    expect(await documentY()).toBeCloseTo(before, 1);
    const geometry = await bounds(page, tip);
    if (geometry.scrollHeight > geometry.clientHeight + 1) {
      await page.keyboard.press('Tab');
      await expect(tip).toBeFocused();
      await page.keyboard.press('End');
      await expect.poll(() => tip.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
      await settle(page);
    }
    proofs.get(page)!.states.push({ kind: 'term', id, definition, geometry,
      scrollCase: geometry.scrollHeight > geometry.clientHeight + 1 ? 'keyboard-End-exercised' : 'natural-fit-no-scroll-case' });
    await finalTextVisible(page, tip, finalText);
    await capture(page, info, `term-${id}`);
    await axe(page, `term-${id}-revealed`);
    await page.keyboard.press('Escape');
    proofs.get(page)!.states.push({ kind: 'term-escape', id, visible: await tip.isVisible() });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/glossary/?#${id}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Glossary', exact: true })).toBeVisible();
    const entry = page.locator(`[data-glossary-term="${id}"]`);
    await expect(entry.locator('p').first()).toHaveText(definition);
    await entry.locator('p').first().evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await finalTextVisible(page, entry.locator('p').first(), finalText);
    for (const sourceId of GLOSSARY.find(t => t.id === id)!.citations) {
      const citation = CITATIONS.find(c => c.id === sourceId)!;
      await expect(entry.getByRole('link', { name: citation.title, exact: true })).toHaveAttribute('href', citation.url);
    }
    await capture(page, info, `glossary-${id}`);
    await axe(page, `glossary-${id}`);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await settle(page);
    const history = await page.evaluate(() => ({ url: location.href, h1: document.querySelector('h1')?.textContent,
      focus: document.activeElement?.tagName, scrollY }));
    proofs.get(page)!.states.push({ kind: 'history-back-observation', id, ...history,
      accepted: false, explanation: 'URL, mounted page and focus are recorded separately; shared history is not repaired here.' });
    await capture(page, info, `back-${id}`);
  }
});

test('ORB readers: article drawer, focus return and unchanged control defaults', async ({ page }, info) => {
  await open(page, ARTICLE);
  const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true });
  if (page.viewportSize()!.width === 375) {
    await menu.focus();
    await page.keyboard.press('Enter');
    const drawer = page.getByRole('dialog', { name: 'Site navigation' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Scene Representation and Mapping', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Close navigation menu', exact: true })).toBeFocused();
    await capture(page, info, 'drawer');
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(menu).toBeFocused();
    expect(await page.locator('[inert]').count()).toBe(0);
  } else {
    await expect(menu).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Robot Wiki taxonomy' })).toBeVisible();
  }
  await page.getByTestId('scene-ladder').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('scene-select-occupancy-grid')).toHaveAttribute('aria-pressed', 'true');
  const opening = await page.getByTestId('scene-resolution-value').innerText();
  proofs.get(page)!.states.push({ kind: 'control-default', representation: 'occupancy-grid', opening });
  await capture(page, info, 'control-default');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
