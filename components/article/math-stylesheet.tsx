'use client';

import dynamic from 'next/dynamic';

/**
 * Loads KaTeX's stylesheet (components/article/math.css) on the pages that
 * typeset math, and only there.
 *
 * The article template renders this when its compiled MDX exports
 * `usesMath` (lib/rehype-math-flag.mjs). Loading the stylesheet through
 * `next/dynamic` inside a Client Component gives it a chunk of its own: at
 * prerender the dynamic loader writes that chunk as a
 * `<link rel="stylesheet">` into the page head, so it is render-blocking on
 * math pages exactly as the site-wide import was, and absent from every
 * other page. On a client-side navigation to a math article the chunk
 * loads with the route, before its content paints.
 */
export const MathStylesheet = dynamic(() => import('./katex-styles'));
