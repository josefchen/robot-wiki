'use client';

import { useId, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { StageStatusChip } from '@/components/ui/stage-status-chip';
import {
  DEPLOYMENT_ROWS,
  filterDeployments,
  type DeploymentFilter,
  type DeploymentRow,
  type DeploymentStatus,
} from '@/lib/deployment-reality';
import { cx } from '@/lib/utils';

/**
 * DeploymentDashboard: the deployment-reality table for the reliability-gap
 * module. Source-backed vendor reports sit next to vendor-run
 * demonstrations, and the status chip carries the distinction in its word
 * and its border: solid for verified, dashed for claimed.
 *
 * Interactive contract: typed data from lib/deployment-reality.ts, a filter
 * group (all / verified / claimed) with aria-pressed buttons, a visible row
 * count readout, and a reset control. No auto-playing motion, no layout
 * shift on load.
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

const STATUS_LINE: Record<DeploymentStatus, 'solid' | 'dashed'> = {
  verified: 'solid',
  claimed: 'dashed',
};

const HEADER_CELL = 'px-3 py-2 text-left font-sans text-xs font-medium text-text-dim';

const CELL = 'px-3 py-2.5 align-top';

export function DeploymentDashboard({ className, deploymentRows = DEPLOYMENT_ROWS }: {
  className?: string;
  /** Explicit input permits empty evidence categories without changing the UI. */
  deploymentRows?: DeploymentRow[];
}) {
  const [filter, setFilter] = useState<DeploymentFilter>('all');
  const rows = filterDeployments(deploymentRows, filter);
  const captionId = useId();
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="deployment-dashboard"
      data-testid="deployment-dashboard"
      className={className}
      heading="Deployment records by evidence status"
      controls={
        <>
          <div
            role="group"
            aria-label="Filter by evidence status"
            className="flex flex-wrap items-center gap-1"
          >
            <span className="font-sans text-[13px] text-text-dim">Evidence status</span>
            {FILTERS.map((option) => (
              <button
                data-brand-control-id="control:selection"
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {option.label}
              </button>
            ))}
          </div>
          <InstrumentReset onClick={() => setFilter('all')} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <InstrumentReadout data-testid="deployment-count">
              {rows.length} of {deploymentRows.length} rows
            </InstrumentReadout>
          }
        >
          <TableScroll labelledBy={captionId} className="px-1 pt-1.5 pb-1">
            <table className="w-full min-w-[480px] border-collapse text-left font-sans text-[13px] text-text">
              <caption id={captionId} className="sr-only">
                Deployment programs with their reported value, whether the figure
                is verified or claimed, and the source behind it. Filter the rows
                by status above the table.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
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
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-text-dim">
                      No records in this evidence category.{' '}
                      <button
                        type="button"
                        data-brand-control-id="control:link-focus"
                        onClick={() => setFilter('all')}
                        className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
                      >
                        Show all records
                      </button>
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const citation = citationFor(row.sourceId);
                  return (
                    <tr
                      key={row.id}
                      data-testid={`deployment-row-${row.id}`}
                      className="border-b border-border-strong last:border-b-0"
                    >
                      <th scope="row" className={cx(CELL, 'min-w-[170px] font-medium text-text')}>
                        {row.program}
                        <span className="mt-1 block max-w-[30ch] text-xs font-normal leading-snug text-text-dim">
                          {row.detail}
                        </span>
                      </th>
                      <td className={cx(CELL, 'whitespace-nowrap text-right tabular-nums text-text')}>
                        {row.value}
                        <span className="mt-0.5 block text-xs text-text-dim">{row.metric}</span>
                      </td>
                      <td className={CELL}>
                        <StageStatusChip variant={STATUS_VARIANT[row.status]} line={STATUS_LINE[row.status]}>
                          {row.status}
                        </StageStatusChip>
                      </td>
                      <td className={cx(CELL, 'text-xs')}>
                        {citation ? (
                          <a
                            data-brand-control-id="control:link-focus"
                            href={citation.url}
                            target="_blank"
                            rel="noopener"
                            className="whitespace-nowrap underline-offset-2"
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
          </TableScroll>
        </FigureStage>
      }
      caption="Verified rows trace to a cited company document; claimed rows are vendor demonstrations without a published deployment metric."
    />
  );
}
