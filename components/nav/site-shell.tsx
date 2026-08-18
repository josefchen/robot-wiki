'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavTree } from './nav-tree';
import { SearchBox } from './search-box';

/**
 * The application shell: persistent desktop sidebar, mobile top bar with a
 * hamburger-driven drawer, and the <main> content region.
 *
 * Accessibility contract: the drawer trigger reports aria-expanded and
 * aria-controls; opening moves focus into the drawer and makes the page
 * behind it inert; Escape, the close control, or the scrim dismiss it and
 * return focus to the trigger; every link inside the drawer closes it via
 * the onNavigate callback.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Set when the drawer closes via Escape, the close control, or the scrim:
  // focus returns to the trigger. Navigation closes leave focus alone.
  const restoreFocus = useRef(false);

  // While open: move focus into the drawer, listen for Escape, lock scroll.
  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        restoreFocus.current = true;
        setDrawerOpen(false);
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

  return (
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
          onClick={() => setDrawerOpen(true)}
          className="flex items-center rounded-sm p-1.5 text-text transition-colors hover:bg-surface-2 active:translate-y-[1px]"
        >
          <List size={20} aria-hidden />
        </button>
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-tight text-text"
        >
          robot-wiki
        </Link>
      </header>

      {/* Desktop sidebar: sticky, full-height, independently scrollable. */}
      <aside
        inert={drawerOpen}
        data-pagefind-ignore
        className="hidden w-72 shrink-0 border-r border-border lg:block"
      >
        <div className="sticky top-0 flex h-dvh flex-col gap-5 overflow-y-auto px-3 py-5">
          <Link
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            className="px-2 font-mono text-sm font-semibold tracking-tight text-text"
          >
            robot-wiki
          </Link>
          <SearchBox idPrefix="sidebar" />
          <NavTree idPrefix="sidebar" ariaLabel="robot-wiki taxonomy" />
        </div>
      </aside>

      <main
        id="main-content"
        tabIndex={-1}
        inert={drawerOpen}
        className="min-w-0 flex-1"
      >
        {children}
      </main>

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
          {/* Scrim: click-to-dismiss (keyboard users get Escape + close). */}
          <div
            aria-hidden
            onClick={closeDrawer}
            className="absolute inset-0 bg-bg/80"
          />
          {/* The 80% scrim already separates the panel from the page; a
              border on top of it is a redundant edge. */}
          <div className="relative flex h-full w-[85vw] max-w-80 flex-col bg-bg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="font-mono text-sm font-semibold tracking-tight text-text"
              >
                robot-wiki
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close navigation menu"
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
                ariaLabel="robot-wiki taxonomy drawer"
                onNavigate={() => setDrawerOpen(false)}
                className="mt-5"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
