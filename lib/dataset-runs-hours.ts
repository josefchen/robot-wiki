/**
 * Recorded runs against recorded hours for the public robot datasets whose
 * papers print both totals. Every number is the paper's own; seconds per run
 * is the one derived value (hours times 3,600 over runs).
 *
 * - DROID: "76k demonstration trajectories or 350 hours of interaction data"
 *   (arXiv 2403.12945 abstract).
 * - RoboMIND: "107k demonstration trajectories amounting to 305.5 hours of
 *   interaction data", real and simulated (arXiv 2412.13877).
 * - Galaxea Open-World: "500 hours" and "100K demonstration trajectories"
 *   (arXiv 2509.00576).
 * - AgiBot World Beta: 1,001,552 trajectories totaling 2,976.4 hours
 *   (arXiv 2503.06669).
 * - FineART: "40,543 episodes (1,718 hours)" (arXiv 2609.36416 abstract).
 *
 * BridgeData V2 is left off: its paper and project page give 60,096
 * trajectories but no total hours. The only route to one, the project
 * page's 38-timestep average at the 5 Hz the paper states for its
 * teleoperated demonstrations (about 127 hours), assumes the 9,731 scripted
 * rollouts ran at the same rate, and would put that guess beside five
 * printed totals.
 */

export interface DatasetRunsHours {
  id: string;
  label: string;
  runs: number;
  hours: number;
  /** Citation registry id backing both totals. */
  citationId: string;
  /** How the paper prints the run count, when it rounds. */
  runsAsPrinted?: string;
}

export const DATASET_RUNS_HOURS: readonly DatasetRunsHours[] = [
  { id: 'fineart', label: 'FineART', runs: 40_543, hours: 1_718, citationId: 'fineart-2026' },
  { id: 'droid', label: 'DROID', runs: 76_000, hours: 350, citationId: 'droid-2024', runsAsPrinted: '76k' },
  {
    id: 'galaxea',
    label: 'Galaxea',
    runs: 100_000,
    hours: 500,
    citationId: 'galaxea-open-world-2025',
    runsAsPrinted: '100K',
  },
  { id: 'robomind', label: 'RoboMIND', runs: 107_000, hours: 305.5, citationId: 'robomind-2024', runsAsPrinted: '107k' },
  { id: 'agibot', label: 'AgiBot World', runs: 1_001_552, hours: 2_976.4, citationId: 'agibot-world-2025' },
];

/** The dataset the figure picks out: the fewest runs and the longest ones. */
export const LONG_RUN_ID = 'fineart';

/** Average seconds per recorded run. */
export function secondsPerRun(d: Pick<DatasetRunsHours, 'runs' | 'hours'>): number {
  return (d.hours * 3600) / d.runs;
}

/** "11 seconds", "2.5 minutes". */
export function runLengthInWords(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} seconds`;
  return `${(seconds / 60).toFixed(1)} minutes`;
}
