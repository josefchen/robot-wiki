import type { ExplainerId } from './words.ts';

/**
 * Where each explainer sits outside /how-robots-work/ (VAL-OPUS-153 and rule
 * 12 of the 3D curriculum). It is mounted once, in its home article (the
 * first the curriculum names for it), where that article first introduces
 * the concept, and every other home article the curriculum names links to it
 * at `/how-robots-work/#<id>`. `cue` is the sentence that ends the paragraph
 * just before the mount and points the reader at its one interaction.
 * tests/unit/explainer-mounts.test.ts holds content/ to this table.
 */
export type ExplainerMount = {
  /** `domain/slug` of the article that mounts the explainer. */
  article: string;
  /** The other home articles, which link to the explainer instead. */
  linkedFrom: readonly string[];
  /** The figure caption under the mount: one plain sentence, 25 words or fewer. */
  caption: string;
  cue: string;
};

export const EXPLAINER_MOUNTS = {
  arm: {
    article: 'data-hardware/hardware-taxonomy',
    linkedFrom: ['classical/kinematics'],
    caption: 'Each motor holds up every part beyond it, so the motors nearest the base need the most strength.',
    cue: 'Pull the arm apart in the figure below, then guess which motor works hardest to hold it out straight.',
  },
  humanoid: {
    article: 'rl-sim2real/humanoid-wbc',
    linkedFrom: ['data-hardware/hardware-taxonomy'],
    caption: "Most of a humanoid's motors keep it standing and walking, and its battery decides how long it can work.",
    cue: "Tap a body region in the figure below to see how a humanoid's motors are shared between legs, arms and hands.",
  },
  hand: {
    article: 'frontier/dexterity',
    linkedFrom: [],
    caption: 'A hand moves in about 20 ways and feels touch, while most robots use a clamp that only opens and closes.',
    cue: 'Switch between the clamp and the hand in the figure below and try the same task with each.',
  },
  reaching: {
    article: 'classical/kinematics',
    linkedFrom: [],
    caption: "To reach a cup an arm must work out every joint's angle, and some spots stay out of reach.",
    cue: "Move the shoulder slider in the figure below to trace the hand's path, then drag the cup and watch the arm work out an angle for every joint.",
  },
  upright: {
    article: 'rl-sim2real/legged-locomotion',
    linkedFrom: ['rl-sim2real/humanoid-wbc'],
    caption: 'Four feet give a robot a wide patch to balance over and two feet a tiny one, so a pushed humanoid must step.',
    cue: 'Push the dog and the humanoid in the figure below to see why fewer feet on the ground make balance harder.',
  },
  flying: {
    article: 'adjacent/drones',
    linkedFrom: [],
    caption: 'A drone has no wings or rudder, so it moves and turns only by changing how fast each propeller spins.',
    cue: 'Make the drone in the figure below climb, fly forward and turn, and watch its four propeller speeds change.',
  },
  path: {
    article: 'classical/motion-planning',
    linkedFrom: [],
    caption: 'A robot rarely knows the way around an obstacle in advance, but random safe steps grown into a tree find one.',
    cue: 'Drag the shelf in the figure below and the tree of random safe steps regrows around it to the goal.',
  },
  grip: {
    article: 'classical/grasp-planning',
    linkedFrom: [],
    caption: 'A finger can push only at a limited slant before it slides, which is why a tilted grip lets go.',
    cue: 'Tilt the grip in the figure below and pick a surface to find where the pinch lets go.',
  },
  mug: {
    article: 'classical/scene-representation',
    linkedFrom: [],
    caption: 'A robot can store a mug as dots, cubes, a skin or soft blobs, and each suits a different job.',
    cue: 'Step through the figure below to see one mug stored four ways.',
  },
  whereami: {
    article: 'classical/state-estimation',
    linkedFrom: [],
    caption: 'A robot never knows exactly where it is: moving makes it less sure and each landmark it sees makes it surer.',
    cue: 'Drive the robot in the figure below: its cloud of doubt grows as it moves and shrinks when it spots a landmark.',
  },
  puppeteer: {
    article: 'data-hardware/teleop-rigs',
    linkedFrom: ['manipulation/bc-foundations'],
    caption: 'A person steers a copy of the arm, the robot mirrors it, and every moment becomes an example to imitate.',
    cue: "Drag the copy's hand in the figure below and the robot arm mirrors it, recording each moment.",
  },
  worlds: {
    article: 'rl-sim2real/parallel-sim-rl',
    linkedFrom: ['rl-sim2real/sim2real-transfer'],
    caption: 'Practice in thousands of slightly different simulated worlds makes the real world just one more variation.',
    cue: 'Zoom out in the figure below to see thousands of copies of one robot practise at once, then shuffle their worlds.',
  },
} as const satisfies Record<ExplainerId, ExplainerMount>;
