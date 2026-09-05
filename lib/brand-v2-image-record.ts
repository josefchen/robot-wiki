import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGES, attributionText, figureKind, legalBasis, preservationPolicy } from '../data/images.ts';
import type { SiteImage } from '../data/schemas/image.ts';
import { sha256, stableJson } from './brand-v2-baseline.ts';
import type { Verdict } from './brand-v2-figure-evidence.ts';
import { REUSABLE_CONTENT_BASES } from './brand-v2-figure-evidence.ts';

/**
 * The record half of the imagery rows: the five claims a browser cannot
 * decide because they are about what the registry says and what the bytes on
 * disk are, not about anything a page painted.
 *
 * Every one of them is graded against a source this feature did not write:
 * the immutable baseline manifest for the SVG semantics, the file itself for
 * the content hash, and the registry census for the population. Grading them
 * against a stored copy of themselves would prove only that nothing had been
 * edited twice.
 */

/** The census row shape these verdicts read. */
export type AssetRow = {
  id: string;
  path: string;
  category: string;
  ownershipId: string;
  sourceRegistryId: string | null;
  byteHash: string;
  semanticHash: string | null;
};

export type MaterialRow = {
  id: string;
  treatment: string;
  deterministic: boolean;
  ownership: string;
};

const SLOP_MARKERS = [
  /\bai[- ]generated\b/i,
  /\bai[- ]rendered\b/i,
  /\bmidjourney\b/i,
  /\bstable diffusion\b/i,
  /\bdall[- ]?e\b/i,
  /\bgenerative (?:art|render|image)\b/i,
  /\bsynthesi[sz]ed\b/i,
  /\bsynthetic (?:lab|scene|render|photo)\b/i,
  /\bchrome (?:head|humanoid)\b/i,
  /\bglowing brain\b/i,
  /\bcircuit (?:wallpaper|board background)\b/i,
  /\bfake blueprint\b/i,
];

const EVIDENCE_IMPERSONATION_MARKERS = [
  /\bsensor\b/i,
  /\blidar\b/i,
  /\bdepth (?:map|field)\b/i,
  /\bpoint cloud\b/i,
  /\bmeasured\b/i,
  /\btelemetry\b/i,
  /\bscan(?:ned)?\b/i,
  /\bsignal trace\b/i,
];

const registryById = new Map(IMAGES.map((image) => [image.id, image]));

function nonEmpty<T>(verdicts: Map<string, T>, what: string): Map<string, T> {
  if (verdicts.size === 0) {
    throw new Error(
      `the ${what} population is empty, so its verdicts would pass vacuously`,
    );
  }
  return verdicts;
}

/** The registered image an asset row belongs to, when it has one. */
function entryFor(asset: AssetRow): SiteImage | undefined {
  return asset.sourceRegistryId
    ? registryById.get(asset.sourceRegistryId)
    : undefined;
}

/** Editorial images: the reusable content whose §1.13 record this row owns. */
export function editorialAssetMembers(assets: readonly AssetRow[]): string[] {
  return assets
    .filter(({ category }) => category === 'editorial-image')
    .map(({ id }) => id)
    .sort();
}

/**
 * The first-party vector assets `VAL-B2-VIZ-014` quantifies over: an SVG
 * this repository drew, which is the only kind whose semantics it can pin.
 * The 70-odd company marks are vectors too and are deliberately excluded:
 * they are somebody else's drawing and their preservation row is
 * `VAL-B2-IMG-009`.
 */
export function firstPartySvgMembers(assets: readonly AssetRow[]): string[] {
  return assets
    .filter(
      (asset) =>
        asset.semanticHash !== null &&
        asset.category === 'editorial-image' &&
        entryFor(asset)?.figureKind === 'original-schematic',
    )
    .map(({ id }) => id)
    .sort();
}

/**
 * `VAL-B2-IMG-001`: no first-party surface carries an AI-generated robot, a
 * synthetic lab, a stock chrome head, a glowing brain, circuit wallpaper or
 * a fake blueprint.
 *
 * The member is every asset in the census, marks and models included,
 * because the row is about the surfaces as a whole and an excluded category
 * is exactly where such an image would be parked. What is graded is the
 * asset's own provenance: a real creator, a real source, and no synthesis
 * vocabulary anywhere in the strings that describe it. The check cannot look
 * at pixels, and says so rather than pretending to: it refuses an asset that
 * cannot name where it came from.
 */
export function firstPartyImageryVerdicts(
  assets: readonly AssetRow[],
): Map<string, Verdict<Record<string, string>>> {
  const verdicts = new Map<string, Verdict<Record<string, string>>>();
  for (const asset of assets) {
    const entry = entryFor(asset);
    const failures: string[] = [];
    const described = entry
      ? [entry.creator, entry.sourceName, entry.alt, entry.caption, asset.path]
      : [asset.path, asset.ownershipId];
    for (const value of described) {
      const marker = SLOP_MARKERS.find((pattern) => pattern.test(value));
      if (marker) {
        failures.push(
          `${asset.id} describes itself as "${value}", which matches the banned synthesis vocabulary ${marker}`,
        );
      }
    }
    if (entry) {
      if (entry.creator.trim().length === 0) {
        failures.push(`${asset.id} names no creator, so nobody made it`);
      }
      if (entry.sourceName.trim().length === 0) {
        failures.push(`${asset.id} names no source`);
      }
      // A first-party drawing has no external original; everything else must
      // point at the page it came from, which is what makes it checkable.
      if (figureKind(entry) !== 'original-schematic' && !entry.sourceUrl) {
        failures.push(
          `${asset.id} is not a first-party drawing and records no source URL, so its origin cannot be checked`,
        );
      }
    }
    verdicts.set(asset.id, {
      id: asset.id,
      observed: {
        path: asset.path,
        category: asset.category,
        creator: entry?.creator ?? asset.ownershipId,
        sourceName: entry?.sourceName ?? 'first-party asset',
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'first-party asset');
}

/**
 * `VAL-B2-IMG-002`: every external photograph, figure or texture records one
 * §1.13 legal-basis value plus creator, official source URL, retrieval date,
 * content hash, attribution text, licence reference and preservation policy,
 * and the recorded content hash is the hash of the file that shipped.
 */
export function provenanceRecordVerdicts(
  assets: readonly AssetRow[],
  root: string,
): Map<string, Verdict<Record<string, unknown>>> {
  const verdicts = new Map<string, Verdict<Record<string, unknown>>>();
  for (const asset of assets) {
    if (asset.category !== 'editorial-image') continue;
    const entry = entryFor(asset);
    const failures: string[] = [];
    if (!entry) {
      failures.push(`${asset.id} resolves to no registry entry, so it has no record at all`);
      verdicts.set(asset.id, { id: asset.id, observed: { path: asset.path }, failures });
      continue;
    }
    if (entry.legalBasis === undefined) {
      failures.push(`${asset.id} records no §1.13 legal basis`);
    }
    if (entry.attributionText === undefined) {
      failures.push(`${asset.id} records no attribution text`);
    } else if (entry.attributionText !== attributionText(entry)) {
      failures.push(
        `${asset.id} records attribution "${entry.attributionText}" where its own fields read "${attributionText(entry)}"`,
      );
    }
    if (entry.preservationPolicy === undefined) {
      failures.push(`${asset.id} records no preservation policy`);
    }
    if (!entry.retrieved) failures.push(`${asset.id} records no retrieval date`);
    if (!entry.licenceUrl.startsWith('https://')) {
      failures.push(`${asset.id} points its licence reference at ${entry.licenceUrl}`);
    }
    // An original drawing has no external page to cite; everything else does.
    if (figureKind(entry) !== 'original-schematic' && !entry.sourceUrl) {
      failures.push(`${asset.id} records no official source URL`);
    }
    const shipped = sha256(readFileSync(join(root, 'public', asset.path)));
    if (shipped !== asset.byteHash) {
      failures.push(
        `${asset.id} records content hash ${asset.byteHash.slice(0, 12)} where the shipped file hashes ${shipped.slice(0, 12)}`,
      );
    }
    // The two policies make different promises, and only the first-party
    // drawings are allowed the weaker one.
    if (
      preservationPolicy(entry) === 'first-party-restyled-semantics-preserved' &&
      figureKind(entry) !== 'original-schematic'
    ) {
      failures.push(
        `${asset.id} claims the restyle policy without being a first-party drawing`,
      );
    }
    verdicts.set(asset.id, {
      id: asset.id,
      observed: {
        legalBasis: legalBasis(entry),
        attributionText: attributionText(entry),
        preservationPolicy: preservationPolicy(entry),
        retrieved: entry.retrieved,
        sourceUrl: entry.sourceUrl ?? null,
        licenceUrl: entry.licenceUrl,
        contentHash: asset.byteHash,
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'editorial image');
}

/**
 * `VAL-B2-IMG-008`: reusable editorial content rests on one approved
 * reusable-content value from the closed enum. `unlicensed` is never
 * approved, and `official-identification-use` is the mark path in
 * `VAL-B2-MAP-010` rather than a licence for editorial reuse.
 */
export function reusableContentVerdicts(
  assets: readonly AssetRow[],
): Map<string, Verdict<Record<string, unknown>>> {
  const verdicts = new Map<string, Verdict<Record<string, unknown>>>();
  for (const asset of assets) {
    if (asset.category !== 'editorial-image') continue;
    const entry = entryFor(asset);
    const failures: string[] = [];
    if (!entry) {
      failures.push(`${asset.id} resolves to no registry entry`);
      verdicts.set(asset.id, { id: asset.id, observed: { path: asset.path }, failures });
      continue;
    }
    const basis = legalBasis(entry);
    if (!REUSABLE_CONTENT_BASES.includes(basis as (typeof REUSABLE_CONTENT_BASES)[number])) {
      failures.push(
        `${asset.id} rests on "${basis}", which is not one of the reusable-content values ${REUSABLE_CONTENT_BASES.join(', ')}`,
      );
    }
    if (entry.licence === 'unlicensed' || entry.licence === 'unknown') {
      failures.push(
        `${asset.id} is reusable editorial content carrying licence "${entry.licence}", which is never approved`,
      );
    }
    if (
      (entry.licence === 'press-kit' || entry.licence === 'permission') &&
      !entry.permissionNote
    ) {
      failures.push(`${asset.id} claims a grant without recording where it is stated`);
    }
    if (figureKind(entry) === 'official-mark') {
      failures.push(
        `${asset.id} is filed as editorial content while declaring itself a company mark`,
      );
    }
    verdicts.set(asset.id, {
      id: asset.id,
      observed: {
        licence: entry.licence,
        legalBasis: basis,
        permissionNote: entry.permissionNote ?? null,
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'reusable editorial image');
}

/**
 * `VAL-B2-IMG-004`: a material texture never impersonates evidence, sensor
 * output, or measured data.
 *
 * The members are the registered materials rather than files, because the
 * treatments are generated: a grain and a halftone are drawn by the
 * stylesheet, so there is no image to inspect and the claim is about what
 * the treatment declares itself to be.
 */
export function materialHonestyVerdicts(
  materials: readonly MaterialRow[],
): Map<string, Verdict<MaterialRow>> {
  const verdicts = new Map<string, Verdict<MaterialRow>>();
  for (const material of materials) {
    const failures: string[] = [];
    const marker = EVIDENCE_IMPERSONATION_MARKERS.find((pattern) =>
      pattern.test(material.treatment),
    );
    if (marker) {
      failures.push(
        `${material.id} describes its treatment as "${material.treatment}", which claims to be a reading rather than a texture`,
      );
    }
    // A treatment that varies per render cannot be compared against anything
    // and is the shape a fake signal takes.
    if (!material.deterministic) {
      failures.push(`${material.id} renders non-deterministically`);
    }
    if (!['owned', 'licensed'].includes(material.ownership)) {
      failures.push(
        `${material.id} declares ownership "${material.ownership}", which is neither owned nor licensed`,
      );
    }
    verdicts.set(material.id, { id: material.id, observed: material, failures });
  }
  return nonEmpty(verdicts, 'registered material');
}

/**
 * `VAL-B2-VIZ-014`: an original SVG compares against the immutable
 * normalized semantic baseline while excluding only the allowlisted style
 * attributes.
 *
 * The comparison is re-derived here rather than trusted from the census:
 * the census is regenerated from the same files, so a census-versus-file
 * comparison would be a file compared with itself. The pin is
 * `evidence/brand-v2/baseline/assets-svg.json`, which was sealed before the
 * rollout and is never rewritten.
 */
export function originalSvgSemanticVerdicts(
  assets: readonly AssetRow[],
  root: string,
  baselineMembers: ReadonlyArray<{ id: string; hash: string }>,
): Map<string, Verdict<Record<string, unknown>>> {
  const baseline = new Map(baselineMembers.map(({ id, hash }) => [id, hash]));
  const verdicts = new Map<string, Verdict<Record<string, unknown>>>();
  for (const id of firstPartySvgMembers(assets)) {
    const asset = assets.find((row) => row.id === id) as AssetRow;
    const failures: string[] = [];
    const svg = readFileSync(join(root, 'public', asset.path), 'utf8');
    const semanticHash = sha256(normalizeSvgSemantics(svg));
    const memberId = `public-svg:${asset.path}`;
    const sealed = baseline.get(memberId);
    if (!sealed) {
      failures.push(`${id} has no sealed baseline member at ${memberId}`);
    } else {
      const recomputed = sha256(
        stableJson({ path: asset.path, semanticHash }),
      );
      if (recomputed !== sealed) {
        failures.push(
          `${id} normalizes to semantic hash ${semanticHash.slice(0, 12)}, which does not reproduce the sealed baseline member: a node, a label, a coordinate or a textual alternative moved outside the style allowlist`,
        );
      }
    }
    // The hash proves equality with the seal, but a seal taken over an empty
    // drawing would be reproduced by an empty drawing. These assert the
    // drawing is still a drawing with a textual alternative and labels.
    if (!/\srole=["']img["']/.test(svg) || !/\saria-label=["'][^"']+["']/.test(svg)) {
      failures.push(`${id} ships without a role and an aria-label textual alternative`);
    }
    const labels = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(
      (match) => match[1],
    );
    if (labels.length === 0) {
      failures.push(`${id} carries no rendered labels`);
    }
    verdicts.set(id, {
      id,
      observed: {
        path: asset.path,
        semanticHash,
        sealedMember: memberId,
        labelCount: labels.length,
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'first-party SVG');
}

/**
 * The allowlist, spelled exactly as `scripts/brand-v2-baseline.ts` spells it.
 * Duplicated on purpose: the baseline script is a script rather than a
 * library, and importing it here would drag the whole census collection into
 * every consumer. The two are held together by the hash comparison above,
 * which fails the moment they disagree.
 */
function normalizeSvgSemantics(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:class|style|fill|stroke|stroke-width|opacity)=["'][^"']*["']/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}
