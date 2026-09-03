import { BRAND_COLORS } from './brand-v2-tokens.ts';
import {
  AUTHORED_TOKEN_SOURCE,
  deriveAuthoredColorTokens,
  deriveRendererPaintedPopulation,
  rendererSourceIdentity,
  tokenEvidenceFingerprint,
  type TokenRendererEvidence,
} from './brand-v2-token-evidence.ts';

/**
 * The renderer half of the token evidence: what the shipped Open Graph
 * corpus actually paints, and how the mirror constants compare with the
 * authored stylesheet.
 *
 * "Renderer mirrors resolve exactly to X" was previously checked by reading
 * `BRAND_COLORS.x` and comparing it with `BRAND_COLORS.x`, which is true for
 * any value the constant happens to hold. Here the mirror is compared with
 * the `--color-*` declaration in app/globals.css, and the corpus walk
 * reports every colour the artwork paints per card, so a hex the stylesheet
 * authors for no token fails instead of shipping inside 48 cards, and a walk
 * that stops early cannot be reconciled with the card trees.
 *
 * The walked corpus is the one scripts/generate-og-cards.ts renders, and
 * `rendererSourceIdentity` records the generator alongside this module and
 * refuses an identity where the two build separate card trees.
 */
export function buildTokenRendererEvidence(input: {
  root: string;
  contract: string;
  css: string;
}): TokenRendererEvidence {
  const painted = deriveRendererPaintedPopulation(input);
  const authored = deriveAuthoredColorTokens(input.css);
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
    rendererSource: rendererSourceIdentity(input.root),
    cardCount: painted.cardIds.length,
    paintedProperties: painted.paintedProperties,
    paintedByCard: painted.paintedByCard,
    paintedByHex: painted.paintedByHex,
    unregisteredPaintedValues: painted.unregisteredPaintedValues,
    mirrorParity,
  };
}
