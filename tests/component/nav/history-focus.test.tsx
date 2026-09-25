import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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

function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  mockPathname = path;
}

function goBackTo(path: string) {
  window.history.pushState({}, '', path);
  mockPathname = path;
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
    goBackTo('/');
    await rerenderAt(rerender);
    const heading = document.querySelector<HTMLElement>('main h1');
    expect(heading).not.toBeNull();
    expect(activeElementId()).not.toBe('BODY');
    expect(document.activeElement).toBe(heading);
    // Script focus needs the heading focusable without joining Tab order.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('falls back to the main landmark when the page has no h1', async () => {
    const { rerender } = render(<Harness heading={false} />);
    navigateTo('/market-map/');
    await rerenderAt(rerender, { heading: false });
    goBackTo('/');
    await rerenderAt(rerender, { heading: false });
    expect(activeElementId()).toBe('main-content');
  });

  it('does not steal focus another control already owns', async () => {
    const { rerender } = render(<Harness />);
    navigateTo('/manipulation/action-chunking/');
    await rerenderAt(rerender);
    document.getElementById('outside-stop')?.focus();
    goBackTo('/');
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
    // A later click navigation must also not fire the stale pending step.
    navigateTo('/');
    await rerenderAt(rerender);
    expect(activeElementId()).toBe('BODY');
  });

  it('stays out of the way while suspended (drawer open)', async () => {
    const { rerender } = render(<Harness suspended />);
    navigateTo('/manipulation/action-chunking/');
    await rerenderAt(rerender, { suspended: true });
    goBackTo('/');
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
