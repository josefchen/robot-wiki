import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SENSE_AVOID_PX_PER_M,
  SENSE_AVOID_SCENE,
  SenseAvoid,
  senseAvoidDistances,
  senseAvoidFrame,
} from '@/components/motion/scenes/sense-avoid';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import { buildCorridor } from '@/components/iso/figures/latency-corridor';
import { expectedSceneRole } from '@/lib/motion-scene-roles';

const SPANS = beatSpans(SENSE_AVOID_SCENE.beats);

describe('SenseAvoid stage (the twin flight-test corridor)', () => {
  it('draws the poster as both lanes set up at the gate, the slow lane marks at 200 ms', () => {
    const { container } = render(<SenseAvoid />);
    const stage = container.querySelector('[data-motion-stage] svg')!;
    expect(stage).not.toBeNull();
    // No words in the drawing.
    expect(stage.querySelectorAll('text')).toHaveLength(0);
    // Two drones, two carriages, two timers and two dials: the same built parts, one per lane.
    for (const lane of ['quick', 'slow']) {
      for (const part of ['carriage', 'drone', 'timer', 'dial']) {
        expect(stage.querySelectorAll(`[data-scene-part="${lane}-${part}"]`)).toHaveLength(1);
      }
    }
    expect(stage.querySelectorAll('[data-scene-part="wall"]')).toHaveLength(1);
    // Only the slow lane's stretches are the scene's marks, in their reviewed roles.
    const marks = [...stage.querySelectorAll('[data-scene-mark]')].map((node) => node.getAttribute('data-scene-mark'));
    expect(marks.sort()).toEqual(['avoidance-budget', 'latency-budget']);
    const blind = stage.querySelector('[data-scene-mark="latency-budget"]')!;
    const swerve = stage.querySelector('[data-scene-mark="avoidance-budget"]')!;
    expect(expectedSceneRole('sense-avoid', 'latency-budget')).toBe('constraint');
    expect(expectedSceneRole('sense-avoid', 'avoidance-budget')).toBe('action');
    expect(blind.getAttribute('fill')).toBe('var(--role-constraint-stage)');
    expect(swerve.getAttribute('stroke')).toBe('var(--role-action-stage)');
    // The poster is the 200 ms camera: about 2.9 m flown before the report, the rest of the 8 m swerving.
    const slow = senseAvoidDistances(0.2);
    expect(Number(blind.getAttribute('width'))).toBeCloseTo(slow.blindM * SENSE_AVOID_PX_PER_M, 1);
    expect(Number(swerve.getAttribute('width'))).toBeCloseTo(slow.swerveM * SENSE_AVOID_PX_PER_M, 1);
    expect(Number(swerve.getAttribute('x'))).toBeCloseTo(slow.blindM * SENSE_AVOID_PX_PER_M, 1);
    // The quick lane's stretches are structure on the back track, full length on the poster.
    const quick = senseAvoidDistances(0.07);
    expect(Number(stage.querySelector('[data-scene-structure="quick-blind"]')!.getAttribute('width'))).toBeCloseTo(quick.blindM * SENSE_AVOID_PX_PER_M, 1);
    // One lit part on the poster: the slow lane's dial needle.
    const lit = [...stage.querySelectorAll('[data-tone="lit"]')];
    expect(lit).toHaveLength(1);
    expect(lit[0].closest('[data-scene-part="slow-dial"]')).not.toBeNull();
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(SENSE_AVOID_SCENE.beats[3].caption);
  });

  it('draws the marks on the gauge board at the e2e scale, whatever the corridor scale', () => {
    // A mark's width is metres x SENSE_AVOID_PX_PER_M in its track's face plane (the e2e reads it).
    expect(SENSE_AVOID_PX_PER_M).toBeCloseTo((300 - 64) / 8, 9);
    const rig = buildCorridor({ tracks: 2 });
    expect(rig.trackMatrix(0, SENSE_AVOID_PX_PER_M)).toMatch(/^matrix\(.+\) scale\(0\.6779\d*\)$/);
    expect(rig.trackDepth(0, SENSE_AVOID_PX_PER_M)).toBeGreaterThan(0);
  });

  it("keeps the beats: the slow lane's delay grows in beat 3 and its marks show only from then", () => {
    expect(senseAvoidFrame(SPANS[1].end).slowShown).toBe(0);
    expect(senseAvoidFrame(SPANS[2].end).slowShown).toBe(1);
    expect(senseAvoidFrame(SPANS[2].end).latency).toBeCloseTo(0.2, 9);
    expect(senseAvoidFrame(SPANS[0].end).camera).toBe(0);
    expect(senseAvoidFrame(SPANS[1].end).camera).toBe(1);
  });

  it('server-renders the same poster it hydrates', () => {
    expect(posterTime(SPANS)).toBe(SPANS[3].end);
    const html = renderToString(<SenseAvoid />);
    expect(html).toContain('data-motion-scene="sense-avoid"');
    expect(html).toContain('data-scene-mark="latency-budget"');
    expect(html).not.toContain('<text');
  });
});
