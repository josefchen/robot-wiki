# Content-integrity audit trail

This directory is the evidence trail for the claim in the wiki's README
that every published article was checked against its cited primary
sources. It exists so a reader can check that claim rather than take it
on faith. The ledgers are committed to the repository alongside the
content they vouch for, like `/research`.

## What was audited

Every published article (all 42 across the seven domains), the four
structured data files behind them (`data/methods.ts`,
`data/hardware.ts`, `data/datasets.ts`, `data/teleop-rigs.ts`), the
market-map dataset (`data/companies.ts`, 111 records), and every entry in
the citation registry (`data/citations.ts`, 306 entries).

| Ledger | Covers | Claims checked | Verified | Corrected | Cut | Unresolved |
|---|---|---|---|---|---|---|
| manipulation.md | 12 manipulation articles + methods.ts | 220 (61+73+86) | 208 | 10 (3+4+3) | 0 | 0 |
| rl-sim2real.md | 6 RL/sim2real/locomotion articles | 81 | 75 | 5 (+1 micro-fix) | 0 | 0 |
| world-models.md | 5 world-models articles | 89 | 79 | 10 | 0 | 0 |
| data-hardware.md | 5 data/hardware articles + 4 data files | 84 | 61 | 21 defects (25 rows) | 2 | 0 |
| classical.md | 5 classical articles | 79 | 73 | 6 | 0 | 0 |
| frontier.md | 5 frontier articles + 4 lib files | 108 | 80 | 26 rows (24 defects) | 0 | 0 |
| market-map.md | 111 company records + timeline | 98 ledger rows over 111 records | 14 V | 46 C (+21 C+N, and see ledger) | 1 record removed | 1 |
| citations.md | 306 citation-registry entries | 306 | 292+ per run | see ledger | 0 | 0 |
| adjacent.md | 4 adjacent-domain articles | 62 | 61 | 1 | 0 | 0 |
| **Total** | **42 articles + all structured data + full registry** | **~1,127 rows** | **~933** | **~125** | **3** | **1** |

(The market-map totals count ledger rows, each row naming at least one
record; several records were verified, corrected and nulled in one row, so
column arithmetic there is approximate in exactly the way its own summary
states. Every other row is one claim.)

## Counting convention (applies to every ledger)

**Corrected counts DISTINCT DEFECTS unless a ledger says otherwise in its
own summary.** A single defect fixed in three places (article prose,
`data/*.ts`, closing paragraph) is one defect and three `C` rows. When a
header and a table disagree, the header's unit is authoritative and the
tables are its evidence; `data-hardware.md` is the worked example (21
defects across 25 corrected rows, with the four multi-row defects named).

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
npm run check:links      # liveness of every registry URL (bot-walls via Crossref)
npm run check:citations  # identity: fetched title vs registry title, per entry
```

Both exit non-zero on any dead link, unexplained bot-wall, or title
mismatch. Machine-unverifiable URLs need a documented exception in
`data/link-check-exceptions.ts` (reason, verification method, date); an
exception whose URL starts passing again is reported STALE by the liveness
sweep and must be removed (title-mismatch exceptions are exempt from that
sweep because only the citation checker can see their failure mode).
Last clean run: 2026-08-18, 306 checked, 0 dead, 0 blocked, 0 mismatches.

## Unresolved items

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
