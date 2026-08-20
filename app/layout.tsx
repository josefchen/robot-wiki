import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import { SiteShell } from '@/components/nav/site-shell';
import { SkipLink } from '@/components/ui/skip-link';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';
import { largeCardTwitter, siteOgImage } from '@/lib/og-cards';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
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
      className={`${geistSans.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <SkipLink />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
