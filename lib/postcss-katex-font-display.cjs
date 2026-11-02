// Next's webpack loader resolves named PostCSS plugins with require(). The
// native ESM bridge keeps one implementation for both supported bundlers.
module.exports = require('./postcss-katex-font-display.mjs').default;
