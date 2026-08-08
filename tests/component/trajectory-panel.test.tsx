import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrajectoryPanel } from '@/components/three/trajectory-panel';
import {
  useTrajectory,
  type TrajectoryController,
} from '@/components/three/use-trajectory';
import {
  SEGMENT_SECONDS,
  easeInOutCubic,
  type JointLimit,
} from '@/lib/trajectory';

const JOINTS: JointLimit[] = [
  { name: 'pan', lower: -1.92, upper: 1.92 },
  { name: 'lift', lower: -1.745, upper: 1.745 },
];

const HOME = { pan: 0, lift: 0 };
const POSE_A = { pan: 0.5, lift: -0.5 };
const POSE_B = { pan: -0.5, lift: 1 };

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

interface HarnessProps {
  setPoseSpy: (angles: Record<string, number>) => void;
  capture: (controller: TrajectoryController) => void;
}

/**
 * Drives the real useTrajectory hook the way PlaygroundCanvas does: an
 * angles state (the pose source for recording) and a setPose sink that
 * writes back into it, with test buttons that stand in for joint sliders.
 */
function Harness({ setPoseSpy, capture }: HarnessProps) {
  const [angles, setAngles] = useState<Record<string, number>>({ ...HOME });
  const controller = useTrajectory({
    joints: JOINTS,
    angles,
    setPose: (next) => {
      setPoseSpy(next);
      setAngles((previous) => ({ ...previous, ...next }));
    },
  });
  capture(controller);
  return (
    <div>
      <button data-testid="pose-home" onClick={() => setAngles({ ...HOME })}>
        home
      </button>
      <button data-testid="pose-a" onClick={() => setAngles({ ...POSE_A })}>
        pose a
      </button>
      <button data-testid="pose-b" onClick={() => setAngles({ ...POSE_B })}>
        pose b
      </button>
      <TrajectoryPanel controller={controller} />
    </div>
  );
}

function setup() {
  const setPoseSpy = vi.fn();
  let controller: TrajectoryController | null = null;
  render(
    <Harness
      setPoseSpy={setPoseSpy}
      capture={(c) => {
        controller = c;
      }}
    />,
  );
  return {
    setPoseSpy,
    get controller() {
      if (!controller) throw new Error('controller not captured');
      return controller;
    },
  };
}

function recordPose(testId: string) {
  fireEvent.click(screen.getByTestId(testId));
  fireEvent.click(screen.getByTestId('trajectory-add'));
}

describe('trajectory recording', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => vi.restoreAllMocks());

  it('gates keyframe capture behind the record control', () => {
    setup();
    expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
      'no keyframes',
    );
    expect(screen.getByTestId('trajectory-add')).toBeDisabled();
    fireEvent.click(screen.getByTestId('trajectory-record'));
    expect(screen.getByTestId('trajectory-record')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('trajectory-add')).toBeEnabled();
  });

  it('accumulates keyframes as poses are captured', () => {
    setup();
    fireEvent.click(screen.getByTestId('trajectory-record'));
    recordPose('pose-home');
    expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
      '1 keyframe',
    );
    recordPose('pose-a');
    recordPose('pose-b');
    expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
      '3 keyframes',
    );
    expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
      `${(2 * SEGMENT_SECONDS).toFixed(1)} s`,
    );
    // Each keyframe is listed with its playback time.
    expect(screen.getByTestId('trajectory-keyframe-0')).toHaveTextContent(
      '0.0 s',
    );
    expect(screen.getByTestId('trajectory-keyframe-2')).toHaveTextContent(
      `${(2 * SEGMENT_SECONDS).toFixed(1)} s`,
    );
  });
});

describe('trajectory playback', () => {
  beforeEach(() => {
    mockReducedMotion(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setupTwoKeyframes() {
    const ctx = setup();
    fireEvent.click(screen.getByTestId('trajectory-record'));
    recordPose('pose-home');
    recordPose('pose-a');
    ctx.setPoseSpy.mockClear();
    return ctx;
  }

  it('eases between keyframes and lands exactly on the final pose', () => {
    const ctx = setupTwoKeyframes();
    fireEvent.click(screen.getByTestId('trajectory-play'));
    expect(ctx.controller.playing).toBe(true);

    // Mid-playback: progress readout is live and the pose tracks the eased
    // curve (slower than linear in the first half).
    act(() => {
      vi.advanceTimersByTime(SEGMENT_SECONDS * 250);
    });
    const progress = ctx.controller.progress;
    expect(progress).not.toBeNull();
    expect(progress!.duration).toBeCloseTo(SEGMENT_SECONDS, 5);
    expect(progress!.t).toBeGreaterThan(0.15);
    expect(progress!.t).toBeLessThan(0.45);
    const last = ctx.setPoseSpy.mock.lastCall![0];
    const eased = easeInOutCubic(progress!.t / SEGMENT_SECONDS);
    expect(last.pan).toBeCloseTo(0.5 * eased, 1);
    // Eased value sits below the linear interpolation at this time.
    expect(last.pan).toBeLessThan(0.5 * (progress!.t / SEGMENT_SECONDS));

    // Several distinct intermediate poses: no teleporting.
    const distinct = new Set(
      ctx.setPoseSpy.mock.calls.map(([a]) => a.pan.toFixed(4)),
    );
    expect(distinct.size).toBeGreaterThan(3);

    act(() => {
      vi.advanceTimersByTime(SEGMENT_SECONDS * 800);
    });
    expect(ctx.controller.playing).toBe(false);
    expect(ctx.controller.progress).toBeNull();
    expect(ctx.setPoseSpy.mock.lastCall![0]).toEqual(POSE_A);
  });

  it('moves to a single recorded keyframe without error', () => {
    const { setPoseSpy, controller } = setup();
    fireEvent.click(screen.getByTestId('trajectory-record'));
    recordPose('pose-a');
    setPoseSpy.mockClear();
    fireEvent.click(screen.getByTestId('trajectory-play'));
    expect(controller.playing).toBe(false);
    expect(setPoseSpy.mock.lastCall![0]).toEqual(POSE_A);
    expect(screen.getByTestId('trajectory-message')).toHaveTextContent(
      /single keyframe/i,
    );
  });

  it('steps discretely between keyframes under prefers-reduced-motion', () => {
    mockReducedMotion(true);
    const ctx = setupTwoKeyframes();
    fireEvent.click(screen.getByTestId('trajectory-play'));
    // 90% into the segment the pose is still the first keyframe (no
    // interpolated motion), then it steps to the final keyframe at the end.
    act(() => {
      vi.advanceTimersByTime(SEGMENT_SECONDS * 900);
    });
    expect(ctx.setPoseSpy.mock.lastCall![0]).toEqual(HOME);
    expect(ctx.controller.playing).toBe(true);
    act(() => {
      vi.advanceTimersByTime(SEGMENT_SECONDS * 400);
    });
    expect(ctx.controller.playing).toBe(false);
    expect(ctx.setPoseSpy.mock.lastCall![0]).toEqual(POSE_A);
  });

  it('stop halts playback and leaves the pose where it is', () => {
    const ctx = setupTwoKeyframes();
    fireEvent.click(screen.getByTestId('trajectory-play'));
    act(() => {
      vi.advanceTimersByTime(SEGMENT_SECONDS * 500);
    });
    fireEvent.click(screen.getByTestId('trajectory-stop'));
    const held = ctx.setPoseSpy.mock.lastCall![0];
    act(() => {
      vi.advanceTimersByTime(SEGMENT_SECONDS * 2000);
    });
    expect(ctx.controller.playing).toBe(false);
    expect(ctx.setPoseSpy.mock.lastCall![0]).toEqual(held);
  });
});

describe('trajectory clear and empty states', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => vi.restoreAllMocks());

  it('disables playback with no keyframes and says why', () => {
    setup();
    expect(screen.getByTestId('trajectory-play')).toBeDisabled();
    expect(screen.getByTestId('trajectory-message')).toHaveTextContent(
      /record/i,
    );
  });

  it('clear removes keyframes, stops playback, and re-disables play', () => {
    vi.useFakeTimers();
    const ctx = setup();
    fireEvent.click(screen.getByTestId('trajectory-record'));
    recordPose('pose-home');
    recordPose('pose-a');
    fireEvent.click(screen.getByTestId('trajectory-play'));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.click(screen.getByTestId('trajectory-clear'));
    expect(ctx.controller.playing).toBe(false);
    expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
      'no keyframes',
    );
    expect(screen.getByTestId('trajectory-play')).toBeDisabled();
    expect(screen.getByTestId('trajectory-message')).toHaveTextContent(
      /record/i,
    );
    vi.useRealTimers();
  });
});

describe('trajectory export and import', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => vi.restoreAllMocks());

  function setupThreeKeyframes() {
    const ctx = setup();
    fireEvent.click(screen.getByTestId('trajectory-record'));
    recordPose('pose-home');
    recordPose('pose-a');
    recordPose('pose-b');
    return ctx;
  }

  it('exports valid JSON with the recorded keyframes', () => {
    setupThreeKeyframes();
    fireEvent.click(screen.getByTestId('trajectory-export'));
    const text = (
      screen.getByTestId('trajectory-export-json') as HTMLTextAreaElement
    ).value;
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe('robot-atlas-trajectory');
    expect(parsed.keyframes).toHaveLength(3);
    expect(parsed.jointNames).toEqual(['pan', 'lift']);
    expect(screen.getByTestId('trajectory-download')).toHaveAttribute(
      'download',
    );
  });

  it('round-trips export to import and preserves the poses', () => {
    const { setPoseSpy } = setupThreeKeyframes();
    fireEvent.click(screen.getByTestId('trajectory-export'));
    const text = (
      screen.getByTestId('trajectory-export-json') as HTMLTextAreaElement
    ).value;
    fireEvent.click(screen.getByTestId('trajectory-clear'));
    expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
      'no keyframes',
    );

    fireEvent.change(screen.getByTestId('trajectory-import-json'), {
      target: { value: text },
    });
    fireEvent.click(screen.getByTestId('trajectory-import'));
    expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
      '3 keyframes',
    );
    expect(screen.getByTestId('trajectory-message')).toHaveTextContent(
      /imported 3 keyframes/i,
    );

    // Jumping to the final keyframe reproduces the original final pose.
    setPoseSpy.mockClear();
    fireEvent.click(screen.getByTestId('trajectory-keyframe-2'));
    expect(setPoseSpy.mock.lastCall![0]).toEqual(POSE_B);
  });

  const BAD_IMPORTS: Array<[string, unknown, RegExp]> = [
    ['malformed JSON', '{oops', /not valid json/i],
    [
      'empty keyframes array',
      { format: 'robot-atlas-trajectory', version: 1, keyframes: [] },
      /no keyframes/i,
    ],
    [
      'mismatched joint names',
      {
        format: 'robot-atlas-trajectory',
        version: 1,
        keyframes: [{ angles: { pan: 0, wrong_joint: 0 } }],
      },
      /wrong_joint|lift/,
    ],
    [
      'out-of-range angles',
      {
        format: 'robot-atlas-trajectory',
        version: 1,
        keyframes: [{ angles: { pan: 99, lift: 0 } }],
      },
      /limit/i,
    ],
    [
      'missing angle fields',
      { format: 'robot-atlas-trajectory', version: 1, keyframes: [{}] },
      /angle|keyframe/i,
    ],
  ];

  for (const [label, payload, pattern] of BAD_IMPORTS) {
    it(`rejects ${label} with a clear error and keeps existing state`, () => {
      setupThreeKeyframes();
      const text =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      fireEvent.change(screen.getByTestId('trajectory-import-json'), {
        target: { value: text },
      });
      fireEvent.click(screen.getByTestId('trajectory-import'));
      const message = screen.getByTestId('trajectory-message');
      expect(message).toHaveTextContent(pattern);
      expect(message).toHaveAttribute('role', 'alert');
      // Existing keyframes survive the failed import.
      expect(screen.getByTestId('trajectory-count')).toHaveTextContent(
        '3 keyframes',
      );
    });
  }
});
