'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  durationSeconds,
  parseTrajectory,
  sampleAngles,
  SEGMENT_SECONDS,
  serializeTrajectory,
  type JointLimit,
  type TrajectoryKeyframe,
} from '@/lib/trajectory';

export interface TrajectoryMessage {
  kind: 'info' | 'error';
  text: string;
}

export interface TrajectoryProgress {
  /** Seconds into playback. */
  t: number;
  /** Total playback duration, seconds. */
  duration: number;
}

export interface TrajectoryController {
  keyframes: TrajectoryKeyframe[];
  recording: boolean;
  playing: boolean;
  progress: TrajectoryProgress | null;
  message: TrajectoryMessage | null;
  /** The last exported JSON, shown as copyable text and as a download. */
  exportText: string | null;
  segmentSeconds: number;
  startRecording: () => void;
  stopRecording: () => void;
  addKeyframe: () => void;
  play: () => void;
  stopPlayback: () => void;
  clear: () => void;
  exportTrajectory: () => void;
  /** Returns true when the import succeeded. */
  importTrajectory: (text: string) => boolean;
  jumpToKeyframe: (index: number) => void;
}

interface UseTrajectoryArgs {
  joints: JointLimit[];
  /** Current pose, radians per joint name (the kinematics source of truth). */
  angles: Record<string, number>;
  /** Writes a full pose back into the kinematics state. */
  setPose: (angles: Record<string, number>) => void;
}

const TICK_MS = 40;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Owns the playground's trajectory state: recorded keyframes, the
 * record-armed flag, playback, export/import, and the user-facing message
 * line. Playback advances on a timer (not rAF) so it progresses even in
 * environments where requestAnimationFrame never fires, and the joint
 * readouts update continuously because every tick writes through the same
 * setPose the IK solver uses.
 *
 * Under prefers-reduced-motion playback keeps its timing but steps
 * discretely between keyframes instead of interpolating, so no eased
 * motion is shown.
 */
export function useTrajectory({
  joints,
  angles,
  setPose,
}: UseTrajectoryArgs): TrajectoryController {
  const [keyframes, setKeyframes] = useState<TrajectoryKeyframe[]>([]);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState<TrajectoryProgress | null>(null);
  const [message, setMessage] = useState<TrajectoryMessage | null>({
    kind: 'info',
    text: 'Record a pose to start a trajectory.',
  });
  const [exportText, setExportText] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  // Refs mirror the values the playback tick reads, so the interval never
  // closes over stale state. Synced in an effect, never during render.
  const keyframesRef = useRef(keyframes);
  const anglesRef = useRef(angles);
  const jointsRef = useRef(joints);
  useEffect(() => {
    keyframesRef.current = keyframes;
    anglesRef.current = angles;
    jointsRef.current = joints;
  });

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    stopTimer();
    setPlaying(false);
    setProgress(null);
  }, [stopTimer]);

  // A different arm (model swap) invalidates recorded keyframes.
  const jointsKey = joints.map((j) => j.name).join('|');
  const previousJointsKey = useRef(jointsKey);
  useEffect(() => {
    if (previousJointsKey.current === jointsKey) return;
    previousJointsKey.current = jointsKey;
    stopTimer();
    setKeyframes([]);
    setRecording(false);
    setPlaying(false);
    setProgress(null);
    setExportText(null);
    setMessage({ kind: 'info', text: 'Record a pose to start a trajectory.' });
  }, [jointsKey, stopTimer]);

  // Never leak the interval on unmount.
  useEffect(() => stopTimer, [stopTimer]);

  const startRecording = useCallback(() => {
    setRecording(true);
    setMessage({
      kind: 'info',
      text: 'Recording. Move the arm, then add a keyframe per pose.',
    });
  }, []);

  const stopRecording = useCallback(() => {
    setRecording(false);
  }, []);

  const addKeyframe = useCallback(() => {
    if (!recording) return;
    const snapshot: Record<string, number> = {};
    for (const joint of jointsRef.current) {
      snapshot[joint.name] = anglesRef.current[joint.name] ?? 0;
    }
    setKeyframes((previous) => [...previous, { angles: snapshot }]);
    setMessage({
      kind: 'info',
      text: `Captured keyframe ${keyframesRef.current.length + 1}.`,
    });
    setExportText(null);
  }, [recording]);

  const play = useCallback(() => {
    const recorded = keyframesRef.current;
    if (recorded.length === 0) {
      setMessage({
        kind: 'info',
        text: 'Nothing to play. Record at least one keyframe first.',
      });
      return;
    }
    stopTimer();

    if (recorded.length === 1) {
      setPlaying(false);
      setProgress(null);
      setPose(recorded[0].angles);
      setMessage({
        kind: 'info',
        text: 'Single keyframe trajectory: moved straight to it. Add another keyframe to interpolate.',
      });
      return;
    }

    const duration = durationSeconds(recorded.length);
    const interpolate = !prefersReducedMotion();
    const startedAt = Date.now();
    setPlaying(true);
    setProgress({ t: 0, duration });
    setMessage({ kind: 'info', text: 'Playing trajectory.' });

    timerRef.current = window.setInterval(() => {
      const t = (Date.now() - startedAt) / 1000;
      if (t >= duration) {
        stopTimer();
        setPose(recorded[recorded.length - 1].angles);
        setPlaying(false);
        setProgress(null);
        setMessage({ kind: 'info', text: 'Playback finished.' });
        return;
      }
      const sampled = sampleAngles(recorded, t, { interpolate });
      if (sampled) setPose(sampled);
      setProgress({ t, duration });
    }, TICK_MS);
  }, [setPose, stopTimer]);

  const clear = useCallback(() => {
    stopPlayback();
    setKeyframes([]);
    setExportText(null);
    setMessage({
      kind: 'info',
      text: 'Trajectory cleared. Record a pose to start a new one.',
    });
  }, [stopPlayback]);

  const exportTrajectory = useCallback(() => {
    const recorded = keyframesRef.current;
    if (recorded.length === 0) {
      setMessage({
        kind: 'info',
        text: 'Nothing to export. Record at least one keyframe first.',
      });
      return;
    }
    setExportText(
      serializeTrajectory(
        jointsRef.current.map((j) => j.name),
        recorded,
      ),
    );
    setMessage({
      kind: 'info',
      text: `Exported ${recorded.length} ${recorded.length === 1 ? 'keyframe' : 'keyframes'} as JSON.`,
    });
  }, []);

  const importTrajectory = useCallback(
    (text: string): boolean => {
      const result = parseTrajectory(text, jointsRef.current);
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error });
        return false;
      }
      stopPlayback();
      setKeyframes(result.keyframes);
      setExportText(null);
      setMessage({
        kind: 'info',
        text: `Imported ${result.keyframes.length} ${result.keyframes.length === 1 ? 'keyframe' : 'keyframes'}.`,
      });
      return true;
    },
    [stopPlayback],
  );

  const jumpToKeyframe = useCallback(
    (index: number) => {
      const keyframe = keyframesRef.current[index];
      if (!keyframe) return;
      stopPlayback();
      setPose(keyframe.angles);
      setMessage({
        kind: 'info',
        text: `Moved to keyframe ${index + 1}.`,
      });
    },
    [setPose, stopPlayback],
  );

  return {
    keyframes,
    recording,
    playing,
    progress,
    message,
    exportText,
    segmentSeconds: SEGMENT_SECONDS,
    startRecording,
    stopRecording,
    addKeyframe,
    play,
    stopPlayback,
    clear,
    exportTrajectory,
    importTrajectory,
    jumpToKeyframe,
  };
}
