import type { ExplainerId } from '../components/explainers/words.ts';

/**
 * The home page's "Start here" entries, picked by an editor.
 *
 * The list is ordered, hottest first, and home shows every entry in that
 * order, as four equal entries. The order changes only when an editor edits
 * this list, never with the date.
 *
 * Each entry carries its own dek, written for home rather than lifted from
 * the article, so an article can be rewritten without moving the front page.
 * A dek restates what the article says in plain words, runs to 14 words or
 * fewer, carries no number (a number on home would need its own citation)
 * and passes the home wording screen.
 *
 * The picture is one of the article's own registered images
 * (data/images.ts), so it is already licensed and credited; `crop` picks the
 * part of it home shows, in the image's own pixels, and `alt` describes that
 * part. tests/unit/featured-article.test.ts holds every entry to all of this.
 */
export type HomeCrop = {
  /** Left edge of the crop, in source pixels. */
  x: number;
  /** Top edge of the crop, in source pixels. */
  y: number;
  /** Crop width, in source pixels. */
  width: number;
  /** Crop height, in source pixels. */
  height: number;
};

export type HomeFeaturedPick = {
  domain: string;
  slug: string;
  /** One plain sentence, 14 words or fewer, shown under the title on home. */
  dek: string;
  /** A registered image the article itself shows. */
  imageId: string;
  /** The part of the image home shows, at 3:2. */
  crop: HomeCrop;
  /** What the cropped picture shows. */
  alt: string;
};

export const HOME_FEATURED_PICKS: readonly HomeFeaturedPick[] = [
  {
    // The article: a world model predicts how an environment evolves, and
    // counts only if it predicts the effect of actions; agents learn from
    // imagined trajectories and plan by scoring actions in the model before
    // executing the first one.
    domain: 'world-models',
    slug: 'taxonomy',
    dek: 'How a robot can imagine what its actions will do before it moves.',
    imageId: 'dreamerv3-open-loop-quadruped-2023',
    // The frames at T = 20, 25 and 30 only, true row above model row; no labels.
    crop: { x: 626, y: 52, width: 414, height: 276 },
    alt: "Three true frames above the model's three predicted frames of a simulated quadruped.",
  },
  {
    // The article: RT-2, Octo and OpenVLA carried web-scale vision-language
    // pretraining into robot control by emitting actions as tokens.
    domain: 'manipulation',
    slug: 'vla-models',
    dek: 'Vision-language models trained to read a scene and an instruction, then act.',
    imageId: 'gemini-robotics-aloha-dexterous-2025',
    crop: { x: 343, y: 32, width: 324, height: 216 },
    alt: 'Overhead view of two robot arms working together on a cluttered table to open an eyeglasses case.',
  },
  {
    // The article: whole-body control treats every actuated joint, legs to
    // hands, as one coupled problem, and its dominant paradigm is
    // reinforcement-learned tracking of retargeted human motion.
    domain: 'rl-sim2real',
    slug: 'humanoid-wbc',
    dek: 'Controlling every joint of a humanoid as one problem, often by tracking human motion.',
    imageId: 'motion-capture-session-hyderabad-2026',
    crop: { x: 180, y: 20, width: 1500, height: 1000 },
    alt: 'Performers in black motion capture suits dotted with markers stand in a studio ringed by cameras.',
  },
  {
    // The article: per-step errors compound, so a demo that succeeds most of
    // the time is far from a product that must succeed nearly every time.
    domain: 'frontier',
    slug: 'reliability-gap',
    dek: 'Why a robot that works in most demos is still far from a product.',
    imageId: 'tesla-optimus-stockholm-2024',
    crop: { x: 180, y: 90, width: 1560, height: 1040 },
    alt: 'Two silver and black Tesla Optimus humanoid robots standing on display pedestals in a white-walled showroom.',
  },
];

/**
 * The home page's scene: one explainer from /how-robots-work/, by its
 * catalog id, set beside the name in the first screen. Home paints its
 * poster and loads the 3D kit only when the reader presses `startLabel`.
 */
export const HOME_FEATURED_SCENE = {
  explainer: 'humanoid',
  startLabel: 'Turn it in 3D',
} as const satisfies {
  explainer: ExplainerId;
  startLabel: string;
};
