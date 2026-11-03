/** The native selection fields retained in a ledger control-state string. */
const SELECTION_FIELDS = ['checked', 'aria-checked', 'aria-pressed', 'aria-selected'] as const;
type SelectionField = (typeof SELECTION_FIELDS)[number];
type SelectionValue = 'true' | 'false' | 'mixed';

function selectionFields(state: string) {
  const values = new Map<SelectionField, SelectionValue>();
  let invalid = false;
  let declared = false;
  // A slider/text value can quote arbitrary words in its value text. Button
  // labels likewise follow this delimiter and are never native state evidence.
  const label = state.startsWith('label=') ? 0 : state.indexOf(' label=');
  const prefix = label < 0 ? state : state.slice(0, label);
  if (prefix.startsWith('value=') || prefix.startsWith('open=')) return { values, invalid, declared };
  const seen = new Set<SelectionField>();
  for (const token of prefix.split(' ')) {
    const equals = token.indexOf('=');
    if (equals < 0) {
      if (SELECTION_FIELDS.includes(token as SelectionField)) { declared = true; invalid = true; }
      continue;
    }
    const field = token.slice(0, equals) as SelectionField;
    if (!SELECTION_FIELDS.includes(field)) continue;
    const value = token.slice(equals + 1);
    if (seen.has(field)) invalid = true;
    seen.add(field);
    if (value === 'null') continue;
    declared = true;
    if (value === 'true' || value === 'false' || value === 'mixed' && (field === 'aria-pressed' || field === 'aria-checked')) {
      values.set(field, value);
    } else invalid = true;
  }
  return { values, invalid, declared };
}

/**
 * Whether the intended selection has a native witness. Null leaves an
 * ordinary action, disclosure or sort control on its existing state rule.
 * Explicit selection kinds never receive that fallback, even if their state
 * attributes disappear. An independent toggle may deselect; an already
 * selected option may remain selected; a radio must end checked.
 */
export function selectionTransitionSatisfied(kind: string | undefined, before: string, after: string): boolean | null {
  const from = selectionFields(before), to = selectionFields(after);
  const selectionKind = kind === 'toggle' || kind === 'checkbox' || kind === 'radio';
  if (!selectionKind && !from.declared && !to.declared && !from.invalid && !to.invalid) return null;
  if (from.invalid || to.invalid || from.values.size === 0 || from.values.size !== to.values.size) return false;
  if ([...from.values.keys()].some(field => !to.values.has(field))) return false;
  if (new Set(from.values.values()).size !== 1 || new Set(to.values.values()).size !== 1) return false;
  if (kind === 'radio' || kind === 'checkbox') {
    if (!from.values.has('checked') && !from.values.has('aria-checked')) return false;
  }
  if (kind === 'radio') return ![...from.values.values()].includes('mixed') && [...to.values.values()].every(value => value === 'true');
  if (kind === 'checkbox') return [...from.values].every(([field, value]) => to.values.get(field) !== value);
  return [...from.values].every(([field, value]) => to.values.get(field) === 'true' || to.values.get(field) !== value);
}
