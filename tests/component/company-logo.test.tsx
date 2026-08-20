import { render, screen } from '@testing-library/react';
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
    const mark = document.querySelector('[data-company-logo="nvidia-robotics"]');
    expect(mark).toHaveAttribute('data-logo-state', 'image');
    const img = mark?.querySelector('img');
    expect(img).toHaveAttribute('src', '/images/logos/nvidia.svg');
    expect(img).toHaveAttribute('alt', '');
  });
});
