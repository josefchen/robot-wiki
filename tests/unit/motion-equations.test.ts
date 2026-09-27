import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generatedEquations } from '@/scripts/generate-motion-equations';
import { SCENE_EQUATIONS } from '@/lib/motion-equations';

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
});
