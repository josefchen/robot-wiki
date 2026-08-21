import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompanyLogo } from '@/components/market-map/company-logo';
import { COMPANIES } from '@/data/companies';
import type { Company } from '@/data/schemas/company.ts';

function stub(patch: Partial<Company> = {}): Company {
  return {
    id: 'nuro',
    name: 'Nuro',
    aka: [],
    website: null,
    logo: null,
    hq: { city: 'Mountain View', country: 'US' },
    founded: 2016,
    segment: 'vertical-applications',
    subSegment: 'autonomous-delivery',
    description: 'Autonomous delivery vehicles.',
    approach: [],
    totalRaisedUsd: null,
    latestRound: null,
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.nuro.ai',
        title: 'Nuro',
        asOf: '2026-08-20',
      },
    ],
    confidence: 'medium',
    ...patch,
  };
}

function markFor(id: string) {
  return document.querySelector(`[data-company-logo="${id}"]`);
}

describe('CompanyLogo', () => {
  it('renders initials when no licensed logo is registered', () => {
    render(<CompanyLogo company={stub()} />);
    const mark = screen.getByText('NU');
    expect(mark).toHaveAttribute('data-logo-state', 'initials');
    expect(mark).toHaveAttribute('data-company-logo', 'nuro');
  });

  it('renders initials for a parenthetical product line name', () => {
    render(
      <CompanyLogo
        company={stub({ id: 'tesla-optimus', name: 'Tesla (Optimus)' })}
      />,
    );
    expect(screen.getByText('TE')).toHaveAttribute('data-logo-state', 'initials');
  });

  it('renders the registered file when the company has a licensed logo', () => {
    const nvidia = COMPANIES.find((company) => company.id === 'nvidia-robotics');
    expect(nvidia?.logo).toBe('nvidia-logo');
    render(<CompanyLogo company={nvidia!} />);
    const mark = markFor('nvidia-robotics');
    expect(mark).toHaveAttribute('data-logo-state', 'image');
    const img = mark?.querySelector('img');
    expect(img).toHaveAttribute('src', '/images/logos/nvidia.svg');
    expect(img).toHaveAttribute('alt', '');
  });

  it('retries a later company after onError on a reused instance', () => {
    const nvidia = COMPANIES.find((company) => company.id === 'nvidia-robotics');
    const figure = COMPANIES.find((company) => company.id === 'figure-ai');
    expect(nvidia?.logo).toBe('nvidia-logo');
    expect(figure?.logo).toBe('figure-ai-logo');

    const { rerender } = render(<CompanyLogo company={nvidia!} />);
    const first = markFor('nvidia-robotics');
    expect(first).toHaveAttribute('data-logo-state', 'image');
    const img = first?.querySelector('img');
    expect(img).toBeTruthy();
    fireEvent.error(img!);
    expect(markFor('nvidia-robotics')).toHaveAttribute(
      'data-logo-state',
      'initials',
    );

    rerender(<CompanyLogo company={figure!} />);
    const second = markFor('figure-ai');
    expect(second).toHaveAttribute('data-logo-state', 'image');
    expect(second?.querySelector('img')).toHaveAttribute(
      'src',
      '/images/logos/figure-ai.svg',
    );
  });
});
