/**
 * Structured data for the generalist-policies release timeline. Unit-tested in
 * tests/unit/generalist-policies.test.ts.
 *
 * Release months come from the primary sources (arXiv submission months,
 * dated lab blogs, press announcements). Where only a month is verifiable,
 * `released` stays month-precision; no invented days.
 *
 * Provenance tiers record the source format selected for each timeline entry,
 * not a measure of independent scrutiny or an inventory of all available work:
 *   paper: a public arXiv report
 *   docs:  repository release notes
 *   blog:  a lab blog
 *   press: company announcement; technical disclosure varies by source
 */

export type ProvenanceTier = 'paper' | 'docs' | 'blog' | 'press';

export interface GeneralistRelease {
  /** Stable id, also used as the component's selection state. */
  id: string;
  /** Display name. */
  name: string;
  /** Lab or company behind the release. */
  org: string;
  /** Release date, YYYY-MM (month precision: no invented days). */
  released: string;
  /** Human-readable release date for labels. */
  dateLabel: string;
  /** Whether weights are downloadable. */
  openWeights: boolean | null;
  /** Source-scoped note required for an unknown availability value. */
  weightsNote?: string;
  /** How the release is documented. */
  provenance: ProvenanceTier;
  /** One-line capability annotation shown on selection. */
  capability: string;
  /** True for pi-line entries shown as cross-reference context. */
  context?: boolean;
  /** Citation registry id (data/citations.ts) backing this entry. */
  citationId: string;
}

export const GENERALIST_RELEASES: readonly GeneralistRelease[] = [
  {
    id: 'helix',
    name: 'Helix',
    org: 'Figure',
    released: '2025-02',
    dateLabel: 'Feb 2025',
    openWeights: null,
    weightsNote: "The February 20, 2025 announcement identifies an open-weight VLM backbone, not a download or license for the trained Helix policy.",
    provenance: 'blog',
    capability:
      'Figure reports S2 latent task representations and S1 control of wrist poses, fingers, torso and head orientation, plus task completion; S1 also consumes images and robot state.',
    citationId: 'helix-2025',
  },
  {
    id: 'gemini-robotics-1',
    name: 'Gemini Robotics 1.0',
    org: 'Google DeepMind',
    released: '2025-03',
    dateLabel: 'Mar 2025',
    openWeights: false,
    provenance: 'paper',
    capability:
      'March 2025 report: Gemini Robotics builds on Gemini Robotics-ER; the family extends Gemini 2.0 from embodied reasoning to robot actions.',
    citationId: 'gemini-robotics-2025',
  },
  {
    id: 'gr00t-n1',
    name: 'GR00T N1',
    org: 'NVIDIA',
    released: '2025-03',
    dateLabel: 'Mar 2025',
    openWeights: true,
    provenance: 'paper',
    capability:
      'The N1 paper pairs a vision-language model with a flow-matching action head and links a public 2-billion-parameter checkpoint.',
    citationId: 'gr00t-n1-2025',
  },
  {
    id: 'agibot-go1',
    name: 'AgiBot GO-1',
    org: 'AgiBot',
    released: '2025-03',
    dateLabel: 'Mar 2025 report',
    openWeights: true,
    provenance: 'paper',
    capability:
      'March 2025 is the report date, not the checkpoint release. GO-1 learns latent actions from consecutive video frames, so it trains on robot data and on human video without action labels.',
    citationId: 'agibot-world-2025',
  },
  {
    id: 'pi05-context',
    name: 'π0.5',
    org: 'Physical Intelligence',
    released: '2025-04',
    dateLabel: 'Apr 2025',
    openWeights: true,
    provenance: 'paper',
    capability:
      'The last downloadable model of the π line, which generalizes to new homes after co-training on varied data. Covered in The Pi Line.',
    context: true,
    citationId: 'pi05-2025',
  },
  {
    id: 'gemini-robotics-15',
    name: 'Gemini Robotics 1.5',
    org: 'Google DeepMind',
    released: '2025-10',
    dateLabel: 'Oct 2025 report',
    openWeights: null,
    weightsNote: "Weight downloads and licensing terms are not disclosed in the inspected v3 technical report; this is not a closed-license finding.",
    provenance: 'paper',
    capability:
      'Report first submitted October 2, 2025; this date does not establish the release date. Motion Transfer and interleaved thinking in the VLA; a separate ER 1.5 orchestrator with a variable thinking-token budget.',
    citationId: 'gemini-robotics-15-2025',
  },
  {
    id: 'pi06-context',
    name: 'π0.6',
    org: 'Physical Intelligence',
    released: '2025-11',
    dateLabel: 'Nov 2025',
    openWeights: false,
    provenance: 'blog',
    capability:
      'Knowledge insulation at 5B scale; a dated model card, no arXiv paper. The π line stops offering downloads here.',
    context: true,
    citationId: 'pi06-model-card-2025',
  },
  {
    id: 'helix-02',
    name: 'Helix 02',
    org: 'Figure',
    released: '2026-01',
    dateLabel: 'Jan 2026',
    openWeights: null,
    weightsNote: "Trained Helix 02 weight-release and licensing terms are not disclosed in the January 27, 2026 announcement.",
    provenance: 'blog',
    capability:
      "Figure reports S0, a 10M-parameter learned whole-body controller at 1 kHz, using over 1,000 hours of retargeted human motion and simulation training.",
    citationId: 'helix-02-2026',
  },
  {
    id: 'skild-brain',
    name: 'Skild Brain',
    org: 'Skild AI',
    released: '2026-01',
    dateLabel: 'Jan 2026 announcement',
    openWeights: null,
    weightsNote: "Weight-download and licensing terms are not disclosed in the January 14, 2026 Series C announcement.",
    provenance: 'press',
    capability:
      "January 14, 2026 Series C: $1.4 billion raised at over $14 billion valuation. Omni-bodied capability is a company assertion. The announcement describes four training-data sources, not a full runtime architecture.",
    citationId: 'skild-series-c-2026',
  },
  {
    id: 'gen-1',
    name: 'GEN-1',
    org: 'Generalist AI',
    released: '2026-04',
    dateLabel: 'Apr 2026',
    openWeights: null,
    weightsNote: 'The April 2, 2026 post gives no weight download or licensing terms.',
    provenance: 'blog',
    capability:
      'Trained from scratch on half a million hours of real-world data with no robot data in pretraining; Generalist reports 99% average success where earlier models reach 64%, with about 1 hour of robot data per task.',
    citationId: 'generalist-gen1-2026',
  },
  {
    id: 'gr00t-n17',
    name: 'GR00T N1.7',
    org: 'NVIDIA',
    released: '2026-04',
    dateLabel: 'Apr 2026',
    openWeights: true,
    provenance: 'docs',
    capability:
      'N1.7 README: a Cosmos-Reason2-2B backbone, actions written as relative hand motion, and 20K hours of EgoScale human video in pretraining. Code is Apache 2.0; weights carry the NVIDIA Open Model License.',
    citationId: 'isaac-gr00t-repo-2026',
  },
  {
    id: 'agibot-go2',
    name: 'AgiBot GO-2',
    org: 'AgiBot',
    released: '2026-04',
    dateLabel: 'Apr 2026 announcement',
    openWeights: null,
    weightsNote: "Trained GO-2 weight availability and licensing are not established by the inspected announcement; no closed-weight conclusion is drawn.",
    provenance: 'press',
    capability:
      "A slower System 2 writes structured action sequences and a faster System 1 follows them using live observations; AgiBot gives no numerical rates.",
    citationId: 'agibot-go2-2026',
  },
  {
    id: 'pi07-context',
    name: 'π0.7',
    org: 'Physical Intelligence',
    released: '2026-04',
    dateLabel: 'Apr 2026',
    openWeights: false,
    provenance: 'blog',
    capability:
      'Multimodal prompting with metadata, control modes, and generated subgoals; a lab PDF, no arXiv paper. Covered in The Pi Line.',
    context: true,
    citationId: 'pi07-2026',
  },
  {
    id: 'gemini-robotics-2',
    name: 'Gemini Robotics 2',
    org: 'Google DeepMind',
    released: '2026-07',
    dateLabel: 'Jul 2026',
    openWeights: null,
    weightsNote: "The July 30 announcement provides AI Studio/private-preview access for ER 2 and early-access partnerships for VLA/On-Device; weight downloads and licensing terms are not disclosed.",
    provenance: 'blog',
    capability:
      "July 30, 2026 announcement: VLA whole-body control; one checkpoint on Apollo 2 with SharpaWave, Apollo 2 with Inspire, and Franka Duo with Robotiq. Separate ER 2 and On-Device 2 roles.",
    citationId: 'gemini-robotics-2-2026',
  },
  {
    id: 'agibot-go3-preview',
    name: 'AgiBot GO-3 Preview',
    org: 'AgiBot',
    released: '2026-11',
    dateLabel: 'Nov 2026 press release',
    openWeights: false,
    weightsNote: 'AgiBot says GO-3 will be fully open-sourced by the end of 2026; no download is offered yet.',
    provenance: 'press',
    capability:
      'AgiBot says GO-3 Preview joins task understanding, future-state prediction and action generation in one architecture, WRAM, and ranks first on the RoboDojo, RoboTwin and RoboColiseum benchmarks.',
    citationId: 'agibot-go3-preview-2026',
  },
  {
    id: 'gr00t-2',
    name: 'GR00T 2',
    org: 'NVIDIA',
    released: '2026-11',
    dateLabel: 'Nov 2026',
    openWeights: null,
    weightsNote: 'The project page lists code as available in December; checkpoint downloads and license terms are not yet stated.',
    provenance: 'blog',
    capability:
      'A world action model: one diffusion transformer predicts future video and actions together. NVIDIA reports 40% zero-shot success on 50 tasks new to the target robot, and 95% after five demonstrations each.',
    citationId: 'gr00t-2-2026',
  },
  {
    id: 'gemini-robotics-2-5',
    name: 'Gemini Robotics 2.5',
    org: 'Google DeepMind',
    released: '2026-11',
    dateLabel: 'Nov 2026',
    openWeights: null,
    weightsNote: 'Rolling out to robotics partners from November 10, 2026; weight downloads and licensing terms are not disclosed.',
    provenance: 'blog',
    capability:
      'DeepMind reports 30% to 100% higher success than earlier baselines, depending on the task, and 96% success kitting parts with Apollo 2 humanoids on Mercedes-Benz lines.',
    citationId: 'gemini-robotics-2-5-2026',
  },
];

export type OpenFilter = 'all' | 'open' | 'closed' | 'undisclosed';

export function releaseWeightState(release: GeneralistRelease): Exclude<OpenFilter, 'all'> {
  return release.openWeights === null ? 'undisclosed' : release.openWeights ? 'open' : 'closed';
}

export function releaseWeightLabel(release: GeneralistRelease): string {
  return release.openWeights === null ? 'not disclosed' : release.openWeights ? 'downloadable' : 'not downloadable';
}

export function filterReleases(filter: OpenFilter): GeneralistRelease[] {
  if (filter === 'all') return [...GENERALIST_RELEASES];
  return GENERALIST_RELEASES.filter((release) => releaseWeightState(release) === filter);
}

/** Blog and press tiers are company communications with no external check. */
export function isVendorReported(release: GeneralistRelease): boolean {
  return release.provenance === 'blog' || release.provenance === 'press';
}

/** Short legend/readout label for a provenance tier. */
export function provenanceLabel(tier: ProvenanceTier): string {
  switch (tier) {
    case 'paper':
      return 'paper (arXiv)';
    case 'docs':
      return 'repo release notes';
    case 'blog':
      return 'lab blog, vendor-reported';
    case 'press':
      return 'press release, vendor-reported';
  }
}

/** Tiers in legend order, most to least scrutinized. */
export const PROVENANCE_TIERS: readonly ProvenanceTier[] = [
  'paper',
  'docs',
  'blog',
  'press',
];
