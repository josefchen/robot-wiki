import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '@/components/data-page/page-header';
import MarketMapPage from '@/app/market-map/page';
import { COMPANIES } from '@/data/companies';
import { formatLongDate } from '@/lib/dates';
import { MARKET_MAP_AS_OF } from '@/lib/market-map';
import { MARKET_SECTION, type SiteSection } from '@/lib/site-sections';

/**
 * The header every data page opens with (components/data-page/page-header.tsx):
 * title, the section's pages, one lead sentence ending on the date, the
 * page's own sections, in that order and with nothing above the title.
 */

const THREE_PAGES: SiteSection = {
  label: 'Market',
  pages: [
    { label: 'Market map', route: '/market-map/' },
    { label: 'Public companies', route: '/market-map/public/' },
    { label: 'Recent rounds', route: '/market-map/rounds/' },
  ],
};

const ONE_PAGE: SiteSection = {
  label: 'Market',
  pages: [{ label: 'Market map', route: '/market-map/' }],
};

const ANCHORS = [
  { label: 'Timeline', id: 'timeline' },
  { label: 'Rounds', id: 'rounds' },
  { label: 'Acquisitions and shutdowns', id: 'exits' },
  { label: 'Who is investing', id: 'investors' },
];

/** True when `first` comes before `second` in the document. */
function precedes(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/**
 * A link's address as the site serves it. The build adds the closing slash
 * (`trailingSlash` in next.config.ts); the link component under test, with
 * no config loaded, leaves it off.
 */
function route(link: Element): string {
  return (link.getAttribute('href') ?? '').replace(/\/?$/, '/');
}

function lead(container: HTMLElement): HTMLElement {
  const paragraph = container.querySelector<HTMLElement>('[data-page-lead]');
  if (!paragraph) throw new Error('no lead');
  return paragraph;
}

describe('PageHeader', () => {
  it('opens on the title, then the section, the lead and the page sections', () => {
    const { container } = render(
      <PageHeader
        title="Recent funding rounds"
        lead="Funding rounds over 120 days, each row linked to its source"
        asOf="2026-11-12"
        section={{ ...THREE_PAGES, current: '/market-map/rounds/' }}
        anchors={ANCHORS}
      />,
    );
    const header = container.querySelector('header')!;
    const title = screen.getByRole('heading', { level: 1, name: 'Recent funding rounds' });
    const section = screen.getByRole('navigation', { name: 'Market' });
    const sections = screen.getByRole('navigation', { name: 'On this page' });

    // Nothing above the title.
    expect(header.firstElementChild).toBe(title);
    expect(Array.from(header.children)).toEqual([title, section, lead(container), sections]);
    expect(precedes(title, section)).toBe(true);
    expect(precedes(section, lead(container))).toBe(true);
    expect(precedes(lead(container), sections)).toBe(true);

    // The registered page title role, as every other page writes it.
    expect(title).toHaveAttribute('data-tektur-role', 'page-h1');
    expect(title).toHaveClass('font-display-page', 'display-h1');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('ends the lead on the long date, through the one date formatter', () => {
    const { container } = render(
      <PageHeader title="Market Map" lead="123 companies in six segments" asOf="2026-11-12" />,
    );
    expect(lead(container).textContent).toBe(
      '123 companies in six segments, as of 12 November 2026.',
    );
    const time = lead(container).querySelector('time')!;
    expect(time).toHaveAttribute('datetime', '2026-11-12');
    expect(time.textContent).toBe(formatLongDate('2026-11-12'));
    // The date never breaks across two lines.
    expect(time).toHaveClass('whitespace-nowrap');
  });

  it('ends an undated lead with its full stop and no date', () => {
    const { container } = render(
      <PageHeader title="Recent changes" lead="What changed in the wiki, newest first" />,
    );
    expect(lead(container).textContent).toBe('What changed in the wiki, newest first.');
    expect(container.querySelector('time')).toBeNull();
  });

  it('keeps a lead written as nodes and still closes it once', () => {
    const { container } = render(
      <PageHeader
        title="Unitree Robotics"
        lead={
          <>
            What Unitree sells, from its <a href="#money">listing documents</a>
          </>
        }
        asOf="2026-11-12"
      />,
    );
    expect(lead(container).textContent).toBe(
      'What Unitree sells, from its listing documents, as of 12 November 2026.',
    );
    expect(within(lead(container)).getByRole('link', { name: 'listing documents' })).toHaveAttribute(
      'href',
      '#money',
    );
  });

  it('refuses a lead that brings its own closing punctuation or a malformed date', () => {
    expect(() => render(<PageHeader title="Market Map" lead="123 companies." />)).toThrow(
      /without its closing punctuation/,
    );
    expect(() =>
      render(
        <PageHeader
          title="Market Map"
          lead={
            <>
              123 <span>companies.</span>
            </>
          }
        />,
      ),
    ).toThrow(/without its closing punctuation/);
    expect(() =>
      render(<PageHeader title="Market Map" lead="123 companies" asOf="12 Nov 2026" />),
    ).toThrow(/ISO YYYY-MM-DD/);
  });

  it('marks the current page of a section and does not link it to itself', () => {
    render(
      <PageHeader
        title="Public robotics companies"
        lead="Listed robotics companies by market value"
        section={{ ...THREE_PAGES, current: '/market-map/public/' }}
      />,
    );
    const section = screen.getByRole('navigation', { name: 'Market' });
    const items = within(section).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Market map',
      'Public companies',
      'Recent rounds',
    ]);

    const marked = section.querySelectorAll('[aria-current]');
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute('aria-current', 'page');
    expect(marked[0].textContent).toBe('Public companies');
    expect(marked[0].tagName).toBe('SPAN');
    // The site navigation's mark: ink, one weight step, a 1px underline.
    expect(marked[0]).toHaveClass('text-text', 'font-medium', 'underline', 'decoration-1');

    const links = within(section).getAllByRole('link');
    expect(links.map((link) => [link.textContent, route(link)])).toEqual([
      ['Market map', '/market-map/'],
      ['Recent rounds', '/market-map/rounds/'],
    ]);
    expect(section.querySelector('a[href^="/market-map/public"]')).toBeNull();
    for (const link of links) {
      expect(link).toHaveAttribute('data-brand-control-id', 'control:link-focus');
      expect(link).not.toHaveClass('underline');
    }
  });

  it('links every entry and marks none on a page outside the list', () => {
    render(
      <PageHeader
        title="Unitree Robotics"
        lead="What Unitree sells, how many and at what price"
        section={THREE_PAGES}
      />,
    );
    const section = screen.getByRole('navigation', { name: 'Market' });
    expect(within(section).getAllByRole('link').map(route)).toEqual([
      '/market-map/',
      '/market-map/public/',
      '/market-map/rounds/',
    ]);
    expect(section.querySelector('[aria-current]')).toBeNull();
  });

  it('shows no section links while the section has one page', () => {
    for (const section of [{ ...ONE_PAGE, current: '/market-map/' }, ONE_PAGE]) {
      const { container, unmount } = render(
        <PageHeader title="Market Map" lead="123 companies in six segments" section={section} />,
      );
      expect(screen.queryByRole('navigation')).toBeNull();
      expect(screen.queryByRole('link')).toBeNull();
      expect(container.querySelector('[aria-current]')).toBeNull();
      expect(container.textContent).not.toContain('Market map');
      unmount();
    }
  });

  it('refuses a current route the section does not list', () => {
    expect(() =>
      render(
        <PageHeader
          title="Recent funding rounds"
          lead="Funding rounds over 120 days"
          section={{ ...THREE_PAGES, current: '/market-map/round/' }}
        />,
      ),
    ).toThrow(/not a page of Market/);
  });

  it('links the page sections in order, and prints none when there are none', () => {
    const { unmount } = render(
      <PageHeader title="Recent funding rounds" lead="Funding rounds over 120 days" anchors={ANCHORS} />,
    );
    const sections = screen.getByRole('navigation', { name: 'On this page' });
    const links = within(sections).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Timeline', '#timeline'],
      ['Rounds', '#rounds'],
      ['Acquisitions and shutdowns', '#exits'],
      ['Who is investing', '#investors'],
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute('data-brand-control-id', 'control:link-focus');
    }
    unmount();

    for (const anchors of [undefined, []]) {
      const empty = render(
        <PageHeader title="Market Map" lead="123 companies in six segments" anchors={anchors} />,
      );
      expect(screen.queryByRole('navigation')).toBeNull();
      empty.unmount();
    }
  });

  it('wraps both link rows and keeps them out of the search index', () => {
    render(
      <PageHeader
        title="Recent funding rounds"
        lead="Funding rounds over 120 days"
        section={{ ...THREE_PAGES, current: '/market-map/rounds/' }}
        anchors={ANCHORS}
      />,
    );
    for (const nav of screen.getAllByRole('navigation')) {
      expect(nav).toHaveAttribute('data-pagefind-ignore');
      const list = within(nav).getByRole('list');
      expect(list).toHaveClass('flex', 'flex-wrap');
      expect(list.className).not.toMatch(/overflow|nowrap/);
    }
  });
});

describe('the market map page header', () => {
  // The page mounts the whole map (one tile per company), so it gets the
  // map tests' 30 s.
  it(
    'keeps its title, counts its companies and ends on the map date',
    () => {
      const { container } = render(<MarketMapPage />);
      const header = container.querySelector('header[data-page-header]')!;
      const title = within(header as HTMLElement).getByRole('heading', { level: 1 });
      expect(title.textContent).toBe('Market Map');
      expect(header.firstElementChild).toBe(title);
      expect(lead(container).textContent).toBe(
        `${COMPANIES.length} companies in six segments, each with its latest disclosed round or its status, and the sources behind its figures, as of ${formatLongDate(MARKET_MAP_AS_OF)}.`,
      );
      // The header sits in the page's one searchable, material-declaring block.
      const body = header.parentElement!;
      expect(body).toHaveAttribute('data-pagefind-body');
      expect(body).toHaveAttribute('data-brand-material-id', 'material:paper');

      // Section links appear with the section's second page, and not before.
      const section = within(header as HTMLElement).queryByRole('navigation', { name: 'Market' });
      if (MARKET_SECTION.pages.length < 2) {
        expect(section).toBeNull();
        expect(header.querySelector('a')).toBeNull();
      } else {
        expect(section).not.toBeNull();
        const marked = section!.querySelector('[aria-current="page"]')!;
        expect(marked.textContent).toBe('Market map');
        expect(
          Array.from(section!.querySelectorAll('a')).map(route),
        ).not.toContain('/market-map/');
      }
    },
    30_000,
  );
});
