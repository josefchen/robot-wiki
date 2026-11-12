import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EXPLAINER_ORDER } from '../../components/explainers/catalog';
import { DEVICE_REGISTRATION } from '../../components/ui/brand-device';
import { HOME_FEATURED_PICKS, HOME_FEATURED_SCENE } from '../../data/home-featured';
import { DOMAINS, DOMAIN_META, getModule, publishedModules } from '../../data/modules';
import { FEATURED_DEK_MAX_WORDS } from '../../lib/featured-article';
import { homeCounts } from '../../lib/home-counts';
import { UPDATE_NOTE_MAX_WORDS, latestChanges } from '../../lib/home-updates';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';
import { forEachInOwnContext } from './helpers/per-route-context';
import {
  startStaticExportServer,
  type StaticExportServer,
} from './static-export-server';

/**
 * The encyclopedia front page (contract/opus-pass.md, VAL-OPUS-014 to 022)
 * and the /about/ page that took home's scope statement and reading guide
 * (VAL-WIKI-028). Served from the static export, because the counts, the
 * featured pick and the dates are fixed when the page is built.
 *
 * Owner-approved successor (Josef, 12 November 2026, the home redesign):
 * the humanoid scene moved into the first screen beside the name, the one
 * featured article became four "Start here" entries with pictures, "Recently
 * updated" became "Latest" with readable dates and editor notes, and the
 * tools line became "Explore" with a picture each. Every pin below moved to
 * the new block at the same strength.
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

/** The six blocks VAL-OPUS-022 permits in <main>, in order. */
const HOME_BLOCKS = [
  'Introduction',
  'Start here',
  'Latest',
  'Contents',
  'Did you know',
  'Explore',
];

/** Texts the 01:25 addendum removed from home. */
const REMOVED_TEXTS = [
  /a citation is not a guarantee of verification/i,
  /the centre of gravity is robot learning/i,
  /how to read this wiki/i,
  /encyclopedia of modern robotics/i,
  /learning paths/i,
];

async function home(page: Page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/`);
  await page.evaluate(() => document.fonts.ready);
  return page.locator('main');
}

test.describe('home front page', () => {
  test('opens with the identity line, registry counts and a search box that finds results (VAL-OPUS-014)', async ({
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
      `${counts.articles} articles · ${counts.sources} sources · ${counts.glossaryTerms} glossary terms`,
    );
    const separators = page.locator('[data-home-counts] > [aria-hidden="true"]');
    await expect(separators).toHaveCount(2);
    for (const text of await separators.allInnerTexts()) expect(text.trim()).toBe('·');
    expect(counts.articles).toBe(publishedModules().length);

    const introText = await page
      .getByRole('region', { name: 'Introduction' })
      .innerText();
    expect(introText).not.toMatch(/[\u2013\u2014]/);

    const search = page.getByRole('searchbox', {
      name: 'Search articles, sources and glossary',
    });
    // VAL-B2-COMP-004: the name is a persistent visible label, kept beside
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

  test('the contents index links every published article under its domain (VAL-OPUS-015)', async ({
    page,
  }) => {
    const main = await home(page);
    const contents = main.getByRole('region', { name: 'Contents' });
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
  test("starts the reader at the editor's four picks, each with its picture and a dek of 14 words or fewer (VAL-OPUS-016)", async ({
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
      // A real picture, sized before it loads, so nothing shifts.
      const img = entry.getByRole('img');
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('width', /\d+/);
      await expect(img).toHaveAttribute('height', /\d+/);
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(entry.locator('[data-image-credit] a')).toHaveCount(2);
    }
    const href = `/${HOME_FEATURED_PICKS[0].domain}/${HOME_FEATURED_PICKS[0].slug}/`;
    const response = await page.goto(`${BASE}${href}`);
    expect(response?.status(), href).toBe(200);
  });

  test('sets the humanoid explainer beside the name on its poster and loads no 3D kit until the reader starts it (VAL-OPUS-017)', async ({
    page,
  }) => {
    const scripts: string[] = [];
    page.on('response', async (response) => {
      if (!/\/_next\/static\/chunks\/.+\.js/.test(response.url())) return;
      const body = await response.text().catch(() => '');
      // three.js's renderer is the one module that carries this message.
      if (body.includes('THREE.WebGLRenderer')) scripts.push(response.url());
    });
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
    ] as const) {
      const main = await home(page, width, height);
      await page.waitForLoadState('networkidle');
      const intro = main.getByRole('region', { name: 'Introduction' });
      const frame = intro.getByRole('group', { name: '3D explainer: Inside a humanoid' });
      await expect(frame).toHaveAttribute('data-explainer-scene', HOME_FEATURED_SCENE.explainer);
      const poster = frame.locator('[data-x="poster"]');
      await expect(poster).toBeVisible();
      await expect(poster).toHaveAttribute('src', '/explainers/posters/humanoid.webp');
      expect(await poster.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      // The poster shows in the first screen at both widths.
      const box = await poster.boundingBox();
      expect(box!.y, `poster in the first screen at ${width}px`).toBeLessThan(height - 150);
      await expect(frame.locator('canvas')).toHaveCount(0);
      const start = frame.getByRole('button', { name: HOME_FEATURED_SCENE.startLabel });
      await expect(start).toBeVisible();
      expect(scripts, `three.js before the reader starts the scene at ${width}px`).toEqual([]);
    }

    // The reader's tap loads the kit and brings the same scene to life.
    const frame = page.getByRole('group', { name: '3D explainer: Inside a humanoid' });
    await frame.getByRole('button', { name: HOME_FEATURED_SCENE.startLabel }).click();
    await page.waitForFunction(
      () => (window as unknown as { __explainer?: { id: string; live: boolean } }).__explainer?.live === true,
      undefined,
      { timeout: 45_000 },
    );
    expect(await page.evaluate(() => (window as unknown as { __explainer: { id: string } }).__explainer.id)).toBe('humanoid');
    await expect(frame.locator('canvas')).toBeVisible();
    await expect(frame.locator('[data-x="poster"]')).toBeHidden();
    expect(scripts.length, 'three.js once the reader starts the scene').toBeGreaterThan(0);

    const links = frame.getByRole('link');
    await expect(links).toHaveCount(1);
    await expect(links.nth(0)).toHaveText(`All ${EXPLAINER_ORDER.length} explainers in How robots work`);
    await expect(links.nth(0)).toHaveAttribute('href', '/how-robots-work/');
  });

  test('keeps the scene still under reduced motion until the reader starts it', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await home(page);
    await page.waitForLoadState('networkidle');
    const frame = page.getByRole('group', { name: '3D explainer: Inside a humanoid' });
    await frame.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_000);
    await expect(frame.locator('[data-x="poster"]')).toBeVisible();
    await expect(frame.locator('canvas')).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as unknown as { __explainer?: { live: boolean } }).__explainer?.live),
    ).toBe(false);
    // And the page itself runs no animation.
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  });

  test('"Did you know" holds three short facts, each cited and linked to the article that states it (VAL-OPUS-018)', async ({
    page,
    browser,
  }) => {
    const main = await home(page);
    const block = main.getByRole('region', { name: 'Did you know' });
    const facts = await block.locator('[data-did-you-know]').evaluateAll((items) =>
      items.map((item) => {
        const anchors = [...item.querySelectorAll('a')];
        return {
          // Rendered text, so the chip's label counts and its closed source
          // card (display: none until hover or focus) does not.
          text: (item as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
          article: anchors[0]?.getAttribute('href') ?? '',
          source: anchors.at(-1)?.getAttribute('href') ?? '',
        };
      }),
    );
    expect(facts).toHaveLength(3);
    for (const fact of facts) {
      expect(words(fact.text).length, fact.text).toBeLessThanOrEqual(20);
      expect(fact.article).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+\/?$/);
      expect(fact.source).toMatch(/^https?:\/\//);
    }
    // The article cites the same source the fact does.
    await forEachInOwnContext(browser, facts, async (articlePage, fact) => {
      await articlePage.goto(`${BASE}${fact.article}`);
      expect(
        await articlePage.locator(`main a[href="${fact.source}"]`).count(),
        `${fact.article} cites ${fact.source}`,
      ).toBeGreaterThan(0);
    });
  });

  test('no citation chip in "Did you know" opens a line of its own, from 320 to 1440 px', async ({
    page,
  }) => {
    const facts = (await home(page, 320)).locator('[data-did-you-know]');
    await expect(facts).toHaveCount(3);
    const alone: string[] = [];
    for (let width = 320; width <= 1440; width += 4) {
      await page.setViewportSize({ width, height: 900 });
      alone.push(
        ...(await facts.evaluateAll(
          (items, at) =>
            items.flatMap((item) => {
              const chip = item.querySelector('[data-cite-id]')!.getBoundingClientRect();
              // A chip that opens a line has nothing of its fact to its left.
              return chip.left <= item.getBoundingClientRect().left + 1
                ? [`${(item as HTMLElement).dataset.didYouKnow} at ${at}px`]
                : [];
            }),
          width,
        )),
      );
    }
    expect(alone).toEqual([]);
  });

  test('"Latest" lists the five latest changes, each dated as its JSON-LD states or as its editor note (VAL-OPUS-019)', async ({
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

  // Owner-approved successor (Josef, 12 November 2026, the home redesign):
  // home prose is everything but article titles, the three facts and
  // navigation labels, and it holds 250 words or fewer even with a full
  // ten-word note on every "Latest" row.
  test('<main> holds 250 words of prose or fewer beside article titles, facts and navigation, and no ornament (VAL-OPUS-021)', async ({
    page,
  }) => {
    const main = await home(page);
    const counted = await main.evaluate((el) => {
      const count = (text: string) => text.split(/\s+/).filter(Boolean).length;
      let titles = 0;
      let facts = 0;
      let navigation = 0;
      for (const a of el.querySelectorAll('a')) {
        if (a.closest('[data-did-you-know]')) continue;
        const href = a.getAttribute('href') ?? '';
        if (/^\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(href)) titles += count((a as HTMLElement).innerText);
        else if (/^\/[a-z0-9-]+\/?$/.test(href)) navigation += count((a as HTMLElement).innerText);
      }
      for (const fact of el.querySelectorAll('[data-did-you-know]')) facts += count((fact as HTMLElement).innerText);
      const notes = [...el.querySelectorAll('[data-latest-note]')].reduce(
        (sum, note) => sum + count((note as HTMLElement).innerText),
        0,
      );
      return { prose: count((el as HTMLElement).innerText) - titles - facts - navigation, notes };
    });
    const room = 5 * UPDATE_NOTE_MAX_WORDS - counted.notes;
    expect(counted.prose + room, `${counted.prose} words of prose, room for ${room} more in notes`).toBeLessThanOrEqual(250);

    const registered = Object.keys(DEVICE_REGISTRATION);
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
          const control = el.closest('form');
          let kind = 'ornament';
          if (el.closest('[data-motion-scene], [data-explainer-scene]')) kind = 'featured-scene';
          else if (el.matches('img[data-image-id]') && el.closest('[data-start-here]')) kind = 'article-picture';
          else if (el.matches('img') && el.closest('[data-explore]')) kind = 'explore-picture';
          else if (control && control.getAttribute('aria-label')) kind = 'form-control-icon';
          else if (
            device &&
            deviceIds.includes(device.getAttribute('data-brand-device-id') ?? '') &&
            device.closest('[aria-hidden="true"]') &&
            getComputedStyle(device).pointerEvents === 'none'
          )
            kind = device.getAttribute('data-brand-device-id') ?? 'device';
          return { tag: el.tagName.toLowerCase(), kind };
        });
    }, registered);
    expect(graphics.filter(({ kind }) => kind === 'ornament')).toEqual([]);
    expect(graphics.some(({ kind }) => kind === 'featured-scene')).toBe(true);
    expect(graphics.filter(({ kind }) => kind === 'article-picture')).toHaveLength(4);
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the one brand highlight is still the masthead's source
    // count, now set on the meta line in the page's own type instead of a
    // lime <mark>, so no <mark> and no fill remain in <main>.
    const highlight = main.locator('[data-brand-highlight]');
    await expect(highlight).toHaveCount(1);
    await expect(highlight).toHaveAttribute('data-brand-highlight', 'home-source-count');
    await expect(highlight).toHaveText(/^\d+ sources$/);
    await expect(main.locator('mark')).toHaveCount(0);
    expect(await highlight.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  });

  test('home holds only the six front-page blocks and none of the removed texts (VAL-OPUS-022)', async ({
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
    const text = await main.innerText();
    for (const removed of REMOVED_TEXTS) expect(text).not.toMatch(removed);
  });

  test('/about/ holds the scope statement, the reading guide and the citation caveat (VAL-WIKI-028, VAL-OPUS-022)', async ({
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
