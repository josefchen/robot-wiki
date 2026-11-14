import { ChartDescription } from '@/components/ui/chart-description';
import { FigureFrame, FigureStage, FIGURE_TEXT_CLASS } from '@/components/motion/figure-frame';
import { motionRoleVar } from '@/lib/motion-tokens';
import type { ResolvedEnd, ResolvedTrajectory } from '@/lib/now';
import {
  endNote,
  figureSourceCount,
  trajectoryDescription,
  trajectoryHeadline,
  trajectoryPositions,
  trajectorySources,
} from '@/lib/now-page';
import { cx } from '@/lib/utils';
import { SourceLink, SourceTypeMark } from './source-mark';

export const TRAJECTORY_FIGURE_ID = 'now-trajectories';
const DESCRIPTION_ID = 'now-trajectories-description';

const EARLIER_STROKE = motionRoleVar('measurement', 'graphic');
const NOW_FILL = motionRoleVar('highlight', 'graphic');

/** The earlier end: a cross, the measurement marker. */
function CrossGlyph() {
  return (
    <svg aria-hidden="true" width="9" height="9" viewBox="0 0 9 9" className="inline-block shrink-0 overflow-visible">
      <path d="M1 1 L8 8 M1 8 L8 1" fill="none" style={{ stroke: EARLIER_STROKE }} strokeWidth={1.5} />
    </svg>
  );
}

/** The value now: a dot in the one accent. */
function DotGlyph() {
  return (
    <svg aria-hidden="true" width="9" height="9" viewBox="0 0 9 9" className="inline-block shrink-0">
      <circle cx="4.5" cy="4.5" r="4.5" style={{ fill: NOW_FILL }} />
    </svg>
  );
}

/**
 * One row's track: its own scale from zero (the tick at the left) to the
 * larger end. Ends sit at percentages of the track, so the drawing needs no
 * viewBox and its strokes stay one CSS width at every size.
 */
function Track({ row }: { row: ResolvedTrajectory }) {
  const { earlier, later } = trajectoryPositions(row);
  const head = row.direction === 'up' ? 'M-14 -4 L-9 0 L-14 4' : 'M14 -4 L9 0 L14 4';
  return (
    <svg aria-hidden="true" width="100%" height="18" className="block overflow-visible">
      <line x1="0%" x2="100%" y1="9" y2="9" className="stroke-border-strong" strokeWidth={1} />
      <line x1="0%" x2="0%" y1="3" y2="15" className="stroke-text-dim" strokeWidth={1} />
      {row.direction === 'flat' ? null : (
        <>
          <line x1={`${earlier}%`} x2={`${later}%`} y1="9" y2="9" className="stroke-ink" strokeWidth={1.5} />
          <svg x={`${later}%`} y="9" overflow="visible">
            <path d={head} fill="none" className="stroke-ink" strokeWidth={1.5} />
          </svg>
        </>
      )}
      <svg x={`${earlier}%`} y="9" overflow="visible">
        <path d="M-4 -4 L4 4 M-4 4 L4 -4" fill="none" style={{ stroke: EARLIER_STROKE }} strokeWidth={1.5} />
      </svg>
      <svg x={`${later}%`} y="9" overflow="visible">
        <circle r="5" style={{ fill: NOW_FILL }} />
      </svg>
    </svg>
  );
}

function EndLabel({
  end,
  which,
  showLabel,
  align,
}: {
  end: ResolvedEnd;
  which: 'earlier' | 'later';
  showLabel: boolean;
  align: 'start' | 'end';
}) {
  return (
    <div
      data-trajectory-end={which}
      className={cx('min-w-0 max-w-[60%]', align === 'end' ? 'text-right' : 'text-left')}
    >
      <div className="font-mono text-[13px] tabular-nums leading-5 text-text">
        <span className="mr-1.5 inline-block align-[-0.5px]">
          {which === 'earlier' ? <CrossGlyph /> : <DotGlyph />}
        </span>
        {end.display}
      </div>
      <time dateTime={end.date} className={cx(FIGURE_TEXT_CLASS.kicker, 'block')}>
        {end.period}
      </time>
      {end.basis === 'computed' ? (
        <div className={FIGURE_TEXT_CLASS.kicker}>
          <SourceTypeMark type={end.basis} />
          {end.label === end.period ? null : <> {end.label}</>}
        </div>
      ) : showLabel ? (
        <div className={FIGURE_TEXT_CLASS.kicker}>{end.label}</div>
      ) : null}
    </div>
  );
}

function TrajectoryRow({ row }: { row: ResolvedTrajectory }) {
  // Labels read left to right in the order the marks sit on the track.
  const ends = row.direction === 'down'
    ? ([['later', row.later], ['earlier', row.earlier]] as const)
    : ([['earlier', row.earlier], ['later', row.later]] as const);
  // A stated end's label shows only where it adds to its period and differs between the ends.
  const showLabel = (end: ResolvedEnd) =>
    end.basis === 'stated' &&
    !end.label.includes(end.period) &&
    !end.period.includes(end.label) &&
    row.earlier.label !== row.later.label;
  const reported = trajectorySources(row).some((source) => source.sourceType === 'reported');
  return (
    <li
      data-trajectory={row.id}
      data-direction={row.direction}
      className="min-w-0 border-t border-border py-4 first:border-t-0 first:pt-0 md:[&:nth-child(2)]:border-t-0 md:[&:nth-child(2)]:pt-0"
    >
      <div className="font-sans text-[14px] leading-5 text-text">
        {row.title}
        {reported ? <> <SourceTypeMark type="reported" /></> : null}
      </div>
      {row.ratio ? <div className={FIGURE_TEXT_CLASS.kicker}>{row.ratio.text}</div> : null}
      <div className="mt-3 px-[6px]">
        <Track row={row} />
      </div>
      <div className="mt-2 flex items-start justify-between gap-4">
        {ends.map(([which, end], index) => (
          <EndLabel
            key={which}
            end={end}
            which={which}
            showLabel={showLabel(end)}
            align={index === 0 ? 'start' : 'end'}
          />
        ))}
      </div>
      <div className={cx(FIGURE_TEXT_CLASS.kicker, 'mt-2')}>{row.caveat}</div>
    </li>
  );
}

function MethodRow({ row }: { row: ResolvedTrajectory }) {
  const end = (which: 'earlier' | 'later', value: ResolvedEnd) => {
    const note = endNote(row.id, which);
    return (
      <li>
        {which === 'earlier' ? 'Earlier' : 'Now'}: <span className="font-mono tabular-nums">{value.display}</span>,{' '}
        {value.period}, {value.label}.{' '}
        {value.sources.map((source, index) => (
          <span key={`${source.sourceUrl}-${index}`}>
            {index > 0 ? '; ' : null}
            <SourceLink url={source.sourceUrl} title={source.sourceTitle} label={source.sourceTitle} />
            {source.sourceType === 'reported' ? <> <SourceTypeMark type={source.sourceType} /></> : null}
          </span>
        ))}
        {note ? (
          <span data-end-note={which} className="block">
            {note.text}:{' '}
            <SourceLink url={note.sourceUrl} title={note.sourceTitle} label={note.sourceTitle} />
            {note.sourceType === 'reported' ? <> <SourceTypeMark type={note.sourceType} /></> : null}
          </span>
        ) : null}
      </li>
    );
  };
  return (
    <li data-method-row={row.id}>
      <div className="text-text">{row.title}</div>
      <div>Measured by {row.measuredBy}.</div>
      <ul className="mt-1 space-y-1">
        {end('earlier', row.earlier)}
        {end('later', row.later)}
        {row.alongside.map((beside) => (
          <li key={beside.label}>
            Beside them: <span className="font-mono tabular-nums">{beside.display}</span>, {beside.period},{' '}
            {beside.label}.
          </li>
        ))}
        {row.note ? (
          <li>
            {row.note.text}:{' '}
            <SourceLink url={row.note.sourceUrl} title={row.note.sourceTitle} label={row.note.sourceTitle} />
          </li>
        ) : null}
      </ul>
    </li>
  );
}

/**
 * "Where it is heading": one small row per trajectory, each on its own
 * scale from zero, the earlier end a cross and the value now a blue dot,
 * with an arrow for the direction. Static markup; nothing animates.
 */
export function TrajectoryFigure({ rows }: { rows: readonly ResolvedTrajectory[] }) {
  const reported = rows.some((row) => trajectorySources(row).some((source) => source.sourceType === 'reported'));
  return (
    <FigureFrame
      figureId={TRAJECTORY_FIGURE_ID}
      heading={trajectoryHeadline(rows)}
      stage={
        <FigureStage>
          <ol
            aria-describedby={DESCRIPTION_ID}
            className="grid grid-cols-1 gap-x-10 md:grid-cols-2"
          >
            {rows.map((row) => (
              <TrajectoryRow key={row.id} row={row} />
            ))}
          </ol>
        </FigureStage>
      }
      caption="Each row runs from zero on its own scale, so read each row's direction rather than comparing lengths across rows."
      method={
        <>
          <div>
            Each row is scaled from zero to its larger end. A computed end is derived from the stated inputs
            its sources give: a value implied by a stated growth rate, a sum of stated hours, a share of
            stated hours, the days between two dated posts, or GPUs times days times 24 hours.
            {reported ? (
              <>
                {' '}
                <SourceTypeMark type="reported" /> marks a figure taken from a report of the measurer&apos;s
                number rather than the measurer&apos;s own page.
              </>
            ) : null}
          </div>
          <ChartDescription
            id={DESCRIPTION_ID}
            description={trajectoryDescription(rows)}
            form="table"
            open
            rowHeader="Measure"
            columns={[
              { header: 'Earlier' },
              { header: 'When' },
              { header: 'Now' },
              { header: 'When' },
            ]}
            rows={rows.map((row) => ({
              label: row.title,
              values: [row.earlier.display, row.earlier.period, row.later.display, row.later.period],
            }))}
          />
          <ol className="space-y-3">
            {rows.map((row) => (
              <MethodRow key={row.id} row={row} />
            ))}
          </ol>
        </>
      }
      source={`Sources: ${figureSourceCount(rows)} pages, each linked under How this was made.`}
    />
  );
}
