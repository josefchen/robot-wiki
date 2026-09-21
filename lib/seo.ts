import type { Domain, ModuleRegistryEntry } from '@/data/modules';
import { DOMAIN_META } from '@/data/modules';
import { AUTHOR_NAME, AUTHOR_PROFILE_URL } from '@/lib/identity';
import { articleStructuredImagePaths } from '@/lib/og-cards';
import { SITE_URL } from '@/lib/site';

/** Search-facing copy shared by metadata and WebSite structured data. */
export const HOME_SEO_TITLE = 'Modern Robotics and Robot Learning - robot-wiki';
export const HOME_SEO_DESCRIPTION =
  'Explore modern robotics with source-cited guides to robot learning, vision-language-action models, reinforcement learning, sim-to-real and control.';

export const ACQUISITION_CLUSTERS = [
  'robot-learning-vla',
  'classical-robotics',
  'world-models',
  'utility',
] as const;

export type AcquisitionCluster = (typeof ACQUISITION_CLUSTERS)[number];

export interface ArticleSeoProfile {
  title: string;
  description: string;
  acquisitionCluster: AcquisitionCluster;
  primaryIntent: string;
  indexable: true;
}

/** Descriptive titles for indexable standalone landing pages. */
export const STANDALONE_SEO_TITLES = {
  azIndex: 'Robotics A-Z: Articles and Glossary',
  credits: 'About Robot Wiki and Image Credits',
  editorialPolicy: 'Robot Wiki Editorial and Corrections Policy',
  glossary: 'Robotics and Robot Learning Glossary',
  marketMap: 'Robotics and Embodied AI Company Market Map',
  playground: 'Interactive Robot Kinematics Playground',
  privacy: 'Robot Wiki Privacy and Anonymous Analytics',
} as const;

/**
 * Search titles can be more explicit than the compact editorial headings.
 * Social cards and visible h1s continue to use the editorial title, so this
 * map affects only the document title shown to search engines and browser
 * tabs. Every title stays faithful to the article it labels.
 */
const ARTICLE_SEO_TITLES: Readonly<Record<string, string>> = {
  'manipulation/bc-foundations': 'Behavior Cloning for Robot Learning',
  'manipulation/action-chunking': 'Action Chunking for Robotics: ACT and ALOHA',
  'manipulation/diffusion-policy': 'Diffusion Policy for Robot Control',
  'manipulation/vla-models': 'Vision-Language-Action Models for Robotics',
  'manipulation/pi-line': 'Pi0 Robot Policies: The Physical Intelligence Pi Line',
  'manipulation/generalist-policies': 'Generalist Robot Policies: Gemini, GR00T, Helix and Skild',
  'manipulation/comparison-matrix': 'Robot Policy Comparison: VLA and Diffusion Models',
  'manipulation/hierarchical': 'Hierarchical Robot Learning: SayCan and Code as Policies',
  'manipulation/rl-finetuning': 'RL Fine-Tuning for Robot Policies',
  'manipulation/realtime-execution': 'Real-Time Robot Policy Execution',
  'manipulation/cross-embodiment': 'Cross-Embodiment Transfer in Robot Learning',
  'manipulation/knowledge-insulation': 'Knowledge Insulation in Vision-Language-Action Models',
  'manipulation/robot-learning-roadmap': 'Robot Learning Roadmap for ML Engineers',
  'manipulation/action-spaces': 'Robot Action Spaces: Joint, Cartesian and Torque Control',
  'manipulation/foundation-models': 'Foundation Models for Robotics: VLA, World Models and More',
  'rl-sim2real/rl-for-robotics': 'Reinforcement Learning for Robotics',
  'rl-sim2real/why-rl-locomotion': 'Why RL Works for Locomotion but Not Robot Manipulation',
  'rl-sim2real/parallel-sim-rl': 'Massively Parallel Simulation for Robot RL',
  'rl-sim2real/sim2real-transfer': 'Sim-to-Real Transfer for Robot Learning',
  'rl-sim2real/legged-locomotion': 'Legged Robot Locomotion: ANYmal, Unitree and Humanoids',
  'rl-sim2real/humanoid-wbc': 'Humanoid Whole-Body Control',
  'rl-sim2real/reward-design-mpc': 'Robot Reward Design and Model Predictive Control',
  'rl-sim2real/offline-rl': 'Offline Reinforcement Learning for Robotics',
  'world-models/taxonomy': 'World Models for Robotics: Definition and Taxonomy',
  'world-models/latent-dynamics': 'Latent-Dynamics World Models for Robotics',
  'world-models/generative-video': 'Generative Video World Models for Robotics',
  'world-models/jepa': 'JEPA World Models: The Non-Generative Alternative',
  'world-models/generative-sim': 'Generative Simulation for Robot Learning',
  'world-models/model-based-robot-learning': 'Model-Based Robot Learning: World Models and Planning',
  'world-models/evaluation': 'World Model Evaluation for Robotics',
  'world-models/world-models-vs-simulators': 'World Models vs Physics Simulators for Robotics',
  'data-hardware/data-bottleneck': 'Robot Learning Data: The Embodied Data Bottleneck',
  'data-hardware/datasets': 'Robot Learning Datasets: OXE, DROID and More',
  'data-hardware/hardware-taxonomy': 'Robot Hardware Guide: Arms, Humanoids and Sensors',
  'data-hardware/teleop-rigs': 'Robot Teleoperation Rigs: ALOHA, GELLO, UMI and VR',
  'data-hardware/evaluation-crisis': 'Robot Learning Benchmarks and the Evaluation Crisis',
  'data-hardware/industrial-deployment': 'Industrial Robot Learning Deployment',
  'data-hardware/robot-learning-stack': 'Robot Learning Stack: Data, Training, Evaluation and ROS',
  'classical/kinematics': 'Robot Kinematics: Forward, Inverse and Jacobians',
  'classical/motion-planning': 'Robot Motion Planning: RRT, CHOMP and TrajOpt',
  'classical/control': 'Robot Control: PID, LQR, MPC and Whole-Body QP',
  'classical/state-estimation': 'Robot State Estimation: Kalman Filters and Factor Graphs',
  'classical/grasp-planning': 'Robot Grasp Planning: Force Closure and Quality Metrics',
  'classical/perception': 'Robot Perception for Manipulation',
  'classical/scene-representation': 'Robot Scene Representation and Mapping',
  'classical/calibration': 'Robot Calibration: Cameras, Arms, Timing and Dynamics',
  'classical/ros2-for-ml-engineers': 'ROS 2 for Machine Learning Engineers',
  'frontier/reliability-gap': 'Robot Reliability: Why Demos Fail in Production',
  'frontier/dexterity': 'Robot Dexterity: Tactile Sensing and In-Hand Manipulation',
  'frontier/generalization': 'Robot Generalization: Meaning and Measurement',
  'frontier/competing-theses': 'Competing Paths to General-Purpose Robots',
  'frontier/bear-case': 'The Bear Case for General-Purpose Robots',
  'frontier/safety-and-assurance': 'Robot Safety and Assurance for Learned Policies',
  'adjacent/autonomous-vehicles': 'Autonomous Vehicle Perception, Planning and Control',
  'adjacent/drones': 'Drone and Aerial Robotics',
  'adjacent/surgical': 'Surgical Robotics: Systems, Safety and Autonomy',
  'adjacent/space': 'Space Robotics: Rovers, Arms and Autonomy',
};

const DOMAIN_SEO_TITLES: Readonly<Record<Domain, string>> = {
  manipulation: 'Robot Learning and Manipulation',
  'rl-sim2real': 'Reinforcement Learning and Sim-to-Real Robotics',
  'world-models': 'World Models for Robotics',
  'data-hardware': 'Robot Data, Hardware and Evaluation',
  classical: 'Robot Kinematics, Planning, Control and Perception',
  frontier: 'Robotics Reliability, Safety and Open Problems',
  adjacent: 'Autonomous Vehicles, Drones, Surgical and Space Robotics',
};

const DOMAIN_ACQUISITION_CLUSTERS: Readonly<
  Record<Domain, AcquisitionCluster>
> = {
  manipulation: 'robot-learning-vla',
  'rl-sim2real': 'robot-learning-vla',
  'data-hardware': 'robot-learning-vla',
  classical: 'classical-robotics',
  'world-models': 'world-models',
  frontier: 'utility',
  adjacent: 'utility',
};

export function articleSeoProfile(
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title' | 'summary'>,
): ArticleSeoProfile {
  const title = ARTICLE_SEO_TITLES[`${entry.domain}/${entry.slug}`] ?? entry.title;
  return {
    title,
    description: entry.summary,
    acquisitionCluster: DOMAIN_ACQUISITION_CLUSTERS[entry.domain],
    primaryIntent: title,
    indexable: true,
  };
}

export function articleSeoTitle(
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title' | 'summary'>,
): string {
  return articleSeoProfile(entry).title;
}

export function domainSeoTitle(domain: Domain): string {
  return DOMAIN_SEO_TITLES[domain];
}

/**
 * JSON-LD is inserted with dangerouslySetInnerHTML, so escape the one byte
 * sequence that could open an HTML tag and terminate the script element.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function personJsonLd() {
  return {
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: AUTHOR_PROFILE_URL,
  } as const;
}

export function websiteJsonLd(): string {
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: 'robot-wiki',
    alternateName: 'Robot Wiki',
    description: HOME_SEO_DESCRIPTION,
    inLanguage: 'en',
    creator: personJsonLd(),
  });
}

type ArticleJsonLdInput = {
  entry: Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title' | 'summary'>;
  datePublished?: string;
  lastReviewed?: string;
  readingTimeMinutes: number;
  wordCount: number;
  citationUrls: readonly string[];
};

export function articleJsonLd({
  entry,
  datePublished,
  lastReviewed,
  readingTimeMinutes,
  wordCount,
  citationUrls,
}: ArticleJsonLdInput): string {
  const url = `${SITE_URL}/${entry.domain}/${entry.slug}/`;
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: entry.title,
    description: entry.summary,
    url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    image: articleStructuredImagePaths(entry.domain, entry.slug).map(
      (path) => `${SITE_URL}${path}`,
    ),
    author: personJsonLd(),
    publisher: personJsonLd(),
    ...(datePublished ? { datePublished } : {}),
    ...(lastReviewed ? { dateModified: lastReviewed } : {}),
    articleSection: DOMAIN_META[entry.domain].name,
    inLanguage: 'en',
    isAccessibleForFree: true,
    wordCount: Math.max(1, Math.round(wordCount)),
    timeRequired: `PT${Math.max(1, Math.round(readingTimeMinutes))}M`,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'robot-wiki',
      url: `${SITE_URL}/`,
    },
    citation: [...new Set(citationUrls)],
  });
}

export function domainCollectionJsonLd(
  domain: Domain,
  entries: ReadonlyArray<
    Pick<ModuleRegistryEntry, 'domain' | 'slug' | 'title' | 'summary'>
  >,
): string {
  const url = `${SITE_URL}/${domain}/`;
  const meta = DOMAIN_META[domain];
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: meta.name,
    description: meta.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => {
        const articleUrl = `${SITE_URL}/${entry.domain}/${entry.slug}/`;
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            '@id': `${articleUrl}#article`,
            url: articleUrl,
            name: entry.title,
            description: entry.summary,
          },
        };
      }),
    },
  });
}
