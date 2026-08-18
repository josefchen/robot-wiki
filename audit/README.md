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
the citation registry (`data/citations.ts`, 307 entries).

| Ledger | Covers | Claims checked | Verified | Corrected | Cut | Unresolved |
|---|---|---|---|---|---|---|
| manipulation.md | 12 manipulation articles + methods.ts | 225 article rows (71+66+88) + 16 registry rows | 213 + 12 | 15 rows (13 distinct defects) | 0 | 0 |
| rl-sim2real.md | 6 RL/sim2real/locomotion articles | 115 rows | 108 | 7 rows (6 defects) | 0 | 0 |
| world-models.md | 5 world-models articles | 92 rows | 76 | 16 rows (11 defects) | 0 | 0 |
| data-hardware.md | 5 data/hardware articles + 4 data files | 84 rows | 57 | 25 rows (21 defects) | 2 | 0 |
| classical.md | 5 classical articles | 79 rows | 73 | 6 | 0 | 0 |
| frontier.md | 5 frontier articles + 4 lib files | 108 rows | 80 | 26 rows (24 defects) | 0 | 0 |
| market-map.md | 111 company records + timeline | 98 ledger rows over 111 records | 14 V | 46 C (+21 C+N, and see ledger) | 1 record removed | 1 |
| citations.md | 307 citation-registry entries | 307 | 303 (293 ok + 10 exceptions, 2026-08-18 run); 4 titles unavailable | see ledger | 0 | 0 |
| adjacent.md | 4 adjacent-domain articles | 48 rows | 47 | 1 | 0 | 0 |
| **Total** | **42 articles + all structured data + full registry** | **1,172 rows** | **983** | **142 rows** (+21 market-map C+N) | **3** | **1** |

Counting unit for this table: ledger rows (the citations ledger counts
registry entries, one per row of its table). Every cell above is counted
from the ledger's own tables; the Total row is the column sum, shown
exactly: 241+115+92+84+79+108+98+307+48 = 1,172 rows checked;
225+108+76+57+73+80+14+303+47 = 983 verified (the citations ledger's 303
is its 293 ok plus 10 documented exceptions; the remaining 4 registry
entries are counted in its 307 rows but sit outside the verified column
because their titles were unavailable to the checker — 293 + 10 + 4 =
307);
15+7+16+25+6+26+46+0+1 = 142 corrected rows, plus the market-map ledger's
21 combined C+N rows that its own summary reports separately.

(Derivability note for the citations row, stated on this page per the
convention above: the 307 registry entries break down as 293 title-verified
+ 10 documented exceptions + 4 titles-unavailable. The per-entry table in
`citations.md` predates 7 later additions and covers 300 of the 307; those
7 are verified as claim-level sources in their own domain ledgers and are
covered by the 2026-08-18 re-run of both checkers, as the ledger's scope
note records. So 303, not 307, is the figure derivable from the verdict
columns alone, and the 4-entry gap is named here rather than left for the
reader to discover in `citations.md`.)

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
                            # counts (42 modules, 307 citations, 111 companies)
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

Last clean run: 2026-08-18 — check:links 307 checked, 301 live (20
verified via Crossref), 0 dead, 0 blocked, 0 error, 6 documented
exceptions; check:citations 293 ok (46 via Crossref) + 10 documented
exceptions, 4 titles unavailable, 0 mismatches.

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
