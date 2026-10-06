/**
 * Structured data for the Physical Intelligence generation timeline.
 * Tests: tests/unit/pi-generations.test.ts.
 *
 * Dated entries use source publication months, not checkpoint release dates.
 * The retained MEM report does not establish its publication month: null is
 * deliberately unplotted. Weight availability is bounded to the inspected
 * openpi README at 215abfb217dbac7d5f1273282331b9b1866c0479. Non-listing is
 * not evidence of closed licensing or unavailable weights.
 */

export interface PiGeneration {
  /** Stable id, also used as the component's selection state. */
  id: string;
  /** Display name (pi0 renders as π0). */
  name: string;
  /** Source publication month, YYYY-MM, or null when not established. */
  released: string | null;
  /** Human-readable release date for labels. */
  dateLabel: string;
  /** Downloadable checkpoint established by the pinned catalogue; null is unknown. */
  openWeights: boolean | null;
  /** Backbone + action expert, one line. */
  backbone: string;
  /** The generation's one-line contribution. */
  contribution: string;
  /** The contribution restated in plain words for the figure's main view. */
  plain: string;
  /** Citation registry id (data/citations.ts) backing this entry. */
  citationId: string;
}

export const PI_GENERATIONS: readonly PiGeneration[] = [
  {
    id: 'pi0',
    name: 'π0',
    released: '2024-10',
    dateLabel: 'Oct 2024',
    openWeights: true,
    backbone: 'PaliGemma 3B + 300M action expert',
    contribution:
      'Flow-matching action expert grafted onto a pretrained VLM; 50-step action chunks, at up to 50 Hz.',
    plain:
      'The first model in the family: it adds a part that turns what a picture-and-language model understands into smooth arm motion.',
    citationId: 'pi0-2024',
  },
  {
    id: 'pi0-fast',
    name: 'π0-FAST',
    released: '2025-01',
    dateLabel: 'Jan 2025',
    openWeights: true,
    backbone: 'PaliGemma 3B, autoregressive',
    contribution:
      'DCT + BPE action tokenization (FAST); autoregressive VLAs become viable at 50 Hz.',
    plain:
      'Packs motion into compact word-like codes, so a model that writes one code at a time can be trained on fast, high-frequency motion.',
    citationId: 'pi0-fast-2025',
  },
  {
    id: 'pi05',
    name: 'π0.5',
    released: '2025-04',
    dateLabel: 'Apr 2025',
    openWeights: true,
    backbone: 'PaliGemma-class 3B + 300M expert',
    contribution:
      'Heterogeneous co-training buys open-world generalization in never-before-seen homes.',
    plain:
      'Trained on a broad mix of data, it can work in homes it has never seen before.',
    citationId: 'pi05-2025',
  },
  {
    id: 'pi06',
    name: 'π0.6',
    released: '2025-11',
    dateLabel: 'Nov 2025',
    openWeights: null,
    backbone: 'Gemma3 4B + SigLIP 400M + 860M expert',
    contribution:
      'Knowledge Insulation at scale; laundry folding and box assembly without task-specific fine-tuning.',
    plain:
      'Protects what the model knows about language while it learns to move; it folds laundry and assembles boxes without extra training for each task.',
    citationId: 'pi06-model-card-2025',
  },
  {
    id: 'pistar06',
    name: 'π*0.6',
    released: '2025-11',
    dateLabel: 'Nov 2025',
    openWeights: null,
    backbone: 'π0.6 + advantage-conditioned Recap',
    contribution:
      'RL from demonstrations, coaching, and practice; espresso throughput more than doubled.',
    plain:
      'Learns from demonstrations, coaching and its own practice; it more than doubled how many espressos it makes in a given time.',
    citationId: 'pistar06-2025',
  },
  {
    id: 'pi06-mem',
    name: 'π0.6-MEM',
    released: null,
    dateLabel: 'Date unverified',
    openWeights: null,
    backbone: 'π0.6 + two-scale memory',
    contribution:
      'Short-term video history plus long-term model-authored notes; 15-minute tasks.',
    plain:
      'Adds memory: recent video plus notes the model writes for itself, enough for tasks that take 15 minutes.',
    citationId: 'mem-2026',
  },
  {
    id: 'pi07',
    name: 'π0.7',
    released: '2026-04',
    dateLabel: 'Apr 2026',
    openWeights: null,
    backbone: 'Gemma3 4B + 860M expert',
    contribution:
      'Diverse multimodal prompting (metadata, control mode, generated subgoals); early signs of compositional generalization.',
    plain:
      'Takes richer instructions, such as task details, how to control the arm and generated in-between goals, and shows early signs of combining skills in new ways.',
    citationId: 'pi07-2026',
  },
];

/** Last listed generation with downloadable checkpoints in the pinned README. */
export function openWeightsFrontier(): PiGeneration {
  const open = PI_GENERATIONS.filter((g) => g.openWeights);
  return open[open.length - 1];
}

/** Model entries after the catalogue frontier, not a measured chronology gap. */
export function generationsBehind(): number {
  const frontier = openWeightsFrontier();
  const frontierIndex = PI_GENERATIONS.indexOf(frontier);
  return PI_GENERATIONS.filter(
    (g, index) => index > frontierIndex && g.openWeights !== true,
  ).length;
}
