import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  approvedDeltaPath, sha256, validateApprovedDeltas, type ApprovedDelta,
} from '../../lib/brand-v2-baseline';
import { committedSource } from '../helpers/continuation-integration';

const registerPath = 'contract/brand-v2-approved-deltas.json';
const mainRef = '51568b3adcafa98ac40800aee13869502ddd5e06';
const localRef = 'addbf58ad4386de53144c30b87d9144019accba2';
const rawMain = committedSource(mainRef, registerPath);
const rawLocal = committedSource(localRef, registerPath);
const main: ApprovedDelta[] = JSON.parse(rawMain).entries;
const local: ApprovedDelta[] = JSON.parse(rawLocal).entries;
const merged: ApprovedDelta[] = JSON.parse(readFileSync(registerPath, 'utf8')).entries;
const collisionIds = [
  'sweeps-registry-gensim15-20260917-1',
  'sweeps-registry-mp7-20260917-1',
  'single-leftovers-rg6-20260917-1',
];
const resolutions = [
  ['main-merge-20260924-control-prose', 'prose', 'article:classical/control', 21],
  ['main-merge-20260924-industrial-prose', 'prose', 'article:data-hardware/industrial-deployment', 23],
  ['main-merge-20260924-control-relationships', 'relationships', 'article:classical/control', 4],
  ['main-merge-20260924-citation-rendering', 'article-metadata', 'citation-rendering:label-and-meta', 44],
] as const;
const archive = JSON.parse(readFileSync(
  'audit/evidence/main-merge-integration-20260924/approval-branch-collisions.json', 'utf8',
));
// Later appends after the two-parent merge, in ledger order: the imported
// manipulation packet integration of 2026-09-24 re-anchored the eight members
// its three article corrections moved (robot-learning-roadmap prose and
// frontmatter; action-spaces and foundation-models prose, relationships and
// frontmatter). The imported stack-classical packet integration of 2026-09-24
// then re-anchored the five members it moved (calibration prose and frontmatter;
// ros2-for-ml-engineers frontmatter; robot-learning-stack prose and frontmatter).
// The imported world-rl packet integration of 2026-09-24 then re-anchored the
// four members it moved (world-models-vs-simulators prose and frontmatter;
// model-based-robot-learning prose and frontmatter; its relationships members
// were unchanged because every inline citation was retained).
// Each entry brackets its member from the seal to the current value; the merge
// resolutions stay in place as history.
const packetAppends = [
  'continuation-merge-2026-09-24-manipulation-import-prose-action-spaces',
  'continuation-merge-2026-09-24-manipulation-import-relationships-action-spaces',
  'continuation-merge-2026-09-24-manipulation-import-frontmatter-action-spaces',
  'continuation-merge-2026-09-24-manipulation-import-prose-foundation-models',
  'continuation-merge-2026-09-24-manipulation-import-relationships-foundation-models',
  'continuation-merge-2026-09-24-manipulation-import-frontmatter-foundation-models',
  'continuation-merge-2026-09-24-manipulation-import-prose-robot-learning-roadmap',
  'continuation-merge-2026-09-24-manipulation-import-frontmatter-robot-learning-roadmap',
] as const;
const stackClassicalWorldRlAppends = [
  'continuation-merge-2026-09-24-stack-classical-import-prose-calibration',
  'continuation-merge-2026-09-24-stack-classical-import-frontmatter-calibration',
  'continuation-merge-2026-09-24-stack-classical-import-frontmatter-ros2-for-ml-engineers',
  'continuation-merge-2026-09-24-stack-classical-import-prose-robot-learning-stack',
  'continuation-merge-2026-09-24-stack-classical-import-frontmatter-robot-learning-stack',
  'continuation-merge-2026-09-24-world-rl-import-prose-world-models-vs-simulators',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-world-models-vs-simulators',
  'continuation-merge-2026-09-24-world-rl-import-prose-model-based-robot-learning',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-model-based-robot-learning',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-offline-rl',
  'continuation-merge-2026-09-24-world-rl-import-frontmatter-evaluation',
] as const;
const techWithdrawalAppends = [
  'continuation-merge-2026-09-24-tech-withdrawal-prose-industrial-deployment',
  'continuation-merge-2026-09-24-tech-withdrawal-prose-bear-case',
  'continuation-merge-2026-09-24-tech-withdrawal-prose-competing-theses',
  'continuation-merge-2026-09-24-tech-withdrawal-prose-reliability-gap',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-industrial-deployment',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-bear-case',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-competing-theses',
  'continuation-merge-2026-09-24-tech-withdrawal-relationships-reliability-gap',
  'continuation-merge-2026-09-24-tech-withdrawal-interactive-deployment-dashboard',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-industrial-deployment',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-bear-case',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-competing-theses',
  'continuation-merge-2026-09-24-tech-withdrawal-frontmatter-reliability-gap',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-rendering',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-agility-digit-production',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-figure-bmw-production-2025',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-technology-org-deployed-2026',
  'continuation-merge-2026-09-24-tech-withdrawal-citation-tesla-q1-2026-update',
] as const;
// The search-states treatment of 2026-09-25 then registered the labelled
// clear control's accessible name, the one literal that treatment added to
// the search interface.
const searchStatesAppends = [
  'brand-v2-search-clear-control-name',
] as const;
// The manipulation humanizer pass and EXPO-FT intake (owner decision
// 20260925) registered 25 members afterwards.
const humanizerAppends = [
  'humanizer-manipulation-v3-20260925-prose-action-chunking',
  'humanizer-manipulation-v3-20260925-prose-action-spaces',
  'humanizer-manipulation-v3-20260925-prose-bc-foundations',
  'humanizer-manipulation-v3-20260925-prose-comparison-matrix',
  'humanizer-manipulation-v3-20260925-prose-cross-embodiment',
  'humanizer-manipulation-v3-20260925-prose-diffusion-policy',
  'humanizer-manipulation-v3-20260925-prose-foundation-models',
  'humanizer-manipulation-v3-20260925-prose-generalist-policies',
  'humanizer-manipulation-v3-20260925-prose-hierarchical',
  'humanizer-manipulation-v3-20260925-prose-knowledge-insulation',
  'humanizer-manipulation-v3-20260925-prose-pi-line',
  'humanizer-manipulation-v3-20260925-prose-realtime-execution',
  'humanizer-manipulation-v3-20260925-prose-rl-finetuning',
  'humanizer-manipulation-v3-20260925-prose-robot-learning-roadmap',
  'humanizer-manipulation-v3-20260925-prose-vla-models',
  'expo-ft-intake-20260925-relationships-rl-finetuning',
  'expo-ft-intake-20260925-frontmatter-rl-finetuning',
  'expo-ft-intake-20260925-metadata-rl-finetuning',
  'expo-ft-intake-20260925-citation-rendering',
  'expo-ft-intake-20260925-citation-dsrl-2025',
  'expo-ft-intake-20260925-citation-expo-2025',
  'expo-ft-intake-20260925-citation-expo-ft-2026',
  'expo-ft-intake-20260925-citation-perry-dong-post-training-2026',
  'expo-ft-intake-20260925-citation-realtime-expo-ft-2026',
  'expo-ft-intake-20260925-chart-aria-label',
] as const;
// The data/classical instrument migration (2026-09-26) re-anchored the RRT
// explorer's sealed source member to its migrated rendering.
const instrumentMigrationAppends = [
  'instrument-migration-20260926-rrt-source',
] as const;
// The educational convergence pass of 2026-09-26 carried four prediction-step
// articles to their current text: sim2real-transfer and data-bottleneck for
// hint accuracy, option shape and answer traceability; bc-foundations and
// realtime-execution for answer traceability alone.
const educationalConvergenceAppends = [
  'educational-convergence-20260926-prose-sim2real-transfer',
  'educational-convergence-20260926-prose-data-bottleneck',
  'educational-convergence-20260926-prose-bc-foundations',
  'educational-convergence-20260926-prose-realtime-execution',
] as const;
// The educational relocation pass of 2026-09-26 lifted the
// industrial-deployment calculator above its prose.
const educationalRelocationAppends = [
  'educational-relocation-20260926-prose-industrial-deployment',
] as const;
// The educational cue pass of 2026-09-26 added one VAL-EDU-045 clause (d)
// operating cue sentence to each of eleven article paragraphs.
const educationalCueAppends = [
  'educational-cue-20260926-prose-vla-models',
  'educational-cue-20260926-prose-generalist-policies',
  'educational-cue-20260926-prose-comparison-matrix',
  'educational-cue-20260926-prose-hierarchical',
  'educational-cue-20260926-prose-realtime-execution',
  'educational-cue-20260926-prose-cross-embodiment',
  'educational-cue-20260926-prose-taxonomy',
  'educational-cue-20260926-prose-jepa',
  'educational-cue-20260926-prose-teleop-rigs',
  'educational-cue-20260926-prose-motion-planning',
  'educational-cue-20260926-prose-perception',
] as const;
// The motion-language pass of 2026-09-26 replaced the Kalman tracker and
// denoising-loop interactives with the two motion scenes and re-anchored
// every sealed member the swap moved (sources, mounts, prose, metadata,
// accessible names, behavioral defaults, one value-state site).
const motionLanguageAppends = Array.from({ length: 45 }, (_, index) =>
  `motion-language-scene-swap-${index + 1}`) as unknown as readonly string[];
// The motion-language clip pipeline (2026-09-26) mounted the Kalman
// cinematic clip on classical/state-estimation: two bridge sentences of
// prose and the two accessible names the clip instrument and its native
// video carry.
const motionLanguageClipAppends = [
  'motion-language-clip-pilot-state-estimation-prose',
  'motion-language-clip-frame-region-name',
  'motion-language-clip-video-player-name',
] as const;
// The owner-reviewed scene equation now names its typeset TeX for readers
// using an accessible alternative.
const motionSceneEquationAppends = [
  'motion-scene-typeset-equation-name',
] as const;
const motionClassicalAppends = [
  'calibration', 'control', 'grasp-planning', 'kinematics',
  'motion-planning', 'perception', 'ros2-for-ml-engineers',
  'scene-representation', 'state-estimation',
].map(slug => `motion-classical-humanizer-v3-20260927-prose-${slug}`);
const motionManipulationAppends = [
  'motion-manipulation-20260927-prose-pi-line-mount',
  'motion-manipulation-20260927-prose-vla-models-mount',
];
const motionRlAppends = [
  'why-rl-locomotion', 'parallel-sim-rl', 'legged-locomotion',
  'sim2real-transfer', 'reward-design-mpc', 'rl-for-robotics',
  'humanoid-wbc', 'offline-rl',
].map(slug => `motion-rl-sim2real-humanizer-v3-20260927-prose-${slug}`);
const motionRlReconciliations = [
  'humanoid-wbc', 'parallel-sim-rl', 'reward-design-mpc',
  'sim2real-transfer', 'why-rl-locomotion',
].map(slug => `motion-rl-sim2real-20260927-reconcile-${slug}`);
const motionWorldModelAppends = [
  'evaluation', 'generative-sim', 'generative-video', 'jepa',
  'latent-dynamics', 'model-based-robot-learning', 'taxonomy',
  'world-models-vs-simulators',
].map(slug => `motion-world-models-humanizer-v3-20260927-prose-${slug}`);
const motionDataHardwareAppends = [
  ...['data-bottleneck', 'datasets', 'evaluation-crisis', 'hardware-taxonomy',
    'industrial-deployment', 'robot-learning-stack', 'teleop-rigs']
    .map(slug => `motion-data-hardware-humanizer-v3-20260927-prose-${slug}`),
  'motion-data-hardware-source-qualification-20260927-prose-evaluation-crisis',
  'motion-data-hardware-source-qualification-20260927-prose-industrial-deployment',
];
const motionFrontierAdjacentHomeAppends = [
  ...['drones', 'space', 'surgical', 'bear-case', 'competing-theses',
    'dexterity', 'generalization', 'reliability-gap', 'safety-and-assurance']
    .map(slug => `motion-frontier-adjacent-home-humanizer-v3-20260927-prose-${slug}`),
];
const motionScrutinyS12Appends = [
  'motion-scrutiny-s12-20260928-prose-generative-sim-citation-attachment',
  'motion-scrutiny-s12-20260928-relationships-generative-sim-citation',
] as const;
// The round-5 first-screen repair of 2026-09-28 moved each article's first
// interactive ahead of the motion scene that had pushed it past VAL-EDU-045.
// reliability-gap's history already ended in reconciling resolutions, so its
// entry is a resolution from the sealed hash binding all twenty prior edges.
const round5FirstScreenAppends = [
  'reliability-gap', 'drones', 'diffusion-policy',
].map(slug => `round5-chart-first-screen-20260928-prose-${slug}`);
// The round-5 pinned-leftover repair of 2026-09-28 moved the data-bottleneck
// and evaluation-crisis first interactives ahead of their motion scenes; each
// article's history ended in a plain edge, so each entry is a plain edge too.
const round5PinnedLeftoversAppends = [
  'round5-pinned-leftovers-20260928-prose-data-bottleneck',
  'round5-pinned-leftovers-20260928-prose-evaluation-crisis',
] as const;
// The round-5 first-screen c/d repair of 2026-09-29 swapped nine articles'
// first interactive above the motion scene that separated it from its cue.
// parallel-sim-rl's history already ended in reconciling resolutions, so its
// entry is a resolution from the sealed hash binding all sixteen prior edges.
const round5FirstScreenCdAppends = [
  'vla-models', 'pi-line', 'parallel-sim-rl', 'legged-locomotion',
  'latent-dynamics', 'generative-video', 'generative-sim', 'kinematics',
  'motion-planning',
].map(slug => `round5-first-screen-cd-20260929-prose-${slug}`);
const round5FirstScreenCdEndpoints: ReadonlyArray<readonly [string, string, string]> = [
  ['article:manipulation/vla-models',
    '58887645ef7e2449eace762c4f2e89581eda98ec5c9adaa88b6c16ff690d2303',
    'ef14b1dd87bf8f6c5944bebb56b5da3b2db890def0d378e38c4a113806d9027f'],
  ['article:manipulation/pi-line',
    'f0f3afb7ce11afa404d1b8584e8039f9c007da277a6a9d0651ea0aeecf52b3e6',
    '783f0ca55010dc594fe42dd4b9e6f54f39538e7a52e3fa46e7958360893bc0b2'],
  ['article:rl-sim2real/parallel-sim-rl',
    'd7d3e9f8532419d409f1b06428ef7fea171925c0706ca4cf5409b40970dfa1bb',
    '16a9970b03691a66d3ad57e002e4875957a185c31515387e279cecb913c04013'],
  ['article:rl-sim2real/legged-locomotion',
    'e531e02d9f41cda0e58185a4db70fff208823776508ae05ebbcbf7bd5270236e',
    '037a9544af297abc1b1e1d7a1ede04d1b612001c90a7525ec1c190b39df7e2e8'],
  ['article:world-models/latent-dynamics',
    'a85d0697bed9de5abba178bb756ec8bf574c7606c2e9052fa8e4f1bb56f74a4b',
    'e549d756bb8b49aeb3f0736327a5c9a0bddec87711d00972789c930b415c154c'],
  ['article:world-models/generative-video',
    '31334d054d21359664e0e084c071ef1e975d694301e8c513ddcdaee68d04f5de',
    '567163089b84a153754a53be294f00e25280ae6dea24c311727348f85b21b8c1'],
  ['article:world-models/generative-sim',
    '4b18ebca49f3165a16d99e7cf26f234067e41ab20c4c2f20da24ca5408e2a32d',
    'fc6578de34784263b16681fcbe5808f494bb9d9753d289752faf886e522a2a86'],
  ['article:classical/kinematics',
    '6384fcd878d487039ac2492bd1090c3e49de43140822fb0f5e8c6ea13b6295ad',
    'b8300ca0b4bd3553fb750c151d08c80056932753754b6a8c63ecdf52ddaa4262'],
  ['article:classical/motion-planning',
    '040f1702175cf8527aaa76ec43be0590301c96ae19242814331f7f06053195c4',
    'a74f0a8a4d1997310fcd85f3a92d2518cd1236e2ad7a7673fdf2ae3752050d84'],
];
// The shared-reader focus repair of 2026-09-28 added the AuthorToggleEarly
// import and mount to the root layout. Every earlier edge for that member
// starts at the sealed hash, so this entry does too.
const sharedReaderLayoutAppends = [
  'shared-reader-20260928-article-metadata-root-layout-author-toggle',
] as const;
// The round-6 prose restores of 2026-09-29 return sentences whose meaning an
// earlier prose pass changed to their audited source wording. Each tuple is
// the member, its endpoint before the restore and its endpoint after it. A
// member whose history already ended in a reconciling resolution gets a new
// resolution from the sealed hash; the others get a plain edge.
const round6ProseRestoreEndpoints: ReadonlyArray<readonly [string, string, string]> = [
  ['article:manipulation/action-chunking',
    'f5176397b03c912dff965b2f0c91354f59723076730a1522ae16b537d005e49e',
    'b5ae41bc08dbcd436221ae13da11a0345f423d804998f22c18a51333a4ad6c5b'],
  ['article:rl-sim2real/humanoid-wbc',
    'eb000da1b9ee4e934f861b6448d6cdf58a38993b91e2208dea2f2ce6d057a74b',
    '2a4a04969819d9d38e75c4ae07d975a1a3fc1ee0f4af833d631c6947c053515e'],
  ['article:rl-sim2real/sim2real-transfer',
    'e2d60b86f053241afc7ddcc3565bb56d4322ccb399c807f0265b80479f6bab9e',
    '281dc1bf11a08eee65687477ea62fd20b84b3513c89329fe87dd30ef3719e7c5'],
  ['article:rl-sim2real/reward-design-mpc',
    '95aeac1878a4aa21e4361bb20cf56438b3ba3ffc4c712743f3eedc78c2abfe29',
    'db56f22183bfa1784a4dad8aef1c9414244c7c7f1c33aba6b816548cd47ad155'],
  ['article:data-hardware/industrial-deployment',
    'd6912e7b80390fcfa1b2430b4fe4b0c3d8f3e01b32ec8cf7259a6800119d32f3',
    'd52ef321eaa188ee867b49f827b0f8445992ed79e8399ee577ffb47b84542249'],
  ['article:frontier/competing-theses',
    'ec8ddfe81684a9e34321102dd6b8543ce47c81018def615e68ad16242e7e6193',
    'cde24c4b7e4837954bd1a539bedad8f5f9b6c0a1144454dbf847f59bc4d01149'],
  ['article:classical/motion-planning',
    'a74f0a8a4d1997310fcd85f3a92d2518cd1236e2ad7a7673fdf2ae3752050d84',
    '2adda289cb9e9894cbd0d2c24b7dca521678b48bd3a6ca80359e423c315b583c'],
];
const round6ProseRestoreAppends = round6ProseRestoreEndpoints.map(
  ([memberId]) => `round6-prose-restores-20260929-prose-${memberId.split('/')[1]}`);
// The round-6 remaining repairs of 2026-09-29 name a rendered control in the
// state-estimation cue and shorten the taxonomy search description in its
// frontmatter and in the module registry. Each tuple is the manifest, the
// member, its endpoint before the repair and its endpoint after it. None of
// these members has a reconciling resolution, so each gets a plain edge.
const round6RemainingRepairEndpoints: ReadonlyArray<readonly [string, string, string, string]> = [
  ['article-metadata', 'article-metadata:world-models/taxonomy',
    '4e12b547a06b9062f0f455222a5e7f117aacac5beabe67b4c21e4ff190ea76f9',
    '78576631a0b0df9778906ba498e6cd917eda3ca078bc3108dd804cf03d7462f8'],
  ['article-metadata', 'canonical-metadata-source:data/modules.ts',
    'cb42852ed8067761ad6c4b2cc9b6181524c34a8952134f793f78acf55ae285e3',
    '2b267908e3aba5449d21c513bfc85fecbc4adf623f0e0b1c7ce098c76c51806a'],
  ['prose', 'article:classical/state-estimation',
    '66ff07c4d8909d3ca2468e0047dce4bf9cf453c18bc5005db836974d036b5532',
    '44e67a418495fda3d5386e3f5f03a80a968f0e1140e744bdf92b215e061cb01e'],
];
const round6RemainingRepairAppends = [
  'round6-remaining-repairs-20260929-article-metadata-taxonomy',
  'round6-remaining-repairs-20260929-article-metadata-modules-taxonomy',
  'round6-remaining-repairs-20260929-prose-state-estimation',
] as const;
// The figure-system pass of 2026-09-30 added a reuse caption after the
// reliability-gap calculator that states its purpose and links to the
// canonical page. That member's history already ended in the round-5
// resolution, so this entry is a resolution from the sealed hash binding all
// twenty-one prior edges.
const opusFigureSystemAppends = [
  'opus-figure-system-20260930-prose-reliability-gap',
] as const;
// The home front page of 2026-09-30 renames five home section headings in
// place, names its new search, contents, tools and fact controls, adds the
// /about/ section names, and removes the home calculator mount and the Spot
// photo. It also retires three names that were additions after the seal: the
// learning-path sections and the "How to read this wiki" heading, which move
// to /about/, and the SO-101 preview figure. The article-truth population
// keeps an added member until a delta removes it, so each removal needs its
// own edge even though the sealed baseline never held the member. Each tuple
// is the manifest, the member, its endpoint before the front page and its
// endpoint after it. None of these members has a reconciling resolution, so
// each gets a plain edge.
const MISSING_MEMBER = sha256('missing');
const opusHomepageEndpoints: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ['home-contents-heading', 'accessible-names', 'literal:app/page.tsx:aria-labelledby:2',
    'acdbc8006700cc532ba7007829d3cd3d7c5297e61eea0949382dba1da870e9f5',
    'ccd04d5dee39d3ee5db06e314867b12a9a2d5de6ef304d1dc82df16f81c2a8e6'],
  ['home-featured-article-heading', 'accessible-names', 'literal:app/page.tsx:aria-labelledby:3',
    '7cda27de2b0f3e1d784762edc699462e8703398bacfd308a8e4437377fbae355',
    '77f862371487e5716bb9898e569697bc8d1a9453df2365c751b57525e8ec5b4f'],
  ['home-featured-scene-heading', 'accessible-names', 'literal:app/page.tsx:aria-labelledby:4',
    'd5ee88ffaeefd0b4422286a3fb2f9266367898228d88833e2ddcc0a9ba60ceea',
    '4e6df5cc8bfb28f3d0930799185bc23f771ca15c7901ca29757db9082a5e5d26'],
  ['home-did-you-know-heading', 'accessible-names', 'literal:app/page.tsx:aria-labelledby:5',
    'b500bfbcf5c9ce21838f59b8fcd611fa2a4bc17ac3012345f706292ec7457e4a',
    '4c95ac413183de6ad06953bb155baf6656c10449b26ad7c4439537aa753fb52f'],
  ['home-recently-updated-heading', 'accessible-names', 'literal:app/page.tsx:aria-labelledby:6',
    '755c1ddaf3f64ac76aed1e7740bc360a5c3e80efe826cfc601cbc03fe07fb555',
    '985f09c0639c4e7d7690758a85828fe74d4bfbcee72618a42672f598a8ef27e4'],
  ['home-tools-label', 'accessible-names', 'literal:app/page.tsx:aria-label:7', MISSING_MEMBER,
    '2eed6d92f337738d98b9252bce897f357e8bb283ec89167d3b2a0b6863f54b42'],
  ['home-search-form', 'accessible-names', 'literal:components/home/home-search.tsx:aria-label:1',
    MISSING_MEMBER, 'da7935abdbb535a75c52310f242642636378c7ffbb62d38d84e5d756c3f7c21b'],
  ['home-search-input', 'accessible-names', 'literal:components/home/home-search.tsx:aria-label:2',
    MISSING_MEMBER, 'c15234e752dded73685e2dcd70b7a3b41bccc9c9f85e79ec3f719d24fc17d400'],
  ['contents-domain-list', 'accessible-names', 'expression:components/home/contents-index.tsx:aria-label:1',
    MISSING_MEMBER, 'a6a9ae11b4b97c8752583893eaece89f443e17dc87e38d40f3036b8780b3e429'],
  ['did-you-know-cite-title', 'accessible-names', 'expression:components/home/did-you-know.tsx:title:1',
    MISSING_MEMBER, '72d6213d7ad6a4cc1dc537c171a5bc752c66da10855bbf7484ea0cacb24d70ac'],
  ['about-reading-heading', 'accessible-names', 'literal:app/about/page.tsx:aria-labelledby:1',
    MISSING_MEMBER, 'b2bf08609621dbfc56c52dc6473dc1f54d011fe0e55cf58f48afe57ed0462b9a'],
  ['about-paths-heading', 'accessible-names', 'literal:app/about/page.tsx:aria-labelledby:2',
    MISSING_MEMBER, 'ae9fe1fbf6d61c3c84317bf992209e4d727c89946db22c069b71a9f16b20c986'],
  ['about-reading-path', 'accessible-names', 'expression:app/about/page.tsx:aria-labelledby:1',
    MISSING_MEMBER, '08cb5e560781f025d07c603b73db512651ded5c76267e5e03496eb4548374f71'],
  ['spot-raf-agile-liberty-2021', 'assets-svg', 'registered-image:spot-raf-agile-liberty-2021',
    'f1c63995d8ca06f8bc1a584b3852531fe72f79aabd04baca9672a66b54e3b761', MISSING_MEMBER],
  ['home-reliability-compounding', 'interactive-sources-mounts', 'mount:app/page.tsx:ReliabilityCompounding:1',
    'be36fd2a0180825addfdd2192ef840b33d5a7f79846022b05d84436767cd3adf', MISSING_MEMBER],
  ['home-learning-path-sections', 'accessible-names', 'expression:app/page.tsx:aria-labelledby:1',
    '47812abac73c4ebb2ca2098f1c0a8cae4954529589ee2828be57f64069ae9036', MISSING_MEMBER],
  ['home-how-to-read-heading', 'accessible-names', 'literal:app/page.tsx:aria-labelledby:7',
    '96e1a60786314f4a3a4c46d46491c14fea4c791cf8aac4eb90f1f94ffde2d12b', MISSING_MEMBER],
  ['so101-chain-preview', 'accessible-names', 'expression:components/home/so101-chain-preview.tsx:aria-label:1',
    '9712784f324b174e820d00ff0098bfe9afe89ea5e1ff2983c28b53f5c7602f7b', MISSING_MEMBER],
];
const opusHomepageAppends = opusHomepageEndpoints.map(([slug, manifest]) =>
  `opus-homepage-20260930-${manifest === 'interactive-sources-mounts' ? 'mounts' : manifest}-${slug}`);
// The figure migration of 2026-10-01 moved the remaining article figures onto
// the shared figure frame. It removed the figures that a prediction step
// repeated (dropping three of those steps), merged the scene-plus-lab pairs,
// typeset four equations without loose KaTeX SVGs, drew the two original
// schematics inline, named the one plot that now holds the three execution
// modes' panels, and re-ordered or renamed the accessible names, default
// expressions and not-disclosed text sites of the instruments it redrew.
// Each tuple is the slug, the manifest, the member and its endpoint before
// the migration. A member whose history already ended in a reconciling
// resolution gets a resolution from the sealed hash; the others get a plain
// edge from that endpoint. The tuples pin only the earlier endpoint: the
// baseline gate checks the current bytes of every member against the tree.
const opusFigureMigrationEndpoints: ReadonlyArray<readonly [string, string, string, string]> = [
  ['action-conditioning-expression-aria-label-1', 'accessible-names', 'expression:components/interactive/action-conditioning.tsx:aria-label:1',
    '4dc263e6a13e5886fbbfbcdaf0da7c6526b9409e66ef6ec0b14bfa3c99406992'],
  ['action-conditioning-expression-aria-label-2', 'accessible-names', 'expression:components/interactive/action-conditioning.tsx:aria-label:2',
    '331448d655ed78fb47e8a8fbb99e31a756768cb4140ffcac5d68819cf7ff768b'],
  ['action-conditioning-expression-aria-label-4', 'accessible-names', 'expression:components/interactive/action-conditioning.tsx:aria-label:4',
    '5b3fb08471bdbfd31c2e1fe41a3eb39e2cc984bf4fbe9f6f38ae5f1c7feb1b5b'],
  ['appearance-physics-push-expression-aria-label-1', 'accessible-names', 'expression:components/interactive/appearance-physics-push.tsx:aria-label:1',
    '443b1843e06bad68eef6a43c7d677445c57df83d95573c8d533b6a77061054d1'],
  ['appearance-physics-push-expression-aria-label-2', 'accessible-names', 'expression:components/interactive/appearance-physics-push.tsx:aria-label:2',
    '6cf78c9f1e33805cc078c4824d15cdd2113a695c3c72e5e7fd330467daa04169'],
  ['deployment-economics-expression-aria-label-1', 'accessible-names', 'expression:components/interactive/deployment-economics.tsx:aria-label:1',
    'e2f403af501cf8676da660787aceb6c3d44cae1557688ecc685476142c033527'],
  ['deployment-economics-expression-aria-label-2', 'accessible-names', 'expression:components/interactive/deployment-economics.tsx:aria-label:2',
    'b7a1bbfb6a7dcc6a4c4719f331bbe0b64d206999e4a2b9d9921b969ae7032895'],
  ['generalist-release-timeline-expression-aria-label-1', 'accessible-names', 'expression:components/interactive/generalist-release-timeline.tsx:aria-label:1',
    'b51dd847011dc6c17e8c9f69746fc75d063910d2db37aec6cead04f75b4b0357'],
  ['generalist-release-timeline-expression-aria-label-2', 'accessible-names', 'expression:components/interactive/generalist-release-timeline.tsx:aria-label:2',
    '86256fe5ef275859890a57fbc0ce09c0714c67ee4224af7975cd4598d7a2f418'],
  ['latent-imagination-expression-aria-label-1', 'accessible-names', 'expression:components/interactive/latent-imagination.tsx:aria-label:1',
    '86527a72fcad380278b7105f0f17c2d9bc702d18ae5c44872e8673d117ec8d7e'],
  ['latent-imagination-expression-aria-label-2', 'accessible-names', 'expression:components/interactive/latent-imagination.tsx:aria-label:2',
    'f1d3a8209b7ebb87c7f3a9de868d887e35fe1ccdd17bef3fca06a5dbab96e72e'],
  ['latent-imagination-expression-aria-label-3', 'accessible-names', 'expression:components/interactive/latent-imagination.tsx:aria-label:3',
    'cbd9f5fbd27779d5e7d2074a7f29d30b7e387739b7e5f8f2bef54c66bc099ca4'],
  ['latent-imagination-expression-aria-label-4', 'accessible-names', 'expression:components/interactive/latent-imagination.tsx:aria-label:4',
    'd5d4358ab2602a7ea24ef62934c64166dd0245a26bfbab9285d5e6a7c2b52346'],
  ['pi-generation-timeline-expression-aria-label-1', 'accessible-names', 'expression:components/interactive/pi-generation-timeline.tsx:aria-label:1',
    '0fae35ab6525bf34f9fb9800d94ebaf4ea1a261295eea8ecf54b29d277517774'],
  ['pi-generation-timeline-expression-aria-label-2', 'accessible-names', 'expression:components/interactive/pi-generation-timeline.tsx:aria-label:2',
    '377f4623c8c930c91a9f58373600a927d43548b2fe9a84db6e42f4753cb2c52b'],
  ['reliability-compounding-expression-aria-label-3', 'accessible-names', 'expression:components/interactive/reliability-compounding.tsx:aria-label:3',
    'd055f79f38588f140bfd44a2b8f43205bec6223b9d050a51ee0e3f5ef9698ba5'],
  ['reliability-compounding-expression-aria-label-4', 'accessible-names', 'expression:components/interactive/reliability-compounding.tsx:aria-label:4',
    MISSING_MEMBER],
  ['reliability-compounding-expression-aria-label-5', 'accessible-names', 'expression:components/interactive/reliability-compounding.tsx:aria-label:5',
    MISSING_MEMBER],
  ['reliability-compounding-expression-aria-labelledby-3', 'accessible-names', 'expression:components/interactive/reliability-compounding.tsx:aria-labelledby:3',
    MISSING_MEMBER],
  ['reward-shaping-expression-aria-label-2', 'accessible-names', 'expression:components/interactive/reward-shaping.tsx:aria-label:2',
    '045632e1fbde9b2ac65ab659b94c7989407bdc5e9b06895ddd5488e4e1670f44'],
  ['reward-shaping-expression-aria-label-3', 'accessible-names', 'expression:components/interactive/reward-shaping.tsx:aria-label:3',
    'c69ac205d266028aa32bfa55ee57a76a77b8f6213b8cb17a46af172ed6b7ba35'],
  ['wbc-decomposition-expression-aria-label-1', 'accessible-names', 'expression:components/interactive/wbc-decomposition.tsx:aria-label:1',
    'f6e2703e94768c6120e4726775cde23f6b87836dd2a8d4c0a05bfe0d75920f7d'],
  ['figure-expression-alt-2', 'accessible-names', 'expression:components/ui/figure.tsx:alt:2',
    MISSING_MEMBER],
  ['original-schematics-expression-aria-label-1', 'accessible-names', 'expression:components/ui/original-schematics.tsx:aria-label:1',
    MISSING_MEMBER],
  ['original-schematics-expression-aria-label-2', 'accessible-names', 'expression:components/ui/original-schematics.tsx:aria-label:2',
    MISSING_MEMBER],
  ['action-conditioning-literal-aria-label-1', 'accessible-names', 'literal:components/interactive/action-conditioning.tsx:aria-label:1',
    '9608eeb481783e41ed5f06a54f2ad09a6572dea7627666791aff5a62feb46e46'],
  ['action-conditioning-literal-aria-label-2', 'accessible-names', 'literal:components/interactive/action-conditioning.tsx:aria-label:2',
    '1a29d2f65f02a77dc01a071ecbe584663400b5e00d2fa3a97421b6e524fd16a0'],
  ['deployment-economics-literal-title-1', 'accessible-names', 'literal:components/interactive/deployment-economics.tsx:title:1',
    '8689434648b0b24a7433db350fcd1813f5fe5f3dbad100e0f9eb83c50fd7fe13'],
  ['deployment-economics-literal-title-2', 'accessible-names', 'literal:components/interactive/deployment-economics.tsx:title:2',
    'a5027a7b7cb37667a8c522f9eb031b58588581aa7832c1505e26964ed98e0614'],
  ['deployment-economics-literal-title-3', 'accessible-names', 'literal:components/interactive/deployment-economics.tsx:title:3',
    'a97d4eb60721e476589bd61f1099ccaa907b593ded5869a9248cf5ae71d40e8c'],
  ['control', 'prose', 'article:classical/control',
    '7ae2310f358c571397744a43cde65fe2ea18e6b924053b66b33deb0136f747e8'],
  ['kinematics', 'prose', 'article:classical/kinematics',
    'b8300ca0b4bd3553fb750c151d08c80056932753754b6a8c63ecdf52ddaa4262'],
  ['motion-planning', 'prose', 'article:classical/motion-planning',
    '2adda289cb9e9894cbd0d2c24b7dca521678b48bd3a6ca80359e423c315b583c'],
  ['perception', 'prose', 'article:classical/perception',
    '705982adff6141e5b24f3472f6c6fa9a0a4a7ab508637b7d8587bd5a267c4685'],
  ['ros2-for-ml-engineers', 'prose', 'article:classical/ros2-for-ml-engineers',
    'd68d9ca5c0cb992207f7e9e9b67bda3623a87d6b5ac6c896b1bbf5ab5470484d'],
  ['data-bottleneck', 'prose', 'article:data-hardware/data-bottleneck',
    '2a399628a0d3d47c483619e0563664aa50e82ca704050c69ccb7d44a73f8a161'],
  ['evaluation-crisis', 'prose', 'article:data-hardware/evaluation-crisis',
    '58eb66a343de12e685e540f7840313f33b841fa233b26462d428b2a298459557'],
  ['generalization', 'prose', 'article:frontier/generalization',
    'eea78a462a9118f10e46b7f310674ef7a25fb91190f456056c9918582531dc6e'],
  ['reliability-gap', 'prose', 'article:frontier/reliability-gap',
    'ec938d42bd87814a5ef1f3c3808a4fbc645107b4e94e6a822646a0465610a063'],
  ['action-chunking', 'prose', 'article:manipulation/action-chunking',
    'b5ae41bc08dbcd436221ae13da11a0345f423d804998f22c18a51333a4ad6c5b'],
  ['bc-foundations', 'prose', 'article:manipulation/bc-foundations',
    '463dec3caf678be3dff663a707008974a41944c1a273e6929b9dbbb7b9253559'],
  ['realtime-execution', 'prose', 'article:manipulation/realtime-execution',
    '241fbcd0e0966f7c2481e1c1a519e9e0a2d953d6b87b79fdfb61d64c257a01d7'],
  ['legged-locomotion', 'prose', 'article:rl-sim2real/legged-locomotion',
    '037a9544af297abc1b1e1d7a1ede04d1b612001c90a7525ec1c190b39df7e2e8'],
  ['parallel-sim-rl', 'prose', 'article:rl-sim2real/parallel-sim-rl',
    '16a9970b03691a66d3ad57e002e4875957a185c31515387e279cecb913c04013'],
  ['sim2real-transfer', 'prose', 'article:rl-sim2real/sim2real-transfer',
    '281dc1bf11a08eee65687477ea62fd20b84b3513c89329fe87dd30ef3719e7c5'],
  ['generative-sim', 'prose', 'article:world-models/generative-sim',
    'fc6578de34784263b16681fcbe5808f494bb9d9753d289752faf886e522a2a86'],
  ['generative-video', 'prose', 'article:world-models/generative-video',
    '567163089b84a153754a53be294f00e25280ae6dea24c311727348f85b21b8c1'],
  ['latent-dynamics', 'prose', 'article:world-models/latent-dynamics',
    'e549d756bb8b49aeb3f0736327a5c9a0bddec87711d00972789c930b415c154c'],
  ['control-pendulum-controller-1', 'interactive-sources-mounts', 'mount:content/classical/control.mdx:PendulumController:1',
    '7d12de5f291052f9cc5ef6ffb9e80152c72f2b0507f315b1da12c5ecfe867669'],
  ['control-pendulum-controller-2', 'interactive-sources-mounts', 'mount:content/classical/control.mdx:PendulumController:2',
    '2258a1ef4c92d421c2dbdf35b354dd2644b0111ed31b0be0eee3569c9643f43f'],
  ['data-bottleneck-data-scale-chart-1', 'interactive-sources-mounts', 'mount:content/data-hardware/data-bottleneck.mdx:DataScaleChart:1',
    '462c50a7395f33d2d3d68218b9cfa11a70b5211431818a63417df7af3c579720'],
  ['data-bottleneck-data-scale-chart-2', 'interactive-sources-mounts', 'mount:content/data-hardware/data-bottleneck.mdx:DataScaleChart:2',
    'e4a9a7c62b9e5d3b82e4be1966a79ee74a7271e5700d606299378381b56a307b'],
  ['evaluation-crisis-reliability-compounding-1', 'interactive-sources-mounts', 'mount:content/data-hardware/evaluation-crisis.mdx:ReliabilityCompounding:1',
    'e3e0240306c18f4ad2c85008a359d364a5bfdbb0911b2b5b9a4ffe57bf7a1ee1'],
  ['evaluation-crisis-reliability-compounding-2', 'interactive-sources-mounts', 'mount:content/data-hardware/evaluation-crisis.mdx:ReliabilityCompounding:2',
    '33e76cc931302a87529e3ac96f0132d7511933e0ea443ae04cecf87e97e0d710'],
  ['generalization-ego-scale-scaling-1', 'interactive-sources-mounts', 'mount:content/frontier/generalization.mdx:EgoScaleScaling:1',
    '4ed83fc83f4bb1692dcd7b187c8c492628a7fbf49bef7f6176e034f2e610cd6c'],
  ['generalization-ego-scale-scaling-2', 'interactive-sources-mounts', 'mount:content/frontier/generalization.mdx:EgoScaleScaling:2',
    '4344a63b3ccab815b75d75997e6688dd0767b4ba5e6006e8067e8b82e61eb72e'],
  ['reliability-gap-reliability-compounding-1', 'interactive-sources-mounts', 'mount:content/frontier/reliability-gap.mdx:ReliabilityCompounding:1',
    'fec9de380fe0dc5409d3d642226d87dcd98b983c6711e04907ad664b5bfcca41'],
  ['action-chunking-latency-comparison-2', 'interactive-sources-mounts', 'mount:content/manipulation/action-chunking.mdx:LatencyComparison:2',
    '067c218062a6f15031a7f5cb207f9a52c9bdd19c756d81c681957d4b4c814d0b'],
  ['bc-foundations-compounding-error-1', 'interactive-sources-mounts', 'mount:content/manipulation/bc-foundations.mdx:CompoundingError:1',
    '86dc418850eda7bb2f68b90248cf02f8dd734772ec957efe9fb4065711f059cd'],
  ['bc-foundations-compounding-error-2', 'interactive-sources-mounts', 'mount:content/manipulation/bc-foundations.mdx:CompoundingError:2',
    'ebfabe16f371c8d3155004c66c0a141ea9d1d0d7054f98d65e7f0ac349e6d322'],
  ['realtime-execution-control-loop-budget-2', 'interactive-sources-mounts', 'mount:content/manipulation/realtime-execution.mdx:ControlLoopBudget:2',
    '1defcee721aae9f56ce0d16dd004efae738a68a81d70e96638953d80eed64a39'],
  ['legged-locomotion-gait-diagram-1', 'interactive-sources-mounts', 'mount:content/rl-sim2real/legged-locomotion.mdx:GaitDiagram:1',
    '50d29b47a8de4ea7ee36238215301698ec7eb03f06464233def4cbf4dd57a26e'],
  ['parallel-sim-rl-training-time-chart-1', 'interactive-sources-mounts', 'mount:content/rl-sim2real/parallel-sim-rl.mdx:TrainingTimeChart:1',
    '74ca645f0431b43a78b294abb29b451d56373b7e468052d6699cbbe99d256a1f'],
  ['sim2real-transfer-friction-transfer-2', 'interactive-sources-mounts', 'mount:content/rl-sim2real/sim2real-transfer.mdx:FrictionTransfer:2',
    '12297c9fe3c4da32aacc7f79046c19669e0cf3345b172beca17c64b632995067'],
  ['action-conditioning-5', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:5',
    '39ad7542afd166e7c740a183bada68ab93b7dd53ee500b276864cb5fd82ac721'],
  ['action-conditioning-6', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:6',
    '07373f895c154e0d4599cf7dd036f3fb2a7bc59cea2c35a64d10f63fa598d8c5'],
  ['action-conditioning-7', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:7',
    '1ec1fed39d19125ef28a2e53ed2f8985fba34d8af1dd89306b78183fa4928fcd'],
  ['action-conditioning-8', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:8',
    'fe6601d58dc91aeb05505a86996ee7b7b7b109f2835e86c801a60dd19e01fab3'],
  ['action-conditioning-9', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:9',
    '3984680da5ea1f940021255bc468a1b9eed9e4f84f0c03f2cf3906b919bbffd2'],
  ['action-conditioning-10', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:10',
    '33e0963270fae11a19789ad9678eefeb7def2a3bf6d662e2b9a0079968e54d5a'],
  ['action-conditioning-11', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:11',
    'fe6601d58dc91aeb05505a86996ee7b7b7b109f2835e86c801a60dd19e01fab3'],
  ['action-conditioning-12', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:12',
    '3984680da5ea1f940021255bc468a1b9eed9e4f84f0c03f2cf3906b919bbffd2'],
  ['action-conditioning-13', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:13',
    '33e0963270fae11a19789ad9678eefeb7def2a3bf6d662e2b9a0079968e54d5a'],
  ['action-conditioning-14', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:14',
    '641508bcad67ec03a04a23f3dc75a82ffe73c885df7b121faf23f8903d1e3535'],
  ['action-conditioning-15', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:15',
    MISSING_MEMBER],
  ['action-conditioning-16', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:16',
    MISSING_MEMBER],
  ['action-conditioning-17', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:17',
    MISSING_MEMBER],
  ['action-conditioning-18', 'behavioral-defaults', 'default:components/interactive/action-conditioning.tsx:18',
    MISSING_MEMBER],
  ['collaborative-operation-modes-4', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:4',
    '76639607fc6dc92d339337962aea18f429814636c7da864a4969e695b3119851'],
  ['collaborative-operation-modes-5', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:5',
    'bd4805c549cffffd447d370cf33ed4a14f5d1b60476c4e390e8432314862aa09'],
  ['collaborative-operation-modes-6', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:6',
    '50dba3e8d725157cdb902dc3981c83ae2124cbfe9a64a2005c4abad73720d2a4'],
  ['collaborative-operation-modes-7', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:7',
    '76639607fc6dc92d339337962aea18f429814636c7da864a4969e695b3119851'],
  ['collaborative-operation-modes-8', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:8',
    'bd4805c549cffffd447d370cf33ed4a14f5d1b60476c4e390e8432314862aa09'],
  ['collaborative-operation-modes-9', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:9',
    '50dba3e8d725157cdb902dc3981c83ae2124cbfe9a64a2005c4abad73720d2a4'],
  ['collaborative-operation-modes-10', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:10',
    '429bf69654fa9ec5f7ce5ab728af8ccc61d259c4600b97ff9ae481a2f2f0f5d3'],
  ['collaborative-operation-modes-11', 'behavioral-defaults', 'default:components/interactive/collaborative-operation-modes.tsx:11',
    'f6d22dc4120c1310e79662f0d2bab37763e5d5b43df43c451b2ef04ef6a16e40'],
  ['cross-embodiment-strategies-1', 'behavioral-defaults', 'default:components/interactive/cross-embodiment-strategies.tsx:1',
    'a92a8525520cb2b3e5e5f02c276a8e0e323688ec4ac2a91e874b59e4a83c064b'],
  ['thesis-explorer-3', 'behavioral-defaults', 'default:components/interactive/thesis-explorer.tsx:3',
    'c280ffb7c8939a9f1e560a633dd969887331ac6e80e2b2ba0e27fc3f60d561f7'],
  ['wbc-decomposition-5', 'behavioral-defaults', 'default:components/interactive/wbc-decomposition.tsx:5',
    '43eb18aaacd1951fdf9ad0e514fad9e5beed5cc362659b3785c58923386301d2'],
  ['comparison-matrix-not-disclosed-4', 'value-states', 'state-site:components/interactive/comparison-matrix.tsx:not-disclosed:4',
    MISSING_MEMBER],
  ['hand-comparison-not-disclosed-3', 'value-states', 'state-site:components/interactive/hand-comparison.tsx:not-disclosed:3',
    '87746674a9c7a0d2a93dfe598377ed6b3541a50b0770e8d28d74c652ccf92046'],
  ['execution-modes-literal-aria-label-1', 'accessible-names', 'literal:components/interactive/execution-modes.tsx:aria-label:1',
    MISSING_MEMBER],
];
const opusFigureMigrationAppends = opusFigureMigrationEndpoints.map(([slug, manifest]) =>
  `opus-figure-migration-20261001-${manifest}-${slug}`);
const opusFigureMigrationEdges = (manifest: string, memberId: string) => opusFigureMigrationAppends
  .filter((_, index) => opusFigureMigrationEndpoints[index][1] === manifest
    && opusFigureMigrationEndpoints[index][2] === memberId);
// The 2026-10-01 KOL backlog batch appends, per domain commit, one plain edge
// for each changed article member and new citation, and one resolution for
// the shared citation rendering.
const kolBacklogAppends = [
  ...['frontmatter-evaluation', 'frontmatter-model-based-robot-learning', 'citation-rendering',
    'citation-excavator-mbrl-2026', 'citation-insertion-world-models-2026', 'citation-simfoundry-2026',
    'prose-evaluation', 'prose-model-based-robot-learning', 'relationships-evaluation',
    'relationships-model-based-robot-learning'].map(suffix => `kol-backlog-20261001-world-models-${suffix}`),
  ...['frontmatter-autonomous-vehicles', 'citation-rendering', 'citation-paxton-autonomous-trucks-2026',
    'prose-autonomous-vehicles', 'relationships-autonomous-vehicles'].map(suffix => `kol-backlog-20261001-adjacent-${suffix}`),
  ...['frontmatter-cross-embodiment', 'frontmatter-foundation-models', 'citation-rendering',
    'citation-dreamzero-2026', 'citation-morphometric-imitation-2026', 'prose-cross-embodiment',
    'prose-foundation-models', 'relationships-cross-embodiment',
    'relationships-foundation-models'].map(suffix => `kol-backlog-20261001-manipulation-${suffix}`),
  ...['frontmatter-dexterity', 'citation-rendering', 'citation-chord-2026', 'citation-t-rex-2026',
    'citation-trace-cables-2026', 'prose-dexterity',
    'relationships-dexterity'].map(suffix => `kol-backlog-20261001-frontier-${suffix}`),
];
// The 2026-10-02 SEO pass appends one entry per article-truth member it
// moved, in manifest order: 49 rewritten leads, the logo and clip-poster alt
// texts, the related-article lists of all 57 published articles, and one
// resolution for the citation labels.
const seoPassArticles = Object.entries({
  adjacent: ['autonomous-vehicles', 'drones', 'space', 'surgical'],
  classical: ['calibration', 'control', 'grasp-planning', 'kinematics', 'motion-planning', 'perception',
    'ros2-for-ml-engineers', 'scene-representation', 'state-estimation'],
  'data-hardware': ['data-bottleneck', 'datasets', 'evaluation-crisis', 'hardware-taxonomy',
    'industrial-deployment', 'robot-learning-stack', 'teleop-rigs'],
  frontier: ['bear-case', 'competing-theses', 'dexterity', 'generalization', 'reliability-gap',
    'safety-and-assurance'],
  manipulation: ['action-chunking', 'action-spaces', 'bc-foundations', 'comparison-matrix', 'cross-embodiment',
    'diffusion-policy', 'foundation-models', 'generalist-policies', 'hierarchical', 'knowledge-insulation',
    'pi-line', 'realtime-execution', 'rl-finetuning', 'robot-learning-roadmap', 'vla-models'],
  'rl-sim2real': ['humanoid-wbc', 'legged-locomotion', 'offline-rl', 'parallel-sim-rl', 'reward-design-mpc',
    'rl-for-robotics', 'sim2real-transfer', 'why-rl-locomotion'],
  'world-models': ['evaluation', 'generative-sim', 'generative-video', 'jepa', 'latent-dynamics',
    'model-based-robot-learning', 'taxonomy', 'world-models-vs-simulators'],
}).flatMap(([domain, slugs]) => slugs.map(slug => `${domain}/${slug}`));
const seoPassUnchangedLeads = ['adjacent/autonomous-vehicles', 'adjacent/surgical', 'classical/ros2-for-ml-engineers',
  'data-hardware/robot-learning-stack', 'manipulation/action-spaces', 'manipulation/bc-foundations',
  'manipulation/foundation-models', 'rl-sim2real/rl-for-robotics'];
const seoPassAppends = [
  ...seoPassArticles.filter(id => !seoPassUnchangedLeads.includes(id))
    .map(id => `seo-pass-20261002-prose-${id.replace('/', '-')}`),
  'seo-pass-20261002-accessible-names-company-logo-alt',
  'seo-pass-20261002-accessible-names-clip-poster-alt',
  ...seoPassArticles.map(id => `seo-pass-20261002-relationships-${id.replace('/', '-')}`),
  'seo-pass-20261002-citation-rendering',
];
// The 2026-10-02 reader-first figure pass appends its block: first the
// shared preset group's accessible name, which borrows the label it prints
// above its buttons, then one edge per article and accessible name each
// rewritten figure moved, batch by batch. The how-robots-work page, merged
// after those batches, appends its block, and the 2026-10-03 manipulation
// batch of the same pass appends its own block after that.
const readerFirstAppends = merged.filter(x => x.id.startsWith('reader-first-20261002-')).map(x => x.id);
const readerFirstManipulationAppends = merged
  .filter(x => x.id.startsWith('reader-first-20261003-')).map(x => x.id);
const allReaderFirstAppends = [...readerFirstAppends, ...readerFirstManipulationAppends];
// The 2026-10-05 KOL backlog batch appends its block last, per domain commit
// in the same shape as the 2026-10-01 batch: plain edges for each changed
// article member and new citation, a resolution where a chain already holds
// one, and one resolution for the shared citation rendering.
const kolBacklog20261005Appends = merged.filter(x => x.id.startsWith('kol-backlog-20261005-')).map(x => x.id);
// The 2026-10-05 explainer work on /how-robots-work/ appends its block after
// that: the accessible names its page markup gained after the page shipped.
const howRobotsWork20261005Appends = [
  'how-robots-work-20261005-accessible-names-explainers-as-text',
  'how-robots-work-20261005-accessible-names-poster-alt',
];
// The 2026-10-06 opus-pass domain passes append theirs after that, one block
// per article group, in the same shape as the KOL backlog batch.
const domainPass20261006Appends = merged.filter(x => x.id.startsWith('domain-pass-20261006-')).map(x => x.id);
// The 2026-10-07 classical pass, continued on 2026-10-08, appends its block
// after that, in commit order: the accessible names its reader-first figure
// rewrites moved, the prose edges of articles that mount a new figure, the
// edges its text and registry fixes move, and the plain-words rework that
// followed its five-second reader tests.
const classicalPass20261007Appends = merged
  .filter(x => /^(reader-first|figure-mounts|domain-pass)-2026100[78]-/.test(x.id)).map(x => x.id);
// The 2026-10-09 overdue KOL queue step appends its block last, in the
// domain-pass layer's shape: prose, relationships and frontmatter edges for
// dexterity and generative video, one citation-rendering resolution and one
// edge per new citation record.
const kolQueue20261009Appends = merged.filter(x => x.id.startsWith('domain-pass-20261009-kol-')).map(x => x.id);
// The 2026-10-09 rl-sim2real pass appends its block after that, for members
// its domain-pass block (g9) does not already carry: one plain edge per
// member from its last approved endpoint.
const rlPass20261009Appends = merged.filter(x => x.id.startsWith('rl-sim2real-pass-20261009-')).map(x => x.id);
// The 2026-10-11 rl-sim2real figure batch appends its block next: one prose
// edge per article that mounts a new figure (a reconciling resolution where
// the member's history already carries one) and one edge from an absent
// seal per new figure name.
const rlFigures20261011Appends = merged.filter(x => x.id.startsWith('rl-sim2real-figures-20261011-')).map(x => x.id);
// The 2026-10-10 site-foundation re-skin (owner decision: the Pantheon
// research-page standard) appends its block after that: one plain edge per
// accessible name or metadata source the new top bar, contents rail,
// eyebrow trail, fonts and masthead moved, from its last approved endpoint.
const reskin20261010Appends = merged.filter(x => x.id.startsWith('pantheon-reskin-20261010-')).map(x => x.id);
// The world-models pass appends its block next, in the domain-pass layer's
// shape: prose, relationships and frontmatter edges for the eight
// world-models articles, one citation-rendering resolution and one edge per
// new or corrected citation record. Each member continues from its last
// approved endpoint, or restarts from the seal with a resolution where its
// chain already holds one.
const worldModelsPass20261010Appends = merged
  .filter(x => x.id.startsWith('world-models-pass-20261010-')).map(x => x.id);
// The 2026-10-12 KOL triage batch appends its block next, in the same shape:
// prose, relationships and frontmatter edges for the ten articles it adds
// dated paragraphs to, one citation-rendering resolution and one edge per new
// citation record.
const kolQueue20261012Appends = merged.filter(x => x.id.startsWith('domain-pass-20261012-kol-')).map(x => x.id);
// The 2026-10-10 frontier pass lands after that batch and appends its block
// last, in the same shape: prose, relationships and frontmatter edges for the
// five frontier pass articles and dexterity's primary-source frontmatter, the
// glossary and citation-rendering resolutions, and one edge per new citation
// record.
const frontierPass20261010Appends = merged
  .filter(x => x.id.startsWith('frontier-pass-20261010-')).map(x => x.id);
// The first isometric figure landing of 2026-10-12 (owner directive: every
// concept figure redrawn with the isometric figure kit in components/iso)
// lands after the frontier pass and appends its block last: one plain edge
// per accessible name or behavioral default its eleven redrawn figures and
// the kit's IsoFigure moved, from the member's last approved endpoint, the
// seal, or an absent seal.
const anatomy20261012Appends = merged
  .filter(x => x.id.startsWith('anatomy-figures-20261012-')).map(x => x.id);
// The world-models length cut of 2026-10-12 (owner directive of 2026-10-12
// 16:50: "ensure we remove AI slop etc and keep it extremely premium. not too
// long text.", with the same day's length decision) lands after the first
// isometric figure landing and appends its block last: one prose edge per
// world-models article it cut, then one relationships edge per article, each
// from the member's last approved endpoint, or one resolution from the seal
// where the member's chain already holds one. The world-models length-cut
// continuity review lists what each article dropped.
const worldModelsLengthCut20261012Appends = merged
  .filter(x => x.id.startsWith('length-cut-20261012-world-models-')).map(x => x.id);
// The second isometric figure landing of 2026-10-12 (the data-hardware,
// adjacent and frontier figure batches, under the same owner directive)
// lands after the world-models length cut and appends its block last: one edge per accessible
// name, behavioral default, interactive source or mount, or article body its
// seven figures moved, from the member's last approved endpoint, the seal,
// an absent seal, or as one resolution where the member's chain holds one.
const anatomy2Figures20261012Appends = merged
  .filter(x => x.id.startsWith('anatomy-2-figures-20261012-')).map(x => x.id);
// The front-page featured landing of 2026-10-13 (owner session: the
// featured article pinned to the world-models taxonomy with a dek written
// for home, and the featured scene replaced by the humanoid explainer from
// How robots work) appends its block next: one edge from an absent seal per
// accessible name the new featured scene adds.
const homeFeatured20261013Appends = merged
  .filter(x => x.id.startsWith('home-featured-20261013-')).map(x => x.id);
// The frontier length cut of 2026-10-13 (the same owner directive and length
// decision, applied to the five frontier articles the frontier domain pass
// shortened) appends its block next: one prose edge per article it cut, then
// one relationships edge per article whose inline citations it changed, each
// from the member's last approved endpoint, or one resolution from the seal
// where the member's chain already holds one. The frontier length-cut
// continuity review lists what each article dropped and the two component
// blocks it corrected.
const frontierLengthCut20261013Appends = merged
  .filter(x => x.id.startsWith('length-cut-20261013-frontier-')).map(x => x.id);
// The 2026-10-12 humanize pass (owner instruction of 12 October 2026:
// "ensure we remove AI slop etc and keep it extremely premium. not too long
// text.", with the same day's length decision) lands after the front-page
// featured landing and the frontier length cut and appends its block next,
// domain by domain (manipulation, classical, rl-sim2real): one prose edge per
// article it cut, then one relationships edge per article, each from the
// member's last approved endpoint, or one resolution from the seal where the
// member's chain already holds one. The length-cut continuity review lists
// what each article dropped.
const humanize20261012Appends = merged
  .filter(x => x.id.startsWith('humanize-20261012-')).map(x => x.id);
// The third isometric figure landing of 2026-10-13 (the manipulation and
// rl-sim2real b02 figure batches, under the owner directive of 2026-10-12)
// lands after the humanize pass and appends its block last: one edge per
// accessible name its six redrawn figures moved, from the member's last
// approved endpoint or the seal.
const anatomy3Figures20261013Appends = merged
  .filter(x => x.id.startsWith('anatomy-3-figures-20261013-')).map(x => x.id);
// Images bundle A of 2026-10-13 (owner directive of 11 October 2026: "i
// also want to use proper images etc! [...] license free images to accompany
// the articles etc. like wikipedia") lands after the third isometric figure
// landing and appends its block last: one prose edge per manipulation,
// world-models, classical and rl-sim2real article that gained image mounts,
// each from the member's last approved endpoint or one resolution from the
// seal where the member's chain already holds one, then one edge from an
// absent seal per registered image it added. The image-mount continuity
// review rebuilds each article's earlier bytes.
const imagesA20261013Appends = merged
  .filter(x => x.id.startsWith('images-a-20261013-')).map(x => x.id);
// The frontier length cut of 2026-10-14 (the same owner directive and length
// decision, applied to dexterity, the frontier article the 2026-10-13 cut left
// for later) lands after images bundle A and appends its block last: one prose
// resolution from the seal, one relationships edge from the member's last
// approved endpoint, and one value-states edge that closes the article's only
// sealed "not disclosed" render site. The frontier length-cut continuity
// review lists what the article dropped.
const frontierLengthCut20261014Appends = merged
  .filter(x => x.id.startsWith('length-cut-20261014-frontier-')).map(x => x.id);
const laterThanSeoPass = [...allReaderFirstAppends, ...kolBacklog20261005Appends, ...howRobotsWork20261005Appends,
  ...domainPass20261006Appends, ...classicalPass20261007Appends, ...kolQueue20261009Appends, ...rlPass20261009Appends,
  ...rlFigures20261011Appends, ...reskin20261010Appends, ...worldModelsPass20261010Appends, ...kolQueue20261012Appends,
  ...frontierPass20261010Appends, ...anatomy20261012Appends, ...worldModelsLengthCut20261012Appends,
  ...anatomy2Figures20261012Appends, ...homeFeatured20261013Appends, ...frontierLengthCut20261013Appends,
  ...humanize20261012Appends, ...anatomy3Figures20261013Appends, ...imagesA20261013Appends,
  ...frontierLengthCut20261014Appends];
const beforeReaderFirst = (entries: ApprovedDelta[]) => entries.filter(x => !laterThanSeoPass.includes(x.id));
const howRobotsWorkAppends = [
  'how-robots-work-20261002-accessible-names-explainers-rail',
  'how-robots-work-20261002-accessible-names-explainer-pager',
  'how-robots-work-20261002-navigation-add-how-robots-work',
  'how-robots-work-20261002-navigation-position-glossary',
  'how-robots-work-20261002-navigation-position-credits',
  'how-robots-work-20261002-accessible-names-sidebar-entry',
];
// Earlier blocks check each chain as it stood before the SEO pass; the SEO
// pass block below checks the entries that closed those chains, and the
// reader-first block the entries that now close them.
const beforeSeoPass = (entries: ApprovedDelta[]) => beforeReaderFirst(entries).filter(x => !seoPassAppends.includes(x.id));
const seoPassEdges = (manifest: string, memberId: string) => merged
  .filter(x => seoPassAppends.includes(x.id) && x.manifest === manifest && x.memberId === memberId).map(x => x.id);
const readerFirstEdges = (manifest: string, memberId: string) => merged
  .filter(x => allReaderFirstAppends.includes(x.id) && x.manifest === manifest && x.memberId === memberId).map(x => x.id);
const kolBacklog20261005Edges = (manifest: string, memberId: string) => merged
  .filter(x => kolBacklog20261005Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const domainPass20261006Edges = (manifest: string, memberId: string) => merged
  .filter(x => domainPass20261006Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const classicalPass20261007Edges = (manifest: string, memberId: string) => merged
  .filter(x => classicalPass20261007Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const kolQueue20261009Edges = (manifest: string, memberId: string) => merged
  .filter(x => kolQueue20261009Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const rlFigures20261011Edges = (manifest: string, memberId: string) => merged
  .filter(x => rlFigures20261011Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const worldModelsPass20261010Edges = (manifest: string, memberId: string) => merged
  .filter(x => worldModelsPass20261010Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const kolQueue20261012Edges = (manifest: string, memberId: string) => merged
  .filter(x => kolQueue20261012Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const frontierPass20261010Edges = (manifest: string, memberId: string) => merged
  .filter(x => frontierPass20261010Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const anatomy20261012Edges = (manifest: string, memberId: string) => merged
  .filter(x => anatomy20261012Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const worldModelsLengthCut20261012Edges = (manifest: string, memberId: string) => merged
  .filter(x => worldModelsLengthCut20261012Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const anatomy2Figures20261012Edges = (manifest: string, memberId: string) => merged
  .filter(x => anatomy2Figures20261012Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const homeFeatured20261013Edges = (manifest: string, memberId: string) => merged
  .filter(x => homeFeatured20261013Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const frontierLengthCut20261013Edges = (manifest: string, memberId: string) => merged
  .filter(x => frontierLengthCut20261013Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const humanize20261012Edges = (manifest: string, memberId: string) => merged
  .filter(x => humanize20261012Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const anatomy3Figures20261013Edges = (manifest: string, memberId: string) => merged
  .filter(x => anatomy3Figures20261013Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const imagesA20261013Edges = (manifest: string, memberId: string) => merged
  .filter(x => imagesA20261013Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const frontierLengthCut20261014Edges = (manifest: string, memberId: string) => merged
  .filter(x => frontierLengthCut20261014Appends.includes(x.id) && x.manifest === manifest && x.memberId === memberId)
  .map(x => x.id);
const afterImagesA20261013 = merged.length - frontierLengthCut20261014Appends.length;
const afterAnatomy3Figures20261013 = afterImagesA20261013 - imagesA20261013Appends.length;
const afterHumanize20261012 = afterAnatomy3Figures20261013 - anatomy3Figures20261013Appends.length;
const afterFrontierLengthCut20261013 = afterHumanize20261012 - humanize20261012Appends.length;
const afterHomeFeatured20261013 = afterFrontierLengthCut20261013 - frontierLengthCut20261013Appends.length;
const afterAnatomy2Figures20261012 = afterHomeFeatured20261013 - homeFeatured20261013Appends.length;
const afterWorldModelsLengthCut20261012 = afterAnatomy2Figures20261012 - anatomy2Figures20261012Appends.length;
const afterAnatomy20261012 = afterWorldModelsLengthCut20261012 - worldModelsLengthCut20261012Appends.length;
const afterFrontierPass20261010 = afterAnatomy20261012 - anatomy20261012Appends.length;
const afterKolQueue20261012 = afterFrontierPass20261010 - frontierPass20261010Appends.length;
const afterWorldModelsPass20261010 = afterKolQueue20261012 - kolQueue20261012Appends.length;
const afterReskin20261010 = afterWorldModelsPass20261010 - worldModelsPass20261010Appends.length;
const afterRlFigures20261011 = afterReskin20261010 - reskin20261010Appends.length;
const afterRlPass20261009 = afterRlFigures20261011 - rlFigures20261011Appends.length;
const afterKolQueue20261009 = afterRlPass20261009 - rlPass20261009Appends.length;
const afterClassicalPass20261007 = afterKolQueue20261009 - kolQueue20261009Appends.length;
const afterDomainPass20261006 = afterClassicalPass20261007 - classicalPass20261007Appends.length;
const afterHowRobotsWork20261005 = afterDomainPass20261006 - domainPass20261006Appends.length;
const afterKolBacklog20261005 = afterHowRobotsWork20261005 - howRobotsWork20261005Appends.length;
const afterReaderFirstManipulation = afterKolBacklog20261005 - kolBacklog20261005Appends.length;
const afterHowRobotsWork = afterReaderFirstManipulation - readerFirstManipulationAppends.length;
const afterReaderFirst = afterHowRobotsWork - howRobotsWorkAppends.length;
const afterSeoPass = afterReaderFirst - readerFirstAppends.length;
const afterKolBacklog = afterSeoPass - seoPassAppends.length;
const afterOpusFigureMigration = afterKolBacklog - kolBacklogAppends.length;
const afterOpusHomepage = afterOpusFigureMigration - opusFigureMigrationAppends.length;
const afterOpusFigureSystem = afterOpusHomepage - opusHomepageAppends.length;
const afterRound6 = afterOpusFigureSystem - opusFigureSystemAppends.length;
const afterRound6Prose = afterRound6 - round6RemainingRepairAppends.length;
const beforeRound6 = merged.slice(0, afterRound6Prose - round6ProseRestoreAppends.length);

describe('two-parent exact approval reconciliation', () => {
  it('retains every main approval and the nine scoped frontier/adjacent successors in order', () => {
    const mainIds = new Set(main.map(x => x.id));
    const localOnly = local.filter(x => !mainIds.has(x.id));
    // The 20260925 manipulation humanizer pass and EXPO-FT intake appended
    // 25 more approvals after the merge, the 20260926 instrument
    // migration appended one more, the 20260926 educational convergence
    // pass appended four more, the educational relocation pass appended
    // one more, the educational cue pass appended eleven more, the
    // motion-language scene swap appended forty-five more, and the
    // motion-language clip pipeline appended three more, followed by the
    // accessible typeset-equation name required by the foundation review.
    // The subsequent domain passes add nine classical article endpoints,
    // two manipulation mounts, eight RL article endpoints and five RL
    // reconciliation edges, all named below in ledger order, and the round-6
    // prose restores and remaining repairs, the figure-system resolution, the
    // home front page and the figure migration add the edges named above,
    // the KOL backlog batch appends its own named block, the SEO pass
    // appends its block, the reader-first figure pass appends its block, and
    // the how-robots-work page appends its block, the reader-first
    // manipulation batch appends its block, the 2026-10-05 KOL backlog
    // batch appends its block, the 2026-10-05 how-robots-work names append
    // theirs, the 2026-10-06 domain passes and the 2026-10-07 classical pass
    // append theirs, the 2026-10-09 overdue KOL step appends its block, the
    // 2026-10-09 rl-sim2real pass appends its block, the 2026-10-11
    // rl-sim2real figure batch appends its block, the 2026-10-10
    // site-foundation re-skin appends its block, the world-models pass
    // appends its block, the 2026-10-12 KOL triage batch appends its block,
    // the 2026-10-10 frontier pass, landed after that batch, appends its
    // block, the first isometric figure landing of 2026-10-12 appends its
    // block, the 2026-10-12 world-models length cut appends its block, and
    // the second isometric figure landing appends its block,
    // the front-page featured landing of 2026-10-13 appends its block, the
    // 2026-10-13 frontier length cut appends its block, the 2026-10-12
    // humanize pass appends its block, the third isometric figure landing
    // appends its block, images bundle A of 2026-10-13 appends its block, and
    // the 2026-10-14 frontier length cut appends its block last.
    expect([main.length, local.length, localOnly.length, merged.length])
      .toEqual([1558, 1104, 7, 2026 + readerFirstAppends.length + howRobotsWorkAppends.length
        + readerFirstManipulationAppends.length + kolBacklog20261005Appends.length
        + howRobotsWork20261005Appends.length + domainPass20261006Appends.length
        + classicalPass20261007Appends.length + kolQueue20261009Appends.length + rlPass20261009Appends.length
        + rlFigures20261011Appends.length + reskin20261010Appends.length + worldModelsPass20261010Appends.length
        + kolQueue20261012Appends.length + frontierPass20261010Appends.length
        + anatomy20261012Appends.length + worldModelsLengthCut20261012Appends.length
        + anatomy2Figures20261012Appends.length + homeFeatured20261013Appends.length
        + frontierLengthCut20261013Appends.length + humanize20261012Appends.length
        + anatomy3Figures20261013Appends.length + imagesA20261013Appends.length
        + frontierLengthCut20261014Appends.length]);
    expect(merged.slice(0, main.length)).toEqual(main);
    expect(merged.slice(main.length, main.length + localOnly.length)).toEqual(localOnly);
    expect(merged.slice(main.length + localOnly.length).map(x => x.id))
      .toEqual([...resolutions.map(x => x[0]), ...packetAppends, ...techWithdrawalAppends, ...stackClassicalWorldRlAppends, ...searchStatesAppends, ...humanizerAppends, ...instrumentMigrationAppends, ...educationalConvergenceAppends, ...educationalRelocationAppends, ...educationalCueAppends, ...motionLanguageAppends, ...motionLanguageClipAppends, ...motionSceneEquationAppends, ...motionClassicalAppends, ...motionManipulationAppends, ...motionRlAppends, ...motionRlReconciliations, ...motionWorldModelAppends, ...motionDataHardwareAppends, ...motionFrontierAdjacentHomeAppends, ...motionScrutinyS12Appends, ...round5FirstScreenAppends, ...round5PinnedLeftoversAppends, ...round5FirstScreenCdAppends, ...sharedReaderLayoutAppends, ...round6ProseRestoreAppends, ...round6RemainingRepairAppends, ...opusFigureSystemAppends, ...opusHomepageAppends, ...opusFigureMigrationAppends, ...kolBacklogAppends, ...seoPassAppends, ...readerFirstAppends, ...howRobotsWorkAppends, ...readerFirstManipulationAppends, ...kolBacklog20261005Appends, ...howRobotsWork20261005Appends, ...domainPass20261006Appends, ...classicalPass20261007Appends, ...kolQueue20261009Appends, ...rlPass20261009Appends, ...rlFigures20261011Appends, ...reskin20261010Appends, ...worldModelsPass20261010Appends, ...kolQueue20261012Appends, ...frontierPass20261010Appends, ...anatomy20261012Appends, ...worldModelsLengthCut20261012Appends, ...anatomy2Figures20261012Appends, ...homeFeatured20261013Appends, ...frontierLengthCut20261013Appends, ...humanize20261012Appends, ...anatomy3Figures20261013Appends, ...imagesA20261013Appends, ...frontierLengthCut20261014Appends]);
    expect(merged.slice(beforeRound6.length, afterRound6Prose)).toMatchObject(round6ProseRestoreEndpoints.map(
      ([memberId, , newHash], index) => ({
        id: round6ProseRestoreAppends[index], manifest: 'prose', memberId, newHash,
      })));
    expect(merged.slice(afterRound6Prose, afterRound6)).toMatchObject(round6RemainingRepairEndpoints.map(
      ([manifest, memberId, oldHash, newHash], index) => ({
        id: round6RemainingRepairAppends[index], manifest, memberId, oldHash, newHash,
      })));
    expect(merged.slice(afterRound6, afterOpusFigureSystem)).toMatchObject([{
      id: opusFigureSystemAppends[0], manifest: 'prose',
      memberId: 'article:frontier/reliability-gap',
      oldHash: 'a94b57b4e2cddd579a0e06f83043b7f9e2c870129405af6dbacb1456be651a6c',
      newHash: 'ec938d42bd87814a5ef1f3c3808a4fbc645107b4e94e6a822646a0465610a063',
    }]);
    expect(merged.slice(afterOpusFigureSystem, afterOpusHomepage)).toMatchObject(opusHomepageEndpoints.map(
      ([, manifest, memberId, oldHash, newHash], index) => ({
        id: opusHomepageAppends[index], manifest, memberId, oldHash, newHash,
        responsibleMilestone: 'opus-pass', disposition: 'permanent',
      })));
    expect(merged.slice(afterOpusHomepage, afterOpusFigureMigration)).toMatchObject(opusFigureMigrationEndpoints.map(
      ([, manifest, memberId], index) => ({
        id: opusFigureMigrationAppends[index], manifest, memberId,
        responsibleMilestone: 'opus-pass', disposition: 'permanent',
      })));
    expect(merged.slice(afterOpusFigureMigration, afterKolBacklog)).toMatchObject(kolBacklogAppends.map(id => ({
      id, responsibleMilestone: 'brand-v2-hygiene', disposition: 'permanent',
      affectedAssertions: ['VAL-KOL-001', 'VAL-B2-BASE-002', 'VAL-B2-BASE-010', 'VAL-B2-BASE-011'],
    })));
    expect(merged.slice(afterKolBacklog, afterSeoPass)).toMatchObject(seoPassAppends.map(id => ({
      id, responsibleMilestone: 'opus-pass', disposition: 'permanent',
    })));
    expect(merged.slice(afterSeoPass, afterSeoPass + 1)).toMatchObject([{
      id: 'reader-first-20261002-expression-name-preset-group-label', manifest: 'accessible-names',
      memberId: 'expression:components/ui/instrument.tsx:aria-labelledby:1',
      oldHash: 'ffa63583dfa6706b87d284b86b0d693a161e4840aad2c5cf6b5d27c3b9621f7d',
      newHash: '5365423d7ce3ace32c008459465c944c95d5df4afd331ad26413b336316be72b',
      responsibleMilestone: 'opus-pass', disposition: 'permanent',
    }]);
    expect(merged.slice(afterSeoPass, afterReaderFirst)).toMatchObject(readerFirstAppends.map(id => ({
      id, responsibleMilestone: 'opus-pass', disposition: 'permanent',
    })));
    expect(merged.slice(afterReaderFirst, afterHowRobotsWork)).toMatchObject(howRobotsWorkAppends.map(id => ({
      id, manifest: id.includes('-navigation-') ? 'navigation' : 'accessible-names',
      responsibleMilestone: 'opus-pass', disposition: 'permanent',
    })));
    expect(merged.slice(afterHowRobotsWork, afterReaderFirstManipulation).map(x => [x.manifest, x.memberId])).toEqual([
      ...['action-chunking', 'bc-foundations', 'diffusion-policy', 'vla-models']
        .map(slug => ['prose', `article:manipulation/${slug}`]),
      ...[
        'expression:components/interactive/action-tokenization.tsx:aria-label:2',
        'expression:components/interactive/chunk-size-curve.tsx:aria-label:2',
        'expression:components/interactive/compounding-error.tsx:aria-label:1',
        'expression:components/interactive/compounding-error.tsx:aria-label:2',
        'expression:components/interactive/compounding-error.tsx:aria-label:3',
        'expression:components/interactive/compounding-error.tsx:aria-label:4',
        'literal:components/interactive/compounding-error.tsx:aria-label:1',
        'expression:components/interactive/latency-comparison.tsx:aria-label:3',
      ].map(memberId => ['accessible-names', memberId]),
      // The optional prediction step then shortened the question, hint and
      // cue of the five articles that carry one.
      ...['classical/control', 'data-hardware/data-bottleneck', 'data-hardware/evaluation-crisis',
        'manipulation/bc-foundations', 'frontier/generalization'].map(slug => ['prose', `article:${slug}`]),
      // The second manipulation batch then moved the accessible names its
      // rewritten figures print and the three cues that name their controls.
      ...[
        'literal:components/interactive/flow-matching-trajectory.tsx:aria-label:1',
        'expression:components/interactive/flow-matching-trajectory.tsx:aria-label:2',
        'literal:components/interactive/hierarchy-timescales.tsx:aria-label:1',
        'literal:components/interactive/cross-embodiment-strategies.tsx:aria-label:1',
        'expression:components/interactive/cross-embodiment-strategies.tsx:aria-label:2',
        'expression:components/interactive/generalist-release-timeline.tsx:aria-label:2',
      ].map(memberId => ['accessible-names', memberId]),
      ...['generalist-policies', 'knowledge-insulation', 'rl-finetuning']
        .map(slug => ['prose', `article:manipulation/${slug}`]),
      // The first RL and sim-to-real batch then renamed the two stages that
      // now draw a robot, and its preset groups took over two group names.
      ...[
        'expression:components/interactive/contact-geometry.tsx:aria-label:2',
        'expression:components/interactive/teacher-student.tsx:aria-label:2',
        'literal:components/interactive/contact-geometry.tsx:aria-labelledby:1',
        'literal:components/interactive/wbc-decomposition.tsx:aria-label:1',
      ].map(memberId => ['accessible-names', memberId]),
      // The second RL batch then gave the ledger's two sliders the plain
      // labels they print and moved its source choice below them, which
      // shifts the unchanged source-button name from ordinal 2 to 3.
      ...[1, 2, 3].map(ordinal => ['accessible-names',
        `expression:components/interactive/sample-efficiency-ledger.tsx:aria-label:${ordinal}`]),
    ]);
    expect(merged.slice(afterHowRobotsWork, afterReaderFirstManipulation)).toMatchObject(
      readerFirstManipulationAppends.map(id => ({
        id, responsibleMilestone: 'opus-pass', disposition: 'permanent',
      })));
    expect(merged.slice(afterReaderFirstManipulation, afterKolBacklog20261005)).toMatchObject(
      kolBacklog20261005Appends.map(id => ({
        id, responsibleMilestone: 'brand-v2-hygiene', disposition: 'permanent',
        affectedAssertions: ['VAL-KOL-001', 'VAL-B2-BASE-002', 'VAL-B2-BASE-010', 'VAL-B2-BASE-011'],
      })));
    expect(merged.slice(afterKolBacklog20261005, afterHowRobotsWork20261005)).toMatchObject([{
      id: 'how-robots-work-20261005-accessible-names-explainers-as-text', manifest: 'accessible-names',
      memberId: 'literal:components/explainers/how-robots-work.tsx:aria-labelledby:3',
      oldHash: MISSING_MEMBER,
      newHash: 'a30c8602fd40a06f1caebab0b1e7fde1562f82133cd4ec0ac800708c9c5fec26',
      responsibleMilestone: 'opus-pass', disposition: 'permanent', affectedAssertions: ['VAL-B2-BASE-011'],
    }, {
      id: 'how-robots-work-20261005-accessible-names-poster-alt', manifest: 'accessible-names',
      memberId: 'expression:components/explainers/how-robots-work.tsx:alt:1',
      oldHash: MISSING_MEMBER,
      newHash: '0c214dec7b6ecaf60aeb4908ac41461d5876b9254af07a82332bcbfacb576ca3',
      responsibleMilestone: 'opus-pass', disposition: 'permanent', affectedAssertions: ['VAL-B2-BASE-011'],
    }]);
    expect(beforeRound6.slice(-1)).toMatchObject([{
      id: sharedReaderLayoutAppends[0], manifest: 'article-metadata',
      memberId: 'canonical-metadata-source:app/layout.tsx',
      oldHash: '539ab11a4ab2cdf715f036dc9aafe8b4bdb757dc63ef804f4e4214dea3bfacb4',
      newHash: '4f8ee54d1de53be8f180bd901e31f1ae42dd719ce13df60286fc6f26338046be',
    }]);
    expect(beforeRound6.slice(-10, -1)).toMatchObject(round5FirstScreenCdEndpoints.map(
      ([memberId, oldHash, newHash], index) => ({
        id: round5FirstScreenCdAppends[index], manifest: 'prose', memberId, oldHash, newHash,
      })));
    expect(beforeRound6.slice(-12, -10)).toMatchObject([
      {
        id: round5PinnedLeftoversAppends[0], manifest: 'prose',
        memberId: 'article:data-hardware/data-bottleneck',
        oldHash: 'cdc986bcd3e8a57e6d13297065578acd964e66f98cf7161de5bf42b0072cb47d',
        newHash: '2a399628a0d3d47c483619e0563664aa50e82ca704050c69ccb7d44a73f8a161',
      },
      {
        id: round5PinnedLeftoversAppends[1], manifest: 'prose',
        memberId: 'article:data-hardware/evaluation-crisis',
        oldHash: '1bf31b1df987ef3edf435c4bb5c7280105a43e1e240544be069454c01c505923',
        newHash: '58eb66a343de12e685e540f7840313f33b841fa233b26462d428b2a298459557',
      },
    ]);
    expect(beforeRound6.slice(-15, -12)).toMatchObject([
      {
        id: round5FirstScreenAppends[0], manifest: 'prose',
        memberId: 'article:frontier/reliability-gap',
        oldHash: 'a94b57b4e2cddd579a0e06f83043b7f9e2c870129405af6dbacb1456be651a6c',
        newHash: '1e39b6186e098ed948aa36770562e9041be8283a9956f7396b472529fd661a90',
      },
      {
        id: round5FirstScreenAppends[1], manifest: 'prose',
        memberId: 'article:adjacent/drones',
        oldHash: '57fede5c2c9e935af23c2591d021aa42217c420f53f98733fee97f4e9e1f80ab',
        newHash: 'fa823b5469df1868ac25fd324077b5aa44a2075fef250591e1ba46373cd78e29',
      },
      {
        id: round5FirstScreenAppends[2], manifest: 'prose',
        memberId: 'article:manipulation/diffusion-policy',
        oldHash: '2ed97162a04e8b619a5360fcd51957fd61d07dedc306df39bc12d4107aa4db62',
        newHash: '67925c3ecc80d2e381175f6eee29423df7adfa9afec379db9192810eb45f61f2',
      },
    ]);
    expect(beforeRound6.slice(-17, -15)).toMatchObject([
      {
        id: motionScrutinyS12Appends[0], manifest: 'prose',
        memberId: 'article:world-models/generative-sim',
        oldHash: '9459001f9f2b98c46b35e2685c671bd824993c2230f428cb6ba9f66677f29f37',
        newHash: '4b18ebca49f3165a16d99e7cf26f234067e41ab20c4c2f20da24ca5408e2a32d',
      },
      {
        id: motionScrutinyS12Appends[1], manifest: 'relationships',
        memberId: 'article:world-models/generative-sim',
        oldHash: 'b6dec2d3600c39707607ef01d9a9657493939964398d1ab46d6733983451a34d',
        newHash: 'fe9ee3b3cce0506268f5f916dc5c7577bdf11418014d355d30aa5e4b2dd76c3d',
      },
    ]);
    expect(new Set(merged.map(x => x.id)).size).toBe(merged.length);
    expect(validateApprovedDeltas(merged)).toEqual([]);
  });

  it('keeps all three conflicting local payloads as exact parent evidence, not duplicate active IDs', () => {
    expect(archive.schemaVersion).toBe('approval-branch-collisions-v1');
    expect([archive.mainRef, archive.localRef]).toEqual([mainRef, localRef]);
    expect([archive.mainRegisterSha256, archive.localRegisterSha256])
      .toEqual([sha256(rawMain), sha256(rawLocal)]);
    expect(archive.collisions.map((x: { originalId: string }) => x.originalId)).toEqual(collisionIds);
    for (const collision of archive.collisions) {
      const active = main.find(x => x.id === collision.originalId);
      const prior = local.find(x => x.id === collision.originalId);
      expect(collision.active).toEqual(active);
      expect(collision.retainedLocal).toEqual(prior);
      expect(active).not.toEqual(prior);
      expect(merged.filter(x => x.id === collision.originalId)).toEqual([active]);
    }
    const mainById = new Map(main.map(x => [x.id, x]));
    expect(local.filter(x => mainById.has(x.id) &&
      JSON.stringify(x) !== JSON.stringify(mainById.get(x.id))).map(x => x.id)).toEqual(collisionIds);
    const rg6 = archive.collisions[2];
    expect(approvedDeltaPath([rg6.active], rg6.active.oldHash, rg6.active.newHash).status)
      .toBe('approved');
    expect(approvedDeltaPath([rg6.retainedLocal], rg6.active.oldHash, rg6.active.newHash).status)
      .toBe('missing');
  });

  it('accepts the exact reconciled endpoints but rejects omitted, corrupted and unapproved paths', () => {
    for (const [id, manifest, memberId, count] of resolutions) {
      const edges = merged.filter(x => x.manifest === manifest && x.memberId === memberId);
      const resolution = edges.find(x => x.id === id)!;
      const prior = edges.slice(0, edges.indexOf(resolution));
      const path = [...prior, resolution];
      expect(resolution.id).toBe(id);
      expect(resolution.reconciles).toEqual(prior.map(x => ({
        id: x.id, oldHash: x.oldHash, newHash: x.newHash,
      })));
      expect(resolution.reconciles).toHaveLength(count);
      expect(approvedDeltaPath(path, resolution.oldHash, resolution.newHash).status).toBe('approved');
      expect(approvedDeltaPath(prior, resolution.oldHash, resolution.newHash).status)
        .toBe('missing');
      expect(approvedDeltaPath(path.slice(1), resolution.oldHash, resolution.newHash).status)
        .toBe('ambiguous');
      expect(approvedDeltaPath(path.map((edge, index) => index === 0
        ? { ...edge, newHash: '0'.repeat(64) } : edge),
      resolution.oldHash, resolution.newHash).status).toBe('ambiguous');
      expect(approvedDeltaPath(path, resolution.oldHash, '0'.repeat(64)).status).toBe('ambiguous');
    }
    const reliabilityAll = beforeSeoPass(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:frontier/reliability-gap'));
    // The figure-migration resolution now closes the chain and binds every
    // edge below; this block checks the chain as the figure-system
    // resolution left it.
    expect(reliabilityAll.at(-1)?.id).toBe('opus-figure-migration-20261001-prose-reliability-gap');
    const reliabilityEdges = reliabilityAll.slice(0, -1);
    // The round-5 resolution closed the chain as it stood before the
    // figure-system resolution, which now binds it too.
    const reliabilityBefore = reliabilityEdges.slice(0, -1);
    const round5Resolution = reliabilityBefore.at(-1)!;
    expect(round5Resolution.id).toBe(round5FirstScreenAppends[0]);
    expect(round5Resolution.reconciles).toEqual(reliabilityBefore.slice(0, -1).map(x => ({
      id: x.id, oldHash: x.oldHash, newHash: x.newHash,
    })));
    expect(round5Resolution.reconciles).toHaveLength(20);
    expect(approvedDeltaPath(reliabilityBefore, round5Resolution.oldHash,
      round5Resolution.newHash).status).toBe('approved');
    expect(approvedDeltaPath(reliabilityBefore.slice(0, -1), round5Resolution.oldHash,
      round5Resolution.newHash).status).toBe('ambiguous');
    const reliabilityResolution = reliabilityEdges.at(-1)!;
    expect(reliabilityResolution.id).toBe(opusFigureSystemAppends[0]);
    expect(reliabilityResolution.oldHash).toBe(round5Resolution.oldHash);
    expect(reliabilityResolution.reconciles).toEqual(reliabilityBefore.map(x => ({
      id: x.id, oldHash: x.oldHash, newHash: x.newHash,
    })));
    expect(reliabilityResolution.reconciles).toHaveLength(21);
    expect(approvedDeltaPath(reliabilityEdges, reliabilityResolution.oldHash,
      reliabilityResolution.newHash).status).toBe('approved');
    expect(approvedDeltaPath(reliabilityBefore, reliabilityResolution.oldHash,
      reliabilityResolution.newHash).status).toBe('ambiguous');
    expect(approvedDeltaPath(reliabilityEdges.map((edge, index) => index === 0
      ? { ...edge, newHash: '0'.repeat(64) } : edge),
    reliabilityResolution.oldHash, reliabilityResolution.newHash).status).toBe('ambiguous');
    // The bytes before the reuse caption no longer pass on the full chain.
    expect(approvedDeltaPath(reliabilityEdges, reliabilityResolution.oldHash,
      round5Resolution.newHash).status).toBe('ambiguous');
    const parallelAll = beforeSeoPass(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:rl-sim2real/parallel-sim-rl'));
    // As with reliability-gap, the figure-migration resolution follows the
    // round-5 resolution checked here.
    expect(parallelAll.at(-1)?.id).toBe('opus-figure-migration-20261001-prose-parallel-sim-rl');
    const parallelEdges = parallelAll.slice(0, -1);
    const parallelResolution = parallelEdges.at(-1)!;
    expect(parallelResolution.id).toBe(round5FirstScreenCdAppends[2]);
    expect(parallelResolution.reconciles).toEqual(parallelEdges.slice(0, -1).map(x => ({
      id: x.id, oldHash: x.oldHash, newHash: x.newHash,
    })));
    expect(parallelResolution.reconciles).toHaveLength(16);
    expect(parallelEdges.at(-2)?.id).toBe('motion-rl-sim2real-20260927-reconcile-parallel-sim-rl');
    expect(approvedDeltaPath(parallelEdges, parallelResolution.oldHash,
      parallelResolution.newHash).status).toBe('approved');
    expect(approvedDeltaPath(parallelEdges.slice(0, -1), parallelResolution.oldHash,
      parallelResolution.newHash).status).toBe('ambiguous');
    expect(approvedDeltaPath(parallelEdges.map((edge, index) => index === 0
      ? { ...edge, newHash: '0'.repeat(64) } : edge),
    parallelResolution.oldHash, parallelResolution.newHash).status).toBe('ambiguous');
    const sealedProse: { members: Array<{ id: string; hash: string }> } = JSON.parse(
      readFileSync('evidence/brand-v2/baseline/prose.json', 'utf8'));
    for (const [index, [memberId, oldHash, newHash]] of round5FirstScreenCdEndpoints.entries()) {
      const all = merged.filter(x => x.manifest === 'prose' && x.memberId === memberId);
      // Only a named round-6 restore, figure-migration, SEO pass or
      // reader-first edge, or a later pass edge, may follow the move's own edge.
      const edges = all.slice(0, all.findIndex(x => x.id === round5FirstScreenCdAppends[index]) + 1);
      expect(all.slice(edges.length).map(x => x.id)).toEqual([
        ...round6ProseRestoreAppends
          .filter((_, restore) => round6ProseRestoreEndpoints[restore][0] === memberId),
        ...opusFigureMigrationEdges('prose', memberId),
        ...seoPassEdges('prose', memberId),
        ...readerFirstEdges('prose', memberId),
        ...domainPass20261006Edges('prose', memberId),
        ...classicalPass20261007Edges('prose', memberId),
        ...kolQueue20261009Edges('prose', memberId),
        ...rlFigures20261011Edges('prose', memberId),
        ...worldModelsPass20261010Edges('prose', memberId),
        ...kolQueue20261012Edges('prose', memberId),
        ...worldModelsLengthCut20261012Edges('prose', memberId),
        ...humanize20261012Edges('prose', memberId),
        ...imagesA20261013Edges('prose', memberId),
      ]);
      const sealed = sealedProse.members.find(x => x.id === memberId)!.hash;
      expect(edges.at(-1)?.newHash).toBe(newHash);
      expect(approvedDeltaPath(edges, sealed, newHash).status).toBe('approved');
      expect(approvedDeltaPath(edges.slice(0, -1), sealed, newHash).status).not.toBe('approved');
      if (memberId !== 'article:rl-sim2real/parallel-sim-rl') {
        expect(edges.at(-2)?.newHash).toBe(oldHash);
      }
    }
    const layoutSealed = '539ab11a4ab2cdf715f036dc9aafe8b4bdb757dc63ef804f4e4214dea3bfacb4';
    const layoutCurrent = '4f8ee54d1de53be8f180bd901e31f1ae42dd719ce13df60286fc6f26338046be';
    // The 2026-10-10 re-skin edge continues this chain from layoutCurrent;
    // this block checks the chain as the shared-reader block left it.
    const layoutEdges = beforeReaderFirst(merged.filter(x => x.manifest === 'article-metadata'
      && x.memberId === 'canonical-metadata-source:app/layout.tsx'));
    expect(layoutEdges.map(x => x.oldHash)).toEqual(layoutEdges.map(() => layoutSealed));
    expect(layoutEdges.at(-1)?.id).toBe(sharedReaderLayoutAppends[0]);
    expect(approvedDeltaPath(layoutEdges, layoutSealed, layoutCurrent))
      .toEqual({ status: 'approved', path: [layoutEdges.at(-1)] });
    expect(approvedDeltaPath(layoutEdges.slice(0, -1), layoutSealed, layoutCurrent).status)
      .toBe('missing');
    expect(approvedDeltaPath(layoutEdges, layoutSealed, '0'.repeat(64)).status).toBe('missing');
    const industrialProse = beforeSeoPass(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:data-hardware/industrial-deployment'));
    expect(industrialProse.at(-1)?.id).toBe('round6-prose-restores-20260929-prose-industrial-deployment');
    expect(industrialProse.at(-2)?.id)
      .toBe('motion-data-hardware-source-qualification-20260927-prose-industrial-deployment');
    expect(merged.some(x => x.id === 'educational-relocation-20260926-prose-industrial-deployment')).toBe(true);
    // citation-rendering was later re-anchored by the 20260925 EXPO-FT
    // intake; the merge entry stays the last LOCAL merge for the member.
    expect(merged.filter(x => x.manifest === 'article-metadata'
      && x.memberId === 'citation-rendering:label-and-meta'
      && x.id.startsWith('continuation-merge-')).at(-1)?.id)
      .toBe('continuation-merge-2026-09-24-tech-withdrawal-citation-rendering');
    expect(beforeSeoPass(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:classical/calibration')).at(-1)?.id)
      .toBe('motion-classical-humanizer-v3-20260927-prose-calibration');
    expect(beforeSeoPass(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:world-models/world-models-vs-simulators')).at(-1)?.id)
      .toBe('motion-world-models-humanizer-v3-20260927-prose-world-models-vs-simulators');
  });

  it('binds each round-6 prose restore to its previous endpoint and to the sealed hash', () => {
    const sealedProse: { members: Array<{ id: string; hash: string }> } = JSON.parse(
      readFileSync('evidence/brand-v2/baseline/prose.json', 'utf8'));
    for (const [index, [memberId, previous, current]] of round6ProseRestoreEndpoints.entries()) {
      const all = merged.filter(x => x.manifest === 'prose' && x.memberId === memberId);
      // Only a named figure-migration, SEO pass, reader-first, 2026-10-05 KOL
      // backlog or later pass edge (up to the second isometric figure landing's
      // mount edges, the frontier length cut and the humanize pass) may follow
      // the restore; the restore is checked against the chain it closed.
      const edges = all.slice(0, all.findIndex(x => x.id === round6ProseRestoreAppends[index]) + 1);
      expect(all.slice(edges.length).map(x => x.id)).toEqual([...opusFigureMigrationEdges('prose', memberId),
        ...seoPassEdges('prose', memberId), ...readerFirstEdges('prose', memberId),
        ...kolBacklog20261005Edges('prose', memberId), ...domainPass20261006Edges('prose', memberId),
        ...classicalPass20261007Edges('prose', memberId), ...kolQueue20261009Edges('prose', memberId),
        ...rlFigures20261011Edges('prose', memberId), ...worldModelsPass20261010Edges('prose', memberId),
        ...kolQueue20261012Edges('prose', memberId), ...frontierPass20261010Edges('prose', memberId),
        ...anatomy2Figures20261012Edges('prose', memberId), ...frontierLengthCut20261013Edges('prose', memberId),
        ...humanize20261012Edges('prose', memberId), ...imagesA20261013Edges('prose', memberId)]);
      const sealed = sealedProse.members.find(x => x.id === memberId)!.hash;
      const entry = edges.at(-1)!;
      const prior = edges.slice(0, -1);
      expect(entry.id).toBe(round6ProseRestoreAppends[index]);
      expect(entry.newHash).toBe(current);
      expect(prior.at(-1)?.newHash).toBe(previous);
      expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
      expect(approvedDeltaPath(edges, sealed, current).status).toBe('approved');
      expect(approvedDeltaPath(prior, sealed, current).status).not.toBe('approved');
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({
          id: x.id, oldHash: x.oldHash, newHash: x.newHash,
        })));
        expect(approvedDeltaPath(edges, sealed, previous).status).toBe('ambiguous');
        expect(approvedDeltaPath(edges.map((edge, edgeIndex) => edgeIndex === 0
          ? { ...edge, newHash: '0'.repeat(64) } : edge), sealed, current).status).toBe('ambiguous');
      } else {
        expect(entry.oldHash).toBe(previous);
        expect(entry.reconciles).toBeUndefined();
      }
    }
  });

  it('binds each round-6 remaining repair to its previous endpoint and to the sealed hash', () => {
    for (const [index, [manifest, memberId, previous, current]] of round6RemainingRepairEndpoints.entries()) {
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${manifest}.json`, 'utf8'));
      const edges = beforeSeoPass(merged.filter(x => x.manifest === manifest && x.memberId === memberId));
      const sealed = sealedManifest.members.find(x => x.id === memberId)!.hash;
      const entry = edges.at(-1)!;
      const prior = edges.slice(0, -1);
      expect(entry.id).toBe(round6RemainingRepairAppends[index]);
      expect(entry.oldHash).toBe(previous);
      expect(entry.newHash).toBe(current);
      expect(entry.reconciles).toBeUndefined();
      expect(prior.some(x => x.reconciles !== undefined)).toBe(false);
      expect(prior.at(-1)?.newHash).toBe(previous);
      expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
      expect(approvedDeltaPath(edges, sealed, current).status).toBe('approved');
      expect(approvedDeltaPath(prior, sealed, current).status).toBe('missing');
    }
  });

  it('binds each home front-page edge to its previous endpoint and to the sealed hash', () => {
    for (const [index, [, manifest, memberId, previous, current]] of opusHomepageEndpoints.entries()) {
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${manifest}.json`, 'utf8'));
      const edges = merged.filter(x => x.manifest === manifest && x.memberId === memberId);
      // A member the seal does not hold starts from the hash of 'missing'.
      const sealed = sealedManifest.members.find(x => x.id === memberId)?.hash ?? MISSING_MEMBER;
      const entry = edges.at(-1)!;
      const prior = edges.slice(0, -1);
      expect(entry.id).toBe(opusHomepageAppends[index]);
      expect([entry.oldHash, entry.newHash]).toEqual([previous, current]);
      expect(entry.reconciles).toBeUndefined();
      expect(prior.some(x => x.reconciles !== undefined)).toBe(false);
      if (previous !== sealed) {
        expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
      }
      if (current === sealed) {
        // Added after the seal and removed again: the member is back where the
        // seal left it, absent, so the baseline needs no path to it. The
        // removal edge is what drops the earlier addition from the
        // article-truth population.
        expect(prior.some(x => x.oldHash === MISSING_MEMBER)).toBe(true);
        expect(approvedDeltaPath(edges, sealed, current).status).toBe('missing');
        continue;
      }
      expect(approvedDeltaPath(edges, sealed, current).status).toBe('approved');
      expect(approvedDeltaPath(prior, sealed, current).status).toBe('missing');
    }
  });

  it('binds each figure-migration edge to its previous endpoint and to the sealed hash', () => {
    for (const [index, [, manifest, memberId, previous]] of opusFigureMigrationEndpoints.entries()) {
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${manifest}.json`, 'utf8'));
      const edges = beforeSeoPass(merged.filter(x => x.manifest === manifest && x.memberId === memberId));
      // A member the seal does not hold starts from the hash of 'missing'.
      const sealed = sealedManifest.members.find(x => x.id === memberId)?.hash ?? MISSING_MEMBER;
      const entry = edges.at(-1)!;
      const prior = edges.slice(0, -1);
      const current = entry.newHash;
      expect(entry.id).toBe(opusFigureMigrationAppends[index]);
      expect(current).not.toBe(previous);
      if (prior.length === 0) {
        expect(previous).toBe(sealed);
      } else {
        expect(prior.at(-1)?.newHash).toBe(previous);
        expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
      }
      const path = approvedDeltaPath(edges, sealed, current);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, current).status).not.toBe('approved');
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({
          id: x.id, oldHash: x.oldHash, newHash: x.newHash,
        })));
        // The endpoint before the migration no longer passes on the full chain.
        expect(approvedDeltaPath(edges, sealed, previous).status).toBe('ambiguous');
        expect(approvedDeltaPath(edges.map((edge, edgeIndex) => edgeIndex === 0
          ? { ...edge, newHash: '0'.repeat(64) } : edge), sealed, current).status).toBe('ambiguous');
      } else {
        expect(entry.oldHash).toBe(previous);
        expect(entry.reconciles).toBeUndefined();
      }
    }
    expect(opusFigureMigrationAppends.filter(id => merged.find(x => x.id === id)?.reconciles))
      .toEqual([
        'opus-figure-migration-20261001-accessible-names-generalist-release-timeline-expression-aria-label-1',
        'opus-figure-migration-20261001-prose-control',
        'opus-figure-migration-20261001-prose-reliability-gap',
        'opus-figure-migration-20261001-prose-parallel-sim-rl',
        'opus-figure-migration-20261001-prose-sim2real-transfer',
        'opus-figure-migration-20261001-behavioral-defaults-collaborative-operation-modes-11',
      ]);
  });

  it('binds each KOL backlog edge to its previous endpoint and to the sealed hash', () => {
    for (const id of kolBacklogAppends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (entry.reconciles) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(prior.some(x => x.reconciles !== undefined)).toBe(false);
        expect(entry.oldHash).toBe(prior.at(-1)?.newHash ?? sealed);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
    expect(kolBacklogAppends.filter(id => merged.find(x => x.id === id)?.reconciles))
      .toEqual(['kol-backlog-20261001-world-models-citation-rendering',
        'kol-backlog-20261001-adjacent-citation-rendering', 'kol-backlog-20261001-manipulation-citation-rendering',
        'kol-backlog-20261001-frontier-citation-rendering']);
  });

  it('binds each SEO pass edge to its previous endpoint and to the sealed hash', () => {
    for (const id of seoPassAppends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      // The chain as the SEO pass closed it; a reader-first edge may follow.
      const edges = beforeReaderFirst(merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId));
      expect(edges.at(-1)).toBe(entry);
      const prior = edges.slice(0, -1);
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      expect(entry.newHash).not.toBe(entry.oldHash);
      const path = approvedDeltaPath(edges, sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
        // The endpoint before the pass no longer passes on the full chain.
        expect(approvedDeltaPath(edges, sealed, previous).status).toBe('ambiguous');
      } else {
        // The edge starts where the pre-pass tree stood. The figure migration
        // returned pi-line and vla-models to an endpoint their chains already
        // approved, so that start need not be the newest endpoint.
        if (entry.oldHash !== sealed) {
          expect(approvedDeltaPath(prior, sealed, entry.oldHash).status).toBe('approved');
        }
        expect(entry.reconciles).toBeUndefined();
      }
    }
    expect(seoPassAppends.filter(id => {
      const entry = merged.find(x => x.id === id)!;
      const prior = beforeReaderFirst(merged).filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId
        && x !== entry);
      return entry.reconciles === undefined && entry.oldHash !== (prior.at(-1)?.newHash ?? entry.oldHash);
    })).toEqual(['seo-pass-20261002-prose-manipulation-pi-line', 'seo-pass-20261002-prose-manipulation-vla-models']);
    expect(seoPassAppends.filter(id => merged.find(x => x.id === id)?.reconciles)).toEqual([
      ...['classical-control', 'data-hardware-hardware-taxonomy', 'data-hardware-industrial-deployment',
        'data-hardware-teleop-rigs', 'frontier-bear-case', 'frontier-competing-theses', 'frontier-reliability-gap',
        'manipulation-generalist-policies', 'manipulation-hierarchical', 'manipulation-rl-finetuning',
        'rl-sim2real-humanoid-wbc', 'rl-sim2real-parallel-sim-rl', 'rl-sim2real-reward-design-mpc',
        'rl-sim2real-sim2real-transfer', 'rl-sim2real-why-rl-locomotion', 'world-models-taxonomy',
      ].map(id => `seo-pass-20261002-prose-${id}`),
      ...['classical-control', 'data-hardware-hardware-taxonomy', 'data-hardware-industrial-deployment',
        'frontier-competing-theses', 'frontier-reliability-gap', 'manipulation-generalist-policies',
        'manipulation-rl-finetuning', 'rl-sim2real-why-rl-locomotion',
      ].map(id => `seo-pass-20261002-relationships-${id}`),
      'seo-pass-20261002-citation-rendering',
    ]);
  });

  it('binds each reader-first edge to its previous endpoint and to the sealed hash', () => {
    expect(readerFirstAppends.length).toBeGreaterThan(1);
    expect(readerFirstManipulationAppends.length).toBeGreaterThan(1);
    for (const id of allReaderFirstAppends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const all = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      // A later reader-first batch or the 2026-10-05 KOL backlog batch may
      // close the chain again; this edge is checked against the chain as it
      // stood when it was appended.
      const edges = all.slice(0, all.indexOf(entry) + 1);
      expect(all.slice(edges.length).every(x => laterThanSeoPass.includes(x.id))).toBe(true);
      const prior = edges.slice(0, -1);
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      expect(entry.newHash).not.toBe(entry.oldHash);
      // A member the seal never held has no path from an absent seal back to
      // absent, so removing it is one plain edge that leaves the endpoint its
      // chain last approved and closes the member at absent.
      if (sealed === MISSING_MEMBER && entry.newHash === MISSING_MEMBER) {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
        expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
        continue;
      }
      const path = approvedDeltaPath(edges, sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
      if (entry.reconciles) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(prior.some(x => x.reconciles !== undefined)).toBe(false);
        expect(entry.oldHash).toBe(previous);
      }
    }
  });

  it('binds each 2026-10-05 KOL backlog edge to its previous endpoint and to the sealed hash', () => {
    expect(kolBacklog20261005Appends.length).toBeGreaterThan(1);
    for (const id of kolBacklog20261005Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      expect(entry.newHash).not.toBe(prior.at(-1)?.newHash ?? sealed);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(prior.at(-1)?.newHash ?? sealed);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
    expect(kolBacklog20261005Appends.filter(id => id.endsWith('-citation-rendering')))
      .toEqual(['world-models', 'manipulation', 'adjacent', 'frontier', 'data-hardware', 'classical'].map(domain => `kol-backlog-20261005-${domain}-citation-rendering`));
  });

  it('binds each 2026-10-06 domain pass edge to its previous endpoint and to the sealed hash', () => {
    expect(domainPass20261006Appends.length).toBeGreaterThan(1);
    expect(merged.slice(afterHowRobotsWork20261005, afterDomainPass20261006).map(x => x.id))
      .toEqual(domainPass20261006Appends);
    for (const id of domainPass20261006Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      expect(entry.newHash).not.toBe(prior.at(-1)?.newHash ?? sealed);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(prior.at(-1)?.newHash ?? sealed);
      }
      // A positional value-state cell can return to an endpoint its chain
      // already approved; every other edge must be the first to approve it.
      if (!(entry.manifest === 'value-states' && prior.some(x => x.newHash === entry.newHash))) {
        expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
      }
    }
    // One shared citation-rendering resolution per article group that registers
    // or corrects a citation record, in group order. A prose-only group leaves
    // every rendered label unchanged, so it has no resolution to approve.
    const groups = [...new Set(domainPass20261006Appends.map(id => id.split('-')[3]))];
    expect(groups).toEqual(groups.map((_, index) => `g${index + 1}`));
    const citing = groups.filter(group => domainPass20261006Appends.some(id =>
      id.startsWith(`domain-pass-20261006-${group}-citation-`) && !id.endsWith('-citation-rendering')));
    expect(citing.length).toBeGreaterThan(0);
    expect(domainPass20261006Appends.filter(id => id.endsWith('-citation-rendering')))
      .toEqual(citing.map(group => `domain-pass-20261006-${group}-citation-rendering`));
  });

  it('binds each 2026-10-07 classical pass edge to its previous endpoint and to the sealed hash', () => {
    expect(classicalPass20261007Appends.length).toBeGreaterThan(1);
    expect(merged.slice(afterDomainPass20261006, afterClassicalPass20261007).map(x => x.id))
      .toEqual(classicalPass20261007Appends);
    for (const id of classicalPass20261007Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-09 overdue KOL step edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterClassicalPass20261007, afterKolQueue20261009).map(x => x.id))
      .toEqual(kolQueue20261009Appends);
    expect(kolQueue20261009Appends).toEqual([
      'prose-dexterity', 'prose-generative-video', 'relationships-dexterity', 'relationships-generative-video',
      'frontmatter-dexterity', 'frontmatter-generative-video', 'citation-rendering',
      'citation-bd-atlas-hand-2026', 'citation-runway-gwm-robotics-eval-2026', 'citation-runway-praxis-1-2026',
    ].map(suffix => `domain-pass-20261009-kol-${suffix}`));
    for (const id of kolQueue20261009Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-09 rl-sim2real pass edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterKolQueue20261009, afterRlPass20261009).map(x => x.id)).toEqual(rlPass20261009Appends);
    expect(rlPass20261009Appends).toEqual([
      'article-metadata-rl-for-robotics',
      'accessible-names-eureka-loop-literal-aria-label-1',
      'accessible-names-eureka-loop-expression-aria-label-1',
      'accessible-names-mpc-vs-rl-literal-aria-label-1',
      'accessible-names-mpc-vs-rl-expression-aria-label-1',
    ].map(suffix => `rl-sim2real-pass-20261009-${suffix}`));
    for (const id of rlPass20261009Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.reconciles).toBeUndefined();
      expect(entry.oldHash).toBe(previous);
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-11 rl-sim2real figure edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterRlPass20261009, afterRlFigures20261011).map(x => x.id)).toEqual(rlFigures20261011Appends);
    expect(rlFigures20261011Appends).toEqual([
      ...['humanoid-wbc', 'legged-locomotion', 'offline-rl', 'parallel-sim-rl', 'rl-for-robotics', 'sim2real-transfer',
        'why-rl-locomotion'].map(article => `prose-${article}`),
      ...['actuator-gap-expression-aria-label-1', 'cube-trials-expression-aria-label-1',
        'demo-or-sim-expression-aria-label-1', 'hindsight-relabel-expression-aria-label-1',
        'humanoid-pick-height-expression-aria-label-1', 'newton-solvers-expression-aria-label-1',
        'offline-value-overreach-expression-aria-label-1', 'offline-value-overreach-expression-aria-label-2',
        'real-robot-rl-gains-expression-aria-label-1', 'replay-reuse-expression-aria-label-1',
        'retargeting-gap-expression-aria-label-1', 'retargeting-gap-expression-aria-label-2',
        'robots-per-gpu-expression-aria-label-1', 'scanned-twin-check-expression-aria-label-1',
        'terrain-curriculum-expression-aria-label-1', 'trajectory-stitching-expression-aria-label-1',
      ].map(name => `accessible-names-${name}`),
    ].map(suffix => `rl-sim2real-figures-20261011-${suffix}`));
    for (const id of rlFigures20261011Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-10 site-foundation re-skin edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterRlFigures20261011, afterReskin20261010).map(x => x.id)).toEqual(reskin20261010Appends);
    expect(reskin20261010Appends).toEqual([
      'accessible-names-article-toc-literal-aria-label-1',
      'accessible-names-article-toc-literal-aria-label-2',
      'accessible-names-breadcrumbs-literal-aria-label-2',
      'accessible-names-site-shell-literal-aria-label-1',
      'article-metadata-layout-source',
      'article-metadata-article-header-source',
    ].map(suffix => `pantheon-reskin-20261010-${suffix}`));
    for (const id of reskin20261010Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.reconciles).toBeUndefined();
      expect(entry.oldHash).toBe(previous);
      expect(entry.newHash).not.toBe(previous);
      expect(entry.ownerApproval).toContain('Owner decision of 2026-10-10');
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-10 world-models pass edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterReskin20261010, afterWorldModelsPass20261010).map(x => x.id))
      .toEqual(worldModelsPass20261010Appends);
    const slugs = ['evaluation', 'generative-sim', 'generative-video', 'jepa', 'latent-dynamics',
      'model-based-robot-learning', 'taxonomy', 'world-models-vs-simulators'];
    const articleEdges = [
      ...slugs.map(slug => `prose-${slug}`), ...slugs.map(slug => `relationships-${slug}`),
      ...slugs.map(slug => `frontmatter-${slug}`), 'citation-rendering',
    ].map(suffix => `world-models-pass-20261010-${suffix}`);
    expect(worldModelsPass20261010Appends.slice(0, articleEdges.length)).toEqual(articleEdges);
    const records = merged.slice(afterReskin20261010 + articleEdges.length, afterWorldModelsPass20261010);
    expect(records).toHaveLength(107);
    expect(records.every(x => x.manifest === 'article-metadata' && x.memberId.startsWith('citation:'))).toBe(true);
    expect(records.map(x => x.id))
      .toEqual(records.map(x => `world-models-pass-20261010-citation-${x.memberId.slice('citation:'.length)}`));
    for (const id of worldModelsPass20261010Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      // Only the 2026-10-12 KOL triage batch, the frontier pass that landed
      // after it, then the world-models length cut and images bundle A of
      // 2026-10-13 may move a member after this pass, in that order.
      expect(edges.slice(edges.indexOf(entry) + 1).map(x => x.id)).toEqual([
        ...kolQueue20261012Edges(entry.manifest, entry.memberId),
        ...frontierPass20261010Edges(entry.manifest, entry.memberId),
        ...worldModelsLengthCut20261012Edges(entry.manifest, entry.memberId),
        ...imagesA20261013Edges(entry.manifest, entry.memberId)]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-12 KOL triage edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterWorldModelsPass20261010, afterKolQueue20261012).map(x => x.id))
      .toEqual(kolQueue20261012Appends);
    const slugs = ['bc-foundations', 'cross-embodiment', 'data-bottleneck', 'dexterity', 'generative-video',
      'hierarchical', 'jepa', 'motion-planning', 'reward-design-mpc', 'rl-finetuning', 'robot-learning-stack',
      'safety-and-assurance', 'scene-representation', 'space'];
    const citations = ['mulligan-2026', 'ocbench-2026', 'egolap-2026', 'eigendexplore-2026', 'openwam-2026',
      'jepa-unstable-modes-2026', 'qf3-2026', 'robo-cop-2026', 'long-wam-2026', 'ledger-2026', 'sgs-2026',
      'lac-wm-2026', 'luna-legged-2026', 'visual-predicted-force-2026', 'fingers-as-legs-2026', 'ariadne-2026',
      'mobilevista-2026', 'trustworthy-physical-ai-2026', 'hiphi-2026', 'exploy-2026'];
    expect(kolQueue20261012Appends).toEqual([
      ...slugs.map(slug => `prose-${slug}`), ...slugs.map(slug => `relationships-${slug}`),
      ...slugs.map(slug => `frontmatter-${slug}`), 'citation-rendering',
      ...citations.map(id => `citation-${id}`),
    ].map(suffix => `domain-pass-20261012-kol-${suffix}`));
    for (const id of kolQueue20261012Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      // Only the frontier pass, which landed after this batch, then the
      // world-models length cut, the second isometric figure landing (one
      // figure mount in the robot-learning stack), the frontier length cut
      // (safety and assurance), the humanize pass, images bundle A of
      // 2026-10-13 and the 2026-10-14 frontier length cut (dexterity) may move
      // a member after it, in that order.
      expect(edges.slice(edges.indexOf(entry) + 1).map(x => x.id)).toEqual([
        ...frontierPass20261010Edges(entry.manifest, entry.memberId),
        ...worldModelsLengthCut20261012Edges(entry.manifest, entry.memberId),
        ...anatomy2Figures20261012Edges(entry.manifest, entry.memberId),
        ...frontierLengthCut20261013Edges(entry.manifest, entry.memberId),
        ...humanize20261012Edges(entry.manifest, entry.memberId),
        ...imagesA20261013Edges(entry.manifest, entry.memberId),
        ...frontierLengthCut20261014Edges(entry.manifest, entry.memberId)]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      if (entry.memberId.startsWith('citation:')) {
        expect(prior).toEqual([]);
        expect(entry.oldHash).toBe(MISSING_MEMBER);
      }
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-10 frontier pass edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterKolQueue20261012, afterFrontierPass20261010).map(x => x.id))
      .toEqual(frontierPass20261010Appends);
    const slugs = ['bear-case', 'competing-theses', 'generalization', 'reliability-gap', 'safety-and-assurance'];
    const articleEdges = [
      ...slugs.map(slug => `prose-${slug}`), ...slugs.map(slug => `relationships-${slug}`),
      ...['bear-case', 'competing-theses', 'dexterity', 'generalization', 'reliability-gap', 'safety-and-assurance']
        .map(slug => `frontmatter-${slug}`),
      'article-metadata-canonical-metadata-source-data-glossary-ts', 'citation-rendering',
    ].map(suffix => `frontier-pass-20261010-${suffix}`);
    expect(frontierPass20261010Appends.slice(0, articleEdges.length)).toEqual(articleEdges);
    const records = merged.slice(afterKolQueue20261012 + articleEdges.length, afterFrontierPass20261010);
    expect(records).toHaveLength(32);
    expect(records.every(x => x.manifest === 'article-metadata' && x.memberId.startsWith('citation:'))).toBe(true);
    expect(records.map(x => x.id))
      .toEqual(records.map(x => `frontier-pass-20261010-citation-${x.memberId.slice('citation:'.length)}`));
    for (const id of frontierPass20261010Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      // Only the second isometric figure landing (one figure mount in competing
      // theses) and then the frontier length cut, which landed after this
      // pass, may move a member after it, in that order.
      expect(edges.slice(edges.indexOf(entry) + 1).map(x => x.id)).toEqual([
        ...anatomy2Figures20261012Edges(entry.manifest, entry.memberId),
        ...frontierLengthCut20261013Edges(entry.manifest, entry.memberId)]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-12 isometric figure edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterFrontierPass20261010, afterAnatomy20261012).map(x => x.id))
      .toEqual(anatomy20261012Appends);
    const names = [
      'iso-draw-expression-aria-label-1',
      'action-conditioning-expression-aria-label-1',
      'action-tokenization-expression-aria-label-2', 'action-tokenization-expression-aria-label-3',
      'actuator-gap-expression-aria-label-1',
      'grasp-wrench-lab-expression-aria-label-3',
      'jepa-planning-expression-aria-label-1', 'jepa-planning-expression-aria-label-2',
      'jepa-planning-expression-aria-label-3',
      'latent-imagination-expression-aria-label-1', 'latent-imagination-expression-aria-label-2',
      'latent-imagination-expression-aria-label-3', 'latent-imagination-expression-aria-label-4',
      'qos-queue-age-expression-aria-label-1',
      'receding-horizon-expression-aria-label-3',
      'robots-per-gpu-expression-aria-label-1',
      'ros2-interfaces-expression-aria-label-1',
      'time-offset-miss-expression-aria-label-2',
    ];
    const defaults = ['actuator-gap-default-3', 'actuator-gap-default-4', 'actuator-gap-default-5',
      'robots-per-gpu-default-3'];
    expect(anatomy20261012Appends).toEqual([
      ...names.map(suffix => `accessible-names-${suffix}`), ...defaults.map(suffix => `behavioral-defaults-${suffix}`),
    ].map(suffix => `anatomy-figures-20261012-${suffix}`));
    // Every edge is on the kit's IsoFigure or on one of the eleven redrawn
    // figures, and cites the owner directive that ordered the redraw.
    const sources = ['action-conditioning', 'action-tokenization', 'actuator-gap', 'grasp-wrench-lab',
      'jepa-planning', 'latent-imagination', 'qos-queue-age', 'receding-horizon', 'robots-per-gpu',
      'ros2-interfaces', 'time-offset-miss'].map(name => `components/interactive/${name}.tsx`);
    for (const id of anatomy20261012Appends) {
      const entry = merged.find(x => x.id === id)!;
      expect(['accessible-names', 'behavioral-defaults']).toContain(entry.manifest);
      const file = entry.memberId.replace(/^(?:expression|default):/, '').replace(/:(?:aria-label:)?\d+$/, '');
      expect([...sources, 'components/iso/react/draw.tsx']).toContain(file);
      expect(entry.ownerApproval).toContain(
        '"Redo all of the animations and stuff like that with this type of animation and with this skill');
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      expect(edges.at(-1)).toBe(entry);
      expect(anatomy20261012Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(prior.some(x => x.reconciles !== undefined)).toBe(false);
      expect(entry.reconciles).toBeUndefined();
      expect(entry.oldHash).toBe(previous);
      expect(entry.newHash).not.toBe(previous);
      if (previous !== sealed) expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
      if (file === 'components/iso/react/draw.tsx' || entry.manifest === 'behavioral-defaults') {
        // New members: the seal never held them and no earlier edge names them.
        expect(prior).toEqual([]);
        expect(sealed).toBe(MISSING_MEMBER);
      }
      if (entry.newHash === sealed) {
        // Added after the seal and removed again: the member is back where the
        // seal left it, absent, so the baseline needs no path to it. The
        // removal edge is what drops the earlier addition from the
        // article-truth population.
        expect(sealed).toBe(MISSING_MEMBER);
        expect(prior.some(x => x.oldHash === MISSING_MEMBER)).toBe(true);
        expect(approvedDeltaPath(edges, sealed, entry.newHash).status).toBe('missing');
        continue;
      }
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-12 world-models length-cut edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterAnatomy20261012, afterWorldModelsLengthCut20261012).map(x => x.id))
      .toEqual(worldModelsLengthCut20261012Appends);
    const slugs = ['evaluation', 'generative-sim', 'generative-video', 'jepa', 'latent-dynamics',
      'model-based-robot-learning', 'taxonomy', 'world-models-vs-simulators'];
    // One prose edge per article, then one relationships edge per article.
    const expected = ['prose', 'relationships'].flatMap(manifest => slugs.map(slug => ({
      id: `length-cut-20261012-world-models-${manifest}-${slug}`, manifest, memberId: `article:world-models/${slug}`,
    })));
    expect(worldModelsLengthCut20261012Appends).toEqual(expected.map(x => x.id));
    for (const [index, id] of worldModelsLengthCut20261012Appends.entries()) {
      const entry = merged.find(x => x.id === id)!;
      // Approved by the owner's instruction, and naming the continuity review
      // that rebuilds the article's earlier bytes and lists what it dropped.
      expect([entry.manifest, entry.memberId]).toEqual([expected[index].manifest, expected[index].memberId]);
      expect(entry.ownerApproval).toContain(
        '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
      expect(entry.reason).toContain('audit/evidence/length-cut-20261012-world-models/source-transition.json');
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      // Only images bundle A of 2026-10-13 may move the member after the cut.
      expect(edges.slice(edges.indexOf(entry) + 1).map(x => x.id))
        .toEqual(imagesA20261013Edges(entry.manifest, entry.memberId));
      expect(worldModelsLengthCut20261012Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each second 2026-10-12 isometric figure edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterWorldModelsLengthCut20261012, afterAnatomy2Figures20261012).map(x => x.id)).toEqual(anatomy2Figures20261012Appends);
    expect(anatomy2Figures20261012Appends).toEqual([
      'accessible-names-perception-latency-expression-aria-label-2',
      'behavioral-defaults-motion-pantograph-default-1', 'behavioral-defaults-motion-pantograph-default-2',
      'behavioral-defaults-motion-pantograph-default-3',
      'interactive-sources-mounts-source-helix-clockwork', 'interactive-sources-mounts-source-motion-pantograph',
      'interactive-sources-mounts-source-scene-split',
      'interactive-sources-mounts-mount-surgical-motion-pantograph-1',
      'interactive-sources-mounts-mount-robot-learning-stack-scene-split-1',
      'interactive-sources-mounts-mount-competing-theses-helix-clockwork-1',
      'prose-surgical', 'prose-robot-learning-stack', 'prose-competing-theses',
    ].map(suffix => `anatomy-2-figures-20261012-${suffix}`));
    // Every edge is on one of the landing's figure sources or on an article
    // that gained one of its three new mounts, and cites the owner directive
    // that ordered the redraw. The contract rack and the touch threshold tester
    // the batches also built are not part of the landing, so no edge names them.
    const sources = ['helix-clockwork', 'motion-pantograph', 'perception-latency', 'scene-split']
      .map(name => `components/interactive/${name}.tsx`);
    const articles = ['adjacent/surgical', 'data-hardware/robot-learning-stack', 'frontier/competing-theses'];
    for (const id of anatomy2Figures20261012Appends) {
      const entry = merged.find(x => x.id === id)!;
      expect(entry.memberId).not.toMatch(/stack-rack|StackRack|contract-rack|touch-threshold|TouchThreshold|dexterity/);
      if (entry.manifest === 'prose') {
        expect(articles.map(article => `article:${article}`)).toContain(entry.memberId);
      } else if (entry.memberId.startsWith('mount:')) {
        expect(articles.some(article => entry.memberId.startsWith(`mount:content/${article}.mdx:`))).toBe(true);
      } else {
        expect(sources).toContain(entry.memberId.replace(/^(?:expression|default|source):/, '')
          .replace(/:(?:aria-label:)?\d+$/, ''));
      }
      expect(entry.ownerApproval).toContain(
        '"Redo all of the animations and stuff like that with this type of animation and with this skill');
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      // Only the frontier length cut, which landed after this landing, may
      // move a member after it.
      expect(edges.slice(edges.indexOf(entry) + 1).map(x => x.id))
        .toEqual(frontierLengthCut20261013Edges(entry.manifest, entry.memberId));
      expect(anatomy2Figures20261012Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      if (prior.some(x => x.reconciles !== undefined)) {
        // The member's chain already holds a resolution, so this edge is one
        // resolution from the seal that reconciles the whole chain exactly.
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
        if (previous !== sealed) expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
      }
      if (entry.manifest === 'behavioral-defaults' || entry.manifest === 'interactive-sources-mounts') {
        // New members: the seal never held them and no earlier edge names them.
        expect(prior).toEqual([]);
        expect(sealed).toBe(MISSING_MEMBER);
      }
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-13 front-page featured name to an absent seal as one plain edge', () => {
    expect(merged.slice(afterAnatomy2Figures20261012, afterHomeFeatured20261013).map(x => x.id))
      .toEqual(homeFeatured20261013Appends);
    // In member order: the page's frame name, then the poster's text.
    expect(homeFeatured20261013Appends).toEqual([
      'home-featured-20261013-accessible-names-home-page-expression-aria-label-1',
      'home-featured-20261013-accessible-names-featured-explainer-expression-alt-1',
    ]);
    const members = new Map([
      ['home-featured-20261013-accessible-names-featured-explainer-expression-alt-1',
        'expression:components/home/featured-explainer.tsx:alt:1'],
      ['home-featured-20261013-accessible-names-home-page-expression-aria-label-1',
        'expression:app/page.tsx:aria-label:1'],
    ]);
    for (const id of homeFeatured20261013Appends) {
      const entry = merged.find(x => x.id === id)!;
      expect(entry.manifest).toBe('accessible-names');
      expect(entry.memberId).toBe(members.get(id));
      // The owner's words that ordered the new front page, and no claim of
      // release approval.
      expect(entry.ownerApproval).toContain(
        '"The featured scene and the featured article are actually really shit. Think about what\'s super hot right now');
      expect(entry.ownerApproval).toContain('Not release approval.');
      expect(entry.reason).toMatch(/^Front-page featured landing of 2026-10-13/);
      // New members: the seal never held them and no earlier edge names them.
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      expect(sealedManifest.members.some(x => x.id === entry.memberId)).toBe(false);
      expect(merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId)).toEqual([entry]);
      expect(homeFeatured20261013Edges(entry.manifest, entry.memberId)).toEqual([id]);
      expect(entry.reconciles).toBeUndefined();
      expect(entry.oldHash).toBe(MISSING_MEMBER);
      expect(entry.newHash).not.toBe(MISSING_MEMBER);
      const path = approvedDeltaPath([entry], MISSING_MEMBER, entry.newHash);
      expect(path.status).toBe('approved');
      expect(approvedDeltaPath([], MISSING_MEMBER, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-13 frontier length-cut edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterHomeFeatured20261013, afterFrontierLengthCut20261013).map(x => x.id))
      .toEqual(frontierLengthCut20261013Appends);
    // One prose edge per article it cut, then one relationships edge per
    // article whose inline citations it changed; bear-case and
    // generalization keep their relationships record.
    const expected = [
      ...['bear-case', 'competing-theses', 'generalization', 'reliability-gap', 'safety-and-assurance']
        .map(slug => ['prose', slug]),
      ...['competing-theses', 'reliability-gap', 'safety-and-assurance'].map(slug => ['relationships', slug]),
    ].map(([manifest, slug]) => ({
      id: `length-cut-20261013-frontier-${manifest}-${slug}`, manifest, memberId: `article:frontier/${slug}`,
    }));
    expect(frontierLengthCut20261013Appends).toEqual(expected.map(x => x.id));
    for (const [index, id] of frontierLengthCut20261013Appends.entries()) {
      const entry = merged.find(x => x.id === id)!;
      expect([entry.manifest, entry.memberId]).toEqual([expected[index].manifest, expected[index].memberId]);
      // Approved by the owner's instruction, not as release approval, and
      // naming the continuity review that rebuilds the article's earlier
      // bytes and lists what it dropped.
      expect(entry.ownerApproval).toContain(
        '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
      expect(entry.ownerApproval).toContain('Not release approval.');
      expect(entry.reason).toContain('audit/evidence/length-cut-20261013-frontier/source-transition.json');
      expect(entry.affectedAssertions).toEqual(['VAL-OPUS-083', 'VAL-OPUS-084',
        'VAL-B2-BASE-002', 'VAL-B2-BASE-010', 'VAL-B2-BASE-011', 'VAL-B2-BASE-012']);
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      expect(edges.at(-1)).toBe(entry);
      expect(frontierLengthCut20261013Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-12 humanize edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterFrontierLengthCut20261013, afterHumanize20261012).map(x => x.id))
      .toEqual(humanize20261012Appends);
    const domains: ReadonlyArray<readonly [string, readonly string[]]> = [
      ['manipulation', ['action-chunking', 'action-spaces', 'bc-foundations', 'comparison-matrix', 'cross-embodiment',
        'diffusion-policy', 'foundation-models', 'generalist-policies', 'hierarchical', 'knowledge-insulation',
        'pi-line', 'realtime-execution', 'rl-finetuning', 'robot-learning-roadmap', 'vla-models']],
      ['classical', ['calibration', 'control', 'grasp-planning', 'kinematics', 'motion-planning', 'perception',
        'ros2-for-ml-engineers', 'scene-representation', 'state-estimation']],
      ['rl-sim2real', ['humanoid-wbc', 'legged-locomotion', 'offline-rl', 'parallel-sim-rl', 'reward-design-mpc',
        'rl-for-robotics', 'sim2real-transfer', 'why-rl-locomotion']],
    ];
    const manifests = ['prose', 'relationships'];
    // Domain by domain: one prose edge per article, then one relationships edge per article.
    const expected = domains.flatMap(([domain, slugs]) => manifests.flatMap(manifest =>
      slugs.map(slug => ({ id: `humanize-20261012-${domain}-${manifest}-${slug}`, manifest,
        memberId: `article:${domain}/${slug}` }))));
    expect(humanize20261012Appends).toEqual(expected.map(x => x.id));
    for (const [index, id] of humanize20261012Appends.entries()) {
      const entry = merged.find(x => x.id === id)!;
      // Approved by the owner's instruction, and naming the continuity review
      // that rebuilds the article's earlier bytes and lists what it dropped.
      expect([entry.manifest, entry.memberId]).toEqual([expected[index].manifest, expected[index].memberId]);
      expect(entry.ownerApproval).toContain(
        '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
      expect(entry.reason).toContain('audit/evidence/length-cut-20261012/source-transition.json');
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      // Only images bundle A of 2026-10-13 may move the member after the cut.
      expect(edges.slice(edges.indexOf(entry) + 1).map(x => x.id))
        .toEqual(imagesA20261013Edges(entry.manifest, entry.memberId));
      expect(humanize20261012Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-13 isometric figure edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterHumanize20261012, afterAnatomy3Figures20261013).map(x => x.id))
      .toEqual(anatomy3Figures20261013Appends);
    expect(anatomy3Figures20261013Appends).toEqual([
      'compounding-error-expression-aria-label-3',
      'execution-modes-expression-aria-label-1', 'execution-modes-expression-aria-label-2',
      'latency-comparison-expression-aria-label-3',
      'offline-value-overreach-expression-aria-label-2',
      'retargeting-gap-expression-aria-label-2',
      'trajectory-stitching-expression-aria-label-1',
      'execution-modes-literal-aria-label-1',
    ].map(suffix => `anatomy-3-figures-20261013-accessible-names-${suffix}`));
    // Every edge is an accessible name on one of the six redrawn figures, and
    // cites the owner directive that ordered the redraw. The figures the
    // batches left as they were are not part of the landing, so no edge names them.
    const sources = ['compounding-error', 'execution-modes', 'latency-comparison', 'offline-value-overreach',
      'retargeting-gap', 'trajectory-stitching'].map(name => `components/interactive/${name}.tsx`);
    for (const id of anatomy3Figures20261013Appends) {
      const entry = merged.find(x => x.id === id)!;
      expect(entry.manifest).toBe('accessible-names');
      expect(entry.memberId).not.toMatch(/cross-embodiment|reward-shaping|mpc-vs-rl|terrain-curriculum/);
      const file = entry.memberId.replace(/^(?:expression|literal):/, '').replace(/:aria-label:\d+$/, '');
      expect(sources).toContain(file);
      expect(entry.ownerApproval).toContain(
        '"Redo all of the animations and stuff like that with this type of animation and with this skill');
      expect(entry.ownerApproval).toContain('Not release approval.');
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      expect(edges.at(-1)).toBe(entry);
      expect(anatomy3Figures20261013Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(prior.some(x => x.reconciles !== undefined)).toBe(false);
      expect(entry.reconciles).toBeUndefined();
      expect(entry.oldHash).toBe(previous);
      expect(entry.newHash).not.toBe(previous);
      if (previous !== sealed) expect(approvedDeltaPath(prior, sealed, previous).status).toBe('approved');
      if (entry.newHash === sealed) {
        // Added after the seal and removed again: the member is back where the
        // seal left it, absent, so the baseline needs no path to it. The
        // removal edge is what drops the earlier addition from the
        // article-truth population.
        expect(sealed).toBe(MISSING_MEMBER);
        expect(prior.some(x => x.oldHash === MISSING_MEMBER)).toBe(true);
        expect(approvedDeltaPath(edges, sealed, entry.newHash).status).toBe('missing');
        continue;
      }
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-13 image edge to its previous endpoint or to an absent seal', () => {
    expect(merged.slice(afterAnatomy3Figures20261013, afterImagesA20261013).map(x => x.id))
      .toEqual(imagesA20261013Appends);
    const review: { sources: Array<{ after: { path: string }; mounts: string[] }> } = JSON.parse(
      readFileSync('audit/evidence/image-mounts-20261013/source-transition.json', 'utf8'));
    const articles = review.sources.map(({ after }) => after.path.replace(/^content\//, '').replace(/\.mdx$/, ''));
    const images = [...new Set(review.sources.flatMap(({ mounts }) => mounts))];
    const byMember = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });
    // One prose edge per article that gained image mounts, then one edge per
    // registered image, each group in member order.
    expect(imagesA20261013Appends).toEqual([
      ...articles.map(article => `article:${article}`).sort(byMember)
        .map(memberId => `images-a-20261013-prose-${memberId.slice('article:'.length).replace('/', '-')}`),
      ...images.map(image => `registered-image:${image}`).sort(byMember)
        .map(memberId => `images-a-20261013-assets-svg-${memberId.replace(':', '-')}`),
    ]);
    for (const id of imagesA20261013Appends) {
      const entry = merged.find(x => x.id === id)!;
      // Approved by the owner's directive, and not a release approval.
      expect(entry.ownerApproval).toContain(
        '"i also want to use proper images etc! [...] license free images to accompany the articles etc. like wikipedia"');
      expect(entry.ownerApproval).toContain('Not release approval.');
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      expect(edges.at(-1)).toBe(entry);
      expect(imagesA20261013Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      if (entry.manifest === 'prose') {
        // An article edge names the continuity review that rebuilds the
        // article's earlier bytes by taking out exactly its image mounts.
        expect(articles).toContain(entry.memberId.slice('article:'.length));
        expect(entry.reason).toContain('audit/evidence/image-mounts-20261013/source-transition.json');
      } else {
        // A registered image is new: the seal never held it and no earlier
        // edge names it.
        expect(entry.manifest).toBe('assets-svg');
        const image = entry.memberId.slice('registered-image:'.length);
        expect(images).toContain(image);
        expect(sealed).toBe(MISSING_MEMBER);
        expect(prior).toEqual([]);
        expect(entry.reason).toContain(`public/images/${image}.jpg`);
      }
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-14 frontier length-cut edge to its previous endpoint and to the sealed hash', () => {
    expect(merged.slice(afterImagesA20261013).map(x => x.id)).toEqual(frontierLengthCut20261014Appends);
    // The dexterity prose, its relationships record (one fewer glossary
    // link), and the article's sealed "not disclosed" render site, which the
    // cut closes.
    const expected = [
      ['prose-dexterity', 'prose', 'article:frontier/dexterity'],
      ['relationships-dexterity', 'relationships', 'article:frontier/dexterity'],
      ['value-states-dexterity-not-disclosed-1', 'value-states',
        'state-site:content/frontier/dexterity.mdx:not-disclosed:1'],
    ].map(([suffix, manifest, memberId]) => ({ id: `length-cut-20261014-frontier-${suffix}`, manifest, memberId }));
    expect(frontierLengthCut20261014Appends).toEqual(expected.map(x => x.id));
    const review: { sources: Array<{ archivedFrom: string; after: { path: string } }> } = JSON.parse(
      readFileSync('audit/evidence/length-cut-20261013-frontier/source-transition.json', 'utf8'));
    expect(review.sources.filter(x => x.after.path === 'content/frontier/dexterity.mdx').map(x => x.archivedFrom))
      .toEqual(['9a0a3ae5b454de2c884f6b840c27e4fce7f1932f']);
    for (const [index, id] of frontierLengthCut20261014Appends.entries()) {
      const entry = merged.find(x => x.id === id)!;
      expect([entry.manifest, entry.memberId]).toEqual([expected[index].manifest, expected[index].memberId]);
      // Approved by the owner's instruction, not as release approval, and
      // naming the continuity review that rebuilds the article's earlier
      // bytes and lists what it dropped.
      expect(entry.ownerApproval).toContain(
        '"ensure we remove AI slop etc and keep it extremely premium. not too long text."');
      expect(entry.ownerApproval).toContain('Not release approval.');
      expect(entry.reason).toContain('audit/evidence/length-cut-20261013-frontier/source-transition.json');
      expect(entry.affectedAssertions).toEqual(entry.manifest === 'value-states'
        ? ['VAL-OPUS-083', 'VAL-OPUS-084', 'VAL-B2-BASE-002', 'VAL-B2-BASE-010', 'VAL-B2-BASE-013']
        : ['VAL-OPUS-083', 'VAL-OPUS-084', 'VAL-B2-BASE-002', 'VAL-B2-BASE-010', 'VAL-B2-BASE-011',
          'VAL-B2-BASE-012']);
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      const sealed = sealedManifest.members.find(x => x.id === entry.memberId)?.hash ?? MISSING_MEMBER;
      const edges = merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId);
      expect(edges.at(-1)).toBe(entry);
      expect(frontierLengthCut20261014Edges(entry.manifest, entry.memberId)).toEqual([id]);
      const prior = edges.slice(0, edges.indexOf(entry));
      const previous = prior.at(-1)?.newHash ?? sealed;
      expect(entry.newHash).not.toBe(previous);
      if (entry.manifest === 'value-states') {
        // The seal held this site and no earlier edge moved it; the cut
        // removes it, so the edge ends at an absent member.
        expect(sealed).not.toBe(MISSING_MEMBER);
        expect(prior).toEqual([]);
        expect(entry.newHash).toBe(MISSING_MEMBER);
      }
      const path = approvedDeltaPath([...prior, entry], sealed, entry.newHash);
      expect(path.status).toBe('approved');
      expect(path.path.at(-1)).toBe(entry);
      if (prior.some(x => x.reconciles !== undefined)) {
        expect(entry.oldHash).toBe(sealed);
        expect(entry.reconciles).toEqual(prior.map(x => ({ id: x.id, oldHash: x.oldHash, newHash: x.newHash })));
      } else {
        expect(entry.reconciles).toBeUndefined();
        expect(entry.oldHash).toBe(previous);
      }
      expect(approvedDeltaPath(prior, sealed, entry.newHash).status).not.toBe('approved');
    }
  });

  it('binds each 2026-10-05 how-robots-work name to an absent seal as one plain edge', () => {
    expect(merged.filter(x => x.id.startsWith('how-robots-work-20261005-')).map(x => x.id))
      .toEqual(howRobotsWork20261005Appends);
    for (const id of howRobotsWork20261005Appends) {
      const entry = merged.find(x => x.id === id)!;
      const sealedManifest: { members: Array<{ id: string; hash: string }> } = JSON.parse(
        readFileSync(`evidence/brand-v2/baseline/${entry.manifest}.json`, 'utf8'));
      expect(sealedManifest.members.some(x => x.id === entry.memberId)).toBe(false);
      expect(merged.filter(x => x.manifest === entry.manifest && x.memberId === entry.memberId)).toEqual([entry]);
      expect(entry.reconciles).toBeUndefined();
      expect(entry.oldHash).toBe(MISSING_MEMBER);
      const path = approvedDeltaPath([entry], MISSING_MEMBER, entry.newHash);
      expect(path.status).toBe('approved');
      expect(approvedDeltaPath([], MISSING_MEMBER, entry.newHash).status).not.toBe('approved');
    }
  });
});
