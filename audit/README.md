# Content-integrity audit trail

## ACT final model-paper checkpoint — 2026-09-07

**ACT 32/32; corpus 120 complete / 874 incomplete / 994 original identities / 47 articles.** Original rows 27 and 28 now have corrected current claims with complete source bindings. P1 ordinal 32 remains complete after expansion from fourteen to sixteen actual citations. This is evidence completeness, not independent article acceptance. Counting uses unchanged `parseLedger` with actual frontmatter and compound plans; `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-final-model-paper-corrections/preservation.json` verifies all 118 prior complete records, 991 unaffected parsed records, 21 unchanged other plans, the exact archived prior P1, its fourteen unchanged parts/evidence and unchanged adjudication meaning. Only dependent digests were rebound. Catalog: 24 plans. BC remains 14/14; DP 25/25. Two method records changed; the other sixteen are unchanged.

- **ACT-FINAL-PAPER-27-20260907:** π0.6 predicted/executed horizons and robot-control rate are null with notes limited to the November 17, 2025 model card. Its 63 ms action-chunk inference uses five denoising steps, three camera inputs and one H100; no Hz is inferred. The continuous-action flow expert is distinct from FAST backbone supervision during training. Model-specific weight-release/licensing terms remain unknown in this card; its openpi statement concerns the π0.5 comparator.
- **ACT-FINAL-PAPER-28-20260907:** π0.7 predicts 50 and executes **either 15 or 25**, typed as `executed: { choices: [15, 25] }`. The schema rejects empty/singleton/duplicate/nonpositive/fractional/over-horizon choices, ranges and invented default fields. The numeric control reference is explicitly UR5e at 20 Hz; other tested robots run at 50 Hz. No execution choice is assigned to a robot. FAST training supervision is distinct from continuous runtime actions, and distillation from RL-trained π*0.6 is not erased by evaluation without task-specific post-training. Weight/license absence is scoped to the paper, not asserted worldwide.
- **ACT-FINAL-PAPER-32-20260907:** the two existing IDs `pi06-model-card-2025` and `pi07-2026` extend the actual P1 union to sixteen, with source chips beside the corrected paragraphs. Registry title/author/year data already match: Physical Intelligence's dated card and the exact 87-author paper. The paper's 2026 year is supported by the official April 16, 2026 announcement linking this exact PDF; no printed PDF date, venue or numbered version is invented. Only the unsupported adjacent “Closed model” registry comment was corrected; no registry ID or metadata value was added or changed.

**Zero new fetches or PDF conversions.** Eighteen literal excerpts across four retained documents were byte-checked; thirteen used excerpts bind the two papers and the dated π0.7 announcement. Original PDF HTTP200/no-redirect requests began at 2026-09-07T16:28:10.810822Z and 16:28:11.862371Z. Original binary hashes differ from derived-text hashes. The π0.7 conversion warnings remain recorded; no claim relies on garbled figure glyphs. The announcement's actual FetchUrl request/result events were 16:07:40.836Z / 16:07:46.166Z, with tool-reported 200, not captured origin headers. Raw record hashes and decoded retained blog bodies match. Full literal passages, byte ranges, hashes and original retrieval provenance: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-final-model-paper-corrections/source-proof.json`; product evidence is retained in `audit/compound-evidence.json`, not an article claim used as its own proof.

Sequential checks used `NODE_DISABLE_COMPILE_CACHE=1`:

| Gate | Actual command | Observed result |
|---|---|---|
| Red first | `npm test -- tests/component/act-final-model-papers.test.tsx` | Six expected failures before implementation |
| Focused unit/component | `npm test -- tests/component/act-final-model-papers.test.tsx tests/component/act-five-sources.test.tsx tests/component/policy-chunking-table.test.tsx tests/component/comparison-matrix.test.tsx tests/unit/methods.test.ts tests/unit/act-current-corrections.test.ts tests/unit/audit-ledger.test.ts tests/unit/audit-citation-coverage.test.ts` | 131 passed |
| Final affected tests | `npm test -- tests/unit/act-final-paper-audit.test.ts tests/component/act-final-model-papers.test.tsx tests/unit/structured-search.test.ts` | 32 passed; six overlap the focused run, 157 distinct tests total |
| Final ledger-only checks | `npm test -- tests/unit/act-final-paper-audit.test.ts tests/unit/audit-ledger.test.ts tests/unit/audit-citation-coverage.test.ts` | 91 passed, overlapping the above checks |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Pass, including final new audit/browser tests |
| Lint | `node node_modules/eslint/bin/eslint.js .` | Pass; later new audit/browser test files separately pass scoped lint |
| Content | `npm run validate:content` | Exit 1, 877 findings: 874 incomplete rows plus three aggregates; nine separately owned citation checks remain unresolved |
| Baseline | `npm run baseline:brand-v2` | Exit 1, exactly the same 60 prior failures, zero added or removed |
| Browser | `node node_modules/@playwright/test/cli.js test tests/e2e/act-final-model-papers.spec.ts --workers=1 --output <mission captures>` | Two distinct cases pass, 375x812 and 1440x900, each covering ACT and comparison |
| Mobile evidence correction | Same spec with `--grep 'at 375' --output <mission captures-mobile-corrected>` | One affected case passes; unchanged desktop result reused |
| Cards | `npm --ignore-scripts run generate:og-cards` then `npm --ignore-scripts run check:og-card-bytes` | Pass, 48 cards / 96 public-export files; ACT references 14 to 16, 47 cards unchanged |

Ten exact member endpoints append to all 129 prior approval entries: **139 total**. Each records sealed-old and current hashes, the immediate-before hash, primary sources, reason, affected assertions, brand-v2-editorial ownership and Josef's real September 7 implementation authority. No wildcard, baseline recapture or gate weakening. Exact members/hashes: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-final-model-paper-corrections/approved-deltas.json` and `member-changes.json`.

Browser results: zero Axe violations, page errors, KaTeX errors or document overflow on the checked routes. Pi0 and both new paper tooltips are internally unclipped and viewport-bounded; at 375px all three span x20–276. Tables remain keyboard-scrollable. The first mobile comparison screenshot cut the horizon cell at an arbitrary scroll offset; the corrected capture aligns that cell and asserts both horizontal bounds. Twenty-seven captures were produced; all eighteen final captures were inspected directly or by exact byte identity to inspected captures (22 distinct files directly inspected, five final files byte-identical). The changed ACT card was inspected against both locked references. These bounded source/render checks do not certify the full brand release corpus; existing broader control/brand convergence remains outstanding.

Production HTML and reading-time regeneration remain pending the red content prerequisite. `lastReviewed` remains 2026-08-18; no human-review or freshness claim. No humanizer skill was available; changed prose received a manual precision/overstatement read, alongside source no-slop checks. Preserved diagnostic failures: two diagnostic shape/index assumptions (catalog is an array; the manually sliced table was not the parser population), and the intended six red-first regressions. No source was refetched or gate relaxed to resolve them.

Protected `PRODUCT_QUALITY.md`, `qa/findings.json`, and `next-env.d.ts` are hash-preserved; only this session's verified Next dev import substitution was restored. ACT weighting/SVG, BC/DP prose, immutable baselines, old histories, owner work and local commits d282a83/2cf7d6b remain intact. No build, full browser corpus, push, deployment, cleanup, controller/feature/model change or credit fallback. No GPT-role exhaustion occurred. Independent Sol/high scrutiny and user testing remain required after corpus closure. The earlier citation Back-navigation BODY-focus gap stays tracked. Next finite article candidate is the existing comparison-matrix ledger: **0/25** complete, using retained source groups and current corrected method data, not a new audit or source sweep.

Evidence root: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-final-model-paper-corrections/`.


## ACT five-source checkpoint — 2026-09-07

**ACT 30/32; corpus 118 complete / 876 incomplete / 994 original identities / 47 articles.** Five newly evidence-complete original records: 20, 22, 26, 29, 30, all with corrected current claims and exact prior/current history. P1 ordinal 32 stays complete after expansion from nine to fourteen actual citations. All 113 previous complete records and 988 unaffected parsed records survive. All sixteen other old plans and all 107 prior approvals remain unchanged; current catalog: 22 plans, approvals: 129. Counting uses `parseLedger` with actual frontmatter and compound plans; independent preservation comparisons are recorded in `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-five-source-records-integration/preservation.json`. BC remains 14/14 and DP 25/25.

- **ACT-FIVE-SOURCE-20-20260907:** openpi is a dated, pinned catalogue listing pi0, pi0-FAST and pi05 checkpoints/download locations, not a global latest-release or closed-license conclusion. The stable openpi-repo-2024 ID now explicitly identifies the 24 August 2026 snapshot (year 2026); README last change is 21 November 2025.
- **22:** RT-1 v2 predicts one action per step, commands Everyday Robots at 3 Hz and discretizes each action variable into 256 bins. The six-frame observation history is not an action horizon. Its code-release statement does not establish pretrained weights; availability is null with a source-scoped note.
- **26:** pi0.5 v1 predicts 50 entries (inclusive H=49); its mobile platforms receive targets at 50 Hz. Executed-before-replanning count is null, not 50. Paper FAST/flow training is distinguished from openpi flow-head-only support. The exact 36-entry byline is retained; unproven CoRL 2025 venue removed.
- **29:** GR00T N1.7 GA README supports prediction horizon 40, flow-matching DiT, relative-EEF support and downloadable weights. SONIC is a separate interface. No inference Hz becomes robot-control Hz. The overview Apache claim and License section's Apache-code/NVIDIA-Open-Model-License-weights split remain explicit. The separately retained HF card is labelled EA; its benchmarks/version are not substituted into GA.
- **30:** Helix 02 announcement reports S1 joint targets at 200 Hz and S0 actuator commands at 1 kHz. Chunk length and weight-release/licensing terms are not disclosed **in this announcement**. Neither absence means n/a or closed licensing.

`openWeights` now permits boolean or null; null requires a nonempty canonical source-scope note. Filters use strict equality and a distinct Not disclosed option. Downloadable / Not released labels describe availability, not license openness. Four method records changed; fourteen, including Octo/pi0/pi06/pi07, retain their data values. Directly affected comparison prose no longer claims source silence establishes closed licensing. Unchanged pi06/pi07 flags and numeric values remain unverified, not certified by this renderer change.

Source evidence: **55 exact retained excerpts, 10 original response captures, five cited work groups plus the auxiliary EA model-card limitation. Zero new source requests.** Packet hashes are unchanged: 7beff7dd5ddb48859a853dd8116572328e84b3cc023b918ecdc4e8ea3da913b5 and 15429685286a576e83ca715789421f42b928d308a1a2dc1ec87d03527c8efa2a. Full supporting text, byte ranges/hashes and original FetchUrl request/result times/status provenance remain in `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-five-source-records-integration/source-proof.json`. All 51 RT-1 and 36 pi05 names were compared with actual retained bylines. Prior nine P1 parts/evidence are byte-identical; only whole-plan-dependent adjudication digests were rebound, with the old plan archived. Source readiness is neither human certification nor independent acceptance.

Sequential checks used `NODE_DISABLE_COMPILE_CACHE=1`: **153 focused unit/component tests pass**; nonincremental TypeScript and full lint pass. Content **exit 1, 879 findings** = 876 incomplete rows + three aggregates, with nine separate unresolved citation checks. Baseline **exit 1, 60 prior failures, zero added failure**; the exact current comparison-source endpoint accounts for one removed prior failure. Twenty-two exact approved member endpoints preserve sealed old, immediate-before and new hashes with source/reason/assertions and Josef's actual September 7 implementation authority. No baseline recapture or gate weakening.

Two distinct Playwright viewport cases pass, each covering ACT and comparison: **375x812 and 1440x900**. All **24 final screenshots** and the changed ACT card were inspected against both locked references. Pi0 tooltip clipping was reproduced (right edge494 at375), then fixed by local source placement (x20–276); tooltip text is internally unclipped and viewport-bounded. Both routes have zero document overflow, zero Axe violations and zero page errors in these cases. Mobile table scrolling is keyboard-tested; a partial scroll capture is not simultaneous all-column visibility. Existing full brand/control convergence is not certified by this bounded correction.

Sanctioned `npm --ignore-scripts run generate:og-cards` and `check:og-card-bytes` pass: **48 cards / 96 byte-identical public-export files**, only ACT's reference count changes from nine to fourteen; 47 cards unchanged. No cleanup hooks or production build were used. Production HTML/reading times remain pending the red prerequisite; neither article's lastReviewed changed. Changed prose received a manual precision/overstatement read; no humanizer skill was available. Source-only no-slop checks passed within content validation.

Preserved failures: six intended red-first tests; initial GR00T shortened/full-capture basis mismatch; whitespace-only current-paragraph binding guard; stale prior P1 digests exposed by strict AND coverage after expansion; one legacy badge-label test; and an immediate-before-scroll-settled mobile assertion (fixed with polling, only failed375 rerun). Two read-only diagnostic parsers initially assumed raw JSON where a capture was text or a log had an npm preamble; no source or gate weakened to resolve them.

Remaining ACT original ordinals: **27 (pi06), 28 (pi07)**, owned separately for source recovery; no wait or overlap with its directory. Keep the earlier BODY Back-focus defect under existing discovery work. No new owner decision, source fetch, full browser corpus, push, deployment, feature/controller/model switch, credit fallback or cleanup. Owner PRODUCT_QUALITY/qa, next-env, immutable baseline, ACT weighting SVG, BC/DP prose, old histories, and commits d282a83/2cf7d6b are preserved. Independent Sol/high scrutiny and user testing remain required after corpus closure.

Evidence root: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-five-source-records-integration/` (source-proof.json, metadata-check.json, row-history.json, p1-digest-rebinding.json, method-deltas.json, approved-deltas.json, preservation.json, baseline-comparison.json, visual-inspection.json and exact command receipts/logs).

## ACT Octo/pi0 settings checkpoint — 2026-09-07

**ACT 25/32; corpus 113 complete / 881 incomplete / 994 original identities / 47 articles.** Two newly complete original records (24/25), plus current P1 reconciliation (32). The 111 previous complete records remain complete; 991 unaffected parsed records are unchanged. The old seven-source P1 is archived exactly, with its seven parts/evidence preserved in the current nine-source plan. All fourteen other prior plans and all 97 prior approvals survive: catalog 17 plans; approvals 107. Counting uses `parseLedger` with actual frontmatter and compound plans; proof is `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-octo-pi0-settings-corrections/preservation.json`.

- **ACT-SETTINGS-24-20260907:** Octo explicit v2 ALOHA finetuning predicts 64 actions and executes 12. Separate reported examples are Franka prediction at 15 Hz, coffee controller at 10 Hz, and ViperX control at 5 Hz. Neither a universal horizon nor a universal control rate is inferred. The model data and table label the ALOHA setting and keep the universal rate null with its explicit disclosure/qualifier.
- **ACT-SETTINGS-25-20260907:** pi0 explicit v4 predicts 50; UR5e/Franka use 20 Hz and execute 16, while other evaluated robots use 50 Hz and execute 25. The numeric model reference is explicitly UR5e/Franka, not a new universal default. Continuous conditional-flow supervision stays distinct from execution settings. Existing typed numeric/null and qualifier fields suffice; no schema relaxation or padded numeric string.
- **ACT-SETTINGS-32-20260907:** Octo and pi0 citations are placed beside the new source notes and added to current frontmatter. P1 now binds all nine current registered IDs; no registry metadata changed. The seven earlier parts were not recertified from summaries; their accepted evidence is preserved and only the expanded plan digests are rebound.

The mixed-meaning table `n/a` override is removed: applicable unpublished values render exactly `not disclosed`. This mechanical P4 repair does not complete Helix/GR00T records or license claims. Remaining ACT original ordinals: **20, 22, 26, 27, 28, 29, 30**. The old out-of-scope note about Octo's n/a cells is historical and is superseded by this correction.

Source proof: **three retained captures, 24 hash-checked literal excerpts across two works, zero new fetches**. URLs: https://arxiv.org/html/2405.12213v2 ; https://arxiv.org/pdf/2410.24164 ; https://arxiv.org/abs/2410.24164 . Original request/result times, tool-reported statuses, explicit editions, and PDF extraction defects remain in `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-octo-pi0-settings-corrections/source-proof.json`. The metadata capture is the exact decoded original tool result, not the entire session file; its original hash was reproduced. No fresh-fetch date, human source review, or independent acceptance is invented.

Sequential checks with `NODE_DISABLE_COMPILE_CACHE=1`: **124 unit/component tests pass**, nonincremental `tsc --noEmit --incremental false` and lint pass. Two distinct Playwright cases pass at **375x812 and 1440x900**, each checking ACT and the shared comparison route. Twelve final captures were inspected against both locked references: the corrected values, conditional notes and source chips render, Tektur/Newsreader roles remain, ACT Axe and page-error checks pass, and both routes have zero document overflow. **Visual gap retained:** the pi0 citation tooltip at 375px extends past the right viewport edge even though the document-overflow oracle passes; this is not an all-citation visual pass. Mobile model tables use bounded horizontal scrolling; the zero-scroll model capture does not display every column. The prior Back-focus gap remains open.

Content: **exit 1, 884 findings** (881 incomplete rows plus three aggregates); nine separately owned citation-check gaps remain. Baseline: **exit 1, same 61 prior failures, no new failure**. Ten exact member endpoints record sealed old, immediate-before and current hashes, source/reason, affected assertions, brand-v2-editorial ownership and Josef's September 7 authority. Immutable baselines and gate logic are unchanged.

Sanctioned `generate:og-cards` and `check:og-card-bytes` pass: **48 cards / 96 public-export files**, only ACT changed from seven to nine references; 47 unchanged cards. The new ACT card was inspected. The direct source pipeline was used without unnecessary build or cleanup hooks. Production HTML/reading times remain pending the red content prerequisite. `lastReviewed` remains 2026-08-18. Manual precision/overstatement review was applied to changed nonquoted prose; no humanizer skill was available. No independent acceptance or new freshness promise.

Preserved failed attempts: six intended red-first assertions; source-proof failures for a missing metadata capture-path field, session-file versus decoded-result hash basis, and an incorrect compound excerpt separator; stale P1 digest/summary after expansion; and the first browser run's case-sensitive Tektur oracle. Each was resolved without relaxing source or audit criteria. No new retrieval, full-browser corpus, build, push, controller/feature/model change, destructive cleanup or credit fallback. Protected owner files, ACT weighting/SVG, BC/DP prose, old histories and commits d282a83/2cf7d6b remain. Independent Sol/high scrutiny and user testing remain required; 307/331 is not a ready-dispatch count.

Evidence root: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-octo-pi0-settings-corrections/` (source-proof.json, row-history.json, approved-deltas.json, preservation.json, captures-final/ and command logs/receipts).


## ACT current-claim checkpoint — 2026-09-07

Five of the fourteen assigned incomplete original rows now have complete evidence: **ACT 23/32; corpus 111 complete / 883 incomplete / 994 original identities / 47 articles**. Manipulation is **62/225** complete; BC remains 14/14 and DP 25/25. Counting uses the unchanged `parseLedger` with actual canonical frontmatter and compound plans. `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/action-chunking-current-claims-closeout/preservation.json` proves all 106 prior complete records, all 18 previously complete ACT records and 989 unaffected full parsed records remain unchanged. No duplicate row or weakened audit rule.

- **ACT-CURRENT-11-20260907 (S):** retains the already-correct six-DoF ViperX card and explicitly explains six arm joints plus one gripper coordinate per arm. Both ACT's six-DoF hardware text and its “7+7=14 DoF” notation are preserved, with Mobile ALOHA's explicit two-gripper account.
- **ACT-CURRENT-12-20260907 (S):** represents ACT Section IV-C's L1 versus Algorithm 1's MSE, with weighted KL. The card follows the named IV-C description, not an asserted universal objective. The Watcher policy.py excerpt is not silently attributed to imitate_episodes.py or reused without its original retrieval context.
- **ACT-CURRENT-15-20260907 (corrected):** names π0.5, five denoising steps, 76/97 ms model latency plus 10 to 20 ms LAN latency, and protective stops at **additional** 100/200 ms. Six tasks with ten episodes each support an aggregate throughput result, not every-task robustness or a universal threshold. The toy and prediction exercise now explicitly distinguish assumed percentages/interpolation from measured task throughput. Model calculations, slider limits and 0/100 ms mounted defaults are unchanged.
- **ACT-CURRENT-19-20260907 (cut):** removes the unsupported causal claim that later pi generations adopted RTC because of that result. The current sentence limits its scope to the evaluated flow policy.
- **ACT-CURRENT-32-20260907 (corrected):** all seven current canonical citation identities are separately bound. The RTC blog's actual title is “Real-Time Action Chunking with Large Models”, by Kevin Black, Manuel Y. Galliker and Sergey Levine, published June 9, 2025. ACT's official RSS record, pinned reference file, Mobile ALOHA metadata and existing DAgger/DP/RTC identities are preserved. The earlier empty seven-source plan and its original tuple are archived exactly; all ten other old plans are unchanged. Four new compound plans bring the catalog to 15. No new citation ID or reference-count change.

Outcome unit: five completed original records = two corrected + one cut + two represented source inconsistencies; zero new plain-verified verdicts. The nine held original ordinals are **20, 22, 24, 25, 26, 27, 28, 29, 30**. Their legacy verdict labels do not confer current evidence. `held-lineage.json` records the exact gaps: openpi release cutoff, RT-1, Octo, pi0, pi0.5, pi0.6, pi0.7, GR00T N1.7 and Helix 02. Next eligible retained-source correction: Octo's setup-specific 64-predicted/12-executed ALOHA example and task-specific rates, then pi0's H=50 with up-to/setup-qualified control rates. No table field was guessed or silently certified.

Binding proof uses **12 retained primary captures and 21 hash-checked literal excerpts across seven cited works**. Original request/result timestamps, tool-reported status, capture identity and extraction limitations remain in `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/action-chunking-current-claims-closeout/source-proof.json`. No new retrieval requests or new primary-document groups. One current connector-catalog check listed 54 apps without GitHub; no shell network fallback occurred. Two additional already-retained lineage bodies were hash-checked only to locate the held Octo/pi0 corrections, not used as current row proof. Unversioned URLs remain unversioned; no invented fetch date, paper passage or freshness metadata.

Sequential checks used `NODE_DISABLE_COMPILE_CACHE=1`: **137 focused unit/component tests pass**, including all-seven-part P1 omission mutations; the final 137-test check overlaps the earlier run, not 274 distinct tests. Current nonincremental no-emit TypeScript and full lint pass. **Two distinct affected Playwright cases pass** at 375x812 and 1440x900; the final rerun followed only the lint-required interval spelling change. Twenty-four final screenshots were produced; eighteen were visually inspected against both approved references, including text close-ups and full-page layout overviews. Zero Axe violations, page errors, KaTeX errors or document overflow. Tektur h1 is 36/52 px; Newsreader prose is 19 px with 32.3 px line height. The development-only Next indicator remains visible in local captures; these are not production release-corpus screenshots.

Content remains **red: 886 findings** = 883 missing records + three aggregate failures; ACT P1 is no longer an unresolved outcome. Nine separate citation-check gaps remain named. Baseline remains **red: 61 prior failures**, all byte-identical to prior failure records, with no new failure. The exact latency-component source member is now covered by this correction. Nine new exact approval endpoints cover eight member IDs (including one composition follow-up), preserving all 88 prior approvals for **97 total**. Each names the sealed old, immediate-before and new hashes, source, reason, assertions and Josef's real September 7 instruction; neither sealed baselines nor audit logic changed.

`npm run check:og-card-bytes` passes: all **48 current renders / 96 public-export files** are byte-identical; all 48 cards also match committed bytes. No generation was needed because the canonical seven-reference count and other card facts are unchanged. Production HTML and reading-time regeneration remain pending the red content prerequisite. The displayed eight-minute reading time is not a new measurement. `lastReviewed` remains 2026-08-18, not a human or independent-review assertion. The unavailable humanizer skill was replaced by a manual precision/overstatement read of nonquoted changed prose; source-only no-slop lint also passes.

Retained initial failures: five red-first correction assertions, a source-proof header-locator error, the organization-label fixture after the real blog byline correction, and the source-prose en-dash violation. They were resolved without relaxing a gate. `PRODUCT_QUALITY.md`, `qa/findings.json` and `next-env.d.ts` are hash-preserved; only known dev-generated type imports were restored. The weighting SVG, image metadata, glossary, asset seal, toy calculations, 48 cards and commits d282a83/2cf7d6b are preserved. No full browser corpus, build, cleanup, push, deployment, feature/controller/model switch or independent acceptance. Required next: the nine held lineage records, production validation after corpus closure, independent Sol/high scrutiny and user testing. The previously recorded citation Back-focus gap remains open.

Evidence root: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/action-chunking-current-claims-closeout/` (row-history.json, source-proof.json, held-lineage.json, approved-deltas.json, preservation.json, baseline-comparison.json, visual-inspection.json and exact command receipts/logs).


## BC foundations authorized closeout — 2026-09-07

Six original rows (1, 4, 8, 10, 12, 14/P1) are now corrected with complete evidence: **BC 14/14; corpus 106 complete / 888 incomplete / 994 original identities / 47 articles**. Manipulation is **57/225** complete. DP remains 25/25 and ACT 18/32. Counting uses the unchanged `parseLedger` with real canonical frontmatter and compound plans; `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/bc-foundations-authorized-corrections/preservation.json` confirms all 100 previously complete records, 988 unaffected rows, all eight previously complete BC rows, nine unchanged compound plans and all 79 prior approvals. The old empty BC P1 plan is archived; its current six-part replacement plus one new two-part ALVINN binding bring the catalog to 11 plans. No duplicated counted row.

BC-1-20260907 preserves the introductory BC definition while distinguishing ALVINN's camera/laser-range inputs, simulated training, NAVLAB tests and proposed future human-driving training. BC-4/10-20260907 separates expert-distribution epsilon, true epsilon_N and empirical hatted epsilon_N; Theorem 3.2 is conditional and existential over the learned sequence, with excess cost u*T*epsilon_N + O(1), and u may be O(T). The theorem's learning/mixing, policy-selection and finite-sample qualifications remain explicit. The unchanged deterministic toy is now labelled as illustration, not task cost or a benchmark; defaults, controls and executable model are preserved. Its 120/240-step readouts still round to 370/1505.

BC-8-20260907 narrows multimodality to Diffusion Policy's documented Push-T behavior and removes unsupported flow-matching-origin attribution. BC-12-20260907 states the actual HG-DAgger takeover/recovery-label/manual-release mechanism from the explicitly marked arXiv v2 PDF. BC-P1-20260907 verifies all six current source identities: ALVINN's official 1988/volume-1 venue; HG's arXiv v2 (11 March 2019), not unproved ICRA; blog-only Gashon Hussein spelling across all 55 printed authors; unchanged DAgger AISTATS identity, ACT official RSS identity and extended eight-author DP work. Existing unversioned URLs are not claimed immutable. Three registry metadata records changed; citation population and canonical six-reference BC card facts did not.

Sources are reused, not newly fetched: 14 retained retrieval records across six works, comprising 13 successful text responses and one ALVINN reader/PDF-processing error whose origin HTTP status is unknown. The nine retained packet captures, four ALVINN requests and existing ACT RSS capture preserve original request/result times and exact hashes. Thirty-two literal excerpts were checked (27 packet bindings plus HG-v2 mechanism, two DAgger identity excerpts and two ACT RSS excerpts). No new network requests, invented passage or fresh-fetch date. Evidence: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/bc-foundations-authorized-corrections/source-proof.json`, `p1-proof.json`, `hg-v2-excerpt.json`, `corrections.json`.

Sequential checks used `NODE_DISABLE_COMPILE_CACHE=1`: 172 focused unit/component tests pass; the final affected 91-test recheck is an overlapping subset, not an additional distinct population. Nonincremental `tsc --noEmit --incremental false`, full lint and final scoped lint pass. Eight distinct affected Playwright cases pass through retained receipts (four existing BC cases, two correction/interaction cases and two bounded-equation cases), at 375x812 and 1440x900 where specified. Zero Axe violations/page errors in the interaction cases and zero document overflow in all captures. Tektur h1 is 36/52px; Newsreader prose is 19px with 32.3px line height. The long true-loss/mixing equation was split into two gathered lines after inspecting mobile clipping inside its bounded math region; final close-ups show both lines. The 14 earlier full/interaction captures and six final equation captures were inspected against both approved references; earlier full-page captures predate this final equation composition and are not final-release corpus proof.

The content gate remains **red: 892 findings** (888 incomplete records, unresolved ACT P1 outcome, three aggregate failures); nine citation-audit gaps remain separately named. Baseline is **red: 62 prior failures**, with nine exact scoped approval endpoints and no baseline recapture or gate changes. Existing `npm run check:og-card-bytes` passes: **48 current renders / 96 public-export files byte-identical**. No card generation was necessary, and no card bytes changed. Production HTML and reading-time regeneration remain pending the content prerequisite. `lastReviewed` stays 2026-08-17; no human-review/freshness assertion. The humanizer skill was not available; rewritten nonquoted prose received a manual precision/overstatement read plus the passing source prose lint.

Initial failures are preserved: four red-first regressions; ALVINN serialized-versus-decoded offset verification; P1 literal batch-format binding; unescaped probability-dollar formatting; citation-wrapper focus locator; missing optional added-member seal lookup; and the two-import Next dev restoration check. Each was resolved without changing acceptance logic. `next-env.d.ts` was restored only after matching both generated dev import changes to the session backup. Owner `PRODUCT_QUALITY.md` and `qa/findings.json` are hash-preserved. No build, full browser corpus, cleanup, push, deployment, controller/model/feature-state change or independent acceptance. Required next: continue the remaining ACT original-row/source-identity batch, retain the separately tracked citation Back-focus gap, then corpus closure, independent Sol/high scrutiny and user testing.

## Correction-artifact maintenance — 2026-09-07

This checkpoint closes only the legacy hardware-comment and generated-card residuals named below. The older checkpoints retain their original history; their statements that these two residuals remain open are superseded here. No article claim, citation, price, review date, audit row, or approval entry changed: **100 complete / 894 incomplete / 994 original identities / 47 articles**, with all 100 complete records and all 79 approvals preserved.

`lib/hardware.ts` now explains that price buckets classify non-null `priceUsd` and do not use `priceMaxUsd`, without an ALOHA price example. Everything after the opening comment is byte-identical; the corrected null prices remain unchanged. No article prose changed, so no review date or humanizer pass applies.

The existing `npm run generate:og-cards` lifecycle reads current registry titles/domains and MDX reference counts/review years directly; it requires neither production HTML nor reading-time measurements. It generated the exact sealed 48-card population. Only ACT's **6 → 7 references** and Diffusion Policy's **6 → 9 references** changed PNG bytes, in both `public/og` and `out/og`; the other 46 cards stayed byte-identical. Titles, review years, fonts, palette, grid and renderer code are unchanged. Both updated cards and both prior cards were visually inspected; the new ACT bytes also match the retained candidate. This is a factual asset repair, not social-card milestone or release acceptance.

New sequential checks, all with `NODE_DISABLE_COMPILE_CACHE=1`: generation exited 0 (47 article cards + one site card); `npm run check:og-card-bytes` exited 0 (48 current renders, 96 byte-identical public/export files); seven focused hardware/pricing/OG unit files passed 61 tests; two focused renderer-parity mutation tests passed (20 unrelated tests excluded by the name filter); scoped hardware lint, tuple/evidence preservation and whitespace checks exited 0. The normal baseline check exited 1 with the same **63 failures**, producing byte-identical output to the pricing checkpoint; no new sealed-member delta or approval was needed. Nonincremental no-emit TypeScript proof is reused from the unchanged-executable-code pricing checkpoint, not presented as a new run.

The content gate remains **red, 898 findings** (894 incomplete records, one unresolved ACT P1 outcome, three aggregate failures), with nine citation-check gaps tracked separately. That content result is reused, not rerun. Cards contain no reading-time fact; production HTML and reading-time regeneration still await the content prerequisite. Only `out/og` was refreshed, not the rest of `out/`. The citation Back-focus gap, remaining source gaps, independent Sol/high scrutiny and user testing remain open. No network retrieval, build, browser corpus, baseline recapture, push, feature-state change or acceptance occurred.

Exact source-derived card inputs, old/new hashes, before/after PNGs, command receipts and preservation proof: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/correction-artifact-reconciliation/`.

## Pricing/source-strength checkpoint — 2026-09-07

PRICE-TELEOP-20260907 corrects teleop ordinal 4; PRICE-HARDWARE-20260907 corrects only the ALOHA part of hardware-taxonomy ordinal 6. One additional complete row, not article acceptance: **100 complete / 894 incomplete / 994 original identities / 47 articles**. Data-hardware is **4/128** complete; teleop **1/13**, hardware-taxonomy **0/25**. All 99 previously complete records and 992 unaffected claim/source/verdict/note/evidence tuples survive. DP remains 25/25, ACT 18/32, with its P1 unresolved. All ten compound plans and all seventy prior exact approvals remain unchanged.

The original community issue https://github.com/alpibrusl/lex-robot/issues/3 self-describes research in June 2026 and reports the combined “ALOHA / ALOHA 2” research-bimanual category at approximately ~$17k–32k. Its currency code, endpoint configurations and itemized inclusions/exclusions are not established. The USD-typed ALOHA amounts, price-as-of field and inferred workstation floor are removed; `not disclosed` renders beside the attributed community estimate and source. GELLO remains controller-only, not a complete robot purchase. Unrelated prices are not certified. The homepage retains the exact brand descriptor and lime mark while distinguishing cited evidence from completed verification.

Source proof is reused, not newly fetched: original FetchUrl response **2026-09-07T12:15:17.844Z**, tool-reported HTTP 200; body SHA-256 `6d34debe7a74d97ee8c0f05be8639454ffbac8eceb268edda3102e3930ae8046`. Request/response event hashes and five exact excerpts were checked against the preserved response. No issue author or opening timestamp was inferred. Current citation metadata is unchanged and its byline remains unverified.

Validation: 138 focused unit/component tests passed; a final affected source/audit recheck passed 80 tests (overlapping population, not 218 distinct tests). Six distinct affected Playwright cases pass through the retained run receipts: three existing pricing regressions, two final three-route viewport cases, and one internally scrolled mobile-price case. Fifteen final screenshots were inspected at 375×812 and 1440×900; all six final route/viewport inspections report zero Axe violations, zero document overflow and zero page errors. The initial 24px mobile pricing-tooltip overflow was fixed by placing only the pricing citations at the start of their own attributed paragraphs; shared tooltip code was not changed. Initial red-first/test-preparation/browser/prose-lint/receipt-parser failures remain recorded.

Current nonincremental no-emit TypeScript and lint pass. Content remains **red, 898 findings**: 894 missing records, one unresolved ACT P1 outcome and three aggregate evidence failures. Baseline remains **red, 63 prior failures, no new failures**; exact scoped approvals account for the two price-renderer source failures previously among 65. Nine new exact delta entries cover six member identities, including three follow-up prose endpoints; total approvals 79. No sealed baseline, asset or gate logic was changed. The existing collector has no homepage-premise or hardware-per-record member; no fictitious member was introduced. Exact file/data changes and hashes are retained in the evidence packet.

Evidence: /home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/pricing-provenance-authorized-corrections

Both article review dates remain 17 August 2026. Reading times, production export/build and any dependent release proof remain pending the red content prerequisite; no known-failing build or full browser corpus was run. Existing DP Back-focus-to-BODY debt and ACT stale six-reference generated OG/export versus seven current references remain open. Next eligible pricing slice requires primary support for the unchanged Koch/Reachy claims and verified community-issue bibliographic identity; no new retrieval is part of this checkpoint. An unrendered legacy ALOHA price-bucket example remains in `lib/hardware.ts:9`, outside the prepared helper-edit scope. No push, deployment, feature-state edit, model fallback or independent acceptance occurred.

## ACT convention checkpoint — 2026-09-07

ACT-CONVENTION-20260907 reconciles the pinned reference convention across the article, code comments, inline glossary definition, diagram, alt/caption and a new pinned code citation. Retained predictions are ordered oldest-to-newest; normalized exp(-0.01 × i) gives the oldest retained prediction the largest weight. The scalar [0, 10, 20] example is explicitly **after selection**, yielding 9.93333444; it does not exercise the raw-buffer nonzero occupancy filter. Diagram raw weights 1.00 / 0.61 / 0.37 are explicitly illustrative m=0.5, separate from reference m=0.01. Brand, layout, runtime behavior and CC BY 4.0 attribution are preserved.

The exact current weighting row is ACT ordinal **14**, not the prepared packet's 15; current text binding exposed the packet ordinal error. That one row gains complete evidence. ACT-P1-SET-20260907 updates ordinal **32** to the actual seven-citation set but explicitly marks its bibliographic verdict unresolved. Both original tuples and the original six-part P1 plan are archived in audit/manipulation.md; the other nine compound plans are unchanged, with ten plans retained in total. No P1 or article acceptance is claimed.

Parsed counts: **99 complete / 895 incomplete / 994 claim identities / 47 articles**; ACT **18/32**, manipulation **51/225**. All 98 previous complete records and 992 immediate-checkpoint unaffected claim/source/verdict/note/evidence tuples survive. Content stays at **899 findings**: 895 incomplete-row failures, one explicit unresolved ACT P1 outcome, and three aggregate evidence failures. The baseline retains the identical 65 existing failures, with eight exact current-member deltas under Josef's real September 7 correction authority; the sealed migration baseline is untouched.

Source: https://github.com/tonyzhaozh/act/blob/76cf30b4fed1d72dafbc3e1c270c0839d57e8bcf/imitate_episodes.py . Original FetchUrl response: 2026-09-07T12:15:10.160Z, tool-reported HTTP 200; preserved identity and supporting text read on September 7, not newly fetched. Captured response SHA-256: 68f26593c083e155f8a5b8eb167cb867301466952244520a046f9dc23b8cb2c8. Its query-frequency, time-indexed buffer, nonzero selection and normalized weights support the scoped inference; no article sentence is used as source proof.

Validation: 214 focused unit/component tests pass; two settled Playwright ACT-route tests pass at 375×812 and 1440×900, with twelve inspected screenshots, zero Axe violations, zero page errors, exact served/new-SVG byte equality, rendered math and seven references, tooltip bounds and no document overflow. Initial test-only failures (citation-table header, delta reason's multiplication asterisk, math-span count, font alias casing) were corrected without weakening the gates. Initial screenshot caret injection before hydration produced a warning; final captures wait for network idle and retain the initial caret, and the final run has no warning. Failed logs/captures remain in the evidence directory. Nonincremental no-emit TypeScript and full lint pass; changed-test lint also passes. Production build/full browser corpus were not run because the content prerequisite remains red; route compilation is not production-build evidence.

Only the verified dev-generated next-env type-path changes were restored to the original backup. PRODUCT_QUALITY.md and qa/findings.json are byte-identical. lastReviewed remains 2026-08-18 because this is not a complete ACT audit; the rewritten prose received a manual source-fidelity/no-filler read. No pricing, joint/gripper/loss-source expansion, navigation, feature-state, controller, fallback, security or publication action occurred.

Remaining generated-output gap: ACT's public/export OG card is stale after the citation count changes from six to seven. A single exact ACT candidate was rendered through the existing sealed boundary into mission evidence, not published into either generated tree. No full-card generation or out/HTML refresh occurred, and reading-time measurements were not regenerated. Release must refresh that exact affected generated card and the affected export through its existing gated mechanism. Remaining source gaps and independent Sol/high scrutiny/user testing are still required; next assigned batch is pricing provenance, not claimed complete here.

Evidence directory: `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/act-convention-authorized-corrections/` (source-proof.json, applied-spans.json, row-outcomes.json, exact-member-deltas.json, final-audit-counts.json, generated-staleness.json, protected-state.json; each executed gate has its exact command, timestamps, exit and log SHA-256 in a .receipt.json).


## Current-claim and identity checkpoint — 2026-09-07

The previous nine-held checkpoint below is historical. The same twelve DP identities now carry corrected claims (eleven) or the explicit unsupported-adoption cut (one), and the same TD3 identity now states reduction rather than elimination. Each exact original tuple is archived in its domain ledger; no claim row is added. DP is 25/25 complete. Derived corpus accounting: **98 complete / 896 incomplete / 994 identities / 47 articles**. All 85 previous complete records, 981 unaffected original tuples and six existing compound plans are preserved. Four new compound plans retain exact part/citation coverage and separately paired primary responses. New ACT proceedings proof and explicit Octo v2 support the nine-source identity record; original seven-author DP has a separate entry, and the extended entry is not mislabeled as that RSS edition. Exact source proof, current history, baseline deltas and fresh validation receipts are in `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/diffusion-current-claims-closeout`. The content gate remains red; no publication, independent scrutiny or release acceptance is claimed. Production build is not rerun while its content precheck remains red; normal trusted generated-file handling is not itself a cleanup blocker. Fresh results: 245 focused unit/component tests plus 11 citation-coverage tests passed; noemit/nonincremental TypeScript and lint passed. Content validation has 899 findings (896 incomplete rows plus three aggregate evidence findings), with 414/414 citation entries covered and the same nine separately unresolved citation checks. Baseline has the same 65 pre-existing failures, with nine exact composed member deltas approved and no added failures. Installed Playwright captured both required viewports on current content plus TD3. Stats/current text, safe citation links, keyboard tooltip/jump, zero page overflow, expanded twenty-author Octo byline and keyboard-scrollable mobile math were checked. Browser Back returns to the article but does not restore focus to the citation affordance; that navigation gap remains open. The initial collapsed-byline assertion was a probe error, resolved by exercising the existing Show all 20 authors control. No component, layout or security control was changed. Reading-time data was not regenerated; the displayed seven-minute DP value is not a fresh production measurement.


## Current authorized wording checkpoint — 2026-09-07

Seven source-backed Diffusion Policy correction packages (nine spans; ordinals 2, 3, 6, 7, 8, 16, 19, 22, 23) are now implemented under Josef’s September 7 authority. This supersedes the selected proposals’ historical approval hold, not their recorded source limitations. Exact current-versus-original correction history and supporting text are appended to `audit/manipulation.md`; command, baseline and rendering receipts are in `/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/diffusion-authorized-corrections`. No original row has been promoted using evidence for different wording: **85 complete / 909 incomplete / 994 rows / 47 articles**, DP **13/25**, manipulation **38/225**. The content gate remains red; no publication or acceptance is claimed. Previous checkpoints below are historical, not validation of the new prose. Fresh checks: 131 unit tests passed; nonincremental/no-emit TypeScript, lint, source-only no-slop and chart descriptions passed. Content validation still exits 1 with the same 912 findings. The exact eleven-manifest comparison retains 65 pre-existing failures and adds none after the scoped DP prose approval. The corrected local development route returned HTTP 200 with the new text and no KaTeX error marker. Chromium failed before launch because no usable sandbox is available; no security workaround was used, so required screenshots, viewport inspection and citation focus/return remain unverified. Production build was not invoked: its content prerequisite is red and its normal prebuild includes prohibited pruning. This is a local correction checkpoint, not release-ready evidence.


## Current acceptance status

The article audit is **not accepted**. Article-ID coverage did not establish
complete per-claim evidence. The earlier checker accepted a citation ID,
locator, document nickname, or internal-basis token anywhere in a row as if
that supplied the complete record. It did not.

Each claim table now requires separate `Citation ID`, `Source URL fetched`,
and `Supporting passage` columns, in addition to claim text and verdict.
The citation cell must identify one registered source. The URL is the
document actually fetched, and the passage is the text actually read there.
A source title, section pointer, or quotation in a generic note is not
automatically promoted into those fields. Filling the fields remains an
audit task, not a string-copying operation. Structural completeness alone
also does not prove that a passage supports its claim.

`npm run check:audit-coverage -- --json` reports the current record gaps.
`npm run check:audit-coverage -- --write-summaries` regenerates each domain's
row-unit summary without changing claim text, evidence, or verdicts. It
still exits nonzero while any claim lacks the required record. Those
generated summaries distinguish recorded verdicts from complete evidence.
Missing source passages must be recovered from sources, never invented.

The earlier narrative and counts in the historical sections below are
retained as historical audit claims, not current acceptance evidence.
The original tooling/accounting repair re-fetched no source, changed no
article prose, and moved no `lastReviewed` date.

### Current structured-record counts (pi0 finite closeout)

Counting unit: original article claim rows, not source renditions or partial P1 items. **The audit remains incomplete and unaccepted.**

| Domain | Articles with records | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|---:|
| manipulation | 12 | 225 | 38 | 187 |
| rl-sim2real | 7 | 167 | 23 | 144 |
| world-models | 5 | 92 | 4 | 88 |
| data-hardware | 6 | 128 | 3 | 125 |
| classical | 7 | 187 | 12 | 175 |
| frontier | 6 | 147 | 5 | 142 |
| adjacent | 4 | 48 | 0 | 48 |
| **Corpus** | **47** | **994** | **85** | **909** |

Of two assigned pi0 claims, only DP ordinal 21 is supported unchanged. Ordinal 22 remains held for the no-schedule/fewer-DDPM-steps conjunction. Diffusion Policy is **13 complete / 12 incomplete / 25 rows**. All 84 prior complete rows, 994 original projections and the entire six-plan compound catalog survive; the original projection SHA-256 remains `ea9322cafaec5a09303d8b70803df2d69566bc902382831977e2159b56c72f5c`.

The new scalar evidence uses the explicit v4 PDF-derived response, whose method prose prints A−epsilon. The contrary unversioned ar5iv sign, covariance-notation discrepancy, PDF extraction defects, beta cutoff/normalization details and inference-versus-execution quantities are preserved in the packet. No missing formula is fabricated. One pi0 P1 identity item is partial and unapplied; metadata's 2024 arXiv submission and RSS 2025 publication comment remain distinct. Three responses cover one paper, with one justified PDF fallback and no search.

Exact source/row provenance, one new unapproved correction and the finite-list update:
/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/diffusion-pi0-closeout/

No article, registry, relationship, date, catalog, schema, code, test, baseline or approval change. The four earlier DP proposals and finished TD3 determination are not repeated; ACT/pricing ownership remains separate. Reuse unchanged-code 117-test/nonincremental-TypeScript/lint proof from `0946948`; new scoped checks retain their actual exits and content findings. No duplicate completed-task gates, broad build/browser/full-unit run, push, Mission advancement or acceptance.

### Historical two-document distillation structured-record counts

Counting unit: original article claim rows, not documents, partial P1 items or historical verdicts. **The audit remains incomplete and unaccepted.**

| Domain | Articles with records | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|---:|
| manipulation | 12 | 225 | 37 | 188 |
| rl-sim2real | 7 | 167 | 23 | 144 |
| world-models | 5 | 92 | 4 | 88 |
| data-hardware | 6 | 128 | 3 | 125 |
| classical | 7 | 187 | 12 | 175 |
| frontier | 6 | 147 | 5 | 142 |
| adjacent | 4 | 48 | 0 | 48 |
| **Corpus** | **47** | **994** | **84** | **910** |

Of two assigned whole-row claims, only One-Step Diffusion Policy ordinal 20 is applied unchanged. Consistency Policy ordinal 19 remains held for the stronger untuned-teacher parenthetical. Diffusion Policy is **12 complete / 13 incomplete / 25 rows**. All 83 prior complete records, 994 original projections, other domain records and the entire six-plan compound catalog survive. The projection SHA-256 remains `ea9322cafaec5a09303d8b70803df2d69566bc902382831977e2159b56c72f5c`.

The OneDP rate is prediction plus observation encoding on a V100: 100-step DDPM 9+660 ms versus one-step 9+7 ms. The 10-step-DDIM real-trial baseline and 20-Hz robot cap are distinct. The CP teacher-quality ablation covers three teacher settings on Robomimic Square, not arbitrary untuned teachers. Two prepared identity items remain partial and unapplied for six-source P1. New 2026-09-07 retrieval supplied **four responses across two documents**: one metadata response and one usable body per paper. Actual body revisions are not inferred from landing versions.

Exact source provenance, row decisions, one new unapproved correction and the finite remaining-list update:
/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/diffusion-distillation-closeout/

No article/registry/date/catalog/code/relationship/baseline/approval change. Existing three DP proposals and the finished TD3 authority determination are not redone; ACT/pricing retain separate ownership. The unchanged-code 117-test/nonincremental-TypeScript/lint evidence from `0946948` is reused, not newly run. New scoped checks and real content-gate exits/counts are retained in this packet. No broad build/browser/full-unit rerun, push, Mission advancement or acceptance.

### Historical integration batch 4 structured-record counts

Counting unit: parsed article claim rows, **not** source documents, evidence items or historical verdicts. **The audit remains incomplete and unaccepted.**

| Domain | Articles with records | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|---:|
| manipulation | 12 | 225 | 36 | 189 |
| rl-sim2real | 7 | 167 | 23 | 144 |
| world-models | 5 | 92 | 4 | 88 |
| data-hardware | 6 | 128 | 3 | 125 |
| classical | 7 | 187 | 12 | 175 |
| frontier | 6 | 147 | 5 | 142 |
| adjacent | 4 | 48 | 0 | 48 |
| **Corpus** | **47** | **994** | **83** | **911** |

Twenty prepared candidates qualify after current whole-claim/binding review: **18 scalar records and two existing-correction records**. Diffusion Policy adds eleven; perception adds four and scene-representation five. No compound record is added. All 63 prior complete rows and all 994 original claim/source/verdict/note projections survive, with original-tuple SHA-256 `ea9322cafaec5a09303d8b70803df2d69566bc902382831977e2159b56c72f5c`.

| Article | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|
| bc-foundations | 14 | 8 | 6 |
| action-chunking | 32 | 17 | 15 |
| diffusion-policy | 25 | 11 | 14 |
| rl-for-robotics | 52 | 20 | 32 |
| why-rl-locomotion | 12 | 1 | 11 |
| parallel-sim-rl | 18 | 1 | 17 |
| reward-design-mpc | 23 | 1 | 22 |
| taxonomy | 20 | 1 | 19 |
| latent-dynamics | 21 | 3 | 18 |
| industrial-deployment | 52 | 3 | 49 |
| perception | 59 | 5 | 54 |
| scene-representation | 49 | 7 | 42 |
| safety-and-assurance | 40 | 5 | 35 |

Fourteen Diffusion Policy rows and three classical publication-bridge rows remain held. The finite ONE-article closeout identifies DP's remaining ordinals, actual source/version/implementation gaps, all three exact unapplied proposals and Josef's future precise approval requirement:

/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/integration-batch4/diffusion-policy-closeout.md

DP's landing 12-task/extended-body 15-task mismatch is distinct from the retained body's unresolved 100/10-versus-100/16 sampler conflict. Real reference settings, FiLM's Push-T exception, limited recommendation and extended/original/unpinned edition distinctions remain. Classical original 266/271 still lack publication-specific complete Zhang parameter-recovery proof; 333 lacks the KinectFusion publication/content bridge and whole two-source polarity support.

Zhang uses actual publisher abstract/date evidence; ClearGrasp retains its claim-scoped byline/text bridge; DSO uses actual journal full text (2017 online/2018 issue), not silently inherited 2016 conclusions. Curless–Levoy uses the actual retained Stanford PDF URL, with substantial matching primary text and identities, never a pretend ACM PDF fetch. DP row 12 and classical original 356 support already-corrected prose rather than the historical erroneous claims.

Completed proof is reused, not rerun for ownership: DP two response bindings/nine prior/thirty-seven packet excerpts/twenty-five row bindings; classical ten FetchUrl bindings/twenty-two publisher excerpts/seventy provider-field segments/four correspondences/ten retained captures/twenty-eight offsets. Integration verifies current packet/capture hashes, pairing and original/current wording. Preparation failures remain in the old packets. No new fetch, re-extraction, publication-year substitution or invented retrieval time occurs.

The entire compound catalog is byte-identical: four supported plans and two empty incomplete P1 plans. Partial identity counts are not whole-row completion. Original 1,163 and integrated 1,167 table-line preservation guarantees remain. MDX, registry, code, tests, baseline, approval records and article dates are unchanged. TD3's finished authority determination is not reassessed; ACT direction and pricing closeout retain separate ownership.

The full 73-case audit file, stable-tree preservation and regular-file content gate are recorded with real exits/counts in this batch's receipts. The unchanged 117-test/typecheck/lint evidence from `0946948` is **reused, not newly run**. No build/browser/full-unit rerun, push, feature advancement or acceptance. Independent Sol/high scrutiny, required user testing and complete release evidence remain outstanding.

/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/integration-batch4/

### Historical integration batch 3 structured-record counts (2026-09-06)

Counting unit: parsed article claim rows, **not** source documents, evidence
items or historical verdicts. **The audit remains incomplete and unaccepted.**

| Domain | Articles with records | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|---:|
| manipulation | 12 | 225 | 25 | 200 |
| rl-sim2real | 7 | 167 | 23 | 144 |
| world-models | 5 | 92 | 4 | 88 |
| data-hardware | 6 | 128 | 3 | 125 |
| classical | 7 | 187 | 3 | 184 |
| frontier | 6 | 147 | 5 | 142 |
| adjacent | 4 | 48 | 0 | 48 |
| **Corpus** | **47** | **994** | **63** | **931** |

Thirty-four of thirty-five prepared candidates qualify: **30 scalar or
existing-correction records plus four compound claim rows**. Manipulation
adds 21 (bc-foundations 5, action-chunking 16); classical adds 3 (perception 1,
scene-representation 2); rl-for-robotics adds 10. All 29 previously complete
records, all original claim/source/verdict/note cells and all populations
survive. The compact ordered original-tuple SHA-256 remains
`ea9322cafaec5a09303d8b70803df2d69566bc902382831977e2159b56c72f5c`.

| Article | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|
| bc-foundations | 14 | 8 | 6 |
| action-chunking | 32 | 17 | 15 |
| rl-for-robotics | 52 | 20 | 32 |
| why-rl-locomotion | 12 | 1 | 11 |
| parallel-sim-rl | 18 | 1 | 17 |
| reward-design-mpc | 23 | 1 | 22 |
| taxonomy | 20 | 1 | 19 |
| latent-dynamics | 21 | 3 | 18 |
| industrial-deployment | 52 | 3 | 49 |
| perception | 59 | 1 | 58 |
| scene-representation | 49 | 2 | 47 |
| safety-and-assurance | 40 | 5 | 35 |

The four new explicit compound plans bind manipulation original lines
73, 77, 79 and 101. Their ten required parts have eleven exactly paired
source items and ten supported, digest-bound adjudications. Required parts
retain the full conjunction, causal pause attribution, human annotation
burden and two-source date arithmetic as applicable; they were not reduced
to available evidence. Reviews identify the implementation
**agent/source-auditor**, not a human or independent validator.

**Held candidate:** manipulation original line 100 remains unchanged and
incomplete. Current prose states total 100–200 ms inference latency, but
RTC tested **added +100/+200 ms**. The prepared plan also omits the blog
named by the original source attribution. No qualifying prose is smuggled
into an evidence note. The two existing six-document P1 plans remain
byte-equivalent as objects, empty and incomplete: their six supported
partial items remain unapplied in the packet, alongside the actual metadata
gaps and contradictions. Enough items is not complete P1 coverage.

**TD3 authority resolved: not authorized, not applied.** The inspected
`VAL-B2-BASE-010` policy requires an exact approved old/new delta with owner
approval. The content-audit contract requires unsupported claims to fail
and corrections to be recorded; it does not explicitly delegate approval
of a new prose-member hash. The current owner brief and Mission boundary
forbid inferring that approval from older entries or this assignment.
Consequently the sentence, Cite, relationships, original row 167 and
approved-delta file remain unchanged. The already-returned precise
old/new/source boundary remains in the Mission's
`source-recovery-20260906/td3-correction-boundary.md`; no second approval
request or source fetch was made. This does not certify “fixed it” as true.

The completed source packets were reused after packet-hash and current
article/row checks: manipulation 16 preserved source records / 53 exact
excerpts, classical 16 capture hashes / 8 in-memory PDF derivations /
56 excerpts, and RL 17 request/result bindings / 71 excerpts. These are
reused source-worker checks, not new source reads. Actual supporting text
and fetched URLs are in the ledgers/catalog; each domain's batch-3 notice
points to the retained provenance and excerpt records. Source edition,
metadata and HTTP-status limitations remain explicit. No new request,
publication-year substitution or inferred fetch date was introduced.
arXiv 1812.11103 is the registered **Learning to Walk via Deep Reinforcement
Learning**, not the old supplied “SAC Applications” label.

Original manipulation line 93 and RL ordinal 8 support their **already
corrected** article accounts; they do not prove the historical erroneous
quotations. ACT's numeric ablation remains simulated and disables temporal
ensembling. Minitaur's approximate control-step/wall-time derivation and
QT-Opt's grasp-attempt/total-robot-hour quantities retain distinct units.
The other 22 classical and 8 RL prepared rows stay blocked; manipulation
retains 11 applicable incomplete rows plus 10 outside its document scope.
Known source conflicts, metadata problems, DAgger bounds, the held frontier
850 mm qualifier and separately owned ACT temporal-ensembling direction
are not resolved or reassigned by this checkpoint.

Production MDX, citation registry, code, tests, article `lastReviewed`,
immutable baseline and approval records are unchanged. Existing 117-test,
typecheck and lint results at `0946948` remain reusable for unchanged code;
they are not presented as new runs. No build, browser/export, full-unit
corpus or citation-network check is duplicated at this known-red checkpoint.
Independent Sol/high scrutiny, required user testing and complete release
evidence remain outstanding. No push, feature advancement or acceptance.

Batch-3 application, preservation and actual command/exit/log receipts:

`/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/integration-batch3/`

### Historical integration batch 2 structured-record counts (2026-09-06)

Counting unit: parsed article claim rows, **not** source documents, historical
verdicts, datasets or citation-registry entries.

| Domain | Articles with records | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|---:|
| manipulation | 12 | 225 | 4 | 221 |
| rl-sim2real | 7 | 167 | 13 | 154 |
| world-models | 5 | 92 | 4 | 88 |
| data-hardware | 6 | 128 | 3 | 125 |
| classical | 7 | 187 | 0 | 187 |
| frontier | 6 | 147 | 5 | 142 |
| adjacent | 4 | 48 | 0 | 48 |
| **Corpus** | **47** | **994** | **29** | **965** |

**Not accepted.** Eighteen of nineteen explicitly prepared candidates are
normalized: DreamerV3 3, Rudin 7, EVST 3, Marvel–Norcross 3 and OSHA 2.
Frontier original row 200 is held because the current 850 mm wording omits
the source's case-specific **at least** lower bound. This checkpoint makes
no factual correction and does not repair the claim only in an evidence note.
The eleven complete records at `0946948` are byte-identical; all 994 original
ordered claim/source/verdict/note tuples and article populations survive.
The two six-part P1 plans in `audit/compound-evidence.json` remain empty,
unreviewed and incomplete, with their bindings untouched.

The articles with complete evidence records are:

| Article | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|
| bc-foundations | 14 | 3 | 11 |
| action-chunking | 32 | 1 | 31 |
| rl-for-robotics | 52 | 10 | 42 |
| why-rl-locomotion | 12 | 1 | 11 |
| parallel-sim-rl | 18 | 1 | 17 |
| reward-design-mpc | 23 | 1 | 22 |
| taxonomy | 20 | 1 | 19 |
| latent-dynamics | 21 | 3 | 18 |
| industrial-deployment | 52 | 3 | 49 |
| safety-and-assurance | 40 | 5 | 35 |

Each new record contains its registered citation ID, actual fetched URL,
sufficient supporting text, source identity and observed historical retrieval
provenance. Completed source-worker identity, offset and hash checks were
reused after packet-hash and current-row/article checks; no document was
refetched. Dreamer task counts use arXiv v2 (17 April 2024), and its Nature
publication uses the distinct version-of-record title and 2 April 2025 date.
Rudin's unversioned full text is not relabelled as a pinned revision; bounds,
hardware and policy-update versus physics-step units remain explicit.
EVST is first-party vendor guidance, not independent market measurement.
Marvel–Norcross is a research manuscript, not fetched normative ISO/IEC text.
OSHA supplies the whole existing occupancy claim, not 2025 ISO clauses.

Unapplied findings remain blocked: the other nine Dreamer dispositions;
Rudin's original 172/236/337 corrections and 336 conflict; frontier's
850 mm lower bound and separate 1.6/2.0 m/s source inconsistency; prior
DAgger and TD3 corrections; and missing-source/compound records.
Production MDX, citations, data, code, tests and article `lastReviewed`
are unchanged. No prose-humanizer pass applies; audit accounting received
a manual read. No build, browser/export, full-unit or citation-network gate
is rerun for ownership. Prior unchanged typecheck/lint and three-file
117-test audit evidence at `0946948` are reused, not presented as new runs.
A local checkpoint is not permission to publish or advance Mission state.

#### Observed batch-2 checks

All invocations used `NODE_DISABLE_COMPILE_CACHE=1`, sequentially:

- Pure current-tree preservation check: exit 0. All 47 article sections,
  994 original tuples, 1,163 original table-line prefixes, 1,167 integrated
  table lines and eleven byte-identical complete records survive. Eighteen
  additions produce 29 complete / 965 incomplete records, with zero summary
  failures. The compact ordered-tuple projection SHA-256 remains
  `ea9322cafaec5a09303d8b70803df2d69566bc902382831977e2159b56c72f5c`.
  Canonical frontmatter was supplied to the current compound loader; both
  empty P1 plans, their bindings and the protected owner files are unchanged.
- `npm run test -- tests/unit/audit-ledger.test.ts`: exit 0, one file,
  **73 passed**, zero failed.
- `npm run validate:content`: exit 1. Schema/content passed for 47 published
  modules, 412 citations, 119 terms, 118 images and 111 companies. Source-only
  no-slop passed for 47 MDX files with 14 quotation exceptions; chart
  descriptions passed for 48 mounts in 43 files and 48 descriptions.
  The original piped audit log lacks its final count and remains an incomplete
  capture, not a complete count receipt.
- `node scripts/check-audit-coverage.ts`, with output directed to a regular
  file: exit 1, **968 findings** (965 incomplete claim records plus three
  aggregate evidence-field failures). Only this offline substep was repeated
  to recover the missing terminal count; schema/no-slop/chart checks were not
  rerun. Article membership is 47/47 and citation-ledger membership 412/412;
  nine separately named unresolved citation checks remain unaltered.
- Independent `git diff --check`: exit 0, no whitespace errors.

These are local normalization checks, not independent Mission validation.
No source was refetched and no source contradiction was resolved. An initial
packet-receipt check stopped before product writes because Rudin's verifier
had hashed its redirected stdout log before printing the final receipt.
The final log reports exit 0 and matches every corresponding `checks.json`
field; all source/candidate/offset artifact hashes match. That bookkeeping
failure and the incomplete content-gate capture are preserved, not relabelled.

### Historical integration batch 1 structured-record counts (2026-09-06)

Counting unit: parsed article claim rows, **not** distinct documents,
historical verdicts, dataset rows, or citation-registry entries.

| Domain | Articles with records | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|---:|
| manipulation | 12 | 225 | 4 | 221 |
| rl-sim2real | 7 | 167 | 6 | 161 |
| world-models | 5 | 92 | 1 | 91 |
| data-hardware | 6 | 128 | 0 | 128 |
| classical | 7 | 187 | 0 | 187 |
| frontier | 6 | 147 | 0 | 147 |
| adjacent | 4 | 48 | 0 | 48 |
| **Corpus** | **47** | **994** | **11** | **983** |

**Not accepted.** This integrated checkpoint combines three completed
source-recovery slices, not three accepted domain audits. The existing
registry-aware parser derives all counts above. The 11 complete records
retain nine recorded-verified and two previously corrected dispositions;
no historical verdict was promoted and no new production correction was
applied. All 994 original ordered claim/source/verdict/note records and
their article populations are preserved against `2cf7d6b`.

The recovered article populations are:

| Article | Claim rows | Complete records | Missing records |
|---|---:|---:|---:|
| bc-foundations | 14 | 3 | 11 |
| action-chunking | 32 | 1 | 31 |
| rl-for-robotics | 52 | 6 | 46 |
| latent-dynamics | 21 | 1 | 20 |

Source identity, actual passages, and observed retrieval provenance remain
in the individual ledgers. RL reused four preserved ar5iv bodies fetched
at the September 6 00:22 UTC session event; the old curl result records
sizes and exit 0, not HTTP status. DAgger used new FetchUrl responses
observed at 18:04:33.917Z and 18:04:42.594Z, with reported status 200.
Dreamer used FetchUrl responses observed at 18:12:13.364Z; only V1
completes a row. The V3 ar5iv HTTP-200 conversion-error page is not source
proof, and V2 is not substituted for V1 or V3. Integration made no new
source request. The remaining-source candidate manifest is planning only,
not claim verification.

Unresolved production findings remain explicit: TD3's "fixed it"
overstatement in `rl-sim2real.md`; the unqualified DAgger linear task-cost
bound, horizon-dependent `u`, and true-versus-empirical epsilon distinction
in `manipulation.md`; and the Dreamer V1/V3 source attribution, unsupported
"entire source of the sample efficiency" strengthening, missing V3 body,
and publication/version boundaries in `world-models.md`. Multi-source
metadata and compound rows remain incomplete. This audit-only integration
does not alter article prose, citations, data, parser rules, tests, or
`lastReviewed`, and does not resolve the separately recorded network gaps.

Combined-tree preservation/source checks, the focused 30-test audit file,
the content/audit invocation, and the independent whitespace check are
recorded with exact HEAD, diff, and file hashes under
`/home/remy-simpc4/.factory/missions/fd137388-f254-4d11-97b1-548904d2cad2/validation/brand-v2-editorial/source-recovery-20260906/integration-batch1/`.
Those invocation records, not the earlier six-record results below, are
the integration evidence. No broad unit, typecheck, lint, build, browser,
or network gate is rerun for this audit-only checkpoint. The content gate
remains red. A local checkpoint is not permission to push, publish, accept
the feature, or advance Mission validation state.

### Historical four-paper checkpoint and ownership boundary

The bounded CQL / robomimic / RLPD / TD3 recovery began at **0 complete /
994 missing** and completed six existing rows in `rl-for-robotics`:
that article is **6/52 complete, 46 missing**; the RL domain is **6/167
complete, 161 missing**. At that checkpoint the corpus was **6 complete /
988 missing**; the other six domains were unchanged. Every original
claim, source, verdict and note cell and all article/row populations were
retained. No source was fetched again; four preserved September 6 00:22 UTC
ar5iv bodies were checked by identity, source passages, byte count and hash.
The historical curl result did not record HTTP status, and no HTTP-200 or
current-liveness claim is made.

One direct TD3 row remains incomplete because "fixed it" overstates the
paper's reduction/limitation result; its precise unapplied correction is
recorded in `rl-sim2real.md`. The 27-source P1 batch and other multi-source
rows remain incomplete rather than being assigned one convenient source.
No production prose, citation, data, parser, test or `lastReviewed` changed.
This is partial evidence recovery, **not article, feature or release acceptance**.
The content gate remains red; no push or build is authorized by these counts.

Recount with `NODE_DISABLE_COMPILE_CACHE=1 npm run check:audit-coverage -- --json`;
the slice regenerated only the RL summary with the existing
`parseLedger` / `withLedgerSummary` functions, not a global migration.

Actual focused checks for this slice: `NODE_DISABLE_COMPILE_CACHE=1 npm run
test -- tests/unit/audit-ledger.test.ts` passed all 30 tests in one file
(exit 0). `NODE_DISABLE_COMPILE_CACHE=1 npm run validate:content` passed
schema/content, source-only no-slop and chart-description checks, then
failed the audit with **991 findings: 988 incomplete claim rows plus three
corpus field-count failures** (exit 1). All 47 article IDs and 412 citation
ledger IDs reconcile; nine recorded network-check gaps remain separately
named by that invocation, not re-probed or resolved here. No build, browser,
full-unit, lint or typecheck rerun was performed.

The subsequent final-preservation attempt failed on concurrent DAgger
edits, before its chained `git diff --check` ran; it produced no successful
final-verification artifact and no commit. The preserved read-only
18:18:14.218Z ownership-boundary snapshot then observed **10 complete /
984 missing**, with the README still at six. The failure log and
`rl-four-paper-slice/concurrency-boundary.json` remain historical evidence.
Only after all contributing workers stopped did the owner authorize this
four-file integration and its separate checks. The old mutating RL helper
was not rerun against the combined tree.

## Historical coverage claims and counts

This directory is the evidence trail for the claim in the wiki's README
that every published article was checked against its cited primary
sources. It exists so a reader can check that claim rather than take it
on faith. The ledgers are committed to the repository alongside the
content they vouch for, like `/research`.

### Earlier claimed coverage

Every published article (all 47 across the seven domains), the four
structured data files behind them (`data/methods.ts`,
`data/hardware.ts`, `data/datasets.ts`, `data/teleop-rigs.ts`), the
market-map dataset (`data/companies.ts`, 111 records), and the whole
citation registry (`data/citations.ts`, all 412 entries, re-audited
end to end on 2026-09-06).

That first sentence is now checkable rather than asserted. Five articles
published on 2026-08-22 sat outside these ledgers for a fortnight while
this page still said "every published article", because nothing compared
the two sets. `npm run check:audit-coverage` derives the published set
from the module registry and the audited set from the ledgers below, and
fails when they disagree in either direction, when a domain's population
is empty, when an article has a heading but no checked claim, or when a
claim row names no source. It runs inside `npm run validate:content`, so
publishing an article without auditing it now breaks the build.

The citations row had the same defect one scope down and now has the same
answer. The per-entry table in `citations.md` had covered 300 entries since
2026-08-16 while the registry grew to 412, and the gap was tracked by a
hand-written scope note. `lib/audit-citation-coverage.ts` reconciles the
registry against that table in the same gate, so a citation entry with no
audit row breaks the build too.

| Ledger | Covers | Claims checked | Verified | Corrected | Cut | Unresolved |
|---|---|---|---|---|---|---|
| manipulation.md | 12 manipulation articles + methods.ts | 225 article rows (71+66+88) + 16 registry rows | 213 + 12 | 15 rows (13 distinct defects) | 0 | 0 |
| rl-sim2real.md | 7 RL/sim2real/locomotion articles | 115 + 52 rows | 108 + 43 | 7 rows (6 defects) + 8 rows | 0 | 1 |
| world-models.md | 5 world-models articles | 92 rows | 76 | 16 rows (11 defects) | 0 | 0 |
| data-hardware.md | 6 data/hardware articles + 4 data files | 84 + 52 rows | 57 + 30 | 25 rows (21 defects) + 17 rows | 2 + 1 | 4 |
| classical.md | 7 classical articles | 79 + 108 rows | 73 + 99 | 6 + 9 | 0 | 0 |
| frontier.md | 6 frontier articles + 4 lib files | 108 + 40 rows | 80 + 37 | 26 rows (24 defects) + 1 row | 0 | 1 |
| market-map.md | 111 company records + timeline | 98 ledger rows over 111 records | 14 V | 46 C (+21 C+N, and see ledger) | 1 record removed | 1 |
| citations.md | 412 citation-registry entries | 412 | 397 (378 ok + 19 exceptions, 2026-09-06 run); 5 titles unavailable | see ledger | 0 | 10 |
| adjacent.md | 4 adjacent-domain articles | 48 rows | 47 | 1 | 0 | 0 |
| **Total** | **47 articles + all structured data + full registry** | **1,529 rows** | **1,286** | **177 rows** (+21 market-map C+N) | **4** | **17** |

Counting unit for this table: ledger rows (the citations ledger counts
registry entries, one per row of its table). Every cell above is counted
from the ledger's own tables; the Total row is the column sum, shown
exactly: 241+167+92+136+187+148+98+412+48 = 1,529 rows checked;
225+151+76+87+172+117+14+397+47 = 1,286 verified (the citations ledger's
397 is its 378 ok plus 19 documented exceptions; 5 more entries are
counted in its 412 rows but sit outside the verified column because their
titles were unavailable to the checker, and 10 are unresolved — 378 + 19 +
5 + 10 = 412);
15+15+16+42+15+27+46+0+1 = 177 corrected rows, plus the market-map ledger's
21 combined C+N rows that its own summary reports separately.

The four domain figures that changed carry a 2026-09-06 reseal addendum in
their own ledger, adding 252 rows over the five articles published on
2026-08-22 (rl-for-robotics 52, perception 59, scene-representation 49,
industrial-deployment 52, safety-and-assurance 40): 209 verified, 35
corrected, 1 cut, 6 unresolved, and 1 source inconsistency, which is the
verdict class this table has never had a column for (frontier already
carried 2). Three unresolved rows and the S row are named findings, not
skipped work: each says in its own row which source was fetched and why it
does not settle the claim.

`check:audit-coverage` counts a smaller number than this table for two
ledgers, and the difference is a convention, not a disagreement. It counts
only rows under an article heading, so the 16 manipulation registry rows,
the 4 data-hardware data-file rows and the frontier registry-sweep row are
outside its population; it reports 994 article rows where this table
reports 1,529 rows over a wider scope. The citation registry is the same
scope in both: 412 rows here, and the `citations 412/412` line the gate
prints.

(Derivability note for the citations row, stated on this page per the
convention above: the 412 registry entries break down as 378 title-verified
+ 19 documented exceptions + 5 titles-unavailable + 10 unresolved. The
per-entry table in `citations.md` now has one row per registry entry, and
`check:audit-coverage` fails if that stops being true, so the row is
derivable from the ledger rather than from a note. The 10 unresolved are
listed by id and by reason in the ledger's 2026-09-06 re-audit section:
one year disagreement reported as a title mismatch, three pages whose
title is not the document's, three hosts that did not answer, and three
bot walls with no DOI to fall back on. None is a dead link.)

(The market-map totals count ledger rows, each row naming at least one
record; several records were verified, corrected and nulled in one row, so
column arithmetic there is approximate in exactly the way its own summary
states. Where any other ledger aggregates, the aggregation is stated in
the row and the header, per the counting convention below.)

## Counting convention (applies to every ledger)

**Corrected counts DISTINCT DEFECTS unless a ledger says otherwise in its
own summary.** A single defect fixed in three places (article prose,
`data/*.ts`, closing paragraph) is one defect and three `C` rows. When a
header and a table disagree, the header's unit is authoritative and the
tables are its evidence; `data-hardware.md` is the worked example (21
defects across 25 corrected rows, with the four multi-row defects named).

**Every header total is derivable from the rows beneath it, under the unit
the header states.** A reader with the ledger open must be able to count
their way to every number: count the rows, group them by verdict, and land
exactly on the header. Where units are mixed, the header shows the
arithmetic ("21 distinct defects across 25 `C` rows"; "76 + 16 = 92 rows").
A header total a reader cannot reproduce from the tables is a defect in
itself, whatever direction it errs in, and an overstatement is the worst
case: it claims verification the tables do not evidence.

**An aggregating row must say what it aggregates and how it counts.** A
ledger row may stand in for several table cells, dataset records or
sub-claims, but only when the row itself names its scope (the market-map
identity row names all 21 records it covers) or the header states the
aggregation ("the 10 PolicyChunkingTable rows are counted individually
here"). Silently reusing a total computed under a different unit than the
tables publish is the failure this rule exists to prevent; it is what the
2026-08-18 reconciliation sweep found in five ledgers and repaired by
recounting every header from its own tables.

## The five audit properties

Each claim was checked against these (the VAL-AUDIT contract):

1. **Bibliographic fidelity** — the cited source exists, is reachable, is
   the intended document, and its registry entry (title, authors, year,
   venue) matches the document itself.
2. **Numeric traceability** — every number (success rates, sizes, prices,
   DoF, funding, dates) is stated by the cited source, with its unit and
   its context (task, protocol, hardware, configuration).
3. **No unsupported attribution** — positions attributed to named people
   or organizations are their actual positions, quoted or faithfully
   paraphrased, not sharpened.
4. **Honest unknowns** — values no source publishes render as "not
   disclosed" (exists, withheld) or "n/a" (does not apply), never
   estimated or interpolated.
5. **Represented disagreement** — where serious people disagree, both
   sides appear with named proponents.

## Method

A claim is checkable if a source could confirm or contradict it: numbers,
names, origins, benchmark results, attributed positions, comparative and
superlative claims. Explanation and interpretation are not claims and are
not padded into ledgers. For each checkable claim the auditor fetched the
cited source (arXiv abstract pages and PDFs, vendor pages, press releases,
dataset cards, Crossref metadata for bot-walled DOIs, dated Wayback
captures for http-only canonicals), read the relevant part, and recorded a
verdict:

- **verified (V)** — the source states the claim. The row names the source
  and where in it the claim lives.
- **corrected (C)** — the source says something different. The article or
  data file was fixed to match the source in the same change, and the test
  suite updated where it asserted the old value.
- **cut (N/X)** — no source states the claim, or no credible source
  carries it. The claim was deleted, not softened. Hedging an
  unverifiable number is treated as a defect, not a fix.

A ledger row that names no specific source is not evidence. Every row
here names one. `research/*.md` reports are not sources; they are prior
summaries, and eight of their fabrications are documented in
`library/content-quality.md` (all traced to zero live occurrences by the
2026-08-18 sweep).

## Editorial conventions decided by the consolidation pass (2026-08-18)

**Author attribution for non-arXiv lab documents.** Convention: **named
author lists wherever a full list exists; organization-as-author only
when the document itself names no individuals.** Applied to Physical
Intelligence's lab documents: `pistar06-2025`, `pi07-2026` (80 authors
from the PDF title page), `pi07-blog-2026` (83 from the blog page),
`pistar06-blog-2025` (55, same team as the PDF), and
`knowledge-insulation-2025` (10 from the note's foot) now carry named
lists; `pi06-model-card-2025` keeps `['Physical Intelligence']` because
the model-card PDF names no individuals. This matches the arXiv
convention already used everywhere else in the registry. Citation chips
render the first author's surname, so chips changed (e.g. "Physical
Intelligence 2026" became "Ai 2026"); affected e2e specs were checked.

**Quotes from superseded paper versions.** Convention: **the registry URL
must serve the text the reader is pointed at.** When an article quotes a
sentence that exists only in an arXiv version later revisions dropped,
the registry entry cites the versioned URL (`arxiv.org/abs/XXXX.XXXXXv1`)
with a comment naming the policy; otherwise the default unversioned abs
URL stands. Applied to `lin-humanoid-sim2real-2025` (the "much more
laborious real-to-sim engineering efforts" quote is v1-only; v2 dropped
it). Sweep result: this is the only version-sensitive quote in the
registry. The other candidate (Isaac Lab, arXiv 2511.04831) is v1-only,
so its unversioned URL is already exact. `tests/unit/citations.test.ts`
and the schema doc accept the versioned form for this purpose.

**Robot-spec figures attributed to a paper.** The error class that
survived three manipulation audits (ACT described as "two 7-DoF arms";
the paper says two ViperX 6-DoF arms, 14-dim = 6 joints + gripper per
arm) was swept repo-wide on 2026-08-18. One live instance found and fixed
(`action-chunking.mdx`); `cross-embodiment.mdx`'s "7-DoF Franka emits 8
numbers" is correct (7 joints + gripper); every other DoF figure in
published prose (22-DoF SharpaWave, 21-DoF Sanctuary, 56-DoF Atlas, 23-43
DoF G1, 31-DoF H2, 16-DoF Figure 02 hand) was verified during its own
domain audit.

**Date-plausibility of citations.** Every registry entry whose source is
cited as the origin of a dated statement was checked for
date-impossible attributions (a source predating the event it purportedly
documents). The frontier audit had found one (a DROIDS community post
cited as the origin of a Musk X post, published two days before the post
existed; re-cited via Teslarati). The 2026-08-18 sweep found no others.

## How to re-run the checkers

```bash
npm run validate:content    # content-pipeline validation; prints the live corpus
                            # counts (47 modules, 412 citations, 111 companies)
npm run check:links             # liveness of every registry URL (bot-walls via Crossref)
npm run check:citations         # identity: fetched title vs registry title, per entry
npm run check:dataset-sources   # liveness of every market-map company source URL
```

The three network checkers all exit non-zero on any dead link, unexplained
bot-wall, or title
mismatch. Machine-unverifiable URLs need a documented exception in
`data/link-check-exceptions.ts` (citation registry) or
`data/dataset-source-exceptions.ts` (market-map dataset), each recording
reason, verification method and date. An exception whose URL starts
passing again is reported STALE by the liveness sweep and must be removed,
unless it covers a failure mode a passing fetch cannot see: title-mismatch
exceptions (only the citation checker observes them) and documented
transient-error exceptions such as the Sutton archival mirror's
intermittent TLS resets (a single passing fetch is not evidence an
intermittent failure went away).

Last full run: 2026-09-06 — check:citations 412 checked, 378 ok (73
verified via Crossref) + 19 documented exceptions, 5 titles unavailable, 4
title mismatches, 0 dead, 3 blocked, 3 error, 2 archival captures; exit 1
on the ten unresolved entries the ledger names. Not clean, and not
claimed to be. `check:links` was re-run over the same 412 entries on
2026-09-06: 391 live (26 verified via Crossref), **0 dead**, 3 blocked
(technology-org-deployed-2026, a3-orders-2025, kroger-ocado-closures-2025),
3 error (ng-reward-shaping-1999, astrom-murray-2008, mcgee-schmidt-1985),
15 documented exceptions; exit 1 on those six. All six are inside the ten
unresolved ids `check:audit-coverage` already prints, so the two network
gates agree and neither reports link rot. The earlier note here said this
sweep had not been run at 412 entries, which was true when written and is
the fourth stale scope sentence this ledger has carried; it is replaced by
the measured run rather than amended.

Operational note: `check:links` does complete in this harness when it is
launched detached (about 100 seconds for 412 URLs), the same finding
`check:citations` produced on 2026-09-06. Four earlier passes recorded it
as unrunnable; that was a property of foreground invocation, not of the
gate.

The dataset-source gate made the market-map URL sweep reproducible for the
first time (it was previously a one-off `curl` pass). Its first full run
the same day found real rot: 223 URLs across 111 records — 150 live, 19
blocked (bot-walls), 10 error (inconclusive), and 44 dead, with 9 records
left without a single live source. **Resolved 2026-08-18
(market-map-source-refresh):** every dead URL was replaced with a live
source for the same claim or removed where a live duplicate already
covered it, no figures changed, and every remaining bot-wall /
machine-unverifiable URL was verified live by independent fetch and
documented in `data/dataset-source-exceptions.ts` (18 entries at commit
3c165df; the file held 0 entries at 4b520a3, so 18 were added — both
counted from the committed files 2026-08-18; the "17 entries" first
stated here was an assertion, not a count). The gate exits 0: 207 URLs
across 111 records — 197 live, 0 dead, 0 blocked, 0 error, 10
documented exceptions. CORRECTED 2026-08-18 (determinism fix, see
`market-map.md`): this paragraph first stated "190 live, 17 documented
exceptions", a split that was not reproducible — undici's 16 KiB
default maxHeaderSize aborted Yahoo fetches nondeterministically
(UND_ERR_HEADERS_OVERFLOW). The sweep now uses an undici Agent with a
64 KiB maxHeaderSize, the 6 Yahoo finance/tech URLs are verified live
by the gate itself, their 6 exception entries were removed (12 remain),
and two consecutive runs printed byte-identical summaries. The totals
(207 URLs, 0 dead, 0 error) are the reproducible result; any
live-versus-exception split recorded before the fix was a snapshot of
one run.

Updated 2026-08-18 (second-sourcing): two additional dataset sources
were added (rhoda-ai, wonik-robotics — see the ledger rows in
`market-map.md`), taking the gate's reproducible total to 209 URLs
across 111 records, 0 dead, 0 error, 10 documented exceptions. Both new
URLs were probed live with the gate's own browser user agent before
being written and are verified live by the gate itself; no figure
changed and every existing source was retained.

Updated 2026-08-18 (provenance transparency): the market map's
source-count distribution, recounted from the committed
`research/04-market-map-companies.json` (counting `sources.length` per
record with `node`): **111 records — 1 source: 34, 2 sources: 55,
3 sources: 17, 4 sources: 5; 34 + 55 + 17 + 5 = 111; total source
entries (1×34) + (2×55) + (3×17) + (4×5) = 34 + 110 + 51 + 20 = 215.**
Single-sourcing is compliant with the dataset rules and is not itself a
defect. Two known limits sit inside that distribution, both named rather
than padded (see the provenance-transparency section of
`audit/market-map.md` for the per-record rows):

- **Aggregator concentration:** 6 records remain solely sourced to
  humanoidindex.org (kepler-robot, clone-robotics, booster-robotics,
  leju-robotics, hanson-robotics, paxini), and for 5 of the 6 no fetched
  independent source confirms the recorded figure — several independent
  reports point at different numbers. These figures stay as recorded
  under the provenance-only rule of that pass; correcting them is
  per-record audit work that moves rendered figures and earns a full e2e
  run.
- **First-party-only records:** 8 records remain solely sourced to the
  company's own site. Seven (micro1, farm-ng, shadow-robot,
  xela-robotics, starship-technologies, knightscope,
  pollen-robotics) are first-party by nature — product names,
  descriptions and founding years, no self-reported valuation or
  headcount; zebra-robotics-automation's acquisition claim is
  independently corroborated in the ledger but its only machine-live
  source is the company's own pressroom.

The same pass added 6 source entries, and only 3 of them are independent in
the sense that matters (a different PUBLISHER, not a different host):
mentee-robotics (startuphub.ai), humanoid-uk (therobotreport.com) and
avidbots (techcrunch.com). The other 3 are wire copies of the companies' own
releases — sharpa and mytra on PRNewswire ("SOURCE Sharpa", "SOURCE Mytra")
and brain-corp on vcnewsdaily (a verbatim mirror of its own 2020 release) —
which buy a second machine-live host, i.e. durability, and not independent
corroboration. The 2026-08-18 evidence-tier correction below re-sourced
sharpa properly. The same pass also documented the
hardened coindesk.com 429 (neura-robotics) as an exception entry in
`data/dataset-source-exceptions.ts`, whose reason records it accurately as a
persistent rate-limit bot-wall rather than link rot. That file holds **13
entries** at HEAD — counted from the file itself, by importing the exported
array (`npx tsx -e "import {DATASET_SOURCE_EXCEPTIONS} from
'./data/dataset-source-exceptions.ts'; console.log(DATASET_SOURCE_EXCEPTIONS.length)"`
→ 13) and cross-checked with `grep -c "^    url: '"` → 13. Note that
`grep -c 'url:'` returns 14 because it also matches the interface field
declaration. **The file's entry count and the gate's per-run exception count
are two different integers:** the same run reported 11 documented exceptions,
which is smaller because 2 flake-host entries (allegrohand.com,
chinadailyhk.com) answered live in that run and were counted live, not
excepted. The run's reproducible total was 215 URLs across 111 records —
204 live, 0 dead, 0 blocked, 0 error, 11 documented exceptions; two
consecutive runs printed identical summaries, exit 0 both times. No
figure changed: stripping every `sources` array from the dataset leaves
the remaining payload byte-identical to the prior commit.

Updated 2026-08-18 (evidence-tier correction): three source entries were
added to repair two mislabelled records, no figure changed and no source
was removed. wonik-robotics gained an independent trade source
(therobotreport.com) so that its existing wonikrobotics.com entry can be
described honestly as a same-publisher durability addition; sharpa gained
NVIDIA's own newsroom for the Isaac GR00T claim and a robotics trade outlet
for the CES 2026 North claim, so that its PRNewswire entry can be described
honestly as Sharpa's own release on a wire. Recounted from the committed
`research/04-market-map-companies.json` with `node` over `sources.length`:
**111 records — 1 source: 34, 2 sources: 53, 3 sources: 18, 4 sources: 6;
34 + 53 + 18 + 6 = 111; total source entries (1x34) + (2x53) + (3x18) + (4x6)
= 34 + 106 + 54 + 24 = 218**, superseding the 215 above. All three URLs were
probed live with the gate's own browser user agent before being written.

## Historical: Unresolved items

This earlier market-map note is not the current article/citation gap count.

Exactly one, recorded in `market-map.md`: the eka-robotics /
foundry-robotics funding fields rest on sources that could not be fetched
or corroborated this cycle; the row records the blocker rather than
dropping it.

## What "corrected" and "cut" mean

"Corrected" means the wiki's text or data now matches what the fetched
primary source says, with the old value recorded in the ledger row.
"Cut" means the claim was removed entirely because no fetched source
states it; it never means the claim was reworded to sound more cautious
while keeping the number.

## History

Per-domain passes ran 2026-08-15 to 2026-08-18 (manipulation in three
parts, then rl-sim2real, world-models, data-hardware, classical,
frontier, market-map, citation reachability). The consolidation pass
(2026-08-18) closed every recovered handoff item, audited the four
adjacent-domain articles, decided and applied the two registry
conventions above, re-fetched every claim resting on the discredited
2026-08-09 pass, and wrote this README.

The reconciliation sweep (2026-08-18) recounted every ledger header from
its own tables and repaired the published totals: the manipulation
ledger's Part 2 summary had claimed 73 article rows with 69 verified where
the tables hold 66 rows with 61 verified, and that figure had propagated
through the domain close-out and this README; the same recount fixed
data-hardware's unreachable "Verified: 61", world-models' corrected count,
and the rl-sim2real and adjacent headers. It added the derivability and
aggregation rules to this convention, named the 21 records behind the
market-map identity row, applied the founded-year rule consistently
(the-bot-company's founded 2024 nulled like dyna-robotics'), corrected the
registry-id mis-cite in the classical ledger, settled the orphan-registry
policy note, and gated dataset-source liveness (`check:dataset-sources`).
No article's factual content changed and no verdict was altered by the
recount.

The batch-3 re-verification (2026-08-18) revisited the twelve remaining
records whose fields came from the b1b161f aggregator pass, after the six
checked at ba0c1e9 all proved defective: 10 of 12 were corrected, 2
confirmed, and 8 corrections nulled a figure the sources only hedge or
contradict. The dataset grew 229 → 249 URLs, all live or documented
exceptions on two identical consecutive gate runs (exit 0). One host fact
recorded for future passes: thenextweb.com answers HEAD with 404 while
serving GET 200, so its articles can be fetched as evidence but cannot be
carried as dataset sources under the gate's HEAD-first check, and dead is
never exceptable.
