import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { QosQueueAge, pictureAgeS } from '@/components/interactive/qos-queue-age';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('QosQueueAge');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<QosQueueAge />, { wrapper: Wrapper });

describe('QosQueueAge', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Quality of Service');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Deep queues feed the robot old pictures');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "A deep queue hands the model old pictures first, so log each picture's age at the model.",
    );
  });

  it('ages the used picture by queue depth over the camera rate', () => {
    expect(pictureAgeS(10)).toBeCloseTo(1 / 3);
    expect(pictureAgeS(1)).toBeCloseTo(1 / 30);
  });

  it('opens on the ROS 2 default: ten pictures queued, the oldest used, a third of a second old', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('qos-queue-ten')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('[data-picture]')).toHaveLength(10);
    expect(container.querySelectorAll('[data-picture="used"]')).toHaveLength(1);
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('0.33 seconds old');
  });

  it('switches to keeping only the newest picture with the preset row', () => {
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('qos-queue-one'));
    expect(screen.getByTestId('qos-queue-one')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent('0.03 seconds old');
    const stage = screen.getByRole('img', { name: /queue that holds one picture/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'acts on a picture 0.03 seconds old',
    );
  });

  it('links the queue default to its source', () => {
    renderFigure();
    expect(screen.getByTestId('qos-source').querySelector('a')).toHaveAttribute('href', records[0].url);
  });
});

describe('QosQueueAge served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <QosQueueAge />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/ros2-for-ml-engineers/');
    expect(figures).toEqual(['qos-queue-age']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
