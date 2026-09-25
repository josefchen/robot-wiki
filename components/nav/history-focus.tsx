'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Moves focus to the restored page's heading after browser Back/Forward.
 *
 * The shell keeps one document across client-side navigations, so a history
 * step restores the route through popstate with no document load that would
 * reset focus. Without this, the URL restores but activeElement stays BODY
 * (observed at both 375px and 1440px, tracked under
 * brand-v2-discovery-route-flows-history-and-404): a keyboard or
 * screen-reader reader lands back on the page with no reading position and
 * no announcement that the view changed.
 *
 * Both ways a history step can reach the page are covered:
 * - Same-document (client-side) steps: a popstate whose restored path
 *   differs from the last committed one arms the move, and the focus lands
 *   once the router commits the restored route.
 * - Cross-document steps: a full page load performed for Back/Forward
 *   reports navigation type `back_forward`, and the freshly loaded document
 *   also starts with focus on the body and nothing else to move it.
 *
 * Contract, narrowed to exactly that defect:
 * - Click navigations (pushState) never move focus; the clicked link keeps
 *   focus exactly as before.
 * - Hash-only history steps keep the browser's own scrolling and focus.
 * - If another control already owns focus after the step (a dialog, a
 *   control that claimed it during render), it is left alone.
 * - While suspended (the mobile drawer holds focus), nothing moves.
 * - The target is the restored page's h1, made script-focusable with
 *   tabindex="-1" so it never joins Tab order; #main-content (already a
 *   skip-link script target) is the fallback for pages without an h1.
 * - Focus is moved with preventScroll so it never fights the browser's own
 *   scroll restoration for the history entry.
 */
export function HistoryFocus({ suspended = false }: { suspended?: boolean }) {
  const pathname = usePathname();
  // The path (plus query) of the route the shell last committed, used to
  // tell cross-page history steps from hash-only ones. window.location is
  // read rather than the pathname prop because popstate fires after the
  // URL has already changed, while the pathname prop still describes the
  // outgoing route until React commits the restored one.
  const lastCommittedKey = useRef<string | null>(null);
  // The pathname a pending history step expects to see committed. Cleared
  // whenever the shell commits a route that does not match it, so a stale
  // pending step can never fire on a later click navigation.
  const pendingPathname = useRef<string | null>(null);

  useEffect(() => {
    function onPopState() {
      const restoredKey =
        window.location.pathname + window.location.search;
      if (restoredKey === lastCommittedKey.current) {
        // Same document position (a hash step): the browser's own hash
        // handling owns scroll and focus.
        pendingPathname.current = null;
        return;
      }
      pendingPathname.current = window.location.pathname;
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    function focusPageHeading() {
      // Another control claimed focus during the restore: leave it alone.
      if (document.activeElement !== document.body) return;
      const heading = document.querySelector<HTMLElement>('main h1');
      const target = heading ?? document.getElementById('main-content');
      if (!target) return;
      if (heading) heading.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }

    const currentKey = window.location.pathname + window.location.search;
    const previousKey = lastCommittedKey.current;
    lastCommittedKey.current = currentKey;

    const pending = pendingPathname.current;
    pendingPathname.current = null;

    if (previousKey === null) {
      // First commit in this document. If the document was loaded for a
      // Back/Forward step, it starts with focus on the body the same way a
      // restored client-side route does, and deserves the same treatment.
      const [entry] = performance.getEntriesByType('navigation');
      if (
        (entry as PerformanceNavigationTiming | undefined)?.type ===
          'back_forward' &&
        !suspended
      ) {
        focusPageHeading();
      }
      return;
    }

    if (pending === null || pending !== window.location.pathname) return;
    if (previousKey === currentKey) return;
    if (suspended) return;
    focusPageHeading();
  }, [pathname, suspended]);

  return null;
}
