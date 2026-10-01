# Figure migration evidence

Before and after evidence for the figure migration (VAL-OPUS-048 and VAL-OPUS-125 to 134). "Before" is the static export of `e4784342`, the commit the migration started from. "After" is the export of the final figures: `d070b2d3` for the captures and `ba917dc2` for the light-stage run. `ba917dc2` only restores the accessible name of the execution-mode plot, so the captured pixels are the same. The commits after it change tests and evidence only.

## How it was made

| Step | Command | Result |
| --- | --- | --- |
| Capture, both exports | `node scripts/capture-visuals.ts --root <export> --out capture/<before or after>` | 72 of 72 Sitemap URLs at 1440 px: 210 visuals before and 180 after, no load or screenshot failure, and a settled DOM count equal to the manifest on every route |
| Pairs | `node scripts/capture-visuals.ts --before capture/before --after capture/after --out pairs` | 185 changed visuals on 19 sheets, one note each in `pairs/notes.md` |
| Check | `npm run check:figure-system` | exit 0: 0 blocking, 0 allowlisted, 0 stale, 60 figures. The allowlist went from 86 entries to `"entries": []` |
| Plants | `npm run check:figure-system:plant` | each of the 8 plants exits 1 and names its rule; the clean copy exits 0 |
| Light stages | `tests/e2e/figure-light-stage.spec.ts`, with `FIGURE_SYSTEM_EXPORT_ROOT` set to the before export and `FIGURE_SYSTEM_EVIDENCE_OUT` to the folder | after: 2 passed; before: 2 failed, as expected |

Only JSON, Markdown and the JPG sheets are committed. The two capture commands rebuild the PNG screenshots and the pair pages.

## Light stages (VAL-OPUS-132)

The spec probes every figure on the 71 Sitemap URLs other than `/`, at 375 and 1440 px, after it scrolls the page and opens every disclosure. For each figure, `light-stage/<before or after>/light-stage-<width>.json` gives the stage colour, the largest light area as a share of the stage, the largest light data mark in its role colour (allowed), any signal-blue data mark, and the light share of each image, canvas or video that covers a tenth of the stage.

| Export | Figures | Stage not graphite | Light area of a tenth or more | Figures with signal-blue marks |
| --- | --- | --- | --- | --- |
| before, 375 px | 103 | 81 | 10 (largest 0.858) | 31 |
| before, 1440 px | 103 | 81 | 12 (largest 0.858) | 31 |
| after, 375 px | 60 | 0 | 0 | 0 |
| after, 1440 px | 60 | 0 | 0 | 0 |

Both runs also find the `/playground/` SO-101 canvas, whose scene clears to the paper colour (0.97 of its pixels are light). The spec lists it as pending, since VAL-B2-PLAY-001 makes that canvas a graphite instrument in the playground rollout. The Kalman clip's frames are at most 0.062 light. The largest light data mark is the value-role bar of the deployment-economics calculator, at 0.21 of its stage at 1440 px.

## Where each assertion's evidence is

| Assertion | Files | What they show |
| --- | --- | --- |
| 048, 130 Kalman clip | `evidence/motion/clips/kalman-episode/` | The re-rendered clip's poster and beat frames at 375 and 1440 px |
| 125 check | `allowlist-ledger.md` | Each Start entry, the commit that removed it, and that commit's subject |
| 126 to 129 | `pairs/notes.md`, `pairs/sheets/` | Before and after of every changed figure, including the world-model panels, both original schematics (also on `/credits/`), the two code listings and the execution-mode small multiples |
| 131 one visual | `pairs/notes.md`, "Scenes beside another figure" | One line per route that showed a scene beside another figure: kept, merged, or not yet merged |
| 132 light stages | `light-stage/` | The table above, per figure and width |
| 133 contact sheet | `capture/`, `pairs/` | Manifests, per-route counts, contact sheets per run, pair sheets and per-domain notes |
| 134 commits | `commit-table.md` | Every commit up to `8285d67f` with its kind, domain, files and removed allowlist entries, and each shared commit with the routes it affects |

## Not done in this pass

- Two scenes still render beside a figure that teaches the same thing: JamOverhead beside DeploymentEconomics on `/data-hardware/industrial-deployment/`, and SenseAvoid beside PerceptionLatency on `/adjacent/drones/`. The closeout decision of 2026-10-01 records both merges as follow-up slices.
- The `/playground/` canvas stays on the paper scene until the playground rollout.
- `commit-table.md` lists the one commit that removed allowlist entries without changing their figure, and the five domain commits whose subject does not name the domain. Both are in history and were left as they are.
