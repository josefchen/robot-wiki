import { BRAND_COLORS } from './brand-v2-tokens.ts';
import {
  AUTHORED_TOKEN_SOURCE,
  deriveAuthoredColorTokens,
  tokenEvidenceFingerprint,
  type TokenRendererEvidence,
} from './brand-v2-token-evidence.ts';
import { cardPaintedColors } from './og-card-artwork.ts';
import { ogCardElements } from './og-renderer-font-inspection.ts';

/**
 * The renderer half of the token evidence: what the shipped Open Graph
 * corpus actually paints, and how the mirror constants compare with the
 * authored stylesheet.
 *
 * "Renderer mirrors resolve exactly to X" was previously checked by reading
 * `BRAND_COLORS.x` and comparing it with `BRAND_COLORS.x`, which is true for
 * any value the constant happens to hold. Here the mirror is compared with
 * the `--color-*` declaration in app/globals.css, and the corpus walk
 * reports every colour the artwork paints, so a hex the stylesheet authors
 * for no token fails instead of shipping inside 48 cards.
 */
export function buildTokenRendererEvidence(input: {
  root: string;
  contract: string;
  css: string;
}): TokenRendererEvidence {
  const cards = ogCardElements(input.root);
  if (cards.length === 0) {
    throw new Error('The Open Graph corpus is empty');
  }
  const authored = deriveAuthoredColorTokens(input.css);
  const tokensByHex = new Map<string, string[]>();
  for (const [token, hex] of Object.entries(authored.hexByToken)) {
    tokensByHex.set(hex, [...(tokensByHex.get(hex) ?? []), token]);
  }
  const paintedByHex: Record<string, number> = {};
  const unregisteredPaintedValues = new Set<string>();
  let paintedProperties = 0;
  for (const card of cards) {
    for (const painted of cardPaintedColors(card)) {
      for (const value of painted.unregistered) {
        unregisteredPaintedValues.add(`${painted.property}: ${value}`);
      }
      for (const hex of painted.hexes) {
        paintedProperties += 1;
        paintedByHex[hex] = (paintedByHex[hex] ?? 0) + 1;
        if (!tokensByHex.has(hex)) {
          unregisteredPaintedValues.add(`${painted.property}: ${hex}`);
        }
      }
    }
  }
  const mirrorParity = Object.entries(BRAND_COLORS)
    .map(([token, mirror]) => ({
      token,
      mirror,
      authored: authored.hexByToken[token] ?? `${AUTHORED_TOKEN_SOURCE}:absent`,
    }))
    .sort((left, right) => left.token.localeCompare(right.token));
  return {
    version: 1,
    fingerprint: tokenEvidenceFingerprint(input),
    cardCount: cards.length,
    paintedProperties,
    paintedByHex: Object.fromEntries(
      Object.entries(paintedByHex).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    unregisteredPaintedValues: [...unregisteredPaintedValues].sort(),
    mirrorParity,
  };
}
