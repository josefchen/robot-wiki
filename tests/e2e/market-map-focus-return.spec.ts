import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Focus return when a company's details close (VAL-B2-MAP-006,
 * VAL-MKT-010): whichever control opened the sheet, and however it closes,
 * keyboard focus lands back on that control, at desktop width (a side sheet
 * beside the map) and on a phone (a modal bottom sheet).
 *
 * The openers have no id, so focus is checked on the opener's own locator
 * rather than on document.activeElement.id. The bubble mark is named by its
 * company: at 375 px marks overlap, and the keyboard reaches each one.
 */

const ROUTE = '/market-map/';

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '375x812', width: 375, height: 812 },
] as const;

type Opener = {
  name: string;
  view: 'grid' | 'timeline' | 'bubble';
  id: string;
  company: string;
  locate: (page: Page) => Locator;
};

const OPENERS: Opener[] = [
  {
    name: 'grid tile',
    view: 'grid',
    id: 'skild-ai',
    company: 'Skild AI',
    locate: (page) => page.locator('button[data-map-tile="skild-ai"]'),
  },
  {
    name: 'timeline row',
    view: 'timeline',
    id: 'figure-ai',
    company: 'Figure AI',
    locate: (page) => page.locator('[data-company-id="figure-ai"] > button'),
  },
  {
    name: 'bubble mark',
    view: 'bubble',
    id: 'figure-ai',
    company: 'Figure AI',
    locate: (page) => page.locator('circle[data-company-id="figure-ai"]'),
  },
];

type Close = {
  name: string;
  close: (page: Page, company: string) => Promise<void>;
};

const CLOSES: Close[] = [
  {
    name: 'Escape',
    close: async (page) => {
      await page.keyboard.press('Escape');
    },
  },
  {
    name: 'the Close button',
    close: async (page, company) => {
      await page
        .getByRole('dialog', { name: company })
        .getByRole('button', { name: `Close ${company} details` })
        .click();
    },
  },
  {
    name: 'browser Back',
    close: async (page) => {
      await page.goBack();
    },
  },
];

/**
 * Focuses the opener and presses Enter. A key press that lands before
 * hydration does nothing, so retry until the details open; an open sheet
 * is never pressed again, because a second press on the same company
 * closes it.
 */
async function openWithKeyboard(page: Page, control: Locator) {
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    if ((await dialog.count()) === 0) {
      await control.focus();
      await expect(control).toBeFocused({ timeout: 1_000 });
      await page.keyboard.press('Enter');
    }
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

for (const viewport of VIEWPORTS) {
  test.describe(`focus return at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const opener of OPENERS) {
      for (const method of CLOSES) {
        test(`${opener.name} opened by keyboard, closed with ${method.name}, gets focus back (VAL-B2-MAP-006, VAL-MKT-010)`, async ({
          page,
        }) => {
          await page.goto(opener.view === 'grid' ? ROUTE : `${ROUTE}?view=${opener.view}`);
          await expect(page.getByText(/^\d+ of 111 companies$/)).toBeVisible();
          const control = opener.locate(page);
          await expect(control).toHaveCount(1);

          await openWithKeyboard(page, control);

          const details = page.getByRole('dialog', { name: opener.company });
          await expect(details).toBeVisible();
          await expect(page).toHaveURL(new RegExp(`#company-${opener.id}$`));
          await expect(details.locator('[data-company-detail]')).toHaveAttribute(
            'data-company-detail',
            opener.id,
          );
          // Opening moves focus into the sheet, to the company's heading.
          await expect(details.getByRole('heading', { level: 2, name: opener.company })).toBeFocused();
          if (viewport.width < 1024) {
            await expect(page.locator('[data-company-sheet="bottom"]')).toBeVisible();
          }

          await method.close(page, opener.company);

          await expect(page.getByRole('dialog')).toHaveCount(0);
          await expect(page).not.toHaveURL(/#company-/);
          await expect(control).toBeFocused();
          await expect(control).toHaveAttribute('aria-expanded', 'false');
        });
      }
    }
  });
}
