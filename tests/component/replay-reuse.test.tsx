import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { ROUNDS, ReplayReuse, usableBatches } from '@/components/interactive/replay-reuse';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('ReplayReuse');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<ReplayReuse />, { wrapper: Wrapper });
const originalMatchMedia = window.matchMedia;
function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('ReplayReuse', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('On-policy and off-policy');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Off-policy learners reuse experience; on-policy ones discard it');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'On-policy learners like PPO discard each batch after use; off-policy learners keep every batch for reuse.',
    );
  });

  it('lets the on-policy update use only the newest batch and the off-policy update all of them', () => {
    expect(ROUNDS).toBe(6);
    expect([1, 3, 6].map((r) => usableBatches('on', r))).toEqual([1, 1, 1]);
    expect([1, 3, 6].map((r) => usableBatches('off', r))).toEqual([1, 3, 6]);
  });

  it('opens on the on-policy learner after six rounds and replays the rounds when the learner changes', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('replay-stage')).toHaveAttribute('data-learner', 'on');
    expect(container.querySelectorAll('[data-batch]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-batch][data-usable]')).toHaveLength(1);
    expect(screen.getByTestId('replay-count')).toHaveTextContent('learns from 1 of 6 batches');
    expect(screen.queryByTestId('replay-buffer')).toBeNull();
    const off = screen.getByTestId('replay-learner-off');
    fireEvent.click(off);
    expect(off).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('replay-stage')).toHaveAttribute('data-learner', 'off');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Every batch stays in a replay buffer');
    expect(container.querySelectorAll('[data-batch]').length).toBeLessThan(6);
  });

  it('jumps to the sixth round under reduced motion', () => {
    mockReducedMotion(true);
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('replay-learner-off'));
    expect(container.querySelectorAll('[data-batch][data-usable]')).toHaveLength(6);
    expect(screen.getByTestId('replay-count')).toHaveTextContent('learns from 6 of 6 batches');
    expect(screen.getByTestId('replay-buffer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('replay-learner-on'));
    expect(container.querySelectorAll('[data-batch][data-usable]')).toHaveLength(1);
    expect(screen.queryByTestId('replay-buffer')).toBeNull();
  });

  it('describes the stage and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /batches of robot experience/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('only the newest batch, 1 of 6');
    const links = [...screen.getByTestId('replay-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('ReplayReuse served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><ReplayReuse /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/rl-for-robotics/');
    expect(figures).toEqual(['replay-reuse']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
