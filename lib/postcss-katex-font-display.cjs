// Next's webpack loader resolves named PostCSS plugins with require(). The
// native ESM bridge keeps one implementation for both supported bundlers.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- a CommonJS bridge has to require
module.exports = require('./postcss-katex-font-display.mjs').default;
