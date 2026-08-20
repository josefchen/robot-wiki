import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ImageRef } from '@/components/mdx/image-ref';
import { IMAGES } from '@/data/images';
import { getModule } from '@/data/modules';
import { referencedImageIds } from '@/lib/images';
import {
  AUTHOR_BIO,
  AUTHOR_HANDLE,
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
} from '@/lib/identity';
import { routeOpenGraph, routeTwitter } from '@/lib/og-cards';

const title = 'Credits';

export const metadata: Metadata = {
  title,
  description:
    'Every photograph and diagram on robot-wiki, with its creator, source, and licence.',
  // Full card blocks restated: a route-level object replaces the
  // layout's for the same key (no deep merge). og:title is the plain
  // page title so the card matches the rendered h1 (VAL-DIST-004)
  // instead of the templated ' - robot-wiki' document title.
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

  return usage;
}

export default function CreditsPage() {
  const usage = imageUsage();

  return (
    <div className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <header>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
          Credits
        </h1>
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          robot-wiki uses real photographs and diagrams, and every one of
          them is listed here with its creator, the page it came from, and
          the licence that permits its reuse. Only images under CC0, CC BY,
          CC BY-SA, public domain, or a documented reuse permission appear
          on this site, and no image is AI-generated. The site&apos;s own
          text and original diagrams are available under CC BY 4.0.
        </p>
        {/* Author identity (VAL-DIST-009): the /credits occurrence of the
            owner-supplied name, byte-identical with meta[name=author] and
            the footer occurrence, linked to the external profile. */}
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          Written and maintained by{' '}
          <a
            href={AUTHOR_PROFILE_URL}
            target="_blank"
            rel="noopener"
            className="text-text underline decoration-border-strong underline-offset-2 hover:decoration-accent"
          >
            {AUTHOR_NAME}
          </a>{' '}
          ({AUTHOR_HANDLE}). {AUTHOR_BIO}.
        </p>
      </header>

      <ol className="mt-10 list-none border-t border-border">
        {IMAGES.map((image) => {
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
                        href={link.route}
                        className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
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
