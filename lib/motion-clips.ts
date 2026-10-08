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
  /** The clip's name, used for its region label and transcript. */
  title: string;
  /** The technical name above the headline, six words or fewer. */
  kicker: string;
  /** The takeaway in plain words, ten or fewer. */
  headline: string;
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
  /** The paragraphs of the "How this was made" fold. */
  method: string[];
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
    kicker: "Kalman filter, a whole run",
    headline: "Noisy, patchy readings still give a steady track",
    route: '/classical/state-estimation',
    teaches: "Sensors are noisy and sometimes go quiet; the filter still tracks the target and shows how sure it is.",
    status: 'illustrative',
    statusNote: "Illustrative: a simulated run, not measured on hardware.",
    width: 1280,
    height: 720,
    durationMs: 16000,
    beats: [
    { caption: "A target drifts back and forth; the dashed line shows where it really is at each moment.", durationMs: 3000 },
    { caption: "A noisy sensor reports its position, and on about one step in five it reports nothing.", durationMs: 3000 },
    { caption: "The filter's track follows the target, and the shaded band around it shows how unsure it is.", durationMs: 6500 },
    { caption: "Where readings drop out the band widens, and the next reading pulls it tight again.", durationMs: 3500 },
    ],
    method: [
      "A seeded toy simulation (seed 1): a target drifts along a line, and a position sensor reads it with random noise and misses about one step in five. The clip shows 240 steps of that run, steps 300 to 540.",
      "Each step has two halves, which Kalman filters call predict and update: predicting where the target moved widens the band, and a reading, when one arrives, narrows it.",
      "The band spans two standard deviations either side of the filter's estimate, about 95% of its belief. The filter's noise settings match the simulation: process noise 0.20, reading noise 1.00.",
      "The note marks steps 436 to 439, the longest run of missing readings in the simulation: four in a row. The band grows to three times its width at the last reading, then narrows when the next one arrives.",
      "The clip is rendered offline from the same filter code as the scene above. It is silent; its captions and the transcript carry the words.",
    ],
    textAlternative: "Illustrative cinematic clip, 16 seconds: one Kalman filter over a whole run of 240 steps. A target drifts back and forth; the dashed line shows where it really is at each moment. A noisy sensor reports its position, and on about one step in five it reports nothing; its readings are the scattered dots. The filter's track follows the target, and the shaded band around it shows how unsure it is. Where readings drop out the band widens, and the next reading pulls it tight again. A note points at the widest stretch, where four readings in a row are missing: no readings, so the band grows to three times its width and the filter is less sure. In filter terms, each predict step widens the band and each update with a reading narrows it. Simulated run, not measured on hardware.",
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
