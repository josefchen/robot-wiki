'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaretDown } from '@phosphor-icons/react';
import { useState } from 'react';
import { DOMAIN_META, DOMAINS, modulesByDomain } from '@/data/modules';
import type { Domain } from '@/data/modules';
import { cx } from '@/lib/utils';

/**
 * The taxonomy tree shared by the desktop sidebar and the mobile drawer.
 *
 * Seven collapsible groups (six core domains + adjacent) plus Market Map and
 * Playground as top-level entries. Only published modules render as links;
 * drafts render as non-link "planned" rows so no sidebar link can 404. The
 * group containing the current route is expanded on load and the active link
 * carries aria-current="page" with the amber accent (VAL-NAV-011/012).
 */
type NavTreeProps = {
  /** Prefix for element ids so desktop and drawer instances never collide. */
  idPrefix: string;
  /** Landmark label; must differ between simultaneous instances. */
  ariaLabel: string;
  /** Called after any navigation link is activated (drawer closes itself). */
  onNavigate?: () => void;
  className?: string;
};

const TOP_LEVEL_ENTRIES = [
  { href: '/market-map', label: 'Market Map' },
  { href: '/playground', label: 'Playground' },
  { href: '/glossary', label: 'Glossary' },
] as const;

function normalize(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
}

/** The domain segment of a pathname, if it names a real domain. */
function domainOf(pathname: string): Domain | null {
  const segment = normalize(pathname).split('/')[1] ?? '';
  return (DOMAINS as readonly string[]).includes(segment)
    ? (segment as Domain)
    : null;
}

const linkBase =
  'block rounded-sm py-1 pl-7 pr-2 text-[13px] leading-snug transition-colors';
const linkIdle = 'text-text-dim hover:text-text';
const linkActive =
  'text-accent shadow-[inset_2px_0_0_0_var(--color-accent)]';

export function NavTree({ idPrefix, ariaLabel, onNavigate, className }: NavTreeProps) {
  const pathname = usePathname();
  const activePath = normalize(pathname);
  const activeDomain = domainOf(pathname);
  const grouped = modulesByDomain();

  // Expansion is derived: the active route's group is expanded by default
  // (deep links land with context, VAL-NAV-012), and user toggles are stored
  // as overrides on top. No effect sync needed on client-side navigation.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isExpanded = (domain: string) =>
    overrides[domain] ?? domain === activeDomain;

  function toggle(domain: string) {
    setOverrides((prev) => ({
      ...prev,
      [domain]: !(prev[domain] ?? domain === activeDomain),
    }));
  }

  function linkClass(href: string) {
    return cx(linkBase, activePath === normalize(href) ? linkActive : linkIdle);
  }

  function currentFor(href: string): 'page' | undefined {
    return activePath === normalize(href) ? 'page' : undefined;
  }

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="flex flex-col gap-0.5">
        {DOMAINS.map((domain) => {
          const meta = DOMAIN_META[domain];
          const mods = grouped[domain] ?? [];
          const expanded = isExpanded(domain);
          const panelId = `${idPrefix}-group-${domain}`;
          return (
            <li key={domain}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(domain)}
                className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left font-sans text-sm font-medium text-text transition-colors hover:bg-surface-2"
              >
                <CaretDown
                  size={14}
                  aria-hidden
                  className={cx(
                    'shrink-0 text-text-dim transition-transform',
                    !expanded && '-rotate-90',
                  )}
                />
                <span>{meta.name}</span>
              </button>
              {expanded ? (
                <ul id={panelId} className="mt-0.5 mb-1.5 flex flex-col gap-0.5">
                  <li>
                    <Link
                      href={`/${domain}`}
                      aria-current={currentFor(`/${domain}`)}
                      onClick={onNavigate}
                      className={cx(
                        linkClass(`/${domain}`),
                        'font-mono text-[11px] uppercase tracking-[0.12em]',
                      )}
                    >
                      Domain overview
                    </Link>
                  </li>
                  {mods.map((m) =>
                    m.status === 'published' ? (
                      <li key={m.slug}>
                        <Link
                          href={`/${m.domain}/${m.slug}`}
                          aria-current={currentFor(`/${m.domain}/${m.slug}`)}
                          onClick={onNavigate}
                          className={linkClass(`/${m.domain}/${m.slug}`)}
                        >
                          {m.title}
                        </Link>
                      </li>
                    ) : (
                      <li key={m.slug}>
                        <span className="flex items-baseline justify-between gap-2 py-1 pl-7 pr-2 text-[13px] leading-snug text-text-dim">
                          <span>{m.title}</span>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-text-dim">
                            planned
                          </span>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ul className="mt-3 flex flex-col gap-0.5 border-t border-border pt-3">
        {TOP_LEVEL_ENTRIES.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              aria-current={currentFor(entry.href)}
              onClick={onNavigate}
              className={cx(
                'block rounded-sm px-2 py-1.5 font-sans text-sm font-medium transition-colors',
                activePath === normalize(entry.href)
                  ? linkActive
                  : 'text-text hover:bg-surface-2',
              )}
            >
              {entry.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
