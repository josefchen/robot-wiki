import { render } from '@testing-library/react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  KALMAN_BUMPS,
  KALMAN_READOUTS,
  KALMAN_SCENE,
  KalmanPredictUpdate,
  KalmanStage,
  jawFaces,
  kalmanFrameAt,
} from '@/components/motion/scenes/kalman-predict-update';
import { StaticTimeProvider } from '@/components/motion/scene-context';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { pointAt, shiftX, xOf } from '@/components/iso/figures/kalman-rail';
import { expectedSceneRole } from '@/lib/motion-scene-roles';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

const SPANS = beatSpans(KALMAN_SCENE.beats);
const stageAt = (t: number) => {
  const { container } = render(
    <StaticTimeProvider value={t}>
      <KalmanStage />
    </StaticTimeProvider>,
  );
  return container.querySelector('svg')!;
};
/** The opacity a mark paints with: its own times every group above it in the stage. */
const inkOf = (node: Element) => {
  let alpha = 1;
  for (let el: Element | null = node; el && el.tagName.toLowerCase() !== 'svg'; el = el.parentElement) {
    const opacity = el.getAttribute('opacity');
    if (opacity !== null) alpha *= Number(opacity);
  }
  return alpha;
};
const ROLE_PAINT = {
  state: 'var(--role-state-stage)',
  measurement: 'var(--role-measurement-stage)',
  highlight: 'var(--role-highlight-stage)',
} as const;

describe('KalmanPredictUpdate stage (the estimating rail)', () => {
  it('draws no words: no text, title, description or embedded HTML in the drawing, at any beat', () => {
    for (const t of [0, ...SPANS.map((span) => span.end), SPANS[3].start + 1000]) {
      const stage = stageAt(t);
      expect(stage.querySelectorAll('text, title, desc, foreignObject, [data-scene-glyph]'), `t=${t}`).toHaveLength(0);
      // Not a stray character either: every seam reaches the drawing as line markup, never as text.
      expect(stage.textContent?.trim(), `t=${t}`).toBe('');
      expect(stage.getAttribute('aria-hidden')).toBe('true');
      expect(stage.hasAttribute('aria-label')).toBe(false);
    }
  });

  it('keeps every mark\'s name and reviewed role, painted only in its role\'s colour', () => {
    const stage = stageAt(posterTime(SPANS));
    const names = [...new Set([...stage.querySelectorAll('[data-scene-mark]')].map((node) => node.getAttribute('data-scene-mark')!))];
    expect(names.sort()).toEqual([
      'blend-area', 'blend-curve', 'blend-point', 'blend-share', 'guess-area', 'guess-curve', 'reading-area', 'reading-curve',
    ]);
    // One element per mark, so the observed evidence records each mark once per beat.
    expect(stage.querySelectorAll('[data-scene-mark]')).toHaveLength(names.length);
    for (const node of stage.querySelectorAll('[data-scene-mark]')) {
      const role = expectedSceneRole('kalman-predict-update', node.getAttribute('data-scene-mark')!) as keyof typeof ROLE_PAINT;
      const paints = [node.getAttribute('fill'), node.getAttribute('stroke')].filter((paint) => paint && paint !== 'none');
      expect(paints.length).toBeGreaterThan(0);
      for (const paint of paints) expect(paint).toBe(ROLE_PAINT[role]);
    }
  });

  it('shows each belief from its own beat on: the guess from the first, the reading from the second, the blend and its share from the third', () => {
    const shownFrom = { guess: 1, reading: 2, blend: 3, share: 3, point: 3 } as const;
    const markOf = { guess: 'guess-area', reading: 'reading-area', blend: 'blend-area', share: 'blend-share', point: 'blend-point' } as const;
    for (const [index, span] of SPANS.entries()) {
      const stage = stageAt(span.end);
      for (const [name, first] of Object.entries(shownFrom) as Array<[keyof typeof markOf, number]>) {
        const ink = inkOf(stage.querySelector(`[data-scene-mark="${markOf[name]}"]`)!);
        if (index + 1 >= first) expect(ink, `${name} at beat ${index + 1}`).toBeGreaterThan(0.5);
        else expect(ink, `${name} at beat ${index + 1}`).toBe(0);
      }
    }
  });

  it('moves every carriage, jaw and the cart to the filter\'s numbers, in world units drawn to scale', () => {
    const t = posterTime(SPANS);
    const frame = kalmanFrameAt(t);
    const stage = stageAt(t);
    expect(stage.querySelector('[data-scene-part="cart"]')!.getAttribute('transform')).toBe(shiftX(xOf(KALMAN_BUMPS.guess.mean)));
    for (const [lane, bump] of [['guess', frame.guess], ['reading', frame.reading], ['blend', frame.blend]] as const) {
      const caliper = stage.querySelector(`[data-scene-part="${lane}-caliper"]`)!;
      const moved = [...caliper.querySelectorAll(':scope > g[transform]')].map((node) => node.getAttribute('transform'));
      const { left, centre, right } = jawFaces(bump);
      expect(moved, lane).toEqual([shiftX(left), shiftX(centre), shiftX(right)]);
    }
    const point = stage.querySelector('[data-scene-mark="blend-point"]')!;
    const [px, py] = pointAt(xOf(KALMAN_BUMPS.blend.mean));
    expect(Number(point.getAttribute('cx'))).toBeCloseTo(px, 2);
    expect(Number(point.getAttribute('cy'))).toBeCloseTo(py, 2);
  });

  it('lights one part per beat: the odometer drum, then the rangefinder\'s lens and beam, then only the share rule', () => {
    const litParts = (t: number) => [...stageAt(t).querySelectorAll('[data-tone="lit"]')]
      .filter((node) => inkOf(node) > 0)
      .map((node) => node.closest('[data-scene-part]')?.getAttribute('data-scene-part'));
    expect(litParts(SPANS[0].start + 1000)).toEqual(['cart']);
    expect([...new Set(litParts(SPANS[1].start + 500))].sort()).toEqual(['rangefinder-beam', 'rangefinder-lens']);
    for (const beat of [2, 3, 4]) expect(litParts(SPANS[beat].end), `beat ${beat + 1}`).toEqual([]);
    const poster = stageAt(posterTime(SPANS));
    expect(inkOf(poster.querySelector('[data-scene-part="share-rule"]')!)).toBe(1);
  });

  it('prerenders the poster with its readout in words and passes the figure-system and main-view checks', () => {
    const { container } = render(<KalmanPredictUpdate />);
    expect(container.querySelector('[data-testid="motion-readout"]')).toHaveTextContent(KALMAN_READOUTS[4]);
    const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<KalmanPredictUpdate />)}</main></body></html>`;
    const { figures, violations } = inspectFigureDocument(html, '/classical/state-estimation/');
    expect(figures).toHaveLength(1);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-motion-scene]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
    expect(renderToString(<KalmanPredictUpdate />)).not.toContain('<text');
  });
});
