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
