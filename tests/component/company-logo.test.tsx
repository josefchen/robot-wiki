import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompanyLogo } from '@/components/market-map/company-logo';
import { COMPANIES } from '@/data/companies';
import type { Company } from '@/data/schemas/company.ts';
import { WITHHELD_MARKS } from '@/lib/market-map-marks';

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
  it('sets the name as text when no logo is registered, never a made-up mark', () => {
    render(<CompanyLogo company={stub()} />);
    const mark = screen.getByText('Nuro');
    expect(mark).toHaveAttribute('data-logo-state', 'text');
    expect(mark).toHaveAttribute('data-logo-reason', 'missing');
    expect(mark).toHaveAttribute('data-company-logo', 'nuro');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });

  it('drops a parenthetical product line from the text', () => {
    render(
      <CompanyLogo
        company={stub({ id: 'tesla-optimus', name: 'Tesla (Optimus)' })}
      />,
    );
    expect(screen.getByText('Tesla')).toHaveAttribute('data-logo-state', 'text');
  });

  it('shows nothing where asked to, for places that print the name beside it', () => {
    render(<CompanyLogo company={stub()} fallback="none" />);
    const mark = markFor('nuro');
    expect(mark).toHaveAttribute('data-logo-state', 'none');
    expect(mark).toBeEmptyDOMElement();
  });

  it('never draws a withheld file: the name stands in', () => {
    expect(Object.keys(WITHHELD_MARKS)).toContain('nimble-robotics-logo');
    for (const logoId of Object.keys(WITHHELD_MARKS)) {
      const company = COMPANIES.find((entry) => entry.logo === logoId)!;
      const { unmount } = render(<CompanyLogo company={company} />);
      const mark = markFor(company.id);
      expect(mark, company.id).toHaveAttribute('data-logo-state', 'text');
      expect(mark, company.id).toHaveAttribute('data-logo-reason', 'withheld');
      expect(document.querySelector('img'), company.id).toBeNull();
      unmount();
    }
  });

  it('sizes the tile to the artwork, so a padded file is not drawn small', () => {
    const boston = COMPANIES.find((company) => company.id === 'boston-dynamics')!;
    render(<CompanyLogo company={boston} />);
    const tile = markFor('boston-dynamics') as HTMLElement;
    expect(tile).toHaveAttribute('data-logo-tile', '');
    const img = tile.querySelector('img') as HTMLImageElement;
    // The file is taller than the tile and shifted up: its empty top and
    // bottom margins fall outside, the wordmark fills the plate.
    expect(img.style.height).toMatch(/%$/);
    expect(parseFloat(img.style.height)).toBeGreaterThan(200);
    expect(parseFloat(img.style.top)).toBeLessThan(0);
    // The plate keeps the artwork's proportions and never outgrows its line.
    expect(tile.style.width).toMatch(/^min\(100%, [\d.]+px\)$/);
    expect(tile.style.aspectRatio).toMatch(/^[\d.]+ \/ [\d.]+$/);
    // The one registered treatment: the plate, its padding and the
    // monochrome threshold, unchanged.
    expect(tile.className).toContain('bg-logo-plate');
    expect(tile.className).toContain('p-[3px]');
    expect(img.className).toContain('[filter:grayscale(1)_brightness(0.625)_contrast(100)]');
  });

  it('renders the registered file when the company has a licensed logo', () => {
    const nvidia = COMPANIES.find((company) => company.id === 'nvidia-robotics');
    expect(nvidia?.logo).toBe('nvidia-logo');
    render(<CompanyLogo company={nvidia!} />);
    const mark = markFor('nvidia-robotics');
    expect(mark).toHaveAttribute('data-logo-state', 'image');
    const img = mark?.querySelector('img');
    expect(img).toHaveAttribute('src', '/images/logos/nvidia.svg');
    expect(img).toHaveAttribute('alt', `${nvidia!.name} logo`);
  });

  it('names every registry company in its logo alt text', () => {
    let drawn = 0;
    for (const company of COMPANIES) {
      const { unmount } = render(<CompanyLogo company={company} />);
      if (company.logo && company.logo in WITHHELD_MARKS) {
        expect(markFor(company.id)?.querySelector('img'), company.id).toBeNull();
      } else {
        const img = markFor(company.id)?.querySelector('img');
        expect(img, company.id).toHaveAttribute('alt', `${company.name} logo`);
        drawn += 1;
      }
      unmount();
    }
    expect(drawn).toBe(COMPANIES.length - Object.keys(WITHHELD_MARKS).length);
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
      'text',
    );
    expect(markFor('nvidia-robotics')).toHaveAttribute('data-logo-reason', 'failed');

    rerender(<CompanyLogo company={figure!} />);
    const second = markFor('figure-ai');
    expect(second).toHaveAttribute('data-logo-state', 'image');
    expect(second?.querySelector('img')).toHaveAttribute(
      'src',
      '/images/logos/figure-ai.svg',
    );
  });
});
