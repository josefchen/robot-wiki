import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import Home from '@/app/page';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { COMPANIES } from '@/data/companies';
import { HOME_FEATURED_PICKS } from '@/data/home-featured';
import { DEVELOPMENTS, DEVELOPMENTS_FROM } from '@/data/now';
import { DOMAINS, DOMAIN_META, getModule, publishedModules } from '@/data/modules';
import { GLOSSARY } from '@/data/glossary';
import { citedSourceIds, homeCounts } from '@/lib/home-counts';
import { latestChanges, readableDate } from '@/lib/home-updates';
import {
  CONTENT_CORRECTION_URL,
  PUBLIC_DESCRIPTOR,
  PUBLIC_IDENTITY,
  REPOSITORY_URL,
} from '@/lib/identity';

/** next/link and jsdom disagree about trailing slashes; the path is what matters. */
const path = (href: string | null) => (href ?? '').replace(/\/$/, '');
const words = (text: string) => text.split(/\s+/).filter(Boolean);

function region(name: RegExp) {
  return screen.getByRole('region', { name });
}

describe('Home page', () => {
  beforeEach(() => mockPush.mockClear());

  it('holds its six sections in order, each named by its own heading', () => {
    render(<Home />);
    const main = document.body.firstElementChild as HTMLElement;
    const sections = [...main.querySelectorAll(':scope > section')].map((section) => {
      const labelledBy = section.getAttribute('aria-labelledby');
      return (
        section.getAttribute('aria-label') ??
        (labelledBy ? document.getElementById(labelledBy)?.textContent ?? '' : '')
      ).trim();
    });
    expect(sections).toEqual([
      'Introduction',
      'Contents',
      'Start here',
      'Also in the wiki',
      'Latest',
      'How this wiki is made',
    ]);
    // One h1, then the section heads, then the entries under them.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1], `heading ${index}`).toBeLessThanOrEqual(1);
    }
  });

  it('opens with the identity line and registry counts', () => {
    render(<Home />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe(PUBLIC_IDENTITY);
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
      name: 'Search articles, sources and glossary',
    }) as HTMLInputElement;
    // the name comes from one persistent visible label, not
    // from an aria-label or the placeholder.
    expect(box).not.toHaveAttribute('aria-label');
    expect(box).not.toHaveAttribute('aria-labelledby');
    expect(box.labels).toHaveLength(1);
    expect(box.labels?.[0]?.textContent?.trim()).toBe('Search articles, sources and glossary');
    expect(box.labels?.[0]?.htmlFor).toBe(box.id);
    expect(box.placeholder).not.toBe(box.labels?.[0]?.textContent?.trim());
    await user.type(box, 'diffusion policy');
    await user.click(within(form).getByRole('button', { name: 'Search' }));
    expect(mockPush).toHaveBeenCalledWith('/search/?q=diffusion%20policy');
  });

  it('opens on words alone: no scene, picture or canvas anywhere in the page', () => {
    render(<Home />);
    const intro = region(/^introduction$/i);
    // The introduction is the lockup and the search, and nothing else.
    expect([...intro.children].filter((el) => el.tagName !== 'SCRIPT').map((el) => el.className)).toEqual([
      'home-lockup',
      'home-find',
    ]);
    expect(document.querySelector('[data-explainer-scene], [data-explainers]')).toBeNull();
    expect(document.querySelector('img, picture, svg, canvas, video')).toBeNull();
    expect(intro.querySelector('button:not([type="submit"])')).toBeNull();
  });

  it('lists every domain with its scope and every article as a plain link, first after the introduction', () => {
    render(<Home />);
    const contents = region(/^contents$/i);
    expect(contents).toHaveAttribute('id', 'contents');
    expect(contents.previousElementSibling).toBe(region(/^introduction$/i));
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
    // Every published article, once, under the seven domains in registry order.
    expect([...contents.querySelectorAll('[data-contents-domain]')].map((el) => el.getAttribute('data-contents-domain'))).toEqual([...DOMAINS]);
    expect(contents.querySelectorAll('ul a')).toHaveLength(publishedModules().length);
  });

  it('starts the reader at four editor picks, hottest first, each with its title and short dek', () => {
    render(<Home />);
    const start = region(/^start here$/i);
    const entries = start.querySelectorAll('[data-start-here]');
    expect([...entries].map((entry) => entry.getAttribute('data-start-here'))).toEqual([
      'world-models/taxonomy',
      'manipulation/vla-models',
      'rl-sim2real/humanoid-wbc',
      'frontier/reliability-gap',
    ]);
    entries.forEach((entry, index) => {
      const pick = HOME_FEATURED_PICKS[index];
      const title = getModule(pick.domain, pick.slug)?.title ?? '';
      const heading = within(entry as HTMLElement).getByRole('heading', { level: 3, name: title });
      const link = within(heading).getByRole('link', { name: title });
      expect(path(link.getAttribute('href'))).toBe(`/${pick.domain}/${pick.slug}`);
      const dek = entry.querySelector('[data-featured-dek]')?.textContent ?? '';
      expect(dek).toBe(pick.dek);
      expect(words(dek).length).toBeLessThanOrEqual(14);
      // One link an entry: the title.
      expect(within(entry as HTMLElement).getAllByRole('link')).toHaveLength(1);
    });
    expect(screen.queryByRole('region', { name: /featured article/i })).toBeNull();
  });

  it('names the six parts of the site that are not articles, each a plain link and a line counted from its registry', () => {
    render(<Home />);
    const also = region(/^also in the wiki$/i);
    const counts = homeCounts();
    const expected = [
      ['now', 'Robotics now', '/now', `${DEVELOPMENTS.length} developments since ${readableDate(DEVELOPMENTS_FROM)}.`],
      ['how-robots-work', 'How robots work', '/how-robots-work', `${EXPLAINER_ORDER.length} short explainers`],
      ['market-map', 'Market map', '/market-map', `${COMPANIES.length} companies`],
      ['playground', 'Playground', '/playground', 'robot arm'],
      ['glossary', 'Glossary', '/glossary', `${GLOSSARY.length} terms`],
      ['a-z', 'A to Z index', '/a-z', `All ${publishedModules().length} articles`],
    ] as const;
    expect([...also.querySelectorAll('[data-also]')].map((el) => el.getAttribute('data-also'))).toEqual(
      expected.map(([key]) => key),
    );
    for (const [key, name, href, line] of expected) {
      const entry = also.querySelector(`[data-also="${key}"]`) as HTMLElement;
      const link = within(entry).getByRole('heading', { level: 3, name }).querySelector('a');
      expect(path(link?.getAttribute('href') ?? null)).toBe(href);
      expect(within(entry).getAllByRole('link')).toHaveLength(1);
      expect(entry.textContent).toContain(line);
    }
    expect(counts.explainers).toBe(EXPLAINER_ORDER.length);
    expect(counts.companies).toBe(COMPANIES.length);
    expect(counts.developments).toBe(DEVELOPMENTS.length);
    expect(counts.developmentsSince).toBe(readableDate(DEVELOPMENTS_FROM));
    expect(EXPLAINER_ORDER).toHaveLength(12);
  });

  it('lists the five latest changes with readable dates and any editor note', () => {
    render(<Home />);
    const latest = region(/^latest$/i);
    const items = within(latest).getAllByRole('listitem');
    const expected = latestChanges(5);
    expect(items).toHaveLength(5);
    items.forEach((item, index) => {
      const change = expected[index];
      const time = item.querySelector('time');
      expect(time?.getAttribute('datetime')).toBe(change.date);
      expect(time?.textContent).toBe(readableDate(change.date));
      expect(time?.textContent).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
      const link = within(item).getByRole('link');
      expect(link).toHaveTextContent(change.title);
      expect(path(link.getAttribute('href'))).toBe(`/${change.domain}/${change.slug}`);
      expect(item.querySelector('[data-latest-note]')?.textContent).toBe(change.note);
    });
  });

  it('says how the wiki is made in three statements, each backed by a page or a form', () => {
    render(<Home />);
    const made = region(/^how this wiki is made$/i);
    const statements = [...made.querySelectorAll('[data-made]')];
    expect(statements.map((el) => el.getAttribute('data-made'))).toEqual(['sources', 'licenses', 'corrections']);
    expect(statements.map((el) => el.querySelector('.home-statement')?.textContent)).toEqual([
      'Every number has a source.',
      'Text is CC BY 4.0, code is MIT.',
      'Corrections are welcome.',
    ]);
    const links = within(made)
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')?.replace(/^(\/[a-z-]+)\/$/, '$1')]);
    expect(links).toEqual([
      ['Editorial policy', '/editorial-policy'],
      ['Credits', '/credits'],
      ['Source on GitHub', REPOSITORY_URL],
      ['Report an error', CONTENT_CORRECTION_URL],
    ]);
    expect(CONTENT_CORRECTION_URL).toContain('template=content-correction.yml');
  });

  it('links only to routes the site has', () => {
    render(<Home />);
    const routes = new Set([
      ...DOMAINS.map((domain) => `/${domain}`),
      ...publishedModules().map((entry) => `/${entry.domain}/${entry.slug}`),
      '/how-robots-work',
      '/now',
      '/market-map',
      '/playground',
      '/glossary',
      '/a-z',
      '/editorial-policy',
      '/credits',
    ]);
    const internal = [...document.querySelectorAll('a[href^="/"]')].map((a) => path(a.getAttribute('href')));
    expect(internal.length).toBeGreaterThan(publishedModules().length);
    for (const href of internal) expect(routes.has(href), href).toBe(true);
  });

  it('carries no reading guide, mission statement or old product name', () => {
    render(<Home />);
    const main = document.body.textContent ?? '';
    expect(main).not.toMatch(/how to read|reading order|prerequisites|atlas/i);
    expect(main).not.toContain('a citation is not a guarantee of verification');
    expect(main).not.toMatch(/[–—]/);
  });
});
