import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/';
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: 'Open navigation menu' }),
  );
  return screen.getByRole('dialog', { name: 'Site navigation' });
}

describe('SiteShell', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockPush.mockClear();
  });

  it('renders children inside main#main-content', () => {
    renderShell();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(within(main).getByText('Page body')).toBeInTheDocument();
  });

  it('renders the desktop sidebar nav and a search entry point', () => {
    renderShell();
    expect(
      screen.getByRole('navigation', { name: `${PUBLIC_IDENTITY} taxonomy` }),
    ).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('opens the drawer from the hamburger with correct ARIA', async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole('button', {
      name: 'Open navigation menu',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-nav-drawer');
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
    const trigger = screen.getByRole('button', {
      name: 'Open navigation menu',
    });
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
    await user.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );
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
    await user.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );
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
    for (const selector of [
      'a[href="#main-content"]',
      'header',
      'aside#sidebar-rail',
      'main#main-content',
      'footer',
    ]) {
      const region = container.querySelector(selector);
      expect(region, selector).not.toBeNull();
      expect(region, selector).toHaveAttribute('inert');
    }
  });

  it('marks the drawer lockup as the current route on home', async () => {
    const user = userEvent.setup();
    renderShell();
    const dialog = await openDrawer(user);
    const lockup = within(dialog).getByRole('link', { name: PUBLIC_IDENTITY });
    expect(lockup).toHaveAttribute('aria-current', 'page');
    expect(
      lockup.querySelector('[data-brand-device-id="device:active-interval-rail"]'),
    ).not.toBeNull();
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

  it('closes the drawer when a navigation link inside it is followed', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    );
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
