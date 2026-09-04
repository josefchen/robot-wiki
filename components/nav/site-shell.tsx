'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PUBLIC_IDENTITY } from '@/lib/identity';
import { BrandDevice } from '@/components/ui/brand-device';
import { SkipLink } from '@/components/ui/skip-link';
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

/**
 * The width at which the shell hands the taxonomy from the drawer to the
 * persistent sidebar: Tailwind's `lg`, the same breakpoint the `lg:hidden`
 * header and drawer and the `lg:block` sidebar switch on, written as a
 * media query because a resize past it has to be observable in script.
 * Above it the drawer stops painting, so an open drawer left in state
 * would hold every region inert and the body scroll locked behind a dialog
 * that is no longer on screen to be closed.
 */
const DESKTOP_SHELL_QUERY = '(min-width: 64rem)';

/**
 * The application shell: persistent desktop sidebar, mobile top bar with a
 * hamburger-driven drawer, and the <main> content region.
 *
 * Accessibility contract: the drawer trigger reports aria-expanded and
 * aria-controls; opening moves focus into the drawer and makes the page
 * behind it inert; Tab wraps inside the drawer in both directions; Escape,
 * the close control, or the scrim dismiss it and return focus to the
 * trigger; every link inside the drawer closes it via the onNavigate
 * callback.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  // Set when the drawer closes via Escape, the close control, or the scrim:
  // focus returns to the trigger. Navigation closes leave focus alone.
  const restoreFocus = useRef(false);
  // Set when the drawer closes because the viewport reached desktop width,
  // where focus has to go to the sidebar rather than back to the trigger.
  const handedToSidebar = useRef(false);

  // While open: move focus into the drawer, trap Tab, listen for Escape,
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
      // Making the page behind the drawer inert is not a focus trap: a Tab
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

  // The drawer is the taxonomy only below lg. Reaching desktop width with
  // it open has to close it: the dialog stops painting there, and leaving
  // the state set would keep the visible shell inert and scroll-locked with
  // nothing on screen to dismiss. Scroll position is untouched, so the
  // reader stays where they were reading.
  useEffect(() => {
    if (!drawerOpen || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DESKTOP_SHELL_QUERY);
    function handOffToSidebar() {
      if (!query.matches) return;
      handedToSidebar.current = true;
      setDrawerOpen(false);
    }
    handOffToSidebar();
    query.addEventListener('change', handOffToSidebar);
    return () => query.removeEventListener('change', handOffToSidebar);
  }, [drawerOpen]);

  // Restore focus only after the state flush removes `inert` from the
  // header; focusing an element inside an inert subtree is a no-op.
  useEffect(() => {
    if (drawerOpen) return;
    if (handedToSidebar.current) {
      handedToSidebar.current = false;
      restoreFocus.current = false;
      // The trigger this drawer came from lives in the `lg:hidden` header,
      // so returning focus there would park it on a control the reader can
      // no longer see. The sidebar carries the same taxonomy at this width.
      const sidebarStop =
        sidebarRef.current?.querySelector<HTMLElement>(DRAWER_TAB_STOPS);
      (sidebarStop ?? document.getElementById('main-content'))?.focus();
      return;
    }
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    menuButtonRef.current?.focus();
  }, [drawerOpen]);

  function closeDrawer() {
    restoreFocus.current = true;
    setDrawerOpen(false);
  }

  return (
    <>
      <SkipLink inert={drawerOpen} />
      <div className="flex min-h-[100dvh] flex-col lg:flex-row">
        {/* Mobile top bar (drawer pattern below lg). */}
        <header
          inert={drawerOpen}
          data-pagefind-ignore
          className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-bg px-4 py-2.5 lg:hidden"
        >
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            aria-label="Open navigation menu"
            data-brand-control-id="control:secondary-action"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center rounded-sm p-1.5 text-text transition-colors hover:bg-surface-2 active:translate-y-[1px]"
          >
            <List size={20} aria-hidden />
          </button>
          <Link
            href="/"
            data-tektur-role="shell-wordmark"
            data-brand-control-id="control:link-focus"
            className="font-display-shell text-[15px] tracking-[-0.02em] text-text"
          >
            {PUBLIC_IDENTITY}
          </Link>
        </header>

        {/* Desktop sidebar: sticky, full-height, independently scrollable. */}
        <aside
          ref={sidebarRef}
          id="sidebar-rail"
          inert={drawerOpen}
          data-pagefind-ignore
          className="relative hidden w-72 shrink-0 lg:block"
        >
          {/* The registered outer rail is the sidebar's right boundary. It is
              a device rather than a border on the <aside> so the shell's one
              structural division carries a registry identity, an owner and an
              anchor the primitive sweep can measure. */}
          <BrandDevice
            device="outer-rail"
            anchorSelector="#sidebar-rail"
            deviceEdge="right"
            anchorEdge="right"
            className="right-0 top-0 h-full"
          />
          <div className="sticky top-0 flex h-dvh flex-col gap-5 overflow-y-auto px-3 py-5">
            <div>
              {/* The lockup is the navigation item for "/", so on home it
                  carries the same current-route treatment every taxonomy entry
                  gets: aria-current plus the lime active-interval rail, marked
                  at the shared rail depth rather than at the text indent. */}
              <Link
                href="/"
                aria-current={pathname === '/' ? 'page' : undefined}
                data-tektur-role="shell-wordmark"
                data-brand-control-id="control:link-focus"
                className="relative block rounded-sm px-2 py-0.5 font-display-shell text-[17px] tracking-[-0.025em] text-text"
              >
                {pathname === '/' ? (
                  <BrandDevice
                    device="active-interval-rail"
                    anchorSelector="#sidebar-taxonomy"
                    deviceEdge="left"
                    anchorEdge="left"
                    className="left-0 top-0 h-full"
                  />
                ) : null}
                {PUBLIC_IDENTITY}
              </Link>
            </div>
            <SearchBox idPrefix="sidebar" />
            <NavTree idPrefix="sidebar" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />
          </div>
        </aside>

        {/* Content column: main plus the site footer. The column wrapper
            keeps the footer a sibling of <main> (never a descendant, so it
            resolves as a contentinfo landmark, VAL-DIST-006) while it still
            spans the content area next to the sidebar on desktop and stacks
            below main on mobile. */}
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

        {/* Mobile drawer. */}
        {drawerOpen ? (
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            data-pagefind-ignore
            className="fixed inset-0 z-50 lg:hidden"
          >
            {/* Scrim: click-to-dismiss (keyboard users get Escape + close).
                Ink at 60% rather than a wash of the page ground, because the
                panel is paper and a paper scrim over a paper page composites
                to the panel's own colour: the edge measured 1.00:1 against it,
                so nothing separated the drawer at all. */}
            <div
              aria-hidden
              onClick={closeDrawer}
              className="absolute inset-0 bg-ink/60"
            />
            {/* The panel is opaque paper against that scrim, and it is flush
                with three viewport edges, so its one visible boundary is the
                inner edge the scrim already carries. A border or a shadow
                there would be a second edge doing the same work. */}
            <div
              ref={drawerPanelRef}
              className="relative flex h-full w-[85vw] max-w-80 flex-col bg-bg"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                {/* Same current-route treatment as the sidebar lockup: the
                    drawer is the taxonomy at mobile widths, so its lockup is
                    the navigation item for "/" and takes aria-current plus the
                    lime active-interval rail at the shared rail depth. */}
                <Link
                  href="/"
                  aria-current={pathname === '/' ? 'page' : undefined}
                  onClick={() => setDrawerOpen(false)}
                  data-tektur-role="shell-wordmark"
                  data-brand-control-id="control:link-focus"
                  className="relative block rounded-sm px-2 py-0.5 font-display-shell text-[15px] tracking-[-0.02em] text-text"
                >
                  {pathname === '/' ? (
                    <BrandDevice
                      device="active-interval-rail"
                      anchorSelector="#drawer-taxonomy"
                      deviceEdge="left"
                      anchorEdge="left"
                      className="left-0 top-0 h-full"
                    />
                  ) : null}
                  {PUBLIC_IDENTITY}
                </Link>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close navigation menu"
                  data-brand-control-id="control:secondary-action"
                  onClick={closeDrawer}
                  className="flex items-center rounded-sm p-1.5 text-text transition-colors hover:bg-surface-2 active:translate-y-[1px]"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <SearchBox
                  idPrefix="drawer"
                  onNavigate={() => setDrawerOpen(false)}
                />
                <NavTree
                  idPrefix="drawer"
                  ariaLabel={`${PUBLIC_IDENTITY} taxonomy drawer`}
                  onNavigate={() => setDrawerOpen(false)}
                  className="mt-5"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
