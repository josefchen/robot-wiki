/**
 * Three contests between autonomous racing drones and human champions, for
 * the drones article's timeline, dated by the month each result was
 * announced (all read 2026-10-27).
 *
 * - Swift: Kaufmann and colleagues, Nature 620, published 30 August 2023.
 *   "Swift wins 5 out of 9 races against A. Vanover, 4 out of 7 races
 *   against T. Bitmatta and 6 out of 9 races against M. Schaepper", 15 of
 *   25, on the University of Zurich's own track. The paper does not print
 *   the race dates; it was received on 5 January 2023, so the races came
 *   earlier, and the timeline places it at publication.
 * - MonoRace: TU Delft's news of 15 April 2025, and the MonoRace paper
 *   (arXiv 2601.15222), which dates the competition to 11 and 12 April
 *   2025 and says it beat "three human FPV world champions in a direct
 *   knockout tournament" on drone hardware and a track the organizers set.
 * - A2RL 2026: the A2RL release of January 2026. Minchan Kim faced TII
 *   Racing "in a best-of-nine showdown that remained tied at four wins
 *   apiece", and won when "the autonomous drone struck a gate and was
 *   unable to recover".
 */

export type Outcome = 'ai-won' | 'human-won';

export interface RacingContest {
  id: string;
  /** The announced month. */
  year: number;
  month: number;
  /** The stage label. */
  label: string;
  /** The readout beside the mark. */
  readout: string;
  outcome: Outcome;
  /** The table's cells. */
  row: string;
  when: string;
  result: string;
  setting: string;
  citationIds: readonly string[];
}

export const SWIFT_ID = 'swift-2023';
export const MONORACE_ID = 'monorace-2025';
export const A2RL_2026_ID = 'a2rl-2026';
export const LEAD_CONTEST_ID = A2RL_2026_ID;

export const SWIFT_WINS = 5 + 4 + 6;
export const SWIFT_RACES = 9 + 7 + 9;

export const CHAMPIONS_SOURCES: readonly string[] = [
  'swift-drone-racing-2023',
  'monorace-2026',
  'tudelft-a2rl-2025',
  'a2rl-2026-final',
];

export const RACING_CONTESTS: readonly RacingContest[] = [
  {
    id: SWIFT_ID,
    year: 2023,
    month: 8,
    label: 'Swift, University of Zurich, its own lab',
    readout: `won ${SWIFT_WINS} of ${SWIFT_RACES} races`,
    outcome: 'ai-won',
    row: 'Swift, University of Zurich',
    when: 'August 2023 (Nature)',
    result: `AI won ${SWIFT_WINS} of ${SWIFT_RACES} races against three champions`,
    setting: "the researchers' own lab, track and hardware",
    citationIds: ['swift-drone-racing-2023', 'tudelft-a2rl-2025'],
  },
  {
    id: MONORACE_ID,
    year: 2025,
    month: 4,
    label: 'MonoRace, TU Delft, A2RL in Abu Dhabi',
    readout: 'beat three champions',
    outcome: 'ai-won',
    row: 'MonoRace, TU Delft',
    when: 'April 2025 (A2RL)',
    result: 'AI beat three human world champions in a knockout',
    setting: 'hardware and track set by the organizers',
    citationIds: ['monorace-2026', 'tudelft-a2rl-2025'],
  },
  {
    id: A2RL_2026_ID,
    year: 2026,
    month: 1,
    label: 'TII Racing against Minchan Kim, A2RL',
    readout: 'lost the decider at 4 to 4',
    outcome: 'human-won',
    row: 'TII Racing against Minchan Kim',
    when: 'January 2026 (A2RL)',
    result: 'human won the best-of-nine final; at 4 wins each, the drone struck a gate',
    setting: 'A2RL event, one camera and an inertial sensor per drone',
    citationIds: ['a2rl-2026-final'],
  },
];

/** The month's midpoint as a fractional year. */
export const yearOf = (c: Pick<RacingContest, 'year' | 'month'>) => c.year + (c.month - 0.5) / 12;

export function contestOf(id: string): RacingContest {
  const contest = RACING_CONTESTS.find((c) => c.id === id);
  if (!contest) throw new Error(`drone-racing-champions: no contest "${id}"`);
  return contest;
}
