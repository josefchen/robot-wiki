import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  // The root layout resolves './' against the internal /_not-found pathname;
  // point this route's canonical and og:url at the conventional /404/ path
  // instead, which serves this page in the export.
  alternates: { canonical: '/404/' },
  openGraph: { url: '/404/' },
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
          href="/"
          className="rounded-sm border border-accent px-4 py-2 font-sans text-sm font-medium text-accent transition-colors hover:bg-surface-2 active:translate-y-[1px]"
        >
          Back to the wiki home
        </Link>
      </p>
    </div>
  );
}
