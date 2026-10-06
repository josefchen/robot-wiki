# Manipulation pass: before and after captures

The capture test (`scripts/capture-visuals.ts`) ran over the static export of
the manipulation hub and its 15 articles at two commits:

- Start: `a8e577cf`, the commit before the pass's first change, exported in a
  separate worktree.
- End: the export of `8c34ffbb`, built by the brand-v2 evidence refresh. The
  next commit, `7842ecdf`, changes only evidence files, so its pages are the
  same. (The first End side, taken at `75347bba`, came before the audit fixes
  to the chunk-size curve and the comparison matrix, so it was retaken.)

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root <export> --out <dir> --width <1440|375> --routes <16 manipulation routes>
node scripts/capture-visuals.ts --before <start dir> --after <end dir> --out <dir> --routes /manipulation/action-chunking/,/manipulation/comparison-matrix/,/manipulation/diffusion-policy/,/manipulation/pi-line/
```

## Files

| File | What it shows |
|---|---|
| `start-1440-sheet.jpg`, `end-1440-sheet.jpg` | Every manipulation visual at Start and at End, 1440 px |
| `start-375-sheet.jpg`, `end-375-sheet.jpg` | The same at 375 px |
| `pairs-changed-1440.jpg`, `pairs-changed-375.jpg` | Before and after pairs on the four routes whose figures changed |
| `pairs-changed-1440.json`, `pairs-changed-375.json` | The pairs on those sheets |
| `manifest-diff.json` | Per-visual manifest comparison (kind, label, size, surface, scene, colours) at both widths, with the per-route DOM counts |

## Result

- Both sides have 19 visuals on the 16 routes at each width, and every
  route's settled DOM count equals its manifest count. The hub has none.
- 15 of the 19 visuals keep their Start manifest entry at both widths: same
  kind, label, size, surface and colour set. Their visible frame text,
  compared in the served HTML with every fold included, is identical.
- The four visuals whose entries changed are the four figures this pass
  edited: the diffusion denoising scene, the π generation timeline, the
  chunk-size curve and the comparison matrix. All four keep their colour
  sets, and their heights changed.
- The unchanged visuals still differ in some pixels. At 375 px the site's
  sticky header and the skip link are painted over tall element captures at
  scroll-dependent places, on both sides. At 1440 px the differences are
  anti-aliasing in text and strokes; the text itself is identical.
- `#000000` is the one off-palette colour, in every visual at Start and at
  End alike. The pass did not add it.

## What each changed pair shows

**Diffusion denoising scene, `/manipulation/diffusion-policy/`** (1440 px:
715 × 1216 to 715 × 1300; 375 px: 335 × 1242 to 335 × 1343). Start shows the
four-beat scene. End shows the five-beat flagship. The status line reads beat
5 of 5, and the stage keeps the two clusters, the leaders and the green note
"Two valid moves, kept apart instead of averaged into one". The cyan label
now reads "what the robot sees; both moves start here". The grey legend
entry reads "random guess and its path". The readout reads "60 random
guesses, each nudged onto a good move in 10 steps". The frame is taller
because the readout wraps to two lines at 375 px and "How this was made"
gains the followed guess's distances ("starts 3.17 from its move and ends
0.08 away") and a fifth step ("in symbols, a move a is drawn to fit what the
robot sees, o"). No label overlaps another, and nothing leaves the stage at
either width. The glyphs' MathML layer from `9a31c141` is hidden and does not
show in the capture.

**π generation timeline, `/manipulation/pi-line/`** (1440 px: 715 × 1522 to
715 × 1562; 375 px: 335 × 1775 to 335 × 1815). The dots, the downloadable
bracket and the controls are unchanged. The table under "How this was made"
carries the hedged records: π0's chunks run "at up to 50 Hz", FAST lets an
autoregressive model "be trained on fast, high-frequency motion", and π0.7
"shows early signs of combining skills in new ways". The longer cells add
40 px of height at both widths. The headline, caption and stage are the same.

**Chunk-size curve, `/manipulation/action-chunking/`** (1440 px: 715 × 1615
to 715 × 1635; 375 px: 335 × 1620 to 335 × 1544). The curve, the two dots,
the decision ticks and the controls are unchanged. The note under the chart
now reads "Only the two dots have published numbers". "How this was made"
says the paper plots the other chunk sizes it trained but gives numbers only
for these two. In the table, k = 200, 300 and 400 read "estimated" instead
of "past the measured range", and the source line ends "is an estimate". At
1440 px the longer fold note adds a line. At 375 px the one-word provenance
cells stop wrapping, so the figure is shorter.

**Comparison matrix, `/manipulation/comparison-matrix/`** (1440 px:
1104 × 6522 to 1104 × 6590; 375 px: 335 × 8001 to 335 × 8069). The controls
and columns are unchanged. RT-1's and π0's hierarchy cells read "external",
and their backbone cells name the separate planner (SayCan in RT-1's
long-horizon kitchen runs, a high-level VLM for several π0 tasks). RT-2's
cross-embodiment cell reads "no". The π0.5, π0.6 and π0.7 input cells list
proprioceptive state; π0.5's lists the predicted subtask in place of web VQA,
and π0.7's adds the control mode and up to four camera images. ACT's weights
cell reads "not disclosed" with its source note. The longer cells make the
table taller. At 375 px the table scrolls sideways in its own box on both
sides.

The other visuals on these routes are included for context: temporal
ensembling and the latency comparison on action chunking, receding horizon on
diffusion policy, and the flow-matching trajectory on the π line. Their
manifest entries and frame text are unchanged.
