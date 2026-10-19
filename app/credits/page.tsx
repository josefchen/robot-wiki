import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ImageRef } from '@/components/mdx/image-ref';
import { COMPANIES } from '@/data/companies';
import { IMAGES } from '@/data/images';
import { getModule } from '@/data/modules';
import { referencedImageIds } from '@/lib/images';
import { withheldMark } from '@/lib/market-map-marks';
import {
  AUTHOR_BIO,
  AUTHOR_HANDLE,
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
  CONTENT_CORRECTION_URL,
  PUBLIC_IDENTITY,
} from '@/lib/identity';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';
import { webPageJsonLd } from '@/lib/structured-data';
import {
  STANDALONE_SEO_DESCRIPTIONS,
  STANDALONE_SEO_TITLES,
} from '@/lib/seo';

const title = 'Credits';

export const metadata: Metadata = {
  title: STANDALONE_SEO_TITLES.credits,
  description: STANDALONE_SEO_DESCRIPTIONS.credits,
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated '| Robot Wiki' document title.
  openGraph: routeOpenGraph(title),
  twitter: routeTwitter(title),
};

/**
 * Image credits: one entry per registered image, generated from
 * data/images.ts rather than hand-maintained, so this page can never drift
 * from what the site renders. Each entry renders the same
 * registry-backed figure the articles render, plus the list of pages the
 * image appears on, derived by scanning the content tree and the home page
 * for <Image id> usages at prerender time.
 */

interface UsageLink {
  route: string;
  title: string;
}

/** image id -> the routes that reference it, resolved to display titles. */
function imageUsage(): Map<string, UsageLink[]> {
  const usage = new Map<string, UsageLink[]>();
  const record = (id: string, link: UsageLink) => {
    const links = usage.get(id) ?? [];
    if (!links.some((l) => l.route === link.route)) links.push(link);
    usage.set(id, links);
  };

  const contentRoot = join(process.cwd(), 'content');
  for (const domain of readdirSync(contentRoot, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    for (const file of readdirSync(join(contentRoot, domain.name))) {
      if (!/\.mdx?$/.test(file)) continue;
      const slug = file.replace(/\.mdx?$/, '');
      const entry = getModule(domain.name, slug);
      if (!entry || entry.status !== 'published') continue;
      const body = readFileSync(
        join(contentRoot, domain.name, file),
        'utf8',
      );
      for (const id of referencedImageIds(body)) {
        record(id, {
          route: `/${domain.name}/${slug}`,
          title: entry.title,
        });
      }
    }
  }

  const homeBody = readFileSync(
    join(process.cwd(), 'app', 'page.tsx'),
    'utf8',
  );
  for (const id of referencedImageIds(homeBody)) {
    record(id, { route: '/', title: 'Home' });
  }

  for (const company of COMPANIES) {
    if (company.logo) {
      record(company.logo, { route: '/market-map', title: 'Market Map' });
    }
  }

  return usage;
}

export default function CreditsPage() {
  const usage = imageUsage();

  return (
    <div className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: webPageJsonLd({
            path: '/credits/',
            name: title,
            description: STANDALONE_SEO_DESCRIPTIONS.credits,
          }),
        }}
      />
      {/* data-pagefind-body: Pagefind excludes every page that declares no
          body region once one page declares one (VAL-SEARCH-021). Scoped
          to the header, so the licence list below stays out of the prose
          index: it is 40-odd repeated licence identifiers and creator
          names, which would crowd out real prose matches. */}
      <header data-pagefind-body>
        <h1
          data-tektur-role="page-h1"
          className="font-display-page text-3xl tracking-tight text-text"
        >
          Credits
        </h1>
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          Every photograph and diagram on {PUBLIC_IDENTITY} is listed here
          with its creator, source page and licence. Article images are CC0,
          CC BY, CC BY-SA, public domain or used under a documented reuse
          permission. No image is AI-generated.
        </p>
        <p className="mt-4 font-serif text-[1.0625rem] leading-relaxed text-text">
          Market-map logos include official company marks, recorded as
          unlicensed or unknown where no reuse grant is named. The
          site&apos;s own text and original diagrams are licensed CC BY 4.0.
        </p>
        {/* Author identity (VAL-DIST-009): the /credits occurrence of the
            owner-supplied name, byte-identical with meta[name=author] and
            the footer occurrence, linked to the external profile. */}
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          Written and maintained by{' '}
          <a
            data-brand-control-id="control:link-focus"
            href={AUTHOR_PROFILE_URL}
            target="_blank"
            rel="noopener"
            className="text-text underline decoration-border-strong underline-offset-2 hover:decoration-accent"
          >
            {AUTHOR_NAME}
          </a>{' '}
          ({AUTHOR_HANDLE}).
        </p>
      </header>

      {/* About section (VAL-DIST-008): why this site exists, kept in its
          own <section> so the licence list below stays the registry-
          generated surface VAL-IMG-004 grades. The biography is rendered
          from AUTHOR_BIO rather than restated in JSX, so the owner's
          wording cannot drift here while lib/identity.ts changes. */}
      <section aria-labelledby="about-heading" className="mt-12">
        <h2
          id="about-heading"
          className="font-sans text-lg font-semibold tracking-tight text-text"
        >
          Who is behind {PUBLIC_IDENTITY}
        </h2>
        <p className="mt-4 font-serif text-[1.0625rem] leading-relaxed text-text">
          {AUTHOR_BIO}. What I needed over those years was scattered across
          papers that skip the deployment context and demos that never quote
          a failure rate. {PUBLIC_IDENTITY} collects it for engineers who come
          from machine learning and cites the source of every claim.
        </p>
        <p className="mt-4 font-sans text-sm text-text-dim">
          Corrections follow the{' '}
          <Link
            data-brand-control-id="control:link-focus"
            href="/editorial-policy/"
            className="ink-link"
          >
            editorial policy
          </Link>
          ;{' '}
          <a
            data-brand-control-id="control:link-focus"
            href={CONTENT_CORRECTION_URL}
            target="_blank"
            rel="noopener"
            className="ink-link"
          >
            report a factual issue on GitHub
          </a>
          .
        </p>
      </section>

      <ol className="mt-10 list-none border-t border-border">
        {/* A withheld company mark (lib/market-map-marks.ts: the registered
            file shows another company's artwork) is drawn nowhere, so it
            has no credit to give; audit/market-map.md records each one. */}
        {IMAGES.filter((image) => !withheldMark(image.id)).map((image) => {
          const appearsOn = usage.get(image.id) ?? [];
          return (
            <li
              key={image.id}
              id={image.id}
              data-credits-entry={image.id}
              className="border-b border-border py-8"
            >
              <ImageRef id={image.id} />
              {appearsOn.length > 0 ? (
                <p className="mt-3 font-sans text-xs leading-relaxed text-text-dim">
                  Appears on:{' '}
                  {appearsOn.map((link, index) => (
                    <span key={link.route}>
                      {index > 0 ? ', ' : ''}
                      <Link
                        data-brand-control-id="control:link-focus"
                        href={link.route}
                        className="ink-link"
                      >
                        {link.title}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
