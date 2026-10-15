# Data-hardware pass: before and after captures

The capture test (`scripts/capture-visuals.ts`) ran over the static export of
the data-hardware hub and its seven articles at two points:

- Start: `7fba5f64`, the commit before the data-hardware pass's first commit
  (`6a56e820`), copied and exported outside the repository.
- End: the export `npm run vercel-build` wrote for `594afd67`. The commits
  after it up to the one that adds these captures change no page.

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root <export> --out <dir> --width <1440|375> --routes <the hub and 7 article routes>
node scripts/capture-visuals.ts --before <start dir> --after <end dir> --out <dir> --routes <the same routes>
```

The hub, datasets and teleop-rigs have no registered visual, so the first
screen of all eight routes was also saved from both exports, at 1440 x 900
and 375 x 812 with reduced motion, after the fonts settled.

## Files

| File | What it shows |
|---|---|
| `start-1440-sheet.jpg`, `end-1440-sheet.jpg` | Every data-hardware visual at Start and at End, 1440 px |
| `start-375-sheet.jpg`, `end-375-sheet.jpg` | The same at 375 px |
| `pairs-1440-1.jpg` | Before and after pairs on the five articles with visuals, 1440 px |
| `pairs-375-1.jpg` | The same at 375 px |
| `pairs-1440.json`, `pairs-375.json` | The pairs on those sheets; `changed` means the PNG bytes differ |
| `manifest-diff.json` | Per-route DOM and manifest counts on both sides, and per visual the size, the share of pixels that differ by more than a quarter of the range (null when the height differs), the same share after the best vertical alignment within 2 px, any change of kind, scene, surface or label, the colours added or removed, and the colours outside the palette |
| `first-screen-1440-sheet.jpg`, `first-screen-375-sheet.jpg` | The first screen of the hub and the seven articles, Start on the left and End on the right, with each page's height |
| `first-screen.json` | Per route, side and width: the HTTP status, the H1 and the page height |

## Result

- Start and End each have 7 visuals at each width: one on data-bottleneck,
  evaluation-crisis and robot-learning-stack, two on hardware-taxonomy and
  industrial-deployment. Every route's settled DOM count equals its manifest
  count on both sides, and no capture failed.
- The palette census is the same 14 colours on both sides at both widths.
  The five SVG figures and scenes list `#000000` outside the palette on both
  sides. It is the default `fill` or `stroke` of SVG elements that paint
  nothing with it: the darkest pixel in their End captures has a grey level
  of 26.9 of 255, against 27.9 for the ink `#1C1C1A`.

Per visual, with the commit that changed it:

| Visual | Size, 1440 px | Size, 375 px | What changed | Commit |
|---|---|---|---|---|
| data-bottleneck #0, the data-scale chart | 1904, same | 2394, same | Nothing: 0.72% and 0% of pixels differ, from sub-pixel text shifts | - |
| evaluation-crisis #0, the compounding calculator | 1309, same | 1374, same | Nothing: 1.08% (after a 1 px alignment) and 0.29% of pixels differ, from sub-pixel text shifts | - |
| hardware-taxonomy #0, the Franka Panda photograph | 445, same | 357, same | Nothing: the 1440 px captures are byte-identical, and 0% of pixels differ at 375 px | - |
| hardware-taxonomy #1, the Atlas photograph | 464, same | 396, same | Nothing: 1.28% and 2.5% of pixels differ, from image resampling | - |
| industrial-deployment #0, the jam-overhead scene | 1240, same | 1298, same | Nothing: 0% and 3.45% of pixels differ; at 375 px the site header is painted over the capture at a different place | - |
| industrial-deployment #1, the deployment-economics calculator | 2067 to 2087 | 3045 to 3103 | The payback table prints both failure rates to one decimal, the precision of the "Pays for itself in" readout, and "How this was made" gains one line giving both rates at the current fix time | `53a620fb` |
| robot-learning-stack #0, the scene-split figure | 742 to 822 | 937 to 1017 | An "Adjust more" fold and a Reset button sit under the three split buttons | `bb014cf9` |

- The largest differing band of each same-size pair was checked side by
  side: the "goal: 10,000 hours" and "70 hours a year" labels on the
  data-scale chart, the slider label row on the calculator, the body of the
  Atlas photograph and, at 375 px, the site header over the jam-overhead
  scene. The bands hold the same text and drawing on both sides.
- The pass's figure values that changed (the Jetson T5000 and T4000 prices,
  the ALOHA build cost and ACT's per-task results, `6a56e820`) live in the
  buyer's guide table, which is not a registered visual; the first-screen
  sheets show its top rows on hardware-taxonomy.

## First screens

- All 32 page loads return 200, and each route has the same H1 on both
  sides. The hub is unchanged: 1585 px tall at 1440 px and 1974 px at
  375 px on both sides.
- Six End leads are 60 to 210 words shorter than at Start, and
  robot-learning-stack keeps one paragraph between its lead and the
  self-check where Start had two, so every article's first screen reaches
  further: the prediction question on data-bottleneck, the comparison table's filters
  on datasets, the statistic row and first section on evaluation-crisis, the
  buyer's guide filters on hardware-taxonomy, the economics calculator's
  controls on industrial-deployment, the self-check on robot-learning-stack
  and the comparison matrix heading on teleop-rigs.
- Every article page is taller at End although its prose is shorter. The
  prose column shrinks on all seven articles at both widths; the reference
  list grows with the sources the pass added. At 1440 px:

| Article | Page height | Prose column | Reference entries |
|---|---|---|---|
| data-bottleneck | 8670 to 9844 | 5057 to 4755 | 19 to 36 |
| datasets | 7252 to 9512 | 4479 to 4196 | 9 to 38 |
| evaluation-crisis | 8253 to 9711 | 5162 to 4569 | 9 to 32 |
| hardware-taxonomy | 12781 to 13913 | 9229 to 8153 | 23 to 48 |
| industrial-deployment | 10530 to 11408 | 6705 to 6132 | 23 to 39 |
| robot-learning-stack | 7379 to 8790 | 4866 to 3752 | 9 to 37 |
| teleop-rigs | 6633 to 8304 | 3622 to 3288 | 11 to 34 |

## Figures the report proposed

The owner sweep proposes a log-hours ladder for data-bottleneck, an
hours-against-episodes scatter for datasets, a price-ladder strip chart in
place of the Atlas and Franka photographs on hardware-taxonomy, a
demonstrations-per-hour bar chart for teleop-rigs and a seven-contract
pipeline diagram for robot-learning-stack, each on the dark graphite stage.
The pass did not add them. Each needs new sources and a reader-test round,
and the graphite stage was replaced by the light figure stage on 2026-10-02.
The duplicated horizon chart on evaluation-crisis was removed before this
pass, by the figure migration.
