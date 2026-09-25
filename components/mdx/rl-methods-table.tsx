'use client';

import type { ReactNode } from 'react';
import { Badge, Table, type Column } from '@/components/ui';

/**
 * Eight RL fine-tuning rows; sourceIds and opennessNote bind each row to the
 * retained primary-source scope. Results use source-specific protocols.
 * Source publication type is not evidence of independent replication.
 * 'use client' is required because the Table columns carry render functions.
 */
type EvidenceClass = 'peer-reviewed' | 'preprint' | 'vendor-reported';

type MethodRow = {
  method: string;
  year: number;
  mechanism: string;
  result: string;
  evidence: EvidenceClass;
  /** true: the named source states a code release; null: source-scoped not disclosed. */
  open: boolean | null;
  /** Canonical source scope for this row, not inferred from available evidence. */
  sourceIds: readonly string[];
  opennessNote: string;
};

const ROWS: MethodRow[] = [
  {
    method: 'DPPO',
    year: 2024,
    mechanism:
      'PPO over Gaussian denoising transitions in a two-layer MDP; separate environment and denoising discounts; selected final denoising steps can be fine-tuned',
    result:
      'Paper-specific Robomimic comparisons; zero-shot One-leg hardware transfer: 16/20 trials at 10 Hz. Not a universal sample-efficiency or wall-clock winner',
    evidence: 'preprint',
    // Code is announced by the paper; weights, license and repository contents are not audited here.
    open: true,
    sourceIds: ["dppo-2024"],
    opennessNote: "DPPO v3 announces a website with code; repository contents, weights and license terms were not inspected.",
  },
  {
    method: 'ConRFT',
    year: 2025,
    mechanism:
      'Frozen Octo-small encoders/backbone; consistency action head with BC and Q objectives offline and online, plus human takeovers',
    result:
      'Table I: 96.3% mean on 8 Franka tasks, 20 trials/task; 15-90 min online (prose says 45-90); rounded 144% relative gain over offline Cal-ConRFT',
    evidence: 'preprint',
    // Code is announced by the paper; weights, license and repository contents are not audited here.
    open: true,
    sourceIds: ["conrft-2025"],
    opennessNote: "ConRFT v2 states that videos and code are available on its project site; weights and license terms are not established by the inspected paper.",
  },
  {
    method: 'Recap (pi*0.6)',
    year: 2025,
    mechanism:
      'Negative remaining-step values with a failure penalty; reward-inclusive advantage is thresholded into a conditioning token. Supervised-style extraction still trains the action expert',
    result:
      'Double-espresso throughput >2x versus offline RL + SFT; the paper’s 90%+ summary excludes diverse laundry, and its box chart reports subtask success',
    evidence: 'vendor-reported',
    open: null,
    sourceIds: ["pistar06-2025","pistar06-blog-2025","pi06-model-card-2025"],
    opennessNote: "Inspected Physical Intelligence report, companion blog and model card: checkpoint availability and model-specific license terms are not established. This is not a claim that the model is closed.",
  },
  {
    method: 'pi_RL',
    year: 2026,
    mechanism:
      'Online PPO: Flow-Noise uses learned Gaussian transition noise and joint denoising-path likelihood; Flow-SDE uses transition likelihoods in a two-layer MDP',
    result:
      'ID gains for pi0/pi0.5 across four simulation benchmarks; OOD gains do not consistently extend to unseen MetaWorld tasks. Separate Franka transfer test; paper-reported code release, not a weight/license claim',
    evidence: 'preprint',
    open: true,
    sourceIds: ["pi-rl-2026"],
    opennessNote: "The printed pi_RL v3 paper states a code release; a particular downloadable weight checkpoint and its license are not established.",
  },
  {
    method: 'Residual RL (PLD)',
    year: 2025,
    mechanism:
      'Frozen VLA prior, off-policy residual specialists, hybrid recovery-data collection, then SFT of the generalist',
    result:
      'OpenVLA-labelled model: 99.2% across 3 LIBERO suites, 50 trials/task; Octo: 96.6% across 4 Simpler tasks; Franka: 30/30 on each of 2 tasks; YAM: at least 1 h with recovery, not 100% one-shot success',
    evidence: 'preprint',
    open: null,
    sourceIds: ["pld-2026"],
    opennessNote: "The inspected PLD v1 preprint does not establish a PLD code or weight release; mentions of open-source code refer to baseline models, not PLD release terms.",
  },
  {
    method: 'HIL-SERL',
    year: 2024,
    mechanism:
      'RLPD with demonstration and online buffers plus human corrections; Jenga whipping uses demonstrations without online corrections',
    result:
      'Table 1a: 100% observed success (100 trials/task; IKEA whole assembly 10 trials); 1-2.5 h for nearly all tasks, 6 h for timing belt. Imitation comparison: 49.7% vs 100%, 9.6 s vs 5.4 s',
    evidence: 'preprint',
    open: true,
    sourceIds: ["hil-serl-2024"],
    opennessNote: "The retained HIL-SERL body points to accompanying videos and code; its body revision, repository contents, weights and license terms are not independently established here.",
  },
  {
    method: 'EXPO-FT',
    year: 2026,
    mechanism:
      'On-the-fly selection of the value-maximizing candidate between π0.5 action chunks and lightweight Gaussian edits, with human teleoperation corrections during online training',
    result:
      '30/30 successes on every evaluated task, average 19.1 minutes of online robot data (eight task variants); on the four-task comparison, baselines average 5.5-20.5/30',
    evidence: 'preprint',
    // The paper's abstract states an open-source codebase release;
    // repository contents, weights and license terms were not inspected.
    open: true,
    sourceIds: ["expo-ft-2026"],
    opennessNote: "The EXPO-FT paper states an open-source codebase release; repository contents, weights and license terms were not inspected.",
  },
  {
    method: 'DSRL',
    year: 2025,
    mechanism:
      'RL over a frozen diffusion policy\'s latent-noise space with black-box access to the base policy; base weights stay fixed',
    result:
      "19/30 average on EXPO-FT's four-task comparison; its own evaluation demonstrates real-world autonomous improvement of diffusion policies and pretrained generalists",
    evidence: 'preprint',
    open: null,
    sourceIds: ["dsrl-2025"],
    opennessNote: "The inspected DSRL abstract does not state a code or weight release.",
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
    render: (row) => (
      <div>
        {row.open === null ? (
          <span className="text-text-dim">not disclosed</span>
        ) : row.open ? (
          <Badge variant="ok">code</Badge>
        ) : (
          <Badge>closed</Badge>
        )}
        <span className="mt-1 block text-sm text-text-dim">{row.opennessNote}</span>
      </div>
    ),
    sortValue: (row) =>
      row.open === null ? null : row.open ? 'code' : 'closed',
  },
];

export function RlMethodsTable({ className }: { className?: string }) {
  return (
    <Table
      className={className}
      caption="Eight RL fine-tuning methods, with results reported by their own sources under different protocols, not a leaderboard. Evidence labels describe the inspected publication type, not independent replication. Code marks a source's code-release statement, not verified weights or licensing; not disclosed is limited to the named sources in that row."
      columns={COLUMNS}
      rows={ROWS}
      initialSort={{ key: 'year', direction: 'asc' }}
    />
  );
}
