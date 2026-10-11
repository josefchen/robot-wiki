'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { PUBLIC_IDENTITY } from '@/lib/identity';
import { IntentLink } from '@/components/ui/intent-link';
import { SkipLink } from '@/components/ui/skip-link';
import { cx } from '@/lib/utils';
import { HistoryFocus } from './history-focus';
import { NavTree } from './nav-tree';
import { SearchBox } from './search-box';
import { SiteFooter } from './site-footer';

/**
 * Everything a Tab can reach inside the drawer. `tabindex="-1"` is excluded
 * on purpose: <main> carries it as a script-focus target for the skip link,
 * not as a tab stop, and a trap that treated it as one would hand focus to
 * an element the user cannot reach by keyboard anyway.
 */
const DRAWER_TAB_STOPS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const topLink =
  'font-sans text-[14px] leading-none text-text transition-colors hover:text-text-dim';

/**
 * The application shell of the Pantheon standard: one top bar with the
 * wordmark at left and two text links at right, a hairline under it once
 * the page has scrolled, and nothing else. "Articles" opens the taxonomy
 * panel (search plus every domain and article), the same panel at every
 * width; "How robots work" goes to the explainer page.
 *
 * Accessibility contract: the panel trigger reports aria-expanded and
 * aria-controls; opening moves focus into the panel and makes the page
 * behind it inert; Tab wraps inside the panel in both directions; Escape,
 * the close control, or the scrim dismiss it and return focus to the
 * trigger; every link inside the panel closes it via the onNavigate
 * callback.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  // Set when the panel closes via Escape, the close control, or the scrim:
  // focus returns to the trigger. Navigation closes leave focus alone.
  const restoreFocus = useRef(false);

  // The hairline under the bar appears once the page has moved under it.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  // While open: move focus into the panel, trap Tab, listen for Escape,
  // lock scroll.
  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        restoreFocus.current = true;
        setDrawerOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = drawerPanelRef.current;
      if (!panel) return;
      const stops = [...panel.querySelectorAll<HTMLElement>(DRAWER_TAB_STOPS)];
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      // Making the page behind the panel inert is not a focus trap: a Tab
      // off the last stop and a Shift+Tab off the first both leave the
      // dialog for the document, because browser chrome is outside every
      // inert region. Wrapping in both directions is what keeps focus in.
      const leaving = event.shiftKey ? active === first : active === last;
      if (leaving || !panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  // Restore focus only after the state flush removes `inert` from the
  // header; focusing an element inside an inert subtree is a no-op.
  useEffect(() => {
    if (drawerOpen || !restoreFocus.current) return;
    restoreFocus.current = false;
    menuButtonRef.current?.focus();
  }, [drawerOpen]);

  function closeDrawer() {
    restoreFocus.current = true;
    setDrawerOpen(false);
  }

  const onExplainer = pathname.startsWith('/how-robots-work');

  return (
    <>
      {/* History focus restoration lives in the shell (not the layout) so
          it can stand down while the panel owns focus. The Suspense
          boundary is required because the helper reads ?q= through
          useSearchParams: without it every statically prerendered route
          would bail out of server rendering, rather than only this
          null-rendering helper whose fallback is indistinguishable from
          its real output. */}
      <Suspense fallback={null}>
        <HistoryFocus suspended={drawerOpen} />
      </Suspense>
      <SkipLink inert={drawerOpen} />
      <div className="flex min-h-[100dvh] flex-col">
        <header
          inert={drawerOpen}
          data-pagefind-ignore
          data-site-topbar
          data-scrolled={scrolled ? 'true' : 'false'}
          className={cx(
            'sticky top-0 z-40 flex h-[var(--topbar-height)] items-center justify-between gap-6 border-b bg-bg px-[var(--header-gutter)] transition-colors duration-200',
            scrolled ? 'border-border' : 'border-transparent',
          )}
        >
          {/* The wordmark is the navigation item for "/", so on home it
              keeps aria-current exactly as a taxonomy entry would. It sits
              alone in its container: text beside a lockup reads as a
              descriptor surface (VAL-B2-ID-002), and the bar's links are
              controls, not a descriptor. */}
          <div className="flex items-center">
            <Link
              href="/"
              aria-current={pathname === '/' ? 'page' : undefined}
              data-tektur-role="shell-wordmark"
              data-brand-control-id="control:link-focus"
              className="font-display-shell text-[17px] leading-none tracking-[-0.01em] text-text"
            >
              {PUBLIC_IDENTITY}
            </Link>
          </div>
          <nav aria-label="Site" className="flex items-center gap-4 sm:gap-5">
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              aria-haspopup="dialog"
              data-brand-control-id="control:secondary-action"
              onClick={() => setDrawerOpen(true)}
              className={cx(topLink, 'cursor-pointer')}
            >
              Articles
            </button>
            <IntentLink
              href="/how-robots-work/"
              aria-current={onExplainer ? 'page' : undefined}
              data-brand-control-id="control:link-focus"
              className={topLink}
            >
              How robots work
            </IntentLink>
          </nav>
        </header>

        {/* Content column: main plus the site footer. The footer stays a
            sibling of <main> (never a descendant, so it resolves as a
            contentinfo landmark, VAL-DIST-006). */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="main-content"
            tabIndex={-1}
            inert={drawerOpen}
            className="min-w-0 flex-1"
          >
            {children}
          </main>
          <SiteFooter inert={drawerOpen} />
        </div>

        {/* The taxonomy panel. */}
        {drawerOpen ? (
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            data-pagefind-ignore
            className="fixed inset-0 z-50"
          >
            {/* Scrim: click-to-dismiss (keyboard users get Escape + close).
                Ink at 60% rather than a light wash, because the panel is
                paper and a pale scrim over a paper page composites close to
                the panel's own colour: an ink/15 wash measured 1.35:1
                against it, under the 3:1 a visible boundary needs. */}
            <div
              aria-hidden
              onClick={closeDrawer}
              className="absolute inset-0 bg-ink/60"
            />
            {/* The panel is opaque paper against that scrim, flush with
                three viewport edges, so its one visible boundary is the
                inner edge the scrim already carries. A border there would
                be a second edge doing the same work. */}
            <div
              ref={drawerPanelRef}
              className="absolute inset-y-0 right-0 flex w-[min(400px,92vw)] flex-col bg-bg"
            >
              <div className="flex h-[var(--topbar-height)] shrink-0 items-center justify-between px-6">
                {/* The panel's lockup is the navigation item for "/", so it
                    keeps aria-current on home as the bar's wordmark does,
                    and sits alone in its container as the bar's does. */}
                <div className="flex items-center">
                  <Link
                    href="/"
                    aria-current={pathname === '/' ? 'page' : undefined}
                    onClick={() => setDrawerOpen(false)}
                    data-tektur-role="shell-wordmark"
                    data-brand-control-id="control:link-focus"
                    className="font-display-shell text-[17px] leading-none tracking-[-0.01em] text-text"
                  >
                    {PUBLIC_IDENTITY}
                  </Link>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close navigation menu"
                  data-brand-control-id="control:secondary-action"
                  onClick={closeDrawer}
                  className={cx(topLink, 'cursor-pointer')}
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto border-t border-border px-6 pt-6 pb-10">
                <SearchBox
                  idPrefix="drawer"
                  onNavigate={() => setDrawerOpen(false)}
                />
                <NavTree
                  idPrefix="drawer"
                  ariaLabel={`${PUBLIC_IDENTITY} taxonomy drawer`}
                  onNavigate={() => setDrawerOpen(false)}
                  className="mt-8"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
