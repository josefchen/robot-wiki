import { AUTONOMY_LEVELS, SURGICAL_SYSTEM_ROWS } from './surgical-systems.ts';

/**
 * The surgical article's systems and research demonstrations placed on
 * Yang and colleagues' six levels of autonomy (Science Robotics 2017).
 *
 * Each placement names who made it, because the levels are a framework,
 * not a measurement:
 * - The FDA-authorized platforms (510(k) clearance or De Novo) keep the
 *   article's table placements
 *   (lib/surgical-systems.ts): Yang puts a teleoperated robot with motion
 *   scaling at Level 0, and ScoPilot's on-demand camera following is
 *   Level 1 assistance.
 * - STAR (Shademan and colleagues, 2016) is Yang's own Level 2 example,
 *   surgical suturing, reference 3 of the editorial; Saeidi and
 *   colleagues (2022) also call it the first in vivo Level 2 demonstration.
 * - Saeidi and colleagues' 2022 system names no level for itself. It
 *   "allows the operator to select among autonomously generated surgical
 *   plans", which is Yang's Level 3 definition ("generates task strategies
 *   but relies on the human to select from among different strategies"),
 *   so the placement is this article's.
 * - SRT-H's authors write that their work "falls in LoA IV" (arXiv
 *   2505.10251, read 2026-10-27); its trials were on excised gallbladders.
 * - Yang calls a Level 5 robotic surgeon "currently in the realm of
 *   science fiction", so the top rung is empty.
 */

export type Evidence = 'authorized' | 'research';

export interface LadderEntry {
  id: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  /** The in-plot label. */
  label: string;
  /** The table's systems cell. */
  systems: string;
  evidence: Evidence;
  /** The table's evidence cell. */
  evidenceText: string;
  /** Who made the placement. */
  placedBy: string;
  citationIds: readonly string[];
}

export const LADDER_SOURCES: readonly string[] = [
  'yang-autonomy-2017',
  'star-suturing-2016',
  'saeidi-laparoscopic-2022',
  'srt-h-2025',
];

const authorized = (level: 0 | 1) => SURGICAL_SYSTEM_ROWS.filter((r) => r.autonomyLevel === level).map((r) => r.system);

export const LADDER_ENTRIES: readonly LadderEntry[] = [
  {
    id: 'authorized-teleoperated',
    level: 0,
    label: 'Intuitive, CMR, Medtronic and J&J platforms',
    systems: authorized(0).join(', '),
    evidence: 'authorized',
    evidenceText: 'FDA-authorized, by 510(k) or De Novo',
    placedBy: 'Yang: motion scaling is still Level 0',
    citationIds: ['yang-autonomy-2017'],
  },
  {
    id: 'maestro-scopilot',
    level: 1,
    label: 'Moon Surgical Maestro with ScoPilot',
    systems: authorized(1).join(', '),
    evidence: 'authorized',
    evidenceText: 'FDA-cleared by 510(k)',
    placedBy: 'this article: camera following on demand',
    citationIds: ['yang-autonomy-2017'],
  },
  {
    id: 'star-2016',
    level: 2,
    label: 'STAR, 2016, suturing in live pigs',
    systems: 'STAR, Smart Tissue Autonomous Robot',
    evidence: 'research',
    evidenceText: 'research, in vivo in pigs',
    placedBy: 'Yang’s own Level 2 example',
    citationIds: ['yang-autonomy-2017', 'star-suturing-2016'],
  },
  {
    id: 'saeidi-2022',
    level: 3,
    label: 'Laparoscopic anastomosis, 2022, live pigs',
    systems: 'Saeidi and colleagues’ laparoscopic anastomosis robot',
    evidence: 'research',
    evidenceText: 'research, in vivo in pigs, one-week survival',
    placedBy: 'this article: the operator picks among robot plans',
    citationIds: ['saeidi-laparoscopic-2022', 'yang-autonomy-2017'],
  },
  {
    id: 'srt-h-2025',
    level: 4,
    label: 'SRT-H, 2025, on excised gallbladders',
    systems: 'SRT-H',
    evidence: 'research',
    evidenceText: 'research, ex vivo, eight gallbladders',
    placedBy: 'its authors',
    citationIds: ['srt-h-2025'],
  },
];

export const LEAD_EVIDENCE: Evidence = 'authorized';
export const HIGHEST_AUTHORIZED_LEVEL = Math.max(
  ...LADDER_ENTRIES.filter((e) => e.evidence === 'authorized').map((e) => e.level),
);
export const HIGHEST_CLAIMED_LEVEL = Math.max(...LADDER_ENTRIES.map((e) => e.level));

export { AUTONOMY_LEVELS };

export function entryAtLevel(level: number): LadderEntry | undefined {
  return LADDER_ENTRIES.find((e) => e.level === level);
}
