import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { DOMAIN_META, modulesByDomain } from '../../data/modules';
import { setSlider } from './slider';
import { openAdjustMore } from './helpers/figure-fold';
import { waitForHydration } from './interaction-ready';
import { inlineCitationIds } from '../../lib/references';

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
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * the taxonomy was the desktop sidebar ("Robot Wiki taxonomy") or, on phones,
 * the drawer behind "Open navigation menu". The sidebar is gone: at every
 * width the one top bar's "Articles" button opens the drawer, so the drawer
 * path (focus trap, inert page, Escape back to the button) runs at every width.
 */
function articlesButton(page: Page): Locator {
  return page.getByRole('banner').getByRole('button', { name: 'Articles', exact: true });
}

async function visibleTaxonomy(page: Page): Promise<Locator> {
  const menu = articlesButton(page);
  await expect(menu).toBeVisible();
  await waitForHydration(menu);
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
  await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
  const nav = page.getByRole('navigation', {
    name: 'Robot Wiki taxonomy drawer',
    exact: true,
  });
  await expect(nav).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  return nav;
}

async function closeTaxonomy(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Site navigation' });
  await expect(dialog).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#main-content')).not.toHaveAttribute('inert', '');
  await expect(articlesButton(page)).toBeFocused();
}

/**
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * the visible trail was Home > Domain > Article, two links and an unlinked
 * trailing crumb. The masthead eyebrow now links only the domain between the
 * top bar's wordmark and the H1 that names the page, and the full three-level
 * trail is the page's BreadcrumbList structured data
 * (components/article/breadcrumbs.tsx).
 */
async function expectBreadcrumbs(page: Page, title: string, route: string): Promise<void> {
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs).toBeVisible();
  await expect(crumbs.getByRole('link', { name: DOMAIN_META['rl-sim2real'].name })).toHaveAttribute('href', DOMAIN);
  await expect(crumbs.getByRole('link')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  const trail = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.flatMap((script) => {
        const data = JSON.parse(script.textContent ?? 'null');
        if (data?.['@type'] !== 'BreadcrumbList') return [];
        return (data.itemListElement as Array<{ name: string; item: string }>).map(
          (item) => [item.name, new URL(item.item).pathname],
        );
      }),
    );
  expect(trail).toEqual([
    ['Home', '/'],
    [DOMAIN_META['rl-sim2real'].name, DOMAIN],
    [title, route],
  ]);
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
    const nav = await visibleTaxonomy(page);
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
    await closeTaxonomy(page);

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

      // Three-level breadcrumbs still resolve (eyebrow plus BreadcrumbList; see expectBreadcrumbs).
      await expectBreadcrumbs(page, sibling.title, route);

      // And the sidebar highlight still lands on this route.
      const nav = await visibleTaxonomy(page);
      await expect(
        nav.getByRole('link', { name: sibling.title, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await closeTaxonomy(page);
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
    const prose = page.locator('div.prose[data-pagefind-body]');
    const citeIds = await prose.locator('[data-cite-id]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-cite-id') ?? ''),
    );
    expect(new Set(citeIds).size).toBeGreaterThanOrEqual(30);
    const leadWords = await prose.locator('p').first().evaluate((el) => {
      const clone = el.cloneNode(true) as HTMLElement;
      for (const node of Array.from(clone.querySelectorAll('[data-cite-id], .katex-mathml'))) {
        node.remove();
      }
      return (clone.textContent ?? '').split(/\s+/).filter(Boolean).length;
    });
    expect(leadWords).toBeLessThanOrEqual(60);
    expect(visible).not.toContain('import {');
    expect(visible).not.toContain('<Cite');
    expect(visible).not.toContain('<SampleEfficiencyLedger');
    expect(visible).not.toContain('$$');
    expect(await page.getByText('missing citation:').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('offline RL is a first-class section with two cited algorithms, three chips and a cited BC comparison (VAL-RL-038)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const all = await sections(page);
    const offline = all.find((s) =>
      /offline reinforcement learning/i.test(s.heading),
    );
    expect(offline, 'a heading naming offline reinforcement learning').toBeDefined();

    // The reviewed 2026-10-12 length cut dropped the IQL and TD3+BC
    // sentences from this section and recorded each drop with its claim;
    // BCQ and CQL stay named here, each with its own chip, and TD3+BC keeps
    // its cited sentence on the offline RL article.
    for (const [algorithm, citeId] of [[/\bBCQ\b/, 'bcq-2018'], [/\bCQL\b/, 'cql-2020']] as const) {
      expect(offline!.text, `${algorithm} named`).toMatch(algorithm);
      expect(offline!.citeIds, `${citeId} cited in the section`).toContain(citeId);
    }
    const cut = JSON.parse(readFileSync(
      join(process.cwd(), 'audit/evidence/length-cut-20261012/source-transition.json'), 'utf8',
    )) as { sources: { after: { path: string }; dropped: { citations: { value: string; claim: string }[] } }[] };
    const dropped = cut.sources.find((s) => s.after.path === 'content/rl-sim2real/rl-for-robotics.mdx')!
      .dropped.citations;
    expect(dropped.find((d) => d.value === 'iql-2022')?.claim).toMatch(/^IQL /);
    expect(dropped.find((d) => d.value === 'td3-bc-2021')?.claim).toMatch(/^TD3\+BC /);
    expect(readFileSync(join(process.cwd(), 'content/rl-sim2real/offline-rl.mdx'), 'utf8'))
      .toMatch(/TD3\+BC [^\n]*<Cite id="td3-bc-2021" \/>/);
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
    expect(offline!.text).toMatch(/coverage of the optimal policy/i);
    expect(offline!.text).toMatch(/worst-case result/i);
    expect(offline!.text).toMatch(/equal expert data/i);
    expect(offline!.text).toMatch(/drawer-manipulation comparison, in simulation/i);
    expect(offline!.text).toMatch(/Naive CQL can perform no better than BC/i);

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
    expect(exploration!.text).toMatch(/recomputing the reward/i);
    expect(exploration!.text).toMatch(/original goal and alternative goals/i);
    expect(exploration!.text).toMatch(/goals achieved later in the same episode/i);
    expect(exploration!.text).toMatch(/simulated seven-DoF Fetch arm/i);
    expect(exploration!.text).toMatch(/contact-penetration penalty/i);
    expect(exploration!.text).toMatch(/half its training episodes/i);
    expect(exploration!.text).toMatch(/without real-robot fine-tuning/i);
    expect(exploration!.text).toMatch(/achieved-goal mapping/i);
    const herDefinition = page.locator(
      '[data-term-id="hindsight-experience-replay"] [role="tooltip"]',
    );
    await expect(herDefinition).toContainText(/contact-penetration reward penalty/i);
  });

  test('switching from simulation to one robot changes the wall clock tenfold and the verdict family, at two budgets (VAL-RL-040)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(page.getByTestId('sample-efficiency')).toBeVisible();
    // The source choice and its exact readouts sit in "Adjust more".
    await openAdjustMore(page.getByTestId('sample-efficiency'));

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
      /paper-reported durations and bounds/i,
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
    // The ledger is a lazy mount (components/mdx/lazy-mounts.tsx); a value set on its server
    // HTML before React attaches is lost, so the readings start once the slider is hydrated.
    await waitForHydration(slider(page, 'budget'));
    const opening = {
      budget: await readout(page, 'sample-budget-value'),
      fleet: await readout(page, 'sample-fleet-value'),
      clock: await readout(page, 'sample-wallclock-readout'),
    };
    await expect(page.getByTestId('sample-source-sim')).toBeChecked();

    await setSlider(slider(page, 'budget'), 9.6);
    await setSlider(slider(page, 'fleet'), 61);
    // The source choice and Reset sit in "Adjust more".
    await openAdjustMore(page.getByTestId('sample-efficiency'));
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
    await page.goto(ROUTE, { waitUntil: 'networkidle' });
    const budget = slider(page, 'budget');
    // A lazy mount: arrow keys reach the slider's handler only once React has attached.
    await waitForHydration(budget);
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

    await expectBreadcrumbs(page, TITLE, ROUTE);

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

    // References: one entry per declared citation.
    // Owner-approved successor (Josef, 2026-10-10, the research-page standard; 5ccbeba9, 13 October
    // 2026): the entries were printed in plain declaration order. References now prints the
    // sources the prose cites first, then the declared but uncited ones under one "Further
    // reading" heading, each group in declaration order (lib/reference-order.ts), and every
    // entry marks its group in data-further-reading.
    const source = readFileSync(
      join(process.cwd(), 'content', 'rl-sim2real', 'rl-for-robotics.mdx'),
      'utf8',
    );
    const declared = [
      ...new Set(
        (matter(source).data as { citations?: string[] }).citations ?? [],
      ),
    ];
    const inline = new Set(inlineCitationIds(matter(source).content));
    const printOrder = [
      ...declared.filter((id) => inline.has(id)),
      ...declared.filter((id) => !inline.has(id)),
    ];
    await expect(
      page.getByRole('heading', { level: 2, name: 'References' }),
    ).toBeVisible();
    const rendered = await page
      .locator('ol [data-reference-id]')
      .evaluateAll((els) =>
        els.map((el) => [el.getAttribute('data-reference-id') ?? '', el.getAttribute('data-further-reading')]),
      );
    expect(rendered).toEqual(printOrder.map((id) => [id, inline.has(id) ? 'false' : 'true']));
    if (printOrder.length > inline.size) {
      await expect(page.getByRole('heading', { level: 3, name: 'Further reading' })).toBeVisible();
    }
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
