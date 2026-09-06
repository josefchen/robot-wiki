/**
 * What a box that scrolls owes a reader who cannot point at it.
 *
 * Three facts, and they only work together: the box takes focus, it says
 * what it is when focus lands on it, and it is a region rather than an
 * anonymous div so a screen reader announces the boundary at all. A box
 * with a tab stop and no name is the worse half-measure, because the
 * keyboard reader now stops somewhere that tells them nothing.
 *
 * Three unrelated call sites need the same three attributes: the React
 * table primitive, the rehype pass that names display equations and code
 * samples, and the hand-placed code block. They spell attributes
 * differently - React wants `aria-labelledby`, hast wants `ariaLabelledBy`
 * - so the rule lives here once and each spelling is derived from it.
 *
 * Plain ESM with no dependencies, like lib/rehype-scroll-regions.mjs: the
 * MDX pipeline loads its plugins outside the TypeScript build, so anything
 * a plugin imports has to be loadable as-is.
 *
 * @typedef {{ label: string, labelledBy?: undefined } |
 *           { labelledBy: string, label?: undefined }} ScrollRegionName
 */

export const SCROLL_REGION_ROLE = 'region';
export const SCROLL_REGION_TAB_INDEX = 0;

/**
 * @param {ScrollRegionName} name
 * @returns {{ kind: 'label' | 'labelledby', value: string }}
 */
function resolveName(name) {
  const labelledBy = (name.labelledBy ?? '').trim();
  if (labelledBy) return { kind: 'labelledby', value: labelledBy };
  const label = (name.label ?? '').trim();
  if (label) return { kind: 'label', value: label };
  throw new Error(
    'a scroll region needs an accessible name: pass label or labelledBy',
  );
}

/**
 * DOM and React spelling, for `components/ui/table-scroll.tsx` and any
 * other element rendered through JSX.
 *
 * @param {ScrollRegionName} name
 */
export function scrollRegionAttributes(name) {
  const resolved = resolveName(name);
  return {
    role: SCROLL_REGION_ROLE,
    tabIndex: SCROLL_REGION_TAB_INDEX,
    ...(resolved.kind === 'label'
      ? { 'aria-label': resolved.value }
      : { 'aria-labelledby': resolved.value }),
  };
}

/**
 * hast spelling, for the rehype pass. `hast-util-to-html` and the MDX
 * JSX serializer both map these camelCase property names onto the
 * hyphenated attributes.
 *
 * @param {ScrollRegionName} name
 */
export function scrollRegionHastProperties(name) {
  const resolved = resolveName(name);
  return {
    role: SCROLL_REGION_ROLE,
    tabIndex: SCROLL_REGION_TAB_INDEX,
    ...(resolved.kind === 'label'
      ? { ariaLabel: resolved.value }
      : { ariaLabelledBy: resolved.value }),
  };
}

/**
 * The name a display equation's scroll box carries.
 *
 * Numbered within its own document: a page carrying eleven equations gives
 * eleven regions, and two regions with the same name are two boundaries a
 * reader cannot tell apart. The TeX itself would be a worse name - read
 * aloud, `\frac{1}{2}` is noise - and the typeset content is already
 * exposed as MathML inside the box.
 *
 * @param {number} ordinal 1-based, in document order.
 */
export function displayEquationRegionName(ordinal) {
  return `Display equation ${ordinal}`;
}

/**
 * The name a code sample's scroll box carries when the fence declares no
 * title. A titled fence is named by its own caption instead, which is the
 * filename an author already wrote.
 *
 * @param {{ language?: string | null, ordinal: number }} input
 */
export function codeSampleRegionName({ language, ordinal }) {
  const named = (language ?? '').trim();
  return named
    ? `${named} code sample ${ordinal}`
    : `Code sample ${ordinal}`;
}

/**
 * The id given to a code sample's own caption so its `<pre>` can borrow it.
 *
 * @param {number} ordinal 1-based, in document order.
 */
export function codeSampleTitleId(ordinal) {
  return `code-sample-${ordinal}-title`;
}
