import { describe, expect, it } from 'vitest';
import {
  BUMP_M,
  ENTRANCE_M,
  GUIDE_M,
  GUIDE_PUSH_M,
  PARTS,
  ROLL_AWAY,
  ROLL_NEAR,
  SLED_PARTS,
  STATION_M,
  armJoints,
  armParts,
  bumpTool,
  cellRun,
  guideTool,
  restPose,
} from '@/components/iso/figures/cobot-cell';
import {
  CONTACT_LIMIT_N,
  INTRUSION_MARGIN_M,
  POSITION_UNCERTAINTY_M,
  REACTION_TIME_S,
  WORKCELL_SEPARATION_M,
  peakContactForceN,
  protectiveSeparationM,
  separationTerms,
  stoppingTimeS,
  type ModeId,
} from '@/lib/safety-modes';

const MODES: ModeId[] = ['monitored-stop', 'hand-guiding', 'speed-separation', 'power-force'];
const SPEEDS = [0, 0.25, 0.5, 0.8, 1, 1.25, 1.6, 2];

/** Sample a run every millisecond of real time. */
function samples(mode: ModeId, robot: number, human: number) {
  const run = cellRun(mode, robot, human);
  const out = [];
  for (let t = 0; t <= run.duration + 1e-9; t += 0.001) out.push({ t, pose: run.at(t) });
  return { run, out };
}

describe('the cobot cell model', () => {
  it('stands the person at the workcell separation and stops the robot only when the zone reaches them', () => {
    expect(STATION_M).toBe(WORKCELL_SEPARATION_M);
    for (const robot of SPEEDS) {
      for (const human of SPEEDS) {
        const rest = restPose('speed-separation', robot, human);
        expect(rest.personX).toBe(WORKCELL_SEPARATION_M);
        expect(rest.stopped).toBe(protectiveSeparationM(robot, human) > WORKCELL_SEPARATION_M);
        expect(rest.toolSpeed).toBe(rest.stopped ? 0 : robot);
      }
    }
  });

  it('plays the separation formula: the robot stops with exactly the margin left between them', () => {
    for (const robot of SPEEDS) {
      for (const human of SPEEDS.filter((v) => v > 0)) {
        const { run, out } = samples('speed-separation', robot, human);
        const terms = separationTerms(robot, human);
        const S = protectiveSeparationM(robot, human);
        const trigger = run.trigger!;
        // At the trigger the person reaches the zone's edge and the tool is at its working point.
        const atTrigger = run.at(trigger.t);
        expect(atTrigger.personX).toBeCloseTo(S, 9);
        expect(atTrigger.toolX).toBeCloseTo(0, 9);
        // The robot keeps moving for the reaction time, then brakes at the model's deceleration.
        expect(trigger.toolStopX).toBeCloseTo(terms.robotReactionM + terms.brakingM, 9);
        expect(trigger.personStopX).toBeCloseTo(S - terms.humanTravelM, 9);
        expect(trigger.gapM).toBeCloseTo(INTRUSION_MARGIN_M + POSITION_UNCERTAINTY_M, 9);
        const stop = run.at(trigger.t + REACTION_TIME_S + stoppingTimeS(robot) + 1e-6);
        expect(stop.phase).toBe('stopped');
        expect(stop.toolX).toBeCloseTo(trigger.toolStopX, 6);
        expect(stop.personX).toBeCloseTo(trigger.personStopX, 6);
        // The tool reaches the robot's speed toward the person and never exceeds it; nothing jumps.
        for (let k = 1; k < out.length; k++) {
          const [a, b] = [out[k - 1]!.pose, out[k]!.pose];
          expect(b.toolSpeed).toBeLessThanOrEqual(robot + 1e-9);
          expect(Math.abs(b.toolX - a.toolX)).toBeLessThan(0.02);
          expect(Math.abs(b.personX - a.personX)).toBeLessThan(0.02);
        }
      }
    }
  });

  it('holds a monitored stop while the person is inside the cell', () => {
    for (const robot of [0.5, 1, 2]) {
      for (const human of [0, 1, 1.6, 2]) {
        const { out } = samples('monitored-stop', robot, human);
        let crossedIn = false;
        let movedOutside = false;
        for (const { pose } of out) {
          const inside = pose.personX < ENTRANCE_M;
          if (pose.toolSpeed > 0 && !inside) movedOutside = true;
          if (movedOutside && inside) crossedIn = true;
          // Before the person has stepped out, and after they step back in, the robot is stopped.
          if (inside) expect(pose.stopped).toBe(true);
          if (inside && !crossedIn) expect(pose.toolSpeed).toBe(0);
        }
        expect(movedOutside).toBe(true);
        const end = out[out.length - 1]!.pose;
        expect(end.personX).toBeCloseTo(STATION_M, 9);
        expect(end.toolSpeed).toBe(0);
      }
    }
  });

  it('moves the arm only with the guiding hand', () => {
    const { out } = samples('hand-guiding', 1, 1.6);
    for (const { pose } of out) {
      const tool = guideTool(pose.personX);
      expect(pose.toolX).toBeCloseTo(tool.x, 9);
      expect(pose.toolZ).toBeCloseTo(tool.z, 9);
    }
    expect(out[0]!.pose.personX).toBeCloseTo(GUIDE_M, 9);
    expect(out[out.length - 1]!.pose.personX).toBeCloseTo(GUIDE_M - GUIDE_PUSH_M, 9);
  });

  it('bumps the gauge at the robot speed and holds the model peak force', () => {
    for (const robot of SPEEDS.filter((v) => v > 0)) {
      const rest = restPose('power-force', robot, 1.6);
      expect(rest.forceN).toBeCloseTo(peakContactForceN(robot), 9);
      const { run } = samples('power-force', robot, 1.6);
      const end = run.at(run.duration);
      expect(end.forceN).toBeCloseTo(peakContactForceN(robot), 6);
      expect(end.toolX).toBeCloseTo(bumpTool(BUMP_M).x, 9);
      expect(end.forceN <= CONTACT_LIMIT_N).toBe(robot <= 0.8);
    }
  });

  it('keeps every link of the arm its own length in every pose of every run', () => {
    for (const mode of MODES) {
      for (const robot of [0.5, 1, 2]) {
        const { out } = samples(mode, robot, 1.6);
        for (const { pose } of out.filter((_, k) => k % 10 === 0)) {
          const j = armJoints(pose.toolX, pose.toolZ);
          expect(Math.hypot(j.elbow[0] - j.shoulder[0], j.elbow[2] - j.shoulder[2])).toBeCloseTo(61, 6);
          expect(Math.hypot(j.wrist[0] - j.elbow[0], j.wrist[2] - j.elbow[2])).toBeCloseTo(57, 6);
          // Elbow up: above the line from the shoulder to the wrist.
          const cross = (j.wrist[0] - j.shoulder[0]) * (j.elbow[2] - j.shoulder[2]) - (j.wrist[2] - j.shoulder[2]) * (j.elbow[0] - j.shoulder[0]);
          expect(cross).toBeGreaterThan(0);
        }
      }
    }
  });

  it('builds the cell once and rebuilds the arm with the same parts in every pose', () => {
    const slots = PARTS.filter((part) => part.kind === 'slot').map((part) => (part.kind === 'slot' ? part.slot : ''));
    expect(slots).toEqual(['field', 'riders', 'speed-needle', 'lamps', 'sled', 'arm', 'right-arm']);
    expect(SLED_PARTS.filter((part) => part.kind === 'slot')).toHaveLength(1);
    const names = armParts(0, 0.88, 'speed-separation').map((part) => part.name);
    expect(armParts(0.3, 0.6, 'power-force').map((part) => part.name)).toEqual(names);
    expect(armParts(-0.3, 0.88, 'hand-guiding').filter((part) => part.lit).map((part) => part.name)).toEqual(['handle-bracket', 'handle']);
    // Rolled away from the viewer, the handle is drawn behind the wrist, in its first slot; the front slot is empty.
    const away = armParts(0.3, 0.6, 'power-force', ROLL_AWAY);
    expect(away.find((part) => part.name === 'handle-back')!.paths.fill).not.toBe('');
    expect(away.find((part) => part.name === 'handle')!.paths.fill).toBe('');
    expect(restPose('power-force', 1, 1.6).roll).toBe(ROLL_AWAY);
    expect(restPose('hand-guiding', 1, 1.6).roll).toBe(ROLL_NEAR);
    const solids = PARTS.filter((part) => part.kind === 'solid').length + SLED_PARTS.filter((part) => part.kind === 'solid').length + names.length;
    expect(solids).toBeGreaterThanOrEqual(80);
    expect(solids).toBeLessThanOrEqual(150);
  });
});
