import { act, render } from '@testing-library/react';
import { motionValue } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { AnimatedElement, svgAttributeName } from '@/components/motion/animated';
import { Create } from '@/components/motion/primitives';
import { SceneTimeProvider, StaticTimeProvider } from '@/components/motion/scene-context';

describe('svgAttributeName', () => {
  it('spells camelCase presentation props as their hyphenated SVG attributes', () => {
    expect(svgAttributeName('strokeDashoffset')).toBe('stroke-dashoffset');
    expect(svgAttributeName('fillOpacity')).toBe('fill-opacity');
    expect(svgAttributeName('strokeWidth')).toBe('stroke-width');
    expect(svgAttributeName('textAnchor')).toBe('text-anchor');
  });

  it('keeps lowercase names and the SVG attributes that are camelCase in markup', () => {
    for (const name of ['d', 'opacity', 'transform', 'cx', 'fill']) expect(svgAttributeName(name)).toBe(name);
    for (const name of ['pathLength', 'viewBox', 'gradientTransform', 'textLength']) {
      expect(svgAttributeName(name)).toBe(name);
    }
  });
});

describe('AnimatedElement live bindings', () => {
  it('writes camelCase bindings to the attributes the browser reads while the clock runs', () => {
    const time = motionValue(0);
    const { container } = render(
      <StaticTimeProvider value={1}>
        <SceneTimeProvider value={time}>
          <svg>
            <AnimatedElement
              as="path"
              data-testid="bound"
              bindings={{
                d: (t) => `M0 0L${t * 10} 0`,
                strokeDashoffset: (t) => 1 - t,
                fillOpacity: (t) => t,
                pathLength: () => 1,
              }}
            />
          </svg>
        </SceneTimeProvider>
      </StaticTimeProvider>,
    );
    const path = container.querySelector('[data-testid="bound"]')!;
    // The layout effect replaces the poster-time values with the clock's.
    expect(path.getAttribute('stroke-dashoffset')).toBe('1');
    expect(path.getAttribute('fill-opacity')).toBe('0');
    act(() => time.set(0.25));
    expect(path.getAttribute('d')).toBe('M0 0L2.5 0');
    expect(path.getAttribute('stroke-dashoffset')).toBe('0.75');
    expect(path.getAttribute('fill-opacity')).toBe('0.25');
    expect(path.getAttribute('pathLength')).toBe('1');
    for (const inert of ['strokeDashoffset', 'fillOpacity', 'path-length']) expect(path.hasAttribute(inert)).toBe(false);
  });

  it('draws a Create stroke on during play instead of holding its poster value', () => {
    const time = motionValue(0);
    const { container } = render(
      <StaticTimeProvider value={1}>
        <SceneTimeProvider value={time}>
          <svg>
            <Create d="M0 0L10 0" progress={(t) => t} roleVar="var(--role-state-stage)" />
          </svg>
        </SceneTimeProvider>
      </StaticTimeProvider>,
    );
    const path = container.querySelector('path')!;
    expect(path.getAttribute('stroke-dashoffset')).toBe('1');
    act(() => time.set(1));
    expect(path.getAttribute('stroke-dashoffset')).toBe('0');
    expect(path.getAttribute('fill-opacity')).toBe('1');
    expect(path.hasAttribute('strokeDashoffset')).toBe(false);
  });
});
