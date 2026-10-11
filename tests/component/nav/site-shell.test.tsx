import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/';
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  // HistoryFocus reads ?q= so query-only Back steps can restore focus.
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush }),
}));

import { SiteShell } from '@/components/nav/site-shell';
import { PUBLIC_IDENTITY } from '@/lib/identity';

function renderShell() {
  return render(
    <SiteShell>
      <p>Page body</p>
    </SiteShell>,
  );
}

/** The same tab stops the drawer's trap cycles through. */
const DRAWER_TAB_STOPS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function drawerTabStops(dialog: HTMLElement): HTMLElement[] {
  const panel = dialog.querySelector<HTMLElement>(
    ':scope > div:not([aria-hidden])',
  );
  return [...(panel?.querySelectorAll<HTMLElement>(DRAWER_TAB_STOPS) ?? [])];
}

/**
 * Regions the shell makes inert while the drawer holds the viewport.
 *
 * Owner-approved successor (Josef, 2026-10-10, the Pantheon standard): the
 * persistent desktop sidebar and the hamburger header are gone. The shell is
 * one top bar (wordmark left, "Articles" and "How robots work" right), and
 * "Articles" opens the same taxonomy panel at every width, so there is no
 * sidebar region and no breakpoint hand-off. Every accessibility obligation
 * of the panel is kept below.
 */
const SHELL_REGIONS = [
  'a[href="#main-content"]',
  'header',
  'main#main-content',
  'footer',
] as const;

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Articles' }));
  return screen.getByRole('dialog', { name: 'Site navigation' });
}

describe('SiteShell', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockPush.mockClear();
  });

  afterEach(() => {
    window.scrollY = 0;
  });

  it('renders children inside main#main-content', () => {
    renderShell();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(within(main).getByText('Page body')).toBeInTheDocument();
  });

  it('renders a top bar with the wordmark and exactly two text links', () => {
    mockPathname = '/manipulation/action-chunking/';
    renderShell();
    const header = screen.getByRole('banner');
    const wordmark = within(header).getByRole('link', { name: PUBLIC_IDENTITY });
    expect(wordmark).toHaveAttribute('href', '/');
    const site = within(header).getByRole('navigation', { name: 'Site' });
    const controls = [...site.querySelectorAll('a, button')];
    expect(controls.map((control) => control.textContent)).toEqual([
      'Articles',
      'How robots work',
    ]);
    expect(
      within(site).getByRole('link', { name: 'How robots work' }),
    ).toHaveAttribute('href', expect.stringMatching(/^\/how-robots-work\/?$/));
    // Nothing else in the bar: no search field, no icons, no taxonomy.
    expect(within(header).queryByRole('search')).toBeNull();
    expect(header.querySelectorAll('svg, img')).toHaveLength(0);
    // The taxonomy and search live in the panel, which starts closed.
    expect(
      screen.queryByRole('navigation', { name: `${PUBLIC_IDENTITY} taxonomy drawer` }),
    ).toBeNull();
  });

  it('draws the hairline under the bar only once the page has scrolled', () => {
    renderShell();
    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('data-scrolled', 'false');
    expect(header.className).toContain('border-transparent');
    act(() => {
      window.scrollY = 120;
      fireEvent.scroll(window);
    });
    expect(header).toHaveAttribute('data-scrolled', 'true');
    expect(header.className).toContain('border-border');
    act(() => {
      window.scrollY = 0;
      fireEvent.scroll(window);
    });
    expect(header).toHaveAttribute('data-scrolled', 'false');
  });

  it('marks the explainer link as the current page on the explainer', () => {
    mockPathname = '/how-robots-work/';
    renderShell();
    expect(
      screen.getByRole('link', { name: 'How robots work' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('opens the panel from "Articles" with correct ARIA', async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole('button', { name: 'Articles' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-nav-drawer');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    const dialog = screen.getByRole('dialog', { name: 'Site navigation' });
    expect(dialog).toHaveAttribute('id', 'mobile-nav-drawer');
    // The full tree and search are inside the drawer.
    expect(
      within(dialog).getByRole('button', {
        name: 'Manipulation & Learned Policies',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: 'Market Map' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('search')).toBeInTheDocument();
    // Focus moved into the drawer.
    expect(
      within(dialog).getByRole('button', { name: 'Close navigation menu' }),
    ).toHaveFocus();
  });

  it('closes via the close control and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole('button', { name: 'Articles' });
    await user.click(trigger);
    await user.click(
      screen.getByRole('button', { name: 'Close navigation menu' }),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Site navigation' }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes via Escape', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Articles' }));
    expect(
      screen.getByRole('dialog', { name: 'Site navigation' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: 'Site navigation' }),
    ).not.toBeInTheDocument();
  });

  it('makes the page behind the drawer inert while open', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Articles' }));
    expect(screen.getByRole('main')).toHaveAttribute('inert');
  });

  it('wraps Tab off the last drawer stop back to the first', async () => {
    const user = userEvent.setup();
    renderShell();
    const dialog = await openDrawer(user);
    const stops = drawerTabStops(dialog);
    expect(stops.length).toBeGreaterThan(3);
    stops[stops.length - 1].focus();
    await user.tab();
    expect(stops[0]).toHaveFocus();
  });

  it('wraps Shift+Tab off the first drawer stop back to the last', async () => {
    const user = userEvent.setup();
    renderShell();
    const dialog = await openDrawer(user);
    const stops = drawerTabStops(dialog);
    expect(stops.length).toBeGreaterThan(3);
    stops[0].focus();
    await user.tab({ shift: true });
    expect(stops[stops.length - 1]).toHaveFocus();
  });

  it('pulls a Tab back into the drawer when focus has left it', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const dialog = await openDrawer(user);
    const stops = drawerTabStops(dialog);
    container.querySelector<HTMLElement>('a[href="#main-content"]')?.focus();
    await user.tab();
    expect(stops[0]).toHaveFocus();
  });

  it('takes the skip link out of the tab order only while the drawer is open', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    // The skip link stays the shell's first element, so it is still the
    // first thing a Tab reaches whenever the drawer is closed.
    expect(container.firstElementChild).toBe(skip);
    expect(skip).not.toHaveAttribute('inert');
    await openDrawer(user);
    expect(skip).toHaveAttribute('inert');
    await user.keyboard('{Escape}');
    expect(skip).not.toHaveAttribute('inert');
  });

  it('makes every region outside the drawer inert, including the skip link', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    await openDrawer(user);
    for (const selector of SHELL_REGIONS) {
      const region = container.querySelector(selector);
      expect(region, selector).not.toBeNull();
      expect(region, selector).toHaveAttribute('inert');
    }
  });

  it('marks the drawer lockup as the current route on home, carrying no device', async () => {
    const user = userEvent.setup();
    renderShell();
    const dialog = await openDrawer(user);
    const lockup = within(dialog).getByRole('link', { name: PUBLIC_IDENTITY });
    expect(lockup).toHaveAttribute('aria-current', 'page');
    // The owner decision of 2026-09-25 keeps aria-current on the wordmark
    // but excludes it from the lime active-interval rail and every other
    // accent device, so no brand device may render inside it at all.
    expect(lockup.querySelector('[data-brand-device-id]')).toBeNull();
  });

  it('keeps every wordmark lockup free of brand devices on home', async () => {
    // Regression for the owner decision of 2026-09-25: the wordmark never
    // carries an active rail or any other accent bar. Every lockup the shell
    // renders (top bar, panel and footer) carries the shell-wordmark role,
    // and each is checked for any brand device descendant, so a highlight
    // reintroduced under another device id fails here too.
    const user = userEvent.setup();
    const { container } = renderShell();
    // Opening the drawer mounts its lockup inside the same container.
    await openDrawer(user);
    const lockups = [
      ...container.querySelectorAll('[data-tektur-role="shell-wordmark"]'),
    ];
    expect(lockups.length).toBe(3);
    for (const lockup of lockups) {
      expect(
        lockup.querySelector('[data-brand-device-id], [data-registration-device]'),
      ).toBeNull();
    }
    // On home the lockup is still the current-route item, semantics intact:
    // the top-bar and panel lockups carry aria-current, the footer's does
    // not, and no taxonomy entry claims the route.
    const marked = lockups.filter((lockup) =>
      lockup.hasAttribute('aria-current'),
    );
    expect(marked).toHaveLength(2);
    expect(
      container.querySelectorAll('#mobile-nav-drawer nav a[aria-current="page"]'),
    ).toHaveLength(0);
  });

  it('keeps every wordmark lockup free of brand devices on an inner route, while the taxonomy entry keeps aria-current', async () => {
    // The same regression one route deep: the wordmark exemption holds when
    // the lockup is not the current-route item. Successor (2026-10-10): the
    // matching taxonomy entry keeps aria-current, ink and one weight step,
    // and the lime active-interval rail is retired with the rest of the
    // brand-v2 accent bars.
    mockPathname = '/manipulation/action-chunking/';
    const user = userEvent.setup();
    const { container } = renderShell();
    const dialog = await openDrawer(user);
    const lockups = [
      ...container.querySelectorAll('[data-tektur-role="shell-wordmark"]'),
    ];
    expect(lockups.length).toBe(3);
    for (const lockup of lockups) {
      expect(lockup.hasAttribute('aria-current')).toBe(false);
      expect(
        lockup.querySelector('[data-brand-device-id], [data-registration-device]'),
      ).toBeNull();
    }
    const activeDrawerEntry = dialog.querySelector(
      'nav a[aria-current="page"]',
    );
    expect(activeDrawerEntry).not.toBeNull();
    expect(activeDrawerEntry).toHaveAttribute(
      'href',
      '/manipulation/action-chunking',
    );
    expect(activeDrawerEntry?.className).toContain('text-text');
    expect(activeDrawerEntry?.className).toContain('font-medium');
    expect(
      activeDrawerEntry?.querySelector('[data-brand-device-id]'),
    ).toBeNull();
  });

  it('leaves the drawer lockup unmarked off home', async () => {
    mockPathname = '/market-map/';
    const user = userEvent.setup();
    renderShell();
    const dialog = await openDrawer(user);
    const lockup = within(dialog).getByRole('link', { name: PUBLIC_IDENTITY });
    expect(lockup).not.toHaveAttribute('aria-current');
    expect(lockup.querySelector('[data-brand-device-id]')).toBeNull();
  });

  it('opens the same panel at every width, with no breakpoint hand-off', async () => {
    // Successor of the drawer/sidebar hand-off tests: with no sidebar, the
    // panel is the taxonomy at every width, so the shell neither watches a
    // breakpoint nor refuses to open on a wide screen.
    // Every media query reports a match, as on a wide desktop screen.
    const original = window.matchMedia;
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    const user = userEvent.setup();
    renderShell();
    await openDrawer(user);
    expect(screen.getByRole('main')).toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');
    expect(matchMedia).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    for (const selector of SHELL_REGIONS) {
      expect(
        document.querySelector(selector),
        selector,
      ).not.toHaveAttribute('inert');
    }
    expect(document.body.style.overflow).toBe('');
    window.matchMedia = original;
  });

  it('closes the drawer when a navigation link inside it is followed', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Articles' }));
    const dialog = screen.getByRole('dialog', { name: 'Site navigation' });
    await user.click(within(dialog).getByRole('link', { name: 'Market Map' }));
    // Link click triggers router navigation; simulate the route landing.
    mockPathname = '/market-map/';
    renderShell();
    expect(
      screen.queryByRole('dialog', { name: 'Site navigation' }),
    ).not.toBeInTheDocument();
  });
});
