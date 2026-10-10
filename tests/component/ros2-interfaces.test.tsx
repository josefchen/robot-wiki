import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { Ros2Interfaces } from '@/components/interactive/ros2-interfaces';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('Ros2Interfaces');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<Ros2Interfaces />, { wrapper: Wrapper });
const original = window.matchMedia;

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const messages = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-message] text')).map((t) => t.textContent);

describe('Ros2Interfaces', () => {
  beforeEach(() => mockReducedMotion(true));
  afterEach(() => {
    window.matchMedia = original;
  });

  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('ROS 2 interfaces');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Nodes stream, ask, or run a job');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Use a stream for sensor data, a question for quick answers, an action for long tasks.',
    );
  });

  it('opens on the action: a goal, two progress updates and a result', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('ros2-channel-action')).toHaveAttribute('aria-pressed', 'true');
    expect(messages(container)).toEqual(['Goal: fetch the cup', 'Progress: 30%', 'Progress: 60%', 'Done: cup fetched']);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('it can be cancelled');
  });

  it('shows a topic as a one-way stream and a service as one question and one answer', () => {
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('ros2-channel-topic'));
    const directions = () => Array.from(container.querySelectorAll('[data-message]')).map((g) => g.getAttribute('data-direction'));
    expect(directions()).toEqual(['right', 'right', 'right', 'right']);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('no reply');
    fireEvent.click(screen.getByTestId('ros2-channel-service'));
    expect(messages(container)).toEqual(['Is the gripper closed?', 'Yes']);
    expect(directions()).toEqual(['right', 'left']);
    expect(screen.getByRole('img', { name: /talking through a service/ })).toBeInTheDocument();
  });

  it('jumps to the finished sequence under reduced motion', () => {
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('ros2-channel-topic'));
    for (const group of container.querySelectorAll('[data-message]')) expect(group).toHaveAttribute('opacity', '1');
  });

  it('links the interfaces to their source', () => {
    renderFigure();
    expect(screen.getByTestId('ros2-interfaces-source').querySelector('a')).toHaveAttribute('href', records[0].url);
  });
});

describe('Ros2Interfaces served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <Ros2Interfaces />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/ros2-for-ml-engineers/');
    expect(figures).toEqual(['ros2-interfaces']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
