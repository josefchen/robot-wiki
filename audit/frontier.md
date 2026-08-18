# Frontier content-integrity audit (VAL-AUDIT-006)

Per-claim ledger for the five `/frontier/*` articles: **reliability-gap**, **dexterity**, **generalization**, **competing-theses**, **bear-case**, plus the four data files those articles render (`lib/deployment-reality.ts`, `lib/dexterous-hands.ts`, `lib/competing-theses.ts`, `lib/bear-case.ts`) and the EgoScale law module (`lib/egoscale-law.ts`).

Audit date: 2026-08-18. Procedure: `content-auditor` skill, properties P1-P5 from `contract/content-audit.md`. Every row names the primary source actually fetched. Verdicts: **V** verified, **C** corrected, **X** cut, **S** source inconsistency recorded (not a wiki error).

Conventions: verdicts count **ledger rows**; the summary also states **distinct defects** where one defect produced more than one row (prose + data file + test, or article + stat box).

## Source-quirk register (read before re-auditing)

- **EgoScale display equation (recorded, deliberately not "fixed").** The paper's display equation reads `L = 0.024 − 0.003 ln D` with `D` described as hours, but the paper's own Figure 5 loss axis spans 0.014-0.024, which only a "D in thousands of hours" reading reproduces; the literal reading drives loss through zero near 3k hours. `lib/egoscale-law.ts` implements the figure-consistent reading and documents why. `generalization.mdx` states the law with "D in thousands of hours" and matches the module. This is a **source inconsistency with our resolution**, not a wiki error. Do not "correct" the article to the literal reading.

## reliability-gap.mdx

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| R1 | Stat box: 95%/99%/99.9% per-step over 30 steps = 21% / 74% / 97% | arithmetic (p^N) | V | 0.95^30=0.2146, 0.99^30=0.7397, 0.999^30=0.9704 |
| R2 | "still fails once in thirty runs" at 99.9%/30 steps | arithmetic | V | exact 1-in-33.8; plain-language rounding of 3%, acceptable |
| R3 | "about 99.98% per-step" for 99% end-to-end on 50 steps | arithmetic | V | 0.99^(1/50)=99.9799% |
| R4 | π*0.6/Recap: "cutting failure rates by 2x or more", ">90% success on espresso, laundry, and box-assembly", "2x throughput improvement" | pi.website/blog/pistar06 (fetched) | V | "more than doubles the throughput on some of the hardest tasks, and can decrease failure rates by 2x or more"; "π*0.6 can perform them with over a 90% success rate" (espresso/laundry/boxes context) |
| R5 | π0.7 "accepts step-by-step language coaching... recovering from failures" | pi.website/blog/pi07 (fetched) | V | coaching section; fine-tuned high-level policy runs task autonomously "without any additional teleoperation at all" |
| R6 | ">1,000h documented MTBF; no system publishes one" | negative claim (editorial) | V | the article's own solved-bar definition; flagged as framing, not a sourced fact; no contradicting deployment record found in technology.org sweep |

## dexterity.mdx

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| D1 | "By 1961 Heinrich Ernst had connected a computer-controlled arm and hand to MIT's TX-0 and had it stacking blocks" | rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity (fetched) | V | "By 1961 Heinrich Ernst had produced a PhD thesis describing a computer controlled arm and hand that he had connected to the TX-0 computer at MIT, and had it picking up blocks and stacking them" |
| D2 | Match-lighting: task takes seven seconds; anesthetized "four times as long"; "visible fumbling to get the match oriented between fingers" | Brooks essay (fetched) | V | "The task takes seven seconds"; "successfully lights it after taking four times as long"; "fumbles with the match trying to get it into the right orientation between her fingers" |
| D3 | "Her vision is intact, her proprioception is intact" (anesthetized video) | Brooks essay (fetched) | C | Source says fingertip touch is gone but "she can still sense many other things in the rest of her fingers and hand, and all the forces that she can ordinarily feel with her skeletal muscle system". It never states proprioception is intact (digital-nerve blocks also cut proprioceptive afferents). Weakened to the source's own description. |
| D4 | Tesla: "workers wear camera rigs of helmets and backpacks with five cameras, record mundane tasks like folding a t-shirt... according to an eWeek report Brooks quotes" | Brooks essay (fetched) | V | eWeek quote reproduced verbatim inside the essay; attribution chain stated correctly |
| D5 | Brooks: scaling counterargument (speech, image labeling, LLM) "states it fairly before rejecting it" | Brooks essay (fetched) | V | §2.2 inner-dialog framing matches |
| D6 | Brooks conclusion: "humanoid robots will need a sense of touch, and a level of touch sensing that no one has yet built in the lab" | Brooks essay (fetched) | V | verbatim: "It looks like humanoid robots will need a sense of touch, and a level of touch sensing that no one has yet built in the lab" |
| D7 | Brooks: practical humanoid dexterity "within decades" = "pure fantasy thinking" | Brooks essay (fetched) | V | "believing that this will happen any time within decades is pure fantasy thinking" |
| D8 | Holson pipeline limits: no wrist force feedback, open/close finger control, no touch, "roughly 1 to 3 cm of precision" | Brooks essay quoting Holson; generalrobots.substack.com (fetched) | V | Holson's own post carries all four verbatim ("No force feedback at the wrists", "Limited finger control", "No sense of touch", "Medium precision... about 1-3 cm precision"); Brooks quotes the same list |

## generalization.mdx

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| G1 | π0.5 evaluation: "three real homes, three kitchens and three bedrooms, with ten trials per task... each episode spanning minutes" | arXiv 2504.16054 PDF (fetched) | V | Fig. 7: "three kitchens and three bedrooms in real homes that were not seen during training"; tasks 'items in drawer', 'laundry basket', 'dishes in sink'; "averaged over 10 trials"; tasks "lasting about 2 to 5 minutes" (full cleanups 10-15 min) |
| G2 | "Only about 400 hours... mobile-manipulator data collected in real homes; 97.6% of the training examples come from somewhere else" | π0.5 PDF | V | "about 400 hours"; "The overwhelming majority of training examples provided to π0.5 (97.6% during the first training phase) do not come from mobile manipulators" |
| G3 | Control trained on test-home data "scores about the same as the 104-location model" | π0.5 PDF | V | "a control... trained directly on data from the test homes. This control attains similar performance as the final 104-location model" |
| G4 | "strip the non-action data and the open-world result disappears" | π0.5 PDF | V | baselines without co-training tasks "significantly worse"; other data sources "essential for good generalization" |
| G5 | π0.7 blog quote: "makes a reasonable attempt, performing part of the task after a few false starts, but not finishing it fully" | pi.website/blog/pi07 (fetched) | V | verbatim |
| G6 | Authors describe "early signs of compositional task generalization" | pi07 blog (fetched) | V | "π0.7 shows early signs of compositional task generalization" |
| G7 | UR5e laundry: π0.7 85.6% progress / 80% success; teleoperators 90.9% / 80.6%; "top 2% by experience with a mean of 375 hours" | pi.website/download/pi07.pdf (fetched, pdftotext) | V | all five figures verbatim from the human-subject study section |
| G8 | Bag-packing: teleoperators two-arm hold-open+insert; π0.7 "discovers a single-arm pick-and-place suited to its reach" | π0.7 PDF | V | "the shorter static bimanual robot must use one arm to hold the bag open while the other performs insertion, whereas the taller UR5e arm can accomplish the same task with a single-arm pick-and-place" |
| G9 | "the π0.7 paper's own ablations show performance degrading as the embodiment gap widens before the latest model recovers it" | π0.7 PDF | V | Fig. 12 narrative: π0.5 "degrades significantly" at larger gaps; π0.7 "significantly outperforms the prior models" |
| G10 | Completion-fit crossings: solved bar near 111k hours; "crosses 100% near 250k hours" | arithmetic over lib/egoscale-law.ts COMPLETION_POINTS | V | least-squares fit crosses 0.90 at 111k h, 1.0 at 250k h; chart labels both as extrapolation, which the article states |
| G11 | EgoScale law `L = 0.024 - 0.003 ln D` (D in thousands of hours), five scales 1k-20k, R²=0.9983 | arXiv 2602.16710 (fetched; see S1) | S | see source-quirk register; figure-consistent reading reproduces Figure 5's 0.0150-0.0240 loss span, literal hours-reading crosses zero at 2,981 h |

## competing-theses.mdx

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| T1 | Sutton 2019 The Bitter Lesson: "general methods leveraging computation beat hand-built structure" | web.archive.org mirror of incompleteideas.net BitterLesson.html (fetched, 200) | V | "general methods that leverage computation are ultimately the most effective"; dated March 13, 2019 |
| T2 | "Brooks answered it the same week" | rodneybrooks.com/a-better-lesson (fetched) | C | A Better Lesson is dated March 19, 2019, six days after Sutton's March 13 post, and opens "Just last week Rich Sutton published". Corrected to "six days later". |
| T3 | "his rebuttal quotes the essay at length" | A Better Lesson (fetched) | C | The rebuttal contains no extended quotation of Sutton; it paraphrases ("In his post he argues...") and closes "This review... is seventy six words shorter than Sutton's post." Corrected to paraphrase + length fact. |
| T4 | 2019 Brooks: image-labeling win "rode on engineered front ends" (CNN) | A Better Lesson (fetched) | V | "the very essence of CNNs is that the front end of the network is designed by humans to manage translational invariance" |
| T5 | "...front ends, CNNs and MFCCs, that baked in the priors the network supposedly did not need" | A Better Lesson + Brooks dexterity essay (both fetched, grepped) | C | Neither essay uses "MFCC". The speech-front-end argument (Mel filter banks, telephone-circuit heritage) appears in the 2025 dexterity essay, which never abbreviates it. Reworded to the sources' own terms with both citations. Same gloss in lib/competing-theses.ts fixed. |
| T6 | π0.7 "generates its subgoal images with a lightweight world model initialized from BAGEL" | π0.7 PDF (fetched) | V | "subgoal images are produced by a lightweight world model based on the BAGEL image generation model"; "We initialize from BAGEL" |

## reliability-gap.mdx (continued)

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| R7 | ASIMOV-Agentic "refuses unsafe tool calls from the VLA, predicts whether a task is feasible, and requests human intervention when uncertain" | HF dataset card (fetched) + deepmind.google GR2 blog (fetched) | C | The dataset card carries only task names ("safety-critical... tasks with tool calls", "VLA feasibility", "uncertainty quantification and resolution"); the exact triple is stated by the GR2 blog ("measures the embodied reasoning agent's ability to refuse unsafe tool calls from a VLA... predict whether a task is possible and to proactively request human intervention when uncertain"). GR2 blog citation added. |
| R8 | "DeepMind describes Gemini Robotics 2 as its safest robotics model to date" | GR2 blog (fetched) | C | The blog's sentence names **Gemini Robotics ER 2**, not the GR2 family: "Gemini Robotics ER 2 is our safest robotics model to date in safety constraint following and human proximity benchmarks". Name corrected; "detect nearby humans and trigger safe stops" verified verbatim. |
| R9 | Deployment record: circulating "tens of thousands" Tesla / "above ten thousand" Figure; Tesla never published a count; Agility 65,000+ h across nine facilities (GXO, Schaeffler, Toyota Motor Manufacturing Canada, Mercado Libre); Figure BMW 1,250+ h eleven-month pilot | technology.org sweep (fetched) | V | every element stated, including the dashboard rows' BMW details (90,000+ parts, >99% placement accuracy per shift, 84-second cycle time, Nov 2025) and Unitree's 10,000-20,000 unit 2026 target |
| R10 | "Unitree shipped roughly 5,500 humanoid units in 2025 at a price near \$16,000" | technology.org (fetched) | C | the \$16,000 figure is the **G1's starting price** ("Its G1 humanoid starts around \$16,000"), not the price of the whole 2025 G1/H1/H2 shipment line. Rescoped to "with its G1 starting near \$16,000". |
| R11 | "Q1 2026 net profit fell 52% year over year" | techtimes.com Unitree earnings piece (fetched) | C | source states **adjusted** net profit fell to ¥40.25M from ¥84.84M, "a year-on-year decline of 52.55%". Corrected to "adjusted net profit fell 52.55%"; bear-case stat box updated to match. |
| R12 | Figure 8-hour shift (May 13, 2026 livestream, package sorting, no published success rate) | techtimes.com Figure piece (fetched) | V | "The May 13 demonstration... placed Figure AI robots on package-sorting conveyor belts for a continuous eight hours"; speeds are vendor-claimed |
| R13 | "Figure's private valuation of \$39B (September 2025) exceeds Goldman Sachs' projection for the entire humanoid market in 2035, \$38B" | technology.org (fetched) | V | "\$39 billion private valuation as of September 2025 – higher than Goldman's projection... nine years out"; "\$38 billion by 2035" |
| R14 | Lisa Yan, "co-founder and CEO of Argus Systems and previously at Waymo"; "a steep hill climb that takes longer than most people realize" | bvp.com Bessemer predicts (fetched) | V | quote verbatim; Bessemer credits "Lisa Yan (Founder, Argus Systems)" and the quote itself cites "My experience at Waymo" |
| R15 | Bessemer: 80%→99.9% "not a linear problem"; ChatGPT moment "not years away" | Bessemer (fetched) | V | "Getting from 80% task success to 99.9% is not a linear problem"; "We don't think that moment is years away. But it's not here yet." |

## dexterity.mdx (continued)

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| D9 | "about 17,000 low-threshold mechanoreceptors... roughly 1,000 of them at each fingertip" (cited to macefield-touch-2022) | Brooks essay (fetched, quoting the review) + Crossref for the DOI | V | Brooks: "In a review of Johansson's earlier work from 1979 it is reported that a human hand has about 17,000... with about 1,000 of them right at the tip of each finger", linking the Macefield review. Wiley bot-walls direct fetch; Crossref confirms registry title/author/year (Macefield, J Physiol 2022). |
| D10 | Holson pipeline limits: no wrist force feedback / open-close finger control / no touch / "roughly 1 to 3 cm of precision" | generalrobots.substack.com (fetched) | V | all four in Holson's own post, bolded headings "No force feedback at the wrists", "Limited finger control", "No sense of touch", "Medium precision... about 1-3 cm precision" |
| D11 | "the 2025 tactile robotics outlook identifies exactly this sensing and integration gap as the field's open problem" | arXiv 2508.11261 HTML (fetched) | C | the outlook examines "several challenges" and defines the field as "development and integration of tactile-sensing technologies into robotic systems"; it never ties itself to the article's stick-slip amplification argument. Reworded to the paper's own framing ("frames integrating touch sensing into working robotic systems as the field's defining challenge"). |
| D12 | Go-Big: 100% egocentric human video, no robot demonstrations, Brookfield 100,000+ residential units, zero-shot video-to-robot navigation as first result | figure.ai/news/project-go-big (fetched) | V | all four stated; article correctly hedges the navigation claim as Figure's claim |
| D13 | Fishel: video alone does not reveal touch "until well after the collision has physically moved the object"; Wells: touch "the key enabler for human-level dexterity" | sanctuary.ai tactile announcement (fetched, 2025-02-26) | V | both stated; Fishel is "Principal Researcher", Wells "CEO at Sanctuary AI" |
| D14 | Phoenix hands: hydraulic actuation, "fingertip arrays of micro-barometer cells sensitive to about five millinewtons, against roughly three for a human fingertip" | sanctuary.ai announcement + blog.robozaps.com Phoenix review (both fetched) | V | RoboZaps: "seven-cell tactile array to each fingerpad, built on micro-barometers... sensitive to about five millinewtons against a human finger's roughly three" (Feb 2025, matching the announcement date); hydraulics from Sanctuary's own pages |
| D15 | Figure 03 "fingertip tactile sensors that detect forces as small as three grams, plus cameras in the palms"; Helix 02 "the first Figure has shown that consumes touch directly" | figure.ai/news/introducing-figure-03 + /news/helix-02 (both fetched) | V | "Each fingertip sensor can detect forces as small as three grams"; "embedded palm camera"; "This is the first time we've demonstrated neural network policies that depend on these modalities" |
| D16 | Shadow: "more than 100 sensors at 1 kHz"; "€110,000 including support" (2022); "each finger has an independent side-to-side motion" | shadowrobot.com product page + cost blog (both fetched) | V | "over 100 sensors running at up to 1KHz"; "€110k including shipping, installation, training and support" (blog dated Dec 5, 2022); side-to-side sentence verbatim |
| D17 | Sparsh-X "pretrained on about a million contact-rich interactions from Meta's Digit 360 sensor and lifted policy success rates by 63%" | arXiv 2506.14754 HTML (fetched) | V | "∼1M contact-rich interactions collected with the Digit 360 sensor"; "boosts policy success rates by 63% over an end-to-end model using tactile images" |
| D18 | TouchWorld "65% success on six long-horizon contact-rich tasks, 15.7 points over the strongest baseline" | arXiv 2607.07287 HTML (fetched) | V | "six long-horizon and contact-rich dexterous manipulation tasks... 65.0% success... outperforming the strongest baseline by 15.7... percentage points" |
| D19 | GR2 "drives the 22-DoF SharpaWave hand"; "92% success unscrewing a light bulb but 32 to 44% on its other multi-finger tasks" | GR2 blog (fetched; figure SVGs OCR'd) | V | "five-fingered, 22 degree-of-freedom SharpaWave hand"; bar labels in the blog's multi-finger chart read 92 / 44 / 36 / 32 across Unscrew bulb, Tie trash bag, Dustpan, Ziplock (tesseract OCR of the chart SVG); "the multi-finger dexterous manipulation remains challenging" |
| D20 | Tesla 22-DoF tendon V3; "days after the V3 hand patents surfaced, Musk said of the design, 'this one didn't actually work'" | droids.substack.com (fetched) + teslarati.com (fetched) | C | the quote is real (Musk on X, 2026-04-19: "We already changed the design. This one didn't actually work.") but the DROIDS writeup is dated Apr 17 and does not contain it. Registered `teslarati-optimus-hand-2026` (press report embedding the X post) and cited it alongside DROIDS (patents, 22 DoF); table row's secondary source re-pointed the same way. |
| D21 | Sanctuary "has since pivoted to selling software" | RoboZaps Phoenix review (fetched) | V | "In June 2026 Sanctuary pivoted to selling its Physical AI software for other robots" |
| D22 | Unitree H2 "\$29,900... base model ships with non-functional placeholder hands, and its tactile option, the H2 Plus with Sharpa Wave hands, lists at \$100,000" | RoboZaps H2 review (fetched) | V | all three stated (July 17, 2026 store check); table row specs verified incl. Dex5-1 10-12 DoF via Wikipedia's Humanoid hand article |
| D23 | "16 degrees of freedom on the Figure 02 hand" | PRNewswire Figure 02 release (fetched) | V | "4th generation hands... equipped with 16 degrees of freedom" |
| D24 | "on Figure 03 the most sensitive fingertip spec any maker has published directly" | table sources (all fetched) | C | false within the article's own table: Sanctuary's ~5 mN is ~6x more sensitive than 3 g (≈29.4 mN); the real distinction is that Figure is the only maker here publishing a force threshold on its own product page. Rescoped accordingly in prose and in `lib/dexterous-hands.ts`. |
| D25 | Helix 02 four tasks: bottle cap, single pill from an organizer, exactly 5 ml syringe, small metal parts from clutter | figure.ai/news/helix-02 (fetched) | V | Dexterity Tasks 1-4 verbatim ("Unscrew a bottle cap"; "locate and extract a single small pill from an organizer"; "Push exactly 5 ml from a syringe"; "Pick metal pieces from a cluttered box") |
| D26 | "Sanctuary demonstrated zero-shot in-hand reorientation with its 21-DoF hydraulic hands in December 2024" | sanctuary.ai in-hand announcement (fetched; datePublished 2024-12-12) | C | the announcement states 21-DoF hands performing in-hand manipulation in Dec 2024, but never uses "zero-shot" or "reorientation"; that characterization is the RoboZaps review's ("performing zero-shot in-hand manipulation, reorienting a held object"). Reworded to the primary's claim with the review cited for the characterization. |
| D27 | Sanctuary RL demo: "sim-trained reinforcement-learning policy reorienting objects against gravity with a 500 g weight added, a vendor-run result" | sanctuary.ai hydraulic-RL post (fetched) | V | "an in-hand reorientation policy trained in simulation... executed in the real world, against gravity and with 500 grams of weight added" |
| D28 | Holson keyring task: "handed a keyring and must align and turn the correct key without putting it down" | Holson's Olympics post (fetched) | V | "A keyring with at least 2 keys... Without putting the keys down, get the correct key aligned and inserted and turned in a lock" |
| D29 | RL-100 folds cloth; π0.7 "does laundry and espresso tasks with language steering" | arXiv 2510.14830 abstract (fetched); pi07 blog (fetched) | V | cloth folding among RL-100's eight tasks; coaching sections of the blog |
| D30 | π Olympics: gold in 3 of 5 categories, "under nine hours of data per task", 52% success / 72% progress, 9% baseline progress, two golds physically impossible, orange "needed a tool and did not count" | pi.website/blog/olympics (fetched) | C | all figures verified ("success rate of 52% and a task progress of 72%"; baseline "average task progress of 9%"; "3 out of 5"; "physically impossible for our robot"; orange "technically a rule violation, so we don't count this as successful") except the data figure, which the post states as "under 9 hours **for most tasks**". Corrected "per task" → "for most tasks". |

## generalization.mdx (continued)

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| G12 | EgoScale: 20,854 h, "more than twenty times prior efforts", R²=0.9983 law, completion 0.30→0.71, +54% on a 22-DoF hand | arXiv 2602.16710 HTML (fetched) | V | every figure stated in §3.3 and Fig. 5 text; the 22-DoF hand is the Sharpa hand on Galaxea R1 Pro |
| G13 | EgoScale display equation, "D in thousands of hours" | arXiv 2602.16710 §3.3 (fetched) | S | see source-quirk register. Paper text says "D denotes the number of hours"; the figure-consistent reading (loss span 0.0150-0.0240 at 1k-20k hours; literal reading crosses zero at 2,981 h) is what `lib/egoscale-law.ts` implements and documents. Article and module agree; recorded, not "corrected". |
| G14 | "20K hours of EgoScale video enter GR00T N1.7 pretraining" through the shared relative-EEF space | github.com/NVIDIA/Isaac-GR00T README (fetched) | V | "20K hours of EgoScale human video data in pretraining"; "relative EEF action representation is consistent across both human and robot data" |
| G15 | GR2 "adapts to new bi-arm embodiments with fewer than 200 examples in a few hours, a vendor-reported figure" | GR2 blog (fetched) | V | "adapt to new bi-arm robot embodiments with just a few hours of adaptation time, typically with less than 200 examples" |
| G16 | "Karcini and co-authors argue policy scaling alone misses architectural pillars entirely" | arXiv 2606.06556 HTML (fetched) | C | the position paper argues the missing layer is **supervision infrastructure**, explicitly "not another policy architecture alone": converting "unstructured physical experience into grounded robot supervision". Its "four missing pillars" are data-engine components. Reworded to the paper's own framing. |
| G17 | Goldberg "frames the shortfall as a 100,000-year data gap and argues good old-fashioned engineering... closes it" | Crossref (title/abstract) + UC Berkeley interview via techxplore (fetched) | V | title: "Good old-fashioned engineering can close the 100,000-year 'data gap' in robotics"; the gap is the ~100,000 years of human reading needed to cover LLM training text, which robot data lacks |
| G18 | Bessemer "arguing the capability curve is steep" | Bessemer (fetched) | V | "We don't think that moment is years away. But it's not here yet" |
| G19 | "No published result shows a generalist policy sustaining better than 95% success across a broad task distribution in unseen environments" | editorial scoping across fetched sources | V | negative scoping claim, dated by context; nothing in π0.5/π0.7/EgoScale/GR2 contradicts it |
| G20 | Stat box: 20,854 h / R²=0.9983 / 0.71 at 20k / ">90% on N unseen homes; unmet" | EgoScale paper + arithmetic | V | covered by G12; the solved bar is the article's own definition |
| G21 | "The optimistic extrapolation crosses the bar only near 111k hours" | arithmetic over lib/egoscale-law.ts fit | V | least-squares fit through the five published points crosses 0.90 at 111k h; chart labels it extrapolation |

## competing-theses.mdx (continued)

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| T7 | "NVIDIA put three months of a 10,000-GPU training run into Cosmos 3" | Cosmos 3 technical report PDF (fetched, pdftotext) | C | the tech report states Cosmos3-Nano was "trained on 31.05T tokens using 1024 NVIDIA GB200 GPUs" and Cosmos3-Super "17.86T tokens using 2048 NVIDIA GB200 GPUs". The 10,000-H100/three-months figure is Bessemer's description of the earlier Cosmos, not the cited Cosmos 3 report. Corrected to the report's own figures. e2e spec updated. |
| T8 | Sutton's The Bitter Lesson discussed in prose without a citation | web.archive.org mirror (fetched, 200) | C | the known gap: registered `sutton-bitter-lesson-2019` with the dated archival mirror URL per the settled policy in library/content-quality.md (Sutton / real title / 2019 date kept), and linked the prose mention. |
| T9 | "Brooks answered it the same week" | rodneybrooks.com/a-better-lesson (fetched) | C | A Better Lesson is dated March 19, 2019, six days after Sutton's March 13 post, and opens "Just last week Rich Sutton published". Corrected to "six days later". |
| T10 | "his rebuttal quotes the essay at length" | A Better Lesson (fetched) | C | the rebuttal contains no extended quotation; it paraphrases ("In his post he argues...") and closes "This review... is seventy six words shorter than Sutton's post." Corrected. |
| T11 | "...front ends, CNNs and MFCCs, that baked in the priors the network supposedly did not need" | A Better Lesson + dexterity essay (both fetched, grepped) | C | neither essay uses "MFCC" (grep-confirmed). A Better Lesson: "the very essence of CNNs is that the front end of the network is designed by humans to manage translational invariance"; the speech-front-end argument (Mel filter banks, telephone heritage) is in the 2025 essay. Reworded to the sources' own terms in both the MDX and `lib/competing-theses.ts`. |
| T12 | Stat: "robot data ~300k h estimated global total, Apr 2026" | Bessemer (fetched) | V | "Total global robot manipulation data is estimated at roughly 300,000 hours" (stat box carries no chip by site convention; Bessemer is cited in the article) |
| T13 | SayCan 2022: "a separate LLM dispatched a fixed skill library" | arXiv 2204.01691 abs (fetched) | V | paper's own framing (LLM grounding over predefined affordance skills); standard characterization |
| T14 | "Gemini Robotics ER 2 is explicitly built as the high-level brain that plans multi-step tasks and hands motor execution to a lower-level VLA" | deepmind.google ER2 page (fetched) | V | "Gemini Robotics ER 2 is a high-level brain for robots... hands off motor execution to any given lower level vision-language-action (VLA) model" |
| T15 | Helix "splits slow reasoning, a 200 Hz visuomotor policy, and a 1 kHz whole-body controller across S2, S1, and S0" | figure.ai/news/helix-02 (fetched) | V | "S1... translating perception into full-body joint targets at 200 Hz. S0 executes at 1 kHz" |
| T16 | "Helix 02 sequenced 61 loco-manipulation actions across a continuous four-minute dishwasher unload, ordered correctly, with implicit error recovery" | Helix 02 post (fetched) | V | "61 loco-manipulation actions, ordered correctly, with implicit error recovery"; "a four-minute, end-to-end autonomous task" |
| T17 | V-JEPA 2 "plans zero-shot reaching, grasping, and pick-and-place on Franka arms in labs it never saw, after action-conditioned post-training on less than 62 hours" | arXiv 2506.09985 abs (fetched) | V | "post-training a latent action-conditioned world model, V-JEPA 2-AC, using less than 62 hours of unlabeled robot videos"; "deploy V-JEPA 2-AC zero-shot on Franka arms in two different labs" |
| T18 | Recap / RL-100 / ENPIRE as the RL-thesis evidence (2x throughput, >90%, 100%/1,000/8 tasks, 99% pin-box) | pistar06 blog, arXiv 2510.14830, arXiv 2606.19980 (all fetched) | V | verified under R4 and D29-D30; ENPIRE: "achieve a 99% success rate on challenging, dexterous manipulation tasks... such as PushT, organizing pins into a pin box" |
| T19 | "π0.7 matches specialist throughput only on tasks where it has distilled specialist experience" | pi07 blog (fetched) | C | the blog documents matching on the Recap tasks "by distilling experience generated during Recap training"; it never states failure elsewhere, so "only" was an unsupported strengthening. Weakened in MDX and `lib/competing-theses.ts`. |
| T20 | "Nucleus deploys humanoids under supervised operations rather than full autonomy on exactly this logic" | rockingrobots.com (fetched) | C | claim was uncited. Verified: "Nucleus combines AI with human supervision during the early stages of deployment... robots to perform useful work while generating the real-world data needed to improve the underlying models". Registered `nucleus-supervised-2026` and cited (no first-party page carries the detail; nucleuslab.ai is a one-liner). |
| T21 | "Bessemer names the economics: the data flywheel, where deployment revenue funds the collection that funds autonomy" | Bessemer (fetched) | C | Bessemer's flywheel is about data compounding ("turning robot data into better decisions, better model improvements, and better deployments"), not a revenue-funds-collection causal chain, which appears nowhere on the page. Reworded to Bessemer's own formulation in MDX and `lib/competing-theses.ts`. |
| T22 | "Ian Glow argues you will never get the scale or diversity you need from teleop alone" | Bessemer (fetched) | V | quote verbatim: "you'll never get the scale or diversity you need from teleop alone" (Glow is CEO, Zeromatter) |
| T23 | "Ken Goldberg quantifies the data problem as a 100,000-year gap and argues good old-fashioned engineering closes it faster than collection does" | Crossref + Berkeley interview (fetched) | C | "faster than collection" is not his position; he argues engineering **bootstraps** robots into deployment so they can collect the data ("get these robots functional so that they can collect the data that we need... a way to bootstrap the data collection process"). Corrected in MDX; the table row's "evolution spent on dexterity" basis (wrong: the 100,000 years is the human reading time of the LLM text corpus) corrected in `lib/competing-theses.ts`. |
| T24 | Humanoid/task-specific thesis: "pure fantasy thinking"; "no human-like robot hand has survived real-world deployment at industrial durability"; Brooks's Robust.AI builds warehouse robots | Brooks essay (fetched) | V | "believing that this will happen any time within decades is pure fantasy thinking"; "No one has managed to get articulated fingers... robust enough... for real industrial applications" + "none have inspired designs that have made it into deployment in real world applications"; "At my company we build robots that are deployed in warehouses" |
| T25 | Thesis-table rows mirror the prose corrections | lib/competing-theses.ts (edited) | C | five evidence strings corrected to match T7, T11, T19, T21, T23; proponents verified (ENPIRE: NVIDIA/CMU/UC Berkeley per the paper's affiliation line) |

## bear-case.mdx

| # | Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|---|
| B1 | Brooks's "September 2025 essay" calls practical humanoid dexterity "pure fantasy thinking" on tactile grounds | Brooks essay (fetched) | V | essay and framing verified under D7; registry metadata previously verified by audit-citation-reachability |
| B2 | Scorecard: deployable dexterity "will remain pathetic compared to human hands" beyond 2036; walking humanoids "too dangerous near people without new mechanical systems" | rodneybrooks.com predictions-scorecard-2026-january-01 (fetched) | V | both verbatim: "Deployable dexterity will remain pathetic compared to human hands beyond 2036. Without new types of mechanical systems walking humanoids will remain too unsafe..." |
| B3 | Morgan Stanley July 2026 note: "PR problem"; framed as direct substitutes vs tools for hazardous/labor-constrained tasks; "social license to deploy may matter just as much as technical performance"; investors "increasingly looking for tangible evidence of real-world return on investment"; US import ban raising R&D costs; 50,000-unit China shipment estimate kept | cnbc.com (fetched) | V | every element stated; note published Tuesday 2026-07-28, CNBC piece 2026-07-29; "retains its 50k target" |
| B4 | Unitree: ~5,500 shipped in 2025, "more than any Western competitor"; "Q1 2026 net profit fell 52% year over year" | technology.org + TechTimes (both fetched) | C | volume verified; profit corrected to **adjusted** net profit, 52.55% (see R11). Prose and stat box fixed. |
| B5 | "Figure's private valuation of \$39B (September 2025) exceeds Goldman Sachs' projection for the entire humanoid market in 2035, \$38B" | technology.org (fetched) | V | as R13 |
| B6 | "Bessemer estimates more than \$3B of aggregate robot data costs over the next two years and frames that spend as the moat" | Bessemer (fetched) | V | "aggregate robotic data costs across the industry will exceed \$3 billion over the next two years"; Prediction 2 heading "Data is expensive, capital is the moat" |
| B7 | Computex 2026: Qualcomm-powered humanoid "collapsed face-first during the live keynote, a failure attributed to a communication glitch, and was covered and carried off stage" | interestingengineering.com (fetched) | V | "fell face-first moments after reaching the stage"; "handlers to rush in, cover it with a cloth, and carry it away"; "reportedly caused by a communication glitch" |
| B8 | "Lisa Yan... describes the climb from 99% to 99.9% as steep" (from her Waymo experience) | Bessemer (fetched) | V | as R14 |
| B9 | "more than \$23B globally in the first five months of 2026 by PitchBook's tally, closing in on the \$26B raised in all of 2025" | briefs.co Market Briefs (fetched) | V | "raised over \$23 billion globally in 2026, nearly matching the full-year 2025 total of \$26 billion" (published Jun 2, 2026; PitchBook data named); both-tallies-presented policy followed |
| B10 | "Crunchbase's narrower venture count puts the figure at \$18.8B, already past the \$14.1B peak set in 2021" | news.crunchbase.com (fetched) | V | "\$18.8 billion in 2026... surpasses the \$14.1 billion raised in the peak venture funding year of 2021" |
| B11 | Bessemer: "no robotics bubble", "structurally underinvested", "not every company being funded will succeed", "some valuations are stretched" | Bessemer (fetched) | V | all four verbatim or near-verbatim in Prediction 6 |
| B12 | "Ken Goldberg's 100,000-year data gap is the strongest statement of this premise" | Crossref + Berkeley interview (fetched) | V | as G17 |
| B13 | Watchlist sim-to-real row: "no policy trained entirely in simulation has been shown on a real contact-rich task" | arXiv 2510.20808 (fetched) | C | contradicted by its own cited survey, which lists sim-to-real successes on "more complex and contact-rich tasks such as table-top rearrangement and assembly". The survey's actual position: "A key contributor to the dynamics gap in robotics is the inaccurate modeling of physical contact", with stick/slip/separation. `lib/bear-case.ts` statusDetail rewritten to the survey's own content; the milestone's howWeKnow (the >90% replicated zero-real-data bar) is the article's own definition and stays. |
| B14 | Watchlist rows: π0.5 unseen homes (partial); >1,000 documented units none / Agility 65,000+ h / Unitree ~5,500 (not-met); RoboArena/RoboChallenge/ManipulationNet standardized tasks or kits (partial); RL-100 100% + π*0.6 >90% per-task (partial); Sparsh-X ~1M interactions + TouchWorld, outside every major VLA pipeline (not-met); EgoScale law on validation loss (partial) | pi05 PDF, technology.org, arXiv abstracts/pages, RoboZaps (all fetched) | V | each element traced in the rows above; ManipulationNet: "reproducible task setups through standardized hardware kits" |
| B15 | "the board reads four not met, four partial, zero met" | lib/bear-case.ts statuses | V | 4 not-met, 4 partial, 0 met |
| B16 | "more than \$23B raised in five months against that scoreboard" | B9 | V | closing summary consistent |

## Registry / P1 sweep (frontier citations)

| # | Item | Source checked | Verdict | Note |
|---|---|---|---|---|
| P1a | All 52 citation ids used by the five articles resolve in the registry; titles/authors/years spot-checked against live sources (pi05, pi07, rl-100, egoscale, sparsh-x, touchworld, tactile-outlook, enpire, karcini, manipulationnet, reality-gap-survey, vjepa2, roboarena, robochallenge, saycan, lin-data-scaling-laws, open-x-embodiment, macefield, goldberg, cosmos-3, brooks pair, GR2/ER2, figure/sanctuary/shadow/unitree pages) | fetched sources above + Crossref for the two DOI entries | V | no metadata mismatches found; three new entries added (sutton-bitter-lesson-2019, teslarati-optimus-hand-2026, nucleus-supervised-2026), 306 registry citations total |

## Summary

Unit convention: one row per audited claim. A defect corrected across multiple surfaces
(prose + data table + test, or two articles) is one defect with several rows.

- **Claims checked:** 108 rows (R1–R16, D1–D30, G1–G21, T1–T25, B1–B16, P1a)
  over the five articles and their four rendering data files.
- **Verified as published (V):** 80.
- **Corrected (C):** 26 rows covering **24 distinct defects** (several single defects span
  prose + `lib/` table + e2e spec: the adjusted-net-profit defect is R11+B4 across
  reliability-gap prose, bear-case prose, and the bear-case stat box, and T25 is the
  table-mirror row for T7/T11/T19/T21/T23; the known-gap Sutton citation was pre-identified
  by the orchestrator rather than discovered here).
- **Cut (X):** 0. Nothing failed so hard it had to be removed; every corrected claim had a
  verifiable replacement in a fetched primary source. The closest call was B13, whose false
  universal ("no successful contact-rich transfer") was replaced wholesale by the survey's
  own content rather than deleted.
- **Source inconsistencies (S):** 2. G13 and the EgoScale quirk register entry above. Both
  are recorded per policy; neither was "fixed," and `lib/egoscale-law.ts` is unchanged.

P3/P5 verdict: every position attributed to a named researcher or lab now traces to that
person's own words in a fetched source (Brooks's two essays, Sutton's essay via the archival
mirror, Goldberg's own interview framing, Bessemer's own flywheel wording, Physical
Intelligence's own papers and blog). The competing-theses disagreement presents both camps
with their strongest arguments, and the bear case remains stated at full strength rather
than as a foil.

## Verification

| Gate | Command | Result |
| --- | --- | --- |
| Unit/integration tests | `npx vitest run` (scoped to affected areas) | 10 files, 156 passed |
| Full e2e suite | `npm run test:e2e` | 572 passed, 1 skipped, 0 failed |
| Types | `npm run typecheck` | clean (regenerated `next-env.d.ts` after e2e) |
| Lint | `npm run lint` | clean |
| Citations | `npm run validate:content` | OK, 306 registry citations, 0 unresolved |
| Static build | `npm run build` | green; `reading-times.json` word-count deltas only |
| Visual (static export, ports 3200/3201) | Playwright script, five pages at 1440/375 | corrected text present, 0 `.katex-error`, 0 console errors, 0 px horizontal overflow at 375; Bitter Lesson and Nucleus citation chips render and link (archive mirror x2 on competing-theses) |
