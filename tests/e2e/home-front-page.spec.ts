import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPLAINER_ORDER } from '../../components/explainers/catalog';
import { DEVICE_REGISTRATION } from '../../components/ui/brand-device';
import { COMPANIES } from '../../data/companies';
import { GLOSSARY } from '../../data/glossary';
import { HOME_FEATURED_PICKS } from '../../data/home-featured';
import { DEVELOPMENTS, DEVELOPMENTS_FROM } from '../../data/now';
import { DOMAINS, DOMAIN_META, getModule, publishedModules } from '../../data/modules';
import { FEATURED_DEK_MAX_WORDS } from '../../lib/featured-article';
import { formatCount, homeCounts, readableSpan } from '../../lib/home-counts';
import { UPDATE_NOTE_MAX_WORDS, latestChanges } from '../../lib/home-updates';
import { ROUNDS_PAGE_PATH, headlineFacts } from '../../lib/rounds-page';
import {
  CONTENT_CORRECTION_URL,
  PUBLIC_DESCRIPTOR,
  PUBLIC_IDENTITY,
  REPOSITORY_URL,
} from '../../lib/identity';
import { forEachInOwnContext } from './helpers/per-route-context';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * The encyclopedia front page
 * and the /about/ page that took home's scope statement and reading guide.
 * Served from the static export, because the counts, the
 * picks and the dates are fixed when the page is built.
 *
 * Updated for the contents-first front page of 14 November 2026: the
 * humanoid scene left the first screen and the contents took its place,
 * "Start here" lost its pictures, and "Did you know" and "Explore" gave way
 * to "Also in the wiki" and "How this wiki is made". Every pin below moved
 * to the new block at the same strength.
 */

let BASE: string;
let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before this spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

const words = (value: string) => value.split(/\s+/).filter(Boolean);
const squash = (value: string) => value.replace(/\s+/g, ' ').trim();
const trimSlash = (href: string) => href.replace(/\/$/, '');

/** The six blocks the front page permits in <main>, in order. */
const HOME_BLOCKS = [
  'Introduction',
  'Contents',
  'Start here',
  'Also in the wiki',
  'Latest',
  'How this wiki is made',
];

/** Texts the 01:25 addendum removed from home, and the two blocks cut since. */
const REMOVED_TEXTS = [
  /a citation is not a guarantee of verification/i,
  /the centre of gravity is robot learning/i,
  /how to read this wiki/i,
  /encyclopedia of modern robotics/i,
  /learning paths/i,
  /did you know/i,
  /turn it in 3d/i,
];

async function home(page: Page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/`);
  await page.evaluate(() => document.fonts.ready);
  return page.locator('main');
}

test.describe('home front page', () => {
  test('opens with the identity line, registry counts and a search box that finds results', async ({
    page,
  }) => {
    for (const [width, height] of [
      [375, 812],
      [1440, 900],
    ] as const) {
      const main = await home(page, width, height);
      const intro = main.getByRole('region', { name: 'Introduction' });
      // The first text of <main> is the h1, then the descriptor verbatim.
      const opening = squash(await main.innerText()).slice(
        0,
        PUBLIC_IDENTITY.length + PUBLIC_DESCRIPTOR.length + 1,
      );
      expect(opening, `opening text at ${width}px`).toBe(
        `${PUBLIC_IDENTITY} ${PUBLIC_DESCRIPTOR}`,
      );
      await expect(intro.getByRole('heading', { level: 1 })).toHaveText(
        PUBLIC_IDENTITY,
      );
      const search = page
        .getByRole('search', { name: 'Search the wiki' })
        .getByRole('searchbox');
      const box = await search.boundingBox();
      expect(box, `search box at ${width}px`).not.toBeNull();
      expect(box!.y + box!.height, `search box inside the first viewport at ${width}px`).toBeLessThanOrEqual(height);
    }

    const counts = homeCounts();
    // The research-page meta line sets the three counts apart with
    // aria-hidden middots, so a screen reader hears the counts alone.
    const printed = squash(await page.locator('[data-home-counts]').innerText());
    expect(printed).toBe(
      `${formatCount(counts.articles)} articles · ${formatCount(counts.sources)} sources · ${formatCount(counts.glossaryTerms)} glossary terms`,
    );
    expect(printed).not.toMatch(/\d{4}/);
    const separators = page.locator('[data-home-counts] > [aria-hidden="true"]');
    await expect(separators).toHaveCount(2);
    for (const text of await separators.allInnerTexts()) expect(text.trim()).toBe('·');
    expect(counts.articles).toBe(publishedModules().length);

    const introText = await page
      .getByRole('region', { name: 'Introduction' })
      .innerText();
    expect(introText).not.toMatch(/[–—]/);

    const search = page.getByRole('searchbox', {
      name: 'Search articles, sources and glossary',
    });
    // the name is a persistent visible label, kept beside
    // the box at both stated widths, never an aria-label.
    await expect(search).not.toHaveAttribute('aria-label');
    const label = page.locator('label[for="home-search-input"]');
    await expect(label).toHaveCount(1);
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(label).toBeVisible();
      await expect(label).toHaveText('Search articles, sources and glossary');
      const [labelBox, inputBox] = await Promise.all([label.boundingBox(), search.boundingBox()]);
      expect(labelBox!.height, `label renders at ${width}px`).toBeGreaterThan(0);
      expect(labelBox!.y + labelBox!.height, `label sits above the box at ${width}px`).toBeLessThanOrEqual(inputBox!.y);
      expect(inputBox!.y - (labelBox!.y + labelBox!.height), `label stays beside the box at ${width}px`).toBeLessThan(24);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await search.fill('ALOHA');
    await search.press('Enter');
    await expect(page).toHaveURL(/\/search\/\?q=ALOHA$/);
    await expect(page.locator('a[data-search-result]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('the contents index links every published article under its domain', async ({
    page,
  }) => {
    const main = await home(page);
    const contents = main.getByRole('region', { name: 'Contents' });
    await expect(contents).toHaveAttribute('id', 'contents');
    const rows = contents.locator('[data-contents-domain]');
    await expect(rows).toHaveCount(DOMAINS.length);
    for (const domain of DOMAINS) {
      const row = contents.locator(`[data-contents-domain="${domain}"]`);
      await expect(
        row.getByRole('link', { name: DOMAIN_META[domain].name, exact: true }),
      ).toHaveAttribute('href', new RegExp(`^/${domain}/?$`));
      const list = row.getByRole('list', {
        name: `${DOMAIN_META[domain].name} articles`,
      });
      const entries = await list.getByRole('listitem').evaluateAll((items) =>
        items.map((item) => ({
          links: [...item.querySelectorAll('a')].map((a) => ({
            href: a.getAttribute('href') ?? '',
            text: (a.textContent ?? '').trim(),
          })),
          text: (item.textContent ?? '').trim(),
          media: item.querySelectorAll('img, svg, picture, canvas').length,
        })),
      );
      const expected = publishedModules()
        .filter((entry) => entry.domain === domain)
        .map((entry) => ({ href: `/${domain}/${entry.slug}`, text: entry.title }));
      // A plain link: one anchor, nothing beside its title, no image.
      expect(
        entries.map((entry) => ({ href: trimSlash(entry.links[0]?.href ?? ''), text: entry.text })),
        `${domain} contents`,
      ).toEqual(expected);
      for (const entry of entries) {
        expect(entry.links).toHaveLength(1);
        expect(entry.media).toBe(0);
      }
    }
  });

  test('home links every article route in the sitemap, and no link on it leads to a missing page', async ({
    page,
  }) => {
    const sitemap = await (await page.request.get(`${BASE}/sitemap.xml`)).text();
    const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(([, route]) => route);
    const articles = routes.filter((route) => /^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(route));
    expect(articles.sort()).toEqual(
      publishedModules()
        .map((entry) => `/${entry.domain}/${entry.slug}/`)
        .sort(),
    );
    await home(page);
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => [
      ...new Set(anchors.map((a) => a.getAttribute('href') ?? '')),
    ]);
    for (const route of articles) expect(hrefs, route).toContain(route);
    const internal = hrefs.filter((href) => href.startsWith('/'));
    expect(internal.length).toBeGreaterThan(articles.length);
    for (const href of internal) {
      const response = await page.request.get(`${BASE}${href}`);
      expect(response.status(), href).toBe(200);
    }
  });

  test("starts the reader at the editor's four picks, each a title and a dek of 14 words or fewer", async ({
    page,
  }) => {
    expect(`${HOME_FEATURED_PICKS[0].domain}/${HOME_FEATURED_PICKS[0].slug}`).toBe('world-models/taxonomy');
    const main = await home(page);
    const start = main.getByRole('region', { name: 'Start here' });
    const entries = start.locator('[data-start-here]');
    await expect(entries).toHaveCount(4);
    for (const [index, pick] of HOME_FEATURED_PICKS.slice(0, 4).entries()) {
      const entry = entries.nth(index);
      const title = getModule(pick.domain, pick.slug)?.title ?? '';
      const link = entry.getByRole('heading', { level: 3 }).getByRole('link');
      await expect(link).toHaveText(title);
      await expect(link).toHaveAttribute('href', `/${pick.domain}/${pick.slug}/`);
      const dek = squash(await entry.locator('[data-featured-dek]').innerText());
      expect(dek).toBe(pick.dek);
      expect(words(dek).length).toBeLessThanOrEqual(FEATURED_DEK_MAX_WORDS);
      expect(FEATURED_DEK_MAX_WORDS).toBeLessThanOrEqual(14);
      expect(dek).not.toMatch(/\d/);
      // Words alone: the title is the entry's one link, and it has no picture.
      await expect(entry.getByRole('link')).toHaveCount(1);
      await expect(entry.locator('img, picture, svg')).toHaveCount(0);
    }
    const href = `/${HOME_FEATURED_PICKS[0].domain}/${HOME_FEATURED_PICKS[0].slug}/`;
    const response = await page.goto(`${BASE}${href}`);
    expect(response?.status(), href).toBe(200);
  });

  test('carries no scene and loads no 3D kit: the explainers are one text link with their count', async ({
    page,
  }) => {
    const kit: string[] = [];
    const scripts: string[] = [];
    page.on('response', async (response) => {
      if (!/\/_next\/static\/chunks\/.+\.js/.test(response.url())) return;
      scripts.push(response.url());
      const body = await response.text().catch(() => '');
      // three.js's renderer is the one module that carries this message; the
      // explainer viewer is the one that sets this hook.
      if (body.includes('THREE.WebGLRenderer') || body.includes('__explainer')) kit.push(response.url());
    });
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
    ] as const) {
      const main = await home(page, width, height);
      await page.waitForLoadState('networkidle');
      await expect(main.locator('[data-explainer-scene], [data-explainers], canvas, img, picture, video')).toHaveCount(0);
      // Scrolled to its end, the page has still asked for none of it.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForLoadState('networkidle');
      expect(scripts.length, `scripts loaded at ${width}px`).toBeGreaterThan(0);
      expect(kit, `3D kit or explainer viewer on home at ${width}px`).toEqual([]);
      expect(
        await page.evaluate(() => '__explainer' in window),
        `explainer hook at ${width}px`,
      ).toBe(false);
    }
    const links = page.locator('main a[href="/how-robots-work/"]');
    await expect(links).toHaveCount(1);
    await expect(links).toHaveText('How robots work');
    await expect(page.locator('main [data-also="how-robots-work"]')).toContainText(
      `${EXPLAINER_ORDER.length} short explainers you can turn in 3D.`,
    );
    const response = await page.goto(`${BASE}/how-robots-work/`);
    expect(response?.status()).toBe(200);
  });

  test('nothing on the page moves, with or without reduced motion', async ({
    page,
  }) => {
    for (const reducedMotion of ['reduce', 'no-preference'] as const) {
      await page.emulateMedia({ reducedMotion });
      await home(page);
      await page.waitForLoadState('networkidle');
      const moving = async () =>
        page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
      expect(await moving(), `animations on load, ${reducedMotion}`).toBe(0);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
      await page.waitForTimeout(300);
      expect(await moving(), `animations after scrolling, ${reducedMotion}`).toBe(0);
    }
  });

  test('"Also in the wiki" names the six parts that are not articles, each counted from its registry', async ({
    page,
    browser,
  }) => {
    // Six pages, each opened in a context of its own.
    test.setTimeout(60_000);
    const main = await home(page);
    const block = main.getByRole('region', { name: 'Also in the wiki' });
    const counts = homeCounts();
    // The first day of the developments as home writes a date, derived here
    // from the data and not from the page's own formatter.
    const [year, month, day] = DEVELOPMENTS_FROM.split('-').map(Number);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
      Date.UTC(year, month - 1, day),
    );
    const since = `${day} ${monthName} ${year}`;
    const entries = await block.locator('[data-also]').evaluateAll((items) =>
      items.map((item) => ({
        key: (item as HTMLElement).dataset.also ?? '',
        links: [...item.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? ''),
        title: (item.querySelector('h3')?.textContent ?? '').trim(),
        line: (item.querySelector('p')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        media: item.querySelectorAll('img, svg, picture, canvas').length,
      })),
    );
    expect(entries).toEqual([
      { key: 'now', links: ['/now/'], title: 'Robotics now', line: `${DEVELOPMENTS.length} developments since ${since}.`, media: 0 },
      { key: 'how-robots-work', links: ['/how-robots-work/'], title: 'How robots work', line: `${EXPLAINER_ORDER.length} short explainers you can turn in 3D.`, media: 0 },
      { key: 'market-map', links: ['/market-map/', ROUNDS_PAGE_PATH], title: 'Market map', line: `${COMPANIES.length} companies, with the sources behind each figure.`, media: 0 },
      { key: 'playground', links: ['/playground/'], title: 'Playground', line: 'Pose a small robot arm one joint at a time.', media: 0 },
      { key: 'glossary', links: ['/glossary/'], title: 'Glossary', line: `${GLOSSARY.length} terms, each defined with its sources.`, media: 0 },
      { key: 'a-z', links: ['/a-z/'], title: 'A to Z index', line: `All ${publishedModules().length} articles in one list.`, media: 0 },
    ]);
    expect(counts.explainers).toBe(EXPLAINER_ORDER.length);
    expect(counts.companies).toBe(COMPANIES.length);
    expect(counts.developments).toBe(DEVELOPMENTS.length);
    for (const entry of entries) expect(words(entry.line).length, entry.line).toBeLessThanOrEqual(10);
    // The market map's cell names the page under it on a second line: the
    // closed rounds and the days they cover, as that page's headline counts them.
    const facts = headlineFacts();
    const roundsLink = block.locator(`a[href="${ROUNDS_PAGE_PATH}"]`);
    await expect(roundsLink).toHaveCount(1);
    await expect(roundsLink).toHaveText('Recent rounds');
    expect(squash(await block.locator('[data-also="market-map"] > p').nth(1).innerText())).toBe(
      `Recent rounds: ${facts.closed} closed from ${readableSpan(facts.start, facts.end)}.`,
    );
    expect(counts.closedRounds).toBe(facts.closed);
    // Each link opens a real page with its own h1.
    const links = entries.flatMap((entry) => entry.links);
    expect(links).toHaveLength(7);
    await forEachInOwnContext(browser, links, async (entryPage, link) => {
      const response = await entryPage.goto(`${BASE}${link}`);
      expect(response?.status(), link).toBe(200);
      await expect(entryPage.getByRole('heading', { level: 1 })).toBeVisible();
    });
    // The rounds page's headline prints the count home gives.
    const roundsPage = await browser.newPage();
    await roundsPage.goto(`${BASE}${ROUNDS_PAGE_PATH}`);
    await expect(roundsPage.getByTestId('rounds-headline')).toContainText(
      `of the ${facts.closed} closed rounds`,
    );
    await roundsPage.close();
  });

  test('"How this wiki is made" holds three statements, each backed by a page, the repository or the correction form', async ({
    page,
  }) => {
    const main = await home(page);
    const block = main.getByRole('region', { name: 'How this wiki is made' });
    const statements = await block.locator('[data-made]').evaluateAll((items) =>
      items.map((item) => ({
        key: (item as HTMLElement).dataset.made ?? '',
        statement: (item.querySelector('.home-statement')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        links: [...item.querySelectorAll('a')].map((a) => ({
          text: (a.textContent ?? '').trim(),
          href: a.getAttribute('href') ?? '',
          rel: a.getAttribute('rel'),
        })),
      })),
    );
    expect(statements.map(({ key }) => key)).toEqual(['sources', 'licenses', 'corrections']);
    expect(statements.map(({ statement }) => statement)).toEqual([
      'Every number has a source.',
      'Text is CC BY 4.0, code is MIT.',
      'Corrections are welcome.',
    ]);
    expect(statements.flatMap(({ links }) => links)).toEqual([
      { text: 'Editorial policy', href: '/editorial-policy/', rel: null },
      { text: 'Credits', href: '/credits/', rel: null },
      { text: 'Source on GitHub', href: REPOSITORY_URL, rel: 'noopener' },
      { text: 'Report an error', href: CONTENT_CORRECTION_URL, rel: 'noopener' },
    ]);
    // The correction form is the template the repository ships.
    expect(CONTENT_CORRECTION_URL).toBe(`${REPOSITORY_URL}/issues/new?template=content-correction.yml`);
    expect(existsSync(join(process.cwd(), '.github', 'ISSUE_TEMPLATE', 'content-correction.yml'))).toBe(true);
    // The pages and the licence files say what the statements say.
    await page.goto(`${BASE}/editorial-policy/`);
    await expect(page.locator('main')).toContainText('Every number and non-obvious claim is cited to its primary source');
    await expect(page.locator('main')).toContainText('Corrections are welcome.');
    await page.goto(`${BASE}/credits/`);
    await expect(page.locator('main')).toContainText('licensed CC BY 4.0');
    expect(readFileSync(join(process.cwd(), 'LICENSE'), 'utf8')).toMatch(/^MIT License/);
    expect(readFileSync(join(process.cwd(), 'LICENSE-CONTENT'), 'utf8')).toContain('(CC BY 4.0)');
  });

  test('nothing overflows sideways and no count leaves its noun, from 320 to 1440 px', async ({
    page,
  }) => {
    await home(page, 320);
    const problems: string[] = [];
    for (let width = 320; width <= 1440; width += 4) {
      await page.setViewportSize({ width, height: 900 });
      problems.push(
        ...(await page.evaluate((at) => {
          const found: string[] = [];
          const overflow = document.documentElement.scrollWidth - window.innerWidth;
          if (overflow > 0) found.push(`${overflow}px of sideways scroll at ${at}px`);
          // A count and its noun stand on one line.
          for (const item of document.querySelectorAll('[data-home-counts] > span:not([aria-hidden])')) {
            const tops = new Set([...item.getClientRects()].map((rect) => Math.round(rect.top)));
            if (tops.size > 1) found.push(`"${item.textContent}" split at ${at}px`);
          }
          return found;
        }, width)),
      );
    }
    expect(problems).toEqual([]);
  });

  test('"Latest" lists the five latest changes, each dated as its JSON-LD states or as its editor note', async ({
    page,
    browser,
  }) => {
    const main = await home(page);
    const block = main.getByRole('region', { name: 'Latest' });
    const rows = await block.getByRole('listitem').evaluateAll((items) =>
      items.map((item) => ({
        date: item.querySelector('time')?.getAttribute('datetime') ?? '',
        printed: (item.querySelector('time')?.textContent ?? '').trim(),
        href: item.querySelector('a')?.getAttribute('href') ?? '',
        note: item.querySelector('[data-latest-note]')?.textContent ?? undefined,
      })),
    );
    const expected = latestChanges(5);
    expect(rows.map(({ date, href, note }) => ({ date, href, note }))).toEqual(
      expected.map((change) => ({ date: change.date, href: change.href, note: change.note })),
    );
    for (const row of rows) {
      expect(row.printed).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
      if (row.note) expect(words(row.note).length).toBeLessThanOrEqual(UPDATE_NOTE_MAX_WORDS);
    }
    const dates = rows.map(({ date }) => date);
    expect([...dates].sort().reverse()).toEqual(dates);
    // A row without a note is dated by git, as the article's JSON-LD is.
    await forEachInOwnContext(browser, rows.filter(({ note }) => !note), async (articlePage, row) => {
      await articlePage.goto(`${BASE}${row.href}`);
      const modified = await articlePage
        .locator('script[type="application/ld+json"]')
        .evaluateAll((scripts) =>
          scripts
            .map((script) => JSON.parse(script.textContent ?? '{}'))
            .flatMap((data) => (Array.isArray(data) ? data : [data]))
            .map((data) => data.dateModified)
            .filter(Boolean),
        );
      expect(modified, `${row.href} dateModified`).toContain(row.date);
    });
  });

  // Home prose is everything but article titles and navigation labels, and
  // it holds 250 words or fewer even with a full ten-word note on every
  // "Latest" row.
  test('<main> holds 250 words of prose or fewer beside article titles and navigation, and nothing drawn', async ({
    page,
  }) => {
    const main = await home(page);
    const counted = await main.evaluate((el) => {
      const count = (text: string) => text.split(/\s+/).filter(Boolean).length;
      let titles = 0;
      let navigation = 0;
      for (const a of el.querySelectorAll('a')) {
        const href = a.getAttribute('href') ?? '';
        if (/^\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(href)) titles += count((a as HTMLElement).innerText);
        else if (/^\/[a-z0-9-]+\/?$/.test(href)) navigation += count((a as HTMLElement).innerText);
      }
      const notes = [...el.querySelectorAll('[data-latest-note]')].reduce(
        (sum, note) => sum + count((note as HTMLElement).innerText),
        0,
      );
      return { prose: count((el as HTMLElement).innerText) - titles - navigation, notes };
    });
    const room = 5 * UPDATE_NOTE_MAX_WORDS - counted.notes;
    expect(counted.prose + room, `${counted.prose} words of prose, room for ${room} more in notes`).toBeLessThanOrEqual(250);

    // No picture, drawing, canvas or painted background anywhere in <main>:
    // the page is type on paper.
    const registered = Object.keys(DEVICE_REGISTRATION).map((id) => `device:${id}`);
    const graphics = await page.evaluate((deviceIds) => {
      const mainElement = document.querySelector('main');
      if (!mainElement) return [];
      return [...mainElement.querySelectorAll('*')]
        .filter((el) => {
          if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return false;
          const media = /^(img|svg|canvas|picture|video|iframe|object|embed)$/i.test(el.tagName);
          return media || getComputedStyle(el).backgroundImage !== 'none';
        })
        .map((el) => {
          const device = el.closest('[data-brand-device-id]');
          let kind = 'ornament';
          if (
            device &&
            deviceIds.includes(device.getAttribute('data-brand-device-id') ?? '') &&
            device.closest('[aria-hidden="true"]') &&
            getComputedStyle(device).pointerEvents === 'none'
          )
            kind = device.getAttribute('data-brand-device-id') ?? 'device';
          return { tag: el.tagName.toLowerCase(), kind };
        });
    }, registered);
    expect(graphics).toEqual([]);
    // The one brand highlight is still the masthead's source
    // count, set on the meta line in the page's own type instead of a
    // lime <mark>, so no <mark> and no fill remain in <main>.
    const highlight = main.locator('[data-brand-highlight]');
    await expect(highlight).toHaveCount(1);
    await expect(highlight).toHaveAttribute('data-brand-highlight', 'home-source-count');
    await expect(highlight).toHaveText(/^\d{1,3}(,\d{3})* sources$/);
    await expect(main.locator('mark')).toHaveCount(0);
    expect(await highlight.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  });

  test('home holds only the six front-page blocks and none of the removed texts', async ({
    page,
  }) => {
    const main = await home(page);
    const blocks = await main.locator(':scope > section').evaluateAll((sections) =>
      sections.map((section) => {
        const labelledBy = section.getAttribute('aria-labelledby');
        return (
          section.getAttribute('aria-label') ??
          (labelledBy ? document.getElementById(labelledBy)?.textContent ?? '' : '')
        ).trim();
      }),
    );
    expect(blocks).toEqual(HOME_BLOCKS);
    expect(await main.locator(':scope > :not(section)').count()).toBe(0);
    await expect(main.locator(':scope > section[data-pagefind-body]')).toHaveCount(HOME_BLOCKS.length);
    const text = await main.innerText();
    for (const removed of REMOVED_TEXTS) expect(text).not.toMatch(removed);
    await expect(main.getByRole('region', { name: 'Explore' })).toHaveCount(0);
  });

  test('/about/ holds the scope statement, the reading guide and the citation caveat', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE}/about/`);
    expect(response?.status()).toBe(200);
    const statement = page.locator('main [data-about-scope]');
    await expect(statement).toHaveCount(1);
    const text = squash(await statement.innerText());
    expect(words(text).length).toBeGreaterThanOrEqual(20);
    expect(words(text).length).toBeLessThanOrEqual(80);
    expect(
      DOMAINS.map((domain) => DOMAIN_META[domain].name).some((name) => text.includes(name)),
      'the statement names a sidebar domain',
    ).toBe(true);
    expect(text).toMatch(
      /\bout of scope\b|\bexclud\w*|\bdoes not (cover|include)\b|\bdoesn't (cover|include)\b/i,
    );
    expect(text).not.toMatch(/\brather than\b|\bnot an?\b/i);
    const style = await statement.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        transform: cs.textTransform,
        borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
      };
    });
    expect(style.transform).not.toBe('uppercase');
    expect(style.borders).toEqual(['0px', '0px', '0px', '0px']);

    const about = squash(await page.locator('main').innerText());
    // The caveats home no longer carries, each once.
    for (const moved of [
      /Technical claims trace to cited evidence\./g,
      /a citation tells you where a claim comes from/g,
      /the reading order is the contents order/g,
      /The one prerequisite is fluency in machine learning/g,
    ]) {
      expect(about.match(moved) ?? [], String(moved)).toHaveLength(1);
    }

    await page.goto(`${BASE}/`);
    const homeText = squash(await page.locator('main').innerText());
    expect(homeText).not.toContain(text.slice(0, 60));
  });
});
