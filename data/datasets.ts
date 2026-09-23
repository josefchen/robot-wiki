/**
 * Dataset comparison data: one row per major open robot-manipulation
 * dataset, for the /data-hardware/datasets module.
 *
 * Sources: research/03-data-hardware-evaluation.md (Part A1) plus live
 * verification of the underlying primary sources (2026-08-17). Rules:
 *   - Figures the source does not publish are null and render as "not
 *     disclosed"; nothing is guessed (OXE and BridgeData V2 hours, all
 *     AgiBot World 2026 counts).
 *   - Open-ended counts ("1M+") store the stated lower bound and carry the
 *     qualifier in the note field.
 *   - research/03 covers BridgeData V2 nowhere; its row is verified against
 *     the paper (arXiv 2308.12952) and the project site.
 *   - research/03's AgiBot World Alpha "479 tasks; 96 objects" cell is a
 *     copy of RoboMIND's row; the paper (arXiv 2503.06669) reports 217
 *     tasks in five deployment scenarios, which is what this row ships.
 *   - AgiBot World Beta does publish an hour count (2,976.4 h alongside
 *     1,001,552 trajectories, paper Sec. 3 and the dataset card); the
 *     larger 1,003,672 trajectory count on the GitHub README is the
 *     post-release total, and the two are labeled as such.
 *
 * The array is Zod-validated at import time, so a malformed row fails the
 * build, the dev server, and the test suite immediately. The runtime import
 * keeps its explicit .ts extension so plain node can load this file too.
 */
import { z } from 'zod';
import { datasetSchema, type Dataset } from './schemas/dataset.ts';

export type { Dataset } from './schemas/dataset.ts';

const ROWS: Dataset[] = [
  {
    id: 'open-x-embodiment',
    name: 'Open X-Embodiment (OXE)',
    // No alias: RT-X names the MODELS trained on the pool, not the pool, and
    // as a query it loses to method:rt-2 on fuzzy distance anyway.
    aka: [],
    year: 2023,
    episodes: 1000000,
    episodesNote: 'reported as 1M+; pooled from 60 datasets',
    // No hour count is published; the ~10,000 h figure is an estimate
    // (the module prose carries it, the table cell stays not disclosed).
    hours: null,
    tasks: 160266,
    tasksNote: '527 skills',
    scenes: null,
    embodimentCount: 22,
    embodiments: ['22 platforms pooled across 34 labs'],
    license: 'mixed (per constituent dataset)',
    url: 'https://robotics-transformer-x.github.io',
    sources: ['open-x-embodiment-2023'],
  },
  {
    id: 'droid',
    name: 'DROID',
    // Expanded on the project site and in the paper's abstract.
    aka: ['Distributed Robot Interaction Dataset'],
    year: 2024,
    episodes: 76000,
    hours: 350,
    tasks: 86,
    scenes: 564,
    embodimentCount: 1,
    embodiments: ['Franka Panda'],
    license: 'CC BY 4.0',
    url: 'https://droid-dataset.github.io',
    sources: ['droid-2024'],
  },
  {
    id: 'bridgedata-v2',
    name: 'BridgeData V2',
    aka: [],
    year: 2023,
    episodes: 60096,
    episodesNote: 'incl. 9,731 scripted pick-and-place rollouts',
    // The paper and project site publish no hour count.
    hours: null,
    tasks: 13,
    tasksNote: 'skills',
    scenes: 24,
    embodimentCount: 1,
    embodiments: ['WidowX 250'],
    license: 'CC BY 4.0',
    url: 'https://rail-berkeley.github.io/bridgedata/',
    sources: ['bridgedata-v2-2023'],
  },
  {
    id: 'agibot-world',
    name: 'AgiBot World',
    // The platform paper's own name: "AgiBot World Colosseo" (arXiv:2503.06669).
    aka: ['Colosseo'],
    year: 2025,
    episodes: 1001552,
    episodesNote: 'Beta release; 1,003,672 after post-release additions',
    hours: 2976.4,
    tasks: 217,
    tasksNote: '5 deployment scenarios',
    scenes: null,
    embodimentCount: 1,
    embodiments: ['AgiBot G1'],
    license: 'CC BY-NC-SA 4.0',
    url: 'https://agibot-world.com',
    sources: ['agibot-world-2025'],
  },
  {
    id: 'agibot-world-2026',
    name: 'AgiBot World 2026',
    aka: [],
    year: 2026,
    // The release publishes a 13.6 TB total file size (card-printed,
    // September 2026; HF storage API reports 14,054,068,535,897 bytes as
    // of 2026-09-16) but no
    // episode, hour, task, or scene counts as of September 2026 (the module
    // prose carries the file size, the table cells stay not disclosed).
    episodes: null,
    hours: null,
    tasks: null,
    scenes: null,
    embodimentCount: 1,
    embodiments: ['AgiBot G2'],
    license: 'CC BY-NC-SA 4.0',
    url: 'https://huggingface.co/datasets/agibot-world/AgiBotWorld2026',
    sources: ['agibot-world-2026'],
  },
  {
    id: 'robomind',
    name: 'RoboMIND',
    // The MIND expansion carried in the paper's title (arXiv:2412.13877).
    aka: ['Multi-embodiment Intelligence Normative Data'],
    // Paper first-submission year, not an established dataset v1.1/v1.2 release date.
    year: 2024,
    episodes: 107000,
    episodesNote: '107k successful, real + simulated (paper v3); card versions 1.1/1.2; 5k additional real-world failures',
    // Paper v3 reports 305.5 interaction hours for its 107k-trajectory
    // cohort, which mixes real-world and simulation data. This is not a
    // real-world-only duration or a duration verified for each card release.
    hours: 305.5,
    hoursNote: 'Paper v3: real + simulated; real-only and failure-set durations not separately reported',
    tasks: 479,
    tasksNote: '96 object classes',
    scenes: null,
    embodimentCount: 4,
    embodiments: [
      'Franka Emika Panda',
      'UR5e',
      'AgileX dual-arm',
      'humanoid, dual dexterous hands',
    ],
    // Applicable data-license field: release-specific terms for the 107k
    // dataset (card versions 1.1/1.2) are not disclosed in the inspected public card.
    // It displays Apache-2.0 without explicitly assigning that badge to these
    // data releases. Access conditions were not reviewed; infer no code/model terms.
    license: null,
    url: 'https://x-humanoid-robomind.github.io/',
    sources: ['robomind-2024'],
  },
];

/** Zod-validated rows; an invalid entry throws at import time. */
export const DATASETS: Dataset[] = z.array(datasetSchema).parse(ROWS);
