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
 * therefore measured by walking the real tab order with the Tab key on
 * routes chosen to cover every outbound-link SHAPE the census found. The
 * shape census is what makes the sample honest: if a new kind of outbound
 * link appears anywhere in the export and no swept route carries it, the
 * coverage assertion fails instead of the sweep quietly missing it.
 *
 * The census itself lives in `lib/brand-v2-link-safety.ts` because the
 * enforcement generator re-derives the byte half from the same code. Two
 * copies of "which anchors leave the site" would eventually disagree, and
 * the row would then be evidence about a population the sweep never walked.
 */

const OUT = join(process.cwd(), 'out');
const EVIDENCE_PATH = join(process.cwd(), LINK_SAFETY_EVIDENCE_PATH);

/**
 * Routes walked with the keyboard. Chosen to carry every shape the census
 * finds; the coverage assertion below is what keeps that claim true.
 */
const KEYBOARD_ROUTES = [
  '/classical/perception/',
  '/data-hardware/industrial-deployment/',
  '/credits/',
  '/market-map/',
] as const;

/** Tab presses allowed before a route is declared an infinite focus trap. */
const TAB_BUDGET = 700;

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

  for (const route of KEYBOARD_ROUTES) {
    test(`${route} hands every outbound link to the Tab key with a visible focus ring`, async ({
      page,
      staticBase,
    }) => {
      await page.goto(`${staticBase}${route}`, { waitUntil: 'networkidle' });

      const outboundInDom = await page.evaluate((firstParty) => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => {
            if (!/^https?:\/\//i.test(href)) return false;
            try {
              return !firstParty.includes(new URL(href).hostname);
            } catch {
              return false;
            }
          });
      }, [...FIRST_PARTY_HOSTS, new URL(staticBase).hostname]);

      await page.evaluate(() => {
        document.body.setAttribute('tabindex', '-1');
        (document.body as HTMLElement).focus();
      });

      const reached = new Set<string>();
      const withoutIndicator: string[] = [];
      let stops = 0;
      for (let i = 0; i < TAB_BUDGET; i += 1) {
        await page.keyboard.press('Tab');
        stops += 1;
        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el.tagName !== 'A') return null;
          const style = getComputedStyle(el);
          const outlinePx = Number.parseFloat(style.outlineWidth || '0');
          const visible =
            (style.outlineStyle !== 'none' && outlinePx > 0) ||
            style.boxShadow !== 'none';
          return { href: (el as HTMLAnchorElement).href, visible };
        });
        if (focused && /^https?:\/\//i.test(focused.href)) {
          reached.add(focused.href);
          if (!focused.visible) withoutIndicator.push(focused.href);
        }
        const wrapped = await page.evaluate(
          () => document.activeElement === document.body,
        );
        if (wrapped && i > 0) break;
      }

      const unreached = [...new Set(outboundInDom)].filter(
        (href) => !reached.has(href),
      );
      keyboardVerdicts.push({
        route,
        outboundInDom: new Set(outboundInDom).size,
        reachedByTab: [...new Set(outboundInDom)].length - unreached.length,
        unreached,
        withoutFocusIndicator: [...new Set(withoutIndicator)],
        tabStops: stops,
      });

      expect(
        new Set(outboundInDom).size,
        `${route} rendered no outbound link to reach`,
      ).toBeGreaterThan(0);
      expect(unreached, `${route} has outbound links the Tab key never reaches`).toEqual(
        [],
      );
      expect(
        [...new Set(withoutIndicator)],
        `${route} focused outbound links with no visible focus indicator`,
      ).toEqual([]);
    });
  }

  test('the keyboard sweep covers every outbound-link shape in the export', () => {
    const shapesPresent = new Set(census.map((a) => a.shape));
    const swept = new Set(
      census
        .filter((a) => (KEYBOARD_ROUTES as readonly string[]).includes(a.route))
        .map((a) => a.shape),
    );
    const uncovered = [...shapesPresent].filter((s) => !swept.has(s)).sort();
    expect(
      uncovered,
      'the export renders an outbound-link shape no keyboard-swept route carries',
    ).toEqual([]);

    // The generator refuses a trace that does not cover every walked route,
    // so the artifact is only written once all four have run.
    expect(
      keyboardVerdicts.map(({ route }) => route).sort(),
      'a keyboard route produced no verdict, so the trace would be partial',
    ).toEqual([...KEYBOARD_ROUTES].sort());

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
