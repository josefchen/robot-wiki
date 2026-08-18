# Citation reachability and identity audit (VAL-AUDIT-008)

Date of audit: 2026-08-16. Scope: all 300 entries in `data/citations.ts`.

Tool: `npm run check:citations` (`scripts/check-citations.ts`). For every
registry entry it fetches the URL with a real browser user agent, records the
full redirect chain, extracts the fetched document's title (HTML title tag,
`citation_title`/`og:title` meta, or the PDF's first page via pdftotext), and
compares it against the registry entry's title for plausibility. A URL that
returns 200 but serves a different document fails the run; that title check
is the point of the audit. Bot-walled DOI entries are verified through
Crossref metadata (title and year must match); genuinely machine-unverifiable
entries need a documented exception in `data/link-check-exceptions.ts`.

To re-run and regenerate the table below:

```
npm run check:citations                 # human-readable report, exit 1 on any failure
npm run check:citations -- --json       # machine-readable
npm run check:citations -- --markdown   # the table below, minus the action column
```

The command is registered in the mission manifest (`services.yaml` →
`check-citations`) so later per-domain audits can re-run it. It is
deliberately NOT a build gate: 300 network fetches would make every build
slow and flaky offline.

## Result of this run

Checked 300 entries: 287 ok (title verified against the fetched document; 45
of those through Crossref metadata behind publisher bot-walls or JS-shell
pages), 2 title unavailable, 0 title mismatches, 0 dead links, 0 blocked, 0
errors, 11 covered by documented exceptions. Exit code 0.

## Corrections made in this audit (registry edits)

- **vla-perf-2026**: the registry carried a descriptive label ("VLA-Perf:
  Systematic Latency Analysis...") and "NVIDIA Research" as the author. The
  live arXiv page (2602.18397) titles the paper "How Fast Can I Run My VLA?
  Demystifying VLA Inference Performance with VLA-Perf" by Wenqi Jiang,
  Jason Clemons, Karu Sankaralingam and Christos Kozyrakis. Both corrected.
  This is exactly the wrong-document/wrong-metadata class the audit exists
  to catch: the URL was reachable all along.
- **mem-2026**: registry title "VLAs with Long and Short-Term Memory" was a
  paraphrase. The PDF's title page reads "MEM: Multi-Scale Embodied Memory
  for Vision Language Action Models". Corrected.
- **mishra-1987**: registry title said "Multifingered"; the Springer/Crossref
  record for doi 10.1007/BF01840373 says "multifinger". Corrected.
- **mujoco-2012**: url was the IEEE Xplore page, a JS shell that serves no
  title in raw HTML. Moved to the DOI (https://doi.org/10.1109/IROS.2012.6386109),
  which the checker verifies through Crossref.
- **astrom-murray-2008**: url was https://fbsbook.org/, which now 301-redirects
  through four hops to the FBS wiki home page ("FBSwiki"). Moved to the wiki's
  page for the book itself, which carries the book's title.
- **1x-neo-2026 / bd-atlas-2026**: registry titles were our descriptive
  labels ("1X NEO Product Page", "Atlas Product Page") rather than the pages'
  titles. Aligned to the live pages ("NEO Home Robot", "Atlas Humanoid
  Robot").
- Test coupling updated in the same change: `tests/e2e/control.spec.ts`
  asserted the old fbsbook.org href for the Åström chip, and
  `lib/pendulum.ts` documented it; both now point at the fbswiki book page.

## Documented exceptions added (data/link-check-exceptions.ts)

- **kalman-1960** (title-mismatch): the cited DOI is the 2009 Wiley Online
  Books chapter republication, so Crossref reports 2009 against the
  registry's 1960 (the original Bol. Soc. Mat. Mexicana paper). Title matches
  exactly; same reprint-vs-original pattern as ziegler-nichols-1942.
- **levenberg-1944** (title-mismatch): AMS serves the journal masthead
  ("Quarterly of Applied Mathematics") as the page title. Crossref confirms
  title and 1944 year.
- **knowledge-insulation-2025** (title-mismatch): the pi.website research
  page's title tag is the note's tagline; the page body names "Knowledge
  Insulation" five times.
- **gtsam-2026** (title-mismatch): gtsam.org's title tag is a tagline; the
  page body states "Georgia Tech Smoothing and Mapping".
- **maestro-tavac-2023** (blocked): sages.org serves a Cloudflare challenge
  to curl, node fetch and headless Chromium alike. Document identity
  confirmed through the search index (exact URL, 2023-01-31, authors
  "Ruben D. Salas Parra MD and David Pechman MD, FACS" match the registry).
- **mcgee-schmidt-1985** (error): ntrs.nasa.gov suffered a host-side outage
  across the whole audit window (TCP never opens; DNS resolves). The URL was
  fetched live by the liveness sweep earlier the same day, and the search
  index confirms the document. Remove the exception once NTRS answers
  machine clients again.

## Consolidation update (2026-08-18, audit-ledger-consolidation)

- **mcgee-schmidt-1985: exception removed.** NTRS answers machine clients
  again; `npm run check:links` and `npm run check:citations -- --id
  mcgee-schmidt-1985` both pass it unaided (title verified, live fetch,
  run 2026-08-18), so the exception entry was deleted from
  data/link-check-exceptions.ts exactly as its own instruction required.
- The four title-mismatch exceptions (kalman-1960, levenberg-1944,
  knowledge-insulation-2025, gtsam-2026) remain in force: the failure modes
  they cover are invisible to the liveness sweep, and the audit checker
  still needs them. Their entries were re-dated 2026-08-18 with fresh
  verification. A liveness-sweep bug that reported these as STALE (because
  the URL is HTTP-200) was fixed: title-mismatch exceptions are now exempt
  from the liveness sweep's staleness check, since only the audit checker
  can see their failure mode.
- **sutton-bitter-lesson-2019**: added as an error exception on 2026-08-18;
  archive.org intermittently resets TLS connections from this network
  (4 consecutive resets observed) while the capture itself is live
  (independent fetch returned the full essay).

## Honest gaps (title unavailable, not failures)

- **lavalle-1998**, **lavalle-kuffner-2001**: the author-hosted PDFs on
  lavalle.pl use early-LaTeX Type 3 fonts with no usable text layer; pdftotext
  output in every mode is symbol soup, so no title can be extracted and
  compared. The URLs are the canonical author copies and fetch fine (HTTP 200,
  application/pdf); only the title comparison is impossible. Recorded here
  rather than papered over.

## http-only sources: the archival-capture policy

The registry requires https, and that rule stands. The sanctioned escape
hatch for a canonical source that is genuinely http-only is a DATED
web.archive.org capture (itself https), per the decision recorded 2026-08-12
in `library/content-quality.md` (mission library), with the worked case being
Sutton's The Bitter Lesson. As of this audit the pattern is now encoded in
three places:

1. `data/schemas/citation.ts` documents the pattern and rejects undated or
   wildcard archive URLs (a dated capture is content-addressed and stable;
   `https://web.archive.org/web/*/...` is neither).
2. The `data/citations.ts` registry header documents it for entry authors.
3. `scripts/check-citations.ts` recognizes dated captures via
   `parseArchivalCapture` (lib/citation-audit.ts) and checks them like any
   other citation, marking them "archival capture <timestamp>" in the report
   instead of reporting them as oddities.

No blanket http allowlist exists or is permitted. No registry entry currently
uses the pattern; `audit-frontier` adds the Bitter Lesson entry when it links
the competing-theses prose mention, and the checker is ready for it.

## Venue-year duplication note (superseded, verified)

This feature asked for a registry sweep removing venue strings that embed the
entry year (venue "RSS 2023" with year 2023 rendering as "RSS 2023, 2023.").
That report (2026-08-10) was acted on differently one day later: the
convention that landed (2026-08-11, documented in library/design-system.md)
keeps the venue intact in the registry and dedupes in the renderer.
`venueStatesYear` in `data/citations.ts` detects the duplication, and both
the References bibliography (`components/article/references.tsx`) and the
Cite tooltip (`citationMeta`) render the year once. 83 registry entries carry
a venue containing a year; of those, 65 embed the entry's own year and are
deduped at render time, while the rest (venue year differs from entry year,
e.g. "RSS 2025" with year 2024) deliberately render both years, which is
informative. The behavior is pinned by unit tests
(`tests/unit/citations.test.ts`: renders the year once when the venue already
states it; keeps both years when they differ) and by the references e2e
spec. Sweeping the registry now would fight the documented convention and
change 65 entries for no reader-visible difference, so it was not done.

## Table: every entry, verdict, and action

Generated by `npm run check:citations -- --markdown` on 2026-08-16; the
"action taken" column is the audit's record of what changed in this pass.
Verdict legend: `ok` = reachable and title verified; `ok (crossref)` =
bot-walled or JS-shell page, identity verified through Crossref metadata;
`ok (exception)` = documented exception in `data/link-check-exceptions.ts`;
`match (pdf)` = title read from the PDF's first page.

| id | url checked | verdict | title check | action taken | note |
|---|---|---|---|---|---|
| alvinn-1988 | https://proceedings.neurips.cc/paper/1988/hash/812b4ba287f5ee0bc9d43bbf5bbe87fb-Abstract.html | ok | match | none (verified as cited) |  |
| dagger-2011 | https://arxiv.org/abs/1011.0686 | ok | match | none (verified as cited) |  |
| act-aloha-2023 | https://arxiv.org/abs/2304.13705 | ok | match | none (verified as cited) |  |
| mobile-aloha-2024 | https://arxiv.org/abs/2401.02117 | ok | match | none (verified as cited) |  |
| diffusion-policy-2023 | https://arxiv.org/abs/2303.04137 | ok | match | none (verified as cited) |  |
| pi0-2024 | https://arxiv.org/abs/2410.24164 | ok | match | none (verified as cited) |  |
| real-time-chunking-2025 | https://arxiv.org/abs/2506.07339 | ok | match | none (verified as cited) |  |
| training-time-rtc-2025 | https://arxiv.org/abs/2512.05964 | ok | match | none (verified as cited) |  |
| vla-perf-2026 | https://arxiv.org/abs/2602.18397 | ok | match | fixed: registry title and authors corrected against the arXiv abs page (was a descriptive label plus NVIDIA Research) |  |
| consistency-policy-2024 | https://arxiv.org/abs/2405.07503 | ok | match | none (verified as cited) |  |
| one-step-diffusion-2024 | https://arxiv.org/abs/2410.21257 | ok | match | none (verified as cited) |  |
| hg-dagger-2019 | https://arxiv.org/abs/1810.02890 | ok | match | none (verified as cited) |  |
| rt1-2022 | https://arxiv.org/abs/2212.06817 | ok | match | none (verified as cited) |  |
| rt2-2023 | https://arxiv.org/abs/2307.15818 | ok | match | none (verified as cited) |  |
| open-x-embodiment-2023 | https://arxiv.org/abs/2310.08864 | ok | match | none (verified as cited) |  |
| octo-2024 | https://arxiv.org/abs/2405.12213 | ok | match | none (verified as cited) |  |
| openvla-2024 | https://arxiv.org/abs/2406.09246 | ok | match | none (verified as cited) |  |
| openvla-oft-2025 | https://arxiv.org/abs/2502.19645 | ok | match | none (verified as cited) |  |
| knowledge-insulation-2025 | https://www.pi.website/research/knowledge_insulation | ok (exception) | MISMATCH: "VLAs that Train Fast, Run Fast, and Generalize Better" | documented exception added (page title is the note tagline) | pi.website research pages carry the note's tagline as <title> ("VLAs that Train Fast, Run Fast, and Generalize Better"), not the research-note name the registry cites; the page has no DOI, so Crossref cannot stand in. Verified 2026-08-16: Fetched page body (2026-08-16): the page names "Knowledge Insulation" five times and lives at the research/knowledge_insulation slug; the companion paper is registry id knowledge-insulation-paper-2025 with the same tagline subtitle. |
| pi0-fast-2025 | https://arxiv.org/abs/2501.09747 | ok | match | none (verified as cited) |  |
| saycan-2022 | https://arxiv.org/abs/2204.01691 | ok | match | none (verified as cited) |  |
| code-as-policies-2022 | https://arxiv.org/abs/2209.07753 | ok | match | none (verified as cited) |  |
| moka-2024 | https://arxiv.org/abs/2403.03174 | ok | match | none (verified as cited) |  |
| robopoint-2024 | https://arxiv.org/abs/2406.10721 | ok | match | none (verified as cited) |  |
| rekep-2024 | https://arxiv.org/abs/2409.01652 | ok | match | none (verified as cited) |  |
| ecot-2024 | https://arxiv.org/abs/2407.08693 | ok | match | none (verified as cited) |  |
| hi-robot-2025 | https://arxiv.org/abs/2502.19417 | ok | match | none (verified as cited) |  |
| pi05-2025 | https://arxiv.org/abs/2504.16054 | ok | match | none (verified as cited) |  |
| knowledge-insulation-paper-2025 | https://arxiv.org/abs/2505.23705 | ok | match | none (verified as cited) |  |
| pi06-model-card-2025 | https://website.pi-asset.com/pi06star/PI06_model_card.pdf | ok | match (pdf) | none (verified as cited) |  |
| pistar06-2025 | https://www.pi.website/download/pistar06.pdf | ok | match (pdf) | none (verified as cited) |  |
| mem-2026 | https://www.pi.website/download/Mem.pdf | ok | match (pdf) | fixed: registry title corrected to the PDF title page (was a paraphrase) |  |
| pi07-2026 | https://www.pi.website/download/pi07.pdf | ok | match (pdf) | none (verified as cited) |  |
| pi07-blog-2026 | https://www.pi.website/blog/pi07 | ok | match | none (verified as cited) |  |
| openpi-repo-2024 | https://github.com/Physical-Intelligence/openpi | ok | match | none (verified as cited) |  |
| oxe-quality-critique-2026 | https://mbreuss.github.io/blog_post_iclr_26_vla.html | ok | match | none (verified as cited) |  |
| pistar06-blog-2025 | https://www.pi.website/blog/pistar06 | ok | match | none (verified as cited) |  |
| pi-human-to-robot-2025 | https://www.pi.website/research/human_to_robot | ok | match | none (verified as cited) |  |
| pi-real-time-chunking-blog-2025 | https://www.pi.website/research/real_time_chunking | ok | match | none (verified as cited) |  |
| gemini-robotics-2025 | https://arxiv.org/abs/2503.20020 | ok | match | none (verified as cited) |  |
| gemini-robotics-15-2025 | https://arxiv.org/abs/2510.03342 | ok | match | none (verified as cited) |  |
| gemini-robotics-2-2026 | https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/ | ok | match | none (verified as cited) |  |
| gr00t-n1-2025 | https://arxiv.org/abs/2503.14734 | ok | match | none (verified as cited) |  |
| isaac-gr00t-repo-2026 | https://github.com/NVIDIA/Isaac-GR00T | ok | match | none (verified as cited) |  |
| helix-2025 | https://www.figure.ai/news/helix | ok | match | none (verified as cited) |  |
| helix-02-2026 | https://www.figure.ai/news/helix-02 | ok | match | none (verified as cited) |  |
| agibot-world-2025 | https://arxiv.org/abs/2503.06669 | ok | match | none (verified as cited) |  |
| agibot-go2-2026 | https://www.agibot.com/article/231/detail/56.html | ok (exception) | unavailable | none (verified as cited) | www.agibot.com answers HTTP 500 to node fetch on every probe (7 of 7, HEAD and GET, 2026-08-11) while curl and Chromium get HTTP 200: a client-fingerprint wall, not link rot. The page has no DOI, so Crossref cannot stand in for the fetch. Verified 2026-08-11: curl GET with the sweep's browser user agent: HTTP 200, 135,961 bytes; headless Chromium (Playwright): HTTP 200, page title "The Unity of Reasoning and Action: AGIBOT Unveils Genie Operator" (the GO-2 announcement). |
| agibot-go2-robotreport-2026 | https://www.therobotreport.com/agibot-releases-go-2-foundation-model-embodied-ai/ | ok | match | none (verified as cited) |  |
| skild-series-c-2026 | https://www.skild.ai/blogs/series-c | ok | match | none (verified as cited) |  |
| dppo-2024 | https://arxiv.org/abs/2409.00588 | ok | match | none (verified as cited) |  |
| conrft-2025 | https://arxiv.org/abs/2502.05450 | ok | match | none (verified as cited) |  |
| pi-rl-2026 | https://arxiv.org/abs/2510.25889 | ok | match | none (verified as cited) |  |
| hil-serl-2024 | https://arxiv.org/abs/2410.21845 | ok | match | none (verified as cited) |  |
| pld-2026 | https://arxiv.org/abs/2511.00091 | ok | match | none (verified as cited) |  |
| rldg-2024 | https://arxiv.org/abs/2412.09858 | ok | match | none (verified as cited) |  |
| rl-vla-generalization-2025 | https://arxiv.org/abs/2505.19789 | ok | match | none (verified as cited) |  |
| pair-vla-2026 | https://arxiv.org/abs/2605.13105 | ok | match | none (verified as cited) |  |
| rudin-2021 | https://arxiv.org/abs/2109.11978 | ok | match | none (verified as cited) |  |
| ppo-2017 | https://arxiv.org/abs/1707.06347 | ok | match | none (verified as cited) |  |
| ng-reward-shaping-1999 | https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf | ok | match (pdf) | none (verified as cited) |  |
| isaac-gym-2021 | https://arxiv.org/abs/2108.10470 | ok | match | none (verified as cited) |  |
| brax-2021 | https://arxiv.org/abs/2106.13281 | ok | match | none (verified as cited) |  |
| mujoco-playground-2025 | https://arxiv.org/abs/2502.08844 | ok | match | none (verified as cited) |  |
| newton-manipulation-blog-2026 | https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics | ok | match | none (verified as cited) |  |
| state-of-simulation-2026 | https://huggingface.co/blog/nvidia/state-of-simulation-for-physical-ai | ok | match | none (verified as cited) |  |
| reality-gap-survey-2026 | https://arxiv.org/abs/2510.20808 | ok | match | none (verified as cited) |  |
| isaac-lab-2025 | https://arxiv.org/abs/2511.04831 | ok | match | none (verified as cited) |  |
| lin-humanoid-sim2real-2025 | https://arxiv.org/abs/2502.20396 | ok | match | none (verified as cited) |  |
| openai-rubiks-cube-2019 | https://arxiv.org/abs/1910.07113 | ok | match | none (verified as cited) |  |
| play2perfect-2026 | https://arxiv.org/abs/2606.26428 | ok | match | none (verified as cited) |  |
| tobin-2017 | https://arxiv.org/abs/1703.06907 | ok | match | none (verified as cited) |  |
| peng-2018 | https://arxiv.org/abs/1710.06537 | ok | match | none (verified as cited) |  |
| lee-2020 | https://arxiv.org/abs/2010.11251 | ok | match | none (verified as cited) |  |
| rma-2021 | https://arxiv.org/abs/2107.04034 | ok | match | none (verified as cited) |  |
| hwangbo-2019 | https://arxiv.org/abs/1901.08652 | ok | match | none (verified as cited) |  |
| asap-2025 | https://arxiv.org/abs/2502.01143 | ok | match | none (verified as cited) |  |
| splatsim-2024 | https://arxiv.org/abs/2409.10161 | ok | match | none (verified as cited) |  |
| robogsim-2024 | https://arxiv.org/abs/2411.11839 | ok | match | none (verified as cited) |  |
| miki-2022 | https://arxiv.org/abs/2201.08117 | ok | match | none (verified as cited) |  |
| choi-2023 | https://www.science.org/doi/10.1126/scirobotics.ade2256 | ok (crossref) | match (crossref) | none (verified as cited) | publisher answered HTTP 403; Crossref metadata for doi:10.1126/scirobotics.ade2256 matches the registry title and year |
| h2o-2024 | https://arxiv.org/abs/2403.04436 | ok | match | none (verified as cited) |  |
| mit-humanoid-rewards-2023 | https://arxiv.org/abs/2307.10142 | ok | match | none (verified as cited) |  |
| rai-atlas-rl-2025 | https://rai-inst.com/resources/videos/reinforcement-learning-accelerates-humanoid-behavior-production/ | ok | match | none (verified as cited) |  |
| park-2017-bounding | https://journals.sagepub.com/doi/10.1177/0278364917694244 | ok (crossref) | match (crossref) | none (verified as cited) | publisher answered HTTP 403; Crossref metadata for doi:10.1177/0278364917694244 matches the registry title and year |
| bd-spot-rl-2024 | https://bostondynamics.com/blog/starting-on-the-right-foot-with-reinforcement-learning/ | ok | match | none (verified as cited) |  |
| bd-atlas-lbm-2025 | https://bostondynamics.com/blog/large-behavior-models-atlas-find-new-footing/ | ok | match | none (verified as cited) |  |
| phc-2023 | https://arxiv.org/abs/2305.06456 | ok | match | none (verified as cited) |  |
| omnih2o-2024 | https://arxiv.org/abs/2406.08858 | ok | match | none (verified as cited) |  |
| humanplus-2024 | https://arxiv.org/abs/2406.10454 | ok | match | none (verified as cited) |  |
| exbody2-2024 | https://arxiv.org/abs/2412.13196 | ok | match | none (verified as cited) |  |
| kungfubot-2025 | https://arxiv.org/abs/2506.12851 | ok | match | none (verified as cited) |  |
| gmt-2025 | https://arxiv.org/abs/2506.14770 | ok | match | none (verified as cited) |  |
| robust-tracking-2026 | https://arxiv.org/abs/2601.23080 | ok | match | none (verified as cited) |  |
| leverb-2025 | https://arxiv.org/abs/2506.13751 | ok | match | none (verified as cited) |  |
| groot-wbc-2026 | https://github.com/NVlabs/GR00T-WholeBodyControl | ok | match | none (verified as cited) |  |
| eureka-2024 | https://arxiv.org/abs/2310.12931 | ok | match | none (verified as cited) |  |
| rda-2026 | https://arxiv.org/abs/2606.01672 | ok | match | none (verified as cited) |  |
| rewards-constraints-2024 | https://arxiv.org/abs/2308.12517 | ok | match | none (verified as cited) |  |
| gain-adaptation-2025 | https://arxiv.org/abs/2510.10759 | ok | match | none (verified as cited) |  |
| stagewise-cmorl-2024 | https://arxiv.org/abs/2409.15755 | ok | match | none (verified as cited) |  |
| mujoco-ilqr-2026 | https://arxiv.org/abs/2503.04613 | ok | match | none (verified as cited) |  |
| world-model-survey-2026 | https://arxiv.org/abs/2605.00080 | ok | match | none (verified as cited) |  |
| dreamerv3-2023 | https://arxiv.org/abs/2301.04104 | ok | match | none (verified as cited) |  |
| tdmpc2-2023 | https://arxiv.org/abs/2310.16828 | ok | match | none (verified as cited) |  |
| daydreamer-2022 | https://arxiv.org/abs/2206.14176 | ok | match | none (verified as cited) |  |
| dreamer-2019 | https://arxiv.org/abs/1912.01603 | ok | match | none (verified as cited) |  |
| tdmpc-2022 | https://arxiv.org/abs/2203.04955 | ok | match | none (verified as cited) |  |
| robotic-world-model-2025 | https://arxiv.org/abs/2501.10100 | ok | match | none (verified as cited) |  |
| dream-mpc-2026 | https://arxiv.org/abs/2605.04568 | ok | match | none (verified as cited) |  |
| fast-wam-2026 | https://arxiv.org/abs/2603.16666 | ok | match | none (verified as cited) |  |
| vjepa2-2025 | https://arxiv.org/abs/2506.09985 | ok | match | none (verified as cited) |  |
| vjepa-2024 | https://arxiv.org/abs/2404.08471 | ok | match | none (verified as cited) |  |
| jepa-value-planning-2026 | https://arxiv.org/abs/2601.00844 | ok | match | none (verified as cited) |  |
| ami-labs-2026 | https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/ | ok | match | none (verified as cited) |  |
| cosmos-3-2026 | https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf | ok | match (pdf) | none (verified as cited) |  |
| genie-3-2025 | https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/ | ok | match | none (verified as cited) |  |
| worldvla-2025 | https://arxiv.org/abs/2506.21539 | ok | match | none (verified as cited) |  |
| occworld-2023 | https://arxiv.org/abs/2311.16038 | ok | match | none (verified as cited) |  |
| mujoco-2012 | https://doi.org/10.1109/IROS.2012.6386109 | ok (crossref) | match (crossref) | fixed: url moved to the DOI (the IEEE page is a JS shell with no title) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/6386109/; final: https://ieeexplore.ieee.org/document/6386109/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/IROS.2012.6386109 matches the registry title and year |
| interactive-world-simulator-2026 | https://arxiv.org/abs/2603.08546 | ok | match | none (verified as cited) |  |
| roboworld-2026 | https://arxiv.org/abs/2607.01060 | ok | match | none (verified as cited) |  |
| gr-1-2023 | https://arxiv.org/abs/2312.13139 | ok | match | none (verified as cited) |  |
| gr-2-2024 | https://arxiv.org/abs/2410.06158 | ok | match | none (verified as cited) |  |
| 1x-world-model-lab-2026 | https://www.1x.tech/discover/1x-world-model-lab | ok | match | none (verified as cited) |  |
| odyssey-2-2025 | https://odyssey.ml/introducing-odyssey-2 | ok | match | none (verified as cited) |  |
| project-genie-2026 | https://arstechnica.com/google/2026/01/google-project-genie-lets-you-create-interactive-worlds-from-a-photo-or-prompt/ | ok | match | none (verified as cited) |  |
| 3dgs-2023 | https://arxiv.org/abs/2308.04079 | ok | match | none (verified as cited) |  |
| robogen-2024 | https://arxiv.org/abs/2311.01455 | ok | match | none (verified as cited) |  |
| holodeck-2024 | https://arxiv.org/abs/2312.09067 | ok | match | none (verified as cited) |  |
| robocasa-2024 | https://arxiv.org/abs/2406.02523 | ok | match | none (verified as cited) |  |
| robocasa365-2026 | https://robocasa.ai/assets/robocasa365_iclr26.pdf | ok | match (pdf) | none (verified as cited) |  |
| grs-2024 | https://arxiv.org/abs/2410.15536 | ok | match | none (verified as cited) |  |
| gpt3-2020 | https://arxiv.org/abs/2005.14165 | ok | match | none (verified as cited) |  |
| llama-3-2024 | https://ai.meta.com/blog/meta-llama-3/ | ok (exception) | unavailable | none (verified as cited) | ai.meta.com answers HTTP 400 to every non-browser client (curl and node fetch, regardless of headers): a TLS-fingerprint bot-wall, not link rot. The post has no DOI, so Crossref cannot stand in for the fetch. Verified 2026-08-11: Headless Chromium (Playwright) on a real browser fingerprint: HTTP 200, page title "Introducing Meta Llama 3: The most capable openly available LLM to date" matches the registry entry. |
| fineweb-2024 | https://arxiv.org/abs/2406.17557 | ok | match | none (verified as cited) |  |
| droid-2024 | https://arxiv.org/abs/2403.12945 | ok | match | none (verified as cited) |  |
| bridgedata-v2-2023 | https://arxiv.org/abs/2308.12952 | ok | match | none (verified as cited) |  |
| robomind-2024 | https://arxiv.org/abs/2412.13877 | ok | match | none (verified as cited) |  |
| agibot-world-2026 | https://huggingface.co/datasets/agibot-world/AgiBotWorld2026 | ok | match | none (verified as cited) |  |
| tri-lbm-2025 | https://arxiv.org/abs/2507.05331 | ok | match | none (verified as cited) |  |
| lin-data-scaling-laws-2024 | https://arxiv.org/abs/2410.18647 | ok | match | none (verified as cited) |  |
| diversity-scaling-2025 | https://arxiv.org/abs/2507.06219 | ok | match | none (verified as cited) |  |
| egodex-2025 | https://arxiv.org/abs/2505.11709 | ok | match | none (verified as cited) |  |
| egoscale-2026 | https://arxiv.org/abs/2602.16710 | ok | match | none (verified as cited) |  |
| umi-2024 | https://arxiv.org/abs/2402.10329 | ok | match | none (verified as cited) |  |
| ego4d-2022 | https://arxiv.org/abs/2110.07058 | ok | match | none (verified as cited) |  |
| so-arm100-repo-2026 | https://github.com/TheRobotStudio/SO-ARM100 | ok | match | none (verified as cited) |  |
| lerobot-docs-2026 | https://huggingface.co/docs/lerobot/index | ok | match | none (verified as cited) |  |
| lerobot-pricing-2026 | https://github.com/alpibrusl/lex-robot/issues/3 | ok | match | none (verified as cited) |  |
| seeed-so-arm101-pro-2026 | https://www.seeedstudio.com/SO-ARM-101-Assembled-Kit-Pro-p-6691.html | ok | match | none (verified as cited) |  |
| trossen-ai-2026 | https://www.trossenrobotics.com/ai | ok | match | none (verified as cited) |  |
| robozaps-humanoids-2026 | https://blog.robozaps.com/b/best-humanoid-robots | ok | match | none (verified as cited) |  |
| unitree-g1-2026 | https://www.unitree.com/g1/ | ok | match | none (verified as cited) |  |
| unitree-h2-2026 | https://www.unitree.com/H2/ | ok | match | none (verified as cited) |  |
| 1x-neo-2026 | https://www.1x.tech/neo | ok | match | fixed: registry title aligned to the product page title |  |
| bd-atlas-2026 | https://bostondynamics.com/products/atlas/ | ok | match | fixed: registry title aligned to the product page title |  |
| figure-03-2025 | https://www.figure.ai/news/introducing-figure-03 | ok | match | none (verified as cited) |  |
| leap-hand-2023 | https://arxiv.org/abs/2309.06440 | ok | match | none (verified as cited) |  |
| tactile-outlook-2025 | https://arxiv.org/abs/2508.11261 | ok | match | none (verified as cited) |  |
| digit-sensor-2020 | https://arxiv.org/abs/2005.14679 | ok | match | none (verified as cited) |  |
| anyskin-2024 | https://arxiv.org/abs/2409.08276 | ok | match | none (verified as cited) |  |
| meta-fair-touch-2024 | https://ai.meta.com/blog/fair-robotics-open-source/ | ok (exception) | unavailable | none (verified as cited) | ai.meta.com answers HTTP 400 to every non-browser client (curl and node fetch, regardless of headers): a TLS-fingerprint bot-wall, not link rot. The post has no DOI, so Crossref cannot stand in for the fetch. Verified 2026-08-11: Headless Chromium (Playwright) on a real browser fingerprint: HTTP 200, page title "Advancing embodied AI through progress in touch perception, dexterity, and human-robot interaction" matches the registry entry. |
| jetson-thor-2026 | https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/ | ok | match | none (verified as cited) |  |
| gello-2023 | https://arxiv.org/abs/2309.13037 | ok | match | none (verified as cited) |  |
| open-television-2024 | https://arxiv.org/abs/2407.01512 | ok | match | none (verified as cited) |  |
| bunny-visionpro-2024 | https://arxiv.org/abs/2407.03162 | ok | match | none (verified as cited) |  |
| optimal-stopping-2025 | https://arxiv.org/abs/2503.10966 | ok | match | none (verified as cited) |  |
| simpler-2024 | https://arxiv.org/abs/2405.05941 | ok | match | none (verified as cited) |  |
| libero-2023 | https://arxiv.org/abs/2306.03310 | ok | match | none (verified as cited) |  |
| libero-plus-2025 | https://arxiv.org/abs/2510.13626 | ok | match | none (verified as cited) |  |
| roboarena-2025 | https://arxiv.org/abs/2506.18123 | ok | match | none (verified as cited) |  |
| robochallenge-2025 | https://arxiv.org/abs/2510.17950 | ok | match | none (verified as cited) |  |
| denavit-hartenberg-1955 | https://doi.org/10.1115/1.4011045 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://asmedigitalcollection.asme.org/appliedmechanics/article/22/2/215/1110292/A-Kinematic-Notation-for-Lower-Pair-Mechanisms; final: https://asmedigitalcollection.asme.org/appliedmechanics/article/22/2/215/1110292/A-Kinematic-Notation-for-Lower-Pair-Mechanisms; publisher answered HTTP 403; Crossref metadata for doi:10.1115/1.4011045 matches the registry title and year |
| whitney-1969 | https://doi.org/10.1109/TMMS.1969.299896 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/4081862/; final: https://ieeexplore.ieee.org/document/4081862/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/TMMS.1969.299896 matches the registry title and year |
| wampler-1986 | https://doi.org/10.1109/TSMC.1986.289285 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/4075580/; final: https://ieeexplore.ieee.org/document/4075580/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/TSMC.1986.289285 matches the registry title and year |
| levenberg-1944 | https://doi.org/10.1090/qam/10666 | ok (exception) | MISMATCH: "Quarterly of Applied Mathematics" | documented exception added (AMS serves the journal masthead as page title) | chain: 302 -> 302 -> 200 https://pubs.ams.org/journals/qam/1944-02-02/S0033-569X-1944-10666-0; final: https://pubs.ams.org/journals/qam/1944-02-02/S0033-569X-1944-10666-0; AMS article pages serve the journal masthead ("Quarterly of Applied Mathematics") as the <title> element, with no per-article title in the served HTML, so the fetched title can never match the paper the registry cites. Verified 2026-08-16: Crossref content negotiation for doi:10.1090/qam/10666: title "A Method for the Solution of Certain Non-linear Problems in Least Squares" and year 1944 both match the registry entry. |
| marquardt-1963 | https://doi.org/10.1137/0111030 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 403 https://epubs.siam.org/doi/10.1137/0111030; final: https://epubs.siam.org/doi/10.1137/0111030; publisher answered HTTP 403; Crossref metadata for doi:10.1137/0111030 matches the registry title and year |
| modern-robotics-2017 | https://modernrobotics.northwestern.edu/ | ok | match | none (verified as cited) | chain: 301 -> 301 -> 200 https://modernrobotics.northwestern.edu/nu-gm-book-resource/foundations-of-robot-motion/; final: https://modernrobotics.northwestern.edu/nu-gm-book-resource/foundations-of-robot-motion/ |
| lozano-perez-1983 | https://doi.org/10.1109/TC.1983.1676196 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 202 https://ieeexplore.ieee.org/document/1676196/; final: https://ieeexplore.ieee.org/document/1676196/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/TC.1983.1676196 matches the registry title and year |
| kavraki-1996 | https://doi.org/10.1109/70.508439 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/508439/; final: https://ieeexplore.ieee.org/document/508439/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/70.508439 matches the registry title and year |
| lavalle-1998 | https://lavalle.pl/papers/Lav98c.pdf | ok | unavailable | none (verified as cited) |  |
| lavalle-kuffner-2001 | https://lavalle.pl/papers/LavKuf01.pdf | ok | unavailable | none (verified as cited) |  |
| karaman-frazzoli-2011 | https://arxiv.org/abs/1105.1186 | ok | match | none (verified as cited) |  |
| gammell-2014 | https://arxiv.org/abs/1404.2334 | ok | match | none (verified as cited) |  |
| ratliff-2009 | https://www.ri.cmu.edu/publications/chomp-gradient-optimization-techniques-for-efficient-motion-planning/ | ok | match | none (verified as cited) | chain: 301 -> 301 -> 200 https://publications.ri.cmu.edu/chomp-gradient-optimization-techniques-for-efficient-motion-planning; final: https://publications.ri.cmu.edu/chomp-gradient-optimization-techniques-for-efficient-motion-planning |
| schulman-2013 | https://www.roboticsproceedings.org/rss09/p31.pdf | ok | match (pdf) | none (verified as cited) |  |
| lavalle-2006 | https://lavalle.pl/planning/ | ok | match | none (verified as cited) |  |
| ompl-2012 | https://ompl.kavrakilab.org/ | ok | match | none (verified as cited) |  |
| astrom-murray-2008 | https://fbswiki.org/wiki/index.php/Feedback_Systems:_An_Introduction_for_Scientists_and_Engineers | ok | match | fixed: url moved to the book page on fbswiki.org (fbsbook.org root now redirects to the wiki home page) |  |
| ziegler-nichols-1942 | https://doi.org/10.1115/1.2899060 | ok (exception) | MISMATCH: "Optimum Settings for Automatic Controllers" | none (verified as cited) | chain: 302 -> 403 https://asmedigitalcollection.asme.org/dynamicsystems/article/115/2B/220/417448/Optimum-Settings-for-Automatic-Controllers; final: https://asmedigitalcollection.asme.org/dynamicsystems/article/115/2B/220/417448/Optimum-Settings-for-Automatic-Controllers; ASME bot-walls the sweep behind a Cloudflare interstitial (HTTP 403, even headless Chromium). The DOI is registered by ASME against the 1993 JDSMC reprint, so Crossref reports only 1993 and the year check can never corroborate the 1942 Trans. ASME original the registry cites; the divergence is documented on the registry entry itself. Verified 2026-08-11: Crossref content negotiation for doi:10.1115/1.2899060: title "Optimum Settings for Automatic Controllers" matches the registry exactly, and the doi.org redirect target is the ASME page for the paper. |
| kalman-1960 | https://doi.org/10.1109/9780470544334.ch8 | ok (exception) | MISMATCH: "Contributions to the Theory of Optimal Control" | documented exception added (DOI is the 2009 Wiley reprint; 1960 original has no DOI) | chain: 302 -> 202 https://ieeexplore.ieee.org/document/5311913; final: https://ieeexplore.ieee.org/document/5311913; The cited DOI is the Wiley Online Books chapter republication (2009), so Crossref reports 2009 while the registry cites the original 1960 Bol. Soc. Mat. Mexicana paper. The title matches exactly; only the year diverges, for the same reprint-vs-original reason as ziegler-nichols-1942. The IEEE page the DOI resolves to is a JS shell with no title in served HTML. Verified 2026-08-16: Crossref content negotiation for doi:10.1109/9780470544334.ch8: title "Contributions to the Theory of Optimal Control" matches the registry exactly; doi.org resolves to ieeexplore.ieee.org/document/5311913 (HTTP 202), the chapter record. |
| tedrake-underactuated | https://underactuated.mit.edu/ | ok | match | none (verified as cited) |  |
| garcia-1989 | https://doi.org/10.1016/0005-1098(89)90002-2 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 200 https://linkinghub.elsevier.com/retrieve/pii/0005109889900022; final: https://linkinghub.elsevier.com/retrieve/pii/0005109889900022; no comparable title at HTTP 200; Crossref metadata for doi:10.1016/0005-1098(89)90002-2 matches the registry title and year |
| mayne-2000 | https://doi.org/10.1016/S0005-1098(99)00214-9 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 200 https://linkinghub.elsevier.com/retrieve/pii/S0005109899002149; final: https://linkinghub.elsevier.com/retrieve/pii/S0005109899002149; no comparable title at HTTP 200; Crossref metadata for doi:10.1016/S0005-1098(99)00214-9 matches the registry title and year |
| qin-badgwell-2003 | https://doi.org/10.1016/S0967-0661(02)00186-7 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 200 https://linkinghub.elsevier.com/retrieve/pii/S0967066102001867; final: https://linkinghub.elsevier.com/retrieve/pii/S0967066102001867; no comparable title at HTTP 200; Crossref metadata for doi:10.1016/S0967-0661(02)00186-7 matches the registry title and year |
| di-carlo-2018 | https://doi.org/10.1109/IROS.2018.8594448 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 202 https://ieeexplore.ieee.org/document/8594448/; final: https://ieeexplore.ieee.org/document/8594448/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/IROS.2018.8594448 matches the registry title and year |
| khatib-1987 | https://doi.org/10.1109/JRA.1987.1087068 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/1087068/; final: https://ieeexplore.ieee.org/document/1087068/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/JRA.1987.1087068 matches the registry title and year |
| sentis-khatib-2005 | https://doi.org/10.1142/S0219843605000594 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://www.worldscientific.com/doi/abs/10.1142/S0219843605000594; final: https://www.worldscientific.com/doi/abs/10.1142/S0219843605000594; publisher answered HTTP 403; Crossref metadata for doi:10.1142/S0219843605000594 matches the registry title and year |
| kalman-1960-filter | https://doi.org/10.1115/1.3662552 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://asmedigitalcollection.asme.org/fluidsengineering/article/82/1/35/397706/A-New-Approach-to-Linear-Filtering-and-Prediction; final: https://asmedigitalcollection.asme.org/fluidsengineering/article/82/1/35/397706/A-New-Approach-to-Linear-Filtering-and-Prediction; publisher answered HTTP 403; Crossref metadata for doi:10.1115/1.3662552 matches the registry title and year |
| mcgee-schmidt-1985 | https://ntrs.nasa.gov/citations/19860003843 | ok (exception) | unavailable | documented exception added (NTRS host-side outage during the audit window) | ntrs.nasa.gov suffered a host-side outage during the 2026-08-16 citation audit: DNS resolves (ntrs.production.sti.appdat.jsc.nasa.gov behind a us-gov-west-1 ELB) but TCP connections to ports 443 never open, for curl and node fetch alike, across the whole session. The same URL was fetched live by the liveness sweep earlier the same day. A NASA-side outage, not link rot; a NASA TM has no DOI, so Crossref cannot stand in. Verified 2026-08-16: Three layers: the liveness sweep earlier on 2026-08-16 fetched the URL live; the search index confirms the citation page at the exact URL is "Discovery of the Kalman Filter as a Practical Tool for Aerospace and Industry" (NASA TM-86847, McGee and Schmidt) matching the registry; and the registry entry itself was verified against the NTRS record on 2026-08-11. Remove this exception once NTRS answers machine clients again.; fetch failed |
| thrun-2005 | https://mitpress.mit.edu/9780262201629/probabilistic-robotics/ | ok | match | none (verified as cited) |  |
| smith-1990 | https://doi.org/10.1007/978-1-4613-8997-2_14 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 200 https://link.springer.com/chapter/10.1007/978-1-4613-8997-2_14; final: https://link.springer.com/chapter/10.1007/978-1-4613-8997-2_14; no comparable title at HTTP 200; Crossref metadata for doi:10.1007/978-1-4613-8997-2_14 matches the registry title and year |
| julier-uhlmann-1997 | https://doi.org/10.1117/12.280797 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 301 -> 200 https://www.spiedigitallibrary.org/redirect/proceedings/proceeding?doi=10.1117/12.280797; final: https://www.spiedigitallibrary.org/redirect/proceedings/proceeding?doi=10.1117/12.280797; no comparable title at HTTP 200; Crossref metadata for doi:10.1117/12.280797 matches the registry title and year |
| kschischang-2001 | https://doi.org/10.1109/18.910572 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/910572/; final: https://ieeexplore.ieee.org/document/910572/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/18.910572 matches the registry title and year |
| dellaert-kaess-2006 | https://doi.org/10.1177/0278364906072768 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://journals.sagepub.com/doi/10.1177/0278364906072768; final: https://journals.sagepub.com/doi/10.1177/0278364906072768; publisher answered HTTP 403; Crossref metadata for doi:10.1177/0278364906072768 matches the registry title and year |
| kaess-2008 | https://doi.org/10.1109/TRO.2008.2006706 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/4682731/; final: https://ieeexplore.ieee.org/document/4682731/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/TRO.2008.2006706 matches the registry title and year |
| kaess-2012 | https://doi.org/10.1177/0278364911430419 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://journals.sagepub.com/doi/10.1177/0278364911430419; final: https://journals.sagepub.com/doi/10.1177/0278364911430419; publisher answered HTTP 403; Crossref metadata for doi:10.1177/0278364911430419 matches the registry title and year |
| cadena-2016 | https://arxiv.org/abs/1606.05830 | ok | match | none (verified as cited) |  |
| forster-2017 | https://arxiv.org/abs/1512.02363 | ok | match | none (verified as cited) |  |
| gtsam-2026 | https://gtsam.org/ | ok (exception) | MISMATCH: "GTSAM \\| GTSAM is a BSD-licensed C++ library that implements sensor fusion for robotics and computer vision using factor graphs." | documented exception added (page title is a tagline) | gtsam.org serves a tagline as <title> ("GTSAM \| GTSAM is a BSD-licensed C++ library..."), not the project name the registry cites; the page has no DOI. Verified 2026-08-16: Fetched page body (2026-08-16): the page states "Georgia Tech Smoothing and Mapping" in its project description. |
| murray-li-sastry-1994 | https://www.cds.caltech.edu/~murray/books/MLS/pdf/mls94-complete.pdf | ok (exception) | unavailable | none (verified as cited) | www.cds.caltech.edu serves an incomplete TLS certificate chain: node fetch aborts with UNABLE_TO_VERIFY_LEAF_SIGNATURE because Node does not fetch missing intermediates (no AIA chasing). Browsers and curl complete the chain and load the PDF fine. Verified 2026-08-11: curl -I with the sweep's browser user agent: HTTP 200, Content-Type application/pdf, Content-Length 2795175.; fetch failed |
| nguyen-1988 | https://doi.org/10.1177/027836498800700301 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://journals.sagepub.com/doi/10.1177/027836498800700301; final: https://journals.sagepub.com/doi/10.1177/027836498800700301; publisher answered HTTP 403; Crossref metadata for doi:10.1177/027836498800700301 matches the registry title and year |
| ferrari-canny-1992 | https://doi.org/10.1109/ROBOT.1992.219918 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/219918/; final: https://ieeexplore.ieee.org/document/219918/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/ROBOT.1992.219918 matches the registry title (Crossref lists no publication year for the record) |
| bicchi-1995 | https://doi.org/10.1177/027836499501400402 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://journals.sagepub.com/doi/10.1177/027836499501400402; final: https://journals.sagepub.com/doi/10.1177/027836499501400402; publisher answered HTTP 403; Crossref metadata for doi:10.1177/027836499501400402 matches the registry title and year |
| mishra-1987 | https://doi.org/10.1007/BF01840373 | ok (crossref) | match (crossref) | fixed: registry title corrected to Multifinger (Crossref/Springer record) | chain: 302 -> 301 -> 200 https://link.springer.com/article/10.1007/BF01840373; final: https://link.springer.com/article/10.1007/BF01840373; no comparable title at HTTP 200; Crossref metadata for doi:10.1007/BF01840373 matches the registry title and year |
| markenscoff-1990 | https://doi.org/10.1177/027836499000900102 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://journals.sagepub.com/doi/10.1177/027836499000900102; final: https://journals.sagepub.com/doi/10.1177/027836499000900102; publisher answered HTTP 403; Crossref metadata for doi:10.1177/027836499000900102 matches the registry title and year |
| cutkosky-1989 | https://doi.org/10.1109/70.34763 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/34763/; final: https://ieeexplore.ieee.org/document/34763/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/70.34763 matches the registry title and year |
| bicchi-kumar-2000 | https://doi.org/10.1109/ROBOT.2000.844081 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 202 https://ieeexplore.ieee.org/document/844081/; final: https://ieeexplore.ieee.org/document/844081/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/ROBOT.2000.844081 matches the registry title (Crossref lists no publication year for the record) |
| prattichizzo-trinkle-2016 | https://doi.org/10.1007/978-3-319-32552-1_38 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 200 https://link.springer.com/10.1007/978-3-319-32552-1_38; final: https://link.springer.com/10.1007/978-3-319-32552-1_38; no comparable title at HTTP 200; Crossref metadata for doi:10.1007/978-3-319-32552-1_38 matches the registry title and year |
| roa-suarez-2015 | https://doi.org/10.1007/s10514-014-9402-3 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 200 https://link.springer.com/article/10.1007/s10514-014-9402-3; final: https://link.springer.com/article/10.1007/s10514-014-9402-3; no comparable title at HTTP 200; Crossref metadata for doi:10.1007/s10514-014-9402-3 matches the registry title and year |
| dexnet-2-2017 | https://arxiv.org/abs/1703.09312 | ok | match | none (verified as cited) |  |
| rl-100-2025 | https://arxiv.org/abs/2510.14830 | ok | match | none (verified as cited) |  |
| bessemer-robotics-2026 | https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai | ok | match | none (verified as cited) |  |
| technology-org-deployed-2026 | https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/ | ok | match | none (verified as cited) |  |
| asimov-agentic-2026 | https://huggingface.co/datasets/google/asimov_agentic | ok | match | none (verified as cited) |  |
| figure-8hr-shift-2026 | https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots | ok | match | none (verified as cited) | chain: 301 -> 200 https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots-complete-full-8-hour-autonomous-shifts-humanoid-race-intensifies.htm; final: https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots-complete-full-8-hour-autonomous-shifts-humanoid-race-intensifies.htm |
| brooks-dexterity-2025 | https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/ | ok | match | none (verified as cited) |  |
| macefield-touch-2022 | https://doi.org/10.1113/JP282846 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP282846; final: https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP282846; publisher answered HTTP 403; Crossref metadata for doi:10.1113/JP282846 matches the registry title and year |
| goldberg-data-gap-2025 | https://doi.org/10.1126/scirobotics.aea7390 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://www.science.org/doi/10.1126/scirobotics.aea7390; final: https://www.science.org/doi/10.1126/scirobotics.aea7390; publisher answered HTTP 403; Crossref metadata for doi:10.1126/scirobotics.aea7390 matches the registry title and year |
| karcini-position-2026 | https://arxiv.org/abs/2606.06556 | ok | match | none (verified as cited) |  |
| brooks-better-lesson-2019 | https://rodneybrooks.com/a-better-lesson/ | ok | match | none (verified as cited) |  |
| enpire-2026 | https://arxiv.org/abs/2606.19980 | ok | match | none (verified as cited) |  |
| gemini-robotics-er2-2026 | https://deepmind.google/models/gemini-robotics/embodied-reasoning/ | ok | match | none (verified as cited) |  |
| holson-olympics-2025 | https://generalrobots.substack.com/p/benjies-humanoid-olympic-games | ok | match | none (verified as cited) |  |
| figure-02-2024 | https://www.prnewswire.com/news-releases/figure-unveils-figure-02-its-second-generation-humanoid-setting-new-standards-in-ai-and-robotics-302214889.html | ok | match | none (verified as cited) |  |
| figure-go-big-2025 | https://www.figure.ai/news/project-go-big | ok | match | none (verified as cited) |  |
| sanctuary-inhand-2024 | https://sanctuary.ai/news/sanctuary-ai-demonstrates-in-hand-manipulation-capabilities-for-improved-general-purpose-robot-dexterity/ | ok | match | none (verified as cited) |  |
| sanctuary-tactile-2025 | https://sanctuary.ai/news/sanctuary-ai-equips-general-purpose-robots/ | ok | match | none (verified as cited) |  |
| sanctuary-hydraulic-rl-2025 | https://sanctuary.ai/news/sanctuary-ai-controlling-advanced-hydraulic-hands/ | ok | match | none (verified as cited) |  |
| shadow-dexterous-hand-2026 | https://shadowrobot.com/dexterous-hand-series/ | ok | match | none (verified as cited) |  |
| shadow-hand-cost-2022 | https://shadowrobot.com/how-much-does-a-robot-hand-cost/ | ok | match | none (verified as cited) |  |
| droids-optimus-v3-hand-2026 | https://droids.substack.com/p/the-forearm-is-the-new-hand-inside | ok | match | none (verified as cited) |  |
| robozaps-phoenix-2026 | https://blog.robozaps.com/b/sanctuary-ai-phoenix-review | ok | match | none (verified as cited) |  |
| robozaps-unitree-h2-2026 | https://blog.robozaps.com/b/unitree-h2-review | ok | match | none (verified as cited) |  |
| wikipedia-humanoid-hand-2026 | https://en.wikipedia.org/wiki/Humanoid_hand | ok | match | none (verified as cited) |  |
| sparsh-x-2025 | https://arxiv.org/abs/2506.14754 | ok | match | none (verified as cited) |  |
| touchworld-2026 | https://arxiv.org/abs/2607.07287 | ok | match | none (verified as cited) |  |
| pi-olympics-2025 | https://www.pi.website/blog/olympics | ok | match | none (verified as cited) |  |
| brooks-scorecard-2026 | https://rodneybrooks.com/predictions-scorecard-2026-january-01/ | ok | match | none (verified as cited) |  |
| morgan-stanley-pr-problem-2026 | https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html | ok | match | none (verified as cited) |  |
| computex-collapse-2026 | https://interestingengineering.com/ai-robotics/qualcomm-robot-unexpected-collapse | ok | match | none (verified as cited) |  |
| robotics-funding-23b-2026 | https://www.briefs.co/news/robotics-startups-raised-23-billion-in-2026-closing-in-on-all-of-2025/ | ok | match | none (verified as cited) |  |
| crunchbase-robotics-funding-2026 | https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/ | ok | match | none (verified as cited) |  |
| unitree-profit-2026 | https://www.techtimes.com/articles/320197/20260711/robot-boom-meets-earnings-reality-unitree-profits-halved-optimus-not-sale.htm | ok | match | none (verified as cited) |  |
| manipulationnet-2026 | https://arxiv.org/abs/2603.04363 | ok | match | none (verified as cited) |  |
| paden-2016 | https://arxiv.org/abs/1604.07446 | ok | match | none (verified as cited) |  |
| waymo-open-dataset-2020 | https://arxiv.org/abs/1912.04838 | ok | match | none (verified as cited) |  |
| vectornet-2020 | https://arxiv.org/abs/2005.04259 | ok | match | none (verified as cited) |  |
| chauffeurnet-2018 | https://arxiv.org/abs/1812.03079 | ok | match | none (verified as cited) |  |
| uniad-2023 | https://arxiv.org/abs/2212.10156 | ok | match | none (verified as cited) |  |
| e2e-ad-survey-2024 | https://arxiv.org/abs/2306.16927 | ok | match | none (verified as cited) |  |
| emma-2024 | https://arxiv.org/abs/2410.23262 | ok | match | none (verified as cited) |  |
| rss-2017 | https://arxiv.org/abs/1708.06374 | ok | match | none (verified as cited) |  |
| kalra-paddock-2016 | https://doi.org/10.1016/j.tra.2016.09.010 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 200 https://linkinghub.elsevier.com/retrieve/pii/S0965856416302129; final: https://linkinghub.elsevier.com/retrieve/pii/S0965856416302129; no comparable title at HTTP 200; Crossref metadata for doi:10.1016/j.tra.2016.09.010 matches the registry title and year |
| ntsb-uber-2019 | https://www.ntsb.gov/investigations/accidentreports/reports/har1903.pdf | ok | match (pdf) | none (verified as cited) |  |
| koopman-safe-enough-2026 | https://philkoopman.substack.com/p/whats-the-deal-with-safe-enough-autonomous | ok | match | none (verified as cited) |  |
| sae-j3016-2021 | https://www.sae.org/news/blog/sae-levels-driving-automation-clarity-refinements | ok | match | none (verified as cited) |  |
| waymo-crash-rates-2025 | https://arxiv.org/abs/2505.01515 | ok | match | none (verified as cited) |  |
| waymo-world-model-2026 | https://waymo.com/blog/2026/02/the-waymo-world-model-a-new-frontier-for-autonomous-driving-simulation/ | ok | match | none (verified as cited) |  |
| vla-ad-survey-2026 | https://arxiv.org/abs/2512.16760 | ok | match | none (verified as cited) |  |
| high-speed-flight-2021 | https://arxiv.org/abs/2110.05113 | ok | match | none (verified as cited) |  |
| swift-drone-racing-2023 | https://www.nature.com/articles/s41586-023-06419-4 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 303 -> 302 -> 200 https://idp.nature.com/transit?redirect_uri=https%3A%2F%2Fwww.nature.com%2Farticles%2Fs41586-023-06419-4&code=76769c1d-592f-49b4-85d1-b6d8ab497c2e; final: https://idp.nature.com/transit?redirect_uri=https%3A%2F%2Fwww.nature.com%2Farticles%2Fs41586-023-06419-4&code=76769c1d-592f-49b4-85d1-b6d8ab497c2e; no comparable title at HTTP 200; Crossref metadata for doi:10.1038/s41586-023-06419-4 matches the registry title and year |
| racing-rl-vs-oc-2023 | https://arxiv.org/abs/2310.10943 | ok | match | none (verified as cited) |  |
| falanga-latency-2019 | https://doi.org/10.1109/LRA.2019.2898117 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 202 https://ieeexplore.ieee.org/document/8636976/; final: https://ieeexplore.ieee.org/document/8636976/; no comparable title at HTTP 202; Crossref metadata for doi:10.1109/LRA.2019.2898117 matches the registry title and year |
| micro-drone-swarm-2022 | https://www.science.org/doi/10.1126/scirobotics.abm5954 | ok (crossref) | match (crossref) | none (verified as cited) | publisher answered HTTP 403; Crossref metadata for doi:10.1126/scirobotics.abm5954 matches the registry title and year |
| soria-nmpc-swarm-2021 | https://www.nature.com/articles/s42256-021-00341-y | ok (crossref) | match (crossref) | none (verified as cited) | no comparable title at HTTP 200; Crossref metadata for doi:10.1038/s42256-021-00341-y matches the registry title and year |
| yang-autonomy-2017 | https://doi.org/10.1126/scirobotics.aam8638 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://www.science.org/doi/10.1126/scirobotics.aam8638; final: https://www.science.org/doi/10.1126/scirobotics.aam8638; publisher answered HTTP 403; Crossref metadata for doi:10.1126/scirobotics.aam8638 matches the registry title and year |
| star-suturing-2016 | https://doi.org/10.1126/scitranslmed.aad9398 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://www.science.org/doi/10.1126/scitranslmed.aad9398; final: https://www.science.org/doi/10.1126/scitranslmed.aad9398; publisher answered HTTP 403; Crossref metadata for doi:10.1126/scitranslmed.aad9398 matches the registry title and year |
| davinci5-clearance-2024 | https://www.globenewswire.com/news-release/2024/03/14/2846718/7637/en/Intuitive-Announces-FDA-Clearance-of-Fifth-Generation-Robotic-System-da-Vinci-5.html | ok | match | none (verified as cited) |  |
| intuitive-q4-2025 | https://www.globenewswire.com/news-release/2026/01/22/3224266/0/en/intuitive-announces-fourth-quarter-earnings.html | ok | match | none (verified as cited) |  |
| cmr-versius-authorization-2024 | https://www.globenewswire.com/news-release/2024/10/15/2963054/0/en/CMR-Surgical-receives-US-FDA-Marketing-Authorization-for-Versius-Surgical-System.html | ok | match | none (verified as cited) |  |
| maestro-tavac-2023 | https://www.sages.org/publications/tavac/moon-surgical-maestro-surgical-robotics-system | ok (exception) | unavailable | documented exception added (Cloudflare challenge to all machine clients) | www.sages.org serves a Cloudflare challenge (HTTP 403, cf-mitigated: challenge) to curl, node fetch, and headless Chromium alike. The TAVAC assessment has no DOI, so Crossref cannot stand in for the fetch. Verified 2026-08-16: Web search index (queried 2026-08-16): the page is indexed at the exact registry URL, dated 2023-01-31, titled "Moon Surgical Maestro Surgical Robotics System - A SAGES Technology..." with authors "Ruben D. Salas Parra MD and David Pechman MD, FACS", matching the registry title, author list, and year. |
| scopilot-clearance-2025 | https://www.prnewswire.com/news-releases/moon-surgical-receives-fda-clearance-for-scopilot-on-maestro-industrys-first-ai-enhanced-intraoperative-capability-powered-by--nvidia-holoscan-302404920.html | ok | match | none (verified as cited) |  |
| versius-plus-510k-2025 | https://www.accessdata.fda.gov/cdrh_docs/pdf25/K252111.pdf | ok | match (pdf) | none (verified as cited) |  |
| maestro-commercial-510k-2024 | https://www.accessdata.fda.gov/cdrh_docs/pdf24/K240598.pdf | ok | match (pdf) | none (verified as cited) |  |
| aegis-curiosity-2017 | https://doi.org/10.1126/scirobotics.aan4582 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://www.science.org/doi/10.1126/scirobotics.aan4582; final: https://www.science.org/doi/10.1126/scirobotics.aan4582; publisher answered HTTP 403; Crossref metadata for doi:10.1126/scirobotics.aan4582 matches the registry title and year |
| perseverance-autonomy-2023 | https://doi.org/10.1126/scirobotics.adi3099 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://www.science.org/doi/10.1126/scirobotics.adi3099; final: https://www.science.org/doi/10.1126/scirobotics.adi3099; publisher answered HTTP 403; Crossref metadata for doi:10.1126/scirobotics.adi3099 matches the registry title and year |
| moxie-completion-2023 | https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/ | ok | match | none (verified as cited) |  |
| ingenuity-first-flight-2021 | https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/ | ok | match | none (verified as cited) |  |
| ingenuity-mission-end-2024 | https://www.nasa.gov/news-release/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/ | ok | match | none (verified as cited) |  |
| prime-1-lunar-2025 | https://www.nasa.gov/missions/artemis/nasas-lunar-drill-technology-passes-tests-on-the-moon/ | ok | match | none (verified as cited) |  |
| ets-vii-ard-2001 | https://doi.org/10.2514/2.3661 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 403 https://arc.aiaa.org/doi/10.2514/2.3661; final: https://arc.aiaa.org/doi/10.2514/2.3661; publisher answered HTTP 403; Crossref metadata for doi:10.2514/2.3661 matches the registry title and year |
| ets-vii-robot-2001 | https://doi.org/10.1007/3-540-45118-8_22 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 200 https://link.springer.com/chapter/10.1007/3-540-45118-8_22; final: https://link.springer.com/chapter/10.1007/3-540-45118-8_22; no comparable title at HTTP 200; Crossref metadata for doi:10.1007/3-540-45118-8_22 matches the registry title (Crossref lists no publication year for the record) |
| orbital-express-2008 | https://doi.org/10.1117/12.783792 | ok (crossref) | match (crossref) | none (verified as cited) | chain: 302 -> 301 -> 301 -> 200 https://www.spiedigitallibrary.org/redirect/proceedings/proceeding?doi=10.1117/12.783792; final: https://www.spiedigitallibrary.org/redirect/proceedings/proceeding?doi=10.1117/12.783792; no comparable title at HTTP 200; Crossref metadata for doi:10.1117/12.783792 matches the registry title and year |
| canadarm2-csa-2024 | https://www.asc-csa.gc.ca/eng/iss/canadarm2/about.asp | ok | match | none (verified as cited) |  |
| dextre-csa-2024 | https://www.asc-csa.gc.ca/eng/iss/dextre/about.asp | ok | match | none (verified as cited) |  |
| mev1-servicing-2025 | https://news.northropgrumman.com/satellites/Northrop-Grumman-Achieves-First-Ever-Undocking-Between-Two-Commercial-Spacecraft-in-Geosynchronous-Orbit | ok | match | none (verified as cited) | chain: 307 -> 200 https://news.northropgrumman.com/satellites/northrop-grumman-achieves-first-ever-undocking-between-two-commercial-spacecraft-in-geosynchronous-orbit; final: https://news.northropgrumman.com/satellites/northrop-grumman-achieves-first-ever-undocking-between-two-commercial-spacecraft-in-geosynchronous-orbit |
| adras-j-15m-2024 | https://www.astroscale.com/en/news/astroscales-adras-j-achieves-historic-15-meter-approach-to-space-debris | ok | match | none (verified as cited) |  |
| osam1-discontinued-2024 | https://www.nasa.gov/missions/update-on-status-of-nasas-osam-1-project/ | ok | match | none (verified as cited) |  |

## Verification (recorded 2026-08-18, reconciliation sweep)

This ledger previously ended with no record of the command gates; the
registry sweep result line above was the only verification in the file,
and the original session's other gate output was never recorded here. The
checkers were re-run against the current tree during the 2026-08-18
reconciliation sweep:

| Gate | Command | Result |
|---|---|---|
| Link liveness | `npm run check:links` | 307 checked: 301 live (20 verified via Crossref), 0 dead, 0 blocked, 0 error, 6 documented exceptions; exit 0 |
| Citation identity | `npm run check:citations` | 307 checked: 293 ok (46 via Crossref), 4 titles unavailable, 0 title mismatches, 10 documented exceptions, 1 archival capture; exit 0 |

Scope note, stated honestly: the per-entry table above covers the 300
registry entries that existed when this audit ran. Seven entries were
added afterwards by the domain audits that needed them (cosmos-policy-2026,
legged-gym-repo-2021, nucleus-supervised-2026, sutton-bitter-lesson-2019,
teslarati-optimus-hand-2026, vasarhelyi-flocking-2018, wholebodyvla-2025);
each is verified as a claim-level source in its own domain ledger, and
both re-runs above cover all 307, so no entry in the registry is
unverified. The original session's test/typecheck/build runs are not
recorded here because their output was not preserved in the ledger and no
handoff for that session exists.
