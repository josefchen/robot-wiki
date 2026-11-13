# Design

Robot Wiki should read like a careful research publication: paper, ink,
hairlines, real data and one quiet accent. This page lists what a change to a
page, component or figure must respect. The tokens live in code; this page
says what they mean.

## Identity

- The name is exactly `Robot Wiki`. The descriptor is exactly
  "Citation-first encyclopedia of modern robot learning."
- There is no logo, symbol or mascot. The wordmark is the name set in the
  display face. The one exception is the tab icon (`app/favicon.ico`,
  `app/icon.svg`, `app/apple-icon.png`): the wordmark's R in paper on ink.
- Technical identifiers such as `robot-wiki` stay as they are.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-paper` | `#FAFAF8` | page ground |
| `--color-ink` | `#1C1C1A` | text, rules, primary actions, focus |
| `--color-graphite` | `#3F3F3B` | secondary marks |
| `--color-highlight` | `#A3A39E` | light chart tone |
| `--color-concrete` | `#DEDEDB` | lightest chart tone, selection |
| `--color-signal` | `#3B6EA8` | the one accent |
| `--line`, `--line-strong` | ink at 14% and 22% | 1 px hairlines |

- The accent marks the one highlighted series, registration and active
  information paths. It never fills a control.
- `ok`, `warn`, `error` and `destructive` are status colors only and meet
  4.5:1 on paper and white. Green and red mark outcomes, nothing else.
- Values live in `app/globals.css`. `lib/design-tokens.ts` mirrors them for
  the Open Graph renderer and the 3D playground, and a test keeps the two
  equal.

## Type

- DM Sans for display: the article H1 at 400, section heads and the wordmark
  at 600.
- Geist for body and interface text, 16 px on a 1.62 line height.
- Geist Mono for numerals, code and tabular readouts.
- All three load through `next/font`. Tektur is used only by the offline Open
  Graph card renderer and never ships to a page.
- Roles are registered in `data/type-roles.json`.

## Layout

- One top bar: the wordmark on the left, "Articles" and "How robots work" on
  the right.
- A 960 px reading column. At wide widths a sticky contents rail; on narrow
  screens it becomes a "Contents" disclosure.
- Citations are numbered margin sidenotes that open inline on phones.
- Tables are booktabs: an ink rule above and below, a hairline under the
  header, no vertical rules, tabular numerals.
- Spacing comes from the ladder 4, 8, 12, 16, 24, 32, 48, 64, 96 and 128 px.

## Surfaces and states

- No shadows, gradients, glass, textures, colored panels behind text, rounded
  pills or accent bars.
- Radius is 0 everywhere except 7 px on code blocks.
- Rules are 1 px hairlines. Only a table's top and bottom rules are heavier.
- Primary actions are ink with white text. Links are ink and underlined.
- Selected and current states use ink weight and a 1 px ink rule or
  underline, never a color fill.
- The focus ring is a 1 px ink outline offset 2 px, shown for keyboard
  focus.
- There is no dark theme. Dark grounds are limited to code, media and the 3D
  playground.

## Figures

Every explanatory figure, scene and tool uses the shared frame in
`components/motion/figure-frame.tsx`, in this order:

1. A header: an optional kicker of at most 6 words, then a headline of at most
   10 words that states what the figure shows. At most two visible controls,
   and a fold labeled exactly "Adjust more" for the rest.
2. The stage: the paper itself, with no card, fill, border or shadow. At rest
   it already shows the point the headline names, with one plain annotation.
3. One caption sentence of at most 25 words that says why the point matters.
4. A fold labeled exactly "How this was made" with the method, sources,
   formulas, caveats and the data.
5. At most one source line.

Rules for the main view:

- No symbols or bare units: no Greek letters, variables, formulas, Hz or ms.
  Gloss them in plain words, or move them into the article or the method
  fold. Percent, currency, dates and everyday lengths and weights are fine.
- Stage text in three sizes at most: 16 px headline, 14 px stage, caption and
  controls, 12 px kicker and source. Mono only for numeric readouts. At most
  five labeled ticks per axis.
- At 375 px every control is a 44 px touch target, and the headline, the
  controls and the annotated point fit one screen.
- Draw robots, hands, legs and objects so a lay reader recognizes them.
- One concept has one canonical figure. Other pages link to it.
- Charts use the primitives in `components/motion/chart/`.

Color roles come from `motion-tokens.json`. Each role also has a non-color
encoding, so a figure still reads in grayscale:

| Role | Means | Encoding |
| --- | --- | --- |
| state | estimate, belief, the main object | solid stroke |
| measurement | observation, data point | cross or dot markers |
| action | policy output, command | arrows |
| value | reward, cost, score | filled bars or areas |
| constraint | obstacle, error, limit | 45 degree hatch |
| reference | ground truth, target, baseline | dashed line |
| highlight | the thing to look at now | the accent, once per figure |

Uncertainty takes the hue of the thing it belongs to, as a light fill with a
dashed edge. Never hard-code a color, easing or duration in
`components/interactive/` or `components/motion/`: `check-motion-tokens`
fails on it.

## Motion

- One easing curve, `smooth`, and one timing ladder: a beat is 1000 ms, a
  short beat 500 ms, a long beat 2000 ms. Simulation time runs linearly and is
  never eased.
- One idea per beat and one sentence per beat. The reader starts every run;
  nothing autoplays. A guided run lasts 3 to 6 seconds and ends on the
  annotated frame.
- Scenes have play and pause, step, a scrubber whose value text is the
  current caption, and Space, arrow, Home and End keys. Captions are the text
  alternative.
- Under reduced motion, stepping jumps between end states with no tweening.
- Playback pauses when a figure leaves the screen or the tab is hidden.
- Clips (`<Clip id="..." />`) are for lessons that need the whole run. They
  render offline from `motion-clips.json`, ship silent with captions and a
  transcript, and stay under 3 MiB.

## Accessibility

- Every control is reachable and operable by keyboard, with a visible label
  and a readout of its current state in text.
- Returning each control to its default restores the default frame.
- Every chart has a text description. Every image has alt text.
- Pages pass axe in the end-to-end tests.

## Images

- Photographs use one 3:2 crop, the figure caption style and a source line
  naming creator, source and license, with a working license link.
- Every image is registered in `data/images.ts` with its legal basis.
- Company marks sit on no plate: a single-ink silhouette of the official
  file, credited on `/credits/`.
