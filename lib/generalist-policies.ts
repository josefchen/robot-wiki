/**
 * Structured data for the generalist-policies release timeline, from
 * research/01-learned-manipulation-lineage.md. Unit-tested in
 * tests/unit/generalist-policies.test.ts.
 *
 * Release months come from the primary sources (arXiv submission months,
 * dated lab blogs, press announcements). Where only a month is verifiable,
 * `released` stays month-precision; no invented days.
 *
 * Provenance tiers record how much independent scrutiny a release carries:
 *   paper: a public arXiv report with methods and experiments
 *   docs:  repository release notes (code and weights exist, prose is thin)
 *   blog:  a detailed lab blog, vendor-reported, no external replication
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
      'The N1 v2 paper describes a VLM with a cross-attention-conditioned flow-matching DiT action head and links a public GR00T-N1-2B checkpoint.',
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
      'March 2025 is the report date, not a checkpoint release date. The inspected v4 paper describes a ViLLA latent action model, VLM-conditioned latent planner, and low-level action expert, trained using human video without action labels and robot data.',
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
      'The open-weights frontier of the pi line: open-world generalization from heterogeneous co-training. Covered in The Pi Line.',
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
      'Knowledge Insulation at 5B scale; a dated model card, no arXiv paper. The pi line goes closed here.',
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
    id: 'gr00t-n17',
    name: 'GR00T N1.7',
    org: 'NVIDIA',
    released: '2026-04',
    dateLabel: 'Apr 2026',
    openWeights: true,
    provenance: 'docs',
    capability:
      'N1.7 README: Cosmos-Reason2-2B backbone, relative-EEF actions, and 20K hours of EgoScale human video in pretraining. Its license declarations require checkpoint-specific review.',
    citationId: 'isaac-gr00t-repo-2026',
  },
  {
    id: 'agibot-go2',
    name: 'AgiBot GO-2',
    org: 'AgiBot',
    released: '2026-04',
    dateLabel: 'Apr 2026 HTML date',
    openWeights: null,
    weightsNote: "Trained GO-2 weight availability and licensing are not established by the inspected announcement; no closed-weight conclusion is drawn.",
    provenance: 'press',
    capability:
      "AgiBot describes System 2 semantic planning and System 1 action following with relative, not numerical, frequencies; teacher forcing is used during training.",
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
