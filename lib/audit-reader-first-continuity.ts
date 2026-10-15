/**
 * Exact successor review for the files the reader-first figure pass of
 * 2026-10-02 changed that an earlier review pins: articles, end-to-end
 * specs and figure sources. Each change is recorded as exact edits over the
 * bytes the file had before the pass, so the earlier bytes are rebuilt from
 * the live file instead of being archived. The artifact reader hands every
 * older check the rebuilt bytes only while the live file is exactly the
 * reviewed successor, reversing the edits rebuilds bytes that hash to the
 * recorded predecessor, and replaying them gives the live bytes back. An
 * article also keeps its frontmatter and every citation it had, and a spec
 * keeps at least as many expect and test calls. No old review, run,
 * receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const READER_FIRST_CONTINUITY_DIR = 'audit/evidence/reader-first-20261002/';
const reviewFile = `${READER_FIRST_CONTINUITY_DIR}source-transition.json`;
const drift = 'reader-first continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type ReaderFirstEdit = { before: string; after: string };
export type ReaderFirstSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: ReaderFirstEdit[] };
export type ReaderFirstReview = {
  schemaVersion: 'reader-first-continuity-v1';
  name: 'reader-first-figures';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: ReaderFirstSource[];
};

// BEGIN reader-first pins (written by scripts/record-reader-first-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 2515822, sha256: '6dfee43181c21708d9b841011dfca0e5912735fe36548c7d822b070ab5475c7c' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['app/globals.css', [22557, '16282239a80c8430852f8e2704be42eca775dd303dfe4d4488aac7e8f95b2093']],
  ['components/article/commit-to-reveal.tsx', [14313, 'b3892a0853de9f0ab7c89551ba68526b488cf17c87697f329827c5c7a873ee3b']],
  ['components/interactive/action-conditioning.tsx', [22777, '46775b06e3813068462354980bf19d72cc17b2ce3a61060857d1d17dbd3f2135']],
  ['components/interactive/action-tokenization.tsx', [24477, '436b3b7cd9c19cfd9936d97c4563a377925d06b0067199338e8b6ec2beead872']],
  ['components/interactive/advantage-scrubber.tsx', [25565, '5fdffe99f439cc07acc8867b706d9341546022a81fadf6282dd7701312f78f27']],
  ['components/interactive/appearance-physics-push.tsx', [23336, '7ef04f23748d014f6c214bdbf1eb7cb2591644607db0e89558e677a5c90a1f80']],
  ['components/interactive/calibration-chain.tsx', [18428, '2b83baaf6e298f990d071c0cdc26294ad99af689f991e7d4489f935cf0028deb']],
  ['components/interactive/chunk-size-curve.tsx', [15132, 'f0a2917f6a18c437a0b742dacb0224bba2c969647f337a2a4532215666bb3444']],
  ['components/interactive/collaborative-operation-modes.tsx', [34193, '08a645453bfb4c3107f71f77a92a9fa7099f1aa831fd1e2b67109a08a73ff261']],
  ['components/interactive/comparison-matrix.tsx', [22770, '9f299f07bedd55d4caf4ae83e957ef9ce542825aa87d2a1a8fe461a8a8eb10bc']],
  ['components/interactive/compounding-error.tsx', [30724, '4af94129619482fd805a5cdc971c5a12d16468712a9ffb7ffc4ef3e6734e5f09']],
  ['components/interactive/contact-geometry.tsx', [18023, 'bb1182075127986b33b234c95ecc7224a6730038f967cb057eaf99bcaa2221cb']],
  ['components/interactive/control-loop-budget.tsx', [18387, '49b9e85ba47fcf24e666459fa6527efad0121a0542c300ceeb2549b3332e079c']],
  ['components/interactive/cross-embodiment-strategies.tsx', [20615, 'f0e4c97877aaa65cfff17b5e291c1316adb670dd9822476def1256033bb8e712']],
  ['components/interactive/data-scale-chart.tsx', [26308, '57cb085733c10105cb0816d425901fbf0f7fba7bc795d2617b1fe7355f00ab57']],
  ['components/interactive/dataset-table.tsx', [9020, '0242321fee2a786af99810a301be1e4494f50a5e2e5f8ed0cea7ae0236372ba0']],
  ['components/interactive/deployment-dashboard.tsx', [15636, '4915dc96bb7363b63528087612458a146e2900de999137db1e1e09325255d2c9']],
  ['components/interactive/deployment-economics.tsx', [24316, 'aa26a80f3d59d7c418bc1aff157226fc4800ade07d5b611f4983d55f25295a55']],
  ['components/interactive/egoscale-scaling.tsx', [27149, '479b378d3741841069f42d5b2769dbc483ed8cb1eb0e9499743641d6f0b58fe8']],
  ['components/interactive/eureka-loop.tsx', [14258, '6a2afa4dada7bb72ca9a5989ed49f8d139e43a434358bb1ddb226345065d51ad']],
  ['components/interactive/execution-modes.tsx', [21040, '3e15e6b4c94ad13665451b4890257146c65d5fb5056a3cbab1143106e9a18755']],
  ['components/interactive/expo-ft-results.tsx', [12226, '932dd331c03fc13d370797ca308bd4b94f90fc32e65746fdf8f56270abeefc6a']],
  ['components/interactive/flow-matching-trajectory.tsx', [25181, 'a620de963ad8946d9b99e85c556fa19d869c003c216df2d748bf389060161648']],
  ['components/interactive/friction-transfer.tsx', [20299, 'e9aacd355c990df535d2de00e594e5e1665549117fd9cec2c6039253d64d93a1']],
  ['components/interactive/generalist-release-timeline.tsx', [19569, 'ba24349cc22b426f03704464b10be44edd9ccb8f890835c0b7a6e8e733e4cc2e']],
  ['components/interactive/grasp-wrench-lab.tsx', [29733, '9cf532c3193d0ef574aac30fccb04ba580770402a363020114dc87b17671871b']],
  ['components/interactive/hand-comparison.tsx', [15609, '76aa514f6eeb3173b5911b50569dd61eb864ab94e68c1bc46d2af1da24008cab']],
  ['components/interactive/hardware-guide.tsx', [10655, 'de9c934f26f16a81f84cc9cd3c78eca5be08524a23901897a4948e9876f4c4a3']],
  ['components/interactive/hierarchy-timescales.tsx', [18506, '7ee80bb328ebc0c091151c942bf6360f10517f8d4264e17341593cba1bae01fa']],
  ['components/interactive/impedance-contact-lab.tsx', [28630, '7c185f6445dd05ff0b80ee7487c43d41610bab4571168682bef288d46a3f9235']],
  ['components/interactive/jepa-planning.tsx', [20825, '75c3595b635610dc8184e20447903e236ef95496c4e9d68fe8d1d68939c5738e']],
  ['components/interactive/latency-comparison.tsx', [21988, '20dca515890b2d079d6169c505a381b179bbc96fb2476834278ba64bfdacdaa0']],
  ['components/interactive/latent-imagination.tsx', [20102, 'ab1666e52165331c367749540997f25250e4329844671b758899ddcabff99449']],
  ['components/interactive/milestones-watchlist.tsx', [14081, '5de90abb550b71e5365c8e891fefe44b9b24bb83d0736e01be137b591a7b761c']],
  ['components/interactive/mot-insulation.tsx', [24113, 'b08bcb79e0e2536a3701d69fee3a9da2fba11d7fe7f53be84b0a217409e9d0f7']],
  ['components/interactive/pendulum-controller.tsx', [20902, 'b5aeebd40c864836742bdbef3d7a7e77dbe7d5ba97956f7cc8810f6d5404e818']],
  ['components/interactive/perception-error-budget.tsx', [32469, '5e327d437898343f31751abec2491af4108c7b350ae9c3c8194371efc11c3d5f']],
  ['components/interactive/perception-latency.tsx', [23141, '47bf7f377bc4ebff309321f5d4fbd0b1e15d28f64b556056218429c0bbe94179']],
  ['components/interactive/pi-generation-timeline.tsx', [18546, '7a27595001c58e5089658a51bde5cab90581a72375bf609cbbf91edd7d1367cb']],
  ['components/interactive/planar-fk-arm.tsx', [13346, 'bcf7f0a8d168e8ea9719590e4aa3240c78197c4314477b65efc33b648919ed79']],
  ['components/interactive/receding-horizon.tsx', [22712, '640c5f59ea1676970af1588495d9c33b58d6e4eaa5cec683ee0b7ab0839bb465']],
  ['components/interactive/reliability-compounding.tsx', [19076, 'b07a31b6b8b2156598fe9d2e90473578e472245b123a97c75ed4863b953db2bd']],
  ['components/interactive/reward-shaping.tsx', [19275, '6479aa63dc2eaac8882e353505778238eac9e8002b8abedb9de83bac2a525bda']],
  ['components/interactive/ros2-policy-layout.tsx', [19132, '6667799c99e31fc255be27059f5bff14a3ff07d67bac22c978c61f52468c4d92']],
  ['components/interactive/rrt-explorer.tsx', [17210, 'aa8d2bed4309e16a39befdd06f4594db3ebbb4fdda0f893414506c8bde7c3d98']],
  ['components/interactive/sample-efficiency-ledger.tsx', [20328, '34782d11a7a48f00eade98ec0fc651c15f39c5c2503bfeee00fbf65614625838']],
  ['components/interactive/scene-representation-ladder.tsx', [33167, '2f250ed084865f4997586f5b92a0d574c75a669e81abf58aec1af3cc078ad759']],
  ['components/interactive/teacher-student.tsx', [14676, 'f689e8ed519e9d933c75945949b4886d1945bff1c61b1c842a5c64109c80237b']],
  ['components/interactive/teleop-rig-matrix.tsx', [8252, 'ef74ddfe18dee7b791b97d13b3f30032d20662c8f2fa8358f82dbed1c5412111']],
  ['components/interactive/thesis-explorer.tsx', [13363, '54279cd483fd09b3414a787c2862b7985adc217e0a1bcab8860b2aa2d87dc3c4']],
  ['components/interactive/wbc-decomposition.tsx', [14453, 'b588d52a32d59407b753d0f157420abc9b29b1b8b31e89af57022023502edb10']],
  ['components/interactive/wm-disambiguator.tsx', [22936, 'e8513e3aa8c5e3edeed57d0bc7072a32f60315f13c96d9d8aec2717753d2baf2']],
  ['components/motion/chart/chart-axes.tsx', [4508, '69fcf2832d6aee5e29bc8b74584dad5461b38c453ef88ada77aa9d2b3d84d717']],
  ['components/motion/chart/chart-layout.tsx', [5086, '9cd730cf44eaafff23708319430040ed6e3a16e89edf318526561393f30b4bd2']],
  ['components/motion/chart/chart-marks.tsx', [8842, '58c6ac94596f4db2372de3a472756c1734ddcc18dc48040753888ec8721ae9ae']],
  ['components/motion/chart/chart-tokens.ts', [3513, 'fd36d19b545b4deb478c4f8e061ac11a8a4ececfee0f1bd515667ed305bf3f7e']],
  ['components/motion/clip.tsx', [6910, '9f5bf57e9a743bd98a54895822909c318304568ed82159a0cd27651823c0e008']],
  ['components/motion/figure-frame.tsx', [13243, '1ac7662ae289eb576016cc543938f00fe4f1938a1aee363c510acf3d3cb5a11b']],
  ['components/motion/gripper-glyph.tsx', [1551, '5a2255d2268934f435fa0145b04ee526e166e0fe4f1d9b06d7b7c41af6d20335']],
  ['components/motion/motion-tokens.css', [2760, '0147a8766a15ad8078a1b97592e57ce149d0339ede9fa344152bf168e533845b']],
  ['components/motion/robot-dog.tsx', [12087, 'b242c176cb20ffdb06ae58f56b64c1207f068a2f66211f37859475b4ae745d2e']],
  ['components/motion/scene-chrome.tsx', [3867, 'dab590f363b5b0595d43c2461ab0a8712bff6ba6a22d25bafb5cbbf3161dc651']],
  ['components/motion/scene-mount.tsx', [6487, '0d4a984b5c95c82b1a155d2a9d38111447de9225f22c4974a71658df7a5432f7']],
  ['components/motion/scene-player.tsx', [13445, '38246aa84d7b3f9ac2eaa8de44e9941a7ae5b53d36df553fa2b394d6fe9a72e3']],
  ['components/motion/scenes/batch-scale.tsx', [12298, '07bd9e9882c36047595cc4d91c6bdb2db4ef069bfbbbd2c1aaf9d9e7db6e7be5']],
  ['components/motion/scenes/diffusion-denoising.tsx', [23356, 'ad3dd59c07e323e39eca5b3e9286ccb156b1e1c32816e963b9ba5cb974950e18']],
  ['components/motion/scenes/jam-overhead.tsx', [17104, '5cefad7cf3983dcf420d9540dd048d8c7aaa927379761a769dee02306e55569d']],
  ['components/motion/scenes/kalman-predict-update.tsx', [23962, 'dc30bbc875832a9ebd62219356052d7e4335e1f51288191d59c37aafea41d7df']],
  ['components/motion/scenes/sense-avoid.tsx', [17526, 'b80468ebc9c82eb6240e8fc63861af9d549cb6fdf99c9351381d79ce43127c01']],
  ['components/motion/scenes/tactile-slip.tsx', [16405, 'cae57d8ffdd91c8efca1712b9f179c0ef91383be13c0fa8fe9f959a780a84504']],
  ['components/motion/stage.css', [14789, '82a50059a6eb2c9d57fab97f8be6132e053b15b421566941f3d4bdd8d5e54f42']],
  ['components/ui/chart-description.tsx', [7860, 'e4b15bd32ef9dd83d63c4a05b593cab3c94d53bc049146f13ee93a545b5beb93']],
  ['components/ui/figure.tsx', [8156, '668bbbade6b4097cdaea3522ccc2b1de7ab712bf16fecfe5f922915588701535']],
  ['components/ui/instrument.tsx', [14003, 'e0343fb68235c5925a853b703508915ca511954403c9470f8d319edacea7e01b']],
  ['components/ui/original-schematics.tsx', [10541, 'b070e4319a9e83abec9a435612fa9efbf119895906cb856cce49abdd9b01e2c1']],
  ['components/ui/stage-status-chip.tsx', [1316, 'bf25270b9a0a9b6223af19ca77876c6c2be6d2bb06c2802b30982ce069388ef2']],
  ['components/ui/surface.tsx', [1094, 'ecd93d3fca25d478c2b862b10678147d91487bbe89888f5fa120b4fa857334a3']],
  ['content/adjacent/drones.mdx', [14500, 'fba99c70b364213f21106c7a3f2b720bdfaf2c0c1a3a5caa4fa968336cbf5a47']],
  ['content/classical/control.mdx', [20867, 'd5022951fd3faa3dee5574db5daac149172604bc636fab2864fc5f961a1e4e45']],
  ['content/data-hardware/data-bottleneck.mdx', [11608, '971c789f4fe8c97ea480b430931f998c8a7c5094991e8623a65e62339a564339']],
  ['content/data-hardware/evaluation-crisis.mdx', [17314, '11b2a13347ffd45baea5b4adfb5c65bf109fa8736b00f2d09782c7e2bcaa0cb3']],
  ['content/data-hardware/industrial-deployment.mdx', [19739, '6ef26dad2b09242e755de200dc04000556ca32006534a87ccd8c7f9f3c30968c']],
  ['content/frontier/bear-case.mdx', [11038, '76effed4c8661a0fdd96e4558a76f1d835ef939cd0bc31a6caa4eec65c952e01']],
  ['content/frontier/competing-theses.mdx', [17758, 'c0f154df479b62f96726bca6deff5796c138b4abd55914c4acae2089c1058a25']],
  ['content/frontier/dexterity.mdx', [17836, '28df457c23f3ddc1724065713e0c127d66a3e07df0a8565c383c1029361586da']],
  ['content/frontier/generalization.mdx', [15296, '83f50eb6f22c7b4a03f5eba4d11b2fbd344ea78504f5161054ee2925b855f146']],
  ['content/frontier/reliability-gap.mdx', [12147, '333221be09b65e776382bd25899f9eb438179cca2b73caf6f5dab0dbf7061dd7']],
  ['content/frontier/safety-and-assurance.mdx', [19760, '04b4c95aeaa5cf9f0ac0cde5817a3a5607cbcb779e4152a89af87f26b7dbbbf5']],
  ['content/manipulation/action-chunking.mdx', [14604, '2f18be8b3212449889cdf7686ce1cdd421485eb61e505eda2c7ad009aedb5fd4']],
  ['content/manipulation/bc-foundations.mdx', [12432, '94902f7a046b7f73e78bbe18c1d671ff75684f5eadb57fb39754cdc027b0a58f']],
  ['content/manipulation/diffusion-policy.mdx', [11244, '3f77042935712a0e73a36ad361e840f17468fc70066482b412f382682173c2de']],
  ['content/manipulation/generalist-policies.mdx', [17662, 'cac1b6b19d05c7ca3573cd108c8f125139af444c4973e159afcfe13afa460e70']],
  ['content/manipulation/knowledge-insulation.mdx', [9872, '0914a6497e47f41c3f1a72ce6a9d151d13e246ed2348f3506ee7ba547984e14b']],
  ['content/manipulation/rl-finetuning.mdx', [28104, '56f5df84018fb07d5f6d3d7b8e83083f67a9aded995c59f5f8e399bb87d17978']],
  ['content/manipulation/vla-models.mdx', [16111, '59bae36b6b712eb97992b3a1f129b024480e8c2a8e77bfc330487476deb6c6f8']],
  ['content/world-models/generative-sim.mdx', [14030, 'ae80f03a691201f92bd0de129406474261de856a9d6a30ee83f328cb393c6540']],
  ['content/world-models/generative-video.mdx', [15802, 'ffbb5112460dc80d7607e7790d4b4be3a39e955bc59b87f5b9b630d21ea6e95d']],
  ['content/world-models/jepa.mdx', [13758, '1f1e9fdc0e28dd7d46ad43edef991a2f79d1c99a36362836bb634f2d6ef6abd9']],
  ['content/world-models/latent-dynamics.mdx', [12890, '47b2d2a8316d5ea0646d5435818f0b837972b68b6994ac6e4b7b7d618aa1bfa6']],
  ['content/world-models/taxonomy.mdx', [14674, '1a9759f0cb4b66615c18fe5bc263331ac3e39733f797e259a374250a597c82b6']],
  ['data/glossary.ts', [83393, 'faa41958b0cf820beab5660e64985f90dcb6b3f336d76c683fb96d688ca91cdc']],
  ['docs/design/motion-language.md', [10710, '02a652700b7ae8b861ab49d9191f8e4afeb937f09dcd3ea04c447143699c3678']],
  ['lib/appearance-physics-push.ts', [5935, 'a72087e6c3e9dd2927b23f3d5528052e2d7566bdd085dd171161026549cf3320']],
  ['lib/brand-v2-figure-evidence.ts', [30841, '009c5f336ccf2290400214d204b32b23887548a345ca92bbc6816c7db18929a0']],
  ['lib/chart-descriptions.ts', [34338, '348c6a31f8cfdb65f9a38710f4a7a443db2f5fc7bdd9b2581c9e739a39599a10']],
  ['lib/figure-system-check.ts', [13863, '841692b9d7c3513cef690188b1e7df639565b3b09164fc78acc154716f8cb2da']],
  ['lib/figure-system-paint.ts', [5408, 'aea5c837e3c35e6328fd0bb54840a5c2be63288219e538e5ade0d7d642192bc8']],
  ['lib/motion-tokens.ts', [4241, '5ba0b718d8260b189acc6c3f1f2a5c7d0ea1f466d5074adb2360c38ee0d6f846']],
  ['library/design-system.md', [64037, '7c4cee14d76318a05b76bbc5698796fe4459e707bb797d83f354dbf3dfa666ec']],
  ['motion-tokens.json', [4797, 'c5d58f5adc79d9dbd965a3b7cae308f21b26185a2be147e93738a743836ef583']],
  ['scripts/brand-v2-census.ts', [48819, 'b7e45b4400d0bafe77131c014821e60e7a625abdf89eaa76c4a16c2e61ad68ec']],
  ['scripts/brand-v2-enforcement.ts', [182808, '4d8814ce1a2707bd256230aa6add3a9e0d9e507aacc705a53f80e34a29ffa7b6']],
  ['scripts/generate-motion-tokens.ts', [16496, '736d58cc877152ee18c85482fa63344f7c7ab4a353a92a2506aa46250bb3f7c7']],
  ['scripts/motion/motion_theme.py', [2399, '27b5b388de634ac4c0ae00a057ad5ce03e05b9f2171fc2fc1a4fef5f07ed1a68']],
  ['scripts/plant-figure-system.ts', [7617, '154dcd9f14add37c9abed7191e84d056a74ed4a756f4189dae0f6960a6895b6d']],
  ['tests/component/action-conditioning.test.tsx', [10538, 'fb7db1b679216ad5ae077b482eeb049985195b68ce1d8dc106eda0100093defb']],
  ['tests/component/advantage-scrubber.test.tsx', [9235, '44a7587d6656a6245cb532a41aa04f07da4c0797150fbe0687009e3fe2821a62']],
  ['tests/component/appearance-physics-push.test.tsx', [10669, 'e41b35a509645827efbcd1dc2eca380493db75a817815a2dfc386721aef3347b']],
  ['tests/component/calibration-chain.test.tsx', [8812, '9e07238f7929e1edc62e0c34477094adb0f0857402fceb02f2257e62fca2ae90']],
  ['tests/component/chart-primitives.test.tsx', [8819, 'c2015ebfb22e5113e54fda1be779e68bdb9b6cb94ebcb91a19e1731a2e927af3']],
  ['tests/component/chart-state-descriptions.test.tsx', [19459, 'eeef317e2c116922ff0350348ff7050a2998ba8ade52da8601804f4ca01e5ca1']],
  ['tests/component/collaborative-operation-modes.test.tsx', [15007, '627b57b9cfc229f1a5194095ccbce7e610955c972dbe13ca6f72178ceb0cef34']],
  ['tests/component/contact-geometry.test.tsx', [8336, '5722a594e2bb89fc804c8714f823ccfa7cd8c50099b206b8c01340a58607cc57']],
  ['tests/component/data-scale-chart.test.tsx', [8929, '226c4e5e053bf62161919b170ea24036f91ad01d4dc1ef452ff6f1a60b4bb688']],
  ['tests/component/egoscale-scaling.test.tsx', [9578, 'ab09fc12b101d882dcafa4a250e580c7bab03fec71663da59baf6cb1870f6bf1']],
  ['tests/component/eureka-loop.test.tsx', [5869, 'ca8c783c9a5dd96b8a6a7bc1fd80f04bf70feb84f63000d01a91e1d3285b77a4']],
  ['tests/component/figure-system-check.test.tsx', [8310, '9d7ef4bc81256981b3be21ce1719481b6a2fe834ddc55a3258e34002a82a46f2']],
  ['tests/component/friction-transfer.test.tsx', [8938, '36e371cd5087c4d956b9df3260474ae21df0079dde84beed950486a7bcfe15c5']],
  ['tests/component/hand-comparison.test.tsx', [10123, 'b9e57e72d9104930792df48851dee4161bb1b1a7f77102fdaa82cb155ec8ccf0']],
  ['tests/component/image-figure.test.tsx', [10570, 'ae06460af5c2f7996fce79042e4b3d1b24cb7f4534b912be701443dffd235a10']],
  ['tests/component/jepa-planning.test.tsx', [11944, 'c74ed1f8bbc4bf16062d48c88a5a4ebf2c4d670ae87819616392add4ee6861d4']],
  ['tests/component/latent-imagination.test.tsx', [8847, '17c953eb985f22651a0bef1415c07e99a6cb6fd1471bf2f60fab975a59e15559']],
  ['tests/component/milestones-watchlist.test.tsx', [8219, 'ba722e6086e445700fdd7a603bb498c2dc197f4a15e4d5ba9f72f223729cdc2f']],
  ['tests/component/perception-latency.test.tsx', [11262, '9e63293748dc88795430d8eed1f4fb484c4ad41c736cd3e0821d573234668779']],
  ['tests/component/predict-then-reveal.test.tsx', [8703, '0e5431d51c9cdae84d4e71b66730d4a71a700dacaef8f267d0d130e060d41663']],
  ['tests/component/ros2-policy-layout.test.tsx', [9798, '4b924f4c8d776e874c8d0058f63b5ce5af46c7aa39076f088544bfdf3b9c4210']],
  ['tests/component/teacher-student.test.tsx', [5847, 'd0f0f2de017f4488fbbbb33a7475a049a8624c7cc721f42a632adb8e2e060da9']],
  ['tests/component/thesis-explorer.test.tsx', [7766, '6fe72bea4c06642f2932c321e7f96d3ce79ec4cc091a2e6633c12b49984b6f33']],
  ['tests/component/ui/brand-v2-primitives.test.tsx', [5977, 'ec96ed968d1726695ef38e4ddb3f4e2757695bdd0ef439b527aaf38dcae3948f']],
  ['tests/component/wbc-decomposition.test.tsx', [8623, '5d49dc0c5acb55cc7ed8fea86c8debdc9adeab73d094b8f2dd62349f22f6fcdf']],
  ['tests/component/wm-disambiguator.test.tsx', [9527, '7736ae8871e1a50756e6f0277ccc6f3cc0452221f6ae2b8431409e2d6aaf3b20']],
  ['tests/e2e/autonomous-vehicles.spec.ts', [5969, '4283a402b83009336380104f5f05605698509ef02185aebb59b0996b09a38b4d']],
  ['tests/e2e/bc-foundations-corrections.spec.ts', [7577, '59005455642289cdd63bddb890f0f5b74a02fe9a0d528e8f0e9a15ce10901b24']],
  ['tests/e2e/bc-foundations.spec.ts', [4724, 'b559717657b1732f24d60641bab53f80d9a6f263b81666529971de45f0751cc7']],
  ['tests/e2e/bear-case.spec.ts', [12990, 'b25ae17ab2dea6b1422dec8e73a2e05ee81b1bf2aa8b90344cfa90153e473db0']],
  ['tests/e2e/brand-v2-figures.spec.ts', [10556, 'fbae3d209cf5b933244b5a7da42d1391abbf814f71ca65ffd4208befc6fdefa3']],
  ['tests/e2e/brooks-theses-readers.spec.ts', [9951, '31905f7862abc3b7a408dba18a158adc035e50edd1f50370e1a5057d72f26a59']],
  ['tests/e2e/chart-coverage-sweep.spec.ts', [12272, '0b05cc763dbc74fb1e31ad53c7bcfce17b3d4001b540129e6d7e85fa5e6b1c35']],
  ['tests/e2e/chart-description-registry.spec.ts', [6569, '458e4b53e02328a4f47069cf4057a3f98c1855acf5b88b3ebe3ae9a450e19781']],
  ['tests/e2e/chart-descriptions.spec.ts', [15828, '24d3ad5f40f51fb875f064bdace5fa23551f2e7438d4192671bd009766444009']],
  ['tests/e2e/chart-state-descriptions.spec.ts', [24444, 'ab7c5b47bde8cf9392d5e45acab9a33b506ef0c362a99403caac12a19b8d58ca']],
  ['tests/e2e/competing-theses.spec.ts', [11126, '6de28707a92dfa4754ffff0259f29430bad22c1f6140ed8f5e51909417db1ee7']],
  ['tests/e2e/control.spec.ts', [27798, '65aa8a5145dd6d3c8b1b5652c8532055e42a9ab10a4a99de9ab7d7c9c0738a67']],
  ['tests/e2e/data-bottleneck.spec.ts', [7908, '0405f333743028d454de2d4e2526c3780f223b5da43276b439e2fadb3ace0651']],
  ['tests/e2e/datasets.spec.ts', [5742, '4cea5c25b75caf96b4a0605c7cd90521e7b4961a6e77f5920c2d2dd2f937d33f']],
  ['tests/e2e/deviation-axis.spec.ts', [11583, 'ed700f0bca858bfeed0319f7fe4c8fe6934117601cc8e8962cb8276b9f86d2e4']],
  ['tests/e2e/dexterity.spec.ts', [13268, 'c0573b4c5c4b4d32105145f81d000583f4167fcac7e34a610aabc99758a7bf97']],
  ['tests/e2e/drones.spec.ts', [8765, 'ffbc77636ac074c3b5864f11e8e95ac45e34ae8ee128766f2f44c12091b1ceda']],
  ['tests/e2e/economics-local-evidence.spec.ts', [7290, '07859c3259e8616b9c65c65c67c722f043af4939f86c2d667694d34b8edb0ad7']],
  ['tests/e2e/economics-release-evidence.spec.ts', [7367, 'f4d6dd2bf995de4617dc496b007d792f21cce4b56592d7dda99eb07185dc27cf']],
  ['tests/e2e/evaluation-benchmark-readers.spec.ts', [12783, '37e2ec6263e97693ac45ae792e43c4d95f85262f91769866d4bcea205cd1eb42']],
  ['tests/e2e/evaluation-crisis.spec.ts', [11644, 'a58376a7e2a1ec4bc9ad32d3ad1c27f2482e29f086511f363608fa68d797b834']],
  ['tests/e2e/evaluation-statistics-originals.spec.ts', [14690, '0c06fa22c8a5bb1bd78c521237f58f036dec8711de1766276179b39b3c454d69']],
  ['tests/e2e/figure-light-stage.spec.ts', [6136, 'aac59bfa7d5c66866984c1d1046ce0398d1958be6216a316325bda311d7f4bf5']],
  ['tests/e2e/final-seven-closure-evidence.spec.ts', [7904, '5ef9167e6772d7edc8273a148aa758593d8a4f754838e2ff553d4ee91fc0385c']],
  ['tests/e2e/generalization.spec.ts', [10493, '5013f229702cddf7b77a66149f1c901bfa935423036468ce3d52bae46ca447d7']],
  ['tests/e2e/generative-sim.spec.ts', [11083, '8d354604933c818d14e8f9c79ae044daa9621ff3cea412ab788f5ae321f9ad68']],
  ['tests/e2e/generative-video.spec.ts', [13277, '925f409f8c48d83f2e28ca6c3537bfe32febb4bd1d8d1402faada4d1e0d912ca']],
  ['tests/e2e/grasp-planning.spec.ts', [18927, '849bc7524782c660211c06576ae2ca9b4a68542178a867f6c5baff01c65f46e4']],
  ['tests/e2e/hardware-taxonomy.spec.ts', [8324, '5751695cc0d14c7505e430be1d5c819904dc11efe908f396361efd67924dab06']],
  ['tests/e2e/helpers/figure-light-stage.ts', [9812, '01df856c192d4c742e2355936c7428537b35949cf2eabc8ece245f9d64d0161d']],
  ['tests/e2e/humanoid-tracking-source-audit.spec.ts', [7610, '4b11b637ba3b540238bad3db72c8cfea986d0d9fbb112b63b8ab375017b3969e']],
  ['tests/e2e/imagery.spec.ts', [15768, 'cacccac48b0bfe23596ec5ab4b798c8dfdeb188e5eeafb4643e48554f109ffaa']],
  ['tests/e2e/industrial-citation-refresh.spec.ts', [7938, '2f5e5c8b54561e7fd2b61faa6fed469e99c5e2d40e186f3f32cbce2c6a639a6e']],
  ['tests/e2e/industrial-cost-reader.spec.ts', [17106, 'd20608d6cd92dcbd401b1bed72f00e4e8e3bd7e5a94352e8e8171e30bbf049f0']],
  ['tests/e2e/industrial-deployment.spec.ts', [20646, 'c06cb15a8042162a557bc9992dc37f64d2565fa4938deb1b6bbfb2fddce96e9f']],
  ['tests/e2e/industrial-engineering-originals.spec.ts', [14675, '219f63383291e26aed7ce63d44932c7d97a5f1721be0b04c47b7c93314ba3f90']],
  ['tests/e2e/industrial-release-evidence.spec.ts', [7933, 'f713d0a4ee20772c734bd94cd925f8fa8c7745dffd4afd45b640e008cf5b46cc']],
  ['tests/e2e/jepa.spec.ts', [6877, 'ba79d9f6811906e19917d6c8d0f41648ecd20efedb009b0f327c97fba611e5c7']],
  ['tests/e2e/keyboard-only-navigation.spec.ts', [7487, '4e1739c438566529233ec54203df637fc0ba17341b43c75dddf8e56c35dfc752']],
  ['tests/e2e/kinematics.spec.ts', [22687, '34c0653d429a405a2abd24716293fcbe096e13b2e6854b3905329134c7be0c0e']],
  ['tests/e2e/latent-dynamics.spec.ts', [6987, '9d3a266fb2364ecef76c20ab45123678900bfe97365504cab8eb457b415c26c2']],
  ['tests/e2e/legged-locomotion.spec.ts', [7769, 'a51f62c715f375401b90dfb7c0ea3c2ac80c7f71ee76b8a80ad5de183dd1f0b2']],
  ['tests/e2e/market-map.spec.ts', [16946, 'eee9bc3d893a4ea45834eb7b79efbfab3501d80c377fefe57a186603ce56dc04']],
  ['tests/e2e/motion-data-hardware.spec.ts', [9635, 'c6f08b2d9bba36cdcb89b02a89e80067e21b0755432d0c314169105f226da57c']],
  ['tests/e2e/motion-frontier-adjacent-home.spec.ts', [10125, '48ef70a9c3960f4cab1dd97fec9ead50e39db15e2084eb2dc5bc2d9e3f0dcd17']],
  ['tests/e2e/motion-manipulation.spec.ts', [8124, '77ce3e65b32092ca67ecc6d31828e3ab942239e1ffec68ee55eb4bef0c693282']],
  ['tests/e2e/motion-planning.spec.ts', [17893, '7552079a8db4715813e28ffbd42e9a3abd7fea819eaf698a751f5cc1e3eb1d2b']],
  ['tests/e2e/motion-world-models.spec.ts', [15319, 'c85f58f94a781b67d8cd1848aff986809c31969b988e314354a17b861403221f']],
  ['tests/e2e/parallel-sim-rl.spec.ts', [4329, 'aed3776613ecf45b4ae25f64d73f05dbbd085213835f1d2e3cefc42b103e2dc0']],
  ['tests/e2e/perception-depth-readers.spec.ts', [22377, '35d77ff776ad4f4ffdc847f515a435b3176282c418938db53c6fe4e900c0fbf5']],
  ['tests/e2e/perception.spec.ts', [37417, '7ad6e146b37c8b85d53dc66e169a5db76ec6d6e1d7229c208d8be73d5636a585']],
  ['tests/e2e/pi-helix-theses-readers.spec.ts', [5152, '2a033dfa258f908ff731fe7b4ce609856f772c9862b378afc6bf1f8f4e71c0a8']],
  ['tests/e2e/predict-then-reveal.spec.ts', [41081, '6fad30bdc6041d71d3f04a2e2a57d2164fe6c2693025a911a4cfe262d8d7734c']],
  ['tests/e2e/randomization-reader-closeout.spec.ts', [22249, 'dc2948af10c7b3c0c222e1725e0094daaa5f225dd4b1a97dd18f735905c8a182']],
  ['tests/e2e/reliability-gap.spec.ts', [13492, '0f61ea40d11b824db1a935f3862a0cd0ee52c340bc27c2c545a9cfc750acd3ba']],
  ['tests/e2e/residual-release-classical.spec.ts', [9970, 'cc144bbf81ab277e9be9bbc920f0a98559efe6e44663cd637d1f4dc1bcf39955']],
  ['tests/e2e/residual-release-final-seven.spec.ts', [8414, 'ab048ffe53ba61ba6e58395aadb53ffb59a4e40b4d554a44d61154fd1b8938f6']],
  ['tests/e2e/residual-release-industrial.spec.ts', [7933, 'e1abbb3ea4a3f33933994d030b5dc5ed757239867cedda05fd7b9306e3942968']],
  ['tests/e2e/reward-local-evidence.spec.ts', [8673, 'fc5e110a889c08e69cf46d2872eff973fbea7d29fa5140a632daf02e73fb15fa']],
  ['tests/e2e/rl-finetuning.spec.ts', [11831, '7b280a8981f129fa4e5ac5593d6ee9a29fefb3e32d760284570b5b98f89e9889']],
  ['tests/e2e/rma-kl-reader.spec.ts', [13423, '9379e30dbaa93975abcc60c064d1e251db06034002fbff4442cde16e114ca027']],
  ['tests/e2e/safety-and-assurance.spec.ts', [24795, 'a4c318942fbef715ae9db5f7a0911546c5f2660e833dff3036dac212477a236e']],
  ['tests/e2e/scene-representation.spec.ts', [25615, '91b39f565d61de6930e96d2a801ea678af8c1f66aa001cf0662cd1d9813f0e6c']],
  ['tests/e2e/seo-static-integrity.spec.ts', [21129, 'c43f69878d376a0d0f8d7ec520af9c3771469dc33efec7493165efefd353ed51']],
  ['tests/e2e/sim2real-local-evidence.spec.ts', [10571, '2402780098148d7f88f6f1c1d99bb70eee36733433475027cea638de52fe135b']],
  ['tests/e2e/sim2real-transfer.spec.ts', [11651, 'c3a9e12e4ef9e5198e515ac9de209458df7aaa19683cb80358046f76ce1b24b5']],
  ['tests/e2e/space.spec.ts', [10471, '4e3af05346765cb8a528e7adb79262835f46f731f95a7dda30e27cfba385aa65']],
  ['tests/e2e/state-estimation.spec.ts', [14673, 'c5ec8f9b5d748fd62820182e2e2d48615ccce8ab0e7a7bd39d11527839fdd824']],
  ['tests/e2e/surgical.spec.ts', [7176, 'a8dc972ea3613b7f8c8fe37dcf11319ffdec8f5164c5203b5836999957944432']],
  ['tests/e2e/teleop-rigs.spec.ts', [9057, '6afcef122bc1fad972cc1f4697cd0024536ad15aa3a2a9eb69fb61f6ce8ac2dc']],
  ['tests/e2e/thesis-economics-readers.spec.ts', [7185, '7d97ab72f9fde12f1ca79cce79fbcdb61a4f3286b4f781b198e0d4e0ceac5b54']],
  ['tests/e2e/why-rl-locomotion.spec.ts', [5041, '2a0377ca5049411af190a5cfc785dbb9a46dad3663910c42a9cb76aa84470e13']],
  ['tests/e2e/wm-taxonomy.spec.ts', [6559, '016d7f7426e98a847b6912feb7fae16d3f1f50af04eff1537b423756626366c7']],
  ['tests/unit/appearance-physics-push.test.ts', [5351, '7e9275704d3f5dca27c2fa72a760aaff5083ff37625daf297900cb3f1051b0d6']],
  ['tests/unit/brand-v2-annotation-scan.test.ts', [13596, '8dfdd1f46946d655fb927f9af75538b168a5fa0e4e5d636523af59fb87796f5b']],
  ['tests/unit/brand-v2-figure-evidence.test.ts', [32916, 'f0f5ea49951c939dc67090ed351f69482ed6c3bbe44e21ecc48b38abad99fbf7']],
  ['tests/unit/classical-closure-evidence.test.ts', [16186, '28cda95ec399bde3b339630a35239882d53e606c5fec8d0cbca5845de283b148']],
  ['tests/unit/final-seven-closure-evidence.test.ts', [8409, '13a31ed2e08cc701c778e6a0da5cb946f6d373c6e5a19c67cfff021b90e70dd5']],
  ['tests/unit/main-merge-approved-deltas.test.ts', [217628, 'e9a088761538ccc8a5b818787b34d11637757b65e050512f1d406802a46d6785']],
  ['tests/unit/motion-data-hardware.test.ts', [11831, 'a440e874d11c87a0c6657331f72be47dacc2e432aaf680f4a1956896369f741a']],
  ['tests/unit/motion-frontier-adjacent-home.test.ts', [10127, '4076049105b4ba02bd5459b55604e6cbce8497ca17a0e0632f53ac27c37f10a5']],
  ['tests/unit/motion-tokens.test.ts', [5443, 'b364833eb29a4892bdb2892304cb0cca5c9e5f995f510e567fed0362c6786e41']],
  ['tests/unit/parallel-local-evidence.test.ts', [5415, 'd2c39b3c94fad8f22da07efe5fa4517aef9325dc77477f510c65275e421fb687']],
  ['tests/unit/reader-release-integration.test.ts', [28320, 'e20230096ae7b337954d2437a9d9372e9728e5bc32017f6655e8dc48bbc13b4e']],
  ['tests/unit/reward-local-evidence.test.ts', [9001, 'a5d166d0b11e1cce9ce19a093d328ccfc45c2057e61cb856ee08857cf2241c12']],
  ['tests/unit/robomind-hours-evidence.test.ts', [26456, 'f6edeb92026f085f5021428a88e94147f5b5d4f33464ffd50645d14012a47928']],
  ['tests/unit/sim2real-local-evidence.test.ts', [9669, '80d4605b1eefcfc82ca7f1f5dd8bd3744f7cda62570e523796be856670b4fc6a']],
]);
// END reader-first pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const citations = (source: string) => new Set([...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]));
const calls = (source: string) => [
  source.split('expect(').length - 1,
  source.match(/\btest(?:\.[a-z]+)?\(/g)?.length ?? 0,
] as const;

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

/** The path-specific obligations a successor keeps over its predecessor. */
function keepsObligations(path: string, prior: string, current: string): boolean {
  if (path.startsWith('content/') && path.endsWith('.mdx')) {
    const head = frontmatter(current);
    const kept = citations(current);
    return !!head && head === frontmatter(prior) && [...citations(prior)].every((id) => kept.has(id));
  }
  if (path.startsWith('tests/e2e/') && path.endsWith('.spec.ts')) {
    const [priorExpects, priorTests] = calls(prior);
    const [expects, tests] = calls(current);
    return expects >= priorExpects && tests >= priorTests;
  }
  return true;
}

/**
 * The pre-pass bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyReaderFirstSource(source: ReaderFirstSource, live: Buffer): Buffer {
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
    !keepsObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

function reviewed(review: ReaderFirstReview): void {
  if (review?.schemaVersion !== 'reader-first-continuity-v1' || review.name !== 'reader-first-figures' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now()) {
    throw new Error(drift);
  }
}

export function loadReaderFirstReview(root: string): ReaderFirstReview {
  let bytes: Buffer;
  let review: ReaderFirstReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    review = JSON.parse(bytes.toString()) as ReaderFirstReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256) throw new Error(drift);
  reviewed(review);
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.sources?.length !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after?.path) ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(drift);
  }
  return review;
}

/** The paths the reader-first review holds a successor for. */
export const readerFirstSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function readerFirstPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const source = loadReaderFirstReview(root).sources.find(({ after }) => after.path === ref.path)!;
  return verifyReaderFirstSource(source, live);
}

const registryReviewFile = `${READER_FIRST_CONTINUITY_DIR}registry-transition.json`;
const registryDrift = 'reader-first registry continuity drift';

type RegistryRecord = { id: string };
type RegistryShape = { sources: RegistryRecord[]; mounts: RegistryRecord[] };
export type ReaderFirstRegistryRecord = {
  id: string; archivedFrom: string; before: RegistryRecord; beforeHash: string; after: string; reason: string;
};
export type ReaderFirstRegistryReview = {
  schemaVersion: 'reader-first-registry-continuity-v1';
  name: 'reader-first-registry';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  records: ReaderFirstRegistryRecord[];
};
/** The hash a registry record is reviewed under: its JSON in file key order. */
export const registryRecordHash = (record: RegistryRecord) => digest(JSON.stringify(record));

// BEGIN reader-first registry pins (written by scripts/record-reader-first-continuity.ts --registry)
/** The reviewed registry evidence file; a changed review needs a reviewed code change too. */
const registryReviewPin = { bytes: 52640, sha256: '973556981c9f64fd77a7f02910d309991aa4ecae806d604449a79c95d753ed5b' };

/** Reviewed successor record hash per interactive registry id. */
const registrySuccessors: ReadonlyMap<string, string> = new Map([
  ['interactive:ChunkSizeCurve', '71347fe2937866e38f6e2fbd6c924c395286c9b27828d9abf0ea7c7bbac9863b'],
  ['interactive:ContactGeometry', '55dda0bf0d7a9a91f2f9ce4850c74474e5a5275a83b6fb73e2bd9d0b3b5e2fcf'],
  ['interactive:DataScaleChart', '626c75ad4fc11850d5db9e8df88bd8925ea7f1fd17204597394b682c5703ff85'],
  ['interactive:DeploymentEconomics', '6a41c78ea6f61aea7b1a909e16c9e0a01392cc89c3822905936139c1cbc031e3'],
  ['interactive:LatencyComparison', '31aa7e0fdd1efeca0228f6355f01fd6f6f787676e8d26b7b3d161b07d2fe82bd'],
  ['interactive:RecedingHorizon', 'c6ccfc703846e26531416a618780dd2c9a6acc7addda33e4a1bc3de469781c87'],
  ['interactive:RewardShaping', '89184adf2b3d1bcc0fd6f0340a1013426234fabff3cc50f016e2891000234099'],
  ['interactive:SampleEfficiencyLedger', 'af1bae08588736d53d3680329d218749f6446002cf67ed54d913a63a9e58d64f'],
  ['interactive:TeacherStudent', 'd0c72add470c498e0ede261cefe30f291e532e74f8d1d010626b69c7594c84a0'],
  ['mount:/data-hardware/data-bottleneck/:DataScaleChart:1', '5c170698640796fb37ce69b62aa27ca9340edf4f7cf2ee81a32979c85b51ed7f'],
  ['mount:/data-hardware/industrial-deployment/:DeploymentEconomics:1', 'f6f104905bb07934c24f8f6ee17141391517f965bd22dcce0e798812097c1692'],
  ['mount:/manipulation/action-chunking/:ChunkSizeCurve:1', '4fff31e690e5b6e17a0133c42ebe4cf784bf1f91069d0a548fd1b70abd38ed7d'],
  ['mount:/manipulation/action-chunking/:LatencyComparison:1', 'b516df036228355a1f91e09a5728dd78a9250645aaa4a46e9c1c86b5ab359d89'],
  ['mount:/manipulation/diffusion-policy/:RecedingHorizon:1', 'bc5871c592c69d95a57e670b46d52b75f357842fa07fdb57871939fb5fe5c878'],
  ['mount:/rl-sim2real/reward-design-mpc/:RewardShaping:1', 'f82b03d4ef1b4de2840c465144dda85eb0ce2411a11373c052d8a68b507527ce'],
  ['mount:/rl-sim2real/rl-for-robotics/:SampleEfficiencyLedger:1', '1135b3ad7199177c2def1780c29b0fdad8b51b475184f8122ecbb1c370fde275'],
  ['mount:/rl-sim2real/sim2real-transfer/:TeacherStudent:1', '2f413f329b091a84ec893307525da4aae297fa84f5b4a75dd1b52d9aa3674d3e'],
  ['mount:/rl-sim2real/why-rl-locomotion/:ContactGeometry:1', '48a74d1a0f824fce48b13503da6286a40c7c1a6e95d90127375550338ee9ce30'],
]);
// END reader-first registry pins

export function loadReaderFirstRegistryReview(root: string): ReaderFirstRegistryReview {
  let bytes: Buffer;
  let review: ReaderFirstRegistryReview;
  try {
    bytes = readFileSync(join(root, registryReviewFile));
    review = JSON.parse(bytes.toString()) as ReaderFirstRegistryReview;
  } catch (error) {
    throw new Error(`${registryDrift}: ${(error as Error).message}`);
  }
  if (bytes.length !== registryReviewPin.bytes || digest(bytes) !== registryReviewPin.sha256 ||
    review?.schemaVersion !== 'reader-first-registry-continuity-v1' || review.name !== 'reader-first-registry' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() || review.records?.length !== registrySuccessors.size ||
    new Set(review.records.map(({ id }) => id)).size !== registrySuccessors.size ||
    review.records.some(({ id, archivedFrom, before, beforeHash, after, reason }) =>
      registrySuccessors.get(id) !== after || before?.id !== id || registryRecordHash(before) !== beforeHash ||
      beforeHash === after || !/^[0-9a-f]{40}$/.test(archivedFrom ?? '') || !(reason?.length > 40))) {
    throw new Error(registryDrift);
  }
  return review;
}

/**
 * The interactive registry the older layers' fingerprint checks should see.
 * A record the review names is replaced by its pre-pass record only while
 * the live record is exactly the reviewed successor. Any other record,
 * including a reviewed one that drifted again, comes back unchanged, and the
 * review is read only when some live record is a reviewed successor.
 */
export function readerFirstRegistry<T extends RegistryShape>(root: string, live: T): T {
  const reviewed = (record: RegistryRecord) => registrySuccessors.get(record.id) === registryRecordHash(record);
  if (!live.sources.some(reviewed) && !live.mounts.some(reviewed)) return live;
  const records = loadReaderFirstRegistryReview(root).records;
  const restore = <R extends RegistryRecord>(list: R[]): R[] => list.map((record) =>
    reviewed(record) ? records.find(({ id }) => id === record.id)!.before as R : record);
  return { ...live, sources: restore(live.sources), mounts: restore(live.mounts) };
}
