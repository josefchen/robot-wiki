import { cx } from '@/lib/utils';
import { SURGICAL_SYSTEM_ROWS } from '@/lib/surgical-systems';

/**
 * SurgicalSystemsTable: the three commercial systems the adjacent/surgical
 * module covers, compared across design focus, differentiator, regulatory
 * path, and position on the Yang et al. autonomy scale. Static,
 * server-renderable, no client state. Row data lives in
 * lib/surgical-systems.ts next to the module prose so the claims share one
 * source. The overflow wrapper carries tabIndex (axe
 * scrollable-region-focusable), the same pattern as the swarm table.
 */

const HEADER = [
  'System',
  'Design focus',
  'Differentiator',
  'Regulatory path',
] as const;

export function SurgicalSystemsTable({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region and needs
      // keyboard access (axe scrollable-region-focusable), matching
      // components/mdx/swarm-control-table.tsx.
      tabIndex={0}
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[620px] border-collapse text-left">
        <caption className="sr-only">
          Surgical robotic systems compared: Intuitive da Vinci, CMR Versius,
          and Moon Surgical Maestro, by design focus, differentiator, and
          regulatory path, with each system’s position on the six-level autonomy
          scale of Yang et al.
        </caption>
        <thead>
          <tr className="border-b border-border">
            {HEADER.map((text) => (
              <th
                key={text}
                scope="col"
                className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
              >
                {text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SURGICAL_SYSTEM_ROWS.map((row) => (
            <tr
              key={row.key}
              data-testid={`surgical-system-${row.key}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs font-medium text-text"
              >
                {row.system}
                <span
                  data-testid={`surgical-level-${row.key}`}
                  // No letter-spacing: this is a data chip (the system's
                  // autonomy level), and an uppercase letterspaced span
                  // would count against the VAL-DESIGN-010 micro-label
                  // budget alongside the sidebar's own labels.
                  className="mt-1.5 block rounded-xs border border-border bg-surface-2 px-1.5 py-0.5 text-center text-[10px] font-normal text-text-dim"
                >
                  L{row.autonomyLevel}
                </span>
              </th>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text">
                {row.focus}
              </td>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text-dim">
                {row.edge}
              </td>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text-dim">
                {row.regulatory}
                <span className="mt-1 block text-[13px] text-text-dim">
                  {row.autonomyNote}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
