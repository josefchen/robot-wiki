import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google';
import localFont from 'next/font/local';
import { AnonymousAnalytics } from '@/components/analytics/anonymous-analytics';
import { SiteShell } from '@/components/nav/site-shell';
import {
  ALLOW_INDEXING,
  ENABLE_ANALYTICS,
  SITE_DISPLAY_NAME,
  SITE_URL,
} from '@/lib/site';
import {
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
  PUBLIC_DESCRIPTOR,
  PUBLIC_IDENTITY,
} from '@/lib/identity';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { HOME_SEO_DESCRIPTION, HOME_SEO_TITLE } from '@/lib/seo';
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
  // The '%s | Robot Wiki' template must stay in lockstep with
  // SITE_TITLE_SUFFIX in lib/search.ts, which strips the site name off
  // Pagefind result titles; the default is the SEO home title while the
  // site-level description stays the locked descriptor (VAL-B2-ID-002).
  title: {
    default: HOME_SEO_TITLE,
    template: `%s | ${PUBLIC_IDENTITY}`,
  },
  description: PUBLIC_DESCRIPTOR,
  // Author identity (VAL-DIST-009): declared once in the root layout so
  // every route inherits meta[name=author] (a route-level metadata object
  // replaces only the keys it declares; authors is never overridden).
  // The value must stay byte-identical with the footer occurrence and the
  // /credits occurrence, so it imports from lib/identity.ts.
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_PROFILE_URL }],
  creator: AUTHOR_NAME,
  // './' resolves against each route's own pathname, so every page gets a
  // route-correct canonical and og:url on the apex origin.
  alternates: {
    canonical: './',
    types: {
      'application/rss+xml': `${SITE_URL}/feed.xml`,
    },
  },
  openGraph: {
    // routeOpenGraph re-declares type/url/siteName and the build-time PNG
    // site card (VAL-DIST-002/005); routes that declare their own
    // openGraph object replace this block, no deep merge.
    ...routeOpenGraph(SITE_DISPLAY_NAME),
    description: HOME_SEO_DESCRIPTION,
    locale: 'en_US',
  },
  // summary_large_image: the card is the 1.91:1 asset above, not a small
  // square thumbnail (VAL-DIST-001).
  twitter: {
    ...routeTwitter(SITE_DISPLAY_NAME),
    description: HOME_SEO_DESCRIPTION,
  },
  // Site-wide robots guard, driven by ALLOW_INDEXING in lib/site.ts (the
  // single switch). Search engines may use the preview limits below when
  // rendering richer result snippets; /search and /404 pin route-level
  // noindex directives independently.
  robots: ALLOW_INDEXING
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      }
    : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${tektur.variable} ${plexSans.variable} ${newsreader.variable} ${plexMono.variable}`}
    >
      <body>
        {/* The skip link is the shell's first tab stop and the shell has to
            be able to take it out of the tab order while the mobile drawer
            holds focus, so SiteShell mounts it as its own first child. */}
        <SiteShell>{children}</SiteShell>
        {ENABLE_ANALYTICS ? <AnonymousAnalytics /> : null}
      </body>
    </html>
  );
}
