/**
 * Image helpers for the content pipeline. `referencedImageIds` scans a
 * source body (MDX or tsx) for <Image id="..."/> and <ImageRef id="..."/>
 * usages so the prebuild validator can fail the build on an unregistered
 * image id (mirroring the unknown-<Term>-id check) and on a registered
 * image no page uses (so /credits cannot drift from what renders,
 * VAL-IMG-006).
 *
 * Code masking mirrors inlineTermIds in lib/glossary.ts: blank (not
 * remove) masked regions so match indices keep their line positions. MDX
 * renders JSX in prose, but never inside fenced code or inline code
 * spans, so <Image> syntax there is documentation, not a usage.
 *
 * Runtime imports carry explicit .ts extensions where needed because this
 * file is executed by plain node (type stripping) as well as Vitest and
 * Next.js.
 */
const FENCED_CODE = /```[\s\S]*?```/g;
const INLINE_CODE = /`[^`\n]*`/g;

/** <Image id="..."> or <ImageRef id="...">, either quote style. */
const IMAGE_ELEMENT =
  /<Image(?:Ref)?\b[^>]*?\bid\s*=\s*(["'])([^"']+)\1/g;

/**
 * Image ids referenced in a source body, in order of first use, deduped.
 * Usages inside code spans or fenced blocks are ignored.
 */
export function referencedImageIds(body: string): string[] {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  const masked = body.replace(FENCED_CODE, blank).replace(INLINE_CODE, blank);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of masked.matchAll(IMAGE_ELEMENT)) {
    const id = match[2];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Synthesis markers (VAL-IMG-013): an entry whose provenance matches is not
 * a licensable external asset and fails the build.
 */
export const SYNTHESIS_MARKER =
  /ai[-\s]?generated|midjourney|dall[-\s]?e|stable\s?diffusion|imagen|generated\s+by/i;

/** True when any provenance field of the entry carries a synthesis marker. */
export function hasSynthesisMarker(image: {
  sourceName: string;
  creator: string;
  licence: string;
}): boolean {
  return [image.sourceName, image.creator, image.licence].some((field) =>
    SYNTHESIS_MARKER.test(field),
  );
}
