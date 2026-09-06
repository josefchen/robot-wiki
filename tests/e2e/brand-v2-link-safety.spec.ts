import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  censusOutboundAnchors,
  exportedRoutes,
  FIRST_PARTY_HOSTS,
  linkSafetyFingerprint,
  LINK_SAFETY_EVIDENCE_PATH,
  type OutboundAnchor,
} from '../../lib/brand-v2-link-safety.ts';
import { test, expect } from './brand-v2-static-fixture';

/**
 * Outbound links stay safe, and citation links stay keyboard reachable
 * (VAL-B2-BASE-007).
 *
 * The population is discovered from the shipped export, never listed: the
 * census walks every `index.html` under out/, parses every anchor, and keeps
 * the ones whose href leaves the site. A restyle that drops `rel` from one
 * component, or a new component that ships an unsafe outbound link, is then
 * a failure here rather than a gap nobody enumerated.
 *
 * Two properties are measured, and they need different instruments.
 *
 * Relationship safety is a property of the bytes, so it is judged on the
 * exported HTML directly, exhaustively, at zero browser cost. `noopener` is
 * the safety attribute: without it a `target="_blank"` document can reach
 * back through `window.opener`. `noreferrer` is a privacy choice the site
 * makes per surface (the footer deliberately sends a referrer to the
 * author's own profiles), so it is recorded but not required.
 *
 * Keyboard reachability is not decidable from the bytes: it depends on
 * layout, focusability and the tab order a browser actually builds. It is
 * therefore measured by walking the real tab order with the Tab key, on
 * every route the census says carries an outbound anchor. Shape is a
 * property of the markup around an anchor and reachability is not - the
 * same citation chip is reachable in flowed prose and unreachable inside a
 * collapsed disclosure or behind an overlay - so no route stands in for
 * another.
 *
 * The census itself lives in `lib/brand-v2-link-safety.ts` because the
 * enforcement generator re-derives the byte half from the same code. Two
 * copies of "which anchors leave the site" would eventually disagree, and
 * the row would then be evidence about a population the sweep never walked.
 */

const OUT = join(process.cwd(), 'out');
const EVIDENCE_PATH = join(process.cwd(), LINK_SAFETY_EVIDENCE_PATH);

/**
 * Tab presses allowed per route before it is declared an infinite focus
 * trap, derived from the route's own focusable count rather than fixed: the
 * budget has to clear the longest tab order in the export, and a fixed
 * number that clears /market-map/ today silently truncates the walk on the
 * day a route grows past it.
 */
function tabBudget(focusable: number): number {
  return focusable * 2 + 50;
}

interface KeyboardVerdict {
  route: string;
  outboundInDom: number;
  reachedByTab: number;
  unreached: string[];
  withoutFocusIndicator: string[];
  tabStops: number;
}

test.describe('outbound links are safe and citation links are keyboard reachable', () => {
  const exported = existsSync(join(OUT, 'index.html')) ? exportedRoutes(OUT) : [];
  const census: OutboundAnchor[] = exported.length > 0 ? censusOutboundAnchors(OUT) : [];
  const keyboardVerdicts: KeyboardVerdict[] = [];

  test('the export carries outbound links to judge', () => {
    expect(
      existsSync(join(OUT, 'index.html')),
      'out/ is missing: run `npm run build` before this suite',
    ).toBe(true);
    // postbuild prunes export artifacts after `next build` writes them, so a
    // sweep of a half-finished export counts routes that the shipped one
    // does not. The search index is the last thing postbuild writes.
    expect(
      existsSync(join(OUT, 'pagefind')),
      'out/ is a partial export: postbuild did not finish, so the route count would not be the shipped one',
    ).toBe(true);
    expect(census.length).toBeGreaterThan(400);
  });

  test('every outbound anchor in the export carries noopener', () => {
    const unsafe = census
      .filter((a) => !(a.rel ?? '').split(/\s+/).includes('noopener'))
      .map((a) => `${a.route} -> ${a.href} (rel=${a.rel ?? 'absent'})`);
    expect(unsafe, 'outbound anchors shipped without rel="noopener"').toEqual(
      [],
    );
  });

  test('no outbound anchor is removed from the tab order by markup', () => {
    const removed = census
      .filter((a) => a.tabindex !== null && Number(a.tabindex) < 0)
      .map((a) => `${a.route} -> ${a.href} (tabindex=${a.tabindex})`);
    expect(removed).toEqual([]);
  });

  test('every outbound anchor is a real href, not a scripted span', () => {
    const empty = census.filter((a) => a.href.trim() === '');
    expect(empty).toEqual([]);
  });

  /**
   * The walked population, read off the census rather than listed. One test
   * per route so the reporter names the route that failed and each walk gets
   * its own timeout; the coverage assertion below reconciles the verdicts
   * against the same census.
   */
  const keyboardRoutes = [...new Set(census.map((a) => a.route))].sort();

  for (const route of keyboardRoutes) {
    test(`${route} hands every outbound link to the Tab key with a visible focus ring`, async ({
      page,
      staticBase,
    }, testInfo) => {
      // /market-map/ alone is ~390 tab stops, and a stop is a round trip.
      testInfo.setTimeout(120_000);
      const failures: string[] = [];
      await page.goto(`${staticBase}${route}`, { waitUntil: 'networkidle' });

      /**
       * Every outbound anchor OCCURRENCE, stamped with a stable identity.
       *
       * Deduplicating by href is what let one reachable link speak for
       * another: `/adjacent/autonomous-vehicles/` renders the ALVINN URL as
       * several inline citation chips AND as a References entry, so a chip
       * that is hidden, covered or removed from the tab order is masked the
       * moment the reference entry with the same destination is focused.
       * The occurrence index is written into the DOM so the Tab walk can
       * name the exact anchor it reached rather than its destination.
       */
      const outboundInDom = await page.evaluate((firstParty) => {
        const occurrences: Array<{ occurrence: string; href: string }> = [];
        for (const anchor of document.querySelectorAll('a[href]')) {
          const href = (anchor as HTMLAnchorElement).href;
          if (!/^https?:\/\//i.test(href)) continue;
          try {
            if (firstParty.includes(new URL(href).hostname)) continue;
          } catch {
            continue;
          }
          const occurrence = String(occurrences.length);
          anchor.setAttribute('data-link-occurrence', occurrence);
          occurrences.push({ occurrence, href });
        }
        return occurrences;
      }, [...FIRST_PARTY_HOSTS, new URL(staticBase).hostname]);

      await page.evaluate(() => {
        document.body.setAttribute('tabindex', '-1');
        (document.body as HTMLElement).focus();
      });

      const budget = tabBudget(
        await page.evaluate(
          () =>
            document.querySelectorAll(
              'a[href], button, input, select, textarea, summary, [tabindex]',
            ).length,
        ),
      );

      const reached = new Set<string>();
      const withoutIndicator: string[] = [];
      let stops = 0;
      for (let i = 0; i < budget; i += 1) {
        await page.keyboard.press('Tab');
        stops += 1;
        // One round trip per press, not two: the walk is now 62 routes
        // rather than four, and the wrap test is the same read of
        // document.activeElement as the focus test.
        const focused: {
          wrapped: boolean;
          occurrence: string | null;
          href: string;
          visible: boolean;
        } = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          const blank = { occurrence: null, href: '', visible: false };
          if (!el || el === document.body) return { wrapped: true, ...blank };
          if (el.tagName !== 'A') return { wrapped: false, ...blank };
          const style = getComputedStyle(el);
          const outlinePx = Number.parseFloat(style.outlineWidth || '0');
          return {
            wrapped: false,
            occurrence: el.getAttribute('data-link-occurrence'),
            href: (el as HTMLAnchorElement).href,
            visible:
              (style.outlineStyle !== 'none' && outlinePx > 0) ||
              style.boxShadow !== 'none',
          };
        });
        if (focused.occurrence !== null) {
          reached.add(focused.occurrence);
          if (!focused.visible) {
            withoutIndicator.push(`#${focused.occurrence} ${focused.href}`);
          }
        }
        if (focused.wrapped && i > 0) break;
      }

      const unreached = outboundInDom
        .filter(({ occurrence }) => !reached.has(occurrence))
        .map(({ occurrence, href }) => `#${occurrence} ${href}`);
      keyboardVerdicts.push({
        route,
        outboundInDom: outboundInDom.length,
        reachedByTab: outboundInDom.length - unreached.length,
        unreached,
        withoutFocusIndicator: [...new Set(withoutIndicator)],
        tabStops: stops,
      });

      // Collected rather than thrown, so one unreachable link does not hide
      // the state of the other sixty-one routes.
      if (outboundInDom.length === 0) {
        failures.push(`${route} rendered no outbound link to reach`);
      }
      if (unreached.length > 0) {
        failures.push(
          `${route} has outbound anchor occurrences the Tab key never reaches: ${unreached.slice(0, 3).join(', ')}`,
        );
      }
      if (withoutIndicator.length > 0) {
        failures.push(
          `${route} focused outbound links with no visible focus indicator: ${[...new Set(withoutIndicator)].slice(0, 3).join(', ')}`,
        );
      }
      if (stops >= budget) {
        failures.push(
          `${route} exhausted its ${budget}-press tab budget without the focus returning to the body`,
        );
      }

      expect(failures, `${route}: keyboard reachability failures`).toEqual([]);
    });
  }

  test('the keyboard sweep covers every route the export ships an outbound link on', () => {
    // The population is the census, not a list. The generator refuses a
    // trace missing any route, so the artifact is only written once the walk
    // above has produced a verdict for every one of them.
    expect(
      keyboardVerdicts.map(({ route }) => route).sort(),
      'a route carrying outbound links produced no keyboard verdict, so the trace would be partial',
    ).toEqual([...new Set(census.map((a) => a.route))].sort());

    const byShape: Record<string, number> = {};
    for (const anchor of census) {
      byShape[anchor.shape] = (byShape[anchor.shape] ?? 0) + 1;
    }
    writeFileSync(
      EVIDENCE_PATH,
      `${JSON.stringify(
        {
          schemaVersion: 2,
          assertionId: 'VAL-B2-BASE-007',
          fingerprint: linkSafetyFingerprint({
            root: process.cwd(),
            census,
          }),
          source: 'out/ static export',
          // Per route, so a corpus check that runs without a build still has
          // the population; the reader reconciles it against the census.
          routes: [...new Set(census.map((a) => a.route))]
            .sort()
            .map((route) => {
              const anchors = census.filter((a) => a.route === route);
              return {
                route,
                outboundAnchors: anchors.length,
                distinctHrefs: new Set(anchors.map((a) => a.href)).size,
                shapes: [...new Set(anchors.map((a) => a.shape))].sort(),
              };
            }),
          routesSwept: exported.length,
          outboundAnchors: census.length,
          distinctOutboundHrefs: new Set(census.map((a) => a.href)).size,
          anchorsByShape: byShape,
          anchorsWithoutNoopener: census.filter(
            (a) => !(a.rel ?? '').split(/\s+/).includes('noopener'),
          ).length,
          anchorsWithNoreferrer: census.filter((a) =>
            (a.rel ?? '').split(/\s+/).includes('noreferrer'),
          ).length,
          keyboard: keyboardVerdicts.sort((left, right) =>
            left.route.localeCompare(right.route),
          ),
        },
        null,
        2,
      )}\n`,
    );
  });
});
