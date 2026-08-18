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

| Record | Claim (field, shipped value) | Source checked (fetched 2026-08-18 unless noted) | Verdict | Note |
|---|---|---|---|---|
| figure-ai | leadInvestors `[Brookfield, NVIDIA, Qualcomm, Salesforce, T-Mobile]` | https://www.figure.ai/news/series-c (200): "led by Parkway Venture Capital with significant investment from Brookfield Asset Management, NVIDIA, Macquarie Capital, Intel Capital, Align Ventures, Tamarack Global, LG Technology Ventures, Salesforce, T-Mobile Ventures, and Qualcomm Ventures" | C | The shipped list omitted the lead and promoted five of the ten participants. Corrected to `['Parkway Venture Capital']`. Round size ($1B+), $39B post-money and 2025-09-16 date verified on the same page; unchanged. |
| figure-ai | totalRaisedUsd $1.9B | https://www.figure.ai/news/series-c (200); https://en.wikipedia.org/wiki/Figure_AI (200); https://www.thedailystar.net/news/tech-startup/news/figure-ai-now-employs-more-robots-humans-founder-says-4205101 (200) | N | No fetched source states a company total. The first-party page gives only the Series C ("exceeded more than $1 billion"); Wikipedia's infobox carries no funding row; the Daily Star recap states only the Series C. Nulled. |
| figure-ai | founded 2022; HQ San Jose; BMW Spartanburg; "~740 robots operating internally as of Jun 2026" | https://en.wikipedia.org/wiki/Figure_AI (200); https://www.thedailystar.net/...figure-ai-now-employs-more-robots-humans... (200, 2026-06-22: "roughly 740 Figure robots have been deployed") | V | All verified; unchanged. |
| skild-ai | Series C $1.4B at $14B, 2026-01-14, led SoftBank; founded 2023; totalRaisedUsd null | https://techcrunch.com/2026/01/14/robotic-software-maker-skild-ai-hits-14b-valuation/ (200); https://www.businesswire.com/news/home/20260114335623/en/Skild-AI-Raises-%241.4B (200, first-party: "close to $1.4 billion ... led by SoftBank Group ... valuation to over $14 billion ... Founded in 2023") | V | Round, valuation, date, lead, founded, HQ all verified. totalRaisedUsd stays null: TechCrunch quotes the CEO's "more than $2 billion to date", a lower bound, not a total (the Skild rule). No edit. |
| unitree-robotics | IPO $618M on 2026-08-10 at $6.2B | https://www.cnbc.com/2026/08/06/chinese-humanoid-robot-maker-unitree-prices-ipo-at-9-billion-valuation.html (200, Reuters wire: priced 150.8 yuan ($22.34)/share on 2026-08-06, "seeking to raise 6.1 billion yuan", "around 61 billion yuan ($9.04 billion)", $1 = 6.7488 yuan); corroborated by the identical Reuters text at https://kelo.com/2026/08/06/chinese-robot-maker-unitree-prices-shanghai-ipo/ (200) | C | The shipped triple was the pre-pricing approval snapshot. Corrected to amountUsd $904M (6.1B yuan at the article's own 6.7488 rate, the same arithmetic that prints $9.04B for 61B yuan; basis recorded here), date 2026-08-06 (pricing; subscriptions opened 2026-08-10), valuation $9.04B as printed. Status stays `public`: priced and 5,526x subscribed (Bloomberg headline, 2026-08-10) with debut expected the week of the audit. |
| unitree-robotics | sources: dead Caixin URL (404 this session); Reuters commentary URL (401 bot-wall) | direct fetches this session | R | Removed both. Added the CNBC pricing piece and https://en.wikipedia.org/wiki/Unitree_Robotics (200). Rest of World (200, fetched) kept: it remains the source for the prospectus metrics and the $610M/4.2B-yuan filing figure. |
| unitree-robotics | founded 2017; deployments (5,500 sold 2025; 30,000+ quadrupeds; ~33% global share; DeepSeek strategic investment); aka Yushu Technology; HQ Hangzhou | https://en.wikipedia.org/wiki/Unitree_Robotics (200: "Founded 26 August 2016"); https://restofworld.org/2026/unitree-china-humanoid-robot-shanghai-ipo/ (200: 5,500 humanoids in 2025, "more than 30,000 quadruped robots" 2022–Sep 2025, "roughly a third of global humanoid robot sales"); https://www.cnbc.com/2026/08/06/... (200: "DeepSeek is among the strategic investors") | C | founded corrected 2017→2016 (Wikipedia). All four deployment strings verified verbatim; unchanged. totalRaisedUsd $200M nulled: no fetched source states a pre-IPO funding total. Description updated: "filing for Shanghai STAR Market IPO" was stale (priced 2026-08-06) and "first profitable humanoid company at scale" was an unsourced superlative; now "profitable since 2025 ... priced its Shanghai STAR Market IPO in Aug 2026 at a $9.04B valuation". |

