import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import RecentRoundsPage, { metadata } from '@/app/market-map/rounds/page';
import { ROUNDS_SHOWN, UK_EUROPE_SHOWN } from '@/components/rounds/rounds-tables';
import sitemap from '@/app/sitemap';
import { CORPORATE_EVENTS, EUROPE_INVESTORS, LISTINGS, ROUNDS_AS_OF } from '@/data/rounds';
import { CHART_DESCRIPTIONS } from '@/lib/chart-descriptions';
import { formatLongDate } from '@/lib/dates';
import { monthUnconfirmedRounds, roundsInWindow, totalRaisedUsd, ukAndEuropeRounds } from '@/lib/rounds';
import { SITE_URL } from '@/lib/site';
import { MARKET_SECTION } from '@/lib/site-sections';
import {
  ROUNDS_PAGE_PATH,
  ROUNDS_PAGE_SECTIONS,
  ROUNDS_PAGE_TITLE,
  byDateDesc,
  coverageText,
  formatTotalUsd,
  investorRows,
  monthCells,
  roundAnchor,
  roundsLeadSentence,
} from '@/lib/rounds-page';

afterEach(cleanup);

function renderPage() {
  return render(<RecentRoundsPage />).container;
}

/** A table's body rows, found by its caption id, folded rows included and the fold's control row left out. */
function bodyRows(container: HTMLElement, captionId: string): HTMLTableRowElement[] {
  const caption = container.querySelector(`caption#${captionId}`);
  if (!caption) throw new Error(`no table captioned ${captionId}`);
  return [
    ...caption
      .closest('table')!
      .querySelectorAll<HTMLTableRowElement>('tbody:not([data-rounds-fold-control]) tr'),
  ];
}

/** The keys of a table's rows a reader sees: none inside a hidden body. */
function visibleKeys(container: HTMLElement, captionId: string, keyAttribute: string): string[] {
  return bodyRows(container, captionId)
    .filter((row) => !row.closest('tbody')!.hidden)
    .map((row) => row.getAttribute(keyAttribute)!);
}

/** The folded tables: caption, rows in order, rows shown, and the attribute holding each row's key. */
const FOLDS: [string, { key: string }[], number, string][] = [
  ['rounds-table-caption', roundsInWindow(), ROUNDS_SHOWN, 'data-round-row'],
  ['uk-europe-caption', ukAndEuropeRounds(), UK_EUROPE_SHOWN, 'data-uk-europe-row'],
];

const TABLES: [string, number][] = [
  ['rounds-table-caption', roundsInWindow().length],
  ['month-unconfirmed-caption', monthUnconfirmedRounds().length],
  ['listings-caption', LISTINGS.length],
  ['corporate-caption', CORPORATE_EVENTS.length],
  ['investors-caption', investorRows().length],
  ['europe-investors-caption', EUROPE_INVESTORS.length],
  ['uk-europe-caption', ukAndEuropeRounds().length],
];

describe('/market-map/rounds/ page', () => {
  it('opens with the shared header: title, lead ending on the as-of date, and links to every section', () => {
    const container = renderPage();
    const header = container.querySelector<HTMLElement>('header[data-page-header]')!;
    const title = within(header).getByRole('heading', { level: 1, name: ROUNDS_PAGE_TITLE });
    expect(header.firstElementChild).toBe(title);
    expect(header.querySelector('[data-page-lead]')!.textContent).toBe(
      `${roundsLeadSentence()}, as of ${formatLongDate(ROUNDS_AS_OF)}.`,
    );
    expect(header.parentElement).toHaveAttribute('data-pagefind-body');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const nav = within(header).getByRole('navigation', { name: 'On this page' });
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(ROUNDS_PAGE_SECTIONS.map((s) => `#${s.id}`));
    for (const section of ROUNDS_PAGE_SECTIONS) {
      const target = container.querySelector(`#${section.id}`);
      expect(target, section.id).not.toBeNull();
      expect(
        within(target as HTMLElement).getByRole('heading', { level: 2, name: section.label }),
      ).toBeInTheDocument();
    }
  });

  it('marks itself current in the Market section and links every other page of it', () => {
    const container = renderPage();
    const header = container.querySelector<HTMLElement>('header[data-page-header]')!;
    const section = within(header).getByRole('navigation', { name: MARKET_SECTION.label });
    expect(within(section).getAllByRole('listitem')).toHaveLength(MARKET_SECTION.pages.length);
    const marked = section.querySelector('[aria-current="page"]')!;
    expect(marked.tagName).toBe('SPAN');
    expect(marked.textContent).toBe('Recent rounds');
    // next/link drops the trailing slash outside the app's config.
    const route = (a: Element) => (a.getAttribute('href') ?? '').replace(/\/?$/, '/');
    expect(within(section).getAllByRole('link').map(route)).toEqual(
      MARKET_SECTION.pages.filter((p) => p.route !== ROUNDS_PAGE_PATH).map((p) => p.route),
    );
    expect(route(within(section).getByRole('link', { name: 'Market map' }))).toBe('/market-map/');
  });

  it('resolves every in-page anchor to an element', () => {
    const container = renderPage();
    const anchors = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    expect(anchors.length).toBeGreaterThan(ROUNDS_PAGE_SECTIONS.length);
    for (const a of anchors) {
      const id = a.getAttribute('href')!.slice(1);
      expect(container.querySelector(`[id="${id}"]`), id).not.toBeNull();
    }
  });

  it('gives each table exactly as many rows as its function or export returns', () => {
    const container = renderPage();
    for (const [captionId, expected] of TABLES) {
      expect(bodyRows(container, captionId), captionId).toHaveLength(expected);
    }
  });

  it('gives every scroll region its own name (axe landmark-unique)', () => {
    renderPage();
    const names = screen.getAllByRole('region').map((region) => {
      const ids = region.getAttribute('aria-labelledby');
      return ids ? ids.split(' ').map((id) => document.getElementById(id)?.textContent).join(' ') : region.getAttribute('aria-label');
    });
    expect(names.length).toBeGreaterThanOrEqual(TABLES.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('links a source on every row whose record has one', () => {
    const container = renderPage();
    for (const [captionId] of TABLES) {
      if (captionId === 'investors-caption') continue;
      for (const row of bodyRows(container, captionId)) {
        const link = row.querySelector('a[data-source-link]');
        expect(link, `${captionId}: ${row.textContent?.slice(0, 40)}`).not.toBeNull();
        expect(link!.getAttribute('href')).toMatch(/^https:\/\//);
        expect(link).toHaveAttribute('rel', 'noopener');
      }
    }
  });

  it('links each investor row to the rounds it counts, and every link to a round row', () => {
    const container = renderPage();
    for (const [i, row] of bodyRows(container, 'investors-caption').entries()) {
      const expected = investorRows()[i];
      const links = [...row.querySelectorAll('a[data-investor-link]')];
      expect(links.map((a) => a.getAttribute('href'))).toEqual(
        expected.companies.map((c) => `#${roundAnchor(c.key)}`),
      );
      for (const a of links) {
        const target = container.querySelector(a.getAttribute('href')!);
        expect(target?.tagName).toBe('TR');
        expect(target!.closest('table')!.querySelector('caption')!.id).toBe('rounds-table-caption');
      }
    }
  });

  describe.each(FOLDS)('the fold in %s', (captionId, rows, shown, keyAttribute) => {
    const keys = rows.map((r) => r.key);
    const folded = (container: HTMLElement) =>
      container.querySelector(`caption#${captionId}`)!.closest('table')!.querySelector<HTMLElement>('tbody[data-rounds-folded]')!;

    it('shows the newest rows and folds the rest, every row in the HTML in one order', () => {
      const container = renderPage();
      expect(keys.length).toBeGreaterThan(shown);
      expect(bodyRows(container, captionId).map((r) => r.getAttribute(keyAttribute))).toEqual(keys);
      expect(visibleKeys(container, captionId, keyAttribute)).toEqual(keys.slice(0, shown));
      const body = folded(container);
      expect(body.hidden).toBe(true);
      expect(body.querySelectorAll('tr')).toHaveLength(keys.length - shown);
      expect(body.querySelectorAll('a[data-source-link]')).toHaveLength(keys.length - shown);
      const button = screen.getByRole('button', { name: `Show all ${keys.length} rounds` });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls', body.id);
    });

    it('opens to every row and closes again', () => {
      const container = renderPage();
      fireEvent.click(screen.getByRole('button', { name: `Show all ${keys.length} rounds` }));
      expect(visibleKeys(container, captionId, keyAttribute)).toEqual(keys);
      const close = screen.getByRole('button', { name: `Show the ${shown} newest` });
      expect(close).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(close);
      expect(visibleKeys(container, captionId, keyAttribute)).toEqual(keys.slice(0, shown));
    });

    it('puts the control before the folded rows, so Tab after opening reaches them', () => {
      const container = renderPage();
      const button = screen.getByRole('button', { name: `Show all ${keys.length} rounds` });
      expect(button.compareDocumentPosition(folded(container)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(button.tagName).toBe('BUTTON');
      expect(button).not.toHaveAttribute('tabindex');
    });

    it('keeps the pressed control where it was on screen, opening and closing', () => {
      renderPage();
      const button = screen.getByRole('button', { name: `Show all ${keys.length} rounds` });
      // jsdom has no layout; the stub moves the control 64 px down while the fold is open.
      vi.spyOn(button, 'getBoundingClientRect').mockImplementation(
        () => ({ top: button.getAttribute('aria-expanded') === 'true' ? 464 : 400 }) as DOMRect,
      );
      const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
      onTestFinished(() => scrollBy.mockRestore());
      fireEvent.click(button);
      expect(scrollBy).toHaveBeenLastCalledWith(0, 64);
      fireEvent.click(button);
      expect(scrollBy).toHaveBeenLastCalledWith(0, -64);
      expect(scrollBy).toHaveBeenCalledTimes(2);
    });
  });

  it('opens the fold when an investor link points at a folded row', () => {
    // jsdom has no scrollIntoView; the stub records which row the fold scrolled to.
    const scroll = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scroll, configurable: true });
    onTestFinished(() => {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });
    const container = renderPage();
    const folded = container.querySelector<HTMLElement>('tbody#rounds-folded')!;
    const link = [...container.querySelectorAll<HTMLAnchorElement>('a[data-investor-link]')].find((a) =>
      folded.contains(container.querySelector(a.getAttribute('href')!)),
    );
    expect(link, 'an investor link into the fold').toBeDefined();
    fireEvent.click(link!);
    expect(folded.hidden).toBe(false);
    expect(scroll).toHaveBeenCalled();
    expect(scroll.mock.contexts[0]).toBe(container.querySelector(link!.getAttribute('href')!));
  });

  it('prints both totals as the functions compute them, strict first', () => {
    const container = renderPage();
    const strict = container.querySelector('[data-total="strict"]')!.textContent;
    const full = container.querySelector('[data-total="full"]')!.textContent;
    expect(strict).toBe(formatTotalUsd(totalRaisedUsd({ strict: true })));
    expect(full).toBe(formatTotalUsd(totalRaisedUsd()));
    expect(screen.getByTestId('rounds-headline').textContent).toMatch(/marked borderline robotics/);
  });

  it('prints one month cell per month the window touches', () => {
    const container = renderPage();
    expect([...container.querySelectorAll('[data-month]')].map((m) => m.getAttribute('data-month'))).toEqual(
      monthCells().map((m) => m.month),
    );
  });

  it('marks reported rows and statuses other than closed in the data\'s own word', () => {
    const container = renderPage();
    const rows = bodyRows(container, 'rounds-table-caption');
    for (const [i, round] of roundsInWindow().entries()) {
      const marks = [...rows[i].querySelectorAll('[data-mark]')].map((m) => m.getAttribute('data-mark'));
      expect(marks.includes('reported'), round.key).toBe(round.sourceType === 'reported');
      expect(marks.includes(round.status), round.key).toBe(round.status !== 'closed');
      expect(marks.includes('lead unconfirmed'), round.key).toBe(Boolean(round.leadUnconfirmed));
    }
  });

  it('prints a flagged amount with its word in the rounds and corporate tables', () => {
    const container = renderPage();
    const amountCell = (row: HTMLTableRowElement) => row.querySelector('[data-amount]')!.textContent!;
    const corporate = byDateDesc(CORPORATE_EVENTS);
    expect(corporate.some((e) => e.amountIsApproximate)).toBe(true);
    for (const [i, row] of bodyRows(container, 'corporate-caption').entries()) {
      expect(amountCell(row).startsWith('about '), corporate[i].key).toBe(Boolean(corporate[i].amountIsApproximate));
    }
    const rounds = roundsInWindow();
    expect(rounds.some((r) => r.amountIsFloor)).toBe(true);
    for (const [i, row] of bodyRows(container, 'rounds-table-caption').entries()) {
      expect(amountCell(row).startsWith('over '), rounds[i].key).toBe(Boolean(rounds[i].amountIsFloor));
      expect(amountCell(row).startsWith('about '), rounds[i].key).toBe(Boolean(rounds[i].amountIsApproximate));
    }
  });

  it('prints an unconfirmed lead with no name as "lead unconfirmed" alone', () => {
    const container = renderPage();
    const rows = bodyRows(container, 'rounds-table-caption');
    const leadsColumn = 4;
    const unnamed = roundsInWindow().filter((r) => r.leadInvestors.length === 0);
    expect(unnamed.some((r) => r.leadUnconfirmed)).toBe(true);
    for (const [i, round] of roundsInWindow().entries()) {
      if (round.leadInvestors.length > 0) continue;
      const cell = rows[i].cells[leadsColumn].textContent;
      expect(cell, round.key).toBe(round.leadUnconfirmed ? 'lead unconfirmed' : 'none named');
    }
  });

  it('prints the coverage paragraph as the function words it, with no source link', () => {
    const container = renderPage();
    const paragraph = container.querySelector('[data-coverage]')!;
    expect(paragraph.textContent).toContain(coverageText());
    expect(paragraph.textContent!.endsWith(coverageText())).toBe(true);
    expect(paragraph.querySelector('a')).toBeNull();
  });

  it('mounts the figure, whose registered description now renders here', () => {
    renderPage();
    const entry = CHART_DESCRIPTIONS.find((e) => e.component === 'RoundsFigure')!;
    expect(entry.unmounted).toBeUndefined();
    expect(screen.getByText(entry.text)).toBeInTheDocument();
  });

  it('is indexable, listed in the sitemap, and shares its h1 as og:title', () => {
    expect(metadata.robots).toBeUndefined();
    expect(sitemap().map((entry) => entry.url)).toContain(`${SITE_URL}${ROUNDS_PAGE_PATH}`);
    expect((metadata.openGraph as { title: string }).title).toBe(ROUNDS_PAGE_TITLE);
  });
});
