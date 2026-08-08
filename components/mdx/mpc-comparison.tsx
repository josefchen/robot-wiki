import { MPC_RL_COMPARISON_ROWS } from '@/lib/mpc-vs-rl';
import { cx } from '@/lib/utils';

/**
 * MpcComparison: the model-based vs learned control comparison table for
 * the reward-design-mpc module. Static, server-renderable, no client
 * state. Row data lives in lib/mpc-vs-rl.ts next to the interactive's
 * model so the module's claims have one source.
 */
export function MpcComparison({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-dim"
            >
              Axis
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-dim"
            >
              Model-based (MPC / whole-body QP)
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-dim"
            >
              Learned (sim-RL policy)
            </th>
          </tr>
        </thead>
        <tbody>
          {MPC_RL_COMPARISON_ROWS.map((row) => (
            <tr
              key={row.key}
              data-testid={`mpc-row-${row.key}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-normal px-4 py-3 align-top font-mono text-xs font-medium text-text"
              >
                {row.dimension}
              </th>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {row.mpc}
              </td>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {row.rl}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
