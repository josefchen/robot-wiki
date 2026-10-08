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
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Camera-to-hand chain');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'A wrong measurement anywhere makes the hand miss the box',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'The robot reaches what its camera sees only through these measurements, so each one must be checked.',
    );
    expect(container.querySelector('[data-figure-status]')).toHaveTextContent(
      'Schematic: not drawn to scale',
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
    expect(frames).toEqual(['robot arm', 'wrist', 'camera', 'hand', 'box']);
    const names = Array.from(stage.querySelectorAll('[data-link-label]')).map((g) => [
      g.getAttribute('data-link-label'),
      textsOf(g).join(' '),
    ]);
    expect(names).toEqual([
      ['base-wrist', 'how far each joint turns, and how long each arm part is'],
      ['wrist-camera', 'where the camera is fixed on the wrist'],
      ['camera-object', "the camera's measure of how far away the box is"],
      ['wrist-tip', 'how far the fingertips reach'],
    ]);
  });

  it('sets each link name beside its part, with no leader line to drift on a wide stage', () => {
    const { container } = renderFigure();
    const stage = stageOf(container);
    for (const label of stage.querySelectorAll('[data-link-label]')) {
      expect(label.querySelector('line, path'), label.getAttribute('data-link-label') ?? '').toBeNull();
    }
    // Only the spot the hand must reach carries a dot; the hand carries none.
    expect(stage.querySelectorAll('[data-frame] circle')).toHaveLength(1);
    expect(stage.querySelector('[data-frame="object"] circle')).not.toBeNull();
    expect(stage.querySelectorAll('[data-scene-part="joint"]')).toHaveLength(2);
    // The drawing is capped, so its type-scale container keeps labels beside their parts.
    expect(stage.parentElement).toHaveClass('@container');
  });

  it('keeps every technical name, sourced error and caveat in the method fold', () => {
    const { container } = renderFigure();
    const stageText = textsOf(stageOf(container)).join(' ');
    for (const moved of ['2.3', '10.56', '4 cm', 'calibration', 'tool offset']) {
      expect(stageText).not.toContain(moved);
    }
    const method = methodOf(container);
    for (const kept of [
      'set by joint readings and link lengths',
      'set by hand-eye calibration',
      'set by what the camera measures (depth)',
      'set by tool offset',
      'cut its RMS error 2.3-fold',
      'off by up to 10.56 mm',
      'to about 4 cm at its maximum range',
      'touching one point with the gripper tip from several angles',
    ]) {
      expect(method).toHaveTextContent(kept);
    }
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
    expect(notes[0]).toHaveTextContent('The hand mustreach this spot');
    expect(notes[0].querySelector('[data-annotation-pointer="arrow"] polygon')).not.toBeNull();
    expect(notes[0].querySelector('circle')).toBeNull();
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
    expect(lines).toContain('fixed on the wrist');
    expect(lines.some((line) => /1\.74|10\.56|2\.3-fold/.test(line))).toBe(false);
  });
});
