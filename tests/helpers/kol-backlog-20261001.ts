// Dated paragraphs that the 2026-10-01 KOL backlog batch added, keyed by the
// article path under content/. The token-continuity tests compare an article
// with an older commit; they remove exactly these paragraphs first, so any
// other numeric or citation change still fails, and so does a reworded one.
// The 2026-10-05 batch's and the 2026-10-07 step's paragraphs are removed the
// same way.
import { KOL_BACKLOG_20261005_PARAGRAPHS } from './kol-backlog-20261005';
import { KOL_BACKLOG_20261007_PARAGRAPHS } from './kol-backlog-20261007';

export const KOL_BACKLOG_PARAGRAPHS: Readonly<Record<string, readonly string[]>> = {
  'world-models/evaluation.mdx': [
    'Physics simulation sets the bar a learned evaluator should meet. In June 2026, Yuke Zhu and colleagues reported that SimFoundry, which rebuilds a real scene in simulation from a video, predicted real-world performance across 7 manipulation tasks and 5 policy architectures, with a mean Pearson correlation of 0.911 and a mean maximum ranking violation of 0.018 <Cite id="simfoundry-2026" />.',
  ],
  'world-models/model-based-robot-learning.mdx': [
    "In September 2026, Marco Hutter and colleagues at ETH Zurich's Robotic Systems Lab and the University of Chile learned a probabilistic dynamics ensemble from scratch on an 11.5-ton hydraulic excavator. After 20 minutes of interaction, their sampling-based model-predictive controller tracked paths as accurately as earlier learned controllers trained on 100 to 150 minutes of data; after 40 minutes it held sub-centimeter mean path error at high speed <Cite id=\"excavator-mbrl-2026\" />. The same month, Nicklas Hansen, Dieter Fox and colleagues trained one TD-MPC2 world model in simulation on up to 90 insertion tasks; it reached 56% zero-shot success on unseen objects of unknown geometry, against 7% for a model-free baseline <Cite id=\"insertion-world-models-2026\" />.",
  ],
  'adjacent/autonomous-vehicles.mdx': [
    'In September 2026, Chris Paxton argued that an automated system should be judged by its potential for catastrophic failure, which is much higher for a truck: it needs far longer to stop, and when one breaks down on a highway the law requires warning flares that a truck with no one aboard cannot set out <Cite id="paxton-autonomous-trucks-2026" />. He expected driverless trucks to spread over the following year mainly in China and the US Sun Belt, and put highways where ice forms years away <Cite id="paxton-autonomous-trucks-2026" />.',
  ],
  'frontier/dexterity.mdx': [
    "In June 2026, Dantong Niu, Yuke Zhu, Trevor Darrell and colleagues described T-Rex, which pairs a 100-hour tactile-rich dataset with a vision-language-action model that reads high-frequency touch through a variable-rate mixture-of-transformers and a temporal tactile encoder. On 12 tasks requiring delicate force control and deformable-object manipulation, its average success rate was more than 30% higher than the strongest baseline's <Cite id=\"t-rex-2026\" />.",
    'In June 2026, Xinghao Zhu, Yuke Zhu and colleagues reported CHORD, a reinforcement-learning framework for long-horizon dexterous manipulation that compares human and robot motions by the forces and torques they can induce on the object. On 1,831 tasks from its simulated benchmark of 4,739 bimanual tasks, it averaged 82.12% success, and its learned policies transferred to the real world <Cite id="chord-2026" />.',
    'In September 2026, Nidhya Shivakumar, Ken Goldberg and colleagues reported TRACE, which traces monochrome cables in both directions and uses interactive perception primitives to resolve ambiguous crossings. In 110 physical experiments with up to 4 cables and 40 crossings, it raised the share of cable length traced correctly from about 60% with the strongest prior method, HANDLOOM 2.0, to about 90% <Cite id="trace-cables-2026" />.',
  ],
};

export function withoutKolBacklogParagraphs(file: string, text: string): string {
  let result = text;
  for (const paragraph of [...KOL_BACKLOG_PARAGRAPHS[file] ?? [], ...KOL_BACKLOG_20261005_PARAGRAPHS[file] ?? [],
    ...KOL_BACKLOG_20261007_PARAGRAPHS[file] ?? []]) {
    const parts = result.split(`\n${paragraph}\n`);
    if (parts.length !== 2) {
      throw new Error(`${file} must hold the KOL backlog paragraph exactly once: ${paragraph.slice(0, 60)}`);
    }
    result = parts.join('\n');
  }
  return result;
}
