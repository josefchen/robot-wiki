'use client';

import { useId, type ReactNode } from 'react';
import { cx } from '@/lib/utils';

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
 * - Column headers are non-uppercase mono micro-type, the
 *   deployment-dashboard idiom.
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
  className?: string;
};

const HEADER_CELL =
  'px-3 py-2 text-left font-mono text-[11px] font-medium text-text-dim';

export function ChartDescription({
  description,
  form,
  summary,
  columns,
  rowHeader = 'sample',
  rows,
  states,
  id: explicitId,
  className,
}: ChartDescriptionProps) {
  const generatedId = useId();
  const id = explicitId ?? generatedId;
  if (form === 'table' && (!columns || !rows || rows.length === 0)) {
    throw new Error('ChartDescription: form="table" requires columns and rows');
  }
  if (form === 'state' && (!states || states.length === 0)) {
    throw new Error('ChartDescription: form="state" requires states');
  }

  return (
    <div className={className}>
      <p id={id} data-chart-description className="font-sans text-sm leading-relaxed text-text">
        {description}
      </p>
      <details data-chart-data data-chart-form={form} data-pagefind-ignore className="mt-2">
        <summary className="cursor-pointer select-none font-sans text-sm text-text-dim transition-colors hover:text-text">
          {summary ?? 'Chart data'}
        </summary>
        {form === 'table' ? (
          <div
            // Scrollable region on narrow viewports; keyboard-accessible
            // per the same axe rule as the house Table and .katex-display.
            tabIndex={0}
            className="mt-2 overflow-x-auto"
          >
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
                          columns![i]?.numeric &&
                            'text-right font-mono tabular-nums',
                        )}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <dl className="mt-2 flex flex-col gap-1.5 font-sans text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
            {states!.map((state) => (
              <div key={state.label} className="flex items-baseline gap-2">
                <dt className="font-mono text-[11px] text-text-dim">
                  {state.label}
                </dt>
                <dd className="font-mono text-sm text-text">{state.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </details>
    </div>
  );
}
