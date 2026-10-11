/**
 * Four real-robot studies in which reinforcement learning on top of a
 * policy trained from recorded data raised success, as the offline RL
 * article cites them. Each row is one study's reported success before and
 * after, on its own task and robot, so rows are not comparable with one
 * another. Read by the RealRobotRlGains figure and, for its source links,
 * by lib/widget-citations.ts.
 */

export type GainStudy = {
  id: string;
  task: string;
  method: string;
  before: number;
  after: number;
  citationId: string;
  note: string;
};

export const GAIN_STUDIES: readonly GainStudy[] = [
  {
    id: 'rankq',
    task: 'Cube stacking',
    method: 'RankQ',
    before: 43.1,
    after: 88.9,
    citationId: 'rankq-2026',
    note: "a vision-language-action policy's real cube-stacking success, with self-supervised action ranking",
  },
  {
    id: 'score',
    task: 'Eight hand tasks',
    method: 'SCORE',
    before: 37.8,
    after: 89.9,
    citationId: 'score-2026',
    note: 'average over eight real dexterous tasks, with simulated RL kept to the support of a real-data policy; the best baseline reached 59.5%',
  },
  {
    id: 'pa-rl',
    task: 'OpenVLA tasks',
    method: 'PA-RL',
    before: 40,
    after: 70,
    citationId: 'pa-rl-2024',
    note: 'the 7B OpenVLA fine-tuned with Cal-QL in 40 minutes of real-world training',
  },
  {
    id: 'bora',
    task: 'Standard objects',
    method: 'BORA',
    before: 60.8,
    after: 82.5,
    citationId: 'bora-2026',
    note: 'a residual actor on a frozen vision-language-action policy, with 20 online trajectories per task',
  },
];

export const gainPoints = (study: GainStudy) => Number((study.after - study.before).toFixed(1));
