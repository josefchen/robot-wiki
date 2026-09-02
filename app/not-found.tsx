import type { Metadata } from 'next';
import Link from 'next/link';
import { routeTwitter, siteOgImage } from '@/lib/og-cards';

const title = 'Page not found';

export const metadata: Metadata = {
  title,
  // The root layout resolves './' against the internal /_not-found pathname;
  // point this route's canonical and og:url at the conventional /404/ path
  // instead, which serves this page in the export. The full openGraph set is
  // restated here: a route-level openGraph object replaces the layout's, so
  // omitting siteName/type would silently drop those tags. og:title is the
  // plain page title so the card matches the rendered h1 (VAL-DIST-004).
  alternates: { canonical: '/404/' },
  // Explicit route-level pin: the 404 page stays noindex regardless of
  // ALLOW_INDEXING in lib/site.ts, so flipping the site-wide switch can
  // never make an error page indexable. Next also injects a noindex for
  // 404 responses internally (app-render's NonIndex); this makes the
  // directive ours instead of an undocumented framework default.
  robots: { index: false },
  openGraph: {
    type: 'website',
    title,
    url: '/404/',
    siteName: 'robot-wiki',
    images: siteOgImage(),
  },
  twitter: routeTwitter(title),
};

/** Themed 404: dark tokens, site chrome from the root layout, link home. */
export default function NotFound() {
  return (
    <div
      data-pagefind-ignore
      className="mx-auto flex min-h-[70dvh] w-full max-w-3xl flex-col justify-center px-6 py-12"
    >
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
        Page not found
      </h1>
      <p className="mt-3 max-w-[55ch] leading-relaxed text-text-dim">
        This page does not exist. The link may be out of date, or the address
        may be mistyped.
      </p>
      <p className="mt-6">
        <Link
          data-brand-control-id="control:link-focus"
          href="/"
          className="rounded-sm border border-accent px-4 py-2 font-sans text-sm font-medium text-accent transition-colors hover:bg-surface-2 active:translate-y-[1px]"
        >
          Back to the wiki home
        </Link>
      </p>
    </div>
  );
}
