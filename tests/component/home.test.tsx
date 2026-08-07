import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '@/app/page';

describe('Home page', () => {
  it('renders the hero with the atlas name and a substantive overview', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'robot-atlas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/encyclopedic, interactive guide to modern robotics/),
    ).toBeInTheDocument();
  });

  it('shows entry cards for the six core domains', () => {
    render(<Home />);
    const domains = screen.getByRole('region', { name: /core domains/i });
    for (const name of [
      'Manipulation & Learned Policies',
      'RL, Sim-to-Real & Locomotion',
      'World Models',
      'Data, Hardware & Evaluation',
      'Classical Foundations',
      'Frontier & Open Problems',
    ]) {
      const link = within(domains).getByRole('link', { name: new RegExp(name) });
      expect(link).toHaveAttribute('href', expect.stringContaining('/'));
    }
  });

  it('shows a distinguished adjacent-domains entry with its four modules', () => {
    render(<Home />);
    const adjacent = screen.getByRole('region', {
      name: /adjacent domains/i,
    });
    const link = within(adjacent).getByRole('link', {
      name: /Adjacent Domains/,
    });
    expect(link).toHaveAttribute('href', '/adjacent');
    for (const title of [
      'Autonomous Vehicles',
      'Drones and Aerial Robotics',
      'Surgical Robotics',
      'Space Robotics',
    ]) {
      expect(within(adjacent).getByText(title)).toBeInTheDocument();
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

  it('explains how to read the atlas and links into real content', () => {
    render(<Home />);
    const howTo = screen.getByRole('region', {
      name: /how to read this atlas/i,
    });
    expect(within(howTo).getByText(/citation chip/)).toBeInTheDocument();
    expect(
      within(howTo).getByRole('link', {
        name: /Action Chunking \(ACT and ALOHA\)/,
      }),
    ).toHaveAttribute('href', '/manipulation/action-chunking');
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
