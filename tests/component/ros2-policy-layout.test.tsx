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

const NODE_LABELS = [
  'camera and joint drivers',
  'state assembly',
  'policy server',
  'command gate',
  'controller bridge',
  'supervisor',
];

const EDGE_LABELS = [
  'action: task goal with feedback and cancel',
  'topic: camera images, joint states',
  'sensor data: best effort, small queue',
  'tf2 lookup:',
  'frames at the',
  "image's timestamp",
  'topic: observation',
  'log message age here',
  'topic: proposed actions',
  'reliable',
  'topic: commands',
  'the only command publisher',
  'real-time loop',
  'lifecycle: start,',
  'stop, deactivate',
];

describe('Ros2PolicyLayout', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('ROS 2 policy layout');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Keep the model one gate away from the motors',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Separate nodes let you test, stop or swap the learned policy without touching drivers or the real-time controller.',
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

  it('draws the six nodes, the robot hardware and the tf2 store', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    const graph = screen.getByTestId('ros2-policy-graph');
    for (const label of [...NODE_LABELS, 'robot hardware', 'tf2 frame tree', 'task request']) {
      expect(graph).toHaveTextContent(label);
    }
    for (const id of ['drivers', 'state', 'policy', 'gate', 'bridge', 'hardware', 'supervisor', 'tf2-store']) {
      expect(container.querySelector(`[data-node="${id}"]`), id).not.toBeNull();
    }
    expect(container.querySelector('[data-node="tf2-store"] rect')).toBeNull();
  });

  it('labels every edge with its interface and its QoS or timing', () => {
    render(withRecords(<Ros2PolicyLayout />));
    const texts = Array.from(screen.getByTestId('ros2-policy-graph').querySelectorAll('text')).map(
      (t) => t.textContent,
    );
    for (const label of EDGE_LABELS) expect(texts, label).toContain(label);
    expect(screen.getByTestId('ros2-policy-graph').querySelector('[data-figure-annotation]')).toHaveTextContent(
      'Only the command gate talksto the controller',
    );
  });

  it('backs each legend entry with marks of the same series', () => {
    const { container } = render(withRecords(<Ros2PolicyLayout />));
    const series = Array.from(container.querySelectorAll('[data-legend-series]')).map((el) =>
      el.getAttribute('data-legend-series') ?? '',
    );
    expect(series).toEqual(['sensing', 'commands', 'lifecycle']);
    for (const id of series) {
      expect(container.querySelector(`svg [data-series="${id}"] path`), id).not.toBeNull();
    }
    expect(container.querySelectorAll('[data-series="sensing"] [data-edge]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-series="commands"] [data-edge]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-series="lifecycle"] [data-edge]')).toHaveLength(3);
    for (const path of container.querySelectorAll('[data-series="lifecycle"] path[fill="none"]')) {
      expect(path.getAttribute('stroke-dasharray')).not.toBeNull();
    }
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
    for (const line of ['Keep the model one gate away from the motors', 'sensor data: best effort, small queue', 'real-time loop']) {
      expect(lines).toContain(line);
    }
    expect(lines.some((line) => /50 ms|last 10/.test(line))).toBe(false);
    expect(mainViewSymbolHits(frame as Element)).toEqual([]);
  });
});
