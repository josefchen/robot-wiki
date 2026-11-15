import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MakerFilesRegister } from '@/components/maker-model-sources/maker-files-register';
import {
  MAKER_MODEL_SOURCES,
  MAKER_MODEL_SOURCES_AS_OF,
  type MakerModelSource,
} from '@/data/maker-model-sources';
import { MODELS_3D } from '@/data/models-3d';
import { formatLongDate } from '@/lib/dates';
import { MAKER_MODEL_STATUS_ORDER, countsByStatus, rowsByStatus } from '@/lib/maker-model-sources';
import { formatShortDate } from '@/lib/market-map';
import {
  REGISTER_TABLE_TITLES,
  displayAddress,
  hostedLink,
  licenceLink,
  licensedCount,
  makerCounts,
  modelBlockId,
  newestChecked,
  pageAsOf,
  pagesRead,
  pagesReadLinks,
  registerLead,
  registerShortCommit,
  registerTableHeading,
  registerTables,
  repositoriesRead,
  repositoryLink,
  robotsIn3dLead,
  robotsIn3dPageLead,
} from '@/lib/robots-in-3d-page';

/**
 * The register section of /robots-in-3d/ against data/maker-model-sources.ts:
 * each count and lead is recomputed from the rows, each table holds exactly
 * its status's rows, and every cell is the row's own value.
 */

const rows = MAKER_MODEL_SOURCES;
const tables = registerTables();
const html = renderToStaticMarkup(<MakerFilesRegister tables={tables} />);
const doc = new DOMParser().parseFromString(html, 'text/html');
const tableOf = (status: string) => doc.querySelector(`[data-register-table="${status}"]`)!;
const rowOf = (id: string) => doc.querySelector(`[data-register-row="${id}"]`)!;
const text = (node: Element) => node.textContent!.replace(/\s+/g, ' ').trim();
const squash = (value: string) => value.replace(/\s+/g, ' ').trim();

describe('the register’s counts and leads', () => {
  it('reads distinct repositories at a commit and distinct other pages', () => {
    const repositories = new Set(rows.filter((row) => row.commit).map((row) => row.repository));
    expect(repositoriesRead()).toEqual([...repositories]);
    const pages = new Set(
      rows.filter((row) => !row.commit).flatMap((row) => [...(row.repository ? [row.repository] : []), ...row.sources.map((s) => s.url)]),
    );
    expect(pagesRead()).toEqual([...pages]);
    // Every page a row without a commit links or cites is counted, the
    // restricted clause's own source among them.
    for (const row of rows.filter((r) => !r.commit)) {
      for (const source of row.sources) expect(pagesRead(), row.id).toContain(source.url);
      if (row.clause) expect(row.sources.some((s) => pagesRead().includes(s.url)), row.id).toBe(true);
    }
    // A row at a commit cites only files in its repository, so the pages
    // count misses nothing a git row read.
    for (const row of rows.filter((r) => r.commit)) {
      for (const source of row.sources) expect(source.url.startsWith(`${row.repository}/`), `${row.id}: ${source.url}`).toBe(true);
    }
    // Every row was read at one of them.
    for (const row of rows) {
      const read = row.commit ? repositoriesRead().includes(row.repository!) : row.sources.some((s) => pagesRead().includes(s.url)) || pagesRead().includes(row.repository!);
      expect(read, row.id).toBe(true);
    }
  });

  it('counts the licensed rows as the official and restricted ones', () => {
    const counts = countsByStatus(rows);
    expect(licensedCount()).toBe(counts.official + counts.restricted);
    expect(licensedCount()).toBe(rows.filter((row) => row.licence !== null).length);
  });

  it('states the register’s lead from the rows and its date', () => {
    expect(registerLead()).toBe(
      `As of ${formatLongDate(MAKER_MODEL_SOURCES_AS_OF)} the register holds ${rows.length} entries, read from ${repositoriesRead().length} repositories at pinned commits and ${pagesRead().length} web pages, and ${licensedCount()} of them carry a licence.`,
    );
    const [one] = rows.filter((row) => row.status === 'official' && row.commit);
    expect(registerLead([one], '2030-01-02')).toBe(
      'As of 2 January 2030 the register holds 1 entry, read from 1 repository at a pinned commit and 0 web pages, and 1 of them carries a licence.',
    );
    const cited = rows.find((row) => row.status === 'restricted' && !row.commit && row.sources.length > 1)!;
    expect(registerLead([cited], '2030-01-02')).toContain(`and ${new Set([cited.repository, ...cited.sources.map((s) => s.url)]).size} web pages`);
  });

  it('counts makers searched and makers found to publish', () => {
    const { searched, found } = makerCounts();
    expect(searched).toBe(new Set(rows.map((row) => row.maker)).size);
    expect(found).toBe(new Set(rows.filter((row) => row.status !== 'none-found').map((row) => row.maker)).size);
    expect(found).toBeLessThanOrEqual(searched);
  });

  it('extends the header’s lead to the register and ends it on the newer date', () => {
    const { searched, found } = makerCounts();
    const share = found === searched ? `all ${searched}` : `${found} of the ${searched}`;
    expect(robotsIn3dPageLead()).toBe(`${robotsIn3dLead()}, and model files found for ${share} makers searched`);
    expect(robotsIn3dPageLead()).not.toMatch(/[.,;:!?]\s*$/);
    // What was found, never what the other makers publish.
    expect(robotsIn3dPageLead()).not.toMatch(/\bpublish|\bwhere\b|\bno model\b|\bnone\b/i);
    const asOf = pageAsOf();
    expect(asOf >= newestChecked()).toBe(true);
    expect(asOf >= MAKER_MODEL_SOURCES_AS_OF).toBe(true);
    expect([newestChecked(), MAKER_MODEL_SOURCES_AS_OF]).toContain(asOf);
    expect(pageAsOf(MODELS_3D, '2000-01-01')).toBe(newestChecked());
    expect(pageAsOf(MODELS_3D, '2099-01-01')).toBe('2099-01-01');
    const none = rows.filter((row) => row.status === 'none-found');
    expect(robotsIn3dPageLead(MODELS_3D, [...none, ...rows.filter((row) => row.status === 'official').slice(0, 1)])).toContain(
      `, and model files found for 1 of the ${new Set([...none.map((r) => r.maker), rows[0].maker]).size} makers searched`,
    );
  });
});

describe('the four tables', () => {
  it('come in status order, each holding its status’s rows in data order, with the count in the heading', () => {
    expect(tables.map((table) => table.status)).toEqual([...MAKER_MODEL_STATUS_ORDER]);
    for (const table of tables) {
      expect(table.rows).toEqual(rowsByStatus(rows, table.status));
      const heading = text(tableOf(table.status).querySelector('h3')!);
      expect(heading).toBe(registerTableHeading(table));
      expect(heading).toBe(`${REGISTER_TABLE_TITLES[table.status]}, ${table.rows.length} ${table.rows.length === 1 ? 'entry' : 'entries'}`);
      const rendered = [...tableOf(table.status).querySelectorAll('[data-register-row]')].map((tr) => tr.getAttribute('data-register-row'));
      expect(rendered).toEqual(table.rows.map((row) => row.id));
    }
  });

  it('place every row in exactly one table', () => {
    const rendered = [...doc.querySelectorAll('[data-register-row]')].map((tr) => tr.getAttribute('data-register-row'));
    expect(rendered.length).toBe(rows.length);
    expect(new Set(rendered).size).toBe(rows.length);
    for (const row of rows) {
      const holders = tables.filter((table) => table.rows.includes(row));
      expect(holders.map((table) => table.status), row.id).toEqual([row.status]);
      expect(rowOf(row.id).closest('[data-register-table]')!.getAttribute('data-register-table'), row.id).toBe(row.status);
    }
  });

  it('link every hosted row to a model block the page renders', () => {
    const blocks = MODELS_3D.map((model) => `#${modelBlockId(model)}`);
    const hosted = rows.filter((row) => row.hostedModelId);
    expect(hosted.length).toBeGreaterThan(0);
    for (const row of hosted) {
      const link = hostedLink(row)!;
      expect(blocks, row.id).toContain(link.href);
      expect(link.href).toBe(`#${row.hostedModelId}`);
      expect(rowOf(row.id).querySelector(`a[href="${link.href}"]`), row.id).not.toBeNull();
    }
    const inPageLinks = [...doc.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'));
    expect(inPageLinks.length).toBe(hosted.length);
    for (const href of inPageLinks) expect(blocks).toContain(href);
    expect(() => hostedLink({ ...hosted[0], hostedModelId: 'not-shipped' })).toThrow();
  });
});

describe('each row’s cells', () => {
  // A phone repeats some cells as lines inside others (the maker and formats
  // in the robots cell, the checked date under the page read); the columns
  // carry them on a wider screen. These are the columns' own values.
  const cells = (row: MakerModelSource) =>
    [...rowOf(row.id).querySelectorAll('td')].map((td) => {
      const copy = td.cloneNode(true) as Element;
      for (const line of copy.querySelectorAll('[data-phone-only]')) line.remove();
      return text(copy);
    });
  const phoneLines = (td: Element) => [...td.querySelectorAll('[data-phone-only]')].map(text);
  const columnHidden = (td: Element) => /\bhidden\b.*\bsm:table-cell\b/.test(td.className);
  const phoneOnly = (node: Element) => /(^|\s)sm:hidden(\s|$)/.test(node.className);

  it('repeat the maker above the robots for a phone and keep the maker column for wider screens', () => {
    for (const row of rows) {
      const [makerCell, robotsCell] = rowOf(row.id).querySelectorAll('td');
      expect(makerCell.className, row.id).toMatch(/\bhidden\b.*\bsm:table-cell\b/);
      expect(text(makerCell)).toBe(row.maker);
      const phone = robotsCell.querySelector('[data-phone-maker]')!;
      expect(text(phone), row.id).toBe(row.maker);
      expect(phone.className, row.id).toContain('sm:hidden');
    }
  });

  it('on a phone, stack each hidden column’s value beside its maker, so nothing is lost', () => {
    for (const row of rowsByStatus(rows, 'official').concat(rowsByStatus(rows, 'restricted'))) {
      const tds = [...rowOf(row.id).querySelectorAll('td')];
      expect(columnHidden(tds[2]), row.id).toBe(true);
      expect(phoneLines(tds[1]), row.id).toEqual([row.maker, row.formats.join(', ')]);
    }
    for (const row of rowsByStatus(rows, 'official')) {
      // The licence leaves its column for a line under the repository.
      const tds = [...rowOf(row.id).querySelectorAll('td')];
      expect(columnHidden(tds[4]), row.id).toBe(true);
      expect(phoneLines(tds[3]), row.id).toEqual([row.licence!.name]);
      expect(tds[3].querySelector(`a[href="${licenceLink(row)!.href}"]`)?.textContent, row.id).toBe(row.licence!.name);
    }
    // Restricted and no-licence rows move their long columns to a full-width row directly below.
    const detail = (row: MakerModelSource, hidden: number[]) => {
      const tds = [...rowOf(row.id).querySelectorAll('td')];
      for (const index of hidden) expect(columnHidden(tds[index]), `${row.id} column ${index}`).toBe(true);
      const below = rowOf(row.id).nextElementSibling!;
      expect(below.getAttribute('data-register-detail'), row.id).toBe(row.id);
      expect(phoneOnly(below), row.id).toBe(true);
      const cell = below.querySelector('td')!;
      expect(Number(cell.getAttribute('colspan'))).toBe(tds.length);
      return cell;
    };
    for (const row of rowsByStatus(rows, 'restricted')) {
      const cell = detail(row, [2, 4, 5]);
      expect(cell.querySelector(`a[href="${licenceLink(row)!.href}"]`)?.textContent, row.id).toBe(row.licence!.name);
      expect(text(cell)).toBe(`${row.licence!.name}“${squash(row.clause!)}”`);
    }
    for (const row of rowsByStatus(rows, 'no-licence')) {
      expect(text(detail(row, [3]))).toBe(row.note);
    }
    for (const row of rowsByStatus(rows, 'none-found')) {
      const tds = [...rowOf(row.id).querySelectorAll('td')];
      expect(columnHidden(tds[3]), row.id).toBe(true);
      expect(phoneLines(tds[2]), row.id).toEqual([`Checked ${formatShortDate(row.checked)}`]);
      expect(tds[2].querySelector(`time[datetime="${row.checked}"]`), row.id).not.toBeNull();
    }
    // Only restricted and no-licence rows have a row below them; every phone-only line hides on a wider screen.
    const counts = countsByStatus(rows);
    expect(doc.querySelectorAll('[data-register-detail]').length).toBe(counts.restricted + counts['no-licence']);
    for (const line of doc.querySelectorAll('[data-phone-only]')) expect(phoneOnly(line)).toBe(true);
  });

  it('official rows: maker, robots, formats, repository at the commit, licence', () => {
    for (const row of rowsByStatus(rows, 'official')) {
      const [maker, robots, formats, repository, licence] = cells(row);
      expect(maker).toBe(row.maker);
      expect(robots.startsWith(row.robots.join(', ')), row.id).toBe(true);
      expect(formats).toBe(row.formats.join(', '));
      expect(repository).toContain(repositoryLink(row)!.text);
      expect(repository).toContain(row.commit ? `${registerShortCommit(row)}, ${formatShortDate(row.commit.date)}` : 'no commit');
      expect(licence).toBe(row.licence!.name);
      const anchor = rowOf(row.id).querySelector(`a[href="${licenceLink(row)!.href}"]`);
      expect(anchor?.textContent, row.id).toBe(row.licence!.name);
    }
  });

  it('link a git repository at its pinned commit and a download page as itself', () => {
    for (const row of rows.filter((r) => r.repository)) {
      const link = repositoryLink(row)!;
      expect(link.href).toBe(row.commit ? `${row.repository}/tree/${row.commit.hash}` : row.repository);
      expect(rowOf(row.id).querySelector(`a[href="${link.href}"]`), row.id).not.toBeNull();
      if (row.commit) expect(registerShortCommit(row)).toBe(row.commit.hash.slice(0, 8));
    }
    expect(displayAddress('https://www.example.com/a/b/')).toBe('example.com/a/b');
  });

  it('restricted rows quote the stored clause exactly', () => {
    for (const row of rowsByStatus(rows, 'restricted')) {
      const last = cells(row).at(-1)!;
      expect(last).toBe(`“${squash(row.clause!)}”`);
      expect(cells(row)[4]).toBe(row.licence!.name);
    }
  });

  it('no-licence rows give the repository at the commit and the note, and name no licence', () => {
    for (const row of rowsByStatus(rows, 'no-licence')) {
      const [maker, robots, repository, note] = cells(row);
      expect([maker, robots]).toEqual([row.maker, row.robots.join(', ')]);
      expect(repository).toContain(`${registerShortCommit(row)}, ${formatShortDate(row.commit!.date)}`);
      expect(note).toBe(row.note);
      expect(note).toMatch(/^No licence file\b/);
    }
  });

  it('none-found rows give the page read and the date checked', () => {
    for (const row of rowsByStatus(rows, 'none-found')) {
      const [maker, robots, page, checked] = cells(row);
      expect([maker, robots]).toEqual([row.maker, row.robots.join(', ')]);
      expect(page).toBe(pagesReadLinks(row).map((link) => link.text).join(''));
      for (const source of row.sources) {
        expect(rowOf(row.id).querySelector(`a[href="${source.url}"]`), row.id).not.toBeNull();
      }
      expect(checked).toBe(formatShortDate(row.checked));
      expect(rowOf(row.id).querySelector(`time[datetime="${row.checked}"]`)).not.toBeNull();
    }
  });

  it('say nothing a row does not', () => {
    for (const status of ['no-licence', 'none-found']) {
      expect(text(tableOf(status))).not.toMatch(/\bno model\b|publishes none|\bmay\b|\bfree to\b|[–—]/i);
    }
  });
});
