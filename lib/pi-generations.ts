/**
 * Structured data for the Physical Intelligence generation timeline, from
 * research/01-learned-manipulation-lineage.md. Unit-tested in
 * tests/unit/pi-generations.test.ts.
 *
 * Release months come from the primary sources (arXiv submission months,
 * the dated pi0.6 model card, the MEM and pi0.7 PDFs). Where only a month
 * is verifiable, `released` stays month-precision; no invented days.
 */

export interface PiGeneration {
  /** Stable id, also used as the component's selection state. */
  id: string;
  /** Display name (pi0 renders as π0). */
  name: string;
  /** Release date, YYYY-MM (month precision: no invented days). */
  released: string;
  /** Human-readable release date for labels. */
  dateLabel: string;
  /** Whether weights are downloadable (openpi on GitHub). */
  openWeights: boolean;
  /** Backbone + action expert, one line. */
  backbone: string;
  /** The generation's one-line contribution. */
  contribution: string;
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
      'Flow-matching action expert grafted onto a pretrained VLM; 50-step action chunks at 50 Hz.',
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
    citationId: 'pi05-2025',
  },
  {
    id: 'pi06',
    name: 'π0.6',
    released: '2025-11',
    dateLabel: 'Nov 2025',
    openWeights: false,
    backbone: 'Gemma3 4B + SigLIP 400M + 860M expert',
    contribution:
      'Knowledge Insulation at scale; laundry folding and box assembly without task-specific fine-tuning.',
    citationId: 'pi06-model-card-2025',
  },
  {
    id: 'pistar06',
    name: 'π*0.6',
    released: '2025-11',
    dateLabel: 'Nov 2025',
    openWeights: false,
    backbone: 'π0.6 + advantage-conditioned Recap',
    contribution:
      'RL from demonstrations, coaching, and practice; espresso throughput more than doubled.',
    citationId: 'pistar06-2025',
  },
  {
    id: 'pi06-mem',
    name: 'π0.6-MEM',
    released: '2026-03',
    dateLabel: 'Mar 2026',
    openWeights: false,
    backbone: 'π0.6 + two-scale memory',
    contribution:
      'Short-term video history plus long-term model-authored notes; 15-minute tasks.',
    citationId: 'mem-2026',
  },
  {
    id: 'pi07',
    name: 'π0.7',
    released: '2026-04',
    dateLabel: 'Apr 2026',
    openWeights: false,
    backbone: 'Gemma3 4B + 860M expert',
    contribution:
      'Diverse multimodal prompting (metadata, control mode, generated subgoals); compositional generalization.',
    citationId: 'pi07-2026',
  },
];

/** The newest generation with downloadable weights: π0.5. */
export function openWeightsFrontier(): PiGeneration {
  const open = PI_GENERATIONS.filter((g) => g.openWeights);
  return open[open.length - 1];
}

/** Closed generations released after the open-weights frontier. */
export function generationsBehind(): number {
  const frontier = openWeightsFrontier();
  return PI_GENERATIONS.filter(
    (g) => !g.openWeights && g.released > frontier.released,
  ).length;
}
