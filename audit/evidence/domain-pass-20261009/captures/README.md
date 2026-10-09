# RL and sim-to-real pass: before and after captures

The capture test (`scripts/capture-visuals.ts`) ran over the static export of
the rl-sim2real hub and its eight articles at two points:

- Start: the export of `f66522bd`, built before the pass's first commit.
- End: the export of `ec9ce5ae`. The later commits change no captured frame:
  `37c392c8` regenerates the site-wide scene sheets and `8edc22f5` adds the
  reader-test records, both evidence only.

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root <export> --out <dir> --width <1440|375> --routes <9 rl-sim2real routes>
node scripts/capture-visuals.ts --before <start dir> --after <end dir> --out <dir> --routes <the 8 rl-sim2real articles>
```

## Files

| File | What it shows |
|---|---|
| `start-1440-sheet.jpg`, `end-1440-sheet.jpg` | Every rl-sim2real visual at Start and at End, 1440 px |
| `start-375-sheet.jpg`, `end-375-sheet.jpg` | The same at 375 px |
| `pairs-1440-1.jpg`, `pairs-1440-2.jpg` | Before and after pairs on the eight articles, 1440 px |
| `pairs-375-1.jpg`, `pairs-375-2.jpg` | The same at 375 px |
| `pairs-1440.json`, `pairs-375.json` | The pairs on those sheets; `changed` means the PNG bytes differ |
| `manifest-diff.json` | Per-route DOM and manifest counts on both sides, and per visual the size, the share of pixels that differ by more than a quarter of the range (null when the height differs), and any change of kind, scene, surface, label or colour set |

## Result

- Start and End both have 12 visuals at each width: one each on
  humanoid-wbc, parallel-sim-rl, rl-for-robotics and why-rl-locomotion, two
  each on legged-locomotion and sim2real-transfer, and three on
  reward-design-mpc. The hub and offline-rl have none. Every route's settled
  DOM count equals its manifest count on both sides, and no capture failed.
- No visual was added or removed, and no manifest entry changed its kind,
  scene, surface, label or colour set.
- Three figures changed what they draw: the gait scene, the whole-body
  control stacks and the friction chart (below). Their sources are the only
  registered figure sources this pass edited apart from `lib/mpc-vs-rl.ts`,
  whose two edited rows render in the MPC comparison table, not in the
  MPC-versus-RL figure. The capture test counts neither that table nor the
  Gemini Robotics 2 table on humanoid-wbc, whose note now reads "no
  standardized real-world humanoid benchmark".
- The other pairs differ only where the site's sticky header and the skip
  link paint over tall element captures at scroll-dependent places, as on
  earlier passes, by sub-pixel shifts of text that move each frame up to 1 px
  in height, and by resampling of the ANYmal photograph at 1440 px (0.85% of
  pixels). The batch scale scene's Start capture also caught its "with
  computer overhead" legend swatch mid-fade; its source is unchanged.

## What each changed pair shows

**Gait scene, `/rl-sim2real/legged-locomotion/` #0** (scene `gait-support`;
715 × 1471 at 1440 px, 335 × 1540 at 375 px on both sides). At Start the
bar under the current gait name ran 164 px at 1440 px, past its 75 px label
and almost to the dog's head, and touched the dog's head at the height of
the hop at 375 px. At End the bar matches each label at both widths (78 px
under "Hop (pronk)" at 1440 px) and the dog and ground sit five stage units
lower, which leaves 12 px of clearance at 1440 px and 5 px at 375 px.

**Whole-body control stacks, `/rl-sim2real/humanoid-wbc/` #0** (715 × 1265;
335 × 1460). The layer notes follow the drafts and the cited sources. Under
"Copies human motion" the top layer reads "Works out the goal, slowly;
speed not disclosed" instead of "Decides the task, when asked". Under
"Learned movement codes" the controller reads "50 times a second" (the
50 Hz GEAR-SONIC rate in the GR00T-WholeBodyControl README) instead of
"speed not disclosed". Under "One big network" the planner reads "speed not
disclosed" instead of "when asked". 2.45% of pixels differ at 375 px and
1.06% at 1440 px.

**Friction chart, `/rl-sim2real/sim2real-transfer/` #0** (715 × 1433 to
715 × 1432; 335 × 1594 to 335 × 1595). At Start the real floor opened at a
friction of 0.50, more slippery than the practice floor, where the one-floor
curve had already fallen to zero. At End it opens on the practice floor
(0.80), where the one-floor robot wins 97% against 74%, and the note says
so; moving the slider off that floor shows why the practice floors are
varied. Because the figure no longer opens at 0.50, setting the slider to
0.50 (control value 50) now changes the digits and the chart description,
which `tests/e2e/chart-descriptions.spec.ts` checks. The chart
description begins "Illustrative, not measured robot data" instead of
"Authored toy, not measured robot data".
