/**
 * Latency model for the control-loop budget interactive. Pure functions,
 * unit-tested in tests/unit/control-loop.test.ts.
 *
 * Data honesty: the two anchors are measured values from VLA-Perf
 * (arXiv:2602.18397, NVIDIA Research): pi0 (~3B) runs end-to-end at
 * 52.57 ms (19.0 Hz) on Jetson Thor, pi0-L (9.1B) at 3.9 Hz. VLA-Perf
 * reports Jetson Thor as memory-bound across the whole model (takeaway 11),
 * so below the pi0 anchor the model scales linearly in parameter count and
 * between the anchors it interpolates as a power law. Everything off the
 * two anchors is an illustrative scaling model, not a measurement; the UI
 * labels it as such. See research/03-data-hardware-evaluation.md.
 */

/** The control loop the budget is measured against. */
export const CONTROL_HZ = 50;
export const CONTROL_PERIOD_MS = 1000 / CONTROL_HZ;

/** Slider range, in billions of parameters, bracketed by the measurements. */
export const MIN_PARAMS_B = 0.5;
export const MAX_PARAMS_B = 9.1;

/** VLA-Perf Jetson Thor anchors. */
export const PI0_ANCHOR = { paramsB: 3.0, inferenceMs: 52.57 } as const;
export const PI0L_ANCHOR = { paramsB: 9.1, inferenceMs: 1000 / 3.9 } as const;

export function clampParamsB(paramsB: number): number {
  if (Number.isNaN(paramsB)) return MIN_PARAMS_B;
  return Math.min(MAX_PARAMS_B, Math.max(MIN_PARAMS_B, paramsB));
}

/**
 * Modeled end-to-end inference latency on Jetson Thor for a VLA of the
 * given size. Linear below the pi0 anchor (memory-bound: latency tracks
 * bytes read, which tracks parameters), power-law between the two measured
 * anchors. Continuous at both anchors.
 */
export function inferenceMsOnThor(paramsB: number): number {
  const b = clampParamsB(paramsB);
  if (b <= PI0_ANCHOR.paramsB) {
    return PI0_ANCHOR.inferenceMs * (b / PI0_ANCHOR.paramsB);
  }
  const slope =
    Math.log(PI0L_ANCHOR.inferenceMs / PI0_ANCHOR.inferenceMs) /
    Math.log(PI0L_ANCHOR.paramsB / PI0_ANCHOR.paramsB);
  return PI0_ANCHOR.inferenceMs * Math.pow(b / PI0_ANCHOR.paramsB, slope);
}

/** True when inference fits inside one 20 ms control period. */
export function loopCloses(inferenceMs: number): boolean {
  return inferenceMs <= CONTROL_PERIOD_MS;
}

/** Deadlines missed after the first period the inference overruns. */
export function missedTicks(inferenceMs: number): number {
  if (inferenceMs <= CONTROL_PERIOD_MS) return 0;
  return Math.ceil(inferenceMs / CONTROL_PERIOD_MS) - 1;
}

/** The rate the loop actually runs at when inference is the bottleneck. */
export function effectiveHz(inferenceMs: number): number {
  return 1000 / inferenceMs;
}

export type LatencyReference = {
  id: string;
  label: string;
  /** Measured (or, for pi0.7, tolerated) latency in ms. */
  ms: number;
  /** Where the number comes from and what it includes. */
  detail: string;
  /** Citation registry id backing the number. */
  citationId: string;
  /** When true, the latency is tolerated by design, not a loop failure. */
  absorbed?: boolean;
};

/**
 * The sourced latency figures shown alongside the timeline. Every value
 * here is published; see the citation ids.
 */
export const LATENCY_REFERENCES: LatencyReference[] = [
  {
    id: 'pi0-h100',
    label: 'pi0, H100 server',
    ms: 1000 / 162.5,
    detail: '162.5 Hz end-to-end, VLA-Perf',
    citationId: 'vla-perf-2026',
  },
  {
    id: 'pi0-thor',
    label: 'pi0, Jetson Thor',
    ms: 52.57,
    detail: '19.0 Hz end-to-end, VLA-Perf',
    citationId: 'vla-perf-2026',
  },
  {
    id: 'pi06-h100',
    label: 'pi0.6, H100 server',
    ms: 63,
    detail: '5 denoising steps, 3 cameras, per chunk',
    citationId: 'pi06-model-card-2025',
  },
  {
    id: 'rtc-static',
    label: 'RTC total, static robot',
    ms: 108,
    detail: 'model + network + preprocessing, measured',
    citationId: 'real-time-chunking-2025',
  },
  {
    id: 'rtc-mobile',
    label: 'RTC total, mobile robot',
    ms: 139,
    detail: '97 model + 21 network + 11 resize + 9.7 other',
    citationId: 'real-time-chunking-2025',
  },
  {
    id: 'pi07-tolerance',
    label: 'pi0.7 tolerated latency',
    ms: 240,
    detail: 'training-time RTC, 12 ticks at 50 Hz',
    citationId: 'pi07-2026',
    absorbed: true,
  },
];
