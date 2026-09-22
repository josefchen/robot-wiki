import postcssKatexFontDisplay from './lib/postcss-katex-font-display.mjs';

const config = {
  plugins: [
    '@tailwindcss/postcss',
    // After Tailwind, which inlines @import: KaTeX's faces must already be
    // in the stylesheet for their font-display to be rewritten.
    postcssKatexFontDisplay(),
  ],
};

export default config;
