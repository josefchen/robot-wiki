import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CHART_HATCH,
  CHART_STROKE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  roleColour,
} from '@/components/motion/chart';
import tokens from '@/motion-tokens.json';
import { ChartFixtureFigure } from '../fixtures/figure-system/chart-fixture';

const TOKEN_PAINT = /^(none|url\(#[\w-]+\)|var\(--(role-[a-z]+-stage|color-[a-z-]+)\))$/;

function fixture() {
  const { container } = render(<ChartFixtureFigure />);
  return container;
}

function marks(container: HTMLElement, kind: string) {
  return [...container.querySelectorAll(`[data-chart-mark="${kind}"]`)];
}

describe('chart primitives on the graphite stage', () => {
  it('reads every size from the motion tokens', () => {
    expect(CHART_STROKE.trace).toBe(2);
    expect(CHART_STROKE.reference).toBe(1.5);
    expect(CHART_HATCH.angle).toBe(45);
    expect(CHART_UNCERTAINTY.fillAlpha).toBe(tokens.uncertainty.fillAlpha);
    expect(CHART_TYPE.minPx).toBe(tokens.stage.labelMinPx);
    expect(tokens.roles.state.encoding).toContain(`${CHART_STROKE.trace} px`);
    expect(tokens.roles.reference.encoding).toContain(`${CHART_STROKE.reference} px`);
  });

  it('draws inside the shared frame on the bounded graphite stage', () => {
    const container = fixture();
    const stage = container.querySelector('[data-figure-frame] [data-figure-stage]');
    expect(stage?.getAttribute('data-brand-surface-id')).toBe('surface:bounded-dark-instrument');
    expect(stage?.querySelectorAll('svg[data-chart]').length).toBe(2);
  });

  it('axes: concrete structure lines with tick and axis labels at 12 px or more', () => {
    const axes = fixture().querySelector('[data-chart-axes]')!;
    const lines = [...axes.querySelectorAll('line')];
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.getAttribute('stroke')).toBe('var(--color-concrete)');
    const ticks = [...axes.querySelectorAll('text[data-scene-tick]')];
    const names = [...axes.querySelectorAll('text[data-scene-axis]')];
    expect(ticks.map((t) => t.textContent)).toEqual(['0', '5', '10', '0', '0.5', '1']);
    expect(names.map((t) => t.textContent)).toEqual(['steps', 'success']);
    for (const text of [...ticks, ...names]) {
      expect(Number(text.getAttribute('font-size'))).toBeGreaterThanOrEqual(12);
    }
  });

  it('line trace: state role at the trace width; reference dashed at its width', () => {
    const [state, reference] = marks(fixture(), 'line');
    expect(state.getAttribute('stroke')).toBe(roleColour('state'));
    expect(state.getAttribute('stroke-width')).toBe('2');
    expect(state.getAttribute('stroke-dasharray')).toBeNull();
    expect(reference.getAttribute('stroke')).toBe('var(--role-reference-stage)');
    expect(reference.getAttribute('stroke-width')).toBe('1.5');
    expect(reference.getAttribute('stroke-dasharray')).toBe(CHART_STROKE.dash);
  });

  it('bar: a filled value-role rect', () => {
    const [bar] = marks(fixture(), 'bar');
    expect(bar.tagName.toLowerCase()).toBe('rect');
    expect(bar.getAttribute('fill')).toBe('var(--role-value-stage)');
  });

  it('point marker: measurement dots and crosses', () => {
    const container = fixture();
    expect(marks(container, 'dot')[0].getAttribute('fill')).toBe('var(--role-measurement-stage)');
    expect(marks(container, 'cross')[0].getAttribute('stroke')).toBe('var(--role-measurement-stage)');
  });

  it('constraint hatch: a 45 degree pattern in the constraint role, never a solid fill', () => {
    const [hatch] = marks(fixture(), 'hatch');
    const pattern = hatch.querySelector('pattern')!;
    expect(pattern.getAttribute('patternTransform')).toBe('rotate(45)');
    expect(pattern.querySelector('line')?.getAttribute('stroke')).toBe('var(--role-constraint-stage)');
    const region = hatch.querySelector('rect')!;
    expect(region.getAttribute('fill')).toBe(`url(#${pattern.id})`);
  });

  it('uncertainty band: the owner role at the token alpha with dashed edges', () => {
    const [band] = marks(fixture(), 'band');
    const [fill, ...edges] = [...band.querySelectorAll('path')];
    expect(fill.getAttribute('fill')).toBe('var(--role-state-stage)');
    expect(Number(fill.getAttribute('fill-opacity'))).toBe(tokens.uncertainty.fillAlpha);
    expect(edges.map((e) => e.getAttribute('stroke-dasharray'))).toEqual([CHART_STROKE.dash, CHART_STROKE.dash]);
  });

  it('small multiples: one label per panel over a single shared x axis', () => {
    const multiples = fixture().querySelector('[data-chart-small-multiples]')!;
    expect(multiples.querySelectorAll('[data-chart-panel]').length).toBe(2);
    expect(multiples.querySelectorAll('[data-chart-axes]').length).toBe(1);
    const labels = [...multiples.querySelectorAll('text[data-chart-label]')].map((t) => t.textContent);
    expect(labels).toEqual(['left arm', 'right arm']);
  });

  it('legend: on the stage, one swatch per series in the series role', () => {
    const container = fixture();
    const legend = container.querySelector('[data-figure-stage] [data-figure-legend]')!;
    const items = [...legend.querySelectorAll('[data-legend-item]')];
    expect(items.map((i) => i.getAttribute('data-legend-series'))).toEqual([
      'state', 'reference', 'measurement', 'value', 'constraint', 'state',
    ]);
    expect(legend.className).toContain('text-[13px]');
  });

  it('paints only token colours, on three text sizes of at least 12 px', () => {
    const container = fixture();
    for (const node of container.querySelectorAll('svg *')) {
      for (const attribute of ['fill', 'stroke']) {
        const value = node.getAttribute(attribute);
        if (value !== null) expect(value).toMatch(TOKEN_PAINT);
      }
    }
    const sizes = new Set(
      [...container.querySelectorAll('svg text')].map((t) => Number(t.getAttribute('font-size'))),
    );
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
    expect(sizes.size).toBeLessThanOrEqual(3);
  });

  it('carries no colour literal or bare font size in the primitive sources', () => {
    const dir = join(process.cwd(), 'components/motion/chart');
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), 'utf8');
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
      expect(source, file).not.toMatch(/fontSize=\{\d/);
    }
  });
});
