import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { setSlider } from './slider';

/**
 * Safety and Assurance (VAL-FRONT-001, 002, 023 through 029).
 *
 * Two things here cannot be proved by a spec scoped to one page, and both
 * are graded below. The force-limit clause spans two mounts, so the
 * assertion loads /classical/control as well and compares the two rendered
 * strings character for character rather than trusting that both import
 * the same module. And the standards clause grades every designation the
 * article renders ANYWHERE, discovered from the DOM, so a standard added
 * later without an edition year or a development stage fails here instead
 * of shipping as a confident claim about a document nobody read.
 */

const ROUTE = '/frontier/safety-and-assurance/';
const TITLE = 'Safety and Assurance';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** The prose from one h2 to the next, with the citation ids inside it. */
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

/** Article prose with the citation superscripts stripped. */
async function proseText(page: Page): Promise<string> {
  return page.locator('div.prose[data-pagefind-body]').evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    for (const node of Array.from(clone.querySelectorAll('sup, .katex-mathml'))) {
      node.remove();
    }
    return (clone.textContent ?? '').replace(/\s+/g, ' ');
  });
}

async function readout(page: Page, id: string): Promise<string> {
  return ((await page.getByTestId(id).textContent()) ?? '').trim();
}

function metres(text: string): number {
  const match = /([\d.]+)\s*m\b/.exec(text);
  expect(match, `parsed a distance from "${text}"`).not.toBeNull();
  return Number.parseFloat(match![1]!);
}

test.describe('safety-and-assurance module', () => {
  test('the module is published on all five discovery surfaces (VAL-FRONT-023)', async ({
    page,
  }) => {
    const response = await page.goto(ROUTE);
    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible();

    // 1: the sidebar, in the frontier group, carrying the active highlight.
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    const navLink = nav.getByRole('link', { name: TITLE, exact: true });
    await expect(navLink).toHaveAttribute('aria-current', 'page');
    await expect(navLink).toHaveAttribute('href', ROUTE);
    const frontierHrefs = await nav
      .locator('a[href^="/frontier/"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    expect(frontierHrefs).toContain(ROUTE);

    // 2: the domain landing page, as a linked entry with its summary.
    await page.goto('/frontier/');
    const landing = page.locator('#main-content').getByRole('link', {
      name: TITLE,
    });
    await expect(landing.first()).toBeVisible();
    // The landing entry carries the registry summary, not the article's
    // own prose, so it is compared against the registry rather than typed.
    const { publishedModules } = await import('../../data/modules');
    const entry = publishedModules().find(
      (m) => m.slug === 'safety-and-assurance',
    );
    expect(entry, 'the registry entry').toBeDefined();
    const landingText = (await page.locator('#main-content').textContent()) ?? '';
    expect(landingText.replace(/\s+/g, ' ')).toContain(
      entry!.summary.replace(/\s+/g, ' '),
    );

    // 3: the A-Z index.
    await page.goto('/a-z/');
    await expect(
      page.locator('#main-content').getByRole('link', { name: TITLE }).first(),
    ).toBeVisible();

    // 4 and 5: the static export document, and the sitemap entry.
    const exported = readFileSync(
      join(process.cwd(), 'out', 'frontier', 'safety-and-assurance', 'index.html'),
      'utf8',
    );
    expect(exported).toContain(TITLE);
    const sitemap = readFileSync(join(process.cwd(), 'out', 'sitemap.xml'), 'utf8');
    expect(sitemap).toContain('/frontier/safety-and-assurance');
  });

  test('all six frontier routes render with an h1, their sidebar highlight and three headings (VAL-FRONT-001, VAL-FRONT-002)', async ({
    page,
  }) => {
    const { modulesByDomain } = await import('../../data/modules');
    const frontier = modulesByDomain()['frontier']!.filter(
      (m) => m.status === 'published',
    );
    expect(frontier.length).toBe(6);
    expect(frontier.map((m) => m.slug)).toContain('safety-and-assurance');

    for (const entry of frontier) {
      const route = `/${entry.domain}/${entry.slug}/`;
      const response = await page.goto(route);
      expect(response?.ok(), `${route} responds`).toBe(true);
      await expect(
        page.getByRole('heading', { level: 1, name: entry.title }),
        `${route} h1`,
      ).toBeVisible();

      await expect(
        page
          .getByRole('navigation', { name: 'Robot Wiki taxonomy' })
          .getByRole('link', { name: entry.title, exact: true }),
        `${route} sidebar highlight`,
      ).toHaveAttribute('aria-current', 'page');

      const headings = await page
        .locator('div.prose[data-pagefind-body] h2')
        .count();
      expect(headings, `${route} section headings`).toBeGreaterThanOrEqual(3);

      const words = (await proseText(page)).split(/\s+/).filter(Boolean).length;
      expect(words, `${route} substantive prose`).toBeGreaterThan(800);
    }
  });

  test('the five standards are named with resolving chips, and every standard carries an edition year or a stage (VAL-FRONT-024)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const text = await proseText(page);

    // The five the contract names, each with a chip whose References
    // entry resolves to an absolute external href.
    const required: Array<[RegExp, string]> = [
      [/ISO 12100/, 'iso-12100'],
      [/ISO 10218/, 'iso-10218-1-2025'],
      [/ISO\/TS 15066/, 'iso-ts-15066'],
      [/ISO 13849/, 'iso-13849-1-2023'],
      [/IEC 61508/, 'iec-61508-1-2010'],
    ];
    const chipIds = await page
      .locator('div.prose[data-pagefind-body] [data-cite-id]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-cite-id') ?? ''),
      );
    for (const [designation, citeId] of required) {
      expect(text, `${designation} named in prose`).toMatch(designation);
      expect(chipIds, `${citeId} chip rendered`).toContain(citeId);
      const href = await page
        .locator(`[data-reference-id="${citeId}"] a[href^="http"]`)
        .first()
        .getAttribute('href');
      expect(href, `${citeId} reference href`).toMatch(/^https?:\/\//);
    }

    /**
     * Every designation the article renders anywhere, discovered from the
     * prose rather than listed here, must sit within a short window of
     * either a four-digit edition year or an explicit development stage.
     * A standard presented as settled with neither is the failure this
     * clause exists to catch.
     */
    const designations = [
      ...new Set(
        Array.from(
          text.matchAll(/\b(?:ISO(?:\/[A-Z]{2})?|IEC|ANSI)[\s/]?[\d-]+(?:-\d+)?/g),
        ).map((m) => m[0]),
      ),
    ];
    expect(designations.length).toBeGreaterThanOrEqual(5);
    for (const designation of designations) {
      // Every occurrence, not just the first: a designation dated once and
      // then repeated undated inside a glossary tooltip is the case that
      // slips past a first-match check.
      for (const match of text.matchAll(
        new RegExp(designation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      )) {
        const at = match.index!;
        const window = text.slice(Math.max(0, at - 240), at + 400);
        expect(
          /\b(19|20)\d{2}\b/.test(window) ||
            /stage\s*[\d.]+|committee draft/i.test(window),
          `"${designation}" at ${at} carries an edition year or a development stage nearby`,
        ).toBe(true);
      }
    }

    // The draft is stated as a draft, at its true stage, never as settled.
    expect(text).toMatch(/ISO\/CD 25785-1/);
    expect(text).toMatch(/committee draft/i);
    expect(text).toMatch(/stage 30\.60/);

    // No clause-level paraphrase: the article never cites a clause number.
    expect(text).not.toMatch(/\bclause\s+\d/i);
  });

  test('the four collaborative modes are each named with an adjacent explanatory sentence (VAL-FRONT-025)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const { MODES } = await import('../../lib/safety-modes');
    expect(MODES.length).toBe(4);

    const text = await proseText(page);
    for (const pattern of [
      /safety-rated monitored stop/i,
      /hand guiding/i,
      /speed and separation monitoring/i,
      /power and force limiting/i,
    ]) {
      expect(text, `${pattern} named`).toMatch(pattern);
    }

    // Each mode's own constraint is a full sentence in the instrument, and
    // the four are distinct prose rather than one sentence reused.
    const constraints: string[] = [];
    for (const mode of MODES) {
      await page.getByTestId(`mode-${mode.id}`).click();
      const constraint = await readout(page, 'mode-constraint');
      expect(constraint, `${mode.id} names its mode`).toContain(mode.name);
      const body = constraint.slice(mode.name.length + 1).trim();
      expect(body.split(/\s+/).length, `${mode.id} sentence length`).toBeGreaterThan(15);
      expect(body, `${mode.id} is a sentence`).toMatch(/\.\s*$/);
      constraints.push(body);
    }
    expect(new Set(constraints).size, 'four distinct constraints').toBe(4);

    // The two procedural modes state a constraint instead of a number.
    for (const id of ['monitored-stop', 'hand-guiding']) {
      await page.getByTestId(`mode-${id}`).click();
      await expect(page.getByTestId('stated-readout')).toBeVisible();
      await expect(page.getByTestId('separation-readout')).toHaveCount(0);
      await expect(page.getByTestId('force-readout')).toHaveCount(0);
    }
  });

  test('the certification-impossibility claim and the wrapper pattern are stated with a citation in their section (VAL-FRONT-026)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const all = await sections(page);
    const section = sectionMatching(all, /cannot be certified|certified/i);
    expect(section, 'a section on why a policy cannot be certified').toBeDefined();

    // Both ratings named, and the reason stated rather than asserted.
    expect(section!.text).toMatch(/safety integrity level/i);
    expect(section!.text).toMatch(/performance level/i);
    expect(section!.text).toMatch(/specification/i);
    expect(section!.text).toMatch(/systematic fault/i);
    expect(section!.text).toMatch(/not certified|cannot be assigned|has neither/i);

    // The pattern named as a pattern: a verifiable layer around an
    // unverifiable one, with the formal instance present.
    expect(section!.text).toMatch(/verifi\w+/i);
    expect(section!.text).toMatch(/unverifiable/i);
    expect(section!.text).toMatch(/control barrier function/i);
    expect(section!.text).toMatch(/safety filter/i);
    expect(section!.citeIds).toContain('ames-cbf-2019');
    expect(section!.citeIds.length).toBeGreaterThanOrEqual(2);

    // The assurance-case tradition, in the same section.
    expect(section!.text).toMatch(/assurance case|safety case/i);
    expect(section!.citeIds).toContain('ul-4600-2023');
    expect(section!.citeIds).toContain('gsn-standard-v3');
  });

  test('conformal prediction, OOD detection and runtime monitoring are each cited, with a named abstaining system (VAL-FRONT-027)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const all = await sections(page);
    const section = sectionMatching(all, /machine-learning half|conformal/i);
    expect(section, 'a section on the ML-native techniques').toBeDefined();

    expect(section!.text).toMatch(/conformal prediction/i);
    expect(section!.text).toMatch(/out-of-distribution/i);
    expect(section!.text).toMatch(/runtime monitor/i);

    for (const citeId of [
      'vovk-conformal-2022',
      'angelopoulos-conformal-2021',
      'knowno-2023',
      'sinha-anomaly-2024',
      'farid-failure-2022',
    ]) {
      expect(section!.citeIds, `${citeId} chip in this section`).toContain(citeId);
    }

    // A named robotics system applying calibrated abstention.
    expect(section!.text).toMatch(/KnowNo/);
    expect(section!.text).toMatch(/asks a human|abstention|ask.*help/i);
  });

  test('the separation readout rises strictly with robot speed and the mode switch swaps the readout (VAL-FRONT-028)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByTestId('mode-speed-separation').click();

    const slider = page.locator('#safety-robot-speed');
    const samples: number[] = [];
    for (const speed of [0, 0.5, 1, 1.5, 2]) {
      await setSlider(slider, speed);
      samples.push(metres(await readout(page, 'separation-readout')));
    }
    for (let i = 1; i < samples.length; i++) {
      expect(
        samples[i]!,
        `separation at sample ${i} (${samples.join(', ')}) exceeds sample ${i - 1}`,
      ).toBeGreaterThan(samples[i - 1]!);
    }

    // And it recomposes from its four published terms, which sum to it.
    await setSlider(slider, 1);
    const terms = await Promise.all(
      ['term-human', 'term-reaction', 'term-braking', 'term-margin'].map((id) =>
        readout(page, id).then(metres),
      ),
    );
    const total = metres(await readout(page, 'separation-readout'));
    expect(terms.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 1);

    // Switching to power and force limiting replaces the distance readout
    // with a force readout and a visible labelled limit.
    await page.getByTestId('mode-power-force').click();
    await expect(page.getByTestId('separation-readout')).toHaveCount(0);
    await expect(page.getByTestId('force-readout')).toBeVisible();
    await expect(page.getByTestId('force-readout')).toHaveText(/\d+\s*N/);
    await expect(page.getByTestId('force-limit-readout')).toHaveText(/\d+\s*N/);
    await expect(page.getByTestId('force-limit-label')).toBeVisible();
  });

  test('reset restores the default mode and both speeds (VAL-FRONT-028)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const opening = {
      separation: await readout(page, 'separation-readout'),
      constraint: await readout(page, 'mode-constraint'),
    };
    await expect(page.getByTestId('mode-speed-separation')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await setSlider(page.locator('#safety-robot-speed'), 1.85);
    await setSlider(page.locator('#safety-human-speed'), 0.35);
    await page.getByTestId('mode-power-force').click();
    expect(await readout(page, 'mode-constraint')).not.toBe(opening.constraint);

    await page.getByRole('button', { name: 'Reset' }).click();

    await expect(page.getByTestId('mode-speed-separation')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await readout(page, 'separation-readout')).toBe(opening.separation);
    expect(await readout(page, 'mode-constraint')).toBe(opening.constraint);
  });

  test('the rendered force limit matches /classical/control character for character, with the same basis (VAL-FRONT-029)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByTestId('mode-power-force').click();
    const here = (await page.getByTestId('force-limit-label').textContent())!;

    await page.goto('/classical/control/');
    const there = (await page
      .getByTestId('impedance-limit-label')
      .textContent())!;

    expect(here).toBe(there);
    expect(here.length).toBeGreaterThan(0);

    // The same basis stated on both pages: the research threshold, named
    // as such, rather than one page attributing it to a standard's table.
    for (const basis of [/research basis/i, /pain threshold/i, /thigh/i, /255 N/]) {
      expect(here, `limit string states ${basis}`).toMatch(basis);
    }
    const controlProse = await proseText(page);
    expect(controlProse).toMatch(/pain threshold/i);
    await page.goto(ROUTE);
    const safetyBody = await page.locator('#main-content').textContent();
    expect(safetyBody).toMatch(/pain threshold/i);
    expect(safetyBody).toMatch(/research basis/i);
  });

  test('the wiki apparatus renders: breadcrumbs, See also, Linked from, References (VAL-FRONT-029)', async ({
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

    // The inbound edge is the prose link from reliability-gap, which is
    // the documented at-cap alternative: every frontier sibling already
    // holds four seeAlso entries.
    const linkedFrom = page.locator('section[data-section="linked-from"]');
    await expect(linkedFrom).toBeVisible();
    await expect(
      linkedFrom.getByRole('link', { name: /Reliability Gap/i }),
    ).toBeVisible();

    // References: one entry per declared citation, in declaration order.
    const source = readFileSync(
      join(process.cwd(), 'content', 'frontier', 'safety-and-assurance.mdx'),
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

    // No source leaks in the rendered body.
    const visible = await proseText(page);
    expect(visible).not.toContain('import {');
    expect(visible).not.toContain('<Cite');
    expect(visible).not.toContain('<CollaborativeOperationModes');
    expect(await page.getByText('missing citation:').count()).toBe(0);
  });

  test('the inbound prose link sits in reliability-gap\'s "What solved would look like" section', async ({
    page,
  }) => {
    await page.goto('/frontier/reliability-gap/');
    const section = (await sections(page)).find((s) =>
      /what solved would look like/i.test(s.heading),
    );
    expect(section, 'the section named by the brief').toBeDefined();

    const hrefs = await page
      .locator('div.prose[data-pagefind-body] h2')
      .evaluateAll((headings) => {
        const target = headings.find((h) =>
          /what solved would look like/i.test(h.textContent ?? ''),
        );
        if (!target) return [];
        const out: string[] = [];
        let node = target.nextElementSibling;
        while (node !== null && node.tagName !== 'H2') {
          out.push(
            ...Array.from(node.querySelectorAll('a')).map(
              (a) => a.getAttribute('href') ?? '',
            ),
          );
          node = node.nextElementSibling;
        }
        return out;
      });
    // MDX prose links are authored without the trailing slash the route
    // canonicalises to, so the comparison normalises rather than pinning
    // one spelling.
    expect(hrefs.map((h) => (h.endsWith('/') ? h : `${h}/`))).toContain(ROUTE);
  });

  test('an inline Term reveals its definition on keyboard focus (VAL-FRONT-029)', async ({
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

  test('no horizontal page scroll at 375px (VAL-FRONT-029)', async ({ browser }) => {
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

  test('zero axe violations and zero console errors (VAL-FRONT-029)', async ({
    page,
  }) => {
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

    // And with the force half selected, since it draws a different tree.
    await page.getByTestId('mode-power-force').click();
    const afterSwitch = await new AxeBuilder({ page }).analyze();
    expect(afterSwitch.violations).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
