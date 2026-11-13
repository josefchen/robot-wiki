import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
const { startExplainers } = vi.hoisted(() => ({
  startExplainers: vi.fn<(root: Element, embed?: unknown) => Promise<() => void>>(async () => () => {}),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
// The 3D kit needs WebGL; home's served markup and the viewer call are what this file checks.
vi.mock('@/components/explainers/viewer', () => ({ startExplainers }));
vi.mock('@/components/explainers/explainers.css', () => ({}));

import Home from '@/app/page';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { EXPLAINER_WORDS } from '@/components/explainers/words';
import { COMPANIES } from '@/data/companies';
import { DID_YOU_KNOW } from '@/data/did-you-know';
import { HOME_FEATURED_PICKS, HOME_FEATURED_SCENE } from '@/data/home-featured';
import { getImage } from '@/data/images';
import { DOMAINS, DOMAIN_META, getModule, publishedModules } from '@/data/modules';
import { GLOSSARY } from '@/data/glossary';
import { citedSourceIds } from '@/lib/home-counts';
import { latestChanges, readableDate } from '@/lib/home-updates';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';

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
    expect(sections).toEqual(['Introduction', 'Start here', 'Latest', 'Contents', 'Did you know', 'Explore']);
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
    // DI-COMP-004: the name comes from one persistent visible label, not
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

  it('sets the humanoid explainer in the first section, on its poster, with no 3D kit until the reader starts it', async () => {
    startExplainers.mockClear();
    render(<Home />);
    const intro = region(/^introduction$/i);
    const frame = within(intro).getByRole('group', { name: '3D explainer: Inside a humanoid' });
    expect(frame).toHaveAttribute('data-explainer-scene', 'humanoid');
    // The served stage is the explainer's poster and its first step as text.
    const poster = within(frame).getAllByRole('img')[0];
    expect(poster).toHaveAttribute('src', '/explainers/posters/humanoid.webp');
    expect(poster).toHaveAttribute('alt', EXPLAINER_WORDS.humanoid.steps[0]);
    expect(poster).toHaveAttribute('width');
    expect(poster).toHaveAttribute('height');
    expect(frame.querySelector('[data-step-text]')?.textContent).toBe(EXPLAINER_WORDS.humanoid.steps[0]);
    // The stepper caption is the scene's description.
    expect(document.getElementById(frame.getAttribute('aria-describedby') ?? '')).toBe(
      frame.querySelector('[data-step-text]'),
    );
    expect(frame.querySelector('canvas')).toBeNull();
    const start = frame.querySelector<HTMLButtonElement>('[data-x="start"]');
    expect(start?.textContent).toBe(HOME_FEATURED_SCENE.startLabel);
    // The stepper keeps its names.
    expect(within(frame).getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(within(frame).getByRole('button', { name: 'Next' })).toBeInTheDocument();
    // The viewer opens the one scene and waits for the start button.
    await waitFor(() => expect(startExplainers).toHaveBeenCalledTimes(1));
    expect(startExplainers).toHaveBeenCalledWith(frame.querySelector('[data-explainers]'), { scene: 'humanoid' });
    const section = within(frame).getByRole('link', {
      name: `All ${EXPLAINER_ORDER.length} explainers in How robots work`,
    });
    expect(path(section.getAttribute('href'))).toBe('/how-robots-work');
    expect(EXPLAINER_ORDER).toHaveLength(12);
  });

  it('starts the reader at four editor picks, hottest first, each with its own picture, title and short dek', () => {
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
      // The picture is the article's registered image, with real alt text and its size set.
      const img = within(entry as HTMLElement).getByRole('img');
      const registered = getImage(pick.imageId);
      expect(img).toHaveAttribute('src', registered?.file);
      expect(img).toHaveAttribute('width', String(registered?.width));
      expect(img).toHaveAttribute('height', String(registered?.height));
      expect(words(img.getAttribute('alt') ?? '').length).toBeGreaterThan(5);
      // Every picture sits in the same 3:2 frame.
      expect(pick.crop.width / pick.crop.height).toBeCloseTo(1.5, 2);
      // Its credit names the creator and links the licence.
      const credit = entry.querySelector('[data-image-credit]');
      expect(credit?.textContent).toContain(registered?.creator);
      expect(credit?.querySelector(`a[href="${registered?.licenceUrl}"]`)).not.toBeNull();
    });
    expect(screen.queryByRole('region', { name: /featured article/i })).toBeNull();
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

  it('lists every domain with its scope and every article as a plain link', () => {
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

  it('explores the explainers, the market map and the playground, each with a picture of itself', () => {
    render(<Home />);
    const explore = region(/^explore$/i);
    const expected = [
      ['how-robots-work', 'How robots work', '/how-robots-work'],
      ['market-map', 'Market map', '/market-map'],
      ['playground', 'Playground', '/playground'],
    ] as const;
    for (const [key, name, href] of expected) {
      const entry = explore.querySelector(`[data-explore="${key}"]`) as HTMLElement;
      const link = within(entry).getByRole('link', { name });
      expect(path(link.getAttribute('href'))).toBe(href);
      const picture = within(entry).getByRole('img');
      expect(words(picture.getAttribute('alt') ?? picture.getAttribute('aria-label') ?? '').length).toBeGreaterThan(5);
    }
    // The playground's picture is the grey SO-101 arm of the reaching explainer, not the lime-marked one.
    const arm = within(explore.querySelector('[data-explore="playground"]') as HTMLElement).getByRole('img');
    expect(arm).toHaveAttribute('src', '/explainers/posters/reaching.webp');
    const map = explore.querySelector('[data-explore="market-map"]') as HTMLElement;
    expect(map.textContent).toContain(`${COMPANIES.length} companies`);
    expect(map.querySelectorAll('.square')).toHaveLength(COMPANIES.length);
    expect(explore.querySelector('[data-explore="how-robots-work"]')?.textContent).toContain(
      `${EXPLAINER_ORDER.length} short explainers`,
    );
  });

  it('carries no reading guide, mission statement or old product name', () => {
    render(<Home />);
    const main = document.body.textContent ?? '';
    expect(main).not.toMatch(/how to read|reading order|prerequisites|atlas/i);
    expect(main).not.toContain('a citation is not a guarantee of verification');
    expect(main).not.toMatch(/[–—]/);
  });
});
