import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/';
let mockSearch = '';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

import { HistoryFocus } from '@/components/nav/history-focus';

/**
 * The shell keeps one document across client-side navigations, so browser
 * Back/Forward restores the route through popstate without a document load
 * that would reset focus. The observed defect (audit 2026-09): the URL
 * restores but activeElement stays BODY, so a keyboard or screen-reader
 * reader lands mid-page with no reading position. HistoryFocus moves focus
 * to the restored page's h1 after a cross-page history step only — click
 * navigations, hash steps and an open drawer must not be disturbed.
 */

function Harness({
  heading = true,
  suspended = false,
}: {
  heading?: boolean;
  suspended?: boolean;
}) {
  return (
    <>
      <HistoryFocus suspended={suspended} />
      <a href="#elsewhere" id="outside-stop">
        Persistent shell stop
      </a>
      <main id="main-content" tabIndex={-1}>
        {heading ? <h1>Page title</h1> : null}
      </main>
    </>
  );
}

function activeElementId(): string {
  const el = document.activeElement;
  if (!el || el === document.body) return 'BODY';
  return el.id || el.tagName.toLowerCase();
}

/**
 * A click navigation: the router pushes the new URL (which the component
 * observes through its history wrapper) and then commits the route.
 */
function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  mockPathname = new URL(path, window.location.href).pathname;
  mockSearch = new URL(path, window.location.href).search.replace(/^\?/, '');
}

/**
 * A history traversal: the browser changes the URL without going through
 * the router's pushState, so this must bypass the component's own-property
 * wrapper and use the prototype directly, then deliver the popstate.
 */
function traverseTo(path: string) {
  History.prototype.pushState.call(window.history, {}, '', path);
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

async function rerenderAt(
  rerender: (ui: React.ReactElement) => void,
  options: { heading?: boolean; suspended?: boolean } = {},
) {
  await act(async () => {
    rerender(
      <Harness
        heading={options.heading ?? true}
        suspended={options.suspended ?? false}
      />,
    );
  });
}

describe('HistoryFocus', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockSearch = '';
    window.history.replaceState({}, '', '/');
  });

  it('leaves focus on the body after initial mount', async () => {
    const { rerender } = render(<Harness />);
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
  });

  it('does not steal focus on a click-style pushState navigation', async () => {
    const { rerender } = render(<Harness />);
    navigateTo('/manipulation/action-chunking/');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
  });

  it('focuses the restored page heading after Back', async () => {
    const { rerender } = render(<Harness />);
    navigateTo('/manipulation/action-chunking/');
    await rerenderAt(rerender);
    mockPathname = '/';
    traverseTo('/');
    await rerenderAt(rerender);
    const heading = document.querySelector<HTMLElement>('main h1');
    expect(heading).not.toBeNull();
    expect(activeElementId()).not.toBe('BODY');
    expect(document.activeElement).toBe(heading);
    // Script focus needs the heading focusable without joining Tab order.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('still focuses when Back races the outgoing route\'s commit', async () => {
    // The router pushes the article URL but has not committed it when the
    // reader hits Back (Next.js updates the URL optimistically); the stale
    // article commit lands after the popstate, before the restored route.
    const { rerender } = render(<Harness />);
    navigateTo('/manipulation/action-chunking/');
    // No rerender: the article commit is still in flight.
    mockPathname = '/';
    traverseTo('/');
    // The outgoing route's commit arrives first, ahead of the restored URL.
    mockPathname = '/manipulation/action-chunking/';
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
    // Then the restored route commits and focus lands on its heading.
    mockPathname = '/';
    await rerenderAt(rerender);
    expect(document.activeElement).toBe(
      document.querySelector('main h1'),
    );
  });

  it('falls back to the main landmark when the page has no h1', async () => {
    const { rerender } = render(<Harness heading={false} />);
    navigateTo('/market-map/');
    await rerenderAt(rerender, { heading: false });
    mockPathname = '/';
    traverseTo('/');
    await rerenderAt(rerender, { heading: false });
    expect(activeElementId()).toBe('main-content');
  });

  it('does not steal focus another control already owns', async () => {
    const { rerender } = render(<Harness />);
    navigateTo('/manipulation/action-chunking/');
    await rerenderAt(rerender);
    document.getElementById('outside-stop')?.focus();
    mockPathname = '/';
    traverseTo('/');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('outside-stop');
  });

  it('ignores same-document hash history steps', async () => {
    const { rerender } = render(<Harness />);
    navigateTo('/manipulation/action-chunking/');
    await rerenderAt(rerender);
    // Same path and query: only the fragment differs, so the browser's own
    // hash scrolling owns the step and focus must not move.
    window.history.pushState({}, '', '/manipulation/action-chunking/#refs');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
    // A later click navigation must also not fire the stale armed step.
    navigateTo('/');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
  });

  it('restores heading focus when Back changes only the query', async () => {
    // VAL-NAV-028: the shell search box pushes one history entry per
    // submit, so Back between two /search?q= entries changes only the
    // query. The pathname never changes, so a commit effect keyed on the
    // pathname alone never re-runs, and focus is left on BODY.
    const { rerender } = render(<Harness />);
    navigateTo('/search/');
    await rerenderAt(rerender);
    navigateTo('/search/?q=aloha');
    await rerenderAt(rerender);
    navigateTo('/search/?q=chunk');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
    // Back to the first query: same path, different query.
    traverseTo('/search/?q=aloha');
    mockSearch = 'q=aloha';
    await rerenderAt(rerender);
    expect(activeElementId()).not.toBe('BODY');
    expect(document.activeElement).toBe(
      document.querySelector('main h1'),
    );
  });

  it('leaves a still-focused result alone on a query-only Back', async () => {
    // VAL-NAV-028: "or the previously focused result if it is still
    // mounted". A control that owns focus after the step is never
    // disturbed, even when the query is the only thing that changed.
    const { rerender } = render(<Harness />);
    navigateTo('/search/?q=aloha');
    await rerenderAt(rerender);
    navigateTo('/search/?q=chunk');
    await rerenderAt(rerender);
    document.getElementById('outside-stop')?.focus();
    traverseTo('/search/?q=aloha');
    mockSearch = 'q=aloha';
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('outside-stop');
  });

  it('fires the move in the popstate handler when the restored commit flushed first', async () => {
    // Real-browser order: the router's own popstate listener runs before
    // this helper's and can flush the restored commit inside that
    // dispatch, so the commit effect runs while nothing is armed yet.
    // The handler must then fire the armed move itself, because no later
    // commit will come to fire it (VAL-NAV-028).
    const { rerender } = render(<Harness />);
    navigateTo('/search/?q=aloha');
    await rerenderAt(rerender);
    navigateTo('/search/?q=chunk');
    await rerenderAt(rerender);
    // The restored commit lands before this helper's popstate handler.
    mockSearch = 'q=aloha';
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
    traverseTo('/search/?q=aloha');
    expect(activeElementId()).not.toBe('BODY');
    expect(document.activeElement).toBe(
      document.querySelector('main h1'),
    );
  });

  it('does not arm on a hash-only Back from the first page', async () => {
    // VAL-NAV-029: the document loads on '/', a reader jumps to an in-page
    // anchor (no router push is observed), then presses Back. The entry
    // the document loaded on must already count as the shell's own key, so
    // the hash Back does not arm a heading move that a later click fires.
    const { rerender } = render(<Harness />);
    await rerenderAt(rerender);
    // An in-page hash jump the router never pushed (native anchor link).
    History.prototype.pushState.call(window.history, {}, '', '/#references');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Back: the URL returns to '/', then a click navigates inside the
    // two-second window.
    traverseTo('/');
    navigateTo('/market-map/');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
  });

  it('discards a query-only Back arm when a click commits another route first', async () => {
    // VAL-NAV-029: a query-only Back arms the move, but the restored
    // commit can be beaten by a click navigation. The arm must be bound to
    // the restored path+query so the click cannot fire it at the heading.
    const { rerender } = render(<Harness />);
    navigateTo('/search/?q=aloha');
    await rerenderAt(rerender);
    navigateTo('/search/?q=chunk');
    await rerenderAt(rerender);
    traverseTo('/search/?q=aloha');
    // Before the restored query commits, the reader clicks a nav link.
    navigateTo('/market-map/');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
    // The discarded arm must not fire later either: reaching the armed
    // route again by click is a click navigation, not a traversal.
    navigateTo('/search/?q=aloha');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
  });

  it('stays out of the way while suspended (drawer open)', async () => {
    const { rerender } = render(<Harness suspended />);
    navigateTo('/manipulation/action-chunking/');
    await rerenderAt(rerender, { suspended: true });
    mockPathname = '/';
    traverseTo('/');
    await rerenderAt(rerender, { suspended: true });
    // Drawer open: focus stays wherever the dialog put it.
    expect(activeElementId()).toBe('BODY');
  });

  describe('cross-document history loads', () => {
    // jsdom's performance object does not implement navigation timing
    // entries, so the entry the component reads is supplied per test.
    function mockNavigationType(type: string) {
      Object.defineProperty(window.performance, 'getEntriesByType', {
        configurable: true,
        writable: true,
        value: vi.fn().mockReturnValue([
          { entryType: 'navigation', type },
        ]),
      });
    }

    afterEach(() => {
      Reflect.deleteProperty(window.performance, 'getEntriesByType');
    });

    it('focuses the page heading when the document loaded for Back', async () => {
      mockNavigationType('back_forward');
      const { rerender } = render(<Harness />);
      await rerenderAt(rerender);
      const heading = document.querySelector<HTMLElement>('main h1');
      expect(document.activeElement).toBe(heading);
      expect(heading).toHaveAttribute('tabindex', '-1');
    });

    it('leaves focus on the body for ordinary loads and reloads', async () => {
      for (const type of ['navigate', 'reload']) {
        mockNavigationType(type);
        const { rerender } = render(<Harness />);
        await rerenderAt(rerender);
        expect(activeElementId()).toBe('BODY');
      }
    });

    it('does not move focus while suspended on a Back load', async () => {
      mockNavigationType('back_forward');
      const { rerender } = render(<Harness suspended />);
      await rerenderAt(rerender, { suspended: true });
      expect(activeElementId()).toBe('BODY');
    });
  });
});
