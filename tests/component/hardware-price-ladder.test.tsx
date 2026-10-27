import { render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { HardwarePriceLadder } from '@/components/interactive/hardware-price-ladder';
import { HARDWARE } from '@/data/hardware';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { LADDER_POINTS, NOT_ON_SALE, NO_MAKER_PRICE, rowPoints } from '@/lib/hardware-price-ladder';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('HardwarePriceLadder');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<HardwarePriceLadder />, { wrapper: Wrapper });
const guide = (id: string) => HARDWARE.find((row) => row.id === id)!;

describe('hardware price ladder data', () => {
  it('reads every price from the buyer’s guide row it names', () => {
    for (const point of LADDER_POINTS) {
      const row = guide(point.rowId);
      expect(point.priceUsd, point.label).toBe(point.end === 'high' ? row.priceMaxUsd : row.priceUsd);
    }
    expect(LADDER_POINTS.map((p) => [p.label, p.priceUsd])).toEqual([
      ['SO-ARM101 Pro kit', 295],
      ['SO-ARM101 Pro, assembled', 299],
      ['Jetson Thor T4000', 2999],
      ['WidowX AI', 4545],
      ['Unitree R1 Air', 4900],
      ['Jetson Thor T5000', 4999],
      ['Unitree R1', 5900],
      ['Solo AI', 11385],
      ['Unitree G1', 13500],
      ['1X NEO', 20000],
      ['LimX Oli', 21800],
      ['Stationary AI', 23995],
      ['Unitree H2', 29900],
      ['Mobile AI', 33695],
      ['Reachy 2', 70000],
    ]);
  });

  it('leaves off parts lists and prices only others report', () => {
    const plotted = new Set(LADDER_POINTS.map((p) => p.rowId));
    for (const id of ['so-101-self-build', 'koch-v1-1', 'leap-hand', 'noetix-bumi', 'gelsight-mini', 'digit-fingertip']) {
      expect(guide(id).priceUsd, id).not.toBeNull();
      expect(plotted.has(id), id).toBe(false);
    }
  });

  it('names in the caption exactly the humanoids with no maker price and the ones not on open sale', () => {
    for (const id of NO_MAKER_PRICE) {
      expect(guide(id).category).toBe('humanoid');
      expect(guide(id).priceUsd, id).toBeNull();
    }
    for (const id of NOT_ON_SALE) {
      expect(guide(id).priceUsd, id).toBeNull();
      expect(['closed', 'contact']).toContain(guide(id).availability);
    }
    const unpricedHumanoids = HARDWARE.filter((row) => row.category === 'humanoid' && row.priceUsd === null).map((row) => row.id);
    expect(unpricedHumanoids.sort()).toEqual(
      [...NO_MAKER_PRICE, ...NOT_ON_SALE, 'agibot-a2', 'agility-digit'].sort(),
    );
  });
});

describe('HardwarePriceLadder', () => {
  it('leads with the kicker, the range headline and the caption naming the unpriced rows', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Maker list prices');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Listed prices run from $295 to $70,000');
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(caption).toBe(
      'No maker price for EngineAI SE01, Fourier GR-3 or UBTECH Walker S2; Figure 03, Atlas and Optimus 3 are not on open sale.',
    );
    expect(caption.split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  it('draws one strip per family and names only each strip’s ends', () => {
    renderFigure();
    expect(screen.getByTestId('price-strip-arm').querySelectorAll('circle')).toHaveLength(rowPoints('arm').length);
    expect(screen.getByTestId('price-strip-humanoid').querySelectorAll('circle')).toHaveLength(6);
    expect(screen.getByTestId('price-strip-compute').querySelectorAll('circle')).toHaveLength(2);
    expect(screen.getByTestId('price-label-so-arm101-pro-unassembled-low')).toHaveTextContent('SO-ARM101 Pro kit$295');
    expect(screen.getByTestId('price-label-reachy-2-low')).toHaveTextContent('Reachy 2$70,000');
    expect(screen.getByTestId('price-label-unitree-r1-low')).toHaveTextContent('Unitree R1 Air$4,900');
    expect(screen.getByTestId('price-label-unitree-h2-low')).toHaveTextContent('Unitree H2$29,900');
    expect(screen.queryByTestId('price-label-1x-neo-low')).toBeNull();
    expect(screen.getAllByTestId(/^price-tick-/).map((el) => el.textContent)).toEqual(['$100', '$1,000', '$10,000', '$100,000']);
  });

  it('describes the stage in a name shorter than its description and links each maker page once', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /Listed prices of arms, humanoids and robot computers/ });
    const described = document.getElementById(stage.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent('humanoids from $4,900 (Unitree R1 Air) to $29,900 (Unitree H2)');
    expect((stage.getAttribute('aria-label') ?? '').length).toBeLessThan(described?.textContent?.length ?? 0);
    const links = [...screen.getByTestId('hardware-price-ladder-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
    expect(new Set(links).size).toBe(links.length);
    expect(links).toContain('https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition');
  });
});

describe('HardwarePriceLadder served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <Wrapper>
      <HardwarePriceLadder />
    </Wrapper>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/hardware-taxonomy/');
    expect(figures).toEqual(['hardware-price-ladder']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
