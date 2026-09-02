import { Badge } from '@/components/ui';
import { GR2_RESULTS, formatSuccess } from '@/lib/wbc-decomposition';
import { cx } from '@/lib/utils';

/**
 * Gr2ResultsTable: the Gemini Robotics 2 published success-rate table for
 * the humanoid-wbc module. Static, server-renderable, no client state. Row
 * data lives in lib/wbc-decomposition.ts so the module's prose, the
 * interactive's stats, and this table share one source.
 *
 * Every figure is vendor-reported by Google DeepMind (2026-07-30) with no
 * external replication; the evidence column and the caveat below the table
 * say so next to the numbers, per the content-quality rules.
 */
export function Gr2ResultsTable({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region on narrow
      // viewports and needs keyboard access (axe scrollable-region-focusable),
      // matching the surgical/swarm/orbital table convention.
      tabIndex={0}
      role="region"
      aria-label="Gemini Robotics 2 published success rates"
      data-brand-surface-id="surface:flat"
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
              Category
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Task
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Embodiment
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-right font-mono text-[11px] font-medium text-text-dim"
            >
              Success
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Evidence
            </th>
          </tr>
        </thead>
        <tbody>
          {GR2_RESULTS.map((row) => (
            <tr
              key={row.task}
              data-testid={`gr2-row-${row.task.replaceAll(' ', '-')}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-normal px-4 py-2.5 align-top font-mono text-xs font-medium text-text"
              >
                {row.category}
              </th>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text">
                {row.task}
              </td>
              <td className="px-4 py-2.5 align-top font-mono text-xs text-text-dim">
                {row.embodiment}
              </td>
              <td className="px-4 py-2.5 text-right align-top font-mono text-sm text-accent">
                {formatSuccess(row.success)}
              </td>
              <td className="px-4 py-2.5 align-top">
                <Badge variant="warn">vendor-reported</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        data-testid="gr2-caveat"
        className="border-t border-border px-4 py-3 font-sans text-xs leading-relaxed text-text-dim"
      >
        All figures are vendor-reported by Google DeepMind (2026-07-30) with
        no external replication and no standardized humanoid benchmark to
        compare against. DeepMind&apos;s own gloss: whole-body and gripper-based
        dexterous tasks reach medium to high success; multi-finger dexterous
        manipulation remains challenging.
      </p>
    </div>
  );
}
