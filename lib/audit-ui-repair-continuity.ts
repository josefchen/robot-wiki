/** Exact predecessors for reviewed shared UI repairs; current browser gates stay live. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { keepsWordBudgetTrimObligations } from './audit-word-budget-trim-continuity.ts';

export const UI_REPAIR_REVIEW_FILE = 'audit/evidence/shared-ui-repairs-20261102/source-transition.json';
type Artifact = { path: string; bytes: number; sha256: string };
export type UiRepairSource = {
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  reason: string;
  preserved: string[];
  checks: string[];
  edits: { before: string; after: string }[];
};
export type UiRepairReview = { schemaVersion: 'shared-ui-repair-continuity-v1'; reviewedBy: string; observedAt: string; sources: UiRepairSource[] };
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const drift = 'shared UI repair continuity drift';
// BEGIN shared UI repair pins
const reviewPin = {"bytes":2059536,"sha256":"d3954302feb49c05a73e06bbf627a98e81449dec52db626eba9de6940b8ba08f"};
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ["components/ui/cite.tsx", [5891, "b9fbeaff3405eb0df51c10e79702cd5714b343f32997f5ee07e8afe5dce376e4"]],
  ["components/article/references.tsx", [4543, "63e17ab383c0a949d95d33e1379db46521be04f6e3ba5e8fc609c82d486b74e7"]],
  ["components/interactive/eureka-loop.tsx", [22019, "5bf12a308f4f2fb85ad93c5ca5ba4d51841580a270fcd9866a0972281186d936"]],
  ["components/interactive/reward-shaping.tsx", [25306, "9f6c76ef04149f77123d9fe27e4fba67cd194032d351f8f0b8aa184ca8086c01"]],
  ["app/globals.css", [36839, "0fe019917974354beee40b34ce977f70f49e061b5d77add5bdeb53686b4f572a"]],
  ["tests/e2e/brand-v2-static-fixture.ts", [3630, "fd2d396b16ced76b675100c89cc709b3a8470c461d30c79683683992e9812fe1"]],
  ["components/interactive/action-tokenization.tsx", [24312, "2a24e2cc6cb9bccd5e67963a63cd8fc5b0d2fb392f76cd80a49ec2b0526f3959"]],
  ["components/interactive/appearance-physics-push.tsx", [23842, "2451c99798e02d9270010b98da30c6adca0bafa90c00553393585ae2101fa198"]],
  ["components/interactive/execution-modes.tsx", [21255, "5781ba7e3c6269e1e1b573e312e69abeab84f3369d1632bd413c39909e13e636"]],
  ["components/interactive/flow-matching-trajectory.tsx", [25985, "00ebdd45feab80f4a43e9b5d822df6966c95cda3580b9b3539c197bc1c6e13fc"]],
  ["components/interactive/receding-horizon.tsx", [23110, "4d862175c4cf0cfdb5350092e044905b1e1c87176f845fffd1cd57cb719337f6"]],
  ["components/interactive/chunk-size-curve.tsx", [15278, "d7d2d1fae0b00eb56f97d8e8fa034abfb13e17f3a0ffaeafee809d3ec4d0c776"]],
  ["components/interactive/compounding-error.tsx", [30715, "810c3fe8bd94691fb6467bc161a8bc14db4846a000624dcdaab53adf1357fc89"]],
  ["components/interactive/cross-embodiment-strategies.tsx", [21201, "fbedd2ff235559dcf16458a25763abf72c69f411cb53d75982c517183b6802eb"]],
  ["components/interactive/grasp-wrench-lab.tsx", [29934, "80dc7e213131dc79cda6c82ca88719bdb7d71be971386bb5dfb302d0be6d6a58"]],
  ["components/interactive/jepa-planning.tsx", [21004, "ec0392f6013fa3b5d1835db925ecb13fb798047151777cb59e3fcd22220363f8"]],
  ["components/interactive/latency-comparison.tsx", [23045, "c8db907c2f284e0b340e75a26379e5b85c1c7bcbce79dec093bd79eb80326a1d"]],
  ["components/interactive/latent-imagination.tsx", [20415, "6190cf6d15f482212360d7bde318fe863c9fcc114d3f0995406cf25e94b0b0a1"]],
  ["components/interactive/dataset-table.tsx", [9128, "a1c8b85333dbf70fe5440574b23463e512fde7e77f7e73429d57190288952492"]],
  ["components/interactive/hardware-guide.tsx", [10809, "70d922d10f244bfe4c2e89ba84ba1e72626677188b826c9c1ec543c3bb2d7f7c"]],
  ["components/interactive/teleop-rig-matrix.tsx", [8402, "91edabcf0e39ad75a47ac463c150a041061221a6434cec45b591510c6c2a5d15"]],
  ["components/interactive/hand-eye-poses.tsx", [14546, "6b1a340645596bc9fcb5a112b03d4450f499604ff1cb30b32c295fa2185b7919"]],
  ["components/interactive/retargeting-gap.tsx", [14565, "a2e9fc4ef738c155bf40415632443086eac8a8a7b5bec74c02e277aef382c2e9"]],
  ["components/iso/anatomy-stage.tsx", [6974, "36b1a43ee07b0dc9af554483d9ea4796a5f865aa867a7c2f8ed576820167a461"]],
  ["components/motion/chart/chart-marks.tsx", [9369, "81dc0300b3057853b69e43db69d38adf20480a2cc09d68bad73387668c98b436"]],
  ["components/motion/stage.css", [18960, "b494d31a5e0e02b1a33a5a328e8a245719ed2ced8e963fb12f2e71eefa92b97f"]],
  ["components/ui/chart-description.tsx", [8012, "0473e64d76e4bf78eac8769f8cf22ee10d249b9bd2db19606ff83c2db8bce286"]],
  ["components/ui/code-block.tsx", [1514, "febabcb103374ca9c4a7b49741176b74df2c048cff3b1d412383b437e7f4d94f"]],
  ["components/ui/table.tsx", [8674, "c219c380f84a07b328947c51896212d527bedd02e9202206d01ff6762c00d255"]],
  ["mdx-components.tsx", [5532, "f2c3adfd456c40b07f449c81d6f9fdb3f158bd79775ae171411b76eed481b484"]],
  ["components/interactive/generalist-release-timeline.tsx", [22656, "741af16db210a82de231a0e1cbd886ce272f9866ae3cd39fc52dfc4b09d87651"]],
  ["components/interactive/collaborative-operation-modes.tsx", [34816, "94f8c3cbd506232604e6c5d2de2d9c2e3a1e13ba0cce22f401177c85b478026b"]],
  ["components/interactive/pendulum-controller.tsx", [23611, "b4138e8d551abe677ad0acc64f3fef42fe41332aa29b5c99ffc9197b30ee563e"]],
  ["app/page.tsx", [12256, "a56ee091049bbef42608260cd5d05c561c81dd45c559518800031230f72cd255"]],
  ["components/home/contents-index.tsx", [2764, "9effa003bcb66ec96de814697103f6509c59c54bfbe0ae324c2df39fa57bd03a"]],
  ["lib/chart-descriptions.ts", [42638, "b5711afdda5b5e34090a173e8b8e93aa292e488d9176d5687e60a95fbb351558"]],
  ["components/interactive/chunk-buffer.tsx", [13564, "250400cc90406c89ba9f1efd090ef98b4c5792428b0058e5db854d6dac363bd7"]],
  ["components/interactive/excavator-practice.tsx", [12404, "70e58ddfd8fd456926c65380d0e03539c6be075450183ea34cc1b52f68de799d"]],
  ["components/interactive/action-conditioning.tsx", [23046, "7ba702c35a5d6c7bd5416bb646134bf12f0663da86e00021716a948e90a0f2a2"]],
  ["components/interactive/comparison-matrix.tsx", [23225, "c104c85f6392f6119d5ab3e8452af5f823fa55b7464acdef1f9ff2d04d873a5e"]],
  ["components/interactive/hardware-price-ladder.tsx", [10125, "b489cc583f0d2e5e440b4ff1af5a219ec34ed8229e61157366d5fd826507c697"]],
  ["components/interactive/humanoid-pick-height.tsx", [13848, "8365b9cbe1a9737d9464bd1a6cdb093ee0a9f23c0fd93c2f36076e50ebc15340"]],
  ["components/interactive/pi-generation-timeline.tsx", [20321, "572aabf886a09117e969168a75e6257aa56d7d6267318a5b3702145b1c57dcb2"]],
  ["components/interactive/terrain-curriculum.tsx", [12628, "eb46fa31bae4afb669dea21d40b4ca6f6209ab5afa704ae58a6b04a57e3b253f"]],
  ["components/three/robot-scene.tsx", [35462, "1bb4ccb1bc66dd90d360e7e6f1f45b9f01c5a42cec6d76dedb7699eea34dcc41"]],
  ["components/three/playground-canvas.tsx", [10457, "51ba3f2a3b6c18c1974714e41d12f2226040b3d2e963704d9e2a234afa35be28"]],
  ["components/interactive/egoscale-scaling.tsx", [27430, "438a0df14424ac0dbaf9171cb7edbcf59b8df8b4cc7dae56d6b628a6f0b77181"]],
  ["tests/unit/classical-closure-evidence.test.ts", [18810, "c3b7e67f8f98ad6ab1ff06e72fe8f6afc9667dec496279d165ee126786bb474b"]],
  ["lib/audit-local-basis.ts", [119051, "d25bc26a09c4499da0618a3534dbd6c8b3319aeb5fea833f007669b7f72ca5e3"]],
  ["components/interactive/actuator-gap.tsx", [21179, "4a1d2da145c5bee380bbdb2effb3bc38ab785b462f88a10eb11365bfc7458502"]],
  ["components/interactive/advantage-scrubber.tsx", [27476, "1c5abd736cb5b3aee5e730984a9224742fa274d26b44a6c23a8c7419a45fe402"]],
  ["components/interactive/bear-case-lock.tsx", [10351, "aa664673561dcaa228dcc073955fccedc2f89d98fbfbec2346cfcc414eca61a4"]],
  ["components/interactive/contact-geometry.tsx", [17346, "99f15c8e38839b89d674f07c2d79539075152f2285cb4e071158887b1b84f187"]],
  ["components/interactive/control-loop-budget.tsx", [19439, "32720dfc0f59baf499efbe70b44c241f9b19c25a665ca15ad625f15940ab4313"]],
  ["components/interactive/cube-trials.tsx", [6363, "022415bd2f9cfd1aae2d74f0235796f28850db7fd2def950f7e08a4dff657044"]],
  ["components/interactive/data-scale-chart.tsx", [28553, "cc62951ac27ebc5f1eb94417bd109eda99d176a227cf0f251fc86e2212a9b9a1"]],
  ["components/interactive/dataset-runs-hours.tsx", [11698, "5313cddeb8fdef272513c5a7fd2843dd392abfeab605bae7ff2d69397618279c"]],
  ["components/interactive/delta-frame.tsx", [10576, "c21f4d99af1605b7390c31e28a0ea83c5b86da4a335767f789f306ffd979ea38"]],
  ["components/interactive/demo-or-sim.tsx", [10194, "d4c361c5339440a6a5bdf197d20da53c30588a63a9d00f6954f1c3d70df06941"]],
  ["components/interactive/hand-comparison.tsx", [15654, "818356676f2d8071f70523bad4ae53d428d45750d5f62fa7af965ec606fdcc5f"]],
  ["components/interactive/hand-motion-share.tsx", [9848, "16dd5d1fe39aaa7ab56fe76da8513383f4e64aed4e7c73e8a7a6ef78febbd235"]],
  ["components/interactive/helix-clockwork.tsx", [11387, "6c45efddbaa04f463f50185d6b223f33da9642e01a25e7728572f1c7adbe0de7"]],
  ["components/interactive/helix-zero-shot-success.tsx", [8705, "0ecaf49da68af6dfd8a0fda6c677f1da8801af4973c7ed6c6f36b33879fff973"]],
  ["components/interactive/hierarchy-timescales.tsx", [18624, "e397bf6d991cc0b1acb27ac8c6e2fd9a40c22a15e27fd7fa0019b0c0b80c8238"]],
  ["components/interactive/impedance-contact-lab.tsx", [28981, "03101b103eb5aaf275928b5c355a23933edd63fbda7f56c197d35da8d9f59a20"]],
  ["components/interactive/impedance-press.tsx", [28735, "fcfbd6067c76bf2068bb3f6b7ee99f5bfd406644142bebad6e1c0133b17dbc7c"]],
  ["components/interactive/keypoint-string.tsx", [9596, "05dfaa9b25c4f330b7ff3e8ef4d5569a3af6382ba483fade08aa83a4dabf7aae"]],
  ["components/interactive/kinematic-twin.tsx", [13545, "1228128f294315957c73668edffb19b580db22f075d419616f4969f3d058042a"]],
  ["components/interactive/linearization-gap.tsx", [10230, "4d25073049efaadb8dc443b9a0d2800ced671801a09832011cc9e0c4dc1e3e45"]],
  ["components/interactive/milestones-watchlist.tsx", [14378, "45b2e01b6a0dd3f487cb3f1112aa3b5509adbc34587809e429e928f69b0cb81d"]],
  ["components/interactive/mot-insulation.tsx", [25230, "3e5e1a6342c76b4043125ca285a4c106061a956e28614d86034f30d71a496992"]],
  ["components/interactive/newton-solvers.tsx", [11978, "8e0af15a57c98240409437309e85f0ebe77e3c3b306494962530bbc034fa0997"]],
  ["components/interactive/noise-or-edit.tsx", [10136, "db11ac6bad8b0533f3cf46c082ed76cd7067ec3657ca4691c4716f605282e20d"]],
  ["components/interactive/offline-value-overreach.tsx", [18752, "b22d380368fb099c96503579f9fe6077bc351f4d2f105d6840c612a725651049"]],
  ["components/interactive/planar-fk-arm.tsx", [13482, "7d0dfcfc8cd68f8ba690d0dd40ea85ee7a56abf42eb37732ed2177e687f7b7d2"]],
  ["components/interactive/qos-queue-age.tsx", [16779, "141f737fa211be92cc478202a1c36d1cf31c7e01908979cd012d94a94d11f3d4"]],
  ["components/interactive/real-robot-rl-gains.tsx", [9384, "9678afd8c88a674e28f5295952ad57e54eb8dc52bf9bdb1d5de386621877a96e"]],
  ["components/interactive/replay-reuse.tsx", [10701, "57f75501c3e8bee6eb5541727729ba70c1b0c7176f9586e5f6cc0b4b66de1685"]],
  ["components/interactive/robots-per-gpu.tsx", [10418, "4f25ec5156e3f21faa9945c4cb2e9d823877bcdf49dc0ce9ce4544e1ad1cc9f7"]],
  ["components/interactive/ros2-interfaces.tsx", [17238, "d84c0d3af597f73cc32bb9562e9db24cdc433ed288207bc53660866a202fded8"]],
  ["components/interactive/safety-filter-fence.tsx", [10893, "9c558ad851da21ee3a1d4d217939a547975713dbc370cf6e14d2961bb895b27b"]],
  ["components/interactive/safety-rules-timeline.tsx", [10981, "86e1b809c964cfdacbd2021dab0aeec73e503791a13c1c583c0cc97c7f130c65"]],
  ["components/interactive/sample-efficiency-ledger.tsx", [20408, "4bfdf56cd4d1acee70e392c1f17cc6396429f76cd043037fbdb8527bb7761ec7"]],
  ["components/interactive/scanned-twin-check.tsx", [8316, "b8667f6960a290c660c78c180cb2d2715795f6639a15a47b1797cb6f84126ab0"]],
  ["components/interactive/scene-representation-ladder.tsx", [35282, "7ba7d72ac8ce74beb8753a2507ea863440ebb6f50ee62f213b0c79b7bb21e773"]],
  ["components/interactive/scene-split.tsx", [11164, "88523e11193ba3f2d29b574e27687b0403d40bff8ea769554926998739b8802e"]],
  ["components/interactive/teacher-student.tsx", [14469, "2ba43f0085975fa5535d08dedce4c85ed48b9009f8d78f7c71b1729a3e043e66"]],
  ["components/interactive/thesis-explorer.tsx", [13446, "5dfcee3d3ea41bb51864583f67f10d14e82dfea2dac0008eedb8ebd02828fcb4"]],
  ["components/interactive/time-offset-miss.tsx", [12264, "92de8f3b2d104fc54fc25852f501d669db71dc9fae30194ca7fd4caabe501bc7"]],
  ["components/interactive/trajectory-stitching.tsx", [18546, "78bbd739bacdfabb77f307961f65253a6b4f72eff9ca35a40dc6c103818e6ed4"]],
  ["components/interactive/umi-collection-rates.tsx", [6746, "9563814e4ad2c716a61d82d9e3dcb39d19c6b1a5a4606bf513fadd4a1319d3fb"]],
  ["components/iso/figures/bear-lock.ts", [25194, "8e6869e99ec88d39be7875af1c033cd4faa9313077a068f9fa1cfecc238feb54"]],
  ["components/motion/scene-chrome.tsx", [3962, "c2514d4e36417824af4e59a07b89d92bf7f88cac8e9af460729d85473ce846ca"]],
  ["components/motion/scene-player.tsx", [13639, "ee90fabff1bc4ea3929c37c324a1e70baed457ac92d72e878b34efaaacef29dc"]],
  ["components/motion/scenes/batch-scale.tsx", [15222, "ab0606a83a1ee5cd0262ccca26d96b8950cd9313f5dc0df3b9e30f478b82200e"]],
  ["components/motion/scenes/gait-support.tsx", [19313, "69ec47a2829a671a1a08fbca4232330b743559443c84e43a168049508dbb0569"]],
  ["components/motion/scenes/jam-overhead.tsx", [17567, "65af32db0d06ff6c3abed62d1627e5599191022c123b8e7081906a54b7ba3b11"]],
  ["components/motion/scenes/kalman-predict-update.tsx", [24004, "c4657e663f25056d6c7ffd67dc6536d24c837a95004a0c40a036bcec2032ea1d"]],
  ["components/motion/scenes/sense-avoid.tsx", [17549, "08349652a4480dfadacb69b6136569a78bf94b2a1de1a30f484a167a5c400df7"]],
  ["components/motion/scenes/tactile-slip.tsx", [16518, "c861393b99395d3d0b4720cb1406881fc30eb9f3c4fbaae943aa9c5328ab7725"]],
  ["components/ui/original-schematics.tsx", [10551, "f8fa77796a6a037bcd476807c1e083815d256afadf47702ff8eb5c4503158c94"]],
  ["contract/reader-first-registry.json", [58274, "8a5d16c21ec9ba3f69747f20ffbbae9f1487dfca6714c91e6d460e25b956c038"]],
  ["lib/motion-clips.ts", [5652, "f77dca68e8d1e9492886f7d041e3f3ff6bc3a633a192117bc02af5dc2ef81c45"]],
  ["motion-clips.json", [3923, "4817e8823e1b70468750cbc2d243b672281d9578612d13e923fca82c20fb8879"]],
  ["scripts/capture-reader-first.ts", [4432, "5f3cf4abd04fc1d3895502b651c77688dfd3551f5f27c2c5a2958bef9a4b6d0e"]],
  ["components/interactive/motion-pantograph.tsx", [10760, "2f35a8e2ff782fd51ea83a57493d4719eb9aa1cbdfafe58c09772794e0e216f4"]],
  ["components/interactive/scope-follow.tsx", [12656, "d6d7df6ef525a42d6beda5623184dcf45285ab0cb4867584d9016540d2f199a3"]],
  ["tests/component/advantage-scrubber.test.tsx", [12566, "ea4878d004256f19866ce76e727af0984b367e513f54f9e668f7640d65c6dc87"]],
  ["tests/component/collaborative-operation-modes.test.tsx", [16231, "18ba6e251c5b1898898c6e69c2768c10f023c6a1a4c60e1c30335b5d94ff9901"]],
  ["tests/component/hand-comparison.test.tsx", [10150, "1de96cc1d9bddf056b3343659db671cda16a10ed77ca141139d63310117b1b51"]],
  ["tests/component/latent-imagination.test.tsx", [10931, "c237cbf5a74e71974f0ce892b9773e703e57a1f243c237d0b3a6da8e0489566f"]],
  ["tests/e2e/motion-scenes.spec.ts", [16973, "4b995a4b64cb888863f2465e581a130b3c96a91bc701c1a278826f31fbf80032"]],
  ["tests/e2e/state-estimation.spec.ts", [15869, "8bf5581d00b2faa9721b0c7fe5b4b6dd4ee27c7ca8b38adf900d6486c06a9e6b"]],
  ["tests/e2e/motion-rl-sim2real.spec.ts", [12741, "d72231c469590922290c834c88ce283c6e7ace9fad3ac033867e1782d133b49f"]],
  ["tests/e2e/motion-data-hardware.spec.ts", [9832, "d99b8992af261e13357b453156ba809fe29ba9fed498e3ffe16af9d01b81414f"]],
  ["tests/e2e/motion-frontier-adjacent-home.spec.ts", [10459, "12a88c60563b80a5c1f0684b10544a8007808ef278dfa7a5ef075dc51074f51b"]],
  ["tests/e2e/rudin-protocol-source-closeout.spec.ts", [15662, "a3491e091c20cc4876651d3fe11deb3893bf3941a2a46d7413ba557772f9356e"]],
  ["tests/e2e/latent-dynamics.spec.ts", [7021, "e56d6aa504b55fa5a6c73eab7af28569eb0ea7c950ab01607db261ca5cc3935a"]],
  ["tests/e2e/cross-article-closeouts.spec.ts", [12548, "40626f55767688e17965b7e4406909574de9cd741a1077e112cb39fe62d7b70c"]],
  ["tests/e2e/datasets.spec.ts", [7307, "302cce0f5dd4dd2e1fd50dc678b076e3129ce09bc5b6465cefd6c8fcb5158300"]],
  ["tests/e2e/oft-gemini-oxe.spec.ts", [18006, "2a26c6fca2eddb7233dcd1c13be068ca0580ca203cc48692afd39d5dff8a8fea"]],
  ["tests/e2e/chart-state-descriptions.spec.ts", [26053, "54fbc55dd4e8048e9fdfa724752b9c886f00a88c2da44add53a4e8cfe4dbb256"]],
  ["tests/e2e/bear-case.spec.ts", [15642, "cbf4e349690df2b3e54332e9e0427a74428e339f12369d414ca7f3d6bc70558c"]],
  ["tests/e2e/hardware-taxonomy.spec.ts", [10296, "41ebed776cffeca06a49212ed9e87b040f93e6411a3e83a6b31d4f87f8073f93"]],
  ["tests/e2e/autonomous-vehicles.spec.ts", [7628, "4488eeb861d171a5133588712be8817e1e344c9fc63c6a12afdf5f9f9b1c98b8"]],
  ["tests/e2e/rl-for-robotics.spec.ts", [26223, "0719c1e19e5192e4ee6a18ae2579490f26aadd58b2ab7ad39778677f442b1a4c"]],
  ["tests/e2e/teleop-rigs.spec.ts", [10733, "64f614ba2a5c627c3f5aa72b1e19185e6475e760dd42d3bfb90cda2bb9bb9fc9"]],
  ["tests/e2e/drones.spec.ts", [11727, "623476295efce56581a22feb81f1fbfe6eccff5f01ff8ea39427f5b5bb7095bb"]],
  ["tests/e2e/parallel-local-evidence.spec.ts", [12646, "741d231432761eda0104918511795daffee1b50ab62ef7e9ba42654834819a5a"]],
  ["content/rl-sim2real/offline-rl.mdx", [12629, "0a3ab929236d9b28c551233f69f93c42dc7a2f35031b9aa52ebc4063ccdb9109"]],
  ["content/rl-sim2real/parallel-sim-rl.mdx", [10515, "572d090fbfd707f94acb30cefd08a1c4ee219a46b32c26f2a6bfa370ca7e7838"]],
  ["content/rl-sim2real/legged-locomotion.mdx", [13342, "8b3f51d2a6a8cbff89ed23827b5480bb702f09d6ecdb8f4bcc57f8218edd2999"]],
  ["content/adjacent/surgical.mdx", [13235, "795143f02f9ba13cce4144499b8b326920897193462ae2eb1c7bcc5f50669d51"]],
  ["content/world-models/generative-video.mdx", [16720, "bb33da52b258df2da4c50b13c2b1d2de5cab10a5eded0c1640bef6479a15da07"]],
  ["content/world-models/evaluation.mdx", [10040, "00f2f7c08dd17c483e392af02b8652d00632d2e10d9391c30ca5ba5708aceac2"]],
  ["content/rl-sim2real/humanoid-wbc.mdx", [16561, "440994a4a55abc7340b29a4330e3075bd213a88a35c175ca6d5b37dae817db77"]],
  ["content/world-models/jepa.mdx", [13007, "7c7705bde52de9a041989e412bf8fcc06c7f68dd5b878995b7b23500a087e756"]],
  ["content/rl-sim2real/why-rl-locomotion.mdx", [8282, "829914d16b1f579deda3811ceb6c42ca3989a4f815679f3eb46d55ee8ec2c83b"]],
  ["content/frontier/bear-case.mdx", [10564, "dfabc1151aa24a1691fddb3dda758b7d88e07f89fbccd045540df5155991ca0e"]],
  ["content/classical/ros2-for-ml-engineers.mdx", [9530, "47c7e229338a79b40f753ae864aff906899411749401afe1902c61a6fa96a2b9"]],
  ["content/manipulation/vla-models.mdx", [13548, "c6ffbee61fb64c01c84b71938e29c866e9459accd5f819b783c4b4cfb70f6d06"]],
  ["content/manipulation/rl-finetuning.mdx", [18605, "796c2920423d9e9e4c20c5be3ebcb83ba1f4c3438e1384ec547a507c096ab50b"]],
  ["content/rl-sim2real/rl-for-robotics.mdx", [12825, "aa5bd77a3c95644759acb7a10980da377d59df4e2f32633630a81eaa92baad32"]],
  ["content/classical/calibration.mdx", [9223, "8d685e1b8133da532c15e0e6b201ce6703168af5b4a84aac1e063cd64b1cf34e"]],
  ["content/manipulation/pi-line.mdx", [12949, "caee533e6c64e353bddda8cda70cc6f695efa74b553a949b647aed8db947cdfc"]],
  ["content/adjacent/space.mdx", [15543, "b6ce26678b4ba12d69da0ff25baf1128652ca15488980c0c490814f2ec7c7224"]],
  ["content/frontier/dexterity.mdx", [20094, "b401791e9577561a1f74da87d4b87b73e0a869738a7b1090efaeeb0c89271d79"]],
  ["content/manipulation/knowledge-insulation.mdx", [8843, "0c2e9d29220d80ff934e59dd05e36c6557de6ffe0ce79e29dc30d0bfa0395432"]],
  ["content/manipulation/robot-learning-roadmap.mdx", [9166, "6f169cb2355911e185b3e317b39886ea36ffb4f285e6188d43d367c0ef273390"]],
  ["content/manipulation/realtime-execution.mdx", [10661, "48c5609a05fa73c6bea9075849bfc9586e1a61fa23366d8c8ac10bd1d01fe38b"]],
  ["content/world-models/model-based-robot-learning.mdx", [11425, "24bc8a677eb4172cbcd7f4c7ef16ce60529a2588799ea73d8f1360ef2426db79"]],
  ["content/adjacent/autonomous-vehicles.mdx", [23347, "518f294199f5511d0dd3cebd915b2da2a07082724507ca5a914f3fa677747e68"]],
  ["content/classical/kinematics.mdx", [11481, "3b4ee0c078ab98e3ad9a846fcf24da3156f8e1e7508f6a0906cf0621675d9318"]],
  ["content/manipulation/comparison-matrix.mdx", [9053, "0d0cae36325c4e862b8cfbc5b47fc45d4b0daa1a67be6e88df4aaea220b531a1"]],
  ["content/world-models/latent-dynamics.mdx", [11729, "b45af94e344cf38cbde233516b63554f51b681fbe349d1714e794e1a5d6f0d4d"]],
  ["content/data-hardware/industrial-deployment.mdx", [18563, "7edef407d815f9bd51872c7996534cfecef630ebce111ca05d9cc7394da5f9e7"]],
  ["content/frontier/competing-theses.mdx", [14568, "50e149931ec94982f4247407dc43383fa9171c847727e8d254553daa95ef87d3"]],
  ["content/manipulation/cross-embodiment.mdx", [10739, "1c2648125ec65f08d5f29813b23f4daf1f20fdde09ebcd5c965bb73061e4995d"]],
  ["content/manipulation/generalist-policies.mdx", [11758, "7c294a4fc23083a1c1164a2b865918e1d0d30944c010bf7c16e71f0aeee915ed"]],
  ["content/data-hardware/robot-learning-stack.mdx", [11763, "19169d87180da1f0f1608ef3419b2b50d822cdd36c470b6ca420d4460f2f06a5"]],
  ["content/frontier/generalization.mdx", [15765, "820f0c4e6fea722906a680031fd38ae67e59d4776e957dfb65a2f651643739cb"]],
  ["content/manipulation/action-chunking.mdx", [10800, "54cb894db17ba21895e01ffecd363464078a057dda106f57ca56833383610c80"]],
  ["content/adjacent/drones.mdx", [15232, "4157f81f3fb436335a88e624f9ee8b53640f50f7f92a9ea188fcea2de0c8f117"]],
  ["content/classical/control.mdx", [18082, "dc9892e590fbf96f24062787028402697d7d0f88f1047f540cb49761af0236a5"]],
  ["content/classical/scene-representation.mdx", [19908, "fb8ae437985c6497bb4304019f6d3e48c32ef4a3649eb981cc3997c244cf1b37"]],
  ["content/classical/state-estimation.mdx", [16478, "2cec8396c06b2fa8b388a10b7ee9ad75e0306e0281ae630d402380a20e39c4d0"]],
  ["content/data-hardware/datasets.mdx", [14169, "38947211e8c73fdde748bc056a7926237608364d4fd223052721bd4aea7b1705"]],
  ["content/world-models/world-models-vs-simulators.mdx", [12025, "ee3425754709b4ef8e239e23eb32bc25067d2fffe91c5ab7ce281ab310efb4e4"]],
  ["content/classical/grasp-planning.mdx", [14267, "e31ca11bdf2aa7a3cc943a1b5aa0c226ed1326aa97a3d209c3156abd5c0de3a0"]],
  ["components/interactive/av-safety-miles.tsx", [11080, "b7e26d0b022251e54c5dfccc3ececdedf2b096c00b751a71bcd81f366152ea0e"]],
  ["components/interactive/deployment-dashboard.tsx", [15666, "c1a4ccd9b3c23b5f26b2a4483713451304f2049d3fdc1fdaeebdc7b73b17ce60"]],
  ["components/interactive/deployment-economics.tsx", [25501, "f25e72292f4825c0a85dd1cced7f1ae55a52b4c3fc2da163a34d4abed4984d9a"]],
  ["components/interactive/drone-champions-timeline.tsx", [8045, "733c208a266c18506550b0d998fc1c98b438db83e103496846058eb02f31d437"]],
  ["components/interactive/expo-ft-results.tsx", [12526, "a9f450ef3b0fe2c72ace349368698a0e23fe05d0fa9936a0213ef1ebd980e8e4"]],
  ["components/interactive/funding-humanoid-counts.tsx", [12801, "372e51e7f1f7cf1b41b0cfe794acf5ae65148f15bb6594edca8fcb5f2e9032c4"]],
  ["components/interactive/loop-closure.tsx", [12262, "a87f6a28e184114107307cf692435a39eeb61e6f014f7ca18e9a349c85c4c69c"]],
  ["components/interactive/mpc-vs-rl.tsx", [13367, "ec0e3e28ec477cf0865bf283c5d43e8570bbe6f98aae39b9f976a075ea757285"]],
  ["components/interactive/planner-exploit.tsx", [11328, "b98ed68ea950d3be8d7d00d37dab0c48037182cc774191c5ba16b7c15d7d8fc4"]],
  ["components/interactive/space-latency-ladder.tsx", [9400, "ca9c5db080fc27302baf976d99992bc7a7c5abc8d8ad00be6c6eb80badf19421"]],
  ["components/interactive/surgical-autonomy-ladder.tsx", [9131, "5baca884422b3a472b293ef09ecd5ec0180bd7171dfc15980e24a23a38b84c16"]],
  ["components/interactive/wbc-decomposition.tsx", [14640, "af247fe2fa955473f22c71af23c008289aff6e92d4eab760849685ec631ff30c"]],
  ["components/interactive/wm-disambiguator.tsx", [22805, "0017ca3b137bd04d3bb6f432e982ce3b1ec0e39575a2d2ebe60038223ee04106"]],
  ["components/interactive/world-model-evaluation-ladder.tsx", [5079, "5cc010c6a44c7be024a6ce26128cfdf9bd622f676225a92d7a5b63744b9ee9eb"]],
  ["components/interactive/world-model-output-times.tsx", [6950, "355303381881ed5fbe8c2074f7bdfe805dd3e13e0692f8321cf260bbb5c3823a"]],
  ["tests/component/av-safety-miles.test.tsx", [9214, "9c96a4168a10feba31d30e49151199fe923fb4c8124e292bdefd1482b68ccb32"]],
  ["tests/component/chunk-buffer.test.tsx", [13251, "0b10f9eb068fb8921107e23dcba009f746dc7a313c4fc5314ac6fdc2d64c0daa"]],
  ["tests/component/comparison-matrix.test.tsx", [13480, "788681218281affcb5bb9e04da4926a2ced2d4babc4f7ac52d07375727490478"]],
  ["tests/component/compounding-error.test.tsx", [14883, "00c9ccee82b3df1c9f8e131785724e9312fcd07b13a0622cd6b3ff8cae2cea72"]],
  ["tests/component/control-loop-budget.test.tsx", [9870, "d23d5c2423ff2f5a5c746336d76fa5869c90b8153c6ce70054eb8df1a07dee6d"]],
  ["tests/component/cross-embodiment-strategies.test.tsx", [9678, "9bb96f8ac78b7e3c7a78f4108420671e3be4ce0b2c6236eaa4429bf152829337"]],
  ["tests/component/excavator-practice.test.tsx", [9147, "b3cd9fcec8483a6f2cc045c05fd4fd712cea96697c6954d1e24d714990cb101d"]],
  ["tests/component/expo-ft-results.test.tsx", [3129, "00d61330bb854090739b5dc4852a994fdb313c8052b4c848ff0c916f149e825a"]],
  ["tests/component/hand-eye-poses.test.tsx", [8087, "917fc877a6f3a9f15260ee775aa50969f3b6dda3d574791909178ca394a69f84"]],
  ["tests/component/hardware-price-ladder.test.tsx", [6591, "12401c49973d8167761d79c4c6d64827daae2391ba7520d9086ebc4a840c21f6"]],
  ["tests/component/humanoid-pick-height.test.tsx", [3909, "b41219b2f5a508acc9748308299d6876ffa7ce02f4d4ebb72f486aed9efb8d48"]],
  ["tests/component/impedance-contact-lab.test.tsx", [19099, "91798e8cf58903839626be7474190659363ad5817a61ce29c1d3a4f5f81dd030"]],
  ["tests/component/impedance-press.test.tsx", [52335, "f340dbbd88adb167fafe3a21cad6f5193d26f660ffd43d998f3fc3263f7e1aa1"]],
  ["tests/component/jepa-planning.test.tsx", [12328, "ee72bcaaab18e12d189899d5c34342f7c492c7bb607f76ea5a41a59cf6c32d5c"]],
  ["tests/component/loop-closure.test.tsx", [6312, "3a58bfa7290a71eec80bc8923ec08baaef8012cd4fda8e3db718f558a7f2083d"]],
  ["tests/component/mot-insulation.test.tsx", [17564, "b20e25660c8d5bc9fa43d523d1ebf58795470adb72e367289c85c7de517ac757"]],
  ["tests/component/mpc-vs-rl.test.tsx", [8473, "b9e7e31fdbd82dd519ffb6549c1f9171696675e1c02e06d961686145a925b6e1"]],
  ["tests/component/offline-value-overreach.test.tsx", [7422, "927dca7cc22ddb86845eecf1799228f7989c2e082135319d5fdd00ff7bca3e96"]],
  ["tests/component/planar-fk-arm.test.tsx", [15238, "ddfd8447c001409aa611572f66b99c6759701675b1c34dac72b9bd89e902e553"]],
  ["tests/component/qos-queue-age.test.tsx", [6358, "b2de973426caefa1fb59e9fdd357fcead5f2063b918ecb66b32c8a077e7fa8d2"]],
  ["tests/component/real-robot-rl-gains.test.tsx", [4107, "8dab03177111043fa9f5ce9c74b65aa04fb773a522c16a70759ed67ae2bd2b69"]],
  ["tests/component/retargeting-gap.test.tsx", [6515, "0ab710564aa87728d72537f8af6e9c46977b20d3c54d6ae3255fb4f2ad677217"]],
  ["tests/component/safety-rules-timeline.test.tsx", [8348, "bf9cb562621285b907f80c0f8e2087030a27de123a88a68afad2bf48b9d49ac7"]],
  ["tests/component/scene-representation-ladder.test.tsx", [14207, "5adb6d1cae52449b2ee2c77cfaf99f939e28e956aa150cc1fbc3a2b0557bc0c1"]],
  ["tests/component/space-latency-ladder.test.tsx", [6875, "943de8cb9c539767b8edd3351bf3f897ccf09a325bb197cab363e5fcf3857984"]],
  ["tests/component/surgical-autonomy-ladder.test.tsx", [7066, "70c2a77a51e0c20430b7f6341702f044e9a05f01e5cc80bb341d1327b17eea6d"]],
  ["tests/component/teacher-student.test.tsx", [7211, "8e650126cdfa50295e44bce238af79323996500fea7f4e7055d742ba1e15a36d"]],
  ["tests/component/trajectory-stitching.test.tsx", [6957, "80ec8f4cbc5bad41ffe066f7ad4924954b8c914e59b852f56191bdb6530b8220"]],
  ["tests/component/umi-collection-rates.test.tsx", [4160, "054c1f4916c062f9434ca9642b6682c775655128229fc9019dcfe628b0a061ac"]],
  ["tests/component/wm-disambiguator.test.tsx", [9543, "76b6fa6e9f0c35c17527fd7e328c0a45e663b408167bc6e1ff0f0dfd744b93b3"]],
  ["tests/component/world-model-owed-figures.test.tsx", [9405, "d0e9526e5bfaa7bdb4883de454eccbee5f99f33a0fc157dff411649fa69da380"]],
  ["tests/e2e/parallel-sim-rl.spec.ts", [4849, "6e7367fc7d83ee41900c4fa96f064036d2b4b7e4260ca2e093c2e1aed63a69ca"]],
  ["tests/e2e/wm-taxonomy.spec.ts", [6550, "ce5f2c2fecb2da0f89f518d38699d8b4b0c2de27046ed4b989cd439ec074796e"]],
  ["tests/e2e/motion-world-models.spec.ts", [15361, "889fde3834199a4ba479ad923fb5a75e9cf26bf6afe6e462350d79a036a3cb24"]],
  ["tests/e2e/space.spec.ts", [12293, "80b0342e41a8e1b8c6d56248d09ea8ae8f978086fe39bcd4c07c508aa59e0d62"]],
  ["tests/e2e/surgical.spec.ts", [9294, "9e92fb1d1ce5cdd2b793fcaef64fd480e00fb74aa8b5fd4723b0fff1a81434ec"]],
  ["tests/e2e/control.spec.ts", [29672, "ee5ae6c3b4bcee89f97b207049cf13b694659dac6dd968a6b6bf4cde71bed298"]],
  ["tests/e2e/newton-engine-source-audit.spec.ts", [9322, "da0cd7c12b257e7754110dce9fe49d22f27cc40b8c7699f81d5829d027e7b570"]],
  ["tests/e2e/dexterity.spec.ts", [13495, "6e3d7c97a1823246efbb3af1728afb2d682f79b0d1fac8b79b3216dbd60ad134"]],
  ["tests/e2e/dexterity-brooks-remaining-readers.spec.ts", [8214, "2179fe12ef124558b7a7c27651e11ff2dffb50f297929f49b5c11a8f2ba4d5f1"]],
  ["tests/e2e/economics-local-evidence.spec.ts", [7547, "07350a2891231e3534ec4decd3d88ec2604e47d8e28493a34bdb0967fc8edf1b"]],
  ["tests/e2e/economics-release-evidence.spec.ts", [7790, "de594927ebcdf51a4dc23a9ef6deef037f2b1a5945475409fe6a8c98f4c57f76"]],
  ["tests/e2e/legged-locomotion.spec.ts", [8673, "e50b45ba6928d3b1d4e39796c8837fd3eee9b65e439c07797de0ed51acc0dddf"]],
  ["tests/e2e/generative-video.spec.ts", [13273, "b0dcce643099b45cbe1c471b30e99ceda2ecd93b2f4fb8c079138b33c4fd1f35"]],
  ["tests/e2e/humanoid-motion-transfer.spec.ts", [12040, "33e1d1a764ce83ca68196f4dd155379b3e7c9346e9c88f5e1ea6e26523f7ce15"]],
  ["tests/e2e/insulation-fast-dreamer-integration.spec.ts", [6737, "90dbe9b50b218338bd9db4058775689368e740529afbf01b897f4cc416be5c46"]],
  ["tests/e2e/ifr-industrial-originals.spec.ts", [11731, "b518314b3a1b3d3e5ab2878c3a5fa48565c4dd91018717d9abf5c9372e1d1fd0"]],
  ["tests/e2e/motion-three-reader-closeout.spec.ts", [13068, "d83c377e3c0dad1a7235d515ef16142bb31d0cc4ed79eecb84e523b6611441ee"]],
  ["tests/e2e/pi-helix-theses-readers.spec.ts", [5391, "4dcf98fce9377531b19ba70755dfeaf2aac2536eb37138b4f910e040b8a121f5"]],
  ["tests/e2e/dexterity-holson-outlook-readers.spec.ts", [8538, "ac4a5d4157e8dfe74e0f0bbe59cc8d73e5d3bf95ddbb7cbde377e3b262d5e8db"]],
  ["tests/component/receding-horizon.test.tsx", [13130, "3997ceff60f5d543e5429aabe8b1f1e6de549b7b1cea431201b05ca8ea86e1a7"]],
  ["tests/unit/explainer-mounts.test.ts", [7338, "352cfcae79ef42ce39c4a4f369fda5eb81e98e21558225c615d698c88a370ff9"]],
  ["content/manipulation/diffusion-policy.mdx", [10003, "f6d8a64c6f81be604a6f69103724aead9c7feeb21bed4013a2b17f541d0c4baa"]],
  ["content/manipulation/action-spaces.mdx", [9931, "584545ac50070321f2449efcc93e9e1d4544d09298c84aa4a09215701fe22911"]],
  ["content/rl-sim2real/sim2real-transfer.mdx", [16147, "4076b790261d7ca89859e3224f7f5e942a6374c596ab2a9b95afa595c5d964a4"]],
  ["content/rl-sim2real/reward-design-mpc.mdx", [14816, "42b71f7202a6b933c69a9c224b5c98cb52814ef3e8b19f60633fc65f0deb4165"]],
  ["content/data-hardware/teleop-rigs.mdx", [12722, "d0aac5e4b436be68abdb583d4c099266c3318eae4499f49e4f4475f54480f3f3"]],
  ["content/frontier/reliability-gap.mdx", [11265, "6f51404ffc6c0bbbaa3a1ddd04d7c14192d7783b7d30e25ed2d8576f914268da"]],
  ["content/frontier/safety-and-assurance.mdx", [20480, "1f8c6102bbb5df69ac98a77e7960996fe7932957cca5602adc7e3cec21646b31"]],
  ["tests/component/dataset-runs-hours.test.tsx", [5495, "64b6227c6011fd5d88974c413f44ebebbc62d625741913d502cd401f7c330b43"]],
  ["tests/component/demo-or-sim.test.tsx", [4258, "d1c7bb3976c229d3631edae527fce6a26a85be94ddfbc2592250437b51612bb0"]],
  ["tests/component/drone-champions-timeline.test.tsx", [6426, "736d931630d8eb50518c3aa05610f52ca3874e533b90198d0446fbd057924e51"]],
  ["tests/component/funding-humanoid-counts.test.tsx", [7420, "b09e8f427e408312bbe6e65198da5afc33a4820f89223278dadc70b30afc45da"]],
  ["tests/component/linearization-gap.test.tsx", [6207, "537f80f2b99073c0131302118725c78baefddd1ca1cfd59330158359495c5ddc"]],
  ["tests/component/milestones-watchlist.test.tsx", [8658, "8501061132c75d2264dc85726e7e6eb423c92492331bc565336f597b56f104df"]],
  ["tests/component/planner-exploit.test.tsx", [6325, "d0b0716c3d5d1551b6ec8fd098db7bf172dfc34726c0b73f290f8fe6bcd2796b"]],
  ["tests/component/thesis-explorer.test.tsx", [7796, "278b50c95499fa1337565022adc8d79279315c5e8c5c8708f143baf94526a0e7"]],
  ["tests/e2e/safety-and-assurance.spec.ts", [28804, "5fc5166ee4cac928f68478c9ada17e3220bceec5813f94339ccd9e8eea88b734"]],
  ["tests/component/safety-filter-fence.test.tsx", [10728, "f82fccf900e8db471682b25887f8026ff1f4e34fcb286a3e698e284ce9392b63"]],
  ["tests/component/flow-matching-trajectory.test.tsx", [15780, "9d62687f5c401f8c8b6ed7d10f52155c209a981e572a43546dfe5f3ea53c3c76"]],
  ["tests/component/latency-comparison.test.tsx", [11392, "9bf96782bc4c07fed3defa5f0cc54a302dd38b487af2eaddc7c91779df9092ea"]],
  ["lib/brand-v2-focus-paint.ts", [6147, "2f1a22edb71202a1e6a81f02902e2e2f95c7ebc915c5c3279f71ab746e189822"]],
  ["tests/unit/brand-v2-focus-paint.test.ts", [5893, "f95a4ea68df434396602f2356ac0c7e185da923a74cafab3337dc768d5e9d1ee"]],
  ["tests/e2e/brand-v2-focus-paint.spec.ts", [28833, "b8f043c5bbefbe824ecc787a2b658a1a847948e00bafa679e067adcf1608d7c0"]],
  ["components/ui/stat.tsx", [2898, "f2e70ec89084e8f7e3896e9f7475ccec7da07000fe14675ac350b1438caffee4"]],
  ["tests/component/pi-generation-timeline.test.tsx", [8548, "3a6aedc8e151023c07e2b231370329fdda461a4cc518a45a7ca2e30dc101c4c1"]],
  ["tests/e2e/brand-v2-reflow-320-200.spec.ts", [124914, "6deab75556e21a36c135baf1ba16c17559a638acd76efcfd5c879c97fd78123f"]],
  ["lib/reading-time.ts", [25319, "949d7b0d3323b9568bc28f115b57a897b891798cab2286b90ec6f4f0ceeedda8"]],
  ["tests/unit/reading-time.test.ts", [19766, "040b00ec5195b8ecf19aa2d53a270f1258ccd644f1cc5ec3cd6015a91a7e209e"]],
  ["content/data-hardware/hardware-taxonomy.mdx", [13198, "dd5573e04a5c35bc0bc23924e055b988c658eabec9059f2b2cf7770b16b19b31"]],
]);
// END shared UI repair pins

function apply(text: string, edits: readonly (readonly [string, string])[]): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(drift);
    result = parts.join(to);
  }
  return result;
}
export function verifyUiRepairSource(source: UiRepairSource, live: Buffer): Buffer {
  if (source.after.path !== source.before.path || !/^[a-f0-9]{40}$/.test(source.archivedFrom) || source.reason.length < 100 ||
    !source.preserved.length || !source.checks.length || source.checks.some((path) => !path.startsWith('tests/')) ||
    live.length !== source.after.bytes || sha(live) !== source.after.sha256 || !source.edits.length ||
    source.edits.some((e) => !e.before || !e.after || e.before === e.after)) throw new Error(drift);
  const prior = Buffer.from(apply(live.toString(), source.edits.map((e) => [e.after, e.before] as const).reverse()));
  if (prior.length !== source.before.bytes || sha(prior) !== source.before.sha256 ||
    apply(prior.toString(), source.edits.map((e) => [e.before, e.after] as const)) !== live.toString() ||
    source.preserved.some((text) => !prior.includes(text) || !live.includes(text))) throw new Error(drift);
  if (source.after.path.startsWith('content/')) {
    const before = prior.toString(), after = live.toString();
    const kept = (text: string) => [
      ...text.matchAll(/<\/?[A-Za-z][^>]*>/g),
      ...text.matchAll(/```[\s\S]*?```|`[^`\n]*`/g),
      ...text.matchAll(/(?<!\\)\$\$[\s\S]*?\$\$|(?<!\\)\$[^$\n]+\$/g),
    ].map(match => match[0]);
    const blocks = (text: string) => text.split('\n').map(line => {
      if (!line.trim()) return line;
      const marker = line.match(/^\s*(?:#{1,6} |[-*+] |\d+[.)] |> |```|~~~|\|)/)?.[0];
      return marker ?? 'text';
    });
    if (!keepsWordBudgetTrimObligations(source.after.path, before, after) ||
      JSON.stringify(kept(before)) !== JSON.stringify(kept(after)) ||
      JSON.stringify(blocks(before)) !== JSON.stringify(blocks(after))) throw new Error(drift);
  }
  return prior;
}
const cache = new Map<string, Buffer>();
export function uiRepairPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pin = successors.get(ref.path);
  if (!pin || live.length !== pin[0] || sha(live) !== pin[1] || (ref.bytes === live.length && ref.sha256 === pin[1])) return live;
  const bytes = readFileSync(join(root, UI_REPAIR_REVIEW_FILE));
  if (bytes.length !== reviewPin.bytes || sha(bytes) !== reviewPin.sha256) throw new Error(drift);
  const key = `${root}\0${ref.path}\0${sha(bytes)}`;
  let prior = cache.get(key);
  if (!prior) {
    const review = JSON.parse(bytes.toString()) as UiRepairReview;
    if (review.schemaVersion !== 'shared-ui-repair-continuity-v1' || !review.reviewedBy ||
      !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now() ||
      review.sources.length !== successors.size || new Set(review.sources.map((s) => s.after.path)).size !== successors.size ||
      review.sources.some((s) => JSON.stringify(successors.get(s.after.path)) !== JSON.stringify([s.after.bytes, s.after.sha256]))) throw new Error(drift);
    prior = verifyUiRepairSource(review.sources.find((s) => s.after.path === ref.path)!, live);
    cache.set(key, prior);
  }
  return Buffer.from(prior);
}
