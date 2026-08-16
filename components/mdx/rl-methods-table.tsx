'use client';

import type { ReactNode } from 'react';
import { Badge, Table, type Column } from '@/components/ui';

/**
 * The six-method RL fine-tuning table embedded in the rl-finetuning module.
 *
 * Every number comes from the cited primary source (see the module's Cite
 * chips and data/citations.ts): DPPO, ConRFT, pi_RL, HIL-SERL, PLD, and the
 * Recap / pi*0.6 lab report. Vendor-reported results (Recap) are flagged in
 * the evidence column; the rest are preprints or peer-reviewed papers.
 * Undisclosed openness renders as "not disclosed" (dim), never guessed.
 *
 * 'use client' because the Table columns carry render functions, which
 * cannot cross the RSC boundary from the compiled MDX page.
 */
type EvidenceClass = 'peer-reviewed' | 'preprint' | 'vendor-reported';

type MethodRow = {
  method: string;
  year: number;
  mechanism: string;
  result: string;
  evidence: EvidenceClass;
  /** true: code or weights released; false: closed; null: not disclosed. */
  open: boolean | null;
};

const ROWS: MethodRow[] = [
  {
    method: 'DPPO',
    year: 2024,
    mechanism:
      'PPO over a two-layer MDP: the denoising chain is one layer, the environment the other',
    result:
      "Strongest overall fine-tuning performance and efficiency for diffusion policies across the paper's benchmarks",
    evidence: 'preprint',
    open: true,
  },
  {
    method: 'ConRFT',
    year: 2025,
    mechanism:
      'Consistency policy collapses the denoising chain to few steps; offline BC + Q-learning, then online RL with human interventions',
    result:
      '96.3% average success on 8 real-world tasks after 45-90 min of online fine-tuning',
    evidence: 'preprint',
    open: true,
  },
  {
    method: 'Recap (pi*0.6)',
    year: 2025,
    mechanism:
      'Value function predicts steps-to-completion; advantage is binarized and fed back as a conditioning token. No policy gradient',
    result:
      'Espresso throughput and success both more than doubled; over 90% success on all three reported applications',
    evidence: 'vendor-reported',
    open: false,
  },
  {
    method: 'pi_RL',
    year: 2026,
    mechanism:
      'Flow-Noise (learnable noise net, exact log-likelihood) and Flow-SDE (ODE-to-SDE conversion, two-layer MDP)',
    result:
      'Significant gains over SFT in- and out-of-distribution on flow-based VLAs (pi0 class), simulation benchmarks',
    evidence: 'preprint',
    open: null,
  },
  {
    method: 'Residual RL (PLD)',
    year: 2026,
    mechanism:
      'Freeze the generalist; small residual actors probe its failures, then the residual-generated successes are distilled back',
    result:
      "99% on LIBERO, over 50% gains on SimplerEnv, 100% on the paper's real Franka and YAM tasks",
    evidence: 'peer-reviewed',
    open: null,
  },
  {
    method: 'HIL-SERL',
    year: 2024,
    mechanism:
      'Sample-efficient off-policy RL with demonstrations in the replay buffer, plus human takeovers during failures',
    result:
      'Near-perfect success within 1-2.5 h of real-world training; average 2x success and 1.8x faster execution than imitation baselines',
    evidence: 'preprint',
    open: true,
  },
];

const EVIDENCE_BADGE: Record<EvidenceClass, ReactNode> = {
  'peer-reviewed': <Badge variant="ok">peer-reviewed</Badge>,
  preprint: <Badge>preprint</Badge>,
  'vendor-reported': <Badge variant="warn">vendor-reported</Badge>,
};

const COLUMNS: Column<MethodRow>[] = [
  { key: 'method', header: 'Method', sortable: true },
  { key: 'year', header: 'Year', sortable: true, numeric: true },
  { key: 'mechanism', header: 'Mechanism' },
  { key: 'result', header: 'Headline result' },
  {
    key: 'evidence',
    header: 'Evidence',
    sortable: true,
    render: (row) => EVIDENCE_BADGE[row.evidence],
  },
  {
    key: 'open',
    header: 'Openness',
    render: (row) =>
      row.open === null ? (
        <span className="text-text-dim">not disclosed</span>
      ) : row.open ? (
        <Badge variant="ok">code</Badge>
      ) : (
        <Badge>closed</Badge>
      ),
    sortValue: (row) =>
      row.open === null ? null : row.open ? 'code' : 'closed',
  },
];

export function RlMethodsTable({ className }: { className?: string }) {
  return (
    <Table
      className={className}
      caption="The six RL fine-tuning recipes covered in this module, with the headline result as reported by each source. Vendor-reported results (Recap) come from the lab's own report and are flagged as such; the rest are preprints or peer-reviewed papers. Openness marks released code or weights; not disclosed means the source does not say."
      columns={COLUMNS}
      rows={ROWS}
      initialSort={{ key: 'year', direction: 'asc' }}
    />
  );
}
