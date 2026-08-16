/**
 * Model logic for the Knowledge Insulation interactive: a layer-by-layer
 * Mixture-of-Transformers view of a pi0-style VLA (VLM backbone plus a
 * flow-matching action expert) with a toggleable stop-gradient at the
 * interface between them.
 *
 * Sources (research/01-learned-manipulation-lineage.md, "Knowledge
 * Insulation (2025)"):
 * - VLM backbone (3B) + action expert (300M); the expert attends into
 *   backbone activations in the forward pass; the backward pass is severed
 *   at the boundary (arXiv:2505.23705).
 * - The backbone is supervised by discrete FAST action tokens via
 *   cross-entropy, matching its pretraining objective (arXiv:2501.09747).
 * - Symptom of uninsulated joint training: the model stops attending to
 *   language (the spoon/trash example in the paper).
 * - 7.5x fewer training steps to a given bussing-task performance level
 *   versus pi0.
 *
 * Data honesty: the rendered layer count (8) and the 0-100 language
 * score are illustrative models of a qualitative finding, not published
 * measurements. The sourced figures are the parameter counts and the 7.5x
 * training-step ratio, which the UI labels separately.
 */

/** Layers drawn per stack. The real models use more; 8 keeps the diagram legible. */
export const LAYER_COUNT = 8;

/** Peak of the illustrative language-following score (backbone intact). */
export const LANGUAGE_SCORE_MAX = 92;
/**
 * Floor of the illustrative language-following score once uninsulated
 * gradients have penetrated the whole backbone.
 */
export const LANGUAGE_SCORE_MIN = 34;

/** pi0.5 + Knowledge Insulation reaches a given bussing-task performance in this many fewer training steps than pi0. */
export const TRAINING_STEP_SPEEDUP = 7.5;

export type Pass = 'forward' | 'backward';

export interface LayerState {
  /** 0 is the bottom layer (closest to the inputs). */
  index: number;
  /** Tokens (forward) or gradients (backward) have reached this layer. */
  reached: boolean;
  /** Forward: activations present. Backward: gradients flowing through. */
  backboneActive: boolean;
  expertActive: boolean;
  /** Forward pass only: the expert attends into backbone activations here. */
  sidewaysAttention: boolean;
  /** Backward pass without insulation: the expert gradient crosses into the backbone here. */
  gradientCrosses: boolean;
}

function clampStep(step: number): number {
  return Math.min(LAYER_COUNT, Math.max(0, Math.round(step)));
}

/**
 * Per-layer flow state for a given pass, insulation setting, and depth.
 * Forward runs bottom-up (tokens); backward runs top-down (gradients).
 */
export function layerStates(
  pass: Pass,
  stopGradient: boolean,
  step: number,
): LayerState[] {
  const s = clampStep(step);
  return Array.from({ length: LAYER_COUNT }, (_, index) => {
    const reached = pass === 'forward' ? index < s : index >= LAYER_COUNT - s;
    if (pass === 'forward') {
      return {
        index,
        reached,
        backboneActive: reached,
        expertActive: reached,
        sidewaysAttention: reached,
        gradientCrosses: false,
      };
    }
    const crosses = reached && !stopGradient;
    return {
      index,
      reached,
      backboneActive: crosses,
      expertActive: reached,
      sidewaysAttention: false,
      gradientCrosses: crosses,
    };
  });
}

/**
 * Illustrative language-following score (0-100). The forward pass and the
 * insulated backward pass leave the backbone untouched, so the score holds
 * at its peak. Without the stop-gradient, each layer the expert gradient
 * penetrates degrades the backbone's language processing further, matching
 * the paper's qualitative finding (the robot stops attending to the
 * instruction) rather than any published numeric curve.
 */
export function languageScore(
  pass: Pass,
  stopGradient: boolean,
  step: number,
): number {
  if (pass === 'forward' || stopGradient) return LANGUAGE_SCORE_MAX;
  const s = clampStep(step);
  return Math.round(
    LANGUAGE_SCORE_MAX -
      ((LANGUAGE_SCORE_MAX - LANGUAGE_SCORE_MIN) * s) / LAYER_COUNT,
  );
}

/** The stop-gradient barrier is drawn only in the insulated backward view. */
export function gradientBarrier(pass: Pass, stopGradient: boolean): boolean {
  return pass === 'backward' && stopGradient;
}

export type BackboneSupervision =
  'none' | 'fast-cross-entropy' | 'expert-gradient';

/**
 * What supervises the backbone in the current view. In the insulated
 * backward pass the only gradient reaching the backbone is the FAST-token
 * cross-entropy loss; without insulation the expert's flow-matching
 * gradient flows straight through.
 */
export function backboneSupervision(
  pass: Pass,
  stopGradient: boolean,
): BackboneSupervision {
  if (pass === 'forward') return 'none';
  return stopGradient ? 'fast-cross-entropy' : 'expert-gradient';
}
