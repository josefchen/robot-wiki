# Market-map company dataset audit (VAL-AUDIT-007)

Date of audit: 2026-08-18. Scope: all 112 company rows in
`research/04-market-map-companies.json` (the declared source of truth;
`data/companies.ts` is generated from it by `npm run generate:companies` and is
never hand-edited), plus the funding timeline, which `timelineEvents` in
`lib/market-map.ts` derives from the same `latestRound` fields, so
record-timeline consistency holds by construction and is re-checked after every
batch.

Method: every cited source URL is fetched in this session (FetchUrl with a
browser user agent; WebSearch to locate a moved or live replacement when a URL
is dead or bot-walled). Fields checked per row: identity/description, segment,
HQ country, founded year, status, totalRaisedUsd, latestRound (type, amount,
date, valuation, leadInvestors), deployments, and source liveness. A
non-obvious field must be stated by a source fetched in this session; a figure
no fetched source states is nulled (honest unknown), never guessed; a lower
bound ("more than $X to date") is never promoted to a total (the Skild rule).
An amount known only from a press report is attributed as reported.

Verdicts: **V** verified against a source fetched this session; **C** corrected
to match a fetched source; **N** nulled (unverifiable in any fetched source);
**R** source replaced (dead URL swapped for a live URL that states the claim);
**U** unresolved (recorded below with the blocker).

This ledger replaces a fabricated draft produced by session b1d60875 (2026-08-18),
which described corrections as applied without touching any data file. Every
row below is written only after its edit is on disk and committed; summary
totals are counted from the tables, and the verification table is a transcript
of commands actually run.

## Corrections ledger

