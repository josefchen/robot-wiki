'use client';

import { useId, useState, type CSSProperties } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  InstrumentReset,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage, StageCallout, StageReadout } from '@/components/motion/figure-frame';
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
 * DeploymentDashboard: the humanoid deployment records of the
 * reliability-gap module, drawn as one bar per program on a shared
 * hours-of-work scale and grouped by what backs each record. A record backed
 * by a company document traces to a cited company document at its own date;
 * none is independently audited. A demo-only record is a vendor
 * demonstration without a published deployment metric. The full records,
 * with their notes, sources and dates, sit in the "How this was made" table,
 * which the same filter narrows.
 *
 * The stage is HTML rather than an SVG so its text keeps one size and its
 * rows stay close together at every stage width.
 */

/** What backs each record, in the words the reader sees. */
export const DEPLOYMENT_STATUS_LABEL: Record<DeploymentStatus, string> = {
  verified: 'Backed by a company document',
  claimed: 'Demo only',
};

const FILTERS: Array<{ id: DeploymentFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: DEPLOYMENT_STATUS_LABEL.verified },
  { id: 'claimed', label: DEPLOYMENT_STATUS_LABEL.claimed },
];

const STATUS_VARIANT: Record<DeploymentStatus, 'ok' | 'warn'> = {
  verified: 'ok',
  claimed: 'warn',
};

const STATUS_LINE: Record<DeploymentStatus, 'solid' | 'dashed'> = {
  verified: 'solid',
  claimed: 'dashed',
};

const STATUS_ORDER: DeploymentStatus[] = ['verified', 'claimed'];

/** Stage names, shortened or glossed where the program name alone says too little. */
const STAGE_NAME: Record<string, string> = {
  'figure-8hr-shift': 'Figure Helix 02: one shift streamed live',
};

/** The stage line for a record with no hours to draw. */
const NO_HOURS_NOTE: Record<string, string> = {
  'tesla-optimus': 'No work hours; lines still being built',
};

/** The note under the biggest drawn record, by record. */
const RECORD_NOTE: Record<string, string> = {
  'agility-digit': 'Biggest record: 65,000 working hours, from Agility’s own website',
  'figure-bmw': 'Biggest record shown: 1,250+ hours at one BMW factory, from Figure',
  'figure-8hr-shift': 'A single 8-hour shift, streamed live online',
};

/** Hours on a scale where each step is ten times the last, 1 to 100,000. */
const DECADES = 5;
const hoursPercent = (hours: number) =>
  Number(((Math.log10(Math.max(hours, 1)) / DECADES) * 100).toFixed(2));
/** Labelled ticks every hundredfold; the unlabelled ones between are tens. */
const TICKS = [
  { exp: 0, label: '1' },
  { exp: 1, label: '' },
  { exp: 2, label: '100' },
  { exp: 3, label: '' },
  { exp: 4, label: '10,000' },
  { exp: 5, label: '' },
];

const ROW_GRID = 'grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[8rem_minmax(0,1fr)]';

const DOCUMENT_BAR: CSSProperties = { backgroundColor: 'var(--role-value-stage)' };
const DEMO_BAR: CSSProperties = {
  border: '1px dashed var(--role-reference-stage)',
  backgroundImage:
    'repeating-linear-gradient(45deg, var(--role-reference-stage) 0 1.5px, transparent 1.5px 6px)',
};

/** The hours a record reports, or null when it reports none ("Construction"). */
function recordHours(row: DeploymentRow): number | null {
  const hours = Number.parseFloat(row.value.replace(/,/g, ''));
  return Number.isFinite(hours) ? hours : null;
}

function hoursLabel(row: DeploymentRow): string {
  return /hours?$/i.test(row.value) ? row.value : `${row.value} hours`;
}

export function DeploymentDashboard({ className, deploymentRows = DEPLOYMENT_ROWS }: {
  className?: string;
  /** Explicit input permits empty evidence categories without changing the UI. */
  deploymentRows?: DeploymentRow[];
}) {
  const [filter, setFilter] = useState<DeploymentFilter>('all');
  const rows = filterDeployments(deploymentRows, filter);
  const captionId = useId();
  const citationFor = useCitationLookup();

  const biggest = rows.reduce<DeploymentRow | null>((best, row) => {
    const hours = recordHours(row);
    if (hours === null) return best;
    return best === null || hours > recordHours(best)! ? row : best;
  }, null);
  const summary = rows
    .map((row) => `${row.program}: ${recordHours(row) === null ? (NO_HOURS_NOTE[row.id] ?? row.value) : hoursLabel(row)} (${DEPLOYMENT_STATUS_LABEL[row.status].toLowerCase()})`)
    .join('; ');

  return (
    <InstrumentFigure
      figureId="deployment-dashboard"
      data-testid="deployment-dashboard"
      className={className}
      kicker="Deployment records"
      heading="Humanoid work records so far: company numbers, none independently audited"
      controls={
        <PresetGroup<DeploymentFilter>
          label="Show records"
          presets={FILTERS}
          value={filter}
          onChange={setFilter}
          testId="deployment-filter"
        />
      }
      adjust={<InstrumentReset onClick={() => setFilter('all')} />}
      stage={
        <FigureStage
          footer={
            <StageReadout data-testid="deployment-count">
              {rows.length} of {deploymentRows.length} records
            </StageReadout>
          }
        >
          {rows.length === 0 ? (
            <div className="px-3 pt-3 pb-1 font-sans text-sm text-text-dim">
              No records in this group.{' '}
              <button
                type="button"
                data-brand-control-id="control:link-focus"
                onClick={() => setFilter('all')}
                className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
              >
                Show all records
              </button>
            </div>
          ) : (
            <div
              role="img"
              data-chart=""
              aria-label={`Hours of work each company reports for its humanoid robots, none independently audited. ${summary}.`}
              className="px-3 pt-3 pb-1 font-sans text-sm leading-snug text-text"
            >
              <div aria-hidden="true" className="grid gap-y-3">
                {STATUS_ORDER.map((status) => {
                  const group = rows.filter((row) => row.status === status);
                  if (group.length === 0) return null;
                  return (
                    <div key={status} data-testid={`deployment-group-${status}`} className="grid gap-y-2">
                      <div className="font-semibold">{DEPLOYMENT_STATUS_LABEL[status]}</div>
                      {group.map((row) => {
                        const hours = recordHours(row);
                        const focus = row.id === biggest?.id;
                        const demo = row.status === 'claimed';
                        return (
                          <div
                            key={row.id}
                            data-testid={`deployment-bar-${row.id}`}
                            data-status={row.status}
                            data-series={demo ? 'deployment-demo' : 'deployment-document'}
                            className="grid gap-y-0.5"
                          >
                            <div>{STAGE_NAME[row.id] ?? row.program}</div>
                            {hours === null ? (
                              <div className="text-text-dim">{NO_HOURS_NOTE[row.id] ?? row.value}</div>
                            ) : (
                              <div className={ROW_GRID}>
                                <div className="tabular-nums">{hoursLabel(row)}</div>
                                <div className="relative h-3.5">
                                  <div
                                    data-chart-mark="bar"
                                    data-chart-role={demo ? 'reference' : 'value'}
                                    data-chart-emphasis={focus ? 'focus' : 'context'}
                                    className="absolute inset-y-0 left-0"
                                    style={{
                                      ...(demo ? DEMO_BAR : DOCUMENT_BAR),
                                      width: `${hoursPercent(hours)}%`,
                                      opacity: focus ? 1 : demo ? 0.8 : 0.5,
                                    }}
                                  />
                                  {focus ? (
                                    <span
                                      data-figure-pointer=""
                                      className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                                      style={{ left: `${hoursPercent(hours)}%`, borderColor: 'var(--role-highlight-stage)' }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )}
                            {focus ? (
                              <StageCallout className="mt-1">
                                {RECORD_NOTE[row.id] ?? `Biggest record: ${hoursLabel(row)}, from ${row.sourceLabel}`}
                              </StageCallout>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div data-chart-axes="" className={ROW_GRID}>
                  <div />
                  <div>
                    <div className="relative h-2 border-t border-text-dim/60">
                      {TICKS.map((tick) => (
                        <span
                          key={tick.exp}
                          className="absolute top-0 h-2 w-px -translate-x-1/2 bg-text-dim/60"
                          style={{ left: `${(tick.exp / DECADES) * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="relative h-5 text-text-dim">
                      {TICKS.filter((tick) => tick.label).map((tick) => (
                        <span
                          key={tick.exp}
                          data-scene-tick=""
                          className={cx(
                            'absolute top-0 whitespace-nowrap tabular-nums',
                            tick.exp === 0 ? '' : '-translate-x-1/2',
                          )}
                          style={{ left: `${(tick.exp / DECADES) * 100}%` }}
                        >
                          {tick.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div data-scene-axis="" className="-mt-2 text-right text-text-dim">
                  hours of work each company reports
                </div>
              </div>
            </div>
          )}
        </FigureStage>
      }
      caption="None of these numbers has been checked by an outside auditor, so read them as what companies say, not proven performance."
      method={
        <>
          <p>
            Each bar is the work a company reports for its humanoid robots. The scale grows by ten
            times at each tick, so an 8-hour shift and 65,000 hours fit on one line.
          </p>
          <p>
            &ldquo;{DEPLOYMENT_STATUS_LABEL.verified}&rdquo; means the figure traces to a cited
            company document at that document&rsquo;s own date; the hours and parts are vendor
            reports, and no independent audit is claimed. &ldquo;{DEPLOYMENT_STATUS_LABEL.claimed}
            &rdquo; marks a vendor demonstration without a published deployment metric. The records
            come from each document at its own date, not from one common snapshot. Tesla reports
            no hours: its lines are under construction, and designed capacity is not output.
          </p>
          <TableScroll labelledBy={captionId} className="pt-1">
            <table className="w-full min-w-[480px] border-collapse text-left font-sans text-sm text-text">
              <caption id={captionId} className="sr-only">
                Deployment programs with their reported value, what backs each record, and the
                source behind it. The filter above the chart narrows these rows too.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className="px-3 py-2 text-left font-medium text-text-dim">Program</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-text-dim">Value</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-text-dim">What backs it</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-text-dim">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const citation = citationFor(row.sourceId);
                  return (
                    <tr
                      key={row.id}
                      data-testid={`deployment-row-${row.id}`}
                      className="border-b border-border-strong last:border-b-0"
                    >
                      <th scope="row" className="min-w-[170px] px-3 py-2.5 align-top font-medium text-text">
                        {row.program}
                        <span className="mt-1 block max-w-[34ch] font-normal leading-snug text-text-dim">
                          {row.detail}
                        </span>
                      </th>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums text-text">
                        {row.value}
                        <span className="mt-0.5 block text-text-dim">{row.metric}</span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <StageStatusChip variant={STATUS_VARIANT[row.status]} line={STATUS_LINE[row.status]}>
                          {DEPLOYMENT_STATUS_LABEL[row.status]}
                        </StageStatusChip>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {citation ? (
                          <a
                            data-brand-control-id="control:link-focus"
                            href={citation.url}
                            target="_blank"
                            rel="noopener"
                            className="whitespace-nowrap text-link underline underline-offset-2"
                          >
                            {row.sourceLabel}
                          </a>
                        ) : (
                          <span className="text-text-dim">{row.sourceLabel}</span>
                        )}
                        <span className="mt-0.5 block whitespace-nowrap text-text-dim">{row.asOf}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </>
      }
    />
  );
}
