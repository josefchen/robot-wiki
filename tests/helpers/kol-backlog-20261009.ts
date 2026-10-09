// Dated paragraphs that the 2026-10-09 overdue KOL queue step added, keyed by
// the article path under content/. withoutKolBacklogParagraphs in
// kol-backlog-20261001.ts removes these after the earlier batches' paragraphs.
export const KOL_BACKLOG_20261009_PARAGRAPHS: Readonly<Record<string, readonly string[]>> = {
  'frontier/dexterity.mdx': [
    'Boston Dynamics announced a new Atlas hand on October 1, 2026, with four fingers and 13 directly actuated degrees of freedom, up from seven, and pressure sensors across the fingertips and palm <Cite id="bd-atlas-hand-2026" />. It has no little finger, which would have needed three more actuators, and it is built to be simulated accurately enough for training with reinforcement learning <Cite id="bd-atlas-hand-2026" />.',
  ],
  'world-models/generative-video.mdx': [
    'In February 2026 Runway reported a similar ranking test for its GWM-Robotics world model: across eight vision-language-action policies from RoboArena, with 1,450 simulated rollouts scored by human graders, the policies\' simulated and real progress scores had a Pearson correlation of 0.95 <Cite id="runway-gwm-robotics-eval-2026" />. Runway says the study tests policy ranking only and does not predict absolute success rates <Cite id="runway-gwm-robotics-eval-2026" />. In September 2026 it announced Praxis-1, a world action model built on the video pretraining behind its general world models, which it is testing with partners before an open-weight release <Cite id="runway-praxis-1-2026" />.',
  ],
};

/** The citation ids the step appended to each article's frontmatter list, in order. */
export const KOL_BACKLOG_20261009_CITATIONS: Readonly<Record<string, readonly string[]>> = {
  'frontier/dexterity.mdx': ['bd-atlas-hand-2026'],
  'world-models/generative-video.mdx': ['runway-gwm-robotics-eval-2026', 'runway-praxis-1-2026'],
};
