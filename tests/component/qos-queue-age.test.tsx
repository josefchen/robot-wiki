import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import {
  CYCLE_S,
  QosQueueAge,
  STILL_NEWEST,
  STILL_POSE,
  SWAP_S,
  pictureAgeS,
  poseAt,
} from '@/components/interactive/qos-queue-age';
import { DROP_REST, FED_Z, LIFT, PITCH, scaleX, slotX } from '@/components/iso/figures/picture-queue';
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
    expect(container.querySelector('[data-readout]')).toHaveTextContent('0.33 seconds old');
  });

  it('hands the model the oldest card, as many frames old as the queue is deep', () => {
    const { container } = renderFigure();
    const used = container.querySelector('[data-picture="used"]')!;
    expect(used).toHaveAttribute('data-frame', String(STILL_NEWEST - 9));
    expect(used).toHaveAttribute('data-age', '10');
    const frames = Array.from(container.querySelectorAll('[data-picture]')).map((card) => Number(card.getAttribute('data-frame')));
    expect(Math.max(...frames)).toBe(STILL_NEWEST);
    expect(new Set(frames).size).toBe(10);
    // The picture the model is handed is the one lit part.
    const lit = container.querySelectorAll('svg [data-lit]');
    expect(lit).toHaveLength(1);
    expect(used).toContainElement(lit[0] as HTMLElement);
  });

  it('puts the camera as many slots from the pick slot as the queue keeps pictures', () => {
    // The scale reads k frames at slot k + 1, so its zero is the pick slot.
    expect(scaleX(0)).toBe(slotX(1));
    expect(scaleX(10) - scaleX(0)).toBe(-10 * PITCH);
  });

  it('switches to keeping only the newest picture with the preset row', () => {
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('qos-queue-one'));
    expect(screen.getByTestId('qos-queue-one')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('0.03 seconds old');
    expect(container.querySelectorAll('[data-picture]')).toHaveLength(1);
    expect(container.querySelector('[data-picture="used"]')).toHaveAttribute('data-age', '1');
    const stage = screen.getByRole('img', { name: /queue that holds one picture/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'acts on a picture 0.03 seconds old',
    );
  });

  it('runs one camera frame per cycle and comes back to the still pose', () => {
    expect(poseAt(0)).toEqual(STILL_POSE);
    // Before the swap the picked card is fed all the way into the reader and the row has moved one slot.
    const swap = poseAt(SWAP_S - 1e-6);
    expect(swap.picked[1]).toBeCloseTo(FED_Z);
    expect(swap.row).toBeCloseTo(PITCH);
    expect(swap.drop).toBe(0);
    expect(swap.head).toBeCloseTo(0);
    // After the swap the bench is one frame later, lifting the new oldest card back to the still pose.
    expect(poseAt(SWAP_S).row).toBe(0);
    expect(poseAt(SWAP_S).drop).toBe(DROP_REST);
    const end = poseAt(CYCLE_S - 1e-6);
    expect(end.picked[1]).toBeCloseTo(LIFT, 3);
    expect(end.grip).toBeCloseTo(LIFT, 3);
  });

  it('starts and stops the bench from a reader control, never by itself', () => {
    renderFigure();
    const run = screen.getByTestId('qos-run');
    expect(run).toHaveTextContent('Run the queue');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the queue');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the queue');
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
