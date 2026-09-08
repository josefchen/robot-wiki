/** A frontmatter reference is not necessarily an inline Cite.
 * Keep duplicate body/component occurrences and mounted method-source links.
 * This helper reports missing obligations; it never derives them from the DOM.
 */
export function missingOccurrences(required: readonly string[], observed: readonly string[]): string[] {
  const remaining = [...observed];
  return required.filter(id => {
    const index = remaining.indexOf(id);
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
  });
}
