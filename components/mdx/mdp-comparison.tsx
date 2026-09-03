import { MDP_ROWS } from '@/lib/contact-geometry';
import { cx } from '@/lib/utils';

/**
 * MdpComparison: the six-property locomotion-vs-manipulation MDP table from
 * the why-rl-locomotion module. Static, server-renderable, no client state.
 * Row data lives in lib/contact-geometry.ts next to the interactive's model
 * so the module's claims have one source.
 */
export function MdpComparison({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region on narrow
      // viewports and needs keyboard access (axe scrollable-region-focusable),
      // matching the surgical/swarm/orbital table convention.
      tabIndex={0}
      role="region"
      aria-label="Locomotion and manipulation MDP properties"
      data-brand-surface-id="surface:flat"
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
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              MDP property
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Locomotion
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Manipulation
            </th>
          </tr>
        </thead>
        <tbody>
          {MDP_ROWS.map((row) => (
            <tr
              key={row.key}
              data-testid={`mdp-row-${row.key}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-normal px-4 py-3 align-top font-mono text-xs font-medium text-text"
              >
                {row.property}
              </th>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {row.locomotion}
              </td>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {row.manipulation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
