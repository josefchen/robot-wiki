import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import postcssKatexFontDisplay from '@/lib/postcss-katex-font-display.mjs';

const require = createRequire(import.meta.url);

async function run(css: string): Promise<string> {
  return (await postcss([postcssKatexFontDisplay()]).process(css, { from: undefined })).css;
}

describe('postcss-katex-font-display', () => {
  it('swaps every KaTeX face shipped by katex.min.css and changes nothing else', async () => {
    const source = readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8');
    const blocking = source.match(/font-display:block/g)?.length ?? 0;
    expect(blocking).toBeGreaterThan(0);
    const out = await run(source);
    expect(out).not.toContain('font-display:block');
    expect(out.match(/font-display:swap/g)?.length).toBe(blocking);
    expect(out.replaceAll('font-display:swap', 'font-display:block')).toBe(source);
  });

  it('leaves non-KaTeX faces alone', async () => {
    const css =
      "@font-face{font-family:'Newsreader';font-display:block;src:url(a.woff2)}" +
      '@font-face{font-family:KaTeX_Main;src:url(b.woff2)}';
    const out = await run(css);
    expect(out).toContain("font-family:'Newsreader';font-display:block");
    expect(out).toContain('font-family:KaTeX_Main;src:url(b.woff2);font-display:swap');
  });
});
