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
