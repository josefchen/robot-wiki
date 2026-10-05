import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HowRobotsWorkPage, { metadata } from '@/app/how-robots-work/page';
import { EXPLAINER_CURRICULUM, EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { EXPLAINER_WORDS } from '@/components/explainers/words';

// The 3D kit needs WebGL; the page's served markup is what this file checks.
vi.mock('@/components/explainers/viewer', () => ({ startExplainers: async () => () => {} }));
vi.mock('@/components/explainers/explainers.css', () => ({}));

const GROUPS = ['Body', 'Move', 'Touch', 'Sense', 'Learn'];
const ORDER = ['arm', 'humanoid', 'hand', 'reaching', 'upright', 'flying', 'path', 'grip', 'mug', 'whereami', 'puppeteer', 'worlds'];

describe('/how-robots-work/ page', () => {
  it('has the title, description and learning-resource JSON-LD', () => {
    const { container } = render(<HowRobotsWorkPage />);
    expect(String(metadata.title)).toMatch(/^How Robots Work: /);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(70);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    const ld = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(ld['@type']).toBe('LearningResource');
    expect(ld.url).toBe('https://robot-wiki.com/how-robots-work/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How robots work');
  });

  it('lists the twelve explainers in curriculum order under the five groups', () => {
    render(<HowRobotsWorkPage />);
    expect(EXPLAINER_CURRICULUM.map(({ group }) => group)).toEqual(GROUPS);
    expect(EXPLAINER_ORDER.map(({ id }) => id)).toEqual(ORDER);
    const rail = screen.getByRole('navigation', { name: 'Explainers' });
    expect(within(rail).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(GROUPS);
    expect(within(rail).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(ORDER.map((id) => `#${id}`));
  });

  it('serves every explainer as text inside the search index', () => {
    const { container } = render(<HowRobotsWorkPage />);
    const text = container.querySelector('[data-explainer-words]')!;
    expect(text.closest('[data-pagefind-body]')).not.toBeNull();
    for (const id of ORDER) {
      const words = EXPLAINER_WORDS[id as keyof typeof EXPLAINER_WORDS];
      const entry = text.querySelector(`[data-explainer-text="${id}"]`)!;
      expect(within(entry as HTMLElement).getByRole('link', { name: words.question })).toHaveAttribute('href', `#${id}`);
      expect(entry.querySelectorAll('ol > li')).toHaveLength(words.steps.length);
      expect(entry.querySelectorAll('[data-explainer-parts] > li')).toHaveLength('parts' in words ? words.parts.length : 0);
    }
  });
});
