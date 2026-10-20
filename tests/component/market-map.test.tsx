import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

/** Every company tile on the map (one button per company). */
function tiles(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('button[data-map-tile]'));
}

function tile(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`button[data-map-tile="${id}"]`);
  if (!el) throw new Error(`no tile for ${id}`);
  return el;
}

/** The open company's details (the side sheet at this width). */
function sheet(name: string | RegExp): HTMLElement {
  return screen.getByRole('dialog', { name });
}

function segmentTab(name: RegExp) {
  return within(screen.getByRole('group', { name: 'Segment' })).getByRole('button', { name });
}

async function openMoreFilters(user: ReturnType<typeof userEvent.setup>) {
  const toggle = screen.getByRole('button', { name: /More filters/ });
  if (toggle.getAttribute('aria-expanded') !== 'true') await user.click(toggle);
}

// MarketMap renders 111 company tiles. Under full-suite jsdom load a render
// can exceed the 5 s default timeout, so every test here gets 15 s.
const TIMEOUT = 15_000;

describe('MarketMap', () => {
  it('maps all 111 companies in the six segments (VAL-MKT-001, VAL-MKT-002)', () => {
    render(<MarketMap companies={COMPANIES} />);
    expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    expect(tiles()).toHaveLength(111);
    const segments: Array<[RegExp, string]> = [
      [/Foundation models/, '12'],
      [/^Humanoids/, '34'],
      [/Industrial \/ logistics/, '15'],
      [/Vertical applications/, '32'],
      [/Simulation \/ tooling/, '10'],
      [/^Components/, '8'],
    ];
    for (const [name, count] of segments) {
      const heading = screen.getByRole('heading', { level: 2, name });
      expect(heading).toHaveTextContent(count);
      // The heading's own segment holds exactly that many tiles.
      expect(heading.closest('section')!.querySelectorAll('button[data-map-tile]')).toHaveLength(
        Number(count),
      );
    }
    // A tile names its company and its one fact for a screen reader.
    expect(tile('skild-ai')).toHaveAccessibleName('Skild AI, latest round $1.4B, Series C');
    // Since the 2026-10-19 field audit Figure's round has no exact amount
    // (its source says it "exceeds $1B") and Covariant is private (Amazon
    // hired its founders and licensed its models without buying it).
    expect(tile('figure-ai')).toHaveAccessibleName('Figure AI, latest round amount not disclosed');
    expect(tile('covariant')).toHaveAccessibleName('Covariant, latest round amount not disclosed');
    expect(tile('boston-dynamics')).toHaveAccessibleName('Boston Dynamics, acquired');
    // Since the 2026-10-20 field audit CMR Surgical's latest round is
    // Stryker's October 2026 investment (its own release); Weave Robotics
    // has disclosed no round amount.
    expect(tile('cmr-surgical')).toHaveAccessibleName(
      'CMR Surgical, latest round $400M, Strategic investment',
    );
    expect(tile('weave-robotics')).toHaveAccessibleName('Weave Robotics, latest round amount not disclosed');
    // Farm-ng's acquisition by Bonsai Robotics (2025-07-24) is its status, not a round.
    expect(tile('farm-ng')).toHaveAccessibleName('Farm-ng, acquired');
  }, TIMEOUT);

  it('exposes all seven filter dimensions, a name search and the three views (VAL-MKT-003, VAL-MKT-004)', async () => {
    const user = userEvent.setup();
    // A one-segment subset keeps the render cheap; the controls are the
    // same for any population.
    const subset = filterCompanies(COMPANIES, {
      ...DEFAULT_MARKET_MAP_FILTERS,
      segment: 'simulation-tooling',
    });
    render(<MarketMap companies={subset} />);
    const segments = within(screen.getByRole('group', { name: 'Segment' })).getAllByRole('button');
    // "All" plus the six segments.
    expect(segments).toHaveLength(7);
    expect(segments[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search companies by name' })).toBeInTheDocument();
    const more = screen.getByRole('button', { name: /More filters/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await openMoreFilters(user);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['Sub-segment', 'Country', 'Stage / status', 'Approach', 'Open source', 'Confidence']) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Bubble' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timeline' })).toBeInTheDocument();
    const status = screen.getByLabelText('Stage / status');
    for (const option of ['Private', 'Public', 'Acquired', 'IPO', 'Shut down']) {
      expect(status).toHaveTextContent(option);
    }
    expect(tiles()).toHaveLength(subset.length);
    await user.selectOptions(screen.getByLabelText('Country'), 'US');
    expect(tiles().length).toBeLessThan(subset.length);
  }, TIMEOUT);

  it('applies a single filter and composes a second one (VAL-MKT-005, VAL-MKT-006)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(segmentTab(/^Humanoids/));
    expect(segmentTab(/^Humanoids/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('34 of 111 companies')).toBeInTheDocument();
    expect(tiles()).toHaveLength(34);
    expect(window.location.search).toBe('?segment=humanoids');
    await openMoreFilters(user);
    await user.selectOptions(screen.getByLabelText('Country'), 'US');
    // 6 -> 7 when the 2026-10-19 field audit moved 1X to Palo Alto, US.
    expect(screen.getByText('7 of 111 companies')).toBeInTheDocument();
    expect(tiles()).toHaveLength(7);
    await user.selectOptions(screen.getByLabelText('Confidence'), 'high');
    // 4 -> 5 when the 2026-10-20 field audit raised Persona AI to high.
    expect(screen.getByText('5 of 111 companies')).toBeInTheDocument();
    // Segment counts follow the other filters: five US humanoids at high
    // confidence, and the tab says so before it is chosen.
    expect(segmentTab(/^Humanoids/)).toHaveTextContent('5');
    // Choosing the active segment again returns to all segments.
    await user.click(segmentTab(/^Humanoids/));
    expect(segmentTab(/^All/)).toHaveAttribute('aria-pressed', 'true');
  }, TIMEOUT);

  it('searches names and writes the query into the URL', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    const search = screen.getByRole('searchbox', { name: 'Search companies by name' });
    await user.type(search, 'dyn');
    expect(screen.getByText('3 of 111 companies')).toBeInTheDocument();
    expect(tiles().map((el) => el.dataset.mapTile).sort()).toEqual([
      'boston-dynamics',
      'dyna-robotics',
      'limx-dynamics',
    ]);
    expect(window.location.search).toBe('?q=dyn');
    await user.clear(search);
    expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  }, TIMEOUT);

  it('narrows sub-segments when a segment is active (VAL-MKT-025)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await openMoreFilters(user);
    const sub = screen.getByLabelText('Sub-segment');
    expect(sub).toHaveTextContent('warehouse automation');
    await user.click(segmentTab(/^Humanoids/));
    expect(sub).toHaveTextContent('industrial humanoids');
    expect(sub).not.toHaveTextContent('warehouse automation');
  }, TIMEOUT);

  it('opens the full field set with cited sources and closes it (VAL-MKT-009, VAL-MKT-010)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    const before = window.history.length;
    await user.click(tile('physical-intelligence'));
    const pi = sheet('Physical Intelligence');
    // The selection is the URL hash, one history entry deep, and focus
    // moves to the company's heading.
    expect(window.location.hash).toBe('#company-physical-intelligence');
    expect(window.history.length).toBe(before + 1);
    expect(within(pi).getByRole('heading', { level: 2, name: 'Physical Intelligence' })).toHaveFocus();
    expect(tile('physical-intelligence')).toHaveAttribute('aria-expanded', 'true');
    expect(pi).toHaveTextContent(/vision-language-action/);
    expect(pi).toHaveTextContent('flow matching action expert');
    expect(pi.querySelector('[data-field="amount"]')).toHaveTextContent('$600M');
    // "20 Nov 2025" until the 2026-10-19 field audit: The Robot Report says
    // only that the round closed "last week", so the day is not disclosed.
    expect(pi.querySelector('[data-field="date"]')).toHaveTextContent('not disclosed');
    expect(pi.querySelector('[data-field="valuation"]')).toHaveTextContent('$5.6B');
    expect(pi.querySelector('[data-field="status"]')).toHaveTextContent('Private');
    expect(pi.querySelector('[data-field="confidence"]')).toHaveTextContent('high');
    expect(
      within(pi).getAllByRole('link', {
        name: /Physical Intelligence raises \$600M to advance robot foundation models/,
      })[0],
    ).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
    // The 2026-10-19 field audit cut "Pi" (its sources use it only for the
    // Pi0 model and the API) and named the open release as PI's own pages do.
    expect(within(pi).getByText('π')).toBeInTheDocument();
    expect(within(pi).getByText('San Francisco, US')).toBeInTheDocument();
    // TRR (fetched 2026-08-18): CapitalG led the Series B with Lux Capital.
    expect(within(pi).getByText('CapitalG, Lux Capital')).toBeInTheDocument();
    expect(within(pi).getByText('π0 and π0-FAST (weights and code)')).toBeInTheDocument();
    // The round's figures carry the date their source was read.
    expect(pi.querySelector('[data-round-source] [data-field="as-of"]')).toHaveTextContent(
      /\d{1,2} [A-Z][a-z]{2} 2026/,
    );

    await user.click(within(pi).getByRole('button', { name: 'Close Physical Intelligence details' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.hash).toBe('');
    expect(tile('physical-intelligence')).toHaveFocus();
    expect(tile('physical-intelligence')).toHaveAttribute('aria-expanded', 'false');
  }, TIMEOUT);

  it('dates round figures by the round source, not the first source', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(tile('tars-robotics'));
    const tars = sheet('TARS Robotics');
    const source = tars.querySelector('[data-round-source]')!;
    expect(source).toHaveTextContent('TARS Raises $455M Pre-A Round');
    expect(source.querySelector('[data-field="as-of"]')).toHaveTextContent('25 Aug 2026');
    expect(source.querySelector('a')).toHaveAttribute(
      'href',
      'https://pandaily.com/tars-raises-455-m-pre-a-round-setting-record-in-china-s-embodied-ai-sector',
    );
  }, TIMEOUT);

  it('shows a round caveat with its source on the card (VAL-B2-MAP-009)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(tile('figure-ai'));
    const figure = sheet('Figure AI');
    // The floor the source states is visible next to the undisclosed
    // amount, never silently dropped, and it cites the page it came from.
    expect(figure.querySelector('[data-field="amount"]')).toHaveTextContent('not disclosed');
    const caveat = figure.querySelector('[data-round-caveat]') as HTMLElement;
    expect(caveat).toHaveTextContent(
      'Caveat: Figure says the Series C exceeded $1B; it gives no exact amount. Source:',
    );
    expect(within(caveat).getByRole('link')).toHaveAttribute(
      'href',
      'https://www.figure.ai/news/series-c',
    );
    // A company without a caveat shows none.
    await user.click(tile('genesis-ai'));
    expect(sheet('Genesis AI').querySelector('[data-round-caveat]')).toBeNull();
  }, TIMEOUT);

  it('renders unknown funding as not disclosed, never zero (VAL-MKT-011)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    // No tile prints a zero.
    expect(tiles().some((el) => /\$0\b/.test(el.textContent ?? ''))).toBe(false);
    await user.click(tile('covariant'));
    const covariant = sheet('Covariant');
    expect(within(covariant).getAllByText('not disclosed').length).toBeGreaterThanOrEqual(2);
    expect(covariant).not.toHaveTextContent('$0');

    await user.click(tile('genesis-ai'));
    const genesis = sheet('Genesis AI');
    expect(genesis.querySelector('[data-field="amount"]')).toHaveTextContent('$105M');
    expect(genesis.querySelector('[data-field="valuation"]')?.textContent).toBe('not disclosed');
  }, TIMEOUT);

  it('switches company in place, so one Back closes the details', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    const before = window.history.length;
    await user.click(tile('figure-ai'));
    await user.click(tile('skild-ai'));
    expect(sheet('Skild AI')).toBeInTheDocument();
    expect(window.location.hash).toBe('#company-skild-ai');
    expect(window.history.length).toBe(before + 1);
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.hash).toBe('');
  }, TIMEOUT);

  it('keeps a filter changed while the details were open when they close', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(tile('figure-ai'));
    await user.click(segmentTab(/^Humanoids/));
    expect(window.location.search).toBe('?segment=humanoids');
    expect(window.location.hash).toBe('#company-figure-ai');
    // Going Back over the opened entry would restore the older, unfiltered
    // query, so closing drops the hash in place instead.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.search).toBe('?segment=humanoids');
    expect(window.location.hash).toBe('');
    expect(screen.getByText('34 of 111 companies')).toBeInTheDocument();
  }, TIMEOUT);

  it('closes on Escape and hands focus back to the tile, but not from the search field', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(tile('figure-ai'));
    expect(sheet('Figure AI')).toBeInTheDocument();
    // Escape inside a field keeps its own meaning.
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search companies by name' }), {
      key: 'Escape',
    });
    expect(sheet('Figure AI')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(tile('figure-ai')).toHaveFocus();
    // Clicking the open company's tile again also closes it.
    await user.click(tile('figure-ai'));
    expect(sheet('Figure AI')).toBeInTheDocument();
    await user.click(tile('figure-ai'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  }, TIMEOUT);

  it('makes the map one tab stop with arrow-key movement', () => {
    render(<MarketMap companies={COMPANIES} />);
    expect(tiles().filter((el) => el.tabIndex === 0)).toHaveLength(1);
    const first = tiles().find((el) => el.tabIndex === 0)!;
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = document.activeElement as HTMLElement;
    expect(second).not.toBe(first);
    expect(second.dataset.mapTile).toBeTruthy();
    expect(tiles().filter((el) => el.tabIndex === 0)).toEqual([second]);
    fireEvent.keyDown(second, { key: 'End' });
    expect(document.activeElement).toBe(tiles()[tiles().length - 1]);
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(tiles()[0]);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tiles()[tiles().length - 1]);
  }, TIMEOUT);

  it('switches to bubble and timeline views (VAL-MKT-003, VAL-MKT-015, VAL-MKT-023)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(screen.getByRole('button', { name: 'Bubble' }));
    expect(screen.getByRole('group', { name: /bubble chart/i })).toBeInTheDocument();
    // The axis is titled, and the legend names the two kinds of mark.
    expect(screen.getByText('Founding year')).toBeInTheDocument();
    expect(screen.getByText('Latest valuation')).toBeInTheDocument();
    expect(screen.getByText('Total raised, where no valuation is disclosed')).toBeInTheDocument();
    // 83 -> 84 with the 2026-10-19 field audit (27 plotted, see
    // market-map-bubble-view.test.tsx for the members that moved).
    // 84 -> 82 with the 2026-10-20 field audit (29 plotted).
    // 82 -> 83 the same day: Standard Bots' founding year was cut (28 plotted).
    // 83 -> 81 the same day: Lila Sciences and K-Scale Labs joined (30 plotted).
    // 81 -> 80 the same day: Mytra joined by its total raised (31 plotted).
    // 80 -> 81 the same day: PaXini's valuation was cut (30 plotted).
    expect(document.querySelector('[data-bubble-excluded]')).toHaveTextContent(
      /81 are left off, not drawn at zero/,
    );
    expect(tiles()).toHaveLength(0);
    expect(window.location.search).toBe('?view=bubble');

    await user.click(screen.getByRole('button', { name: 'Timeline' }));
    // Figure's amount and Skild's valuation have been floors, not figures,
    // since the 2026-10-19 field audit, so neither prints as exact.
    const figureEvent = screen.getByText('Figure AI').closest('[data-company-id="figure-ai"]');
    expect(figureEvent).toHaveTextContent('not disclosed at $39B');
    const skildEvent = screen.getByText('Skild AI').closest('[data-company-id="skild-ai"]');
    expect(skildEvent).toHaveTextContent('$1.4B');
    expect(skildEvent).not.toHaveTextContent(/ at \$/);
    const unitreeEvent = screen
      .getByText('Unitree Robotics')
      .closest('[data-company-id="unitree-robotics"]');
    expect(unitreeEvent).toHaveTextContent('IPO');
    // A timeline row opens the same details.
    await user.click(within(unitreeEvent as HTMLElement).getByRole('button'));
    expect(sheet('Unitree Robotics').querySelector('[data-field="status"]')).toHaveTextContent('IPO');

    await user.click(screen.getByRole('button', { name: 'Grid' }));
    expect(tiles()).toHaveLength(111);
    // The open company survives the view change.
    expect(tile('unitree-robotics')).toHaveAttribute('aria-expanded', 'true');
  }, TIMEOUT);

  it('shows an empty state and restores the full set on clear (VAL-MKT-017, VAL-MKT-018)', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.click(segmentTab(/^Components/));
    await openMoreFilters(user);
    await user.selectOptions(screen.getByLabelText('Stage / status'), 'shut-down');
    const empty = screen.getByRole('status');
    expect(empty).toHaveTextContent('No companies match these filters.');
    expect(empty).toHaveTextContent('Nothing in Components matches every filter at once.');
    expect(screen.getByText('0 of 111 companies')).toBeInTheDocument();
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    expect(tiles()).toHaveLength(111);
  }, TIMEOUT);

  it('names the search in the empty state', async () => {
    const user = userEvent.setup();
    render(<MarketMap companies={COMPANIES} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search companies by name' }), 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent('No company name starts with “zzz”.');
  }, TIMEOUT);

  it('hydrates filters from the URL and ignores invalid params (VAL-MKT-007, VAL-MKT-024)', async () => {
    window.history.replaceState(null, '', '/market-map/?segment=humanoids&country=US');
    const { unmount } = render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      // 6 -> 7 when the 2026-10-19 field audit moved 1X to Palo Alto, US.
      expect(screen.getByText('7 of 111 companies')).toBeInTheDocument();
    });
    // A folded filter set from the URL opens the fold, so the reader can
    // see what narrowed the map.
    expect(screen.getByRole('button', { name: /More filters/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Country')).toHaveValue('US');
    unmount();

    window.history.replaceState(null, '', '/market-map/?segment=bogus&confidence=999');
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
    // The valid sibling filter still narrows the map: the bogus values
    // must not silently empty it.
    expect(tiles().length).toBeGreaterThan(0);
    expect(tiles().length).toBeLessThan(111);
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
    // company's tile is marked and its details are open.
    await waitFor(() => {
      expect(screen.getByText('34 of 111 companies')).toBeInTheDocument();
    });
    expect(tile('figure-ai')).toHaveClass('bg-surface-2');
    expect(tile('figure-ai')).toHaveAttribute('aria-expanded', 'true');
    expect(sheet('Figure AI')).toBeInTheDocument();
    // A selection that arrives with the page leaves focus alone.
    expect(document.activeElement).toBe(document.body);
    expect(window.location.search).toBe('?segment=humanoids');
    expect(window.location.hash).toBe('#company-figure-ai');
  }, TIMEOUT);

  it('clears every filter when the hashed company fails all of them', async () => {
    window.history.replaceState(null, '', '/market-map/?country=CN&status=ipo#company-figure-ai');
    render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByText('111 of 111 companies')).toBeInTheDocument();
    });
    expect(tile('figure-ai')).toHaveClass('bg-surface-2');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#company-figure-ai');
    // Closing a selection the page arrived with drops the hash in place.
    await userEvent.setup().keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.hash).toBe('');
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
    await openMoreFilters(user);
    await user.selectOptions(screen.getByLabelText('Country'), 'CN');
    // 21 -> 22 on 2026-10-20: the field audit moved Astribot from Munich to
    // Shenzhen, where its own site and Pandaily place it.
    await waitFor(() => {
      expect(screen.getByText('22 of 111 companies')).toBeInTheDocument();
    });
    expect(document.querySelector('button[data-map-tile="figure-ai"]')).toBeNull();
    // The details stay open: the selection is explicit.
    expect(sheet('Figure AI')).toBeInTheDocument();
    expect(window.location.hash).toBe('#company-figure-ai');
  }, TIMEOUT);

  it('leaves filters alone when the hash names an unknown company', async () => {
    window.history.replaceState(null, '', '/market-map/?country=CN#company-ghost');
    render(<MarketMap companies={COMPANIES} />);
    await waitFor(() => {
      expect(screen.getByText('22 of 111 companies')).toBeInTheDocument();
    });
    expect(document.getElementById('company-ghost')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }, TIMEOUT);

  it('announces the result count in an aria-live region (VAL-MKT-026)', () => {
    render(<MarketMap companies={COMPANIES} />);
    expect(screen.getByText('111 of 111 companies')).toHaveAttribute('aria-live', 'polite');
  }, TIMEOUT);
});
