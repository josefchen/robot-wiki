import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { labelledSeriesIds, seriesLabelNames, type SeriesLabelEvidence } from '@/lib/brand-v2-interactive-data';
import { legendSeriesIds, seriesEncodingViolations, seriesEncodings, seriesLabels, seriesNames } from '../helpers/series-encoding';

/**
 * Planted figures for the jsdom side of VAL-B2-VIZ-004: a series is labelled
 * only by visible rendered text tied to it, never by a marker attribute on
 * the series. Each plant is one plotted line plus whatever claims to name it.
 */
function Plant({ series = <polyline data-series="tree" points="0,0 10,10" fill="none" stroke="currentColor" />, children }: { series?: ReactNode; children?: ReactNode }) {
  return (
    <figure data-figure-frame="plant">
      <svg viewBox="0 0 100 100" role="img" aria-label="Planted figure">
        {series}
        {children}
      </svg>
    </figure>
  );
}

function LegendPlant({ item }: { item: ReactNode }) {
  return (
    <figure data-figure-frame="plant">
      <svg viewBox="0 0 100 100" role="img" aria-label="Planted figure">
        <polyline data-series="tree" points="0,0 10,10" fill="none" stroke="currentColor" />
      </svg>
      <div data-instrument-legend>{item}</div>
    </figure>
  );
}

const UNLABELLED = 'series "tree" has neither a legend entry nor an in-plot label';

describe('series-encoding helper: only visible rendered text labels a series (VAL-B2-VIZ-004)', () => {
  it('fails a series that carries the old marker attribute and no text', () => {
    const { container } = render(
      <Plant series={<polyline data-series="tree" data-series-labelled="" points="0,0 10,10" fill="none" stroke="currentColor" />} />,
    );
    expect(seriesEncodings(container).tree.labelled).toBe(false);
    expect(seriesNames(container)).toEqual({});
    expect(seriesEncodingViolations(container)).toEqual([UNLABELLED]);
  });

  it('fails a series whose only nearby text is not tied to it', () => {
    const { container } = render(
      <Plant>
        <text x="20" y="20">the tree</text>
      </Plant>,
    );
    expect(seriesEncodingViolations(container)).toEqual([UNLABELLED]);
  });

  it('fails a series held inside a group whose text is not tied to it', () => {
    const { container } = render(
      <Plant
        series={
          <g data-series="tree">
            <polyline points="0,0 10,10" fill="none" stroke="currentColor" />
            <text x="20" y="20">the tree</text>
          </g>
        }
      />,
    );
    expect(seriesEncodingViolations(container)).toEqual([UNLABELLED]);
  });

  it.each([
    ['aria-hidden', <text key="t" data-series-label-for="tree" aria-hidden="true">the tree</text>, 'aria-hidden'],
    ['screen-reader only', <text key="t" data-series-label-for="tree" className="sr-only">the tree</text>, 'screen-reader only'],
    ['not displayed', <text key="t" data-series-label-for="tree" style={{ display: 'none' }}>the tree</text>, 'not displayed'],
    ['hidden by visibility', <text key="t" data-series-label-for="tree" visibility="hidden">the tree</text>, 'visibility hidden'],
    ['transparent', <text key="t" data-series-label-for="tree" opacity="0">the tree</text>, 'opacity 0'],
    ['unpainted', <text key="t" data-series-label-for="tree" fill="none">the tree</text>, 'unpainted'],
    ['sized to nothing', <text key="t" data-series-label-for="tree" fontSize="0">the tree</text>, 'no box'],
    ['only a title', <g key="t" data-series-label-for="tree"><title>the tree</title></g>, 'not rendered'],
  ])('fails a tied in-plot label that is %s', (_, label, reason) => {
    const { container } = render(<Plant>{label}</Plant>);
    expect(seriesLabels(container)).toEqual([
      { seriesIds: ['tree'], via: 'label-for', visibleText: '', inPlot: false, hidden: [`"the tree": ${reason}`] },
    ]);
    expect(seriesEncodingViolations(container)).toEqual([UNLABELLED]);
  });

  it('fails tied text that is only a numeral or only a colour name', () => {
    for (const words of ['128', 'blue']) {
      const { container, unmount } = render(
        <Plant>
          <text data-series-label-for="tree">{words}</text>
        </Plant>,
      );
      expect(seriesEncodingViolations(container), words).toEqual([UNLABELLED]);
      unmount();
    }
  });

  it('fails tied text outside the drawing that is not a legend entry', () => {
    const { container } = render(
      <figure data-figure-frame="plant">
        <svg viewBox="0 0 100 100" role="img" aria-label="Planted figure">
          <polyline data-series="tree" points="0,0 10,10" fill="none" stroke="currentColor" />
        </svg>
        <p data-series-label-for="tree">the tree</p>
      </figure>,
    );
    expect(seriesEncodingViolations(container)).toEqual([UNLABELLED]);
  });

  it('fails a legend entry that is hidden or names no series', () => {
    for (const item of [
      <span key="a" data-legend-item data-legend-series="tree" aria-hidden="true">Tree: every branch</span>,
      <span key="b" data-legend-item data-legend-series="tree" className="sr-only">Tree: every branch</span>,
      <span key="c" data-legend-item>Tree: every branch</span>,
    ]) {
      const { container, unmount } = render(<LegendPlant item={item} />);
      expect(legendSeriesIds(container)).toEqual([]);
      expect(seriesEncodingViolations(container)).toEqual([UNLABELLED]);
      unmount();
    }
  });

  it('passes a visible in-plot label tied to the series', () => {
    const { container } = render(
      <Plant>
        <text data-series-label-for="tree">the tree</text>
      </Plant>,
    );
    expect(seriesEncodings(container).tree.labelled).toBe(true);
    expect(seriesNames(container)).toEqual({ tree: ['the tree'] });
    expect(seriesEncodingViolations(container)).toEqual([]);
  });

  it('passes a visible legend entry that names the series, which still does not count as in-plot', () => {
    const { container } = render(<LegendPlant item={<span data-legend-item data-legend-series="tree">Thin lines: the tree</span>} />);
    expect(legendSeriesIds(container)).toEqual(['tree']);
    expect(seriesEncodings(container).tree.labelled).toBe(false);
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});

describe('seriesLabelNames and labelledSeriesIds', () => {
  const label = (over: Partial<SeriesLabelEvidence>): SeriesLabelEvidence => ({
    seriesIds: ['tree'],
    via: 'label-for',
    visibleText: 'the tree',
    inPlot: true,
    hidden: [],
    ...over,
  });

  it('names a series only with visible words, and a label-for text only inside the plot', () => {
    expect(seriesLabelNames(label({}))).toBe(true);
    expect(seriesLabelNames(label({ visibleText: '' }))).toBe(false);
    expect(seriesLabelNames(label({ visibleText: '4,096' }))).toBe(false);
    expect(seriesLabelNames(label({ visibleText: 'red' }))).toBe(false);
    expect(seriesLabelNames(label({ inPlot: false }))).toBe(false);
    expect(seriesLabelNames(label({ via: 'legend', inPlot: false }))).toBe(true);
  });

  it('keeps the in-plot and legend routes apart', () => {
    const labels = [label({ seriesIds: ['a'] }), label({ seriesIds: ['b'], via: 'legend', inPlot: false })];
    expect([...labelledSeriesIds(labels, 'label-for')]).toEqual(['a']);
    expect([...labelledSeriesIds(labels, 'legend')]).toEqual(['b']);
    expect([...labelledSeriesIds(labels)].sort()).toEqual(['a', 'b']);
  });
});
