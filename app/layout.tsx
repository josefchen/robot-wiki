import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google';
import localFont from 'next/font/local';
import { SiteShell } from '@/components/nav/site-shell';
import { SkipLink } from '@/components/ui/skip-link';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';
import { AUTHOR_NAME, AUTHOR_PROFILE_URL } from '@/lib/identity';
import { largeCardTwitter, siteOgImage } from '@/lib/og-cards';
import './globals.css';

// The four first-party roles are Tektur display, IBM Plex Sans interface,
// Newsreader reading, and IBM Plex Mono data/code. Tektur's approved Latin
// variable binary is local and self-hosted; the separate static TTF used by
// the offline OG renderer is deliberately not referenced from this layout.
const tektur = localFont({
  src: '../public/fonts/Tektur-latin-wdth-wght.woff2',
  variable: '--font-tektur',
  weight: '400 900',
  style: 'normal',
  display: 'swap',
  fallback: [],
  adjustFontFallback: false,
});

// IBM Plex Sans and IBM Plex Mono are static-instance families here rather
// than variable, so the weights in use are enumerated.
const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // The '%s - robot-wiki' template must stay in lockstep with
  // SITE_TITLE_SUFFIX in lib/search.ts, which strips the site name off
  // Pagefind result titles.
  title: { default: 'robot-wiki', template: '%s - robot-wiki' },
  description:
    'An encyclopedic interactive guide to modern robotics for ML engineers.',
  // Author identity (VAL-DIST-009): declared once in the root layout so
  // every route inherits meta[name=author] (a route-level metadata object
  // replaces only the keys it declares; authors is never overridden).
  // The value must stay byte-identical with the footer occurrence and the
  // /credits occurrence, so it imports from lib/identity.ts.
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_PROFILE_URL }],
  creator: AUTHOR_NAME,
  // './' resolves against each route's own pathname, so every page gets a
  // route-correct canonical and og:url on the apex origin.
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    url: './',
    siteName: 'robot-wiki',
    // Site-level social card (VAL-DIST-002/005): a build-time PNG under
    // /og/, served as a plain static file. Non-article routes inherit
    // this block; routes that declare their own openGraph object (which
    // replaces this one, no deep merge) re-declare images themselves.
    images: siteOgImage(),
  },
  // summary_large_image: the card is the 1.91:1 asset above, not a small
  // square thumbnail (VAL-DIST-001).
  twitter: largeCardTwitter(),
  // Site-wide robots guard, driven by ALLOW_INDEXING in lib/site.ts (the
  // single switch). True since the go-public decision of 2026-08-16, so
  // this resolves to undefined and no meta tag ships; /404/ pins its own
  // route-level noindex either way (app/not-found.tsx).
  robots: ALLOW_INDEXING ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${tektur.variable} ${plexSans.variable} ${newsreader.variable} ${plexMono.variable}`}
    >
      <body>
        <SkipLink />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
