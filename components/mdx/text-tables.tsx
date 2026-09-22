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

export function WorldModelCostTable({ className }: { className?: string }) {
  return (
    <TextTable
      ariaLabel="Inference cost of four world representations compared on one machine"
      columns={[
        'Quantity',
        '8B text LLM (decode)',
        'Latent WM (V-JEPA 2-AC)',
        'AR / diffusion WM (Cosmos Predict)',
        'Explicit 3D world (3DGS)',
      ]}
      rows={[
        [
          'Model memory',
          '16 GB fp16, ~5 GB Q4',
          '~2.6 GB fp16 (1B encoder + 0.3B predictor)',
          '32.5 to 56.4 GB required VRAM (Predict2 Video2World, 2B to 14B); Predict1 14B tops 80 GB without offloading',
          '0; the scene is an asset, not weights',
        ],
        [
          'Runtime state per step',
          'KV cache, ~128 KB per token',
          'block-causal context: patch features, actions and poses of the current and earlier steps',
          'latents plus KV, grows with clip length',
          'splat set, 0.1 to 2.5 GB typical scene plus LoD pool',
        ],
        [
          'Single-GPU fit',
          '24 GB class, easy',
          '24 GB class, easy',
          'H100 80 GB for 14B with offloading; 2B fits far smaller cards',
          'any rasterizer GPU; very large scenes need LoD or offload',
        ],
        [
          'Unit of work',
          '1 token',
          '1 latent step',
          '1 clip x N denoise steps',
          '1 camera view',
        ],
        [
          'Sequence tokens in that unit',
          '1',
          '256 patch tokens per frame (16 x 16 map) plus action and pose tokens',
          'tens of thousands of latent tokens per clip',
          '0 transformer tokens',
        ],
        [
          'Parallel multiplier',
          'batching shares weights',
          'CEM samples, 10^2 to 10^3 (the paper uses 800)',
          '4 to 50 denoise steps',
          '1 raster pass',
        ],
        [
          'Latency to useful output',
          '10 to 50 ms per token',
          'about 16 s per planned action (800 samples x 10 refinements)',
          'Predict2: about 26 s (2B, GB200) to over 30 min (14B, DGX Spark) per 480p, 16 fps clip; Predict1 14B: about 10 min per 5 s clip on one H100',
          'under 30 ms per frame',
        ],
        [
          'Approx. FLOP per unit vs 8B token',
          '1x',
          '~10^2 to 10^3x per planned action',
          '~10^5 to 10^6x per frame',
          'near 0 transformer FLOP',
        ],
        [
          'Bottleneck',
          'weight bandwidth',
          'batched predictor GEMMs',
          'denoise FLOPs plus KV traffic',
          'splat sorting and fill rate',
        ],
        [
          'Scaling with horizon',
          'KV grows linearly with context',
          'context grows with each predicted step; the paper plans one step ahead',
          'linear in tokens times steps',
          'free; the asset already exists',
        ],
        [
          'Scaling with batch',
          'linear KV, then compute-bound',
          'batched CEM is the intended mode',
          'usually batch 1 per clip',
          'extra cameras render nearly free',
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
