/**
 * rehype plugin: link the first prose mention of each glossary term to its
 * /glossary/#<id> entry.
 *
 * Prose is the text of paragraphs and list items. Headings, captions,
 * figures, tables, block quotes, code, math, citation chips and text inside
 * quotation marks are not prose, so a mention there neither counts nor gets
 * a link. An authored <Term id="x"> is an inline-definition trigger that
 * already links to /glossary/#x, so when it comes first it is the first
 * mention and nothing is added. A mention inside another link is left as it
 * is, because links cannot nest; the next mention gets the link.
 *
 * A term's names are its registry name and, for names such as "operational
 * design domain (ODD)", the name before the parenthesis and the abbreviation
 * in it. A space in a name also matches a hyphen ("end-effector"), a plural
 * "s" or "es" is part of the mention, and an all-capital name such as "PPO"
 * matches only in capitals.
 *
 * Options: `{ terms: [{ id, term }] }`, the glossary registry, passed from
 * next.config.ts so the compiled articles change when the glossary does.
 * Plain ESM with no dependencies, like the other local rehype plugins.
 */

const SKIP_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'figcaption', 'table', 'blockquote',
  'pre', 'code', 'kbd', 'samp', 'math', 'svg', 'q', 'cite', 'script', 'style',
]);
const PROSE_TAGS = new Set(['p', 'li']);
const QUOTED = /“[^”]*”|"[^"]*"/g;

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The names a glossary term is mentioned by, longest first. */
export function glossaryNames(term) {
  const names = [term];
  const abbreviated = /^(.*\S)\s*\(([^)]+)\)$/.exec(term);
  if (abbreviated) names.push(abbreviated[1], abbreviated[2]);
  return names.sort((a, b) => b.length - a.length);
}

function namePattern(name) {
  const body = escape(name).replace(/ /g, '[\\s\\u00a0-]');
  return `${body}(?:e?s)?`;
}

/** One matcher per term: its names as a single alternation. */
export function glossaryMatcher(term) {
  const names = glossaryNames(term);
  const capitals = names.filter((name) => /\p{L}/u.test(name) && name === name.toUpperCase());
  const others = names.filter((name) => !capitals.includes(name));
  const edge = (body, flags) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, flags);
  return [
    others.length ? edge(others.map(namePattern).join('|'), 'giu') : null,
    capitals.length ? edge(capitals.map(namePattern).join('|'), 'gu') : null,
  ].filter(Boolean);
}

function className(node) {
  const value = node.properties?.className;
  return Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(/\s+/) : [];
}

function jsxAttribute(node, name) {
  return node.attributes?.find((attribute) => attribute.name === name)?.value;
}

/** The first unquoted match of any of the term's matchers in `text`. */
function firstMention(text, matchers) {
  const quoted = [...text.matchAll(QUOTED)].map((m) => [m.index, m.index + m[0].length]);
  let best = null;
  for (const matcher of matchers) {
    matcher.lastIndex = 0;
    for (const match of text.matchAll(matcher)) {
      if (quoted.some(([from, to]) => match.index >= from && match.index < to)) continue;
      if (!best || match.index < best.index) best = { index: match.index, length: match[0].length };
      break;
    }
  }
  return best;
}

export default function rehypeGlossaryLinks(options = {}) {
  const terms = (options.terms ?? []).map(({ id, term }) => ({ id, matchers: glossaryMatcher(term) }));

  return (tree) => {
    const linked = new Set();

    /** Splits text nodes in `parent` at each first mention, in reading order. */
    const linkText = (parent, index) => {
      const node = parent.children[index];
      let earliest = null;
      for (const term of terms) {
        if (linked.has(term.id)) continue;
        const mention = firstMention(node.value, term.matchers);
        if (mention && (!earliest || mention.index < earliest.mention.index)) earliest = { term, mention };
      }
      if (!earliest) return 1;
      const { term, mention } = earliest;
      linked.add(term.id);
      const before = node.value.slice(0, mention.index);
      const text = node.value.slice(mention.index, mention.index + mention.length);
      const after = node.value.slice(mention.index + mention.length);
      const replacement = [
        ...(before ? [{ type: 'text', value: before }] : []),
        {
          type: 'element',
          tagName: 'a',
          properties: { href: `/glossary/#${term.id}`, dataGlossaryTerm: term.id },
          children: [{ type: 'text', value: text }],
        },
        ...(after ? [{ type: 'text', value: after }] : []),
      ];
      parent.children.splice(index, 1, ...replacement);
      // The text after the link may hold the first mention of another term.
      return replacement.length - (after ? 1 : 0);
    };

    const walk = (parent, prose) => {
      for (let index = 0; index < (parent.children?.length ?? 0); ) {
        const node = parent.children[index];
        if (node.type === 'text') {
          index += prose ? linkText(parent, index) : 1;
          continue;
        }
        index += 1;
        if (node.type === 'mdxJsxTextElement' && node.name === 'Term') {
          const id = jsxAttribute(node, 'id');
          if (prose && typeof id === 'string') linked.add(id);
          continue;
        }
        if (node.type === 'mdxJsxTextElement' && node.name === 'Cite') continue;
        if (node.type === 'mdxJsxFlowElement' && /Figure|Table/.test(node.name ?? '')) continue;
        if (node.type === 'element') {
          if (SKIP_TAGS.has(node.tagName) || node.tagName === 'a') continue;
          if (className(node).some((name) => name.startsWith('katex') || name.startsWith('math'))) continue;
          walk(node, prose || PROSE_TAGS.has(node.tagName));
          continue;
        }
        if (node.children) walk(node, prose);
      }
    };

    walk(tree, false);
  };
}
