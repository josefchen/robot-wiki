/**
 * The rendered text of a method or dataset row, as one source of truth.
 *
 * Two consumers need the identical strings: the comparison matrix and the
 * dataset table render them into cells, and lib/structured-search.ts builds
 * each entity's search snippet from a contiguous run of the same cells. The
 * snippet's guarantee is that it appears verbatim on the entity's own
 * destination route, and that guarantee only survives while both sides
 * format from here. A second copy of "not disclosed" or of the horizon
 * separator would drift silently, because a drifted snippet still renders.
 *
 * Imports keep their explicit .ts extensions: this module is reached from
 * scripts/build-search.ts, which runs under plain node.
 */
import type { Dataset } from '../data/schemas/dataset.ts';
import type { Method } from '../data/schemas/method.ts';

/** The wiki-wide marker for a value whose owner has not published it. */
export const NOT_DISCLOSED_TEXT = 'not disclosed';

export const REPRESENTATION_LABELS: Record<string, string> = {
  continuous: 'continuous',
  discrete: 'discrete tokens',
  diffusion: 'diffusion',
  flow: 'flow matching',
};

export function methodRepresentationText(method: Method): string {
  return method.actionRepresentation === null
    ? NOT_DISCLOSED_TEXT
    : REPRESENTATION_LABELS[method.actionRepresentation];
}

/** The "100 / 1" figure alone; the note renders on its own line beneath. */
export function methodHorizonFigure(method: Method): string | null {
  const { planned, executed } = method.actionHorizon;
  if (planned === null && executed === null) return null;
  return `${planned ?? 'n.d.'} / ${executed ?? 'n.d.'}`;
}

/** The "50 Hz" figure alone; the note renders on its own line beneath. */
export function methodFrequencyFigure(method: Method): string | null {
  return method.controlFrequencyHz === null
    ? null
    : `${method.controlFrequencyHz} Hz`;
}

export function methodConditioningText(method: Method): string {
  return method.conditioning.length > 0
    ? method.conditioning.join(', ')
    : NOT_DISCLOSED_TEXT;
}

/** Thousands-grouped count; the table's default deliberately skips grouping. */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

export function datasetEmbodimentsLabel(dataset: Dataset): string {
  return dataset.embodimentCount === 1
    ? '1 platform'
    : `${dataset.embodimentCount} platforms`;
}

export function datasetSourceHost(dataset: Dataset): string {
  return new URL(dataset.url).host;
}

/** A figure with its qualifier note, joined the way innerText joins them. */
function cell(figure: string | null, note?: string): string {
  const head = figure ?? NOT_DISCLOSED_TEXT;
  return note ? `${head} ${note}` : head;
}

/**
 * Every cell of a method row after its name, in rendered column order.
 * A trailing run of these is contiguous in the row's rendered text.
 */
export function methodRowCells(method: Method): string[] {
  return [
    method.year === null ? NOT_DISCLOSED_TEXT : String(method.year),
    methodRepresentationText(method),
    cell(methodHorizonFigure(method), method.actionHorizon.note),
    cell(methodFrequencyFigure(method), method.controlFrequencyNote),
    method.backbone ?? NOT_DISCLOSED_TEXT,
    methodConditioningText(method),
  ];
}

/** Every cell of a dataset row after its name, in rendered column order. */
export function datasetRowCells(dataset: Dataset): string[] {
  return [
    dataset.year === null ? NOT_DISCLOSED_TEXT : String(dataset.year),
    cell(
      dataset.episodes === null ? null : formatCount(dataset.episodes),
      dataset.episodesNote,
    ),
    cell(
      dataset.hours === null ? null : formatCount(dataset.hours),
      dataset.hoursNote,
    ),
    cell(
      dataset.tasks === null ? null : formatCount(dataset.tasks),
      dataset.tasksNote,
    ),
    dataset.scenes === null ? NOT_DISCLOSED_TEXT : formatCount(dataset.scenes),
    `${datasetEmbodimentsLabel(dataset)} ${dataset.embodiments.join(', ')}`,
    dataset.license ?? NOT_DISCLOSED_TEXT,
    datasetSourceHost(dataset),
  ];
}

/** Minimum visible characters a rendered snippet must carry. */
export const SNIPPET_MIN_CHARS = 40;
/** Minimum words, so a snippet always contains a 6-word verbatim window. */
export const SNIPPET_MIN_WORDS = 6;

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The shortest trailing run of `cells` that clears both floors, joined the
 * way the row renders them.
 *
 * A trailing run rather than an arbitrary selection, because only adjacent
 * cells are adjacent in the rendered row: a snippet assembled from cells
 * with a gap between them would read fine and fail the verbatim check. The
 * whole snippet is one contiguous run, so every 6-word window inside it is
 * verbatim, not just the one a checker happens to sample.
 */
export function trailingCellRun(cells: readonly string[]): string {
  for (let start = cells.length - 1; start >= 0; start -= 1) {
    const run = cells.slice(start).join(' ');
    if (run.length >= SNIPPET_MIN_CHARS && wordCount(run) >= SNIPPET_MIN_WORDS) {
      return run;
    }
  }
  return cells.join(' ');
}
