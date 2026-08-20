import { describe, expect, it } from 'vitest';
import { signalDiagram, type CardNode } from '@/lib/og-card-artwork';

/**
 * OG card diagram honesty (feature og-card-diagram-honesty): the
 * bar-spectrum family encodes only real per-article quantities. Bar
 * count = the article's reference count (clamped to the panel, floor
 * 6); bar heights are a deterministic monotone ramp derived from the
 * review year; no hash jitter anywhere in the geometry. The old
 * implementation drew rng.int(13,18) jittered bars seeded from the
 * domain/slug hash: a chart-shaped picture encoding nothing.
 */

const ACCENT = '#f5a623';

interface Bar {
  height: number;
  color: string;
}

/** Collect the flex-bar children of the spectrum row (first inner flex). */
function barsOf(node: CardNode): Bar[] {
  const found: Bar[] = [];
  const visit = (n: CardNode): void => {
    const width = String(n.props.style.width ?? '');
    const height = String(n.props.style.height ?? '');
    const bg = String(n.props.style.backgroundColor ?? '');
    if (
      (bg === '#525c64' || bg === ACCENT) &&
      width.endsWith('px') &&
      height.endsWith('px')
    ) {
      found.push({ height: Number.parseFloat(height), color: bg });
      return; // bars are leaves; the axis rule and wrappers are not bars
    }
    const kids = n.props.children;
    if (Array.isArray(kids)) {
      for (const k of kids) visit(k);
    }
  };
  visit(node);
  return found;
}

describe('signal diagram honesty', () => {
  it('draws one bar per reference, clamped to the panel with a floor of 6', () => {
    for (const refs of [1, 6, 10, 15, 18, 24, 60]) {
      const bars = barsOf(signalDiagram(refs, 2025));
      expect(bars.length).toBe(Math.max(6, Math.min(refs, 24)));
    }
  });

  it('carries exactly one amber accent bar', () => {
    for (const refs of [6, 12, 24]) {
      const amber = barsOf(signalDiagram(refs, 2026)).filter((b) => b.color === ACCENT);
      expect(amber.length).toBe(1);
    }
  });

  it('derives heights from the review year, not the slug hash: same facts, same picture', () => {
    const a = JSON.stringify(signalDiagram(14, 2025));
    const b = JSON.stringify(signalDiagram(14, 2025));
    expect(a).toBe(b);
  });

  it('heights are a monotone ramp (no per-bar jitter)', () => {
    for (const year of [2023, 2024, 2025, 2026]) {
      const heights = barsOf(signalDiagram(18, year)).map((b) => b.height);
      // bottom-aligned bars: taller bar = smaller marginTop, so ramp in
      // marginTop is the inverse of height; check heights monotone one way.
      const rising = heights.every((h, i) => i === 0 || h >= heights[i - 1]);
      const falling = heights.every((h, i) => i === 0 || h <= heights[i - 1]);
      expect(rising || falling).toBe(true);
    }
  });

  it('different review years can shift the ramp (year is the real seed)', () => {
    const trees = [2023, 2024, 2025, 2026].map((y) => JSON.stringify(signalDiagram(16, y)));
    expect(new Set(trees).size).toBeGreaterThan(1);
  });
});
