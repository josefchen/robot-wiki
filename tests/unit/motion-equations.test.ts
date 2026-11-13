import { describe, expect, it } from 'vitest';
import { KALMAN_GLYPHS, SCENE_GLYPHS } from '@/lib/motion-equations';

describe('scene equations', () => {
  it('gives every moving glyph the MathML and TeX annotation the equation sweep requires', () => {
    for (const glyph of [...Object.values(SCENE_GLYPHS), ...Object.values(KALMAN_GLYPHS)]) {
      expect(glyph.html.startsWith('<span class="katex"><span class="katex-mathml"><math')).toBe(true);
      expect(glyph.html).toContain(`<annotation encoding="application/x-tex">${glyph.tex}</annotation>`);
      expect(glyph.html).toContain('<span class="katex-html" aria-hidden="true">');
    }
  });
});
