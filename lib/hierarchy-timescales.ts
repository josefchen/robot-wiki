/**
 * Structured data for the hierarchy-timescales interactive, from
 * research/01-learned-manipulation-lineage.md (sections on pi0.5,
 * Gemini Robotics 1.5, Helix 02, GO-2, and the 2022-2026 hierarchy line).
 * Unit-tested in tests/unit/hierarchy-timescales.test.ts.
 *
 * Each system is drawn as a set of lanes, one per level of its control
 * hierarchy, laid over a shared wall-clock horizon. A lane fires once per
 * period; a null period means the lane fires exactly once at t=0 (the task
 * instruction). Rates marked `disclosed: false` are NOT in the primary
 * source: the lane exists (the architectural split is disclosed) but the
 * rate is our schematic rendering, and the note says so. Never invent a
 * rate and mark it disclosed.
 */

/** Wall-clock span of the timeline, in milliseconds. */
export const HORIZON_MS = 2000;

/** Upper bound on SVG tick marks per lane; denser lanes subsample. */
export const MAX_DISPLAY_TICKS = 120;

export interface TimescaleLane {
  /** Stable id, also used in test selectors. */
  id: string;
  /** Display label. */
  label: string;
  /** Short rate label, e.g. "50 Hz", "~1 Hz", "once". */
  rate: string;
  /** Milliseconds between updates; null for a lane that fires once at t=0. */
  periodMs: number | null;
  /** One-line explanation, including provenance of the rate. */
  note: string;
  /** True only when the primary source states this rate. */
  disclosed: boolean;
}

export interface TimescaleSystem {
  id: string;
  name: string;
  org: string;
  /** One-line description of how this system splits its hierarchy. */
  pattern: string;
  /** Citation registry id (data/citations.ts) backing the lane structure. */
  citationId: string;
  /** Lanes ordered slowest to fastest. */
  lanes: TimescaleLane[];
}

export const HIERARCHY_SYSTEMS: readonly TimescaleSystem[] = [
  {
    id: 'pi05',
    name: 'π0.5',
    org: 'Physical Intelligence',
    pattern:
      'One network, hierarchy internalized: the same VLA predicts the next language subtask at low frequency and conditions the flow-matching action expert on it at high frequency. There is no separate planner model.',
    citationId: 'pi05-2025',
    lanes: [
      {
        id: 'instruction',
        label: 'Task instruction',
        rate: 'once',
        periodMs: null,
        note: 'Given once at episode start, e.g. "clean the kitchen".',
        disclosed: true,
      },
      {
        id: 'subtask',
        label: 'Subtask prediction',
        rate: '~1 Hz',
        periodMs: 1000,
        note: 'High-level inference inside the same network emits the next language subtask. The paper states low frequency; the exact rate is not disclosed, 1 Hz shown schematically.',
        disclosed: false,
      },
      {
        id: 'chunk',
        label: 'Chunk inference',
        rate: '1 chunk/s',
        periodMs: 1000,
        note: '50-step action chunks at 50 Hz cover one second each; the original release runs inference synchronously.',
        disclosed: true,
      },
      {
        id: 'control',
        label: 'Motor commands',
        rate: '50 Hz',
        periodMs: 20,
        note: 'One action per control tick, executed from the current chunk.',
        disclosed: true,
      },
    ],
  },
  {
    id: 'gemini-15',
    name: 'Gemini Robotics 1.5',
    org: 'Google DeepMind',
    pattern:
      'Both patterns at once: the VLA interleaves language thinking traces with actions (internalized), while ER 1.5 remains a separate high-level orchestrator with a tunable thinking budget.',
    citationId: 'gemini-robotics-15-2025',
    lanes: [
      {
        id: 'instruction',
        label: 'Task instruction',
        rate: 'once',
        periodMs: null,
        note: 'Given once at episode start.',
        disclosed: true,
      },
      {
        id: 'er',
        label: 'ER 1.5 orchestration',
        rate: 'on demand',
        periodMs: 2000,
        note: 'A separate high-level agent with a tunable thinking budget. Update rate not disclosed, shown schematically.',
        disclosed: false,
      },
      {
        id: 'thinking',
        label: 'Thinking traces + actions',
        rate: '~3 Hz',
        periodMs: 333,
        note: 'The VLA interleaves natural-language thinking with action output. Rate not disclosed, shown schematically.',
        disclosed: false,
      },
      {
        id: 'control',
        label: 'Motor commands',
        rate: '50 Hz',
        periodMs: 20,
        note: 'Control frequency not disclosed; 50 Hz shown schematically for comparability.',
        disclosed: false,
      },
    ],
  },
  {
    id: 'helix-02',
    name: 'Helix 02',
    org: 'Figure',
    pattern:
      'A three-rate stack, all learned: S2 sequences behaviors, S1 maps all sensors to all joints at 200 Hz, and S0, a 10M-parameter whole-body controller, runs at 1 kHz. Vendor-reported; no paper.',
    citationId: 'helix-02-2026',
    lanes: [
      {
        id: 'instruction',
        label: 'Task instruction',
        rate: 'once',
        periodMs: null,
        note: 'Given once at episode start.',
        disclosed: true,
      },
      {
        id: 's2',
        label: 'S2 behavior sequencing',
        rate: '~1 Hz',
        periodMs: 1000,
        note: 'The VLM reasons over scene and instruction and emits latent goals. Update rate not disclosed, shown schematically.',
        disclosed: false,
      },
      {
        id: 's1',
        label: 'S1 visuomotor policy',
        rate: '200 Hz',
        periodMs: 5,
        note: 'All sensors in (head and palm cameras, fingertip tactile, full-body proprioception), all joints out. Vendor-reported 200 Hz.',
        disclosed: true,
      },
      {
        id: 's0',
        label: 'S0 whole-body controller',
        rate: '1 kHz',
        periodMs: 1,
        note: 'A 10M-parameter network trained on 1,000+ hours of retargeted human motion plus sim-to-real RL. Vendor-reported 1 kHz.',
        disclosed: true,
      },
    ],
  },
  {
    id: 'go2',
    name: 'GO-2',
    org: 'AgiBot',
    pattern:
      'An asynchronous dual system: a low-frequency planner (the "general commander") emits action intents as a macro plan, and a high-frequency follower (the "agile executor") refines them against live observations.',
    citationId: 'agibot-go2-2026',
    lanes: [
      {
        id: 'instruction',
        label: 'Task instruction',
        rate: 'once',
        periodMs: null,
        note: 'Given once at episode start.',
        disclosed: true,
      },
      {
        id: 'planner',
        label: 'Intent planner (action CoT)',
        rate: 'low freq',
        periodMs: 2000,
        note: 'The planner generates a macro plan of high-level action intents, executed stage by stage. Asynchronous; rate not disclosed, shown schematically.',
        disclosed: false,
      },
      {
        id: 'follower',
        label: 'Follower refinement',
        rate: 'high freq',
        periodMs: 100,
        note: 'The follower refines intents against real-time observations, trained with teacher forcing so it tolerates imperfect reasoning. Rate not disclosed, shown schematically.',
        disclosed: false,
      },
      {
        id: 'control',
        label: 'Motor commands',
        rate: '50 Hz',
        periodMs: 20,
        note: 'Control frequency not disclosed; 50 Hz shown schematically for comparability.',
        disclosed: false,
      },
    ],
  },
];

export function getSystem(id: string): TimescaleSystem {
  const system = HIERARCHY_SYSTEMS.find((s) => s.id === id);
  if (!system) throw new Error(`unknown timescale system: ${id}`);
  return system;
}

/**
 * The system's fastest periodic lane (smallest periodMs). The instruction
 * lane (periodMs null) fires once at t=0 and is never a rate, so it is
 * excluded from both ends of every fastest/slowest comparison.
 */
export function fastestLane(system: TimescaleSystem): TimescaleLane {
  const periodic = system.lanes.filter((l) => l.periodMs !== null);
  if (periodic.length === 0) throw new Error(`system has no periodic lanes: ${system.id}`);
  return periodic.reduce((a, b) => (a.periodMs! <= b.periodMs! ? a : b));
}

/**
 * The system's slowest periodic lane (largest periodMs; the earliest lane
 * wins ties, as with pi0.5's equal 1000 ms subtask and chunk lanes).
 */
export function slowestPeriodicLane(system: TimescaleSystem): TimescaleLane {
  const periodic = system.lanes.filter((l) => l.periodMs !== null);
  if (periodic.length === 0) throw new Error(`system has no periodic lanes: ${system.id}`);
  return periodic.reduce((a, b) => (a.periodMs! >= b.periodMs! ? a : b));
}

/**
 * How many times the fastest lane ticks per update of the slowest periodic
 * lane: slowestPeriodMs / fastestPeriodMs. This is the per-system ratio a
 * description may quote; it is derived, never authored, so a system with
 * no 1 kHz lane can never be described as having one.
 */
export function laneTickRatio(system: TimescaleSystem): number {
  return slowestPeriodicLane(system).periodMs! / fastestLane(system).periodMs!;
}

/**
 * All update times for a lane within the horizon. A null period fires once
 * at t=0; a periodic lane fires at each multiple of its period, starting
 * with the first one (nothing fires at t=0 for periodic lanes).
 */
export function laneEventTimes(
  lane: TimescaleLane,
  horizonMs: number = HORIZON_MS,
): number[] {
  if (lane.periodMs === null) return [0];
  const events: number[] = [];
  for (let t = lane.periodMs; t <= horizonMs; t += lane.periodMs) {
    events.push(t);
  }
  return events;
}

/** Number of lane updates at or before time tMs (clamped to the horizon). */
export function updateCountAt(
  lane: TimescaleLane,
  tMs: number,
  horizonMs: number = HORIZON_MS,
): number {
  const t = Math.min(Math.max(tMs, 0), horizonMs);
  if (lane.periodMs === null) return 1;
  return Math.floor(t / lane.periodMs);
}

/** Most recent update time at or before tMs, or null if none has fired. */
export function lastUpdateAt(
  lane: TimescaleLane,
  tMs: number,
  horizonMs: number = HORIZON_MS,
): number | null {
  if (lane.periodMs === null) return tMs >= 0 ? 0 : null;
  const count = updateCountAt(lane, tMs, horizonMs);
  return count === 0 ? null : count * lane.periodMs;
}

/**
 * Tick positions to draw. Slow lanes render every event; lanes denser than
 * MAX_DISPLAY_TICKS subsample evenly so the SVG stays bounded.
 */
export function displayTicks(
  lane: TimescaleLane,
  horizonMs: number = HORIZON_MS,
  maxTicks: number = MAX_DISPLAY_TICKS,
): number[] {
  const events = laneEventTimes(lane, horizonMs);
  if (events.length <= maxTicks) return events;
  const step = Math.ceil(events.length / maxTicks);
  return events.filter((_, i) => i % step === 0);
}
