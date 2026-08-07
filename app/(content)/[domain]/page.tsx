import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui';
import { DOMAIN_META, DOMAINS, modulesByDomain } from '@/data/modules';
import type { Domain } from '@/data/modules';

/**
 * Domain landing view: the entry point every home card and sidebar overview
 * link resolves to. Lists every registry module in order; published modules
 * are links, drafts are marked planned. Domains without published modules
 * still get a real page, so no taxonomy entry point can 404.
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ domain: string }> {
  return DOMAINS.map((domain) => ({ domain }));
}

function asDomain(value: string): Domain | null {
  return (DOMAINS as readonly string[]).includes(value)
    ? (value as Domain)
    : null;
}

type Params = Promise<{ domain: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { domain: raw } = await params;
  const domain = asDomain(raw);
  if (!domain) return {};
  const meta = DOMAIN_META[domain];
  return {
    title: `${meta.name} - robot-atlas`,
    description: meta.description,
  };
}

export default async function DomainLandingPage({
  params,
}: {
  params: Params;
}) {
  const { domain: raw } = await params;
  const domain = asDomain(raw);
  if (!domain) notFound();

  const meta = DOMAIN_META[domain];
  const mods = modulesByDomain()[domain] ?? [];
  const published = mods.filter((m) => m.status === 'published');

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-8 border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-dim">
          Domain
        </p>
        <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text">
          {meta.name}
        </h1>
        <p className="mt-3 leading-relaxed text-text-dim">{meta.description}</p>
        <p className="mt-3 font-mono text-xs text-text-dim">
          {published.length} of {mods.length} modules published
        </p>
      </header>
      <ol>
        {mods.map((m) => (
          <li
            key={m.slug}
            className="border-t border-border py-4 first:border-t-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-xs text-text-dim">
                {String(m.order).padStart(2, '0')}
              </span>
              {m.status === 'published' ? (
                <Link
                  href={`/${m.domain}/${m.slug}`}
                  className="font-sans text-base font-medium text-text transition-colors hover:text-accent"
                >
                  {m.title}
                </Link>
              ) : (
                <span className="font-sans text-base font-medium text-text-dim">
                  {m.title}
                </span>
              )}
              {m.status === 'draft' ? <Badge>planned</Badge> : null}
            </div>
            <p className="mt-1 pl-7 text-sm leading-relaxed text-text-dim">
              {m.summary}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
