import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageRef } from '@/components/mdx/image-ref';
import { ORIGINAL_SCHEMATICS } from '@/components/ui/original-schematics';
import { IMAGES, figureKind, getImage, type SiteImage } from '@/data/images';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

/**
 * VAL-OPUS-127: the original schematics are drawn inline in the shared
 * figure frame, on the graphite stage with no plate of their own, in role
 * colours only, with their labels on the stage type scale. The registry
 * record (alt, credit, licence) is unchanged and names the drawing.
 */

const SCHEMATIC_IDS = IMAGES.filter(
  (image) => figureKind(image) === 'original-schematic',
).map((image) => image.id);

function drawingOf(id: string): SVGSVGElement {
  render(<ImageRef id={id} />);
  const figure = document.querySelector(`figure[data-figure-frame="${id}"]`)!;
  expect(figure, id).not.toBeNull();
  return figure.querySelector<SVGSVGElement>('[data-figure-stage] svg[role="img"]')!;
}

function texts(svg: SVGSVGElement): string[] {
  return [...svg.querySelectorAll('text')].map((t) => (t.textContent ?? '').trim());
}

describe('original schematics on the figure stage', () => {
  it('draws every registered schematic, and nothing else', () => {
    expect([...SCHEMATIC_IDS].sort()).toEqual(Object.keys(ORIGINAL_SCHEMATICS).sort());
  });

  it.each(SCHEMATIC_IDS)('%s is a stage drawing named by its alt text', (id) => {
    const svg = drawingOf(id);
    const figure = svg.closest('figure')!;
    expect(figure.querySelector('img')).toBeNull();
    expect(svg).toHaveAttribute('aria-label', (getImage(id) as SiteImage).alt);
    expect(svg.getAttribute('class')).toContain('motion-stage-svg');
    expect(figure.querySelector('[data-figure-label]')!.textContent).toBe('Original schematic');
    const caption = figure.querySelector('figcaption')!.textContent!;
    expect(caption).toBe(ORIGINAL_SCHEMATICS[id].caption);
    expect(caption.split(/\s+/).length).toBeLessThanOrEqual(20);
  });

  it.each(SCHEMATIC_IDS)('%s paints only tokens and draws no plate', (id) => {
    const svg = drawingOf(id);
    const viewWidth = Number(svg.getAttribute('viewBox')!.split(/\s+/)[2]);
    for (const el of svg.querySelectorAll('*')) {
      for (const attribute of ['fill', 'stroke']) {
        const value = el.getAttribute(attribute);
        if (value === null || value === 'none' || value.startsWith('url(')) continue;
        expect(value, `${id} <${el.tagName}> ${attribute}`).toMatch(/^var\(--/);
      }
    }
    for (const rect of svg.querySelectorAll('rect')) {
      expect(Number(rect.getAttribute('width')), `${id} rect`).toBeLessThan(viewWidth * 0.9);
    }
    // Stage text takes the stage type scale: the brand sans at 12 px or more.
    for (const text of svg.querySelectorAll('text')) {
      expect(Number(text.getAttribute('font-size')), text.textContent!).toBeGreaterThanOrEqual(12);
      expect(text.hasAttribute('data-scene-readout'), text.textContent!).toBe(false);
    }
  });

  it.each(SCHEMATIC_IDS)('%s leads with a takeaway and keeps symbols in "How this was made"', (id) => {
    const svg = drawingOf(id);
    const figure = svg.closest('figure')!;
    const schematic = ORIGINAL_SCHEMATICS[id];
    expect(figure.querySelector('[data-figure-kicker]')!.textContent).toBe(schematic.kicker);
    expect(schematic.kicker.split(/\s+/).length).toBeLessThanOrEqual(6);
    expect(figure.querySelector('[data-figure-title]')!.textContent).toBe(schematic.heading);
    expect(schematic.heading.split(/\s+/).length).toBeLessThanOrEqual(10);
    expect(mainViewSymbolHits(figure)).toEqual([]);
    expect(figure.querySelector('[data-figure-fold="method"]')).not.toBeNull();
    expect(svg.querySelectorAll('[data-figure-annotation]').length).toBeGreaterThanOrEqual(1);
    expect(svg.querySelectorAll('[data-figure-annotation]').length).toBeLessThanOrEqual(2);
  });

  it('covariate shift keeps its labelled corridor, robot run and first-slip note', () => {
    const svg = drawingOf('covariate-shift');
    expect(texts(svg)).toEqual(
      expect.arrayContaining(['paths a person showed it', 'the robot alone']),
    );
    const note = svg.querySelector('[data-figure-annotation]')!;
    expect(note.textContent).toBe('First slip: from here onit has no examples to copy');
    // The note's ring sits on the point where the run leaves the corridor.
    const ring = note.querySelector('circle')!;
    expect(Number(ring.getAttribute('cx'))).toBeCloseTo(114.4, 1);
    expect(Number(ring.getAttribute('cy'))).toBeCloseTo(77.4, 1);
    const roles = (series: string) =>
      [...svg.querySelectorAll(`[data-series="${series}"] [data-chart-mark]`)].map((m) =>
        m.getAttribute('data-chart-role'),
      );
    expect(new Set(roles('demonstrations'))).toEqual(new Set(['reference']));
    expect(roles('demonstrations')).toHaveLength(4);
    expect(roles('policy-rollout')).toEqual(['state']);
    expect(svg.querySelectorAll('[data-chart-mark="gripper"]')).toHaveLength(1);
    const method = svg.closest('figure')!.querySelector('[data-figure-fold="method"]')!;
    expect(method.textContent).toContain('covariate shift');
    expect(method.textContent).toContain('Ross, Gordon and Bagnell (2011)');
  });

  it('temporal ensembling weights the oldest prediction most, at an illustrative m', () => {
    const svg = drawingOf('temporal-ensembling');
    const labels = texts(svg);
    expect(labels).toEqual(['oldest plan, 51%', 'next plan, 31%', 'newest plan, 19%', 'the move it makes']);
    const arrows = [...svg.querySelectorAll('[data-testid="te-suggestion"]')];
    expect(arrows.map((a) => a.getAttribute('data-chart-role'))).toEqual(['action', 'action', 'action']);
    const widths = arrows.map((a) => Number(a.querySelector('line')!.getAttribute('stroke-width')));
    // Independent oracle: raw weights exp(-m i) at m = 0.5, oldest first,
    // and each arrow is as thick as its weight.
    const raw = [1, Math.exp(-0.5), Math.exp(-1)];
    raw.forEach((weight, i) => {
      expect(widths[i] / widths[0]).toBeCloseTo(weight, 1);
    });
    const sum = raw.reduce((a, b) => a + b, 0);
    const shares = arrows.map((a) => Number(a.getAttribute('data-share')));
    raw.forEach((weight, i) => expect(shares[i]).toBeCloseTo(weight / sum, 2));
    // The blended move lands between the suggestions, nearest the oldest.
    const tipY = (a: Element) => Number(a.querySelector('path')!.getAttribute('d')!.split(/[ ML]+/)[2]);
    const blend = tipY(svg.querySelector('[data-testid="te-blend"]')!);
    const tips = arrows.map(tipY);
    expect(blend).toBeGreaterThan(tips[0]);
    expect(blend).toBeLessThan(tips[1]);
    expect(blend).toBeCloseTo(raw.reduce((acc, w, i) => acc + (w / sum) * tips[i], 0), 1);
    expect(svg.querySelectorAll('[data-chart-mark="gripper"]')).toHaveLength(1);
    const method = svg.closest('figure')!.querySelector('[data-figure-fold="method"]')!;
    expect(method.textContent).toContain('w_i = exp(−m·i)');
    expect(method.textContent).toContain('divided by their sum');
    expect(method.textContent).toContain('m = 0.5');
    expect(method.textContent).toContain('m = 0.01');
    expect(method.textContent).toContain('1.00, 0.61, 0.37');
    expect(method.textContent).toContain('the oldest gets the largest weight');
  });
});
