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
          'Relative tool motion (Cartesian deltas)',
          'Inverse kinematics, frames and singularities',
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
          'Embodiment-specific action targets or chunks',
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
          'World action model',
          'Video prediction tied to actions',
          'Future video and an action chunk together',
          'New tasks from few or no demonstrations on the target robot',
          'Model size and real-time speed',
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
          'Where the motion comes from',
          'equations and measured parameters',
          'recorded examples of what happened next',
        ],
        [
          'Actions never tried before',
          'broad, wherever the modeled mechanics hold',
          'reliable mainly close to the training data',
        ],
        [
          'What a program can read',
          'exact positions, forces and contacts',
          'a compressed internal state or generated images',
        ],
        [
          'Debugging',
          'inspect parameters and constraints',
          'only indirectly, by probing errors and sensitivity',
        ],
        [
          'Appearance',
          'hand-built 3D models and renderers',
          'learned from images or video',
        ],
        [
          'Adapting to a new robot or scene',
          'measure new parameters or edit the model',
          'fine-tune on new recordings',
        ],
        [
          'Typical failure',
          'wrong assumptions or parameters',
          'predictions that ignore the action, drift or show things that are not there',
        ],
        [
          'Computing pattern',
          'many small, cheap time steps',
          'large neural network calls',
        ],
      ]}
      className={className}
    />
  );
}

export function WorldModelCostTable({ className }: { className?: string }) {
  return (
    <TextTable
      ariaLabel="What a text model and three kinds of world model cost to run"
      columns={[
        'What is compared',
        'Text model, 8 billion parameters (Llama 3 8B)',
        'Latent world model (V-JEPA 2-AC)',
        'Video world model (Cosmos Predict)',
        'Captured 3D scene (Gaussian splatting)',
      ]}
      rows={[
        [
          'Memory for the model',
          'About 16 GB at 16 bits per weight (8 billion weights at 2 bytes each), about 5 GB at 4 bits per weight; both are estimates',
          'About 2.6 GB at 16 bits per weight, an estimate from the stated 1 billion encoder and 0.3 billion predictor parameters',
          '32.5 to 56.4 GB of graphics memory for Predict2 Video2World (2 to 14 billion parameters); the Predict1 14B model card lists over 80 GB with its prompt-rewriting model moved off the GPU',
          'None: the scene is stored data, not a trained network',
        ],
        [
          'Memory used while running',
          'A cache of everything read so far, about 128 KB per token, or word piece (estimate from 32 layers and 8 key-value heads of 128 numbers each)',
          'Image features, actions and arm poses from the current and earlier steps',
          'Compressed video plus a cache of earlier frames, growing with clip length',
          'The splats themselves: 0.3 to 0.7 GB per scene on average across the test datasets',
        ],
        [
          'Fits on one graphics card',
          'Yes, a 24 GB card holds the 16 GB of 16-bit weights (estimate)',
          'Yes, easily, on a 24 GB card',
          'The 14B model needs 56.38 GB, so it fits an 80 GB H100; the 2B model needs 32.54 GB, and NVIDIA recommends at least 32 GB',
          'Yes, on any card that can draw the splats; memory grows with the number of splats',
        ],
        [
          'One unit of work',
          'One token',
          'One predicted step',
          'One video clip, cleaned of noise over several passes',
          'One camera view',
        ],
        [
          'Tokens processed per unit',
          'One',
          '256 image patches per frame (a 16 by 16 grid) plus action and pose tokens',
          'Grows with clip length and resolution and shrinks with compression: the paper compresses time 4 to 8 times and each image side 8 to 16 times',
          'None; no neural network runs',
        ],
        [
          'Copies run side by side',
          'Many requests can share one copy of the weights',
          '100 to 1,000 candidate actions scored at once (the paper uses 800)',
          'One clip at a time; the cited sources do not state the number of noise-removal passes',
          'One drawing pass',
        ],
        [
          'Time to a usable result',
          'Limited by how fast the weights can be read from memory for each token (estimate; no benchmark cited)',
          'About 16 s per planned action (800 candidates, refined 10 times)',
          'Predict2: about 26 s (2B on a GB200) to over 30 min (14B on a DGX Spark) per 480p clip at 16 frames per second; Predict1 14B: about 10 min per 5 s clip on one H100 with parts of the model moved off the GPU',
          'About 7 ms per frame (134 to 154 frames per second on average, on an A6000)',
        ],
        // Order-of-magnitude estimate by the lead editor, not a measurement.
        // 8B decode token: 2 x 8e9 = 1.6e10 FLOP. V-JEPA 2-AC (vjepa2-2025):
        // a 300M, 24-layer, 1024-wide predictor reads one step of 256 patch
        // tokens (16 x 16 feature map) plus an action and a pose token, so a
        // pass is 2 x 3e8 x 258 = 1.6e11 FLOP (attention and projections add
        // about 5%), about 10x a token. Planning at horizon 1 runs 800 samples
        // x 10 refinements = 8,000 passes, 1.3e15 FLOP per planned action,
        // about 1e5 times a token. At 16 s on one RTX 4090 that is about
        // 80 TFLOP/s sustained, which is plausible.
        [
          'Arithmetic per unit, compared with one text token (estimate)',
          'One times (the baseline)',
          'About 10 times per predicted step; about 100,000 times per planned action',
          'About 100,000 to 1,000,000 times per frame',
          'Almost none; no neural network runs',
        ],
        [
          'What limits speed',
          'Reading the weights from memory',
          'The predictor\'s arithmetic, run in large batches',
          'Arithmetic for every noise-removal pass, plus moving the cache',
          'Sorting the splats and filling pixels',
        ],
        [
          'Looking further ahead',
          'The cache grows in step with the text so far',
          'Context grows with each predicted step; the paper plans one step ahead',
          'Cost grows with tokens times noise-removal passes',
          'No extra cost; the scene already exists',
        ],
        [
          'Running many at once',
          'The cache grows with each request until arithmetic becomes the limit',
          'Built to score many candidates at once',
          'Usually one clip at a time',
          'Extra camera views cost little',
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
