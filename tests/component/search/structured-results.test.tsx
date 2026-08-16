import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchClient, SearchHit } from '@/lib/search';
import type { StructuredHit } from '@/lib/structured-search';

const mockReplace = vi.fn();
const mockRouter = { replace: mockReplace };
let mockParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockParams,
}));

import { SearchInterface } from '@/components/search/search-interface';

function proseHit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    url: '/manipulation/action-chunking/',
    title: 'Action Chunking (ACT and ALOHA)',
    excerpt: 'the <mark>chunk</mark>-size tradeoff',
    ...overrides,
  };
}

function structuredHit(overrides: Partial<StructuredHit> = {}): StructuredHit {
  return {
    id: 'company:figure-ai',
    entityId: 'figure-ai',
    type: 'company',
    title: 'Figure AI',
    url: '/market-map/#company-figure-ai',
    facet: 'humanoids',
    ...overrides,
  };
}

function clientWith(
  search: (query: string) => Promise<SearchHit[]>,
): () => Promise<SearchClient> {
  return () => Promise.resolve({ search });
}

const INPUT_NAME = 'Search the wiki';
const ACT_RESULT = /^Action Chunking \(ACT and ALOHA\)/;
const FIGURE_RESULT = /^Figure AI/;
const ACT_METHOD = /^ACT$/;
const DROID_RESULT = /^DROID/;

beforeEach(() => {
  mockReplace.mockClear();
  mockParams = new URLSearchParams();
});

describe('SearchInterface structured results', () => {
  it('renders a structured group separate from prose, with entity type labeled', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={() =>
          Promise.resolve({
            search: async () => [
              structuredHit(),
              structuredHit({
                id: 'method:act',
                entityId: 'act',
                type: 'method',
                title: 'ACT',
                url: '/manipulation/comparison-matrix/#method-act',
                facet: 'continuous',
              }),
            ],
          })
        }
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'act');

    const structured = await screen.findByRole('region', {
      name: 'Structured',
    });
    const prose = await screen.findByRole('region', { name: 'Modules' });
    expect(structured).not.toBe(prose);

    const figure = await screen.findByRole('link', { name: FIGURE_RESULT });
    expect(structured).toContainElement(figure);
    expect(figure).toHaveAttribute('href', '/market-map/#company-figure-ai');
    expect(within(structured).getByText(/^company$/i)).toBeInTheDocument();
    expect(within(structured).getByText(/^method$/i)).toBeInTheDocument();
  });

  it('shows both groups at once when a query matches prose and entities', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([proseHit()]))}
        loadStructured={() =>
          Promise.resolve({
            search: async () => [
              structuredHit({
                id: 'method:act',
                entityId: 'act',
                type: 'method',
                title: 'ACT',
                url: '/manipulation/comparison-matrix/#method-act',
                facet: 'continuous',
              }),
            ],
          })
        }
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'act');

    const prose = await screen.findByRole('region', { name: 'Modules' });
    const structured = await screen.findByRole('region', {
      name: 'Structured',
    });
    expect(prose).toContainElement(
      await screen.findByRole('link', { name: ACT_RESULT }),
    );
    expect(structured).toContainElement(
      await screen.findByRole('link', { name: ACT_METHOD }),
    );
  });

  it('shows an explicit no-results note in both groups', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={() => Promise.resolve({ search: async () => [] })}
        debounceMs={0}
      />,
    );
    await user.type(
      screen.getByRole('searchbox', { name: INPUT_NAME }),
      'zzqxzzqx',
    );
    expect(
      await screen.findByText(/no module prose matches/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/no structured (entities|results) match/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
  });

  it('narrows structured results with a type facet and leaves prose alone', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([proseHit()]))}
        loadStructured={() =>
          Promise.resolve({
            search: async () => [
              structuredHit(),
              structuredHit({
                id: 'method:act',
                entityId: 'act',
                type: 'method',
                title: 'ACT',
                url: '/manipulation/comparison-matrix/#method-act',
                facet: 'continuous',
              }),
              structuredHit({
                id: 'dataset:droid',
                entityId: 'droid',
                type: 'dataset',
                title: 'DROID',
                url: '/data-hardware/datasets/#dataset-droid',
                facet: '2024',
              }),
            ],
          })
        }
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'ai');

    const structured = await screen.findByRole('region', {
      name: 'Structured',
    });
    expect(
      within(structured).getByRole('link', { name: FIGURE_RESULT }),
    ).toBeInTheDocument();
    expect(
      within(structured).getByRole('link', { name: ACT_METHOD }),
    ).toBeInTheDocument();
    expect(
      within(structured).getByRole('link', { name: DROID_RESULT }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Companies$/i }));
    expect(
      within(structured).getByRole('link', { name: FIGURE_RESULT }),
    ).toBeInTheDocument();
    expect(
      within(structured).queryByRole('link', { name: ACT_METHOD }),
    ).not.toBeInTheDocument();
    expect(
      within(structured).queryByRole('link', { name: DROID_RESULT }),
    ).not.toBeInTheDocument();

    const prose = screen.getByRole('region', { name: 'Modules' });
    expect(
      within(prose).getByRole('link', { name: ACT_RESULT }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^All types$/i }));
    expect(
      within(structured).getByRole('link', { name: FIGURE_RESULT }),
    ).toBeInTheDocument();
    expect(
      within(structured).getByRole('link', { name: ACT_METHOD }),
    ).toBeInTheDocument();
    expect(
      within(structured).getByRole('link', { name: DROID_RESULT }),
    ).toBeInTheDocument();
    expect(
      within(prose).getByRole('link', { name: ACT_RESULT }),
    ).toBeInTheDocument();
  });

  it('keeps the facet bar inert while a new query is resolving, then restores it', async () => {
    const user = userEvent.setup();
    const pendingStructured: Array<(hits: StructuredHit[]) => void> = [];
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([proseHit()]))}
        loadStructured={() =>
          Promise.resolve({
            // 'figurex' hangs until the test releases it, pinning the
            // interface in the searching state over the previous query's
            // rows. Earlier keystroke queries resolve (their stale
            // results are dropped by the sequencer, as designed).
            search: (query: string) =>
              query === 'figurex'
                ? new Promise<StructuredHit[]>((resolve) =>
                    pendingStructured.push(resolve),
                  )
                : Promise.resolve(query === 'figure' ? [structuredHit()] : []),
          })
        }
        debounceMs={0}
      />,
    );
    const input = screen.getByRole('searchbox', { name: INPUT_NAME });
    await user.type(input, 'figure');
    const bar = await screen.findByRole('group', { name: 'Filter by type' });
    const companies = within(bar).getByRole('button', { name: /^Companies$/i });
    expect(companies).toBeEnabled();

    await user.type(input, 'x');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/searching/i);
    });
    // The stale rows stay on screen (atomic replacement), but the facet
    // bar must not offer interaction on them: buttons disabled, bar
    // dimmed, no spinner.
    expect(companies).toBeDisabled();
    expect(
      within(bar).getByRole('button', { name: /^All types$/i }),
    ).toBeDisabled();
    expect(bar.className).toContain('opacity-60');
    expect(bar.querySelector('.animate-spin')).toBeNull();

    pendingStructured[0]!([structuredHit({ title: 'Figurex' })]);
    await waitFor(() => {
      expect(screen.getByRole('status')).not.toHaveTextContent(/searching/i);
    });
    expect(companies).toBeEnabled();
  });

  it('keeps arrow-key focus working across both groups', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() =>
          Promise.resolve([proseHit({ title: 'First prose', url: '/a/' })]),
        )}
        loadStructured={() =>
          Promise.resolve({
            search: async () => [
              structuredHit({ title: 'First entity' }),
              structuredHit({
                id: 'method:act',
                entityId: 'act',
                type: 'method',
                title: 'Second entity',
                url: '/manipulation/comparison-matrix/#method-act',
                facet: 'continuous',
              }),
            ],
          })
        }
        debounceMs={0}
      />,
    );
    const input = screen.getByRole('searchbox', { name: INPUT_NAME });
    await user.type(input, 'x');
    const first = await screen.findByRole('link', { name: /^First prose/ });
    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(first).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: /^First entity/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: /^Second entity/ })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('link', { name: /^First entity/ })).toHaveFocus();
  });

  it('shows an explicit no-results note in the empty group when the other has hits', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([proseHit()]))}
        loadStructured={() => Promise.resolve({ search: async () => [] })}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'act');

    const prose = await screen.findByRole('region', { name: 'Modules' });
    const structured = await screen.findByRole('region', {
      name: 'Structured',
    });
    expect(prose).toContainElement(
      await screen.findByRole('link', { name: ACT_RESULT }),
    );
    expect(
      within(structured).getByText(/no structured (entities|results) match/i),
    ).toBeInTheDocument();
    expect(within(structured).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();

    const proseCount = within(prose).getAllByRole('link').length;
    expect(proseCount).toBeGreaterThan(0);
  });

  it('returns to idle without leftover structured results when cleared', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([proseHit()]))}
        loadStructured={() =>
          Promise.resolve({ search: async () => [structuredHit()] })
        }
        debounceMs={0}
      />,
    );
    const input = screen.getByRole('searchbox', { name: INPUT_NAME });
    await user.type(input, 'figure');
    await screen.findByRole('link', { name: FIGURE_RESULT });
    await user.clear(input);
    await waitFor(() =>
      expect(screen.getByText(/type a query to search/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('region', { name: 'Structured' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: FIGURE_RESULT }),
    ).not.toBeInTheDocument();
  });
});
