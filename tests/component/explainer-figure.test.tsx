import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EXPLAINER_ORDER } from '@/components/explainers/catalog';
import { ExplainerFigure } from '@/components/explainers/explainer-figure';
import { EXPLAINER_MOUNTS } from '@/components/explainers/mounts';
import { EXPLAINER_WORDS, type ExplainerWords } from '@/components/explainers/words';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';

// The 3D kit needs WebGL; the mount's served markup is what this file checks.
vi.mock('@/components/explainers/viewer', () => ({ startExplainers: async () => () => {} }));
vi.mock('@/components/explainers/explainers.css', () => ({}));

const page = (body: string) => `<!doctype html><html><body><main>${body}</main></body></html>`;

describe('ExplainerFigure, an explainer mounted in its home article', () => {
  for (const { id } of EXPLAINER_ORDER) {
    const words: ExplainerWords = EXPLAINER_WORDS[id];
    const html = page(renderToStaticMarkup(<ExplainerFigure id={id} />));

    it(`#${id} sits in the shared figure frame with no figure-system violation`, () => {
      const { figures, violations } = inspectFigureDocument(html, `/${EXPLAINER_MOUNTS[id].article}/`);
      expect(figures).toEqual([`explainer-${id}`]);
      expect(violations.map(formatViolation)).toEqual([]);
      const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
      expect(mainViewSymbolHits(frame)).toEqual([]);
    });

    it(`#${id} serves its question, caption, poster, first step, steps and parts without WebGL`, () => {
      const { document } = new JSDOM(html).window;
      const frame = document.querySelector('[data-figure-frame]')!;
      expect(frame.getAttribute('data-explainer-mount')).toBe(id);
      expect(frame.getAttribute('role')).toBe('group');
      expect(frame.getAttribute('aria-label')).toBe(words.question);
      expect(frame.querySelector('[data-figure-stage]')!.classList.contains('explainers')).toBe(true);
      expect(frame.querySelector('[data-figure-title]')!.textContent).toBe(words.question);
      expect(frame.querySelector('[data-figure-caption]')!.textContent).toBe(EXPLAINER_MOUNTS[id].caption);
      const poster = frame.querySelector<HTMLImageElement>('[data-x="poster"]')!;
      expect(poster.getAttribute('src')).toBe(`/explainers/posters/${id}.webp`);
      expect(poster.getAttribute('alt')).toBe(words.steps[0]);
      expect(poster.getAttribute('loading')).toBe('lazy');
      expect(frame.querySelector('[data-x="stepText"]')!.textContent).toBe(words.steps[0]);
      expect(frame.querySelector<HTMLButtonElement>('[data-x="prev"]')!.disabled).toBe(true);
      // The start button stays hidden until the viewer runs and finds WebGL.
      expect(frame.querySelector('[data-x="start"]')!.hasAttribute('hidden')).toBe(true);
      const method = frame.querySelector('details[data-figure-fold="method"]')!;
      expect(method.hasAttribute('open')).toBe(false);
      expect([...method.querySelectorAll(`[data-explainer-text="${id}"] > li`)].map((li) => li.textContent)).toEqual([...words.steps]);
      expect([...method.querySelectorAll('[data-explainer-parts] > li')].map((li) => li.textContent)).toEqual([...(words.parts ?? [])]);
      expect(method.querySelector('[data-x="how"]')).not.toBeNull();
      // The viewer drives the mount through the same hooks as the gallery and the home embed.
      for (const hook of ['explainer', 'stage', 'status', 'poster', 'start', 'dots', 'stepText', 'prev', 'next', 'summary', 'sentence', 'concept', 'checkQ', 'checkA']) {
        expect(frame.querySelectorAll(`[data-x="${hook}"]`), hook).toHaveLength(1);
      }
      expect(frame.querySelector('[data-x="pagerPrev"], [data-x="kicker"], [data-rail-id]')).toBeNull();
    });
  }
});
