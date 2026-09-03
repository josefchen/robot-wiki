import { cx } from '@/lib/utils';

/**
 * AvStackTable: the four-stage autonomous-driving pipeline for the
 * adjacent/autonomous-vehicles module. Static, server-renderable, no client
 * state. The overflow-x-auto wrapper keeps the table inside its own scroll
 * container on narrow viewports (no page-level horizontal scroll).
 *
 * Row content mirrors the module prose; every method named here is cited
 * there (VectorNet, UniAD, ChauffeurNet, EMMA, the Paden planning/control
 * survey, and the NTSB Tempe report for the perception failure case).
 */

const ROWS = [
  {
    stage: 'Perception',
    question: 'Where is everything, and what is it?',
    methods: "Lidar, camera, and radar detection and tracking; occupancy grids; the Waymo Open Dataset lineage",
    failure:
      'A missed or misclassified object propagates to every stage below; the Tempe 2018 crash began as a classification flip',
  },
  {
    stage: 'Prediction',
    question: 'What will every moving thing do next?',
    methods: 'Graph networks over agents and HD map (VectorNet); joint forecasting (UniAD); multi-modal futures',
    failure:
      'Forecasting only the most likely future is unsafe when the rare future is the dangerous one',
  },
  {
    stage: 'Planning',
    question: 'What should the ego vehicle do about it?',
    methods: 'Imitative planning with synthesized worst cases (ChauffeurNet); joint training (UniAD); text trajectories (EMMA)',
    failure:
      'Causal confusion and imitation shortcuts: the policy learns what the expert usually did, not why',
  },
  {
    stage: 'Control',
    question: 'How is the plan tracked through the car?',
    methods: 'Lateral and longitudinal feedback, MPC and the survey taxonomy of Paden et al.',
    failure:
      'Tracking error grows at the limits of available friction and actuator latency',
  },
] as const;

const HEADER = ['Stage', 'Question it answers', 'Representative methods', 'Characteristic failure'] as const;

export function AvStackTable({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region on narrow
      // viewports and needs keyboard access (axe scrollable-region-focusable),
      // matching the surgical/swarm/orbital table convention.
      tabIndex={0}
      role="region"
      aria-label="Autonomous driving stack stages"
      data-brand-surface-id="surface:flat"
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">
          The four stages of the autonomous-driving stack: perception,
          prediction, planning, and control, with the question each answers,
          representative methods, and its characteristic failure.
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
          {ROWS.map((row) => (
            <tr
              key={row.stage}
              data-testid={`av-stage-${row.stage.toLowerCase()}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs font-medium text-text"
              >
                {row.stage}
              </th>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text">
                {row.question}
              </td>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text-dim">
                {row.methods}
              </td>
              <td className="px-4 py-2.5 align-top font-sans text-sm text-text-dim">
                {row.failure}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
