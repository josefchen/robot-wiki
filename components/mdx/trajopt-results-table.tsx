import { cx } from '@/lib/utils';

/**
 * TrajOpt benchmark result tables for the motion-planning module
 * (Schulman et al. 2013, Tables I and II). Static, server-renderable, no
 * client state; the rows are the paper's reported numbers as the module
 * prose describes them.
 *
 * The overflow-x-auto wrapper is a scrollable region on narrow viewports
 * and needs keyboard access (axe scrollable-region-focusable), matching
 * the surgical/swarm/orbital table convention.
 */

const ARM_ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
  ['TrajOpt', '0.84', '0.20', '1.2'],
  ['TrajOpt, multiple initializations', '0.99', '0.32', '1.2'],
  ['OMPL RRTConnect', '0.97', '1.2', '1.6'],
  ['OMPL LBKPIECE', '0.96', '3.1', '1.7'],
  ['CHOMP', '0.66', '3.1', '2.4'],
  ['CHOMP, multiple initializations', '0.85', '6.0', '2.6'],
];

const FULL_BODY_ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
  ['TrajOpt', '0.63', '2.1', '1.08'],
  ['TrajOpt, multiple initializations', '0.84', '7.6', '1.09'],
  ['OMPL RRTConnect', '0.53', '18.0', '1.5'],
  ['OMPL LBKPIECE', '0.50', '18.7', '1.5'],
];

const HEADER_CELL =
  'px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim';
const ROW_HEADER =
  'whitespace-normal px-4 py-3 align-top font-mono text-xs font-medium text-text';
const NUMERIC_CELL =
  'px-4 py-3 align-top font-sans text-sm leading-relaxed text-text text-right';

function ResultsTable({
  ariaLabel,
  methodHeader,
  rows,
  className,
}: {
  ariaLabel: string;
  methodHeader: string;
  rows: ReadonlyArray<readonly [string, string, string, string]>;
  className?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      data-brand-surface-id="surface:flat"
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={HEADER_CELL}>
              {methodHeader}
            </th>
            <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
              Success fraction
            </th>
            <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
              Average time (s)
            </th>
            <th scope="col" className={cx(HEADER_CELL, 'text-right')}>
              Average normalized length
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([method, success, time, length]) => (
            <tr
              key={method}
              className="border-b border-border last:border-b-0"
            >
              <th scope="row" className={ROW_HEADER}>
                {method}
              </th>
              <td className={NUMERIC_CELL}>{success}</td>
              <td className={NUMERIC_CELL}>{time}</td>
              <td className={NUMERIC_CELL}>{length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrajOptArmTable({ className }: { className?: string }) {
  return (
    <ResultsTable
      ariaLabel="TrajOpt arm benchmark results"
      methodHeader="Arm method"
      rows={ARM_ROWS}
      className={className}
    />
  );
}

export function TrajOptFullBodyTable({ className }: { className?: string }) {
  return (
    <ResultsTable
      ariaLabel="TrajOpt full-body benchmark results"
      methodHeader="Full-body method"
      rows={FULL_BODY_ROWS}
      className={className}
    />
  );
}
