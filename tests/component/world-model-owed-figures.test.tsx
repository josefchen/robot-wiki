import { render, screen, within } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { ModelBasedLoop } from '@/components/interactive/model-based-loop';
import { WorldModelEvaluationLadder } from '@/components/interactive/world-model-evaluation-ladder';
import { WorldModelOutputTimes } from '@/components/interactive/world-model-output-times';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords, type CitingWidget } from '@/lib/widget-citations';
import { outputTimeX, WORLD_MODEL_OUTPUT_TIMES } from '@/lib/world-model-figures';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const FIGURES = [
  { name: 'ModelBasedLoop', Component: ModelBasedLoop, id: 'model-based-loop', route: '/world-models/model-based-robot-learning/', marks: 6 },
  { name: 'WorldModelEvaluationLadder', Component: WorldModelEvaluationLadder, id: 'world-model-evaluation-ladder', route: '/world-models/evaluation/', marks: 5 },
  { name: 'WorldModelOutputTimes', Component: WorldModelOutputTimes, id: 'world-model-output-times', route: '/world-models/world-models-vs-simulators/', marks: 6 },
] as const;

for (const { name, Component, id, route, marks } of FIGURES) {
  const node = <CitationRecordsProvider records={widgetCitationRecords(name as CitingWidget)}><Component /></CitationRecordsProvider>;
  describe(name, () => {
    it('serves its full description and method while the disclosure starts closed', () => {
      render(node);
      const stage = screen.getByTestId(`${id}-stage`);
      const description = document.getElementById(stage.getAttribute('aria-describedby')!);
      expect(description).not.toBeNull();
      expect(description!.textContent!.length).toBeGreaterThan(stage.getAttribute('aria-label')!.length);
      const frame = stage.closest('[data-figure-frame]')!;
      expect(frame.querySelector('[data-figure-fold="method"]')).not.toHaveAttribute('open');
      const links = [...frame.querySelectorAll('[data-figure-source] a')];
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) expect(link).toHaveAttribute('rel', 'noopener');
      expect(frame.querySelectorAll('[data-scene-readout]').length).toBeLessThanOrEqual(3);
    });

    it('passes the figure-system and plain main-view checks in served HTML', () => {
      const html = `<!doctype html><html><body><main>${renderToStaticMarkup(node)}</main></body></html>`;
      const checked = inspectFigureDocument(html, route);
      expect(checked.figures).toEqual([id]);
      expect(checked.violations.map(formatViolation)).toEqual([]);
      expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
    });

    it('names every series in the plot and distinguishes them without colour (VAL-B2-VIZ-002/004)', () => {
      const { container } = render(node);
      expect(Object.keys(seriesEncodings(container))).toHaveLength(marks);
      expect(seriesEncodingViolations(container)).toEqual([]);
    });
  });
}

describe('world-model figure source semantics', () => {
  it('closes the online learning loop while disclosing replay and update timing', () => {
    render(<CitationRecordsProvider records={widgetCitationRecords('ModelBasedLoop')}><ModelBasedLoop /></CitationRecordsProvider>);
    const stage = screen.getByTestId('model-based-loop-stage');
    expect([...stage.querySelectorAll('[data-series]')].map(el => el.getAttribute('data-series'))).toEqual([
      'encode', 'predict', 'score', 'act', 'observe', 'update',
    ]);
    expect(stage.querySelectorAll('[marker-end] path')).toHaveLength(6);
    expect(document.querySelector('[data-figure-fold="method"]')).toHaveTextContent('model updates need not follow every action');
    expect(stage).toHaveTextContent('Real experience closes the loop');
  });

  it('keeps the SimFoundry correlation on rung 4 and separates it from success or safety', () => {
    render(<CitationRecordsProvider records={widgetCitationRecords('WorldModelEvaluationLadder')}><WorldModelEvaluationLadder /></CitationRecordsProvider>);
    expect(screen.getByTestId('evaluation-rung-4')).toHaveTextContent('4. Policy ranking');
    const stage = screen.getByTestId('world-model-evaluation-ladder-stage');
    expect(stage).toHaveTextContent('SimFoundry: 0.911 correlation');
    expect(stage).toHaveTextContent('7 tasks, 5 policy architectures');
    const method = document.querySelector('[data-figure-fold="method"]')!;
    expect(method).toHaveTextContent('rank violation 0.018');
    expect(method).toHaveTextContent('Neither number is a success percentage or proof of safety');
    expect(stage).not.toHaveTextContent('91.1%');
  });

  it('preserves measured output types, hardware, upper bounds and derived totals', () => {
    expect(WORLD_MODEL_OUTPUT_TIMES.map(row => [row.id, row.seconds, row.kind])).toEqual([
      ['3dgs', 0.01, 'upper-bound'], ['dreamzero', 0.15, 'reported'], ['1xwm', 12, 'derived'],
      ['vjepa2', 16, 'reported'], ['predict2', 85.26, 'reported'], ['cosmos-planner', 240, 'reported'],
    ]);
    expect(WORLD_MODEL_OUTPUT_TIMES[0].hardware).toBe('A6000');
    expect(WORLD_MODEL_OUTPUT_TIMES[1].hardware).toBe('Two GB200 GPUs');
    expect(WORLD_MODEL_OUTPUT_TIMES[2].note).toContain('11 + 1 = 12 seconds');
    expect(WORLD_MODEL_OUTPUT_TIMES[2].note).toContain('GPU model and count are not disclosed');
    expect(WORLD_MODEL_OUTPUT_TIMES.filter(row => row.output === 'planned action').map(row => row.hardware)).toEqual(['1 RTX 4090', '1 RTX 4090']);
    expect(WORLD_MODEL_OUTPUT_TIMES[4].note).toContain('480p and 16 frames per second');
  });

  it('uses equal distances for equal ratios and never plots zero on the logarithmic axis', () => {
    expect(outputTimeX(1) - outputTimeX(0.1)).toBeCloseTo(outputTimeX(10) - outputTimeX(1), 12);
    expect(outputTimeX(0.01)).toBe(12);
    expect(outputTimeX(300)).toBeCloseTo(328, 12);
    for (const value of [0, -1, Infinity, NaN]) expect(() => outputTimeX(value)).toThrow('positive finite');
  });

  it('maps the published times to their log coordinates with a bound arrow and matching table', () => {
    render(<CitationRecordsProvider records={widgetCitationRecords('WorldModelOutputTimes')}><WorldModelOutputTimes /></CitationRecordsProvider>);
    const stage = screen.getByTestId('world-model-output-times-stage');
    for (const [id, seconds] of [['dreamzero', 0.15], ['1xwm', 12], ['vjepa2', 16], ['predict2', 85.26], ['cosmos-planner', 240]] as const) {
      const dot = screen.getByTestId(`output-time-${id}`).querySelector('circle')!;
      expect(Number(dot.getAttribute('cx'))).toBeCloseTo(12 + Math.log10(seconds / 0.01) / Math.log10(300 / 0.01) * 316, 2);
    }
    const bound = screen.getByTestId('output-time-3dgs');
    expect(bound.querySelector('circle')).toBeNull();
    expect(bound).toHaveTextContent('at most 0.01 second');
    expect(stage.querySelectorAll('[data-scene-tick]')).toHaveLength(5);
    const table = screen.getByRole('table', { hidden: true });
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(7);
    expect(table).toHaveTextContent('85.26 seconds');
    expect(table).toHaveTextContent('five-second action rollout');
  });
});
