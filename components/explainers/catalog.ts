/**
 * The explainer curriculum, in reading order: Body, Move, Touch, Sense,
 * Learn. Only scenes that ship are listed; each loader is an explicit
 * dynamic import so the bundler splits every scene into its own chunk and
 * three.js never reaches the server render.
 */
export type ExplainerStep = {
  text: string;
  enter?: () => unknown;
  leave?: () => unknown;
};

export type ExplainerInstance = {
  steps: ExplainerStep[];
  dispose?: () => unknown;
};

export type ExplainerModule = {
  id: string;
  kicker: string;
  question: string;
  takeaway: string;
  concept: { name: string; article: string; href: string };
  selfCheck: { q: string; a: string };
  how: string;
  fallbackSteps?: ExplainerStep[];
  mount: (stage: unknown, ui: unknown) => Promise<ExplainerInstance>;
};

export type ExplainerEntry = {
  id: string;
  label: string;
  load: () => Promise<{ default: ExplainerModule }>;
};

export type ExplainerGroup = {
  group: string;
  items: readonly ExplainerEntry[];
};

export const EXPLAINER_CURRICULUM: readonly ExplainerGroup[] = [
  {
    group: 'Body',
    items: [
      { id: 'arm', label: 'The arm', load: () => import('./scenes/arm.js') },
      {
        id: 'humanoid',
        label: 'Inside a humanoid',
        load: () => import('./scenes/humanoid.js'),
      },
      { id: 'hand', label: 'The hand', load: () => import('./scenes/hand.js') },
    ],
  },
  {
    group: 'Move',
    items: [
      {
        id: 'reaching',
        label: 'Reaching',
        load: () => import('./scenes/reaching.js'),
      },
      {
        id: 'upright',
        label: 'Staying upright',
        load: () => import('./scenes/upright.js'),
      },
      { id: 'flying', label: 'Flying', load: () => import('./scenes/flying.js') },
      { id: 'path', label: 'Finding a path', load: () => import('./scenes/path.js') },
    ],
  },
  {
    group: 'Touch',
    items: [
      {
        id: 'grip',
        label: 'Holding without slipping',
        load: () => import('./scenes/grip.js'),
      },
    ],
  },
  {
    group: 'Sense',
    items: [
      {
        id: 'mug',
        label: 'Four ways to see a mug',
        load: () => import('./scenes/mug.js'),
      },
      {
        id: 'whereami',
        label: 'Knowing where you are',
        load: () => import('./scenes/whereami.js'),
      },
    ],
  },
  {
    group: 'Learn',
    items: [
      {
        id: 'puppeteer',
        label: 'Learning from a puppeteer',
        load: () => import('./scenes/puppeteer.js'),
      },
      {
        id: 'worlds',
        label: 'Practising in a thousand worlds',
        load: () => import('./scenes/worlds.js'),
      },
    ],
  },
];

export const EXPLAINER_ORDER: readonly ExplainerEntry[] =
  EXPLAINER_CURRICULUM.flatMap(({ items }) => items);
