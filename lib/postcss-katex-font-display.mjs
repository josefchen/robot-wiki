/**
 * PostCSS plugin: KaTeX's @font-face rules swap instead of block.
 *
 * katex.min.css declares every KaTeX_* face with `font-display: block`, so
 * a math page on a slow connection paints its equations as invisible text
 * for up to three seconds while the faces download. With `swap` the
 * formulas render at once in the fallback serif and re-render in the KaTeX
 * faces when they arrive; the final rendering is unchanged, because the
 * faces, their sources and every KaTeX rule stay exactly as shipped.
 *
 * Only @font-face rules whose family is a KaTeX_* face are touched; the
 * site's own faces (next/font) already declare `swap` and are left alone.
 */
const KATEX_FAMILY = /^['"]?KaTeX_/;

export default function postcssKatexFontDisplay() {
  return {
    postcssPlugin: 'postcss-katex-font-display',
    AtRule: {
      'font-face': (rule) => {
        let family = null;
        rule.walkDecls('font-family', (decl) => {
          family = decl.value;
        });
        if (family === null || !KATEX_FAMILY.test(family)) return;
        let display = null;
        rule.walkDecls('font-display', (decl) => {
          display = decl;
        });
        if (display) display.value = 'swap';
        else rule.append({ prop: 'font-display', value: 'swap' });
      },
    },
  };
}
postcssKatexFontDisplay.postcss = true;
