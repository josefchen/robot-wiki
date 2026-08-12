/**
 * Dexterous-hand comparison data for the dexterity module.
 *
 * Row data lives here (not in the component) so the module's prose, the
 * comparison table, and the tests share one source, and so the unit suite
 * can assert that every row's sourceId resolves in the citation registry.
 *
 * Figures come from the cited sources; never invent a number. Specs the
 * maker has not disclosed are null and render as "not disclosed" (dim),
 * sorting last in both directions.
 */

export type TrainingBet =
  | 'vision-only'
  | 'vision-tactile'
  | 'tactile-rl'
  | 'research-platform'
  | 'undisclosed';

export type DexterousHand = {
  /** Stable row id, used for test selectors. */
  id: string;
  /** Hand and generation, e.g. "Optimus Gen 3". */
  name: string;
  /** Company behind the hand, e.g. "Tesla". */
  maker: string;
  /** Degrees of freedom as displayed, e.g. "22" or "10-12". */
  dofDisplay: string;
  /** Numeric sort key for DoF; ranges sort by their lower bound. */
  dofSort: number;
  /** Actuation approach, e.g. "Tendon-driven electric". */
  actuation: string;
  /** Tactile sensitivity as displayed; null when no figure is disclosed. */
  tactileDisplay: string | null;
  /** Minimum detectable force in mN; lower means more sensitive. */
  tactileSort: number | null;
  /** Price as displayed; null when no price is disclosed. */
  costDisplay: string | null;
  /** Numeric sort key for cost in USD-equivalent; ordering only. */
  costSort: number | null;
  /** How the maker bets dexterity will be learned. */
  bet: TrainingBet;
  /** One line: what this hand buys you and what it costs you. */
  tradeoff: string;
  /** Citation registry id backing the row. */
  sourceId: string;
  /** Short outlet label rendered as the source link text. */
  sourceLabel: string;
  /** Optional second source when one document cannot cover the row. */
  secondarySourceId?: string;
  secondarySourceLabel?: string;
  /** Currency of the figures, e.g. "Apr 2026". */
  asOf: string;
};

export const TRAINING_BET_LABEL: Record<TrainingBet, string> = {
  'vision-only': 'Vision-only',
  'vision-tactile': 'Vision + tactile',
  'tactile-rl': 'Tactile + RL',
  'research-platform': 'Research platform',
  undisclosed: 'Not disclosed',
};

export const DEXTEROUS_HANDS: DexterousHand[] = [
  {
    id: 'tesla-optimus-gen3',
    name: 'Optimus Gen 3',
    maker: 'Tesla',
    dofDisplay: '22',
    dofSort: 22,
    actuation: 'Tendon-driven electric, motors in the forearm',
    tactileDisplay: null,
    tactileSort: null,
    costDisplay: null,
    costSort: null,
    bet: 'vision-only',
    tradeoff:
      'Most degrees of freedom here and a mass-production plan behind it, but the tendon design is unproven: Musk says the first V3 hand "didn\'t actually work" and was redesigned.',
    sourceId: 'droids-optimus-v3-hand-2026',
    sourceLabel: 'DROIDS',
    secondarySourceId: 'holson-olympics-2025',
    secondarySourceLabel: 'General Robots',
    asOf: 'Apr 2026',
  },
  {
    id: 'figure-02-03',
    name: 'Figure 02/03',
    maker: 'Figure AI',
    dofDisplay: '16',
    dofSort: 16,
    actuation: 'Actuation not disclosed',
    tactileDisplay: '3 g (≈29 mN)',
    tactileSort: 29.4,
    costDisplay: null,
    costSort: null,
    bet: 'vision-tactile',
    tradeoff:
      'The most sensitive first-party fingertip spec here (3 g) plus palm cameras for in-hand vision; the 16 DoF figure is the Figure 02 hand, and Figure 03\'s count is not disclosed.',
    sourceId: 'helix-02-2026',
    sourceLabel: 'Figure AI',
    secondarySourceId: 'figure-02-2024',
    secondarySourceLabel: 'Figure 02 release',
    asOf: 'Jan 2026',
  },
  {
    id: 'sanctuary-phoenix',
    name: 'Phoenix hand',
    maker: 'Sanctuary AI',
    dofDisplay: '21',
    dofSort: 21,
    actuation: 'Hydraulic, miniaturized valves',
    tactileDisplay: '~5 mN',
    tactileSort: 5,
    costDisplay: null,
    costSort: null,
    bet: 'tactile-rl',
    tradeoff:
      'The most sensitive disclosed tactile spec here and a working in-hand RL demo, but hydraulics add maintenance burden and the company has pivoted to software.',
    sourceId: 'robozaps-phoenix-2026',
    sourceLabel: 'RoboZaps',
    secondarySourceId: 'sanctuary-inhand-2024',
    secondarySourceLabel: 'Sanctuary AI',
    asOf: 'Jul 2026',
  },
  {
    id: 'shadow-dexterous',
    name: 'Dexterous Hand',
    maker: 'Shadow Robot',
    dofDisplay: '20',
    dofSort: 20,
    actuation: 'Tendon-driven electric, 20 DC motors, 24 joints',
    tactileDisplay: null,
    tactileSort: null,
    costDisplay: '€110,000 (2022)',
    costSort: 110000,
    bet: 'research-platform',
    tradeoff:
      'The two-decade research benchmark: 100+ sensors at 1 kHz and tactile fingertips standard, but priced for labs at €110,000 with no published force-threshold figure.',
    sourceId: 'shadow-dexterous-hand-2026',
    sourceLabel: 'Shadow Robot',
    secondarySourceId: 'shadow-hand-cost-2022',
    secondarySourceLabel: 'Shadow cost blog',
    asOf: 'Dec 2022',
  },
  {
    id: 'unitree-h2',
    name: 'H2 (Dex5-1 option)',
    maker: 'Unitree',
    dofDisplay: '10-12',
    dofSort: 10,
    actuation: 'Electric',
    tactileDisplay: null,
    tactileSort: null,
    costDisplay: '$29,900 (whole robot)',
    costSort: 29900,
    bet: 'undisclosed',
    tradeoff:
      'An entire H2 costs less than a third of the Shadow hand, but the base robot ships with placeholder hands and the five-finger option is a paid add-on with unpublished specs.',
    sourceId: 'robozaps-unitree-h2-2026',
    sourceLabel: 'RoboZaps',
    secondarySourceId: 'wikipedia-humanoid-hand-2026',
    secondarySourceLabel: 'Wikipedia',
    asOf: 'Jul 2026',
  },
];

export type HandSortKey = 'dof' | 'tactile' | 'cost';
export type SortDirection = 'asc' | 'desc';

/** The order the table opens in: the tactile gap is the module's thesis. */
export const DEFAULT_HAND_SORT: { key: HandSortKey; direction: SortDirection } =
  { key: 'tactile', direction: 'asc' };

/** Natural first direction when the user switches to a new sort key. */
export function defaultDirectionFor(key: HandSortKey): SortDirection {
  return key === 'dof' ? 'desc' : 'asc';
}

const SORT_ACCESSOR: Record<HandSortKey, (hand: DexterousHand) => number | null> =
  {
    dof: (hand) => hand.dofSort,
    tactile: (hand) => hand.tactileSort,
    cost: (hand) => hand.costSort,
  };

/**
 * Sort rows by a spec dimension. Nulls (undisclosed specs) always sort last,
 * in both directions. Returns a new array; the input is not mutated.
 */
export function sortHands(
  rows: readonly DexterousHand[],
  key: HandSortKey,
  direction: SortDirection,
): DexterousHand[] {
  const accessor = SORT_ACCESSOR[key];
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * sign;
  });
}
