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
import { DID_YOU_KNOW } from '@/data/did-you-know';
import { HOME_FEATURED_PICKS, HOME_FEATURED_SCENE } from '@/data/home-featured';
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
      name: 'Search articles, sources and glossary',
    }) as HTMLInputElement;
    // VAL-B2-COMP-004: the name comes from one persistent visible label, not
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

  it("features the editor's first pick with one link and its dek of 25 words or fewer", () => {
    render(<Home />);
    const featured = region(/featured article/i);
    const links = within(featured).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('What Is a World Model?');
    expect(path(links[0].getAttribute('href'))).toBe('/world-models/taxonomy');
    const dek = featured.querySelector('[data-featured-dek]');
    expect(dek?.textContent).toBe(HOME_FEATURED_PICKS[0].dek);
    const words = (dek?.textContent ?? '').split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThan(5);
    expect(words.length).toBeLessThanOrEqual(25);
  });

  it('features the humanoid explainer on its poster, with no 3D kit until the reader starts it', async () => {
    startExplainers.mockClear();
    render(<Home />);
    const scene = region(/featured scene/i);
    const frame = within(scene).getByRole('group', { name: '3D explainer: Inside a humanoid' });
    expect(frame).toHaveAttribute('data-explainer-scene', 'humanoid');
    // The caption is the frame's description, and it is the one home's data holds.
    const caption = document.getElementById(frame.getAttribute('aria-describedby') ?? '');
    expect(caption?.textContent).toBe(HOME_FEATURED_SCENE.caption);
    // The served stage is the explainer's poster and its first step as text.
    const poster = within(frame).getByRole('img');
    expect(poster).toHaveAttribute('src', '/explainers/posters/humanoid.webp');
    expect(poster).toHaveAttribute('alt', EXPLAINER_WORDS.humanoid.steps[0]);
    expect(frame.querySelector('[data-step-text]')?.textContent).toBe(EXPLAINER_WORDS.humanoid.steps[0]);
    expect(frame.querySelector('canvas')).toBeNull();
    const start = frame.querySelector<HTMLButtonElement>('[data-x="start"]');
    expect(start?.textContent).toBe(HOME_FEATURED_SCENE.startLabel);
    // The viewer opens the one scene and waits for the start button.
    await waitFor(() => expect(startExplainers).toHaveBeenCalledTimes(1));
    expect(startExplainers).toHaveBeenCalledWith(frame.querySelector('[data-explainers]'), { scene: 'humanoid' });
  });

  it('links the full explainer section and credits the related article', () => {
    render(<Home />);
    const scene = region(/featured scene/i);
    const section = within(scene).getByRole('link', {
      name: `All ${EXPLAINER_ORDER.length} explainers in How robots work`,
    });
    expect(path(section.getAttribute('href'))).toBe('/how-robots-work');
    expect(EXPLAINER_ORDER).toHaveLength(12);
    const related = within(scene).getByRole('link', { name: 'Humanoid Whole-Body Control' });
    expect(path(related.getAttribute('href'))).toBe('/rl-sim2real/humanoid-wbc');
    expect(within(scene).getAllByRole('link')).toHaveLength(2);
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

  it('links the playground, the explainers and the market map from one plain tools line', () => {
    render(<Home />);
    const tools = region(/^tools$/i);
    expect(path(within(tools).getByRole('link', { name: 'Playground' }).getAttribute('href'))).toBe('/playground');
    expect(path(within(tools).getByRole('link', { name: 'How robots work' }).getAttribute('href'))).toBe('/how-robots-work');
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
