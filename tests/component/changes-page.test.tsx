import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChangesPage, { metadata } from '@/app/changes/page';
import sitemap from '@/app/sitemap';
import { CHANGES_PATH, CHANGES_TITLE, changeRows } from '@/lib/changes-page';
import { readableDate } from '@/lib/home-updates';
import { SITE_URL } from '@/lib/site';

/**
 * /changes/ (app/changes/page.tsx): the shared data-page header, then one
 * ruled list with a row per editor's note, newest first.
 */

/** A link's address as the site serves it: the build adds the closing slash. */
const route = (link: Element | null) => (link?.getAttribute('href') ?? '').replace(/\/?$/, '/');

const text = (node: Element | null) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();

function renderPage() {
  const { container } = render(<ChangesPage />);
  return container;
}

describe('/changes/', () => {
  it('opens with the shared header: the title and the lead, no section links and no anchors', () => {
    const container = renderPage();
    const headers = [...container.querySelectorAll('[data-page-header]')];
    expect(headers).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(headers[0].querySelector('h1')?.textContent).toBe(CHANGES_TITLE);
    expect(text(headers[0].querySelector('[data-page-lead]'))).toBe(
      'What changed in the wiki, newest first, with a link to each page.',
    );
    expect(headers[0].querySelectorAll('nav')).toHaveLength(0);
    expect(container.querySelector('[data-changes]')?.previousElementSibling?.contains(headers[0])).toBe(true);
  });

  it('lists exactly the rows the function returns, in that order', () => {
    const container = renderPage();
    const lists = [...container.querySelectorAll('ol[data-changes]')];
    expect(lists).toHaveLength(1);
    const rows = changeRows();
    expect(rows.length).toBeGreaterThan(0);
    const items = [...lists[0].children];
    expect(items.every((item) => item.tagName === 'LI')).toBe(true);
    expect(items.map((item) => item.getAttribute('data-change'))).toEqual(rows.map((row) => row.id));
  });

  it('gives each row its date in monospace, its article as the only link, then the note', () => {
    const container = renderPage();
    const items = [...container.querySelectorAll('[data-change]')];
    for (const [index, row] of changeRows().entries()) {
      const item = items[index];
      const time = item.querySelector('time');
      expect(time?.getAttribute('datetime'), row.id).toBe(row.date);
      expect(time?.textContent, row.id).toBe(readableDate(row.date));
      expect(time?.className, row.id).toContain('font-mono');
      const links = [...item.querySelectorAll('a')];
      expect(links, row.id).toHaveLength(1);
      expect(links[0].textContent, row.id).toBe(row.title);
      expect(route(links[0]), row.id).toBe(row.href);
      expect(links[0].getAttribute('data-brand-control-id'), row.id).toBe('control:link-focus');
      expect(text(item.querySelector('p')), row.id).toBe(`${row.title}${row.titleEnd} ${row.note}`);
    }
  });

  it('describes itself in one WebPage block at its own address', () => {
    const container = renderPage();
    const blocks = [...container.querySelectorAll('script[type="application/ld+json"]')];
    expect(blocks).toHaveLength(1);
    expect(JSON.parse(blocks[0].textContent ?? '')).toMatchObject({
      '@type': 'WebPage',
      url: `${SITE_URL}${CHANGES_PATH}`,
      name: CHANGES_TITLE,
      description: metadata.description,
    });
  });

  it('registers the page in metadata and the sitemap at thirty published notes', () => {
    const indexable = changeRows().length >= 30;
    expect(metadata.robots).toMatchObject({ index: indexable, follow: true, googleBot: { index: indexable, follow: true } });
    expect(sitemap().some((entry) => entry.url === `${SITE_URL}${CHANGES_PATH}`)).toBe(indexable);
  });
});
