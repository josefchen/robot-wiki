import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NowPage from '@/app/now/page';
import { DELIVERY_GAPS, TRAJECTORIES } from '@/data/now';
import { NOW_ARGUMENTS, OPEN_QUESTIONS } from '@/data/now-debates';
import { developmentsNewestFirst, formatGapValue, resolvedTrajectories } from '@/lib/now';
import { isSourced } from '@/lib/now-debates';
import {
  NOW_SECTIONS,
  endNote,
  gapSources,
  questionsWithArguments,
  standaloneArguments,
  stated,
} from '@/lib/now-page';

function renderPage() {
  const { container } = render(<NowPage />);
  return container;
}

const rowsIn = (container: HTMLElement, section: string) =>
  [...container.querySelectorAll<HTMLElement>(`#${section} [data-now-row]`)];

describe('/now/', () => {
  it('renders the five sections in order, each with its id and heading', () => {
    const container = renderPage();
    const sections = [...container.querySelectorAll('section[data-now-section]')];
    expect(sections.map((section) => section.id)).toEqual(NOW_SECTIONS.map((section) => section.id));
    for (const [index, section] of sections.entries()) {
      expect(section.querySelector('h2')?.textContent).toBe(NOW_SECTIONS[index].title);
    }
    expect(container.querySelector('h1')?.textContent).toBe('Robotics now');
  });

  it('resolves every anchor in the top list', () => {
    const container = renderPage();
    const anchors = [...container.querySelectorAll<HTMLAnchorElement>('nav[aria-label="On this page"] a')];
    expect(anchors).toHaveLength(NOW_SECTIONS.length);
    for (const anchor of anchors) {
      const id = anchor.getAttribute('href')!.replace(/^#/, '');
      expect(container.querySelector(`[id="${id}"]`), id).not.toBeNull();
    }
  });

  it('states the as-of date in the lead from the data', () => {
    const container = renderPage();
    expect(container.textContent).toContain('which way it is moving, as of 14 November 2026.');
  });

  it('gives each table exactly the rows its function returns, in that order', () => {
    const container = renderPage();
    const ids = (section: string) => rowsIn(container, section).map((row) => row.dataset.nowRow);
    expect(ids('what-changed')).toEqual(developmentsNewestFirst().map((row) => row.id));
    expect(ids('open-questions')).toEqual(questionsWithArguments().map(({ question }) => question.id));
    expect(ids('what-people-argue-about')).toEqual(standaloneArguments().map((argument) => argument.id));
    expect(ids('announced-against-delivered')).toEqual(DELIVERY_GAPS.map((gap) => gap.id));
  });

  it('draws one figure row per trajectory with two dated, labelled ends and a source link', () => {
    const container = renderPage();
    const figure = container.querySelector('[data-figure-frame="now-trajectories"]')!;
    const rows = [...figure.querySelectorAll<HTMLElement>('[data-trajectory]')];
    expect(rows.map((row) => row.dataset.trajectory)).toEqual(TRAJECTORIES.map((row) => row.id));
    for (const row of rows) {
      const ends = [...row.querySelectorAll('[data-trajectory-end]')];
      expect(ends.map((end) => end.getAttribute('data-trajectory-end')).sort(), row.dataset.trajectory).toEqual([
        'earlier',
        'later',
      ]);
      for (const end of ends) {
        expect(end.querySelector('time')?.getAttribute('dateTime'), row.dataset.trajectory).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(end.querySelector('.font-mono')?.textContent?.trim()).not.toBe('');
      }
      const method = figure.querySelector(`[data-method-row="${row.dataset.trajectory}"]`)!;
      expect(method.querySelectorAll('a[data-source-link][href^="https://"]').length).toBeGreaterThan(0);
    }
  });

  it('labels a computed end as computed', () => {
    const container = renderPage();
    const shipments = container.querySelector('[data-trajectory="humanoid-shipments"] [data-trajectory-end="earlier"]');
    expect(shipments?.querySelector('[data-source-mark="computed"]')).not.toBeNull();
  });

  it('renders a linked argument once, under its question', () => {
    const container = renderPage();
    for (const argument of NOW_ARGUMENTS) {
      const asRow = container.querySelectorAll(`[data-now-row="${argument.id}"]`).length;
      const underQuestion = container.querySelectorAll(`[data-linked-argument="${argument.id}"]`).length;
      expect(asRow + underQuestion, argument.id).toBe(1);
      if (argument.questionId) {
        expect(underQuestion, argument.id).toBe(1);
        expect(
          container.querySelector(`[data-now-row="${argument.questionId}"] [data-linked-argument="${argument.id}"]`),
        ).not.toBeNull();
      }
      for (const position of argument.positions) {
        expect(container.querySelectorAll(`[data-position="${position.id}"] q`), position.id).toHaveLength(1);
        expect(container.querySelector(`[data-position="${position.id}"] q`)?.textContent).toBe(position.quote);
      }
    }
  });

  it('prints each position’s side label, role and context from the data, beside its quote', () => {
    const container = renderPage();
    for (const argument of NOW_ARGUMENTS) {
      for (const position of argument.positions) {
        const cells = [...container.querySelectorAll<HTMLElement>(`[data-position="${position.id}"]`)];
        const text = cells.map((cell) => cell.textContent).join(' ');
        expect(text, position.id).toContain(position.side);
        expect(text, position.id).toContain(position.role);
        if (position.context) expect(text, position.id).toContain(position.context);
      }
    }
  });

  it('heads the gap table by what each column holds and follows each number with its kind', () => {
    const container = renderPage();
    const heads = [...container.querySelectorAll('#announced-against-delivered thead th')].map((th) => th.textContent);
    expect(heads).toEqual(['Who', 'Headline number', 'Delivered', 'As of', 'Source']);
    for (const gap of DELIVERY_GAPS) {
      const row = container.querySelector(`[data-now-row="${gap.id}"]`)!;
      for (const side of ['promised', 'delivered'] as const) {
        const cell = row.querySelector(`[data-gap-value="${side}"]`);
        const { value, countKind } = gap[side];
        if (value !== null) {
          expect(cell?.textContent, `${gap.id} ${side}`).toBe(`${formatGapValue(gap, side)} ${countKind}`);
        } else if (side === 'promised' && countKind === 'milestone') {
          expect(cell?.textContent, `${gap.id} ${side}`).toBe(countKind);
        } else {
          expect(cell, `${gap.id} ${side}`).toBeNull();
        }
      }
      expect(row.textContent, gap.id).toContain(gap.unit);
      expect(row.textContent, gap.id).toContain(gap.promised.what);
      expect(row.textContent, gap.id).toContain(gap.delivered.what);
      const links = [...row.querySelectorAll<HTMLAnchorElement>('td.hidden a[data-source-link]')].map((a) => a.getAttribute('href'));
      expect(links, gap.id).toEqual(gapSources(gap).map((source) => source.sourceUrl));
    }
  });

  it('prints a delivered side with no figure as its stored sentence alone, and "not disclosed" only where the data says it', () => {
    const container = renderPage();
    const pending = DELIVERY_GAPS.filter((gap) => gap.delivered.value === null);
    expect(pending.length).toBeGreaterThan(0);
    for (const gap of pending) {
      const cell = container.querySelectorAll(`[data-now-row="${gap.id}"] td`)[1] as HTMLElement;
      expect(cell.querySelector('[data-gap-value]'), gap.id).toBeNull();
      const sentence = [...cell.querySelectorAll(':scope > span')].find((span) => span.textContent === gap.delivered.what);
      expect(sentence, gap.id).toBeDefined();
    }
    const occurrences = (text: string) => text.split('not disclosed').length - 1;
    const stored = DELIVERY_GAPS.flatMap((gap) => [gap.who, gap.unit, gap.promised.what, gap.delivered.what]).join(' ');
    const table = container.querySelector('#announced-against-delivered table')?.textContent ?? '';
    expect(occurrences(table)).toBe(occurrences(stored));
  });

  it('shows a stated end’s note beside that end under How this was made, its page linked once in that end', () => {
    const container = renderPage();
    for (const trajectory of TRAJECTORIES) {
      const method = container.querySelector(`[data-method-row="${trajectory.id}"]`)!;
      for (const which of ['earlier', 'later'] as const) {
        const note = endNote(trajectory.id, which);
        const shown = method.querySelector(`[data-end-note="${which}"]`);
        if (note) {
          expect(shown?.textContent, trajectory.id).toContain(note.text);
          const links = [...method.querySelectorAll(`[data-method-end="${which}"] a[data-source-link]`)];
          expect(links.filter((a) => a.getAttribute('href') === note.sourceUrl), trajectory.id).toHaveLength(1);
        } else {
          expect(shown, `${trajectory.id} ${which}`).toBeNull();
        }
      }
    }
  });

  it('prints How this was made as sentences, each page once per end and each period or label once', () => {
    const container = renderPage();
    for (const row of resolvedTrajectories()) {
      const method = container.querySelector(`[data-method-row="${row.id}"]`)!;
      expect(method.textContent, row.id).not.toContain('Measured by');
      expect(method.querySelector('[data-method-measured]')?.textContent, row.id).toBe(`${row.measuredBy}.`);
      for (const which of ['earlier', 'later'] as const) {
        const end = method.querySelector(`[data-method-end="${which}"]`)!;
        const hrefs = [...end.querySelectorAll('a[data-source-link]')].map((a) => a.getAttribute('href'));
        expect(new Set(hrefs).size, `${row.id} ${which}`).toBe(hrefs.length);
        const pages = [...row[which].sources.map((source) => source.sourceUrl), endNote(row.id, which)?.sourceUrl];
        expect(new Set(hrefs), `${row.id} ${which}`).toEqual(new Set(pages.filter(Boolean)));
      }
      const said = (text: string, part: string) => text.split(part).length - 1;
      for (const which of ['earlier', 'later'] as const) {
        const text = method.querySelector(`[data-method-end="${which}"] [data-method-when]`)?.textContent ?? '';
        const { period, label } = row[which];
        expect(said(text, period), `${row.id} ${which}: ${text}`).toBeLessThanOrEqual(1);
        expect(said(text, label), `${row.id} ${which}: ${text}`).toBe(1);
        if (!label.includes(period)) expect(said(text, period), `${row.id} ${which}`).toBe(1);
      }
    }
    const when = (id: string, which: 'earlier' | 'later') =>
      container.querySelector(`[data-method-row="${id}"] [data-method-end="${which}"] [data-method-when]`)?.textContent;
    expect(when('robotics-venture-funding', 'earlier')).toBe('Q3 2025');
    expect(when('ukraine-ground-robot-missions', 'earlier')).toBe('January 2026');
    expect(when('ukraine-ground-robot-missions', 'later')).toBe('October 2026, a record');
    expect(when('gemini-robotics-release-gap', 'earlier')).toBe('Gemini Robotics 1.5 to 2');
    expect(when('robolab-120-success', 'earlier')).toBe('π0, October 2024');
    expect(when('da-vinci-installed-base', 'earlier')).toBe('30 September 2025. Installed base');
  });

  it('says it is the publication date that is missing when an evidence source gives none', () => {
    const container = renderPage();
    const undated = OPEN_QUESTIONS.flatMap((question) =>
      [question.evidenceFor, question.evidenceAgainst].filter(isSourced).map((side) => ({ question, side })),
    ).filter(({ side }) => stated(side.published) === null);
    expect(undated.length).toBeGreaterThan(0);
    for (const { question, side } of undated) {
      const row = container.querySelector(`[data-now-row="${question.id}"]`)!.cloneNode(true) as HTMLElement;
      for (const hidden of row.querySelectorAll('.sr-only')) hidden.remove();
      expect(row.textContent, question.id).toContain(`${side.publisher}, date ${side.published}`);
    }
  });

  it('gives each two-sided table a phone line naming the row, so no column is pinned or hidden past the edge', () => {
    const container = renderPage();
    const subjects = [
      ...DELIVERY_GAPS.map((gap) => ({ id: gap.id, text: gap.who })),
      ...OPEN_QUESTIONS.map((question) => ({ id: question.id, text: question.question })),
    ];
    for (const { id, text } of subjects) {
      const line = container.querySelector(`tbody[data-now-row="${id}"] > tr.sm\\:hidden > th[scope="rowgroup"]`);
      expect(line?.textContent, id).toContain(text);
      expect(line?.getAttribute('colspan'), id).toBe('2');
    }
    expect(container.querySelectorAll('#open-questions .sticky, #announced-against-delivered .sticky')).toHaveLength(0);
  });

  it('states what the gap table compares without calling every right side a delivered count', () => {
    const container = renderPage();
    const lead = container.querySelector('#announced-against-delivered > p')?.textContent;
    expect(lead).toBe(
      `In each of the ${DELIVERY_GAPS.length} rows, the left is what was announced, ordered, registered or produced, and the right is what the cited page shows so far, each number with what it counts; each side carries its own date.`,
    );
  });

  it('gives every table row and every quote a source link', () => {
    const container = renderPage();
    const rows = NOW_SECTIONS.slice(1).flatMap((section) => rowsIn(container, section.id));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.querySelectorAll('a[data-source-link][href^="https://"]').length, row.dataset.nowRow).toBeGreaterThan(0);
    }
    for (const position of container.querySelectorAll<HTMLElement>('[data-position]')) {
      expect(position.querySelector('a[data-source-link]'), position.dataset.position).not.toBeNull();
    }
  });

  it('marks a reported row with the data word and explains the mark under its table', () => {
    const container = renderPage();
    const ukraine = container.querySelector('[data-now-row="ukraine-ground-robot-record"]');
    expect(ukraine?.querySelector('[data-source-mark="reported"]')?.textContent).toBe('reported');
    expect(container.querySelector('#what-changed [data-reported-note]')).not.toBeNull();
    const primary = container.querySelector('[data-now-row="gxo-apptronik-letter-of-intent"]');
    expect(primary?.querySelector('[data-source-mark]')).toBeNull();
  });
});
