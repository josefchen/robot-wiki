import { expect, test, type Page } from '@playwright/test';
import { companyLogoIds, getCompanyLogo } from '../../data/logos';
import { BLOCK_FILL, WITHHELD_MARKS } from '../../lib/market-map-marks';

/**
 * Browser proof that market-map logos render plate-less in the one
 * secondary ink, at a legible size, and that a withheld file is never
 * drawn. CONTRIBUTING requires e2e when a browser can see the change; the
 * component suite covers the fallbacks and the unit suite the geometry,
 * this spec covers what a reader actually sees on the map and in the
 * company details.
 */

const ROUTE = '/market-map/';
/** --color-text-dim, the tile's secondary ink (app/globals.css). */
const INK = 'rgb(108, 107, 102)';

function tileLogo(page: Page, id: string) {
  return page.locator(`button[data-map-tile="${id}"] [data-company-logo]`);
}

function detailLogo(page: Page) {
  return page.locator('[data-company-detail] [data-company-logo]');
}

test.describe('market-map company logos', () => {
  test('map tiles render a real mark for licensed and official rows', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const nvidia = tileLogo(page, 'nvidia-robotics');
    await expect(nvidia).toHaveAttribute('data-logo-state', 'image');
    await expect(nvidia).toHaveAttribute('data-logo-src', '/images/logos/nvidia.svg');

    const boston = tileLogo(page, 'boston-dynamics');
    await expect(boston).toHaveAttribute('data-logo-state', 'image');
    await expect(boston).toHaveAttribute('data-logo-src', '/images/logos/boston-dynamics.svg');

    // Nimble's file showed another company's wordmark until 19 October
    // 2026; it is now the header mark of nimble.ai.
    const nimble = tileLogo(page, 'nimble-robotics');
    await expect(nimble).toHaveAttribute('data-logo-state', 'image');
    await expect(nimble).toHaveAttribute('data-logo-src', '/images/logos/nimble-robotics.svg');
    // Farm-ng's file was the Bonsai Robotics wordmark; it is now Farm-ng's
    // own mark, from the archived farm-ng.com.
    const farmNg = tileLogo(page, 'farm-ng');
    await expect(farmNg).toHaveAttribute('data-logo-state', 'image');
    await expect(farmNg).toHaveAttribute('data-logo-src', '/images/logos/farm-ng.svg');
    await expect(farmNg).toHaveAccessibleName('Farm-ng logo');
  });

  test('every mark is plate-less: no background, border, padding, filter or shadow, ink in the token', async ({ page }) => {
    await page.goto(ROUTE);
    const marks = await page.locator('button[data-map-tile] [data-logo-mark]').evaluateAll((els) =>
      els.map((el) => {
        const outer = getComputedStyle(el);
        const ink = el.querySelector('[data-logo-ink]')!;
        const inner = getComputedStyle(ink);
        return {
          id: el.getAttribute('data-company-logo'),
          plate: [outer.backgroundColor, outer.backgroundImage, outer.borderTopWidth, outer.borderRightWidth,
            outer.borderBottomWidth, outer.borderLeftWidth, outer.paddingTop, outer.paddingLeft,
            outer.filter, outer.boxShadow, outer.outlineStyle].join(' | '),
          ink: inner.backgroundColor,
          inkFilter: inner.filter,
          mask: inner.maskImage,
          img: el.querySelectorAll('img').length,
        };
      }),
    );
    expect(marks).toHaveLength(companyLogoIds().length - Object.keys(WITHHELD_MARKS).length);
    for (const mark of marks) {
      expect(mark.plate, `${mark.id} paints a plate`).toBe(
        'rgba(0, 0, 0, 0) | none | 0px | 0px | 0px | 0px | 0px | 0px | none | none | none',
      );
      expect(mark.ink, `${mark.id} ink`).toBe(INK);
      expect(mark.inkFilter, `${mark.id} filter`).toBe('none');
      expect(mark.mask, `${mark.id} mask`).toMatch(/^url\(".*\/images\/logos\/[\w.-]+"\)/);
      expect(mark.img, `${mark.id} paints its file`).toBe(0);
    }
  });

  test('every drawn mark lays down ink, and none is a block', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTE);
    await page.waitForLoadState('networkidle');
    // Read what the browser painted: each mark's box, screenshot alone,
    // counted for pixels the ink darkens. A blank mask lays down nothing; a
    // file with an opaque background, or a badge read by its colours,
    // paints its whole box.
    const ids = await page.locator('button[data-map-tile] [data-logo-mark]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-company-logo')!),
    );
    const fills: Array<[string, number]> = [];
    for (const id of ids) {
      const mark = tileLogo(page, id);
      await mark.scrollIntoViewIfNeeded();
      const shot = await mark.screenshot({ animations: 'disabled' });
      const fill = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext('2d')!;
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        // Paper is #FAFAF8 (250); full ink is 108. Fill is the mean coverage.
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += Math.min(1, Math.max(0, (250 - d[i + 1]) / (250 - 107)));
        return sum / (d.length / 4);
      }, shot.toString('base64'));
      fills.push([id, Math.round(fill * 1000) / 1000]);
    }
    expect(fills.length).toBeGreaterThan(100);
    expect(fills.filter(([, f]) => f < 0.02).map(([id, f]) => `${id} ${f}`), 'blank marks').toEqual([]);
    expect(fills.filter(([, f]) => f >= BLOCK_FILL).map(([id, f]) => `${id} ${f}`), 'block marks').toEqual([]);
  });

  test('every drawn mark is at least 10 px high and fits its tile', async ({ page }) => {
    await page.goto(ROUTE);
    const marks = await page.locator('button[data-map-tile] [data-logo-mark]').evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect();
        return {
          id: el.getAttribute('data-company-logo'),
          height: box.height,
          width: box.width,
          tileWidth: el.closest('button')!.getBoundingClientRect().width,
        };
      }),
    );
    expect(marks).toHaveLength(companyLogoIds().length - Object.keys(WITHHELD_MARKS).length);
    const small = marks.filter((mark) => mark.height < 10).map((mark) => `${mark.id} ${mark.height}`);
    expect(small, 'marks drawn under 10 px high').toEqual([]);
    const spill = marks.filter((mark) => mark.width > mark.tileWidth).map((mark) => mark.id);
    expect(spill, 'marks wider than their tile').toEqual([]);
    // Apptronik's twelve-to-one wordmark drew 7 px high in the old tile.
    expect(marks.find((mark) => mark.id === 'apptronik')!.height).toBeGreaterThanOrEqual(10.5);
  });

  test('the padded Boston Dynamics file is drawn by its wordmark, not its box', async ({ page }) => {
    await page.goto(ROUTE);
    const facts = await tileLogo(page, 'boston-dynamics').evaluate((mark) => {
      const ink = mark.querySelector('[data-logo-ink]')!;
      const t = mark.getBoundingClientRect();
      const i = ink.getBoundingClientRect();
      return { markHeight: t.height, inkHeight: i.height, above: t.top - i.top };
    });
    // The square file is far taller than its mark: its empty bands above
    // and below the wordmark (about three quarters of its height) fall
    // outside, and the wordmark fills the mark's box.
    expect(facts.inkHeight).toBeGreaterThan(facts.markHeight * 4);
    expect(facts.above).toBeGreaterThan(0);
  });

  test('a withheld file is never drawn: the name stands in and the details say why', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    expect(Object.keys(WITHHELD_MARKS).sort()).toEqual(['assured-robot-intelligence-logo']);
    for (const [logoId, company] of [
      ['assured-robot-intelligence-logo', 'assured-robot-intelligence'],
    ] as const) {
      await expect(tileLogo(page, company)).toHaveAttribute('data-logo-reason', 'withheld');
      await expect(page.locator(`button[data-map-tile="${company}"] [data-logo-mark]`)).toHaveCount(0);
      await expect(page.locator(`[data-logo-src="${getCompanyLogo(logoId)!.file}"]`)).toHaveCount(0);
    }
    await expect(page.locator('button[data-map-tile="assured-robot-intelligence"]')).toContainText('Assured Robot');
    await page.locator('button[data-map-tile="assured-robot-intelligence"]').click();
    const details = page.getByRole('dialog', { name: 'Assured Robot Intelligence' });
    await expect(details.locator('[data-logo-mark], img')).toHaveCount(0);
    await expect(details.locator('[data-logo-credit]')).toContainText('Logo not shown.');
    await expect(details.locator('[data-logo-credit]')).toContainText('ari.bot');
  });

  test('the details switch between two official marks', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Bubble' }).click();

    await page.locator('circle[data-company-id="figure-ai"]').click();
    await expect(page.locator('[data-company-detail]')).toContainText('Figure AI');
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page)).toHaveAttribute('data-logo-src', '/images/logos/figure-ai.svg');
    await expect(detailLogo(page)).toHaveAccessibleName('Figure AI logo');

    // The second mark was Skild AI's until the 2026-10-19 field audit cut
    // its valuation (TechCrunch gives only "more than $14 billion") and it
    // has no stated total, so it no longer plots. Boston Dynamics plots from
    // the $1.1B valuation in Hyundai's completion release.
    await page.locator('circle[data-company-id="boston-dynamics"]').click();
    await expect(page.locator('[data-company-detail]')).toContainText('Boston Dynamics');
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page)).toHaveAttribute(
      'data-logo-src',
      '/images/logos/boston-dynamics.svg',
    );
    // The credit points at the mark's own record on /credits.
    await expect(page.locator('[data-logo-credit] a')).toHaveAttribute(
      'href',
      '/credits/#boston-dynamics-logo',
    );
  });

  test('a timeline row opens the details with the official mark', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Timeline' }).click();

    await page.locator('[data-timeline-id][data-company-id="figure-ai"] > button').click();
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page)).toHaveAttribute('data-logo-src', '/images/logos/figure-ai.svg');

    await page.locator('[data-timeline-id][data-company-id="skild-ai"] > button').click();
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page)).toHaveAttribute('data-logo-src', '/images/logos/skild-ai.svg');
  });
});
