# Adjacent pass: before and after captures

The capture test (`scripts/capture-visuals.ts`) ran over the static export of
the adjacent hub and its four articles at two points:

- Start: `40c0947c`, the commit before `1624fa98`, which landed the adjacent
  pass. It was exported outside the repository.
- End: the export of `c625bbd2`. Its adjacent pages are those of `4f80f73a`,
  which corrected six claims; the two corrected tables are not registered
  visuals. The commits after it change no adjacent page.

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root <export> --out <dir> --width <1440|375> --routes <the hub and 4 article routes>
node scripts/capture-visuals.ts --before <start dir> --after <end dir> --out <dir> --routes <the same routes>
```

## Files

| File | What it shows |
|---|---|
| `start-1440-sheet.jpg`, `end-1440-sheet.jpg` | Every adjacent visual at Start and at End, 1440 px |
| `start-375-sheet.jpg`, `end-375-sheet.jpg` | The same at 375 px |
| `pairs-1440-1.jpg`, `pairs-1440-2.jpg` | Before and after pairs on the four articles, 1440 px |
| `pairs-375-1.jpg`, `pairs-375-2.jpg` | The same at 375 px |
| `pairs-1440.json`, `pairs-375.json` | The pairs on those sheets; `changed` means the PNG bytes differ, and `before` is null for a visual that is new at End |
| `manifest-diff.json` | Per visual: the size on both sides, the share of pixels that differ by more than a quarter of the range (null when a stitched capture is compared as a whole), the same share after the best vertical alignment within 2 px, any change of kind, scene, surface or label, and the colours outside the palette |

## Result

- Start has 3 visuals at each width: the SenseAvoid scene and the
  PerceptionLatency instrument on drones, and the motion-scaling pantograph
  on surgical. End has 14: the same 3 and the 11 licensed photographs that
  `1624fa98` mounted (autonomous-vehicles 3, drones 2, space 4, surgical 2).
  The hub has no registered visual on either side.
- Every route's settled DOM count equals its manifest count on both sides,
  and no capture failed.
- The palette census covers the three drawn visuals. Outside the palette,
  each side lists only `#000000`, the default `fill` or `stroke` of SVG
  elements that paint nothing with it.

Per visual present on both sides:

| Visual | Size, 1440 px | Size, 375 px | Pixels that differ, aligned | What changed |
|---|---|---|---|---|
| drones, the SenseAvoid scene | 930x1357, same | 327x1466, same | 1.62% and 0.28% | Nothing in the drawing. Its caption is now "Figure 3" (Start "Figure 2"), since a photograph comes first. Both sides carry the same stitching marks: a blank band near the top at 1440 px, and the site header and skip link over the drawing at 375 px |
| drones, the PerceptionLatency instrument | 930x1505, same | 327x1950, same | 1.46% and 4.06% | Nothing in the instrument. Its caption is now "Figure 2", since a photograph comes first; at 375 px the Start capture has the site header painted over its middle |
| surgical, the motion-scaling pantograph | 930x1041, same | 327x1152, same | 0.29% and 0.79% | Nothing in the drawing. Its caption is now "Figure 3"; at 1440 px the Start capture has the site header painted over the "Motion scale" slider row, which the End capture shows |

- Each pair was opened at full size and compared side by side. The
  drawings, controls, readouts and captions hold the same text and values
  on both sides (30 mm at the hand and 10 mm at the tip at 3 to 1; 70 ms,
  about 69 km/h and 19.21 m/s for the drone).
- The 11 photographs were checked against their captions and credits on
  the End sheets: each shows the machine its caption names, and each credit
  names the author, Wikimedia Commons and the licence.

## Figures the report proposed

The owner sweep proposes three figures on the dark graphite stage: a "miles
needed to prove safety" interactive for autonomous-vehicles (RAND's
Eq. 2), an autonomy ladder for surgical (Yang and colleagues' levels 0 to
5) and a latency ladder on a log axis for space. The pass did not add them.
Each needs new sources and a reader-test round, and the light figure stage
replaced the graphite stage on 2026-10-02.
