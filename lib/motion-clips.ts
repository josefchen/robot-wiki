/**
 * Generated from motion-clips.json by scripts/generate-motion-clips.ts.
 * Do not edit: change motion-clips.json and regenerate.
 */

export type MotionClipStatus =
  | 'schematic'
  | 'authored'
  | 'toy'
  | 'illustrative'
  | 'not measured';

export interface MotionClipBeat {
  caption: string;
  durationMs: number;
}

export interface MotionClipFiles {
  webm: string;
  mp4: string;
  poster: string;
  vtt: string;
  text: string;
}

export interface MotionClip {
  id: string;
  title: string;
  /** The article route the clip is mounted on. */
  route: string;
  /** One visible sentence under the stage naming what the clip teaches. */
  teaches: string;
  status: MotionClipStatus;
  statusNote: string;
  /** Intrinsic stage size; the mount keeps this aspect at every width. */
  width: number;
  height: number;
  durationMs: number;
  beats: MotionClipBeat[];
  textAlternative: string;
  files: MotionClipFiles;
}

/** The per-file ceiling for every shipped clip artifact, in bytes. */
export const MOTION_CLIP_BUDGET_BYTES = 3145728;

/** Every registered clip, keyed by id. */
export const MOTION_CLIPS: Record<string, MotionClip> = {
  'kalman-episode': {
    id: 'kalman-episode',
    title: "One Kalman filter, a whole run",
    route: '/classical/state-estimation',
    teaches: "The same seeded filter as the step-through scene, played over a whole run: the estimate tracks the wandering target through readings and dropouts while its uncertainty band breathes.",
    status: 'schematic',
    statusNote: "Seeded toy filter; schematic, not measured hardware.",
    width: 1280,
    height: 720,
    durationMs: 18000,
    beats: [
    { caption: "A target wanders through one dimension; the dashed line is its true position, step by step.", durationMs: 3000 },
    { caption: "A noisy position sensor reports on most steps and stays silent on about one in five.", durationMs: 3000 },
    { caption: "One fusion up close: the wide predicted belief meets a reading, and the gain K narrows the posterior between them.", durationMs: 3000 },
    { caption: "Run the whole episode: the estimate drifts through each dropout and corrects on each reading, staying close to the truth.", durationMs: 6500 },
    { caption: "Predict smears the belief, update sharpens it; that alternation, repeated forever, is the filter.", durationMs: 2500 },
    ],
    textAlternative: "Schematic cinematic clip, 18 seconds: one Kalman filter over a whole run. A target wanders in one dimension; the dashed line is its true position. A noisy position sensor reports on most steps and drops about one in five; its readings are the scattered markers. One fusion up close: the wide predicted belief meets a reading, and the gain K narrows the posterior between them. Run the whole episode: the estimate drifts through each dropout and corrects on each reading, staying close to the truth. Predict smears the belief, update sharpens it; that alternation, repeated forever, is the filter. Seeded toy filter; schematic, not measured hardware.",
    files: {
      "webm": "/clips/kalman-episode.webm",
      "mp4": "/clips/kalman-episode.mp4",
      "poster": "/clips/kalman-episode.png",
      "vtt": "/clips/kalman-episode.vtt",
      "text": "/clips/kalman-episode.txt"
    },
  },
};

export function getMotionClip(id: string): MotionClip {
  const clip = MOTION_CLIPS[id];
  if (!clip) {
    throw new Error(
      `Unknown motion clip '${id}'. Registered: ${Object.keys(MOTION_CLIPS).join(', ')}.`,
    );
  }
  return clip;
}

/** Every file over the budget, in the order given. At-budget passes. */
export function clipBudgetViolations(
  files: ReadonlyArray<{ path: string; bytes: number }>,
): Array<{ path: string; bytes: number; budgetBytes: number }> {
  return files
    .filter((file) => file.bytes > MOTION_CLIP_BUDGET_BYTES)
    .map((file) => ({
      path: file.path,
      bytes: file.bytes,
      budgetBytes: MOTION_CLIP_BUDGET_BYTES,
    }));
}
