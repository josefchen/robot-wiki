# Motion language

This is how Robot Wiki moves. It is a written language, not a library of
one-off animations: a small vocabulary of motions, one set of colour roles,
one timing ladder, and one player contract that every animated scene
inherits. The goal is the standard set by hand-animated explanatory
mathematics videos: concrete objects that transform on a chalkboard while a
sentence tells you what changed and why.

Owner inputs, in order of authority:

1. [`library/motion-language-spec-20260926.md`](../../library/motion-language-spec-20260926.md) — the binding spec.
2. [`contract/motion-language.md`](../../contract/motion-language.md) — the measurable acceptance criteria (`VAL-MOTION*`).
3. `motion-tokens.json` — the single source of truth every generator reads.

## Why a language

A reader meets a Kalman gain on the classical pages and a denoising step on
the manipulation pages. If both are drawn by the same rules, the reader
stops re-learning how to read the picture and starts reading the idea. So
the language fixes three things once:

- **Meaning is colour.** The same quantity is the same colour everywhere.
- **Meaning is motion.** A thing that becomes another thing morphs; it never
  cuts or bounces.
- **Time is a beat.** One idea per beat, one sentence per beat, and the
  reader drives the clock.

## Surfaces

Animated scenes render on the bounded dark instrument surface, inside the
existing instrument frame: header, stage, caption, legend, readout. The
graphite stage is the chalkboard. Static charts and tables stay on the light
explanatory frame. Both surfaces use the same colour roles through their
stage and light variants.

## Colour roles

Every role names a meaning, not a decoration. Contrast is measured against
the graphite stage and against white; the closest pair under colour-blindness
simulation stays separable, and every role also has a non-colour encoding so
the mapping survives desaturation and forced colours.

| Role | Means | Stage | Light text | Light graphic | Encoding |
| --- | --- | --- | --- | --- | --- |
| state | estimate, belief, position, the main object | `#58C4DD` (6.9:1) | `#00829A` | `#2EA1B9` | solid 2 px stroke |
| measurement | observation, sensor reading, data point | `#E8C11C` (8.1:1) | `#956F00` | `#B69000` | cross or dot markers |
| action | policy output, control input, command | `#B189C6` (4.9:1) | `#8D67A1` | `#AE86C3` | arrows, arrowheads |
| value | reward, return, value, cost, score | `#A6CF8C` (8.0:1) | `#5B8141` | `#789F5F` | filled bars or areas |
| constraint | obstacle, collision, error, limit, failure | `#FC6255` (4.7:1) | `#D63E35` | `#FA6053` | 45° hatch fill |
| reference | ground truth, target, baseline | `#D9DADB` (10.0:1) | `#767778` | `#949595` | dashed 1.5 px |
| highlight | Indicate, selection, the thing to look at now | `#C6FF19` (11.8:1) | `#548200` | lime underlay behind ink | underlay or halo |

Three structural rules complete the picture:

- **Uncertainty is not a colour.** A covariance ellipse or confidence band
  takes the hue of the thing it belongs to, at 22 % fill with a dashed edge.
- **Stage structure is quiet.** Axes are concrete at 45 % opacity, the grid
  is 8 %, labels are white, secondary labels are concrete. Object and axis
  labels use IBM Plex Sans; mono is for numeric ticks and readouts. Keep
  labels outside data marks and attach them with fine leader lines.
- **Nothing else.** No gradients, glows, drop shadows or neon. Lime appears
  only where the reader should look right now.

The hex values above live in `motion-tokens.json` and are generated into CSS
custom properties (`--role-<name>-stage|text|graphic`), TypeScript constants,
and a Python theme for rendered clips. Hard-coded hex, easing or beat
durations in `components/interactive/**` or `components/motion/**` fail
`npm run check:motion-tokens`. The generated token files are the only
allowed literals.

## Time

Easing is one curve, `smooth(t) = t³·(10(1−t)² + 5t(1−t) + t²)`, with
`thereAndBack(t)` for Indicate. Simulation time — physics, filters,
rollouts — runs linearly in model time and is never eased: a filter that
eases is lying about when it converged.

The timing ladder:

| Thing | Duration |
| --- | --- |
| a beat | 1000 ms |
| a short beat | 500 ms |
| a long beat | 2000 ms |
| Indicate | 800 ms |
| Create / Write | 1000 ms + 100 ms per extra glyph, capped at 2000 ms |
| LaggedStart lag | 0.1, or 0.05 above 12 items |
| reduced-motion hold | 800 ms |

One motion at a time: a beat animates one idea and everything else on the
stage holds still.

## The vocabulary

The scene kit (`components/motion/`) implements the vocabulary as pure
functions of scene time composed with SVG:

- **create(path)** — the stroke draws on by path length, then the fill
  arrives over the last 30 %.
- **write(text | tex)** — glyphs draw on with a lagged start, then fill;
  glyphs can carry a baseline shift and scale so equations keep real
  notation.
- **transform(a, b)** — both paths are resampled to the same number of
  cubic segments, their start points aligned, and interpolated; the object
  keeps its identity, colour and React key.
- **transformMatchingTex(a, b)** — match glyphs by id; matched glyphs move,
  unmatched ones fade out or in.
- **indicate(el)** — scale to 1.2 and switch to the highlight role, out and
  back.
- **fadeIn / fadeOut(el, shift)** — opacity plus a shift of at most 8 % of
  the stage.
- **laggedStart(items)** — items start one after another by the lag ratio.
- **focus(bbox)** — camera pan and zoom, used sparingly; the stage never
  scrolls.

A scene is a beat list plus a frame function `frame(t)`. One timeline owns
`t`; play, pause, step, scrub, tests and captures only set `t`. Animated
values are refs or motion values, never React state updated per frame.

## Controls and accessibility

Every scene, no exceptions:

- Play/pause, step back and step forward one beat, a native range scrubber
  whose `aria-valuetext` is the current beat's caption, and Reset.
- Keys: Space or K, ← and →, Home and End.
- No autoplay, ever. The poster is the prerendered final frame of the last
  beat, and play is a click.
- Captions sit visibly under the stage and are announced politely once per
  beat; together they are the scene's text alternative.
- Under reduced motion, stepping jumps between beat end-states with no
  tweening, and the scrubber still works.
- Playback pauses when the scene leaves the viewport or the tab is hidden.

## Craft

What makes a scene feel explained rather than decorated:

1. Show a concrete example before the general formula. Numbers first,
   symbols second.
2. Notation appears next to the object it names, then travels with it.
3. Objects transform; they don't cut.
4. The same quantity has the same colour on every page.
5. End on a still frame that summarizes the idea, with the key relation
   Indicated once.
6. No decorative motion. Motion only for change that is the concept.
7. Keep text short on the stage; sentences live in captions. Stage labels
   are at least 12 px at a 375 px viewport.
8. Sourced numbers are byte-identical, with citations. Toy scenes say so.

## The look-and-fix loop

`npm run scene:capture -- <scene-id>` renders every beat's end-state plus
the poster at 375 px and 1440 px into `evidence/motion/scenes/`. Look at
every image: no overlap or clipping, labels readable, roles correct, one
idea per beat, captions matching the frame, reduced-motion stills intact.
Fix and re-capture until clean, then commit the captures. A scene nobody
looked at is not done.

## Cinematic clips

A clip is the answer when the lesson is the whole run, not one step: 240
steps of a filter settling, a policy improving across an episode, a
denoising schedule you should feel the length of. A live scene is the
answer when the lesson is one step you can stop and poke. When both
would teach, the scene wins; mount a clip only where a clip teaches
better, at most about two per domain.

The pipeline is fully offline and stays that way:

- `npm run clips:venv` creates a machine-local Python venv with the
  renderer pinned (`manim==0.21.0`) and never touches the repository
  beyond `scripts/motion/`. It is idempotent: a second run verifies and
  exits. Deployment scripts never invoke it.
- `motion-clips.json` is the single manifest: beats with captions,
  durations, the stage size, the status vocabulary, the text alternative
  and the per-file budget. `npm run generate:motion-clips` regenerates
  `lib/motion-clips.ts` from it; drift fails a test.
- `npm run clips:render` plays each manifest clip through a Manim scene
  (importing the same generated `motion_theme.py` the Python scenes use
  and the same model code via a deterministic JSON export), then encodes
  VP9 WebM and H.264 MP4, cuts the poster from the final frame, and
  writes one WebVTT cue per beat plus the text alternative. Anything
  over 3 MiB fails the render and the test suite.
- `npm run clips:capture` walks every mounted clip at 375 px and
  1440 px: the poster state before any bytes are fetched, then each
  beat's end-state taken by seeking the decoded video. The same
  look-and-fix loop as scenes applies.

A clip mounts as `<Clip id="..." />`: a native `<video controls
preload="none">` with the poster and intrinsic size pinned, WebM and MP4
sources, a captions track, a visible status line, and an `sr-only`
transcript linked by `aria-describedby`. It never autoplays — the poster
is the consent screen — it ships silent, and it pauses itself when it
leaves the viewport or the tab is hidden.

## Performance

Scenes are code-split behind a same-size poster, activate with zero layout
shift, run the rAF loop only while playing, and stay 2D SVG unless the
concept is 3D. Per-scene JavaScript stays at or under 25 kB gzipped.

## Do and don't

- Do keep the filter's or sampler's real numbers on the stage and in the
  readout; don't round a story into a different one.
- Do draw uncertainty in the hue of the thing it belongs to; don't invent an
  "uncertainty grey".
- Do morph a belief ellipse into its posterior; don't cross-fade two
  pictures of the same object.
- Do end on a still with the relation Indicated once; don't loop idle
  motion.
- Do write `K` next to the gain point; don't make the reader hunt a legend.
- Don't hard-code a hex, an easing or a duration in a scene file; the token
  check fails the build.
