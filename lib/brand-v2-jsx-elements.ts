/**
 * The element tree of a document that mounts components, read from its own
 * markup.
 *
 * Where a mount sits in the document is a structural fact: an element is a
 * child of another element because of how the page is written, and no prop a
 * mount carries can change it. That is the difference between this module
 * and reading a mount's attributes — a mount can rewrite what it says about
 * itself by editing a prop, but it can only become somebody's child by being
 * moved inside them, which changes what the document is.
 *
 * The scan is deliberately quote- and brace-aware rather than a regular
 * expression over `[^>]*`: `<Stat value=">1,000h" />` closes its tag at the
 * quoted `>` under a naive scan, and a tree built on that is wrong in a way
 * that reads as a legitimate nesting.
 */

/** One tag occurrence, as the document writes it. */
export type JsxTag = {
  name: string;
  /** Index of the opening `<`. */
  index: number;
  /** Index of the closing `>`. */
  end: number;
  closing: boolean;
  selfClosing: boolean;
  /** Verbatim text between the tag name and `>`, trailing `/` included. */
  attributes: string;
};

/** One component element, with the component elements that enclose it. */
export type JsxElementOccurrence = {
  name: string;
  index: number;
  attributes: string;
  selfClosing: boolean;
  /** Enclosing component elements, outermost first. */
  ancestors: string[];
};

/** Blanks a span while preserving every index and every newline. */
function blank(text: string, start: number, end: number): string {
  const masked = text
    .slice(start, end)
    .replace(/[^\n]/g, ' ');
  return text.slice(0, start) + masked + text.slice(end);
}

/**
 * Markdown code, where a `<Component>` is an example rather than a mount.
 *
 * Fenced blocks first, then the inline spans that survive them, so a
 * backtick inside a fence cannot open a span. Lengths are preserved because
 * every index this module reports is compared against the unmasked source.
 */
export function maskMarkdownCode(text: string): string {
  let output = text;
  const fence = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^[ \t]*\1[^\n]*$/gm;
  for (const match of text.matchAll(fence)) {
    const start = match.index!;
    output = blank(output, start, start + match[0].length);
  }
  const inline = /`+[^`\n]*`+/g;
  for (const match of output.matchAll(inline)) {
    const start = match.index!;
    output = blank(output, start, start + match[0].length);
  }
  for (const match of output.matchAll(/<!--[\s\S]*?-->/g)) {
    const start = match.index!;
    output = blank(output, start, start + match[0].length);
  }
  for (const match of output.matchAll(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g)) {
    const start = match.index!;
    output = blank(output, start, start + match[0].length);
  }
  return output;
}

/**
 * TypeScript comments, blanked in place.
 *
 * `lib/source-comments.ts` does this too, but it compacts the text, and
 * every index here is an offset into the file the census also reports mount
 * positions from.
 */
export function maskScriptComments(text: string): string {
  let output = text;
  let index = 0;
  let quote: string | null = null;
  while (index < text.length) {
    const char = text[index];
    if (quote !== null) {
      if (char === '\\') {
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      index += 1;
      continue;
    }
    if (char === '/' && text[index + 1] === '/') {
      let end = text.indexOf('\n', index);
      if (end === -1) end = text.length;
      output = blank(output, index, end);
      index = end;
      continue;
    }
    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2);
      const end = close === -1 ? text.length : close + 2;
      output = blank(output, index, end);
      index = end;
      continue;
    }
    index += 1;
  }
  return output;
}

/** Every tag in the text, read with quote and brace awareness. */
export function scanJsxTags(text: string): JsxTag[] {
  const tags: JsxTag[] = [];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('<', index);
    if (open === -1) break;
    const head = /^(\/?)([A-Za-z][A-Za-z0-9._]*)/.exec(text.slice(open + 1));
    if (head === null) {
      index = open + 1;
      continue;
    }
    let cursor = open + 1 + head[0].length;
    let quote: string | null = null;
    let depth = 0;
    let close = -1;
    while (cursor < text.length) {
      const char = text[cursor];
      if (quote !== null) {
        if (char === '\\') {
          cursor += 2;
          continue;
        }
        if (char === quote) quote = null;
        cursor += 1;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        cursor += 1;
        continue;
      }
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (depth === 0 && char === '>') {
        close = cursor;
        break;
      } else if (depth === 0 && char === '<') break;
      cursor += 1;
    }
    if (close === -1) {
      index = open + 1;
      continue;
    }
    const attributes = text.slice(open + 1 + head[0].length, close);
    tags.push({
      name: head[2],
      index: open,
      end: close,
      closing: head[1] === '/',
      selfClosing: attributes.trimEnd().endsWith('/'),
      attributes,
    });
    index = close + 1;
  }
  return tags;
}

/**
 * Every occurrence of a named component in the document, with its enclosing
 * component elements.
 *
 * `componentNames` is the set of names the document itself provides —
 * imports, local declarations, and for MDX the globally supplied component
 * map. Restricting the stack to those names is what keeps a TypeScript
 * generic (`useState<Shape>()`) from being read as an unclosed element, and
 * it is derived from the module rather than typed here.
 *
 * A closing tag that does not match the open element, or an element left
 * open at the end of the file, throws. A tree that did not parse must not
 * resolve to "this mount has no ancestors", because that is the answer that
 * would silently exempt a nested mount from a cross-context comparison.
 */
export function componentElementTree(input: {
  text: string;
  path: string;
  componentNames: ReadonlySet<string>;
}): JsxElementOccurrence[] {
  const masked = input.path.endsWith('.mdx')
    ? maskMarkdownCode(input.text)
    : maskScriptComments(input.text);
  const stack: JsxTag[] = [];
  const occurrences: JsxElementOccurrence[] = [];
  for (const tag of scanJsxTags(masked)) {
    if (!input.componentNames.has(tag.name)) continue;
    if (tag.closing) {
      const open = stack.pop();
      if (open?.name !== tag.name) {
        throw new Error(
          `${input.path} closes </${tag.name}> at ${tag.index} where <${open?.name ?? 'nothing'}> is open, so the element tree cannot be read`,
        );
      }
      continue;
    }
    occurrences.push({
      name: tag.name,
      index: tag.index,
      attributes: tag.attributes,
      selfClosing: tag.selfClosing,
      ancestors: stack.map(({ name }) => name),
    });
    if (!tag.selfClosing) stack.push(tag);
  }
  if (stack.length > 0) {
    throw new Error(
      `${input.path} leaves <${stack.map(({ name }) => name).join('>, <')}> unclosed, so the element tree cannot be read`,
    );
  }
  return occurrences;
}

/**
 * Value imports, as name to module specifier. Type-only imports are skipped:
 * a type never renders, and an imported type name is exactly what a generic
 * argument looks like to a tag scanner.
 */
export function importedNames(text: string): Map<string, string> {
  const names = new Map<string, string>();
  const pattern =
    /import\s+(type\s+)?([^;'"]*?)\s+from\s+['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(pattern)) {
    if (match[1]) continue;
    const specifier = match[3];
    const clause = match[2];
    const braces = /\{([\s\S]*?)\}/.exec(clause);
    const defaultName = clause.split('{')[0].replace(/,\s*$/, '').trim();
    if (/^[A-Za-z_$][\w$]*$/.test(defaultName)) {
      names.set(defaultName, specifier);
    }
    if (braces) {
      for (const member of braces[1].split(',')) {
        const trimmed = member.trim();
        if (trimmed.length === 0) continue;
        if (/^type\s/.test(trimmed)) continue;
        const alias = /(?:^|\s)as\s+([A-Za-z_$][\w$]*)$/.exec(trimmed);
        const local = alias
          ? alias[1]
          : /^[A-Za-z_$][\w$]*/.exec(trimmed)?.[0] ?? '';
        if (local.length > 0) names.set(local, specifier);
      }
    }
  }
  return names;
}

/** Component-cased bindings the module declares for itself. */
export function declaredComponentNames(text: string): Set<string> {
  const names = new Set<string>();
  for (const match of text.matchAll(
    /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Z][A-Za-z0-9]*)/g,
  )) {
    names.add(match[1]);
  }
  for (const match of text.matchAll(
    /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Za-z0-9]*)\s*[=:]/g,
  )) {
    names.add(match[1]);
  }
  return names;
}
