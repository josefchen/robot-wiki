# World-models pass: before and after captures

The capture test (`scripts/capture-visuals.ts`) ran over the static export of
the world-models hub and its eight articles at two points:

- Start: `9a85065d`, the commit before the world-models rewrite (`14ab163d`),
  copied and exported outside the repository.
- End: the export of `08955866`, built by
  `npm run refresh:brand-v2-evidence`. The commit that adds these captures
  changes no page.

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root <export> --out <dir> --width <1440|375> --routes <9 world-models routes>
node scripts/capture-visuals.ts --before <start dir> --after <end dir> --out <dir> --routes <the 8 world-models articles>
```

## Files

| File | What it shows |
|---|---|
| `start-1440-sheet.jpg`, `end-1440-sheet.jpg` | Every world-models visual at Start and at End, 1440 px |
| `start-375-sheet.jpg`, `end-375-sheet.jpg` | The same at 375 px |
| `pairs-1440-1.jpg` | Before and after pairs on the eight articles, 1440 px |
| `pairs-375-1.jpg` | The same at 375 px |
| `pairs-1440.json`, `pairs-375.json` | The pairs on those sheets; `changed` means the PNG bytes differ |
| `manifest-diff.json` | Per-route DOM and manifest counts on both sides, and per visual the size, the share of pixels that differ by more than a quarter of the range (null when the height differs), the same share after the best vertical alignment within 2 px, any change of kind, scene, surface or label, the colours added or removed, and the colours outside the palette |

## Result

- Start and End both have 5 visuals at each width: one each on taxonomy,
  latent-dynamics, generative-video, jepa and generative-sim. The hub,
  model-based-robot-learning, evaluation and world-models-vs-simulators have
  none. Every route's settled DOM count equals its manifest count on both
  sides, and no capture failed.
- No visual was added or removed, and no manifest entry changed its kind,
  scene, surface, label or colour set.
- No figure changed what it draws. Between the two points the articles were
  rewritten and extended in prose. The figure sources changed only in
  markup that tests read: series ids on the JEPA lab's path and candidate
  moves, a group around the generative-video goal outline and its label, and
  a label marker on the latent-dynamics band. On the pages, `08955866`
  changes only four meta descriptions.
- The pairs differ by sub-pixel shifts of text, which also move three
  1440 px frames by 1 px in height (taxonomy 1514 to 1515, latent-dynamics
  1601 to 1600, generative-video 1018 to 1017), and by the sticky header and
  skip link that the element capture paints over tall figures at
  scroll-dependent places. After the best vertical alignment, 0 to 3.53% of
  pixels differ at 375 px and 1.36 to 2.08% at 1440 px. The largest
  differing band of every pair that differs was checked side by side and
  holds the same text on both sides.
- At 1440 px the JEPA lab's Start capture has the site header over its first
  slider label and the End capture does not. The generative-sim capture cuts
  its last readout row at the bottom edge on both sides; a viewport
  screenshot of the live page shows that row whole inside the figure (its
  lowest element ends 813 px into the 832 px figure, and nothing overflows).
- Every manifest entry lists `#000000` outside the palette on both sides.
  It is the default `fill` or `stroke` of SVG elements that paint nothing
  with it: no End capture holds a pixel darker than RGB 12, and the dark
  marks render in ink `#1C1C1A`.

## Figures the report proposed

The report proposes one sourced figure for each of the three articles
without a visual: the model-based loop (encode, predict, score, act,
observe, update), the five-rung evaluation ladder and the log-scale "time to
one useful output" chart for world models against simulators. The pass did
not add them, so those three articles still have no visual.
