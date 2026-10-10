import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ANNOTATION_ARROW,
  CHART_HATCH,
  CHART_STROKE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  StageAnnotation,
  annotationArrow,
  roleColour,
} from '@/components/motion/chart';
import tokens from '@/motion-tokens.json';
import { ChartFixtureFigure } from '../fixtures/figure-system/chart-fixture';

// Owner-approved successor (owner directive of 2026-10-10 02:00, figures to
// the Pantheon research-page standard): structure paints the figure palette's
// custom properties (ink, muted, the hairline) next to the role tokens.
const TOKEN_PAINT = /^(none|url\(#[\w-]+\)|var\(--(role-[a-z]+-stage|color-[a-z-]+|ink|muted|line|line-strong|chart-(?:background|medium|dark))\))$/;

function fixture() {
  const { container } = render(<ChartFixtureFigure />);
  return container;
}

function marks(container: HTMLElement, kind: string) {
  return [...container.querySelectorAll(`[data-chart-mark="${kind}"]`)];
}

describe('chart primitives on the light page stage', () => {
  it('reads every size from the motion tokens', () => {
    // Successor (2026-10-10 figure standard): a 1.5 px trace and a 1 px dashed
    // reference, painted at CSS pixels by stage.css whatever the stage scale.
    expect(CHART_STROKE.trace).toBe(1.5);
    expect(CHART_STROKE.reference).toBe(1);
    expect(CHART_STROKE.structure).toBe(1);
    expect(CHART_HATCH.angle).toBe(45);
    expect(CHART_UNCERTAINTY.fillAlpha).toBe(tokens.uncertainty.fillAlpha);
    expect(CHART_TYPE.minPx).toBe(tokens.stage.labelMinPx);
    expect(tokens.roles.state.encoding).toContain(`${CHART_STROKE.trace} px`);
    expect(tokens.roles.reference.encoding).toContain(`${CHART_STROKE.reference} px`);
  });

  it('draws inside the shared frame on the light page stage', () => {
    const container = fixture();
    const stage = container.querySelector('[data-figure-frame] [data-figure-stage]');
    expect(stage?.getAttribute('data-brand-surface-id')).toBe('surface:flat');
    expect(stage?.querySelectorAll('svg[data-chart]').length).toBe(2);
  });

  it('axes: ink hairline axes over a hairline grid, tick labels at 11 px and axis names at 12 px', () => {
    const axes = fixture().querySelector('[data-chart-axes]')!;
    const lines = [...axes.querySelectorAll('line')];
    expect(lines.length).toBeGreaterThan(0);
    // Successor (2026-10-10 figure standard): axis and tick lines are ink;
    // grid lines are the page hairline.
    for (const line of lines) {
      expect(line.getAttribute('stroke')).toBe(
        line.hasAttribute('data-chart-grid') ? 'var(--line)' : 'var(--ink)',
      );
    }
    const ticks = [...axes.querySelectorAll('text[data-scene-tick]')];
    const names = [...axes.querySelectorAll('text[data-scene-axis]')];
    expect(ticks.map((t) => t.textContent)).toEqual(['0', '5', '10', '0', '0.5', '1']);
    expect(names.map((t) => t.textContent)).toEqual(['steps', 'success']);
    for (const text of ticks) expect(Number(text.getAttribute('font-size'))).toBe(11);
    for (const text of names) expect(Number(text.getAttribute('font-size'))).toBe(12);
  });

  it('line trace: state role at the trace width; reference dashed at its width', () => {
    const [state, reference] = marks(fixture(), 'line');
    expect(state.getAttribute('stroke')).toBe(roleColour('state'));
    expect(state.getAttribute('stroke-width')).toBe('1.5');
    expect(state.getAttribute('stroke-dasharray')).toBeNull();
    expect(reference.getAttribute('stroke')).toBe('var(--role-reference-stage)');
    expect(reference.getAttribute('stroke-width')).toBe('1');
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
    expect(legend.className).toContain('text-[12px]');
  });

  it('paints only token colours, on at most three text sizes of at least 11 px', () => {
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
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
    expect(sizes.size).toBeLessThanOrEqual(3);
  });

  it('annotation: a ring by default, or an arrowhead that stops short of its target', () => {
    const ring = render(
      <svg><StageAnnotation x={10} y={10} lines={['note']} target={[60, 80]} /></svg>,
    ).container;
    expect(ring.querySelector('[data-figure-annotation] circle')).not.toBeNull();
    expect(ring.querySelector('[data-annotation-pointer]')).toBeNull();

    const from = [10, 20] as const;
    const target = [70, 100] as const;
    const arrow = render(
      <svg><StageAnnotation x={10} y={10} lines={['note']} from={from} target={target} pointer="arrow" /></svg>,
    ).container;
    const note = arrow.querySelector('[data-figure-annotation]')!;
    expect(note.querySelector('circle')).toBeNull();
    const pointer = note.querySelector('[data-annotation-pointer="arrow"]')!;
    const head = pointer.querySelector('polygon')!.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number));
    const [tip] = head;
    // The tip sits on the leader's line, the gap short of the target.
    expect(Math.hypot(target[0] - tip[0], target[1] - tip[1])).toBeCloseTo(ANNOTATION_ARROW.gap, 6);
    const line = pointer.querySelector('line')!;
    expect(Number(line.getAttribute('x1'))).toBe(from[0]);
    expect(Number(line.getAttribute('y1'))).toBe(from[1]);
    expect(pointer.querySelector('polygon')!.getAttribute('fill')).toBe(roleColour('highlight'));

    // Too short to carry a head: no pointer, and still no ring.
    expect(annotationArrow([0, 0], [5, 5])).toBeNull();
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
