/**
 * Greek-to-ASCII folding for search terms, shared by both halves of the
 * search stack (lib/search.ts for prose, lib/structured-search.ts for the
 * MiniSearch entity index) so a reader's ASCII spelling and the stored
 * Greek spelling collapse to the same term on both sides.
 *
 * The wiki stores the Physical Intelligence model family with a literal
 * Greek pi in its display name (data/methods.ts: 'π0', 'π0.5', ...). A
 * reader types the ASCII form. MiniSearch's fuzzy distance cannot bridge
 * that gap: Levenshtein('pi0', 'π0') is 2 while the configured maximum is
 * 1, so the ASCII query missed the model entirely and landed on the
 * company whose alias list happens to contain 'Pi'.
 *
 * Folding is deliberately one-directional and applied to BOTH the indexed
 * term and the query term, which is what makes the ASCII spelling work
 * without taking the Greek spelling away.
 */

/**
 * Conventional ASCII transliterations of the Greek alphabet. Final sigma
 * folds to the same 's' as medial sigma; the accented vowels of modern
 * Greek fold to their unaccented letter names.
 */
const GREEK_TO_ASCII: Record<string, string> = {
  α: 'alpha',
  β: 'beta',
  γ: 'gamma',
  δ: 'delta',
  ε: 'epsilon',
  ζ: 'zeta',
  η: 'eta',
  θ: 'theta',
  ι: 'iota',
  κ: 'kappa',
  λ: 'lambda',
  μ: 'mu',
  ν: 'nu',
  ξ: 'xi',
  ο: 'omicron',
  π: 'pi',
  ρ: 'rho',
  σ: 's',
  ς: 's',
  τ: 'tau',
  υ: 'upsilon',
  φ: 'phi',
  χ: 'chi',
  ψ: 'psi',
  ω: 'omega',
  ά: 'alpha',
  έ: 'epsilon',
  ή: 'eta',
  ί: 'iota',
  ό: 'omicron',
  ύ: 'upsilon',
  ώ: 'omega',
  ϊ: 'iota',
  ϋ: 'upsilon',
};

/** True when the string contains at least one Greek letter we can fold. */
export function hasGreekLetter(value: string): boolean {
  for (const character of value.toLowerCase()) {
    if (character in GREEK_TO_ASCII) return true;
  }
  return false;
}

/**
 * Replaces every Greek letter with its ASCII name, lowercasing the whole
 * string. 'π0.5' becomes 'pi0.5'; a string with no Greek letter is only
 * lowercased, so ASCII input is untouched.
 */
export function foldGreekToAscii(value: string): string {
  let folded = '';
  for (const character of value.toLowerCase()) {
    folded += GREEK_TO_ASCII[character] ?? character;
  }
  return folded;
}
