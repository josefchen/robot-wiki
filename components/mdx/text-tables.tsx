import { cx } from '@/lib/utils';

/**
 * Static qualitative tables for the SEO-cluster modules (action spaces,
 * foundation-model families, evaluation shift taxonomy). Server-renderable,
 * no client state; rows carry the article prose's own wording.
 *
 * The overflow-x-auto wrapper is a scrollable region on narrow viewports
 * and needs keyboard access (axe scrollable-region-focusable), matching
 * the surgical/swarm/orbital table convention.
 */

const HEADER_CELL =
  'px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim';
const ROW_HEADER =
  'whitespace-normal px-4 py-3 align-top font-mono text-xs font-medium text-text';
const TEXT_CELL =
  'px-4 py-3 align-top font-sans text-sm leading-relaxed text-text';

function TextTable({
  ariaLabel,
  columns,
  rows,
  className,
}: {
  ariaLabel: string;
  columns: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
  className?: string;
}) {
  const [first, ...rest] = columns;
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      data-brand-surface-id="surface:flat"
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={HEADER_CELL}>
              {first}
            </th>
            {rest.map((col) => (
              <th key={col} scope="col" className={HEADER_CELL}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([head, ...cells]) => (
            <tr key={head} className="border-b border-border last:border-b-0">
              <th scope="row" className={ROW_HEADER}>
                {head}
              </th>
              {cells.map((cell, i) => (
                <td key={i} className={TEXT_CELL}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActionSpaceTable({ className }: { className?: string }) {
  return (
    <TextTable
      ariaLabel="Action space requirements compared"
      columns={[
        'Requirement',
        'Practical starting point',
        'Main burden below the policy',
      ]}
      rows={[
        [
          'Single-arm imitation on fixed hardware',
          'Joint positions or velocities',
          'Tracking and joint limits',
        ],
        [
          'Transfer across different arms',
          'Relative Cartesian deltas',
          'IK, frames and singularities',
        ],
        [
          'Contact compliance',
          'Cartesian impedance targets',
          'Fast force or torque controller',
        ],
        [
          'Dynamic locomotion or dexterity',
          'Torque or residual torque',
          'Dynamics, rate and safety',
        ],
        [
          'Slow semantic manipulation',
          'Chunked Cartesian actions',
          'Replanning and stale chunks',
        ],
        [
          'Language-model output head',
          'Tokenized chunks',
          'Quantization and decode latency',
        ],
      ]}
      className={className}
    />
  );
}

export function FoundationModelFamiliesTable({
  className,
}: {
  className?: string;
}) {
  return (
    <TextTable
      ariaLabel="Foundation model families compared"
      columns={[
        'Family',
        'Pretrained capability',
        'Typical downstream output',
        'Strongest transfer claim',
        'Main unresolved cost',
      ]}
      rows={[
        [
          'VLA',
          'Vision-language semantics',
          'Action tokens or continuous chunks',
          'New tasks, objects and instructions',
          'Robot data and control integration',
        ],
        [
          'Generalist humanoid',
          'Multimodal behavior across a morphology family',
          'Whole-body action chunks',
          'Tasks and related humanoid embodiments',
          'Balance, contact and hardware variation',
        ],
        [
          'Latent or JEPA world model',
          'Predictive state representation',
          'Latent future, value or plan',
          'New tasks with shared dynamics structure',
          'Planning objective and action grounding',
        ],
        [
          'Generative world model',
          'Visual and temporal generation',
          'Future video or synthetic experience',
          'Data generation and policy evaluation',
          'Physical fidelity and inference cost',
        ],
      ]}
      className={className}
    />
  );
}

export function SimVsModelTable({ className }: { className?: string }) {
  return (
    <TextTable
      ariaLabel="Physics simulators and learned world models compared"
      columns={['Property', 'Physics simulator', 'Learned world model']}
      rows={[
        [
          'Dynamics source',
          'equations and parameters',
          'observed transitions',
        ],
        [
          'Counterfactual coverage',
          'broad within modeled mechanics',
          'strongest near training support',
        ],
        [
          'State access',
          'explicit positions, forces and contacts',
          'latent or generated observations',
        ],
        [
          'Debugging',
          'inspect parameters and constraints',
          'inspect errors and sensitivity indirectly',
        ],
        [
          'Appearance',
          'authored assets and renderers',
          'learned from image or video data',
        ],
        [
          'Adaptation',
          'identify parameters or modify models',
          'fine-tune on new trajectories',
        ],
        [
          'Failure mode',
          'wrong assumptions or parameters',
          'action collapse, drift, hallucination',
        ],
        [
          'Compute pattern',
          'many small integration steps',
          'large neural inference calls',
        ],
      ]}
      className={className}
    />
  );
}

export function EvalShiftTable({ className }: { className?: string }) {
  return (
    <TextTable
      ariaLabel="Evaluation shift taxonomy"
      columns={['Shift', 'Example', 'Failure it exposes']}
      rows={[
        [
          'Visual',
          'lighting, texture, distractors',
          'representation dependence',
        ],
        [
          'Geometric',
          'object pose, camera pose, layout',
          'spatial grounding',
        ],
        [
          'Physical',
          'mass, friction, compliance',
          'dynamics fidelity',
        ],
        [
          'Semantic',
          'new object or instruction',
          'pretrained knowledge transfer',
        ],
        [
          'Policy',
          'architecture or checkpoint family',
          'evaluator overfitting',
        ],
        [
          'Embodiment',
          'arm, gripper or control convention',
          'action-space dependence',
        ],
      ]}
      className={className}
    />
  );
}
