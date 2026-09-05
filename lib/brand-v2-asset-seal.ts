import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * The approval registry behind `VAL-B2-ID-006`: exactly which first-party
 * visual assets may ship, sealed by their bytes.
 *
 * The reading this replaces tried to recognise the drawn subject. It failed
 * an SVG on an icon-shaped canvas, and it failed one carrying fewer than two
 * label runs, on the theory that a mark is small and square and says nothing
 * while a diagram is wide and names its parts. A scrutiny reviewer drew a
 * wide, labelled robot head and it passed, which is the general result
 * rather than a gap in those two thresholds: **recognising a drawn subject
 * is not decidable**, and every threshold tightened to exclude one drawing
 * admits the next one.
 *
 * So the claim is made decidable instead of approximate. Every first-party
 * visual asset has a checked-in entry naming its path, its exact bytes, an
 * owner who answers for it and the purpose it ships for. Shipping is decided
 * by that entry and nothing else:
 *
 * - an asset in the tree with no sealed entry fails, whatever it depicts;
 * - an asset whose bytes are not byte-identical to its entry fails, so an
 *   approved path cannot be reused to smuggle different artwork in;
 * - a sealed entry with no asset in the tree fails, so the seal cannot carry
 *   approvals for artwork nobody can look at.
 *
 * That makes the assertion true as stated: the shipped first-party asset set
 * is exactly the approved set, so a newly introduced monogram, mascot, robot
 * head or alternate glyph fails because nobody approved its bytes.
 *
 * **Division of labour, stated so the two mechanisms do not grow into each
 * other.** The seal decides *which assets may ship*. Content analysis
 * (`lib/brand-v2-asset-content.ts`) only *describes what a sealed asset is*:
 * its container format against its filename, its decoded structure, and for
 * an undecodable raster the external origin that shows this repository did
 * not author it. Content analysis answers "what is this file"; it does not
 * answer "may this file ship", and it must not grow another subject
 * detector to try.
 */
export const ASSET_SEAL_PATH = 'contract/brand-v2-asset-seal.json';

const sealedAssetSchema = z.object({
  /** Repository-relative path under `public/`. */
  path: z.string().regex(/^[\w][\w./-]*$/),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  byteCount: z.number().int().positive(),
  /** Who answers for these bytes shipping. */
  owner: z.string().min(1),
  /** What this asset is for, in the product's own terms. */
  purpose: z.string().min(24),
});

export const assetSealSchema = z.object({
  schemaVersion: z.literal(1),
  assets: z.array(sealedAssetSchema).min(1),
});

export type SealedAsset = z.infer<typeof sealedAssetSchema>;

export function readAssetSeal(root: string): SealedAsset[] {
  const seal = assetSealSchema.parse(
    JSON.parse(readFileSync(join(root, ASSET_SEAL_PATH), 'utf8')),
  );
  const duplicated = [
    ...new Set(
      seal.assets
        .map(({ path }) => path)
        .filter((path, index, all) => all.indexOf(path) !== index),
    ),
  ].sort();
  if (duplicated.length > 0) {
    throw new Error(
      `${ASSET_SEAL_PATH} seals ${duplicated.join(', ')} more than once, so one path carries two approvals`,
    );
  }
  return [...seal.assets].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

export type AssetSealVerdict = {
  path: string;
  owner: string;
  purpose: string;
  sealedSha256: string;
  shippedSha256: string;
  byteCount: number;
};

export type AssetSealInput = {
  root: string;
  /**
   * The first-party visual assets discovered in the tree, from the census
   * walk of `public/`. Independent of the seal, so an unsealed asset is a
   * member of this set and therefore a failure rather than an absence.
   */
  shippedPaths: readonly string[];
  seal: readonly SealedAsset[];
};

/**
 * Reconciles what ships against what was approved, in both directions, and
 * throws rather than return a partial answer. Every throw names the asset,
 * because "an unapproved asset is present" is the whole content of the
 * claim and a caller cannot make it more specific later.
 */
export function reconcileAssetSeal(
  input: AssetSealInput,
): Map<string, AssetSealVerdict> {
  if (input.shippedPaths.length === 0) {
    throw new Error(
      'no first-party visual asset was discovered in the tree: the seal would reconcile against nothing',
    );
  }
  if (input.seal.length === 0) {
    throw new Error(
      `${ASSET_SEAL_PATH} seals no asset, so every shipped asset would be unapproved`,
    );
  }
  const sealedByPath = new Map(input.seal.map((entry) => [entry.path, entry]));
  const shipped = [...new Set(input.shippedPaths)].sort();
  const unsealed = shipped.filter((path) => !sealedByPath.has(path));
  if (unsealed.length > 0) {
    throw new Error(
      `${unsealed.length} shipped first-party visual asset(s) have no sealed entry in ${ASSET_SEAL_PATH}, so nobody approved their bytes: ${unsealed.join(', ')}`,
    );
  }
  const orphaned = input.seal
    .map(({ path }) => path)
    .filter((path) => !shipped.includes(path));
  if (orphaned.length > 0) {
    throw new Error(
      `${ASSET_SEAL_PATH} approves ${orphaned.length} asset(s) the tree does not ship: ${orphaned.join(', ')}`,
    );
  }

  const verdicts = new Map<string, AssetSealVerdict>();
  for (const path of shipped) {
    const entry = sealedByPath.get(path) as SealedAsset;
    const bytes = readFileSync(join(input.root, 'public', path));
    const shippedSha256 = createHash('sha256').update(bytes).digest('hex');
    if (shippedSha256 !== entry.sha256 || bytes.length !== entry.byteCount) {
      throw new Error(
        `${path} ships ${bytes.length} bytes hashing to ${shippedSha256.slice(0, 12)} against the sealed ${entry.byteCount} bytes at ${entry.sha256.slice(0, 12)}, so the approved artwork is not the artwork in the tree`,
      );
    }
    verdicts.set(path, {
      path,
      owner: entry.owner,
      purpose: entry.purpose,
      sealedSha256: entry.sha256,
      shippedSha256,
      byteCount: bytes.length,
    });
  }
  return verdicts;
}
