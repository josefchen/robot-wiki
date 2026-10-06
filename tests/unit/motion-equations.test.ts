import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generatedEquations } from '@/scripts/generate-motion-equations';
import { SCENE_EQUATIONS, SCENE_GLYPHS } from '@/lib/motion-equations';

describe('scene equations', () => {
  it('keeps checked-in KaTeX markup in sync with the source relation', () => {
    expect(readFileSync('lib/motion-equations.ts', 'utf8')).toBe(generatedEquations());
    for (const relation of Object.values(SCENE_EQUATIONS)) {
      expect(relation.html).toContain('class="katex"');
      expect(relation.html).toContain('<math');
      expect(relation.html).toContain('<annotation encoding="application/x-tex">');
    }
    expect(SCENE_EQUATIONS.kalman.html).toContain('class="msupsub"');
  });

  it('gives every moving glyph the MathML and TeX annotation the equation sweep requires', () => {
    for (const glyph of Object.values(SCENE_GLYPHS)) {
      expect(glyph.html.startsWith('<span class="katex"><span class="katex-mathml"><math')).toBe(true);
      expect(glyph.html).toContain(`<annotation encoding="application/x-tex">${glyph.tex}</annotation>`);
      expect(glyph.html).toContain('<span class="katex-html" aria-hidden="true">');
    }
  });
});
