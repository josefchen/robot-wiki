import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPLAINER_ORDER } from '../../components/explainers/catalog';
import { HOME_FEATURED_PICKS, HOME_FEATURED_SCENE } from '../../data/home-featured';
import { DOMAINS, DOMAIN_META, getModule, publishedModules } from '../../data/modules';
import { recentlyUpdated } from '../../lib/content-dates';
import {
  FEATURED_DEK_MAX_WORDS,
  HOME_ROTATING_WORDS,
  longestRecentListWords,
} from '../../lib/featured-article';
import { homeCounts } from '../../lib/home-counts';
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
 * The featured scene's interaction and the tools line are measured by
 * brand-v2-home-tools.spec.ts (VAL-OPUS-017, VAL-OPUS-020); this file holds
 * the scene's served poster, its lazy load and its links.
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

/** The seven blocks VAL-OPUS-022 permits in <main>, in order. */
const HOME_BLOCKS = [
  'Introduction',
  'Contents',
  'Featured article',
  'Featured scene',
  'Did you know',
  'Recently updated',
  'Tools',
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
    const printed = squash(await page.locator('[data-home-counts]').innerText());
    expect(printed).toBe(
      `${counts.articles} articles ${counts.sources} sources ${counts.glossaryTerms} glossary terms`,
    );
    expect(counts.articles).toBe(publishedModules().length);

    const introText = await page
      .getByRole('region', { name: 'Introduction' })
      .innerText();
    expect(introText).not.toMatch(/[\u2013\u2014]/);

    const search = page.getByRole('searchbox', {
      name: 'Search articles, sources and glossary terms',
    });
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
  test("features the editor's first pick with its home dek of 25 words or fewer (VAL-OPUS-016)", async ({
    page,
  }) => {
    const pick = HOME_FEATURED_PICKS[0];
    expect(`${pick.domain}/${pick.slug}`).toBe('world-models/taxonomy');
    const main = await home(page);
    const featured = main.getByRole('region', { name: 'Featured article' });
    const links = featured.getByRole('link');
    await expect(links).toHaveCount(1);
    const href = (await links.first().getAttribute('href')) ?? '';
    expect(href).toBe(`/${pick.domain}/${pick.slug}/`);
    const title = getModule(pick.domain, pick.slug)?.title ?? '';
    expect(squash(await links.first().innerText())).toBe(title);
    const dek = squash(await featured.locator('[data-featured-dek]').innerText());
    expect(dek).toBe(pick.dek);
    expect(words(dek).length).toBeGreaterThan(5);
    expect(words(dek).length).toBeLessThanOrEqual(FEATURED_DEK_MAX_WORDS);
    expect(FEATURED_DEK_MAX_WORDS).toBeLessThanOrEqual(50);
    expect(dek).not.toMatch(/\d/);
    const response = await page.goto(`${BASE}${href}`);
    expect(response?.status(), href).toBe(200);
    await expect(page.locator('main h1').first()).toHaveText(title);
  });

  test('features the humanoid explainer on its poster and loads no 3D kit until the reader starts it (VAL-OPUS-017)', async ({
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
      const scene = main.getByRole('region', { name: 'Featured scene' });
      const frame = scene.getByRole('group', { name: '3D explainer: Inside a humanoid' });
      await expect(frame).toHaveAttribute('data-explainer-scene', HOME_FEATURED_SCENE.explainer);
      await expect(scene.locator('#featured-scene-caption')).toHaveText(HOME_FEATURED_SCENE.caption);
      expect(words(HOME_FEATURED_SCENE.caption).length).toBeLessThanOrEqual(25);
      const poster = frame.locator('[data-x="poster"]');
      await expect(poster).toBeVisible();
      await expect(poster).toHaveAttribute('src', '/explainers/posters/humanoid.webp');
      expect(await poster.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
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

    const links = page.getByRole('region', { name: 'Featured scene' }).getByRole('link');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText(`All ${EXPLAINER_ORDER.length} explainers in How robots work`);
    await expect(links.nth(0)).toHaveAttribute('href', '/how-robots-work/');
    await expect(links.nth(1)).toHaveText(
      getModule(HOME_FEATURED_SCENE.related.domain, HOME_FEATURED_SCENE.related.slug)?.title ?? '',
    );
    await expect(links.nth(1)).toHaveAttribute(
      'href',
      `/${HOME_FEATURED_SCENE.related.domain}/${HOME_FEATURED_SCENE.related.slug}/`,
    );
  });

  test('keeps the featured scene still under reduced motion until the reader starts it', async ({
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

  test('"Recently updated" lists the five latest dated changes, each dated as its JSON-LD states (VAL-OPUS-019)', async ({
    page,
    browser,
  }) => {
    const main = await home(page);
    const block = main.getByRole('region', { name: 'Recently updated' });
    const rows = await block.getByRole('listitem').evaluateAll((items) =>
      items.map((item) => ({
        date: item.querySelector('time')?.getAttribute('datetime') ?? '',
        href: item.querySelector('a')?.getAttribute('href') ?? '',
      })),
    );
    const expected = recentlyUpdated(publishedModules(), 5).map((entry) => ({
      date: entry.dateModified,
      href: `/${entry.domain}/${entry.slug}/`,
    }));
    expect(rows).toEqual(expected);
    const dates = rows.map(({ date }) => date);
    expect([...dates].sort().reverse()).toEqual(dates);
    await forEachInOwnContext(browser, rows, async (articlePage, row) => {
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

  test('<main> holds 250 words or fewer beside the contents titles, and no ornament (VAL-OPUS-021)', async ({
    page,
  }) => {
    const main = await home(page);
    const total = words(await main.innerText()).length;
    const runs = main
      .getByRole('region', { name: 'Contents' })
      .locator('ul[aria-label$=" articles"]');
    const titles = await runs.locator('a').allInnerTexts();
    const titleWords = titles.reduce((sum, title) => sum + words(title).length, 0);
    expect(titles).toHaveLength(publishedModules().length);
    // Subtracting the titles is exact only while each title stays a run of
    // its own words; two titles set flush read as one word to innerText.
    expect((await runs.allInnerTexts()).flatMap(words)).toEqual(titles.flatMap(words));
    const counted = total - titleWords;
    expect(counted, `${total} words, ${titleWords} of them contents titles`).toBeLessThanOrEqual(250);

    // "Recently updated" changes with each content commit and the featured
    // pick with an edit to its list. They share HOME_ROTATING_WORDS, which
    // holds every pick beside the five longest titles an update could print,
    // and the rest of <main> leaves that share free, so no content commit
    // breaks the budget.
    const featured = main.getByRole('region', { name: 'Featured article' });
    const recentList = words(
      await main.getByRole('region', { name: 'Recently updated' }).getByRole('list').innerText(),
    ).length;
    const rotating =
      words(await featured.getByRole('link').innerText()).length +
      words(await featured.locator('[data-featured-dek]').innerText()).length +
      recentList;
    expect(rotating).toBeLessThanOrEqual(HOME_ROTATING_WORDS);
    expect(rotating - recentList + longestRecentListWords()).toBeLessThanOrEqual(HOME_ROTATING_WORDS);
    expect(counted - rotating + HOME_ROTATING_WORDS, 'the fixed blocks with the rotating share').toBeLessThanOrEqual(250);

    const registered = (
      JSON.parse(
        readFileSync(join(process.cwd(), 'contract/brand-v2-registries.json'), 'utf8'),
      ) as { gridDevices: Array<{ id: string }> }
    ).gridDevices.map(({ id }) => id);
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
    await expect(main.locator('mark[data-brand-highlight]')).toHaveCount(1);
  });

  test('home holds only the seven front-page blocks and none of the removed texts (VAL-OPUS-022)', async ({
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
