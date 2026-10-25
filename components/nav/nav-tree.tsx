'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { IntentLink } from '@/components/ui/intent-link';
import { DOMAIN_META, DOMAINS, modulesByDomain } from '@/data/modules';
import type { Domain } from '@/data/modules';
import { cx } from '@/lib/utils';

/**
 * The taxonomy tree shared by the desktop sidebar and the mobile drawer.
 *
 * Seven collapsible groups (six core domains + adjacent) plus Market Map and
 * Playground as top-level entries. Only published modules render at all:
 * drafts are excluded from the sidebar taxonomy entirely, so
 * no reader surface can hint at work that does not exist yet.
 * The group containing the current route is expanded
 * on load and the active link carries aria-current="page", ink text, one
 * extra weight step and a 1 px ink underline. No rail, no pill: plain text
 * on the sheet.
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
  { href: '/how-robots-work', label: 'How robots work' },
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

const moduleLinkBase =
  'block py-[5px] pl-5 font-sans text-[14px] leading-snug transition-colors';
const moduleLinkIdle = 'text-text-dim hover:text-text';
const moduleLinkActive = 'font-medium text-text underline decoration-1 underline-offset-[3px]';

const entryLinkBase =
  'block py-[5px] font-sans text-[14px] leading-snug transition-colors';
const entryLinkIdle = 'text-text hover:text-text-dim';
const entryLinkActive = 'font-medium text-text underline decoration-1 underline-offset-[3px]';

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
    <IntentLink
      href={href}
      aria-current={active ? 'page' : undefined}
      data-brand-control-id="control:link-focus"
      onClick={onNavigate}
      className={className}
    >
      {children}
    </IntentLink>
  );
}

export function NavTree({ idPrefix, ariaLabel, onNavigate, className }: NavTreeProps) {
  const pathname = usePathname();
  const activePath = normalize(pathname);
  const activeDomain = domainOf(pathname);
  const grouped = modulesByDomain();

  // Expansion is derived: the active route's group is expanded by default
  // (deep links land with context), and user toggles are stored
  // as overrides on top. No effect sync needed on client-side navigation.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [overridePath, setOverridePath] = useState(activePath);

  // A collapse survives client-side navigation, except on the group that
  // holds the route just landed on: a stale collapse there would unmount
  // the entry carrying aria-current, leaving the whole shell with no mark
  // of where the reader is. Overrides on other groups are the reader's
  // arrangement of the taxonomy and are left alone.
  if (overridePath !== activePath) {
    setOverridePath(activePath);
    if (activeDomain !== null && activeDomain in overrides) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[activeDomain];
        return next;
      });
    }
  }

  const isExpanded = (domain: string) =>
    overrides[domain] ?? domain === activeDomain;

  function toggle(domain: string) {
    setOverrides((prev) => ({
      ...prev,
      [domain]: !(prev[domain] ?? domain === activeDomain),
    }));
  }

  function linkClass(href: string) {
    return cx(
      moduleLinkBase,
      isActive(href) ? moduleLinkActive : moduleLinkIdle,
    );
  }

  function isActive(href: string): boolean {
    return activePath === normalize(href);
  }

  return (
    <nav id={`${idPrefix}-taxonomy`} aria-label={ariaLabel} className={className}>
      <ul className="flex flex-col">
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
                data-brand-control-id="control:secondary-action"
                onClick={() => toggle(domain)}
                className="flex w-full cursor-pointer items-baseline gap-2 py-[7px] text-left font-sans text-[15px] text-text transition-colors hover:text-text-dim"
              >
                <span
                  aria-hidden
                  className="w-3 shrink-0 font-mono text-[13px] text-text-dim"
                >
                  {expanded ? '\u2212' : '+'}
                </span>
                <span>{meta.name}</span>
              </button>
              {expanded ? (
                <ul id={panelId} className="mb-2 flex flex-col">
                  <li>
                    <NavEntryLink
                      href={`/${domain}`}
                      active={isActive(`/${domain}`)}
                      onNavigate={onNavigate}
                      className={linkClass(`/${domain}`)}
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
      <ul className="mt-5 flex flex-col border-t border-border pt-4">
        {TOP_LEVEL_ENTRIES.map((entry) => (
          <li key={entry.href}>
            <NavEntryLink
              href={entry.href}
              active={isActive(entry.href)}
              onNavigate={onNavigate}
              className={cx(
                entryLinkBase,
                isActive(entry.href) ? entryLinkActive : entryLinkIdle,
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
