# Robot Wiki motion-language contract

Status: **active for the motion-language foundation and the clip pipeline**

Canonical inputs:

- Owner spec: [`library/motion-language-spec-20260926.md`](../library/motion-language-spec-20260926.md)
- Plain-language design doc: [`docs/design/motion-language.md`](../docs/design/motion-language.md)
- Token source of truth: [`motion-tokens.json`](../motion-tokens.json)

This contract turns the motion language into measurable repository acceptance
criteria. Every ID is collision-free within the `VAL-MOTION*` namespace.
Tests may be stricter, but they MUST NOT weaken these definitions. A failure
blocks a motion-language release.

## 1. Tokens

| ID | Requirement |
| --- | --- |
| `VAL-MOTION-001` | `motion-tokens.json` is the single source of truth for motion colour roles, timing, lag, uncertainty, stage structure and easing. `scripts/generate-motion-tokens.ts` regenerates `lib/motion-tokens.ts`, `components/motion/motion-tokens.css` and `scripts/motion/motion_theme.py` from it byte-identically on a clean run; a drifted generated file fails the check. |
| `VAL-MOTION-002` | The scene kit under `components/motion/` exports the spec vocabulary as working primitives: `create` (`Create`), `write` (`Write`), `transform` (`Transform`), `transformMatchingTex`, `indicate` (`Indicate`), `fadeIn`/`fadeOut` (`Fade`), `laggedStart` (`laggedProgress`), and `focus` (`focusViewBox`), each a pure function of scene time composed with SVG, unit-tested for path resampling, easing values and determinism. |
| `VAL-MOTION-003` | One timeline owns time: a scene is a beat list plus a pure frame function of scene time `t`; play, pause, step, scrub, tests and captures only set `t`; no animated value lives in per-frame React state. |
| `VAL-MOTION-004` | Colour roles match the owner spec: state, measurement, action, value, constraint, reference and highlight, each with stage, light-text and light-graphic variants generated from `motion-tokens.json`, the same quantity keeping the same colour across pages; uncertainty takes the hue of the thing it belongs to at the token's fill alpha with a dashed edge, never its own colour. |
| `VAL-MOTION-005` | `npm run check:motion-tokens` scans `components/interactive/**` and `components/motion/**` sources and fails on hard-coded hex colours, `rgb()`/`hsl()` colour functions, CSS easing keywords/functions outside the token easing, and hard-coded transition/animation durations; the only exemptions are the generated token artifacts named by the check. |
| `VAL-MOTION-006` | Easing is `smooth(t) = t³·(10(1−t)² + 5t(1−t) + t²)` with `thereAndBack` for Indicate; beats default to 1000 ms with 500 ms short and 2000 ms long; Indicate 800 ms; Create/Write 1000 ms plus 100 ms per extra glyph capped at 2000 ms; lag ratios 0.1, or 0.05 above 12 items; simulation beats run linear; CSS easings sample `smooth` into `linear(...)` with at least 20 stops. |

## 2. Scenes, controls, accessibility

| ID | Requirement |
| --- | --- |
| `VAL-MOTION-007` | Every scene renders through the shared player with play/pause, step back and step forward one beat, a native `<input type="range">` scrubber whose `aria-valuetext` is the current beat's caption, and `InstrumentReset`; keys are Space/K play-pause, ←/→ step one beat, Home/End. |
| `VAL-MOTION-008` | No scene autoplays. The poster is the prerendered final frame of the last beat at the same size as the live stage (zero layout shift), activation is a click, the click is the play consent, and the player is code-split behind that poster. |
| `VAL-MOTION-009` | Under `prefers-reduced-motion: reduce`, activation stays on the poster still, play holds beat end-states with no tweening at the token's hold duration, stepping and the scrubber keep working, and simulation loops show sampled stills. |
| `VAL-MOTION-010` | Each beat's caption is a sentence that stands on its own, sits visibly under the stage, is announced politely once per beat, and the captions together form the scene's text alternative (an `sr-only` block linked by `aria-describedby`). |
| `VAL-MOTION-011` | A playing scene pauses when it leaves the viewport (IntersectionObserver) or when the tab is hidden (visibilitychange), and the rAF loop runs only while playing. |

## 3. Reference scenes and evidence

| ID | Requirement |
| --- | --- |
| `VAL-MOTION-012` | The Kalman predict-and-update reference scene under `components/motion/scenes/` plays the five specified beats (prior belief with its uncertainty ellipse; predict moving the mean and growing the ellipse; an arriving measurement with its own ellipse; update combining them with the gain K indicated as a point on the prediction-to-measurement segment; a recap still with the recursion written next to the picture), keeping the `lib/kalman.ts` model and its seeded numbers byte-identical. |
| `VAL-MOTION-013` | The diffusion-policy denoising reference scene plays the four specified beats (clean action trajectories as action arrows; forward noising with the points jittering in a lagged start; reverse transport of the noise back onto the modes over the 10-step schedule conditioned on the observed state in the state colour; a recap still with the step count and conditioning labelled), keeping the `lib/denoising.ts` model, seed, sample count and schedule byte-identical. |
| `VAL-MOTION-014` | `npm run scene:capture -- <scene-id>` renders every beat's end-state plus the poster at 375 px and 1440 px into `evidence/motion/scenes/`, the captures are committed, and each was inspected through the look-and-fix loop: no overlap or clipping, readable labels, correct roles, one idea per beat, captions matching the frame, reduced-motion stills intact. |
| `VAL-MOTION-015` | Each scene is code-split behind a same-size placeholder, causes zero layout shift on activation, keeps the rAF loop paused while not playing, and stays a 2D SVG scene unless 3D is the concept; per-scene JavaScript stays at or under 25 kB gzipped. |
| `VAL-MOTION-016` | Truth labelling holds: sourced numbers render byte-identically with their citations, toy or illustrative scenes carry the status vocabulary (schematic / authored / toy / illustrative / not measured) in a visible status line, and model parameters keep their locators. |

## 4. Cinematic clips

| ID | Requirement |
| --- | --- |
| `VAL-MOTION-017` | The clip pipeline is fully offline: a pinned renderer lives in a machine-local Python venv that `npm run clips:venv` creates idempotently (the renderer is never a build dependency), `motion-clips.json` is the single manifest source from which `lib/motion-clips.ts` is generated without drift, and `npm run clips:render` produces, per clip, a WebM (VP9), an MP4 (H.264), a PNG poster, a WebVTT captions file with one cue per beat and a text-alternative transcript — every artifact at or under 3 MiB, enforced by a test that fails above it. No deployment script (`vercel-build`, `prebuild`, `build`, `postbuild`) invokes the renderer or the venv. |
| `VAL-MOTION-018` | A mounted clip is a native `<video controls preload="none">` with the poster and intrinsic size pinned (no layout shift, no bytes fetched before the reader asks), WebM and MP4 sources, a `<track kind="captions">` bound to the WebVTT, a visible status line carrying the status vocabulary, an `sr-only` transcript linked by `aria-describedby`, no `autoplay` attribute anywhere, and playback that pauses when the mount leaves the viewport or the tab is hidden. Clips ship without an audio track, so they can never autoplay with sound. |

## 5. Owner-reviewed scene composition

The owner-review conditions apply to every end-state, poster and reduced-motion
still of both reference scenes, at both 375 and 1440 CSS-pixel viewports. The
geometry and contrast probes must reject a deliberately planted violation;
machine checks supplement, not replace, inspection of the actual images.

| ID | Requirement |
| --- | --- |
| `VAL-MOTION-030` | Play, step, scrub and reset controls compute to at least 4.5:1 text contrast against their actual nearest painted background, including controls in the light `InstrumentHeader`. |
| `VAL-MOTION-031` | No visible text box intersects another text box or a visible data mark on any captured frame. Labels use offsets and leaders where a mark needs identification. |
| `VAL-MOTION-032` | Every mark and label remains inside the bounded stage with at least a 4px margin at both viewports. Ellipses and state dots must fit, not disappear at an edge. |
| `VAL-MOTION-033` | The Kalman and diffusion equations render as accessible typeset math, not monospace strings with fake subscripts. |
| `VAL-MOTION-034` | Axis and object labels use the brand UI face at the spec size (at least 12px at 375px); monospace is reserved for numeric readouts, and ticks are fewer and smaller than the object labels. |
| `VAL-MOTION-035` | The Kalman position label is clear of ellipses and axes, K and z labels do not collide, state dots are not clipped, and ellipses fit the plot. In diffusion the observed-state label is clear of the cloud and there is no duplicate standalone o; grid and margins stay quiet with one teaching idea per beat. |
