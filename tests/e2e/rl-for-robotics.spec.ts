import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { modulesByDomain } from '../../data/modules';
import { setSlider } from './slider';

/**
 * RL for Robotics (VAL-RL-001, 035 through 041).
 *
 * The article is the domain's order-1 entry, so two things need proving
 * that a normal module spec does not carry: that it leads both orderings,
 * and that renumbering the six siblings behind it left them intact. The
 * sibling population is DERIVED from the registry rather than typed, so a
 * seventh sibling published later is graded here automatically instead of
 * being silently skipped.
 */

const ROUTE = '/rl-sim2real/rl-for-robotics/';
const DOMAIN = '/rl-sim2real/';
const TITLE = 'RL for Robotics';

/** Every rl-sim2real article in registry order, this one included. */
const DOMAIN_ARTICLES = modulesByDomain()['rl-sim2real']!.filter(
  (m) => m.status === 'published',
);

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/**
 * The prose from one h2 up to the next, as text plus the citation ids it
 * contains. A section-scoped chip check is the point: a chip in a sibling
 * section satisfies a page-wide match and still leaves a subject unsourced.
 */
async function sections(
  page: Page,
): Promise<Array<{ heading: string; text: string; citeIds: string[] }>> {
  return page.locator('div.prose[data-pagefind-body]').evaluate((prose) => {
    const out: Array<{ heading: string; text: string; citeIds: string[] }> = [];
    for (const h2 of Array.from(prose.querySelectorAll('h2'))) {
      const parts: Element[] = [];
      let node = h2.nextElementSibling;
      while (node !== null && node.tagName !== 'H2') {
        parts.push(node);
        node = node.nextElementSibling;
      }
      out.push({
        heading: (h2.textContent ?? '').replace(/\s+/g, ' ').trim(),
        text: parts.map((p) => p.textContent ?? '').join(' '),
        citeIds: parts.flatMap((p) =>
          Array.from(p.querySelectorAll('[data-cite-id]')).map(
            (c) => c.getAttribute('data-cite-id') ?? '',
          ),
        ),
      });
    }
    return out;
  });
}

function sectionMatching(
  all: Array<{ heading: string; text: string; citeIds: string[] }>,
  pattern: RegExp,
): { heading: string; text: string; citeIds: string[] } | undefined {
  return (
    all.find((s) => pattern.test(s.heading)) ??
    all.find((s) => pattern.test(s.text))
  );
}

async function readout(page: Page, id: string): Promise<string> {
  return ((await page.getByTestId(id).textContent()) ?? '').trim();
}

function slider(page: Page, name: string): Locator {
  return page.getByTestId(`sample-${name}-slider`);
}

/**
 * Parse a formatted duration ("21.5 min", "82.5 d", "3.1 yr") into seconds,
 * so the factor-of-ten clause is checked on the reader-visible text rather
 * than on internal state the reader never sees.
 */
function durationSeconds(text: string): number {
  const match = /([\d.]+)\s*(s|min|h|d|yr)\b/.exec(text);
  expect(match, `parsed a duration from "${text}"`).not.toBeNull();
  const value = Number.parseFloat(match![1]!);
  const unit = match![2]!;
  const scale: Record<string, number> = {
    s: 1,
    min: 60,
    h: 3600,
    d: 86_400,
    yr: 365.25 * 86_400,
  };
  return value * scale[unit]!;
}

test.describe('rl-for-robotics module', () => {
  test('the module leads its domain in the sidebar and on the landing page (VAL-RL-035)', async ({
    page,
  }) => {
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible();

    // First in the sidebar's RL group, and carrying the active highlight.
    const nav = page.getByRole('navigation', { name: 'robot-wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: TITLE, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    const navHrefs = await nav
      .locator('a[href^="/rl-sim2real/"]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('href') ?? ''),
      );
    const articleHrefs = navHrefs.filter((h) => h !== DOMAIN);
    expect(articleHrefs[0]).toBe(ROUTE);
    // The whole group, in registry order, with no repeats.
    expect(articleHrefs).toEqual(
      DOMAIN_ARTICLES.map((m) => `/${m.domain}/${m.slug}/`),
    );
    expect(new Set(articleHrefs).size).toBe(articleHrefs.length);

    // First on the domain landing page, in the same order.
    await page.goto(DOMAIN);
    const landingHrefs = await page
      .locator('#main-content a[href^="/rl-sim2real/"]')
      .evaluateAll((els) =>
        els
          .map((el) => el.getAttribute('href') ?? '')
          .filter((h) => h !== '/rl-sim2real/'),
      );
    expect(landingHrefs[0]).toBe(ROUTE);
    expect([...new Set(landingHrefs)]).toEqual(
      DOMAIN_ARTICLES.map((m) => `/${m.domain}/${m.slug}/`),
    );

    // And discoverable on the A-Z index.
    await page.goto('/a-z/');
    await expect(
      page.locator('#main-content').getByRole('link', { name: TITLE }).first(),
    ).toBeVisible();
  });

  test('every sibling still renders with its own title after the renumber (VAL-RL-036)', async ({
    page,
  }) => {
    const siblings = DOMAIN_ARTICLES.filter((m) => m.slug !== 'rl-for-robotics');
    expect(siblings.length).toBeGreaterThanOrEqual(6);
    for (const sibling of siblings) {
      const route = `/${sibling.domain}/${sibling.slug}/`;
      const response = await page.goto(route);
      expect(response?.ok(), `${route} responds`).toBe(true);
      await expect(
        page.getByRole('heading', { level: 1, name: sibling.title }),
        `${route} keeps its h1`,
      ).toBeVisible();

      // Three-level breadcrumbs still resolve.
      const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(crumbs.getByRole('link')).toHaveCount(2);

      // And the sidebar highlight still lands on this route.
      await expect(
        page
          .getByRole('navigation', { name: 'robot-wiki taxonomy' })
          .getByRole('link', { name: sibling.title, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
    }
  });

  test('frontmatter order agrees with registry order across the domain (VAL-RL-001, VAL-RL-036)', () => {
    for (const [index, entry] of DOMAIN_ARTICLES.entries()) {
      const source = readFileSync(
        join(process.cwd(), 'content', entry.domain, `${entry.slug}.mdx`),
        'utf8',
      );
      const data = matter(source).data as {
        order?: number;
        status?: string;
        domain?: string;
      };
      expect(data.order, `${entry.slug} frontmatter order`).toBe(index + 1);
      expect(data.order, `${entry.slug} matches registry`).toBe(entry.order);
      expect(data.status).toBe('published');
      expect(data.domain).toBe('rl-sim2real');
    }
  });

  test('the two algorithm families, PPO, an off-policy method and the affordability claim are each cited in their own section (VAL-RL-037)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto(ROUTE);
    const all = await sections(page);

    const families = sectionMatching(all, /spend a transition|on-policy/i);
    expect(families, 'a section naming the two families').toBeDefined();
    expect(families!.text).toMatch(/on-policy/i);
    expect(families!.text).toMatch(/off-policy/i);
    expect(families!.text).toMatch(/PPO/);
    // At least one off-policy actor-critic method by name.
    expect(families!.text).toMatch(/soft actor-critic|DDPG|TD3/i);
    expect(families!.citeIds).toContain('ppo-2017');
    expect(families!.citeIds.some((id) => /sac|td3|ddpg/.test(id))).toBe(true);

    // Why simulation makes on-policy learning affordable, cited in its
    // own section rather than inheriting a chip from a neighbour.
    const affordability = sectionMatching(all, /defaulted to PPO|affordable/i);
    expect(affordability, 'a section on why simulation makes it affordable').toBeDefined();
    expect(affordability!.text).toMatch(/parallel|simulat/i);
    expect(affordability!.citeIds.length).toBeGreaterThan(0);

    // Long-form body, no source leaks, no unrendered math.
    const visible = await page.locator('#main-content').evaluate((el) => {
      const clone = el.cloneNode(true) as HTMLElement;
      for (const node of Array.from(clone.querySelectorAll('.katex-mathml'))) {
        node.remove();
      }
      return clone.textContent ?? '';
    });
    expect(visible.split(/\s+/).filter(Boolean).length).toBeGreaterThan(1200);
    expect(visible).not.toContain('import {');
    expect(visible).not.toContain('<Cite');
    expect(visible).not.toContain('<SampleEfficiencyLedger');
    expect(visible).not.toContain('$$');
    expect(await page.getByText('missing citation:').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('offline RL is a first-class section with three algorithms, three chips and a cited BC comparison (VAL-RL-038)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const all = await sections(page);
    const offline = all.find((s) =>
      /offline reinforcement learning/i.test(s.heading),
    );
    expect(offline, 'a heading naming offline reinforcement learning').toBeDefined();

    for (const algorithm of [/\bCQL\b/, /\bIQL\b/, /TD3\+BC/]) {
      expect(offline!.text, `${algorithm} named`).toMatch(algorithm);
    }
    expect(new Set(offline!.citeIds).size).toBeGreaterThanOrEqual(3);
    expect(offline!.citeIds).toContain('offline-rl-tutorial-2020');

    // The comparison against behaviour cloning lives inside the same h2
    // section (under an h3), with both proponents named and both chips in
    // that section rather than borrowed from a neighbour.
    expect(offline!.text).toMatch(/behavior cloning|behaviour cloning/i);
    expect(offline!.text).toMatch(/Mandlekar/);
    expect(offline!.text).toMatch(/Kumar/);
    expect(offline!.citeIds).toContain('robomimic-2021');
    expect(offline!.citeIds).toContain('offline-rl-vs-bc-2022');

    // And that comparison is signposted with its own subheading, so it is
    // a stated position rather than a clause buried mid-section.
    const subheading = await page
      .locator('div.prose[data-pagefind-body] h3')
      .filter({ hasText: /behavior cloning|behaviour cloning/i })
      .count();
    expect(subheading).toBeGreaterThan(0);
  });

  test('the reset problem and a relabelling technique are each cited in their own section (VAL-RL-039)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const all = await sections(page);

    const reset = sectionMatching(all, /reset problem|reset/i);
    expect(reset, 'a section on the reset problem').toBeDefined();
    expect(reset!.text).toMatch(/reset/i);
    expect(reset!.text).toMatch(/real|hardware|physical/i);
    expect(reset!.citeIds.length).toBeGreaterThan(0);

    const exploration = sectionMatching(all, /sparse reward|hindsight/i);
    expect(exploration, 'a section on exploration or relabelling').toBeDefined();
    expect(exploration!.text).toMatch(/hindsight/i);
    expect(exploration!.citeIds).toContain('her-2017');
  });

  test('switching from simulation to one robot changes the wall clock tenfold and the verdict family, at two budgets (VAL-RL-040)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(page.getByTestId('sample-efficiency')).toBeVisible();

    // The default budget, then a second one, both measured through the
    // reader-visible readouts.
    for (const budget of ['default', '6.5'] as const) {
      if (budget !== 'default') {
        await setSlider(slider(page, 'budget'), Number(budget));
      }
      await page.getByTestId('sample-source-sim').check();
      const simClock = await readout(page, 'sample-wallclock-readout');
      const simVerdict = await readout(page, 'sample-verdict-readout');

      await page.getByTestId('sample-source-robot').check();
      const robotClock = await readout(page, 'sample-wallclock-readout');
      const robotVerdict = await readout(page, 'sample-verdict-readout');

      expect(
        durationSeconds(robotClock) / durationSeconds(simClock),
        `budget ${budget}: "${simClock}" to "${robotClock}"`,
      ).toBeGreaterThanOrEqual(10);
      expect(robotVerdict, `budget ${budget}: verdict changed`).not.toBe(
        simVerdict,
      );
      expect(robotVerdict.length).toBeGreaterThan(0);
      await expect(page.getByTestId('sample-verdict-readout')).toBeVisible();
    }
  });

  test('every anchor carries a visible label, and the modelled region says so (VAL-RL-041)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const { ANCHORS } = await import('../../lib/sample-efficiency');
    expect(ANCHORS.length).toBeGreaterThanOrEqual(4);

    const captionCites = await page
      .locator('[data-testid="sample-efficiency"] [data-cite-id]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-cite-id') ?? ''),
      );
    expect(captionCites.length).toBeGreaterThan(0);

    for (const anchor of ANCHORS) {
      const mark = page.getByTestId(`sample-anchor-${anchor.id}`);
      await expect(mark, `${anchor.id} label is drawn`).toHaveText(anchor.label);
      expect(
        captionCites,
        `${anchor.id} has its citation chip in the instrument`,
      ).toContain(anchor.citation);
    }

    // The measured region and the modelled region are labelled apart.
    await expect(page.getByTestId('sample-measured-label')).toHaveText(
      /measured/i,
    );
    const modelled = page.getByTestId('sample-modelled-label');
    await expect(modelled).toHaveText(/modelled/i);
    await expect(modelled).toHaveText(/not measured/i);
    await expect(
      page.getByTestId('sample-simplification-label'),
    ).toContainText(/modelled rather than measured/i);
  });

  test('reset restores the default budget and data source (VAL-RL-041)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const opening = {
      budget: await readout(page, 'sample-budget-value'),
      fleet: await readout(page, 'sample-fleet-value'),
      clock: await readout(page, 'sample-wallclock-readout'),
    };
    await expect(page.getByTestId('sample-source-sim')).toBeChecked();

    await setSlider(slider(page, 'budget'), 9.6);
    await setSlider(slider(page, 'fleet'), 61);
    await page.getByTestId('sample-source-fleet').check();
    expect(await readout(page, 'sample-budget-value')).not.toBe(opening.budget);

    await page.getByRole('button', { name: /reset the budget/i }).click();

    expect(await readout(page, 'sample-budget-value')).toBe(opening.budget);
    expect(await readout(page, 'sample-fleet-value')).toBe(opening.fleet);
    expect(await readout(page, 'sample-wallclock-readout')).toBe(opening.clock);
    await expect(page.getByTestId('sample-source-sim')).toBeChecked();
    await expect(page.getByTestId('sample-source-fleet')).not.toBeChecked();
  });

  test('the budget slider moves under arrow keys and the readout follows (VAL-RL-040)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const budget = slider(page, 'budget');
    await budget.focus();
    await expect(budget).toBeFocused();
    const before = await readout(page, 'sample-wallclock-readout');
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
    expect(await readout(page, 'sample-wallclock-readout')).not.toBe(before);
  });

  test('the wiki apparatus renders: breadcrumbs, See also, Linked from, References (VAL-RL-041)', async ({
    page,
  }) => {
    await page.goto(ROUTE);

    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs).toBeVisible();
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(crumbs.getByRole('link')).toHaveCount(2);
    await expect(crumbs.getByText(TITLE)).toBeVisible();

    const seeAlso = page.locator('section[data-section="see-also"]');
    await expect(seeAlso).toBeVisible();
    const seeAlsoCount = await seeAlso.getByRole('link').count();
    expect(seeAlsoCount).toBeGreaterThanOrEqual(2);
    expect(seeAlsoCount).toBeLessThanOrEqual(4);

    // The inbound edge from manipulation/rl-finetuning.
    const linkedFrom = page.locator('section[data-section="linked-from"]');
    await expect(linkedFrom).toBeVisible();
    expect(await linkedFrom.getByRole('link').count()).toBeGreaterThanOrEqual(1);
    await expect(
      linkedFrom.getByRole('link', { name: /RL Fine-Tuning/i }),
    ).toBeVisible();

    // References: one entry per declared citation, in declaration order.
    const source = readFileSync(
      join(process.cwd(), 'content', 'rl-sim2real', 'rl-for-robotics.mdx'),
      'utf8',
    );
    const declared = [
      ...new Set(
        (matter(source).data as { citations?: string[] }).citations ?? [],
      ),
    ];
    await expect(
      page.getByRole('heading', { level: 2, name: 'References' }),
    ).toBeVisible();
    const rendered = await page
      .locator('ol [data-reference-id]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-reference-id') ?? ''),
      );
    expect(rendered).toEqual(declared);
  });

  test('an inline Term reveals its definition on keyboard focus (VAL-RL-041)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const term = page
      .locator('div.prose[data-pagefind-body] [data-term-id]')
      .first();
    await expect(term).toBeVisible();
    const trigger = term.locator('a, button').first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(term.locator('[role="tooltip"]')).toBeVisible();
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations and zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors = collectPageErrors(page);
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
