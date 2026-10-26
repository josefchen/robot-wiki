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
import { answerOptionsPredecessor } from './audit-answer-options-continuity.ts';
import { explainerMountPredecessor } from './audit-explainer-mount-continuity.ts';
import { figureMountPredecessor } from './audit-figure-mount-continuity.ts';
import { imageMountPredecessor } from './audit-image-mount-continuity.ts';
import { dataHardwareCutPredecessor } from './audit-length-cut-data-hardware-continuity.ts';
import { adjacentCutPredecessor } from './audit-length-cut-adjacent-continuity.ts';
import { frontierLengthCutPredecessor } from './audit-length-cut-frontier-continuity.ts';
import { worldModelsLengthCutAppendedCitations, worldModelsLengthCutPredecessor } from './audit-length-cut-world-models-continuity.ts';
import { lengthCutAppendedCitations, lengthCutPredecessor } from './audit-length-cut-continuity.ts';
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
const reviewPin = { bytes: 1452419, sha256: 'fc9a6c5b088c5c8843fde953796c83deed16460e0e7d62da72bcf96d4552ce67' };

/** Reviewed successor bytes per path, so other bytes pass through without reading the review. */
const successors: ReadonlyMap<string, readonly [number, string]> = new Map([
  ['components/interactive/reliability-compounding.tsx', [24304, '55f577b59c08c08a7dbec44e30d1f57f9270259de919d2c45fc8e67e00c74e8a']],
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
  ['data/glossary.ts', [73649, '1a266e482aa554e879ca452c69904b912e5880c09aae6a12a742f9405c283891']],
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
 * citation or number changes. Its second round of 2026-10-16 opens every
 * definition with "X is ...", the term it defines, and shortens the rest:
 * a swap that held a definition before now ends at the new wording (the
 * three that held part of one take the whole definition line), and every
 * other definition takes one swap of its whole literal. The success-rate
 * gloss swaps its closing equivalence caveat, which evaluation-crisis still
 * states on the same citation, for Snyder et al.'s trial-count result
 * (frontier measures R-I1). Terms, ids, citations and every number stay.
 * A listed file must equal its predecessor with exactly these swaps, or be
 * an owner-approved redo of that corrected file under REDONE_SOURCES below;
 * no other non-article source is admitted.
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
    '\'The specific operating conditions an automated driving system is designed for: geography, ' +
      'road types, speed range, weather, and time of day. SAE J3016 makes the ODD part of the ' +
      'level definitions, which is why a Level 4 robotaxi that works in Phoenix and fails in a ' +
      'blizzard is not a contradiction but an ODD boundary. Crash-rate comparisons against human ' +
      'benchmarks align the human baseline to the same vehicle types, road types, and locations ' +
      'as the system\\\'s ODD, precisely so the comparison is not rigged.\'',
    '\'An operational design domain (ODD) is the set of conditions an automated driving system ' +
      'is designed for: geography, road types, speed range, weather and time of day. SAE J3016 ' +
      'builds the ODD into the level definitions, so a Level 4 robotaxi can work in Phoenix and ' +
      'fail in a blizzard. Crash-rate comparisons match the human baseline to the ODD\\\'s ' +
      'vehicle types, road types and locations.\'',
  ], [
    '\'A sensory nerve ending that fires under mechanical stimuli such as pressure, vibration, ' +
      'or skin stretch. The glabrous skin of the human hand carries about 17,000 low-threshold ' +
      'mechanoreceptors, roughly 1,000 of them packed at each fingertip, in four varieties that ' +
      'trade spatial localization against temporal response. Robot tactile sensors are closing ' +
      'on raw force threshold but remain far sparser: the best documented arrays put seven ' +
      'sensing cells on a fingerpad where the human finger packs about a thousand ' +
      'receptors.\',\n    citations: [\'macefield-touch-2022\', \'brooks-dexterity-2025\']',
    '\'A mechanoreceptor is a sensory nerve ending that fires under mechanical stimuli such as ' +
      'pressure, vibration or skin stretch. The human hand\\\'s glabrous skin has about 17,000 ' +
      'low-threshold mechanoreceptors, roughly 1,000 per fingertip, in four varieties trading ' +
      'spatial localization against temporal response. Sanctuary\\\'s Phoenix finger pads use a ' +
      'seven-cell micro-barometer sensitive to 5 mN, against about 3 mN for humans. Meta\\\'s ' +
      'Digit 360 research fingertip resolves normal force to 1.01 mN.\',\n    citations: ' +
      '[\'macefield-touch-2022\', \'brooks-dexterity-2025\', \'rr-sanctuary-tactile-2025\', ' +
      '\'digit-360-2024\']',
  ], [
    '\'Sensing contact through the robot\\\'s skin: pressure arrays, barometric cells, and ' +
      'optical fingertip cameras that measure where contact happens, how hard it presses, and ' +
      'whether the object is starting to slip. It is the modality manipulation runs on after the ' +
      'fingers close, when the camera can no longer see the contact. Sanctuary\\\'s ' +
      'micro-barometer arrays resolve about five millinewtons per cell against roughly three for ' +
      'a human fingertip, but coverage, durability, and integration into training pipelines ' +
      'remain the open problems.\',\n    citations: [\'tactile-outlook-2025\', ' +
      '\'robozaps-phoenix-2026\']',
    '\'Tactile sensing is sensing contact through a robot\\\'s skin with pressure arrays, ' +
      'barometric cells or optical fingertip cameras. They measure contact location, pressure ' +
      'and slip, and matter most once closed fingers hide the contact from the camera. ' +
      'Sanctuary\\\'s micro-barometer finger pads detect about five millinewtons, against ' +
      'roughly three for human touch. Coverage, durability and training-pipeline integration ' +
      'remain open problems.\',\n    citations: [\'tactile-outlook-2025\', ' +
      '\'rr-sanctuary-tactile-2025\']',
  ], [
    '\'Learning from, or transferring to, robots with different morphologies: different joint counts, ' +
      'action dimensions, and sensor suites. The Open X-Embodiment project pooled data from 22 robot ' +
      'embodiments into a single training mixture and showed that the resulting RT-X policies carry ' +
      'skills across platforms. The gain is not free, because each body defines its actions ' +
      'differently, and the field answers that mismatch with several incompatible conventions.\'',
    '\'Cross-embodiment learning is learning from, or transferring to, robots with different ' +
      'morphologies: joint counts, action dimensions and sensor suites. The Open X-Embodiment ' +
      'project pooled data from 22 robot embodiments, and its RT-X policies carried skills ' +
      'across platforms. Each body defines actions differently, and the field aligns them with ' +
      'several incompatible conventions.\'',
  ], [
    '\'In imitation learning, the mismatch between the state distribution in the training ' +
      'demonstrations and the distribution the learned policy visits at deployment. The policy\\\'s own ' +
      'errors carry it into states the demonstrations never covered, where it is likelier to err again, ' +
      'so mistakes compound: Ross, Gordon, and Bagnell showed that a behavior-cloned policy with ' +
      'per-step error ε can incur total cost growing quadratically in episode length, and that no ' +
      'i.i.d.-trained policy can guarantee better.\'',
    '\'Covariate shift is the mismatch between the state distribution of an imitation ' +
      'learner\\\'s training demonstrations and the distribution its learned policy visits at ' +
      'deployment. The policy\\\'s own errors lead it to states the demonstrations never ' +
      'covered, where it is likelier to err again, so mistakes compound. Ross, Gordon, and ' +
      'Bagnell showed a behavior-cloned policy with per-step error ε can incur total cost ' +
      'quadratic in episode length, and no i.i.d.-trained policy can guarantee better.\'',
  ], [
    '\'The reverse of the forward map: given a target pose for the end effector, find joint angles ' +
      'that reach it. The problem is nonlinear and can have no solution, one solution, or many. ' +
      'Numerical methods can search iteratively for a solution.\'',
    '\'Inverse kinematics is finding joint angles that place the end effector at a target pose, ' +
      'the reverse of forward kinematics. The nonlinear problem can have no solution, one or ' +
      'many; numerical methods search iteratively.\'',
  ], [
    '\'The standard headline metric of robot learning evaluation: the fraction of attempted episodes ' +
      'in which the policy completes the task. Trial count, time limit and scene distribution belong ' +
      'with the reported rate. Toyota Research Institute\\\'s Large Behavior Model study analyzed 1,800 ' +
      'real-world rollouts and warned of a significant risk of statistical noise from insufficient ' +
      'power, not a measured prevalence of incorrect papers. An inconclusive comparison does not ' +
      'establish policy equivalence.\'',
    '\'Success rate is the fraction of attempted episodes in which a policy completes the task, ' +
      'the standard headline metric of robot learning evaluation. A reported rate needs its ' +
      'trial count, time limit and scene distribution. Toyota Research Institute\\\'s Large ' +
      'Behavior Model study analyzed 1,800 real-world rollouts and warned of a significant risk ' +
      'of statistical noise from insufficient power. Snyder et al.\\\'s STEP sequential test ' +
      'needs up to 32% fewer trials than the Lai and SAVI baselines.\'',
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
    '\'Legged locomotion is moving on legs instead of wheels or tracks, re-establishing balance ' +
      'at every discrete, intermittent foothold with no continuous contact patch. Conventional ' +
      'controllers were elaborate state machines triggering motion primitives and reflexes, ' +
      'growing more complex without nearing animal generality. The ETH Zurich line replaced them ' +
      'with simulation-trained reinforcement learning. Lee et al.\\\'s ANYmal controller ' +
      'generalized zero-shot to alpine terrain on proprioception alone, and Miki et al. extended ' +
      'the recipe to perceptive locomotion in the wild.\'',
  ], [
    '\'Sensing of the body\\\'s own state: joint positions and velocities, orientation, and contact, ' +
      'as opposed to exteroception, which senses the outside world through cameras or lidar. ' +
      'Proprioception is fast, cheap, and never occluded, and the ETH Zurich line showed how far it ' +
      'goes: Lee and colleagues trained an ANYmal controller that hiked mud, snow, rubble, and ' +
      'vegetation on proprioception alone, and Miki and colleagues kept it as the trusted channel the ' +
      'policy falls back on when its terrain map disagrees with its body.\'',
    '\'Proprioception is sensing the body\\\'s own state (joint positions and velocities, ' +
      'orientation, contact), as opposed to exteroception of the outside world through cameras ' +
      'or lidar. It is fast, cheap and never occluded. At ETH Zurich, Lee et al.\\\'s ANYmal ' +
      'controller hiked mud, snow, rubble and vegetation on proprioception alone. Miki et al. ' +
      'kept it as the trusted fallback when the terrain map disagrees with the body.\'',
  ], [
    '\'Learning a policy from expert demonstrations rather than from a reward signal: the expert\\\'s ' +
      'recorded state-action pairs become a supervised training set, and the fitted mapping from ' +
      'observed state to action is the policy. Pomerleau\\\'s ALVINN (1988) instead trained on ' +
      'simulated road images before steering NAVLAB, and the recipe still underlies most learned ' +
      'manipulation. Its structural weakness is that the training distribution comes from the expert ' +
      'while deployment visits the states the learner itself induces, the mismatch DAgger was designed ' +
      'to repair.\'',
    '\'Imitation learning is learning a policy from expert demonstrations instead of a reward ' +
      'signal, by supervised fitting of recorded state-action pairs. Pomerleau\\\'s ALVINN ' +
      '(1988) trained on simulated road images before steering NAVLAB; the recipe still ' +
      'underlies most learned manipulation. Its structural weakness: training states come from ' +
      'the expert while deployment visits the learner\\\'s own, the mismatch DAgger was designed ' +
      'to repair.\'',
  ], [
    '\'A four-parameter representation of a kinematic chain. LaValle describes revolute chains using ' +
      'an axial offset, an angle about the joint axis, the distance between successive axes, and the ' +
      'angle between those axes. Frame assignment, indexing and transform order must be specified; do ' +
      'not mix conventions. Near-parallel joint axes can make the parameters ill-conditioned; the ' +
      'product-of-exponentials formulation avoids that parameterization problem.\'',
    '\'Denavit-Hartenberg parameters are a four-parameter representation of a kinematic chain. ' +
      'LaValle describes revolute chains by an axial offset, a joint-axis angle, and the ' +
      'distance and angle between successive axes. Conventions differ in frame assignment, ' +
      'indexing and transform order, so a table must name its convention. Near-parallel axes can ' +
      'make the parameters ill-conditioned; product-of-exponentials avoids this.\'',
  ], [
    '\'Repositioning or reorienting a grasped object within the hand without setting it down: rolling ' +
      'a pen between the fingers, or walking a key around until it faces the lock. It is the skill that ' +
      'separates a hand from a gripper, and the one vision handles worst, because the fingers occlude ' +
      'exactly the contact that matters. Sanctuary demonstrated zero-shot in-hand reorientation with ' +
      'its 21-DoF hydraulic hands in 2024, and Holson\\\'s Robot Olympics makes it the gold-medal bar ' +
      'for tool use with the key-in-lock task.\'',
    '\'In-hand manipulation is repositioning or reorienting a grasped object within the hand ' +
      'without setting it down, like rolling a pen or turning a key. Fingers occlude the ' +
      'contact, so vision handles it poorly. Sanctuary demonstrated zero-shot in-hand ' +
      'reorientation with its 21-DoF hydraulic hands in 2024. Holson\\\'s Robot Olympics makes ' +
      'it the gold-medal bar for tool use with the key-in-lock task.\'',
  ], [
    '\'Manipulation governed by making, holding, and breaking contact rather than by free-space ' +
      'motion: insertion, screwing, wiping, folding. Contact dynamics are discontinuous, since stick ' +
      'flips to slip across a friction boundary, so small sensing errors produce large outcome errors. ' +
      'That discontinuity is why these tasks are the stress test for touch-driven policies, and why ' +
      'TouchWorld\\\'s six-task tactile benchmark is built entirely from them.\'',
    '\'Contact-rich manipulation is manipulation governed by making, holding and breaking ' +
      'contact: insertion, screwing, wiping, folding. Contact dynamics are discontinuous, since ' +
      'stick flips to slip across a friction boundary, so small sensing errors produce large ' +
      'outcome errors. TouchWorld\\\'s six-task tactile benchmark for touch-driven policies is ' +
      'built entirely from such tasks.\'',
  ], [
    '"The part of the scenario distribution that is individually rare and collectively decisive: a ' +
      'couch fallen off a truck, a pedestrian in dark clothing outside a crosswalk, a traffic cop ' +
      'waving cars through a red light. None of these appear often enough in any natural driving log to ' +
      'learn from directly, yet each can decide whether a system is deployable. Autonomous-driving ' +
      'teams attack the tail with simulation, and Waymo\'s Genie-3-based World Model exists for exactly ' +
      'this: events \'from a tornado to a casual encounter with an elephant\' are \'almost impossible ' +
      'to capture at scale in reality\'."',
    '\'The long tail is the individually rare, collectively decisive part of the scenario ' +
      'distribution. Examples are a couch fallen off a truck, a pedestrian in dark clothing ' +
      'outside a crosswalk and a traffic cop waving cars through a red light. None appears often ' +
      'enough in natural driving logs to learn from directly, yet each can decide deployability. ' +
      'Autonomous-driving teams attack it with simulation. Waymo\\\'s Genie-3-based World Model ' +
      'targets events \\\'from a tornado to a casual encounter with an elephant\\\', which are ' +
      '\\\'almost impossible to capture at scale in reality\\\'.\'',
  ], [
    '"State estimation for a flying robot from camera images fused with inertial measurement unit ' +
      'data: the camera fixes long-term drift, the IMU provides high-rate accelerations between frames, ' +
      'and a filter or optimization over both yields the metric pose and velocity a flight controller ' +
      'needs. It is the standard onboard localization for small drones because it needs no external ' +
      'infrastructure and no GPS, and it is what lets a racing drone estimate its state from its own ' +
      'sensors alone. Swift\'s perception module pairs a visual-inertial estimator with a convolutional ' +
      'gate detector, fusing both in a Kalman filter to supply the control policy."',
    '\'Visual-inertial odometry (VIO) is state estimation for a flying robot fusing camera ' +
      'images with inertial measurement unit data. The camera fixes long-term drift, the IMU ' +
      'gives high-rate accelerations between frames, and a filter or optimizer over both yields ' +
      'the metric pose and velocity flight control needs. Needing no external infrastructure or ' +
      'GPS, it is the standard onboard localization for small drones. Swift\\\'s perception ' +
      'fuses a visual-inertial estimator and a convolutional gate detector in a Kalman filter ' +
      'for its control policy.\'',
  ], [
    '"Surgery performed through small incisions with elongated instruments and a camera, instead of a ' +
      'large open incision. In the abdominal variant, laparoscopy, the workspace is insufflated with ' +
      'gas and the surgeon watches a 2D or 3D video feed while working through trocar ports, which ' +
      'trades patient recovery time for a loss of direct touch, natural hand-eye alignment, and fine ' +
      'dexterity. Surgical robots exist to give that trade-off back: wristed instruments restore ' +
      'dexterity at depth, the console restores a stable magnified stereo view, and motion scaling and ' +
      'tremor filtering restore precision. da Vinci systems are cleared for use in these procedures and ' +
      'have been used in millions of them."',
    '\'Minimally invasive surgery is surgery through small incisions with elongated instruments ' +
      'and a camera, instead of a large open incision. In laparoscopy, its abdominal form, the ' +
      'surgeon works through trocar ports in a gas-insufflated workspace, watching 2D or 3D ' +
      'video. Recovery is faster, but direct touch, natural hand-eye alignment and fine ' +
      'dexterity are lost. Surgical robots restore dexterity at depth with wristed instruments, ' +
      'a stable magnified stereo view at the console, and precision with motion scaling and ' +
      'tremor filtering. The da Vinci systems are cleared for these procedures and have been ' +
      'used in millions.\'',
  ], [
    '\'Sensing of interaction forces at the instrument tip, rendered back to the operator as ' +
      'resistance at the controls. In teleoperation it closes the haptic loop that pure video control ' +
      'leaves open: without it a surgeon infers tissue contact through visual cues alone and can exert ' +
      'more force than intended. da Vinci 5 introduced Force Feedback instruments that measure and ' +
      'display subtle forces on tissue, the first offering of that capability on a surgical system in ' +
      'any modality, and Intuitive reported up to 43 percent less force exerted on tissue in ' +
      'preclinical trials with it. The capability also matters beyond the operator: a measured force ' +
      'signal is a data stream, and data streams are what later automation trains on.\'',
    '\'Force feedback is sensing interaction forces at the instrument tip and rendering them as ' +
      'resistance at the operator\\\'s controls. In teleoperation it closes the haptic loop: ' +
      'without it, a surgeon infers tissue contact from visual cues alone and can exert more ' +
      'force than intended. The da Vinci 5 introduced Force Feedback instruments that measure ' +
      'and display subtle tissue forces, a first for a surgical system in any modality. ' +
      'Intuitive reported up to 43 percent less force exerted on tissue in preclinical trials ' +
      'with it.\'',
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
    '\'In-situ resource utilization (ISRU) is producing mission consumables at the destination ' +
      'from local materials instead of launching them from Earth. Examples are oxygen from the ' +
      'Martian atmosphere, water or metals from lunar regolith, and propellant from both. NASA ' +
      'frames it as astronauts living off the land: each kilogram made on site skips a launch ' +
      'vehicle, and Mars-return propellant would dominate an all-Earth-supplied mass budget. ' +
      'MOXIE, aboard Perseverance, first demonstrated it on another planet by electrolyzing ' +
      'atmospheric carbon dioxide into oxygen. Its robotics side is excavation, drilling and ' +
      'material handling in vacuum and regolith, terrestrial contact-rich manipulation under ' +
      'harsher constraints.\'',
  ], [
    '\'The dual of impedance control: force is measured and motion is commanded. A wrist force-torque ' +
      'sensor reads the contact force, the admittance law converts it into a position or velocity ' +
      'correction, and the underlying motion controller executes it. It is the natural choice on a ' +
      'stiff, geared, non-backdrivable arm, where the position loop is excellent but no torque command ' +
      'channel exists: admittance control synthesizes compliance in software on top of a ' +
      'position-controlled machine, at the cost of the measurement and the loop delay. Ott, Mukherjee ' +
      'and Nakamura\\\'s unified formulation shows the two schemes as the two causal assignments of the ' +
      'same interaction port.\'',
    '\'Admittance control is compliant control that measures contact force and commands motion ' +
      'in response, the dual of impedance control. A wrist force-torque sensor reads the force, ' +
      'the admittance law turns it into a position or velocity correction, and the motion ' +
      'controller executes it. It suits stiff, geared, non-backdrivable arms with an excellent ' +
      'position loop but no torque channel, adding compliance in software at the cost of ' +
      'measurement and loop delay. Ott, Mukherjee and Nakamura cast both schemes as the two ' +
      'causal assignments of one interaction port.\'',
  ], [
    '\'Raibert and Craig\\\'s decomposition of a contact task into orthogonal subspaces: in a task ' +
      'frame chosen from the geometry of the contact, force is controlled along the axes constrained by ' +
      'the environment and position is controlled along the free axes, never both on the same axis. ' +
      'Polishing a surface controls force normal to it and tracks a path tangent to it; sliding a block ' +
      'in a slot controls force pressing into the slot walls and position along the slot. Mason\\\'s ' +
      'predecessor analysis established how to pick the constrained and free directions from contact ' +
      'geometry, which is what makes the decomposition a property of the task rather than a tuning ' +
      'choice.\'',
    '\'Hybrid force/position control is Raibert and Craig\\\'s split of a contact task into ' +
      'orthogonal subspaces. In a task frame chosen from contact geometry, force is controlled ' +
      'along axes the environment constrains and position along free axes, never both on one ' +
      'axis. Polishing controls force normal to the surface and tracks a path tangent to it. ' +
      'Sliding a block in a slot controls force into the walls and position along the slot. ' +
      'Mason\\\'s earlier analysis showed how to pick those directions from contact geometry.\'',
  ], [
    '\'A map that divides space into cells and stores, per cell, the probability that it is occupied. ' +
      'Moravec and Elfes introduced it for wide-angle sonar: each range reading constrains both the ' +
      'volume the beam passed through and the volume where something reflected it, and many readings ' +
      'accumulate into a map of empty and occupied regions. Its defining property for a planner is the ' +
      'third state. A cell that no sensor has yet observed is held as unknown rather than assumed free, ' +
      'which is exactly the distinction a representation optimised for rendering cannot make.\'',
    '\'An occupancy grid is a map of cells, each storing the probability that it is occupied. ' +
      'Moravec and Elfes introduced it for wide-angle sonar, where each reading constrains both ' +
      'the space the beam crossed and where it reflected. Many readings build a map of empty and ' +
      'occupied regions. For a planner, its defining property is a third state: an unobserved ' +
      'cell is marked unknown, which rendering-oriented representations cannot express.\'',
  ], [
    '\'Learning the value of taking an action in a state, rather than learning a policy directly: the ' +
      'agent fits a function that predicts the return available from a state-action pair, and acts by ' +
      'picking the action its own estimate rates highest. Sutton and Barto set it out as the archetypal ' +
      'off-policy temporal-difference control method, where the update uses the best available next ' +
      'action instead of the action the behaviour policy actually took, which is exactly what lets the ' +
      'method learn from experience it did not generate. Every off-policy and offline algorithm the ' +
      'robotics literature uses is a descendant of that update, with machinery added to keep the value ' +
      'estimate from running away on data it cannot verify.\'',
    '\'Q-learning is learning a function predicting the return from each state-action pair, ' +
      'instead of a policy directly, then picking the action its own estimate rates highest. ' +
      'Sutton and Barto present it as the archetypal off-policy temporal-difference control ' +
      'method. Its update uses the best next action, whatever the behaviour policy did, so it ' +
      'can learn from experience it did not generate. Many off-policy and offline robotics ' +
      'algorithms build on it, adding safeguards against value estimates running away on ' +
      'unverifiable data.\'',
  ], [
    '\'A learning method that can improve one policy from data generated by another, which means old ' +
      'experience stays usable after the policy has moved on. Soft actor-critic is the robotics ' +
      'reference point: Haarnoja and colleagues combined off-policy updates with a maximum-entropy ' +
      'objective specifically to attack the sample complexity that keeps model-free deep RL off real ' +
      'hardware, and reported substantially better sample efficiency than on-policy methods on the same ' +
      'tasks. The distinction is about data reuse rather than taxonomy, and on a real robot it is the ' +
      'difference between a feasible experiment and an impossible one.\'',
    '\'An off-policy method is a learning method that can improve one policy from data generated ' +
      'by another, so old experience stays usable. Haarnoja and colleagues\\\' soft ' +
      'actor-critic, the robotics reference point, combines off-policy updates with a ' +
      'maximum-entropy objective against the sample complexity that keeps model-free deep RL off ' +
      'real hardware. They reported substantially better sample efficiency than on-policy ' +
      'methods on the same tasks.\'',
  ], [
    '\'The store of past transitions an off-policy learner samples its gradient batches from, which ' +
      'is the mechanism that makes data reuse concrete. Its contents need not come from the current ' +
      'policy or even from the learner at all: RLPD trains from a buffer holding prior offline data ' +
      'alongside fresh online experience, and HIL-SERL seeds one with human demonstrations before any ' +
      'autonomous collection starts. The buffer is also where the distinction between online and ' +
      'offline learning collapses to a question of whether anything new is still being added.\'',
    '\'A replay buffer is the store of past transitions an off-policy learner samples gradient ' +
      'batches from. Its contents need not come from the current policy or even the learner. ' +
      'RLPD mixes prior offline data with fresh online experience in one buffer, and HIL-SERL ' +
      'seeds one with human demonstrations before autonomous collection.\'',
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
    '\'Reset-free learning is training on real hardware without a human resetting the scene ' +
      'between attempts. Sharma and colleagues separate deployed-policy regret over training ' +
      'from continuing average reward. Their base setting has no episodic resets; a non-ergodic ' +
      'extension adds a bounded, cost-decremented intervention budget. EARL’s experiments ' +
      'instead schedule occasional resets, reporting learning curves and final deployed-policy ' +
      'performance. Gupta and colleagues chain task-specific policies through a ' +
      'designer-provided task graph, so learned re-centering, pickup and flip-up can restore ' +
      'in-hand reorientation conditions after a drop. Their reported D’Hand/Sawyer training, ' +
      'which also covered pipe insertion, still used supplied rewards and task graphs, motion ' +
      'capture for in-hand manipulation and scripted pickup-arm motion.\'',
  ], [
    '\'The machinery-safety procedure that turns an informal worry about a machine into a documented ' +
      'engineering obligation. ISO 12100:2010 is the general-principles standard behind it: its public ' +
      'abstract describes procedures for identifying hazards and for estimating and evaluating the ' +
      'risks associated with them across the phases of a machine life cycle, together with guidance on ' +
      'documenting and verifying what the assessment concluded. Its output is a record of which hazards ' +
      'were found, what was done about each, and why the residual risk was judged acceptable, which is ' +
      'what makes safety auditable rather than asserted.\'',
    '\'Risk assessment is the documented machinery-safety procedure for finding a machine\\\'s ' +
      'hazards and judging their risks. ISO 12100:2010 is its general-principles standard. Its ' +
      'public abstract covers identifying hazards and estimating and evaluating their risks ' +
      'across a machine\\\'s life-cycle phases, with guidance on documenting and verifying the ' +
      'conclusions. The output records each hazard found, what was done about it and why the ' +
      'residual risk was judged acceptable, so the safety argument can be audited.\'',
  ], [
    '\'The collaborative operating mode that permits contact between a robot and a person and makes ' +
      'it safe by bounding what the contact can do, rather than by preventing it. The threshold is ' +
      'biomechanical and stated per body region, which is what turns a marketing word into a claim with ' +
      'numbers behind it: Haddadin, Albu-Schaeffer and Hirzinger established the measurement tradition ' +
      'with impact experiments on the human-robot collision itself, and later force-threshold studies ' +
      'report limits by body region and contact geometry. A cobot certified under this mode has been ' +
      'measured, not merely described.\'',
    '\'Power and force limiting is the collaborative mode that permits robot-person contact and ' +
      'makes it safe by bounding what the contact can do. Thresholds are biomechanical and per ' +
      'body region. The measurement tradition comes from Haddadin, Albu-Schaeffer and ' +
      'Hirzinger\\\'s impact experiments on human-robot collision. Later force-threshold studies ' +
      'report limits by body region and contact geometry.\'',
  ], [
    '\'The ISO 13849-1:2023 counterpart of a safety integrity level, and the rating a machinery ' +
      'integrator in Europe most often has to satisfy. It grades a safety-related control function on a ' +
      'discrete scale, and the standard supplies the design methodology by which a claimed level is ' +
      'justified rather than asserted. Like the IEC 61508 levels, it presumes a specification of the ' +
      'function that can be checked against an implementation, which is exactly what a learned policy ' +
      'does not provide.\'',
    '\'A performance level is the ISO 13849-1:2023 counterpart of a safety integrity level, the ' +
      'rating a machinery integrator in Europe most often must meet. It grades a safety-related ' +
      'control function on a discrete scale, and the standard gives the design methodology for ' +
      'justifying a claimed level. Like IEC 61508 levels, it presumes a function specification ' +
      'checkable against an implementation, which a learned policy lacks.\'',
  ], [
    '\'A structured, documented argument that a system is acceptably safe for a given application in ' +
      'a given environment, with the evidence for each step of the argument attached to it. The ' +
      'tradition exists because testing alone cannot reach the confidence an autonomous system needs, ' +
      'so the artifact is an argument rather than a test report. UL 4600 applies the approach to ' +
      'autonomous products, and the Goal Structuring Notation community standard gives the graphical ' +
      'notation the argument is usually written in, with goals decomposed into subgoals until each ' +
      'rests on cited evidence.\'',
    '\'A safety case is a structured, documented argument, with evidence for each step, that a ' +
      'system is acceptably safe for a given application and environment. The tradition exists ' +
      'because testing alone cannot reach the confidence an autonomous system needs. UL 4600 ' +
      'applies the approach to autonomous products. The Goal Structuring Notation community ' +
      'standard supplies its usual graphical notation, decomposing goals into subgoals until ' +
      'each rests on cited evidence.\'',
  ], [
    '\'Deciding, at run time, whether the input a model is being asked about resembles the data it ' +
      'was trained on, so that a policy can decline rather than extrapolate. In robotics the detector ' +
      'runs on the live observation stream and its output gates the policy: Sinha and colleagues use a ' +
      'fast anomaly detector on the observation to trigger a reactive fallback plan while the slower ' +
      'reasoning runs, which is the practical shape of the technique. It answers a different question ' +
      'from uncertainty in the output, and a policy can be confidently wrong on an input it has never ' +
      'seen.\'',
    '\'Out-of-distribution detection is deciding at run time whether a model\\\'s input ' +
      'resembles its training data, so a policy can decline instead of extrapolating. In ' +
      'robotics it runs on the live observation stream and gates the policy. Sinha and ' +
      'colleagues use a fast anomaly detector to trigger a reactive fallback plan while slower ' +
      'reasoning runs. Output uncertainty is a different question: a policy can be confidently ' +
      'wrong on unseen inputs.\'',
  ], [
    '\'A scalar function of the state, positive on a set you want the system to stay inside, whose ' +
      'derivative condition can be enforced as a constraint on the commanded input, so forward ' +
      'invariance of the safe set becomes a linear constraint in an optimisation the controller solves ' +
      'each step. Ames and colleagues survey the theory and its applications. Its practical importance ' +
      'is architectural: because the constraint filters whatever input arrives, an arbitrary and ' +
      'unverified controller can be wrapped by a verified one, and the guarantee belongs to the ' +
      'wrapper.\'',
    '\'A control barrier function is a scalar function of the state that is positive on a set ' +
      'the system should stay inside. Its derivative condition becomes a linear input constraint ' +
      'in an optimisation solved each step, keeping the safe set forward invariant. Ames and ' +
      'colleagues survey the theory and applications. Because the constraint filters any input, ' +
      'a verified wrapper can enclose an arbitrary, unverified controller and owns the ' +
      'guarantee.\'',
  ], [
    '\'A machine function, initiated by a single human action, that brings a hazardous motion to a ' +
      'halt. ISO 13850:2015 specifies the functional requirements and design principles for it ' +
      'independently of the energy the machine uses, and names IEC 60204-1:2016 for the electrical ' +
      'realisation. Two properties are commonly misunderstood: it is a complement to guarding rather ' +
      'than a substitute for it, since it depends on a person noticing the hazard in time, and stopping ' +
      'is not the same as removing power, which is why the electrical standard distinguishes stop ' +
      'categories.\'',
    '\'An emergency stop is a machine function, started by a single human action, that halts ' +
      'hazardous motion. ISO 13850:2015 gives its functional requirements and design principles, ' +
      'independent of energy source, and names IEC 60204-1:2016 for the electrical realisation. ' +
      'It complements guarding without replacing it, since a person must notice the hazard in ' +
      'time. Stopping also differs from removing power, hence the electrical standard\\\'s stop ' +
      'categories.\'',
  ], [
    '\'A warehouse subsystem of fixed racking, cranes or shuttles, and control software that stores ' +
      'and retrieves unit loads without a human walking an aisle. Symbotic\\\'s systems and Ocado\\\'s ' +
      'customer fulfilment centres are large-scale descendants: high-bay storage, bots that fetch, and ' +
      'pick stations arranged around the software. An AS/RS buys density and precision at the price of ' +
      'being the building\\\'s skeletal structure, which is why it appears mostly in new builds.\'',
    '\'An automated storage and retrieval system is a warehouse subsystem of fixed racking, ' +
      'cranes or shuttles and control software storing and retrieving unit loads without a human ' +
      'walking an aisle. Symbotic\\\'s systems and Ocado\\\'s customer fulfilment centres are ' +
      'large-scale descendants: high-bay storage, fetching bots and pick stations arranged ' +
      'around the software. An AS/RS gives density and precision but becomes part of the ' +
      'building\\\'s structure, so it appears mostly in new builds.\'',
  ], [
    '\'A self-navigating transport vehicle that plans its own paths through a facility using onboard ' +
      'sensors, as distinct from an automated guided vehicle that follows fixed infrastructure like ' +
      'tape or wire. Amazon\\\'s Proteus and the case-handling robots inside Symbotic\\\'s systems are ' +
      'AMRs at fleet scale, and the fleet manager\\\'s traffic control, not any single robot\\\'s ' +
      'navigation, is the hard engineering.\'',
    '\'An autonomous mobile robot is a self-navigating transport vehicle that plans its own ' +
      'paths through a facility with onboard sensors, unlike an automated guided vehicle ' +
      'following fixed tape or wire. Amazon\\\'s Proteus and the case-handling robots in ' +
      'Symbotic\\\'s systems are AMRs at fleet scale, where fleet-manager traffic control is the ' +
      'hard engineering.\'',
  ], [
    '\'The warehouse principle of moving stored items to a stationary human at a pick station, ' +
      'instead of sending the human to walk the shelves. It inverts the economics of order picking: the ' +
      'picker stops being paid to travel and spends nearly the whole shift handling items, which raises ' +
      'throughput per person and simultaneously defines the ceiling an automated picker must beat. ' +
      'Sequoia and Ocado\\\'s pick walls are both goods-to-person systems.\'',
    '\'Goods-to-person is the warehouse principle of bringing stored items to a stationary ' +
      'picker at a pick station instead of walking the picker to the shelves. Pickers then spend ' +
      'nearly the whole shift handling items, raising throughput per person and setting the rate ' +
      'an automated picker must beat. Sequoia and Ocado\\\'s pick walls are goods-to-person ' +
      'systems.\'',
  ], [
    '\'The time an automation investment takes to return its cost: total cell capital divided by the ' +
      'monthly value it produces, most often displaced labour. Operations buyers screen against a ' +
      'horizon rather than optimizing the number, and vendor guidance for robot cells quotes 12 to 24 ' +
      'month paybacks in multi-shift operation, stretching toward 36 in single shift. A robot whose ' +
      'payback misses the horizon is not a bad robot; it is a bad fit for that facility\\\'s wage and ' +
      'throughput.\'',
    '\'Payback period is the time an automation investment takes to return its cost: total cell ' +
      'capital over its monthly value, most often displaced labour. Operations buyers screen it ' +
      'against a horizon, and vendor guidance for robot cells quotes 12 to 24 month paybacks in ' +
      'multi-shift operation, stretching toward 36 in single shift.\'',
  ], [
    '\'How often an automated system needs a human to touch it: the fraction of cycles that end in a ' +
      'jam, mispick, or fault requiring attention, or equivalently one minus the per-cycle success ' +
      'rate. The economics of the rate are set by the intervention time, not the rate alone: a 1 ' +
      'percent intervention rate cleared in seconds is cheaper per pick than a 0.1 percent rate that ' +
      'stops the line for an hour, which is why deployed systems are engineered around cheap recovery ' +
      'rather than perfect autonomy.\'',
    '\'Intervention rate is the fraction of cycles in which an automated system needs a human ' +
      'for a jam, mispick or fault, or one minus the per-cycle success rate. Its economics also ' +
      'depend on intervention time. A 1 percent rate cleared in seconds is cheaper per pick than ' +
      'a 0.1 percent rate that stops the line for an hour, so deployed systems are engineered ' +
      'around cheap recovery.\'',
  ], [
    '\'The number of future actions a chunked policy emits in one inference, the chunk length H. The ' +
      'policy predicts that many actions in a single forward pass whether or not it will execute them ' +
      'all: π0 predicts 50 actions, one second at 50 Hz, and Diffusion Policy predicts 16. What a ' +
      'reader of a results table needs alongside that number is how many of the predicted actions the ' +
      'system actually runs, which is the committed horizon.\'',
    '\'The predicted horizon is the chunk length H: the number of future actions a chunked ' +
      'policy emits in one forward pass, whether or not it executes them all. It is 16 for ' +
      'Diffusion Policy and 50 actions, one second at 50 Hz, for π0. The committed horizon is ' +
      'how many of them run.\'',
  ], [
    '\'Training a policy by supervised learning on expert demonstrations: each recorded ' +
      'observation is an input, the action the expert took at that moment is the label, and the ' +
      'fitted mapping from state to action is the policy. The recipe predates deep learning; ' +
      'ALVINN (1988) used camera and laser-range inputs and trained on simulated road images ' +
      'before NAVLAB tests, and the same approach, scaled to modern networks and datasets, still ' +
      'underlies most learned manipulation policies. Its known failure mode in closed loop is ' +
      'covariate shift.\'',
    '\'Behavior cloning is supervised learning of a policy from expert demonstrations, with ' +
      'observations as inputs and the expert\\\'s actions as labels. The recipe predates deep ' +
      'learning: ALVINN (1988) used camera and laser-range inputs and trained on simulated road ' +
      'images before NAVLAB tests. Scaled up, it still underlies most learned manipulation ' +
      'policies; its known closed-loop failure mode is covariate shift.\'',
  ], [
    '\'Dataset Aggregation, the iterative fix for behavior cloning\\\'s distribution mismatch: ' +
      'roll out the current policy, have the expert label the states the policy actually visits, ' +
      'add those labeled states to the training set, and retrain. Ross, Gordon, and Bagnell ' +
      'framed the procedure as a reduction of imitation learning to no-regret online learning, ' +
      'whose task-cost guarantee is existential over the learned sequence and requires learning ' +
      'and expert-mixing assumptions. Linear excess-cost scaling also requires the expert ' +
      'recovery-cost factor u to be independent of the horizon; u can be O(T) in the worst ' +
      'case.\'',
    '\'DAgger (Dataset Aggregation) is an iterative fix for behavior cloning\\\'s distribution ' +
      'mismatch: the expert labels states the current policy visits, and the policy retrains on ' +
      'the aggregate. Ross, Gordon, and Bagnell framed it as reducing imitation learning to ' +
      'no-regret online learning. The task-cost guarantee is existential over the learned ' +
      'sequence and assumes learning and expert-mixing conditions. Linear excess-cost scaling ' +
      'needs a horizon-independent recovery-cost factor u, which can be O(T) at worst.\'',
  ], [
    '\'The accumulation of small per-step mistakes over the course of a sequential task: each ' +
      'error carries the robot into a state slightly outside its training data, where the next ' +
      'error is more likely, so total deviation grows faster than the per-step error rate. Ross, ' +
      'Gordon, and Bagnell bounded the effect for imitation learning with total cost quadratic ' +
      'in episode length, and action chunking attacks the same effect from the other side by ' +
      'shrinking the number of sequential decisions in an episode.\'',
    '\'Compounding error is the accumulation of small per-step mistakes in a sequential task. ' +
      'Each error moves the robot slightly off its training data, where the next is likelier, so ' +
      'total deviation outgrows the per-step rate. Ross, Gordon, and Bagnell bounded it for ' +
      'imitation learning at total cost quadratic in episode length. Action chunking reduces it ' +
      'by cutting sequential decisions.\'',
  ], [
    '\'Conditional variational autoencoder: a generative model that learns a distribution over a ' +
      'latent variable instead of a single deterministic output. ACT trains its action-chunking ' +
      'policy as a CVAE. During training an encoder compresses the demonstrated action sequence ' +
      'into a latent style variable; at test time the decoder generates the chunk conditioned on ' +
      'camera images and joint positions with the latent clamped to the prior mean, which lets ' +
      'one policy cover varied demonstrations of the same task.\'',
    '\'A CVAE (conditional variational autoencoder) is a generative model learning a ' +
      'distribution over a latent variable instead of one deterministic output. ACT trains its ' +
      'action-chunking policy as one, so a single policy covers varied demonstrations of a task. ' +
      'In training, an encoder compresses each demonstrated action sequence into a latent style ' +
      'variable. At test time the decoder generates the chunk from camera images and joint ' +
      'positions, with the latent at the prior mean.\'',
  ], [
    '\'A robot policy built by adapting a vision-language model, pretrained on web-scale image ' +
      'and text data, to output robot actions. RT-2 established the approach by representing ' +
      'actions as text tokens and co-fine-tuning on web and robot data together, showing that ' +
      'semantic knowledge from web pretraining transfers into control. The same recipe underlies ' +
      'OpenVLA and the π series of generalist policies.\'',
    '\'A vision-language-action model is a vision-language model, pretrained on web-scale image ' +
      'and text data, adapted to output robot actions. RT-2 established it by encoding actions ' +
      'as text tokens and co-fine-tuning on web and robot data, showing that web-learned ' +
      'semantic knowledge transfers into control. OpenVLA and the π series of generalist ' +
      'policies use the same recipe.\'',
  ], [
    '\'Predicting a sequence of future actions in one inference instead of a single action per ' +
      'timestep. Introduced with ACT on the ALOHA platform, chunking cuts the number of ' +
      'sequential decisions in an episode by the chunk length, which reduces compounding error ' +
      'and gives the policy the temporal context it needs to represent pauses, at the cost of ' +
      'committing to a plan between replans.\'',
    '\'Action chunking is predicting a sequence of future actions in one inference instead of a ' +
      'single action per timestep. Introduced with ACT on ALOHA, it divides an episode\\\'s ' +
      'sequential decisions by the chunk length, reducing compounding error and giving the ' +
      'policy temporal context to represent pauses. The cost is commitment to a plan between ' +
      'replans.\'',
  ], [
    '\'The mismatch between the data distribution a model is trained on and the distribution it ' +
      'must act on at deployment. Robot demonstrations come from a small number of labs with ' +
      'specific robots, cameras, and lighting, while deployment spans unseen homes, objects, and ' +
      'clutter, so a policy can score well on held-out data from its own training distribution ' +
      'and still fail in a new kitchen. Open-world evaluations measure performance under exactly ' +
      'this gap: pi0.5 was evaluated in three real homes absent from its training set, and Lin ' +
      'and colleagues measured how generalization to new environments and objects scales with ' +
      'the diversity of the training data rather than its raw volume.\'',
    '\'Distribution shift is the mismatch between a model\\\'s training data and its deployment ' +
      'data. Demonstrations come from a few labs\\\' robots, cameras and lighting; deployment ' +
      'spans unseen homes, objects and clutter. A policy can do well on held-out data from its ' +
      'training distribution yet fail in a new kitchen. Open-world evaluations test this gap: ' +
      'pi0.5 was evaluated in three real homes outside its training set. Lin et al. found ' +
      'generalization to new environments and objects scales with data diversity more than raw ' +
      'volume.\'',
  ], [
    '\'A policy that produces actions through a conditional denoising diffusion process over a ' +
      'whole action sequence instead of regressing a single action directly. Introduced by Chi ' +
      'et al. in 2023, it represents multimodal demonstrations faithfully rather than averaging ' +
      'their modes, and it executes only the first few steps of each predicted sequence before ' +
      'observing again and replanning.\'',
    '\'A diffusion policy is a policy generating a whole action sequence by conditional ' +
      'denoising diffusion instead of regressing one action. Introduced by Chi et al. in 2023, ' +
      'it represents multimodal demonstrations without averaging their modes. It executes only ' +
      'the first few steps of each sequence, then observes again and replans.\'',
  ], [
    '\'Training a policy across a distribution of simulators with randomized parameters, visual ' +
      'appearance, dynamics, or both, so the real world reads as one more sample from that ' +
      'distribution. Tobin et al. randomized rendering and transferred an object detector to a ' +
      'real arm; Peng et al. randomized dynamics and transferred a pushing policy with no ' +
      'real-world training. The price is conservatism: a policy that does well across a wide ' +
      'distribution is optimal for no single instance of it.\'',
    '\'Domain randomization is training a policy across a distribution of simulators with ' +
      'randomized visual appearance, dynamics or both, so the real world reads as one more ' +
      'sample. Tobin et al. randomized rendering and transferred an object detector to a real ' +
      'arm. Peng et al. randomized dynamics and transferred a pushing policy with no real-world ' +
      'training. The cost is conservatism: such a policy is optimal for no single instance.\'',
  ], [
    '\'The map from a robot\\\'s joint angles to the pose of its end effector: a deterministic ' +
      'composition of per-joint transforms. It is cheap, smooth in the joint angles, and has ' +
      'exactly one answer, which makes it practical to evaluate inside every control cycle.\'',
    '\'Forward kinematics is the map from a robot\\\'s joint angles to its end-effector pose, a ' +
      'deterministic composition of per-joint transforms. It is cheap, smooth and single-valued, ' +
      'so it can run in every control cycle.\'',
  ], [
    '\'The discrepancy between a simulator\\\'s physics and rendering and the real world, which ' +
      'makes policies trained in simulation degrade when they are deployed on hardware. The gap ' +
      'has several independent components, dynamics, sensing, and actuation among them, and the ' +
      'standard transfer methods (domain randomization, system identification, teacher-student ' +
      'distillation, real-to-sim reconstruction) each attack a different part of it.\'',
    '\'The sim-to-real gap is the discrepancy between a simulator\\\'s physics and rendering and ' +
      'the real world, which degrades simulation-trained policies on hardware. Its independent ' +
      'components include dynamics, sensing and actuation. The standard transfer methods (domain ' +
      'randomization, system identification, teacher-student distillation, real-to-sim ' +
      'reconstruction) each attack a different part.\'',
  ], [
    '\'ACT\\\'s execution scheme for overlapping action chunks: the policy is queried at every ' +
      'timestep, and the predictions that each in-flight chunk made for the current step are ' +
      'averaged with exponential weights. In the pinned ACT reference implementation, retained ' +
      'predictions are ordered oldest-to-newest and weighted by exp(-0.01 * i), so the oldest ' +
      'retained prediction has the largest weight. This smooths the handoff between chunks at ' +
      'the cost of one inference per step instead of one per chunk.\'',
    '\'Temporal ensembling is ACT\\\'s execution scheme for overlapping action chunks: the ' +
      'policy runs every timestep and averages in-flight predictions for the current step with ' +
      'exponential weights. In the pinned ACT reference implementation, predictions ordered ' +
      'oldest to newest get weight exp(-0.01 * i), so the oldest retained prediction has the ' +
      'largest weight. Handoffs are smoother, at the cost of one inference per step instead of ' +
      'per chunk.\'',
  ], [
    '\'Physical Intelligence\\\'s training recipe for keeping action learning from damaging a ' +
      'vision-language-action model\\\'s pretrained backbone. The backbone trains on discrete ' +
      'action tokens with its usual autoregressive loss, a separate flow-matching expert ' +
      'produces the continuous actions, and a stop-gradient keeps the expert\\\'s gradients out ' +
      'of the backbone. On the paper\\\'s bussing task, a model trained this way reaches a given ' +
      'performance level in 7.5 times fewer steps than π0 and follows language better, in and ' +
      'out of distribution.\'',
    '\'Knowledge insulation is Physical Intelligence\\\'s recipe for protecting a ' +
      'vision-language-action model\\\'s pretrained backbone from action learning. The backbone ' +
      'trains on discrete action tokens with its usual autoregressive loss, while a separate ' +
      'flow-matching expert, behind a stop-gradient, produces continuous actions. On the ' +
      'paper\\\'s bussing task it reaches a given performance in 7.5 times fewer steps than π0 ' +
      'and follows language better, in and out of distribution.\'',
  ], [
    '\'An inference-time scheme that keeps chunked policies responsive when the model is slower ' +
      'than the control loop. While the robot finishes the current chunk, the policy conditions ' +
      'its next prediction on the actions that will already have executed by the time inference ' +
      'returns, holding that committed prefix fixed and generating only the remainder. Black, ' +
      'Galliker, and Levine introduced it for flow-matching policies, where it tracks moving ' +
      'targets under inference delays that break both naive chunk execution and temporal ' +
      'ensembling.\'',
    '\'Real-time chunking is an inference-time scheme keeping chunked policies responsive when ' +
      'inference is slower than control. While the robot finishes the current chunk, the policy ' +
      'conditions the next on the actions that will already have executed when inference ' +
      'returns, holding that prefix fixed. Black, Galliker and Levine introduced it for ' +
      'flow-matching policies; it tracks moving targets under delays that break naive chunking ' +
      'and temporal ensembling.\'',
  ], [
    '\'A control architecture split across levels of abstraction: a high-level policy selects ' +
      'what to do next, and low-level policies execute its choices. SayCan scores a supplied ' +
      'library of skills using language-model relevance and estimated affordance, multiplies the ' +
      'scores, and executes the highest-scoring skill. Its mobile-robot implementation combines ' +
      'learned picking with hand-designed navigation and placement components.\'',
    '\'A hierarchical policy is a control architecture in which a high-level policy chooses what ' +
      'to do next and low-level policies execute it. SayCan scores a supplied skill library by ' +
      'language-model relevance times estimated affordance and executes the top skill. Its ' +
      'mobile-robot implementation pairs learned picking with hand-designed navigation and ' +
      'placement.\'',
  ], [
    '\'A 2023 collaboration across 34 labs that pooled 60 existing robot datasets into one ' +
      'standardized format: over a million trajectories spanning 22 robot embodiments and 527 ' +
      'skills. The project also trained the RT-X models on the pool, and found that a policy ' +
      'trained across many robots outperforms versions trained on each robot\\\'s data alone, ' +
      'with skills carrying over to embodiments the policy saw little of.\'',
    '\'Open X-Embodiment is a 2023 collaboration of 34 labs that pooled 60 existing robot ' +
      'datasets into one standardized format: over a million trajectories from 22 embodiments, ' +
      'covering 527 skills. Its RT-X models, trained on the pool, beat policies trained on each ' +
      'robot\\\'s data alone and carried skills to embodiments they saw little of.\'',
  ], [
    '\'Direct remote control of a robot by a human operator, used in robot learning mostly to ' +
      'record expert demonstrations. The ALOHA rig made the setup cheap and precise: the ' +
      'operator back-drives a leader arm that is a joint-for-joint twin of the follower the ' +
      'policy will run on, so the recorded motion is already in the robot\\\'s own action space. ' +
      'Mobile ALOHA extended the same leader-follower scheme to a mobile base for whole-body ' +
      'tasks.\'',
    '\'Teleoperation is direct remote control of a robot by a human operator, used in robot ' +
      'learning mostly to record expert demonstrations. In the cheap, precise ALOHA rig, the ' +
      'operator back-drives a leader arm twinning the follower joint for joint, so recordings ' +
      'are in the robot\\\'s own action space. Mobile ALOHA extended this leader-follower scheme ' +
      'to a mobile base for whole-body tasks.\'',
  ], [
    '\'Proximal policy optimization, the on-policy reinforcement learning algorithm the ' +
      'locomotion literature standardized on. Schulman and colleagues introduced it as a policy ' +
      'gradient method that alternates between sampling data through interaction with the ' +
      'environment and optimizing a surrogate objective with stochastic gradient ascent, where ' +
      'the surrogate is what allows several epochs of minibatch updates on each batch of samples ' +
      'instead of the single gradient step standard policy gradient takes. It keeps most of ' +
      'trust region policy optimization\\\'s reliability without the second-order machinery, and ' +
      'it pairs naturally with massively parallel simulation, where thousands of robots supply ' +
      'the enormous on-policy batches it consumes.\'',
    '\'PPO (proximal policy optimization) is the on-policy reinforcement learning algorithm the ' +
      'locomotion literature standardized on. Schulman and colleagues introduced it as a policy ' +
      'gradient method alternating between sampling environment data and optimizing a surrogate ' +
      'objective by stochastic gradient ascent. The surrogate allows several minibatch epochs ' +
      'per batch where standard policy gradient takes one step. It keeps most of trust region ' +
      'policy optimization\\\'s reliability without second-order machinery, and suits massively ' +
      'parallel simulation, whose thousands of robots supply its enormous on-policy batches.\'',
  ], [
    '\'Running thousands of physics simulator instances at once on a single GPU, so one ' +
      'workstation collects reinforcement learning experience at rates that once needed CPU ' +
      'clusters. Isaac Gym made the setup practical by keeping both physics and policy training ' +
      'on the GPU and passing data straight from physics buffers to PyTorch tensors, skipping ' +
      'the CPU round-trip entirely, which bought two to three orders of magnitude in throughput ' +
      'over a CPU simulator feeding a GPU learner. Rudin and colleagues showed what that buys: ' +
      'four thousand parallel ANYmal instances trained with PPO learned flat-terrain walking in ' +
      'under four minutes and uneven terrain in twenty, on one workstation GPU.\'',
    '\'Parallel simulation is running thousands of physics simulator instances at once on one ' +
      'GPU, so one workstation gathers reinforcement learning experience at rates that once ' +
      'needed CPU clusters. Isaac Gym made this practical by keeping physics and policy training ' +
      'on the GPU, passing data from physics buffers to PyTorch tensors without the CPU. That ' +
      'gave two to three orders of magnitude more throughput over a CPU simulator feeding a GPU ' +
      'learner. With PPO on one workstation GPU, Rudin et al.\\\'s four thousand ANYmal ' +
      'instances learned flat-terrain walking in under four minutes and uneven terrain in ' +
      'twenty.\'',
  ], [
    '\'Supplying extra training rewards on top of a task\\\'s base reward to guide the learning ' +
      'agent, usually to turn a sparse success signal into a denser one that learning can climb. ' +
      'Ng, Harada, and Russell asked exactly which modifications to a Markov decision ' +
      'process\\\'s reward function leave the optimal policy unchanged, and proved that a ' +
      'transition reward expressible as the difference of a potential function across the two ' +
      'states is sufficient, and effectively necessary, for that invariance. The theorem ' +
      'explains the classic shaping bugs, where the agent learns to harvest the bonus instead of ' +
      'doing the task: those bugs come from non-potential-based rewards, the kind the theorem ' +
      'rules out.\'',
    '\'Reward shaping is adding rewards to a task\\\'s base reward to guide learning, usually ' +
      'densifying a sparse success signal. Ng, Harada, and Russell asked which changes leave a ' +
      'Markov decision process\\\'s optimal policy unchanged. They proved a shaping reward equal ' +
      'to a potential-function difference across the two states is sufficient, and effectively ' +
      'necessary. Classic shaping bugs, where the agent harvests the bonus instead of doing the ' +
      'task, come from non-potential-based rewards, which the theorem excludes.\'',
  ], [
    '\'Treating all of a robot\\\'s actuated degrees of freedom, legs, torso, arms, and hands, ' +
      'as one coupled control problem instead of stacking an arm controller on top of a separate ' +
      'locomotion controller. The model-based version optimizes against the full rigid-body ' +
      'dynamics at once: Zhang and colleagues ran whole-body model-predictive control in real ' +
      'time on hardware with plain iLQR and MuJoCo dynamics, across dynamic quadruped locomotion ' +
      'and full-sized humanoid walking. The learned version reframes the same problem as ' +
      'tracking a retargeted human motion, the route H2O took for real-time whole-body ' +
      'teleoperation, with reinforcement learning supplying the balance and contact feasibility ' +
      'that raw retargeting loses.\'',
    '\'Whole-body control is treating all of a robot\\\'s actuated degrees of freedom (legs, ' +
      'torso, arms, hands) as one coupled problem instead of an arm controller stacked on a ' +
      'separate locomotion controller. Model-based versions optimize against the full rigid-body ' +
      'dynamics. Zhang et al. ran whole-body MPC in real time on hardware with plain iLQR and ' +
      'MuJoCo, for dynamic quadruped locomotion and full-sized humanoid walking. Learned ' +
      'versions track retargeted human motion, as H2O did for real-time whole-body ' +
      'teleoperation, with reinforcement learning restoring the balance and contact feasibility ' +
      'raw retargeting loses.\'',
  ], [
    '\'Control by constant re-planning: at each control step, optimize a short sequence of ' +
      'future actions against an explicit dynamics model, execute only the first action, and ' +
      'solve again from the freshly measured state. Because the plan is recomputed online, model ' +
      'error is rejected by feedback at every step instead of being frozen into a policy\\\'s ' +
      'weights, so a model-predictive controller shows less of the frozen-policy sim-to-real ' +
      'failure mode, though a wrong dynamics model still costs it closed-loop performance. Long ' +
      'assumed too slow for a robot\\\'s full dynamics, whole-body MPC now runs in real time on ' +
      'legged hardware: Zhang and colleagues\\\' MuJoCo-based iLQR controller, first posted in ' +
      '2025 and revised in 2026 to appear at ICRA 2026, closes the loop on quadruped and ' +
      'humanoid robots.\'',
    '\'Model predictive control is constant re-planning against an explicit dynamics model: each ' +
      'step it optimizes a short action sequence, executes only the first action and re-solves ' +
      'from the measured state. Per-step feedback corrects model error instead of freezing it ' +
      'into policy weights, so MPC shows less frozen-policy sim-to-real failure; a wrong model ' +
      'still costs closed-loop performance. Long assumed too slow for full robot dynamics, ' +
      'whole-body MPC now runs in real time on quadruped and humanoid hardware with Zhang and ' +
      'colleagues\\\' MuJoCo-based iLQR controller. Posted in 2025, it was revised in ' +
      '2026 to appear at ICRA 2026.\'',
  ], [
    '\'A generative modeling recipe that learns a time-dependent vector field carrying samples ' +
      'from a noise distribution to the data distribution, trained by regressing the model\\\'s ' +
      'field against the conditional flow rather than by estimating a score. pi0 brought it to ' +
      'robot control: a dedicated action expert is trained with the flow-matching objective to ' +
      'denoise continuous action chunks, and at inference the learned field is integrated as an ' +
      'ODE for a handful of steps, which keeps the policy fast enough for high-frequency control ' +
      'while keeping the multimodality that made diffusion policies attractive.\'',
    '\'Flow matching is a generative modeling recipe that learns a time-dependent vector field ' +
      'carrying noise to data, by regressing against the conditional flow instead of estimating ' +
      'a score. In pi0, which brought it to robot control, an action expert trained this way ' +
      'denoises continuous action chunks. Integrating the field as an ODE for a handful of steps ' +
      'is fast enough for high-frequency control and keeps diffusion policies\\\' ' +
      'multimodality.\'',
  ], [
    '\'A model of how an environment evolves that an agent can query to make decisions: given ' +
      'the current observation or state and a candidate action, it predicts what happens next, ' +
      'so a policy can be trained, evaluated, or planned against the model instead of the real ' +
      'world. The 2026 robotics survey draws the functional line: producing plausible future ' +
      'images is not enough, because a system qualifies only if its predictions change under the ' +
      'agent\\\'s action in a way that is useful for decision-making. The single name covers at ' +
      'least six architecturally distinct paradigms, from compact latent dynamics models to ' +
      'action-conditioned video generators.\'',
    '\'A world model is a model an agent queries to make decisions: given the current ' +
      'observation or state and a candidate action, it predicts what happens next. Policies can ' +
      'be trained, evaluated or planned against it instead of the real world. The 2026 robotics ' +
      'survey requires predictions that change under the agent\\\'s action in ways useful for ' +
      'decisions; plausible future images are not enough. The name covers at least six ' +
      'architecturally distinct paradigms, from compact latent dynamics models to ' +
      'action-conditioned video generators.\'',
  ], [
    '\'The last link of a robot arm and whatever is attached to it: the gripper, hand, or tool ' +
      'whose pose the arm exists to place. Kinematics is conventionally written as the map from ' +
      'joint angles to the end-effector pose. Many learned manipulation policies act in ' +
      'end-effector deltas and others in joint targets; across 13,000+ real rollouts, joint ' +
      'space favored control stability and task space favored generalization.\'',
    '\'An end effector is the last link of a robot arm plus its gripper, hand or tool, whose ' +
      'pose the arm exists to place. Kinematics is conventionally the map from joint angles to ' +
      'that pose. Many learned manipulation policies act in end-effector deltas, others in joint ' +
      'targets; across 13,000+ real rollouts, joint space favored control stability and task ' +
      'space favored generalization.\'',
  ], [
    '\'The derivative of the forward-kinematics map: the matrix relating joint velocities to ' +
      'end-effector velocity at the current configuration, with one column per joint. It changes ' +
      'with configuration and can lose rank at singularities, where covering some task-space ' +
      'direction would demand unbounded joint speeds. The same matrix maps a wrench at the end ' +
      'effector back to the joint torques that balance it through its transpose, which makes it ' +
      'the working object of both velocity-level control and statics.\'',
    '\'The Jacobian is the derivative of the forward-kinematics map: a matrix with one column ' +
      'per joint, relating joint velocities to end-effector velocity at the current ' +
      'configuration. It can lose rank at singularities, where some task-space direction needs ' +
      'unbounded joint speeds. Its transpose maps an end-effector wrench to the balancing joint ' +
      'torques, so it serves both velocity-level control and statics.\'',
  ], [
    '\'Measuring a real robot\\\'s dynamics and correcting the simulator\\\'s parameters to ' +
      'match, so the sim-to-real gap shrinks by calibration rather than by randomization. ' +
      'Hwangbo and colleagues replaced a miscalibrated analytic actuator model with a learned ' +
      'network mapping joint-command history to realized torque after identifying actuator error ' +
      'as the dominant transfer obstacle on ANYmal. The method attacks the dynamics component of ' +
      'the gap directly, where domain randomization only averages over it.\'',
    '\'System identification is fitting a simulator\\\'s parameters to a real robot\\\'s ' +
      'measured dynamics, shrinking the sim-to-real gap by calibration. Hwangbo et al. found ' +
      'actuator error the dominant transfer obstacle on ANYmal and replaced its miscalibrated ' +
      'analytic model with a learned network from joint-command history to realized torque. It ' +
      'attacks the gap\\\'s dynamics component directly; domain randomization only averages over ' +
      'it.\'',
  ], [
    '\'Mapping motion recorded on one body, usually a human\\\'s, onto a robot with different ' +
      'proportions and joint limits, so human demonstrations become references the robot can ' +
      'track. Raw retargeting ignores the robot\\\'s physical constraints and can produce ' +
      'references that are morphologically infeasible, which is why systems such as H2O and ASAP ' +
      'pair retargeted human motion with reinforcement learning that restores balance and ' +
      'contact feasibility on the real body.\'',
    '\'Retargeting is mapping motion recorded on one body, usually a human\\\'s, onto a robot ' +
      'with different proportions and joint limits, so human demonstrations become references ' +
      'the robot can track. Raw retargeting ignores the robot\\\'s physical constraints and can ' +
      'produce morphologically infeasible references. H2O and ASAP therefore add reinforcement ' +
      'learning that restores balance and contact feasibility on the real body.\'',
  ], [
    '\'An empirical regularity between a system\\\'s performance and the resources it consumes, ' +
      'parameters, data, or compute, first made precise for language models and now measured for ' +
      'robot learning. Lin and colleagues fit imitation-learning success to the training data ' +
      'and found that generalization to new objects and environments tracks data diversity ' +
      'rather than raw hours. EgoScale extended the measurement to egocentric human video, ' +
      'reporting a log-linear relationship between hours of human data and ' +
      'dexterous-manipulation success across four orders of magnitude.\'',
    '\'A scaling law is an empirical relation between performance and resources (parameters, ' +
      'data or compute), first made precise for language models and now measured in robot ' +
      'learning. Lin et al. found imitation-learning generalization to new objects and ' +
      'environments tracks data diversity more than raw hours. EgoScale reported a log-linear ' +
      'relationship between hours of egocentric human video and dexterous-manipulation success ' +
      'across four orders of magnitude.\'',
  ], [
    '\'A model pretrained jointly on web-scale image and text data, so visual recognition and ' +
      'language semantics live in one set of weights. RT-2\\\'s bet was that this pretraining is ' +
      'an asset for robot control: co-fine-tuning a vision-language model on robot trajectories ' +
      'and its original web data together transfers semantic knowledge, recognizing objects and ' +
      'following instructions the robot data never covered, into the policy. The ' +
      'vision-language-action models that followed all start from such a backbone.\'',
    '\'A vision-language model is a model pretrained jointly on web-scale image and text data, ' +
      'so visual recognition and language semantics share one set of weights. RT-2 bet this ' +
      'pretraining helps control: co-fine-tuning on robot trajectories plus the original web ' +
      'data transfers semantic knowledge, like recognizing objects and following instructions ' +
      'the robot data never covered. Later vision-language-action models all start from such a ' +
      'backbone.\'',
  ], [
    '\'An estimate of whether an available skill can succeed in the current situation. SayCan ' +
      'combines this estimate with a language model\\\'s score for the skill\\\'s usefulness to ' +
      'the instruction. Its learned picking value functions require empirical calibration, and ' +
      'its navigation and placement affordances also use hand-designed rules; a high score is ' +
      'not confirmation of successful execution.\'',
    '\'An affordance is an estimate of whether an available skill can succeed now. SayCan ' +
      'combines it with a language model\\\'s usefulness score for the skill. Its learned ' +
      'picking value functions require empirical calibration, and its navigation and placement ' +
      'affordances use hand-designed rules. A high score is not confirmation of successful ' +
      'execution.\'',
  ], [
    '\'Training on a scheduled sequence of tasks that grow harder as the agent improves, instead ' +
      'of sampling the full difficulty range from the start. Rudin and colleagues raised or ' +
      'lowered terrain levels based on each robot\\\'s progress. Their documented ' +
      'curriculum-trained simulation-and-deployment policy used 4,096 robots, 98,304 transitions ' +
      'per batch and 1,500 updates in under twenty minutes on an i9-11900k CPU and RTX A6000 ' +
      'GPU; their separate flat-terrain headline is under four minutes on one workstation GPU.\'',
    '\'Curriculum learning is training on tasks that start easy and grow harder as the agent ' +
      'improves. Rudin et al. adjusted each robot\\\'s terrain level by its progress. Their ' +
      'documented curriculum-trained policy for simulation and deployment used 4,096 robots, ' +
      '98,304 transitions per batch and 1,500 updates in under twenty minutes on an i9-11900k ' +
      'CPU and RTX A6000 GPU. Their separate flat-terrain headline is under four minutes on one ' +
      'workstation GPU.\'',
  ], [
    '\'Training two policies in sequence to work around partial observability: a teacher trains ' +
      'with privileged simulator state, such as exact terrain friction or object pose, and a ' +
      'student then learns to imitate the teacher using only the observations available at ' +
      'deployment. RMA instead trained a base policy with a privileged encoder, then trained a ' +
      'separate state-action-history module to predict its latent extrinsics for asynchronous ' +
      'online inference. Lee and colleagues distilled a privileged ANYmal teacher into a ' +
      'proprioceptive student that hikes challenging terrain without ever seeing it.\'',
    '\'Teacher-student distillation is training two policies in sequence for partial ' +
      'observability. A teacher sees privileged simulator state such as exact terrain friction ' +
      'or object pose; a student imitates it using only deployment observations. RMA instead ' +
      'trained a base policy with a privileged encoder, then a separate state-action-history ' +
      'module predicting its latent extrinsics for asynchronous online inference. Lee and ' +
      'colleagues distilled a privileged ANYmal teacher into a proprioceptive student that hikes ' +
      'challenging terrain without ever seeing it.\'',
  ], [
    '\'Expressing continuous robot actions as discrete tokens so a language model\\\'s machinery ' +
      'can produce them. RT-2 discretized each action dimension into 256 uniform bins and mapped ' +
      'the bin indices onto rarely used tokens of the model\\\'s existing vocabulary, which let ' +
      'the policy train with ordinary next-token prediction. The representation is simple and ' +
      'inherits the backbone\\\'s web knowledge, but 256 bins are coarse and autoregressive ' +
      'decoding is slow, the two weaknesses later work attacked with continuous experts and ' +
      'parallel decoding.\'',
    '\'Action tokenization is expressing continuous robot actions as discrete tokens a language ' +
      'model can produce. RT-2 mapped 256 uniform bins per action dimension onto rarely used ' +
      'vocabulary tokens for ordinary next-token training. It is simple and keeps web knowledge, ' +
      'but 256 bins are coarse and autoregressive decoding is slow; later work used continuous ' +
      'experts and parallel decoding.\'',
  ], [
    '\'A world-model paradigm that predicts in a compact learned latent space instead of in ' +
      'pixels: the model carries a recurrent latent state, forecasts how that state and the ' +
      'reward evolve under candidate actions, and the agent learns or plans entirely inside the ' +
      'imagined rollouts. Dreamer established the recipe of training an actor-critic purely on ' +
      'imagined trajectories, and TD-MPC2 showed the image decoder can be dropped altogether, ' +
      'scoring candidate action sequences under the latent model with a learned terminal value ' +
      'instead of reconstructing pixels.\'',
    '\'Latent dynamics is a world-model paradigm predicting in a compact learned latent space ' +
      'instead of pixels. The agent learns or plans entirely inside imagined rollouts of a ' +
      'recurrent latent state and reward under candidate actions. Dreamer established training ' +
      'an actor-critic purely on imagined trajectories. TD-MPC2 dropped the image decoder ' +
      'altogether, scoring action sequences under the latent model with a learned terminal ' +
      'value.\'',
  ], [
    '\'The number of independent coordinates needed to specify a mechanism\\\'s configuration. ' +
      'An arm\\\'s degree-of-freedom count is its number of independent joints, so a 7-DoF arm ' +
      'places its end effector with one coordinate to spare beyond the six a rigid pose needs, ' +
      'and that redundancy is what lets the elbow reconfigure while the hand stays put. More ' +
      'degrees of freedom buy dexterity and obstacle avoidance at the price of a larger control ' +
      'problem.\'',
    '\'Degrees of freedom are the number of independent coordinates needed to specify a ' +
      'mechanism\\\'s configuration; an arm has one per independent joint. A 7-DoF arm has one ' +
      'redundant coordinate beyond the six a rigid end-effector pose needs, so its elbow can ' +
      'reconfigure while the hand stays put. More degrees of freedom buy dexterity and obstacle ' +
      'avoidance at the price of a larger control problem.\'',
  ], [
    '\'The space of all configurations of a robot: one point per complete joint assignment, so a ' +
      '7-DoF arm moves through a 7-dimensional space whose coordinates are its joint angles. ' +
      'Lozano-Pérez introduced the planning formulation in 1983: shrink the robot to a point and ' +
      'grow every obstacle by the robot\\\'s shape, so collision-free motion becomes a path ' +
      'through the free region of that space. Geometric motion planning searches for paths in ' +
      'configuration space. A kinodynamic planner can instead use a state that includes both ' +
      'configuration and velocity.\'',
    '\'Configuration space is the space of a robot\\\'s configurations, one point per complete ' +
      'joint assignment; a 7-DoF arm moves through a 7-dimensional space with joint angles as ' +
      'coordinates. Lozano-Pérez introduced the planning formulation in 1983: shrink the robot ' +
      'to a point and grow obstacles by its shape, making collision-free motion a path through ' +
      'free space. Geometric motion planning searches it for paths. A kinodynamic planner can ' +
      'instead use a state that includes both configuration and velocity.\'',
  ], [
    '\'Motion planning as numerical optimization over a candidate trajectory. CHOMP combines a ' +
      'dynamics prior with a workspace arc-length obstacle cost and uses inverse-metric ' +
      'covariant updates; TrajOpt uses sequential convex subproblems, nonlinear constraint ' +
      'penalties, and a trust region that can expand or shrink. Local optimization can fail and ' +
      'depends on its initial trajectory. Ratliff and colleagues describe a ' +
      'feasible-path-then-refinement pattern for PRM/RRT, while Schulman and colleagues also ' +
      'study planning from infeasible seeds. Neither source establishes that this is the ' +
      'standard industrial pipeline, and their collision-handling assumptions are not ' +
      'unconditional safety guarantees.\'',
    '\'Trajectory optimization is motion planning by numerically optimizing a candidate ' +
      'trajectory. CHOMP pairs a dynamics prior with a workspace arc-length obstacle cost, using ' +
      'inverse-metric covariant updates. TrajOpt uses sequential convex subproblems, nonlinear ' +
      'constraint penalties and a trust region that can expand or shrink. Such local ' +
      'optimization can fail and depends on its initial trajectory. Ratliff et al. describe ' +
      'refining a feasible PRM/RRT path; Schulman et al. also study planning from infeasible ' +
      'seeds. Neither source shows this is the standard industrial pipeline, and their ' +
      'collision-handling assumptions are not unconditional safety guarantees.\'',
  ], [
    '\'The recursive state estimator for linear systems with Gaussian noise: a predict step ' +
      'propagates the state estimate and its covariance through the motion model, and an update ' +
      'step fuses each new measurement with a gain that weighs the model\\\'s uncertainty ' +
      'against the sensor\\\'s. Kalman published the recursion in 1960, and it is the ' +
      'minimum-variance estimator for the linear-Gaussian case. When the dynamics or the ' +
      'measurement model is nonlinear, the extended Kalman filter linearizes both about the ' +
      'current estimate instead.\'',
    '\'The Kalman filter is the recursive state estimator for linear systems with Gaussian ' +
      'noise. It predicts the estimate and covariance through the motion model, then fuses each ' +
      'measurement with a gain weighing model against sensor uncertainty. Kalman published it in ' +
      '1960; it is minimum-variance in the linear-Gaussian case. The extended Kalman filter ' +
      'linearizes nonlinear models about the current estimate.\'',
  ], [
    '\'A bipartite graph that displays the factorization of a probability distribution: variable ' +
      'nodes hold the unknown states, and factor nodes hold the measurements and motion ' +
      'constraints that tie groups of variables together. Kschischang, Frey, and Loeliger ' +
      'unified the inference algorithms on these graphs under the sum-product algorithm in 2001. ' +
      'In robotics, a factor graph over the whole trajectory turns smoothing and SLAM into one ' +
      'sparse least-squares problem, the formulation behind Square Root SAM and its incremental ' +
      'successors.\'',
    '\'A factor graph is a bipartite graph of a probability distribution\\\'s factorization: ' +
      'variable nodes hold unknown states, factor nodes the measurements and motion constraints ' +
      'linking them. Kschischang, Frey and Loeliger unified inference on these graphs under the ' +
      'sum-product algorithm in 2001. Over a robot trajectory, it makes smoothing and SLAM one ' +
      'sparse least-squares problem, as in Square Root SAM and its incremental successors.\'',
  ], [
    '\'Simultaneous localization and mapping: estimating a robot\\\'s state while building a ' +
      'model of its environment. In the landmark-based formulation studied by Square Root SAM, ' +
      'the unknowns include the robot trajectory and landmark map. With known data associations, ' +
      'Gaussian process and measurement models, a uniform landmark prior, and the initial ' +
      'reference frame fixed, joint MAP estimation becomes nonlinear least squares. Cadena and ' +
      'colleagues describe MAP estimation, often expressed with factor graphs, as a standard ' +
      'SLAM formulation while also noting high-performing EKF-based systems.\'',
    '\'SLAM (simultaneous localization and mapping) is estimating a robot\\\'s state while ' +
      'building a model of its environment. In Square Root SAM\\\'s landmark-based formulation, ' +
      'the unknowns include the robot trajectory and landmark map. Given known data ' +
      'associations, Gaussian process and measurement models, a uniform landmark prior and a ' +
      'fixed initial reference frame, joint MAP estimation becomes nonlinear least squares. ' +
      'Cadena et al. call MAP estimation, often expressed with factor graphs, a standard SLAM ' +
      'formulation, while noting high-performing EKF-based systems.\'',
  ], [
    '\'The set of forces a frictional point contact can exert without slipping: all force ' +
      'vectors within an angle arctan(mu) of the surface normal, where mu is the Coulomb ' +
      'friction coefficient. A contact resists arbitrary tangential load only up to mu times its ' +
      'normal load, so the cone widens as friction grows and collapses to the normal ray when ' +
      'friction vanishes. In the plane the cone is a wedge bounded by two edge rays, which is ' +
      'what makes planar grasp analysis a convex-geometry problem.\'',
    '\'A friction cone is the set of forces a frictional point contact can exert without ' +
      'slipping: all forces within arctan(mu) of the surface normal, mu being the Coulomb ' +
      'friction coefficient. Tangential load is resisted only up to mu times the normal load, so ' +
      'the cone widens with friction and collapses to the normal ray without it. In the plane it ' +
      'is a wedge between two edge rays, making planar grasp analysis convex geometry.\'',
  ], [
    '\'The property that a grasp can resist any externally applied wrench with feasible contact ' +
      'forces: every disturbance force and moment can be balanced by contacts pushing inside ' +
      'their friction cones. Equivalently, the convex hull of the primitive contact wrenches ' +
      'contains the origin of wrench space strictly in its interior. Nguyen showed that two ' +
      'frictional contacts achieve it exactly when the line through the contact points lies ' +
      'strictly inside both friction cones, the antipodal condition.\'',
    '\'Force closure is the property that a grasp can resist any external wrench with contact ' +
      'forces inside the friction cones. Equivalently, the convex hull of the primitive contact ' +
      'wrenches contains the wrench-space origin strictly inside. Nguyen showed two frictional ' +
      'contacts achieve it exactly when the line through the contact points lies strictly inside ' +
      'both friction cones, the antipodal condition.\'',
  ], [
    '\'Force closure achieved by geometry alone, with frictionless contacts: the contact normals ' +
      'themselves positively span the wrench space, so the object is immobilized no matter how ' +
      'small the friction. Bicchi showed form closure is exactly frictionless force closure. It ' +
      'is demanding in contact count, needing at least four contacts in the plane and seven in ' +
      'space, which is why practical grasps lean on friction instead.\'',
    '\'Form closure is force closure by geometry alone: frictionless contact normals positively ' +
      'span the wrench space, immobilizing the object however small the friction. Bicchi showed ' +
      'it is exactly frictionless force closure. It needs at least four contacts in the plane ' +
      'and seven in space, so practical grasps rely on friction.\'',
  ], [
    '\'The set of net wrenches a grasp can apply to the object, built by mapping every ' +
      'admissible combination of contact forces through the grasp map. Because friction cones ' +
      'are convex, the wrench space is the convex hull of the primitive cone-edge wrenches, a ' +
      'polytope in force-moment space. Closure properties read off it geometrically: force ' +
      'closure is the origin lying strictly inside, and the Ferrari-Canny quality metric is the ' +
      'radius of the largest origin-centered ball that fits.\'',
    '\'The grasp wrench space is the set of net wrenches a grasp can apply, mapped from ' +
      'admissible contact forces through the grasp map. With convex friction cones, it is the ' +
      'convex hull of the primitive cone-edge wrenches, a polytope. Force closure means the ' +
      'origin lies strictly inside; the Ferrari-Canny quality metric is the radius of the ' +
      'largest origin-centered ball inside.\'',
  ], [
    '\'A two-contact grasp in which the line through the contact points lies strictly inside ' +
      'both friction cones. Nguyen proved this geometric test is exactly force closure for a ' +
      'frictional pair in the plane: the contacts can squeeze along the line they share and ' +
      'generate torques of both signs. It is the workhorse of parallel-jaw grippers, and its ' +
      'strictness matters, because a line resting exactly on a cone edge resists everything ' +
      'except the one wrench that slides the object out.\'',
    '\'An antipodal grasp is a two-contact grasp in which the line through the contact points ' +
      'lies strictly inside both friction cones. Nguyen proved this is exactly force closure for ' +
      'a planar frictional pair, which can squeeze along that line and torque both ways. It is ' +
      'the workhorse of parallel-jaw grippers, and strictness matters: a line exactly on a cone ' +
      'edge resists every wrench except the one sliding the object out.\'',
  ], [
    '\'A driving policy that maps raw sensor input directly to a motion plan or vehicle ' +
      'commands, instead of composing separate perception, prediction, and planning modules. The ' +
      'motivation is joint optimization: modular pipelines accumulate errors across ' +
      'hand-engineered interfaces, while a single network can tune every parameter for the ' +
      'driving objective. UniAD moved the industry compromise by keeping the task structure but ' +
      'training all stages in one differentiable network; EMMA went further by building on ' +
      'Gemini and representing trajectories and 3D locations as text.\'',
    '\'End-to-end driving is a policy mapping raw sensor input directly to a motion plan or ' +
      'vehicle commands, without separate perception, prediction and planning modules. The ' +
      'motivation is joint optimization: one network tunes every parameter for the driving ' +
      'objective, while modular pipelines accumulate errors at hand-engineered interfaces. UniAD ' +
      'moved the industry compromise by training all stages in one differentiable network with ' +
      'the task structure kept. EMMA went further, building on Gemini and representing ' +
      'trajectories and 3D locations as text.\'',
  ], [
    '\'Coordination of many relatively simple robots through local interaction rather than a ' +
      'central planner, aiming for collective behavior that no individual achieves: coverage, ' +
      'mapping, or search at fleet scale. The classical models treat the group as a dynamical ' +
      'system of pairwise attractions and repulsions (potential fields, in the lineage of ' +
      'Reynolds flocking), which explains collective motion but guarantees neither safety nor ' +
      'speed in clutter. The aerial-swarm literature moved to onboard trajectory optimization: ' +
      'each drone plans in milliseconds from its own sensors while treating neighbors as ' +
      'constraints, so a ten-drone swarm traverses a bamboo forest with no external localization ' +
      'and no global map.\'',
    '\'Swarm robotics is coordinating many relatively simple robots through local interaction, ' +
      'without a central planner, for collective behavior no individual achieves, such as ' +
      'coverage, mapping or search at fleet scale. Classical models of pairwise attractions and ' +
      'repulsions (potential fields, after Reynolds flocking) explain collective motion but ' +
      'guarantee neither safety nor speed in clutter. Aerial swarms now optimize trajectories ' +
      'onboard: each drone plans in milliseconds from its own sensors, treating neighbors as ' +
      'constraints. Ten drones crossed a bamboo forest this way with no external localization or ' +
      'global map.\'',
  ], [
    '"The US regulatory category for surgical robots. A RASD is cleared or authorized on the ' +
      'basis that it assists a surgeon rather than practicing medicine itself: the Versius ' +
      'authorization, the first for a multiport soft-tissue general surgical system through the ' +
      'FDA\'s De Novo pathway, is explicitly worded as assisting in the precise and accurate ' +
      'control of endoscopic instruments, and it names one procedure, adult cholecystectomy, as ' +
      'the indicated use. The indication is the unit of progress: a system earns autonomy or new ' +
      'procedures one cleared indication at a time, which is why the field\'s shipped autonomy ' +
      'sits far below its research demonstrations."',
    '\'A robotic assisted surgical device (RASD) is the US regulatory category for surgical ' +
      'robots, cleared or authorized to assist a surgeon, who remains the one practicing ' +
      'medicine. The Versius authorization was the first for a multiport soft-tissue general ' +
      'surgical system through the FDA\\\'s De Novo pathway. It is explicitly worded as ' +
      'assisting in precise and accurate control of endoscopic instruments, for one indicated ' +
      'procedure, adult cholecystectomy. Systems gain autonomy or new procedures one cleared ' +
      'indication at a time, which is why shipped autonomy sits far below research ' +
      'demonstrations.\'',
  ], [
    '\'Using one spacecraft to work on another after launch: docking with an aging satellite to ' +
      'take over its propulsion, refueling it, replacing failed components, assembling large ' +
      'structures, or removing debris. The robotic content is rendezvous and proximity ' +
      'operations flown to centimeter-per-second tolerances, plus capture and manipulation of ' +
      'hardware that was usually never designed to be serviced. The capability has been ' +
      'demonstrated in stages since Japan\\u2019s ETS-VII and DARPA\\u2019s Orbital Express, and ' +
      'became a commercial service when Northrop Grumman\\u2019s MEV-1 docked with Intelsat 901 ' +
      'in 2020 to extend its life; debris inspection and removal is the unserved variant, where ' +
      'the client is uncooperative and tumbling.\'',
    '\'On-orbit servicing is using one spacecraft to work on another after launch. Tasks include ' +
      'docking with an aging satellite to take over its propulsion, refueling, replacing failed ' +
      'components, assembling large structures and removing debris. The robotics is rendezvous ' +
      'and proximity operations at centimeter-per-second tolerances, plus capture and ' +
      'manipulation of hardware rarely designed for servicing. Staged demonstrations ran from ' +
      'Japan’s ETS-VII and DARPA’s Orbital Express; it became commercial when Northrop Grumman’s ' +
      'MEV-1 docked with Intelsat 901 in 2020 to extend its life. Debris inspection and removal, ' +
      'with an uncooperative tumbling client, remains unserved.\'',
  ], [
    '\'Hogan\\\'s 1985 formulation of compliant contact control: instead of commanding a ' +
      'position or a force, the controller programs the relationship between them, making the ' +
      'manipulator behave at the contact like a mass-spring-damper whose stiffness and damping ' +
      'the programmer chooses. The position error drives a force through the desired mechanical ' +
      'impedance, so the arm yields when it meets the environment and pushes back only as much ' +
      'as the programmed spring says. The port-based argument underneath is a duality: at a ' +
      'contact you may command motion or force, the two conjugate variables of the interaction ' +
      'port, but not both independently, and impedance control takes the motion as input and ' +
      'force as output.\'',
    '\'Impedance control is Hogan\\\'s 1985 formulation of compliant contact control, ' +
      'programming the relationship between position and force instead of commanding either. The ' +
      'manipulator acts like a mass-spring-damper at the contact: position error drives force ' +
      'through the chosen stiffness and damping, so the arm yields and pushes back only as ' +
      'programmed. By port duality, a contact can be commanded in motion or force, its two ' +
      'conjugate variables, but not both independently; impedance control takes motion as input ' +
      'and force as output.\'',
  ], [
    '\'An actuator with a deliberately soft spring placed between the gear train and the load, ' +
      'proposed by Pratt and Williamson in 1995. The spring is a sensor as much as a compliance: ' +
      'its deflection measures the transmitted force cheaply and robustly, the force loop closes ' +
      'on the spring rather than on a fragile wrist sensor, and the spring mechanically ' +
      'low-passes impact forces so a collision loads the drivetrain far below what a rigid joint ' +
      'would see. The cost is bandwidth and position accuracy, which is why the design dominates ' +
      'in legged robots and collaborative arms, where force fidelity and impact tolerance matter ' +
      'more than stiffness.\'',
    '\'A series elastic actuator is one with a deliberately soft spring between gear train and ' +
      'load, proposed by Pratt and Williamson in 1995. The spring\\\'s deflection measures ' +
      'transmitted force cheaply, replacing a fragile wrist sensor in the force loop. It also ' +
      'mechanically low-passes impacts, so a collision loads the drivetrain far less than a ' +
      'rigid joint. The cost is bandwidth and position accuracy, which is why it dominates in ' +
      'legged robots and collaborative arms, where force fidelity and impact tolerance outweigh ' +
      'stiffness.\'',
  ], [
    '\'The ease with which an external force can move a joint with the actuators passive: a ' +
      'direct-drive or quasi-direct-drive arm is backdrivable, because pushing on the link turns ' +
      'the motor with little resistance, while a high-ratio geared arm is not, because the gears ' +
      'and the controller\\\'s position loop hold the joint rigid against the push. It decides ' +
      'which compliance scheme fits the hardware: impedance control assumes the arm can be ' +
      'commanded as a force source, which suits a low-inertia backdrivable design, while a ' +
      'non-backdrivable geared arm needs admittance control built on a force sensor, or a series ' +
      'elastic element to restore a mechanical force channel.\'',
    '\'Backdrivability is how easily an external force can move a joint with the actuators ' +
      'passive, and it decides which compliance scheme fits the hardware. Direct-drive and ' +
      'quasi-direct-drive arms are backdrivable: pushing the link turns the motor with little ' +
      'resistance. In high-ratio geared arms, the gears and position loop hold the joint rigid. ' +
      'Impedance control assumes a force-source arm, suiting low-inertia backdrivable designs. ' +
      'Non-backdrivable geared arms need admittance control with a force sensor, or a series ' +
      'elastic element to restore a mechanical force channel.\'',
  ], [
    '\'The parameters that describe the camera itself rather than where it sits: focal length in ' +
      'pixels along each axis, the principal point where the optical axis meets the sensor, and ' +
      'the lens distortion coefficients. Zhang\\\'s method recovers them from a handful of views ' +
      'of a planar target held at arbitrary unknown orientations, which is why calibration on a ' +
      'robot is a printed checkerboard rather than a metrology rig. Without them a pixel is only ' +
      'a direction in an unknown parameterisation, so no image measurement converts into a ' +
      'metric ray.\'',
    '\'Camera intrinsics are the camera\\\'s own parameters, independent of where it is mounted: ' +
      'focal length in pixels along each axis, the principal point where the optical axis meets ' +
      'the sensor, and lens distortion. Zhang\\\'s method recovers them from a few views of a ' +
      'planar target at unknown orientations, so robots calibrate with a printed checkerboard ' +
      'instead of a metrology rig. Without them a pixel is only a direction in an unknown ' +
      'parameterisation, and no image measurement converts into a metric ray.\'',
  ], [
    '\'Estimating the rigid transform between a camera and the robot frame it must report into: ' +
      'for a wrist-mounted camera, the transform from the gripper to the camera, and for a fixed ' +
      'camera, the transform from the robot base to the camera. Tsai and Lenz posed it as ' +
      'solving AX = XB from a set of robot motions paired with the camera\\\'s observed motion ' +
      'of a static target, and their formulation is still what most implementations run. The ' +
      'residual matters asymmetrically: a translation error is a constant offset, while a ' +
      'rotation error is an angle, so its cost in millimetres grows with how far away the target ' +
      'is.\'',
    '\'Hand-eye calibration is estimating the rigid transform between a camera and the robot ' +
      'frame it reports into. That is gripper to camera for a wrist-mounted camera, and the ' +
      'robot base to the camera for a fixed one. Tsai and Lenz posed it as solving AX = XB from ' +
      'robot motions and the camera\\\'s observed motion of a static target, the formulation ' +
      'most implementations still use. Translation error is a constant offset; rotation error is ' +
      'an angle, so its cost in millimetres grows with target distance.\'',
  ], [
    '\'A set of 3D points, usually with no ordering and no connectivity, which is what a depth ' +
      'camera or a lidar produces once its measurements are back-projected through the camera ' +
      'intrinsics. The awkwardness for learning is that the set is unordered, so a network ' +
      'reading it must be invariant to permutation of its own input. PointNet answered that with ' +
      'a shared per-point encoder followed by a symmetric pooling function. PointNet++ groups ' +
      'metric-space neighbourhoods and applies local PointNets recursively to learn features at ' +
      'increasing scales. These are summaries, not a guarantee that all geometry survives ' +
      'pooling; density-adaptive grouping addresses sparsely sampled neighbourhoods.\'',
    '\'A point cloud is a set of 3D points, usually with no ordering and no connectivity, as ' +
      'produced by back-projecting depth-camera or lidar measurements through the camera ' +
      'intrinsics. A network reading it must be permutation invariant. PointNet uses a shared ' +
      'per-point encoder and symmetric pooling; PointNet++ recursively applies local PointNets ' +
      'to metric-space neighbourhoods for multi-scale features. Pooling summarizes, so some ' +
      'geometry can be lost; density-adaptive grouping addresses sparse neighbourhoods.\'',
  ], [
    '\'Labelling every pixel of an image with a class, as opposed to drawing a box around each ' +
      'object. For manipulation the per-pixel form is what matters, because a grasp is planned ' +
      'on a region of a surface rather than on a rectangle: a box around a mug also contains the ' +
      'table behind it, and a mask does not.\'',
    '\'Semantic segmentation is labelling every pixel of an image with a class, instead of ' +
      'boxing each object. Manipulation needs the per-pixel form because grasps are planned on ' +
      'surface regions. A box around a mug also contains the table behind it; a mask does not.\'',
  ], [
    '\'Segmentation that predicts a mask from an image and prompts such as foreground/background ' +
      'points, a box or a mask. SAM was trained on SA-1B, reported as 1.1 billion automatically ' +
      'generated masks from 11 million images. The paper evaluates zero-shot transfer to new ' +
      'datasets, but an ambiguous prompt can produce multiple candidate masks and performance is ' +
      'not guaranteed on every image distribution. SAM 2 extends geometric prompting across ' +
      'video frames with streaming memory of predictions and prompted frames; masks can be ' +
      'refined with further prompts, but tracking can fail after shot changes, occlusion or ' +
      'confusion between similar objects. In the SAM instance-segmentation experiment, the box ' +
      'prompt comes from a separate ViTDet detector.\'',
    '\'Promptable segmentation is predicting a mask from an image plus prompts such as ' +
      'foreground/background points, a box or a mask. SAM trained on SA-1B, reported as 1.1 ' +
      'billion automatically generated masks from 11 million images. Its paper evaluates ' +
      'zero-shot transfer to new datasets; an ambiguous prompt can produce multiple candidate ' +
      'masks, and performance is not guaranteed on every image distribution. SAM 2 extends ' +
      'geometric prompting across video with streaming memory of predictions and prompted ' +
      'frames; further prompts refine masks. Tracking can fail after shot changes, occlusion or ' +
      'similar-object confusion. In SAM\\\'s instance-segmentation experiment, a separate ViTDet ' +
      'detector supplies the box prompt.\'',
  ], [
    '\'Recovering an object\\\'s full rigid position and orientation, six degrees of freedom, ' +
      'from sensor data, rather than only where it is in the image. Methods divide by what they ' +
      'assume: instance-level ones such as PoseCNN are trained per object and need that exact ' +
      'object\\\'s model, while model-free methods such as FoundationPose take a CAD model or a ' +
      'few reference images at test time and handle objects they never saw in training. It is ' +
      'the step that turns a detection into something a grasp planner can use, because force ' +
      'closure is computed against a known object pose.\'',
    '\'Pose estimation is recovering an object\\\'s full rigid position and orientation, six ' +
      'degrees of freedom, from sensor data. Instance-level methods such as PoseCNN train per ' +
      'object and need that object\\\'s exact model. Model-free methods such as FoundationPose ' +
      'take a CAD model or a few reference images at test time and handle unseen objects. Pose ' +
      'estimation turns a detection into grasp-planner input, because force closure is computed ' +
      'against a known pose.\'',
  ], [
    '\'A model-point pose-error rule that replaces fixed point correspondences with ' +
      'nearest-neighbour matches. In Hinterstoisser and colleagues\\\' LINEMOD-based paper, ' +
      'Equation (1) averages distances between corresponding model points transformed by the ' +
      'ground-truth and estimated poses. Equation (2) instead matches each ' +
      'ground-truth-transformed point to the nearest estimated-pose-transformed model point ' +
      'before averaging. The paper names cup, bowl, box and glue as ambiguous objects, including ' +
      'ambiguity from a subset of views. Its correctness rule is inclusive: the average distance ' +
      'must be at most a chosen coefficient times the model diameter; Table 1 uses 0.1. This is ' +
      'a point-set score and a chosen evaluation threshold, not a guarantee that every visually ' +
      'indistinguishable rotation has zero error.\'',
    '\'Symmetry-aware pose error (ADD-S) is a pose-error rule using nearest-neighbour matches ' +
      'instead of fixed model-point correspondences. In Hinterstoisser and colleagues\\\' ' +
      'LINEMOD-based paper, the plain error averages distances between corresponding model ' +
      'points under ground-truth and estimated poses; ADD-S instead matches each ' +
      'ground-truth-transformed point to the nearest estimated-pose-transformed model point ' +
      'before averaging. The paper names cup, bowl, box and glue as ambiguous, including from a ' +
      'subset of views. Its correctness rule is inclusive: the average distance must be at most ' +
      'a chosen coefficient times the model diameter, and their LINEMOD evaluation uses 0.1. The ' +
      'score and threshold are evaluation choices, so a visually indistinguishable rotation can ' +
      'still score a nonzero error.\'',
  ], [
    '\'Using computer vision data to control a robot\\\'s motion. Image-based visual servoing ' +
      '(IBVS) uses image features in its error; position-based visual servoing (PBVS) uses ' +
      'estimated pose parameters. Espiau, Chaumette and Rives applied a task-function framework ' +
      'to visual control in their 1992 paper. Its camera-motion model uses translational and ' +
      'rotational velocity relative to the scene, expressed in the camera frame. IBVS is not ' +
      'universally pose- or calibration-free: its point-feature interaction matrix uses depth ' +
      'and camera intrinsics. Under the tutorial\\\'s local stability conditions, coarse ' +
      'estimates can perturb a convergent camera path without changing the final pose reached, ' +
      'but poor estimates can cause instability and large displacements can encounter ' +
      'singularities or local minima. PBVS pose errors can also affect final accuracy.\'',
    '\'Visual servoing is controlling a robot\\\'s motion with computer vision data. Image-based ' +
      'visual servoing (IBVS) builds its error from image features; position-based (PBVS) from ' +
      'estimated pose. Espiau, Chaumette and Rives applied a task-function framework to visual ' +
      'control in 1992, modelling translational and rotational camera velocity relative to the ' +
      'scene, expressed in the camera frame. IBVS\\\'s point-feature interaction matrix still ' +
      'needs depth and camera intrinsics. Under the tutorial\\\'s local stability conditions, ' +
      'coarse estimates can perturb a convergent camera path without changing the final pose; ' +
      'poor estimates can cause instability. Large displacements can meet singularities or local ' +
      'minima. PBVS pose errors can also affect final accuracy.\'',
  ], [
    '\'A scalar field whose zero crossing represents a surface. Curless and Levoy fuse weighted ' +
      'signed distances measured along sensor lines of sight. KinectFusion uses a projective ' +
      'truncated field rather than a true discrete signed-distance field; fusion approximates a ' +
      'pseudo-Euclidean distance metric. Near the surface, it estimates normals from numerical ' +
      'field derivatives under an orthogonality assumption. It predicts the surface by ray ' +
      'marching and approximate interpolation, not by treating every stored value as an exact ' +
      'collision margin.\'',
    '\'A signed-distance field is a scalar field whose zero crossing represents a surface. ' +
      'Curless and Levoy fuse weighted signed distances measured along sensor lines of sight. ' +
      'KinectFusion uses a projective truncated field, an approximation of a true discrete ' +
      'signed-distance field; fusion approximates a pseudo-Euclidean distance metric. It ' +
      'estimates near-surface normals from numerical field derivatives, assuming orthogonality. ' +
      'It predicts the surface by ray marching and approximate interpolation, and no stored ' +
      'value is an exact collision margin.\'',
  ], [
    '\'A scene stored as a continuous function, realised as a small neural network, from a 3D ' +
      'position and a viewing direction to a volume density and a view-dependent colour. ' +
      'Mildenhall and colleagues introduced it: images are synthesised by classical volume ' +
      'rendering along camera rays, and because that rendering is differentiable the whole ' +
      'representation can be optimised from posed photographs alone. The objective is view ' +
      'synthesis, so the geometry it recovers is whatever explains the images rather than ' +
      'whatever a contact solver would want.\'',
    '\'A neural radiance field is a scene stored as a continuous function, a small neural ' +
      'network, from 3D position and viewing direction to volume density and view-dependent ' +
      'colour. Mildenhall et al. introduced it, synthesising images by differentiable volume ' +
      'rendering along camera rays, so the scene can be optimised from posed photographs alone. ' +
      'Its objective is view synthesis, so nothing in training shapes its geometry for a contact ' +
      'solver.\'',
  ], [
    '\'A scene stored as a cloud of anisotropic 3D Gaussians, each carrying a position, a ' +
      'covariance, an opacity and a view-dependent colour, rendered by projecting them to the ' +
      'image plane and rasterising rather than by marching rays. Kerbl and colleagues showed the ' +
      'representation reaches radiance-field quality at real-time frame rates, which is what ' +
      'took the family out of offline rendering. The representation has no surface: opacity is a ' +
      'rendering weight, so contact geometry exists only after a separate surface extraction ' +
      'step.\'',
    '\'3D Gaussian splatting is a scene representation of anisotropic 3D Gaussians, each with ' +
      'position, covariance, opacity and view-dependent colour, rasterised onto the image plane ' +
      'instead of ray-marched. Kerbl et al. showed it reaches radiance-field quality at ' +
      'real-time frame rates, taking the family out of offline rendering. It has no surface: ' +
      'opacity is a rendering weight, so contact geometry needs separate surface extraction.\'',
  ], [
    '\'Recognising a previously mapped place and adding a validated constraint between its ' +
      'observations. Cadena and colleagues explain that revisiting mapped landmarks can reduce ' +
      'and possibly correct odometric drift, whose magnitude depends on the odometry method. In ' +
      'monocular ORB-SLAM, similarity alignment and Essential Graph optimization distribute ' +
      'loop-closing error along the graph. This is not a guarantee that every revisit removes ' +
      'all error.\'',
    '\'Loop closure is recognising a mapped place and adding a validated constraint between ' +
      'observations. Cadena and colleagues note revisiting mapped landmarks can reduce, and ' +
      'possibly correct, odometric drift, whose size depends on the odometry method. In ' +
      'monocular ORB-SLAM, similarity alignment and Essential Graph optimization spread ' +
      'loop-closing error along the graph, so a revisit can leave residual error.\'',
  ], [
    '\'For visual navigation, deciding whether the current image depicts a place already in the ' +
      'map. Motion information can also inform that belief. Lowry and colleagues survey the ' +
      'difficulty: the same place can change appearance while different places can look alike. ' +
      'In Cadena and colleagues\\\' robustness argument, false-positive data associations can ' +
      'lead to wrong back-end estimates; false negatives discard useful measurements and reduce ' +
      'estimation accuracy. Geometric verification and robust estimation can mitigate outliers, ' +
      'but do not establish a universal ranking of every false match against every missed ' +
      'match.\'',
    '\'Place recognition is deciding, in visual navigation, whether the current image shows a ' +
      'mapped place. Motion information can also inform that belief. Lowry et al. survey why it ' +
      'is hard: places change appearance, and different places can look alike. In Cadena and ' +
      'colleagues\\\' robustness argument, false-positive data associations can produce wrong ' +
      'back-end estimates; false negatives discard useful measurements and reduce estimation ' +
      'accuracy. Geometric verification and robust estimation can mitigate outliers, but do not ' +
      'establish a universal ranking of every false match against every missed match.\'',
  ], [
    '\'The grid a mobile-robot navigation stack plans over: occupancy from the map and the live ' +
      'sensors, inflated by the robot\\\'s footprint and marked up with whatever else should ' +
      'influence the route, so a planner searching for a cheap path is also searching for a safe ' +
      'one. Lu, Hershberger and Smart proposed and implemented layered costmaps in ROS ' +
      'Navigation: ordered semantic layers update a master 2D costmap, bounds first, then ' +
      'values. Layers may keep private grids or write directly to the master. Sensed obstacles ' +
      'may overwrite static-map costs if configured.\'',
    '\'A costmap is the grid a mobile-robot navigation stack plans over: map and live sensor ' +
      'occupancy, inflated by the robot\\\'s footprint and marked with other route costs. A ' +
      'planner seeking a cheap path thus also seeks a safe one. Lu, Hershberger and Smart ' +
      'proposed and implemented layered costmaps in ROS Navigation: ordered semantic layers ' +
      'update a master 2D costmap, bounds first, then values. Layers may keep private grids or ' +
      'write directly to the master. Sensed obstacles may overwrite static-map costs if ' +
      'configured.\'',
  ], [
    '\'A learning method whose updates are only valid for data collected by the policy currently ' +
      'being improved, so each batch of experience is used once and then discarded. PPO is the ' +
      'robotics default of this kind: it alternates between sampling interaction data and ' +
      'optimizing a surrogate objective, and the surrogate is what allows several minibatch ' +
      'epochs per batch rather than the single gradient step plain policy gradient takes. The ' +
      'property is a cost when samples are expensive and nearly free when a GPU simulator ' +
      'produces them by the hundred million.\'',
    '\'An on-policy method is a learning method whose updates are valid only for data from the ' +
      'current policy, so each batch of experience is used once and discarded. PPO, the robotics ' +
      'default, alternates between sampling interaction data and optimizing a surrogate ' +
      'objective that allows several minibatch epochs per batch where plain policy gradient ' +
      'takes one step. This is costly when samples are expensive and nearly free when a GPU ' +
      'simulator yields hundreds of millions.\'',
  ], [
    '\'How much environment interaction a method needs to reach a specified performance level, ' +
      'counted separately from wall-clock time and gradient updates. Minitaur walking used ' +
      '160,000 control steps over about two hours of the whole training process. A constant-rate ' +
      'budget illustration can translate steps into modelled time, but that translation does not ' +
      'establish algorithm eligibility or predict another robot task.\'',
    '\'Sample efficiency is how much environment interaction a method needs to reach a set ' +
      'performance, counted apart from wall-clock time and gradient updates. Minitaur walking ' +
      'used 160,000 control steps over about two hours of the whole training process. A ' +
      'constant-rate budget illustration can turn steps into modelled time; that does not ' +
      'establish algorithm eligibility or predict another robot task.\'',
  ], [
    '\'Learning a policy from a fixed dataset of previously collected transitions, without ' +
      'collecting additional environment experience during training. The trained policy can then ' +
      'be deployed. A central challenge is distributional shift: policy improvement can query ' +
      'action values outside the data distribution, and erroneous estimates can propagate ' +
      'through Bellman backups without fresh environment feedback. This is distinct from ' +
      'ordinary supervised generalization; adequate data coverage and finite-data errors still ' +
      'matter.\'',
    '\'Offline reinforcement learning is learning a policy from a fixed dataset of previously ' +
      'collected transitions, without new environment experience during training. The trained ' +
      'policy can then be deployed. Its central challenge is distributional shift, which is ' +
      'distinct from ordinary supervised generalization: policy improvement can query action ' +
      'values outside the data distribution, and errors can propagate through Bellman backups ' +
      'without environment feedback. Adequate data coverage and finite-data errors still ' +
      'matter.\'',
  ], [
    '\'An off-policy replay technique that adds alternative goals to stored transitions and ' +
      'recomputes their rewards, while retaining original-goal replay. It trains ' +
      'goal-conditioned policies and value functions; relabeling is not restricted to failed ' +
      'episodes or final states. Andrychowicz and colleagues tested HER with DDPG on a simulated ' +
      'Fetch arm for pushing, sliding and pick-and-place. Their binary-reward description is ' +
      'qualified by a pushing contact-penetration reward penalty and by starting half of the ' +
      'pick-and-place training episodes from a grasped state.\'',
    '\'Hindsight experience replay (HER) is an off-policy technique that replays stored ' +
      'transitions with alternative goals and recomputed rewards, alongside original-goal ' +
      'replay. It trains goal-conditioned policies and value functions; relabeling is not ' +
      'restricted to failed episodes or final states. Andrychowicz and colleagues tested it with ' +
      'DDPG on a simulated Fetch arm for pushing, sliding and pick-and-place. Their ' +
      'binary-reward description is qualified by a pushing contact-penetration reward penalty ' +
      'and by starting half of pick-and-place training episodes from a grasped state.\'',
  ], [
    '\'The collaborative operating mode in which a robot and a person may both move at the same ' +
      'time, with a safety system continuously maintaining a protective separation distance ' +
      'between them and issuing a safety-rated stop if that distance is closed. Marvel and ' +
      'Norcross restate the distance in public as a sum of four terms: the operator travel ' +
      'during the reaction and stopping intervals, the robot travel before braking begins, the ' +
      'braking distance itself, and an intrusion margin plus the position uncertainty of both ' +
      'parties. Because the braking term is quadratic in the robot speed, the distance grows ' +
      'faster than the speed does.\'',
    '\'Speed and separation monitoring is the collaborative mode in which robot and person may ' +
      'move simultaneously while a safety system continuously keeps a protective separation ' +
      'distance between them. A breach triggers a safety-rated stop. Marvel and Norcross restate ' +
      'the distance publicly as four terms: operator travel during reaction and stopping, robot ' +
      'travel before braking, braking distance, and an intrusion margin plus position ' +
      'uncertainty. The braking term is quadratic in robot speed, so the distance grows faster ' +
      'than speed.\'',
  ], [
    '\'The part of a system\\u2019s safety that depends on its control system doing the right ' +
      'thing, as opposed to safety that comes from inherent design or physical guarding. Two ' +
      'standards frame it for machinery: IEC 61508:2010 is the generic standard for electrical, ' +
      'electronic and programmable electronic safety-related systems, and ISO 13849-1:2023 gives ' +
      'a design methodology for the safety-related parts of machine control systems, including ' +
      'software, deferring low-demand operation to the IEC 61508 series. Both frame a safety ' +
      'function as something specified in advance and then argued to have been correctly ' +
      'implemented.\'',
    '\'Functional safety is the part of a system’s safety that depends on its control system ' +
      'working correctly, as opposed to inherent design or physical guarding. For machinery, two ' +
      'standards frame it: IEC 61508:2010 is the generic standard for electrical, electronic and ' +
      'programmable electronic safety-related systems. ISO 13849-1:2023 gives a design ' +
      'methodology for safety-related parts of machine control systems, including software, ' +
      'deferring low-demand operation to the IEC 61508 series. Both treat a safety function as ' +
      'specified in advance, then argued to be correctly implemented.\'',
  ], [
    '\'The IEC 61508:2010 rating of how much confidence a safety function warrants, assigned to ' +
      'the function rather than to the component that implements it. Reaching a level requires ' +
      'more than a measured failure rate: the series also demands the avoidance of systematic ' +
      'faults, which are the design and specification errors that no amount of redundant ' +
      'hardware removes. That requirement is why a learned policy cannot be assigned one. The ' +
      'evidence a level needs is a verifiable specification of what the function must do, and a ' +
      'policy trained from demonstrations has behaviour instead of a specification.\'',
    '\'A safety integrity level is the IEC 61508:2010 confidence rating for a safety function; ' +
      'it belongs to the function, whichever component implements it. A measured failure rate is ' +
      'not enough: the series also demands avoiding systematic faults, the design and ' +
      'specification errors redundant hardware cannot remove. A learned policy cannot be ' +
      'assigned one, because a level needs a verifiable specification of the function and a ' +
      'policy trained from demonstrations has only behaviour.\'',
  ], [
    '\'A distribution-free procedure that converts any model\\u2019s raw score into a prediction ' +
      'set with a guaranteed coverage rate: choose a target such as 95 percent, calibrate a ' +
      'threshold on held-out data, and the resulting sets contain the true answer at that rate ' +
      'under exchangeability, whatever the model is. Vovk, Gammerman and Shafer developed the ' +
      'framework; Angelopoulos and Bates wrote the tutorial that carried it into ' +
      'machine-learning practice. Its value for robotics is that the size of the set is a ' +
      'calibrated statement of uncertainty, so a policy can be made to ask for help exactly when ' +
      'its set is ambiguous.\'',
    '\'Conformal prediction is a distribution-free procedure that turns any model’s raw score ' +
      'into a prediction set with guaranteed coverage. Calibrate a threshold for a target such ' +
      'as 95 percent on held-out data, and under exchangeability the sets contain the true ' +
      'answer at that rate. Vovk, Gammerman and Shafer developed it; Angelopoulos and Bates\\\'s ' +
      'tutorial brought it into machine-learning practice. In robotics, set size is calibrated ' +
      'uncertainty, so a policy can ask for help exactly when its set is ambiguous.\'',
  ], [
    '\'Available production time divided by customer demand over the same period, expressed as ' +
      'time per unit. Its purpose is to match production with demand.\'',
    '\'Takt time is available production time divided by customer demand over the same period, ' +
      'in time per unit. Its purpose is to match production to demand.\'',
  ], [
    '\'The time required to produce a part or complete a process, as timed by actual ' +
      'measurement.\'',
    '\'Cycle time is the measured time required to produce a part or complete a process.\'',
  ], [
    '\'An organisation that integrates a robot with the end-effectors, sensors, safeguarding and ' +
      'controls needed for an application. Manufacturers or employers may also act as ' +
      'integrators. OSHA\\\'s Technical Manual, discussing ANSI/RIA R15.06-2012, calls for ' +
      'integrators to complete and document an application risk assessment before commissioning; ' +
      'employers remain responsible for a safe workplace. EVST\\\'s July 15, 2026 commercial ' +
      'palletising guide lists tooling, guarding, controls integration, commissioning and ' +
      'programming beyond the arm price.\'',
    '\'A systems integrator is an organisation that integrates a robot with end-effectors, ' +
      'sensors, safeguarding and controls needed for an application. Manufacturers or employers ' +
      'may also act as integrators. OSHA\\\'s Technical Manual, discussing ANSI/RIA R15.06-2012, ' +
      'asks integrators to complete and document an application risk assessment before ' +
      'commissioning; employers remain responsible for a safe workplace. EVST\\\'s July 15, 2026 ' +
      'commercial palletising guide lists tooling, guarding, controls integration, commissioning ' +
      'and programming beyond the arm price.\'',
  ], [
    '\'Installing automation into a facility that already exists and already runs: existing ' +
      'floor plans, ceiling heights, power drops, traffic lanes, and a production schedule that ' +
      'cannot simply stop. A greenfield site is designed around the automation; a brownfield ' +
      'site makes the automation fit, and retrofit guarding, lockout procedures, and phased ' +
      'go-lives are what make the same technology cost more and take longer there.\'',
    '\'Brownfield deployment is installing automation in an existing, running facility, around ' +
      'its floor plans, ceiling heights, power drops, traffic lanes and a production schedule ' +
      'that cannot simply stop. A greenfield site is designed around the automation; a ' +
      'brownfield site makes it fit. Retrofit guarding, lockout procedures and phased go-lives ' +
      'make the same technology cost more and take longer there.\'',
  ], [
    '\'The number of predicted actions a system actually executes before a fresh inference ' +
      'replaces them. Diffusion Policy predicts 16 steps and commits 8; π0.7 predicts 50 and ' +
      'commits 15 to 25; original π0, executing synchronously, committed the whole chunk. ' +
      'Real-Time Chunking freezes the first d actions of each new chunk to the values already in ' +
      'flight, which is what lets the committed horizon stay shorter than the predicted one ' +
      'without a pause between chunks.\'',
    '\'The committed horizon is the number of predicted actions a system executes before a fresh ' +
      'inference replaces them. Diffusion Policy predicts 16 steps and commits 8; π0.7 predicts ' +
      '50 and commits 15 to 25; original π0, executing synchronously, committed the whole chunk. ' +
      'Real-Time Chunking freezes the first d actions of each new chunk to the values in flight, ' +
      'so the committed horizon can be shorter than the predicted one without pauses.\'',
  ]]],
]);

/**
 * Non-article sources an owner-approved redo replaced whole after their
 * corrections above. Josef, 12 Oct 2026: "Redo all of the animations and
 * stuff like that with this type of animation and with this skill [...]"
 * (model name elided). The Anatomy batch of 2026-10-15 redraws the
 * reliability-compounding chart as a marble run (one trapdoor gate per step,
 * a hundred marbles, the finished jobs counted in a tray) and keeps the
 * component, its props and both mounts' variants. A redo is admitted only
 * over the exactly corrected file, and only while it keeps byte for byte
 * every passage named here: each `[start, end]` span (from `start` to the
 * first `end` after it) and each whole `line`, found exactly once in both.
 * They are the props and presets, the headlines and captions, the takeaway
 * text, and the corrected job-length slider and its placement on a mount
 * with a preset set, so a redo that touched any of them is still refused.
 * The redo must also be the successor the recorder pinned, byte for byte.
 */
const REDONE_SOURCES: ReadonlyMap<string, { spans: readonly (readonly [string, string])[]; lines: readonly string[] }> = new Map([
  ['components/interactive/reliability-compounding.tsx', {
    spans: [
      ['type ReliabilityCompoundingPreset = {', '\n};\n'],
      ['const PRESET_SETS = {', '>>;\n'],
      ['const PER_STEP_PRESETS = [', '\n] as const;\n'],
      ['type ReliabilityCompoundingProps = {', '\n};\n'],
      ['const HEADLINES: Record<Variant, string> = {', '\n};\n'],
      ['const CAPTIONS: Record<Variant, string> = {', '\n};\n'],
      ['function reliabilityTakeaway(args: {', '\n}\n'],
      ['  const stepsField = (\n', '\n  );\n'],
    ],
    lines: [
      '          {presetSet ? null : stepsField}\n',
      '          {presetSet ? stepsField : null}\n          <InstrumentReset onClick={reset} />\n',
      '      figureId="reliability-compounding"\n',
      '              aria-label={`How often each step goes right (per-step success probability in percent), currently ${perStepPercent.toFixed(1)}`}\n',
    ],
  }],
]);

/** The passages a redo must keep: the named spans and lines of the corrected file, each found exactly once. */
function keptPassages(text: string, redo: { spans: readonly (readonly [string, string])[]; lines: readonly string[] }): string[] | null {
  const out: string[] = [];
  for (const [start, end] of redo.spans) {
    if (text.split(start).length !== 2) return null;
    const from = text.indexOf(start);
    const to = text.indexOf(end, from + start.length);
    if (to < 0) return null;
    out.push(text.slice(from, to + end.length));
  }
  for (const line of redo.lines) {
    if (text.split(line).length !== 2) return null;
    out.push(line);
  }
  return out;
}

/**
 * The corrected file a redo replaced, its kept passages, and whether the
 * redo keeps them: exported so the obligation can be exercised apart from
 * the byte pins that normally gate it.
 */
export function keepsRedoneSource(path: string, corrected: string, current: string): boolean {
  const redo = REDONE_SOURCES.get(path);
  const pinned = successors.get(path);
  if (!redo || !pinned || corrected === current) return false;
  const kept = keptPassages(corrected, redo);
  // The redo is the recorded successor, byte for byte, and keeps every named passage.
  return Buffer.byteLength(current) === pinned[0] && digest(current) === pinned[1] &&
    !!kept && kept.every((passage) => current.split(passage).length === 2);
}

/** The file a path's corrections give from its pre-pass bytes, or null where they do not replay. */
export function correctedSource(path: string, prior: string): string | null {
  const corrections = CORRECTED_SOURCES.get(path);
  if (!corrections || !corrections.every(([from]) => prior.split(from).length === 2)) return null;
  return applyExact(prior, corrections);
}

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
    const corrected = correctedSource(path, prior);
    // The corrected file itself, or an owner-approved redo of it that keeps its named passages.
    return corrected !== null && (corrected === current || keepsRedoneSource(path, corrected, current));
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
 * declared. The 2026-10-12 length cut and the world-models length cut may
 * append further ids with a reviewed addition; those are accepted only as
 * the exact tail each layer verified and appended. Any other article, or
 * bytes other than the reviewed successor, get their live list back
 * unchanged.
 */
export function preDomainPassCitations(root: string, path: string, citations: readonly string[]): readonly string[] {
  const pinned = successors.get(path);
  if (!pinned) return citations;
  // The newer explainer-mount (2026-10-26), answer-options (2026-10-23), figure-mount (its 2026-10-15 frontier mounts, after the image mounts), image-mount (2026-10-13, extended 2026-10-15), adjacent cut (2026-10-14), data-hardware cut (2026-10-13), frontier length-cut,
  // length-cut (manipulation, classical and rl-sim2real), world-models length-cut, word-budget trim and figure-mount layers hand back the domain-pass successor first.
  const ref = { path, bytes: 0, sha256: '' };
  const cutSuccessor = frontierLengthCutPredecessor(root, ref, dataHardwareCutPredecessor(root, ref, adjacentCutPredecessor(root, ref, imageMountPredecessor(root, ref, figureMountPredecessor(root, ref, answerOptionsPredecessor(root, ref, explainerMountPredecessor(root, ref, readFileSync(join(root, path)))))))));
  const worldModelsSuccessor = lengthCutPredecessor(root, ref, cutSuccessor);
  const live = figureMountPredecessor(root, ref, wordBudgetTrimPredecessor(root, ref,
    worldModelsLengthCutPredecessor(root, ref, worldModelsSuccessor)));
  if (live.length !== pinned[0] || digest(live) !== pinned[1]) return citations;
  const prior = citationList(frontmatter(rebuiltPrior(root, path, live).toString()) ?? '');
  const current = citationList(frontmatter(live.toString()) ?? '');
  const appended = [
    ...worldModelsLengthCutAppendedCitations(root, path, worldModelsSuccessor),
    ...lengthCutAppendedCitations(root, path, cutSuccessor),
  ];
  if ([...current, ...appended].join('\n') !== citations.join('\n')) return citations;
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
