/**
 * Exact successor review for the articles the SEO pass of 2026-10-02
 * changed. Every published article now lists two or three related articles
 * taken from its domain report, and most leads open with a sentence that
 * defines the article's subject. Each article's change is recorded as exact
 * edits over its pre-pass bytes, so the pre-pass article is rebuilt from the
 * live one instead of being archived. The artifact reader hands every older
 * check the rebuilt bytes only while the live article is exactly the
 * reviewed successor, the rebuilt bytes hash to the recorded predecessor,
 * the frontmatter differs only in its seeAlso list, each edit sits in the
 * region it names, and the citation order and the digit-bearing tokens of
 * the body are unchanged. The end-to-end specs the pass brought up to date
 * are admitted the same way, as exact edits that keep every expect and test
 * call. The checker revision, and the reveal primitive's citation-label
 * revision, are admitted the same way. No old review, run,
 * receipt, capture or ledger cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readerFirstPredecessor } from './audit-reader-first-continuity.ts';

const directory = 'audit/evidence/seo-pass-20261002/';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const sourceDrift = 'seo pass source continuity drift';
const checkerDrift = 'seo pass checker continuity drift';

type Artifact = { path: string; bytes: number; sha256: string };
type Review = { schemaVersion: string; name?: string; reviewedBy: string; rationale: string; observedAt: string };
export type SeoPassEdit = { region: 'see-also' | 'body'; before: string; after: string };
export type SeoPassSource = { name: string; before: Artifact; after: Artifact; edits: SeoPassEdit[] };
type SourceReview = Review & { archivedFrom: string; sources: SeoPassSource[] };

/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const sourceReviewPin = { bytes: 122339, sha256: '5221a027d56a7f4c8b92fac9f4653bcbc4937ec083d5d92488861e5863062206' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['content/adjacent/autonomous-vehicles.mdx', [24549, 'b65a8beeec6d4b3f1164019fc8152e99021b1b3bca6ffdab3f3045e7847adbf7']],
  ['content/adjacent/drones.mdx', [14411, 'd14fd43757cb6350b4d69626c8a59eba7bdf19f899ee66a1d4ef9aeb0e8e53fd']],
  ['content/adjacent/space.mdx', [14304, '05c7a2c277cbac6edef39fe0f76eb95f9dc3d51d2039b5b217273e03294ffb09']],
  ['content/adjacent/surgical.mdx', [12986, 'a7ad242e43324bc5038d55caa117d0b7f023093e10c5912576f8060387d243f3']],
  ['content/classical/calibration.mdx', [10006, '36b1d2c8f894cb30d102f0e7f67cc1af329b141f507c82cfe9e0009bf6761b4a']],
  ['content/classical/control.mdx', [20863, '0eabd872c40ba0c72e9f7a5a25f081289ac00ed615613b5dac53d4824a35f9ff']],
  ['content/classical/grasp-planning.mdx', [14412, 'f5003ba70d3a387807e22a63164b8028c5a9a00cbbd1e9eed854bb987ac08d83']],
  ['content/classical/kinematics.mdx', [11787, '74dae5732a39b2bd4b0ebd7c4fa55829bfc09abc99f189617987cea75c8ba9e0']],
  ['content/classical/motion-planning.mdx', [24189, '888ca2194017ed41fc39a595f67d4fd40962d501ca06e63007bb7deb78c55bfd']],
  ['content/classical/perception.mdx', [35450, '3a894877c233a7d5be63fadbb051c626c716261ce54230217c68ed9577727aae']],
  ['content/classical/ros2-for-ml-engineers.mdx', [10598, 'b9a248618d6c537f04b7ae4182eb038e5f0f92d10f745f4586dc08cb19f16584']],
  ['content/classical/scene-representation.mdx', [21729, 'd8757237df25e2cf749d2e07a7bef64504fadc69a73b5f54f93056f1677702aa']],
  ['content/classical/state-estimation.mdx', [15940, '0a19c6117f682e939aa4d29dcb1ce061f47657a7b8ed4285b8eed461fde09ba6']],
  ['content/data-hardware/data-bottleneck.mdx', [11722, '9ef710d2e4307f7465976256e9690fd545f8ee91b5c41221649e873203075c97']],
  ['content/data-hardware/datasets.mdx', [13428, '996c1e8c62926b2ddcd05b13e53006fed55342d844886a3e83bfc05450a84926']],
  ['content/data-hardware/evaluation-crisis.mdx', [17401, '5d7a2910cff93630fd3a4ac8b87a20f3a640dbd3862da442eabc5bd327d30804']],
  ['content/data-hardware/hardware-taxonomy.mdx', [14359, 'ef44c6e6ef48244b4d38b4dd3863ecda72e0c5977ae803691583fa6841cd5a04']],
  ['content/data-hardware/industrial-deployment.mdx', [19772, '3a62958957540bc8e787ef02eaa7ff55968a03804b67bc65713a2aa1e796ba5a']],
  ['content/data-hardware/robot-learning-stack.mdx', [10346, 'f75d93cc3313647e4efd1a2d7c634e0d0ae33ae4026ba60e45ed17e07553f392']],
  ['content/data-hardware/teleop-rigs.mdx', [10110, 'ece5012a8cfa3dfae9d1b21a5401ca65e757e2dfcfb4c0e98825fb4136e62090']],
  ['content/frontier/bear-case.mdx', [11039, 'a590b5ebcc8e676fe774689c5b06ab93652697e94367ecdd56d705610bc9a058']],
  ['content/frontier/competing-theses.mdx', [17653, '1c24a5884ebe14c6d018cbc7682459495dd26f98e1e129b29da071a1235ce887']],
  ['content/frontier/dexterity.mdx', [17775, '65cc4dfd30466fcdef740c7a6f5852adf0ec65ed1da3f649ea21860cd5676829']],
  ['content/frontier/generalization.mdx', [15176, 'f226c8d2132dd6762f753241923014b543579208eb27d1b2169b34cbf9661773']],
  ['content/frontier/reliability-gap.mdx', [12074, 'f97901e8717c5786dbdd7da3f175b049df4a82fe47b0e49bc67932e5c7ca7264']],
  ['content/frontier/safety-and-assurance.mdx', [19689, '37cde285fd730b75d2ddb838c03e4f8d6f22e2e04baebfb8484875e28d566d33']],
  ['content/manipulation/action-chunking.mdx', [14480, 'eebdedbb6c90a7f74c1d9057edadbecbbc9d83d343e5a1ddf3b58702b1259c73']],
  ['content/manipulation/action-spaces.mdx', [9933, '482008024adee6f22282f1d278908b5e134bb9f50e87845d39283d58241a55e8']],
  ['content/manipulation/bc-foundations.mdx', [12546, '31ecb27b9ed23ad2d18dcf4c60dc8ad26f3c47c5f1dc293fd20c3f1243ade373']],
  ['content/manipulation/comparison-matrix.mdx', [13107, '3065355f15d0cf8f7e6158ddb66d30ece0e6dbbe3a8584ddf59a3de0641ed5ed']],
  ['content/manipulation/cross-embodiment.mdx', [12460, '61abe1d3c70c271f7b20439f4adfdcdaad30305e60ed9cf6abd8d272cd373fff']],
  ['content/manipulation/diffusion-policy.mdx', [11026, '0e27e0619aac140a86f5034d37833abb9456dae33f35c30e7475514e389a7131']],
  ['content/manipulation/foundation-models.mdx', [9539, 'ea61a8caadaa5644ae1cc378b24648177d045ab2af840906c2888f2dc05300f4']],
  ['content/manipulation/generalist-policies.mdx', [17529, '8cd6c8ecd9223ff824161a5a8f3b0706ca4bb184fe7c936afdedd12b7a11317c']],
  ['content/manipulation/hierarchical.mdx', [14600, '4adceecac3a8ae38e4266418cebb8756aedf73e2a3d87dea0edcf74dcaddfabb']],
  ['content/manipulation/knowledge-insulation.mdx', [9856, '7881e01aefec1b60f93fc1ee3c6dddbacdd491130f0cd5b5583115bd3755ddd6']],
  ['content/manipulation/pi-line.mdx', [20351, 'e8ca5b04f1ba56e651c7b161385fa3f1912a141cd804a1e51cb893358afa82aa']],
  ['content/manipulation/realtime-execution.mdx', [13094, 'bb06da7b1e9176191461cc77c8f623384fa95be32e96e0e9cebfbdc4eb31c31b']],
  ['content/manipulation/rl-finetuning.mdx', [28038, '68eef5afb0bafb60625ce07a72d3a10c82188e474e794279b0267687add62c5b']],
  ['content/manipulation/robot-learning-roadmap.mdx', [9987, '438f5361b1010e1ac54bfd8c3a6dedd636037a377771f10dbe1629aa5803a7f0']],
  ['content/manipulation/vla-models.mdx', [15946, '2e36c965fb4afa030b46ac39aee630950db3727b92b02db06d3de34da9fc0fb6']],
  ['content/rl-sim2real/humanoid-wbc.mdx', [15997, 'dd2b7a2e41463217a8170a852c7136f446ba581c4de4e1a20ec9176ff2edf217']],
  ['content/rl-sim2real/legged-locomotion.mdx', [15135, '3cd90cc4a139468da3c77847bb43a359d251d5bd8a7d6243f012d5aca0bfe7fa']],
  ['content/rl-sim2real/offline-rl.mdx', [13016, '5e1a1940b76f903e4d5da3db53b9a90692430c6b517e45b88b9606acee58235a']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [13095, '40f1c07065438009011492154dd36ff89629e8a3b22975a41e98ca826956f9d7']],
  ['content/rl-sim2real/reward-design-mpc.mdx', [20147, '1e46fed9f15766b841df09bea7af7b816dc2a11a69ed72c592aed73fc4a8a0ef']],
  ['content/rl-sim2real/rl-for-robotics.mdx', [21862, 'ef636a92877314c0bc21ca8bdf1cb1b97c7db224126f376180e68d7fae0b97cb']],
  ['content/rl-sim2real/sim2real-transfer.mdx', [20258, '9f0ed8a08992d95aa83ba018721a0050beb932c01fd5b8be01282318ea966d9a']],
  ['content/rl-sim2real/why-rl-locomotion.mdx', [8322, '2f01433c9734e3502e2f41d3ae8ed956cda5fc46c404145a5f4aaf40c51db273']],
  ['content/world-models/evaluation.mdx', [10140, 'b7c3db7ad877343dc94a6281c33698e3f8ede585c79e31f91285ca3d7efb10a2']],
  ['content/world-models/generative-sim.mdx', [14023, '6fa6af6a4f5ba3a913a19d86516eb4e334582ff26a63e09927ddbed143ccdb93']],
  ['content/world-models/generative-video.mdx', [15759, 'fa571fc833b9744745a7c4ed0555b2f5ad17e239084d496e06ea485d2a34dbcb']],
  ['content/world-models/jepa.mdx', [13699, 'd44ac7e5d063017f0de78b266e082c4d6f5d8b061c709cd0955285936b8e553f']],
  ['content/world-models/latent-dynamics.mdx', [12789, '4618f02004dfb7a26c5f818c6aa0bd2295ffd519612f0b81f51b7a1d57971737']],
  ['content/world-models/model-based-robot-learning.mdx', [10246, 'c7ede3855da3723d8904db828a56bf2cb203683f7a49188d0b4f8263355d9580']],
  ['content/world-models/taxonomy.mdx', [14582, '1e7d97223bc4a37a91004149f224102d11caccb1a7bfce472d7f8c02ac312372']],
  ['content/world-models/world-models-vs-simulators.mdx', [13456, 'b61116cee9c002b5db120f7ef10b03120b9bcc2da5f4f56dc2aa74bf5593fdbb']],
]);

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const seeAlso = (head: string) => head.match(/^seeAlso:\n(?: {2}- .*\n)+/m)?.[0];
const citations = (source: string) =>
  JSON.stringify([...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]));
const digits = (body: string) => JSON.stringify(body.match(/\d+(?:[.,]\d+)*/g) ?? []);

function readEvidence(root: string, path: string, label: string): Buffer {
  try {
    return readFileSync(join(root, path));
  } catch (error) {
    throw new Error(`${label}: ${(error as Error).message}`);
  }
}

function reviewed(review: Review, schemaVersion: string, label: string): void {
  if (review?.schemaVersion !== schemaVersion || !review.reviewedBy || !(review.rationale?.length > 80) ||
    !Number.isFinite(Date.parse(review.observedAt)) || Date.parse(review.observedAt) > Date.now()) {
    throw new Error(label);
  }
}

function parse<T>(bytes: Buffer, label: string): T {
  try {
    return JSON.parse(bytes.toString()) as T;
  } catch (error) {
    throw new Error(`${label}: ${(error as Error).message}`);
  }
}

function applyExact(text: string, edits: readonly (readonly [string, string])[], label: string): string {
  let expected = text;
  for (const [from, to] of edits) {
    const parts = expected.split(from);
    if (!from || parts.length !== 2) throw new Error(label);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    expected = parts.join(to);
  }
  return expected;
}

/**
 * The pre-pass bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifySeoPassSource(source: SeoPassSource, live: Buffer): Buffer {
  const edits = source.edits ?? [];
  const path = source.after?.path;
  if (!path?.startsWith('content/') || !path.endsWith('.mdx') || source.before?.path !== path ||
    !same(source.after, path, live.length, digest(live)) || edits.length === 0 ||
    edits.filter(({ region }) => region === 'see-also').length > 1 ||
    edits.some(({ region, before, after }) => (region !== 'see-also' && region !== 'body') ||
      !before || !after || before === after)) {
    throw new Error(sourceDrift);
  }
  const current = live.toString();
  const rebuilt = applyExact(current, edits.map(({ before, after }) => [after, before] as const).reverse(), sourceDrift);
  const prior = Buffer.from(rebuilt);
  const priorHead = frontmatter(rebuilt);
  const head = frontmatter(current);
  const priorList = priorHead && seeAlso(priorHead);
  const list = head && seeAlso(head);
  const related = list ? list.split('\n').filter((line) => line.startsWith('  - ')).length : 0;
  if (!same(source.before, path, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits.map(({ before, after }) => [before, after] as const), sourceDrift) !== current ||
    !priorHead || !head || !priorList || !list || related < 2 || related > 3 ||
    priorHead.replace(priorList, '') !== head.replace(list, '') ||
    citations(rebuilt) !== citations(current) ||
    digits(rebuilt.slice(priorHead.length)) !== digits(current.slice(head.length)) ||
    edits.some(({ region, before, after }) => region === 'see-also'
      ? before !== priorList || after !== list
      : rebuilt.indexOf(before) < priorHead.length || current.indexOf(after) < head.length)) {
    throw new Error(sourceDrift);
  }
  return prior;
}

function loadSourceReview(root: string): SourceReview {
  const bytes = readEvidence(root, `${directory}source-transition.json`, sourceDrift);
  if (bytes.length !== sourceReviewPin.bytes || digest(bytes) !== sourceReviewPin.sha256) throw new Error(sourceDrift);
  const review = parse<SourceReview>(bytes, sourceDrift);
  reviewed(review, 'seo-pass-source-continuity-v1', sourceDrift);
  const names = new Set(review.sources?.map(({ name }) => name));
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.name !== 'seo-pass-related-links-and-leads' || review.sources?.length !== successors.size ||
    names.size !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ name, after }) => !successors.has(after?.path) || after.path !== `content/${name}.mdx` ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(sourceDrift);
  }
  return review;
}

const specDrift = 'seo pass spec continuity drift';
export type SeoPassSpecEdit = { before: string; after: string };
export type SeoPassSpec = { name: string; before: Artifact; after: Artifact; edits: SeoPassSpecEdit[] };
type SpecReview = Review & { archivedFrom: string; sources: SeoPassSpec[] };

/** The reviewed spec evidence file; a changed review needs a reviewed code change too. */
const specReviewPin = { bytes: 50996, sha256: 'b421b8d70c463f8f8f58fa181f2e58234a28bbe852daec507b461e93e06a4369' };

/** Reviewed successor bytes per end-to-end spec the pass edited. */
const specSuccessors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['tests/e2e/autonomous-vehicles.spec.ts', [5465, '27684ebcf2f8cc84089bd94fee514453907ed166a8d70df36c6e0b23c4ee760f']],
  ['tests/e2e/bc-foundations.spec.ts', [4171, 'b5314be7b3afea8df9af142435c404e1c91ead538ca71a93889866dd2c3bb707']],
  ['tests/e2e/brand-v2-og.spec.ts', [3028, '914a225ee9025956691432c58cedc1c4a85ecf3b6e0f3f59970f4adec4f7ee4e']],
  ['tests/e2e/cite-punctuation.spec.ts', [7213, '67ce541055ff9e9e471db69c94a4660d2a095c39653b3764e6fa136e98b80520']],
  ['tests/e2e/competing-theses.spec.ts', [9651, '65f27430d2e73aeca7eb899bd0f8d201acb93d41b2b175e1026c1a631b730ced']],
  ['tests/e2e/control.spec.ts', [25507, '89a13d2f6686aa546c4affe576d83139a296a1fd8c3be26ad848df3a02a2178f']],
  ['tests/e2e/data-bottleneck.spec.ts', [7232, 'e38654e41dc58dba226883384830db081eca62004ceec5e16221e86e58abb500']],
  ['tests/e2e/datasets.spec.ts', [5645, '4bcb0d70855796a90ead61942828bbe4ac18cb04d728952b226fb826155356b0']],
  ['tests/e2e/drones.spec.ts', [7519, '67d6d79889d227aaf0e9aed3f826d30165268982da74ae9b2a9614c19db24e00']],
  ['tests/e2e/evaluation-crisis.spec.ts', [11267, '9701723672940655f2a46de639593e46461ee7d7dda3c91be98c1ffd49963e59']],
  ['tests/e2e/generalization.spec.ts', [8714, '21fd3bf7103c326cdcbe88ba41a70fb2fc9d66652c323ad00d8d4a367c621d44']],
  ['tests/e2e/generative-sim.spec.ts', [10612, '156fa17ed74829943bda8318fd7ea312914a609a4169ea670c70d50bc49f3217']],
  ['tests/e2e/generative-video.spec.ts', [12759, '6321a1c7410185802976f048481e71db4408d54edbe77237f241a686ca02688a']],
  ['tests/e2e/grasp-planning.spec.ts', [17643, '5d5c8eaa2d4dcf2aa03093df6b6aed25fe6c5d04edd073f481e1ec1dab16317b']],
  ['tests/e2e/hardware-taxonomy.spec.ts', [8198, '1a7dfae5e05947d52ccb1aedf0f0dcbc2c348578b5454afa5904e372cf2bb0ad']],
  ['tests/e2e/industrial-deployment.spec.ts', [20047, '7dfe06863ce47ad1cade5600ac94ee28060313a3260b1054b10691b91c8892e0']],
  ['tests/e2e/industrial-engineering-originals.spec.ts', [11618, '3aac456e16e7b3126fff1bab2880baee38b2b827304a3a7a6a6107c1271ea830']],
  ['tests/e2e/jepa.spec.ts', [5648, '1c64baeed85610bf6ba277a0b8615510471fc44609da2cdb9e97e90aed3909b2']],
  ['tests/e2e/kinematics.spec.ts', [21277, '82195d46be60e26cdb6bf7ad549d3f71453e76886c1f3a552873a82f5ca9815e']],
  ['tests/e2e/latent-dynamics.spec.ts', [6422, '3b722cb38c66336e2923d044a6b1d69406d2d34fb1a72650e9ecc31519ca7bc1']],
  ['tests/e2e/legged-locomotion.spec.ts', [7420, '75655120e239bd08f8b789c1bb8629afb3a5e8709497bb963a238161e11e3d22']],
  ['tests/e2e/motion-planning.spec.ts', [16638, 'aff9d4374c9f0267550d3bf6ce33e3a589f71dc7d07523c5291175f53e154307']],
  ['tests/e2e/parallel-sim-rl.spec.ts', [4265, 'd28fe2b2b6cc1461efa8e3201289366cc63e20b75c7a6b7fcda38a99775b0a45']],
  ['tests/e2e/perception-depth-readers.spec.ts', [22545, '542f88c9af8baf6dd733be81bbba352240930922cda10e39e9988534b23ffa67']],
  ['tests/e2e/perception.spec.ts', [36500, '40f915a16e85405ea0b8fa5a8754dcfb4b56e4e50d95090d029c38187fa0c37c']],
  ['tests/e2e/reliability-gap.spec.ts', [11845, 'f826f404946b5784cf142da08107b22d85d3b5423f4084f57fddeec41c031da5']],
  ['tests/e2e/residual-release-classical.spec.ts', [9437, '4f057853c66c5d4c27981439c21053b65303153e5796f7d03f2b485b284c0b4a']],
  ['tests/e2e/rl-finetuning.spec.ts', [11299, 'dfbc170810f0406fb80f07955606e7e774c630b164f2f2e7aa92256dff5e3c93']],
  ['tests/e2e/rma-kl-reader.spec.ts', [13532, 'ccb91ae7ee0129b4480d5e95515253ef484501856e4230dc500338288e9d5883']],
  ['tests/e2e/scene-representation.spec.ts', [25254, '4ebf6119e96116f6ef3029e68a5533e4f59d7d5dc618962ec2f12ceab3268288']],
  ['tests/e2e/see-also.spec.ts', [15115, '34dabe21a183a04dd6ccca3f02f6b9faa2263aef8e57af6faa9f499eb330ff09']],
  ['tests/e2e/seo-static-integrity.spec.ts', [19190, 'a7f23fa65c7a57d253c086157a0fb959532ff3c9edc9d896602483bc4daff73b']],
  ['tests/e2e/sim2real-transfer.spec.ts', [10225, '62dad0f8e651f98d0ae52256023715d65bdf21cd52189073fdba573aed7819e3']],
  ['tests/e2e/space.spec.ts', [10140, '51fa6706329ea15cfbffbcd24da1722a10797ea7d50946a11db34521dfc128b0']],
  ['tests/e2e/state-estimation.spec.ts', [13500, '03cf55b5f93b2f885762ebccbc61ed38b7ad06c77a669c6b88cef8ef697606e0']],
  ['tests/e2e/surgical.spec.ts', [6841, 'c827a674b1211aaeb18174c2c8b60300d71dc618f58a8ac32c3c0ec06398553b']],
  ['tests/e2e/teleop-rigs.spec.ts', [8889, 'dac84b81f54dce9add7715ba5b25a9fe0d1c5e834b823b8ad6cb6e87055bb0da']],
  ['tests/e2e/why-rl-locomotion.spec.ts', [4589, 'b5371e1488f7a8f522b81344c5dbf872116717bfb6ea09efb307111422bcb64f']],
  ['tests/e2e/wm-taxonomy.spec.ts', [5501, 'c2d3bac09a42ef4e53a73501b5aa7e2911137a95270afd2f5e5570bcef35f37b']],
]);

const calls = (source: string) => [
  source.split('expect(').length - 1,
  source.match(/\btest(?:\.[a-z]+)?\(/g)?.length ?? 0,
] as const;

/**
 * The pre-pass spec rebuilt from the live successor. Throws unless the live
 * bytes are the reviewed successor, the reversed edits rebuild the recorded
 * predecessor and replay to the live bytes, and the successor keeps at least
 * as many expect and test calls. Exported so the obligations can be
 * exercised apart from the byte pins that normally gate them.
 */
export function verifySeoPassSpec(source: SeoPassSpec, live: Buffer): Buffer {
  const edits = source.edits ?? [];
  const path = source.after?.path;
  if (!path?.startsWith('tests/e2e/') || !path.endsWith('.spec.ts') || source.before?.path !== path ||
    !same(source.after, path, live.length, digest(live)) || edits.length === 0 ||
    edits.some(({ before, after }) => !before || !after || before === after)) {
    throw new Error(specDrift);
  }
  const current = live.toString();
  const rebuilt = applyExact(current, edits.map(({ before, after }) => [after, before] as const).reverse(), specDrift);
  const prior = Buffer.from(rebuilt);
  const [priorExpects, priorTests] = calls(rebuilt);
  const [expects, tests] = calls(current);
  if (!same(source.before, path, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits.map(({ before, after }) => [before, after] as const), specDrift) !== current ||
    expects < priorExpects || tests < priorTests) {
    throw new Error(specDrift);
  }
  return prior;
}

function loadSpecReview(root: string): SpecReview {
  const bytes = readEvidence(root, `${directory}spec-transition.json`, specDrift);
  if (bytes.length !== specReviewPin.bytes || digest(bytes) !== specReviewPin.sha256) throw new Error(specDrift);
  const review = parse<SpecReview>(bytes, specDrift);
  reviewed(review, 'seo-pass-spec-continuity-v1', specDrift);
  const names = new Set(review.sources?.map(({ name }) => name));
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.name !== 'seo-pass-end-to-end-pins' || review.sources?.length !== specSuccessors.size ||
    names.size !== specSuccessors.size || paths.size !== specSuccessors.size ||
    review.sources.some(({ name, after }) => !specSuccessors.has(after?.path) ||
      after.path !== `tests/e2e/${name}.spec.ts` || !same(after, after.path, ...specSuccessors.get(after.path)!))) {
    throw new Error(specDrift);
  }
  return review;
}

const revealDrift = 'seo pass reveal continuity drift';
/** The reveal primitive as the shared-ui layer admits it, and the pass's revision of it. */
const revealBefore = {
  path: 'components/article/commit-to-reveal.tsx',
  bytes: 12895,
  sha256: 'cd89e02019c260f36f091bae34b1deeffebbfe5128025f7dbe3b99b43140f4d4',
};
const revealAfter = {
  path: 'components/article/commit-to-reveal.tsx',
  bytes: 13176,
  sha256: 'cd996c964173cca0529068624d827b94f9f57f0227a866a3ab413cf8db24da5f',
};
const revealEdits: readonly (readonly [string, string])[] = [
  [
    '  cite?: string;\n',
    '  cite?: string;\n' +
      '  /**\n' +
      "   * The chip text for `cite`: the registry's author-year label, which\n" +
      '   * lib/rehype-reveal-cite-labels.mjs writes in at compile time because this\n' +
      '   * client module does not load the citation registry. Falls back to the id.\n' +
      '   */\n' +
      '  citeLabel?: string;\n',
  ],
  [
    '                        {option.cite}\n',
    '                        {option.citeLabel ?? option.cite}\n',
  ],
];

/**
 * The reviewed reveal revision only gives each citation chip its registry
 * label, so its predecessor is rebuilt from the exact edits above and checked
 * against the shared-ui endpoint. Other bytes, and a reference naming the live
 * revision, come back unchanged.
 */
function revealPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const liveHash = digest(live);
  if (live.length !== revealAfter.bytes || liveHash !== revealAfter.sha256 ||
    (ref.bytes === live.length && ref.sha256 === liveHash)) {
    return live;
  }
  const review = parse<Review & { before: Artifact; after: Artifact }>(
    readEvidence(root, `${directory}reveal-transition.json`, revealDrift), revealDrift);
  reviewed(review, 'seo-pass-reveal-revision-v1', revealDrift);
  const current = live.toString();
  const rebuilt = applyExact(current, revealEdits.map(([from, to]) => [to, from] as const).reverse(), revealDrift);
  const prior = Buffer.from(rebuilt);
  if (review.name !== 'seo-pass-reveal-citation-label' ||
    !same(review.before, revealBefore.path, revealBefore.bytes, revealBefore.sha256) ||
    !same(review.after, revealAfter.path, revealAfter.bytes, revealAfter.sha256) ||
    !same(revealBefore, revealBefore.path, prior.length, digest(prior)) ||
    applyExact(rebuilt, revealEdits, revealDrift) !== current) {
    throw new Error(revealDrift);
  }
  return prior;
}

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so those checks still decide them.
 * The reviewed successor is verified, and its rebuilt predecessor returned.
 * The reader-first layer, which is newer, sees the live bytes first.
 */
export function seoPassPredecessor(root: string, ref: Artifact, liveBytes: Buffer): Buffer {
  const live = readerFirstPredecessor(root, ref, liveBytes);
  if (ref.path === revealAfter.path) return revealPredecessor(root, ref, live);
  const spec = specSuccessors.get(ref.path);
  if (spec) {
    if (live.length !== spec[0]) return live;
    const specHash = digest(live);
    if (specHash !== spec[1] || (ref.bytes === live.length && ref.sha256 === specHash)) return live;
    return verifySeoPassSpec(loadSpecReview(root).sources.find(({ after }) => after.path === ref.path)!, live);
  }
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  const source = loadSourceReview(root).sources.find(({ after }) => after.path === ref.path)!;
  return verifySeoPassSource(source, live);
}
/** The figure-migration reader head this revision edits. */
const checkerBefore = {
  path: 'lib/audit-local-basis.ts',
  bytes: 114190,
  sha256: 'df2ad1d487103f41f8b939a67aa15d61ceb63843b9ef3d9b2c39353070e14fe5',
};
const checkerAfter = {
  path: 'lib/audit-local-basis.ts',
  bytes: 114290,
  sha256: 'f115c68135aaac380af0e10ebecc721bcb613d5434f24b007f51879ed6829f3e',
};
const checkerEdits: readonly (readonly [string, string])[] = [
  [
    "import { figureMigrationPredecessor, figureMigrationRegistry } from './audit-figure-migration-continuity.ts';\n",
    "import { figureMigrationPredecessor, figureMigrationRegistry } from './audit-figure-migration-continuity.ts';\n" +
      "import { seoPassPredecessor } from './audit-seo-pass-continuity.ts';\n",
  ],
  [
    '    figureMigrationPredecessor(root, ref, readBoundedLocalFile(root, ref.path))));\n',
    '    figureMigrationPredecessor(root, ref, seoPassPredecessor(root, ref, readBoundedLocalFile(root, ref.path)))));\n',
  ],
];

/**
 * Checker bytes other than the reviewed revision come back unchanged, so the
 * figure-migration layer still decides them. The reviewed revision is
 * admitted only as the exact reader edit above the figure-migration head,
 * and that head is rebuilt from it and returned.
 */
export function seoPassCheckerPredecessor(root: string, live: Buffer): Buffer {
  if (live.length !== checkerAfter.bytes || digest(live) !== checkerAfter.sha256) return live;
  const review = parse<Review & { before: Artifact; after: Artifact }>(
    readEvidence(root, `${directory}checker-transition.json`, checkerDrift), checkerDrift);
  reviewed(review, 'seo-pass-checker-revision-v1', checkerDrift);
  const current = live.toString();
  const rebuilt = applyExact(current, checkerEdits.map(([from, to]) => [to, from] as const).reverse(), checkerDrift);
  const historical = Buffer.from(rebuilt);
  if (review.name !== 'seo-pass-reader' ||
    !same(review.before, checkerBefore.path, checkerBefore.bytes, checkerBefore.sha256) ||
    !same(review.after, checkerAfter.path, checkerAfter.bytes, checkerAfter.sha256) ||
    !same(checkerBefore, checkerBefore.path, historical.length, digest(historical)) ||
    applyExact(rebuilt, checkerEdits, checkerDrift) !== current) {
    throw new Error(checkerDrift);
  }
  return historical;
}
