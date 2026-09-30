# Figure system evidence

Before and after evidence for the shared figure system (VAL-OPUS-001 to 013).
"Before" is the static export of `a7446a11`, the commit this work started
from. "After" is the export of `441c511e`; the commit that adds this folder
changes only tests and evidence.

## How it was made

| Step | Command | Result |
| --- | --- | --- |
| Capture, both exports | `node scripts/capture-visuals.ts --root out --out <dir>` | 71 of 71 Sitemap URLs, 215 visuals (18 scenes, 126 images, 71 figures and instruments), no load or screenshot failures, settled DOM count equal to the manifest on every route |
| Pairs | `node scripts/capture-visuals.ts --before <dir> --after <dir> --out <dir>` | 151 changed visuals on 16 sheets |
| Check, before | `node scripts/check-figure-system.ts --root <before export>` | exit 1, 63 blocking findings |
| Check, after | `npm run check:figure-system` | exit 0, 0 blocking, 1305 allowlisted findings (87 entries), 0 stale, 106 figures |
| Plants | `npm run check:figure-system:plant` | each of 8 plants exits 1 and names its rule; the unplanted copy exits 0 |
| Browser specs | `tests/e2e/figure-system-home.spec.ts`, `tests/e2e/figure-system-marks.spec.ts` | after export: 6 passed; before export (`FIGURE_SYSTEM_EXPORT_ROOT`): 6 failed, each on its own requirement |

The check runs in `postbuild` and `vercel-build`, so an export with an
off-system figure fails the build. The specs write their tables and captures
(to `FIGURE_SYSTEM_EVIDENCE_OUT`) before they assert, which is how the
failing before run still produced the before tables here.

`pairs/pair-diff.json` gives both sizes of every pair. Where the size stayed
within 2 px (8 pairs), it also gives the share of pixels that still differ at
the best alignment within 3 px, counting a pixel when its summed RGB change
exceeds 24 levels.

## Where each assertion's evidence is

| Assertion | Files | What they show |
| --- | --- | --- |
| 001 frame | `home/after/home-frames-*.json`, `checks/` | Each home figure has a title, a stage, a caption of 10 to 14 words and at most one source line. The check applies its frame-structure, caption-words and outside-frame rules to all 106 figures; findings on figures a domain pass still has to migrate are allowlisted. |
| 002 primitives | `checks/component-tests.txt` | 12 primitive tests: axes, line trace, bar, point marker, constraint hatch, uncertainty band, small multiples, legend, token-only colours and sizes. |
| 003, 004 colour | `home/after/home-roles-*.json`, `capture/*/manifest.json` | Stage marks by role. The only reserved colour on a home figure is signal blue on the source link. The manifests list every visual's painted colours. |
| 005 type | `home/after/home-fonts-*.json` | Every text run by frame part, family and size: Plex Sans at 12, 13 and 14 px, and Plex Mono at 13 px only on readouts. |
| 006 density | `home/after/home-frames-*.json` | Largest empty band: 0.128 of stage height at most at 375 px, and 0.171 at most at 1440 px. |
| 007 check | `checks/plant.txt`, `checks/figure-system-*.txt` | The plant rows, the clean run and both full runs. |
| 008 capture | `capture/before/`, `capture/after/` | Manifests, per-route counts (`counts.json`) and 9 contact sheets per run. |
| 009 home | `home/before/`, `home/after/` | First-paint (no script) and settled screenshots at 375 and 1440 px. `home-poster-vs-first-paint-*.json` shows each frame's title, marks and caption length are the same before any script runs as at settle. |
| 010 logos | `marks/` | Per-logo contrast tables and tile sheets of both pages, before and after. |
| 011 duplicates | `duplicates/` | Every placement of the two named concepts over all Sitemap URLs, with caption and link. |
| 012 photos | `photos/` | Per-photo width, ratio, fit and caption style at 375 and 1440 px, and a photo sheet per run. |
| 013 pairs | `pairs/` | `pairs.json`, 16 pair sheets, and `notes.md` with one note per changed visual. |

## What changed, in numbers

- Logos (VAL-OPUS-010). Before, the two pages had two treatments. The credits
  page drew each mark in its own colours at the full 602 px column on the page
  ground; the market map used the mid-grey plate with no filter. 43 of 111
  credits marks and 37 of 111 market-map marks had under half their pixels at
  3:1, and the nine white logos the audit names were at 0% on the credits
  page. After, both pages use one tile: `rgb(125, 122, 115)`, 3 px padding,
  `grayscale(1) brightness(0.625) contrast(100)`. The lowest mark is at 57.9%,
  and the nine white logos are at 86.2% to 98.8%.
- Photos (VAL-OPUS-012). Before, the 10 placements used three widths at
  1440 px (976, 715 and 602), four ratios (2.20, 1.50, 0.79 and 0.73) and 12 px
  captions. After, every placement is 512 px wide at 1440 px and 320 px at
  375 px, cropped to 3:2 with `object-fit: cover`, with a 14 px Plex Sans
  caption. The tall Atlas portrait anchors its crop at the top so the sensor
  head its caption names stays in frame.
- Duplicates (VAL-OPUS-011). Before, none of the three non-canonical
  placements (the home scene, the home calculator and the reliability-gap
  calculator) linked its canonical page. After, each carries a line that links
  its canonical page and states its purpose.
- Home (VAL-OPUS-009). The market-map skeleton (boxes and bars outlined in
  signal blue, outside any frame) became a poster of six measurement bars. The
  scene and the SO-101 preview moved into the shared frame.

## Not in this pass

- Domain-page findings this pass did not fix keep allowlist entries in
  `contract/figure-system-allowlist.json` until their domain pass migrates
  those figures. The list can only shrink: an entry that no longer matches a
  finding fails the check as stale.
- The home calculator chart stays allowlisted. The homepage pass replaces the
  tool previews with one line of links (VAL-OPUS-020, VAL-OPUS-021).
- `/data-hardware/evaluation-crisis/` still draws the episode-success chart
  twice: once in the calculator and once in the prediction panel. The data and
  hardware pass owns that repeat (VAL-OPUS-089). The duplicate spec lists it
  as a known repeat and fails once the page stops repeating, so the entry has
  to go when the repeat does.
