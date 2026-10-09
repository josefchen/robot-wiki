# RL and sim-to-real figure rework: before and after captures

The second part of the rl-sim2real pass reworked five figures for the
five-second reader test: the gait scene, the whole-body control stacks, the
friction chart, the Eureka figure (audit item A34) and the planner-or-reflex
figure (A35). The capture test (`scripts/capture-visuals.ts`) ran over the
static export of the rl-sim2real hub and its eight articles:

- Before: the End captures in `../captures/`, taken from the export of
  `ec9ce5ae`. No figure source changed between `ec9ce5ae` and `3d2f6b3a`,
  where this rework started.
- After: the export of `a9be61d0`, built by `npm run vercel-build` on the
  clean tree. `be577f0f` changes a unit test only, so no captured frame
  differs at the commit that adds this directory.

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root out --out <dir> --width <1440|375> --routes <9 rl-sim2real routes>
node scripts/capture-visuals.ts --before <before dir> --after <after dir> --out <dir> --routes <the 8 rl-sim2real articles>
```

## Files

| File | What it shows |
|---|---|
| `end-1440-sheet.jpg`, `end-375-sheet.jpg` | Every rl-sim2real visual after the rework, at 1440 px and 375 px |
| `pairs-1440-1.jpg`, `pairs-1440-2.jpg` | Before and after pairs on the eight articles, 1440 px |
| `pairs-375-1.jpg`, `pairs-375-2.jpg` | The same at 375 px |
| `pairs-1440.json`, `pairs-375.json` | The pairs on those sheets; `changed` means the PNG bytes differ |

## Result

- Both sides have 11 visuals at each width: one each on humanoid-wbc,
  parallel-sim-rl, rl-for-robotics and why-rl-locomotion, two each on
  legged-locomotion and sim2real-transfer, and three on reward-design-mpc.
  The hub and offline-rl have none. Every route's settled DOM count equals
  its manifest count after the rework, and no capture failed.
- No visual was added or removed. The five reworked figures changed, and
  their sizes moved (width x height at 1440 px, then at 375 px):

| Figure | Before | After |
|---|---|---|
| Whole-body control stacks, humanoid-wbc #0 | 715 x 1265; 335 x 1459 | 715 x 1253; 335 x 1380 |
| Gait scene, legged-locomotion #0 | 715 x 1471; 335 x 1539 | 715 x 1281; 335 x 1613 |
| Eureka figure, reward-design-mpc #1 | 715 x 427; 335 x 646 | 715 x 1272; 335 x 1391 |
| Planner-or-reflex figure, reward-design-mpc #2 | 715 x 1016; 335 x 1201 | 715 x 1448; 335 x 1655 |
| Friction chart, sim2real-transfer #0 | 715 x 1432; 335 x 1594 | 715 x 1478; 335 x 1575 |

- Three other pairs differ in bytes with unchanged sources. The reward
  shaping figure (reward-design-mpc #0) and the teacher-student figure
  (sim2real-transfer #1) move by up to 1 px in height through sub-pixel
  text shifts; their text and marks are the same on both sides. At 375 px
  no pixel of the teacher-student pair differs by more than a quarter of
  the range. The ANYmal photograph (legged-locomotion #1) is resampled at
  1440 px inside the image box only, as on earlier passes.
- At 375 px the tall element captures show the site's sticky header and
  skip link painted over the frame at scroll-dependent places, on both
  sides. The reader-test screenshots (`evidence/reader-first/`) hide both.

## What each reworked figure shows after the rework

**Gait scene.** Three robot dogs on one ground line walk, trot and hop, with
the feet on the ground marked. The still recap draws one arrow under all
three, from "steadier" to "more bounce", and the caption reads "One robot
can walk, trot or hop by changing which feet move together." The bound no
longer appears on the stage; its footfall numbers stay in "How this was
made".

**Whole-body control stacks.** Three stacked layers for the chosen company,
each with a plain job and, where the company publishes one, its rate,
joined by arrows down to the body. The bottom layer drives every joint
motor, and the one annotation says it keeps the robot balanced.

**Friction chart.** Two curves, the one-floor robot and the many-floor
robot, against how slippery or grippy the real floor is, with the practice
floors shaded. It opens on the practice floor, where the one-floor robot
wins 97% against 74%.

**Eureka figure.** Three rounds side by side on one ground line, the
current round solid and the others faded, each labelled with its outcome
("falls", "never walks", "walks"). Under them, three short columns give the
current round's rules the AI wrote, what the robot did, and the AI's note
on how to fix the rules. "Next round" steps forward and Reset returns to
round 1.

**Planner-or-reflex figure.** The robot that plans ahead and the robot that
learned by practice, standing or fallen after the chosen surprise, with
the reason beside the one that fails and a table of both outcomes for all
four surprises. The chosen row is set in bold.

The reader-test records of all five figures fail; see
`evidence/reader-first/` and the pass's measures file in the mission
library.
