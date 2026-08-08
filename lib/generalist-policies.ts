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
 *   press: press release only, vendor-reported, no technical documentation
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
  openWeights: boolean;
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
    openWeights: false,
    provenance: 'blog',
    capability:
      'System 1 / System 2 split: a VLM reasons slowly and emits latent goals; a fast visuomotor transformer turns pixels into upper-body joint targets.',
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
      'Gemini 2.0-based VLA plus Gemini Robotics-ER, an embodied-reasoning model for spatial understanding, pointing, and grasp proposal.',
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
      'Open humanoid foundation model: a VLM backbone with a flow-matching DiT action head, coupled by cross-attention.',
    citationId: 'gr00t-n1-2025',
  },
  {
    id: 'agibot-go1',
    name: 'AgiBot GO-1',
    org: 'AgiBot',
    released: '2025-03',
    dateLabel: 'Mar 2025',
    openWeights: true,
    provenance: 'paper',
    capability:
      'ViLLA: latent action tokens inferred from unlabeled video let human and robot video supervise control.',
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
    dateLabel: 'Oct 2025',
    openWeights: false,
    provenance: 'paper',
    capability:
      'Motion Transfer across embodiments and interleaved language thinking before acting; ER 1.5 orchestrates with a tunable thinking budget.',
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
    openWeights: false,
    provenance: 'blog',
    capability:
      'Adds S0: a 10M-parameter learned whole-body controller at 1 kHz trained on 1,000+ hours of retargeted human motion.',
    citationId: 'helix-02-2026',
  },
  {
    id: 'skild-brain',
    name: 'Skild Brain',
    org: 'Skild AI',
    released: '2026-01',
    dateLabel: 'Jan 2026',
    openWeights: false,
    provenance: 'press',
    capability:
      'An "omni-bodied" brain claim publicized alongside a $1.4B Series C; no paper, no weights, no benchmark results.',
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
      'Cosmos-Reason2-2B backbone and a shared relative-EEF action space that admits 20K hours of egocentric human video.',
    citationId: 'isaac-gr00t-repo-2026',
  },
  {
    id: 'agibot-go2',
    name: 'AgiBot GO-2',
    org: 'AgiBot',
    released: '2026-04',
    dateLabel: 'Apr 2026',
    openWeights: false,
    provenance: 'press',
    capability:
      'Action chain-of-thought: a low-frequency planner emits action intents and a high-frequency follower refines them.',
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
    openWeights: false,
    provenance: 'blog',
    capability:
      'Whole-body humanoid control feet-to-fingertips with 22-DoF hands; one checkpoint across three embodiment pairs.',
    citationId: 'gemini-robotics-2-2026',
  },
];

export type OpenFilter = 'all' | 'open' | 'closed';

export function filterReleases(filter: OpenFilter): GeneralistRelease[] {
  if (filter === 'all') return [...GENERALIST_RELEASES];
  return GENERALIST_RELEASES.filter((r) =>
    filter === 'open' ? r.openWeights : !r.openWeights,
  );
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
