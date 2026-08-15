import { SCALING_LAW_ROWS } from '@/lib/data-scaling';
import { cx } from '@/lib/utils';

/**
 * ScalingLawsTable: the what-to-scale summary from the data-bottleneck
 * module. Static, server-renderable, no client state. Row data lives in
 * lib/data-scaling.ts next to the interactive's model so the module's claims
 * have one source. The overflow-x-auto wrapper keeps the table inside its
 * own scroll container on narrow viewports (no page-level horizontal scroll).
 */
export function ScalingLawsTable({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region on narrow
      // viewports and needs keyboard access (axe scrollable-region-focusable),
      // matching the surgical/swarm/orbital table convention.
      tabIndex={0}
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Dimension
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Effect on performance
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Saturation
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {SCALING_LAW_ROWS.map((row) => (
            <tr
              key={row.key}
              data-testid={`scaling-row-${row.key}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-normal px-4 py-3 align-top font-mono text-xs font-medium text-text"
              >
                {row.dimension}
              </th>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {row.effect}
              </td>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {row.saturation}
              </td>
              <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs text-text-dim">
                {row.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
