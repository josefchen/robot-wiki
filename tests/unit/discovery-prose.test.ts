import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '@/data/glossary';
import {
  DISCOVERY_ROUTES,
  FIRST_PARAGRAPH_MAX_WORDS,
  definitionParagraphs,
  discoveryFindings,
  measureDiscoveryPage,
  phraseSweepHits,
  proseBlocks,
  proseWords,
  type DiscoveryBudgets,
} from '@/lib/discovery-prose';

const main = (body: string) =>
  new JSDOM(`<!doctype html><html><body><main>${body}</main></body></html>`).window.document.querySelector('main')!;

const PLANTED = 'A planted sentence that adds words the budget does not allow.';

const PAGES = {
  '/classical/': `<nav><a href="/">Home</a> <a href="/classical/">Classical robotics</a></nav>
    <h1>Classical robotics</h1>
    <p data-plant>Classical robotics is the geometry, estimation, planning and control under every learned policy.</p>
    <ol><li><h2><a href="/classical/kinematics/">Kinematics</a></h2><p>How joint angles set the pose of the hand.</p></li></ol>
    <figure><img alt=""><figcaption>The calibration bench, from the calibration article.</figcaption></figure>`,
  '/glossary/': `<h1>Glossary</h1><p>Each definition is written from a cited primary source.</p>
    <ol><li><h2>Kalman filter</h2><div data-glossary-definition><p data-plant>A Kalman filter fuses a motion model with noisy readings.</p></div>
    <ul><li><a href="https://example.org/kalman">A New Approach to Linear Filtering</a> <span>Kalman, 1960</span></li></ul></li></ol>`,
  '/about/': `<h1>About</h1><p>Robot Wiki covers modern robot learning for engineers who know machine learning.</p>
    <section><h2>Reading</h2><p data-plant>Inside a domain, the reading order is the contents order.</p>
    <form><label>Search the wiki for a term</label><button>Search every article</button></form></section>`,
} as const;

const measure = (route: string, body: string) => measureDiscoveryPage(route, main(body));
const budgetsFor = (pages: Record<string, string>): DiscoveryBudgets =>
  Object.fromEntries(Object.entries(pages).map(([route, body]) => [route, measure(route, body).words]));
const plant = (body: string) => {
  const root = main(body);
  root.querySelector('[data-plant]')!.append(` ${PLANTED}`);
  return root;
};

describe('discovery prose counter', () => {
  it('counts paragraphs, definitions and sentence list items, and nothing else', () => {
    const blocks = proseBlocks(
      main(`<nav><p>Navigation text is not prose.</p></nav>
        <p>A paragraph counts.</p><dl><dt>Term</dt><dd>A definition counts.</dd></dl>
        <ul><li>A list item written as a sentence counts.</li><li>A label without a stop</li>
        <li><a href="/a/">An index entry that is only a link.</a></li></ul>
        <p>Appears on: <a href="/classical/kinematics/">Kinematics</a></p>
        <figure><figcaption><p>A caption is not prose.</p></figcaption></figure>
        <p class="hidden">A visually hidden description is not prose.</p>
        <p aria-hidden="true">Hidden text is not prose.</p>
        <p>Visible <span class="sr-only">screen reader only</span>text counts.</p>`),
    );
    expect(blocks).toEqual([
      'A paragraph counts.',
      'A definition counts.',
      'A list item written as a sentence counts.',
      'Visible text counts.',
    ]);
  });

  it('counts a word as a token that holds a letter or digit', () => {
    expect(proseWords('Waymo drove 271.3 million miles — about 95% of them alone.')).toBe(10);
  });

  it('keeps a definition whole and sets its first paragraph within the limit', () => {
    const long = Array.from({ length: 8 }, (_, i) => `Sentence ${i + 1} adds a further specific fact here.`);
    const parts = definitionParagraphs(long.join(' '));
    expect(parts.join(' ')).toBe(long.join(' '));
    expect(proseWords(parts[0])).toBeLessThanOrEqual(FIRST_PARAGRAPH_MAX_WORDS);
    expect(parts).toHaveLength(2);
    expect(definitionParagraphs('One short definition.')).toEqual(['One short definition.']);
  });

  // The glossary's end-to-end specs compare the entry's text with the
  // registry definition, so the split may not drop or change a character.
  it('rebuilds every registry definition exactly from its paragraphs', () => {
    for (const term of GLOSSARY) {
      const parts = definitionParagraphs(term.definition);
      expect(parts.join(' '), term.id).toBe(term.definition);
      expect(proseWords(parts[0]), term.id).toBeLessThanOrEqual(FIRST_PARAGRAPH_MAX_WORDS);
    }
  });
});

describe('discovery phrase sweep (VAL-OPUS-108)', () => {
  it.each([
    ['This page lists every term.', 'module or page opener'],
    ['The inspected body says so.', 'audit residue'],
    ['Each audit row is kept.', 'meta-commentary'],
    ['Read this wiki in order.', 'meta-commentary'],
    ['The counter lives in lib/discovery-prose.ts.', 'repository path'],
  ])('flags "%s"', (text, label) => {
    expect(phraseSweepHits(text)).toEqual([label]);
  });

  it('passes plain reader text', () => {
    expect(phraseSweepHits('Robot Wiki covers modern robot learning. The page lists each term.')).toEqual([]);
  });
});

describe('discovery budget check (VAL-OPUS-107)', () => {
  const budgets = budgetsFor(PAGES);

  it('passes each page at its budget', () => {
    const measures = Object.entries(PAGES).map(([route, body]) => measure(route, body));
    expect(discoveryFindings(measures, budgets).filter((f) => Object.hasOwn(PAGES, f.route))).toEqual([]);
  });

  it.each(Object.keys(PAGES))('fails %s when it grows by one planted sentence', (route) => {
    const page = PAGES[route as keyof typeof PAGES];
    const grown = measureDiscoveryPage(route, plant(page));
    expect(grown.words).toBe(budgets[route] + proseWords(PLANTED));
    expect(discoveryFindings([grown], budgets).filter((f) => f.route === route)).toEqual([
      { route, rule: 'budget', detail: `${grown.words} words over a budget of ${budgets[route]}` },
    ]);
  });

  it('fails a page the export lacks and a page without a budget', () => {
    const findings = discoveryFindings([measure('/classical/', PAGES['/classical/'])], {});
    expect(findings.find((f) => f.route === '/classical/')?.rule).toBe('unbudgeted');
    expect(findings.filter((f) => f.rule === 'missing')).toHaveLength(DISCOVERY_ROUTES.length - 1);
  });

  it('fails a long first paragraph, long sentences and a sweep hit', () => {
    const long = `<p>${Array.from({ length: 61 }, () => 'word').join(' ')}.</p>`;
    const page = measure('/about/', `${long}<p>Read this wiki.</p>`);
    const rules = discoveryFindings([page], { '/about/': page.words })
      .filter((f) => f.route === '/about/')
      .map((f) => f.rule);
    expect(rules).toEqual(['first-paragraph', 'sentence-length', 'phrase-sweep']);
  });

  it('commits a positive budget for every Discovery page and no other', () => {
    const committed = JSON.parse(readFileSync('data/discovery-budgets.json', 'utf8')) as DiscoveryBudgets;
    expect(Object.keys(committed).sort()).toEqual([...DISCOVERY_ROUTES].sort());
    for (const route of DISCOVERY_ROUTES) expect(committed[route], route).toBeGreaterThan(0);
  });

  it('runs in the gated and the production build, after the export exists', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['check:discovery-prose']).toBe('node scripts/measure-discovery-prose.ts --check');
    for (const hook of ['postbuild', 'vercel-build']) {
      const command = pkg.scripts[hook];
      expect(command, hook).toContain('&& npm run check:discovery-prose &&');
      expect(command.indexOf('check:discovery-prose'), hook).toBeGreaterThan(command.lastIndexOf('next build'));
      expect(command.indexOf('check:discovery-prose'), hook).toBeGreaterThan(command.indexOf('patch-404-guard'));
    }
  });
});
