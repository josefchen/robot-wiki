import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_COLORS, BRAND_SPACING } from '@/lib/design-tokens';

/**
 * The Open Graph renderer and the 3D playground cannot read CSS, so
 * lib/design-tokens.ts repeats the colors and spacing of app/globals.css.
 * The two must agree, or cards and the playground paint other colors than
 * the pages.
 */
const globals = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('design tokens', () => {
  it('mirrors every CSS color token exactly', () => {
    expect(Object.keys(BRAND_COLORS).length).toBeGreaterThan(0);
    for (const [name, value] of Object.entries(BRAND_COLORS)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
      expect(globals, `--color-${name}`).toContain(`--color-${name}: ${value};`);
    }
  });

  it('mirrors the spacing ladder, and the CSS declares no other step', () => {
    const declared = [...globals.matchAll(/--space-(\d+):\s*(\d+)px;/g)].map(([, name, value]) => [Number(name), Number(value)]);
    expect(declared).toEqual(BRAND_SPACING.map((step) => [step, step]));
  });

  it('keeps status colors readable on paper and white', () => {
    for (const name of ['ok', 'warn', 'error', 'destructive'] as const) {
      expect(contrast(BRAND_COLORS[name], BRAND_COLORS.paper), `${name} on paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(BRAND_COLORS[name], BRAND_COLORS.white), `${name} on white`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
