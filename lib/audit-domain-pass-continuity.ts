/**
 * Exact successor review for the articles the opus-pass domain passes
 * rewrote from the owner's verified drafts (manipulation first, 2026-10-06).
 * A domain pass shortens the prose, cites more sources and removes the
 * Callout and Aside boxes, while every figure and component mount, every
 * frontmatter field and every citation the article already had stay put.
 * Each rewrite is recorded as exact edits over the bytes the article had
 * before the pass, so the earlier bytes are rebuilt from the live file
 * instead of being archived. The artifact reader hands every older check the
 * rebuilt bytes only while the live article is exactly the reviewed
 * successor, reversing the edits rebuilds bytes that hash to the recorded
 * predecessor, replaying them gives the live bytes back, and the
 * obligations below hold. No old review, run, receipt, capture or ledger
 * cell is rewritten.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { figureMountPredecessor } from './audit-figure-mount-continuity.ts';
import { imageMountPredecessor } from './audit-image-mount-continuity.ts';
import { dataHardwareCutPredecessor } from './audit-length-cut-data-hardware-continuity.ts';
import { adjacentCutPredecessor } from './audit-length-cut-adjacent-continuity.ts';
import { frontierLengthCutPredecessor } from './audit-length-cut-frontier-continuity.ts';
import { worldModelsLengthCutPredecessor } from './audit-length-cut-world-models-continuity.ts';
import { lengthCutPredecessor } from './audit-length-cut-continuity.ts';
import { parallelLocalCheckerPredecessor } from './audit-parallel-local-continuity.ts';
import { wordBudgetTrimPredecessor } from './audit-word-budget-trim-continuity.ts';

export const DOMAIN_PASS_CONTINUITY_DIR = 'audit/evidence/domain-pass-20261006/';
const reviewFile = `${DOMAIN_PASS_CONTINUITY_DIR}source-transition.json`;
const drift = 'domain pass continuity drift';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

type Artifact = { path: string; bytes: number; sha256: string };
export type DomainPassEdit = { before: string; after: string };
export type DomainPassSource = { archivedFrom: string; before: Artifact; after: Artifact; edits: DomainPassEdit[] };
export type DomainPassReview = {
  schemaVersion: 'domain-pass-continuity-v1';
  name: 'domain-pass-20261006';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  sources: DomainPassSource[];
};

// BEGIN domain-pass pins (written by scripts/record-domain-pass-continuity.ts)
/** The reviewed evidence file; a changed review needs a reviewed code change too. */
const reviewPin = { bytes: 1342088, sha256: 'f1058c7eea688bf9f2d95d09151b7a16f1c67ef090fe53541f2cd2075482737e' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['components/interactive/reliability-compounding.tsx', [19407, 'cccb7752ae4b48133790ad59606e458fc5975103f98c5e5a07051b42d993f70e']],
  ['content/adjacent/space.mdx', [14882, '90c63559e4cb1ee20d3c5ad022d060b23344120aa0dfd7d636223d99755c477a']],
  ['content/classical/calibration.mdx', [9689, 'f05b9f74bfefac02ed215bb3f4110b0afd3ec2ef1ed5cc5679c9e51be0943500']],
  ['content/classical/control.mdx', [20015, '5deb9961e56c1c5f4cfa3847fe479cddf795e00f255874e4276841e8953b9ba3']],
  ['content/classical/grasp-planning.mdx', [14228, 'd8646bbd77d25693e25e87aef575c5d3fefb45357bf7c03e5b056a1a75591605']],
  ['content/classical/kinematics.mdx', [11805, '3f89ea8849092ca97811c4e9db5e0afc61beda251cfb019d5c93e3188b3072c9']],
  ['content/classical/motion-planning.mdx', [21243, '6917d44696c34c4da2f70ebcf403f0592ca00c7291fb23706b3d8f7068759095']],
  ['content/classical/perception.mdx', [28442, 'cf19ca2fb3368fc0252c97545fec67ae6cadc6bb4c7bf635523e9e369beb8e2b']],
  ['content/classical/ros2-for-ml-engineers.mdx', [9592, '1dfd445c34d55ac5c92957fa838df7e4a4918c9a13e7309546bebc7f13b34f34']],
  ['content/classical/scene-representation.mdx', [20664, '71a7c5be7f7f32ae5d74b4d90a160c201a36e94c5021e0e215418568427922db']],
  ['content/classical/state-estimation.mdx', [15410, '96b92f0aa260583ff52b6cd3e7867c14891b61fe8bb1379d04bea15d7ca30329']],
  ['content/data-hardware/data-bottleneck.mdx', [14748, '9f227b1d073c786223167327e78b1f44ba3dae7efc14cf76f743ee6dcfa86f74']],
  ['content/data-hardware/robot-learning-stack.mdx', [11032, '568c854ef37e496a3b64e5987b22d7a4559984aca7e2c6a4c2a6f04524d10ac6']],
  ['content/frontier/bear-case.mdx', [10545, 'd16b433bad1c9e60a4cf3fae376eac4671d09bd859fd301af15309dd84e951f6']],
  ['content/frontier/competing-theses.mdx', [15641, '39a447e1408c4d5d8cfd1efd7f72f45c500d1df8cc2f80804ffdb5ea37b05bb9']],
  ['content/frontier/dexterity.mdx', [21446, 'd9a1f74f72d3bc18ccb948ef986093b13ed603650f37cc8bf77d8130d5b730d2']],
  ['content/frontier/generalization.mdx', [14664, '5c6d2348dea214bd4ca89fc9b4dfd7be43fbe23dfc00d84ee5a25ac880d26d27']],
  ['content/frontier/reliability-gap.mdx', [11788, 'fa8f216859d03ba9508a4169e5a56af25ee1b5bcaf5e2c5f25bed55a16c4f6d1']],
  ['content/frontier/safety-and-assurance.mdx', [19717, 'a5a5ab0cb99819174da77c86f1bbd8093b8e59e88139963a5d539cdaf8323800']],
  ['content/manipulation/action-chunking.mdx', [12714, 'a08054d5b2b91c7f0a47b42a5f1851087634420845b7fba5f89f42d4c2d4ed84']],
  ['content/manipulation/action-spaces.mdx', [10574, '885130648006e720419bc1e074513c2c5631d3d1e2f5be6acab2c1ae41df7320']],
  ['content/manipulation/bc-foundations.mdx', [14131, '623d1972ee5dcc713358931bf0a624c05e1d657096d2c5a6f61ebce80a778440']],
  ['content/manipulation/comparison-matrix.mdx', [10991, 'ca5ab6eead454ec4e4f6b4277a6222f6f761bebe9938e1bc0e5149d5202d7855']],
  ['content/manipulation/cross-embodiment.mdx', [12635, 'edc42c21baaf37a3ecc2b07ae704a2f800498254e179866adcbd7adee924555f']],
  ['content/manipulation/diffusion-policy.mdx', [11387, '532b8324fd2085a5f813c841a23be2dade8013237ce3769093da5d5469dcfc01']],
  ['content/manipulation/foundation-models.mdx', [10881, '805ec2b61ba80c812f1c146193f584b374619902dbe3c471144ec84dcf8445a3']],
  ['content/manipulation/generalist-policies.mdx', [14708, '1aa7ca82c4b664ffa4e15357864504eba4d7a8f9fa3d6381f47c9a1cc8384aa2']],
  ['content/manipulation/hierarchical.mdx', [15042, '546d44d90934264528e8bdc09ce618e0a9d0c6cc17de1ea516075b556fa34652']],
  ['content/manipulation/knowledge-insulation.mdx', [9547, 'edd85c2ad7679321fb67d5795f63ed667387ea6e495a0f29706f773cb6645f87']],
  ['content/manipulation/pi-line.mdx', [16594, '44f42966362ab04c2b719f565f46ff55b8515e0b2aff0c37a78a1f0d0c4d75b9']],
  ['content/manipulation/realtime-execution.mdx', [12504, 'f1db1ff6aa7e6e1ff6221ee56e96d257a6f77920c9360c1759539e0bd1bb8c8a']],
  ['content/manipulation/rl-finetuning.mdx', [24590, '437a1be8d7ae0c83533fb2c2ff51d572edded2f77cd102afccc742792538cc7a']],
  ['content/manipulation/robot-learning-roadmap.mdx', [9916, 'c10473a9d9a52893fe18ce799007c4d7612a23da2934c68a303f33fe9b156aa6']],
  ['content/manipulation/vla-models.mdx', [14391, '3e0f91826050ffdb4b69bd6a39622c315f4497ccfbe931b02f7787a83c3ce854']],
  ['content/rl-sim2real/humanoid-wbc.mdx', [15587, 'ac79e9e0469ad9cd67e6668ba7c67bcacc3c43000593f03186889715033d1fa3']],
  ['content/rl-sim2real/legged-locomotion.mdx', [13665, 'b0eb1751dafd4db9a39773bca129998c0c5e55c75bafb8315d6709f6529f4d41']],
  ['content/rl-sim2real/offline-rl.mdx', [13146, 'f7dbcd6b92dc1ddf6a1b81e019a98f699ab4b1f7cab9f6d2c064cd7937e23123']],
  ['content/rl-sim2real/parallel-sim-rl.mdx', [11661, '76dcd6c4a0cff54b79bd17ac1f36a16c7707f2bc71bca71e2a3f8ad5e20e74b6']],
  ['content/rl-sim2real/reward-design-mpc.mdx', [18303, '0098f0413df89cc121201225b1a0d7d436150de8c71fe432f7adae5b56efac9e']],
  ['content/rl-sim2real/rl-for-robotics.mdx', [17542, '13dbff145d8f6d7bb73c53a08408f250bba23aee330042017e28a4b32f14e7e0']],
  ['content/rl-sim2real/sim2real-transfer.mdx', [19378, 'c0b26865883fc734683b8bc0c5ccecaced7ced82c349badb06095fb641cab74b']],
  ['content/rl-sim2real/why-rl-locomotion.mdx', [8908, 'db029a747a92b75e5f56e716cf548de6c3acd95ea8ffd7215625851ff9f3727c']],
  ['content/world-models/evaluation.mdx', [10996, 'af6f856ae7e0694493c1f11a54e265e10ea556ec9bdf55cf0c5790eda0890b17']],
  ['content/world-models/generative-sim.mdx', [14256, '7899f28f5d3e5d01a6437923b23043a09ab5e5ba1833eea574fbb7e7f2166e90']],
  ['content/world-models/generative-video.mdx', [16004, '50310603d5a59a3345ba9a4c1c099d8a28d3b3b0fede386c428c22b4b29ce600']],
  ['content/world-models/jepa.mdx', [14145, '70a6312ebad93aacf31b1f43d96e089307622a3d25ff421382a317c4f5c1a41f']],
  ['content/world-models/latent-dynamics.mdx', [12231, 'f8e8e46ac8c6c372e07c6140180b15e2a7e4f0889e8f626266eb281350ad7624']],
  ['content/world-models/model-based-robot-learning.mdx', [10304, 'f835cb3c762a3fb667ca617f377fbf1bcb8668650196465a3d03a42a1c722fd8']],
  ['content/world-models/taxonomy.mdx', [13938, '22a45faa2b7feab6fae51ced32e9b10ef8ea1c3459e7205672d59637c38466bb']],
  ['content/world-models/world-models-vs-simulators.mdx', [13151, 'cfe3613bb35a93f74e6f76c5e3943d0440239c2303b86a8c7d062ea40a5f28d9']],
  ['data/glossary.ts', [81288, '0d2b33bce5e7957f5eabeca392678b1c55e67516bba3e4f82138eacb24982ecf']],
]);
// END domain-pass pins

const same = (artifact: Artifact | undefined, path: string, bytes: number, sha256: string) =>
  artifact?.path === path && artifact.bytes === bytes && artifact.sha256 === sha256;
const frontmatter = (source: string) => source.match(/^---\n[\s\S]*?\n---\n/)?.[0];
const citationList = (head: string) =>
  head.match(/\ncitations:\n((?: {2}- [^\n]+\n)*)/)?.[1].split('\n').filter(Boolean).map((line) => line.slice(4)) ?? [];
const citedIds = (source: string) => new Set([...source.matchAll(/<Cite\s+id="([^"]+)"/g)].map((m) => m[1]));
/** Box components the owner removed from every article (decision of 2026-10-02 13:15). */
const REMOVED_BOXES = new Set(['Callout', 'Aside']);
const INLINE = new Set(['Cite', 'Term']);
/** Every figure and component mount in the body, in order, with its exact attributes. */
const mounts = (source: string) => [...source.slice(frontmatter(source)?.length ?? 0)
  .matchAll(/<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g)]
  .filter((m) => !INLINE.has(m[1]) && !REMOVED_BOXES.has(m[1]))
  .map((m) => `${m[1]}${m[2].replace(/\s+/g, ' ').trimEnd()}`);

/**
 * Mounts the classical pass corrected, each one exact swap of one mount's
 * attributes on one article. Stat cards from its owner sweep: K.R5 (the
 * SO-101 has five arm joints plus a gripper, not six arm joints), the 2D
 * demo card that pointed below at a figure mounted above it, and P.X1 (Shiu
 * and Ahmad posed AX = XB; the card dates Tsai and Lenz's solver). The
 * pendulum prediction on control, from the figure's reader-first rewrite:
 * it said a gain under the threshold makes the pole fall within seconds,
 * while the lab's own simulation holds the pole at a lean of about 50
 * degrees, so its prompt, answers and hint now say the pole cannot stay
 * upright. The why-rl-locomotion tile from the rl-sim2real findings of
 * 2026-10-08 (R2): "no four-minute number exists in 2026" was an uncited
 * absolute negative, so the tile now reports Play2Perfect's sourced 60%
 * insertion success at 0.5 mm clearance under a label that claims no
 * equivalence. Every other mount still has to match its predecessor exactly.
 */
const CORRECTED_MOUNTS: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
  ['content/classical/kinematics.mdx', new Map([
    ['Stat label="SO-101 revolute joints" value="6" note="the arm in the 3D playground"',
      'Stat label="SO-101 arm joints" value="5" note="plus a gripper, in the 3D playground"'],
    ['Stat label="joints in the 2D demo" value="3" note="the planar chain below"',
      'Stat label="joints in the 2D demo" value="3" note="the planar chain above"'],
  ])],
  ['content/classical/perception.mdx', new Map([[
    'Stat label="hand-eye (AX = XB)" value="1989" note="Tsai and Lenz solve the camera-to-gripper transform"',
    'Stat label="hand-eye solver" value="1989" note="Tsai and Lenz solve the camera-to-gripper transform"',
  ]])],
  ['content/classical/control.mdx', new Map([[
    'PredictThenReveal prompt="The lab below is released 12 degrees off vertical with the payload bias ' +
      'in place. Below what proportional gain does the loop lose the pole entirely, however the other two ' +
      'gains are set?" options={[ { value: \'mgl-threshold\', label: \'Kp must clear the weight threshold, ' +
      'about 9.8 here; below it the pole falls no matter how high the damping\', why: \'Linearized about ' +
      'upright, the loop is stable only when Kp exceeds m g l, 9.81 in the slider’s units. The derivative ' +
      'term can shape the recovery but cannot create a restoring torque the proportional term does not ' +
      'supply, so below the threshold nothing holds the pole up.\', cite: \'tedrake-underactuated\' }, { ' +
      'value: \'any-positive\', label: \'Any positive Kp holds the pole in the usual case; a small gain only ' +
      'corrects more slowly and the lean settles out\', why: \'This is the expectation the lab exists to ' +
      'break. Proportional action generates corrective torque from error, and below the gravity torque the ' +
      'correction is always outrun: the mounted figure sits half a unit under the threshold and the status ' +
      'reads fallen within seconds of Run.\' }, { value: \'damping-saves\', label: \'A Kp below the threshold ' +
      'can still work, provided Kd is raised enough for the damping to hold the pole up\', why: \'Damping ' +
      'opposes rate. With the pole leaning and accelerating away, a high Kd slows the fall and can hold it ' +
      'ringing at large angles, but the classification still lands on fallen: drag Kd to its ceiling in ' +
      'the figure and watch the status line.\' } ]} answer="mgl-threshold" revealHint="The lab is mounted ' +
      'at Kp 9.5 with the threshold at 9.81 half a unit above it: press Run and the pole falls. Raise the ' +
      'gain one step and it holds." takeaway="The restoring torque must outweigh gravity before anything ' +
      'else matters: past that floor the loop is unstable, and damping alone cannot buy it back."',
    'PredictThenReveal prompt="The lab below is released 12 degrees off vertical with the payload bias ' +
      'in place. Below what proportional gain can the loop no longer hold the pole upright, however the ' +
      'other two gains are set?" options={[ { value: \'mgl-threshold\', label: \'Kp must clear the weight ' +
      'threshold, about 9.8 here; below it the pole cannot stay upright, even at high damping\', why: ' +
      '\'Linearized about upright, the loop is stable only when Kp exceeds m g l, 9.81 in the slider’s ' +
      'units. The derivative term can shape the recovery but cannot create a restoring torque the ' +
      'proportional term does not supply, so below the threshold nothing holds the pole upright.\', cite: ' +
      '\'tedrake-underactuated\' }, { value: \'any-positive\', label: \'Any positive Kp holds the pole in the ' +
      'usual case; a small gain only corrects more slowly and the lean settles out\', why: \'This is the ' +
      'expectation the lab exists to break. Proportional action generates corrective torque from error, ' +
      'and under the threshold that torque loses to gravity near upright: the mounted figure sits half a ' +
      'unit under it, and once released the pole sags to about 50 degrees and stays there.\' }, { value: ' +
      '\'damping-saves\', label: \'A Kp below the threshold can still work, provided Kd is raised enough for ' +
      'the damping to hold the pole up\', why: \'Damping opposes rate. With the pole leaning and ' +
      'accelerating away, a high Kd slows the fall, but it adds no push once the pole stops moving: drag ' +
      'Kd to its ceiling in the figure and the pole sags to the same lean, only more slowly.\' } ]} ' +
      'answer="mgl-threshold" revealHint="The lab starts half a unit under the threshold: press Too gentle ' +
      'to release the pole and it sags to a steep lean. Press Strong enough and it holds near upright." ' +
      'takeaway="The restoring torque must outweigh gravity before anything else matters: past that floor ' +
      'the loop is unstable, and damping alone cannot buy it back."',
  ]])],
  ['content/rl-sim2real/why-rl-locomotion.mdx', new Map([[
    'Stat label="Manipulation equivalent" value="none" note="no four-minute number exists in 2026"',
    'Stat label="Sim-to-real insertion" value="60%" note="Play2Perfect, 0.5 mm clearance (CoRL 2026)"',
  ]])],
]);

/**
 * Frontmatter descriptions a pass corrected, each one exact swap of the whole
 * description line on one article. rl-for-robotics called its constant-rate
 * figure "a labelled ... toy" and closed on "what those assumptions do and do
 * not measure", both residue the rl-sim2real measures named; the figure is an
 * illustrative model shown beside cited training times. Every other
 * frontmatter line still has to match its predecessor exactly.
 */
const CORRECTED_DESCRIPTIONS: ReadonlyMap<string, readonly [string, string]> = new Map([
  ['content/rl-sim2real/rl-for-robotics.mdx', [
    'description: "Environment-step budgets connect reinforcement learning to the cost of collecting robot ' +
      'experience. A labelled constant-rate toy contrasts simulation, one robot and a fleet; cited experiments ' +
      'explain what those assumptions do and do not measure."',
    'description: "Environment-step budgets connect reinforcement learning to the cost of collecting robot ' +
      'experience. An illustrative constant-rate model compares simulation, one robot and a fleet, with cited ' +
      'training times from real runs."',
  ]],
]);

/** The job-length slider block of the reliability-compounding chart, unindented. */
const STEPS_FIELD = [
  '<ControlField>',
  '  <ControlLabel htmlFor={stepsId} value={`${steps} ${stepWord(steps)}`}>',
  '    How many steps the job has',
  '  </ControlLabel>',
  '  <input',
  '    id={stepsId}',
  '    type="range"',
  // Split so the brand annotation scan, which reads raw source text, does not
  // record this copy of the component's markup as a module writing the control.
  '    data-brand-control-id' + '="control:input"',
  '    min={1}',
  '    max={maxSteps}',
  '    step={1}',
  '    value={steps}',
  '    onChange={(e) => setSteps(Number(e.target.value))}',
  '    aria-label={`How many steps the job has (episode length in steps), currently ${steps}`}',
  '    className={INSTRUMENT_SLIDER_CLASS}',
  '  />',
  '  <SliderEnds low="1 step" high={`${maxSteps} steps`} />',
  '</ControlField>',
] as const;
const indentLines = (lines: readonly string[], by: number) =>
  lines.map((line) => `${' '.repeat(by)}${line}\n`).join('');

/**
 * Non-article sources a pass corrected, each one exact swap of one passage
 * on one file, from the QA findings of 2026-10-08. The
 * reliability-compounding chart cut the leading "1" of its "100%" y tick at
 * 390 px, so its left pad grows from 44 to 58 stage units. The operational
 * design domain glossary entry carried a "not a contradiction but" contrast,
 * now stated directly. The frontier pass of 2026-10-10 then lands its two
 * reviewed glossary fixes: mechanoreceptor replaces an unsupported
 * seven-cells-against-a-thousand comparison with the sourced Sanctuary and
 * Digit 360 fingertip figures, and tactile sensing swaps a banned listicle for
 * the primary report and drops a per-cell figure the source does not state.
 * The frontier pass of 2026-10-13 makes the reliability-gap chart description
 * follow its primary control: on a mount with a preset set, which fixes the
 * 30-step job, the job-length slider moves out of the main view into "Adjust
 * more" after the per-step slider, so the per-step slider is the figure's
 * first slider; the evaluation-crisis mount keeps its layout.
 * The discovery pass of 2026-10-14 (opus-pass-home-hubs-and-discovery)
 * rewords 35 glossary definitions, one swap each: openers that now define
 * the term, and filler, closers and uncited asides removed. No term, id,
 * citation or number changes.
 * A listed file must equal its predecessor with exactly these swaps; no other
 * non-article source is admitted.
 */
const CORRECTED_SOURCES: ReadonlyMap<string, readonly (readonly [string, string])[]> = new Map([
  ['components/interactive/reliability-compounding.tsx', [[
    'const PAD = { top: 30, right: 14, bottom: 46, left: 44 };',
    'const PAD = { top: 30, right: 14, bottom: 46, left: 58 };',
  ], [
    ' * length; the full per-step slider and Reset sit in "Adjust more". The\n' +
      ' * evaluation-crisis and reliability-gap modules mount it with different\n' +
      ' * defaults, and the headline and caption follow the mount.\n',
    ' * length; the full per-step slider and Reset sit in "Adjust more". A mount\n' +
      ' * with a preset set (reliability-gap) moves the job length into "Adjust\n' +
      ' * more" after the per-step slider. The evaluation-crisis and reliability-gap\n' +
      ' * modules mount it with different defaults, and the headline and caption\n' +
      ' * follow the mount.\n',
  ], [
    indentLines(STEPS_FIELD, 10),
    '          {presetSet ? null : stepsField}\n',
  ], [
    '  return (\n    <InstrumentFigure\n      figureId="reliability-compounding"\n',
    '  // A mount with a preset set fixes the job length its presets name, so\n' +
      '  // the job-length slider joins the full per-step slider in "Adjust more"\n' +
      '  // and the per-step presets are the one main-view control.\n' +
      `  const stepsField = (\n${indentLines(STEPS_FIELD, 4)}  );\n\n` +
      '  return (\n    <InstrumentFigure\n      figureId="reliability-compounding"\n',
  ], [
    '          <InstrumentReset onClick={reset} />\n',
    '          {presetSet ? stepsField : null}\n          <InstrumentReset onClick={reset} />\n',
  ]]],
  ['data/glossary.ts', [[
    'SAE J3016 makes the ODD part of the level definitions, which is why a Level 4 robotaxi that works in ' +
      'Phoenix and fails in a blizzard is not a contradiction but an ODD boundary. Crash-rate comparisons ' +
      'against human benchmarks align the human baseline to the same vehicle types, road types, and ' +
      'locations as the system\\\'s ODD, precisely so the comparison is not rigged.',
    'SAE J3016 makes the ODD part of the level definitions, so a Level 4 robotaxi can work in Phoenix and ' +
      'fail in a blizzard: the blizzard lies outside its ODD. Crash-rate comparisons against human ' +
      'benchmarks match the human baseline to the same vehicle types, road types, and locations as the ' +
      'system\\\'s ODD, so both sides are measured on the same driving.',
  ], [
    'Robot tactile sensors are closing on raw force threshold but remain far sparser: the best documented ' +
      'arrays put seven sensing cells on a fingerpad where the human finger packs about a thousand ' +
      'receptors.\',\n    citations: [\'macefield-touch-2022\', \'brooks-dexterity-2025\'],',
    'On robot fingertips, Sanctuary\\\'s Phoenix finger pads carry a seven-cell micro-barometer sensor ' +
      'sensitive to 5 mN, against a human sensitivity of about 3 mN, and Meta\\\'s Digit 360 research ' +
      'fingertip resolves normal force to 1.01 mN.\',\n    citations: [\'macefield-touch-2022\', ' +
      '\'brooks-dexterity-2025\', \'rr-sanctuary-tactile-2025\', \'digit-360-2024\'],',
  ], [
    'Sanctuary\\\'s micro-barometer arrays resolve about five millinewtons per cell against roughly three ' +
      'for a human fingertip, but coverage, durability, and integration into training pipelines remain the ' +
      'open problems.\',\n    citations: [\'tactile-outlook-2025\', \'robozaps-phoenix-2026\'],',
    'Sanctuary\\\'s micro-barometer finger-pad sensors are sensitive to about five millinewtons against ' +
      'roughly three for human touch, but coverage, durability, and integration into training pipelines ' +
      'remain the open problems.\',\n    citations: [\'tactile-outlook-2025\', ' +
      '\'rr-sanctuary-tactile-2025\'],',
  ], [
    '\'Learning from, or transferring to, robots with different morphologies: different joint counts, ' +
      'action dimensions, and sensor suites. The Open X-Embodiment project pooled data from 22 robot ' +
      'embodiments into a single training mixture and showed that the resulting RT-X policies carry ' +
      'skills across platforms. The gain is not free, because each body defines its actions ' +
      'differently, and the field answers that mismatch with several incompatible conventions.\'',
    '\'Learning from, or transferring to, robots with different morphologies: different joint counts, ' +
      'action dimensions, and sensor suites. The Open X-Embodiment project pooled data from 22 robot ' +
      'embodiments into a single training mixture and showed that the resulting RT-X policies carry ' +
      'skills across platforms. Each body defines its actions differently, and the field aligns them ' +
      'with several incompatible conventions.\'',
  ], [
    '\'In imitation learning, the mismatch between the state distribution in the training ' +
      'demonstrations and the distribution the learned policy visits at deployment. The policy\\\'s own ' +
      'errors carry it into states the demonstrations never covered, where it is likelier to err again, ' +
      'so mistakes compound: Ross, Gordon, and Bagnell showed that a behavior-cloned policy with ' +
      'per-step error ε can incur total cost growing quadratically in episode length, and that no ' +
      'i.i.d.-trained policy can guarantee better.\'',
    '\'The mismatch between the state distribution of an imitation learner\\\'s training ' +
      'demonstrations and the distribution its learned policy visits at deployment. The policy\\\'s own ' +
      'errors carry it into states the demonstrations never covered, where it is likelier to err again, ' +
      'so mistakes compound: Ross, Gordon, and Bagnell showed that a behavior-cloned policy with ' +
      'per-step error ε can incur total cost growing quadratically in episode length, and that no ' +
      'i.i.d.-trained policy can guarantee better.\'',
  ], [
    '\'The reverse of the forward map: given a target pose for the end effector, find joint angles ' +
      'that reach it. The problem is nonlinear and can have no solution, one solution, or many. ' +
      'Numerical methods can search iteratively for a solution.\'',
    '\'Finding the joint angles that place the end effector at a target pose, the reverse of forward ' +
      'kinematics. The problem is nonlinear and can have no solution, one solution, or many, and ' +
      'numerical methods search for one iteratively.\'',
  ], [
    '\'The standard headline metric of robot learning evaluation: the fraction of attempted episodes ' +
      'in which the policy completes the task. Trial count, time limit and scene distribution belong ' +
      'with the reported rate. Toyota Research Institute\\\'s Large Behavior Model study analyzed 1,800 ' +
      'real-world rollouts and warned of a significant risk of statistical noise from insufficient ' +
      'power, not a measured prevalence of incorrect papers. An inconclusive comparison does not ' +
      'establish policy equivalence.\'',
    '\'The standard headline metric of robot learning evaluation: the fraction of attempted episodes ' +
      'in which the policy completes the task. Trial count, time limit and scene distribution belong ' +
      'with the reported rate. Toyota Research Institute\\\'s Large Behavior Model study analyzed 1,800 ' +
      'real-world rollouts and warned of a significant risk of statistical noise from insufficient ' +
      'power. An inconclusive comparison does not establish policy equivalence.\'',
  ], [
    '\'Locomotion through legs rather than wheels or tracks: support comes from discrete, ' +
      'intermittent footholds, so balance is re-established at every step instead of resting on a ' +
      'continuous contact patch. It is the problem that made sim-to-real reinforcement learning a ' +
      'shipping technology instead of a demo. Conventional controllers built it from elaborate state ' +
      'machines that explicitly trigger motion primitives and reflexes, a design that grew more complex ' +
      'without approaching the generality of animal locomotion. The ETH Zurich line replaced that stack ' +
      'outright: Lee and colleagues trained an ANYmal controller by reinforcement learning in ' +
      'simulation and generalized it zero-shot to alpine terrain on proprioception alone, and Miki and ' +
      'colleagues extended the same recipe to perceptive locomotion in the wild, the template humanoid ' +
      'programs have since been rerunning on two legs.\'',
    '\'Locomotion on legs rather than wheels or tracks: support comes from discrete, intermittent ' +
      'footholds, so balance is re-established at every step instead of resting on a continuous contact ' +
      'patch. Conventional controllers built it from elaborate state machines that explicitly trigger ' +
      'motion primitives and reflexes, a design that grew more complex without approaching the ' +
      'generality of animal locomotion. The ETH Zurich line replaced that stack: Lee and colleagues ' +
      'trained an ANYmal controller by reinforcement learning in simulation and generalized it ' +
      'zero-shot to alpine terrain on proprioception alone, and Miki and colleagues extended the same ' +
      'recipe to perceptive locomotion in the wild.\'',
  ], [
    '\'Sensing of the body\\\'s own state: joint positions and velocities, orientation, and contact, ' +
      'as opposed to exteroception, which senses the outside world through cameras or lidar. ' +
      'Proprioception is fast, cheap, and never occluded, and the ETH Zurich line showed how far it ' +
      'goes: Lee and colleagues trained an ANYmal controller that hiked mud, snow, rubble, and ' +
      'vegetation on proprioception alone, and Miki and colleagues kept it as the trusted channel the ' +
      'policy falls back on when its terrain map disagrees with its body.\'',
    '\'Sensing of the body\\\'s own state: joint positions and velocities, orientation, and contact, ' +
      'as opposed to exteroception, which senses the outside world through cameras or lidar. ' +
      'Proprioception is fast, cheap, and never occluded. Lee and colleagues trained an ANYmal ' +
      'controller that hiked mud, snow, rubble, and vegetation on proprioception alone, and Miki and ' +
      'colleagues kept it as the trusted channel the policy falls back on when its terrain map ' +
      'disagrees with its body.\'',
  ], [
    '\'Learning a policy from expert demonstrations rather than from a reward signal: the expert\\\'s ' +
      'recorded state-action pairs become a supervised training set, and the fitted mapping from ' +
      'observed state to action is the policy. Pomerleau\\\'s ALVINN (1988) instead trained on ' +
      'simulated road images before steering NAVLAB, and the recipe still underlies most learned ' +
      'manipulation. Its structural weakness is that the training distribution comes from the expert ' +
      'while deployment visits the states the learner itself induces, the mismatch DAgger was designed ' +
      'to repair.\'',
    '\'Learning a policy from expert demonstrations rather than from a reward signal: the expert\\\'s ' +
      'recorded state-action pairs become a supervised training set, and the fitted mapping from ' +
      'observed state to action is the policy. Pomerleau\\\'s ALVINN (1988) trained on simulated road ' +
      'images before steering NAVLAB, and the recipe still underlies most learned manipulation. Its ' +
      'structural weakness is that the training distribution comes from the expert while deployment ' +
      'visits the states the learner itself induces, the mismatch DAgger was designed to repair.\'',
  ], [
    '\'A four-parameter representation of a kinematic chain. LaValle describes revolute chains using ' +
      'an axial offset, an angle about the joint axis, the distance between successive axes, and the ' +
      'angle between those axes. Frame assignment, indexing and transform order must be specified; do ' +
      'not mix conventions. Near-parallel joint axes can make the parameters ill-conditioned; the ' +
      'product-of-exponentials formulation avoids that parameterization problem.\'',
    '\'A four-parameter representation of a kinematic chain. LaValle describes revolute chains using ' +
      'an axial offset, an angle about the joint axis, the distance between successive axes, and the ' +
      'angle between those axes. Conventions differ in frame assignment, indexing and transform order, ' +
      'so a parameter table must say which one it uses. Near-parallel joint axes can make the ' +
      'parameters ill-conditioned; the product-of-exponentials formulation avoids that parameterization ' +
      'problem.\'',
  ], [
    '\'Repositioning or reorienting a grasped object within the hand without setting it down: rolling ' +
      'a pen between the fingers, or walking a key around until it faces the lock. It is the skill that ' +
      'separates a hand from a gripper, and the one vision handles worst, because the fingers occlude ' +
      'exactly the contact that matters. Sanctuary demonstrated zero-shot in-hand reorientation with ' +
      'its 21-DoF hydraulic hands in 2024, and Holson\\\'s Robot Olympics makes it the gold-medal bar ' +
      'for tool use with the key-in-lock task.\'',
    '\'Repositioning or reorienting a grasped object within the hand without setting it down: rolling ' +
      'a pen between the fingers, or walking a key around until it faces the lock. Vision handles it ' +
      'poorly because the fingers occlude the contact that matters. Sanctuary demonstrated zero-shot ' +
      'in-hand reorientation with its 21-DoF hydraulic hands in 2024, and Holson\\\'s Robot Olympics ' +
      'makes it the gold-medal bar for tool use with the key-in-lock task.\'',
  ], [
    '\'Manipulation governed by making, holding, and breaking contact rather than by free-space ' +
      'motion: insertion, screwing, wiping, folding. Contact dynamics are discontinuous, since stick ' +
      'flips to slip across a friction boundary, so small sensing errors produce large outcome errors. ' +
      'That discontinuity is why these tasks are the stress test for touch-driven policies, and why ' +
      'TouchWorld\\\'s six-task tactile benchmark is built entirely from them.\'',
    '\'Manipulation governed by making, holding, and breaking contact rather than by free-space ' +
      'motion: insertion, screwing, wiping, folding. Contact dynamics are discontinuous, since stick ' +
      'flips to slip across a friction boundary, so small sensing errors produce large outcome errors. ' +
      'These tasks test touch-driven policies, and TouchWorld\\\'s six-task tactile benchmark is built ' +
      'entirely from them.\'',
  ], [
    '"The part of the scenario distribution that is individually rare and collectively decisive: a ' +
      'couch fallen off a truck, a pedestrian in dark clothing outside a crosswalk, a traffic cop ' +
      'waving cars through a red light. None of these appear often enough in any natural driving log to ' +
      'learn from directly, yet each can decide whether a system is deployable. Autonomous-driving ' +
      'teams attack the tail with simulation, and Waymo\'s Genie-3-based World Model exists for exactly ' +
      'this: events \'from a tornado to a casual encounter with an elephant\' are \'almost impossible ' +
      'to capture at scale in reality\'."',
    '"The part of the scenario distribution that is individually rare and collectively decisive: a ' +
      'couch fallen off a truck, a pedestrian in dark clothing outside a crosswalk, a traffic cop ' +
      'waving cars through a red light. None of these appear often enough in any natural driving log to ' +
      'learn from directly, yet each can decide whether a system is deployable. Autonomous-driving ' +
      'teams attack the tail with simulation, and Waymo\'s Genie-3-based World Model targets it: events ' +
      '\'from a tornado to a casual encounter with an elephant\' are \'almost impossible to capture at ' +
      'scale in reality\'."',
  ], [
    '"State estimation for a flying robot from camera images fused with inertial measurement unit ' +
      'data: the camera fixes long-term drift, the IMU provides high-rate accelerations between frames, ' +
      'and a filter or optimization over both yields the metric pose and velocity a flight controller ' +
      'needs. It is the standard onboard localization for small drones because it needs no external ' +
      'infrastructure and no GPS, and it is what lets a racing drone estimate its state from its own ' +
      'sensors alone. Swift\'s perception module pairs a visual-inertial estimator with a convolutional ' +
      'gate detector, fusing both in a Kalman filter to supply the control policy."',
    '"State estimation for a flying robot from camera images fused with inertial measurement unit ' +
      'data: the camera fixes long-term drift, the IMU provides high-rate accelerations between frames, ' +
      'and a filter or optimization over both yields the metric pose and velocity a flight controller ' +
      'needs. It is the standard onboard localization for small drones because it needs no external ' +
      'infrastructure and no GPS. Swift\'s perception module pairs a visual-inertial estimator with a ' +
      'convolutional gate detector, fusing both in a Kalman filter to supply the control policy."',
  ], [
    '"Surgery performed through small incisions with elongated instruments and a camera, instead of a ' +
      'large open incision. In the abdominal variant, laparoscopy, the workspace is insufflated with ' +
      'gas and the surgeon watches a 2D or 3D video feed while working through trocar ports, which ' +
      'trades patient recovery time for a loss of direct touch, natural hand-eye alignment, and fine ' +
      'dexterity. Surgical robots exist to give that trade-off back: wristed instruments restore ' +
      'dexterity at depth, the console restores a stable magnified stereo view, and motion scaling and ' +
      'tremor filtering restore precision. da Vinci systems are cleared for use in these procedures and ' +
      'have been used in millions of them."',
    '"Surgery performed through small incisions with elongated instruments and a camera, instead of a ' +
      'large open incision. In the abdominal variant, laparoscopy, the workspace is insufflated with ' +
      'gas and the surgeon watches a 2D or 3D video feed while working through trocar ports, which ' +
      'trades patient recovery time for a loss of direct touch, natural hand-eye alignment, and fine ' +
      'dexterity. Surgical robots recover those losses: wristed instruments restore dexterity at depth, ' +
      'the console restores a stable magnified stereo view, and motion scaling and tremor filtering ' +
      'restore precision. da Vinci systems are cleared for use in these procedures and have been used ' +
      'in millions of them."',
  ], [
    '\'Sensing of interaction forces at the instrument tip, rendered back to the operator as ' +
      'resistance at the controls. In teleoperation it closes the haptic loop that pure video control ' +
      'leaves open: without it a surgeon infers tissue contact through visual cues alone and can exert ' +
      'more force than intended. da Vinci 5 introduced Force Feedback instruments that measure and ' +
      'display subtle forces on tissue, the first offering of that capability on a surgical system in ' +
      'any modality, and Intuitive reported up to 43 percent less force exerted on tissue in ' +
      'preclinical trials with it. The capability also matters beyond the operator: a measured force ' +
      'signal is a data stream, and data streams are what later automation trains on.\'',
    '\'Sensing of interaction forces at the instrument tip, rendered back to the operator as ' +
      'resistance at the controls. In teleoperation it closes the haptic loop that pure video control ' +
      'leaves open: without it a surgeon infers tissue contact through visual cues alone and can exert ' +
      'more force than intended. da Vinci 5 introduced Force Feedback instruments that measure and ' +
      'display subtle forces on tissue, the first offering of that capability on a surgical system in ' +
      'any modality, and Intuitive reported up to 43 percent less force exerted on tissue in ' +
      'preclinical trials with it.\'',
  ], [
    '"Producing mission consumables at the destination from local materials instead of launching them ' +
      'from Earth: oxygen from the Martian atmosphere, water or metals from lunar regolith, propellant ' +
      'from both. NASA frames it as astronauts living off the land, because every kilogram made on site ' +
      'is a kilogram that does not ride a launch vehicle, and for a Mars return the arithmetic is ' +
      'stark, since the propellant for the trip home would dominate an all-Earth-supplied mass budget. ' +
      'The first demonstration on another planet was MOXIE, which electrolyzed atmospheric carbon ' +
      'dioxide into oxygen on the Perseverance rover. The robotics side of ISRU is excavation, ' +
      'drilling, and material handling in vacuum and regolith, the same contact-rich manipulation ' +
      'problems as terrestrial robotics under harsher constraints."',
    '"Producing mission consumables at the destination from local materials instead of launching them ' +
      'from Earth: oxygen from the Martian atmosphere, water or metals from lunar regolith, propellant ' +
      'from both. NASA frames it as astronauts living off the land, because every kilogram made on site ' +
      'is a kilogram that does not ride a launch vehicle, and for a Mars return the propellant for the ' +
      'trip home would dominate an all-Earth-supplied mass budget. The first demonstration on another ' +
      'planet was MOXIE, which electrolyzed atmospheric carbon dioxide into oxygen on the Perseverance ' +
      'rover. The robotics side of ISRU is excavation, drilling, and material handling in vacuum and ' +
      'regolith, the same contact-rich manipulation problems as terrestrial robotics under harsher ' +
      'constraints."',
  ], [
    '\'The dual of impedance control: force is measured and motion is commanded. A wrist force-torque ' +
      'sensor reads the contact force, the admittance law converts it into a position or velocity ' +
      'correction, and the underlying motion controller executes it. It is the natural choice on a ' +
      'stiff, geared, non-backdrivable arm, where the position loop is excellent but no torque command ' +
      'channel exists: admittance control synthesizes compliance in software on top of a ' +
      'position-controlled machine, at the cost of the measurement and the loop delay. Ott, Mukherjee ' +
      'and Nakamura\\\'s unified formulation shows the two schemes as the two causal assignments of the ' +
      'same interaction port.\'',
    '\'Compliant control that measures the contact force and commands motion in response, the dual of ' +
      'impedance control. A wrist force-torque sensor reads the contact force, the admittance law ' +
      'converts it into a position or velocity correction, and the underlying motion controller ' +
      'executes it. It suits a stiff, geared, non-backdrivable arm, where the position loop is ' +
      'excellent but no torque command channel exists: admittance control synthesizes compliance in ' +
      'software on top of a position-controlled machine, at the cost of the measurement and the loop ' +
      'delay. Ott, Mukherjee and Nakamura\\\'s unified formulation shows the two schemes as the two ' +
      'causal assignments of the same interaction port.\'',
  ], [
    '\'Raibert and Craig\\\'s decomposition of a contact task into orthogonal subspaces: in a task ' +
      'frame chosen from the geometry of the contact, force is controlled along the axes constrained by ' +
      'the environment and position is controlled along the free axes, never both on the same axis. ' +
      'Polishing a surface controls force normal to it and tracks a path tangent to it; sliding a block ' +
      'in a slot controls force pressing into the slot walls and position along the slot. Mason\\\'s ' +
      'predecessor analysis established how to pick the constrained and free directions from contact ' +
      'geometry, which is what makes the decomposition a property of the task rather than a tuning ' +
      'choice.\'',
    '\'Raibert and Craig\\\'s decomposition of a contact task into orthogonal subspaces: in a task ' +
      'frame chosen from the geometry of the contact, force is controlled along the axes constrained by ' +
      'the environment and position is controlled along the free axes, never both on the same axis. ' +
      'Polishing a surface controls force normal to it and tracks a path tangent to it; sliding a block ' +
      'in a slot controls force pressing into the slot walls and position along the slot. Mason\\\'s ' +
      'predecessor analysis established how to pick the constrained and free directions from contact ' +
      'geometry.\'',
  ], [
    '\'A map that divides space into cells and stores, per cell, the probability that it is occupied. ' +
      'Moravec and Elfes introduced it for wide-angle sonar: each range reading constrains both the ' +
      'volume the beam passed through and the volume where something reflected it, and many readings ' +
      'accumulate into a map of empty and occupied regions. Its defining property for a planner is the ' +
      'third state. A cell that no sensor has yet observed is held as unknown rather than assumed free, ' +
      'which is exactly the distinction a representation optimised for rendering cannot make.\'',
    '\'A map that divides space into cells and stores, per cell, the probability that it is occupied. ' +
      'Moravec and Elfes introduced it for wide-angle sonar: each range reading constrains both the ' +
      'volume the beam passed through and the volume where something reflected it, and many readings ' +
      'accumulate into a map of empty and occupied regions. Its defining property for a planner is the ' +
      'third state. A cell that no sensor has yet observed is held as unknown rather than assumed free, ' +
      'a distinction a representation optimised for rendering cannot make.\'',
  ], [
    '\'Learning the value of taking an action in a state, rather than learning a policy directly: the ' +
      'agent fits a function that predicts the return available from a state-action pair, and acts by ' +
      'picking the action its own estimate rates highest. Sutton and Barto set it out as the archetypal ' +
      'off-policy temporal-difference control method, where the update uses the best available next ' +
      'action instead of the action the behaviour policy actually took, which is exactly what lets the ' +
      'method learn from experience it did not generate. Every off-policy and offline algorithm the ' +
      'robotics literature uses is a descendant of that update, with machinery added to keep the value ' +
      'estimate from running away on data it cannot verify.\'',
    '\'Learning the value of taking an action in a state, rather than learning a policy directly: the ' +
      'agent fits a function that predicts the return available from a state-action pair, and acts by ' +
      'picking the action its own estimate rates highest. Sutton and Barto set it out as the archetypal ' +
      'off-policy temporal-difference control method, where the update uses the best available next ' +
      'action instead of the action the behaviour policy took, which lets the method learn from ' +
      'experience it did not generate. Many off-policy and offline algorithms in robotics build on that ' +
      'update, adding machinery that keeps the value estimate from running away on data it cannot ' +
      'verify.\'',
  ], [
    '\'A learning method that can improve one policy from data generated by another, which means old ' +
      'experience stays usable after the policy has moved on. Soft actor-critic is the robotics ' +
      'reference point: Haarnoja and colleagues combined off-policy updates with a maximum-entropy ' +
      'objective specifically to attack the sample complexity that keeps model-free deep RL off real ' +
      'hardware, and reported substantially better sample efficiency than on-policy methods on the same ' +
      'tasks. The distinction is about data reuse rather than taxonomy, and on a real robot it is the ' +
      'difference between a feasible experiment and an impossible one.\'',
    '\'A learning method that can improve one policy from data generated by another, so old ' +
      'experience stays usable after the policy has moved on. Soft actor-critic is the robotics ' +
      'reference point: Haarnoja and colleagues combined off-policy updates with a maximum-entropy ' +
      'objective to attack the sample complexity that keeps model-free deep RL off real hardware, and ' +
      'reported substantially better sample efficiency than on-policy methods on the same tasks.\'',
  ], [
    '\'The store of past transitions an off-policy learner samples its gradient batches from, which ' +
      'is the mechanism that makes data reuse concrete. Its contents need not come from the current ' +
      'policy or even from the learner at all: RLPD trains from a buffer holding prior offline data ' +
      'alongside fresh online experience, and HIL-SERL seeds one with human demonstrations before any ' +
      'autonomous collection starts. The buffer is also where the distinction between online and ' +
      'offline learning collapses to a question of whether anything new is still being added.\'',
    '\'The store of past transitions an off-policy learner samples its gradient batches from. Its ' +
      'contents need not come from the current policy or even from the learner at all: RLPD trains from ' +
      'a buffer holding prior offline data alongside fresh online experience, and HIL-SERL seeds one ' +
      'with human demonstrations before any autonomous collection starts.\'',
  ], [
    '\'Training on real hardware without a human returning the scene to a start state between ' +
      'attempts, which is what stands between a working algorithm and an unattended experiment. Sharma ' +
      'and colleagues distinguish deployed-policy regret over training from continuing average reward. ' +
      'Their base setting has no episodic resets; a separate extension for non-ergodic settings adds a ' +
      'bounded, cost-decremented intervention budget. EARL’s experiments instead schedule occasional ' +
      'resets and report both learning curves and final deployed-policy performance. Gupta and ' +
      'colleagues sequence task-specific policies with a designer-provided task graph, so learned ' +
      're-centering, pickup and flip-up can restore conditions for in-hand reorientation after a ' +
      'dropped object. Their D’Hand/Sawyer experiments also covered pipe insertion; the reported ' +
      'reset-free training still used supplied rewards and task graphs, motion capture for in-hand ' +
      'manipulation and scripted pickup-arm motion.\'',
    '\'Training on real hardware without a human returning the scene to a start state between ' +
      'attempts. Sharma and colleagues distinguish deployed-policy regret over training from continuing ' +
      'average reward. Their base setting has no episodic resets; a separate extension for non-ergodic ' +
      'settings adds a bounded, cost-decremented intervention budget. EARL’s experiments instead ' +
      'schedule occasional resets and report both learning curves and final deployed-policy ' +
      'performance. Gupta and colleagues sequence task-specific policies with a designer-provided task ' +
      'graph, so learned re-centering, pickup and flip-up can restore conditions for in-hand ' +
      'reorientation after a dropped object. Their D’Hand/Sawyer experiments also covered pipe ' +
      'insertion; the reported reset-free training still used supplied rewards and task graphs, motion ' +
      'capture for in-hand manipulation and scripted pickup-arm motion.\'',
  ], [
    '\'The machinery-safety procedure that turns an informal worry about a machine into a documented ' +
      'engineering obligation. ISO 12100:2010 is the general-principles standard behind it: its public ' +
      'abstract describes procedures for identifying hazards and for estimating and evaluating the ' +
      'risks associated with them across the phases of a machine life cycle, together with guidance on ' +
      'documenting and verifying what the assessment concluded. Its output is a record of which hazards ' +
      'were found, what was done about each, and why the residual risk was judged acceptable, which is ' +
      'what makes safety auditable rather than asserted.\'',
    '\'The documented machinery-safety procedure for finding a machine\\\'s hazards and judging their ' +
      'risks. ISO 12100:2010 is the general-principles standard behind it: its public abstract ' +
      'describes procedures for identifying hazards and for estimating and evaluating the risks ' +
      'associated with them across the phases of a machine life cycle, together with guidance on ' +
      'documenting and verifying what the assessment concluded. Its output is a record of which hazards ' +
      'were found, what was done about each, and why the residual risk was judged acceptable, so the ' +
      'safety argument can be audited.\'',
  ], [
    '\'The collaborative operating mode that permits contact between a robot and a person and makes ' +
      'it safe by bounding what the contact can do, rather than by preventing it. The threshold is ' +
      'biomechanical and stated per body region, which is what turns a marketing word into a claim with ' +
      'numbers behind it: Haddadin, Albu-Schaeffer and Hirzinger established the measurement tradition ' +
      'with impact experiments on the human-robot collision itself, and later force-threshold studies ' +
      'report limits by body region and contact geometry. A cobot certified under this mode has been ' +
      'measured, not merely described.\'',
    '\'The collaborative operating mode that permits contact between a robot and a person and makes ' +
      'it safe by bounding what the contact can do. The threshold is biomechanical and stated per body ' +
      'region: Haddadin, Albu-Schaeffer and Hirzinger established the measurement tradition with impact ' +
      'experiments on the human-robot collision itself, and later force-threshold studies report limits ' +
      'by body region and contact geometry.\'',
  ], [
    '\'The ISO 13849-1:2023 counterpart of a safety integrity level, and the rating a machinery ' +
      'integrator in Europe most often has to satisfy. It grades a safety-related control function on a ' +
      'discrete scale, and the standard supplies the design methodology by which a claimed level is ' +
      'justified rather than asserted. Like the IEC 61508 levels, it presumes a specification of the ' +
      'function that can be checked against an implementation, which is exactly what a learned policy ' +
      'does not provide.\'',
    '\'The ISO 13849-1:2023 counterpart of a safety integrity level, and the rating a machinery ' +
      'integrator in Europe most often has to satisfy. It grades a safety-related control function on a ' +
      'discrete scale, and the standard supplies the design methodology by which a claimed level is ' +
      'justified. Like the IEC 61508 levels, it presumes a specification of the function that can be ' +
      'checked against an implementation, which a learned policy does not provide.\'',
  ], [
    '\'A structured, documented argument that a system is acceptably safe for a given application in ' +
      'a given environment, with the evidence for each step of the argument attached to it. The ' +
      'tradition exists because testing alone cannot reach the confidence an autonomous system needs, ' +
      'so the artifact is an argument rather than a test report. UL 4600 applies the approach to ' +
      'autonomous products, and the Goal Structuring Notation community standard gives the graphical ' +
      'notation the argument is usually written in, with goals decomposed into subgoals until each ' +
      'rests on cited evidence.\'',
    '\'A structured, documented argument that a system is acceptably safe for a given application in ' +
      'a given environment, with the evidence for each step of the argument attached to it. The ' +
      'tradition exists because testing alone cannot reach the confidence an autonomous system needs. ' +
      'UL 4600 applies the approach to autonomous products, and the Goal Structuring Notation community ' +
      'standard gives the graphical notation the argument is usually written in, with goals decomposed ' +
      'into subgoals until each rests on cited evidence.\'',
  ], [
    '\'Deciding, at run time, whether the input a model is being asked about resembles the data it ' +
      'was trained on, so that a policy can decline rather than extrapolate. In robotics the detector ' +
      'runs on the live observation stream and its output gates the policy: Sinha and colleagues use a ' +
      'fast anomaly detector on the observation to trigger a reactive fallback plan while the slower ' +
      'reasoning runs, which is the practical shape of the technique. It answers a different question ' +
      'from uncertainty in the output, and a policy can be confidently wrong on an input it has never ' +
      'seen.\'',
    '\'Deciding, at run time, whether the input a model is being asked about resembles the data it ' +
      'was trained on, so that a policy can decline rather than extrapolate. In robotics the detector ' +
      'runs on the live observation stream and its output gates the policy: Sinha and colleagues use a ' +
      'fast anomaly detector on the observation to trigger a reactive fallback plan while the slower ' +
      'reasoning runs. It answers a different question from uncertainty in the output, and a policy can ' +
      'be confidently wrong on an input it has never seen.\'',
  ], [
    '\'A scalar function of the state, positive on a set you want the system to stay inside, whose ' +
      'derivative condition can be enforced as a constraint on the commanded input, so forward ' +
      'invariance of the safe set becomes a linear constraint in an optimisation the controller solves ' +
      'each step. Ames and colleagues survey the theory and its applications. Its practical importance ' +
      'is architectural: because the constraint filters whatever input arrives, an arbitrary and ' +
      'unverified controller can be wrapped by a verified one, and the guarantee belongs to the ' +
      'wrapper.\'',
    '\'A scalar function of the state, positive on a set you want the system to stay inside, whose ' +
      'derivative condition can be enforced as a constraint on the commanded input, so forward ' +
      'invariance of the safe set becomes a linear constraint in an optimisation the controller solves ' +
      'each step. Ames and colleagues survey the theory and its applications. Because the constraint ' +
      'filters whatever input arrives, an arbitrary and unverified controller can be wrapped by a ' +
      'verified one, and the guarantee belongs to the wrapper.\'',
  ], [
    '\'A machine function, initiated by a single human action, that brings a hazardous motion to a ' +
      'halt. ISO 13850:2015 specifies the functional requirements and design principles for it ' +
      'independently of the energy the machine uses, and names IEC 60204-1:2016 for the electrical ' +
      'realisation. Two properties are commonly misunderstood: it is a complement to guarding rather ' +
      'than a substitute for it, since it depends on a person noticing the hazard in time, and stopping ' +
      'is not the same as removing power, which is why the electrical standard distinguishes stop ' +
      'categories.\'',
    '\'A machine function, initiated by a single human action, that brings a hazardous motion to a ' +
      'halt. ISO 13850:2015 specifies the functional requirements and design principles for it ' +
      'independently of the energy the machine uses, and names IEC 60204-1:2016 for the electrical ' +
      'realisation. It complements guarding and cannot replace it, since it depends on a person ' +
      'noticing the hazard in time, and stopping differs from removing power, which is why the ' +
      'electrical standard distinguishes stop categories.\'',
  ], [
    '\'A warehouse subsystem of fixed racking, cranes or shuttles, and control software that stores ' +
      'and retrieves unit loads without a human walking an aisle. Symbotic\\\'s systems and Ocado\\\'s ' +
      'customer fulfilment centres are large-scale descendants: high-bay storage, bots that fetch, and ' +
      'pick stations arranged around the software. An AS/RS buys density and precision at the price of ' +
      'being the building\\\'s skeletal structure, which is why it appears mostly in new builds.\'',
    '\'A warehouse subsystem of fixed racking, cranes or shuttles, and control software that stores ' +
      'and retrieves unit loads without a human walking an aisle. Symbotic\\\'s systems and Ocado\\\'s ' +
      'customer fulfilment centres are large-scale descendants: high-bay storage, bots that fetch, and ' +
      'pick stations arranged around the software. An AS/RS gives density and precision but becomes ' +
      'part of the building\\\'s structure, which is why it appears mostly in new builds.\'',
  ], [
    '\'A self-navigating transport vehicle that plans its own paths through a facility using onboard ' +
      'sensors, as distinct from an automated guided vehicle that follows fixed infrastructure like ' +
      'tape or wire. Amazon\\\'s Proteus and the case-handling robots inside Symbotic\\\'s systems are ' +
      'AMRs at fleet scale, and the fleet manager\\\'s traffic control, not any single robot\\\'s ' +
      'navigation, is the hard engineering.\'',
    '\'A self-navigating transport vehicle that plans its own paths through a facility using onboard ' +
      'sensors, as distinct from an automated guided vehicle that follows fixed infrastructure like ' +
      'tape or wire. Amazon\\\'s Proteus and the case-handling robots inside Symbotic\\\'s systems are ' +
      'AMRs at fleet scale, where the fleet manager\\\'s traffic control is the hard engineering.\'',
  ], [
    '\'The warehouse principle of moving stored items to a stationary human at a pick station, ' +
      'instead of sending the human to walk the shelves. It inverts the economics of order picking: the ' +
      'picker stops being paid to travel and spends nearly the whole shift handling items, which raises ' +
      'throughput per person and simultaneously defines the ceiling an automated picker must beat. ' +
      'Sequoia and Ocado\\\'s pick walls are both goods-to-person systems.\'',
    '\'The warehouse principle of moving stored items to a stationary human at a pick station, ' +
      'instead of sending the human to walk the shelves. The picker spends nearly the whole shift ' +
      'handling items instead of travelling, which raises throughput per person and sets the rate an ' +
      'automated picker must beat. Sequoia and Ocado\\\'s pick walls are both goods-to-person ' +
      'systems.\'',
  ], [
    '\'The time an automation investment takes to return its cost: total cell capital divided by the ' +
      'monthly value it produces, most often displaced labour. Operations buyers screen against a ' +
      'horizon rather than optimizing the number, and vendor guidance for robot cells quotes 12 to 24 ' +
      'month paybacks in multi-shift operation, stretching toward 36 in single shift. A robot whose ' +
      'payback misses the horizon is not a bad robot; it is a bad fit for that facility\\\'s wage and ' +
      'throughput.\'',
    '\'The time an automation investment takes to return its cost: total cell capital divided by the ' +
      'monthly value it produces, most often displaced labour. Operations buyers screen it against a ' +
      'horizon, and vendor guidance for robot cells quotes 12 to 24 month paybacks in multi-shift ' +
      'operation, stretching toward 36 in single shift.\'',
  ], [
    '\'How often an automated system needs a human to touch it: the fraction of cycles that end in a ' +
      'jam, mispick, or fault requiring attention, or equivalently one minus the per-cycle success ' +
      'rate. The economics of the rate are set by the intervention time, not the rate alone: a 1 ' +
      'percent intervention rate cleared in seconds is cheaper per pick than a 0.1 percent rate that ' +
      'stops the line for an hour, which is why deployed systems are engineered around cheap recovery ' +
      'rather than perfect autonomy.\'',
    '\'How often an automated system needs a human to touch it: the fraction of cycles that end in a ' +
      'jam, mispick, or fault requiring attention, or equivalently one minus the per-cycle success ' +
      'rate. The economics of the rate are set by the intervention time, not the rate alone: a 1 ' +
      'percent intervention rate cleared in seconds is cheaper per pick than a 0.1 percent rate that ' +
      'stops the line for an hour, which is why deployed systems are engineered around cheap ' +
      'recovery.\'',
  ], [
    '\'The number of future actions a chunked policy emits in one inference, the chunk length H. The ' +
      'policy predicts that many actions in a single forward pass whether or not it will execute them ' +
      'all: π0 predicts 50 actions, one second at 50 Hz, and Diffusion Policy predicts 16. What a ' +
      'reader of a results table needs alongside that number is how many of the predicted actions the ' +
      'system actually runs, which is the committed horizon.\'',
    '\'The number of future actions a chunked policy emits in one inference, the chunk length H. The ' +
      'policy predicts that many actions in a single forward pass whether or not it will execute them ' +
      'all: π0 predicts 50 actions, one second at 50 Hz, and Diffusion Policy predicts 16. How many of ' +
      'them the system runs is the committed horizon.\'',
  ]]],
]);

function applyExact(text: string, edits: readonly (readonly [string, string])[], message = drift): string {
  let result = text;
  for (const [from, to] of edits) {
    const parts = result.split(from);
    if (!from || parts.length !== 2) throw new Error(message);
    // Joined rather than String#replace: a `$'` in the text would be read as a replacement pattern.
    result = parts.join(to);
  }
  return result;
}

/**
 * The one owner-approved exception to "every citation stays": secondary
 * sources the owner sweep replaced with primary sources on the same claims.
 * Exactly these ids, on exactly these articles, may leave the body and the
 * citations list. Every other id on these articles, and every id on every
 * other article, still binds.
 */
export const DROPPED_FOR_PRIMARIES = {
  reason: 'owner sweep 20260929: secondary sources dropped for primaries',
  ids: new Map<string, readonly string[]>([
    ['content/frontier/bear-case.mdx', ['unitree-profit-2026']],
    ['content/frontier/competing-theses.mdx', ['figure-8hr-shift-2026']],
    ['content/frontier/dexterity.mdx', ['wikipedia-humanoid-hand-2026']],
    ['content/frontier/reliability-gap.mdx', ['figure-8hr-shift-2026']],
  ]) as ReadonlyMap<string, readonly string[]>,
} as const;

const withoutListed = (head: string, ids: readonly string[]) => ids.length === 0 ? head
  : head.replace(/\ncitations:\n(?: {2}- [^\n]+\n)*/, (block) =>
    block.split('\n').filter((line) => !ids.some((id) => line === `  - ${id}`)).join('\n'));

/**
 * The article obligations of a domain-pass rewrite: the frontmatter differs
 * only by citation ids appended to its citations list (and the corrected
 * descriptions above), every citation the
 * body had is still cited, and the figure and component mounts are the same
 * mounts in the same order with the same attributes (and the corrected
 * mounts above). Prose may change. The only ids exempt are the ones
 * `DROPPED_FOR_PRIMARIES` lists for the path.
 */
export function keepsDomainPassObligations(path: string, prior: string, current: string): boolean {
  const corrections = CORRECTED_SOURCES.get(path);
  if (corrections) {
    return corrections.every(([from]) => prior.split(from).length === 2) &&
      applyExact(prior, corrections) === current;
  }
  if (!path.startsWith('content/') || !path.endsWith('.mdx')) return false;
  const head = frontmatter(current);
  const priorFull = frontmatter(prior);
  if (!priorFull || !head) return false;
  const dropped = new Set(DROPPED_FOR_PRIMARIES.ids.get(path) ?? []);
  const after = citationList(head);
  const removed = citationList(priorFull).filter((id) => dropped.has(id) && !after.includes(id));
  const priorHead = withoutListed(priorFull, removed);
  const before = citationList(priorHead);
  const added = after.slice(before.length);
  if (after.slice(0, before.length).join('\n') !== before.join('\n') ||
    added.some((id) => !/^[a-z0-9][a-z0-9.-]*$/.test(id) || before.includes(id)) ||
    new Set(added).size !== added.length) {
    return false;
  }
  const withoutAdded = head.replace(/\ncitations:\n(?: {2}- [^\n]+\n)*/, (block) =>
    block.split('\n').filter((line) => !added.some((id) => line === `  - ${id}`)).join('\n'));
  const description = CORRECTED_DESCRIPTIONS.get(path);
  const expectedHead = description
    ? priorHead.split('\n').map((line) => (line === description[0] ? description[1] : line)).join('\n')
    : priorHead;
  if (withoutAdded !== expectedHead) return false;
  const kept = citedIds(current);
  if ([...citedIds(prior)].some((id) => !kept.has(id) && !dropped.has(id))) return false;
  const corrected = CORRECTED_MOUNTS.get(path);
  const expected = mounts(prior).map((mount) => corrected?.get(mount) ?? mount);
  return JSON.stringify(expected) === JSON.stringify(mounts(current));
}

/**
 * The pre-pass bytes rebuilt from the live successor. Throws unless every
 * obligation above holds. Exported so the obligations can be exercised apart
 * from the byte pins that normally gate them.
 */
export function verifyDomainPassSource(source: DomainPassSource, live: Buffer): Buffer {
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
    !keepsDomainPassObligations(path, rebuilt, current)) {
    throw new Error(drift);
  }
  return prior;
}

// Older checks read many artifacts through this layer; the review is parsed
// and each successor verified once per exact byte content.
const reviewCache = new Map<string, DomainPassReview>();
const priorCache = new Map<string, Buffer>();

export function loadDomainPassReview(root: string): DomainPassReview {
  let bytes: Buffer;
  let review: DomainPassReview;
  try {
    bytes = readFileSync(join(root, reviewFile));
    const cached = reviewCache.get(`${root}\0${digest(bytes)}`);
    if (cached) return cached;
    review = JSON.parse(bytes.toString()) as DomainPassReview;
  } catch (error) {
    throw new Error(`${drift}: ${(error as Error).message}`);
  }
  if (bytes.length !== reviewPin.bytes || digest(bytes) !== reviewPin.sha256 ||
    review?.schemaVersion !== 'domain-pass-continuity-v1' || review.name !== 'domain-pass-20261006' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now()) {
    throw new Error(drift);
  }
  const paths = new Set(review.sources?.map(({ after }) => after?.path));
  if (review.sources?.length !== successors.size || paths.size !== successors.size ||
    review.sources.some(({ after }) => !successors.has(after?.path) ||
      !same(after, after.path, ...successors.get(after.path)!))) {
    throw new Error(drift);
  }
  reviewCache.set(`${root}\0${digest(bytes)}`, review);
  return review;
}

function rebuiltPrior(root: string, path: string, live: Buffer): Buffer {
  const key = `${root}\0${path}\0${digest(live)}`;
  let prior = priorCache.get(key);
  if (!prior) {
    const source = loadDomainPassReview(root).sources.find(({ after }) => after.path === path)!;
    prior = verifyDomainPassSource(source, live);
    priorCache.set(key, prior);
  }
  return Buffer.from(prior);
}

/**
 * The citation list a frontmatter P1 ledger row was written against. A
 * reviewed successor appends its new ids to the list; those ids have their
 * own registry audit rows, so the P1 row keeps certifying the list it
 * declared. Any other article, or bytes other than the reviewed successor,
 * get their live list back unchanged.
 */
export function preDomainPassCitations(root: string, path: string, citations: readonly string[]): readonly string[] {
  const pinned = successors.get(path);
  if (!pinned) return citations;
  // The newer image-mount (2026-10-13, extended 2026-10-15), adjacent cut (2026-10-14), data-hardware cut (2026-10-13), frontier length-cut, length-cut (manipulation, classical and rl-sim2real),
  // world-models length-cut, word-budget trim and figure-mount layers hand back the domain-pass successor first.
  const ref = { path, bytes: 0, sha256: '' };
  const live = figureMountPredecessor(root, ref, wordBudgetTrimPredecessor(root, ref,
    worldModelsLengthCutPredecessor(root, ref, lengthCutPredecessor(root, ref,
      frontierLengthCutPredecessor(root, ref, dataHardwareCutPredecessor(root, ref, adjacentCutPredecessor(root, ref, imageMountPredecessor(root, ref, readFileSync(join(root, path))))))))));
  if (live.length !== pinned[0] || digest(live) !== pinned[1]) return citations;
  const prior = citationList(frontmatter(rebuiltPrior(root, path, live).toString()) ?? '');
  const current = citationList(frontmatter(live.toString()) ?? '');
  if (current.join('\n') !== citations.join('\n')) return citations;
  return prior;
}

/** The paths the domain-pass review holds a successor for. */
export const domainPassSuccessorPaths = (): readonly string[] => [...successors.keys()];

/**
 * The bytes the caller's exact checks should see. A reference that names the
 * live bytes, a path with no reviewed successor, and any bytes other than the
 * reviewed successor come back unchanged, so the older layers and checks
 * still decide them. The reviewed successor is verified, and its rebuilt
 * predecessor returned.
 */
export function domainPassPredecessor(root: string, ref: Artifact, live: Buffer): Buffer {
  const pinned = successors.get(ref.path);
  if (!pinned || live.length !== pinned[0]) return live;
  const liveHash = digest(live);
  if (liveHash !== pinned[1] || (ref.bytes === live.length && ref.sha256 === liveHash)) return live;
  return rebuiltPrior(root, ref.path, live);
}

const checkerReviewFile = `${DOMAIN_PASS_CONTINUITY_DIR}checker-transition.json`;
const checkerDrift = 'domain pass checker continuity drift';
const checkerPath = 'lib/audit-local-basis.ts';
export type DomainPassCheckerEdit = DomainPassEdit & { suite: string };
export type DomainPassCheckerReview = {
  schemaVersion: 'domain-pass-checker-revision-v1';
  name: 'domain-pass-reader';
  reviewedBy: string;
  rationale: string;
  observedAt: string;
  archivedFrom: string;
  before: Artifact;
  after: Artifact;
  edits: DomainPassCheckerEdit[];
};

// BEGIN domain-pass checker pins (written by scripts/record-domain-pass-continuity.ts --checker)
/** The reviewed checker evidence file; a changed review needs a reviewed code change too. */
const checkerReviewPin = { bytes: 2246, sha256: 'f2348ba4034c9262347087272c1e4d80035826293611260bce3ee67f1d321bcc' };

/** The SEO-pass reader head the revision edits, and the reviewed revision. */
const checkerBefore = { bytes: 114290, sha256: 'f115c68135aaac380af0e10ebecc721bcb613d5434f24b007f51879ed6829f3e' };
const checkerAfter = { bytes: 114290, sha256: '6d377744d0d141a2605683c9b083d043e47f7ba17e7b4d651329d877b6cd9962' };
// END domain-pass checker pins

/** The one checker line a domain-pass revision may change: a suite's reviewed live hash. */
const suiteHashLine = /^ {4}currentTestHash: '[0-9a-f]{64}',\n$/;
/** The historical-verification entry of one suite, from its key line to its closing brace. */
const suiteEntry = (checker: string, suite: string) => {
  const start = checker.indexOf(`\n  '${suite}': {\n`);
  return start < 0 ? '' : checker.slice(start, checker.indexOf('\n  },\n', start) + 1);
};

export function loadDomainPassCheckerReview(root: string): DomainPassCheckerReview {
  let bytes: Buffer;
  let review: DomainPassCheckerReview;
  try {
    bytes = readFileSync(join(root, checkerReviewFile));
    review = JSON.parse(bytes.toString()) as DomainPassCheckerReview;
  } catch (error) {
    throw new Error(`${checkerDrift}: ${(error as Error).message}`);
  }
  if (bytes.length !== checkerReviewPin.bytes || digest(bytes) !== checkerReviewPin.sha256 ||
    review?.schemaVersion !== 'domain-pass-checker-revision-v1' || review.name !== 'domain-pass-reader' ||
    !review.reviewedBy || !(review.rationale?.length > 80) || !Number.isFinite(Date.parse(review.observedAt)) ||
    Date.parse(review.observedAt) > Date.now() || !/^[0-9a-f]{40}$/.test(review.archivedFrom ?? '') ||
    !same(review.before, checkerPath, checkerBefore.bytes, checkerBefore.sha256) ||
    !same(review.after, checkerPath, checkerAfter.bytes, checkerAfter.sha256) || !review.edits?.length ||
    new Set(review.edits.map(({ suite }) => suite)).size !== review.edits.length ||
    review.edits.some(({ suite, before, after }) => typeof suite !== 'string' || !/^tests\/[a-z0-9/-]+\.test\.ts$/.test(suite) ||
      typeof before !== 'string' || typeof after !== 'string' ||
      !suiteHashLine.test(before) || !suiteHashLine.test(after) || before === after)) {
    throw new Error(checkerDrift);
  }
  return review;
}

/**
 * The checker bytes the SEO-pass checker layer should see. Checker bytes
 * other than the reviewed revision come back unchanged, so the older layers
 * still decide them. The reviewed revision is admitted only as edits that
 * each swap the reviewed live hash of one historical verification suite
 * whose assertions a domain pass brought up to date, inside that suite's own
 * entry, and the SEO-pass head is rebuilt from it and returned. The
 * parallel-local checker layer of 2026-10-11 sees the live checker first.
 */
export function domainPassCheckerPredecessor(root: string, checker: Buffer): Buffer {
  const live = parallelLocalCheckerPredecessor(root, checker);
  if (live.length !== checkerAfter.bytes || digest(live) !== checkerAfter.sha256) return live;
  const review = loadDomainPassCheckerReview(root);
  const current = live.toString();
  const edits = review.edits.map(({ before, after }) => [before, after] as const);
  const rebuilt = applyExact(current, edits.map(([from, to]) => [to, from] as const).reverse(), checkerDrift);
  const prior = Buffer.from(rebuilt);
  if (!same(review.before, checkerPath, prior.length, digest(prior)) ||
    applyExact(rebuilt, edits, checkerDrift) !== current ||
    review.edits.some(({ suite, before, after }) => suiteEntry(rebuilt, suite).split(before).length !== 2 ||
      suiteEntry(current, suite).split(after).length !== 2)) {
    throw new Error(checkerDrift);
  }
  return prior;
}
