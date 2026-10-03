'use client';

import { useId, type ReactNode } from 'react';
import { cx } from '@/lib/utils';
import { TableScroll } from './table-scroll';

/**
 * The chart-description primitive (VAL-EDU-021..028).
 *
 * Every retrofitted data chart renders its authored takeaway as real DOM
 * text a screen reader, the printer, Pagefind and the no-slop lint all
 * reach, followed by a disclosure holding the machine-derived sample the
 * chart is drawn from. The takeaway paragraph is the target of the SVG's
 * aria-describedby; the disclosure is deliberately NOT referenced, because
 * accessible-description computation flattens its target to a string and a
 * sampled table flattened to one string is unusable.
 *
 * Why the numbers live in the DOM and not in an aria-label or an SVG
 * <desc>: the export half of the no-slop lint (lib/no-slop.ts
 * extractRenderedProse) strips <svg>...</svg> entirely and then deletes
 * every remaining tag, so text inside an attribute or an SVG subtree is
 * scanned by nothing. Real DOM text outside the SVG is reached by the lint,
 * by Pagefind, by print, and by a screen reader.
 *
 * It mounts in the frame's "How this was made" fold with `open`, so the
 * sample is one click from the main view. The takeaway is the figure's
 * screen-reader description, so it is visually hidden like a scene's text
 * alternative, and the one-line figure caption carries the visible
 * reading.
 *
 * Design constraints this component exists to hold:
 * - The <summary> is sentence case, never an uppercase letterspaced
 *   micro-label (VAL-DESIGN-010 caps those at 5 per audited page).
 * - The disclosure carries no border of its own (VAL-DESIGN-018 counts
 *   full-width horizontal rules against a 2-per-article budget).
 * - Tables use min-w-[480px] inside the padded panel, not the house
 *   min-w-[560px]: the prose column is about 690px at 1440px and p-4/sm:p-5
 *   leaves about 543px, so the table scrolls inside its own overflow
 *   container instead of breaking the page width (VAL-EDU-028). There are
 *   no .prose table styles in globals.css, so the styles are carried here.
 * - Every size sits on the figure type scale (12 px headers, 14 px cells),
 *   in the brand sans.
 * - Zero em-dashes and en-dashes: the prose lint is zero tolerance.
 */

export interface ChartSampleColumn {
  /** Column header text. Keep it short; it renders as mono micro-type. */
  header: string;
  /** Right-align the column and render values in tabular mono. */
  numeric?: boolean;
}

export interface ChartSampleRow {
  /** Row header text (first cell, scope="row"). */
  label: string;
  /** Cell values, one per column, in column order. */
  values: ReadonlyArray<string | number>;
}

type ChartDescriptionProps = {
  /**
   * The authored takeaway. Replaces the component's trailing caption; the
   * gate (scripts/check-chart-descriptions.ts) checks its default-state
   * text for two digit-bearing tokens, both quantity names, a clean opener
   * and cross-chart uniqueness after digit normalisation.
   */
  description: ReactNode;
  /** Declares what the disclosure holds; must match what renders. */
  form: 'table' | 'state';
  /** Sentence-case summary text for the disclosure. */
  summary?: string;
  /** Column definitions; required and only used when form is "table". */
  columns?: ChartSampleColumn[];
  /** Header of the row-label column; defaults to the generic "sample". */
  rowHeader?: string;
  /** Machine-derived sample rows; required when form is "table". */
  rows?: ChartSampleRow[];
  /** Labelled state pairs; required when form is "state". */
  states?: ReadonlyArray<{ label: string; value: string }>;
  /**
   * Explicit id for the takeaway paragraph. Pass the same value to the
   * host SVG's aria-describedby; when omitted a useId-derived id is used
   * (fine when nothing needs to reference the paragraph).
   */
  id?: string;
  /**
   * Serve the data disclosure open. A description placed in the frame's
   * "How this was made" fold passes it, so the numbers sit one click away
   * rather than behind a second disclosure.
   */
  open?: boolean;
  className?: string;
};

const HEADER_CELL =
  'px-3 py-2 text-left font-sans text-xs font-medium text-text-dim';

export function ChartDescription({
  description,
  form,
  summary,
  columns,
  rowHeader = 'sample',
  rows,
  states,
  id: explicitId,
  open = false,
  className,
}: ChartDescriptionProps) {
  const generatedId = useId();
  const id = explicitId ?? generatedId;
  const summaryId = `${id}-chart-data-summary`;
  if (form === 'table' && (!columns || !rows || rows.length === 0)) {
    throw new Error('ChartDescription: form="table" requires columns and rows');
  }
  if (form === 'state') {
    if (!states || states.length < 3) {
      throw new Error(
        'ChartDescription: form="state" requires at least 3 states',
      );
    }
    for (const state of states) {
      if (!state.label.trim() || !state.value.trim()) {
        throw new Error(
          'ChartDescription: form="state" requires a non-empty label and value on every pair',
        );
      }
    }
  }

  return (
    <div className={cx('min-w-0 basis-full self-start', className)}>
      <p id={id} data-chart-description className="sr-only">
        {description}
      </p>
      <details
        data-chart-data
        data-chart-form={form}
        data-pagefind-ignore
        open={open || undefined}
      >
        <summary
          id={summaryId}
          data-brand-control-id="control:secondary-action"
          className="inline-flex min-h-6 cursor-pointer select-none items-center font-sans text-sm font-medium text-text-dim transition-colors hover:text-text"
        >
          {summary ?? 'Chart data'}
        </summary>
        {form === 'table' ? (
          <TableScroll labelledBy={summaryId} className="mt-2">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={HEADER_CELL}>
                    {rowHeader}
                  </th>
                  {columns!.map((column) => (
                    <th
                      key={column.header}
                      scope="col"
                      className={cx(HEADER_CELL, column.numeric && 'text-right')}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows!.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-b-0">
                    <th scope="row" className={HEADER_CELL}>
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={i}
                        className={cx(
                          'px-3 py-2 font-sans text-sm text-text',
                          columns![i]?.numeric && 'text-right tabular-nums',
                        )}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <dl className="mt-2 flex flex-col gap-1.5 font-sans text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
            {states!.map((state) => (
              <div key={state.label} className="flex items-baseline gap-2">
                <dt className="font-sans text-xs text-text-dim">
                  {state.label}
                </dt>
                <dd className="font-sans text-sm tabular-nums text-text">{state.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </details>
    </div>
  );
}
