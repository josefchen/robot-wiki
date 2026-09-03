import { stripComments } from './source-comments.ts';

/**
 * The concrete marks a semantic colour token paints, and the non-colour cue
 * each one carries.
 *
 * `VAL-B2-COMP-012` requires every semantic token to carry a text, icon or
 * shape cue wherever it is used. The cue used to be measured by running the
 * cue vocabulary over the whole module and copying the result onto every
 * token use in it, which proves nothing about any particular mark: a
 * `role=` on an unrelated button, or a `<path>` in an unrelated chart, kept
 * a colour-only mark green. Removing the `role="alert"` that actually
 * accompanied the error message in `components/three/ik-target-form.tsx`
 * left the row passing on the strength of `data-testid` attributes
 * elsewhere in the file.
 *
 * So the cue is bound to the mark. Each occurrence of a semantic colour is
 * resolved to the element that receives it — the enclosing JSX opening tag,
 * or, when the colour is authored in a class constant, every element that
 * transitively consumes that constant — and the vocabulary is evaluated
 * against that element alone. An occurrence this resolver cannot attach to
 * an element throws rather than being dropped from the population.
 *
 * The vocabulary is also narrower than the module-wide one it replaces.
 * `data-testid`, `data-variant` and `data-state` are gone: a test hook or a
 * machine-readable variant flag is not something a reader perceives, and
 * accepting them meant the check could be satisfied without changing what
 * anyone sees. What remains is a visible non-colour differentiator on the
 * mark (a semantic rule, a weight shift, a dash or marker pattern), an
 * assistive one (`role`, `aria-live`, `aria-invalid`, a label), or the mark
 * being the text that states the condition. "Contains some text somewhere"
 * is still refused: it was measured against every module and found true of
 * all of them, and at mark scope a `<path>`, `<rect>`, `<circle>` or `<line>`
 * fails it, which is exactly the class of mark the requirement is about.
 */
export type SemanticCueForm =
  | 'semantic-rule'
  | 'weight-shift'
  | 'stroke-pattern'
  | 'role-switch'
  | 'assistive-state'
  | 'accessible-label'
  | 'text-carrier';

/** How the authored colour reaches the element that paints it. */
export type SemanticMarkBinding = 'inline' | 'class-constant';

export type SemanticMark = {
  /** `<module>#<line>:<element>` — stable across unrelated edits. */
  id: string;
  module: string;
  token: string;
  /** The concrete form that paints it, e.g. `text-err`, `var(--color-ok)`. */
  form: string;
  /** The element the colour is applied to. */
  element: string;
  /** 1-based line of the occurrence. */
  line: number;
  binding: SemanticMarkBinding;
  /** The constant the colour is authored in, for `class-constant` marks. */
  via: string | null;
  /** Cue forms carried by this mark, sorted. */
  cues: SemanticCueForm[];
};

const CUE_PATTERNS: ReadonlyArray<{ id: SemanticCueForm; pattern: RegExp }> = [
  {
    id: 'semantic-rule',
    pattern: /\bborder(?:-[lrtb])?-(?:ok|warn|error|err|destructive)\b/,
  },
  { id: 'weight-shift', pattern: /\bfont-(?:medium|semibold|bold)\b/ },
  {
    id: 'stroke-pattern',
    pattern:
      /strokeDasharray|stroke-dasharray|markerEnd|markerStart|marker-end|marker-start|strokeLinecap/,
  },
  { id: 'role-switch', pattern: /\brole=/ },
  {
    id: 'assistive-state',
    pattern:
      /\baria-(?:live|invalid|current|pressed|expanded|checked|describedby)\b/,
  },
  {
    id: 'accessible-label',
    pattern: /\baria-label(?:ledby)?\b|\btitle=/,
  },
];

/**
 * Elements whose own content is the information. A cue can be the words the
 * mark renders, but only when the mark renders words: a geometry element
 * carrying the same hue has no content to read.
 */
const TEXT_ELEMENTS: ReadonlySet<string> = new Set([
  'a',
  'button',
  'caption',
  'code',
  'dd',
  'dt',
  'em',
  'figcaption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'li',
  'p',
  'span',
  'strong',
  'summary',
  'td',
  'text',
  'th',
  'tspan',
]);

type OpeningTag = {
  element: string;
  /** Offset of `<`. */
  start: number;
  /** Offset just past the opening tag's `>`. */
  end: number;
  /** Offset just past the element's closing tag, or `end` when self-closing. */
  bodyEnd: number;
  text: string;
  selfClosing: boolean;
};

/**
 * Every JSX opening tag, with the span of the element it opens.
 *
 * A hand-rolled scan rather than a parser because the surrounding code is
 * already scanned this way (`lib/brand-v2-annotation-scan.ts`), and the
 * property that matters is the same: quotes and braces are tracked, so a `>`
 * inside an attribute expression does not close the tag.
 */
export function openingTags(text: string): OpeningTag[] {
  const tags: OpeningTag[] = [];
  let index = 0;
  while (index < text.length) {
    if (text[index] !== '<' || !/[A-Za-z]/.test(text[index + 1] ?? '')) {
      index += 1;
      continue;
    }
    let cursor = index + 1;
    let depth = 0;
    let closed = false;
    while (cursor < text.length) {
      const char = text[cursor];
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        cursor += 1;
        while (cursor < text.length && text[cursor] !== quote) {
          if (text[cursor] === '\\') cursor += 1;
          cursor += 1;
        }
        cursor += 1;
        continue;
      }
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (depth === 0 && char === '>') {
        closed = true;
        break;
      } else if (depth === 0 && char === '<') break;
      cursor += 1;
    }
    if (!closed) {
      index += 1;
      continue;
    }
    const tagText = text.slice(index, cursor + 1);
    const element = /^<([A-Za-z][\w$.:-]*)/.exec(tagText)?.[1] ?? '';
    const selfClosing = /\/>$/.test(tagText.trimEnd());
    tags.push({
      element,
      start: index,
      end: cursor + 1,
      bodyEnd: selfClosing
        ? cursor + 1
        : closingTagEnd(text, element, cursor + 1),
      text: tagText,
      selfClosing,
    });
    index += 1;
  }
  return tags;
}

function closingTagEnd(text: string, element: string, from: number): number {
  const opening = new RegExp(`<${element}\\b`, 'g');
  const closing = new RegExp(`</\\s*${element}\\s*>`, 'g');
  let depth = 1;
  let cursor = from;
  while (cursor < text.length) {
    opening.lastIndex = cursor;
    closing.lastIndex = cursor;
    const nextClose = closing.exec(text);
    if (!nextClose) return text.length;
    const nextOpen = opening.exec(text);
    if (nextOpen && nextOpen.index < nextClose.index) {
      const tagEnd = text.indexOf('>', nextOpen.index);
      if (tagEnd === -1) return text.length;
      if (!/\/>$/.test(text.slice(nextOpen.index, tagEnd + 1).trimEnd())) {
        depth += 1;
      }
      cursor = nextOpen.index + 1;
      continue;
    }
    depth -= 1;
    cursor = nextClose.index + nextClose[0].length;
    if (depth === 0) return cursor;
  }
  return text.length;
}

/** Whether the element renders content of its own. */
function carriesText(text: string, tag: OpeningTag): boolean {
  if (!TEXT_ELEMENTS.has(tag.element) || tag.selfClosing) return false;
  const body = text.slice(tag.end, Math.max(tag.end, tag.bodyEnd));
  return /\S/.test(body.replace(/<\/\s*[A-Za-z][\w$.:-]*\s*>\s*$/, ''));
}

type Constant = { name: string; start: number; end: number; value: string };

function readBalanced(text: string, start: number): number {
  const open = text[start];
  const close = open === '{' ? '}' : open === '[' ? ']' : ')';
  let depth = 0;
  let cursor = start;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      cursor += 1;
      while (cursor < text.length && text[cursor] !== quote) {
        if (text[cursor] === '\\') cursor += 1;
        cursor += 1;
      }
      cursor += 1;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
    cursor += 1;
  }
  return text.length;
}

/**
 * The offset just past a declaration's `=`, skipping a type annotation.
 * Annotations here really do contain `;` and `{` (`Record<Mode, { label:
 * string; color: string }>`), so the initialiser has to be found by
 * tracking nesting rather than by a character class.
 */
function initialiserStart(text: string, from: number): number | null {
  let cursor = from;
  let depth = 0;
  let angle = 0;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      cursor += 1;
      while (cursor < text.length && text[cursor] !== quote) {
        if (text[cursor] === '\\') cursor += 1;
        cursor += 1;
      }
      cursor += 1;
      continue;
    }
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) {
      depth -= 1;
      if (depth < 0) return null;
    } else if (char === '<') angle += 1;
    else if (char === '>' && angle > 0) angle -= 1;
    else if (depth === 0 && angle === 0) {
      if (char === ';' || char === '\n') {
        // A declaration with no initialiser on its own line.
        if (char === ';') return null;
      }
      if (char === '=' && text[cursor + 1] !== '=' && text[cursor + 1] !== '>') {
        let start = cursor + 1;
        while (start < text.length && /\s/.test(text[start])) start += 1;
        return start;
      }
    }
    cursor += 1;
  }
  return null;
}

function statementEnd(text: string, from: number): number {
  let cursor = from;
  let depth = 0;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      cursor += 1;
      while (cursor < text.length && text[cursor] !== quote) {
        if (text[cursor] === '\\') cursor += 1;
        cursor += 1;
      }
      cursor += 1;
      continue;
    }
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) {
      depth -= 1;
      if (depth < 0) return cursor;
    } else if (char === ';' && depth === 0) return cursor;
    cursor += 1;
  }
  return text.length;
}

/**
 * Named holders a colour can be authored in before it reaches an element: a
 * variable declaration, or a function that returns the colour. Both are used
 * here — a variant map of class strings, and a `poleColor(theta)` helper
 * returning `var(--color-err)` past the fall line — and both are resolved to
 * the elements that consume the name.
 */
function namedHolders(text: string): Constant[] {
  const found: Constant[] = [];
  const declaration = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*/g;
  for (const match of text.matchAll(declaration)) {
    const valueStart = initialiserStart(text, match.index + match[0].length);
    if (valueStart === null) continue;
    const opener = text[valueStart];
    const end =
      opener === '{' || opener === '['
        ? readBalanced(text, valueStart)
        : // A bare expression initialiser can span lines (a ternary picking
          // between two `var(--color-*)` strings is the common case here),
          // so the statement ends at its top-level semicolon.
          statementEnd(text, valueStart);
    found.push({
      name: match[1],
      start: valueStart,
      end,
      value: text.slice(valueStart, end),
    });
  }
  const fn = /\bfunction\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/g;
  for (const match of text.matchAll(fn)) {
    const parametersEnd = readBalanced(
      text,
      match.index + match[0].length - 1,
    );
    const bodyStart = text.indexOf('{', parametersEnd);
    if (bodyStart === -1) continue;
    const end = readBalanced(text, bodyStart);
    found.push({
      name: match[1],
      start: bodyStart,
      end,
      value: text.slice(bodyStart, end),
    });
  }
  return found;
}

/** The quoted string an offset sits inside, when it sits inside one. */
function enclosingString(text: string, offset: number): string | null {
  let cursor = 0;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === '"' || char === "'" || char === '`') {
      const start = cursor;
      cursor += 1;
      while (cursor < text.length && text[cursor] !== char) {
        if (text[cursor] === '\\') cursor += 1;
        cursor += 1;
      }
      if (offset > start && offset < cursor) {
        return text.slice(start + 1, cursor);
      }
      cursor += 1;
      continue;
    }
    cursor += 1;
  }
  return null;
}

export type SemanticMarkSource = {
  module: string;
  text: string;
  /** The forms to look for, keyed by the token each one paints. */
  tokenByForm: ReadonlyMap<string, string>;
};

/**
 * Every mark a module paints with a semantic token, with the cues bound to
 * it. Throws when an occurrence cannot be attached to a concrete element,
 * because an occurrence silently dropped from the population is an
 * occurrence the assertion stops quantifying over.
 */
export function deriveSemanticMarks(input: SemanticMarkSource): SemanticMark[] {
  const text = stripComments(input.text);
  const forms = [...input.tokenByForm.keys()];
  if (forms.length === 0) throw new Error('No semantic colour form to scan for');
  const tags = openingTags(text);
  const declared = namedHolders(text);
  const marks = new Map<string, SemanticMark>();

  const cuesFor = (tag: OpeningTag, extra: string): SemanticCueForm[] => {
    const subject = `${tag.text}\n${extra}`;
    const found = CUE_PATTERNS.filter(({ pattern }) =>
      pattern.test(subject),
    ).map(({ id }) => id);
    if (carriesText(text, tag)) found.push('text-carrier');
    return [...new Set(found)].sort();
  };

  const record = (
    tag: OpeningTag,
    token: string,
    form: string,
    offset: number,
    binding: SemanticMarkBinding,
    via: string | null,
    extra: string,
  ): void => {
    const line = text.slice(0, tag.start).split('\n').length;
    const id = `${input.module}#${line}:${tag.element}:${token}`;
    const existing = marks.get(id);
    const cues = cuesFor(tag, extra);
    if (existing) {
      existing.cues = [...new Set([...existing.cues, ...cues])].sort();
      return;
    }
    marks.set(id, {
      id,
      module: input.module,
      token,
      form,
      element: tag.element,
      line: text.slice(0, offset).split('\n').length,
      binding,
      via,
      cues,
    });
  };

  /** Constants that transitively reference the given constant. */
  const referencingConstants = (name: string): Constant[] => {
    const seen = new Set([name]);
    const queue = [name];
    const chain: Constant[] = [];
    while (queue.length > 0) {
      const current = queue.pop() as string;
      for (const candidate of declared) {
        if (seen.has(candidate.name)) continue;
        if (!new RegExp(`\\b${current}\\b`).test(candidate.value)) continue;
        seen.add(candidate.name);
        chain.push(candidate);
        queue.push(candidate.name);
      }
    }
    return chain;
  };

  for (const form of forms) {
    const token = input.tokenByForm.get(form) as string;
    const pattern = new RegExp(
      form.startsWith('var(')
        ? form.replace(/[()\-]/g, (char) => `\\${char}`)
        : `\\b${form}\\b`,
      'g',
    );
    for (const match of text.matchAll(pattern)) {
      const offset = match.index;
      const inline = tags
        .filter((tag) => tag.start < offset && offset < tag.end)
        .at(-1);
      if (inline) {
        record(inline, token, form, offset, 'inline', null, '');
        continue;
      }
      // The innermost holder, so a colour authored in a local constant is
      // attributed to that constant rather than to the component that
      // happens to contain it.
      const holder = declared
        .filter(
          (candidate) => candidate.start <= offset && offset < candidate.end,
        )
        .sort((left, right) => left.end - left.start - (right.end - right.start))
        .at(0);
      if (!holder) {
        throw new Error(
          `${input.module}: ${form} at offset ${offset} is neither inside a JSX element nor inside a named constant, so no mark carries it`,
        );
      }
      const authored = enclosingString(holder.value, offset - holder.start);
      const names = [holder.name, ...referencingConstants(holder.name).map(
        ({ name }) => name,
      )];
      const consumers = tags.filter((tag) =>
        names.some((name) => new RegExp(`\\b${name}\\b`).test(tag.text)),
      );
      if (consumers.length === 0) {
        throw new Error(
          `${input.module}: ${form} is authored in ${holder.name}, which no JSX element consumes, so no mark carries it`,
        );
      }
      for (const consumer of consumers) {
        // A colour handed to a locally defined component is painted by that
        // component's own markup, not by the call site, so the component
        // body is the mark's syntax. The scope stays bounded to that one
        // component rather than widening back out to the module.
        const local = /^[A-Z]/.test(consumer.element)
          ? declared.find(({ name }) => name === consumer.element)
          : undefined;
        record(
          consumer,
          token,
          form,
          offset,
          'class-constant',
          holder.name,
          `${authored ?? holder.value}\n${local?.value ?? ''}`,
        );
      }
    }
  }
  return [...marks.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}
