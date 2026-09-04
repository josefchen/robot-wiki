import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '@/app/page';
import { PUBLIC_IDENTITY } from '@/lib/identity';

const DOMAIN_ENTRIES = [
  ['Manipulation & Learned Policies', '/manipulation'],
  ['RL, Sim-to-Real & Locomotion', '/rl-sim2real'],
  ['World Models', '/world-models'],
  ['Data, Hardware & Evaluation', '/data-hardware'],
  ['Classical Foundations', '/classical'],
  ['Frontier & Open Problems', '/frontier'],
  ['Adjacent Domains', '/adjacent'],
] as const;

describe('Home page', () => {
  it('renders the hero with the wiki wordmark and substantive overview prose', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { level: 1, name: PUBLIC_IDENTITY }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/encyclopedia of modern robotics/),
    ).toBeInTheDocument();
  });

  it('lists all seven domains as one dense index, each with descriptive text', () => {
    render(<Home />);
    const index = screen.getByRole('region', { name: /domain index/i });
    const items = within(index).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    for (const [name, href] of DOMAIN_ENTRIES) {
      const link = within(index).getByRole('link', { name });
      // next/link normalizes trailing slashes differently between jsdom and
      // the served HTML; the domain segment is what matters.
      expect(link.getAttribute('href')).toMatch(
        new RegExp(`^${href.replace(/\//g, '\\/')}\\/?$`),
      );
    }
    // Every row carries real descriptive text beyond the domain name.
    for (const item of items) {
      expect((item.textContent ?? '').length).toBeGreaterThan(30);
    }
  });

  it('exposes entry points to the market map and the playground', () => {
    render(<Home />);
    expect(
      screen.getByRole('link', { name: /Market Map/ }),
    ).toHaveAttribute('href', '/market-map');
    expect(
      screen.getByRole('link', { name: /Kinematics Playground/ }),
    ).toHaveAttribute('href', '/playground');
  });

  it('renders the playground entry point with a visual, not text alone', () => {
    render(<Home />);
    const link = screen.getByRole('link', { name: /Kinematics Playground/ });
    const svg = link.querySelector('svg');
    expect(svg).not.toBeNull();
    // A real frame: at least three shape elements inside the svg.
    expect(svg!.querySelectorAll('circle, line, path, rect').length).toBeGreaterThanOrEqual(3);
  });

  it('explains how to read the wiki and links into real content', () => {
    render(<Home />);
    const howTo = screen.getByRole('region', {
      name: /how to read this wiki/i,
    });
    expect(within(howTo).getByText(/registry order/)).toBeInTheDocument();
    expect(within(howTo).getByText(/citation chip/)).toBeInTheDocument();
    expect(
      within(howTo).getByRole('link', {
        name: /Action Chunking \(ACT and ALOHA\)/,
      }),
    ).toHaveAttribute('href', '/manipulation/action-chunking');
  });

  it('never uses the old product name', () => {
    render(<Home />);
    expect(screen.queryByText(/atlas/i)).not.toBeInTheDocument();
  });

  it('embeds a live featured interactive with controls and a readout', () => {
    render(<Home />);
    const featured = screen.getByRole('region', {
      name: /featured interactive/i,
    });
    expect(
      within(featured).getByRole('slider', { name: /per-step success/i }),
    ).toBeInTheDocument();
    expect(
      within(featured).getByTestId('episode-success-readout'),
    ).toBeInTheDocument();
  });
});
