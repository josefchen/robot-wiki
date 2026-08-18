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
