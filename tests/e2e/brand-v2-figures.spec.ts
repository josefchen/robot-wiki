import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from './brand-v2-static-fixture';
import {
  FIGURE_RUNTIME_EVIDENCE_PATH,
  FIGURE_VIEWPORTS,
  altTextAndDeliveryVerdicts,
  captionAndCreditVerdicts,
  darkInstrumentVerdicts,
  figureEvidenceFingerprint,
  figureRoutes,
  readFigureRuntimeEvidence,
  schematicSelfIdentificationVerdicts,
  type RouteObservation,
} from '../../lib/brand-v2-figure-evidence';

const ROOT = process.cwd();

/**
 * Runs inside the page. Every figure is discovered from the rendered
 * document by its `data-image-id`, so the sweep cannot be steered by a list
 * of ids that agrees with itself.
 *
 * Contrast is measured against the first ancestor background that is not
 * fully transparent, which for the schematic label is the dark instrument
 * it sits on. That is the whole point of the reading: an inverse label is
 * accessible or not depending on the plate under it, and a token audit
 * cannot see the pairing.
 */
function collectFigures(): Omit<RouteObservation, 'route' | 'viewport'> {
  const round = (value: number) => Math.round(value * 100) / 100;
  const clean = (el: Element | null | undefined) =>
    (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const parse = (colour: string): [number, number, number, number] | null => {
    const match = colour.match(/-?[\d.]+/g);
    if (!match || match.length < 3) return null;
    return [
      Number(match[0]),
      Number(match[1]),
      Number(match[2]),
      match.length > 3 ? Number(match[3]) : 1,
    ];
  };
  const luminance = (rgb: [number, number, number]) =>
    0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const backdrop = (el: Element): [number, number, number] => {
    let node: Element | null = el;
    while (node) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed[3] > 0) return [parsed[0], parsed[1], parsed[2]];
      node = node.parentElement;
    }
    return [255, 255, 255];
  };
  const contrast = (el: Element | null): number => {
    if (!el) return 0;
    const fg = parse(getComputedStyle(el).color);
    if (!fg) return 0;
    const a = luminance([fg[0], fg[1], fg[2]]);
    const b = luminance(backdrop(el));
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return round((hi + 0.05) / (lo + 0.05));
  };

  const seen = new Map<string, number>();
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>('figure[data-image-id]'),
  ).map((figure) => {
    const imageId = figure.dataset.imageId ?? '';
    const index = seen.get(imageId) ?? 0;
    seen.set(imageId, index + 1);

    const img = figure.querySelector('img');
    const caption = figure.querySelector('figcaption');
    const credit = figure.querySelector('[data-image-credit]');
    const label = figure.querySelector('[data-figure-label]');
    const surface = figure.querySelector('[data-brand-surface-id]');
    const surfaceStyle = surface ? getComputedStyle(surface) : null;
    const surfaceRgb = surface ? backdrop(surface) : null;
    const surroundRgb =
      surface?.parentElement ? backdrop(surface.parentElement) : null;
    const borderColour = surfaceStyle ? parse(surfaceStyle.borderTopColor) : null;
    const ratio = (a: number, b: number) => {
      const [hi, lo] = a > b ? [a, b] : [b, a];
      return round((hi + 0.05) / (lo + 0.05));
    };
    const box = img?.getBoundingClientRect();
    // The container the figure is supposed to stay inside: the instrument
    // when there is one, otherwise the figure's own box.
    const container = (surface ?? figure).getBoundingClientRect();

    return {
      imageId,
      index,
      figureKind: figure.dataset.figureKind ?? '',
      src: img?.getAttribute('src') ?? '',
      alt: img?.getAttribute('alt') ?? '',
      declaredWidth: img?.getAttribute('width') ?? null,
      declaredHeight: img?.getAttribute('height') ?? null,
      loading: img?.getAttribute('loading') ?? null,
      naturalWidth: img?.naturalWidth ?? 0,
      naturalHeight: img?.naturalHeight ?? 0,
      complete: img?.complete ?? false,
      renderedWidth: round(box?.width ?? 0),
      renderedHeight: round(box?.height ?? 0),
      overflowPx: round(
        Math.max(
          0,
          (box?.right ?? 0) - container.right,
          container.left - (box?.left ?? 0),
        ),
      ),
      caption: clean(caption),
      captionFontFamily: caption ? getComputedStyle(caption).fontFamily : '',
      captionContrast: contrast(caption),
      credit: clean(credit),
      creditFontFamily: credit ? getComputedStyle(credit).fontFamily : '',
      creditContrast: contrast(credit),
      creditLinks: Array.from(credit?.querySelectorAll('a') ?? []).map((a) => ({
        href: a.getAttribute('href') ?? '',
        text: clean(a),
      })),
      surfaceId: surface?.getAttribute('data-brand-surface-id') ?? null,
      surfaceBackground: surfaceStyle?.backgroundColor ?? null,
      surfaceLuminance: surfaceRgb ? round(luminance(surfaceRgb) * 1000) / 1000 : null,
      surfaceBorderWidth: surfaceStyle
        ? round(Number.parseFloat(surfaceStyle.borderTopWidth) || 0)
        : 0,
      surfaceBorderStyle: surfaceStyle?.borderTopStyle ?? null,
      surroundLuminance: surroundRgb ? round(luminance(surroundRgb) * 1000) / 1000 : null,
      // The edge a reader sees, whichever way it is drawn: the step from the
      // ground into the plate, or the step from the plate into its border.
      // The plate is bordered in its own graphite, so measuring the border
      // alone would report a bounded instrument as unbounded.
      boundaryContrast: Math.max(
        surfaceRgb && surroundRgb
          ? ratio(luminance(surfaceRgb), luminance(surroundRgb))
          : 0,
        surfaceRgb && borderColour && borderColour[3] > 0
          ? ratio(
              luminance(surfaceRgb),
              luminance([borderColour[0], borderColour[1], borderColour[2]]),
            )
          : 0,
      ),
      label: label ? clean(label) : null,
      labelFontFamily: label ? getComputedStyle(label).fontFamily : null,
      labelContrast: label ? contrast(label) : null,
    };
  });

  return {
    viewportWidth: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    visibleTextLength: (document.body.innerText ?? '').trim().length,
    figures,
  };
}

test.describe('brand-v2 figures, diagrams and licensed imagery', () => {
  test('sweeps every figure-bearing route at both widths', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(240_000);
    const routes = figureRoutes(ROOT);
    const observations: RouteObservation[] = [];

    for (const viewport of FIGURE_VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of routes) {
        const response = await page.goto(`${staticBase}${route}`);
        expect(response?.status(), route).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        // Every figure is lazily loaded, so the ones below the fold have
        // decoded nothing until the page has been scrolled through. The
        // delivery clauses are about whether the file arrives at all, so the
        // sweep has to reach the bottom before reading naturalWidth.
        await page.evaluate(async () => {
          const step = window.innerHeight;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          window.scrollTo(0, 0);
          await Promise.all(
            Array.from(document.images)
              .filter((img) => !img.complete)
              .map(
                (img) =>
                  new Promise((resolve) => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                  }),
              ),
          );
        });
        // Colour here is time-dependent without this: `transition-colors`
        // covers `color`, so a token that settles after hydration is read
        // mid-interpolation and a healthy credit measures as a failing one.
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }',
        });
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
        );
        observations.push({
          ...(await page.evaluate(collectFigures)),
          route,
          viewport: viewport.id,
        });
      }
    }

    const artifact = {
      version: 1 as const,
      fingerprint: figureEvidenceFingerprint({ root: ROOT }),
      viewports: FIGURE_VIEWPORTS.map(({ id }) => id),
      routes,
      observations,
    };

    // Enforced here as well as in the generator, so a figure that regressed
    // fails the suite that measured it and not only the artifact check.
    const evidence = readFigureRuntimeEvidence({
      artifact,
      fingerprint: artifact.fingerprint,
      root: ROOT,
    });

    for (const [label, verdicts] of [
      ['VAL-B2-ART-004 dark instruments', darkInstrumentVerdicts(evidence)],
      [
        'VAL-B2-ART-006 / VAL-B2-IMG-003 schematic self-identification',
        schematicSelfIdentificationVerdicts(evidence),
      ],
      ['VAL-B2-ART-005 captions and credits', captionAndCreditVerdicts(evidence)],
      ['VAL-B2-IMG-005 alt text and delivery', altTextAndDeliveryVerdicts(evidence)],
    ] as const) {
      const failures = [...verdicts.values()]
        .flatMap(({ failures: own }) => own)
        .sort();
      expect(failures.slice(0, 12), label).toEqual([]);
    }

    const artifactPath = join(ROOT, FIGURE_RUNTIME_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
