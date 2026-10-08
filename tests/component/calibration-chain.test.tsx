import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { CalibrationChain } from '@/components/interactive/calibration-chain';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits, mainViewText } from '@/lib/figure-main-view';
import { citationRecords } from '@/lib/widget-citations';

const CITATION_IDS = ['humanoid-geometric-calibration-2025', 'omnicalib-2026', 'khoshelham-kinect-2012'];
const records = citationRecords(CITATION_IDS);

function Wrapper({ children }: { children: ReactNode }) {
  return <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>;
}

function renderFigure() {
  return render(<CalibrationChain />, { wrapper: Wrapper });
}

const stageOf = (container: HTMLElement) =>
  container.querySelector('[data-testid="calibration-chain-stage"]') as SVGSVGElement;
const methodOf = (container: HTMLElement) =>
  container.querySelector('details[data-figure-fold="method"]') as HTMLElement;
const textsOf = (root: Element) =>
  Array.from(root.querySelectorAll('text')).map((t) => t.textContent?.trim() ?? '');

describe('CalibrationChain', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Calibration chain');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'An error in any link moves where the gripper lands',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'A robot reaches what its camera sees only through these links, so each one needs calibrating and checking.',
    );
    expect(container.querySelector('[data-figure-status]')).toHaveTextContent(
      'Schematic: errors from three different studies, not one robot',
    );
  });

  it('has no visible controls and no "Adjust more" fold', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-controls]')).toBeNull();
    expect(container.querySelector('details[data-figure-fold="adjust"]')).toBeNull();
    const controls = Array.from(container.querySelectorAll('button, input, select, textarea'));
    expect(controls).toEqual([]);
  });

  it('draws the four links between the five labelled frames', () => {
    const { container } = renderFigure();
    const stage = stageOf(container);
    expect(stage).toHaveAttribute('role', 'img');
    const links = Array.from(stage.querySelectorAll('[data-link]')).map((g) => [
      g.getAttribute('data-link'),
      g.getAttribute('data-series'),
    ]);
    expect(links).toEqual([
      ['base-wrist', 'robot-links'],
      ['wrist-camera', 'camera-links'],
      ['camera-object', 'camera-links'],
      ['wrist-tip', 'robot-links'],
    ]);
    const frames = Array.from(stage.querySelectorAll('[data-frame] text')).map((t) => t.textContent);
    expect(frames).toEqual(['robot base', 'wrist', 'camera', 'gripper tip', 'object']);
    const texts = textsOf(stage);
    for (const label of [
      'joint readings and link lengths',
      'hand-eye calibration',
      'what the camera measures',
      'tool offset',
    ]) {
      expect(texts).toContain(label);
    }
  });

  it('writes each sourced error on its link and keeps the rest in the method fold', () => {
    const { container } = renderFigure();
    const notes = (id: string) =>
      Array.from(stageOf(container).querySelectorAll(`[data-link-note="${id}"]`))
        .map((t) => t.textContent)
        .join(' ');
    expect(notes('base-wrist')).toBe("calibration cut a humanoid's error 2.3-fold");
    expect(notes('wrist-camera')).toBe('drawing values off by up to 10.56 mm');
    expect(notes('camera-object')).toBe('depth noise up to about 4 cm');
    expect(notes('wrist-tip')).toBe('checked by touching one point from several angles');
    const method = methodOf(container);
    expect(method).toHaveTextContent('1.74 degrees');
    expect(method).toHaveTextContent('31 chosen postures');
    expect(method).toHaveTextContent('No source here reports a measured error for the tool offset');
    expect(method).toHaveTextContent('storing each calibration together with its residuals');
    const hrefs = Array.from(method.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(records.map((record) => record.url));
  });

  it('backs each legend entry with marks of the same series and paint', () => {
    const { container } = renderFigure();
    const stage = stageOf(container);
    const entries = Array.from(container.querySelectorAll('[data-legend-series]'));
    expect(entries.map((e) => e.getAttribute('data-legend-series'))).toEqual(['robot-links', 'camera-links']);
    for (const entry of entries) {
      const series = entry.getAttribute('data-legend-series');
      const swatch = entry.querySelector('svg path');
      const marks = Array.from(stage.querySelectorAll(`[data-series="${series}"] path[fill="none"]`));
      expect(marks.length, series ?? '').toBe(2);
      for (const mark of marks) {
        expect(mark.getAttribute('stroke')).toBe(swatch?.getAttribute('stroke'));
        expect(mark.getAttribute('stroke-dasharray')).toBeNull();
      }
      expect(swatch?.getAttribute('stroke-dasharray')).toBeNull();
    }
  });

  it('points one plain-words note at the object and describes the stage', () => {
    const { container } = renderFigure();
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent('The gripper mustreach this point');
    const stage = stageOf(container);
    const described = stage.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(described)).toHaveTextContent('Four calibrated links join the robot base');
    expect(methodOf(container)).toContainElement(document.getElementById(described));
    expect(screen.getByRole('img', { name: /robot arm with a camera on its wrist/ })).toBe(stage);
  });
});

describe('CalibrationChain served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <CalibrationChain />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/calibration/');
    expect(figures).toEqual(['calibration-chain']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
    const lines = mainViewText(frame).lines;
    expect(lines).toContain('drawing values off by up to 10.56 mm');
    expect(lines.some((line) => line.includes('1.74'))).toBe(false);
  });
});
