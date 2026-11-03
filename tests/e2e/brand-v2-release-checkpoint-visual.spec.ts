import { join } from 'node:path';
import { test, expect } from './brand-v2-static-fixture';
import { startStaticExportServer } from './static-export-server';
import { checkpointVisualState } from './helpers/release-state-probe';

test('the actual map keeps its checkpoint visual identity across static server ports', async ({ browser, staticBase }) => {
  const second = await startStaticExportServer(join(process.cwd(), 'out'), 0);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const digests: Array<string | null> = [];
    const origins = [staticBase, `http://localhost:${second.port}`];
    expect(new Set(origins).size).toBe(2);
    for (const origin of origins) {
      const page = await context.newPage();
      await page.goto(`${origin}/market-map/`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('[data-market-map-search]')).toBeVisible();
      digests.push(await checkpointVisualState(page));
      await page.close();
    }
    expect(digests[0]).not.toBeNull();
    expect(digests[1]).toBe(digests[0]);
  } finally {
    await context.close();
    await second.stop();
  }
});

test('checkpoint visual identity retains resource, CSSOM and painted-state differences', async ({ page }) => {
  const css = 'body{margin:0;font:16px Arial}main{width:200px;color:rgb(28,28,26)}';
  await page.route(/^http:\/\/(?:checkpoint|external-one|external-two)\.test\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') {
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link id="theme" rel="stylesheet" crossorigin="anonymous" href="/theme.css"></head><body><main><p>Stable text</p></main></body></html>' });
    } else {
      await route.fulfill({ contentType: 'text/css', headers: { 'Access-Control-Allow-Origin': '*' }, body: css });
    }
  });
  await page.goto('http://checkpoint.test/', { waitUntil: 'networkidle' });
  const baseline = await checkpointVisualState(page);
  expect(baseline).not.toBeNull();
  const setSheet = async (href: string) => {
    await page.evaluate((next) => new Promise<void>((resolve, reject) => {
      const link = document.querySelector<HTMLLinkElement>('#theme')!;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Stylesheet failed to load'));
      link.href = next;
    }), href);
  };
  // Identical stylesheet text at a different path/query/fragment is still a
  // different resource; only the current document's origin is normalized.
  for (const href of ['/other.css', '/theme.css?version=2', '/theme.css#variant']) {
    await setSheet(href);
    expect(await checkpointVisualState(page), href).not.toBe(baseline);
  }
  await setSheet('http://external-one.test/theme.css');
  const external = await checkpointVisualState(page);
  expect(external).not.toBeNull();
  expect(external).not.toBe(baseline);
  await setSheet('http://external-two.test/theme.css');
  const anotherExternal = await checkpointVisualState(page);
  expect(anotherExternal).not.toBeNull();
  expect(anotherExternal).not.toBe(external);
  await setSheet('/theme.css');
  expect(await checkpointVisualState(page)).toBe(baseline);

  // A non-matching rule changes no pixels but must invalidate cached proof.
  await page.evaluate(() => document.styleSheets[0].insertRule('.not-present{color:red}'));
  expect(await checkpointVisualState(page)).not.toBe(baseline);
  await page.evaluate(() => document.styleSheets[0].deleteRule(0));
  expect(await checkpointVisualState(page)).toBe(baseline);
  await page.evaluate(() => { document.styleSheets[0].disabled = true; });
  expect(await checkpointVisualState(page)).not.toBe(baseline);
  await page.evaluate(() => { document.styleSheets[0].disabled = false; });
  expect(await checkpointVisualState(page)).toBe(baseline);
  for (const [property, value] of [['width', '210px'], ['color', 'rgb(1,2,3)']] as const) {
    await page.locator('main').evaluate((node, change) => { node.style.setProperty(change[0], change[1]); }, [property, value]);
    expect(await checkpointVisualState(page)).not.toBe(baseline);
    await page.locator('main').evaluate((node) => node.removeAttribute('style'));
    expect(await checkpointVisualState(page)).toBe(baseline);
  }
  await page.locator('main').evaluate((node) => node.setAttribute('data-state', 'different'));
  expect(await checkpointVisualState(page)).not.toBe(baseline);
  await page.locator('main').evaluate((node) => node.removeAttribute('data-state'));
  expect(await checkpointVisualState(page)).toBe(baseline);

  await page.locator('main').evaluate((node) => node.append(document.createElement('canvas')));
  expect(await checkpointVisualState(page)).toBeNull();
  await page.locator('canvas').evaluate((node) => node.remove());
  await page.locator('main').evaluate((node) => {
    const image = document.createElement('img');
    image.src = '/missing-image.png'; image.width = 30; image.height = 30;
    node.append(image);
  });
  expect(await checkpointVisualState(page)).toBeNull();
  await page.locator('img').evaluate((node) => node.remove());
  await page.route('http://unreadable.test/style.css', (route) => route.fulfill({ contentType: 'text/css', body: css }));
  await page.evaluate(() => new Promise<void>((resolve) => {
    const link = document.createElement('link'); link.rel = 'stylesheet';
    link.href = 'http://unreadable.test/style.css'; link.onload = () => resolve();
    document.head.append(link);
  }));
  expect(await checkpointVisualState(page)).toBeNull();
});
