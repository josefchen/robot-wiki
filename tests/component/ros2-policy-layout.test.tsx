import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { Ros2PolicyLayout } from '@/components/interactive/ros2-policy-layout';
import { mainViewSymbolHits, mainViewText } from '@/lib/figure-main-view';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { citationRecords } from '@/lib/widget-citations';

const SOURCE_IDS = [
  'ros2-qos-2026',
  'tf2-docs-2026',
  'tf2-time-tutorial-2026',
  'ros2-realtime-docs-2026',
  'ros2-lifecycle-design-2015',
  'ros2-interfaces-2026',
];
const records = citationRecords(SOURCE_IDS);
const withRecords = (ui: ReactElement) => (
  <CitationRecordsProvider records={records}>{ui}</CitationRecordsProvider>
);

/** Plain stage label and the ROS 2 name the method fold pairs it with. */
const NODES = [
  ['camera and joint sensors', 'camera and joint drivers'],
  ['gathers the latest readings', 'state assembly'],
  ['AI that suggests moves', 'policy server'],
  ['safety check', 'command gate'],
  ['drives the motors', 'controller bridge'],
  ['robot arm', 'robot hardware'],
] as const;

/** Parts the drawing leaves out, which the method fold still names. */
const LEFT_OUT = [
  ['task manager', 'supervisor'],
  ['arm positions', 'tf2 frame tree'],
] as const;

/** The only two link labels on the stage. */
const EDGE_LABELS = ['suggested moves', 'checked moves only'];

/** The delivery details that moved from the stage into the method fold, each kept in plain words. */
const MOVED_TO_FOLD = [
  'Camera pictures and joint positions; late readings may be skipped.',
  'The newest readings, checked to be recent.',
  'Suggested moves, all delivered.',
  'Checked moves, the only path to the motors.',
  'Motor commands at steady, exact intervals.',
  'give the arm position at the moment each photo was taken.',
  'The task manager (the supervisor) takes the task request.',
  'The task manager starts and stops these three parts: the AI that suggests moves, the safety check and the part that drives the motors.',
];

/** ROS 2 vocabulary that belongs in the method fold, never on the stage. */
const TECHNICAL = /\b(topic|tf2|lifecycle|QoS|best effort|reliable|policy|node|supervisor|gate|controller|driver)/i;

describe('Ros2PolicyLayout', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('ROS 2 software layout');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      "The AI's moves pass a safety check first",
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Separate parts let engineers test, stop or swap the AI without touching what moves the robot.',
    );
    expect(container.querySelector('[data-figure-status]')).toHaveTextContent(
      'Schematic: one recommended layout, not a required one',
    );
  });

  it('shows no controls: no header controls, no adjust fold, no buttons or inputs', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    expect(container.querySelector('[data-figure-controls]')).toBeNull();
    expect(container.querySelector('details[data-figure-fold="adjust"]')).toBeNull();
    expect(container.querySelectorAll('button, input, select, textarea, [role="button"]')).toHaveLength(0);
  });

  it('draws the chain to a robot arm in plain words and names the parts it leaves out in the fold', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    const graph = screen.getByTestId('ros2-policy-graph');
    for (const [label] of NODES) expect(graph).toHaveTextContent(label);
    const method = container.querySelector('details[data-figure-fold="method"]') as HTMLElement;
    for (const [label, name] of NODES) expect(method).toHaveTextContent(`"${label}" is the ${name}`);
    for (const [label, name] of LEFT_OUT) {
      expect(graph).not.toHaveTextContent(label);
      expect(method).toHaveTextContent(`the ${name}, a "${label}"`);
    }
    for (const id of ['drivers', 'state', 'policy', 'gate', 'bridge', 'hardware']) {
      expect(container.querySelector(`[data-node="${id}"]`), id).not.toBeNull();
    }
    for (const id of ['supervisor', 'tf2-store']) expect(container.querySelector(`[data-node="${id}"]`), id).toBeNull();
    // The motors are a drawn arm, not a second box beside the part that drives them.
    expect(container.querySelector('[data-node="hardware"] rect + path, [data-node="hardware"] circle')).not.toBeNull();
    expect(container.querySelectorAll('[data-node] > rect[height="30"]')).toHaveLength(5);
  });

  it('labels every edge in plain words and keeps the ROS 2 terms off the stage', () => {
    render(withRecords(<Ros2PolicyLayout />));
    const texts = Array.from(screen.getByTestId('ros2-policy-graph').querySelectorAll('text')).map(
      (t) => t.textContent ?? '',
    );
    expect(texts.filter((text) => !NODES.some(([label]) => label === text) && !/Every|move is|here first/.test(text)))
      .toEqual(EDGE_LABELS);
    expect(texts.filter((text) => TECHNICAL.test(text))).toEqual([]);
    const note = screen.getByTestId('ros2-policy-graph').querySelector('[data-figure-annotation]');
    expect(note).toHaveTextContent('Every suggestedmove is checkedhere first');
    expect(note?.querySelector('[data-annotation-pointer="arrow"] polygon')).not.toBeNull();
  });

  it('keeps every delivery detail the stage dropped in plain words in the method fold', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    const plain = Array.from(container.querySelectorAll('[data-edge-plain]')).map((el) => el.textContent ?? '');
    expect(plain).toHaveLength(8);
    for (const detail of MOVED_TO_FOLD) expect(plain.some((text) => text.includes(detail)), detail).toBe(true);
  });

  it('backs each legend entry with marks of the same series', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    const series = Array.from(container.querySelectorAll('[data-legend-series]')).map((el) =>
      el.getAttribute('data-legend-series') ?? '',
    );
    expect(series).toEqual(['sensing', 'commands']);
    for (const id of series) {
      expect(container.querySelector(`svg [data-series="${id}"] path`), id).not.toBeNull();
    }
    expect(container.querySelectorAll('[data-series="sensing"] [data-edge]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-series="commands"] [data-edge]')).toHaveLength(3);
    // Owner-approved successor (figure standard of 2026-10-10): sensing and
    // moves are both ink, so sensor data is dashed and moves are solid, and
    // each legend swatch carries the dash of its series.
    expect(container.querySelectorAll('[data-series="sensing"] path[stroke-dasharray]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-series="commands"] [stroke-dasharray]')).toHaveLength(0);
    expect(container.querySelector('[data-legend-series="sensing"] svg path')?.getAttribute('stroke-dasharray')).not.toBeNull();
    expect(container.querySelector('[data-legend-series="commands"] svg path')?.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('puts every QoS detail and a linked source for each citation in the method fold', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    const method = container.querySelector('details[data-figure-fold="method"]') as HTMLElement;
    expect(method).not.toBeNull();
    expect(method).toHaveTextContent('best effort and a smaller queue');
    expect(method).toHaveTextContent('reliable and keeps the last 10 messages');
    expect(method).toHaveTextContent('after a 50 ms timeout');
    for (const record of records) {
      const link = method.querySelector(`a[data-source-id="${record.id}"]`);
      expect(link, record.id).not.toBeNull();
      expect(link).toHaveAttribute('href', record.url);
      expect(link).toHaveTextContent(record.label);
    }
    const graph = screen.getByTestId('ros2-policy-graph');
    const describedBy = graph.getAttribute('aria-describedby') ?? '';
    const description = container.querySelector(`[id="${describedBy}"]`);
    expect(description).toHaveAttribute('data-chart-description');
    expect(method).toContainElement(description as HTMLElement);
    expect(graph).toHaveAttribute('role', 'img');
    expect(graph.getAttribute('aria-label')).toMatch(/^ROS 2 graph for a learned policy/);
  });

  it('passes the figure-system check with a plain-words main view', () => {
    const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
      withRecords(<Ros2PolicyLayout />),
    )}</main></body></html>`;
    const { figures, violations } = inspectFigureDocument(html, '/classical/ros2-for-ml-engineers/');
    expect(figures).toEqual(['ros2-policy-layout']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]');
    expect(frame).not.toBeNull();
    const { lines } = mainViewText(frame as Element);
    for (const line of ["The AI's moves pass a safety check first", 'safety check', 'checked moves only']) {
      expect(lines).toContain(line);
    }
    for (const moved of [/50 ms|last 10/, /late readings|steady, exact|task manager|starts and stops/]) {
      expect(lines.some((line) => moved.test(line))).toBe(false);
    }
    expect(mainViewSymbolHits(frame as Element)).toEqual([]);
  });
});
