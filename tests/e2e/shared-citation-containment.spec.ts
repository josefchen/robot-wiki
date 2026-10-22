import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectedApparatusGraph } from '../../lib/brand-v2-apparatus-evidence';
import { citationLabel, citationMeta, getCitation } from '../../data/citations';
import { DEFAULT_THESIS_ID, THESES } from '../../lib/competing-theses';
import { MILESTONES } from '../../lib/bear-case';
import { citeParts, clickCiteMark, citeNoteInMargin } from './helpers/citation-note';

const graph = expectedApparatusGraph(process.cwd());
const tally = (ids: string[]) => Object.fromEntries([...new Set(ids)].sort()
  .map(id => [id, ids.filter(value => value === id).length]));
const positions = ['reading', 'upper-edge', 'lower-edge'] as const;

function dynamicIds(route: string) {
  if (route === '/frontier/competing-theses/') {
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the thesis explorer opens with no thesis selected, so at
    // rest it renders none of the evidence citations the default thesis
    // (DEFAULT_THESIS_ID) once mounted. The spec asserts that resting state
    // below and owes only the authored and fixed sites there.
    expect(THESES.some(thesis => thesis.id === DEFAULT_THESIS_ID)).toBe(true);
    return [];
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

/**
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * the chip's floating tooltip became the citation's numbered sidenote
 * (components/ui/cite.tsx). The tooltip's facts are read off the note at
 * the same strength: the note is visible, set below the top bar and inside
 * the viewport's 12 px insets, never over its number, never scrolling and
 * never overflowing; the number (the focus and pointer stop) is hit-tested,
 * points at the References entry and is described by the note; the note's
 * author-year link is the source link with the registry's href, label,
 * target and rel; and the note reads the number, the label, the title and
 * the venue line from the registry. A margin note (prose, from 1200 px) is
 * a floating block and must be wholly contained. A note opened inline (a
 * phone, a table, a figure) flows after its number inside the column: each
 * line must lie inside the insets and the first line inside the viewport
 * below the top bar, since an in-flow note near the bottom edge continues
 * below it and the reader scrolls on.
 */
async function measure(root: Locator) {
  return root.evaluate(element => {
    const mark = element.querySelector<HTMLAnchorElement>('sup.cite-mark a')!;
    const note = element.querySelector<HTMLElement>('[data-sidenote]')!;
    const source = note.querySelector<HTMLAnchorElement>('a[target="_blank"]')!;
    const style = getComputedStyle(note);
    const inMargin = style.float === 'left' || style.float === 'right';
    const lines = [...note.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    const box = lines.length ? {
      left: Math.min(...lines.map(r => r.left)), right: Math.max(...lines.map(r => r.right)),
      top: Math.min(...lines.map(r => r.top)), bottom: Math.max(...lines.map(r => r.bottom)),
    } : { left: 0, right: 0, top: 0, bottom: 0 };
    const trigger = mark.getBoundingClientRect();
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
    const visible = lines.length > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    const inside = (r: { left: number; right: number; top: number; bottom: number }) =>
      r.left >= vx + 12 - 0.5 && r.right <= vx + width - 12 + 0.5 && r.top >= top - 0.5 && r.bottom <= vy + height - 12 + 0.5;
    const contained = visible && (inMargin ? inside(box) :
      inside(lines[0]) && lines.every(r => r.left >= vx + 12 - 0.5 && r.right <= vx + width - 12 + 0.5 && r.top >= top - 0.5));
    const overlaps = lines.some(r => r.left < trigger.right - 0.5 && r.right > trigger.left + 0.5 &&
      r.top < trigger.bottom - 0.5 && r.bottom > trigger.top + 0.5);
    const number = [...mark.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
    return {
      contained, visible, overlaps, inMargin, left: box.left, top: box.top, right: box.right, bottom: box.bottom,
      triggerHit: mark.contains(document.elementFromPoint(
        trigger.left + trigger.width / 2, trigger.top + trigger.height / 2)),
      focused: document.activeElement === mark, hovered: mark.matches(':hover'),
      horizontalTextOverflow: inMargin && note.scrollWidth > note.clientWidth + 1,
      scrollable: inMargin && note.scrollHeight > note.clientHeight + 1,
      number, text: note.textContent,
      source: { href: source.getAttribute('href'), label: source.textContent, rel: source.getAttribute('rel'),
        target: source.getAttribute('target'), describedBy: mark.getAttribute('aria-describedby') },
      tooltipId: note.id, referenceHref: mark.getAttribute('href'),
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
        if (route === '/frontier/competing-theses/') {
          await expect(page.locator('[data-selected]')).toHaveCount(0);
        }
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
          const root = roots.nth(i), { mark: source, note } = citeParts(root);
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
            // Pointed at, or focused, the number shows its note: a margin
            // note is already there; otherwise a click or Enter opens it.
            const inMargin = await citeNoteInMargin(root);
            if (method === 'hover') {
              const box = (await source.boundingBox())!;
              await source.hover({ position: { x: box.width / 2, y: box.height / 2 } });
              if (!inMargin) {
                await source.click({ position: { x: box.width / 2, y: box.height / 2 } });
                // An opened note can carry its number onto the next line;
                // the pointer follows the number, as a reader's does.
                const moved = (await source.boundingBox())!;
                await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2);
              }
            } else {
              await source.focus();
              if (!inMargin) await page.keyboard.press('Enter');
            }
            await settle(page);
            const result = await measure(root);
            const valid = result.contained && !result.overlaps && result.triggerHit && !result.horizontalTextOverflow &&
              (method === 'hover' ? result.hovered : result.focused) &&
              result.source.href === citation.url && result.source.label === citationLabel(citation) &&
              result.source.target === '_blank' && result.source.rel === 'noopener noreferrer' &&
              result.source.describedBy === result.tooltipId && result.referenceHref === `#ref-${id}` &&
              result.text === `${result.number} ${citationLabel(citation)}, ${citation.title}. ${citationMeta(citation)}` &&
              /^\d+$/.test(result.number) && !result.scrollable;
            observations.push({ identity, result, valid });
            if (!valid) failures.push(identity);
            // The tooltip closed when the pointer or focus left; an inline
            // note closes when its number is pressed again.
            if (await note.getAttribute('data-open') === 'true') {
              if (method === 'hover') await clickCiteMark(source);
              else { await source.focus(); await page.keyboard.press('Enter'); }
              await expect(note).toHaveAttribute('data-open', 'false');
            }
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
