import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicCompaniesPage from '@/app/market-map/public/page';
import { PublicMarketMap } from '@/components/public-companies/public-market-map';
import { FX_RATES_SOURCE_URL, TWD_RATE_SOURCE_URL } from '@/data/fx-rates';
import {
  mapCaption,
  mapDescription,
  mapHeadline,
  publicMarketMapData,
  publicMarketMapText,
} from '@/lib/public-market-map';

const DATA = publicMarketMapData();
const TEXT = publicMarketMapText(DATA);

describe('PublicMarketMap', () => {
  it('draws one tile per sized company and one outlined cell per company out of scale', () => {
    const { container } = render(<PublicMarketMap data={DATA} text={TEXT} />);
    const tiles = [...container.querySelectorAll('[data-tile]')].map((t) => t.getAttribute('data-tile'));
    expect(tiles.sort()).toEqual(DATA.sized.map((c) => c.id).sort());
    const row = [...container.querySelectorAll('[data-out-of-scale]')].map((c) => c.getAttribute('data-out-of-scale'));
    expect(row).toEqual(DATA.outOfScale.map((c) => c.id));
    for (const company of DATA.outOfScale) {
      const cell = container.querySelector(`[data-out-of-scale="${company.id}"]`)!;
      expect(cell.textContent).toContain(company.valueText);
    }
  });

  it('can render an empty edition or a set containing only unscaled companies', () => {
    for (const outOfScale of [[], DATA.outOfScale]) {
      const data = { sized: [], segments: [], outOfScale };
      const text = publicMarketMapText(data);
      expect(text.headline).toBe('No companies to size by market value.');
      expect(text.description).toBe(text.caption);
      expect(text.shares).toBe('');
      const { container, unmount } = render(<PublicMarketMap data={data} text={text} />);
      expect(container.textContent).toBe(text.caption);
      expect(container.querySelector('svg')).toBeNull();
      unmount();
    }
  });

  it('draws marks from their own files, never through a mask', () => {
    const { container } = render(<PublicMarketMap data={DATA} text={TEXT} />);
    const images = [...container.querySelectorAll('image')];
    expect(images.length).toBeGreaterThan(0);
    const files = new Set(DATA.sized.flatMap((c) => (c.mark ? [c.mark.file] : [])));
    for (const image of images) expect(files.has(image.getAttribute('href')!)).toBe(true);
    for (const img of container.querySelectorAll('[data-out-of-scale] img')) {
      expect(img.getAttribute('style') ?? '').not.toMatch(/mask/);
    }
  });

  it('prints the computed headline, caption, description and both rate links', () => {
    const { container } = render(<PublicMarketMap data={DATA} text={TEXT} />);
    expect(container.querySelector('[data-figure-title]')?.textContent).toBe(mapHeadline(DATA));
    expect(container.querySelector('[data-figure-caption]')?.textContent).toBe(mapCaption(DATA));
    expect(container.querySelector('[data-chart-description]')?.textContent).toBe(mapDescription(DATA));
    const hrefs = [...container.querySelectorAll('[data-figure-fold] a')].map((a) => a.getAttribute('href'));
    expect(hrefs.slice(0, 2)).toEqual([FX_RATES_SOURCE_URL, TWD_RATE_SOURCE_URL]);
    expect(hrefs[2]).toMatch(/^\/credits\/?$/);
  });

  it('sits on the page above the tables', () => {
    const { container } = render(<PublicCompaniesPage />);
    const figure = container.querySelector('[data-figure-frame="public-market-map"]')!;
    const firstSection = container.querySelector('section')!;
    expect(figure).not.toBeNull();
    expect(figure.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
