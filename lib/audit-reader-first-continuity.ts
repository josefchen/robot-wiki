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
const reviewPin = { bytes: 979048, sha256: '326426d1d3bb20ec85edfc631d97bdd8831865751e42965a4a0f759fafbf08b1' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['app/globals.css', [22557, '16282239a80c8430852f8e2704be42eca775dd303dfe4d4488aac7e8f95b2093']],
  ['components/interactive/action-conditioning.tsx', [14084, '22a08e6ec3ac15cc96fce39547b65584762f4a4a3c4227dbea1ae5c953e4c722']],
  ['components/interactive/appearance-physics-push.tsx', [15252, '4e65a8f591c8d0b4284539757a5254a90260789c21d3baca3ad494904ff3980e']],
  ['components/interactive/collaborative-operation-modes.tsx', [25387, '4692a21269e9eb95ce397dc9e7081513fa8b82a67d84f020e7956fa5570baaa0']],
  ['components/interactive/data-scale-chart.tsx', [27035, '589e7d8959d024f10369abc2372ec12b2dafd580d773483fa34dec100d931ab1']],
  ['components/interactive/deployment-dashboard.tsx', [15602, '0e005621dfd87961b5eb0f983ae3f36cead37c027507ef1f3124c28b498035f3']],
  ['components/interactive/deployment-economics.tsx', [24383, 'c0b4529dbbd32ef3339512781869d4973715d9dd380d9e22f13268a21faed077']],
  ['components/interactive/egoscale-scaling.tsx', [27149, '479b378d3741841069f42d5b2769dbc483ed8cb1eb0e9499743641d6f0b58fe8']],
  ['components/interactive/hand-comparison.tsx', [16488, '3b2c3d9308e0bd0baef0a65303752664ebdd92f7e560312aaf00c57a3a95f2b2']],
  ['components/interactive/jepa-planning.tsx', [22427, 'd704fd6bfdf648676495355f9ba8ad8a670bca6ecf2c6ea958cc26fe812826a4']],
  ['components/interactive/latent-imagination.tsx', [20313, '109246120dd9fa8b512fd69d27012e0283231861dd4fa75ac0b457c05a030367']],
  ['components/interactive/milestones-watchlist.tsx', [16141, '81aae07a0d8e73f9aa9761314e435460d6a544226689bf8a1f7c8335057ff88f']],
  ['components/interactive/perception-latency.tsx', [15260, '6f4270266f91b4c9f78e44358977a60200e02143a212f6438c74858672a9b202']],
  ['components/interactive/reliability-compounding.tsx', [19076, 'b07a31b6b8b2156598fe9d2e90473578e472245b123a97c75ed4863b953db2bd']],
  ['components/interactive/scene-representation-ladder.tsx', [26935, '752799f70e34203e86cf13dfea7fc5bcaafb007769e8e54656516df21c53ff84']],
  ['components/interactive/thesis-explorer.tsx', [16923, 'c5ab42ae55a0d684f5bde5c6a9d665eebfeac751cfbdfac2b674f7033a4bb5d7']],
  ['components/interactive/wm-disambiguator.tsx', [23709, 'c83efae307bec54faf8c190d4c4745a7c7f8b1538c6a8ec0f14408f14316ab09']],
  ['components/motion/chart/chart-marks.tsx', [6820, '0fe3b378f8693b576137b44c9ce1a7c221ace4ffc1d16c0fcb22bd07b1b7af28']],
  ['components/motion/figure-frame.tsx', [11868, 'daadde02a1cbc942cdc83adf2e79671325641217835b17aab2b2b5ad127eb149']],
  ['components/motion/motion-tokens.css', [2185, '1bad785920b500c5e7b866f2c31f7aae5666ed4d586beac132a01f42dcdc1a7c']],
  ['components/motion/scene-chrome.tsx', [3578, 'eb62ef63dc05b3d92f38c6df6d7dd24c484e1008057c4d9d9f1cc5dd483e3aef']],
  ['components/motion/scene-mount.tsx', [6207, '51a05c141a731394365b2c94e514d71c1b11fa58fd8190ea58ad28371c2167a2']],
  ['components/motion/scene-player.tsx', [13539, '44b66ab5f7209573de6e0b60d1b800c616a7156fb8cba87d8208c37a932b8568']],
  ['components/motion/scenes/batch-scale.tsx', [6667, 'd40ebee539d2912737de7c9fb22cc7e33fefe4f12aeed365d03699658e5af9b0']],
  ['components/motion/scenes/jam-overhead.tsx', [12974, '8dadaa6843e1ab336c5786206ba844fccca253064fc41320dfa6b944f35185ce']],
  ['components/motion/scenes/sense-avoid.tsx', [13518, 'e18f668521d04e8bd5946508ab9cad990d2d76827fa7873b1e383f3911f001b7']],
  ['components/motion/scenes/tactile-slip.tsx', [9697, '8c3b451df94096363373e3afeb7a8a382b24ad98a9e03d04dfc43d06e95d0c67']],
  ['components/motion/stage.css', [2805, '90ab475a10004c9ce76a7cc16f76eac5b6f80eb416bad03c92d4e25a76827957']],
  ['components/ui/chart-description.tsx', [7860, 'e4b15bd32ef9dd83d63c4a05b593cab3c94d53bc049146f13ee93a545b5beb93']],
  ['components/ui/figure.tsx', [7540, 'a9cb99c0b4cf118556c05c658d7f921dd3538e9a732c50376f77f8edb598f89d']],
  ['components/ui/instrument.tsx', [13794, 'df2863ee49b4e774fab762617ba3853bc659856440876773363694961b37cac1']],
  ['components/ui/stage-status-chip.tsx', [1316, 'bf25270b9a0a9b6223af19ca77876c6c2be6d2bb06c2802b30982ce069388ef2']],
  ['components/ui/surface.tsx', [1094, 'ecd93d3fca25d478c2b862b10678147d91487bbe89888f5fa120b4fa857334a3']],
  ['content/adjacent/drones.mdx', [14500, 'fba99c70b364213f21106c7a3f2b720bdfaf2c0c1a3a5caa4fa968336cbf5a47']],
  ['content/data-hardware/data-bottleneck.mdx', [11662, 'f839db85c0fbdf4513155daf70a40c027ef559adfa75cb79208e4b44e0bb0488']],
  ['content/data-hardware/evaluation-crisis.mdx', [17443, 'c2400bfd1d73e8a74d4b8be0fda765f84da5004e1ce2fa9e3912d8f52784adc7']],
  ['content/data-hardware/industrial-deployment.mdx', [19739, '6ef26dad2b09242e755de200dc04000556ca32006534a87ccd8c7f9f3c30968c']],
  ['content/frontier/bear-case.mdx', [11038, '76effed4c8661a0fdd96e4558a76f1d835ef939cd0bc31a6caa4eec65c952e01']],
  ['content/frontier/competing-theses.mdx', [17758, 'c0f154df479b62f96726bca6deff5796c138b4abd55914c4acae2089c1058a25']],
  ['content/frontier/dexterity.mdx', [17836, '28df457c23f3ddc1724065713e0c127d66a3e07df0a8565c383c1029361586da']],
  ['content/frontier/generalization.mdx', [15297, 'effad5586287f0104cd87ba8022bc7a68b924c40f7fa14d28ab96efc2c4b6387']],
  ['content/frontier/reliability-gap.mdx', [12147, '333221be09b65e776382bd25899f9eb438179cca2b73caf6f5dab0dbf7061dd7']],
  ['content/frontier/safety-and-assurance.mdx', [19760, '04b4c95aeaa5cf9f0ac0cde5817a3a5607cbcb779e4152a89af87f26b7dbbbf5']],
  ['content/manipulation/action-chunking.mdx', [14604, '2f18be8b3212449889cdf7686ce1cdd421485eb61e505eda2c7ad009aedb5fd4']],
  ['content/manipulation/bc-foundations.mdx', [12544, 'f5caa6805465d87144112db590d285a0e76c4fd5c180f834fed5a2d7576162e9']],
  ['content/manipulation/diffusion-policy.mdx', [11244, '3f77042935712a0e73a36ad361e840f17468fc70066482b412f382682173c2de']],
  ['content/manipulation/vla-models.mdx', [16111, '59bae36b6b712eb97992b3a1f129b024480e8c2a8e77bfc330487476deb6c6f8']],
  ['content/world-models/generative-sim.mdx', [14030, 'ae80f03a691201f92bd0de129406474261de856a9d6a30ee83f328cb393c6540']],
  ['content/world-models/generative-video.mdx', [15802, 'ffbb5112460dc80d7607e7790d4b4be3a39e955bc59b87f5b9b630d21ea6e95d']],
  ['content/world-models/jepa.mdx', [13758, '1f1e9fdc0e28dd7d46ad43edef991a2f79d1c99a36362836bb634f2d6ef6abd9']],
  ['content/world-models/latent-dynamics.mdx', [12890, '47b2d2a8316d5ea0646d5435818f0b837972b68b6994ac6e4b7b7d618aa1bfa6']],
  ['content/world-models/taxonomy.mdx', [14674, '1a9759f0cb4b66615c18fe5bc263331ac3e39733f797e259a374250a597c82b6']],
  ['docs/design/motion-language.md', [10710, '02a652700b7ae8b861ab49d9191f8e4afeb937f09dcd3ea04c447143699c3678']],
  ['lib/appearance-physics-push.ts', [5935, 'a72087e6c3e9dd2927b23f3d5528052e2d7566bdd085dd171161026549cf3320']],
  ['lib/brand-v2-figure-evidence.ts', [30841, '009c5f336ccf2290400214d204b32b23887548a345ca92bbc6816c7db18929a0']],
  ['lib/chart-descriptions.ts', [25207, '60069d12c8e0690bd969bdfab02199048e4c0344f3ac656e2701a67e74a7994b']],
  ['lib/figure-system-check.ts', [13863, '841692b9d7c3513cef690188b1e7df639565b3b09164fc78acc154716f8cb2da']],
  ['lib/figure-system-paint.ts', [5408, 'aea5c837e3c35e6328fd0bb54840a5c2be63288219e538e5ade0d7d642192bc8']],
  ['lib/motion-tokens.ts', [4188, '2ce77bbb9e4134da1b3553b5ef243e1c529824989a281ea4c08b6b33b3cfe30a']],
  ['library/design-system.md', [62058, '6217fe7966f588dae087d9d5b50744dcc34865eb7de35e580697570dfec94be2']],
  ['scripts/brand-v2-census.ts', [47892, '5ce99d42c4444e2ad82b60ed52c8037a11309259c7a6c28388194a9ae513c576']],
  ['scripts/brand-v2-enforcement.ts', [181456, '59740789bdf69cff4a73db5f374b4992a7b0e4958388556d9dd8fe7bae91a478']],
  ['scripts/generate-motion-tokens.ts', [15352, '9bc9e95ac64a10e5aafed1ab722b17afb33950820901bc3285038115e23cd82f']],
  ['scripts/motion/motion_theme.py', [2394, '70f540f422b5f2b466339488b22f091504c44b440e50ed14f6c71f7e40e31463']],
  ['scripts/plant-figure-system.ts', [7617, '154dcd9f14add37c9abed7191e84d056a74ed4a756f4189dae0f6960a6895b6d']],
  ['tests/component/action-conditioning.test.tsx', [6576, '1eb2e9b9a735487ae52b564412861f07817b5aa53d567cfa83986a1d5adba36d']],
  ['tests/component/appearance-physics-push.test.tsx', [6847, '6bfbc22c1f9cc001d0114515d3c98bc10fb161b745e77e86cc865bdbc112114f']],
  ['tests/component/chart-primitives.test.tsx', [6661, '06feb4ed25afc3f3ee38e08bf5d76de3e22a71f7bef9320cb987a98feeb5b3a4']],
  ['tests/component/chart-state-descriptions.test.tsx', [19455, 'ef1fe043e072f66df5c99ee114cfde02b9751638fe4d23310c979336cb1ac748']],
  ['tests/component/collaborative-operation-modes.test.tsx', [9511, '1fb9bbdfbdf923c9510af1cbdb18453cc1deed6e7d5ca9cbd36bb4f40b9bea88']],
  ['tests/component/data-scale-chart.test.tsx', [8929, '226c4e5e053bf62161919b170ea24036f91ad01d4dc1ef452ff6f1a60b4bb688']],
  ['tests/component/egoscale-scaling.test.tsx', [9578, 'ab09fc12b101d882dcafa4a250e580c7bab03fec71663da59baf6cb1870f6bf1']],
  ['tests/component/hand-comparison.test.tsx', [10121, '017cd2176a183a717dd103c0fc98076d3f89157f326a5cda2ea0828eda0d1a10']],
  ['tests/component/image-figure.test.tsx', [9257, 'afda226aa6fac0e43344eb7a46ce18544ecd5b4954b288e3a2e51a24c8e5ecbc']],
  ['tests/component/jepa-planning.test.tsx', [7471, '29b9da1e9d428a7d9ef6aa33bf12ebedb1f4f121b7651c2f0c732141801bf86b']],
  ['tests/component/latent-imagination.test.tsx', [6491, 'd3515043e7bd07194832e04d3b930ad0a03c568d781d4574c9e0fd73439b6ae4']],
  ['tests/component/milestones-watchlist.test.tsx', [8219, 'e335596d8dd037321f7adbbae1aded63fd706f2849a068bec0e829dd61ba03e7']],
  ['tests/component/perception-latency.test.tsx', [6200, '1f49e6eb68701f4f6ab21d5d8ff4a19863c67a2e97a94b3ef4ece70f887e7595']],
  ['tests/component/thesis-explorer.test.tsx', [7672, '9d9b7d792078c8e31522d326e0393defa5b4621c0a1ed841c03d786d70fdd621']],
  ['tests/component/ui/brand-v2-primitives.test.tsx', [5771, 'c45483aac01802b620444f681ba6b4218967b3afb71411a213532a092ba5539d']],
  ['tests/component/wm-disambiguator.test.tsx', [9527, '7736ae8871e1a50756e6f0277ccc6f3cc0452221f6ae2b8431409e2d6aaf3b20']],
  ['tests/e2e/bc-foundations.spec.ts', [4392, 'b351f5f97799f14331cd6b26112546193dcb53f10f453f74aef161f56b720661']],
  ['tests/e2e/bear-case.spec.ts', [12124, 'cd87d6c153033de4616ececc82620a207196e7ad1a991a07d45d922985c97919']],
  ['tests/e2e/brand-v2-figures.spec.ts', [10556, 'fbae3d209cf5b933244b5a7da42d1391abbf814f71ca65ffd4208befc6fdefa3']],
  ['tests/e2e/brooks-theses-readers.spec.ts', [8452, '3f08eb90f251b5dc189d2854e6400421706d672b5d346a21e7654bea9106b79b']],
  ['tests/e2e/chart-coverage-sweep.spec.ts', [12272, '0b05cc763dbc74fb1e31ad53c7bcfce17b3d4001b540129e6d7e85fa5e6b1c35']],
  ['tests/e2e/chart-description-registry.spec.ts', [6569, '458e4b53e02328a4f47069cf4057a3f98c1855acf5b88b3ebe3ae9a450e19781']],
  ['tests/e2e/chart-descriptions.spec.ts', [15631, 'cf7bef55840efb26cd020e5334e6c0a1f563be93ecdc3d69090bda428811933f']],
  ['tests/e2e/chart-state-descriptions.spec.ts', [24252, '4734b6a910bef93f68bacd584f5434cf1c291c660167a74dfb437db8b6b94c8a']],
  ['tests/e2e/competing-theses.spec.ts', [9790, '42020e2d5dfb33bab2959e059998b9d79592453d522f6b9482e562b588682ed9']],
  ['tests/e2e/data-bottleneck.spec.ts', [7808, '460ee543aab6bc7e6064425f80fc98db2068a9ba8ee08b076fb120335f5934df']],
  ['tests/e2e/dexterity.spec.ts', [13239, '67696d58645a36946d2ca3b71f5aacac3dc58394696688333760060aa8f111c4']],
  ['tests/e2e/drones.spec.ts', [8481, '2eabafccd68f8a97c0c53a57e480fd6807d9ec96a3df784d08edb75483dd147f']],
  ['tests/e2e/economics-local-evidence.spec.ts', [7280, 'c5b734e45e0824af19e8839b2940128f4a3dee682bb1bb99241f7f06ca03738b']],
  ['tests/e2e/economics-release-evidence.spec.ts', [7357, 'deabf8219a2c4f76d8ffafa3234ea9659de572e267fad4d3772f824cae73dced']],
  ['tests/e2e/evaluation-benchmark-readers.spec.ts', [11034, 'ce4b4f418fcab100400bbed17cd7684d31f9be42f7f70a86315bac454954abad']],
  ['tests/e2e/evaluation-crisis.spec.ts', [11559, 'a642f6e455e338ecc79cb7eb157609647acf325230e6965acafe29a24555bfbe']],
  ['tests/e2e/evaluation-statistics-originals.spec.ts', [12595, 'cd7e4830d1a6a505bfefdc72be04d3c6ab4a1bc5ae4b944a6eda86bb49b503d3']],
  ['tests/e2e/figure-light-stage.spec.ts', [6136, 'aac59bfa7d5c66866984c1d1046ce0398d1958be6216a316325bda311d7f4bf5']],
  ['tests/e2e/final-seven-closure-evidence.spec.ts', [7546, '353f87fe73ff8c3336a224b90c772f5efb06f75636ea7024825cd0fc80e712b3']],
  ['tests/e2e/generalization.spec.ts', [9850, '9c9f69678708b07bbeb1f8fe53ba4a89e3f6bc82bb7dc369e8d681a01e7adae2']],
  ['tests/e2e/generative-sim.spec.ts', [11037, 'd609803c5492f2a232f227093a99074ae1573c0d14f830b16c34fe0357eda386']],
  ['tests/e2e/generative-video.spec.ts', [13500, '55cee0ae37aa8578d457ecdba2d5b2707fb795314ffba6d234749e2c38875f29']],
  ['tests/e2e/helpers/figure-light-stage.ts', [9812, '01df856c192d4c742e2355936c7428537b35949cf2eabc8ece245f9d64d0161d']],
  ['tests/e2e/imagery.spec.ts', [15626, '8a3d7ecab83b0397769276d1d5fa3e3ac3251bd45c486a59339c63d38cd51069']],
  ['tests/e2e/industrial-citation-refresh.spec.ts', [7931, '781e75c8110b6f4bd938f76348b1c676e49a3eaea1f52e848cc789f171ac5808']],
  ['tests/e2e/industrial-cost-reader.spec.ts', [13574, '6cd847c0e415d2e06f48ee16a27656559a92218b09b128471f11e08bbf05820f']],
  ['tests/e2e/industrial-deployment.spec.ts', [20621, '10d84964579f2cf6e4a0527bc278d69d84230ec4f015241d0c15358be0428726']],
  ['tests/e2e/industrial-release-evidence.spec.ts', [7926, 'e89ca29430687375c9bd5fa9fc4c793925748bf9f77f7bc751f0570ff9d57634']],
  ['tests/e2e/jepa.spec.ts', [6780, 'fde7919fffcea19d9252a60393607117480dc732d306ba9362472194b99c3186']],
  ['tests/e2e/latent-dynamics.spec.ts', [6947, 'a7bd7d7cfdcbe4602ea22d7320f0874416c76ef4ddb70abb9e653dc4415a9937']],
  ['tests/e2e/market-map.spec.ts', [16146, 'a26a4032fa15a7e2cdb5e3e4af047baa2c364bc0b8993d15cfa9c8a6998ab841']],
  ['tests/e2e/motion-data-hardware.spec.ts', [8724, 'e3feb4d5bec11567b0f04c94a69ce86675376a050da7613c11f85d05e6c9d33b']],
  ['tests/e2e/motion-frontier-adjacent-home.spec.ts', [9612, '60f0e13044bb551268f502e79acf1193989d8e61eaa0e269dad6edf2d0a9afe8']],
  ['tests/e2e/motion-manipulation.spec.ts', [5139, '4aa1db8d761a377055346ce0d44821bcff78c9ae58da1e2d9a4c6d9853d5f9a0']],
  ['tests/e2e/motion-world-models.spec.ts', [15214, 'fec15d25a91353c7ce6c3794696a948bf14cb994e53969f705e20a83cd2b07a2']],
  ['tests/e2e/pi-helix-theses-readers.spec.ts', [3798, 'd4d426d40a5d6ab1020e7e955e2c4d0c10e55d1a04ae6ac062b763743f2d9686']],
  ['tests/e2e/predict-then-reveal.spec.ts', [40327, '9651d91a585c1f9bd2bda8d29456340dde0feae523fd7e463c80693227520e81']],
  ['tests/e2e/residual-release-final-seven.spec.ts', [8056, '56d870ad9d67057f602c36c9f1f07888105c1ae799b4ed0632ea3e9f5285103f']],
  ['tests/e2e/residual-release-industrial.spec.ts', [7926, '0599bcf96efc6477c6da0e4e5000b4d2c72c0bb760e02398bca448ebde2dd0ea']],
  ['tests/e2e/safety-and-assurance.spec.ts', [23544, 'd8eb080ba5f910c343430f63f9e0d2a6c8b7e34d3cd814d292d42ea77d61e0fd']],
  ['tests/e2e/thesis-economics-readers.spec.ts', [6170, '25b0c7ae3b7cdcbe6a2b604f55d6bc6aa51de094f1e2209e1ee00325c52da0d3']],
  ['tests/e2e/wm-taxonomy.spec.ts', [6582, 'fd2e08b777b42395db7ba1f62d96e260f77cd886f8845d9f0349d395c77138a6']],
  ['tests/unit/appearance-physics-push.test.ts', [5351, '7e9275704d3f5dca27c2fa72a760aaff5083ff37625daf297900cb3f1051b0d6']],
  ['tests/unit/brand-v2-annotation-scan.test.ts', [13596, '8dfdd1f46946d655fb927f9af75538b168a5fa0e4e5d636523af59fb87796f5b']],
  ['tests/unit/brand-v2-figure-evidence.test.ts', [29809, 'efeb601b9064edb8645a82df23eadf6bc0eaf0ead89b0775f0b6b67bcc827f61']],
  ['tests/unit/motion-data-hardware.test.ts', [10424, '4befc89b33b7759e17919da94e6f955f96d80236c746a71ae9a840442ffe68fd']],
  ['tests/unit/motion-frontier-adjacent-home.test.ts', [10400, '65d530b06879dcadbb24c1660a49c723882aece6335a11e0ca5ba299a9a14fe3']],
  ['tests/unit/motion-tokens.test.ts', [4233, 'b6ab1f9ed18b3b0b4cbc084da4846571d8fb69e95a45328947b96700800ee00a']],
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
const registryReviewPin = { bytes: 29156, sha256: 'b6edc92101963f4ad6af7f3da34fd82913dcd1e096d532fa91b32a5239b4f851' };

/** Reviewed successor record hash per interactive registry id. */
const registrySuccessors: ReadonlyMap<string, string> = new Map([
  ['interactive:ChunkSizeCurve', '71347fe2937866e38f6e2fbd6c924c395286c9b27828d9abf0ea7c7bbac9863b'],
  ['interactive:DataScaleChart', '626c75ad4fc11850d5db9e8df88bd8925ea7f1fd17204597394b682c5703ff85'],
  ['interactive:DeploymentEconomics', '6a41c78ea6f61aea7b1a909e16c9e0a01392cc89c3822905936139c1cbc031e3'],
  ['interactive:LatencyComparison', '31aa7e0fdd1efeca0228f6355f01fd6f6f787676e8d26b7b3d161b07d2fe82bd'],
  ['interactive:RecedingHorizon', 'c6ccfc703846e26531416a618780dd2c9a6acc7addda33e4a1bc3de469781c87'],
  ['mount:/data-hardware/data-bottleneck/:DataScaleChart:1', '5c170698640796fb37ce69b62aa27ca9340edf4f7cf2ee81a32979c85b51ed7f'],
  ['mount:/data-hardware/industrial-deployment/:DeploymentEconomics:1', 'f6f104905bb07934c24f8f6ee17141391517f965bd22dcce0e798812097c1692'],
  ['mount:/manipulation/action-chunking/:ChunkSizeCurve:1', '4fff31e690e5b6e17a0133c42ebe4cf784bf1f91069d0a548fd1b70abd38ed7d'],
  ['mount:/manipulation/action-chunking/:LatencyComparison:1', 'b516df036228355a1f91e09a5728dd78a9250645aaa4a46e9c1c86b5ab359d89'],
  ['mount:/manipulation/diffusion-policy/:RecedingHorizon:1', 'bc5871c592c69d95a57e670b46d52b75f357842fa07fdb57871939fb5fe5c878'],
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
