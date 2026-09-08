/**
 * Deterministic teaching curve, not the VLA-Perf performance model.
 * VLA-Perf v1 predicts 52.57 ms for 2.7B pi0 and 3.9 Hz for hypothetical
 * 9.1B pi0-L on its Thor configuration (BF16/FP16, three cameras, ten
 * steps, chunk 50, batch one, network excluded). The curve deliberately
 * assigns the first latency to a 3.0B TOY coordinate to preserve existing
 * defaults. Below it the curve is linear; above it a power law connects
 * to 1000/3.9 ms. Neither rule is a hardware measurement or size limit.
 * Reciprocal inference Hz is not a robot/controller frequency. No sensor,
 * execution or network overhead is added by this teaching calculation.
 */

/** The control loop the budget is measured against. */
export const CONTROL_HZ = 50;
export const CONTROL_PERIOD_MS = 1000 / CONTROL_HZ;

/** Teaching-coordinate range in billions; neither endpoint is a measurement. */
export const MIN_PARAMS_B = 0.5;
export const MAX_PARAMS_B = 9.1;

/** Teaching coordinates using VLA-Perf predicted latencies; pi0 is 2.7B in the paper, not 3.0B. */
export const PI0_ANCHOR = { paramsB: 3.0, inferenceMs: 52.57 } as const;
export const PI0L_ANCHOR = { paramsB: 9.1, inferenceMs: 1000 / 3.9 } as const;

export function clampParamsB(paramsB: number): number {
  if (Number.isNaN(paramsB)) return MIN_PARAMS_B;
  return Math.min(MAX_PARAMS_B, Math.max(MIN_PARAMS_B, paramsB));
}

/**
 * Internal teaching latency: linear below the chosen 3.0B coordinate,
 * power-law above it. Continuous at both coordinates; not a hardware
 * predictor or the paper roofline implementation.
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

/** Reciprocal toy inference latency; not an observed controller rate. */
export function effectiveHz(inferenceMs: number): number {
  return 1000 / inferenceMs;
}

export type LatencyReference = {
  id: string;
  label: string;
  /** Reference duration in ms; its provenance and interpretation are in detail. */
  ms: number;
  /** Where the number comes from and what it includes. */
  detail: string;
  /** Citation registry id backing the number. */
  citationId: string;
  /** When true, the reference is a training-delay setting, not measured latency. */
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
    detail: 'VLA-Perf roofline: 1000/162.5 ms; BF16/FP16, 3 cameras, 10 steps, chunk 50, no network',
    citationId: 'vla-perf-2026',
  },
  {
    id: 'pi0-thor',
    label: 'pi0, Jetson Thor',
    ms: 52.57,
    detail: 'VLA-Perf roofline: 19.0 inference Hz; BF16/FP16, 3 cameras, 10 steps, chunk 50, no network',
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
    label: 'RTC mean total, non-mobile robot',
    ms: 108.76,
    detail: '±2.34 ms SD; 50 calls, RTX 4090/bfloat16, 5 steps, wired LAN',
    citationId: 'real-time-chunking-2025',
  },
  {
    id: 'rtc-mobile',
    label: 'RTC mean total, mobile robot',
    ms: 138.98,
    detail: '±6.71 ms SD; model 96.89, network 21.20, resize 11.22, other 9.67 ms',
    citationId: 'real-time-chunking-2025',
  },
  {
    id: 'pi07-tolerance',
    label: 'pi0.7 training-delay setting',
    ms: 240,
    detail: 'paper: maximum 12 simulated ticks at 50 Hz, not a measured guarantee',
    citationId: 'pi07-2026',
    absorbed: true,
  },
];
