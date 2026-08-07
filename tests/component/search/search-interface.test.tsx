import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchClient, SearchHit } from '@/lib/search';

const mockReplace = vi.fn();
const mockRouter = { replace: mockReplace };
let mockParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  // Stable router identity: the real useRouter() is stable across renders,
  // and SearchInterface's effects depend on it.
  useRouter: () => mockRouter,
  useSearchParams: () => mockParams,
}));

import { SearchInterface } from '@/components/search/search-interface';

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    url: '/manipulation/action-chunking/',
    title: 'Action Chunking (ACT and ALOHA)',
    excerpt: 'the <mark>chunk</mark>-size tradeoff',
    ...overrides,
  };
}

function clientWith(
  search: (query: string) => Promise<SearchHit[]>,
): () => Promise<SearchClient> {
  return () => Promise.resolve({ search });
}

const INPUT_NAME = 'Search the atlas';
// A result link's accessible name is its full text content (title plus
// snippet), so name queries match on the title prefix.
const ACT_RESULT = /^Action Chunking \(ACT and ALOHA\)/;

beforeEach(() => {
  mockReplace.mockClear();
  mockParams = new URLSearchParams();
});

describe('SearchInterface', () => {
  it('renders one labeled search input with an idle prompt', () => {
    render(<SearchInterface loadClient={clientWith(() => Promise.resolve([]))} />);
    expect(screen.getByRole('searchbox', { name: INPUT_NAME })).toBeInTheDocument();
    expect(screen.getByText(/type a query to search/i)).toBeInTheDocument();
  });

  it('prefills the query from the URL and shows its results on load', async () => {
    mockParams = new URLSearchParams('q=chunk');
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([hit()]))}
        debounceMs={0}
      />,
    );
    expect(screen.getByRole('searchbox', { name: INPUT_NAME })).toHaveValue('chunk');
    expect(
      await screen.findByRole('link', { name: ACT_RESULT }),
    ).toBeInTheDocument();
  });

  it('shows a prose results group with page title and match snippet', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([hit()]))}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'chunk');
    const group = await screen.findByRole('region', { name: 'Modules' });
    const link = await screen.findByRole('link', { name: ACT_RESULT });
    expect(group).toContainElement(link);
    // next/link normalizes the trailing slash when no Next config is loaded
    // (test env); the production config sets trailingSlash: true.
    expect(link.getAttribute('href')).toMatch(/^\/manipulation\/action-chunking/);
    // The match-context snippet renders inside the result, with the matched
    // term highlighted.
    const snippet = group.querySelector('.search-excerpt');
    expect(snippet).toHaveTextContent('the chunk-size tradeoff');
    expect(snippet?.querySelector('mark')).toHaveTextContent('chunk');
  });

  it('announces the result count in a polite status region', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([hit()]))}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'chunk');
    await screen.findByRole('link', { name: ACT_RESULT });
    expect(screen.getByRole('status')).toHaveTextContent('1 module matches');
  });

  it('shows an explicit no-results state', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'zzqx');
    expect(await screen.findByText(/no module prose matches/i)).toBeInTheDocument();
  });

  it('returns to the idle state when the query is cleared', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([hit()]))}
        debounceMs={0}
      />,
    );
    const input = screen.getByRole('searchbox', { name: INPUT_NAME });
    await user.type(input, 'chunk');
    await screen.findByRole('link', { name: ACT_RESULT });
    await user.clear(input);
    await waitFor(() =>
      expect(screen.getByText(/type a query to search/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('link', { name: ACT_RESULT }),
    ).not.toBeInTheDocument();
  });

  it('never lets a stale response overwrite newer results', async () => {
    const user = userEvent.setup();
    const pending: Array<{ q: string; resolve: (h: SearchHit[]) => void }> = [];
    const loadClient = () =>
      Promise.resolve({
        search: (q: string) =>
          new Promise<SearchHit[]>((resolve) => pending.push({ q, resolve })),
      });
    render(<SearchInterface loadClient={loadClient} debounceMs={0} />);
    const input = screen.getByRole('searchbox', { name: INPUT_NAME });

    await user.type(input, 'act');
    await waitFor(() => expect(pending.some((p) => p.q === 'act')).toBe(true));
    await user.clear(input);
    await user.type(input, 'diffusion');
    await waitFor(() =>
      expect(pending.some((p) => p.q === 'diffusion')).toBe(true),
    );

    // The newer query resolves first.
    pending
      .find((p) => p.q === 'diffusion')!
      .resolve([hit({ title: 'Diffusion Policy', url: '/manipulation/diffusion-policy/' })]);
    await screen.findByRole('link', { name: /^Diffusion Policy/ });

    // A late response for the older query must be dropped, not mixed in.
    pending.find((p) => p.q === 'act')!.resolve([hit()]);
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: ACT_RESULT }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: /^Diffusion Policy/ })).toBeInTheDocument();
  });

  it('moves focus through results with arrow keys', async () => {
    const user = userEvent.setup();
    const hits = [
      hit({ title: 'First', url: '/a/' }),
      hit({ title: 'Second', url: '/b/' }),
      hit({ title: 'Third', url: '/c/' }),
    ];
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve(hits))}
        debounceMs={0}
      />,
    );
    const input = screen.getByRole('searchbox', { name: INPUT_NAME });
    await user.type(input, 'x');
    const first = await screen.findByRole('link', { name: /^First/ });

    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(first).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: /^Second/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: /^Third/ })).toHaveFocus();
    // Clamped at the last result.
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: /^Third/ })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('link', { name: /^Second/ })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(first).toHaveFocus();
    // ArrowUp on the first result returns focus to the input.
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveFocus();
  });

  it('shows an unavailable state when the index cannot load', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={() => Promise.reject(new Error('no index'))}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'chunk');
    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent(/search index is unavailable/i);
    expect(note).toHaveTextContent(/npm run build/);
    expect(screen.queryByRole('region', { name: 'Modules' })).not.toBeInTheDocument();
  });

  it('syncs the query into the URL', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([hit()]))}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'act');
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/search?q=act', { scroll: false }),
    );
  });
});
