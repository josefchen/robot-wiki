import { sentences } from './article-lead.ts';
import { DOMAINS } from '../data/domains.ts';

/**
 * Prose measurement for the Discovery pages: the seven domain hubs,
 * /glossary/, /a-z/, /search/, /credits/, /editorial-policy/ and /about/.
 *
 * Prose Words count paragraphs, definitions and list items written as
 * sentences. Index entries that are only links, form-control labels,
 * navigation and figures (captions and credits included) are not prose.
 * A Word is a whitespace-separated token that contains a letter or digit.
 */
export const DISCOVERY_ROUTES = [
  ...DOMAINS.map((domain) => `/${domain}/` as const),
  '/glossary/',
  '/a-z/',
  '/search/',
  '/credits/',
  '/editorial-policy/',
  '/about/',
] as const;

export type DiscoveryRoute = (typeof DISCOVERY_ROUTES)[number];

export const FIRST_PARAGRAPH_MAX_WORDS = 60;
export const AVERAGE_SENTENCE_MAX_WORDS = 22;

/**
 * Text no reader sees. `.hidden` is the display-none class: outside an
 * article a citation keeps its title and venue in such a span for the
 * label's accessible description, and that apparatus is not page text.
 */
export const HIDDEN_TEXT =
  'script, style, noscript, template, [hidden], .hidden, [aria-hidden="true"], .sr-only';

/** Text that is not prose: hidden text, navigation, controls and figures. */
export const NOT_PROSE = `nav, form, label, button, figure, ${HIDDEN_TEXT}`;
const SENTENCE_END = /[.?!]["”’)]?$/;

export function proseWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** An element's text without the parts NOT_PROSE names. */
function visibleText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  for (const node of Array.from(copy.querySelectorAll(NOT_PROSE))) node.remove();
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function linkShare(element: Element, words: number): number {
  const linked = Array.from(element.querySelectorAll('a, button')).reduce(
    (sum, link) => sum + proseWords(visibleText(link)),
    0,
  );
  return words === 0 ? 1 : linked / words;
}

/**
 * An index line: mostly link or button text, or a line with no closing stop
 * that carries a link or button ("Appears on: Kinematics").
 */
function isIndexLine(element: Element, text: string, words: number): boolean {
  if (linkShare(element, words) >= 0.5) return true;
  return !SENTENCE_END.test(text) && element.querySelector('a, button') !== null;
}

/**
 * The prose blocks of a rendered page, in document order. A paragraph or a
 * definition counts unless it is an index line. A list item counts only
 * when it is written as a sentence: it holds no block of its own, ends with
 * a stop and is not an index line.
 */
export function proseBlocks(root: ParentNode): string[] {
  const blocks: string[] = [];
  for (const element of Array.from(root.querySelectorAll('p, dd, li'))) {
    if (element.closest(NOT_PROSE)) continue;
    const text = visibleText(element);
    const words = proseWords(text);
    if (words === 0 || isIndexLine(element, text, words)) continue;
    if (
      element.tagName === 'LI' &&
      (element.querySelector('p, dd, li') || !SENTENCE_END.test(text))
    ) {
      continue;
    }
    blocks.push(text);
  }
  return blocks;
}

export function proseWordTotal(blocks: readonly string[]): number {
  return blocks.reduce((sum, block) => sum + proseWords(block), 0);
}

/**
 * A glossary definition as the glossary page sets it: a first paragraph of
 * whole sentences within the 60-word limit, then the specifics. The first
 * sentence always opens the first paragraph, so a definition whose opening
 * sentence runs long shows up as a long first paragraph instead of being cut.
 */
export function definitionParagraphs(definition: string): string[] {
  const parts = sentences(definition);
  let words = proseWords(parts[0] ?? '');
  let split = 1;
  while (split < parts.length && words + proseWords(parts[split]) <= FIRST_PARAGRAPH_MAX_WORDS) {
    words += proseWords(parts[split]);
    split += 1;
  }
  const first = parts.slice(0, split).join(' ');
  const rest = parts.slice(split).join(' ');
  return rest ? [first, rest] : [first];
}

/** Words per sentence over every prose block. */
export function averageSentenceLength(blocks: readonly string[]): number {
  let words = 0;
  let count = 0;
  for (const block of blocks) {
    words += proseWords(block);
    count += sentences(block).length;
  }
  return count === 0 ? 0 : words / count;
}

/** The phrase sweep of the opus-pass domain rules (D4), applied to reader text. */
export const DISCOVERY_PHRASE_SWEEP: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  {
    label: 'module or page opener',
    pattern: /(?:^|[.!?]\s+)(?:This module|The previous module|In this module|This page)\b/,
  },
  {
    label: 'audit residue',
    pattern:
      /The inspected body|unresolved source inconsistency|the article's former|authored toy|as printed by the fetched/i,
  },
  { label: 'meta-commentary', pattern: /\bthis wiki\b|\baudit row\b|\bsupporting passage\b|\bledger\b/i },
  {
    label: 'repository path',
    pattern: /(?:^|[\s(`'"])(?:lib|components|data|scripts|content)\/|\b[\w-]+\.(?:tsx?|mdx)\b/,
  },
];

export function phraseSweepHits(text: string): string[] {
  return DISCOVERY_PHRASE_SWEEP.filter(({ pattern }) => pattern.test(text)).map(
    ({ label }) => label,
  );
}

export type DiscoveryMeasure = {
  route: string;
  words: number;
  firstParagraph: string;
  firstParagraphWords: number;
  averageSentence: number;
  sweep: string[];
};

/** Measures one rendered Discovery page from its `<main>`. */
export function measureDiscoveryPage(route: string, main: Element): DiscoveryMeasure {
  const blocks = proseBlocks(main);
  const visible = main.cloneNode(true) as Element;
  for (const node of Array.from(visible.querySelectorAll(HIDDEN_TEXT))) node.remove();
  const text = (visible.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    route,
    words: proseWordTotal(blocks),
    firstParagraph: blocks[0] ?? '',
    firstParagraphWords: proseWords(blocks[0] ?? ''),
    averageSentence: Number(averageSentenceLength(blocks).toFixed(1)),
    sweep: phraseSweepHits(text),
  };
}

/** Prose Words each Discovery page may hold: its count at the end of its latest pass. */
export type DiscoveryBudgets = Readonly<Record<string, number>>;

export type DiscoveryFinding = {
  route: string;
  rule: 'missing' | 'unbudgeted' | 'budget' | 'first-paragraph' | 'sentence-length' | 'phrase-sweep';
  detail: string;
};

/**
 * Holds every Discovery page to its budget and to the prose rules: the
 * first paragraph within 60 words, sentences averaging 22 words or fewer,
 * and a clean phrase sweep. A page the export lacks, or one without a
 * budget, is a finding too, so the check cannot pass by measuring less.
 */
export function discoveryFindings(
  measures: readonly DiscoveryMeasure[],
  budgets: DiscoveryBudgets,
): DiscoveryFinding[] {
  const findings: DiscoveryFinding[] = [];
  for (const route of DISCOVERY_ROUTES) {
    const page = measures.find((measure) => measure.route === route);
    const budget = budgets[route];
    if (!page) {
      findings.push({ route, rule: 'missing', detail: 'not measured' });
      continue;
    }
    if (budget === undefined) {
      findings.push({ route, rule: 'unbudgeted', detail: `${page.words} words and no budget` });
    } else if (page.words > budget) {
      findings.push({ route, rule: 'budget', detail: `${page.words} words over a budget of ${budget}` });
    }
    if (page.firstParagraphWords > FIRST_PARAGRAPH_MAX_WORDS) {
      findings.push({
        route,
        rule: 'first-paragraph',
        detail: `${page.firstParagraphWords} words over ${FIRST_PARAGRAPH_MAX_WORDS}`,
      });
    }
    if (page.averageSentence > AVERAGE_SENTENCE_MAX_WORDS) {
      findings.push({
        route,
        rule: 'sentence-length',
        detail: `${page.averageSentence} words per sentence over ${AVERAGE_SENTENCE_MAX_WORDS}`,
      });
    }
    for (const label of page.sweep) findings.push({ route, rule: 'phrase-sweep', detail: label });
  }
  return findings;
}
