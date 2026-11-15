import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicCompaniesPage, { metadata } from '@/app/market-map/public/page';
import { DEBUTS, IPO_WATCH, LEFT_OUT_COMPANIES, PUBLIC_COMPANIES } from '@/data/public-companies';
import { PUBLIC_PAGE_SECTIONS, closesCaption, debutRows, ipoRows, listedRows } from '@/lib/public-companies-page';

function renderPage() {
  return render(<PublicCompaniesPage />).container;
}

const rows = (container: HTMLElement, attribute: string) =>
  [...container.querySelectorAll<HTMLElement>(`[${attribute}]`)].map((row) => row.getAttribute(attribute));

describe('/market-map/public/', () => {
  it('stays out of search until the page is complete', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it('opens with the title, the lead on the date and the three sections in order', () => {
    const container = renderPage();
    expect(container.querySelector('h1')?.textContent).toBe('Public robotics companies');
    expect(container.querySelector('[data-page-lead]')?.textContent).toBe(
      '135 listed robotics companies by market value, the 25 debuts of 2026 and 20 companies on the IPO watch, ' +
        'as of 13 November 2026.',
    );
    const sections = [...container.querySelectorAll('section')];
    expect(sections.map((s) => s.id)).toEqual(PUBLIC_PAGE_SECTIONS.map((s) => s.id));
    for (const [index, section] of sections.entries()) {
      expect(section.querySelector('h2')?.textContent).toBe(PUBLIC_PAGE_SECTIONS[index].label);
    }
    const anchors = [...container.querySelectorAll<HTMLAnchorElement>('nav[aria-label="On this page"] a')];
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(PUBLIC_PAGE_SECTIONS.map((s) => `#${s.id}`));
  });

  it('renders every row in the computed order, each with a source', () => {
    const container = renderPage();
    expect(rows(container, 'data-listed-row')).toEqual(listedRows().map((r) => r.company.id));
    expect(rows(container, 'data-left-out-row')).toHaveLength(LEFT_OUT_COMPANIES.length);
    expect(rows(container, 'data-ipo-row')).toEqual(ipoRows().map((r) => r.row.id));
    expect(rows(container, 'data-debut-row')).toEqual(debutRows().map((r) => r.debut.id));
    const total = PUBLIC_COMPANIES.length + LEFT_OUT_COMPANIES.length + IPO_WATCH.length + DEBUTS.length;
    const sourced = container.querySelectorAll('tbody tr:has([data-source-link])');
    expect(sourced).toHaveLength(total);
  });

  it('marks the left-out sources as reported in the caption because every one is', () => {
    for (const row of LEFT_OUT_COMPANIES) expect(row.source.type, row.id).toBe('reported');
    expect(renderPage().querySelector('#left-out-caption')?.textContent).toContain('(reported)');
  });

  it('names what each reported exposure rests on, profile or press', () => {
    const hosts = new Set(
      PUBLIC_COMPANIES.filter((c) => c.exposureSource?.type === 'reported').map(
        (c) => new URL(c.exposureSource!.url).hostname,
      ),
    );
    expect(hosts.has('stockanalysis.com') && hosts.size > 1).toBe(true);
    expect(renderPage().querySelector('#listed-companies-caption')?.textContent).toContain(
      'company profile or a press report, not on a filing.',
    );
  });

  it('labels a merger’s source by the listing it backs, not an offer it lacks', () => {
    const container = renderPage();
    for (const debut of DEBUTS) {
      const cell = container.querySelector(`[data-debut-row="${debut.id}"] td:last-child`)?.textContent ?? '';
      expect(cell.startsWith(debut.offerPrice === null ? 'Listing ' : 'Offer '), debut.id).toBe(true);
    }
  });

  it('prints Duke’s change in the row that says the offer was a unit', () => {
    const container = renderPage();
    const duke = container.querySelector('[data-debut-row="duke-robotics"]');
    expect(duke?.querySelector('[data-change]')?.textContent).toBe('−75.4%');
    expect(duke?.textContent).toContain('Uplisted from OTCQB; the offer was a unit of one share and one warrant.');
    expect(container.querySelector('[data-ipo-row="duke-robotics"]')).toBeNull();
    expect(container.querySelector('#since-listing-caption')?.textContent).toContain(closesCaption());
  });

  it('hides no column at any width', () => {
    const container = renderPage();
    for (const cell of container.querySelectorAll('table :is(th, td)')) {
      expect(cell.className).not.toMatch(/(^|\s)(max-\w+:)?hidden(\s|$)/);
    }
  });

  it('flags the ABB Robotics sale and marks reported rows', () => {
    const container = renderPage();
    const sale = container.querySelector('[data-ipo-row="abb-robotics-sale"]');
    expect(sale?.getAttribute('data-status')).toBe('not an IPO');
    expect(sale?.textContent).toContain('not an IPO');
    const reportedIpo = IPO_WATCH.filter((r) => r.source.type === 'reported').length;
    expect(container.querySelectorAll('#ipo-watch [data-mark="reported"]')).toHaveLength(reportedIpo);
    const reportedDebuts = DEBUTS.filter((d) => d.source.type === 'reported').length;
    expect(container.querySelectorAll('#since-listing [data-mark="reported"]')).toHaveLength(reportedDebuts);
  });
});
