import { compile } from '@mdx-js/mdx';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { describe, expect, it } from 'vitest';
import rehypeMathFlag from '@/lib/rehype-math-flag.mjs';

/**
 * KaTeX's stylesheet loads only on pages that typeset math, so the compiled
 * MDX has to say whether it does. The flag must come from what rehype-katex
 * actually rendered, not from a `$` in the source.
 */
async function compiled(source: string): Promise<string> {
  return String(
    await compile(source, {
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false }], rehypeMathFlag],
    }),
  );
}

describe('rehype-math-flag', () => {
  it('exports usesMath from a module with inline or display math', async () => {
    expect(await compiled('The pose is $x = f(q)$.')).toContain('export const usesMath = true;');
    expect(await compiled('$$\nJ = \\partial f / \\partial q\n$$')).toContain(
      'export const usesMath = true;',
    );
  });

  it('exports nothing from a module without math', async () => {
    const code = await compiled('# Kinematics\n\nForward kinematics maps joints to poses.');
    expect(code).not.toContain('usesMath');
  });

  it('flags a formula KaTeX could not parse, which its stylesheet still styles', async () => {
    const code = await compiled('Broken: $\\frac{1$.');
    expect(code).toContain('katex-error');
    expect(code).toContain('export const usesMath = true;');
  });
});
