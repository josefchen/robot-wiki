'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaretDown } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { DOMAIN_META, DOMAINS, modulesByDomain } from '@/data/modules';
import type { Domain } from '@/data/modules';
import { cx } from '@/lib/utils';

/**
 * The taxonomy tree shared by the desktop sidebar and the mobile drawer.
 *
 * Seven collapsible groups (six core domains + adjacent) plus Market Map and
 * Playground as top-level entries. Only published modules render at all:
 * drafts are excluded from the sidebar taxonomy entirely (VAL-BUILD-001), so
 * no reader surface can hint at work that does not exist yet
 * (VAL-DESIGN-001/015). The group containing the current route is expanded
 * on load and the active link carries aria-current="page" with the amber
 * accent (VAL-NAV-011/012).
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
  { href: '/a-z', label: 'A-Z Index' },
  { href: '/market-map', label: 'Market Map' },
  { href: '/playground', label: 'Playground' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/credits', label: 'Credits' },
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
  'relative block rounded-sm py-1 pl-7 pr-2 text-[13px] leading-snug transition-colors';
const linkIdle = 'text-text-dim hover:text-text';
const linkActive = 'text-accent';

/**
 * The active-route marker: a flat, full-height 2px rule pinned to the left
 * edge of the link box. It replaces the previous inset box-shadow, which the
 * link's rounded-sm corners clipped into a broken bracket (VAL-DESIGN-016).
 * A real element (not a shadow) means zero radius on every corner, and
 * because every category of entry renders it at the same offset from the
 * rail, module links, Domain overview links and standalone entries all mark
 * at one depth (VAL-DESIGN-017). aria-hidden and empty so it can never
 * pollute the link's accessible name (VAL-DESIGN-022).
 */
function ActiveMarker() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 h-full border-l-2 border-accent"
    />
  );
}

/** A sidebar entry link with the shared active-marker treatment. */
function NavEntryLink({
  href,
  active,
  onNavigate,
  className,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={className}
    >
      {active ? <ActiveMarker /> : null}
      {children}
    </Link>
  );
}

export function NavTree({
  idPrefix,
  ariaLabel,
  onNavigate,
  className,
}: NavTreeProps) {
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
    return cx(linkBase, isActive(href) ? linkActive : linkIdle);
  }

  function isActive(href: string): boolean {
    return activePath === normalize(href);
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
                <ul
                  id={panelId}
                  className="mt-0.5 mb-1.5 flex flex-col gap-0.5"
                >
                  <li>
                    <NavEntryLink
                      href={`/${domain}`}
                      active={isActive(`/${domain}`)}
                      onNavigate={onNavigate}
                      className={cx(
                        linkClass(`/${domain}`),
                        'font-mono text-[11px] uppercase tracking-[0.14em]',
                      )}
                    >
                      Domain overview
                    </NavEntryLink>
                  </li>
                  {mods
                    .filter((m) => m.status === 'published')
                    .map((m) => (
                      <li key={m.slug}>
                        <NavEntryLink
                          href={`/${m.domain}/${m.slug}`}
                          active={isActive(`/${m.domain}/${m.slug}`)}
                          onNavigate={onNavigate}
                          className={linkClass(`/${m.domain}/${m.slug}`)}
                        >
                          {m.title}
                        </NavEntryLink>
                      </li>
                    ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ul className="mt-3 flex flex-col gap-0.5 border-t border-border pt-3">
        {TOP_LEVEL_ENTRIES.map((entry) => (
          <li key={entry.href}>
            <NavEntryLink
              href={entry.href}
              active={isActive(entry.href)}
              onNavigate={onNavigate}
              className={cx(
                'relative block rounded-sm px-2 py-1.5 font-sans text-sm font-medium transition-colors',
                isActive(entry.href)
                  ? linkActive
                  : 'text-text hover:bg-surface-2',
              )}
            >
              {entry.label}
            </NavEntryLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
