import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageRef } from '@/components/mdx/image-ref';
import { ORIGINAL_SCHEMATICS } from '@/components/ui/original-schematics';
import { IMAGES, figureKind, getImage, type SiteImage } from '@/data/images';

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

  it('covariate shift keeps its labelled corridor, rollout and exit point', () => {
    const svg = drawingOf('covariate-shift');
    expect(texts(svg)).toEqual(
      expect.arrayContaining([
        'expert demonstrations (training)',
        'policy rollout',
        'leaves the training distribution',
      ]),
    );
    const roles = (series: string) =>
      [...svg.querySelectorAll(`[data-series="${series}"] [data-chart-mark]`)].map((m) =>
        m.getAttribute('data-chart-role'),
      );
    expect(new Set(roles('demonstrations'))).toEqual(new Set(['reference']));
    expect(roles('demonstrations')).toHaveLength(4);
    expect(roles('policy-rollout')).toEqual(['state']);
    expect(svg.querySelectorAll('[data-chart-role="highlight"][data-chart-mark="halo"]')).toHaveLength(1);
  });

  it('temporal ensembling weights the oldest prediction most, at an illustrative m', () => {
    const svg = drawingOf('temporal-ensembling');
    const labels = texts(svg);
    expect(labels).toEqual(
      expect.arrayContaining([
        'a_t',
        'chunks in flight',
        'ensemble weights',
        'raw w_i = exp(-m i)',
        'oldest first; divide by sum',
        'illustration m=0.5; reference m=0.01',
      ]),
    );
    expect(labels.filter((t) => t.startsWith('issued at'))).toEqual([
      'issued at t-2',
      'issued at t-1',
      'issued at t',
      'issued at t-2',
      'issued at t-1',
      'issued at t',
    ]);
    const bars = [...svg.querySelectorAll('[data-chart-mark="bar"]')];
    expect(bars.map((b) => b.getAttribute('data-chart-role'))).toEqual(['value', 'value', 'value']);
    const widths = bars.map((b) => Number(b.getAttribute('width')));
    const tops = bars.map((b) => Number(b.getAttribute('y')));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    // Independent oracle: raw weights exp(-m i) at m = 0.5, oldest first.
    [1, Math.exp(-0.5), Math.exp(-1)].forEach((weight, i) => {
      expect(widths[i] / widths[0]).toBeCloseTo(weight, 6);
    });
    const values = labels.filter((t) => /^\d\.\d\d$/.test(t));
    expect(values).toEqual(['1.00', '0.61', '0.37']);
    expect(svg.querySelectorAll('[data-chart-role="action"][data-chart-mark="span"]')).toHaveLength(3);
    expect(svg.querySelectorAll('[data-chart-role="highlight"][data-chart-mark="dot"]')).toHaveLength(3);
  });
});
