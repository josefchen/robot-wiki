/**
 * The non-colour vocabulary that carries semantic state in data marks.
 *
 * Semantic hue (`--color-ok`, `--color-warn`, `--color-error`) is never the
 * only difference between two marks that mean different things. A reader who
 * cannot separate red from green has to be able to read the same distinction
 * from the drawing, so each semantic role also owns a stroke rhythm, and the
 * legend entry for a series repeats the rhythm its series is drawn with.
 *
 * Three rules govern which constant to reach for:
 *
 * 1. When two semantic roles are drawn as **separate marks** that a reader
 *    compares side by side (two series, two legend keys), each mark takes its
 *    own `SERIES_DASH` rhythm: round-dotted for `ok`, long-dashed for `warn`,
 *    dash-dot for `error`. All three read apart at 2px stroke width, and none
 *    collides with the fine neutral `3 3` and `4 4` dashes the grids, guides
 *    and reference curves already use.
 * 2. When one mark **switches role in place** (a bar that turns from within
 *    budget to over budget, a ring that opens when force closure is lost),
 *    the compliant state stays solid and the failing state takes an
 *    `EDGE_DASH` rhythm. Solid against broken is the stronger signal for a
 *    single mark, and it keeps the default drawing quiet.
 * 3. Region fills — failure windows, tolerance bands, out-of-scope areas —
 *    are painted at low opacity, which erases them under desaturation. They
 *    take an `EDGE_DASH` outline in the same token so the extent of the
 *    region survives without colour.
 *
 * The values are dash cycles in the units of whatever coordinate system the
 * mark is drawn in, so SVG geometry in a viewBox gets the cycle scaled with
 * the drawing rather than in device pixels.
 */

export type SemanticRole = 'ok' | 'warn' | 'error';

/** Rhythms for full-size marks: series curves and their legend keys. */
export const SERIES_DASH: Record<SemanticRole, string> = {
  ok: '2 4',
  warn: '8 4',
  error: '10 3 2 3',
};

/** Rhythms for small marks: region outlines, marker rings, cell edges. */
export const EDGE_DASH: Record<SemanticRole, string> = {
  ok: '1.5 2.5',
  warn: '5 3',
  error: '4 2.5',
};
