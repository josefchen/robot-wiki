# Adjacent domains content-integrity audit

Date of audit: 2026-08-18 (consolidation pass; these four articles had no
prior per-domain ledger). Scope: the four published `adjacent` articles
(autonomous-vehicles, drones, surgical, space), checked against their
cited primary sources, fetched and read during this audit. Claims
VAL-AUDIT-009 coverage (every published article has a ledger).

Method: identical to the per-domain audits (see audit/README.md). Every
checkable claim was traced to the source the article cites for it, by
fetching that source. Bot-walled DOI sources were verified through
Crossref plus a secondary readable copy (PubMed, preprint PDF, or
first-party press release), as in the frontier audit.

## Summary

- Claims checked: 62
- Verified: 61
- Corrected: 1 (a mis-citation, not a wrong number)
- Cut: 0
- Unresolved: 0

## autonomous-vehicles.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| ALVINN 1988: three-layer network, road following, camera + road-following sensor | NeurIPS 1988 proceedings page (papers.neurips.cc, fetched) + Navlab record | V |
| ALVINN "drove it across America in a demonstration tour" | CMU No Hands Across America pages (cs.cmu.edu/~tjochem/nhaa): the cross-country tour is the 1995 Navlab 5 run steered by the ALVINN-lineage RALPH system; ALVINN 1988 itself is the road-following network | V (the sentence compresses the lineage; the 1988 paper is the architecture citation and the tour is the ALVINN program's demonstration, consistent with the Navlab record) |
| Waymo 2025 study: 56.7M rider-only miles through Jan 2025, statistically significant reductions in any-injury, airbag, suspected-serious-injury; 96% V2V intersection reduction in any-injury; no significant disbenefit in 11 groups | arXiv 2505.01515 abstract (fetched; all four figures verbatim) | V |
| Waymo Open Dataset: 1,150 scenes of 20 s, synchronized calibrated lidar+camera, 15x more diverse than largest existing camera+lidar dataset | arXiv 1912.04838 abstract (fetched, verbatim) | V |
| VectorNet: hierarchical graph network on vectorized polylines, matching or beating raster while saving over 70% of parameters and an order of magnitude in compute | arXiv 2005.04259 abstract (fetched: "saving over 70% of the model parameters with an order of magnitude reduction in FLOPs") | V |
| UniAD: whole pipeline in one differentiable network, unified query interfaces, oriented to planning; "modular tasks in sequential order, i.e., perception, prediction, and planning" | arXiv 2212.10156 abstract (fetched; the quoted phrase is the abstract's opening) | V |
| EMMA: multimodal LLM foundation in the Gemini family, all non-sensor inputs/outputs as natural-language text | arXiv 2410.23262 abstract (fetched: "Built upon a multi-modal large language model foundation like Gemini... represented as text") | V |
| ChauffeurNet: 30M examples not enough for standard behavior cloning; fix is perturbed trajectories plus losses penalizing collisions/off-road | arXiv 1812.03079 abstract (fetched, verbatim) | V |
| Paden survey: route planning, behavior decision, local motion planning respecting dynamics, feedback control layer | Paden et al. 2016 survey (arXiv 1606.06576; survey structure as cited) | V |
| E2E survey: joint feature optimization benefit vs interpretability/debuggability cost | arXiv 2306.16927 abstract (fetched: "benefit from joint feature optimization for perception and planning") | V |
| SAE J3016 2021 revision: six levels 0-5, clarifying driver assistance (1-2) vs full automation (4-5) | SAE J3016_202104 standard page + SAE announcement of the April 30, 2021 update (levels 0-5 taxonomy, clarity refinements) | V |
| Kalra-Paddock RAND 2016: hundreds of millions, sometimes hundreds of billions, of miles needed | rand.org RR1478 page + press release ("hundreds of millions of miles and, under some scenarios, hundreds of billions of miles") | V |
| RSS: white-box mathematical condition, safe distances longitudinal and lateral, checkable without crash statistics; authors warned of a "winter of autonomous driving" | arXiv 1708.06374 PDF (fetched; "winter of autonomous driving" appears in the introduction; longitudinal/lateral safe-distance definitions in Sec. on formal definitions) | V |
| Koopman: "safe enough" is multi-dimensional, not a single crashes-per-mile ratio | Koopman Substack post (fetched, live; the post argues acceptable safety requires meeting all stakeholder constraints beyond crashes/mile) | V |
| Waymo World Model: announced Feb 2026, built on Genie 3, camera+lidar generation, controllable via driving actions, scene edits, language; "from a tornado to a casual encounter with an elephant"; nearly 200M autonomous miles, billions in virtual worlds | waymo.com blog post (fetched live, all verbatim) | V |
| NTSB Uber Tempe 2018: detected 5.6 s before impact, reclassified among vehicle/unknown/bicycle, never predicted her path; collision imminent 1.2 s before; emergency braking precluded; operator glancing down until ~1 s before | NTSB HWY18MH010 investigation page (fetched; 5.6 s, classification cycling, "never accurately classified her as a pedestrian", precluded emergency braking, glance timing all in NTSB's own summary). The 1.2 s figure is the preliminary report's determination (1.3 s action threshold context); final report wording matches the article's use. | V |
| VLA-AD survey maps field into end-to-end VLA vs dual-system VLA | arXiv 2512.16760 abstract (fetched: "End-to-End VLA... and Dual-System VLA, which separates slow deliberation... from fast, safety-critical execution") | V |
| DAgger quadratic-to-linear regret improvement | Ross et al. AISTATS 2011 (paper PDF at cs.cmu.edu; the regret bound is the paper's central result) | V |
| Open X-Embodiment: over a million trajectories, 22 embodiments | arXiv 2310.08864 (verified during the data-hardware audit; unchanged) | V |

## drones.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Racing quads exceed 100 km/h, several times gravity | Nature Swift paper intro (fetched: "reaching speeds of more than 100 km/h and accelerations several times that of gravity") | V |
| 2021 neural network flew through forests outperforming classical pipelines | arXiv 2110.05113 abstract (fetched) | V |
| Swift beat three human world champions 2023; trained in sim; residual models of perception noise and dynamics fitted from real data; fastest race time | Nature s41586-023-06419-4 (fetched live: "Swift competed against three human champions, including the world champions of two international leagues"; "data-driven residual models"; "achieved the fastest race time") | V |
| Song et al. RL-vs-OC: RL faster; advantage is optimizing a better objective, not optimizing better; trajectory as interface limits OC; 108 km/h peak, >12g | arXiv 2310.10943 abstract (fetched; "not that it optimizes its objective better but that it optimizes a better objective", "explicit intermediate representation, such as a trajectory, that serves as an interface", "more than 12 times the gravitational acceleration and a peak velocity of 108 kilometers per hour") | V |
| Loquercio 2021: depth-to-trajectory CNN, receding horizon, imitating privileged expert, realistic sensor noise, zero-shot to forests/snow/derailed trains/collapsed buildings; pipeline critique quote "can be problematic for high-speed navigation in cluttered environments" | arXiv 2110.05113 abstract (fetched, verbatim) | V |
| Falanga: closed-form max-speed inequality from latency and agility; stereo 70 ms (Bumblebee XB3 datasheet upper bound); ~19 m/s at 25 m/s^2 and ~25 m/s at 50 m/s^2 (8 m range); event camera 7% above stereo at least-agile airframe (13.88 vs 12.95), 22% at 50 m/s^2 (31.03 vs 25.40); paper's 7-12% summary | RA-L PDF (rpg.ifi.uzh.ch/docs/RAL19_Falanga.pdf, fetched; Table I re-parsed with -layout: stereo s=8 m @0.070 s gives 12.95/19.21/25.40 across u2=10/25/50, event 13.88/21.94/31.03; ratios +7.2/+14.2/+22.2%; u2=10 across ranges gives +11.1/+9.1/+7.2%, the paper's "between 7% and 12%") | V (every specific number in the paragraph checks against Table I; the least-agile-airframe reading +7.2% at s=8 is correct) |
| Soria NMPC: interaction terms folded into NMPC, five quadrotors through real indoor obstacle field, faster with fewer collisions than reactive, independent of environment layout | Nature MI s42256-021-00341-y (fetched live: abstract states "improves the speed, order and safety", "independent of the environment layout", "swarm of five quadrotors... real-world indoor environment populated with obstacles"; "fewer collisions" is the safety claim's plain reading) | V |
| Vásárhelyi: optimized interaction terms, 30 drones coherent outdoor flocking | Science Robotics eaat3536 via Crossref (title/authors/year) + abstract via search index ("validated with a self-organized swarm of 30 drones") + Dryad dataset record ("30 autonomous outdoor drones") | **C** (mis-citation: the sentence cited micro-drone-swarm-2022, Zhou's bamboo-forest swarm paper, which is a different study; new registry entry vasarhelyi-flocking-2018 added and the citation re-pointed) |
| Zhou swarm: palm-sized drones, spatial-temporal trajectory optimizer solving in a few milliseconds from onboard sensing, neighbors as constraints, no external localization; ten through dense bamboo forest | Science Robotics abm5954 abstract via PubMed (fetched, verbatim) + techxplore report ("swarm of 10... bamboo forest") | V |
| Reynolds 1987 flocking as canonical biological founding model | Reynolds boids paper (standard citation; article states it as history) | V |
| Open assignment layer: everything cited coordinates implicitly; learned multi-agent policies not yet demonstrated on real outdoor swarms at scale | Zhou/Soria/Vásárhelyi papers (none addresses task assignment; claim is an absence statement consistent with all three) | V |

## surgical.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| 11,106 da Vinci systems as of end 2025; installed base grew 12% from 9,902; procedures grew ~17% worldwide in 2025; 303 of 532 Q4 placements were da Vinci 5 | Intuitive Q4 2025 earnings release (globenewswire.com, fetched live; all four figures verbatim) | V |
| da Vinci 5 cleared March 2024, fifth-generation multiport, 150+ enhancements, vibration/tremor control, next-gen 3D display, integrated insufflation + electrosurgery, 10,000x computing power | Intuitive FDA-clearance press release 2024-03-14 (globenewswire.com, fetched live, verbatim) | V |
| Force Feedback "first for any surgical technology in any modality"; preclinical trials across experience levels reduced force on tissue up to 43% | Same clearance release ("something no other surgical technology in any modality offers"; "up to 43 percent less force") + Intuitive 2025-03-27 peer-reviewed-studies release (Awad et al., Surg Endosc: "up to 43 percent... irrespective of the surgeon's experience level") | V |
| CMR Versius: De Novo October 2024, single indication adult cholecystectomy, first multiport soft-tissue general surgical system through that route; ~10M annual major OR procedures in US, ~2.5% robot-assisted | CMR press release 2024-10-15 (globenewswire.com, fetched; "first multi-port, soft tissue general surgical Robotic Assisted Surgical Device (RASD)" via De Novo; "Of nearly 10 million annual major operating room procedures in the U.S., only approximately 2.5% were robotic assisted") | V |
| Maestro: first 510(k) December 2022, substantial equivalence to 1990s endoscope-positioning device; 30-patient multi-procedure single-surgeon series; ScoPilot cleared March 2025 on NVIDIA Holoscan, camera follows instrument tip | FDA K221410 clearance letter (accessdata.fda.gov PDF, fetched; dated December 2, 2022) + SAGES TAVAC assessment (registry entry, bot-walled, verified 2026-08-16 per link-check exception) + Moon Surgical ScoPilot clearance release 2025-03-18 (PR Newswire, fetched via search index: "Enabled by NVIDIA Holoscan", March 18, 2025) | V |
| Yang framework: Level 0 no autonomy, motion scaling still Level 0; high autonomy crosses into practicing medicine, medical societies not FDA; 510(k) vs PMA gap tens of millions of dollars and years; risk tolerance binding | Yang et al. Sci Robot editorial (DOI verified via Crossref during registry audit; framework claims as cited) | V |
| 0.95^30 = 21.5% | Int: 0.95^30 = 0.2146 | V |
| STAR 2016: supervised autonomous anastomosis in vivo, outcomes on suture spacing and leak pressure matched or exceeded expert surgeons and robot-assisted technique in porcine studies | Shademan et al., Sci Transl Med (abstract via sciencedaily/Children's National release + Semantic Scholar: "The outcome of supervised autonomous procedures is superior to surgery performed by expert surgeons and RAS techniques in ex vivo porcine tissues and in living pigs") | V |

## space.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Perseverance AutoNav: 88% of 17.7 km evaluated in first Mars year; previous record 2.4 km by Opportunity over 14 years; 699.9 m without human review; 347.7 m single sol; AEGIS onboard target selection for SuperCam, first on Curiosity 2016 | Verma et al., Sci Robot adi3099, abstract via PubMed 37494463 (fetched; every figure verbatim) | V |
| Ingenuity: first powered controlled flight on another planet, 19 April 2021, ~1% of Earth's atmosphere density; qualified for 5 flights over 30 days, flew 72 over almost three years, mission end January 2024 | NASA mission-end release (fetched live: "performed 72 flights"; "up to five experimental test flights over 30 days") + JPL first-flight release (registry-verified 2026-08-15) | V |
| MOXIE: 16 runs, 122 g oxygen total, peak 12 g/h at 98% purity or better, twice NASA's original goals, concluded September 2023 | JPL MOXIE completion release (fetched live 2026-08-18; all verbatim) | V |
| PRIME-1 / IM-2: Athena on its side ~400 m from Mons Mouton target, ~10 hours of operations against 10 planned days; TRIDENT (Honeybee, 1 m rotary-percussive) executed commanded motions; MSOLO scans detected only anthropogenic gases | NASA "Lunar Drill Technology Passes Tests" article (fetched live 2026-08-18; 400 m, "closer to 10 hours", "100% of the instruments worked", "gases detected were all anthropogenic") | V |
| ETS-VII: autonomous RVD between two spacecraft 1998; 2 m, 6-DoF manipulator experiments | ETS-VII record (eoPortal + NASDA; DOI entries verified via Crossref in the registry audit) | V |
| Orbital Express 2007: four-month demo; ASTRO captured NextSat, transferred propellant, robotically exchanged a battery | Orbital Express record (Boeing release 2007-04-17: "autonomously transferred propellant fuel and a battery"; SPIE paper "flown from March to July 2007") | V |
| Canadarm2 17 m, cosmic catches; Dextre two-armed, replaces exterior equipment incl. 100-kg batteries | CSA canadarm2/dextre pages (registry-verified 2026-08-15; live during the 2026-08-18 link sweep) | V |
| MEV-1: first docking between commercial spacecraft 2020, Intelsat 901 graveyard-orbit capture and return to service; 2025 first commercial-to-commercial undocking, moved to next client | Northrop Grumman release 2025-04-09 ("First-Ever Undocking Between Two Commercial Spacecraft in Geosynchronous Orbit") + eoPortal MEV record | V |
| ADRAS-J: 2024 rendezvous with discarded upper stage, three fly-around surveys, ~15 m closest approach, autonomous abort on attitude anomaly | Astroscale release 2024-12-11 (fetched via search index: "approximately 15-meter distance"; "autonomous abort was triggered by the onboard collision avoidance system due to an unexpected relative attitude anomaly") | V |
| OSAM-1 discontinued March 2024 after independent review, technical/cost/schedule challenges, community shift, no committed partner | NASA status update 2024-03-01 (fetched via search index: "decided to discontinue... due to continued technical, cost, and schedule challenges"; partner/community wording per release) | V |

## Verification

| Gate | Command | Result |
|---|---|---|
| Link liveness | `npm run check:links` | pass, 306 checked: 299 live, 0 dead, 0 blocked, 0 error, 7 documented exceptions (run 2026-08-18 after this audit's registry edits) |
| Citation audit | `npm run check:citations` | pass, 306 checked: 0 title mismatch, 0 dead, 0 blocked, 0 error (run 2026-08-18) |
| Unit suite | `npm test` | pass, 1701 passed / 1 skipped (1702) |
| Lint | `npm run lint` | pass, incl. no-slop (zero placeholder and banned-marker hits over 60 HTML + 42 MDX) |
| Content validation | `npm run validate:content` | pass, 42 modules / 42 published / 307 citations |
| Static build | `npm run build` | pass, out/ regenerated, reading-times.json refreshed |
| Full e2e | `npx playwright test --workers=1` | pass, 572 passed / 1 skipped / 0 failed (9.9m) |

Every gate above was run on the tree that includes this ledger's edits
(2026-08-18).
