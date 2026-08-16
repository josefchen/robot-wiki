import { cx } from '@/lib/utils';

/**
 * SwarmControlTable: the three control families for aerial swarms, for
 * the adjacent/drones module. Static, server-renderable, no client
 * state. Row content mirrors the module prose; every system named here
 * is cited there (Vásárhelyi's optimized flocking via the Zhou and Soria
 * papers' framing, Soria's NMPC swarms, Zhou's decentralized
 * trajectory-planning swarm).
 */

const ROWS = [
  {
    family: 'Reactive flocking',
    mechanism:
      'Potential fields: each drone accelerates away from near neighbors and obstacles, toward the flock',
    exemplar:
      'Optimized flocking of 30 drones outdoors (Vásárhelyi et al., 2018)',
    limit:
      'No lookahead: local minima trap the group, and collision avoidance degrades in clutter',
  },
  {
    family: 'Predictive (NMPC) control',
    mechanism:
      'Each drone solves a receding-horizon optimization that folds the same interaction terms into its dynamics',
    exemplar:
      'Five-quadrotor swarm through an obstacle field (Soria et al., 2021)',
    limit:
      'Solving an optimization per drone per control step; onboard compute bounds the horizon',
  },
  {
    family: 'Decentralized trajectory planning',
    mechanism:
      'Each drone replans a full spatial-temporal trajectory in milliseconds, treating neighbors as constraints',
    exemplar:
      'Ten palm-sized drones through a bamboo forest (Zhou et al., 2022)',
    limit:
      'Coordination is implicit: no global assignment, so guarantees are per-trajectory, not fleet-level',
  },
] as const;

const HEADER = [
  'Control family',
  'Mechanism',
  'Demonstrated at',
  'Characteristic limit',
] as const;

export function SwarmControlTable({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region and needs
      // keyboard access (axe scrollable-region-focusable); same pattern
      // as lib/rehype-scrollable-math.mjs applies to .katex-display.
      tabIndex={0}
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">
          The three control families for aerial swarms: reactive flocking,
          predictive nonlinear model-predictive control, and decentralized
          trajectory planning, with the mechanism, the system that demonstrated
          each, and its characteristic limit.
        </caption>
        <thead>
          <tr className="border-b border-border">
            {HEADER.map((text) => (
              <th
                key={text}
                scope="col"
                className="px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] text-text-dim"
              >
                {text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.family}
              data-testid={`swarm-family-${row.family
                .toLowerCase()
                .replace(/[^a-z]+/g, '-')}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs font-medium text-text"
              >
                {row.family}
              </th>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text">
                {row.mechanism}
              </td>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text-dim">
                {row.exemplar}
              </td>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text-dim">
                {row.limit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
