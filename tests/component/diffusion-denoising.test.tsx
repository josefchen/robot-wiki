import { render } from '@testing-library/react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  DIFFUSION_SCENE,
  DiffusionDenoising,
  DiffusionStage,
  diffusionPinsAt,
  diffusionReadoutAt,
} from '@/components/motion/scenes/diffusion-denoising';
import { StaticTimeProvider } from '@/components/motion/scene-context';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { ballAt, type Lane } from '@/components/iso/figures/denoising-gauge';
import { PIN_COUNT } from '@/lib/denoising-gauge';
import { expectedSceneRole } from '@/lib/motion-scene-roles';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

const SPANS = beatSpans(DIFFUSION_SCENE.beats);
const POSTER = posterTime(SPANS);
const middle = (beat: number) => SPANS[beat].start + SPANS[beat].duration / 2;
const stageAt = (t: number) => {
  const { container } = render(
    <StaticTimeProvider value={t}>
      <DiffusionStage />
    </StaticTimeProvider>,
  );
  return container.querySelector('svg')!;
};
/** The opacity a part paints with: its own times every group above it in the stage. */
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
  action: 'var(--role-action-stage)',
  reference: 'var(--role-reference-stage)',
  highlight: 'var(--role-highlight-stage)',
} as const;
const BALLS = Array.from({ length: 2 * PIN_COUNT }, (_, n) => n);

describe('DiffusionDenoising stage (the denoising gauge)', () => {
  it('draws no words: no text, title, description or embedded HTML in the drawing, at any beat', () => {
    for (const t of [0, ...SPANS.map((span) => span.end), middle(2), middle(3)]) {
      const stage = stageAt(t);
      expect(stage.querySelectorAll('text, title, desc, foreignObject, [data-scene-glyph]'), `t=${t}`).toHaveLength(0);
      expect(stage.textContent?.trim(), `t=${t}`).toBe('');
      expect(stage.getAttribute('aria-hidden')).toBe('true');
      expect(stage.hasAttribute('aria-label')).toBe(false);
    }
  });

  it('keeps the scene\'s mark names and reviewed roles, one element each, painted only in its role\'s colour', () => {
    const stage = stageAt(POSTER);
    const names = [...stage.querySelectorAll('[data-scene-mark]')].map((node) => node.getAttribute('data-scene-mark')!);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual([
      ...BALLS.map((n) => `action-${n}`),
      'demonstration-0',
      'demonstration-1',
      ...BALLS.map((n) => `noise-${n}`),
      'observed-state',
      'worked-guess',
    ].sort());
    for (const node of stage.querySelectorAll('[data-scene-mark]')) {
      const role = expectedSceneRole('diffusion-denoising', node.getAttribute('data-scene-mark')!) as keyof typeof ROLE_PAINT;
      const paints = [node.getAttribute('fill'), node.getAttribute('stroke')].filter((paint) => paint && paint !== 'none');
      expect(paints.length).toBeGreaterThan(0);
      for (const paint of paints) expect(paint).toBe(ROLE_PAINT[role]);
    }
  });

  it('shows each mark in its own beats: demonstrations first, grey balls in the noise, the followed guess while it is cleaned up', () => {
    const ink = (t: number, mark: string) => inkOf(stageAt(t).querySelector(`[data-scene-mark="${mark}"]`)!);
    // The demonstrations, set in the first beat, drown in the second.
    expect(ink(SPANS[0].end, 'demonstration-0')).toBe(1);
    expect(ink(SPANS[0].end, 'demonstration-1')).toBe(1);
    for (const beat of [1, 2, 3, 4]) expect(ink(SPANS[beat].end - 1, 'demonstration-0'), `beat ${beat + 1}`).toBeLessThan(0.01);
    // Balls: ink when set, grey when random.
    for (const n of [0, 15, 16, 31]) {
      expect(ink(SPANS[0].end, `action-${n}`)).toBe(1);
      expect(ink(SPANS[1].end - 1, `noise-${n}`)).toBeGreaterThan(0.99);
      expect(ink(SPANS[1].end - 1, `action-${n}`)).toBeLessThan(0.01);
      expect(ink(POSTER, `action-${n}`)).toBe(1);
      expect(ink(POSTER, `noise-${n}`)).toBe(0);
    }
    // The followed guess is highlighted through the clean-up only.
    expect(ink(middle(2), 'worked-guess')).toBe(1);
    for (const t of [SPANS[0].end, SPANS[1].end, middle(3), POSTER]) expect(ink(t, 'worked-guess'), `t=${t}`).toBe(0);
    // What the camera sees is always there.
    for (const t of [0, middle(2), POSTER]) expect(ink(t, 'observed-state')).toBe(1);
  });

  it('puts every ball where the model puts its pin, at every beat end and mid-step', () => {
    for (const t of [SPANS[0].end, SPANS[1].end - 1, middle(2), POSTER]) {
      const stage = stageAt(t);
      for (const lane of [0, 1] as Lane[]) {
        const heights = diffusionPinsAt(lane, t);
        for (let i = 0; i < PIN_COUNT; i += 1) {
          const ball = stage.querySelector(`[data-scene-mark="action-${lane * PIN_COUNT + i}"]`)!;
          const [x, y] = ballAt(lane, i, heights[i]);
          expect(Number(ball.getAttribute('cx')), `gauge ${lane} pin ${i} at ${t}`).toBeCloseTo(x, 1);
          expect(Number(ball.getAttribute('cy')), `gauge ${lane} pin ${i} at ${t}`).toBeCloseTo(y, 1);
        }
      }
    }
  });

  it('lights one part per beat: the shaker, then the camera\'s sight line, then both moves', () => {
    const litParts = (t: number) => [...new Set([...stageAt(t).querySelectorAll('[data-tone="lit"]')]
      .filter((node) => inkOf(node) > 0)
      .map((node) => node.closest('[data-scene-part]')?.getAttribute('data-scene-part')))].sort();
    expect(litParts(middle(0))).toEqual([]);
    expect(litParts(middle(1))).toEqual(['shaker']);
    // In the clean-up the lit part is the followed guess's highlight mark.
    expect(litParts(middle(2))).toEqual([]);
    expect(litParts(middle(3))).toEqual(['sight-line']);
    expect(litParts(POSTER)).toEqual(['gauge-0-thread', 'gauge-1-thread']);
  });

  it('prerenders the poster with its readout in words and passes the figure-system and main-view checks', () => {
    const { container } = render(<DiffusionDenoising />);
    expect(container.querySelector('[data-testid="motion-readout"]')).toHaveTextContent(diffusionReadoutAt(POSTER));
    const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<DiffusionDenoising />)}</main></body></html>`;
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/diffusion-policy/');
    expect(figures).toHaveLength(1);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-motion-scene]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
    expect(renderToString(<DiffusionDenoising />)).not.toContain('<text');
  });
});
