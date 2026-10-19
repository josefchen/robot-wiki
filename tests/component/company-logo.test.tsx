import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanyLogo } from '@/components/market-map/company-logo';
import { COMPANIES } from '@/data/companies';
import type { Company } from '@/data/schemas/company.ts';
import { getCompanyLogo } from '@/data/logos';
import { LOGO_INK_CLASS } from '@/components/ui/logo-mark';
import { LUMINANCE_MASKS, WITHHELD_MARKS, markInk } from '@/lib/market-map-marks';

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
    absent: {
      website: { state: 'not-disclosed' },
      aka: { state: 'not-applicable', basis: 'Fixture with one name.' },
      deployments: { state: 'not-disclosed' },
      openSource: { state: 'not-applicable', basis: 'Fixture with no release.' },
      totalRaisedUsd: { state: 'not-disclosed' },
      'round.type': { state: 'not-disclosed' },
      'round.amountUsd': { state: 'not-disclosed' },
      'round.date': { state: 'not-disclosed' },
      'round.valuationUsd': { state: 'not-disclosed' },
      'round.leadInvestors': { state: 'not-disclosed' },
    },
    ...patch,
  };
}

function markFor(id: string) {
  return document.querySelector(`[data-company-logo="${id}"]`);
}

function inkOf(mark: Element | null) {
  return mark?.querySelector('[data-logo-ink]') as HTMLElement | null;
}

/** The load probe the mark uses: a mask paints nothing when its file fails. */
const probes: Array<{ src: string; onerror: (() => void) | null }> = [];
class ProbeImage {
  onerror: (() => void) | null = null;
  private value = '';
  get src() {
    return this.value;
  }
  set src(next: string) {
    this.value = next;
    probes.push(this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  probes.length = 0;
});

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
    expect(Object.keys(WITHHELD_MARKS)).toContain('assured-robot-intelligence-logo');
    for (const logoId of Object.keys(WITHHELD_MARKS)) {
      const company = COMPANIES.find((entry) => entry.logo === logoId)!;
      const { unmount } = render(<CompanyLogo company={company} />);
      const mark = markFor(company.id);
      expect(mark, company.id).toHaveAttribute('data-logo-state', 'text');
      expect(mark, company.id).toHaveAttribute('data-logo-reason', 'withheld');
      expect(document.querySelector('img'), company.id).toBeNull();
      expect(document.querySelector('[data-logo-mark], [data-logo-ink]'), company.id).toBeNull();
      expect(document.body.innerHTML, company.id).not.toContain(getCompanyLogo(logoId)!.file);
      unmount();
    }
  });

  it('sizes the mark to the artwork, so a padded file is not drawn small', () => {
    const boston = COMPANIES.find((company) => company.id === 'boston-dynamics')!;
    render(<CompanyLogo company={boston} />);
    const mark = markFor('boston-dynamics') as HTMLElement;
    expect(mark).toHaveAttribute('data-logo-mark', '');
    const ink = inkOf(mark)!;
    // The file is taller than the mark and shifted up: its empty top and
    // bottom margins fall outside, the wordmark fills the box.
    expect(ink.style.height).toMatch(/%$/);
    expect(parseFloat(ink.style.height)).toBeGreaterThan(200);
    expect(parseFloat(ink.style.top)).toBeLessThan(0);
    // The box keeps the artwork's proportions and never outgrows its line.
    expect(mark.style.width).toMatch(/^min\(100%, [\d.]+px\)$/);
    expect(mark.style.aspectRatio).toMatch(/^[\d.]+ \/ [\d.]+$/);
  });

  it('draws every mark plate-less, in the one secondary ink, through its own alpha', () => {
    let drawn = 0;
    for (const company of COMPANIES) {
      if (!company.logo || company.logo in WITHHELD_MARKS) continue;
      const { unmount, container } = render(<CompanyLogo company={company} />);
      const mark = markFor(company.id) as HTMLElement;
      const ink = inkOf(mark)!;
      const file = getCompanyLogo(company.logo)!.file;
      // No plate, no padding, no border, no filter: the outer box paints nothing.
      expect(mark.className, company.id).not.toMatch(/(^|\s)(bg-|p-|px-|py-|border|ring|shadow|rounded|\[filter)/);
      expect(container.innerHTML, company.id).not.toMatch(/filter|grayscale|logo-plate/);
      // The only paint is the ink token, shown through the file's alpha.
      expect(ink.className.split(/\s+/), company.id).toContain(LOGO_INK_CLASS);
      expect(LOGO_INK_CLASS).toBe('bg-text-dim');
      const style = ink.getAttribute('style') ?? '';
      const mode = markInk(company.logo);
      expect(mark, company.id).toHaveAttribute('data-logo-ink-mode', mode);
      if (mode === 'dark') {
        // The file's alpha less its luminance: white cut out of the badge.
        expect(style, company.id).toContain(`mask-image: url("${file}"), url("${file}")`);
        expect(style, company.id).toContain('mask-mode: alpha, luminance');
        expect(style, company.id).toContain('mask-composite: subtract');
      } else {
        expect(style, company.id).toContain(`mask-image: url("${file}");`);
        expect(style, company.id).toContain(`mask-mode: ${mode === 'light' ? 'luminance' : 'alpha'};`);
        expect(style, company.id).not.toContain('mask-composite');
      }
      expect(ink).toHaveAttribute('aria-hidden', 'true');
      // The file itself is never painted.
      expect(container.querySelector('img'), company.id).toBeNull();
      drawn += 1;
      unmount();
    }
    expect(drawn).toBe(COMPANIES.length - Object.keys(WITHHELD_MARKS).length);
    // Only the reviewed luminance-derived masks leave the alpha.
    expect(
      COMPANIES.filter((company) => markInk(company.logo) !== 'alpha').map((company) => company.logo).sort(),
    ).toEqual(Object.keys(LUMINANCE_MASKS).sort());
  });

  it('renders the registered file when the company has a licensed logo', () => {
    const nvidia = COMPANIES.find((company) => company.id === 'nvidia-robotics');
    expect(nvidia?.logo).toBe('nvidia-logo');
    render(<CompanyLogo company={nvidia!} />);
    const mark = markFor('nvidia-robotics');
    expect(mark).toHaveAttribute('data-logo-state', 'image');
    expect(mark).toHaveAttribute('data-logo-src', '/images/logos/nvidia.svg');
    expect(mark).toHaveAttribute('role', 'img');
    expect(mark).toHaveAttribute('aria-label', `${nvidia!.name} logo`);
  });

  it('names every registry company in its logo label', () => {
    let drawn = 0;
    for (const company of COMPANIES) {
      const { unmount } = render(<CompanyLogo company={company} />);
      if (company.logo && company.logo in WITHHELD_MARKS) {
        expect(markFor(company.id), company.id).toHaveAttribute('data-logo-state', 'text');
      } else {
        expect(screen.getByRole('img', { name: `${company.name} logo` }), company.id).toBe(
          markFor(company.id),
        );
        drawn += 1;
      }
      unmount();
    }
    expect(drawn).toBe(COMPANIES.length - Object.keys(WITHHELD_MARKS).length);
  });

  it('retries a later company after a failed load on a reused instance', () => {
    vi.stubGlobal('Image', ProbeImage);
    const nvidia = COMPANIES.find((company) => company.id === 'nvidia-robotics');
    const figure = COMPANIES.find((company) => company.id === 'figure-ai');
    expect(nvidia?.logo).toBe('nvidia-logo');
    expect(figure?.logo).toBe('figure-ai-logo');

    const { rerender } = render(<CompanyLogo company={nvidia!} />);
    const first = markFor('nvidia-robotics');
    expect(first).toHaveAttribute('data-logo-state', 'image');
    const probe = probes.find((entry) => entry.src === '/images/logos/nvidia.svg');
    expect(probe).toBeTruthy();
    act(() => probe!.onerror!());
    expect(markFor('nvidia-robotics')).toHaveAttribute(
      'data-logo-state',
      'text',
    );
    expect(markFor('nvidia-robotics')).toHaveAttribute('data-logo-reason', 'failed');
    expect(inkOf(markFor('nvidia-robotics'))).toBeNull();

    rerender(<CompanyLogo company={figure!} />);
    const second = markFor('figure-ai');
    expect(second).toHaveAttribute('data-logo-state', 'image');
    expect(second).toHaveAttribute('data-logo-src', '/images/logos/figure-ai.svg');
    expect(probes.some((entry) => entry.src === '/images/logos/figure-ai.svg')).toBe(true);
  });
});
