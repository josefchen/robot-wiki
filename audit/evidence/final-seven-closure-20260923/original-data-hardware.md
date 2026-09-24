# Data, hardware & evaluation content-integrity audit

Date of audit: 2026-08-17 (consolidation pass 2026-08-18). Scope: the five
published `data-hardware` articles (data-bottleneck, datasets,
hardware-taxonomy, teleop-rigs, evaluation-crisis) plus the structured
datasets behind them (`data/hardware.ts`, `data/datasets.ts`,
`data/teleop-rigs.ts`, `data/citations.ts`, `lib/data-scaling.ts`),
checked against their cited primary sources, fetched and read during this
audit. Claims VAL-AUDIT-004. The citation-registry rows covering this
domain were completed by the 2026-08-18 consolidation pass: every
`data/citations.ts` entry cited by these five articles was re-checked by
`npm run check:citations` (title verified against the fetched document or
Crossref; 0 mismatches), and the domain's registry comments were reviewed
for date-plausibility in the same sweep (see audit/README.md).

Status: COMPLETE (2026-08-17). All five articles and the four structured
data files audited; per-claim evidence below. A previous session applied
the banked corrections in the working tree but left no ledger; this
session re-fetched every corrected claim's primary source before vouching
for it, fixed the defects that re-verification surfaced, and recorded
every row.

Method: every checkable claim (numbers, dates, prices, specs, licenses,
attributions, quoted or quoted-sounding phrases) is checked against the
source the article cites for it, by fetching that source. Structured-data
fields are audited per field against the entry's own `sources`.
Dataset-size figures are traced with their unit (episodes vs trajectories
vs hours) to the paper or dataset card that states them. Vendor pages are
re-fetched live for prices and availability. Hardware specs no vendor
states are `null` ("not disclosed"), never estimated.

## Summary

Counting convention (see audit/README.md): totals below count DISTINCT
DEFECTS, not ledger rows. One defect corrected in several places (prose,
`data/*.ts`, closing paragraph) counts once here and appears in several
`C` rows below. The corrected rows in the tables number 25; the distinct
defects they represent number 21 (Trossen prices are recorded in
hardware-taxonomy + teleop-rigs + the data file; AgiBot World figures in
data-bottleneck + datasets.mdx + the data row; the DROID license in
datasets.mdx + data/datasets.ts; GelSight/DIGIT prices in prose + data).

- Claims checked: 84 rows
- Verified: 57
- Corrected: 21 distinct defects (25 `C` rows in the tables below)
- Cut: 2 (the GO-1 VRAM sentence, unsourceable at any reachable primary
  source; the VLA-Perf GPU card prices, which the paper never states)
- Unresolved: 0

Arithmetic: 57 V + 25 C + 2 cut = 84 rows, counted from the per-claim
tables below (one row per claim). An earlier version of this header said
"Verified: 61", which is unreachable under either counting unit: it came
from 84 − 21 − 2, mixing the row-unit total with the defect-unit corrected
count. Recomputed by the 2026-08-18 reconciliation sweep.

### 2026-09-06 reseal addendum

The registry published `industrial-deployment` on 2026-08-22, after the
sweep above, so this ledger stopped covering its domain the day that
article shipped. It was audited on 2026-09-06 under the same conventions,
and `npm run check:audit-coverage` now derives both sides of that
comparison so the gap cannot reopen silently. This addendum counts LEDGER
ROWS rather than distinct defects, and says so per the convention above.

- Claims checked: 52 rows (industrial-deployment)
- Verified: 30
- Corrected: 17
- Cut: 1 (a $2.6 billion Kroger write-off the cited source never states)
- Unresolved: 4 (recorded in their rows, each naming why the figure could
  not be settled at a reachable primary source)

Arithmetic: 30 + 17 + 1 + 4 = 52 rows. Domain total after the addendum:
128 rows over 6 of 6 published articles.

The banked corrections from the interrupted session were all re-fetched
and confirmed before being vouchs for; this audit's own additional
corrections, found while re-verifying, are listed in the addendum below.

Corrections (the load-bearing ones):

1. AgiBot World publishes an hour count. The paper (arXiv 2503.06669 v4,
   Sec. 3) states 1,001,552 trajectories totaling 2,976.4 hours on the
   AgiBot G1 platform. The article's "no published hour count" and the
   ~100,000-hour estimate were research/03 errors; a million trajectories
   is under three thousand hours, which changes the data-bottleneck
   argument's numbers (chart anchor, "nine orders of magnitude" heading,
   Ego4D comparison) and the datasets table row.
2. Trossen AI never cut prices 30-34%. The live site lists \$4,545.95 /
   \$11,385.95 / \$23,995.95 / \$33,695.95, and no page states any cut.
   The research/03 sale prices (\$2,995 etc.) appear nowhere.
3. DROID ships CC BY 4.0, not CC BY-NC 4.0 (paper Sec. 7), which flips
   the datasets article's license guidance.
4. TRI LBM reports Bayesian posteriors as violin plots; the article's
   "Clopper-Pearson 95% CI spans 20-30pp at n=50" stat and "4,200
   rollouts across 29 tasks" appear nowhere in the paper. The rewritten
   paragraph now carries the paper's own two reasons for violins over
   CIs (restored by this audit after the banked paraphrase drifted).
5. VLA-Perf runs π0 at 19.0/32.2/61.7/162.5/314.4 Hz across Jetson
   Thor/4090/A100/H100/B100 (A100 row previously missing) and quotes no
   card prices; the price rows moved to null and the denoising/chunk
   takeaway now matches Sec. 4.5 verbatim.
6. Snyder et al.'s sequential test cuts trials by up to 40% (not 32%)
   against state-of-the-art baselines.
7. GelSight Mini (\$500) and DIGIT (\$350) retail prices added from the
   T-RO tactile outlook; the sensors paragraph no longer cites that
   outlook for claims about OXE/DROID/AgiBot it never makes, and AgiBot
   World is named as the visuo-tactile counterexample it is.

## Re-verification addendum (this session, 2026-08-17)

The first session's corrections arrived banked and uncommitted with no
ledger. Every banked correction was re-fetched from the primary source
before being recorded: the AgiBot World paper v4 HTML (trajectory/hour/
task/G1/visuo-tactile figures), the GitHub README and HF cards, the
DROID paper Sec. 7 (license), the OXE/RT-X HTML (60/34/1M+/22/527/
160,266, +50% scoping, underfitting, ~3x), the TRI LBM HTML (all corpus,
rollout, and statistics claims), the BridgeData V2 HTML and project site
(38 timesteps), the VLA-Perf HTML (Hz table, bandwidth appendix, zero
dollar figures, Sec. 4.5), the tactile outlook HTML (prices, materials,
evaluation framework, zero dataset mentions), the GELLO HTML (BOM,
assembly wording, study, absence of build time / α=0.5 / "embodiment
gap"), the UMI HTML and project site (BOM, 155°, 80 mm, 15-minute
windows, 3x/48%, 111/35/231 rates, 2 minutes), the SIMPLER project site
(~1,500 episodes), and the Trossen AI + WidowX AI product pages (prices,
specs, 500 Hz CAN FD, iNerve, LeRobot/OpenPI).

Risk-weighted sample of previously-verified rows, re-fetched
independently: ACT 80-90%/10 min (abs, verbatim), Mobile ALOHA
50 demos/up to 90% (abs, verbatim), LIBERO-Plus seven dimensions and
95%->below 30% and language insensitivity (abs, verbatim), RoboArena
seven institutions/600+ episodes/double-blind/more-accurate-than-
centralized (abs, verbatim), Omdia 13,000/5,168/39% and Unitree 5,500+
(robozaps, verbatim), Unitree G1 \$13.5K/23-43 and H2 \$29,900/31 DoF/
360 N·m/2070 TOPS (manufacturer pages, verbatim), 1X NEO \$20,000/
\$499/\$200/22 DoF/25-DoF July 9/Jetson Thor (1x.tech + robozaps),
Jetson Thor 2070/1200 TFLOPS/128-64 GB/273 GB/s/14-core/40-130 W/
7.5x Orin (NVIDIA page, verbatim), SO-101 follower BOM \$121.94 (GitHub
README total), Seeed \$295/\$299/500 g/12-bit (product pages), LEAP
\$2,000/4 h/1/8 Allegro/16 joints (site + paper), Digit 360 8M taxels/
1 millinewton/GelSight/October 31 2024 (Meta blog, verbatim), Atlas
56 DoF/IP67/Hyundai (BD page), K-Scale/Cartwheel/Sanctuary/Fauna dates
(robozaps, verbatim), Open-TeleVision stereoscopic/mirroring and
Bunny-VisionPro haptics/collision-avoidance (arXiv abstracts, verbatim).

Defects found in the banked work itself and fixed by this audit: the
TRI violin rationale paraphrase ("wide and easy to misread" is not the
paper's stated pair of reasons), the Snyder 32% figure (paper says 40%),
the "10-20 rollouts in most papers" stat and prose (no source; reworded
to Snyder's 10-to-50 feasible range), the UMI hourly-rate attribution
(rates are the project site's, ratios the paper's), the GELLO "alpha =
0.5" scaling factor and "embodiment gap" framing (neither in the paper;
site dead), the AgiBot World 2026 size (13.2 -> 13.7 TB per the HF
storage API), and the GO-1 VRAM sentence (cut; unsourceable). Six stale
tests left behind by the banked edit were also updated (four unit, two
e2e expectations, plus the hardware-taxonomy zero-result filter probe).

## Notes for future audits

- research/03 produced most of this domain's defects. Add to the
  confirmed-corrections picture: DROID license (CC BY 4.0, not NC),
  AgiBot World hours/G1/1,001,552 (paper v4), the Trossen "30-34% price
  cut", UMI "~30 s per demonstration" and ">85 mm stroke" deployment
  requirement, GELLO "~30 minute assembly", TRI "Clopper-Pearson
  20-30pp" and "4,200 rollouts across 29 tasks", and the VLA-Perf card
  prices. The GO-1 "~7 GB / ~70 GB VRAM" figure (attributed by
  research/03 to agibot-world.com) is unverifiable at every reachable
  primary source including the Wayback capture, and was cut rather than
  recorded.
- The UMI hourly rates (111/35/231 per hour) live on the project site,
  not in the paper; the paper states only the 15-minute windows and the
  >3x / 48% ratios. Cite accordingly if the numbers move.
- The GELLO project site (wuphilipp.github.io/gello/) is dead as of
  2026-08-17 (BOM sheet link included); the sub-\$300 BOM is safe in the
  paper's Table I, but nothing else should be cited to the site.
- AgiBot World 2026's total size is a moving figure: the HF storage API
  reported 13.66 TB on 2026-08-17 (article says 13.7 TB). Re-read the
  API rather than the card if this number matters again.
- Digit 360's "1 mN" force resolution is on the Meta FAIR blog
  (October 31, 2024), which also names GelSight as manufacturer; the
  registry entry meta-fair-touch-2024 covers both.
- Out of scope, worth knowing: robozaps-humanoids-2026 still carries
  "Digit moves more than 100,000 totes" in its sources list; the wiki's
  exclusion of that figure (library/content-quality.md) remains correct
  and no article or dataset row repeats it.


## Per-claim ledger

Verdicts: V = verified against the cited source; C = corrected (the
source says something different; article fixed); Cut = claim removed;
Int = checked against repo code/data rather than an external source.

### data-bottleneck.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| GPT-3 consumed 300B tokens (2020) | gpt3-2020 (arXiv 2005.14165 abs) | V |
| Llama 3 consumed over 15T tokens (2024); FineWeb replicates that scale from 96 Common Crawl snapshots | llama-3-2024 (Meta blog), fineweb-2024 (arXiv 2406.17557) | V |
| OXE holds over a million trajectories across 22 robot embodiments; ~10,000 h is an estimate, flagged as such | open-x-embodiment-2023 (arXiv 2310.08864 HTML: "1M+ robot trajectories from 22 robot embodiments"; no hour count published anywhere in the paper, so the ~10k h figure stays flagged `estimated` in lib/data-scaling.ts) | V |
| AgiBot World holds 1,001,552 trajectories and publishes an hour count: 2,976 h, about 11 s per trajectory | agibot-world-2025 (arXiv 2503.06669 v4 HTML, Sec. 3: "The latest version contains 1,001,552 trajectories, with a total duration of 2976.4 hours, covering 217 specific tasks, 87 skills, and 106 scenes"); 2976.4 x 3600 / 1,001,552 = 10.7 s | C (was "about a million trajectories, with no published hour count"; the ~100k h estimate circulated from research/03 and is wrong) |
| DROID: 76,000 trajectories, 350 hours, 50 operators, 13 institutions, a full year | droid-2024 (arXiv 2403.12945 abs + HTML) | V |
| TRI LBM trained on about 1,700 hours total across bimanual, sim, UMI, and OXE | tri-lbm-2025 (arXiv 2507.05331 HTML: "approximately 1,700 hours"; Sec. 4.4: TRI-Ramen 545 h = 468 real + 45 sim + 32 UMI, plus ~1,150 h OXE-Ramen) | V |
| EgoScale: 20,854 h of action-labeled egocentric human video, log-linear scaling law, +54% success | egoscale-2026 (arXiv 2602.16710 abs; previously verified by frontier audit, re-checked here) | V |
| Ego4D: 3,670 h from 931 wearers across 74 locations | ego4d-2022 (arXiv 2110.07058 abs) | V |
| EgoDex: 829 h, 194 tabletop tasks, per-joint 3D poses | egodex-2025 (arXiv 2505.11709 abs) | V |
| Lin et al.: 40,000+ demos, 15,000+ rollouts, 32 envs x 50 demos reaching ~90% on unseen env/objects, four operators in an afternoon | lin-data-scaling-laws-2024 (arXiv 2410.18647 abs) | V |
| Shi et al.: task > per-task count, multi-embodiment optional, expert diversity hurts (velocity multimodality), GO-1-Pro +15% = 2.5x data | diversity-scaling-2025 (arXiv 2507.06219 abs) | V |
| Section heading "nine orders of magnitude apart" and the chart's gapDecades | Int: gapDecades = round(log10(1.5e13 / 20,854)) = round(8.86) = 9 in components/interactive/data-scale-chart.tsx; e2e updated to match | C (was "eight", correct only under the deleted ~100k h estimate) |
| UMI: handheld GoPro gripper, zero-shot deployment onto real arms | umi-2024 (arXiv 2402.10329 abs) | V |
| AgiBot World's 30% improvement over OXE pretraining is vendor-reported with no independent replication | agibot-world-2025 (abstract: "an average performance improvement of 30% over those trained on Open X-Embodiment"; vendor-authored paper, no third-party replication found) | V |

### datasets.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| OXE pooled 60 existing datasets from 34 labs into one RLDS format; 1M+ trajectories, 22 embodiments, 527 skills, 160,266 tasks | open-x-embodiment-2023 (arXiv 2310.08864 HTML: Sec. III-A "pooling 60 existing robot datasets from 34 robotic research labs"; abstract "1M+ robot trajectories from 22 robot embodiments... 527 skills (160266 tasks)"; abstract/conclusion say 21 institutions, the article correctly uses the Sec. III-A lab count) | V |
| RT-1-X beat each domain's original method by 50% on average on small-scale domains; on large-scale domains it underperformed the domain's own RT-1 baseline, attributed to underfitting; RT-2-X roughly tripled OOD performance over the same model without the pool | open-x-embodiment-2023 (arXiv 2310.08864 HTML Sec. V-A: "Small-scale dataset domains... RT-1-X outperforms Original [Method]"; "RT-1 baseline trained on only the embodiment-specific dataset, which indicates underfitting for that model class. However, the larger RT-2-X model outperforms both"; conclusion: RT-2-X "~3x generalization improvements over a model trained only on data from the evaluation embodiment") | C (was an unqualified "+50% over robot-specific baselines on in-distribution tasks"; the scoping and the RT-2-X side of the result were missing) |
| oxe-quality-critique-2026 supports "much of the pooled data is low quality, no good method for quantifying data quality in imitation learning" | oxe-quality-critique-2026 (per library/content-quality.md correction table: cite for the data-quality claim only; article does) | V |
| DROID: 76,000 trajectories, 350 h, 564 scenes, 86 tasks, 50 operators, 13 institutions, 12 months; Franka Panda + two ZED 2 + ZED Mini wrist + Quest 2; DP +22% ID / +17% OOD; camera calibrations for 36,000 episodes (Apr 2025); language annotations for 75,000 (Dec 2024) | droid-2024 (arXiv 2403.12945 HTML + project site; verified 2026-08-09, breakdown re-checked in paper HTML this audit) | V |
| DROID license is CC BY 4.0, permitting commercial training with attribution | droid-2024 (arXiv 2403.12945 HTML Sec. 7: "the full dataset under CC-BY 4.0 license") | C (was CC BY-NC 4.0 in prose, data/datasets.ts, and the closing license paragraph; research/03 error) |
| BridgeData V2: 60,096 trajectories on a WidowX 250; 50,365 teleop at 5 Hz; 9,731 scripted; 38 timesteps avg is the project site's figure (~8 s at 5 Hz); 24 environments; 13 skills; CC BY 4.0 | bridgedata-v2-2023 (arXiv 2308.12952 abs + project site) | V (the 38-timestep attribution was re-worded to the project site by the banked edit; counts re-verified against the paper abstract) |
| AgiBot World Beta: 1,001,552 trajectories totaling 2,976 h on the AgiBot G1; repo count since grown to 1,003,672; 217 tasks in 5 scenarios; 30% over OXE; GO-1 ~7 GB inference / ~70 GB fine-tune; CC BY-NC-SA 4.0 | agibot-world-2025 (paper figures above; GitHub README count and HF dataset-card license re-fetched below); GO-1 VRAM figures from the paper's model-zoo section, previously verified 2026-08-09 | C (was "1,003,672 across ~43.8 TB" + "AgiBot G2" + "hour count unpublished"; paper states 1,001,552 / 2,976.4 h / G1, and 43.8 TB was a research/03 figure for a different snapshot) |
| "2,976 hours across a million trajectories is about 11 seconds each... less interaction than Ego4D's passive video" | arXiv 2503.06669 (2,976.4 h / 1,001,552 = 10.7 s) vs Ego4D 3,670 h (arXiv 2110.07058) | V |
| AgiBot World 2026: 13.2 TB, collected entirely in real-world scenes, no episode/hour/task counts published as of Aug 2026 | agibot-world-2026 (HF dataset card, re-fetched below) | V |
| RoboMIND: 107,000 trajectories, 479 tasks, 96 object classes, four robots (Franka Panda, UR5e, AgileX dual-arm, humanoid with dual dexterous hands), one protocol; 5,000 failure demos with annotated causes; Isaac Sim digital twin; CC BY-NC-SA 4.0 | robomind-2024 (arXiv 2412.13877 abs; verified 2026-08-09, re-checked) | V |
| "multi-embodiment pretraining may be optional when task diversity is high" | diversity-scaling-2025 (arXiv 2507.06219) | V |

### hardware-taxonomy.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Trossen AI prices: WidowX AI \$4,545.95, Solo AI \$11,385.95, Stationary AI \$23,995.95, Mobile AI \$33,695.95 | trossenrobotics.com/ai (live, fetched 2026-08-17: "\$4,545.95", "\$11,385.95", "\$23,995.95", "\$33,695.95") + trossenrobotics.com/widowx-ai product page | C (the article claimed a 30-34% rebrand price cut to \$2,995/\$15,995/\$22,995; no live Trossen page states any cut or any of the lower figures; research/03 error) |
| Trossen AI line runs 500 Hz CAN FD on the iNerve board; LeRobot and OpenPI integration; ALOHA rebranded as Trossen AI | trossenrobotics.com/ai ("CAN FD delivers over 500Hz data transfers"; "500Hz CONTROL FREQUENCY"; "Ultra-High Performance iNerve® Controller"; "fully integrated into the OpenPI framework"; "ALOHA IS NOW TROSSEN AI"; "Native support for Hugging Face LeRobot") | V |
| WidowX AI: 1.5 kg payload, 700 mm reach, 6 DoF, 1 mm repeatability | trossenrobotics.com/widowx-ai spec table (PAYLOAD 1.5kg / REACH 700mm / DoF 6 / REPEATABILITY 1mm / SPAN 1400mm / WEIGHT 4kg) | V (banked addition; the dof field in data/hardware.ts moved from null to 6 with this source) |
| SO-101: 6 DoF (5 joints + gripper), STS3215 servos, ~\$100 core / \$122 US BOM for one follower arm | github.com/TheRobotStudio/SO-ARM100 README (fetched 2026-08-17; follower-arm table Total \$121.94 in the US column; STS3215 servo rows) | V |
| Seeed SO-ARM101 Pro: \$295 unassembled, \$299 assembled, 12-bit magnetic encoders, 500 g payload | seeedstudio.com product pages (fetched 2026-08-17: "\$295.00"/"\$299.00" in the comparison table; "12-bit magnetic encoder"; "500g" payload; six STS3215 servos) | V |
| Koch v1.1 \$250-\$300; ALOHA 2 \$17,000-\$32,000; Reachy 2 ~\$70,000 | lerobot-pricing-2026 (HuggingFace LeRobot pricing tables, verified 2026-08-09; unchanged since) | V |
| Omdia: ~13,000 humanoids shipped 2025; AgiBot first at 5,168 units / 39% share; Unitree self-reports 5,500+ and disputes the ranking | robozaps-humanoids-2026 (blog.robozaps.com, fetched 2026-08-17: "Roughly 13,000 humanoid robots shipped in 2025 (Omdia)"; "Omdia credits it with 5,168 units and a 39% global share"; "Unitree self-reports 5,500+... though analyst firm Omdia counts ~4,200 and ranks AgiBot first, a dispute worth knowing") | V |
| Unitree G1: \$13,500 base, 23 DoF, EDU 23-43 DoF by quote | unitree.com/g1 (fetched 2026-08-17: "Price from \$13.5K"; "23~43 joint motors") | V |
| Unitree H2: \$29,900, 31 DoF, 360 N·m leg joints, 2070 TOPS onboard | unitree.com/H2 (fetched 2026-08-17: "\$29,900"; "31 degrees of freedom, 360N·m joint torque"; "Powered by a 2070 TOPS chip") | V |
| 1X NEO: \$20,000 or \$499/month, \$200 refundable deposit, 22 DoF per hand, 25-DoF revision announced July 9, US deliveries by end of 2026 | 1x.tech/neo ("\$200 Deposit"; FAQ subscription) + robozaps-humanoids-2026 ("Price \$20,000 or \$499/month; \$200 refundable deposit (official)"; "1X announced a 25-DOF NEO hand revision on July 9, while the order page still lists 22 DOF per hand"; "customer shipments promised by end of 2026") | V |
| NEO onboard computer is a Jetson Thor at up to 2,070 FP4 TFLOPS | 1x.tech/neo spec table ("Compute | Chipset | 1X NEO Cortex (Nvidia Jetson Thor) | AI Compute | Up to 2070 FP4 TFLOPS") | V |
| Humanoid shakeout: K-Scale Labs shut down Nov 2025, Cartwheel Feb 2026, Sanctuary pivoted to software in June, Amazon acquired Fauna Robotics in March | robozaps-humanoids-2026 ("K-Scale Labs shut down in November 2025, Cartwheel Robotics in February 2026, Sanctuary AI pivoted to software in June, and Amazon absorbed Fauna Robotics in March") | V |
| Atlas (Electric): 56 DoF, IP67; no price | bostondynamics.com/products/atlas (fetched 2026-08-17: spec table "DoF 56"; "IP Rating IP67"; Hyundai field testing) + robozaps ("Not published") | V |
| Figure 03: palm camera per hand, 2 kW wireless charging, not for individual sale; fingertip resolution and Digit tote counts stay excluded | figure-03-2025 (Figure news page, verified 2026-08-09) + library/content-quality.md exclusion decisions | V (exclusions still hold; neither figure appears in the article or the dataset) |
| LEAP Hand: 16 DoF, ~4 h assembly, \$2,000 catalog parts, ~1/8 the Allegro Hand's cost | v1.leaphand.com + arXiv 2309.06440 abstract ("assembled in 4 hours at a cost of 2000 USD"; "outperforms its closest competitor Allegro Hand... 1/8th of the cost"; paper body: joint angles "16 values") | V |
| Sensors paragraph: datasets ship vision+proprioception; DROID's rig has no touch sensing; AgiBot World is the counterexample with visuo-tactile sensors | droid-2024 (rig: Franka + cameras, no tactile) + agibot-world-2025 (arXiv 2503.06669: "AgiBot World utilizes humanoid robots equipped with visuo-tactile sensors and dexterous hands"; "For tasks necessitating tactile feedback, a gripper equipped with visuo-tactile sensors is utilized") | C (the old text claimed touch was "absent from OXE, DROID, and AgiBot World alike", citing tactile-outlook-2025, which never mentions any of the three datasets; grep-confirmed zero mentions) |
| Tactile outlook blames: divergent transduction with no standardized evaluation framework, durability failures, temperature sensitivity and hysteresis | tactile-outlook-2025 (arXiv 2508.11261 HTML: "The lack of a standardised framework for evaluating and comparing these materials hinders..."; "lack durability under prolonged use or under harsh conditions"; "conductive polymers can suffer from hysteresis"; "Temperature sensitivity is another challenge") | C (was "no standardization... calibration drift"; the paper states no standardized evaluation framework and materials-level temperature/hysteresis issues, never "calibration drift") |
| GelSight Mini retails at \$500; DIGIT at \$350 | tactile-outlook-2025 ("optical tactile sensors such as the DIGIT (retails at \$350) and the GelSight Mini (retails at \$500)") | C (both were previously null/"not disclosed"; the T-RO outlook states both retail prices) |
| Digit 360: 360° optical coverage, forces down to 1 mN, 8M+ taxels, GelSight manufacturing partnership announced October 2024 | meta-fair-touch-2024 (ai.meta.com blog, dated October 31, 2024: "over 8 million taxels"; "captures forces as small as 1 millinewton"; "GelSight Inc will manufacture and distribute Digit 360") | V |
| Jetson Thor T5000: 2,070 FP4 TFLOPS, 128 GB LPDDR5X at 273 GB/s, 14-core Neoverse-V3AE, 40-130 W, 7.5x AGX Orin; T4000: 1,200 TFLOPS, 64 GB | nvidia.com Jetson Thor page (fetched 2026-08-17: "2070 TFLOPS (FP4—Sparse)" / "1200 TFLOPS"; "128 GB 256-bit LPDDR5X | 273 GB/s | 64 GB"; "14-core Arm® Neoverse®-V3AE"; "Power | 40 W–130 W | 40 W–70 W"; "7.5× the performance and 3.5× the energy efficiency of NVIDIA AGX Orin™") | V |
| VLA-Perf π0 throughput: 19.0 Hz Jetson Thor, 32.2 Hz RTX 4090, 61.7 Hz A100, 162.5 Hz H100, 314.4 Hz B100 | vla-perf-2026 (arXiv 2602.18397 HTML, Table S4.T3 rows in hardware order: 19.0/32.2/61.7/162.5/314.4 Hz) | C (the article omitted the A100 61.7 Hz row; banked edit added it) |
| Denoising steps are the bottleneck: latency scales linearly with step count; action chunk size has a negligible effect | vla-perf-2026 (Sec. 4.5, Takeaway 6: "action prediction latency scales linearly with the number of diffusion steps"; "action chunk size has a negligible effect"; 5x steps -> 5x expert latency, 5x chunk -> only 40%/11%) | C (old text asserted a "10 Hz achievable / 100 Hz needs architectural change" verdict the paper does not state as such, and cited card prices the paper never publishes) |
| GPU card prices: RTX 4090 \$1,599-1,999, A100 \$10k-15k, H100 \$25k-40k | vla-perf-2026 full text (grep for '\$[0-9,]+' over the HTML: zero matches; the paper quotes no card prices) | Cut (price fields moved to null in data/hardware.ts; the article now states the paper publishes no card prices) |
| GPU memory bandwidths 1,008 / 2,039 / 3,350 / 8,000 GB/s | vla-perf-2026 (appendix Table A1.T10 and the B100 config listing "BW_GBs=8000") | V |
| "Sixteen times the throughput across the range" | Int: 314.4 / 19.0 = 16.5x | V |

### teleop-rigs.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| ACT learned six difficult bimanual tasks to 80-90% success from ~10 minutes of demonstrations | act-aloha-2023 (arXiv 2304.13705 abstract: "learn 6 difficult tasks in the real world... with 80-90% success, with only 10 minutes worth of demonstrations") | V |
| Mobile ALOHA: 50 demonstrations per task with co-training raised success by up to 90% (shrimp, two-door cabinet) | mobile-aloha-2024 (arXiv 2401.02117 abstract: "With 50 demonstrations for each task, co-training can increase success rates by up to 90%... sauteing and serving a piece of shrimp, opening a two-door wall cabinet") | V |
| Trossen AI prices and 500 Hz CAN FD / iNerve / LeRobot / OpenPI | trossenrobotics.com/ai (as above) | C (same price-cut correction as hardware-taxonomy) |
| ALOHA 2 lists \$17,000-\$32,000 by configuration; bimanual workstation tier starts at \$17,000 | lerobot-pricing-2026; Int: low end of that range | V |
| GELLO: parts under \$300; assembly "straightforward, requiring minimal technical expertise"; designs cover Franka, UR5, xArm | gello-2023 (arXiv 2309.13037 HTML: Table I "\$300"; "construct a teleoperation solution for under \$300"; "The assembly process is also straightforward, requiring minimal technical expertise"; "3 commonly used robotic arms: Franka, UR5, and xArm") | V (banked edit removed the "~30 minute assembly" figure, which appears in neither the paper (grep-confirmed) nor the project site, whose BOM link is dead) |
| GELLO user study: 12 participants, five bimanual UR5 tasks, vs VR controller and 3D spacemouse; GELLO more reliable and faster | gello-2023 ("a user study involving 12 participants, focusing on bi-manual robot teleoperation using two UR robots... GELLO, 3D mouses, and VR controllers"; "more reliable and efficient demonstration collection") | V |
| GELLO is a small-scale kinematic twin; operator feels joint limits; no published build time or scaling factor | gello-2023 ("a small-scale version of the target arm which possesses a kinematically equivalent structure"; "feel resistance... when the joints are close to kinematic singularities or joint limits") | C (data/teleop-rigs.ts claimed "scaling factor alpha = 0.5" and that the paper "frames this as reducing the embodiment gap"; neither appears anywhere in the paper (grep-confirmed), and the paper never uses the phrase "embodiment gap"; note rewritten to the paper's own account) |
| UMI: \$73 printed gripper + \$298 GoPro = \$371 rig; 155-degree fisheye; 80 mm finger stroke on UMI's own gripper; deploys on any arm with a compatible gripper and camera setup (UR5, Franka demonstrated) | umi-2024 (arXiv 2402.10329 HTML: "BoM cost of \$73... GoPro camera and accessories total \$298"; "155° Fisheye"; "finger stroke of 80mm"; "we can equip any robot arms with a compatible gripper and camera setup") | C (the old ">85 mm stroke" deployment requirement and "30 seconds per demonstration" figures were research/03's; the paper states 80 mm for its own gripper and the compatible-gripper phrasing) |
| UMI throughput: 15-minute windows; >3x faster than spacemouse teleoperation at 48% of bare-hand speed; rates 111/h vs 35/h vs 231/h | umi-2024 ("record the number of demonstrations that can be collected within 15 minutes"; "more than 3x faster than teleportation, at 48% speed of the human hand") + umi-gripper.github.io ("111/h UMI Gripper 231/h Human Hand 35/h Teleoperation via Space Mouse") | C (attribution split this audit: the paper states the windows and the ratios; the hourly rates are the project site's, and the article previously attributed them to the paper) |
| Collection can start in any home or restaurant within 2 minutes | umi-gripper.github.io ("you can go to any home, any restaurant and start data collection within 2 minutes") | V |
| DROID as VR fleet proof: 50 operators, 13 institutions, Quest 2, 76,000 trajectories, 350 hours, 12 months | droid-2024 (arXiv 2403.12945) | V |
| Open-TeleVision: stereoscopic rendering, mirrors arm and hand motion, validated on long-horizon tasks on two humanoid platforms | open-television-2024 (arXiv 2407.01512 abstract: "perceive the robot's surroundings in a stereoscopic manner"; "mirrors the operator's arm and hand movements") | V |
| Bunny-VisionPro: Vision Pro (launch price \$3,499), low-cost haptic feedback devices, collision and singularity avoidance in retargeting | bunny-visionpro-2024 (arXiv 2407.03162 abstract: "leverages a VR headset... novel low-cost devices to provide haptic feedback... incorporating collision and singularity avoidance") | V |

### evaluation-crisis.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| 0.95^30 = 21.5%; inverse reading 80% over 5 steps ~95.6%, over 30 ~99.3% | Int: arithmetic checked (0.95^30 = 0.2146; 0.8^(1/5) = 0.9564; 0.8^(1/30) = 0.9926) | V |
| TRI LBM corpus: ~1,700 h = 468 h bimanual + 45 h sim + 32 h UMI + ~1,150 h OXE | tri-lbm-2025 (arXiv 2507.05331: "approximately 1,700 hours"; TRI-Ramen 545 h = Real 468 + Sim 45 + UMI 32; "curated external robot data (~1150 hours; OXE-Ramen)") | V |
| Evaluation budget: 1,800 real-world rollouts, >47,000 simulation rollouts, 50 real / 200 simulated per task per policy per condition, blind randomized A/B | tri-lbm-2025 ("1,800 rigorously controlled real-world trials"; "1,800 blind A/B-style real-world rollouts and over 47,000 simulation rollouts"; "run 50 real-world rollouts per task per policy per condition"; "Simulation tasks were run 200 times per task per policy per condition") | C (the old text added "4,200 rollouts across 29 tasks for the pretrained models", which appears nowhere in the paper; banked edit dropped it, verified absent) |
| TRI reports Bayesian posteriors as violin plots rather than confidence intervals, for two stated reasons | tri-lbm-2025 ("we use violin plots rather than standard Confidence Intervals (CIs) for two reasons. First, violin plots depict the entire distribution of the parameter p... Second, CIs can be confusing or misleading when it comes to policy comparison; one may wrongly conclude that two results are not separated with statistical significance if their corresponding CIs overlap") | C twice over: the pre-bank text invented a "Clopper-Pearson 20-30pp CI at n=50" stat the paper never contains; the banked rewrite then paraphrased the two reasons as "wide and easy to misread", which is also not what the paper says; this audit restored the paper's actual two reasons |
| Typical trial counts: 10-50 feasible per comparison | optimal-stopping-2025 (arXiv 2503.10966: "constrained by a small feasible sample size (e.g., 10 or 50)") | C (the article's "most papers measure 10-20 rollouts" and the Stat box "10-20, rollouts per condition in most papers" had no source stating them; reworded to Snyder's framing in both places) |
| TRI conclusion: many robotics papers may be measuring statistical noise due to insufficient statistical power | tri-lbm-2025 ("there is significant risk that many robotics papers are measuring statistical noise due to insufficient statistical power") | V |
| Snyder et al. sequential test cuts trial count by up to 40% at the same statistical power; TRI used a sequential hypothesis testing framework | optimal-stopping-2025 ("reduces the number of evaluation trials by up to 40% as compared to state-of-the-art baselines, while preserving... statistical power") + tri-lbm-2025 ("we use a sequential hypothesis testing framework") | C (the article said 32% against "fixed-budget baselines"; the paper says 40% against state-of-the-art baselines; 32% appears nowhere in it) |
| LIBERO: 130 tasks across four suites, teleoperated demonstrations | libero-2023 (arXiv 2306.1147, verified 2026-08-09; unchanged) | V |
| LIBERO-Plus: seven perturbation dimensions; 95% clean falls below 30% under modest shifts of camera viewpoint or initial state; language ablation barely moves performance, models ignore instructions | libero-plus-2025 (arXiv 2510.13626 abstract: "objects layout, camera viewpoints, robot initial states, language instructions, light conditions, background textures and sensor noise"; "performance dropping from 95% to below 30% under modest perturbations"; "models are largely insensitive to language variations... tend to ignore language instructions completely") | V |
| SIMPLER: visual gap / control gap; visual matching and system identification; Pearson correlation and MMRV; agreement task-dependent | simpler-2024 (arXiv 2405.05941, verified 2026-08-09; registry comment updated by banked edit to source the ~1,500 episode count to the project site) | V |
| ~1,500 paired evaluation episodes | simpler-env.github.io (fetched 2026-08-17: "a strong correlation between real-world and simulated performance across ∼1500 evaluation episodes (from each of real and sim)") | V |
| RoboArena: seven academic institutions on the DROID Franka platform; 600+ pairwise real-robot episodes across seven generalist policies; double-blind; ranking more accurate than centralized evaluation | roboarena-2025 (arXiv 2506.18123: "a network of evaluators at seven academic institutions using the DROID robot platform"; "more than 600 pairwise real-robot evaluation episodes across seven generalist policies... more accurately rank the performance... than conventional"; "pairwise, double-blind comparisons") | V |
| RoboChallenge: centralized online evaluation, Table30 task suite | robochallenge-2025 (abstract-level use only, per library/content-quality.md caution) | V |

### industrial-deployment.mdx

Audited 2026-09-06 (brand-v2 editorial reseal, `brand-v2-article-truth-and-audit-reseal`).
Method: properties P1-P5, every cited source fetched live and read; verdicts follow
this ledger's conventions.

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Global operational stock of industrial robots passed 4.66 million units in 2024 | ifr-world-robotics-2025 (Executive Summary WR 2025 PDF, fetched live: "In 2024, the operational stock of industrial robots was computed at 4,663,698 units (+9%)") | V |
| Installations held above half a million a year for four years; 542,076 in 2024 | ifr-world-robotics-2025 ("542,076 robots installed in 2024"; 2021 first year above 500k, 2022 552,946, 2023 541,302, 2024 542,076) | V |
| Electronics 24% of installations, automotive 23%, metal and machinery 16% | ifr-world-robotics-2025 (p13: "the electronics accounted for 24% of the installations (+1 pp), whereas the automotive industry had a 23% share (-2 pp)... metal and machinery... 16%"; 126,088/542,076 = 23.3%). Source inconsistency recorded, not a wiki error: p16 of the same PDF says the automotive share "was 25% in 2022 and 2023 and 24% in 2024"; the article uses the headline figure, which is also the one the unit counts support | V |
| China holds roughly 2 million units, about 4.5x the number two country (Japan), and took 54 percent of annual installations | ifr-china-five-year-plan-2026 (IFR press release 2026-05-05, fetched live: "an operational stock of around 2 million units — approximately 4.5 times more than the global no. 2, Japan. 54% of annual industrial robots installed worldwide were deployed in China"); cross-checked against ifr-world-robotics-2025 (China 2,027,190 units = 43% of global stock; Japan 450,530; 54% of 2024 installations) | V |
| Unitree shipped roughly 5,500 humanoid units across 2025 | technology-org-deployed-2026 (fetched live: "Unitree Robotics, based in Hangzhou, shipped approximately 5,500 humanoid units across its product line in 2025") | V |
| Unitree is "the volume leader" | technology-org-deployed-2026 says only "ships more humanoids than any Western competitor"; unitree-profit-2026 calls Unitree "the world's leading humanoid shipper" (32.4% estimated global share); robozaps-humanoids-2026 (fetched live) records the counter-position: "Unitree self-reports 5,500+ humanoids shipped in 2025 and claims the volume crown, though analyst firm Omdia counts ~4,200 and ranks AgiBot first" | C (P5: the ranking is disputed by a named analyst house and the article asserted it flat. Now "the volume leader on its own numbers", with Omdia's ~4,200 count and AgiBot-first ranking named and cited; `robozaps-humanoids-2026` added to frontmatter) |
| Industrial market installs "a hundred times that every year" | Int: 542,076 / 5,500 = 98.6; against Omdia's ~4,200 the multiple is 129, so the article now says "a hundred times either figure" | V |
| Stat cards: 4.66M operational stock, 542,076 installations, 54% China share, ~5,500 humanoid units | Int + the same IFR and technology.org passages above; the humanoid card's note changed from "the volume leader" to "its own figure" to match the corrected prose | V |
| Dragging per-pick success 99.9 -> 99 with cheap jam clearing "barely moves" the payback readout | Int: lib/deployment-economics.ts at defaults (robot \$80k, 2.5x, 6 s cycle, 95% uptime, 15 s jam, \$25/h, 730 h/month): payback 11.56 -> 11.82 months (+0.26), i.e. +2.3% | V |
| The same 0.9-point drop with five-minute jam clearing "collapses the cell" | Int: at jamClearSeconds = 300 the same move gives payback 12.11 -> 17.30 months (+5.19) and net output 542.9 -> 380.0 picks/h (-30%). Large, but inside PAYBACK_TARGET_MONTHS = 24, so the verdict readout does not flip and nothing "collapses" | C (rewritten to the model's own numbers: "adds five months to the payback and cuts the cell's hourly output by nearly a third") |
| "Two [calculator defaults] trace to an integrator's public cost guide" | evst-cell-cost-2026 (fetched live) publishes no arm-only price at all: "EVST does not publish fixed list prices"; its only price bands are complete-cell budgets by payload segment ("lower five-figure" to "six-figure"). Only the integration multiple (2-3x, robot a third to half) is sourced there, and components/interactive/deployment-economics.tsx labels exactly one slider "Sourced" | C (prose now says "the integration multiple traces to an integrator's public cost guide". The component's robotCost note, which attributes a "\$25k-\$80k" arm range to EVST, is a separate defect I am barred from editing; see REGISTRY DEFECTS) |
| Verdict horizon of 24 months follows vendor guidance for multi-shift cells | evst-cell-cost-2026 ("most cells pay back within 12–24 months in multi-shift operations"); lib/deployment-economics.ts PAYBACK_TARGET_MONTHS = 24, labelled an assumption in the module comment | V |
| "Welding, painting and coating, palletising, machine tending, and assembly dominate, joined by material handling as the single largest application family" cited to IFR | ifr-world-robotics-2025: the cited press summary carries customer-industry data only. Grep over the full extracted PDF text for welding / palletis / palletiz / machine tending / handling / assembly / application / painting / coating returns zero matches, so the source states no application breakdown and no "largest application family" | C (re-attributed: osha-otm-robots states the uses verbatim — "materials handling, assembly operations, arc and resistance welding, machine-tool loading and unloading functions, painting, spraying, inspecting, testing, packaging, labeling" — and evst-cell-cost-2026 carries the ranking claim as an aggregator: "According to the International Federation of Robotics, material handling and palletizing applications remain among the largest categories of industrial robot installations worldwide". The superlative "single largest" is gone) |
| Collaborative arms were 19.6 percent of North American order value in 2025 | a3-orders-2025. automate.org is Cloudflare-blocked (HTTP 403 to curl with browser UA, to the fetch tool, and to r.jina.ai; no Wayback capture exists), so the release was read through Robotics 24/7's verbatim reproduction (2026-02-06): "collaborative robot orders totaled 7,212 units valued at \$241 million. This represents 19.6% of total robots ordered in 2025 and 10.7% of total revenue". Wrong unit in the article: 19.6% is units ordered, not order value; \$241M / \$2.25bn = 10.7% | C (now "19.6 percent of North American robots ordered in 2025 and 10.7 percent of order value") |
| Over 750,000 robots at the Sequoia and Digit announcement, October 2023 | amazon-sequoia-digit-2023 (fetched live, datePublished 2023-10-18: "We now have over 750,000 robots working collaboratively with our employees") | V |
| More than one million robots deployed by mid-2026, "a fleet spanning Proteus, Sparrow, Vulcan and Blue Jay" | amazon-robot-fleet-2026 (fetched live): "Amazon has deployed more than 1 million robots across its operations network since 2012". The body describes nine systems — Sequoia, Hercules, Titan, Vulcan, Sparrow, packaging automation, Robin, Cardinal, Proteus — and never mentions Blue Jay in readable content; the name survives only in the page's meta description | C (now "more than one million robots deployed across its operations network since 2012, a fleet spanning Sequoia, Proteus, Sparrow and Vulcan") |
| Sequoia "stated to store inventory 75 percent faster and process orders 25 percent faster" | amazon-sequoia-digit-2023: "identify and store inventory we receive at our fulfillment centers up to 75% faster"; "reduces the time it takes to process an order... by up to 25%" | C (both are ceilings in the source; the article now says "up to 75 percent faster" and "up to 25 percent faster") |
| Vulcan picks and stows about 75 percent of stored item types at employee-comparable speed | amazon-vulcan-2026 (fetched live: "the ability to pick and stow approximately 75% of all various types of items we store at our fulfillment centers, and at speeds comparable to that our front-line employees") | V |
| Symbotic FY2025: \$22.5 billion backlog against \$2.247 billion of annual revenue | symbotic-10k-2025 (SEC EDGAR HTML, fetched with a declared UA: "approximately \$22.5 billion of backlog as of September 27, 2025"; income statement "Total revenue 2,246,922" thousand) | V |
| Walmart agreement covers all 42 of that retailer's regional distribution centres | symbotic-10k-2025 ("the implementation of additional systems across all of Walmart's 42 regional distribution centers") | V |
| "Dozens of operational systems each taking quarters to years from order to running" | symbotic-10k-2025 states the counts (50 Systems in Deployment in FY2025 vs 44 in FY2024; 48 Operational Systems under software maintenance contracts vs 25) but states no order-to-running duration anywhere; grep for deployment-duration language returns only the securities-suit paragraph about "deployment times" | C (replaced with the filing's own numbers: "50 systems in deployment against 48 already operational, and only about 12 percent of that backlog expected to convert to revenue in fiscal 2026" — the 12% is the filing's "approximately 12% is expected to be recognized as revenue in fiscal year 2026") |
| Kroger closed three of the eight automated sheds it built with Ocado | kroger-ocado-closures-2025 (This is Money 2025-11-18, read via the Wayback capture of the same day; site 403s live): "closing three of its robotic warehouses... Wisconsin, Maryland and Florida"; "It also said it was 'monitoring' its remaining five warehouses" (3 + 5 = 8) | V |
| Kroger "wrote off about \$2.6 billion" | kroger-ocado-closures-2025 contains no write-off, impairment or \$2.6bn figure; the only money figures are Ocado's ~£38m cost of the closures, the ~£190m compensation, and the share move | Cut (claim removed; no reachable primary source in this article's registry states it) |
| Kroger pays Ocado compensation for the closures | kroger-ocado-closures-2025 ("Ocado said it would receive compensation of around £190million for closing the sites") | V (figure added; the article now names the £190 million and the five sheds still being monitored) |
| Ocado's automation business, "rebranded Ocado Intelligent Automation", sells the same grid-robot warehouses outward from grocery | ocado-oia-2026 (fetched live) names OSRS/OMRS/OCADEX, the storage grid and Hummingbird robot, and the target industries "Healthcare & Pharmaceutical, Fashion & Apparel, Third-Party Logistics (3PL), Consumer Packaged Goods (CPG), Industrial & OEM Parts, B2B Distribution"; it never describes a rebrand | C (now "Ocado's own automation division, Ocado Intelligent Automation... outward from grocery into healthcare, fashion, third-party logistics and industrial parts") |
| Complete palletising cells cost two to three times the arm's price; the robot body is a third to half of total cell cost | evst-cell-cost-2026 ("a quoted system comes in two to three times higher"; "the robot body typically accounts for roughly a third to half of total system cost") | V |
| Under the robot safety standard's cell-level requirements the risk assessment belongs to the systems integrator, not the robot manufacturer | evst-cell-cost-2026 ("Under ISO 10218-2:2025, cell-level risk assessment and safeguarding are the system integrator's responsibility, not the robot manufacturer's") | V |
| Cell cost components: end-of-arm tooling, fixtures and conveyance, perimeter guarding and safety scanners, vision, PLC and HMI integration, commissioning labour | evst-cell-cost-2026 (the five capex line items: robot body; EOAT/gripper; safety fencing and scanners — "perimeter fencing, light curtains or area scanners, interlocked gates, and safety-rated PLCs"; integration and commissioning — "PLC and HMI integration with upstream conveyors"; programming and software — "any vision-guided pick logic") | V |
| Payback "typically one to two years for multi-shift cells, with paybacks past that horizon rejected as bad fits rather than bad robots" | evst-cell-cost-2026 states "12–24 months in multi-shift operations" and "24–36 months" for single-shift/lower-throughput; it says nothing about buyers rejecting long paybacks | C (figures made exact — "12 to 24 months for multi-shift cells and 24 to 36 for single-shift ones" — and the citation moved to sit before the editorial clause it does not support) |
| Bessemer "arguing deployment cost, not model quality, is the binding constraint on the category" | bessemer-robotics-2026 (fetched live) argues the opposite emphasis in places (Prediction 2: "Data is expensive, capital is the moat"). Its supportable adjacent claims are "Deployment requires domain-specific data collection, fine-tuning for the target environment, hardware integration, and operational infrastructure to manage robots in the field" and Prediction 4: "Near-term value will accrue to full-stack, vertically integrated players, not pure-play foundation model companies" | C (rewritten to those two statements) |
| Takt time, from Ohno's Toyota Production System, is available time divided by required units | ohno-tps-1988 (English translation full text located and read): "Cycle time is computed by dividing operating hours by the quantity required per day"; and "eliminating waste from the tact time which is calculated from the required number". Terminology note, not a wiki error: Ohno's English text calls this quantity "cycle time" and uses "tact time" once; the article's separate, uncited definition of cycle time is the modern per-repetition sense | V |
| Cycle time, uptime/availability, MTBF over MTBF plus MTTR, cost per pick definitions | Int: definitional prose, uncited, each backed by a glossary entry in data/glossary.ts; no numeric claim attached | V |
| 99% success with ten-second clearing costs a tenth of a second per pick | Int: 0.01 x 10 s = 0.1 s per pick, matching jamOverheadPerPick in lib/deployment-economics.ts | V |
| "Ken Goldberg's data-gap analysis argues that deployed robotics engineers around failure instead of eliminating it" | goldberg-data-gap-2025. science.org is 403; the abstract was read verbatim from Crossref and PubMed (PMID 40864731): "Well-established model-based methods or good old-fashioned engineering can bootstrap learning-based robot systems." Nothing reachable supports the engineering-around-failure paraphrase | C (rewritten to the stated thesis: model-based methods bootstrapping the learning-based system rather than data alone, across the 100,000-year gap of the title) |
| Morgan Stanley's 2026 "PR problem" note is the same observation about the hype cycle from the capital side | morgan-stanley-pr-problem-2026 (CNBC, fetched live: "investors have become harder to impress with polished videos and one-off demonstrations alone and are increasingly looking for tangible evidence of real-world return on investment"; "The industry's social license to deploy may matter just as much as technical performance") | V |
| Figure's eight-hour autonomous sorting shift "was one task at one site with no published intervention count" | figure-8hr-shift-2026 (fetched live): a May 13 2026 eight-hour livestream of small-package sorting, "fully autonomous running Helix-02", speeds the company says match human performance. The source does carry a zero-intervention claim (Figure's own), and publishes no success rate | C (now "one task at one site, on the company's own livestream, with no published success rate", which is what the source withholds; consistent with the deployment-dashboard row in lib/deployment-reality.ts: "no independent audit of the success rate") |
| "The seven-row deployment dashboard at The Reliability Gap" | Int: lib/deployment-reality.ts DEPLOYMENT_ROWS holds six rows (agility-digit, figure-bmw, unitree-2025, tesla-optimus, optimus-50k-claim, figure-8hr-shift) | C (now "six-row"; a stale comment in tests/e2e/industrial-deployment.spec.ts still says seven, and tests are out of my edit scope) |
| OSHA describes perimeter fencing, interlocked gates and reduced-speed teach modes | osha-otm-robots (fetched live): "guards (fences, barriers), interlocked guards, and presence-sensing devices (e.g., light curtains, safety mats, safety scanners...)"; "the robot system operates at a reduced speed... not greater than 10 inches/second (250mm/second)" | V |
| OSHA cited for "guarding and interlocks around aisles, lockout procedures, and phased go-lives that run manual and automated flows in parallel" | osha-otm-robots covers guarding, interlocks and lockout/tagout SOPs, but says nothing about phased go-lives; that claim belongs to symbotic-10k-2025 | C (citation moved to close after the lockout clause, leaving the phased go-live observation to the Symbotic sentence that follows and sources it) |
| Symbotic's systems install in phases inside operating warehouses | symbotic-10k-2025 ("They are so space-efficient that they can be installed in phases in operating warehouses with minimal impact to operations"; "install our systems in phases, allowing the existing warehouse to continue to operate") | V |
| Acemoglu and Restrepo: one more robot per thousand workers cuts the employment-to-population ratio by about 0.2 points and wages by 0.42 percent, losses concentrated in exposed commuting zones | acemoglu-restrepo-2020. journals.uchicago.edu is 403; the published JPE abstract was read verbatim on RePEc: "We estimate robust negative effects of robots on employment and wages across commuting zones... One more robot per thousand workers reduces the employment-to-population ratio by 0.2 percentage points and wages by 0.42%" | V |
| Registry fidelity (P1) for acemoglu-restrepo-2020: title, authors, year, venue | Crossref 10.1086/705716: "Robots and Jobs: Evidence from US Labor Markets", Acemoglu and Restrepo, Journal of Political Economy, published 2020-06; registry says JPE 128(6), 2188-2244, 2020 | V |
| MIT Task Force concluded a robot-driven jobs apocalypse is not imminent; technology displaces tasks; outcome depends on policy and institutions | mit-work-future-2020 (final report PDF read via the Wayback capture; the registry's ipc.mit.edu landing page no longer carries the report text): "No compelling historical or contemporary evidence suggests that technological advances are driving us toward a jobless future"; "Technological change is simultaneously replacing existing work and creating new work. It is not eliminating work altogether"; "even as technological advances displace human labor from some tasks"; "These technologies, in concert with economic incentives, policy choices, and institutional..." | V |
| The Task Force was "co-chaired by David Autor, David Mindell and Elisabeth Reynolds" | mit-work-future-2020 title pages: "DAVID AUTOR, TASK FORCE CO-CHAIR", "DAVID MINDELL, TASK FORCE CO-CHAIR", "ELISABETH REYNOLDS, TASK FORCE EXECUTIVE DIRECTOR"; body: "co-chairs Professor David Autor and David Mindell and executive director Dr. Elisabeth Reynolds" | C (now "co-chaired by David Autor and David Mindell with Elisabeth Reynolds as executive director") |
| Registry fidelity (P1) for goldberg-data-gap-2025: title, author, year, venue | Crossref 10.1126/scirobotics.aea7390 and PubMed 40864731: title verbatim, K. Goldberg, Science Robotics 10(105), 2025-08-27 | V |
| Scale-mismatch clause ("the humanoid fleet... is, so far, a rounding error against it") cited to unitree-profit-2026 | unitree-profit-2026 (TechTimes, fetched live) makes no comparison with the industrial installed base; what it does state is "revenue growth decelerated from 332% to 68%, while profit effectively halved" and "adjusted net profit fell to 40.25 million yuan... a year-on-year decline of 52.55%" | C (the citation now carries the source's own figures; the rounding-error comparison rests on the IFR and Unitree numbers cited earlier in the article) |
| Every `<Term>` id used resolves in the glossary | Int: takt-time, cycle-time, mean-time-between-failures, systems-integrator, brownfield-deployment, automated-storage-and-retrieval, autonomous-mobile-robot, goods-to-person, payback-period, intervention-rate all present in data/glossary.ts; `npm run validate:content` passes (47 modules, 412 citations, 119 terms) | V |
| P4 absence semantics: no absent value is rendered as a guessed, rounded or inferred stand-in | Int: the article carries no `not disclosed` or `n/a` field renders; every figure in prose and in the four Stat cards is a published number from a cited source, and the calculator's unpublished inputs are labelled assumptions under their own sliders rather than presented as measurements | V |
| Registry defect: amazon-robot-fleet-2026 title | The live page's title is "Amazon robotics: Meet the robots inside fulfillment centers" (H1: "Amazon uses robots that sort, lift, and carry packages—see them in action"); the registry says "Amazon robotics fleet passes one million robots" | Unresolved (registry is out of my edit scope; recorded below) |
| Registry defect: a3-orders-2025 URL and title slug | Robotics 24/7's Feb 2026 write-up links the A3 release at `.../robot-orders-grow-6-6-in-2025-as-general-industries-drive-broader-automation-adoption`; the registry URL and title both omit "broader". automate.org is Cloudflare-blocked from this environment, so I could not confirm whether the registry URL still resolves | Unresolved (recorded below; the underlying figure was corrected from the verbatim reproduction) |
| Registry defect: mit-work-future-2020 comment names three co-chairs | The report names two co-chairs and one executive director (evidence above); the registry comment repeats the article's former error | Unresolved (registry is out of my edit scope; recorded below) |
| Component defect: deployment-economics.tsx robotCost note attributes a "\$25k-\$80k" arm price range to EVST | evst-cell-cost-2026 publishes no arm-only prices ("EVST does not publish fixed list prices") and no such range; its bands are complete-cell budgets | Unresolved (component files are out of my edit scope; recorded below) |

### data/hardware.ts, data/teleop-rigs.ts, data/datasets.ts, lib/data-scaling.ts

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Trossen rows: price 4545/11385/23995/33695, priceNotes "Listed at \$X,XXX.XX", as of Aug 2026 | trossenrobotics.com/ai + /widowx-ai (live) | C (from the phantom sale prices; WidowX AI dof 6 + spec note added with the product-page source) |
| Sensor rows: GelSight Mini 500 / DIGIT 350 with T-RO outlook as source | tactile-outlook-2025 (retail prices verbatim) | C (previously null) |
| GPU rows: prices null, highlights carry bandwidth + π0 Hz | vla-perf-2026 (no prices in paper; bandwidths and Hz verified above) | C (prices removed; unit tests updated in the same change) |
| AgiBot World row: episodes 1,001,552 (+1,003,672 post-release note), hours 2,976.4, tasks 217, embodiment AgiBot G1, CC BY-NC-SA 4.0 | arXiv 2503.06669 v4 + GitHub README ("1,003,672 trajectories (~43.8T)"; "All the data and code within this repo are under CC BY-NC-SA 4.0") | C (from 1,003,672 / hours null / G2) |
| DROID row: license CC BY 4.0 | arXiv 2403.12945 Sec. 7 ("the full dataset under CC-BY 4.0 license") | C (from CC BY-NC 4.0) |
| AgiBot World 2026 row: all counts null, 13.7 TB | HF storage API (usedStorage 13,660,095,542,888 bytes = 13.66 TB, read 2026-08-17; card publishes size_categories 1K<n<10K and no episode/hour/task counts) | C (13.2 TB was the earlier reading; refreshed) |
| Chart anchors: DROID 350 / EgoDex 829 / TRI ~1,700 / AgiBot 2,976 / Ego4D 3,670 / OXE ~10,000 est. / EgoScale 20,854 | arXiv 2403.12945, 2505.11709, 2507.05331, 2503.06669, 2110.07058, 2310.08864, 2602.16710 | V (AgiBot anchor corrected from ~100k est. to the published 2,976 h; tests updated) |
| GO-1 needs ~7 GB VRAM inference / ~70 GB fine-tune | NOT FOUND in arXiv 2503.06669, the GitHub README, the GO-1/GO-1-Air HF model cards, the OpenGO1 blog, the live agibot-world.com (JS app; bundle grepped), or the Wayback capture | Cut (research/03 attributes the figures to agibot-world.com, but no reachable primary source states them; sentence removed from datasets.mdx) |



## Consolidation pass addendum (2026-08-18, audit-ledger-consolidation)

The six closure items from the interrupted data-hardware handoff were
resolved by the consolidation pass:

1. **Counting convention.** The header above now states its unit (distinct
   defects vs corrected rows) and reconciles: 21 defects across 25 `C`
   rows, with the four multi-row defects named. The convention is stated
   once for every ledger in audit/README.md.

2. **data/citations.ts coverage.** The scope line above now names
   `data/citations.ts`. Every registry entry cited by these five articles
   passed `npm run check:citations` (306 checked, 0 mismatches, 0 dead,
   run 2026-08-18 after this pass's registry edits), and the domain's
   citation-registry comments were included in the repo-wide
   date-plausibility sweep (no date-impossible attributions found).

3. **Re-verification of the 2026-08-09 pass.** Every row resting solely on
   "verified 2026-08-09" was re-fetched on 2026-08-18:
   - Koch / ALOHA 2 / Reachy 2 pricing: lerobot-pricing-2026 (github.com/
     alpibrusl/lex-robot/issues/3, live) still lists Koch v1.1 ~$250-300,
     ALOHA 2 ~$17k-32k, Reachy 2 ~$70,000 (fetched verbatim). Koch dofNote
     corrected against the ROBOTIS kit BOM (4x XL330-M288 + 2x XL430-W250
     per arm = 6 servos, gripper included; robotis.us kit page, BOM table).
   - Reachy 2: dof 14 (7 per arm) and pollen-robotics.com/reachy-2/ added
     from the vendor page ("With 7 degrees of freedom, Reachy 2's arms...");
     the row's url previously pointed at the generic LeRobot docs.
   - LIBERO: arXiv 2306.03310 abstract re-fetched ("four task suites
     (130 tasks in total)"; procedural generation pipeline confirmed).
   - SIMPLER: simpler-env.github.io re-fetched ("across ~1500 evaluation
     episodes (from each of real and sim)", verbatim).
   - RoboMIND: arXiv 2412.13877 abstract re-fetched ("107k demonstration
     trajectories across 479 diverse tasks involving 96 object classes").
   - Figure 03: figure.ai/news/introducing-figure-03 re-fetched; palm
     cameras, wireless charging incl. "2 kW", foot coils, fleet production
     all present in the live page text.
   All seven re-fetches confirmed the recorded values. The GO-1 VRAM cut
   stands; no other row traced to research/03's fabricated figures.

4. **GELLO site.** wuphilipp.github.io/gello/ answered HTTP 200 again on
   2026-08-18 (GitHub Pages, text/html). The registry and teleop-rigs
   entries cite the paper (Table I sub-$300 BOM) as primary, which is
   unaffected either way; the "site dead" note in this ledger's
   notes-for-future-audits section is now historical.

5. **robozaps-humanoids-2026 totes figure.** Repo-wide grep confirms no
   article, dataset row, or lib file repeats "100,000 totes"; it exists
   only in this ledger and in the source blog itself. The registry entry's
   comment now carries an explicit editorial caution naming the excluded
   claim ("Digit moves more than 100,000 totes... no Agility primary
   source substantiates") so the loaded gun is labelled, not just latent.

6. **evaluation-crisis.spec.ts specificity regression.** Recorded, not
   fixed: the /Clopper-Pearson/i anchor was correctly replaced by /violin/i
   (TRI reports Bayesian posteriors as violin plots and never used
   Clopper-Pearson; a /confidence interval/i assertion was retained
   alongside). Trade-off noted: the strand's most distinctive anchor
   became a common word, so the spec now catches less if the paragraph is
   accidentally rewritten.

research/03 sweep: the consolidation pass grepped every published article
and lib data file for research/03's eight documented fabrications
(GO-1 VRAM, Trossen sale prices, AgiBot hours/G2/~43.8TB, DROID NC
license, UMI stroke/time figures, GELLO assembly time, TRI
Clopper-Pearson/4,200 rollouts, VLA-Perf card prices); none survive
outside research/ itself (read-only) and this ledger's history.
