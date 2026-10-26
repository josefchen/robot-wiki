import { cx } from '@/lib/utils';

/**
 * OrbitalServicingTable: six on-orbit robotics milestones for the
 * adjacent/space module, from autonomous rendezvous and docking in 1998
 * to commercial debris inspection and a robotic servicer launched in 2026. Static, server-renderable,
 * no client state. Every row is cited in the module prose.
 */

const ROWS = [
  {
    mission: 'ETS-VII (KIKU-7)',
    year: '1998',
    operator: 'NASDA (Japan)',
    demonstrated:
      'Autonomous rendezvous and docking between two satellites, plus a 2-metre, 6-DoF robot arm operated from the ground and in orbit'
  },
  {
    mission: 'Orbital Express',
    year: '2007',
    operator: 'DARPA / Boeing / Ball',
    demonstrated:
      'Servicer ASTRO autonomously captured the NextSat client and transferred propellant and a battery to it across a four-month flight demonstration'
  },
  {
    mission: 'Canadarm2 + Dextre',
    year: '2001 / 2008',
    operator: 'CSA (on the ISS)',
    demonstrated:
      'A 17-metre arm that assembled the station and still berths visiting vehicles, working with a two-armed robot that replaces exterior equipment including 100-kg batteries'
  },
  {
    mission: 'MEV-1',
    year: '2020',
    operator: 'Northrop Grumman',
    demonstrated:
      'First docking of two commercial spacecraft in orbit, capturing Intelsat 901 in the graveyard orbit and returning it to service for five years'
  },
  {
    mission: 'ADRAS-J',
    year: '2024',
    operator: 'Astroscale (for JAXA)',
    demonstrated:
      'Rendezvous with a discarded rocket upper stage, fly-around inspections, and a 15-metre approach, the closest any commercial craft has come to debris; controlled deorbit begun by March 25, 2026, after 293 days in orbit'
  },
  {
    mission: 'Mission Robotic Vehicle',
    year: '2026',
    operator: 'Northrop Grumman / DARPA',
    demonstrated:
      'Launched on July 21, 2026 with the RSGS payload, twin robotic arms built by the U.S. Naval Research Laboratory, to install mission extension pods that extend satellites’ lives'
  },
] as const;

const HEADER = ['Mission', 'Year', 'Operator', 'What it demonstrated'] as const;

export function OrbitalServicingTable({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region and needs
      // keyboard access (axe scrollable-region-focusable); same pattern
      // as components/mdx/swarm-control-table.tsx.
      tabIndex={0}
      role="region"
      aria-label="On-orbit servicing robotics milestones"
      data-brand-surface-id="surface:flat"
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">
          Six on-orbit robotics milestones: ETS-VII, Orbital Express,
          Canadarm2 with Dextre, MEV-1, ADRAS-J and the Mission Robotic
          Vehicle, with the year, the operator, and what each mission
          demonstrated.
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
              key={row.mission}
              data-testid={`orbital-milestone-${row.mission
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs font-medium text-text"
              >
                {row.mission}
              </th>
              <td className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs text-text">
                {row.year}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 align-top font-sans text-sm text-text-dim">
                {row.operator}
              </td>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text">
                {row.demonstrated}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
