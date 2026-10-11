import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { LISTED_SOLVERS, MATERIALS, NewtonSolvers } from '@/components/interactive/newton-solvers';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('NewtonSolvers');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<NewtonSolvers />, { wrapper: Wrapper });

describe('NewtonSolvers', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Multi-solver physics');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('One physics library, one solver per material');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Newton routes each material to its own solver, such as MuJoCo Warp for robot joints.',
    );
  });

  it("routes each material to the solver the sources name, out of the overview's eight", () => {
    expect(MATERIALS.map((m) => [m.id, m.solver.join(' ')])).toEqual([
      ['robot', 'MuJoCo Warp'],
      ['linkage', 'Kamino'],
      ['cloth', 'VBD'],
      ['continuum', 'implicit MPM'],
    ]);
    expect(LISTED_SOLVERS).toHaveLength(8);
  });

  it('opens on robot arms and moves the route with the one preset row', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('newton-stage')).toHaveAttribute('data-material', 'robot');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Robot arms and legs go to MuJoCo Warp');
    expect(container.querySelectorAll('[data-solver]')).toHaveLength(4);
    const cloth = screen.getByTestId('newton-material-cloth');
    fireEvent.click(cloth);
    expect(cloth).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('newton-stage')).toHaveAttribute('data-material', 'cloth');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Cloth and cables go to VBD');
    expect(container.querySelector('[data-chosen]')).toHaveAttribute('data-material-column', 'cloth');
    fireEvent.click(screen.getByTestId('newton-material-continuum'));
    expect(screen.getByRole('img', { name: /sand-like materials go to implicit MPM/ })).toBeInTheDocument();
  });

  it('describes the stage and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Newton interface/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('4 of the 8 solvers');
    const links = [...screen.getByTestId('newton-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('NewtonSolvers served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><NewtonSolvers /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/parallel-sim-rl/');
    expect(figures).toEqual(['newton-solvers']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
