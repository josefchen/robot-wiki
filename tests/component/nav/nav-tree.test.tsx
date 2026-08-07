import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

import { NavTree } from '@/components/nav/nav-tree';

const GROUP_NAMES = [
  'Manipulation & Learned Policies',
  'RL, Sim-to-Real & Locomotion',
  'World Models',
  'Data, Hardware & Evaluation',
  'Classical Foundations',
  'Frontier & Open Problems',
  'Adjacent Domains',
];

describe('NavTree', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  it('renders the seven taxonomy groups plus market map and playground', () => {
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    const nav = screen.getByRole('navigation', { name: 'Atlas taxonomy' });
    for (const name of GROUP_NAMES) {
      expect(
        within(nav).getByRole('button', { name }),
      ).toBeInTheDocument();
    }
    expect(
      within(nav).getByRole('link', { name: 'Market Map' }),
    ).toHaveAttribute('href', '/market-map');
    expect(
      within(nav).getByRole('link', { name: 'Playground' }),
    ).toHaveAttribute('href', '/playground');
  });

  it('starts with every group collapsed on the home page', () => {
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    for (const name of GROUP_NAMES) {
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    }
  });

  it('toggles one group without affecting the others', async () => {
    const user = userEvent.setup();
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    const target = screen.getByRole('button', {
      name: 'Classical Foundations',
    });
    await user.click(target);
    expect(target).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: 'World Models' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await user.click(target);
    expect(target).toHaveAttribute('aria-expanded', 'false');
  });

  it('links published modules and renders drafts as non-link planned rows', async () => {
    const user = userEvent.setup();
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    await user.click(
      screen.getByRole('button', { name: 'Manipulation & Learned Policies' }),
    );
    // The one published module is a link to its route.
    expect(
      screen.getByRole('link', { name: 'Action Chunking (ACT and ALOHA)' }),
    ).toHaveAttribute('href', '/manipulation/action-chunking');
    // Drafts are plain rows marked planned, never links (would 404).
    expect(
      screen.queryByRole('link', { name: 'Behavior Cloning Foundations' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Behavior Cloning Foundations')).toBeInTheDocument();
  });

  it('offers a domain overview link inside each expanded group', async () => {
    const user = userEvent.setup();
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    await user.click(
      screen.getByRole('button', { name: 'Frontier & Open Problems' }),
    );
    expect(
      screen.getByRole('link', { name: 'Domain overview' }),
    ).toHaveAttribute('href', '/frontier');
  });

  it('expands the active group and marks the active module on deep links', () => {
    mockPathname = '/manipulation/action-chunking/';
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    expect(
      screen.getByRole('button', { name: 'Manipulation & Learned Policies' }),
    ).toHaveAttribute('aria-expanded', 'true');
    const active = screen.getByRole('link', {
      name: 'Action Chunking (ACT and ALOHA)',
    });
    expect(active).toHaveAttribute('aria-current', 'page');
    // Nothing else is current at the same time.
    const allCurrent = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('aria-current') === 'page');
    expect(allCurrent).toHaveLength(1);
  });

  it('marks standalone entries active on their routes', () => {
    mockPathname = '/playground/';
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    expect(screen.getByRole('link', { name: 'Playground' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks the domain overview active on a domain landing', () => {
    mockPathname = '/classical/';
    render(<NavTree idPrefix="test" ariaLabel="Atlas taxonomy" />);
    expect(
      screen.getByRole('button', { name: 'Classical Foundations' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('link', { name: 'Domain overview' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('calls onNavigate when a link is activated', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <NavTree idPrefix="test" ariaLabel="Atlas taxonomy" onNavigate={onNavigate} />,
    );
    await user.click(screen.getByRole('link', { name: 'Market Map' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
