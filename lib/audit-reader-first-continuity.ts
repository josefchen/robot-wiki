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
const reviewPin = { bytes: 3200103, sha256: '2f20c1133583f7a5c9d4cbcffcadca581ca4652d043fbc495dee4562e8b05c5a' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['app/globals.css', [22557, '16282239a80c8430852f8e2704be42eca775dd303dfe4d4488aac7e8f95b2093']],
  ['components/article/author-list.tsx', [3213, '19a8356da9f8448d7218e7e3558f7312c9e77e139795421d98916142c4f41b01']],
  ['components/article/commit-to-reveal.tsx', [14313, 'b3892a0853de9f0ab7c89551ba68526b488cf17c87697f329827c5c7a873ee3b']],
  ['components/interactive/action-conditioning.tsx', [22847, 'afd8d3ef03aa3c6daf1b543f1b05ee146e80d341ecd3d83fa0455d4a068435d3']],
  ['components/interactive/action-tokenization.tsx', [24130, '6cf8d7ca37b2e348c57281c471d18dc43a0f00631b7435fb5fadf0c221b4095a']],
  ['components/interactive/advantage-scrubber.tsx', [27348, 'f36df32ab7edafd6d328c16c4ea8623b68e88e386cb96e9ac16460b997ce3c7d']],
  ['components/interactive/appearance-physics-push.tsx', [23391, 'c174cb2458dd23465de47dcb21c3eadac9e7bba9f7f04708720da8a0964ad35f']],
  ['components/interactive/bear-case-lock.tsx', [10333, '9606d58dc0e2fff9ce9eaee5a4e2627bc450aab468a6ffe5b2989a5b0157796c']],
  ['components/interactive/calibration-chain.tsx', [18428, '2b83baaf6e298f990d071c0cdc26294ad99af689f991e7d4489f935cf0028deb']],
  ['components/interactive/chunk-size-curve.tsx', [15248, 'cfe783c86a1edc1b74f943706dbd5a84bd967c5736e12d7953c757f9b3579ed9']],
  ['components/interactive/collaborative-operation-modes.tsx', [34791, '2d10ea28e0be9706f201c116d2f1d155259d96e954e04f949cb439aaeb75be35']],
  ['components/interactive/comparison-matrix.tsx', [22789, '82fa9bda95032d36df175496d6dfc332181672686c35742e4951583330491948']],
  ['components/interactive/compounding-error.tsx', [30965, 'cde550f23a33032db8d4effe5abe0ea1f21792b2925703617e17c2c0e44169d4']],
  ['components/interactive/contact-geometry.tsx', [17354, '6621fafdf9a31012613ddc8370b1c599b40126b7ea8f6c4854c627492b79a570']],
  ['components/interactive/control-loop-budget.tsx', [18571, '24593e7e017b21f0232aa7f1c117a6460efe511722b508b9534f8ac2ace8d58a']],
  ['components/interactive/cross-embodiment-strategies.tsx', [20941, '3abad3227ed28e7c5c3375714722b463c5eeaaa95eb5af22e3de4d456c5507fe']],
  ['components/interactive/cube-trials.tsx', [6331, '863999b1dda7af64a749a92c8451527c9f32d8ef0c6dbfa9ae24f8c50394f177']],
  ['components/interactive/data-scale-chart.tsx', [26424, '43935207b5191fe7da67913266378ab4abaf48cbf64ef4753074aca375fb3d49']],
  ['components/interactive/dataset-table.tsx', [9088, '30581d510ed582c20c7a7b569674f263d2d0551ad3d35a37ea2d4f5a6958feae']],
  ['components/interactive/deployment-dashboard.tsx', [15655, 'abce4f26b9d914ba389ff952779e9ef0b3dde2c441ef27d6b00f84fb0c589b88']],
  ['components/interactive/deployment-economics.tsx', [25496, '79e1072d6e752423fe2124f004bb25d9a5c5289bf16c35e57c06a3236f67cf6e']],
  ['components/interactive/egoscale-scaling.tsx', [27216, '283f7c5e211cc5b8dac7c416e4c0d9a86d34987bc0da5642aabc5a546c342c6f']],
  ['components/interactive/eureka-loop.tsx', [21886, '1515c767e669901857b161a709393bbae1627e263a72d747cd324f06cdf8338f']],
  ['components/interactive/execution-modes.tsx', [21068, '97bf8d6e06e1623c396d24b696dd40ce56cf5119902f2536ad2103a030c6219f']],
  ['components/interactive/expo-ft-results.tsx', [12280, '0f8d8d463b18931c50a1e68d3edaef47240077ed52b2e18c0458565a952d435d']],
  ['components/interactive/flow-matching-trajectory.tsx', [25252, '6eea903a0418c9d60b5655a1c8424b25d1ab8be6b1ab2a3e7552271552f9a5b8']],
  ['components/interactive/friction-transfer.tsx', [26151, 'de29a6183d039568a6bbf7995146519a75e6451cd1747ca43e58799fe7cc985b']],
  ['components/interactive/generalist-release-timeline.tsx', [21681, '4f115353f504e773080b369023f7fcd9cb03edfbca7186107baffbfa6773db94']],
  ['components/interactive/grasp-wrench-lab.tsx', [29871, '202b69b57d052f2fc121b72db66e1c85efa3ee00d8b8dc2a3c4b96a148b201b8']],
  ['components/interactive/hand-comparison.tsx', [15609, '76aa514f6eeb3173b5911b50569dd61eb864ab94e68c1bc46d2af1da24008cab']],
  ['components/interactive/hand-eye-poses.tsx', [14307, 'e80bdb4110895c13eb13b25f45ddd8c99c0b9a39a32f33a140d8489e39af7227']],
  ['components/interactive/hardware-guide.tsx', [10768, 'bc4eda265436867cf18fd275663e2dbe27b3e18b856c1e908bffa1940ae82642']],
  ['components/interactive/helix-clockwork.tsx', [10585, 'dbb027e66d29729824c8c4f317ea4505de3a977b7acc95eb8daf35bf69f80461']],
  ['components/interactive/hierarchy-timescales.tsx', [18790, '5e2f464bf8eb82b52bf23e8631771710a7afcb7c66f1f6bcf4b1078b0532440b']],
  ['components/interactive/impedance-contact-lab.tsx', [28630, '7c185f6445dd05ff0b80ee7487c43d41610bab4571168682bef288d46a3f9235']],
  ['components/interactive/jepa-planning.tsx', [20960, '07b8788012583121ef3a680c2dfd211a2de93607d07666883e7446f55a2f9324']],
  ['components/interactive/latency-comparison.tsx', [22061, 'da96792b87bd07cb9bcd6a5022a50c9422a0de0412beaca9e04818a0d6806193']],
  ['components/interactive/latent-imagination.tsx', [20490, 'a9d07db7bb7b1999d5277068b694d79ce4278649bd66bfeb5b0931682923eb27']],
  ['components/interactive/milestones-watchlist.tsx', [14087, '9addb130b4a241c5dd36308397fca99d6219accc1dd44ee5a3ac981467ca68b5']],
  ['components/interactive/mot-insulation.tsx', [25068, 'd8c3a33344c24965e410729b573ab2cc625ea2e287061eeb112ff97edd9a4108']],
  ['components/interactive/motion-pantograph.tsx', [10749, '89a489d29fb1eb39af72a241ccccc5b297507769104b2eac6f973b9a498319fd']],
  ['components/interactive/mpc-vs-rl.tsx', [13278, '9c356cf750f0e71084fee9b47e7c2d8be686f5045302e5030e8ee42c8a5018d7']],
  ['components/interactive/pendulum-controller.tsx', [22989, '0a12cce4bdcc2798bf1af2159d07ff63c9ad8ff0d5dda59d5609bdee79744ae3']],
  ['components/interactive/perception-error-budget.tsx', [32621, 'be7d18c9145eff262deeaa30d2a995ce967342feb0789dd19154d8414d563712']],
  ['components/interactive/perception-latency.tsx', [23662, 'fb0b4f61656d9eb2918ddcdc3e5dace445fc60e928307ee5a2f53eeab20463da']],
  ['components/interactive/pi-generation-timeline.tsx', [18601, '00e36e07784c4d1ec3ae054e13fcfee475a8bae9cea851105c5db5e407302708']],
  ['components/interactive/planar-fk-arm.tsx', [13346, 'bcf7f0a8d168e8ea9719590e4aa3240c78197c4314477b65efc33b648919ed79']],
  ['components/interactive/receding-horizon.tsx', [22840, '225b2559b3a6e752e4bbf7aa517270e1df7b4f5c18bd4046a98d5c499ffb9cfb']],
  ['components/interactive/reliability-compounding.tsx', [19076, 'b07a31b6b8b2156598fe9d2e90473578e472245b123a97c75ed4863b953db2bd']],
  ['components/interactive/retargeting-gap.tsx', [14316, 'b06d0bfd0adac0d9ca1769d8d76349f8ce0b2827447af4b4120283804acea821']],
  ['components/interactive/reward-shaping.tsx', [25218, '98ade875fc66aa351d23a10dbf6bd55f7f010aa3c4cc89fe540b1b20ecf05d06']],
  ['components/interactive/robots-per-gpu.tsx', [10554, '6b3099540a53fe85b8e33a438382a3cb10b24fd59107bd9ebd00159fdef80bbd']],
  ['components/interactive/ros2-policy-layout.tsx', [19132, '6667799c99e31fc255be27059f5bff14a3ff07d67bac22c978c61f52468c4d92']],
  ['components/interactive/rrt-explorer.tsx', [18060, '6d3084f468a3b879a5f413a68ac6324afd84de8dc61a6c5967ed1f1fc73a56de']],
  ['components/interactive/safety-filter-fence.tsx', [9172, 'f25205f98b2777cc1a19efd740cfa61a1dc5a52dc7c1ce74eb876dc77d27fd1b']],
  ['components/interactive/sample-efficiency-ledger.tsx', [20328, '34782d11a7a48f00eade98ec0fc651c15f39c5c2503bfeee00fbf65614625838']],
  ['components/interactive/scanned-twin-check.tsx', [8148, '37cf0896f6ba987cc7aa144e078e852158ef8da73acd0617d04665b8b07fa33a']],
  ['components/interactive/scene-representation-ladder.tsx', [33844, '1f287dd7a965d28b02faa8705b756ab67a67a0ce1eafef356dca9dd90c8e2e7f']],
  ['components/interactive/scene-split.tsx', [11141, 'ef3d6d480f9916cf6ece930de2b78871fc83af830d1cde616186a2cd2d1c5400']],
  ['components/interactive/teacher-student.tsx', [14695, 'cd4f61b8d2fb3dda99c2e686f0962bdb6b4a38a90761c98eb514852806f50f77']],
  ['components/interactive/teleop-rig-matrix.tsx', [8359, 'f1d5801d8d493b99c0d97e53138776884408da25636524d9ef99828f15eedaf3']],
  ['components/interactive/terrain-curriculum.tsx', [12590, '9bfe5b9a751a662c8c851f0e7000e426922d324251caf9fec66cfaf268ae0bc6']],
  ['components/interactive/thesis-explorer.tsx', [13363, '54279cd483fd09b3414a787c2862b7985adc217e0a1bcab8860b2aa2d87dc3c4']],
  ['components/interactive/wbc-decomposition.tsx', [14453, 'b588d52a32d59407b753d0f157420abc9b29b1b8b31e89af57022023502edb10']],
  ['components/interactive/wm-disambiguator.tsx', [22936, 'e8513e3aa8c5e3edeed57d0bc7072a32f60315f13c96d9d8aec2717753d2baf2']],
  ['components/iso/anatomy-stage.tsx', [6647, '4a0eff6993d75e51fe0b0def19eb171286998bf35cb2430b63caea87dbb222e8']],
  ['components/iso/react/draw.tsx', [5570, '9ac5bb2ae2ee76ebe4de9742404a473743c8257cab0463ca7d55af7e626132fd']],
  ['components/motion/chart/chart-axes.tsx', [4681, 'c7eb4118449fbb080f1f8e47f0017d4991a26addc9e714d71972a7ecd2cbb8ff']],
  ['components/motion/chart/chart-layout.tsx', [5086, '9cd730cf44eaafff23708319430040ed6e3a16e89edf318526561393f30b4bd2']],
  ['components/motion/chart/chart-marks.tsx', [9240, 'df373fedeee01e29872243b379d0b039a12b4429e50dd251bd911f20a42203ac']],
  ['components/motion/chart/chart-tokens.ts', [3513, 'fd36d19b545b4deb478c4f8e061ac11a8a4ececfee0f1bd515667ed305bf3f7e']],
  ['components/motion/clip.tsx', [6912, '57bd2898697b5d779ef2c40769fe102e8f9f6f719dc104c1e70659fbb2ddfd27']],
  ['components/motion/figure-frame.tsx', [13373, 'fece57de710e48577af3679adb74db52342a77c8f7d7d4e33d85a23075a475f3']],
  ['components/motion/gripper-glyph.tsx', [1551, '5a2255d2268934f435fa0145b04ee526e166e0fe4f1d9b06d7b7c41af6d20335']],
  ['components/motion/motion-tokens.css', [2760, '0147a8766a15ad8078a1b97592e57ce149d0339ede9fa344152bf168e533845b']],
  ['components/motion/robot-dog.tsx', [12087, 'b242c176cb20ffdb06ae58f56b64c1207f068a2f66211f37859475b4ae745d2e']],
  ['components/motion/scene-chrome.tsx', [3867, 'dab590f363b5b0595d43c2461ab0a8712bff6ba6a22d25bafb5cbbf3161dc651']],
  ['components/motion/scene-mount.tsx', [6489, '34eeb2a9387102f2897deac97640d5450b494dab387ddcda32d3d97e90cb036d']],
  ['components/motion/scene-player.tsx', [13447, 'd81f6518b588148c9a738c97bafb8f4db675f04c661f6a27ac9625c5a6ef86a6']],
  ['components/motion/scenes/batch-scale.tsx', [12298, '07bd9e9882c36047595cc4d91c6bdb2db4ef069bfbbbd2c1aaf9d9e7db6e7be5']],
  ['components/motion/scenes/diffusion-denoising.tsx', [23356, 'ad3dd59c07e323e39eca5b3e9286ccb156b1e1c32816e963b9ba5cb974950e18']],
  ['components/motion/scenes/jam-overhead.tsx', [17375, '8463d39ea9f802a68129d0a0b2a2de86ac1e2948b48c85220961efbeebe63a85']],
  ['components/motion/scenes/kalman-predict-update.tsx', [23962, 'dc30bbc875832a9ebd62219356052d7e4335e1f51288191d59c37aafea41d7df']],
  ['components/motion/scenes/sense-avoid.tsx', [17530, '35401bd3937aba29a94966fda192f755324edec8776f1e5dbd6b52b0b23eb2e6']],
  ['components/motion/scenes/tactile-slip.tsx', [16435, 'b7dee782ece5274bf08d6aa466c9bff021c9b8d541f9861a03c60c8afbd21f1e']],
  ['components/motion/stage.css', [16256, '608560067ab56602285aed13d0ef8e1296bbe72f3967a0822f5ac8ec17bc80c4']],
  ['components/ui/chart-description.tsx', [7860, 'e4b15bd32ef9dd83d63c4a05b593cab3c94d53bc049146f13ee93a545b5beb93']],
  ['components/ui/figure.tsx', [8617, 'c8642d817015f3a216b62594fbac200404fc768bdd4a1c4d1bfb50cf0fc25b09']],
  ['components/ui/instrument.tsx', [14969, '35f3a6164a761a711f841cd67bc5c2687877fe813973a0c872533874eb408bc1']],
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
  ['lib/brand-v2-figure-evidence.ts', [31009, '389c1d43294ec043e5542fdf01ca798b34d79d7f3825d68638b5a7e73675a797']],
  ['lib/chart-descriptions.ts', [34600, 'f5234d3e8510b69c2d524328b185c10dc3e126cf59e3739f3b63dfcca9f562d8']],
  ['lib/figure-system-check.ts', [14713, 'd70a30d88a88d8f00b5bbabea4854b4067679bf66c5471d738c4773e64763f91']],
  ['lib/figure-system-paint.ts', [5408, 'aea5c837e3c35e6328fd0bb54840a5c2be63288219e538e5ade0d7d642192bc8']],
  ['lib/motion-tokens.ts', [4239, '7f78507f6c80bcf096f896da04846768b93d6d87387ec73836420714586fd701']],
  ['library/design-system.md', [67265, '7ceb01b6a9829ee30159a6417b14448ddb794cf9aae45b359bc702fb6396acb6']],
  ['motion-tokens.json', [4797, '3779e28bc4113a627bd32b70b52efbcf17dad54418030ca1359b4747ae297156']],
  ['scripts/brand-v2-census.ts', [50225, 'fb768be343e6c474200bd774c7f14b2c104253a6a9620627ecea80210cfecd6c']],
  ['scripts/brand-v2-enforcement.ts', [248896, 'd6276c7e0174bc3cfe89eb7657c34a2137d80a0ba03697867b3477835f0b8bd8']],
  ['scripts/generate-motion-tokens.ts', [16496, '736d58cc877152ee18c85482fa63344f7c7ab4a353a92a2506aa46250bb3f7c7']],
  ['scripts/motion/motion_theme.py', [2399, '687917773d46f9797efe92b24dfae9e302777f1ef22954765ce4e2d743deeeaf']],
  ['scripts/plant-figure-system.ts', [7617, '154dcd9f14add37c9abed7191e84d056a74ed4a756f4189dae0f6960a6895b6d']],
  ['tests/component/action-conditioning.test.tsx', [10538, 'fb7db1b679216ad5ae077b482eeb049985195b68ce1d8dc106eda0100093defb']],
  ['tests/component/advantage-scrubber.test.tsx', [12445, '9b8c81b6af49b8d57335b8059a83e9a0f91d5c22c6b188a0e31cbc01a2a31b75']],
  ['tests/component/appearance-physics-push.test.tsx', [11531, '25134e1a204b93f5b429372b81f8938118c04cb769e7083726f08e80e7cae6ee']],
  ['tests/component/calibration-chain.test.tsx', [8812, '9e07238f7929e1edc62e0c34477094adb0f0857402fceb02f2257e62fca2ae90']],
  ['tests/component/chart-primitives.test.tsx', [8819, 'c2015ebfb22e5113e54fda1be779e68bdb9b6cb94ebcb91a19e1731a2e927af3']],
  ['tests/component/chart-state-descriptions.test.tsx', [19469, '95189678df4e15c1c6a370edefc3732d8aa40754bb387e6eaf17f57e209adb27']],
  ['tests/component/collaborative-operation-modes.test.tsx', [16239, '5003e1876f58483756766a3bb3bdcd069a78f4b1cd65e2253b0e7a9737f5098f']],
  ['tests/component/contact-geometry.test.tsx', [13181, '5cd1e5e1a6e84860311f12e796248e6dea042809fdffe67bc599f2b4cd37034d']],
  ['tests/component/data-scale-chart.test.tsx', [8929, '226c4e5e053bf62161919b170ea24036f91ad01d4dc1ef452ff6f1a60b4bb688']],
  ['tests/component/egoscale-scaling.test.tsx', [10367, '82ff06d3290246f2ca92c900d05374b25845494cdc750b2d1e733bb8411edd2e']],
  ['tests/component/eureka-loop.test.tsx', [7669, '4cf9fddd104ee1471f16cb6e24297b6d72fe4fc2d6d5ded76a4315584a71a25e']],
  ['tests/component/figure-system-check.test.tsx', [10350, 'a713735a3358472f0a7723be1b1a94727f9c2d958c23c4a36c93a3ed3476b437']],
  ['tests/component/friction-transfer.test.tsx', [14347, '2c62f9718e5edfbb0bdfc76f886da12b2726cb1db64719a0bec5d8763eed90f5']],
  ['tests/component/hand-comparison.test.tsx', [10123, 'b9e57e72d9104930792df48851dee4161bb1b1a7f77102fdaa82cb155ec8ccf0']],
  ['tests/component/hand-eye-poses.test.tsx', [7877, '6738a4b15b8a3b24ba20d3e5750e5d4a894f19c890aef7528e8e5dd034b0ad79']],
  ['tests/component/image-figure.test.tsx', [13540, 'bf471b8a214672d943f284521eef26f4d1f352c8b008a52485c19f2e6d4682ca']],
  ['tests/component/jepa-planning.test.tsx', [12336, '744d089ea7b5538f654f85aa803104a0285ebfd45c7f2b6a3ab40a43c182f7ec']],
  ['tests/component/latent-imagination.test.tsx', [10837, '3b4bf94484d2ce19f5ca111d9026953f05694cc23263dae0c85c6b70778d3bf3']],
  ['tests/component/milestones-watchlist.test.tsx', [8219, 'ba722e6086e445700fdd7a603bb498c2dc197f4a15e4d5ba9f72f223729cdc2f']],
  ['tests/component/perception-latency.test.tsx', [12752, 'b551cb35b975d87151f7cc18d7df7781b5206115891ba452b0d64e33f720d48a']],
  ['tests/component/predict-then-reveal.test.tsx', [8703, '0e5431d51c9cdae84d4e71b66730d4a71a700dacaef8f267d0d130e060d41663']],
  ['tests/component/retargeting-gap.test.tsx', [6204, 'd13bb61872b630c9cb800722b3cf9916516b30988ca4699bfbcca9ce15e207b7']],
  ['tests/component/ros2-policy-layout.test.tsx', [9798, '4b924f4c8d776e874c8d0058f63b5ce5af46c7aa39076f088544bfdf3b9c4210']],
  ['tests/component/teacher-student.test.tsx', [7095, '3511ba27104d77b285ca33bc7c529b5daa4068f186d30ff0aa24f085fcedb0e0']],
  ['tests/component/thesis-explorer.test.tsx', [7766, '6fe72bea4c06642f2932c321e7f96d3ce79ec4cc091a2e6633c12b49984b6f33']],
  ['tests/component/ui/brand-v2-primitives.test.tsx', [5977, 'ec96ed968d1726695ef38e4ddb3f4e2757695bdd0ef439b527aaf38dcae3948f']],
  ['tests/component/wbc-decomposition.test.tsx', [8623, '5d49dc0c5acb55cc7ed8fea86c8debdc9adeab73d094b8f2dd62349f22f6fcdf']],
  ['tests/component/wm-disambiguator.test.tsx', [9527, '7736ae8871e1a50756e6f0277ccc6f3cc0452221f6ae2b8431409e2d6aaf3b20']],
  ['tests/e2e/autonomous-vehicles.spec.ts', [6066, '594c9fdf6d5fbb26ec888c8659b5c9fe5e1682ac9b71a587678bf85c02ecb28e']],
  ['tests/e2e/bc-foundations-corrections.spec.ts', [7903, '9f53c1f7dd4d3e8f8a85802ba04b7cd3763b9adacbb8c53d289f64b3a85807a0']],
  ['tests/e2e/bc-foundations.spec.ts', [5061, 'ab1edb81bac0f494ad59b0bba661be2bb244bfdaedbf2c6efb59b915986fffc7']],
  ['tests/e2e/bear-case.spec.ts', [13282, 'beb22187c8f06ed2da0b76cc4b50d758431e94078a1a8e456caea6f9d5ada230']],
  ['tests/e2e/brand-v2-figures.spec.ts', [10556, 'fbae3d209cf5b933244b5a7da42d1391abbf814f71ca65ffd4208befc6fdefa3']],
  ['tests/e2e/brooks-theses-readers.spec.ts', [9951, '57314736882397524a40a435e1119f8e0c11fb8ac2f87a80bc7cb8d90cbe400d']],
  ['tests/e2e/chart-coverage-sweep.spec.ts', [16168, '28a9f69757e1412af0c6303eaf48f0d69aa889d1b95c7d4a549a3272a4d2e34c']],
  ['tests/e2e/chart-description-registry.spec.ts', [6569, '458e4b53e02328a4f47069cf4057a3f98c1855acf5b88b3ebe3ae9a450e19781']],
  ['tests/e2e/chart-descriptions.spec.ts', [15828, '24d3ad5f40f51fb875f064bdace5fa23551f2e7438d4192671bd009766444009']],
  ['tests/e2e/chart-state-descriptions.spec.ts', [26044, 'dc2250020fddcfba176286f24066969ca88ade89c321b54d44420c51eb0db3b9']],
  ['tests/e2e/chart-table-agreement.spec.ts', [25647, 'f1bc5bfdd722ad9f5df1927f5214d2912b73f89e4e0a2a103bcf1eb5d47e3ccf']],
  ['tests/e2e/competing-theses.spec.ts', [11627, '589f927238daa6fdae09ff76061964a3891fba22e3441241f221ec19903e8b3b']],
  ['tests/e2e/control.spec.ts', [29673, '39b412d8781354c34a4f04df51175c141b6c98730ba4f622247b177b9f99f104']],
  ['tests/e2e/data-bottleneck.spec.ts', [7908, '0405f333743028d454de2d4e2526c3780f223b5da43276b439e2fadb3ace0651']],
  ['tests/e2e/datasets.spec.ts', [5742, '4cea5c25b75caf96b4a0605c7cd90521e7b4961a6e77f5920c2d2dd2f937d33f']],
  ['tests/e2e/deviation-axis.spec.ts', [11583, 'ed700f0bca858bfeed0319f7fe4c8fe6934117601cc8e8962cb8276b9f86d2e4']],
  ['tests/e2e/dexterity.spec.ts', [13499, '7ebfc7487bfeaeeb633dc7f96b6fd3d12885ba043faeef549214a18f492532c4']],
  ['tests/e2e/drones.spec.ts', [8862, 'da9836e3a03fe6bf58cbda8c5496c46d74a04d87ba6b28066062e8c3313e1e06']],
  ['tests/e2e/economics-local-evidence.spec.ts', [7553, '317bc0cff4461df8b4623477235bc96eb7b5f7f143602913f0682143a1876514']],
  ['tests/e2e/economics-release-evidence.spec.ts', [7796, '543626574b0ae28c536758f18027f2f9941d7a0ae4f680c48cd34775dc00d668']],
  ['tests/e2e/evaluation-benchmark-readers.spec.ts', [12783, '37e2ec6263e97693ac45ae792e43c4d95f85262f91769866d4bcea205cd1eb42']],
  ['tests/e2e/evaluation-crisis.spec.ts', [11644, 'a58376a7e2a1ec4bc9ad32d3ad1c27f2482e29f086511f363608fa68d797b834']],
  ['tests/e2e/evaluation-statistics-originals.spec.ts', [14690, 'c46a204ef43f5437d40c4ebd5a62e04107fde2ba45bf53fcf4176b9659c1743f']],
  ['tests/e2e/figure-light-stage.spec.ts', [11539, '89204bfe3f0c3bfb696ece88256b7d1edf851d44a77344a9cff5b937bf9ffe52']],
  ['tests/e2e/final-seven-closure-evidence.spec.ts', [8582, '978f0804d444a551485392430255dc3f2f89513631920fbc58828dddf6eb1b10']],
  ['tests/e2e/generalization.spec.ts', [10493, '5013f229702cddf7b77a66149f1c901bfa935423036468ce3d52bae46ca447d7']],
  ['tests/e2e/generative-sim.spec.ts', [11083, '8d354604933c818d14e8f9c79ae044daa9621ff3cea412ab788f5ae321f9ad68']],
  ['tests/e2e/generative-video.spec.ts', [13277, '89d088063b37d310c0d41e71f208061d9edacc5cc68a311a9daf8f9d0a741945']],
  ['tests/e2e/grasp-planning.spec.ts', [21135, '8737fe29fb2fbd9a43948ce4ca576137e446cff279b5c45d1c50cf3c6823597e']],
  ['tests/e2e/hardware-taxonomy.spec.ts', [8324, '5751695cc0d14c7505e430be1d5c819904dc11efe908f396361efd67924dab06']],
  ['tests/e2e/helpers/figure-light-stage.ts', [12780, '45b77548e31f22bb089f740b72cf3b760a6c3b843fbec5762a511525d41fb4f1']],
  ['tests/e2e/humanoid-advanced-motion.spec.ts', [6139, '77f8b25be8aecef5bb81b5c673922f64af8a42356821202a339ff86a24b7ed30']],
  ['tests/e2e/humanoid-tracking-source-audit.spec.ts', [9205, 'b5ef8e4e25a03aefee79299e658343693198cf1fec69d7c3476c969ae00ab66e']],
  ['tests/e2e/imagery.spec.ts', [18848, 'c099055a4b0b63f1e7ab059dd2bbc6005aa42d17de8c3f50f5ce382bbb0d85c9']],
  ['tests/e2e/industrial-citation-refresh.spec.ts', [7938, '2f5e5c8b54561e7fd2b61faa6fed469e99c5e2d40e186f3f32cbce2c6a639a6e']],
  ['tests/e2e/industrial-cost-reader.spec.ts', [17106, 'd20608d6cd92dcbd401b1bed72f00e4e8e3bd7e5a94352e8e8171e30bbf049f0']],
  ['tests/e2e/industrial-deployment.spec.ts', [20646, 'c06cb15a8042162a557bc9992dc37f64d2565fa4938deb1b6bbfb2fddce96e9f']],
  ['tests/e2e/industrial-engineering-originals.spec.ts', [15471, '3928a6f7e9c994365f9a5b43081afe03cebf49d395bdb32d3e4a939f56c9520d']],
  ['tests/e2e/industrial-release-evidence.spec.ts', [7933, 'f713d0a4ee20772c734bd94cd925f8fa8c7745dffd4afd45b640e008cf5b46cc']],
  ['tests/e2e/isaac-lab-source-context.spec.ts', [1446, '5684c4d18eee11cda699ee5a4584743c3cc336296385b5e78a67afa1464be5a6']],
  ['tests/e2e/jepa.spec.ts', [6877, 'ba79d9f6811906e19917d6c8d0f41648ecd20efedb009b0f327c97fba611e5c7']],
  ['tests/e2e/keyboard-only-navigation.spec.ts', [7487, '4e1739c438566529233ec54203df637fc0ba17341b43c75dddf8e56c35dfc752']],
  ['tests/e2e/kinematics.spec.ts', [24175, '22b73b2dd37b0d37d90309f91830bba61edecb07571069dde18783804c1ff609']],
  ['tests/e2e/latent-dynamics.spec.ts', [6987, '9d3a266fb2364ecef76c20ab45123678900bfe97365504cab8eb457b415c26c2']],
  ['tests/e2e/legged-locomotion.spec.ts', [8689, '4096ff393636b15a09bc1d639b4dc8eeba1ad87335bb6d8465bae2c9880c850a']],
  ['tests/e2e/market-map.spec.ts', [29475, '19237d09c3ff81a293d84c44fb88b259e5b81fd3a1f986a3ae2f4436fbd61268']],
  ['tests/e2e/motion-data-hardware.spec.ts', [9809, 'fca2c759ec055977bf434738ab6efcb49e6f1685bd2d661aba4ecbb88fc42e60']],
  ['tests/e2e/motion-frontier-adjacent-home.spec.ts', [10322, 'bb0f752f75a3e77928a1078f1e8d90c672d6362d210b709c77f27068fed5a665']],
  ['tests/e2e/motion-manipulation.spec.ts', [8124, '77ce3e65b32092ca67ecc6d31828e3ab942239e1ffec68ee55eb4bef0c693282']],
  ['tests/e2e/motion-planning.spec.ts', [19017, '3b5d749010e32e8ad3130f06aca825e8b3c75edeb03a9dd596b6024eb450ea12']],
  ['tests/e2e/motion-world-models.spec.ts', [15319, 'c85f58f94a781b67d8cd1848aff986809c31969b988e314354a17b861403221f']],
  ['tests/e2e/oft-gemini-oxe.spec.ts', [17988, '950d1407072d304c319dec14a05a7b62e80a4fe622a667cdc79eed5aaf4666de']],
  ['tests/e2e/parallel-sim-rl.spec.ts', [4836, '6397c10b8c509c074a6a6cd3b41e02b12bf51d520bffb3ee2e480dda60f7f6d6']],
  ['tests/e2e/perception-depth-readers.spec.ts', [27067, 'ed722e4557206436da17573d7884dee60c37422f291405a69625c3ef1bc17c3f']],
  ['tests/e2e/perception-keypoint-readers.spec.ts', [22194, '17a1ac670433a07a4fda5b61c827e6bf8067cb5b47c190a2373bef9ffad6cd65']],
  ['tests/e2e/perception.spec.ts', [41788, '5f12a51f14c3aa033152c7d2d806ecb777aee0c2a53ceda5c4bfa62c1759ad97']],
  ['tests/e2e/pi-helix-theses-readers.spec.ts', [5396, '52f8cf2a9db5f8848898a131f53e2977825a36cb64a2ec3cfbcb09c836cff278']],
  ['tests/e2e/predict-then-reveal.spec.ts', [42430, '3394d4ebce9a2abd151a4270ee6a2e685219604cf58fe11dd2e3c0fea756b2fd']],
  ['tests/e2e/randomization-reader-closeout.spec.ts', [22249, 'dc2948af10c7b3c0c222e1725e0094daaa5f225dd4b1a97dd18f735905c8a182']],
  ['tests/e2e/references.spec.ts', [17492, 'b29f56e9e9e5125ffa3b538cb25837de0f9ced1c60da1a3b1d5ad4e5b362c99d']],
  ['tests/e2e/reliability-gap.spec.ts', [13695, '4610e7f76330aaf9a2fc8a14404dcd32cd168857bfbad006c336b7adbe911737']],
  ['tests/e2e/residual-release-classical.spec.ts', [9970, 'cc144bbf81ab277e9be9bbc920f0a98559efe6e44663cd637d1f4dc1bcf39955']],
  ['tests/e2e/residual-release-final-seven.spec.ts', [9109, 'd8cabb1ce684df2af764dac96bbafe67e71bcf34169c159cb83dc3493530bf4d']],
  ['tests/e2e/residual-release-industrial.spec.ts', [7933, 'e1abbb3ea4a3f33933994d030b5dc5ed757239867cedda05fd7b9306e3942968']],
  ['tests/e2e/reward-local-evidence.spec.ts', [8673, 'fc5e110a889c08e69cf46d2872eff973fbea7d29fa5140a632daf02e73fb15fa']],
  ['tests/e2e/rl-finetuning.spec.ts', [12833, 'f769946e36c5f8e72b940764795b784c7bd8b10fa3ed0cf22cb1b581f387699e']],
  ['tests/e2e/rma-kl-reader.spec.ts', [14864, 'c8d36cb3289ca559e9f5d090b91d1c6014404f0f07d84de5f726997f21bc24b4']],
  ['tests/e2e/safety-and-assurance.spec.ts', [26346, '04caa5a57a6d92d1565a3ca3cc09eab64d260768e24fc1279e8d78657b9642ea']],
  ['tests/e2e/saycan-cap-readers.spec.ts', [8758, 'c389ab8246140038bab03043fe24d72e9fa9cf47f5eb206da4e9a5bf16b7ef1e']],
  ['tests/e2e/scene-representation.spec.ts', [29417, 'b05744a3beb825485895154fbf7d278e916a987800e579b152e0851da9448f10']],
  ['tests/e2e/see-also.spec.ts', [15224, '4bef5f3c9be7bdec6ef073bc615c03d1e645de78d5dcfbdbf39e7ab2e71f15b6']],
  ['tests/e2e/seo-static-integrity.spec.ts', [21481, '3c92ab3b5bd20a50de6b903fc160fb2bf5ee702d4a7dee72441453e97ed97f18']],
  ['tests/e2e/sim2real-local-evidence.spec.ts', [10991, 'ab74bcb826eef68b5e3dfb99d22ae51564819ed14d2e92d8cc28b042a3dbd76c']],
  ['tests/e2e/sim2real-transfer.spec.ts', [16232, '29fc86cc637bc0caf048e54e24db44d7047dc0e7d50ed444a7700496e3a58e30']],
  ['tests/e2e/space.spec.ts', [10747, '7fd66a3d6ab070f024f867d94b7949fcbfd311a05777b48a2b6af2cf7516c051']],
  ['tests/e2e/state-estimation.spec.ts', [15673, '14946ab4a65f816274f36b59a167ca33f69056b35c6ed8d4ea9e1521e3be2b3d']],
  ['tests/e2e/surgical.spec.ts', [7846, 'f786a6193e68064f5cc92227e1bf13e766155cd2c83223e8a7ed23d463af9554']],
  ['tests/e2e/teleop-rigs.spec.ts', [9057, '6afcef122bc1fad972cc1f4697cd0024536ad15aa3a2a9eb69fb61f6ce8ac2dc']],
  ['tests/e2e/thesis-economics-readers.spec.ts', [7331, 'f03d17b23b5d379dee1282f5655f2f70e414ae3246d4b8de41d14dd0b041779a']],
  ['tests/e2e/why-rl-locomotion.spec.ts', [5513, '2015a8f445d9df3354db4280160bb60cb1a212de5d74c264708e35761b266349']],
  ['tests/e2e/wm-taxonomy.spec.ts', [6559, '016d7f7426e98a847b6912feb7fae16d3f1f50af04eff1537b423756626366c7']],
  ['tests/unit/appearance-physics-push.test.ts', [5351, '7e9275704d3f5dca27c2fa72a760aaff5083ff37625daf297900cb3f1051b0d6']],
  ['tests/unit/brand-v2-annotation-scan.test.ts', [13596, '8dfdd1f46946d655fb927f9af75538b168a5fa0e4e5d636523af59fb87796f5b']],
  ['tests/unit/brand-v2-figure-evidence.test.ts', [33552, '01ed0e3b977509ab2d5d4d2bf1e333573b08b862af223a8a13cf24ac39bc2460']],
  ['tests/unit/classical-closure-evidence.test.ts', [16186, '28cda95ec399bde3b339630a35239882d53e606c5fec8d0cbca5845de283b148']],
  ['tests/unit/content-integration-20260923.test.ts', [18049, '737db1d8dfd8b19308b70b41f7a13408a0f492317bdb95e0f73cbdec483865eb']],
  ['tests/unit/final-seven-closure-evidence.test.ts', [8409, '13a31ed2e08cc701c778e6a0da5cb946f6d373c6e5a19c67cfff021b90e70dd5']],
  ['tests/unit/main-merge-approved-deltas.test.ts', [457939, '8504a6749f3431f61e87d1524f34a1501c1cccb3b6bb0704c2308a5623c7d74a']],
  ['tests/unit/motion-data-hardware.test.ts', [12808, '2e1c45f96fe7d2f9004188033648308891c9bdb131012709b6e34007122090f8']],
  ['tests/unit/motion-frontier-adjacent-home.test.ts', [10338, '6b03cb596cd397563b0790600378cff09f811c3adfcfd7f33859d1a410a0c5a4']],
  ['tests/unit/motion-tokens.test.ts', [5443, 'b364833eb29a4892bdb2892304cb0cca5c9e5f995f510e567fed0362c6786e41']],
  ['tests/unit/motion-world-models-continuity.test.ts', [11974, '021c4a1ccb82093c4bb3557e1ccd5c190e0891e93a498ece0d5a6015ce24b653']],
  ['tests/unit/parallel-local-evidence.test.ts', [5415, 'd2c39b3c94fad8f22da07efe5fa4517aef9325dc77477f510c65275e421fb687']],
  ['tests/unit/reader-release-integration.test.ts', [33638, '316b1a2969f5c63f4b5928e5ae7da5ccb439dba78164e2c1fc2b51a7e6b2afdb']],
  ['tests/unit/reward-local-evidence.test.ts', [9001, 'a5d166d0b11e1cce9ce19a093d328ccfc45c2057e61cb856ee08857cf2241c12']],
  ['tests/unit/robomind-hours-evidence.test.ts', [26899, '7ef0de893f31016890ceb62fa6e2610cf0bedfc55bbd26c17d0201d74779879d']],
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
