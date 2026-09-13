import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectedApparatusGraph } from '../../lib/brand-v2-apparatus-evidence';
import { citationLabel, citationMeta, getCitation } from '../../data/citations';
import { DEFAULT_THESIS_ID, THESES } from '../../lib/competing-theses';
import { MILESTONES } from '../../lib/bear-case';

const graph = expectedApparatusGraph(process.cwd());
const tally = (ids: string[]) => Object.fromEntries([...new Set(ids)].sort()
  .map(id => [id, ids.filter(value => value === id).length]));
const positions = ['reading', 'upper-edge', 'lower-edge'] as const;

function dynamicIds(route: string) {
  if (route === '/frontier/competing-theses/') {
    const selected = THESES.find(thesis => thesis.id === DEFAULT_THESIS_ID)!;
    // EvidenceList's two CiteRef sites are mutually exclusive branches,
    // not two rendered copies of every data item.
    return [...selected.evidenceFor, ...selected.evidenceAgainst].flatMap(row => row.citationIds);
  }
  if (route === '/frontier/bear-case/') return MILESTONES[0].citationIds;
  const expected = graph.get(route)!;
  expect(expected.dynamicCitationSites, 'unmodelled dynamic mount').toHaveLength(0);
  return [];
}

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function measure(root: Locator) {
  return root.evaluate(element => {
    const source = element.querySelector('a')!;
    const tip = element.querySelector<HTMLElement>('[role="tooltip"]')!;
    const box = tip.getBoundingClientRect();
    const trigger = source.getBoundingClientRect();
    const style = getComputedStyle(tip);
    const viewport = window.visualViewport;
    const vx = viewport?.offsetLeft ?? 0, vy = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
    let top = vy + 12;
    for (const header of document.querySelectorAll('header')) {
      const h = header.getBoundingClientRect(), s = getComputedStyle(header);
      if (['sticky', 'fixed'].includes(s.position) && s.visibility !== 'hidden' && h.width && h.height &&
          h.top <= vy + (parseFloat(s.top) || 0) && h.right > box.left && h.left < box.right) {
        top = Math.max(top, h.bottom + 12);
      }
    }
    const visible = box.width > 0 && box.height > 0 && style.display !== 'none' &&
      style.visibility !== 'hidden' && Number(style.opacity) > 0;
    const contained = visible && box.left >= vx + 12 - 0.5 && box.right <= vx + width - 12 + 0.5 &&
      box.top >= top - 0.5 && box.bottom <= vy + height - 12 + 0.5;
    const overlaps = box.left < trigger.right && box.right > trigger.left &&
      box.top < trigger.bottom && box.bottom > trigger.top;
    return {
      contained, visible, overlaps, left: box.left, top: box.top, right: box.right, bottom: box.bottom,
      triggerHit: source.contains(document.elementFromPoint(
        trigger.left + trigger.width / 2, trigger.top + trigger.height / 2)),
      focused: document.activeElement === source, hovered: source.matches(':hover'),
      horizontalTextOverflow: tip.scrollWidth > tip.clientWidth + 1,
      scrollable: tip.scrollHeight > tip.clientHeight + 1,
      tabIndex: tip.tabIndex, text: tip.textContent,
      source: { href: source.getAttribute('href'), label: source.textContent, rel: source.getAttribute('rel'),
        target: source.getAttribute('target'), describedBy: source.getAttribute('aria-describedby') },
      tooltipId: tip.id, referenceHref: element.querySelector('a[href^="#ref-"]')?.getAttribute('href'),
      font: style.fontFamily, fontSize: style.fontSize, color: style.color, background: style.backgroundColor,
      translate: style.translate, transform: style.transform,
    };
  });
}

test.beforeEach(async ({ context }) => {
  await context.route('**/*', async route => {
    if (['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)) await route.continue();
    else await route.abort('blockedbyclient');
  });
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
    const install = () => {
      if (document.documentElement && !style.isConnected) document.documentElement.appendChild(style);
    };
    install();
    new MutationObserver(install).observe(document, { childList: true, subtree: true });
  });
});

for (const width of [375, 1440]) {
  test.describe(`shared citation consumers ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const [route, expected] of graph) {
      test(`${route} exact occurrences, geometry and source apparatus`, async ({ page }, info) => {
        test.setTimeout(180000);
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        const roots = page.locator('div.prose [data-cite-id]');
        const ids = await roots.evaluateAll(elements => elements.map(e => e.getAttribute('data-cite-id')!));
        const owed = [...expected.citationMarkers, ...expected.componentCitationSites.map(site => site.id), ...dynamicIds(route)];
        const population = { expected: tally(owed), actual: tally(ids), authored: expected.citationMarkers.length,
          fixed: expected.componentCitationSites.length, nativeCandidateDynamic: expected.dynamicCitationSites
            .reduce((n, site) => n + site.occurrences.length, 0), renderedDefaultDynamic: dynamicIds(route).length };
        const observations = [], failures: string[] = [], held: string[] = [];
        const ordinals = new Map<string, number>();
        let longest = 0;
        for (let i = 1; i < ids.length; i++) {
          if (citationMeta(getCitation(ids[i])!).length > citationMeta(getCitation(ids[longest])!).length) longest = i;
        }
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i], ordinal = ordinals.get(id) ?? 0;
          ordinals.set(id, ordinal + 1);
          const root = roots.nth(i), source = root.locator('a').first();
          // Closed authored disclosures are real consumers, not omissions.
          const disclosures = root.locator('xpath=ancestor::details[not(@open)]');
          for (let d = await disclosures.count() - 1; d >= 0; d--) {
            await disclosures.nth(d).locator(':scope > summary').click();
          }
          if (!await source.isVisible()) {
            held.push(`${route}:${id}:${ordinal}:unreachable-mount-state`);
            continue;
          }
          const citation = getCitation(id)!;
          for (const position of positions) for (const method of ['hover', 'keyboard']) {
            const identity = [width, route, id, ordinal, position, method].join(':');
            await page.mouse.move(0, 0);
            await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            await root.evaluate((element, placement) => {
              const target = placement === 'reading' ? 500 : placement === 'upper-edge' ? 100 : innerHeight - 80;
              window.scrollBy(0, element.getBoundingClientRect().top - target);
            }, position);
            if (method === 'hover') await source.hover();
            else await source.focus();
            await settle(page);
            const result = await measure(root);
            const valid = result.contained && !result.overlaps && result.triggerHit && !result.horizontalTextOverflow &&
              (method === 'hover' ? result.hovered : result.focused) &&
              result.source.href === citation.url && result.source.label === citationLabel(citation) &&
              result.source.target === '_blank' && result.source.rel === 'noopener noreferrer' &&
              result.source.describedBy === result.tooltipId && result.referenceHref === `#ref-${id}` &&
              result.text === citation.title + citationMeta(citation) && (!result.scrollable || result.tabIndex === 0);
            observations.push({ identity, result, valid });
            if (!valid) failures.push(identity);
            if (method === 'hover' && (i === 0 && position === 'reading' || i === longest && position === 'upper-edge')) {
              await page.screenshot({ path: info.outputPath(`${i}-${position}.png`) });
            }
          }
        }
        // A distinct runtime accessibility result, never inferred from bounds.
        const axe = await new AxeBuilder({ page }).analyze();
        await info.attach('consumer-proof', { contentType: 'application/json',
          body: JSON.stringify({ route, width, population, observations, failures, held, errors, axe: axe.violations }, null, 2) });
        expect(population.actual).toEqual(population.expected);
        expect(held).toEqual([]);
        expect(observations).toHaveLength(owed.length * positions.length * 2);
        expect(new Set(observations.map(o => o.identity)).size).toBe(observations.length);
        expect(errors).toEqual([]);
        expect(failures, 'source, containment, focus or reading failure').toEqual([]);
        expect(axe.violations).toEqual([]);
      });
    }
  });
}
