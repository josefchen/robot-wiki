# Data, hardware & evaluation content-integrity audit

Date of audit: 2026-08-17. Scope: the five published `data-hardware`
articles (data-bottleneck, datasets, hardware-taxonomy, teleop-rigs,
evaluation-crisis) plus the structured datasets behind them
(`data/hardware.ts`, `data/datasets.ts`, `data/teleop-rigs.ts`,
`lib/data-scaling.ts`), checked against their cited primary sources,
fetched and read during this audit. Claims VAL-AUDIT-004.

Status: IN PROGRESS. Rows below are appended as each claim is verified;
the first unfinished row is the next one to do. A previous session applied
the banked corrections in the working tree but left no ledger; this
session re-fetches every corrected claim's primary source before vouching
for it, then continues the first-pass inventory.

Method: every checkable claim (numbers, dates, prices, specs, licenses,
attributions, quoted or quoted-sounding phrases) is checked against the
source the article cites for it, by fetching that source. Structured-data
fields are audited per field against the entry's own `sources`.
Dataset-size figures are traced with their unit (episodes vs trajectories
vs hours) to the paper or dataset card that states them. Vendor pages are
re-fetched live for prices and availability. Hardware specs no vendor
states are `null` ("not disclosed"), never estimated.

## Summary

(filled in when the audit completes; running tallies are visible in the
per-claim ledger below)

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

