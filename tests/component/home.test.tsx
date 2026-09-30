import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import Home from '@/app/page';
import { DID_YOU_KNOW } from '@/data/did-you-know';
import { DOMAINS, DOMAIN_META, publishedModules } from '@/data/modules';
import { GLOSSARY } from '@/data/glossary';
import { citedSourceIds } from '@/lib/home-counts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';

/** next/link and jsdom disagree about trailing slashes; the path is what matters. */
const path = (href: string | null) => (href ?? '').replace(/\/$/, '');

function region(name: RegExp) {
  return screen.getByRole('region', { name });
}

describe('Home page', () => {
  beforeEach(() => mockPush.mockClear());

  it('opens with the identity line and registry counts', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { level: 1, name: PUBLIC_IDENTITY }),
    ).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_DESCRIPTOR)).toBeInTheDocument();
    const counts = document.querySelector('[data-home-counts]');
    expect(counts?.textContent).toContain(`${publishedModules().length} articles`);
    expect(counts?.textContent).toContain(`${citedSourceIds().size} sources`);
    expect(counts?.textContent).toContain(`${GLOSSARY.length} glossary terms`);
  });

  it('searches the wiki from a labelled box', async () => {
    const user = userEvent.setup();
    render(<Home />);
    const form = screen.getByRole('search', { name: 'Search the wiki' });
    const box = within(form).getByRole('searchbox', {
      name: 'Search articles, sources and glossary terms',
    });
    await user.type(box, 'diffusion policy');
    await user.click(within(form).getByRole('button', { name: 'Search' }));
    expect(mockPush).toHaveBeenCalledWith('/search/?q=diffusion%20policy');
  });

  it('lists every domain with its description and every article as a plain link', () => {
    render(<Home />);
    const contents = region(/^contents$/i);
    for (const domain of DOMAINS) {
      const entry = contents.querySelector(`[data-contents-domain="${domain}"]`);
      expect(entry, domain).not.toBeNull();
      const name = within(entry as HTMLElement).getByRole('link', {
        name: DOMAIN_META[domain].name,
      });
      expect(path(name.getAttribute('href'))).toBe(`/${domain}`);
      expect((name.parentElement?.textContent ?? '').length).toBeGreaterThan(
        DOMAIN_META[domain].name.length + 10,
      );
      const list = within(entry as HTMLElement).getByRole('list');
      const hrefs = within(list)
        .getAllByRole('link')
        .map((link) => path(link.getAttribute('href')));
      expect(hrefs).toEqual(
        publishedModules()
          .filter((entry) => entry.domain === domain)
          .map((entry) => `/${domain}/${entry.slug}`),
      );
      expect(list.querySelector('img, svg, [data-brand-surface-id]')).toBeNull();
    }
  });

  it('features one article lead of 50 words or fewer with a link', () => {
    render(<Home />);
    const featured = region(/featured article/i);
    expect(within(featured).getAllByRole('link')).toHaveLength(1);
    const excerpt = featured.querySelector('[data-featured-excerpt]');
    const words = (excerpt?.textContent ?? '').split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThan(5);
    expect(words.length).toBeLessThanOrEqual(50);
  });

  it('features one scene that waits for the reader to press play', () => {
    render(<Home />);
    const scene = region(/featured scene/i);
    expect(within(scene).getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.queryByTestId('episode-success-readout')).not.toBeInTheDocument();
  });

  it('holds three cited facts, each linked to its article', () => {
    render(<Home />);
    const facts = region(/did you know/i).querySelectorAll('[data-did-you-know]');
    expect(facts).toHaveLength(3);
    facts.forEach((fact, index) => {
      const { domain, slug, citationId } = DID_YOU_KNOW[index];
      const links = within(fact as HTMLElement).getAllByRole('link');
      expect(links.map((link) => path(link.getAttribute('href')))).toContain(
        `/${domain}/${slug}`,
      );
      expect(fact.querySelector(`[data-cite-id="${citationId}"]`)).not.toBeNull();
    });
  });

  it('lists five dated article changes', () => {
    render(<Home />);
    const items = within(region(/recently updated/i)).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.querySelector('time[datetime]')).not.toBeNull();
      expect(within(item).getAllByRole('link')).toHaveLength(1);
    }
  });

  it('links the playground and the market map from one plain tools line', () => {
    render(<Home />);
    const tools = region(/^tools$/i);
    expect(path(within(tools).getByRole('link', { name: 'Playground' }).getAttribute('href'))).toBe('/playground');
    expect(path(within(tools).getByRole('link', { name: 'Market Map' }).getAttribute('href'))).toBe('/market-map');
    expect(tools.querySelector('img, svg, article, figure')).toBeNull();
  });

  it('carries no reading guide, mission statement or old product name', () => {
    render(<Home />);
    const main = document.body.textContent ?? '';
    expect(main).not.toMatch(/how to read|reading order|prerequisites|atlas/i);
    expect(main).not.toContain('a citation is not a guarantee of verification');
  });
});
