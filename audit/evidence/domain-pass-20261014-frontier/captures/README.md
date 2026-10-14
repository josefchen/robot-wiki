# Frontier pass: before and after captures

The capture test (`scripts/capture-visuals.ts`) ran over the static export of
the frontier hub and its six articles at two points:

- Start: `c6082348`, the commit before the frontier pass's first commit
  (`f97ff039`), checked out and exported outside the repository.
- End: the export of `9f7a17aa`, built by `npm run refresh:brand-v2-evidence`,
  whose evidence is committed as `1fbea1dc`. The commit that adds these
  captures changes no page.

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root <export> --out <dir> --width <1440|375> --routes <7 frontier routes>
node scripts/capture-visuals.ts --before <start dir> --after <end dir> --out <dir> --routes <the 6 frontier articles>
```

## Files

| File | What it shows |
|---|---|
| `start-1440-sheet.jpg`, `end-1440-sheet.jpg` | Every frontier visual at Start and at End, 1440 px |
| `start-375-sheet.jpg`, `end-375-sheet.jpg` | The same at 375 px |
| `pairs-1440-1.jpg` | Before and after pairs on the six articles, 1440 px |
| `pairs-375-1.jpg` | The same at 375 px |
| `pairs-1440.json`, `pairs-375.json` | The pairs on those sheets; `changed` means the PNG bytes differ |
| `manifest-diff.json` | Per-route DOM and manifest counts on both sides, and per visual the size, the share of pixels that differ by more than a quarter of the range (null when the height differs), the same share after the best vertical alignment within 2 px, any change of kind, scene, surface or label, the colours added or removed, and the colours outside the palette |

## Result

- Start has 8 visuals at each width and End has 9. The hub has none on
  either side. Every route's settled DOM count equals its manifest count on
  both sides, and no capture failed.
- The one added visual is the Helix 02 clockwork on competing-theses (#1).
  It came with the anatomy landing `a2321073`, not with the frontier pass.
- The palette census is the same 14 colours on both sides at both widths.
  Six of the nine End entries list `#000000` outside the palette: the five
  whose Start entries list it, and the added clockwork. It is the default
  `fill` or `stroke` of SVG elements that
  paint nothing with it: the darkest pixel in any End capture has a grey
  level of 26.8 of 255, against 27.9 for the ink `#1C1C1A`.

Per visual, with the commit that changed it:

| Visual | Size, 1440 px | Size, 375 px | What changed | Commit |
|---|---|---|---|---|
| reliability-gap #0, the per-step calculator | 1311 to 1294 | 1395 to 1398 | The per-step presets are the one main control. The job-length slider moved under "Adjust more", and the description follows the per-step control | `1024ba42` |
| reliability-gap #1, the deployment records | 1368, same | 2026 to 2162 | Agility's row cites its September 2026 release, Tesla's row its Q2 2026 update, and the livestream row Figure's 200-hour account in place of an eight-hour press report | `58f2d788` |
| dexterity #0, the slip scene | 965 to 1496 | 1029 to 1576 | Redrawn from a flat schematic to a slip test stand, adding paper, white and two greys | `a2321073` (anatomy landing) |
| dexterity #1, the hand comparison | 1545, same | 2349, same | The Unitree H2 row reads "20 (16 active)" degrees of freedom from Unitree's own Dex5-1 page, in place of "10-12" | `f97ff039` |
| generalization #0, the EgoScale chart | 1521, same | 2041, same | Nothing: 1.38% and 0% of pixels differ, from sub-pixel text shifts | - |
| competing-theses #0, the thesis explorer | 1674 to 1731 | 3133 to 3269 | Agility moves from the task-specific side to "Between them", and the evidence rows change | `f97ff039` |
| competing-theses #1, the Helix 02 clockwork | added, 1094 | added, 1234 | New figure | `a2321073` (anatomy landing) |
| bear-case #0, the milestone board | 2218 to 2519 | 3236 to 3796 | Touch moves to "partly there", so the board reads 5 partly there and 3 not yet, and its label says five instead of four. The unseen-homes row adds Figure's Helix 2.5 result | `f97ff039` |
| safety-and-assurance #0, the workcell | 1340, same | 2205, same | Nothing: 0% and 3.74% of pixels differ, from sub-pixel text shifts | - |

- The largest differing band of each same-size pair was checked side by
  side. On the hand comparison it is the H2 row; on the deployment records it
  is Agility's row. On the EgoScale chart and the workcell, the bands hold
  the same text on both sides.
- The site header and the skip link are painted over tall element captures
  at scroll-dependent places on both sides, as on the workcell at 375 px.

## Figures the report proposed

The report proposes a graphite-stage data figure for generalization,
competing-theses, bear-case and safety-and-assurance, a real-data touch
figure for dexterity, and an open-world evaluation table for generalization.
The pass did not add them. Each needs new sources and a reader-test round,
and the graphite stage was replaced by the light figure stage on 2026-10-02.
