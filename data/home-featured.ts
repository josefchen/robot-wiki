import type { ExplainerId } from '../components/explainers/words.ts';

/**
 * The home page's featured article, picked by an editor.
 *
 * The list is ordered, and home features only its first entry, so the pick
 * changes when an editor reorders or edits this list and never with the
 * date. Each pick carries its own dek, written for home rather than lifted
 * from the article, so an article can be rewritten without moving the front
 * page. A dek restates what the article says in plain words, carries no
 * number (a number on home would need its own citation) and passes the home
 * wording screen; tests/unit/featured-article.test.ts holds every entry to
 * that, and to the word share it has on home beside "Recently updated".
 */
export type HomeFeaturedPick = {
  domain: string;
  slug: string;
  /** One plain sentence, 25 words or fewer, shown under the title on home. */
  dek: string;
};

export const HOME_FEATURED_PICKS: readonly HomeFeaturedPick[] = [
  {
    // The article: a world model predicts how an environment evolves, and
    // counts only if it predicts the effect of actions; agents learn from
    // imagined trajectories and plan by scoring actions in the model before
    // executing the first one.
    domain: 'world-models',
    slug: 'taxonomy',
    dek: 'A model that lets a robot imagine what its actions will do before it moves.',
  },
  {
    // The article: whole-body control treats every actuated joint, legs to
    // hands, as one coupled problem, and its dominant paradigm is
    // reinforcement-learned tracking of retargeted human motion.
    domain: 'rl-sim2real',
    slug: 'humanoid-wbc',
    dek: 'Controlling every joint of a humanoid as one problem, often by learning to track recorded human motion.',
  },
  {
    // The article: video predictors generate future pixels from the current
    // frame and an action, standing in for the environment to supply
    // training data and policy evaluation.
    domain: 'world-models',
    slug: 'generative-video',
    dek: 'Video models that turn an action into predicted future frames, a simulator for training and testing robots.',
  },
];

/**
 * The home page's featured scene: one explainer from /how-robots-work/, by
 * its catalog id, with a caption written for home. The caption's numbers are
 * the ones the explainer itself takes from the Unitree G1 spec page (23
 * motors in the standard G1, 12 of them in the legs), so it cites nothing
 * the scene does not. `related` is the article the scene is credited to.
 */
export const HOME_FEATURED_SCENE = {
  explainer: 'humanoid',
  caption: "Of a Unitree G1's 23 motors, 12 move its legs and keep it balanced.",
  startLabel: 'Turn it in 3D',
  related: { domain: 'rl-sim2real', slug: 'humanoid-wbc' },
} as const satisfies {
  explainer: ExplainerId;
  caption: string;
  startLabel: string;
  related: { domain: string; slug: string };
};
