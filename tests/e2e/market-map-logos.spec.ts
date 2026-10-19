import { expect, test, type Page } from '@playwright/test';
import { companyLogoIds } from '../../data/logos';
import { WITHHELD_MARKS } from '../../lib/market-map-marks';

/**
 * Browser proof that market-map logos render, at a legible size, and that a
 * withheld file is never drawn. CONTRIBUTING requires e2e when a browser
 * can see the change; the component suite covers the fallbacks and the
 * unit suite the geometry, this spec covers what a reader actually sees on
 * the map and in the company details.
 */

const ROUTE = '/market-map/';

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
    await expect(nvidia.locator('img')).toHaveAttribute(
      'src',
      '/images/logos/nvidia.svg',
    );

    const boston = tileLogo(page, 'boston-dynamics');
    await expect(boston).toHaveAttribute('data-logo-state', 'image');
    await expect(boston.locator('img')).toHaveAttribute(
      'src',
      '/images/logos/boston-dynamics.svg',
    );
  });

  test('every drawn mark is at least 10 px high inside its plate', async ({ page }) => {
    await page.goto(ROUTE);
    const marks = await page.locator('button[data-map-tile] [data-logo-tile]').evaluateAll((tiles) =>
      tiles.map((tile) => {
        const box = tile.getBoundingClientRect();
        const style = getComputedStyle(tile);
        return {
          id: tile.getAttribute('data-company-logo'),
          // The plate's inner box: where the artwork is drawn.
          height: box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
          width: box.width,
          tileWidth: tile.closest('button')!.getBoundingClientRect().width,
        };
      }),
    );
    expect(marks).toHaveLength(companyLogoIds().length - Object.keys(WITHHELD_MARKS).length);
    const small = marks.filter((mark) => mark.height < 10).map((mark) => `${mark.id} ${mark.height}`);
    expect(small, 'marks drawn under 10 px high').toEqual([]);
    const spill = marks.filter((mark) => mark.width > mark.tileWidth).map((mark) => mark.id);
    expect(spill, 'plates wider than their tile').toEqual([]);
    // Apptronik's twelve-to-one wordmark drew 7 px high in the old tile.
    expect(marks.find((mark) => mark.id === 'apptronik')!.height).toBeGreaterThanOrEqual(10.5);
  });

  test('the padded Boston Dynamics file is drawn by its wordmark, not its box', async ({ page }) => {
    await page.goto(ROUTE);
    const facts = await tileLogo(page, 'boston-dynamics').evaluate((tile) => {
      const img = tile.querySelector('img')!;
      const t = tile.getBoundingClientRect();
      const i = img.getBoundingClientRect();
      return { tileHeight: t.height, imageHeight: i.height, above: t.top - i.top };
    });
    // The square file is far taller than its plate: its empty bands above
    // and below the wordmark (about three quarters of its height) fall
    // outside, and the wordmark fills the plate's 3 px-inset inner box.
    expect(facts.imageHeight).toBeGreaterThan((facts.tileHeight - 6) * 4);
    expect(facts.above).toBeGreaterThan(0);
  });

  test('a withheld file is never drawn: the name stands in and the details say why', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    for (const [logoId, company] of [
      ['nimble-robotics-logo', 'nimble-robotics'],
      ['assured-robot-intelligence-logo', 'assured-robot-intelligence'],
      ['farm-ng-logo', 'farm-ng'],
    ] as const) {
      expect(Object.keys(WITHHELD_MARKS)).toContain(logoId);
      await expect(tileLogo(page, company)).toHaveAttribute('data-logo-reason', 'withheld');
      await expect(page.locator(`button[data-map-tile="${company}"] img`)).toHaveCount(0);
    }
    await expect(page.locator('button[data-map-tile="nimble-robotics"]')).toContainText('Nimble');
    await expect(page.locator('img[src="/images/logos/nimble-robotics.svg"]')).toHaveCount(0);
    await page.locator('button[data-map-tile="nimble-robotics"]').click();
    const details = page.getByRole('dialog', { name: 'Nimble' });
    await expect(details.locator('img')).toHaveCount(0);
    await expect(details.locator('[data-logo-credit]')).toContainText('Logo not shown.');
    await expect(details.locator('[data-logo-credit]')).toContainText('Lisa Says Gah');
  });

  test('the details switch between two official marks', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Bubble' }).click();

    await page.locator('circle[data-company-id="figure-ai"]').click();
    await expect(page.locator('[data-company-detail]')).toContainText('Figure AI');
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page).locator('img')).toHaveAttribute(
      'src',
      '/images/logos/figure-ai.svg',
    );

    await page.locator('circle[data-company-id="skild-ai"]').click();
    await expect(page.locator('[data-company-detail]')).toContainText('Skild AI');
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page).locator('img')).toHaveAttribute(
      'src',
      '/images/logos/skild-ai.svg',
    );
    // The credit points at the mark's own record on /credits.
    await expect(page.locator('[data-logo-credit] a')).toHaveAttribute(
      'href',
      '/credits/#skild-ai-logo',
    );
  });

  test('a timeline row opens the details with the official mark', async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole('button', { name: 'Timeline' }).click();

    await page.locator('[data-timeline-id][data-company-id="figure-ai"] > button').click();
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page).locator('img')).toHaveAttribute(
      'src',
      '/images/logos/figure-ai.svg',
    );

    await page.locator('[data-timeline-id][data-company-id="skild-ai"] > button').click();
    await expect(detailLogo(page)).toHaveAttribute('data-logo-state', 'image');
    await expect(detailLogo(page).locator('img')).toHaveAttribute(
      'src',
      '/images/logos/skild-ai.svg',
    );
  });
});
