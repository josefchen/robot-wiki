import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import {
  CHANNELS,
  FINISHED,
  LINK_ENDS,
  MESSAGE_AT,
  PLAY_S,
  Ros2Interfaces,
  messageAt,
  poseAt,
} from '@/components/interactive/ros2-interfaces';
import { CAPSULE_REST, CARD_RUN, FLAG_RISE } from '@/components/iso/figures/node-link-bench';
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

/** The messages of the picked way of talking, in the order they are sent. */
const tokens = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-message]')).sort(
    (a, b) => Number(a.getAttribute('data-message')) - Number(b.getAttribute('data-message')),
  );
const messages = (container: HTMLElement) => tokens(container).map((t) => t.getAttribute('data-label'));
const directions = (container: HTMLElement) => tokens(container).map((t) => t.getAttribute('data-direction'));

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
    expect(directions(container)).toEqual(['right', 'left', 'left', 'left']);
    expect(container.querySelector('[data-readout]')).toHaveTextContent('it can be cancelled');
    // The goal rides the shuttle; progress and the result come back as the sender's three flags.
    expect(tokens(container).map((t) => t.closest('[data-testid]')?.getAttribute('data-testid'))).toEqual([
      'ros2-shuttle',
      'ros2-flag-0',
      'ros2-flag-1',
      'ros2-flag-2',
    ]);
  });

  it('shows a topic as a one-way stream and a service as one question and one answer', () => {
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('ros2-channel-topic'));
    expect(directions(container)).toEqual(['right', 'right', 'right', 'right']);
    expect(container.querySelector('[data-readout]')).toHaveTextContent('no reply');
    fireEvent.click(screen.getByTestId('ros2-channel-service'));
    expect(messages(container)).toEqual(['Is the gripper closed?', 'Yes']);
    expect(directions(container)).toEqual(['right', 'left']);
    expect(screen.getByRole('img', { name: /talking through a service/ })).toBeInTheDocument();
  });

  it('lights exactly one part: the message just sent', () => {
    const { container } = renderFigure();
    for (const id of ['topic', 'service', 'action'] as const) {
      fireEvent.click(screen.getByTestId(`ros2-channel-${id}`));
      const lit = container.querySelectorAll('svg [data-lit]');
      expect(lit, id).toHaveLength(1);
      const last = tokens(container).at(-1)!;
      expect(last).toContainElement(lit[0] as HTMLElement);
    }
  });

  it('jumps to the finished sequence under reduced motion', () => {
    const { container } = renderFigure();
    fireEvent.click(screen.getByTestId('ros2-channel-topic'));
    for (const group of container.querySelectorAll('[data-message]')) {
      expect(group.closest('[data-pose]')).toHaveAttribute('data-pose', 'finished');
    }
  });

  it('links the interfaces to their source', () => {
    renderFigure();
    expect(screen.getByTestId('ros2-interfaces-source').querySelector('a')).toHaveAttribute('href', records[0].url);
  });
});

describe('Ros2Interfaces motion', () => {
  it('sends every message in order and ends on the finished exchange', () => {
    for (const channel of CHANNELS) {
      const times = MESSAGE_AT[channel.id];
      expect(times, channel.id).toHaveLength(channel.messages.length);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(times.every((t) => t >= 0 && t < PLAY_S[channel.id])).toBe(true);
      expect(messageAt(channel.id, PLAY_S[channel.id])).toBe(channel.messages.length - 1);
      expect(poseAt(channel.id, PLAY_S[channel.id])).toEqual(FINISHED);
    }
  });

  it('starts each exchange inside its sender: nothing has arrived before it is sent', () => {
    expect(poseAt('service', 0).request).toBeLessThan(LINK_ENDS.from);
    expect(poseAt('service', 0).reply).toBeGreaterThan(LINK_ENDS.to);
    // The question has arrived before the answer leaves the receiver.
    expect(poseAt('service', MESSAGE_AT.service[1]).request).toBeCloseTo(CAPSULE_REST.request);
    expect(poseAt('service', MESSAGE_AT.service[1]).reply).toBeCloseTo(CARD_RUN.to);
    expect(poseAt('action', 0).shuttle).toBe(0);
    expect(poseAt('action', 0).flags).toEqual([0, 0, 0]);
    // Each flag climbs only once its own message is due.
    const mid = poseAt('action', MESSAGE_AT.action[2]);
    expect(mid.flags[0]).toBeCloseTo(FLAG_RISE);
    expect(mid.flags[1]).toBe(0);
    expect(mid.flags[2]).toBe(0);
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
