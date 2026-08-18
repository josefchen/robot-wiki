import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import {
  DEFAULT_MARKET_MAP_FILTERS,
  filterCompanies,
} from '@/lib/market-map';
import { MarketMap } from '@/components/market-map/market-map';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function card(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 3, name });
  const article = heading.closest('article');
  if (!article) throw new Error(`no article for ${name}`);
  return article;
}

// MarketMap renders 111 DOM-heavy company cards. Under full-suite jsdom
// load the second render can exceed the 5s default timeout (it takes ~3s
// in isolation), so every test in this file gets a 15s ceiling.
const TIMEOUT = 15_000;

describe('MarketMap', () => {
  it('renders all 111 companies grouped by the six segments (VAL-MKT-001, VAL-MKT-002)', () => {
    render(<MarketMap companies={COMPANIES} />);
    expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(111);
    expect(
      screen.getByRole('heading', { name: /Foundation models/ }),
    ).toHaveTextContent('12');
    expect(screen.getByRole('heading', { name: /Humanoids/ })).toHaveTextContent(
      '34',
    );
    expect(
      screen.getByRole('heading', { name: /Industrial \/ logistics/ }),
    ).toHaveTextContent('15');
    expect(
      screen.getByRole('heading', { name: /Vertical applications/ }),
    ).toHaveTextContent('32');
    expect(
      screen.getByRole('heading', { name: /Simulation \/ tooling/ }),
    ).toHaveTextContent('10');
    expect(screen.getByRole('heading', { name: /Components/ })).toHaveTextContent(
      '8',
    );
  }, TIMEOUT);

  it('exposes all seven filter dimensions and the three views (VAL-MKT-003, VAL-MKT-004)', async () => {
    const user = userEvent.setup();
    // Render a one-segment subset (10 cards) instead of the full grid:
    // the filter bar is a sibling of the grid, not a child of it, so all
    // seven dimensions are fully observable without paying the 111-card
    // render cost (that cost, paid once per assertion-shaped rerender, is
    // what used to push this test past the module timeout under
    // full-suite jsdom load).
    const subset = filterCompanies(COMPANIES, {
      ...DEFAULT_MARKET_MAP_FILTERS,
      segment: 'simulation-tooling',
    });
    render(<MarketMap companies={subset} />);
    expect(screen.getByLabelText('Segment')).toBeInTheDocument();
    expect(screen.getByLabelText('Sub-segment')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
    expect(screen.getByLabelText('Stage / status')).toBeInTheDocument();
    expect(screen.getByLabelText('Approach')).toBeInTheDocument();
    expect(screen.getByLabelText('Open source')).toBeInTheDocument();
    expect(screen.getByLabelText('Confidence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Bubble' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timeline' })).toBeInTheDocument();
    const status = screen.getByLabelText('Stage / status');
    expect(status).toHaveTextContent('Private');
    expect(status).toHaveTextContent('Public');
    expect(status).toHaveTextContent('Acquired');
    expect(status).toHaveTextContent('IPO');
    expect(status).toHaveTextContent('Shut down');
    // The subset genuinely renders cards (the assertions above are not
    // passing against an empty grid).
    expect(screen.getAllByRole('article')).toHaveLength(subset.length);
    // And one dimension still narrows: the interaction surface works.
    await user.selectOptions(screen.getByLabelText('Country'), 'US');
    expect(screen.getAllByRole('article').length).toBeLessThan(subset.length);
  }, TIMEOUT);

  it('applies a single filter and composes a second one (VAL-MKT-005, VAL-MKT-006)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.selectOptions(screen.getByLabelText('Segment'), 'humanoids');
    expect(screen.getByText('34 of 111 companies')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(34);
    await user.selectOptions(screen.getByLabelText('Country'), 'US');
    expect(screen.getByText('6 of 111 companies')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    await user.selectOptions(screen.getByLabelText('Confidence'), 'high');
    expect(screen.getByText('4 of 111 companies')).toBeInTheDocument();
  }, TIMEOUT);

  it('narrows sub-segments when a segment is active (VAL-MKT-025)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    const sub = screen.getByLabelText('Sub-segment');
    expect(sub).toHaveTextContent('warehouse automation');
    await user.selectOptions(screen.getByLabelText('Segment'), 'humanoids');
    expect(sub).toHaveTextContent('industrial humanoids');
    expect(sub).not.toHaveTextContent('warehouse automation');
  }, TIMEOUT);

  it('shows the complete field set and expands inline (VAL-MKT-009, VAL-MKT-010)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    const pi = card('Physical Intelligence');
    expect(pi).toHaveTextContent(/vision-language-action/);
    expect(pi).toHaveTextContent('flow matching action expert');
    expect(pi).toHaveTextContent('$600M');
    expect(pi).toHaveTextContent('20 Nov 2025');
    expect(pi).toHaveTextContent('$5.6B');
    expect(pi).toHaveTextContent('Private');
    expect(pi).toHaveTextContent('high');
    expect(
      within(pi).getByRole('link', {
        name: /Physical Intelligence raises \$600M to advance robot foundation models/,
      }),
    ).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));

    await user.click(within(pi).getByRole('button', { name: 'Expand' }));
    expect(within(pi).getByText('Pi, π')).toBeInTheDocument();
    expect(within(pi).getByText('San Francisco, US')).toBeInTheDocument();
    // TRR (fetched 2026-08-18): CapitalG led the Series B with Lux Capital.
    expect(within(pi).getByText('CapitalG, Lux Capital')).toBeInTheDocument();
    expect(within(pi).getByText('openpi')).toBeInTheDocument();
    await user.click(within(pi).getByRole('button', { name: 'Collapse' }));
    expect(within(pi).queryByText('openpi')).not.toBeInTheDocument();
  }, TIMEOUT);

  it('renders unknown funding as not disclosed, never zero (VAL-MKT-011)', () => {
    render(<MarketMap companies={COMPANIES} />);
    const covariant = card('Covariant');
    expect(within(covariant).getAllByText('not disclosed').length).toBeGreaterThanOrEqual(
      2,
    );
    expect(covariant).not.toHaveTextContent('$0');

    const genesis = card('Genesis AI');
    expect(genesis).toHaveTextContent('$105M');
    expect(genesis.querySelector('[data-field="valuation"]')?.textContent).toBe(
      'not disclosed',
    );
  }, TIMEOUT);

  it('switches to bubble and timeline views (VAL-MKT-003, VAL-MKT-015, VAL-MKT-023)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(screen.getByRole('button', { name: 'Bubble' }));
    expect(
      screen.getByRole('group', { name: /bubble chart/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Founding year/)).toBeInTheDocument();
    expect(screen.getByText(/excluded for missing/)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByText('Figure AI')).toBeInTheDocument();
    expect(screen.getByText(/\$1B at \$39B/)).toBeInTheDocument();
    expect(screen.getByText('Skild AI')).toBeInTheDocument();
    expect(screen.getByText(/\$1.4B at \$14B/)).toBeInTheDocument();
    const unitreeEvent = screen
      .getByText('Unitree Robotics')
      .closest('[data-company-id="unitree-robotics"]');
    expect(unitreeEvent).toHaveTextContent('IPO');

    await user.click(screen.getByRole('button', { name: 'Grid' }));
    expect(screen.getAllByRole('article')).toHaveLength(111);
  }, TIMEOUT);

  it('shows an empty state and restores the full set on clear (VAL-MKT-017, VAL-MKT-018)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.selectOptions(
      screen.getByLabelText('Segment'),
      'components-hardware',
    );
    await user.selectOptions(screen.getByLabelText('Stage / status'), 'shut-down');
    expect(screen.getByText('No companies match these filters.')).toBeInTheDocument();
    expect(screen.getByText('0 of 111 companies')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(111);
  }, TIMEOUT);

  it('hydrates filters from the URL and ignores invalid params (VAL-MKT-007, VAL-MKT-024)', async () => {
    window.history.replaceState(
      null,
      '',
      '/market-map/?segment=humanoids&country=US',
    );
    const { unmount } = render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByText('6 of 111 companies')).toBeInTheDocument();
    });
    unmount();

    window.history.replaceState(
      null,
      '',
      '/market-map/?segment=bogus&confidence=999',
    );
    render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    });
  }, TIMEOUT);

  it('drops unknown subSegment/country/approach params but keeps valid siblings', async () => {
    window.history.replaceState(
      null,
      '',
      '/market-map/?subSegment=bogus-subsegment&country=Atlantis&approach=vla',
    );
    render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Approach')).toHaveValue('vla');
    });
    expect(screen.getByLabelText('Sub-segment')).toHaveValue('');
    expect(screen.getByLabelText('Country')).toHaveValue('');
    // The valid sibling filter still narrows the grid: the bogus values
    // must not silently empty it.
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('article').length).toBeLessThan(111);
  }, TIMEOUT);

  it('relaxes filters that exclude the company named in the hash', async () => {
    window.history.replaceState(
      null,
      '',
      '/market-map/?segment=humanoids&country=CN#company-figure-ai',
    );
    render(<MarketMap companies={COMPANIES} />);
    // Figure AI is a US humanoid maker: the segment filter survives (it
    // passes), the country filter is dropped (it fails), and the named
    // card renders highlighted.
    await waitFor(() => {
      expect(screen.getByText('34 of 111 companies')).toBeInTheDocument();
    });
    const figure = card('Figure AI');
    expect(figure).toHaveClass('bg-surface-2');
    expect(window.location.search).toBe('?segment=humanoids');
    expect(window.location.hash).toBe('#company-figure-ai');
  }, TIMEOUT);

  it('clears every filter when the hashed company fails all of them', async () => {
    window.history.replaceState(
      null,
      '',
      '/market-map/?country=CN&status=ipo#company-figure-ai',
    );
    render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    });
    expect(card('Figure AI')).toHaveClass('bg-surface-2');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#company-figure-ai');
  }, TIMEOUT);

  it('does not relax again after the hash has been honored', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/market-map/#company-figure-ai');
    render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    });
    // The user explicitly re-excludes the hashed company; the arrival
    // relax must not fight that choice.
    await user.selectOptions(screen.getByLabelText('Country'), 'CN');
    await waitFor(() => {
      expect(screen.getByText('21 of 111 companies')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Figure AI' }),
    ).not.toBeInTheDocument();
  }, TIMEOUT);

  it('leaves filters alone when the hash names an unknown company', async () => {
    window.history.replaceState(
      null,
      '',
      '/market-map/?country=CN#company-ghost',
    );
    render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByText('21 of 111 companies')).toBeInTheDocument();
    });
    expect(document.getElementById('company-ghost')).toBeNull();
  }, TIMEOUT);

  it('announces the result count in an aria-live region (VAL-MKT-026)', () => {
    render(<MarketMap companies={COMPANIES} />);
    expect(screen.getByText('111 of 111 companies')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  }, TIMEOUT);
});
