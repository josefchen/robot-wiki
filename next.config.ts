import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  // Isolated build dir for the draft-probe propagation test
  // (tests/propagation/): its builds never clobber a running dev server's
  // .next. Unset in every other context, so the default is unchanged.
  distDir: process.env.PROBE_DIST_DIR ?? '.next',
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  images: { unoptimized: true },
  trailingSlash: true,
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
      ['rehype-pretty-code', { theme: 'github-dark-dimmed', keepBackground: true }],
    ],
  },
});

export default withMDX(nextConfig);
