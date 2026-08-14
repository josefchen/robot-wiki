'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui';
import { getCitation } from '@/data/citations';
import {
  DEPLOYMENT_ROWS,
  filterDeployments,
  type DeploymentFilter,
  type DeploymentStatus,
} from '@/lib/deployment-reality';
import { cx } from '@/lib/utils';

/**
 * DeploymentDashboard: the deployment-reality table for the reliability-gap
 * module. Verified deployment figures (documented against company statements
 * and filings) sit next to circulating or vendor-run claims, with the status
 * badge carrying the distinction: green for verified, amber for claimed.
 *
 * Interactive contract: typed data from lib/deployment-reality.ts, a filter
 * group (all / verified / claimed) with aria-pressed buttons, a visible row
 * count readout, and a reset control. No auto-playing motion, no layout shift
 * on load. Column headers are mono and dim but deliberately NOT uppercase:
 * the page's uppercase micro-label budget (VAL-DESIGN-010) is spent on the
 * compounding calculator's two slider labels.
 */

const FILTERS: Array<{ value: DeploymentFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'claimed', label: 'Claimed' },
];

const STATUS_VARIANT: Record<DeploymentStatus, 'ok' | 'warn'> = {
  verified: 'ok',
  claimed: 'warn',
};

const HEADER_CELL =
  'px-3 py-2.5 text-left font-mono text-[11px] font-medium tracking-[0.14em] text-text-dim';

export function DeploymentDashboard({ className }: { className?: string }) {
  const [filter, setFilter] = useState<DeploymentFilter>('all');
  const rows = filterDeployments(DEPLOYMENT_ROWS, filter);

  return (
    <div
      data-testid="deployment-dashboard"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div
          role="group"
          aria-label="Filter by evidence status"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="font-sans text-xs text-text-dim">Evidence status</span>
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cx(
                'rounded-sm px-2.5 py-1 font-mono text-xs transition-colors active:translate-y-[1px]',
                filter === option.value
                  ? 'bg-surface-2 text-accent'
                  : 'text-text-dim hover:text-text',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p
          data-testid="deployment-count"
          aria-live="polite"
          className="ml-auto font-mono text-xs text-text-dim"
        >
          {rows.length} of {DEPLOYMENT_ROWS.length} rows
        </p>
        <button
          data-pagefind-ignore
          type="button"
          onClick={() => setFilter('all')}
          className="rounded-sm bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={HEADER_CELL}>
                Program
              </th>
              <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
                Value
              </th>
              <th scope="col" className={HEADER_CELL}>
                Status
              </th>
              <th scope="col" className={HEADER_CELL}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const citation = getCitation(row.sourceId);
              return (
                <tr
                  key={row.id}
                  data-testid={`deployment-row-${row.id}`}
                  className="border-b border-border last:border-b-0"
                >
                  <th
                    scope="row"
                    className="min-w-[170px] px-3 py-2.5 align-top font-mono text-xs font-medium text-text"
                  >
                    {row.program}
                    <p className="mt-1 max-w-[30ch] font-sans text-[11px] font-normal leading-snug text-text-dim">
                      {row.detail}
                    </p>
                  </th>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-mono text-sm text-accent">
                    {row.value}
                    <span className="mt-0.5 block font-sans text-[11px] text-text-dim">
                      {row.metric}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                  </td>
                  <td className="px-3 py-2.5 align-top font-mono text-xs">
                    {citation ? (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener"
                        className="whitespace-nowrap text-text-dim underline decoration-border underline-offset-2 transition-colors hover:text-text"
                      >
                        {row.sourceLabel}
                      </a>
                    ) : (
                      <span className="text-text-dim">{row.sourceLabel}</span>
                    )}
                    <span className="mt-0.5 block whitespace-nowrap text-text-dim">
                      {row.asOf}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
