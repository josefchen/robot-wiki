import path from 'node:path';

const config = {
  plugins: [
    '@tailwindcss/postcss',
    // After Tailwind, which inlines @import: KaTeX's faces must already be
    // in the stylesheet for their font-display to be rewritten.
    // Keep this a real filesystem path. Turbopack rewrites require.resolve
    // into an internal module identifier that the PostCSS loader cannot load.
    path.join(process.cwd(), 'lib/postcss-katex-font-display.cjs'),
  ],
};

export default config;
