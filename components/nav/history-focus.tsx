'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Moves focus to the restored page's heading after browser Back/Forward.
 *
 * The shell keeps one document across client-side navigations, so a history
 * step restores the route with no document load that would reset focus.
 * Without this, the URL restores but activeElement stays BODY (observed at
 * both 375px and 1440px, tracked under
 * brand-v2-discovery-route-flows-history-and-404): a keyboard or
 * screen-reader reader lands back on the page with no reading position and
 * no announcement that the view changed.
 *
 * Both ways a history step can reach the page are covered:
 * - Same-document steps: a popstate arms the move, and focus lands once the
 *   router commits the restored route. The router pushes the new URL
 *   optimistically BEFORE React commits the outgoing route, so a fast Back
 *   arrives while the shell still shows the previous page; the armed step
 *   therefore waits for the commit whose route matches the URL rather than
 *   reasoning about which route was last committed.
 * - Cross-document steps: a full page load performed for Back/Forward
 *   reports navigation type `back_forward`, and the freshly loaded document
 *   also starts with focus on the body and nothing else to move it.
 *
 * Contract, narrowed to exactly that defect:
 * - Click navigations never move focus; the clicked link keeps focus
 *   exactly as before (an armed step that outlives its traversal by more
 *   than two seconds is discarded rather than fired at a later click).
 * - Hash-only history steps keep the browser's own scrolling and focus:
 *   they restore the same path and query the shell last recorded.
 * - If another control already owns focus after the step (a dialog, a
 *   persistent link that survived it, a control that claimed it during
 *   render), it is left alone.
 * - While suspended (the mobile drawer holds focus), nothing moves.
 * - The target is the restored page's h1, made script-focusable with
 *   tabindex="-1" so it never joins Tab order; #main-content (already a
 *   skip-link script target) is the fallback for pages without an h1.
 * - Focus is moved with preventScroll so it never fights the browser's own
 *   scroll restoration for the history entry.
 */
export function HistoryFocus({ suspended = false }: { suspended?: boolean }) {
  const pathname = usePathname();
  // The path (plus query) of the most recent same-document URL change the
  // router made, recorded at pushState/replaceState time rather than commit
  // time: the URL leads the commit, so commit-time keys go stale exactly
  // when a fast Back follows a fresh click.
  const lastPushedKey = useRef<string | null>(null);
  // A popstate restored a different path+query than the shell last recorded
  // (i.e. the step was cross-page, not a hash jump); the next commit whose
  // route matches the URL may move focus.
  const armed = useRef(false);
  const armedAt = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    function keyOf(url: string | URL | null | undefined): string {
      const resolved = new URL(
        url == null ? window.location.href : String(url),
        window.location.href,
      );
      return resolved.pathname + resolved.search;
    }
    // Observing the router's own history writes is the same containment an
    // analytics SDK uses; own-property wrappers leave the prototype clean,
    // and the originals are restored on unmount.
    const { pushState, replaceState } = window.history;
    window.history.pushState = function (data, unused, url) {
      lastPushedKey.current = keyOf(url);
      return pushState.call(this, data, unused, url);
    };
    window.history.replaceState = function (data, unused, url) {
      lastPushedKey.current = keyOf(url);
      return replaceState.call(this, data, unused, url);
    };
    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, []);

  useEffect(() => {
    function onPopState() {
      const restored = window.location.pathname + window.location.search;
      // A hash-only step restores the same path and query the shell last
      // recorded: the browser's own hash handling owns scroll and focus.
      armed.current = restored !== lastPushedKey.current;
      armedAt.current = Date.now();
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    function focusPageHeading() {
      // Another control claimed focus during the restore (or survived it,
      // like a sidebar link): leave it alone.
      if (document.activeElement !== document.body) return;
      const heading = document.querySelector<HTMLElement>('main h1');
      const target = heading ?? document.getElementById('main-content');
      if (!target) return;
      if (heading) heading.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }

    if (!mounted.current) {
      mounted.current = true;
      armed.current = false;
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

    if (!armed.current) return;
    if (Date.now() - armedAt.current > 2000) {
      // The traversal's commit never matched (or came very late); discard
      // the step rather than fire it at an unrelated click navigation.
      armed.current = false;
      return;
    }
    if (pathname !== window.location.pathname) {
      // The optimistic URL update is still ahead of this commit: this is
      // the outgoing route rendering late. The restored route's commit is
      // the one that matches the URL, so the step stays armed.
      return;
    }
    armed.current = false;
    if (!suspended) focusPageHeading();
  }, [pathname, suspended]);

  return null;
}
