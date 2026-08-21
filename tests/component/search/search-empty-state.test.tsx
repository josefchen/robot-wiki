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

/**
 * The empty state, per VAL-SEARCH-023. The single message
 * `No modules match "X"` used to render whenever both groups came back
 * empty, so it named modules for a query that may only have missed the
 * entity records, and it rendered with a type facet active while unfiltered
 * entity matches were sitting one click away.
 *
 * Three distinct conditions are pinned here: prose-empty must not raise a
 * site-wide message at all; both-empty must raise exactly one message that
 * names both surfaces and carries a recovery affordance; and the
 * facet-narrowed case must name the filter and clear it.
 */

const INPUT_NAME = 'Search the wiki';
const SITE_EMPTY = '[data-search-empty]';

function proseHit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    url: '/manipulation/action-chunking/',
    title: 'Action Chunking (ACT and ALOHA)',
    excerpt: 'the <mark>chunk</mark>-size tradeoff',
    ...overrides,
  };
}

function company(overrides: Partial<StructuredHit> = {}): StructuredHit {
  return {
    id: 'company:figure-ai',
    entityId: 'figure-ai',
    type: 'company',
    title: 'Figure AI',
    url: '/market-map/#company-figure-ai',
    facet: 'humanoids',
    snippet: 'Builds general-purpose humanoid robots for commercial work.',
    ...overrides,
  };
}

const METHOD_HIT = company({
  id: 'method:act',
  entityId: 'act',
  type: 'method',
  title: 'ACT',
  url: '/manipulation/comparison-matrix/#method-act',
  facet: 'continuous',
});

function clientWith(
  search: (query: string) => Promise<SearchHit[]>,
): () => Promise<SearchClient> {
  return () => Promise.resolve({ search });
}

function structuredWith(hits: StructuredHit[]) {
  return () => Promise.resolve({ search: async () => hits });
}

beforeEach(() => {
  mockReplace.mockClear();
  mockParams = new URLSearchParams();
});

describe('VAL-SEARCH-023 (a): prose empty, entities present', () => {
  it('raises no site-wide empty state and keeps the structured group visible', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={structuredWith([company()])}
        debounceMs={0}
      />,
    );
    await user.type(
      screen.getByRole('searchbox', { name: INPUT_NAME }),
      'figure',
    );
    const structured = await screen.findByRole('region', {
      name: 'Structured',
    });
    expect(
      within(structured).getByRole('link', { name: /^Figure AI/ }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(SITE_EMPTY)).toHaveLength(0);
  });

  it('never announces a module-only verdict when only the prose group is empty', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={structuredWith([company()])}
        debounceMs={0}
      />,
    );
    await user.type(
      screen.getByRole('searchbox', { name: INPUT_NAME }),
      'figure',
    );
    await screen.findByRole('link', { name: /^Figure AI/ });
    expect(screen.getByRole('status')).not.toHaveTextContent(
      /no modules match/i,
    );
  });

  it('raises no site-wide empty state when only the structured group is empty', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([proseHit()]))}
        loadStructured={structuredWith([])}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'act');
    await screen.findByRole('link', { name: /^Action Chunking/ });
    expect(container.querySelectorAll(SITE_EMPTY)).toHaveLength(0);
  });
});

describe('VAL-SEARCH-023 (b): both groups empty', () => {
  it('renders exactly one site-wide message naming both surfaces', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={structuredWith([])}
        debounceMs={0}
      />,
    );
    await user.type(
      screen.getByRole('searchbox', { name: INPUT_NAME }),
      'zzqxzzqx',
    );
    await waitFor(() =>
      expect(container.querySelectorAll(SITE_EMPTY)).toHaveLength(1),
    );
    const message = container.querySelector(SITE_EMPTY)!;
    const text = message.textContent ?? '';
    // The two verdicts the contract spells out: the message must name the
    // prose surface AND the entity surface, not only modules.
    expect(text).toMatch(/article|page|module/i);
    expect(text).toMatch(/method|compan|dataset|entit/i);
    expect(text).toContain('zzqxzzqx');
  });

  it('offers a keyboard-reachable recovery affordance to a browse destination', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={structuredWith([])}
        debounceMs={0}
      />,
    );
    await user.type(
      screen.getByRole('searchbox', { name: INPUT_NAME }),
      'zzqxzzqx',
    );
    await waitFor(() =>
      expect(container.querySelector(SITE_EMPTY)).not.toBeNull(),
    );
    const message = container.querySelector(SITE_EMPTY)!;
    const recovery = within(message as HTMLElement).getByRole('link');
    expect(recovery.getAttribute('href')).toMatch(/^\/a-z/);
    expect(recovery).toHaveAccessibleName(/a-z/i);
    recovery.focus();
    expect(recovery).toHaveFocus();
  });

  it('keeps the per-group notes, so each group still says what it found', async () => {
    const user = userEvent.setup();
    render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={structuredWith([])}
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
      await screen.findByText(/no structured entities match/i),
    ).toBeInTheDocument();
  });
});

describe('VAL-SEARCH-023 (c): a type facet is narrowing the results', () => {
  async function narrowToDatasets() {
    const user = userEvent.setup();
    const view = render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={structuredWith([company(), METHOD_HIT])}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: INPUT_NAME }), 'act');
    await screen.findByRole('link', { name: /^Figure AI/ });
    await user.click(screen.getByRole('button', { name: /^Datasets$/ }));
    return { user, ...view };
  }

  it('names the filter instead of claiming nothing matches', async () => {
    const { container } = await narrowToDatasets();
    const structured = screen.getByRole('region', { name: 'Structured' });
    const text = structured.textContent ?? '';
    expect(text).toMatch(/filter/i);
    // The site-wide "nothing at all matched" message must not claim the
    // corpus is empty while two unfiltered entity matches exist.
    expect(container.querySelectorAll(SITE_EMPTY)).toHaveLength(0);
    expect(screen.getByRole('status')).not.toHaveTextContent(
      /no modules match/i,
    );
  });

  it('exposes a keyboard-reachable clear control that restores the unfiltered results', async () => {
    const { user } = await narrowToDatasets();
    const structured = screen.getByRole('region', { name: 'Structured' });
    expect(
      within(structured).queryByRole('link', { name: /^Figure AI/ }),
    ).not.toBeInTheDocument();

    const clear = within(structured).getByRole('button', {
      name: /clear the type filter/i,
    });
    clear.focus();
    expect(clear).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(
      within(structured).getByRole('link', { name: /^Figure AI/ }),
    ).toBeInTheDocument();
    // Bound by destination: the result's accessible name now carries the
    // snippet as well as the title, so an exact-anchored name match on the
    // title alone matches nothing.
    expect(
      structured.querySelector(
        'a[href="/manipulation/comparison-matrix/#method-act"]',
      ),
    ).toBeInTheDocument();
    expect(
      within(structured).queryByRole('button', {
        name: /clear the type filter/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('falls back to the both-empty message when the facet is not what emptied the group', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SearchInterface
        loadClient={clientWith(() => Promise.resolve([]))}
        loadStructured={() =>
          Promise.resolve({
            search: async (query: string) =>
              query.startsWith('figure') ? [company()] : [],
          })
        }
        debounceMs={0}
      />,
    );
    const input = screen.getByRole('searchbox', { name: INPUT_NAME });
    await user.type(input, 'figure');
    await screen.findByRole('link', { name: /^Figure AI/ });
    // Narrowed: unfiltered results exist, so the clear control is offered
    // and the site-wide message stays away.
    await user.click(screen.getByRole('button', { name: /^Methods$/ }));
    expect(
      screen.getByRole('button', { name: /clear the type filter/i }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(SITE_EMPTY)).toHaveLength(0);

    // Now the corpus itself is empty under the same active facet: the
    // filter is no longer the reason, so the clear control gives way to
    // the both-empty message.
    await user.clear(input);
    await user.type(input, 'zzqxzzqx');
    await waitFor(() =>
      expect(container.querySelectorAll(SITE_EMPTY)).toHaveLength(1),
    );
    expect(
      screen.queryByRole('button', { name: /clear the type filter/i }),
    ).not.toBeInTheDocument();
  });
});
