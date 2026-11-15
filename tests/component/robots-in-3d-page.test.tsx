import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RobotsIn3dPage, { metadata } from '@/app/robots-in-3d/page';
import sitemap from '@/app/sitemap';
import { MAKER_MODEL_SOURCES_AS_OF } from '@/data/maker-model-sources';
import { MODELS_3D } from '@/data/models-3d';
import { formatLongDate } from '@/lib/dates';
import {
  MAKER_FILES_ID,
  MAKER_FILES_TITLE,
  ROBOTS_IN_3D_PATH,
  ROBOTS_IN_3D_TITLE,
  modelCaption,
  modelHeading,
  modelSummary,
  newestChecked,
  pageAsOf,
  recordRows,
  registerLead,
  registerTables,
  robotsIn3dLead,
  robotsIn3dPageLead,
} from '@/lib/robots-in-3d-page';
import { SITE_URL } from '@/lib/site';

// Plain CSS: the test transform does not run the site's PostCSS pipeline.
vi.mock('@/components/model-viewer/model-viewer.css', () => ({}));

/**
 * /robots-in-3d/ (app/robots-in-3d/page.tsx): the shared data-page header,
 * then one block per record of MODELS_3D in data order, each the viewer in
 * its before-load state and the record as a definition table.
 */

const text = (node: Element | null) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();

function renderPage() {
  return render(<RobotsIn3dPage />).container;
}

describe('/robots-in-3d/', () => {
  it('opens with the shared header: the title and the lead ending on the newer of the two dates', () => {
    const container = renderPage();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const header = container.querySelector('[data-page-header]');
    expect(header?.querySelector('h1')?.textContent).toBe(ROBOTS_IN_3D_TITLE);
    expect(text(header!.querySelector('[data-page-lead]'))).toBe(
      `${robotsIn3dPageLead()}, as of ${formatLongDate(pageAsOf())}.`,
    );
    expect(robotsIn3dPageLead().startsWith(robotsIn3dLead())).toBe(true);
    expect(header?.querySelector('time')?.getAttribute('datetime')).toBe(pageAsOf());
    expect(pageAsOf() >= newestChecked() && pageAsOf() >= MAKER_MODEL_SOURCES_AS_OF).toBe(true);
    expect(header?.querySelectorAll('nav')).toHaveLength(0);
  });

  it('closes with the register below every model block: its heading, its lead, then the four tables', () => {
    const container = renderPage();
    const section = container.querySelector(`section#${MAKER_FILES_ID}`)!;
    expect(section).not.toBeNull();
    expect(section.querySelector('h2')?.textContent).toBe(MAKER_FILES_TITLE);
    expect(text(section.querySelector('p'))).toBe(registerLead());
    for (const block of container.querySelectorAll('[data-model-section]')) {
      expect(block.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect([...section.querySelectorAll('[data-register-table]')].map((t) => t.getAttribute('data-register-table'))).toEqual(
      registerTables().map((table) => table.status),
    );
    for (const table of section.querySelectorAll('[data-register-table] table')) {
      const region = table.closest('[role="region"]');
      expect(region?.getAttribute('tabindex')).toBe('0');
      expect(container.querySelector(`#${region?.getAttribute('aria-labelledby')}`)?.tagName).toBe('H3');
    }
    for (const link of section.querySelectorAll('a[href^="#"]')) {
      expect(container.querySelector(`[data-model-section]${link.getAttribute('href')}`), link.getAttribute('href')!).not.toBeNull();
    }
  });

  it('gives each record one block, in data order: a heading, the viewer, then the record', () => {
    const container = renderPage();
    const sections = [...container.querySelectorAll('[data-model-section]')];
    expect(sections.map((section) => section.getAttribute('data-model-section'))).toEqual(MODELS_3D.map((m) => m.id));
    for (const [index, model] of MODELS_3D.entries()) {
      const section = sections[index];
      expect(section.querySelector('h2')?.textContent, model.id).toBe(model.product);
      const [viewer, record] = [
        section.querySelector(`[data-model-viewer="${model.id}"]`),
        section.querySelector(`[data-model-record="${model.id}"]`),
      ];
      expect(viewer, model.id).not.toBeNull();
      expect(record, model.id).not.toBeNull();
      expect(viewer!.compareDocumentPosition(record!) & Node.DOCUMENT_POSITION_FOLLOWING, model.id).toBeTruthy();
    }
  });

  it('serves every viewer in its before-load state: the name, the size and the button, nothing 3D', () => {
    const container = renderPage();
    expect(container.querySelector('canvas')).toBeNull();
    for (const model of MODELS_3D) {
      const viewer = container.querySelector(`[data-model-viewer="${model.id}"]`) as HTMLElement;
      expect(viewer.getAttribute('data-state'), model.id).toBe('idle');
      expect(viewer.tagName, model.id).toBe('FIGURE');
      const stage = within(viewer).getByTestId('model-stage');
      expect(stage.textContent, model.id).toContain(model.product);
      expect(stage.textContent, model.id).toContain(modelSummary(model));
      const button = within(viewer).getByRole('button', { name: 'Load model' });
      expect(button.getAttribute('aria-describedby'), model.id).toBe(`${model.id}-name ${model.id}-summary`);
      expect(text(viewer.querySelector('[data-figure-title]')), model.id).toBe(modelHeading(model));
      expect(text(viewer.querySelector('figcaption')), model.id).toBe(modelCaption(model));
    }
  });

  it('prints each record as its rows, the field names as row headers', () => {
    const container = renderPage();
    for (const model of MODELS_3D) {
      const table = container.querySelector(`[data-model-record="${model.id}"]`)!;
      const rows = recordRows(model);
      const trs = [...table.querySelectorAll('tbody tr')];
      expect(trs.map((tr) => tr.getAttribute('data-record-row')), model.id).toEqual(rows.map((row) => row.key));
      for (const [index, row] of rows.entries()) {
        const tr = trs[index];
        expect(tr.querySelector('th[scope="row"]')?.textContent, row.key).toBe(row.label);
        const cell = tr.querySelector('td')!;
        expect(text(cell), row.key).toBe(row.detail ? `${row.text}, ${row.detail}` : row.text);
        expect(cell.className.includes('font-mono'), row.key).toBe(row.mono);
        const link = cell.querySelector('a');
        expect(link?.getAttribute('href') ?? undefined, row.key).toBe(row.href);
        if (row.date) expect(cell.querySelector('time')?.getAttribute('datetime')).toBe(row.date);
      }
      const region = table.closest('[role="region"]');
      expect(region?.getAttribute('aria-labelledby')).toBe(table.querySelector('caption')?.id);
    }
  });

  it('shows the WebGL message in the same frame when the browser has no WebGL (jsdom has none)', async () => {
    const container = renderPage();
    const [first] = MODELS_3D;
    const viewer = container.querySelector(`[data-model-viewer="${first.id}"]`) as HTMLElement;
    fireEvent.click(within(viewer).getByRole('button', { name: 'Load model' }));
    expect(await within(viewer).findByTestId('webgl-unavailable')).toBeInTheDocument();
    expect(viewer.getAttribute('data-state')).toBe('unavailable');
    expect(within(viewer).getByTestId('webgl-unavailable').textContent).toContain('The 3D model needs WebGL');
    expect(viewer.querySelector('canvas')).toBeNull();
    // The other viewers stay as they were.
    for (const model of MODELS_3D.slice(1)) {
      expect(container.querySelector(`[data-model-viewer="${model.id}"]`)?.getAttribute('data-state')).toBe('idle');
    }
    expect(screen.getAllByRole('button', { name: 'Load model' })).toHaveLength(MODELS_3D.length - 1);
  });

  it('describes itself in one WebPage block at its own address', () => {
    const container = renderPage();
    const blocks = [...container.querySelectorAll('script[type="application/ld+json"]')];
    expect(blocks).toHaveLength(1);
    expect(JSON.parse(blocks[0].textContent ?? '')).toMatchObject({
      '@type': 'WebPage',
      url: `${SITE_URL}${ROBOTS_IN_3D_PATH}`,
      name: ROBOTS_IN_3D_TITLE,
      description: metadata.description,
    });
  });

  it('stays out of search engines and out of the sitemap', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: true, googleBot: { index: false, follow: true } });
    expect(sitemap().map((entry) => entry.url)).not.toContain(`${SITE_URL}${ROBOTS_IN_3D_PATH}`);
  });
});
