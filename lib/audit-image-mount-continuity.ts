/**
 * Exact successor review for the articles that gained registered images on
 * 2026-10-13 (images bundle A: the manipulation, world-models, classical and
 * rl-sim2real articles; Josef, 11 Oct 2026: "i also want to use proper images
 * etc! [...] license free images to accompany the articles etc. like
 * wikipedia"). Each image adds one thing to an article and changes nothing
 * else: its one-line `<Image id="..." />` mount on its own line between blank
 * lines, after the lead paragraph or the paragraph of the section it
 * illustrates. Only the image ids listed in the pins block below are
 * admitted, each at most once per article, and the article needs no import
 * line because the mdx components resolve `Image` to the registry. Each change
 * is recorded as exact edits over the bytes the article had before, so the
 * earlier bytes are rebuilt from the live file instead of being archived.
 * The artifact reader hands every older check the rebuilt bytes only while
 * the live article is exactly the reviewed successor, reversing the edits
 * rebuilds bytes that hash to the recorded predecessor, replaying them gives
 * the live bytes back, and removing the admitted mounts from the live
 * article gives the predecessor exactly. No old review, run, receipt,
 * capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const IMAGE_MOUNT_CONTINUITY_DIR = 'audit/evidence/image-mounts-20261013/';
const reviewFile = `${IMAGE_MOUNT_CONTINUITY_DIR}source-transition.json`;
const drift = 'image mount continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type ImageMountEdit = { before: string; after: string };
export type ImageMountSource = {
  archivedFrom: string; before: Artifact; after: Artifact; mounts: string[]; edits: ImageMountEdit[];
};
export type ImageMountReview = {
  schemaVersion: 'image-mount-continuity-v1';
  name: 'image-mounts-20261013';
  reviewedBy: string;
  ownerApproval: string;
  rationale: string;
  observedAt: string;
  sources: ImageMountSource[];
};

// BEGIN image-mount pins (written by scripts/record-image-mount-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 176288, sha256: '09f057b654024e2f8f45f8d7fea918963972837bb07cee7ff55181ce73f18615' };

/** The registered image ids whose one-line mounts the review admits. */
const admitted: ReadonlySet<string> = new Set([
  'action-space-study-platforms-2026',
  'adaptive-compliance-tasks-2024',
  'aloha-2-workcell-2024',
  'aloha-unleashed-shirt-rollout-2024',
  'aloha-unleashed-tasks-2024',
  'amazon-drive-unit-2023',
  'amazon-swindon-slam-line-2025',
  'anymal-x-offshore-stairs-2022',
  'apollo-guidance-computer-dsky',
  'apollo-imu-draper-2019',
  'asimo-miraikan-2016',
  'atlas-darpa-testing-2013',
  'atlas-electric-hyundai-goyang-2026',
  'atlas-vrc-simulation-2013',
  'baxter-gripper-wrist-camera',
  'baxter-rethink-innorobo-2015',
  'bmw-leipzig-body-shop-spot-welding-2005',
  'bridgedata-v2-sink-tasks-2023',
  'care-o-bot-grasping-2010',
  'cassie-oregon-state-2017',
  'centrifugal-governor-queen-street-mill',
  'clearpath-jackal-ugv-2020',
  'cmu-boss-urban-challenge-winner',
  'conrft-real-world-tasks-2025',
  'cosmos-policy-aloha-2026',
  'da-vinci-xi-patient-cart-2018',
  'da-vinci-xi-surgeon-console-vesoul-2023',
  'daydreamer-a1-push-recovery-2022',
  'daydreamer-a1-rollover-2022',
  'daydreamer-ur5-pick-place-2022',
  'dextre-canadarm2-iss-2017',
  'dji-mavic-pro-in-flight',
  'dp3-real-robot-setup-2024',
  'dreamerv3-open-loop-quadruped-2023',
  'droid-camera-calibration-2024',
  'droid-cook-lentils-rollouts-2024',
  'droid-in-the-wild-scenes-2024',
  'droid-robot-platform-2024',
  'egoscale-human-to-robot-2026',
  'egoscale-robot-platforms-2026',
  'emergency-stop-siemens-2006',
  'fingr-cube-layer-turn-2026',
  'gaussian-splatting-garden-2023',
  'gemini-robotics-aloha-dexterous-2025',
  'gemini-robotics-apollo-franka-2025',
  'gr00t-n1-gr1-tasks-2025',
  'gr1-video-prediction-2023',
  'gr2-multitask-settings-2024',
  'hamster-2d-paths-2025',
  'hil-serl-tasks-2024',
  'horse-in-motion-muybridge-1878',
  'ingenuity-mastcam-z-closeup-2021',
  'inl-hot-cell-manipulators-2006',
  'isaac-gym-allegro-envs-2021',
  'isaac-gym-anymal-real-stairs-2021',
  'isaac-gym-anymal-terrain-2021',
  'isaac-gym-shadow-hand-envs-2021',
  'isaac-gym-trifinger-env-2021',
  'isaac-lab-assembly-real-2025',
  'isaac-lab-assembly-sim-2025',
  'jetson-agx-orin-auledas-2024',
  'kinect-xbox-360-sensor',
  'kinect-xbox-one-sensor',
  'knowno-ask-for-help-2023',
  'kuka-bread-palletizing-bakery-2005',
  'leica-laser-tracker-ats600',
  'libero-benchmark-overview-2023',
  'mini-cheetah-spin-rapid-locomotion-2022',
  'motion-capture-session-hyderabad-2026',
  'moxie-installation-perseverance-2020',
  'mujoco-playground-environments-2025',
  'mujoco-playground-franka-block-2025',
  'navlab-1-5-cmu-2017',
  'nist-dexterous-manipulation-testbed-2013',
  'ocado-warehouse-grid-bots-2017',
  'octo-evaluation-setups-2024',
  'open-x-embodiment-overview-2023',
  'openvla-overview-2024',
  'ouster-lidar-point-cloud-sf',
  'perseverance-selfie-rochette-2021',
  'phantom-human-video-robot-2025',
  'pi0-fast-laundry-folding-2025',
  'pi0-fast-table-bussing-2025',
  'pi06-box-building-2025',
  'pi06-espresso-2025',
  'pld-gpu-insertion-2025',
  'pr2-maker-faire-2011',
  'pr2-willow-garage-2010',
  'puma-500-deutsches-museum',
  'racing-quadrotor-minion-220-2016',
  'realsense-d435-depth-camera',
  'roboarena-evaluation-2025',
  'robocasa-kitchens-2024',
  'robocasa-object-library-2024',
  'robocat-embodiments-2023',
  'robotic-welding-cell-guarding-2014',
  'roboworld-bair-forcing-2026',
  'roboworld-contact-failures-2026',
  'roboworld-synthetic-scenes-2026',
  'roomba-870-2014',
  'rt-h-language-corrections-2024',
  'rtc-candle-lighting-2025',
  'schunk-svh-five-finger-hand',
  'shadow-hand-lightbulb-2007',
  'simpler-real-vs-sim-2024',
  'simpler-visual-matching-2024',
  'spot-boston-dynamics-2023',
  't-rex-bimanual-tactile-setup-2026',
  'tdmpc2-task-grid-2023',
  'tesla-optimus-stockholm-2024',
  'umi-handheld-grippers-2024',
  'umi-test-environments-2024',
  'unitree-g1-stage-japan-mobility-2025',
  'unitree-robots-japan-mobility-show-2025',
  'ur16e-cobot-arm-2020',
  'uskin-tactile-allegro-hand-2021',
  'velodyne-hdl64-lidar-2009',
  'vjepa2-overview-2025',
  'vjepa2-pick-place-goals-2025',
  'waymo-jaguar-ipace-san-francisco-2023',
  'waymo-roof-sensor-suite-2025',
  'wcbf-hyper-redundant-robot-2026',
]);

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/adjacent/autonomous-vehicles.mdx', [20460, '49118a4634c77b3a64dbef740232adb56675a62b5d3527649c327268fe20816b']],
  ['content/adjacent/drones.mdx', [12992, '701be0c28cea61567e4a48e1dda26df1c213747fbbad71fe3fd5e39a7b588958']],
  ['content/adjacent/space.mdx', [13751, '65e0c08f4d86447344531aee2e1231ff77cb6131f254752e2b789dfdd869a7e4']],
  ['content/adjacent/surgical.mdx', [12431, 'af0187f6b73b19cf8f85c772672725687f36788afaf090ea1ba3893ada5cf7e3']],
  ['content/classical/calibration.mdx', [8186, '1be288684890f4acb3526b0054ded937aacbe67aee8caa185089e12c86bb2c9d']],
  ['content/classical/control.mdx', [16856, 'b9262408942a654683cd35db3711dbb3d94611b14007855651a6b8a3a2e4a54a']],
  ['content/classical/grasp-planning.mdx', [12638, '319462256bce91bc457ae3ce5a91bd36f7b8418244a4e0ea331438e4167cf00c']],
  ['content/classical/kinematics.mdx', [10771, 'ba9f8e122801d873d4b13b4ee118a6166a976a9420f84c485e614e04716c81f6']],
  ['content/classical/motion-planning.mdx', [18261, 'b9bf3ac50a85dbe34c942f6a7df3490ab044570e9e30a71ae4cd9cfeac65f3cc']],
  ['content/classical/perception.mdx', [21653, '5377e9b86f325dcf85a1655d9fde3d05be3636fd9c3ac5e31fce1f364599ce82']],
  ['content/classical/ros2-for-ml-engineers.mdx', [8903, '676d1a3e723e9478440dba49b0e10f70bd4f37e5b68bea5d1c8daa2d6730a520']],
  ['content/classical/scene-representation.mdx', [16376, '6edf589ee7e9df47cb1a2c4abb73af29bc2e9de446f4a509da924e1c06d0b0cc']],
  ['content/classical/state-estimation.mdx', [13954, '4f1273c98646879313c894112257f0297e352e88510b52132ab1254537a9742e']],
  ['content/data-hardware/data-bottleneck.mdx', [14264, '0e5457aa30ececce1bc3cba3c5a942c439c8866e879d38c9aa8f2f1c113d4081']],
  ['content/data-hardware/datasets.mdx', [12114, '698cf0598593f1319c0eae955056fd78f927db7bd3a3f026c795ad3aad00fc51']],
  ['content/data-hardware/evaluation-crisis.mdx', [14999, 'ebdc3f24dcd30fbc4ef0209eabb8dc5d560c79f72d79b330a171dfd3f928369c']],
  ['content/data-hardware/hardware-taxonomy.mdx', [11225, '01727d1b7c0ddd110bdafd3c957475ab217d338cf71adad943ce4bf76969a180']],
  ['content/data-hardware/industrial-deployment.mdx', [16804, '94b8a5c72d665ae962cea8660744c5642e22577817f123bb321a4273749b708b']],
  ['content/data-hardware/robot-learning-stack.mdx', [10400, 'd99fefaa46143123a2137469f40151feff6f3c8824ee35e796b95b09b7628ff7']],
  ['content/data-hardware/teleop-rigs.mdx', [9589, 'a3a49cb85b1ef94c4569ae2516102b5aec1aabfbf5b57681d9de9b07e9bc42f3']],
  ['content/frontier/bear-case.mdx', [10119, 'bfac4a48de3b0c71bd41e20e1eb1b7508898fd31d60e904729b50714b073e2a8']],
  ['content/frontier/competing-theses.mdx', [14365, '86e4399da86ea923b7ea52759b903c61deba9df47b5167a6d021429da1d3bec7']],
  ['content/frontier/dexterity.mdx', [17774, '62e378f98f9ae2edaacb5e154f17ab248d5c2afd7e0909174841a6fd3858beeb']],
  ['content/frontier/generalization.mdx', [13877, '366bd6912eba30acfc126a77745868bfcba8a0cb5adc8ae0717c5b073ebb311e']],
  ['content/frontier/reliability-gap.mdx', [10847, '55c19e0c4f96b2c286b480f128c19c51f60f47d73960cd77a114c7a88c17d7da']],
  ['content/frontier/safety-and-assurance.mdx', [18343, '4c763d7b789d26e9bccdb0aad7b2c66a241d72fef111583e02429723f1ab760c']],
  ['content/manipulation/action-chunking.mdx', [10683, '8f270d172551c6dddf41a447721c34131bd0fc7c8255d75829e9164f88f9743a']],
  ['content/manipulation/action-spaces.mdx', [8989, '62fe978b227865f84c69a7e1008bf7df558019ae5f17f21ecc349e9782d9c361']],
  ['content/manipulation/bc-foundations.mdx', [12584, 'ba3b209ad17ac41a97500ddb679fa7202258d42844018a9227dca80359c2d523']],
  ['content/manipulation/comparison-matrix.mdx', [9382, 'ebdc0ce5e86afca1edc616ca74bcb19ac47b488866ea5ce714f896181ce824ee']],
  ['content/manipulation/cross-embodiment.mdx', [9803, '4cb0ce6f4c00c06f350e83304a3557bd0db30ea2fd542287fbcbccfeccfdefa2']],
  ['content/manipulation/diffusion-policy.mdx', [9652, '54f0f2f2c5f094a44a386c62dc1ee14a9fc9f8aa5e1d3b6c33920556f8053dc9']],
  ['content/manipulation/foundation-models.mdx', [9075, 'cacda44e0e9779003e5e9ed3be07c966810c8b3dfe743a2424681abc8f74513f']],
  ['content/manipulation/generalist-policies.mdx', [10755, '52496ab38e8d5ea4680e488a1978f5b6f7f7c34614b9d6b5a57106a46318a5b9']],
  ['content/manipulation/hierarchical.mdx', [11881, '8577693c9ebe209e5abf4f2d1edfa8e2df813c18d374331aeef2ab673511e691']],
  ['content/manipulation/knowledge-insulation.mdx', [8651, 'b97c1b7b1971dd73d103fa5479680813c69375fda35f1dd791553d76de904d9b']],
  ['content/manipulation/pi-line.mdx', [12914, '22b3e62a57a42dda336cda4619dc08bfaf177e094f4d7586044f8ee47bbd077c']],
  ['content/manipulation/realtime-execution.mdx', [9955, '6bf678385cee70644020bce85b7d9a48f3b06af44c4c6177428ae2ddd03933e5']],
  ['content/manipulation/rl-finetuning.mdx', [18148, '7749de405711f539b2471cf5298bd9d68dd60ed068e846d8a6429fa42a089dd6']],
  ['content/manipulation/robot-learning-roadmap.mdx', [8930, '186f8f71aa2f8f72939bee3db299c71463ff20303aae669571947433f27f4135']],
  ['content/manipulation/vla-models.mdx', [12509, '593b9ddd9d7a85673c682eb4e1cb66fee91503e76bf0a21e50275cc1e73008f4']],
  ['content/rl-sim2real/humanoid-wbc.mdx', [11708, '0d15eb18c58ed67c3384abc488271e21fce251942ec703d53ecbf807c93c3818']],
  ['content/rl-sim2real/legged-locomotion.mdx', [11304, '7e84805b270b605d2d9718825b5861c6a51c68cfec7569af86d11ecaca07fab3']],
  ['content/rl-sim2real/offline-rl.mdx', [10788, 'b34063066228dc15860f6b1d5faf3e8148e8e660146abc5b181df6659e17f37c']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [10077, '4309475a7e10f3ed0cbfede8a8b55a8983bbce35ffdf133e224dd13bea396e9b']],
  ['content/rl-sim2real/reward-design-mpc.mdx', [13919, '1dca36a9eae1c46dee33b6ee9efb6ac7d569888b6935ce5898258a10aef9e352']],
  ['content/rl-sim2real/rl-for-robotics.mdx', [12201, '198f6cbb974adb9d743d052d0d59cbe0a6cb342e8ae94417a41d80d4f8609aa8']],
  ['content/rl-sim2real/sim2real-transfer.mdx', [14729, 'cbe27c4618cdc3a5ab0b00dc4a3e840746729c9e6287905f2af2dea6127d82f7']],
  ['content/rl-sim2real/why-rl-locomotion.mdx', [7902, '751f42924e9933e040e7beaca56c414443930ea98f90bbb3b552f4fcd2664bce']],
  ['content/world-models/evaluation.mdx', [9650, '7e097f28165e752ab573e215f3048f29d2d11ca2600b4e63661fedeecb61a094']],
  ['content/world-models/generative-sim.mdx', [12599, '6355e16b329d92721ba982e003154d028c1b1ffdddc6721b0d854f3f90fe3ea5']],
  ['content/world-models/generative-video.mdx', [13954, 'dcf47edcbd75508f396caaf7b2a443e6dbdb7bb41b1cf8dad2941cad2ea134d6']],
  ['content/world-models/jepa.mdx', [12060, '6a4e35424dc85f07227a770bf08863f945de7405c361e8fc84be9e968125272a']],
  ['content/world-models/latent-dynamics.mdx', [10797, '89dea20591cce8527f71c692ca2285389bf9c2274322ef28523823b42dbaf61e']],
  ['content/world-models/model-based-robot-learning.mdx', [8954, '5da85a65adb26741b0560410aea79520f7e8ed3d504eb69eb6e9bdce9b7a57e5']],
  ['content/world-models/taxonomy.mdx', [12579, '937ab8c9c797b8a0f7b24f6b4ca8f08b777cfb3f21f8f366900873526d5d3d1e']],
  ['content/world-models/world-models-vs-simulators.mdx', [11462, '203db84ca9cf49e7c66583aff74cb5b47ba285eb5884d099ed89a2a09ec69ddf']],
]);
// END image-mount pins

/** The admitted image ids, sorted. */
export const imageMountIds = (): readonly string[] => [...admitted].sort();

const mountLine = (id: string) => `\n\n<Image id="${id}" />\n\n`;

/** The admitted image ids mounted in an article, in document order. */
export function imageMountsIn(source: string, ids: Iterable<string> = admitted): string[] {
  const found: [number, string][] = [];
  for (const id of ids) {
    const at = source.indexOf(mountLine(id));
    if (at >= 0) found.push([at, id]);
  }
  return found.sort(([a], [b]) => a - b).map(([, id]) => id);
}

/**
 * The article with each admitted image's one-line mount taken out. A mount
 * is taken out only when it appears exactly once; anything else is left in
 * place, so it cannot match a predecessor that lacked it.
 */
export function withoutImageMounts(source: string, ids: Iterable<string> = admitted): string {
  let result = source;
  for (const id of ids) {
    const parts = result.split(mountLine(id));
    if (parts.length !== 2) continue;
    result = parts.join('\n\n');
  }
  return result;
}

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;

function applyExact(text: string, edits: readonly (readonly [string, string])[]): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    result = parts.join(to);
  }
  return result;
}

/**
 * The article obligations of an image-mount change: the article is a content
 * MDX file, it changed, the mounts it gained are exactly `mounts` (admitted
 * ids, each once, none already in the prior article), and taking them out
 * gives the prior bytes exactly, so no prose, number, citation, frontmatter
 * field, import or other mount moved.
 */
export function keepsImageMountObligations(
  path: string, prior: string, current: string, mounts: readonly string[], ids: ReadonlySet<string> = admitted,
): boolean {
  if (!path.startsWith('content/') || !path.endsWith('.mdx') || prior === current) return false;
  if (mounts.length === 0 || new Set(mounts).size !== mounts.length || mounts.some((id) => !ids.has(id))) return false;
  if (mounts.some((id) => prior.includes(`<Image id="${id}"`))) return false;
  if (mounts.some((id) => current.split(`<Image id="${id}"`).length !== 2)) return false;
  if (imageMountsIn(current, mounts).join('\n') !== mounts.join('\n')) return false;
  return withoutImageMounts(current, mounts) === prior;
}

/**
 * The pre-mount bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyImageMountSource(source: ImageMountSource, live: Buffer): Buffer {
  const edits = source.edits ?? [];
  const path = source.after?.path;
  if (!path || source.before?.path !== path || !/^[0-9a-f]{40}$/.test(source.archivedFrom ?? '') ||
    !same(source.after, path, live.length, digest(live)) || edits.length === 0 ||
    edits.some(({ before, after }) => typeof before !== 'string' || typeof after !== 'string' ||
      !before || !after || before === after)) {
    throw new Error(drift);
  }
  const current = live.toString();
  const rebuilt = applyExact(current, edits.map(({ before, after }) => [after, before] as const).reverse());
  const prior = Buffer.from(rebuilt);
  if (!same(source.before, path, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits.map(({ before, after }) => [before, after] as const)) !== current ||
    !keepsImageMountObligations(path, rebuilt, current, source.mounts ?? [])) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, ImageMountReview>();
const priorCache = new Map<string, Buffer>();

export function loadImageMountReview(root: string): ImageMountReview {
  let bytes: Buffer;
  let review: ImageMountReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as ImageMountReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'image-mount-continuity-v1' || review.name !== 'image-mounts-20261013' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !(review.ownerApproval?.length > 40) ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
    throw new Error(drift);
  }
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  const mounted = new Set(review.sources?.flatMap(({ mounts }) => mounts ?? []));
  if (review.sources?.length !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after?.path) ||
      !same(after, after.path, ...successors.get(after.path)!)) ||
    mounted.size !== admitted.size || [...mounted].some((id) => !admitted.has(id))) {
    throw new Error(drift);
  }
  reviewCache.set(`${root}\0${digest(bytes)}`, review);
  return review;
}

function rebuiltPrior(root: string, path: string, live: Buffer): Buffer {
  const key = `${root}\0${path}\0${digest(live)}`;
  let prior = priorCache.get(key);
  if (!prior) {
    const source = loadImageMountReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyImageMountSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/** The paths the image-mount review holds a successor for. */
export const imageMountSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function imageMountPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}
