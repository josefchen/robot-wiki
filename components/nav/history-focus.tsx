'use client';

import { usePathname, useSearchParams } from 'next/navigation';
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
 *   reasoning about which route was last committed. The router's own
 *   popstate listener runs before this helper's and can flush the restored
 *   commit first, so the handler also fires the move itself when the
 *   restored route has already committed by the time it runs.
 * - Cross-document steps: a full page load performed for Back/Forward
 *   reports navigation type `back_forward`, and the freshly loaded document
 *   also starts with focus on the body and nothing else to move it.
 *
 * The history key is the path PLUS the query, because the shell's search
 * box pushes one entry per submit: Back between two /search?q= entries
 * changes only the query, and a commit effect keyed on the pathname alone
 * never re-runs for it (VAL-NAV-028).
 *
 * Contract, narrowed to exactly that defect:
 * - Click navigations never move focus; the clicked link keeps focus
 *   exactly as before. An armed step is bound to the path+query it
 *   restored (VAL-NAV-029), so it is discarded rather than fired when a
 *   click commits a different route inside the two-second window, and it
 *   never survives its traversal by more than two seconds.
 * - Hash-only history steps keep the browser's own scrolling and focus:
 *   they restore the same path and query the shell last recorded. The
 *   entry the document loaded on counts as recorded, so a hash Back on the
 *   first page (no router push observed yet) arms nothing.
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

/** The raw path+query of a URL, with one '?' when a query is present. */
function rawKeyOf(pathname: string, search: string): string {
  const query = search.replace(/^\?/, '');
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * A comparable form of the same key. The router hook serializes a space as
 * `+` while the address bar can hold `%20`; both are the same query, so
 * keys are compared through a URLSearchParams round-trip.
 */
function normalizedKeyOf(pathname: string, search: string): string {
  const normalized = new URLSearchParams(search).toString();
  return normalized ? `${pathname}?${normalized}` : pathname;
}

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

export function HistoryFocus({ suspended = false }: { suspended?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // The route the router has committed, path plus query.
  const committedKey = rawKeyOf(pathname, search);
  // The path (plus query) of the most recent same-document URL change the
  // router made, recorded at pushState/replaceState time rather than commit
  // time: the URL leads the commit, so commit-time keys go stale exactly
  // when a fast Back follows a fresh click.
  const lastPushedKey = useRef<string | null>(null);
  // A popstate restored a different path+query than the shell last recorded
  // (i.e. the step was cross-page, not a hash jump); the next commit whose
  // route matches the URL may move focus.
  const armed = useRef(false);
  // The restored path+query that armed the move, so the arm can only ever
  // fire on the route it was armed for, never on a click elsewhere.
  const armedKey = useRef<string | null>(null);
  const armedAt = useRef(0);
  const mounted = useRef(false);
  // The last route key this helper saw committed, the current suspension
  // flag, and whether a router-initiated URL change has not committed yet:
  // all readable from the popstate handler, which runs outside the render
  // cycle and may run after the restored commit has already flushed.
  const lastCommittedKey = useRef<string | null>(null);
  const suspendedRef = useRef(suspended);
  const commitPending = useRef(false);

  useEffect(() => {
    function keyOf(url: string | URL | null | undefined): string {
      const resolved = new URL(
        url == null ? window.location.href : String(url),
        window.location.href,
      );
      return rawKeyOf(resolved.pathname, resolved.search);
    }
    // Observing the router's own history writes is the same containment an
    // analytics SDK uses; own-property wrappers leave the prototype clean,
    // and the originals are restored on unmount.
    const { pushState, replaceState } = window.history;
    // The entry this document loaded on is the shell's own key from the
    // start: a hash-only Back on the first page (before any router push
    // has been observed) restores that key and must not arm a move
    // (VAL-NAV-029).
    lastPushedKey.current ??= keyOf(window.location.href);
    window.history.pushState = function (data, unused, url) {
      const key = keyOf(url);
      // Only a deliberate route change is recorded: a write that
      // reaffirms the URL the document already holds is the router's
      // trailing-slash normalization, or its post-popstate rewrite of the
      // restored entry, and recording those would erase the difference
      // between the pre-traversal push and the entry Back restored.
      if (key !== rawKeyOf(window.location.pathname, window.location.search)) {
        // A router write for a route that has not committed yet: the
        // popstate handler must not fire an armed step while such a commit
        // can still land (the fast-Back race), only once the router is
        // quiescent.
        if (key !== lastCommittedKey.current) commitPending.current = true;
        lastPushedKey.current = key;
      }
      return pushState.call(this, data, unused, url);
    };
    window.history.replaceState = function (data, unused, url) {
      const key = keyOf(url);
      if (key !== rawKeyOf(window.location.pathname, window.location.search)) {
        if (key !== lastCommittedKey.current) commitPending.current = true;
        lastPushedKey.current = key;
      }
      return replaceState.call(this, data, unused, url);
    };
    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, []);

  useEffect(() => {
    function onPopState() {
      const restored = rawKeyOf(
        window.location.pathname,
        window.location.search,
      );
      // A hash-only step restores the same path and query the shell last
      // recorded: the browser's own hash handling owns scroll and focus.
      armed.current = restored !== lastPushedKey.current;
      armedKey.current = armed.current
        ? normalizedKeyOf(window.location.pathname, window.location.search)
        : null;
      armedAt.current = Date.now();
      if (
        !armed.current ||
        lastCommittedKey.current !== armedKey.current ||
        commitPending.current
      ) {
        // Either nothing is armed, the restored route has not committed
        // yet, or a router write is still ahead of its commit (the
        // fast-Back race): the commit effect picks the arm up when the
        // restored route lands.
        return;
      }
      // The router's own popstate listener runs before this one and can
      // flush the restored commit first (React runs this helper's commit
      // effect inside that flush, before this handler arms the step), so
      // when the restored route is already committed the move fires here:
      // no further commit will come to fire it.
      armed.current = false;
      if (!suspendedRef.current) focusPageHeading();
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    lastCommittedKey.current = committedKey;
    suspendedRef.current = suspended;
    commitPending.current = false;

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
    if (
      committedKey !==
      normalizedKeyOf(window.location.pathname, window.location.search)
    ) {
      // The optimistic URL update is still ahead of this commit: this is
      // the outgoing route rendering late. The restored route's commit is
      // the one that matches the URL, so the step stays armed.
      return;
    }
    if (armedKey.current !== null && committedKey !== armedKey.current) {
      // The URL has settled on a route the armed step was not armed for:
      // a click navigation committed inside the window. Discard the arm
      // rather than steal focus on the new page (VAL-NAV-029).
      armed.current = false;
      return;
    }
    armed.current = false;
    if (!suspended) focusPageHeading();
  }, [committedKey, suspended]);

  return null;
}
