/**
 * Pre-hydration redirect guard for the exported 404 page.
 *
 * Why this exists (the React #418 hydration error on 404 routes, fixed
 * 2026-08-15 by polish-go-public):
 *
 * `output: 'export'` emits ONE static 404 document (`404.html`, plus the
 * internal `/_not-found/` copy the postbuild prune removes). Hosts serve
 * that single document for EVERY unknown path. The document's inline RSC
 * flight payload, however, describes the tree Next rendered it for:
 * segments `["", "_not-found", ""]`. When the browser hydrates it at
 * `/manipulation/nope/`, the client router builds its initial tree from
 * `location.pathname` while React hydrates against server HTML whose
 * payload claims a different route shape. React detects the divergence
 * and throws `Minified React error #418` (server HTML did not match the
 * client), then recovers by client-rendering. The page ends up correct
 * and interactive; the defect is the thrown error, which fails the
 * zero-console-error contract on any unknown route.
 *
 * A per-path static document cannot exist, so the mismatch cannot be
 * removed at the source. The guard below runs before hydration: when the
 * 404 document is served for any path other than its own (`/404/`, the
 * internal `/_not-found/`, or the root-less form), it replaces the
 * history entry with `/404/`. React then hydrates the document at the
 * path it was rendered for, and the error never fires. `location.replace`
 * (not `assign`) keeps the back button returning to where the reader came
 * from instead of trapping them on the error page.
 *
 * Injection is a postbuild step (scripts/patch-404-guard.ts): the script
 * must sit in `<head>` ahead of the async chunk scripts, and it must not
 * ship in dev (dev serves not-found per-request, so no mismatch exists).
 *
 * Pure string logic lives here for unit testing; the script carries the
 * CLI wrapper.
 */

/**
 * The guard script injected into `out/404.html`.
 *
 * Written as a self-contained IIFE with no dependencies so its behavior is
 * identical regardless of load order. Path comparison strips trailing
 * slashes so `/404` and `/404/` both hydrate in place.
 */
export const NOT_FOUND_GUARD_SCRIPT =
  '<script>(function(){var p=location.pathname.replace(/\\/+$/,"");' +
  'if(p!=="/404"&&p!=="/_not-found"&&p!==""){location.replace("/404/");}})();</script>';

/** Marker used to detect a double injection. */
const GUARD_SIGNATURE = 'location.replace("/404/")';

/**
 * Inject the guard into a 404 document's `<head>`, ahead of any other
 * head content so it runs before hydration starts.
 *
 * Idempotent: an HTML that already carries the guard is returned unchanged
 * (and flagged), so re-running the postbuild patch is safe.
 *
 * Returns `[html, injected]`.
 */
export function injectNotFoundGuard(html: string): [string, boolean] {
  if (html.includes(GUARD_SIGNATURE)) return [html, false];
  const headOpen = html.indexOf('<head>');
  if (headOpen === -1) return [html, false];
  const at = headOpen + '<head>'.length;
  return [html.slice(0, at) + NOT_FOUND_GUARD_SCRIPT + html.slice(at), true];
}
