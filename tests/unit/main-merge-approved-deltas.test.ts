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
const afterRound6 = merged.length - opusFigureSystemAppends.length;
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
    // prose restores and remaining repairs and the figure-system resolution
    // add the edges named above.
    expect([main.length, local.length, localOnly.length, merged.length]).toEqual([1558, 1104, 7, 1776]);
    expect(merged.slice(0, main.length)).toEqual(main);
    expect(merged.slice(main.length, main.length + localOnly.length)).toEqual(localOnly);
    expect(merged.slice(main.length + localOnly.length).map(x => x.id))
      .toEqual([...resolutions.map(x => x[0]), ...packetAppends, ...techWithdrawalAppends, ...stackClassicalWorldRlAppends, ...searchStatesAppends, ...humanizerAppends, ...instrumentMigrationAppends, ...educationalConvergenceAppends, ...educationalRelocationAppends, ...educationalCueAppends, ...motionLanguageAppends, ...motionLanguageClipAppends, ...motionSceneEquationAppends, ...motionClassicalAppends, ...motionManipulationAppends, ...motionRlAppends, ...motionRlReconciliations, ...motionWorldModelAppends, ...motionDataHardwareAppends, ...motionFrontierAdjacentHomeAppends, ...motionScrutinyS12Appends, ...round5FirstScreenAppends, ...round5PinnedLeftoversAppends, ...round5FirstScreenCdAppends, ...sharedReaderLayoutAppends, ...round6ProseRestoreAppends, ...round6RemainingRepairAppends, ...opusFigureSystemAppends]);
    expect(merged.slice(beforeRound6.length, afterRound6Prose)).toMatchObject(round6ProseRestoreEndpoints.map(
      ([memberId, , newHash], index) => ({
        id: round6ProseRestoreAppends[index], manifest: 'prose', memberId, newHash,
      })));
    expect(merged.slice(afterRound6Prose, afterRound6)).toMatchObject(round6RemainingRepairEndpoints.map(
      ([manifest, memberId, oldHash, newHash], index) => ({
        id: round6RemainingRepairAppends[index], manifest, memberId, oldHash, newHash,
      })));
    expect(merged.slice(afterRound6)).toMatchObject([{
      id: opusFigureSystemAppends[0], manifest: 'prose',
      memberId: 'article:frontier/reliability-gap',
      oldHash: 'a94b57b4e2cddd579a0e06f83043b7f9e2c870129405af6dbacb1456be651a6c',
      newHash: 'ec938d42bd87814a5ef1f3c3808a4fbc645107b4e94e6a822646a0465610a063',
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
    const reliabilityEdges = merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:frontier/reliability-gap');
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
    const parallelEdges = merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:rl-sim2real/parallel-sim-rl');
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
      // Only a named round-6 restore may follow the move's own edge.
      const edges = all.slice(0, all.findIndex(x => x.id === round5FirstScreenCdAppends[index]) + 1);
      expect(all.slice(edges.length).map(x => x.id)).toEqual(round6ProseRestoreAppends
        .filter((_, restore) => round6ProseRestoreEndpoints[restore][0] === memberId));
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
    const layoutEdges = merged.filter(x => x.manifest === 'article-metadata'
      && x.memberId === 'canonical-metadata-source:app/layout.tsx');
    expect(layoutEdges.map(x => x.oldHash)).toEqual(layoutEdges.map(() => layoutSealed));
    expect(layoutEdges.at(-1)?.id).toBe(sharedReaderLayoutAppends[0]);
    expect(approvedDeltaPath(layoutEdges, layoutSealed, layoutCurrent))
      .toEqual({ status: 'approved', path: [layoutEdges.at(-1)] });
    expect(approvedDeltaPath(layoutEdges.slice(0, -1), layoutSealed, layoutCurrent).status)
      .toBe('missing');
    expect(approvedDeltaPath(layoutEdges, layoutSealed, '0'.repeat(64)).status).toBe('missing');
    const industrialProse = merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:data-hardware/industrial-deployment');
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
    expect(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:classical/calibration').at(-1)?.id)
      .toBe('motion-classical-humanizer-v3-20260927-prose-calibration');
    expect(merged.filter(x => x.manifest === 'prose'
      && x.memberId === 'article:world-models/world-models-vs-simulators').at(-1)?.id)
      .toBe('motion-world-models-humanizer-v3-20260927-prose-world-models-vs-simulators');
  });

  it('binds each round-6 prose restore to its previous endpoint and to the sealed hash', () => {
    const sealedProse: { members: Array<{ id: string; hash: string }> } = JSON.parse(
      readFileSync('evidence/brand-v2/baseline/prose.json', 'utf8'));
    for (const [index, [memberId, previous, current]] of round6ProseRestoreEndpoints.entries()) {
      const edges = merged.filter(x => x.manifest === 'prose' && x.memberId === memberId);
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
      const edges = merged.filter(x => x.manifest === manifest && x.memberId === memberId);
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
});
