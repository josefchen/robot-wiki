import { describe, expect, it } from 'vitest';
import {
  DIFFUSION_LANDINGS,
  DIFFUSION_SCENE,
  FOLLOWED,
  GUESS_DISTANCES,
  WORKED_DISTANCES,
  diffusionCleanAt,
  diffusionLitAt,
  diffusionPinsAt,
  diffusionReadoutAt,
  diffusionStepAt,
} from '@/components/motion/scenes/diffusion-denoising';
import { beatSpans } from '@/components/motion/timeline';
import {
  BALL_PX,
  BALL_RANGE,
  BAR_R,
  BAR_Z,
  HEIGHT,
  PAD_VB,
  WIDTH,
  ballAt,
  ballZ,
  dialAngle,
  type Lane,
} from '@/components/iso/figures/denoising-gauge';
import {
  DENOISING_STEPS,
  GUESSES,
  PIN_COUNT,
  cleanUp,
  distance,
  noiseOf,
  profileOf,
} from '@/lib/denoising-gauge';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';
import { symbolHits } from '@/lib/figure-main-view';

const SPANS = beatSpans(DIFFUSION_SCENE.beats);
const END = SPANS[SPANS.length - 1].end;
const at = (beat: number, k: number) => SPANS[beat].start + SPANS[beat].duration * k;
const LANES: Lane[] = [0, 1];
const STATES = GUESSES.map(({ seed }) => cleanUp(noiseOf(seed)));

describe('diffusion flagship scene craft (the denoising gauge)', () => {
  it('keeps the five beats in teaching order', () => {
    expect(DIFFUSION_SCENE.beats.map((beat) => beat.id)).toEqual([
      'demos', 'forward-noise', 'reverse-steps', 'in-symbols', 'recap',
    ]);
  });

  it('ends every beat, and every clean-up step, on one of the model\'s own states', () => {
    for (const lane of LANES) {
      const { demo, seed } = GUESSES[lane];
      expect(diffusionPinsAt(lane, SPANS[0].end), `demonstration ${lane}`).toEqual(profileOf(demo));
      expect(diffusionPinsAt(lane, SPANS[1].end - 1e-6).map((h) => Number(h.toFixed(4))), `noise ${lane}`)
        .toEqual(noiseOf(seed).map((h) => Number(h.toFixed(4))));
      for (let done = 0; done <= DENOISING_STEPS; done += 1) {
        const t = at(2, done / DENOISING_STEPS);
        expect(diffusionPinsAt(lane, t), `step ${done} of gauge ${lane}`).toEqual(STATES[lane][done]);
        expect(diffusionStepAt(t)).toBe(done);
      }
      for (const t of [SPANS[2].end, SPANS[3].end, END]) {
        expect(diffusionPinsAt(lane, t)).toEqual(STATES[lane][DENOISING_STEPS]);
      }
    }
    expect(diffusionStepAt(at(2, 0.5))).toBe(DENOISING_STEPS / 2);
  });

  it('keeps every ball inside the stage, with the 4 px margin on the narrowest full-size stage, at every 25 ms', () => {
    const marginVb = 4 / (MOTION_STAGE_TYPE.fullSizeMinStagePx / WIDTH);
    expect(PAD_VB).toBeGreaterThanOrEqual(marginVb);
    for (let t = 0; t <= END; t += 25) {
      for (const lane of LANES) {
        diffusionPinsAt(lane, t).forEach((height, i) => {
          const [x, y] = ballAt(lane, i, height);
          expect(x - BALL_PX, `gauge ${lane} pin ${i} at ${t}`).toBeGreaterThanOrEqual(marginVb);
          expect(x + BALL_PX).toBeLessThanOrEqual(WIDTH - marginVb);
          expect(y - BALL_PX).toBeGreaterThanOrEqual(marginVb);
          expect(y + BALL_PX).toBeLessThanOrEqual(HEIGHT - marginVb);
          // And on the gauge: no pin falls into its guide or rises out of reach.
          expect(ballZ(height)).toBeGreaterThanOrEqual(BALL_RANGE.low - 1e-9);
          expect(ballZ(height)).toBeLessThanOrEqual(BALL_RANGE.high + 1e-9);
        });
      }
    }
  });

  it('turns the pins to random and back: grey while random, ink once set, never brighter while noise is added', () => {
    expect(diffusionCleanAt(SPANS[0].end)).toBe(1);
    expect(diffusionCleanAt(SPANS[1].end - 1e-6)).toBeLessThan(0.001);
    let previous = 1;
    for (let k = 0; k <= 100; k += 1) {
      const clean = diffusionCleanAt(at(1, k / 100));
      expect(clean).toBeLessThanOrEqual(previous);
      previous = clean;
    }
    for (let k = 0; k <= 100; k += 1) {
      const clean = diffusionCleanAt(at(2, k / 100));
      expect(clean).toBeGreaterThanOrEqual(previous);
      previous = clean;
    }
    expect(diffusionCleanAt(END)).toBe(1);
  });

  it('lights one part per beat: none for the demonstrations, the shaker, the followed guess, the camera, then both moves', () => {
    expect(SPANS.map((span) => diffusionLitAt(span.start + span.duration / 2))).toEqual([
      'none', 'shaker', 'followed', 'camera', 'moves',
    ]);
  });

  it('reads the followed guess from the model: its readout is its distance from the move it lands on', () => {
    const landing = profileOf(DIFFUSION_LANDINGS[FOLLOWED]);
    for (let done = 0; done <= DENOISING_STEPS; done += 1) {
      // Inside the beat: a hair after its start for step 0, a hair before its end for step 10.
      const t = done === 0 ? at(2, 0) + 1 : at(2, done / DENOISING_STEPS - (done === DENOISING_STEPS ? 1e-6 : 0));
      const gap = distance(diffusionPinsAt(FOLLOWED, t), landing);
      expect(diffusionReadoutAt(t)).toBe(`Step ${diffusionStepAt(t)} of ${DENOISING_STEPS} · the lit guess is ${gap.toFixed(2)} from a good move`);
    }
    expect(WORKED_DISTANCES.start.toFixed(2)).toBe('0.82');
    expect(WORKED_DISTANCES.end.toFixed(2)).toBe('0.00');
    expect(GUESS_DISTANCES.start).toBeGreaterThan(0.5);
    expect(GUESS_DISTANCES.end).toBeLessThan(1e-6);
  });

  it('writes every readout in plain words, with no symbol, at every 50 ms', () => {
    const seen = new Set<string>();
    for (let t = 0; t <= END; t += 50) seen.add(diffusionReadoutAt(t));
    for (const line of seen) expect(symbolHits(line), line).toEqual([]);
    expect(diffusionReadoutAt(END)).toBe('Two random guesses, two good moves · neither hits the bar');
  });

  it('lands the two guesses on different good moves, each thread clear of the bar where it crosses', () => {
    expect([...DIFFUSION_LANDINGS].sort()).toEqual(['over', 'under']);
    for (const lane of LANES) {
      const heights = diffusionPinsAt(lane, END);
      // Pins 8 and 9 stand either side of the bar; the thread between them passes over or under it.
      const z = [ballZ(heights[PIN_COUNT / 2 - 1]), ballZ(heights[PIN_COUNT / 2])];
      if (DIFFUSION_LANDINGS[lane] === 'over') for (const zi of z) expect(zi).toBeGreaterThan(BAR_Z + BAR_R + 10);
      else for (const zi of z) expect(zi).toBeLessThan(BAR_Z - BAR_R - 10);
    }
  });

  it('counts the steps on the dial, one tick a step over 270 degrees', () => {
    expect(dialAngle(DENOISING_STEPS) - dialAngle(0)).toBeCloseTo(Math.PI * 1.5, 12);
    for (let done = 0; done < DENOISING_STEPS; done += 1) {
      expect(dialAngle(done + 1) - dialAngle(done)).toBeCloseTo((Math.PI * 1.5) / DENOISING_STEPS, 12);
    }
  });
});
