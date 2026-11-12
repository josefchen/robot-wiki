import { execFileSync } from 'node:child_process';
import path from 'node:path';
import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { CITATIONS, citationLabel } from './data/citations';
import { GLOSSARY } from './data/glossary';

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
      //
      // Runs after rehype-katex: excludes the MathML + TeX annotation span
      // (.katex-mathml) from the Pagefind index so excerpts carry the
      // rendered formula once instead of triplicated.
      path.join(process.cwd(), 'lib/rehype-pagefind-math.mjs'),
      // Runs after rehype-katex: exports `usesMath` from modules that
      // typeset math, so the article template loads KaTeX's stylesheet on
      // those pages only (components/article/math-stylesheet.tsx).
      path.join(process.cwd(), 'lib/rehype-math-flag.mjs'),
      // Binds every <Cite> chip cluster to its trailing sentence punctuation
      // in a whitespace-nowrap span, so a line can never begin with an
      // orphaned "." or ",". No interaction with katex/pretty-code (chips
      // never occur in math or code); grouped with the other local plugins.
      path.join(process.cwd(), 'lib/rehype-cite-punctuation.mjs'),
      // Links the first prose mention of each glossary term to its
      // /glossary/#<id> entry. The registry rides in the options, so the
      // compiled articles change whenever a term is added or renamed.
      [
        path.join(process.cwd(), 'lib/rehype-glossary-links.mjs'),
        { terms: GLOSSARY.map(({ id, term }) => ({ id, term })) },
      ],
      // Writes the registry label of each cited answer option into
      // <SelfCheck> and <PredictThenReveal>, whose client primitive does not
      // load the citation registry. The labels ride in the options for the
      // same reason as the glossary terms above.
      [
        path.join(process.cwd(), 'lib/rehype-reveal-cite-labels.mjs'),
        {
          labels: Object.fromEntries(
            CITATIONS.map((citation) => [citation.id, citationLabel(citation)]),
          ),
        },
      ],
      // A light Shiki theme, to match the paper ground. Shiki paints token
      // colours as inline styles that no site token can reach, so the theme
      // name is the only lever and it has to be chosen by measurement: the
      // previous dark-dimmed theme fell to 2.73:1 on the light surface, and
      // plain github-light still leaves keywords at 4.38:1 and constants at
      // 3.34:1. The high-contrast variant is the one that clears AA on every
      // token it paints. keepBackground stays false so the block takes the
      // site's own surface rather than the theme's.
      [
        'rehype-pretty-code',
        { theme: 'github-light-high-contrast', keepBackground: false },
      ],
      // Last on purpose: it names both boxes that scroll inside the prose
      // column, and one of them - the fenced sample's `<pre>` inside its
      // titled figure - does not exist until rehype-pretty-code has built
      // it. The display equations it also names are already in the tree
      // from rehype-katex above.
      path.join(process.cwd(), 'lib/rehype-scroll-regions.mjs'),
    ],
    recmaPlugins: [
      // Re-points each article's client-component imports at the lazy
      // mount registry (components/mdx/article-mounts.tsx), so an article
      // downloads only the widgets it renders rather than every widget
      // imported anywhere under content/. See the plugin header.
      path.join(process.cwd(), 'lib/recma-lazy-mounts.mjs'),
    ],
  },
});

/**
 * The build ID is the commit being built: Vercel provides it as
 * VERCEL_GIT_COMMIT_SHA, and a local build reads it from git. Returning null
 * outside a git checkout lets Next.js generate its own ID.
 */
function commitSha(): string | null {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA;
  if (fromEnv) return fromEnv;
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return sha || null;
  } catch {
    return null;
  }
}

export default function configureNext(phase: string) {
  if (phase !== PHASE_PRODUCTION_BUILD) return withMDX(nextConfig);
  const buildId = commitSha();
  // Next 16.3's installed config loader gives NEXT_DEPLOYMENT_ID precedence
  // over deploymentId (despite the bundled guide saying the reverse). Its
  // output:export + Turbopack Google-font path rejects nonempty asset
  // suffixes as extra virtual-query entries, so this static export
  // advertises no deployment ID. VERCEL_DEPLOYMENT_ID and provider
  // routing/settings remain untouched.
  process.env.NEXT_DEPLOYMENT_ID = '';
  // Omit deploymentId entirely: Turbopack appends ?dpl= to font CSS for
  // an explicit empty ID, while the preload emitter omits that empty query.
  // Those distinct URLs download the same font twice and leave the preload
  // unused. Clearing the environment above also prevents an injected ID.
  return withMDX({
    ...nextConfig,
    generateBuildId: () => buildId,
    experimental: { ...nextConfig.experimental, runtimeServerDeploymentId: false },
  });
}
