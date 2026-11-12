/**
 * Source-backed inputs for the three world-model figures owed by VAL-OPUS-073.
 * Sources were read on 2026-11-02.
 * The loop and ladder are authored explanatory arrangements, not measurements
 * or a published universal evaluation standard.
 */
export const MODEL_BASED_LOOP_SOURCES = ['tdmpc2-2023'] as const;
export const MODEL_BASED_LOOP = [
  { id: 'encode', label: 'Encode', detail: ['represent', 'what is seen'], x: 52, y: 58 },
  { id: 'predict', label: 'Predict', detail: ['try actions', 'in the model'], x: 170, y: 58 },
  { id: 'score', label: 'Score', detail: ['compare', 'future rewards'], x: 288, y: 58 },
  { id: 'act', label: 'Act', detail: ['execute the', 'first action'], x: 288, y: 184 },
  { id: 'observe', label: 'Observe', detail: ['record what', 'really happened'], x: 170, y: 184 },
  { id: 'update', label: 'Update', detail: ['learn from', 'past outcomes'], x: 52, y: 184 },
] as const;
export const MODEL_BASED_LOOP_DESCRIPTION =
  'An original schematic with 6 steps for an online model-based learner: encode the observation, predict futures under candidate actions, score their returns, act on the first action, observe the real outcome, and update the model from recorded transitions. TD-MPC2 alternates model learning from replay data with collecting new experience by planning. The diagram compresses those alternating processes into one loop; an update need not follow every individual action.';

export const EVALUATION_LADDER_SOURCES = [
  'worldeval-2025', 'worldmodelbench-2025', 'worldgym-2025', 'simfoundry-2026', 'vjepa2-2025',
] as const;
export const EVALUATION_RUNGS = [
  { id: 'action-sensitivity', label: 'Action response', question: 'Do different actions change the prediction?', y: 24 },
  { id: 'consistency', label: 'Physical consistency', question: 'Do objects and motion stay plausible?', y: 70 },
  { id: 'task-progress', label: 'Progress scoring', question: 'Does the score match real task progress?', y: 116 },
  { id: 'policy-ranking', label: 'Policy ranking', question: 'Do policies rank as they do in real trials?', y: 162 },
  { id: 'closed-loop-use', label: 'Real use', question: 'Does using the model help the real robot?', y: 252 },
] as const;
export const SIMFOUNDRY_EVALUATION = { pearson: 0.911, mmrv: 0.018, tasks: 7, architectures: 5 } as const;
export const EVALUATION_LADDER_DESCRIPTION =
  'Five separate evaluation questions: action response, physical consistency, progress scoring, policy ranking and real use. The fourth rung includes a physics-simulation reference: SimFoundry reports mean Pearson correlation 0.911 and mean maximum rank violation 0.018 between simulated and real policy results across 7 tasks and 5 policy architectures. These are correlation and ranking measures, not success percentages; the fifth rung still needs a downstream robot experiment.';

export interface WorldModelOutputTime {
  id: string;
  label: string;
  output: string;
  hardware: string;
  seconds: number;
  displayedTime: string;
  kind: 'reported' | 'upper-bound' | 'derived';
  citationId: string;
  note: string;
}

export const WORLD_MODEL_OUTPUT_TIMES: readonly WorldModelOutputTime[] = [
  {
    id: '3dgs', label: '3DGS', output: 'rendered frame', hardware: 'A6000',
    seconds: 0.01, displayedTime: 'under 0.01 second', kind: 'upper-bound', citationId: '3dgs-2023',
    note: 'Fully trained scenes averaged 134 to 154 frames per second across three real-world test sets on an A6000, about 7 milliseconds per frame, so the mark sits at the axis floor and points left. This renders a captured scene and predicts no action dynamics.',
  },
  {
    id: 'dreamzero', label: 'DreamZero-Flash', output: 'action chunk', hardware: 'Two GB200 GPUs',
    seconds: 0.15, displayedTime: 'about 0.15 second', kind: 'reported', citationId: 'dreamzero-2026',
    note: 'Section 3.2.6 reports 150 ms after optimization; section 6 names 2 GB200s for roughly 7 Hz control. One chunk contains 48 commands at 30 Hz, so this is inference latency, not the low-level command period.',
  },
  {
    id: '1xwm', label: '1XWM', output: 'five-second action rollout', hardware: 'multiple GPUs; model not disclosed',
    seconds: 12, displayedTime: '12 seconds', kind: 'derived', citationId: '1x-world-model-2026',
    note: 'The maker reports 11 seconds to generate 5 seconds of video, followed by 1 second for the inverse dynamics model to extract actions: 11 + 1 = 12 seconds. GPU model and count are not disclosed.',
  },
  {
    id: 'vjepa2', label: 'V-JEPA 2-AC', output: 'planned action', hardware: '1 RTX 4090',
    seconds: 16, displayedTime: '16 seconds', kind: 'reported', citationId: 'vjepa2-2025',
    note: 'Table 3: 800 samples, 10 refinement iterations and a one-step horizon on one RTX 4090. This is a complete cross-entropy planning call, not one model forward pass.',
  },
  {
    id: 'predict2', label: 'Cosmos Predict2 14B', output: 'generated clip', hardware: 'GB200',
    seconds: 85.26, displayedTime: '85.26 seconds', kind: 'reported', citationId: 'cosmos-predict2-perf-2025',
    note: "NVIDIA's archived Predict2 repository reports 85.26 seconds for 14B Video2World, at 480p and 16 frames per second, on a GB200. This is clip generation, not the Cosmos planning baseline.",
  },
  {
    id: 'cosmos-planner', label: 'Cosmos planner', output: 'planned action', hardware: '1 RTX 4090',
    seconds: 240, displayedTime: '4 minutes', kind: 'reported', citationId: 'vjepa2-2025',
    note: 'V-JEPA 2 Table 3: the fine-tuned Cosmos Predict1 7B baseline takes 4 minutes per action with 80 samples, 10 iterations and a one-step horizon on one RTX 4090.',
  },
];
export const WORLD_MODEL_OUTPUT_SOURCES = [...new Set(WORLD_MODEL_OUTPUT_TIMES.map(row => row.citationId))];
export const WORLD_MODEL_OUTPUT_DESCRIPTION =
  "Time to each system's stated output on a logarithmic axis: 3D Gaussian Splatting under 0.01 second, about 7 milliseconds, per rendered frame on an A6000; DreamZero-Flash about 0.15 second per action chunk on 2 GB200s; 1XWM 12 seconds to generate a five-second action rollout on multiple GPUs whose model is not disclosed; V-JEPA 2-AC 16 seconds per planned action on one RTX 4090; Cosmos Predict2 14B 85.26 seconds per generated clip on a GB200; and the Cosmos planning baseline 4 minutes per planned action on one RTX 4090. The workloads and hardware differ, so this is not a common speed benchmark.";

/** Logarithmic coordinate in the shared 340-wide stage; no zero is plotted. */
export function outputTimeX(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Output time must be a positive finite number');
  return 12 + (Math.log10(seconds) + 2) / (Math.log10(300) + 2) * 316;
}
