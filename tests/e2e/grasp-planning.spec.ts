import { expect, type Page } from '@playwright/test';
import { test } from './grasp-reader-fixture';
import AxeBuilder from '@axe-core/playwright';
import {
  CONTACT_POSITION_MAX,
  CONTACT_POSITION_MIN,
  CONTACT_POSITION_STEP,
  DEFAULT_CONTACTS,
} from '@/lib/grasp';
import {
  contactGridIndex,
  offsetContactGridValue,
} from '../helpers/grasp-contact-grid';
import { setHydratedSlider as setSlider, waitForHydration } from './interaction-ready';
import { citedSourceCount, leadWords, MAX_LEAD_WORDS, MIN_CITED_SOURCES } from './helpers/brevity-bar';
import { openAdjustMore, openHowThisWasMade } from './helpers/figure-fold';

const ROUTE = '/classical/grasp-planning/';

/**
 * The lab's main view is the fingers on the box, the Surface slider and the
 * stage note; the contact sliders, Add, Remove, Reset and the wrench-space
 * plot sit in "Adjust more", and the readouts in "How this was made".
 */
const labFrame = (page: Page) => page.locator('[data-figure-frame="grasp-wrench-lab"]');

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * The article's visible text. KaTeX keeps the original TeX source inside a
 * screen-reader MathML annotation (.katex-mathml), which textContent would
 * include; raw-math checks must exclude those annotations to test what a
 * user actually sees.
 */
async function visibleArticleText(page: Page): Promise<string> {
  return page.locator('#main-content').evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    for (const node of Array.from(clone.querySelectorAll('.katex-mathml'))) {
      node.remove();
    }
    return clone.textContent ?? '';
  });
}

async function readout(page: Page, id: string): Promise<string> {
  return (await page.getByTestId(id).textContent()) ?? '';
}

async function expectDefaultContacts(page: Page): Promise<void> {
  for (let i = 0; i < DEFAULT_CONTACTS.length; i += 1) {
    const contactNumber = i + 1;
    const slider = page.getByRole('slider', {
      name: new RegExp(`contact ${contactNumber} position`, 'i'),
    });
    await expect(
      page.getByTestId(`grasp-contact-${contactNumber}-value`),
    ).toHaveText(DEFAULT_CONTACTS[i].toFixed(3));
    await expect(slider).toHaveAttribute(
      'min',
      String(CONTACT_POSITION_MIN),
    );
    await expect(slider).toHaveAttribute(
      'max',
      String(CONTACT_POSITION_MAX),
    );
    await expect(slider).toHaveAttribute(
      'step',
      String(CONTACT_POSITION_STEP),
    );
    await expect(slider).toHaveValue(String(DEFAULT_CONTACTS[i]));
  }
}

test.describe('classical grasp-planning module', () => {
  test('renders full prose on contact mechanics, quality metrics, and force closure (VAL-CLASS-026)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Grasp Planning' }),
    ).toBeVisible();

    // The same current-route assertion applies to the real responsive surface.
    const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true });
    const mobile = await menu.isVisible();
    if (mobile) await menu.click();
    const nav = mobile
      ? page.getByRole('dialog', { name: 'Site navigation' })
      : page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(nav).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'Grasp Planning', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    if (mobile) {
      await page.getByRole('button', { name: 'Close navigation menu', exact: true }).click();
      await expect(nav).not.toBeVisible();
    }

    const main = page.locator('#main-content');
    // The required strands are all present as rendered prose. The glossary
    // <Term> markup duplicates its text into a hidden tooltip, so match the
    // VISIBLE copy, not the first DOM hit.
    await expect(
      main.getByText(/friction cone/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/Coulomb/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/force closure/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/form closure/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/antipodal/i).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      main.getByText(/Ferrari and Canny/i).filter({ visible: true }).first(),
    ).toBeVisible();

    // Brevity bar: at least 30 distinct cited sources and a lead of 60 words or fewer.
    const visibleText = await visibleArticleText(page);
    expect(await citedSourceCount(page)).toBeGreaterThanOrEqual(MIN_CITED_SOURCES);
    expect(leadWords('classical/grasp-planning')).toBeLessThanOrEqual(MAX_LEAD_WORDS);

    // No raw MDX or component source leaks into the rendered page.
    expect(visibleText).not.toContain('import {');
    expect(visibleText).not.toContain('<Cite');
    expect(visibleText).not.toContain('<GraspWrenchLab');
    expect(errors).toEqual([]);
  });

  test('citation chips resolve and link externally (VAL-CLASS-027, VAL-CLASS-028)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');

    // Primary sources for the main strands, each with its exact href.
    await expect(
      main.getByRole('link', { name: 'Nguyen 1988' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/027836498800700301');
    await expect(
      main.getByRole('link', { name: 'Ferrari et al. 1992' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/ROBOT.1992.219918');
    await expect(
      main.getByRole('link', { name: 'Murray et al. 1994' }).first(),
    ).toHaveAttribute(
      'href',
      'https://www.cds.caltech.edu/~murray/books/MLS/pdf/mls94-complete.pdf',
    );
    await expect(
      main.getByRole('link', { name: 'Mishra et al. 1987' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1007/BF01840373');
    await expect(
      main.getByRole('link', { name: 'Markenscoff et al. 1990' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1177/027836499000900102');
    await expect(
      main.getByRole('link', { name: 'Cutkosky 1989' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/70.34763');
    await expect(
      main.getByRole('link', { name: 'Bicchi et al. 2000' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1109/ROBOT.2000.844081');
    await expect(
      main.getByRole('link', { name: 'Prattichizzo et al. 2016' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1007/978-3-319-32552-1_38');
    await expect(
      main.getByRole('link', { name: 'Roa et al. 2015' }).first(),
    ).toHaveAttribute('href', 'https://doi.org/10.1007/s10514-014-9402-3');
    await expect(
      main.getByRole('link', { name: 'Mahler et al. 2017' }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/1703.09312');

    // Every chip is a real external link; no unresolved ids render.
    // Scoped to the authored prose: the generated References bibliography
    // also renders target=_blank external links inside main, and its 10
    // registry anchors carried 10 of the 21 chips this floor counted
    // (the same partial masking the datasets fix addressed).
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[target="_blank"][href^="https://"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(11);
    expect(await main.getByText('missing citation:').count()).toBe(0);

    // A chip is keyboard-focusable and reveals its metadata on focus. The
    // source is cited several times on the page, so scope the tooltip to
    // the focused chip's own group (the tooltip is its following sibling).
    const nguyenChip = main.getByRole('link', { name: 'Nguyen 1988' }).first();
    await nguyenChip.focus();
    const tooltip = nguyenChip.locator(
      'xpath=../following-sibling::span[@role="tooltip"]',
    );
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Force-Closure');
  });

  test('KaTeX renders with no raw math delimiters (VAL-CLASS-029)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    // Coulomb cone bound, the wrench stack, the hull construction, the
    // strict-interior closure condition, and the epsilon metric all ship
    // as rendered KaTeX.
    expect(await page.locator('.katex').count()).toBeGreaterThan(8);
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(
      5,
    );

    const visibleText = await visibleArticleText(page);
    expect(visibleText).not.toContain('$$');
    expect(visibleText).not.toContain('\\operatorname');
    expect(visibleText).not.toContain('\\varepsilon');
    expect(visibleText).not.toContain('\\arctan');
  });

  test('wrench-space lab renders both views, controls, and readouts (VAL-CLASS-030)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const objectView = page.getByTestId('grasp-object-view');
    const wrenchView = page.getByTestId('grasp-wrench-view');
    await expect(objectView).toBeVisible();
    await expect(wrenchView).toBeHidden();
    await expect(labFrame(page).locator('[data-push="resisted"]')).toHaveCount(8);
    await expect(
      page.getByRole('slider', { name: /friction coefficient/i }),
    ).toBeVisible();
    await openAdjustMore(labFrame(page));
    await expect(wrenchView).toBeVisible();

    for (const i of [1, 2, 3]) {
      await expect(
        page.getByRole('slider', { name: new RegExp(`contact ${i} position`, 'i') }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole('button', { name: /add a contact/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /remove the last contact/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();

    // Initial readouts of the default three-contact grasp at mu 0.70.
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('3');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.70');
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('yes');
    await expect(page.getByTestId('grasp-epsilon-readout')).toHaveText(
      '0.444',
    );
    await expectDefaultContacts(page);

    // The wrench hull drew facets and the origin marker is present.
    expect(await wrenchView.locator('polygon').count()).toBeGreaterThan(4);

    // No layout shift: both view boxes are stable before and after input.
    const beforeObj = await objectView.boundingBox();
    const beforeWr = await wrenchView.boundingBox();
    const muSlider = page.getByRole('slider', { name: /friction coefficient/i });
    await waitForHydration(muSlider);
    await muSlider.focus();
    await muSlider.press('ArrowRight');
    const afterObj = await objectView.boundingBox();
    const afterWr = await wrenchView.boundingBox();
    expect(afterObj?.width).toBe(beforeObj?.width);
    expect(afterObj?.height).toBe(beforeObj?.height);
    expect(afterWr?.width).toBe(beforeWr?.width);
    expect(afterWr?.height).toBe(beforeWr?.height);
  });

  test('edits update the hull and readouts in the theoretically correct direction; reset restores (VAL-CLASS-031)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await openAdjustMore(labFrame(page));
    const wrenchView = page.getByTestId('grasp-wrench-view');
    const hullHtml = () => wrenchView.innerHTML();
    const epsilon = async () =>
      Number.parseFloat(await readout(page, 'grasp-epsilon-readout'));

    const baseHull = await hullHtml();
    const baseEpsilon = await epsilon();
    expect(baseEpsilon).toBeCloseTo(0.444, 3);

    // Lower friction: the hull shrinks and epsilon falls, but this
    // symmetric tripod stays force closure (its normals concur).
    const muSlider = page.getByRole('slider', { name: /friction coefficient/i });
    await waitForHydration(muSlider);
    await muSlider.focus();
    await muSlider.press('Home');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.05');
    expect(await epsilon()).toBeGreaterThan(0);
    expect(await epsilon()).toBeLessThan(baseEpsilon);
    expect(await hullHtml()).not.toBe(baseHull);
    await muSlider.press('End');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('1.00');
    expect(await epsilon()).toBeGreaterThan(baseEpsilon);

    // Remove the third contact: top + right is not antipodal (45 degrees
    // beats arctan(1.00)), so closure breaks and the hull re-renders.
    await page.getByRole('button', { name: /remove the last contact/i }).click();
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('2');
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('no');
    await expect(page.getByTestId('grasp-epsilon-readout')).toHaveText(
      '0.000',
    );
    expect(await hullHtml()).not.toBe(baseHull);

    // Slide contact 2 onto the bottom edge: the pair is antipodal, the
    // shared normal lies strictly inside both cones, and closure recovers.
    const contact2 = page.getByRole('slider', { name: /contact 2 position/i });
    await setSlider(contact2, 0.63);
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('yes');
    expect(await epsilon()).toBeGreaterThan(0);

    // Reset restores the default grasp and the exact initial readouts.
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('3');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.70');
    await expect(page.getByTestId('grasp-closure-readout')).toHaveText('yes');
    await expect(page.getByTestId('grasp-epsilon-readout')).toHaveText(
      '0.444',
    );
    await expectDefaultContacts(page);
    expect(await hullHtml()).toBe(baseHull);

    await setSlider(
      page.getByRole('slider', { name: /contact 1 position/i }),
      0.13,
    );
    await expect(page.getByTestId('grasp-contact-1-value')).toHaveText('0.130');
    expect(await hullHtml()).not.toBe(baseHull);
    await page.reload();
    await openAdjustMore(labFrame(page));
    await expectDefaultContacts(page);
    await expect(page.getByTestId('grasp-epsilon-readout')).toHaveText(
      '0.444',
    );
    expect(await hullHtml()).toBe(baseHull);
  });

  test('the interactive is keyboard-operable', async ({ page }) => {
    await page.goto(ROUTE);
    const muSlider = page.getByRole('slider', { name: /friction coefficient/i });
    await waitForHydration(muSlider);
    await muSlider.focus();
    await expect(muSlider).toBeFocused();
    await muSlider.press('ArrowRight');
    await expect(page.getByTestId('grasp-mu-value')).toHaveText('0.75');
    await openAdjustMore(labFrame(page));

    // Derive expected values through decimal grid indexes rather than binary
    // floating-point addition. A native step moves one index, then returns.
    for (let i = 0; i < DEFAULT_CONTACTS.length; i += 1) {
      const contactNumber = i + 1;
      const contact = page.getByRole('slider', {
        name: new RegExp(`contact ${contactNumber} position`, 'i'),
      });
      const defaultGridIndex = contactGridIndex(
        DEFAULT_CONTACTS[i],
        CONTACT_POSITION_MIN,
        CONTACT_POSITION_STEP,
      );
      const stepped = offsetContactGridValue(
        DEFAULT_CONTACTS[i],
        CONTACT_POSITION_STEP,
        1,
      );
      await contact.focus();
      await expect(contact).toBeFocused();
      await contact.press('ArrowRight');
      await expect(
        page.getByTestId(`grasp-contact-${contactNumber}-value`),
      ).toHaveText(stepped.readout);
      await expect(contact).toHaveValue(stepped.inputValue);
      await contact.press('ArrowLeft');
      await expect(
        page.getByTestId(`grasp-contact-${contactNumber}-value`),
      ).toHaveText(DEFAULT_CONTACTS[i].toFixed(3));
      await expect(contact).toHaveValue(String(DEFAULT_CONTACTS[i]));
      expect(
        contactGridIndex(
          await contact.inputValue(),
          CONTACT_POSITION_MIN,
          CONTACT_POSITION_STEP,
        ),
      ).toBe(defaultGridIndex);
    }

    // The add/remove/reset controls activate from the keyboard.
    const add = page.getByRole('button', { name: /add a contact/i });
    await add.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('grasp-contacts-readout')).toHaveText('4');
  });

  test('the mu readout renders the Greek glyph, not an uppercased lookalike', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const label = page.locator('label[for="grasp-mu"]');
    // Figure control labels are sentence case, so no transform may turn
    // the label into capitals. The visible slider is "Surface"; its mu
    // lives in the readout under "How this was made".
    await expect(label).toHaveCSS('text-transform', 'none');
    expect(await label.evaluate((el) => (el as HTMLElement).innerText)).toContain('Surface');
    const method = await openHowThisWasMade(labFrame(page));
    const line = method.locator('[data-figure-readout]');
    await expect(line).toHaveCSS('text-transform', 'none');
    // innerText reflects the RENDERED text (text-transform applied), which
    // textContent-based assertions cannot see: an uppercase transform once
    // made this read "Μ ..." (U+039C, visually a Latin M) even though the
    // DOM always held μ.
    const rendered = await line.evaluate(
      (el) => (el as HTMLElement).innerText,
    );
    expect(rendered).toContain('μ'); // U+03BC greek small letter mu
    expect(rendered).not.toContain('Μ'); // U+039C capital mu
    expect(rendered).toContain('friction coefficient');
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    test.info().annotations.push({
      type: 'actual-viewport-override',
      description: 'This existing case explicitly creates 375x812 in every project.',
    });
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
