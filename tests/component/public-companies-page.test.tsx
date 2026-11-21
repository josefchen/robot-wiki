import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicCompaniesPage, { metadata } from '@/app/market-map/public/page';
import sitemap from '@/app/sitemap';
import { ANNUAL_REVENUE } from '@/data/public-company-annual-revenue';
import { DEBUTS, IPO_WATCH, LEFT_OUT_COMPANIES, PUBLIC_COMPANIES } from '@/data/public-companies';
import {
  PUBLIC_PAGE_PATH,
  PUBLIC_PAGE_SECTIONS,
  PUBLIC_PAGE_TITLE,
  closesCaption,
  debutRows,
  ipoRows,
  listedRows,
  publicPageDescription,
} from '@/lib/public-companies-page';
import { routeSeoProfile } from '@/lib/seo-profiles';
import { SITE_URL } from '@/lib/site';
import { MARKET_SECTION } from '@/lib/site-sections';

function renderPage() {
  return render(<PublicCompaniesPage />).container;
}

const rows = (container: HTMLElement, attribute: string) =>
  [...container.querySelectorAll<HTMLElement>(`[${attribute}]`)].map((row) => row.getAttribute(attribute));

describe('/market-map/public/', () => {
  it('pairs each IPO alias with its issuer mark and keeps the company name accessible', () => {
    const page = renderPage();
    const aliases = [
      ['iplusmobot', 'Zhejiang IPLUSMOBOT', 'iplusmobot-logo'],
      ['orbbec-h-shares', 'Orbbec (H shares)', 'orbbec-logo'],
      ['topstar-technology-h-shares', 'Topstar Technology (H shares)', 'topstar-logo'],
    ];
    for (const [key, name, logo] of aliases) {
      const cell = page.querySelector(`[data-ipo-row="${key}"] td`)!;
      expect(cell.textContent).toContain(name);
      expect(cell.querySelector(`[data-market-table-mark="${logo}"]`)).toHaveAttribute('aria-hidden', 'true');
    }
    const wideWordmark = page.querySelector('[data-ipo-row="galbot"] td')!;
    expect(wideWordmark).toHaveTextContent('Galbot');
    expect(wideWordmark.querySelector('[data-market-table-mark]')).toBeNull();
    expect(page.querySelector('[data-status="not an IPO"] [data-market-table-mark]')).toBeNull();
  });

  it('is indexable, listed in the sitemap, and titled from its search profile', () => {
    expect(metadata.robots).toBeUndefined();
    expect(sitemap().map((entry) => entry.url)).toContain(`${SITE_URL}${PUBLIC_PAGE_PATH}`);
    const profile = routeSeoProfile(PUBLIC_PAGE_PATH);
    expect(metadata.title).toBe('Public Robotics Companies, Debuts and IPO Watch');
    expect(metadata.title).toBe(profile.title);
    // The profile counts the same rows as the page's own description.
    expect(metadata.description).toBe(profile.description);
    expect(profile.description).toBe(publicPageDescription());
    expect(profile.description).toBe(
      `Public robotics companies: ${PUBLIC_COMPANIES.length} listed companies by market value, ` +
        `the ${DEBUTS.length} debuts of 2026 against their offer price, and who is preparing to list.`,
    );
    expect(`${profile.title} ${profile.description}`).not.toMatch(/\bmap\b/i);
    expect((metadata.openGraph as { title: string }).title).toBe(PUBLIC_PAGE_TITLE);
  });

  it('marks itself current in the Market section and links every other page of it', () => {
    const container = renderPage();
    const header = container.querySelector<HTMLElement>('header[data-page-header]')!;
    const section = within(header).getByRole('navigation', { name: MARKET_SECTION.label });
    expect(within(section).getAllByRole('listitem')).toHaveLength(MARKET_SECTION.pages.length);
    const marked = section.querySelector('[aria-current="page"]')!;
    expect(marked.tagName).toBe('SPAN');
    expect(marked.textContent).toBe('Public companies');
    // next/link drops the trailing slash outside the app's config.
    const route = (a: Element) => (a.getAttribute('href') ?? '').replace(/\/?$/, '/');
    expect(within(section).getAllByRole('link').map(route)).toEqual(['/market-map/', '/market-map/rounds/']);
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
    const ranked = listedRows();
    const groups = ['pure play', 'major part', 'minor part'];
    expect(rows(container, 'data-listed-row')).toEqual(groups.flatMap((group) =>
      ranked.filter((row) => row.company.exposure === group).map((row) => row.company.id),
    ));
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

  it('orders the entire list by market value and name, combines filters, and returns focus on clearing', () => {
    const container = renderPage();
    const screen = within(container);
    const change = (label: string, value: string) =>
      fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
    const ids = () => rows(container, 'data-listed-row');
    const market = listedRows();
    change('Sort by', 'largest');
    expect(ids()).toEqual(market.map((row) => row.company.id));
    change('Sort by', 'smallest');
    expect(ids()[0]).toBe(market.at(-1)!.company.id);
    change('Sort by', 'name');
    expect(ids()[0]).toBe([...market].sort((a, b) => a.company.name.localeCompare(b.company.name))[0].company.id);
    const target = market.find((row) => row.company.id === 'unitree-robotics')!;
    change('Exposure', target.company.exposure);
    change('Country', target.country);
    change('Segment', target.segment);
    expect(ids()).toContain(target.company.id);
    expect(ids()).toHaveLength(market.filter((row) => row.company.exposure === target.company.exposure &&
      row.country === target.country && row.segment === target.segment).length);
    change('Country', 'New Zealand');
    expect(screen.getByText('No companies match these filters.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 135');
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(ids()).toHaveLength(market.length);
    expect(screen.getByRole('combobox', { name: 'Exposure' })).toHaveFocus();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('name');
  });

  it('gives the fiscal year, reporting scope and filing for each annual revenue, and distinguishes missing amounts', () => {
    const container = renderPage();
    expect(Object.keys(ANNUAL_REVENUE).every((id) => PUBLIC_COMPANIES.some((company) => company.id === id))).toBe(true);
    for (const company of PUBLIC_COMPANIES) {
      const row = container.querySelector<HTMLElement>(`[data-listed-row="${company.id}"]`)!;
      const cell = row.querySelector('[data-fiscal-revenue]')!;
      const revenue = ANNUAL_REVENUE[company.id];
      if (revenue) {
        expect(revenue.amount).toBeGreaterThanOrEqual(0);
        expect(revenue.yearEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(cell).toHaveTextContent('Year to ');
        expect([...row.querySelectorAll('a')].some((link) => link.getAttribute('href') === revenue.sourceUrl)).toBe(true);
      } else {
        expect(cell).toHaveTextContent('No figure');
      }
    }
    expect(container.querySelector('[data-listed-row="kratos-defense"] [data-fiscal-revenue]')).toHaveTextContent('$1.35B');
    expect(container.querySelector('[data-listed-row="kawasaki-heavy-industries"] [data-fiscal-revenue]')).toHaveTextContent('31 Mar 2026');
    expect(container.querySelector('[data-listed-row="ocado-group"] [data-fiscal-revenue]')).toHaveTextContent('Continuing operations');
    const fiscalCell = (id: string) => container.querySelector(`[data-listed-row="${id}"] [data-fiscal-revenue]`);
    expect(fiscalCell('microbot-medical')).toHaveTextContent('$0');
    expect(fiscalCell('omron')).toHaveTextContent('Continuing operations');
    expect(fiscalCell('agility-robotics')).toHaveTextContent('Operating predecessor');
    expect(fiscalCell('xtend-ai-robotics')).toHaveTextContent('Operating predecessor');
  });

  it('links the listed Unitree row to its company profile', () => {
    const row = renderPage().querySelector<HTMLElement>('[data-listed-row="unitree-robotics"]')!;
    expect(within(row).getByRole('link', { name: 'Unitree Robotics' })).toHaveAttribute('href', '/companies/unitree/');
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
