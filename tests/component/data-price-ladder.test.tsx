import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { DataPriceLadder } from '@/components/interactive/data-price-ladder';
import { getCitation } from '@/data/citations';
import { CHART_DESCRIPTIONS } from '@/lib/chart-descriptions';
import {
  DATA_PRICE_LADDER_CAPTION,
  DATA_PRICE_LADDER_DESCRIPTION,
  DATA_PRICE_LADDER_SOURCES,
  ECB_REFERENCE_RATES,
  LADDER_AXIS,
  LADDER_GROUPS,
  PLOTTED_ROWS,
  PRICE_ROWS,
  axisFraction,
  groupSpan,
  toUsd,
  usdText,
  type LadderGroupId,
} from '@/lib/data-price-ladder';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('DataPriceLadder');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<DataPriceLadder />, { wrapper: Wrapper });
const words = (text: string) => text.trim().split(/\s+/).length;

const ARTICLE = readFileSync(join(process.cwd(), 'content/data-hardware/data-market.mdx'), 'utf8');

/**
 * The article's four tables, found by their header rows, each mapped to the
 * figure's fields: which cell is the data, who stated it and the value.
 */
const TABLES: { group: LadderGroupId; header: string; what: number; who: number; stated: number }[] = [
  { group: 'china-prices', header: '| Data | Price per hour | Who stated it |', what: 0, stated: 1, who: 2 },
  { group: 'other-prices', header: '| Seller | Data | Price per hour |', who: 0, what: 1, stated: 2 },
  { group: 'costs', header: '| Cost or estimate | Per hour | Source |', what: 0, stated: 1, who: 2 },
  { group: 'pay', header: '| Worker | Pay per hour | Source |', what: 0, stated: 1, who: 2 },
];

const CITE = /\s*<Cite id="([^"]+)" \/>/g;
const clean = (cell: string) => cell.replace(CITE, '').replace(/\\\$/g, '$').trim();

function tableRows(header: string) {
  const lines = ARTICLE.split('\n');
  const start = lines.indexOf(header);
  if (start < 0) throw new Error(`no table with header ${header}`);
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    const cells = line.slice(1, -1).split(' | ').map((c) => c.trim());
    rows.push({ cells: cells.map(clean), cites: [...line.matchAll(CITE)].map((m) => m[1]) });
  }
  return rows;
}

describe('data price ladder rows', () => {
  it('draws one row per row of the four tables, in the tables’ words and with their citations', () => {
    const tableRowCount = TABLES.reduce((n, t) => n + tableRows(t.header).length, 0);
    expect(tableRowCount).toBe(38);
    expect(PRICE_ROWS).toHaveLength(tableRowCount);
    for (const table of TABLES) {
      const figureRows = PRICE_ROWS.filter((row) => row.group === table.group);
      const rows = tableRows(table.header);
      expect(figureRows, table.group).toHaveLength(rows.length);
      rows.forEach(({ cells, cites }, i) => {
        const row = figureRows[i];
        expect([row.what, row.who, row.stated], row.id).toEqual([cells[table.what], cells[table.who], cells[table.stated]]);
        expect(cites, row.id).toEqual([row.citationId]);
      });
    }
    expect(new Set(PRICE_ROWS.map((row) => row.id)).size).toBe(PRICE_ROWS.length);
  });

  it('cites only registered sources, the ECB rate among them', () => {
    for (const id of DATA_PRICE_LADDER_SOURCES) expect(getCitation(id), id).toBeDefined();
    expect(DATA_PRICE_LADDER_SOURCES).toContain('ecb-reference-rates-2026-11-13');
    expect(records.map((r) => r.id)).toEqual([...DATA_PRICE_LADDER_SOURCES]);
  });

  it('converts yuan at the ECB rate to the article’s $75 to $150, and euros at the same rates', () => {
    expect(ECB_REFERENCE_RATES).toMatchObject({ citationId: 'ecb-reference-rates-2026-11-13', usdPerEur: 1.1052, cnyPerEur: 7.3738 });
    expect([usdText(toUsd(500, 'CNY')), usdText(toUsd(1000, 'CNY'))]).toEqual(['$75', '$150']);
    expect(ARTICLE).toContain('RMB 500 to 1,000 is \\$75 to \\$150 <Cite id="ecb-reference-rates-2026-11-13" />');
    expect(toUsd(1000, 'CNY')).toBeCloseTo((1000 * 1.1052) / 7.3738, 9);
    expect(toUsd(22, 'EUR')).toBeCloseTo(22 * 1.1052, 9);
    const row = (id: string) => PLOTTED_ROWS.find((r) => r.id === id)!;
    expect(row('beijing-real-robot').valueText).toBe('RMB 500 to 1,000 ($75 to $150)');
    expect(row('lingyu-real-robot').valueText).toBe('RMB 300 to 1,000 ($45 to $150) or more');
    expect(row('umi-collector').valueText).toBe('About RMB 20 ($3), or RMB 200 a day');
    expect(row('ay-robots-operator').valueText).toBe('EUR 6 to 22 ($6.60 to $24)');
    // PyRUA-DataFarm keeps its authors' own conversion of RMB 800.
    expect(row('pyrua-quote')).toMatchObject({ usdLow: 117, conversion: 'authors' });
    // Unidata's hourly figure is the article's division, $30,000 over 4,050 hours.
    expect(usdText(row('unidata-datarade').usdLow)).toBe('$7.40');
    expect(row('unidata-datarade').stated).toContain('about $7.40 an hour');
  });

  it('types no dollar value for a yuan or euro row', () => {
    for (const row of PRICE_ROWS.filter((r) => r.currency !== 'USD')) {
      if (row.authorsUsd !== undefined) continue;
      expect(row.stated, row.id).not.toContain('$');
      expect(PLOTTED_ROWS.find((r) => r.id === row.id)!.conversion).toBe('ecb');
    }
  });

  it('keeps every value on the axis, above its labelled floor', () => {
    for (const row of PLOTTED_ROWS) {
      for (const v of [row.usdLow, row.usdHigh, row.usdMid, row.usdAlso].filter((x) => x !== undefined)) {
        expect(v, row.id).toBeGreaterThan(LADDER_AXIS.floor);
        expect(v, row.id).toBeLessThan(LADDER_AXIS.ceiling);
      }
    }
    expect(axisFraction(LADDER_AXIS.floor)).toBe(0);
    expect(axisFraction(LADDER_AXIS.ceiling)).toBe(1);
    expect(axisFraction(10) - axisFraction(1)).toBeCloseTo(axisFraction(1000) - axisFraction(100), 9);
  });
});

describe('data price ladder caption and description', () => {
  it('derives the caption and the description from the rows', () => {
    const china = groupSpan('china-prices');
    expect(china).toEqual({ count: 10, min: toUsd(5, 'CNY'), max: toUsd(1000, 'CNY'), openAbove: true });
    expect(DATA_PRICE_LADDER_CAPTION).toBe(
      'Of 38 rows, the 10 prices in China run from $0.75 to $150 or more an hour at the ECB rate of 13 November 2026.',
    );
    expect(words(DATA_PRICE_LADDER_CAPTION)).toBeLessThanOrEqual(25);
    expect(DATA_PRICE_LADDER_DESCRIPTION).toBe(
      "38 hourly values from this article's four tables, in US dollars on a log scale, with yuan and euros converted at the ECB reference rates of 13 November 2026: 10 prices in China from $0.75 to $150 or more, 9 prices elsewhere from $7.40 to $1,800, 5 costs and estimates from $7.50 to $520, and 14 rates of pay to the people who record from $1 to $46.",
    );
    expect(LADDER_GROUPS.reduce((n, g) => n + groupSpan(g.id).count, 0)).toBe(PRICE_ROWS.length);
    expect(CHART_DESCRIPTIONS.find((d) => d.component === 'DataPriceLadder')?.text).toBe(DATA_PRICE_LADDER_DESCRIPTION);
  });
});

describe('DataPriceLadder', () => {
  it('titles the figure and keeps the caption and description it derives', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-title]')?.textContent).toBe('What an hour of robot data costs');
    expect(container.querySelector('[data-figure-caption]')?.textContent).toBe(DATA_PRICE_LADDER_CAPTION);
    const stage = screen.getByTestId('data-price-ladder-stage');
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent(DATA_PRICE_LADDER_DESCRIPTION);
    expect(screen.getByTestId('price-axis')).toHaveTextContent('US dollars per hour, log scale from a $0.20 floor');
  });

  it('draws the four groups in order, the prices in China alone in the accent', () => {
    const { container } = renderFigure();
    const groups = [...container.querySelectorAll('[data-testid^="price-group-"]')];
    expect(groups.map((g) => g.getAttribute('data-series'))).toEqual(['china-prices', 'other-prices', 'costs', 'pay']);
    expect(groups.map((g) => g.querySelector('[data-series-label-for]')?.textContent)).toEqual([
      'Prices in China',
      'Prices elsewhere',
      'Costs and estimates',
      'Pay to the people who record',
    ]);
    for (const group of groups) {
      const roles = new Set([...group.querySelectorAll('[data-chart-role]')].map((m) => m.getAttribute('data-chart-role')));
      expect([...roles], group.getAttribute('data-series')!).toEqual(
        group.getAttribute('data-series') === 'china-prices' ? ['highlight'] : ['measurement'],
      );
    }
    expect(container.querySelectorAll('[data-testid^="price-row-"]')).toHaveLength(38);
  });

  it('draws a range as a bar, a single value as a dot and a bound open-ended', () => {
    renderFigure();
    const marks = (id: string) =>
      [...screen.getByTestId(`price-track-${id}`).querySelectorAll('[data-chart-mark]')].map((m) => m.getAttribute('data-chart-mark')).sort();
    expect(marks('beijing-real-robot')).toEqual(['bar']);
    expect(marks('agency-collector')).toEqual(['dot']);
    expect(marks('lingyu-real-robot')).toEqual(['bar', 'open-end']);
    expect(marks('robopilots')).toEqual(['dot', 'open-end']);
    expect(marks('unidata-datarade')).toEqual(['dot', 'open-end']);
    expect(marks('encord-ceiling')).toEqual(['dot', 'open-end']);
    expect(marks('shift-contributor')).toEqual(['dot', 'open-end']);
    expect(marks('pyrua-labor')).toEqual(['bar', 'dot']);
    expect(marks('atlas-capture')).toEqual(['dot', 'dot']);
    for (const row of PLOTTED_ROWS) {
      const track = screen.getByTestId(`price-track-${row.id}`);
      expect(track).toHaveAttribute('aria-hidden');
      const bar = track.querySelector('[data-chart-mark="bar"]');
      if (row.usdHigh === undefined) expect(bar, row.id).toBeNull();
      else expect(bar?.getAttribute('data-usd-high'), row.id).toBe(String(Number(row.usdHigh.toFixed(2))));
    }
  });

  it('labels every row in text with who stated it and the table’s qualifiers', () => {
    renderFigure();
    for (const row of PLOTTED_ROWS) {
      const label = screen.getByTestId(`price-label-${row.id}`).textContent ?? '';
      expect(label, row.id).toBe(`${row.valueText}; ${row.who}`);
      for (const qualifier of ['about', 'reported', 'list', 'measured', 'from', 'or more', 'up to', 'per accepted hour', 'per approved hour', 'per operator hour', 'per effective hour']) {
        const inTable = `${row.stated}; ${row.who}`.toLowerCase().includes(qualifier);
        if (inTable) expect(label.toLowerCase(), `${row.id}: ${qualifier}`).toContain(qualifier);
      }
    }
  });

  it('links every source and the ECB rate in the source line', () => {
    renderFigure();
    const links = [...screen.getByTestId('data-price-ladder-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
    expect(screen.getByTestId('price-ladder-method')).toHaveTextContent('13 November 2026, $1.1052 and RMB 7.3738 to the euro');
  });
});

describe('DataPriceLadder served HTML', () => {
  it('passes the figure-system check', () => {
    const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
      <Wrapper>
        <DataPriceLadder />
      </Wrapper>,
    )}</main></body></html>`;
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/data-market/');
    expect(figures).toEqual(['data-price-ladder']);
    expect(violations.map(formatViolation)).toEqual([]);
    expect(new JSDOM(html).window.document.querySelectorAll('[data-chart-role="highlight"]').length).toBeGreaterThan(0);
  });
});
