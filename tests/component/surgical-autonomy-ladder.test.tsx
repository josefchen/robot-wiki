import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { SurgicalAutonomyLadder } from '@/components/interactive/surgical-autonomy-ladder';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import {
  AUTONOMY_LEVELS,
  HIGHEST_CLAIMED_LEVEL,
  HIGHEST_AUTHORIZED_LEVEL,
  LADDER_ENTRIES,
} from '@/lib/surgical-autonomy-ladder';
import { SURGICAL_SYSTEM_ROWS } from '@/lib/surgical-systems';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';

const records = widgetCitationRecords('SurgicalAutonomyLadder');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<SurgicalAutonomyLadder />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

describe('SurgicalAutonomyLadder', () => {
  it('places each system on its level and says who placed it', () => {
    expect(AUTONOMY_LEVELS.map((l) => l.level)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(LADDER_ENTRIES.map((e) => [e.id, e.level, e.evidence])).toEqual([
      ['authorized-teleoperated', 0, 'authorized'],
      ['maestro-scopilot', 1, 'authorized'],
      ['star-2016', 2, 'research'],
      ['saeidi-2022', 3, 'research'],
      ['srt-h-2025', 4, 'research'],
    ]);
    // The authorized rows are the article's systems table, level for level.
    for (const entry of LADDER_ENTRIES.filter((e) => e.evidence === 'authorized')) {
      const systems = SURGICAL_SYSTEM_ROWS.filter((r) => r.autonomyLevel === entry.level).map((r) => r.system);
      expect(systems.length).toBeGreaterThan(0);
      expect(entry.systems).toBe(systems.join(', '));
    }
    expect(LADDER_ENTRIES.find((e) => e.id === 'saeidi-2022')?.placedBy).toMatch(/^this article/);
    expect(LADDER_ENTRIES.find((e) => e.id === 'srt-h-2025')?.placedBy).toBe('its authors');
    expect([HIGHEST_AUTHORIZED_LEVEL, HIGHEST_CLAIMED_LEVEL]).toEqual([1, 4]);
  });

  it('leads with the kicker, the takeaway headline and a caption under 25 words', () => {
    const { container } = renderFigure();
    const kicker = container.querySelector('[data-figure-kicker]')?.textContent ?? '';
    const heading = container.querySelector('[data-figure-title]')?.textContent ?? '';
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(kicker).toBe('Six levels of surgical autonomy');
    expect(heading).toBe('Authorized surgical robots reach level 1; research claims level 4');
    expect(caption).toBe(
      'Every FDA-authorized surgical robot sits at level 0 or 1; everything higher is research on animals or on tissue removed from the body.',
    );
    expect(words(kicker)).toBeLessThanOrEqual(6);
    expect(words(heading)).toBeLessThanOrEqual(10);
    expect(words(caption)).toBeLessThanOrEqual(25);
    const comparison = screen.getByText("Authorized platforms here reach level 1; SRT-H's authors claim level 4");
    expect(comparison.closest('details')).toBeNull();
    expect(comparison.parentElement).toHaveTextContent('Six levels, numbered 0 to 5.');
    expect(comparison.parentElement).toHaveTextContent('for research on tissue outside a body.');
    expect(screen.getByText(/US Food and Drug Administration \(FDA\)/).closest('details')).toBeNull();
    // One keyboard activation of the method fold reveals the complete table.
    expect(container.querySelector('details[data-figure-fold="method"]')).not.toHaveAttribute('open');
    expect(container.querySelector('details[data-chart-data]')).toHaveAttribute('open');
  });

  it('draws level 5 at the top, authorized systems as accent dots and research as crosses', () => {
    renderFigure();
    const levels = [...document.querySelectorAll('[data-testid^="surgical-autonomy-level-"]')].map((g) =>
      g.getAttribute('data-level'),
    );
    expect(levels).toEqual(['5', '4', '3', '2', '1', '0']);
    for (const entry of LADDER_ENTRIES) {
      const mark = screen.getByTestId(`surgical-autonomy-${entry.id}`).querySelector('[data-chart-mark]');
      expect(mark?.getAttribute('data-chart-mark')).toBe(entry.evidence === 'authorized' ? 'dot' : 'cross');
      expect(mark).toHaveAttribute('data-chart-role', entry.evidence === 'authorized' ? 'highlight' : 'measurement');
    }
    expect(screen.getByTestId('surgical-autonomy-empty-5')).toHaveTextContent(
      'no system in this comparison',
    );
    expect(document.querySelectorAll('[data-scene-readout]')).toHaveLength(0);
  });

  it('describes the stage in a name shorter than its description and links each placement’s source', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Surgical systems and studies placed on six levels/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent("SRT-H's 2025 clipping-and-cutting experiments on excised gallbladders at level 4");
    expect(described).toHaveTextContent('No system in this comparison is at level 5.');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('surgical-autonomy-ladder-source').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual(records.map((r) => r.url));
    expect(records.map((r) => r.id)).toEqual([
      'yang-autonomy-2017',
      'star-suturing-2016',
      'saeidi-laparoscopic-2022',
      'srt-h-2025',
    ]);
  });
});

describe('SurgicalAutonomyLadder served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <SurgicalAutonomyLadder />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/adjacent/surgical/');
    expect(figures).toEqual(['surgical-autonomy-ladder']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('SurgicalAutonomyLadder series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names both kinds of evidence in the plot and tells them apart without colour', () => {
    const { container } = renderFigure();
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(['authorized', 'research']);
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
