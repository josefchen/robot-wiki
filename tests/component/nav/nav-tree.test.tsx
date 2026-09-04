import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

import { NavTree } from '@/components/nav/nav-tree';
import { DOMAIN_META, modules } from '@/data/modules';
import { PUBLIC_IDENTITY } from '@/lib/identity';
import { firstDraftModule } from '@/tests/helpers/draft-fixtures';

// Fixtures derive from the module registry (data/modules.ts) so publishing a
// module never breaks them: the published-link assertions track the
// manipulation group's published set, and the draft probe is the first
// remaining draft (preferring manipulation, then any domain).
const PROBE_DOMAIN = 'manipulation';
const publishedProbeModules = modules.filter(
  (m) => m.domain === PROBE_DOMAIN && m.status === 'published',
);
const draftProbe = firstDraftModule(PROBE_DOMAIN) ?? firstDraftModule();

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
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
    const nav = screen.getByRole('navigation', { name: `${PUBLIC_IDENTITY} taxonomy` });
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
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
    for (const name of GROUP_NAMES) {
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    }
  });

  it('toggles one group without affecting the others', async () => {
    const user = userEvent.setup();
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
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

  it('links every published module in the manipulation group to its route', async () => {
    const user = userEvent.setup();
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
    await user.click(
      screen.getByRole('button', { name: DOMAIN_META[PROBE_DOMAIN].name }),
    );
    expect(publishedProbeModules.length).toBeGreaterThan(0);
    for (const m of publishedProbeModules) {
      expect(screen.getByRole('link', { name: m.title })).toHaveAttribute(
        'href',
        `/${m.domain}/${m.slug}`,
      );
    }
  });

  // Skips itself once every module in the registry has published.
  it.runIf(draftProbe !== undefined)(
    'excludes draft modules from the sidebar entirely',
    async () => {
      if (draftProbe === undefined) return; // narrowing; runIf guards this
      const user = userEvent.setup();
      render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
      await user.click(
        screen.getByRole('button', { name: DOMAIN_META[draftProbe.domain].name }),
      );
      // Drafts never appear: no link (a link would 404) and no placeholder
      // row either (VAL-BUILD-001, VAL-DESIGN-001).
      expect(
        screen.queryByRole('link', { name: draftProbe.title }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(draftProbe.title)).not.toBeInTheDocument();
      expect(screen.queryByText(/planned/i)).not.toBeInTheDocument();
    },
  );

  it('offers a domain overview link inside each expanded group', async () => {
    const user = userEvent.setup();
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
    await user.click(
      screen.getByRole('button', { name: 'Frontier & Open Problems' }),
    );
    expect(
      screen.getByRole('link', { name: 'Domain overview' }),
    ).toHaveAttribute('href', '/frontier');
  });

  it('expands the active group and marks the active module on deep links', () => {
    mockPathname = '/manipulation/action-chunking/';
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
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
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
    expect(screen.getByRole('link', { name: 'Playground' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks the domain overview active on a domain landing', () => {
    mockPathname = '/classical/';
    render(<NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} />);
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
      <NavTree idPrefix="test" ariaLabel={`${PUBLIC_IDENTITY} taxonomy`} onNavigate={onNavigate} />,
    );
    await user.click(screen.getByRole('link', { name: 'Market Map' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
