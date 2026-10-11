import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { RetargetingGap, footGapCm } from '@/components/interactive/retargeting-gap';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('RetargetingGap');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<RetargetingGap />, { wrapper: Wrapper });

describe('RetargetingGap', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Motion retargeting');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent("Copied human poses misplace a robot's feet");
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "Joint-for-joint copies onto other proportions leave robot feet floating or sunk, which hurts tracking policies.",
    );
  });

  it('floats shorter legs, sinks longer ones and lands equal ones', () => {
    expect(footGapCm(75)).toBe(23);
    expect(footGapCm(100)).toBe(0);
    expect(footGapCm(120)).toBe(-18);
  });

  it('opens with floating feet and drives the gap from the one slider', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('retargeting-gap')).toBeInTheDocument();
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/Feet float\s*23 cm up/);
    const slider = screen.getByRole('slider', { name: /leg length as a percentage/ });
    fireEvent.change(slider, { target: { value: '100' } });
    expect(screen.getByTestId('retargeting-ratio')).toHaveTextContent('100% as long');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('Feet land');
    fireEvent.change(slider, { target: { value: '120' } });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('feet sink 18 cm into the floor'));
  });

  it('describes the stage and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /person walking, and a robot/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('float 23 cm above the floor');
    const links = [...screen.getByTestId('retargeting-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('RetargetingGap served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><RetargetingGap /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/humanoid-wbc/');
    expect(figures).toEqual(['retargeting-gap']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
