import path from 'node:path';
import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  // Draft-probe propagation test override (tests/propagation/): with
  // output:'export', Next 16 treats a non-default distDir as the EXPORT
  // output directory, so PROBE_DIST_DIR=.next-probe makes the probe's
  // static export land in .next-probe/ instead of clobbering the canonical
  // out/. The build cache and manifests still write to .next, so a probe
  // build can still clobber a live dev server's cache; never run them
  // concurrently. Unset in every other context, so the default is
  // unchanged.
  distDir: process.env.PROBE_DIST_DIR ?? '.next',
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  images: { unoptimized: true },
  trailingSlash: true,
  // Cache-Control for /images, /og, /_next/static, and fonts lives in
  // vercel.json. nextConfig.headers is unsupported with output: 'export'.
};

// Turbopack cannot serialize JS functions to Rust, so every remark/rehype
// plugin must be referenced by string name (options as serializable tuples).
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      'remark-frontmatter',
      ['remark-mdx-frontmatter', { name: 'frontmatter' }],
      'remark-gfm',
      'remark-math',
    ],
    rehypePlugins: [
      'rehype-slug',
      ['rehype-autolink-headings', { behavior: 'wrap' }],
      ['rehype-katex', { strict: false }],
      // Local plugins, referenced by absolute path strings: the MDX loader
      // resolves bare strings from its own node_modules context, so a
      // relative './lib/...' specifier is not found. Computed at config
      // load, so the repo stays portable.
      path.join(process.cwd(), 'lib/rehype-scrollable-math.mjs'),
      // Runs after rehype-katex: excludes the MathML + TeX annotation span
      // (.katex-mathml) from the Pagefind index so excerpts carry the
      // rendered formula once instead of triplicated.
      path.join(process.cwd(), 'lib/rehype-pagefind-math.mjs'),
      // Binds every <Cite> chip cluster to its trailing sentence punctuation
      // in a whitespace-nowrap span, so a line can never begin with an
      // orphaned "." or ",". No interaction with katex/pretty-code (chips
      // never occur in math or code); grouped with the other local plugins.
      path.join(process.cwd(), 'lib/rehype-cite-punctuation.mjs'),
      ['rehype-pretty-code', { theme: 'github-dark-dimmed', keepBackground: true }],
    ],
  },
});

export default withMDX(nextConfig);
