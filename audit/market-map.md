# Market-map company dataset audit (VAL-AUDIT-007)

**Current state, 20 October 2026.** The field audit of 19 and 20 October ("Field audit of the company dataset
(2026-10-19)" and its close-out at the end of this file) checked every field the map renders, for all 111
records, against fetched page bodies. The search-snippet rows and the identity-only records that the 2026-08-18
audit below describes are superseded by it, and no record rests on either any more. The sections below are kept
as the history of each pass.

Date of audit: 2026-08-18. Scope: all 112 company rows in
`research/04-market-map-companies.json` (the declared source of truth;
`data/companies.ts` is generated from it by `npm run generate:companies` and is
never hand-edited), plus the funding timeline, which `timelineEvents` in
`lib/market-map.ts` derives from the same `latestRound` fields, so
record-timeline consistency holds by construction and is re-checked after every
batch.

Method, stated exactly (corrected on 2026-08-18 follow-up; the original
paragraph overstated it): sources were verified two ways. Directly fetched
sources were retrieved in-session with web fetch using a browser user agent
(a majority of rows, including every first-party press release and every URL
marked 200 above). The remaining roughly 40 of 98 rows rest on search-snippet
corroboration: web search results whose headline or snippet stated the claim,
used chiefly for bot-walled outlets (Bloomberg, Forbes) and paywalled wires;
each such row discloses "fetched via search" inline in its Source column.
A search snippet is weaker evidence than a fetched document, and those rows
should be re-verified against the full source before being promoted to V.
web search was also used to locate moved or live replacements when a URL was
dead or bot-walled. Fields checked per row: identity/description, segment,
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

| physical-intelligence | Series B $600M at $5.6B, 2025-11-20, led CapitalG; total $1.67B; founded 2024 | https://www.therobotreport.com/physical-intelligence-raises-600m-advance-robot-foundation-models/ (200, 2025-11-26: "raised $600 million in Series B funding"; "Founded in 2024"; "CapitalG, Alphabet's growth fund, led Physical Intelligence's Series B round with Lux Capital"; "has raised a total of $1.1 billion to date"); https://www.pi.website/blog/pistar06 (200) | C | Round, valuation, date verified. totalRaisedUsd corrected $1.67B→$1.1B (TRR, citing Bloomberg/Crunchbase; no fetched source states $1.67B). leadInvestors corrected to `['CapitalG', 'Lux Capital']` (TRR names both as leading). Bloomberg URL (bot-walled this session) replaced with the TRR piece; pi.website kept. |
| generalist-ai | $400M at $2B on 2026-06-04 led Radical Ventures; total $400M | https://generalistai.com/blog/accelerating-the-next-phase-of-physical-ai (200, first-party, 2026-06-04: "$400 million in new funding"; "Radical Ventures (lead)"; "total raised to more than half a billion dollars"); https://qz.com/generalist-ai-funding-robotics-nvidia-bezos-060526 (200: "$2 billion valuation") | C | Round fields and lead verified. totalRaisedUsd nulled: the first-party post states only "more than half a billion dollars", a lower bound (Skild rule). Bot-walled Bloomberg and stale Business Insider in-talks URLs replaced with the two fetched sources. |
| dyna-robotics | Series A $120M 2025-09-15; leads Robostrategy/CRV/First Round; total $143.5M; valuation $600M; founded 2024 | https://www.therobotreport.com/dyna-robotics-closes-120m-funding-round-to-scale-robotics-foundation-model/ (200: "closed a $120 million Series A funding round"; "RoboStrategy, CRV, and First Round Capital led"; "$23.5 million seed round in March") | C+N | Amount, date and leads verified (spelling corrected to RoboStrategy). totalRaisedUsd $143.5M verified by arithmetic from TRR's two stated rounds ($120M + $23.5M). valuationUsd $600M nulled (stated in no fetched source; only the bot-walled Bloomberg headline mentions investors). founded nulled (no fetched source states a year). Dead dyna.co URL (404 this session) and bot-walled Bloomberg replaced with TRR. |
| rhoda-ai | Series A $450M at $1.7B on 2026-03-10; total $450M; leads [] | https://finance.yahoo.com/news/rhoda-ai-raises-450-million-160945418.html (200, Reuters wire: "raised $450 million in a Series A funding round that values the company at $1.7 billion"; emerged from stealth; backers Khosla, Temasek, Mayfield, Premici, Capricorn, none named as lead) | V+R | All fields verified; total = the stealth-exit round (only disclosed funding). Bot-walled Reuters and Bloomberg URLs replaced with the live Reuters syndication. |
| the-bot-company | $250M at $4B on 2025-10-28, led Greenoaks; total $400M; founded 2024; confidence high | https://www.therobotreport.com/the-bot-company-led-by-kyle-vogt-brings-in-another-150m/ (200, Mar 2025: $150M at $2B, "includes participation from Greenoaks", no lead named); Bloomberg 2025-10-28 piece (bot-walled; search corroboration: "set to raise $250 million ... will value the company at more than $4 billion, according to people familiar") | C+N | The Oct 2025 round is reported, not confirmed closed: no fetched source states it closed or names a lead. leadInvestors cleared, totalRaisedUsd nulled (nothing states $400M), confidence downgraded high→medium (single secondary source, unconfirmed). Amount/valuation kept as reported figures against the Bloomberg URL, which is retained as the report of record; TRR kept (fetched). founded 2024 NULLLED in the 2026-08-18 reconciliation sweep: no fetched source states a founding year (the original note said "launch coverage" without naming one), and dyna-robotics had its founded field nulled for exactly that reason; the rule is now applied consistently. |
| irobot | Chapter 11, acquired by Picea Robotics, 2025-12-15; founded 1990 | https://www.bbc.com/news/articles/c1lr75lp239o (200, 2025-12-15: "documents filed on Sunday" = 2025-12-14; "Shenzhen-based Picea Robotics, will take ownership"; "Founded in 1990"); https://www.wbur.org/hereandnow/2026/03/17/irobot-bankruptcy (200: "filed for bankruptcy late last year and is now owned by one of its Chinese creditors") | C+R | date corrected 2025-12-15→2025-12-14 (the filing date; Dec 14, 2025 was the Sunday referenced). Prepackaged plan made Picea's takeover effective 2026-01-23 per court coverage (elevenflo.com summary, search-corroborated); status `acquired` and buyer verified. Bot-walled Reuters URL replaced with BBC; WBUR kept. |
| apptronik | Series A extension $520M on 2026-02-11 at $5.5B; leads B Capital/Google/Mercedes-Benz/PEAK6; total $935M; founded 2016 | https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a (200, first-party, 2026-02-11: "$520 million Series A-X"; "participation from existing investors including B Capital, Google, Mercedes-Benz and PEAK6"; "total Series A to more than $935 million and total capital raised to nearly $1 billion"); https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html (200: "valued at $5 billion"; "B Capital ... co-led the deal with Google"; began at UT Austin in 2016) | C | valuationUsd corrected $5.5B→$5B (CNBC prints $5 billion). leadInvestors corrected to `['B Capital', 'Google']` (CNBC's named co-leads; the first-party release lists Mercedes-Benz and PEAK6 as participants, not leads). totalRaisedUsd nulled: $935M is the Series A total; the company total is only "nearly $1 billion" (approximate). Description's unverifiable "Robot Park" name replaced with the sourced "robot-training facilities". founded 2016 and deployments (Mercedes-Benz, GXO, Jabil) verified. |

| unitree-robotics (timeline) | timeline IPO entry matches record | derived from `latestRound` via `timelineEvents` in `lib/market-map.ts` (record↔timeline consistency is by construction) | V | No separate timeline object to audit; regenerated data confirmed in `npm run generate:companies`. |
| tars-robotics | Series B ¥600M, 2026-07-24, led Shenzhen Capital Group; founded 2023; total $850M | https://news.crunchbase.com/startups/ai-robotics-funding-july-2026-mid-year-check/ (200, fetched 2026-08-18) | V+N | Round, date and lead verified; founded verified. totalRaisedUsd nulled: no fetched source states a company total. |
| x-square-robot | Series B $276M, 2026-03-01, leads [Xiaomi]; total $350M | https://news.crunchbase.com/startups/ai-robotics-funding-june-2026/ (200: "$293 million ... Series B funding"; participation by Xiaomi and HSG) | C+N | Amount corrected $276M→$293M; leads corrected to `['Xiaomi', 'HSG']` (both named as participants; no sole lead). Date corrected to 2026-04-15 per the April Crunchbase roundup (same fetched cluster). totalRaisedUsd nulled (no source states $350M). |
| robot-era | Series B ¥600M ($83M), 2026-01-05, leads [CDH, ByteDance]; founded 2023; total $290M | https://news.crunchbase.com/startups/ai-robotics-funding-april-2026-roundup/ (200: Series B closed 2026-04, HSG a participant); https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/ (200, the July cluster entry actually written to the row) | C+N | Date corrected to 2026-04-01; lead list cleared (the fetched roundups name no lead for this round). Founded and round size kept as previously sourced within the fetched Crunchbase cluster. totalRaisedUsd nulled. |
| spirit-ai | Angel round ¥300M, 2026-01-07; total $41M | https://news.crunchbase.com/startups/ai-robotics-funding-july-2026-mid-year-check/ (200: angel extension, 2026-07) | C+N | latestRound re-dated to the fetched July extension. totalRaisedUsd nulled (no fetched source states a total). |
| galaxea-ai | Series A extension 2026-02-25; founded 2021 Shenzhen; total $284M | https://humanoidindex.org/companies/galaxea-ai (200); https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/ (200, the July roundup URL written to the row) | C+N | founded corrected to 2023, Beijing (humanoidindex). totalRaisedUsd nulled. Extension re-dated per fetched roundup. |
| engineai | Series B ¥500M, 2025-11-03, led Alibaba; total $150M; founded 2023 | https://humanoidindex.org/companies/engine-ai (200); Crunchbase roundups (200) | N | Round kept as reported; totalRaisedUsd nulled (no fetched source states $150M). Founded verified. |
| galaxea-ai-robot | (entire row) | duplicate of `galaxea-ai`: same company (Galaxea AI / Galaxea Extra AI), same Beijing HQ, redundant round and source fields | C | **Row removed** (112→111). One canonical `galaxea-ai` row remains; all count references (tests, scripts, home copy) updated in the same commit. |
| kepler-robot | founded 2024 | https://humanoidindex.org/companies/kepler-robot (200: "Founded 2023") | C | founded corrected 2024→2023. Lead list cleared where the fetched page names none. |
| limx-dynamics | founded 2023; Series A 2025-07-08 | https://humanoidindex.org/companies/limx-dynamics (200: "Founded 2022"); https://www.technode.com/...limx-dynamics-series-b (200, 2026-02-03: $200M Series B) | C | founded corrected 2023→2022; latestRound updated to Series B $200M, 2026-02-03. totalRaisedUsd nulled. |
| clone-robotics | founded 2024 | https://humanoidindex.org/companies/clone-robotics (200: "Founded 2021") | C | founded corrected 2024→2021. |
| mentee-robotics | round 2026-01-21; founded 2022 | https://humanoidindex.org/companies/mentee-robotics (200) | C+N | Founded re-dated per fetched page; lead list cleared; totalRaisedUsd nulled. |
| booster-robotics | founded 2024 | https://humanoidindex.org/companies/booster-robotics (200: "Founded 2023") | C | founded corrected 2024→2023; lead list cleared where the fetched page names none. |
| leju-robotics | founded 2017 | https://humanoidindex.org/companies/leju-robotics (200: "Founded 2016") | C | founded corrected 2017→2016. |
| hanson-robotics | founded 2012 | https://humanoidindex.org/companies/hanson-robotics (200: "Founded 2003") | C | founded corrected 2012→2003. |
| paxini | founded 2024, HQ Shenzhen/CN | https://humanoidindex.org/companies/paxini (200: "Founded 2020, Tokyo, Japan") | C | founded corrected 2024→2020; HQ corrected to Tokyo, JP (moves the CN country filter count 21→20). Correction of record: the e2e country-filter oracle was NOT updated in this audit's commits (found red by the follow-up full-suite run, 2026-08-18) and is updated in the same follow-up commit as this ledger fix. |
| switchbot | status private; no IPO | https://www.caixin.com/...switchbot-one-robotics-ipo (200, fetched via syndication): SwitchBot (OneRobotics) raised $206M (HK$1.6B) in its Hong Kong IPO on 2025-12-30 | C | status corrected to `public`; latestRound set to IPO $206M, 2025-12-30. Added to the unit-test IPO list. |
| agibot | latestRound leads | https://news.crunchbase.com/startups/ai-robotics-funding-june-2026/ (200) | C | leads corrected to `['CATL']` per the fetched round coverage. |
| saronic-defense | (id and name) — the row's figures describe Anduril | https://www.businessinsider.com/anduril-funding-valuation-2026-3 (200, fetched: "Anduril is now valued at $61 billion"; Founders Fund) | C | id renamed `saronic-defense`→`anduril` (the shipped row mislabeled Anduril's round). Figures corrected against the fetched Anduril coverage; test references updated in the same commit. |
| mind-robotics | rounds 2026-01-12, 2026-04-07 | https://news.crunchbase.com/startups/ai-robotics-funding-july-2026-mid-year-check/ (200: $500M and $400M rounds) | C+N | Both rounds re-dated per the fetched roundup. totalRaisedUsd stays null (the CEO's "more than $2B" is a lower bound — the Skild rule, generalized per triage). |
| neura-robotics | round fields | https://neura-robotics.com/record-series-c/ (first-party); https://www.coindesk.com/business/2026/06/11/tether-leads-usd1-4-billion-funding-round-in-german-robotics-company-neura/ ; https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html (all 200, fetched via search) | N | Round kept as reported; totalRaisedUsd nulled (no fetched source states a total). Follow-up: the row's original "Crunchbase roundup cluster" citation carried no URL; the URLs actually written to the dataset are listed here now (they are on the row itself). |
| robotphoenix | IPO fields | https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/ (200, fetched via search; the URL actually written to the row) | V | Verified as fetched. Follow-up: this row's original "Crunchbase July roundup" citation carried no URL; the row's actual URL is now named. |
| meta-robotics / assured-robot-intelligence | acquisition status | https://techcrunch.com/2026/.../meta-acquires-assured-robot-intelligence/ (200, fetched) | V | Acquisition verified; sources re-dated to the fetched TechCrunch piece. |

| field-ai | founded null; total $405M; round $405M 2025-08-20 at $2B; leads [] | https://www.cnbc.com/2025/08/20/gates-nvidia-fieldai-robotics.html (200, fetched 2026-08-18: "$405 million in two funding rounds"; "$2 billion"; "two-year-old startup"; Irvine; NVentures, Bezos Expeditions, Khosla, Temasek, Canaan, Intel Capital — none named as lead) | C | founded set to 2023 (CNBC's "two-year-old" as of 2025-08-20). Round fields and Irvine HQ verified; no lead named in any fetched source, so leads stay empty. Total kept: CNBC states $405M across the two rounds. constructiondive.com URL was dead this session (404); CNBC added as the live source of record. |
| bedrock-robotics | Series B $270M 2026-02-04 at $1.75B; total $350M; leads [] | https://finance.yahoo.com/news/bedrock-robotics-raises-270m-red-131800649.html (200, Construction Dive via Yahoo, fetched 2026-08-18: "raised $270 million in a Series B"; "total funding to over $350 million"; "valuation of $1.75 billion"; "co-led by CapitalG and the Valor Atreides AI Fund") | C | leadInvestors set to `['CapitalG', 'Valor Atreides AI Fund']` (the fetched piece names the co-leads). Amount, date, valuation, total all verified. Dead constructiondive.com URL (404 this session) replaced with the live Yahoo syndication. TechCrunch launch piece kept (200 earlier in the run). |
| berkshire-grey | Acquisition by SoftBank 2023-03-24, amount null | https://www.berkshiregrey.com/resources/press-release/berkshire-grey-enters-into-definitive-merger-agreement-with-softbank (200, first-party, fetched 2026-08-18: "$1.40 per share in an all-cash transaction valued at approximately $375 million") | C | latestRound.amountUsd set to $375M (the first-party press release states the deal value). Status `acquired`, buyer SoftBank and 2023-03-24 date verified. |
| zebra-robotics-automation | Divestiture to Skild AI 2026-04-15 | https://www.zebra.com/us/en/about-zebra/newsroom/press-releases/2026/skild-ai-acquires-zebra-technologies--robotics-automation-busine.html (headline + Businesswire wire text confirmed via search; Zebra page itself 406-bot-walled on direct fetch this session) | V | The wire text (Businesswire, 2026-04-15, fetched via search results): "Skild AI today announced the acquisition of Zebra Technologies' Robotics Automation business, including its Symmetry Fulfillment orchestration platform." Status `acquired`, buyer, date verified. Source asOf refreshed to 2026-08-18. |
| humanoid-uk | Series A $152M 2026-07-21 at $1.35B; leads [Prime Movers Lab, Schaeffler, Bosch]; total $152M | https://thehumanoid.ai/humanoid-raises-152-million-at-1-35-billion-post-money-valuation (200, first-party, fetched 2026-08-18: "led by Prime Movers Lab, with participation from Schaeffler, Bosch, Fubon... and Aglaé Ventures"; "total amount raised to date to $270 million"; founded by Artem Sokolov in 2024) | C | leadInvestors corrected to `['Prime Movers Lab']` (the first-party release names one lead; Schaeffler and Bosch are participants — Bosch is the contract manufacturer). totalRaisedUsd corrected $152M→$270M (first-party). Bot-walled Reuters URL dropped; first-party source added. |
| applied-intuition | Series F $600M 2025-06-17 at $15B, led [BlackRock, Kleiner Perkins]; total $1.2B | https://www.appliedintuition.com/blog/series-f (200, first-party, fetched 2026-08-18: "BlackRock and Kleiner Perkins led the round"; $15B valuation) | C+N | Round, date, valuation, leads verified verbatim. totalRaisedUsd $1.2B nulled: no fetched source states a company total. |
| sanctuary-ai | Series B ~2024 at $500M led [Accenture, Magna, BDC Capital]; total $140M | https://blog.robozaps.com/b/sanctuary-ai-phoenix-review (200, fetched 2026-08-18, fully sourced recap: pivot announced 2026-06-17 to Physical AI software on third-party industrial arms; Daniel Friedmann named CEO Jun 2026; "more than C$140 million (about US$99 million)" by mid-2024 with "later estimates putting the total higher"; Bell led the 2022 Series A; 2024 round was strategic financing from BDC Capital and InBC with no stated lead/amount/valuation) | C+N | The shipped "Series B at $500M" is not stated by any fetched source: nulled type/amount/valuation and cleared leads, keeping the 2024 strategic-financing date. totalRaisedUsd nulled (the C$140M figure is itself a lower bound and currency-approximate). Deployment string re-dated: pivot was June 2026. sanctuary.ai/news/ kept; robozaps recap added. |
| coco-robotics | latestRound all-null; total null; founded 2020 | https://www.therobotreport.com/coco-robotics-raises-80m-to-scale-sidewalk-delivery-robots/ (200, fetched 2026-08-18: "raised $80 million in strategic funding"; "Founded in 2020"; investors listed, none named as lead; Santa Monica) | C | latestRound set to Series B $80M, 2025-06-11; leads left empty (TRR names investors but no lead). coco.delivery home page kept. Founded verified. |
| chef-robotics | Series A $43.1M 2025-03-31; total $43M; leads []; founded null | https://www.therobotreport.com/chef-robotics-brings-in-43m-to-deploy-more-food-assembly-robots/ (200, fetched 2026-08-18: "$43.1 million in Series A... includes $20.6 million in equity and $22.5 million in equipment financing debt"; "Avataar Ventures led the equity round"; "brings Chef's total capital raised to $65.6 million"; "Since it was founded in 2019"; customers Amy's Kitchen, Sunbasket, Chef Bombay, Cafe Spice) | C | totalRaisedUsd corrected $43M→$65.6M (TRR's stated total). leadInvestors set to `['Avataar Ventures']`. founded set to 2019. Deployments expanded to TRR's named customers. Dead first-party blog URL (404 this session) dropped; TRR kept. |
| boston-dynamics | acquired by Hyundai $1.1B 2021; founded 1992 | https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/ (200, first-party, fetched 2026-08-18: "Hyundai Motor Group, Boston Dynamics' majority shareholder"; product Atlas unveiled Jan 5 2026; "All Atlas deployments are already fully committed for 2026, with fleets scheduled to ship to Hyundai's... RMAC and Google DeepMind"; Hyundai "preparing to deploy tens of thousands"; $26B US investment incl. a 30,000-robots/yr factory) | V | Acquisition fields and founded verified earlier in the audit window (2021 Hyundai deal, majority stake confirmed here). Deployments updated with the fetched 2026 status (Atlas product, Hyundai/DeepMind fleets, factory plan) so the row is current as of the audit. Self-dialogue residue in the old source cell removed by re-dating sources. |
| mytra | latestRound Series B-ish, leads [Greenoaks, Eclipse]; total null; founded null; source = one Business Insider listicle | https://mytra.ai/news/mytra-raises-120m-series-c (200, first-party, fetched 2026-08-18: "$120M Series C round led by Avenir Growth"; "Founded in 2022"; Brisbane CA) | C | latestRound set to Series C $120M, 2026-01-15, led Avenir Growth. founded set to 2022. The undated BI listicle (its only pointer) replaced with the first-party release. |
| encord | latestRound all-null; total null | https://encord.com/blog/encord-announces-30-million-series-b/ (200, first-party, fetched 2026-08-18: "$30 million in Series B funding"; "Next47 lead the round, with participation from... CRV, Crane Venture Partners, and Y Combinator"; announced 2024-08-13) | C | latestRound set to Series B $30M, 2024-08-13, led Next47. The internally incoherent 404/200 source cell resolved: the Business Insider chores piece is live and kept; the encord.com data-collection page kept. |
| eka-robotics / foundry-robotics / formic / miso-robotics | pointerless or listicle-only rows | searches this session: Formic's last verifiable round remains the $26.5M Series A led by Lux Capital (2022-01-18, Businesswire headline confirmed via search; no newer fetched round). Miso Robotics is active and acquired Zignyl (2026-02-26, Fortune headline via search); no fetched funding figures. Eka/Foundry: no primary funding coverage fetchable this session beyond the BI investor listicle. | U | Partially resolved: Formic's leads [Lux Capital] stand (2022 Series A); its row now cites the Businesswire release (asOf 2026-08-18). Miso's Zignyl acquisition added to deployments with the Fortune pointer (asOf 2026-08-18); no funding figures invented. Eka and Foundry keep their verified-description sources only; totals stay null. Recorded as unresolved for funding fields. |

| sunday-robotics | Series B $165M 2026-03-12 at $1.15B, led Coatue; total $200M | https://www.globenewswire.com/news-release/2026/03/12/3254877/0/en/Sunday-Raises-165M-to-Launch-First-Autonomous-Robots-by-Thanksgiving.html (headline, fetched via search 2026-08-18: "Sunday raises $165M at a $1.15B valuation... The round is led by Coatue"); TechCrunch 2026-03-12 same figures | V | All fields verified; first-party GlobeNewswire release added as the source of record. No edit to figures. |
| nuro | Series E $203M on 2026-03-03 at $6B | https://www.businesswire.com/news/home/20250821665495/en/Nuro-Closes-203-Million-Series-E-Financing-to-Advance-Its-AI-First-Autonomy-Platform (headline, fetched via search 2026-08-18: "closing of a $203M Series E funding round at a $6B valuation", 2025-08-21) | C | date corrected 2026-03-03→2025-08-21 (the close; the March date matches no fetched source). Amount and valuation verified. First-party Businesswire release added. |
| abb-robotics | Acquisition by SoftBank 2025-10-08, amount $5.4B | https://group.softbank/en/news/press/20251008 (headline, fetched via search 2026-08-18); Reuters: "$5.4 billion deal"; ABB/moneycontrol: "enterprise value of $5.375 billion" | C | amountUsd corrected $5.4B→$5.375B (the precise enterprise value in the ABB announcement). SoftBank Group press release added as the source of record. |
| 1x-technologies | Series B $100M 2024-01-01 at $500M, leads [OpenAI, EQT Ventures]; total $125M | https://en.wikipedia.org/wiki/1X_Technologies (200, fetched 2026-08-18: Series B Jan 2024 "led by EQT Ventures"; the $23.5M A2 was the OpenAI-led round; Sept 2025 $1B raise was *reported seeking*, not closed; HQ Palo Alto) | C+N | leadInvestors corrected to `['EQT Ventures']` (the Series B lead per Wikipedia/TRR; OpenAI led the 2023 A2). totalRaisedUsd $125M nulled: no fetched source states a company total, and the last confirmed round is the $100M Series B. Wikipedia + TRR Series B piece added. |
| agility-robotics | SPAC 2026-06-24 at $2.5B with Churchill Capital Corp XI; total $641M | https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi (first-party announcement, fetched via search 2026-08-18); Reuters/TechCrunch: ~$620M expected proceeds, Nasdaq AGLT, close expected 2026 | C+N | totalRaisedUsd $641M nulled (no fetched source states it). SPAC deal, $2.5B valuation, Churchill XI and date verified; first-party release added. Status stays `private` (merger announced, not confirmed closed as of 2026-08-18). |
| genesis-ai | Seed $105M 2025-07-01, leads [Eclipse, Khosla Ventures]; total $105M | https://www.prnewswire.com/news-releases/genesis-ai-emerges-from-stealth-with-105m-to-build-universal-physical-intelligence.html (first-party headline, fetched via search 2026-08-18); TechCrunch: "$105M in seed funding... from Eclipse, Khosla" | V | All fields verified. First-party PR added as the source of record. |
| galbot | round $300M 2025-12-19, valuation null; total $800M | https://www.prnewswire.com/news-releases/galbot-secures-over-300-million-in-new-funding-breaking-records-with-3-billion-valuation-in-chinas-humanoid-robot-sector.html (first-party headline, fetched via search 2026-08-18: "exceeding $300 million, bringing the company's total funding to $800 million... $3 Billion Valuation") | C | valuationUsd set to $3B (first-party). Amount and total verified. First-party PR added. |
| ubtech-robotics | IPO 2023-12-01, amount null, leads [Tencent, CDH Investments]; total $940M | https://www.scmp.com/business/article/3246584/ubtech-maker-stormtrooper-robots-jumps-hong-kong-trading-debut (headline, fetched via search 2026-08-18: "raised HK$1 billion (US$130 million)"; listing debut 2023-12-29) | C | amountUsd set to $130M (HK$1B at the SCMP-stated conversion). leadInvestors cleared: an IPO has no lead VCs, and the fetched sources name Tencent only as a pre-IPO backer. Date corrected to 2023-12-29 (debut). totalRaisedUsd $940M stays unverified-by-this-session but pre-IPO; flagged in notes. |
| fourier-intelligence | Series E null-amount 2024 at $800M, leads [SoftBank, Saudi Aramco]; total $109M | https://www.therobotreport.com/fourier-intelligence-raises-62m-healthcare-robotics/ (headline, fetched via search 2026-08-18: "raises $62M... led by SoftBank Vision Fund 2... Saudi Aramco P7 Venture Fund and Yuanjing Vision Plus Capital", 2024-09-30) | C+N | latestRound corrected to Series D $62M, 2024-09-30, led SoftBank Vision Fund 2 (the fetched round; the "Series E" label matches no fetched source). totalRaisedUsd nulled (aggregators conflict $109M vs $200M+; no primary states one). valuationUsd $800M nulled (aggregator figure, not stated by any fetched primary). |
| nimble-robotics | Series C $106M 2024-09-26 at $1B, led FedEx | https://www.freightwaves.com/news/fedex-fulfillment-expands-through-strategic-alliance-with-nimble-robotics (fetched via search 2026-08-18; round coverage: Series C 2024-10-23, $1.1B post-money, FedEx co-lead/strategic) | C | date corrected 2024-09-26→2024-10-23; valuationUsd corrected $1B→$1.1B. FedEx kept as lead (co-lead/strategic per the alliance coverage). |
| gecko-robotics | round $125M 2025-06-12 at $1.25B, type null | https://www.cnbc.com/2025/06/12/gecko-robotics-raises-125-million-surpassing-billion-dollar-valuation.html (headline, fetched via search 2026-08-18); https://www.geckorobotics.com/news/gecko-reaches-unicorn-status (first-party: "Series D round led by Cox Enterprises") | C | latestRound.type set to Series D and leadInvestors set to `['Cox Enterprises']` (first-party names the lead). Amount, valuation, date verified. |
| mujin | Series D $233M 2025-12-01 at $1B; total $233M | https://www.businesswire.com/news/home/20251202560677/en/Mujin-Raises-US$-233-Million-to-Accelerate-Global-Growth-and-Drive-Industrial-Autonomy (first-party headline, fetched via search 2026-08-18: first closing of $233M Series D, 2025-12-02) | C | date corrected 2025-12-01→2025-12-02. valuationUsd $1B nulled (stated in no fetched source). First-party release added. |
| wandercraft | Series D $75M 2025-06-11; total $125M | https://www.globenewswire.com/news-release/2025/06/11/3097632/0/en/wandercraft-announces-Series-D-Round-bringing-75M-in-total-funding.html (first-party headline, fetched via search 2026-08-18) | C+N | Round verified. totalRaisedUsd $125M nulled: the first-party headline reads "bringing $75M in total funding", which contradicts the shipped $125M and makes round-vs-total ambiguous; nulled rather than guessed. |
| dexterity | round $95M 2025-03-11 at $1.65B; total $296M | https://finance.yahoo.com/news/dexterity-secures-95m-reaching-1-110002439.html (fetched via search 2026-08-18: "$95m, reaching $1.65bn valuation"; "total funding to nearly $300m"); Bloomberg headline same round | C | Round, date, valuation verified. totalRaisedUsd corrected $296M→null: the fetched figure is "nearly $300m", an approximation, not a stated total (lower-bound rule). Yahoo piece added. |
| monarch-tractor | latestRound Acquisition 2026-04-14 led Caterpillar; total $300M | https://techcrunch.com/2026/04/15/monarch-tractors-collapse-ends-in-with-an-acquisition-by-caterpillar/ (headline, fetched via search 2026-08-18); Bloomberg/Equipment World: acquired by Caterpillar, undisclosed amount, after collapse | C | status correction re-attributed on follow-up: the row was **already `acquired` at baseline 75a2916**; this audit changed no status here. The real edits stand: the Caterpillar acquisition re-verified against fetched coverage, totalRaisedUsd $300M nulled (no fetched source states it), collapse-and-asset-sale noted in deployments. |
| diligent-robotics | Acquisition 2026-01-20 led Serve Robotics; total $55M | https://ir.serverobotics.com/news-releases/news-release-details/serve-robotics-acquire-diligent-robotics-expanding-physical-ai (first-party, fetched via search 2026-08-18); Austin Business Journal: "$29 million" common-stock value | C | Status correction re-attributed on follow-up: the row was **already `acquired` at baseline 75a2916**; this audit changed no status here. The real edits stand: latestRound.amountUsd set to $29M (the stated deal value for common stock), totalRaisedUsd $55M nulled (no fetched source states it). |

| xdof | round $70M 2026-06-17; total $70M | https://techcrunch.com/2026/06/17/collecting-robot-training-data-is-dirty-unglamorous-work-some-ai-labs-are-already-paying-xdof-to-do-it/ (fetched via search 2026-08-18; corroborated by SiliconANGLE, cnmra, AI Weekly: emerged from stealth with $70M from Thrive, Spark, a16z, Lux, WndrCo; founded Oct 2024, Berkeley) | C+N | Round amount and date verified; no lead named in any fetched source, so leads stay empty. totalRaisedUsd nulled (no fetched source states the round is the whole total). |
| deep-robotics | round $70M 2025-12-10, type null, leads []; total $210M | https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html (SCMP via Yahoo, fetched via search 2026-08-18: 500M yuan = US$70M, 2025-12-10); longbridge: "Series C... led by China Merchants Bank International" | C+N | type set to Series C; leadInvestors set to `['China Merchants Bank International']`. totalRaisedUsd $210M nulled (stated in no fetched source). Caixin reports IPO tutoring began 2025-12-25 (headline seen); noted for future re-audit. |
| persona-ai | round $27M 2025-05-19, leads [Unity Growth]; total $37M | https://www.prnewswire.com/news-releases/persona-ai-raises-27m-oversubscribed-pre-seed-to-deliver-the-future-of-embodied-ai-302454129.html (first-party headline, fetched via search 2026-08-18: "oversubscribed pre-seed... $27 million", 2025-05-14); company X post: "Co-led by Unity Growth and Tides Ventures" | C+N | type set to Pre-seed; date corrected to 2025-05-14; leads set to `['Unity Growth', 'Tides Ventures']`. totalRaisedUsd nulled (no fetched source states $37M). HD Hyundai shipyard deployment verified by TRR coverage in the same search. |
| astribot | Series B $140M 2026-06-03; total $140M | https://pandaily.com/astribot-billion-dollar-valuation-series-b-jun2026/ (fetched via search 2026-08-18); Tech Buzz China: "Series B round of over 1 billion RMB (~$138 million) and a valuation north of 10 billion yuan (~$1.38 billion)" | C+N | amount corrected $140M→$138M and valuationUsd set to $1.38B (both derived from the fetched RMB figures at the coverage's own conversion). totalRaisedUsd nulled (no primary total fetched). |
| carbon-robotics | round $20M 2025-10-23 led NVIDIA NVentures; total $276M | https://www.geekwire.com/2025/carbon-robotics-raises-20m-as-laserweeder-maker-plans-secretive-new-ai-robot-for-farms/ (fetched via search 2026-08-18); https://www.businesswire.com/news/home/20241021330997/en/Carbon-Robotics-Raises-70-Million-Series-D-Investment-Round (first-party, 2024-10-21: $70M Series D) | C+N | latestRound set to Series D $20M, 2025-10-23 (the fetched GeekWire round; the $70M Series D kept as the prior-round source). totalRaisedUsd $276M nulled (aggregator figure, stated in no fetched primary). |
| k-scale-labs | total $400K | https://newsletter.failory.com/p/the-open-source-robot (fetched via search 2026-08-18: "ran out of runway", Nov 2025); aibase: "shuts down... refunds and liquidation", $400,000 left on books | C | Status correction re-attributed on follow-up: the row was **already `dead` at baseline 75a2916** (verified via `git show 75a2916:data/companies.ts`), so this audit changed no status here. The real edits stand: totalRaisedUsd nulled ($400K is remaining cash, not funding) and the Nov 2025 shutdown noted in deployments. |
| standard-bots | round $63M 2024-07-13 at $1B; total $63M | https://www.forbes.com/sites/johnkoetsier/2026/06/10/bringing-jobs-back-to-the-us-via-robots-standard-bots-raises-200-million-at-1-billion-valuation/ (fetched via search 2026-08-18: "raised $200 million at a $1 billion valuation"); https://standardbots.com/blog/standard-bots-raises-63m-to-accelerate-ai-in-robotics/ (first-party: $63M total, Series B led by General Catalyst) | C | latestRound updated to Series C $200M, 2026-06-10, at $1B (the fetched Forbes round). totalRaisedUsd nulled ($63M was the 2024 total; no fetched source states the new total). |
| automata | Series C $45M 2026-02-05, led Dimension; total null | https://www.businesswire.com/news/home/20260129548625/en/Automata-Raises-45M-Series-C-to-Build-the-Operating-System-for-Life-Sciences (first-party headline, fetched via search 2026-08-18: "close of a $45 million Series C funding round led by Dimension", announced 2026-01-29) | C | date corrected 2026-02-05→2026-01-29 (the announcement date in the first-party release). Amount and lead verified. |
| avidbots | Series C $70M 2022-09-28, leads []; total $70M | https://avidbots.com/news/avidbots-raises-70m-in-series-c-funding/ (first-party, fetched via search 2026-08-18); roboticsandautomationnews: "The financing was led by Jeneration Capital" | C | date corrected to 2022-09-27 (first-party post date); leadInvestors set to `['Jeneration Capital']`. totalRaisedUsd nulled (no fetched source says the round equals the total). |
| lila-sciences | round $200M 2025-01-01; total $550M | https://www.lila.ai/news/announcing-the-close-of-our-series-a (first-party, fetched via search 2026-08-18: "$350M Series A, bringing total funding to $550M", 2025-10-10); Reuters: $115M extension at >$1.3B valuation with Nvidia backing | C | latestRound updated to Series A $350M, 2025-10-10, at $1.3B (per the Reuters extension coverage); totalRaisedUsd $550M verified by the first-party Series A post. Seed launch ($200M, 2025-03-10, Flagship) verified via the Flagship press release headline in the same search. |

| collaborative-robotics | latestRound all-null; total $140M; source = Tracxn page | https://www.prnewswire.com/news-releases/collaborative-robotics-raises-100-million-in-series-b-funding-302110842.html (first-party headline, fetched via search 2026-08-18); Reuters/Crunchbase News: Series B $100M led by General Catalyst, 2024-04-10 | C | latestRound set to Series B $100M, 2024-04-10, led General Catalyst. totalRaisedUsd $140M nulled (Tracxn aggregator figure; no fetched primary states a total). Aggregator URL demoted; first-party PR added. |
| ambirobotics | latestRound all-null; total $67M | https://techcrunch.com/2022/10/17/ambi-robotics-secures-32m-infusion-to-deploy-its-item-sorting-robots/ (fetched via search 2026-08-18: "$32 million in additional funding"; "has raised $67 million in venture funding") | C | latestRound set to Series B $32M, 2022-10-17; no lead named in fetched coverage, so leads stay empty. totalRaisedUsd $67M verified (TechCrunch states it directly). |
| serve-robotics | status public; Uber partnership | https://techcrunch.com/2026/08/11/uber-surprised-robotics-company-serve-by-selling-its-entire-stake/ (fetched via search 2026-08-18: Uber sold its entire stake, Q2 2026); LA Times/Reuters: Grubhub partnership + DoorDash expansion, 2026-08-17 | V+C | Public listing verified (Q2 2026 earnings coverage). Deployments updated with the material 2026 events: full Uber divestment with the partnership not expected to renew in early 2027, and the new Grubhub/DoorDash deals. Keeps the row current as of the audit. |
| covariant | Acqui-hire by Amazon 2024-08-31; status acquired | https://www.aboutamazon.com/news/company-news/amazon-covariant-ai-robots (200, first-party, fetched via search 2026-08-18: Amazon hired founders Pieter Abbeel, Peter Chen, Rocky Duan and ~25% of staff, with a non-exclusive license to Covariant's RFMs) | V | The reverse acqui-hire characterization is accurate per the first-party announcement; status `acquired` stands as the shipped convention. Source re-dated. |

| x-square-robot | (history corroboration) | https://www.cnbc.com/2025/09/08/alibaba-leads-100-million-investment-in-chinese-humanoid-robot-startup.html (fetched via search 2026-08-18: ~$100M Alibaba-led round, the company's eighth since founding; Bloomberg prints $140M/¥1B for the same round) | V | The batch-3 Series B correction ($293M, 2026-04-15, Xiaomi/HSG) stands; the fetched CNBC piece corroborates the funding cadence and Quanta X2. Added for provenance. |
| neura-robotics | latestRound (post-batch-3 state) | https://neura-robotics.com/record-series-c/ (first-party, fetched via search 2026-08-18: "Record Series C of up to $1.4B", 2026-06-10); CoinDesk/Bloomberg: Tether led; Nvidia, Amazon, Qualcomm, Bosch participated | C | latestRound set to Series C $1.4B ("up to"), 2026-06-10, led `['Tether']`. totalRaisedUsd nulled (no fetched source states a company total). First-party + CoinDesk sources added. |
| plus-one-robotics | latestRound all-null; total null; source = warehouse roundup listicle | https://www.businesswire.com/news/home/20230306005881/en/Plus-One-Robotics-Raises-50-Million-in-Funding-Led-by-Scale-Venture-Partners (first-party headline, fetched via search 2026-08-18); TRR: total "almost $100M" | C+N | latestRound set to Series C $50M, 2023-03-07, led Scale Venture Partners. totalRaisedUsd stays null (the stated "nearly $100 million" is an approximation). Listicle demoted, first-party added. |
| simbe-robotics | latestRound leads [Eclipse]; source = Crunchbase org page | https://www.simberobotics.com/about/newsroom/simbe-raises-50-million-in-series-c-funding (first-party, fetched via search 2026-08-18); Grocery Dive: "Goldman Sachs led... total funding raised to over $100 million" | C+N | latestRound set to Series C $50M, 2024-10-24, led Growth Equity at Goldman Sachs Alternatives (Eclipse is a participant per the first-party release). Crunchbase aggregator URL removed; first-party added. total stays null ("over $100 million" is a lower bound). |
| righthand-robotics | leads [Rockwell Automation], no round fields | https://www.therobotreport.com/righthand-robotics-receives-investment-from-rockwell-automation/ (fetched via search 2026-08-18: strategic investment announced 2025-03-06, amount undisclosed) | C | latestRound set to Strategic investment, null amount, 2025-03-06, lead Rockwell Automation. First-party announcement also fetched (righthandrobotics.com). |
| rainbow-robotics | status acquired; Acquisition 2025-01-02 leads [Samsung Electronics], amount null | https://techcrunch.com/2024/12/30/samsung-pays-181m-to-become-largest-shareholder-of-robot-maker-rainbow-robotics/ (fetched via search 2026-08-18: $181M / ₩267B for the new stake); Samsung newsroom: call option to 35%, subsidiary; Simply Wall St: still KOSDAQ-listed (277810) | C | **status corrected `acquired`→`public`** — Rainbow remains KOSDAQ-listed; Samsung is the largest shareholder making it a subsidiary, not a full acquisition. Round amount set to $181M, date 2024-12-31 (the filing/announcement). Subsidiary note added to deployments. |
| moon-surgical / cmr-surgical | source = shared pdpspectra blog post | https://moon-medical.com/ ; https://cmrsurgical.com/ (company sites, fetched-resolvable 2026-08-18; the exact bare-domain URLs written to the rows) | R | The shared third-party blog was not a per-record source; each row now carries its own first-party identity pointer (https://moon-medical.com/ and https://cmrsurgical.com/ respectively). Funding fields were already null (honest-unknown) and remain so. |
| serve-robotics timeline note | timeline consistency | `timelineEvents` derives from `latestRound` in `lib/market-map.ts` | V | No separate funding-timeline object exists; record↔timeline parity is by construction and was re-verified after every regeneration this session. |

| saronic | Series D $1.75B 2026-03-01 at $9.25B, led Kleiner Perkins; total $2.6B | https://www.prnewswire.com/news-releases/saronic-closes-1-75b-series-d-at-9-25b-valuation-to-accelerate-mission-focused-autonomous-maritime-platforms.html (first-party headline, fetched via search 2026-08-18); Reuters: closed 2026-03-31, $9.25B | C | date corrected 2026-03-01→2026-03-31. totalRaisedUsd $2.6B nulled (no fetched source states a company total). First-party PR added. |
| mitsubishi-robotics | description claims (mass production at converted engine plant) | https://www.assemblymag.com/articles/100290-mitsubishi-to-mass-produce-humanoid-robots-at-former-engine-plant (fetched via search 2026-08-18: mass production H1 2027, with University of Tokyo startup Highlanders, Kyoto plant) | R | Dead interestingengineering.com URL (404) replaced with the Assembly Magazine piece; claim verified. |
| ubtech-robotics | factory deployment claim | https://www.yahoo.com/tech/future-made-china-ubtech-robotics-093000541.html (fetched via search 2026-08-18: dozens of humanoids in an EV factory, 2025-03) | R | Dead interestingengineering.com URL (404) replaced with the Yahoo piece; claim verified. |
| agibot | component-supply claim (dead IE URL) | https://www.agibot.com/en/news (first-party newsroom, 2026-08-18) | R | Dead URL replaced with the first-party newsroom; the batch-3 CATL lead correction stands on the fetched Crunchbase cluster. |
| google-deepmind-robotics | model page URL 404 | https://deepmind.google/discover/blog/gemini-robotics-2-brings-whole-body-control-to-advanced-tasks/ (DeepMind blog, live per sweep) | R | Dead model-page URL replaced with the live blog post covering the same claim. |
| leaderdrive | dead personal-blog deep-dive URL | https://www.forbes.com/sites/zinnialee/2026/04/23/humanoid-mania-turns-chinas-robotic-joint-maker-leaderdrive-into-a-billions-dollar-business/ (fetched via search 2026-08-18: Shanghai-listed, China's largest robotic-joint maker) | R | Dead brianartex.github.io URL (404) replaced with Forbes; identity claims verified. |
| sharpa | dead milestone PR URL | https://www.sharpa.com/ (first-party) | R | Dead PR Newswire URL (404) replaced with the company site. Follow-up correction of record: the entry was APPENDED alongside an existing identical-URL source instead of replacing it, producing a duplicate source URL (React duplicate-key error in the card source list); deduplicated in the 2026-08-18 follow-up, which also added a validate:content gate that fails on any duplicate source URL within a record. |
| miso-robotics | Zignyl pointer (Fortune 404) | https://www.therobotreport.com/tag/miso-robotics/ (TRR coverage hub, live) | R | The Fortune URL 404s on direct fetch (paywall/rot); replaced with TRR's live coverage hub, which carries the Zignyl acquisition coverage. |
| weave-robotics | Isaac 1 description and preorder claims | https://www.businessinsider.com/weave-robotics-isaac-1-8000-home-robot-chores-2026-7 (fetched via search 2026-08-18: $7,999 preorder or $449/mo, July 2026, YC-backed, California ships fall 2026) | V | Description claims verified verbatim; no funding figures exist to audit (all null, correctly). |
| identity-only coverage of 21 records: nvidia-robotics, tesla-optimus, symbotic, amazon-robotics, locus-robotics, hugging-face-lerobot, micro1, farm-ng, intuitive-surgical, harmonic-drive-systems, nabtesco, sanhua, shadow-robot, wonik-robotics, xela-robotics, openai-robotics, starship-technologies, knightscope, brain-corp, pollen-robotics, fox-robotics | identity fields only (name, description, segment, status, HQ) against each record's own source URLs; no funding or founded-year fetch per record | each record's own `sources` array in research/04-market-map-companies.json names its URLs (reproducible: `npm run check:dataset-sources`); the 2026-08-18 curl sweep fetched every one and found each live or bot-walled-but-live (403/429) | V (identity + source liveness only) | What WAS verified for these 21: the source URLs resolve (liveness), and the identity fields are consistent with those pages. What was NOT verified: no funding figures were fetched or compared, because every one of these 21 records carries null funding fields (totalRaisedUsd null; latestRound present with every field null, the honest-null convention), so there is no funding claim on these records to audit; founded-year fields were not individually re-fetched either. This row replaces an earlier bundled row that covered the same records without naming them. |

## Source-URL sweep (post-fix)

All 200+ distinct source URLs in the dataset were resolved with `curl -sL` this session. Every row now carries at least one source that is either 200-OK or a live bot-walled page (403/429 on scripted fetch but resolvable, e.g. Bloomberg, Crunchbase News, kelo, Tracxn). Hard-404 URLs found by the sweep were replaced in the same session with live sources fetched via search (rows above, verdict R).

Correction of record (2026-08-18, reconciliation sweep): the one-off `curl`
pass above is no longer the last word on dataset-source liveness, and its
"every row carries at least one live source" claim does not hold against a
re-run the same day. The sweep is now a gated, reproducible command
(`npm run check:dataset-sources`, see audit/README.md), and its first full
run found real rot the one-off pass missed or that landed since: 223 URLs
across 111 records — 150 live, 19 blocked (bot-walls), 10 error
(inconclusive), 44 dead, leaving 9 records with no live source at all.

**Resolution (2026-08-18, market-map-source-refresh):** the 44 dead URLs
were worked from the gate's own output list. Every dead URL was replaced
with a live URL for the SAME claim (verified live by a node-fetch probe
with the sweep's browser user agent before being written in; no figure was
changed while its provenance was replaced — the diffs touch `sources`
entries only, never `latestRound`, `totalRaisedUsd` or any other field).
Where a dead entry duplicated a claim another live source in the record
already carried, the dead entry was removed rather than replaced, so no
record gained a duplicate URL (the generator and validate:content gate
this). The 9 records with no live source all gained live sources. The
remaining bot-walls and machine-unverifiable pages (Businesswire,
Bloomberg, Quartz, kelo, Yahoo's Node-fetch header overflow, two flaky
hosts) were verified live by independent fetch and documented in
`data/dataset-source-exceptions.ts` (CORRECTED 2026-08-18,
determinism fix, recounted from the committed files: the source-refresh
commit 3c165df held **18 entries total**, and the file held **0
entries** at 4b520a3 (its header there read "The list is empty as of
2026-08-18"), so **18 were added** — the "17 entries" this note
previously stated was an assertion, not a count, and so was a later
"19 total / 1 already present" figure. 6 of the 18 were Yahoo entries
whose sole justification was undici's 16 KiB header-size limit aborting
the fetch; after the sweep moved to an undici Agent with a 64 KiB
maxHeaderSize, those URLs fetch live and were removed, leaving **12
entries** counted from the committed file: 5 Businesswire,
2 Bloomberg, 1 Quartz, 1 kelo, 1 The Robot Report tag hub, 2
transient-routing-flake hosts, each with reason, verification method
and date). The gate now exits 0:

```
Checked 207 dataset source URLs across 111 records: 197 live, 0 dead,
0 blocked, 0 error, 10 documented exceptions.
```

(URL count 223→207: 16 dead or duplicate entries removed rather than
replaced.) `data/companies.ts` was regenerated from the research file
after the edits.

## Summary (counted from the tables above)

- Records checked: **111 of 111** shipped rows (one duplicate removed, 112→111; every surviving row has a ledger entry or is covered by a batch row above).
- Ledger rows: **98** (some rows cover one record, some cover a cluster; every record is named).
- Verdicts (rows, counted from the table): C 46, C+N 21, V 14, R 9, N 3, and one each of V+R, C+R, V+N, V+C, U.
- Records removed: **1** (galaxea-ai-robot, duplicate of galaxea-ai).
- Records renamed: **1** (saronic-defense→anduril, a mislabeled Anduril row).
- Status corrections: **2** (rainbow-robotics → public; switchbot → public). Follow-up reconciliation against baseline 75a2916 found monarch-tractor and diligent-robotics were already `acquired` and k-scale-labs already `dead` before the audit; their rows above keep the genuine non-status edits but no longer claim status corrections.
- Unresolved: **1 row** (eka-robotics / foundry-robotics funding fields; recorded in batch 4).
- Funding-timeline parity: by construction (`timelineEvents` derives from `latestRound` in `lib/market-map.ts`); re-verified after every regeneration.
- Lower-bound rule applied throughout: "more than $X" / "nearly $X" / "over $X" figures never promoted to totals (skild-ai, figure-ai, generalist-ai, apptronik, the-bot-company, unitree, and ~20 more).

## Verification transcript (commands actually run this session)

| Gate | Command | Result |
|---|---|---|
| unit/component | `npm run test -- companies market-map structured-search` | 8 files / 111 tests PASS (re-run after every batch) |
| full unit suite | `npm run test` | 168 files / 1701 passed, 1 skipped |
| content validator | `npm run validate:content` | PASS (after count-oracle updates to 111 / humanoids 34) |
| dataset generation | `npm run generate:companies` | "wrote 111 rows" after every data edit |
| typecheck | `npm run typecheck` | PASS |
| lint | `npm run lint` | PASS (no output) |
| build | `npm run build` | PASS (pagefind: 135 structured documents) |
| e2e (market-map set) | `npx playwright test tests/e2e/market-map.spec.ts tests/e2e/market-map-data.spec.ts tests/e2e/market-map-static.spec.ts` | CORRECTED ON FOLLOW-UP (2026-08-18): this row originally reported "13 passed", which was false as a claim about the tree — the targeted run reused a stale port-3200 dev server (playwright `reuseExistingServer: true`) and tested old code. A fresh full run with port 3200 killed first found failures inside these very specs (stale humanoids-35 oracles). |
| e2e (views) | `npx playwright test tests/e2e/market-map-deep-links.spec.ts tests/e2e/market-map-bubble-affordances.spec.ts tests/e2e/market-map-timeline-affordances.spec.ts` | CORRECTED ON FOLLOW-UP (2026-08-18): originally reported "18 passed"; same stale-server cause. The real failures included the sharpa duplicate-source-URL React key error (a data defect this audit introduced) and the CN 21-of-111 oracle the audit's own PaXini HQ edit invalidated. |
| e2e (integration+search) | `npx playwright test tests/e2e/go-public-integration.spec.ts tests/e2e/search-structured.spec.ts` | 22 passed (these specs were genuinely green) |
| e2e (full suite, follow-up) | `lsof -ti :3200 | xargs kill` then `npm run test:e2e` on the follow-up commit | **572 passed / 0 failed / 1 skipped** (the skip is the pre-existing VAL-WIKI-012 vacuous-pass skip in see-also.spec.ts) |
| source-URL sweep | `curl -sL` over all dataset source URLs | every row carries a live (200) or live-but-bot-walled (403/429) source; hard 404s replaced |
| dataset-source gate (source-refresh, 2026-08-18) | `npm run check:dataset-sources` | CORRECTED (determinism fix, 2026-08-18): this row originally reported "190 live, 17 documented exceptions", but the live-versus-exception split was not reproducible — undici's default 16 KiB maxHeaderSize aborted Yahoo fetches nondeterministically (UND_ERR_HEADERS_OVERFLOW). After the sweep moved to an undici Agent with 64 KiB maxHeaderSize (and the 6 resolved Yahoo exception entries were removed from `data/dataset-source-exceptions.ts`, now 12 entries recounted from the file), two consecutive runs printed a byte-identical summary: 207 URLs across 111 records — 197 live, 0 dead, 0 blocked, 0 error, 10 documented exceptions; the 6 Yahoo finance/tech URLs now report live, verified by the gate itself. REPRODUCIBILITY BOUNDARY: the totals (207 URLs, 0 dead, 0 error) are the load-bearing reproducible result, stable across runs and networks. Any live-versus-exception split recorded before the undici fix was a snapshot of one run, not a property of the dataset — a future auditor must not read a 1-URL split difference against those numbers as a regression. After the fix the split was stable across both observed runs (byte-identical summaries); two retained entries (allegrohand.com, chinadailyhk.com, transient routing flakes unrelated to the Yahoo issue) exist so that if those hosts ever flake again the URL falls through to its documented exception and the gate still exits 0 — a future run showing 195 live / 12 exceptions for exactly those hosts is the safety net working, not rot |
| source-refresh gates (2026-08-18) | `npm run test -- companies market-map structured-search` | 8 files / 111 tests PASS |
| source-refresh full unit suite | `npm run test` | 168 files / 1727 passed, 1 skipped |
| source-refresh content validator | `npm run validate:content` | PASS (111 companies, zero violations) |
| source-refresh regeneration | `npm run generate:companies` | "wrote 111 rows" |
| source-refresh typecheck | `npm run typecheck` | PASS |
| source-refresh lint | `npm run lint` | PASS (no output) |
| source-refresh build | `npm run build` | PASS (static export; 135 structured documents; no-slop rendered-prose sweep clean) |
| source-refresh e2e (full) | `lsof -ti :3200 \| xargs kill` then `npm run test:e2e` | **572 passed / 0 failed / 1 skipped** (fresh server; the skip is the pre-existing VAL-WIKI-012 vacuous-pass skip) |
| ledger↔diff reconciliation | `git status --short` + `git diff --stat` | clean tree; all corrections on disk and committed (11 commits, 2dc0173..e180ed6; corrected on follow-up: the audit's final commit was a3cf112, so the range was 2dc0173..a3cf112) |

## Follow-up (2026-08-18): post-audit reconciliation

The original audit session ran only targeted e2e specs and, because of the
stale-server pitfall, recorded them green against old code. An independent
full-suite run found 10 failures inside the same specs. The follow-up commit
(this one) fixed them all:

- sharpa duplicate source URL (data defect): deduplicated in the research
  file, `data/companies.ts` regenerated, and a `validate:content` gate added
  that fails on any duplicate source URL within a record.
- Count oracles re-baselined to the verified actual values: humanoids 34
  (heading + card-count in both specs), CN 20, timeline 73 — each with a
  comment naming what the count protects.
- The physical-intelligence `$600M` assertion retargeted to
  `[data-field="amount"]` so the correct source title cannot collide with it.
- Bubble geometry bounds re-baselined with the cause documented (plotted set
  38→37, log-scale floor lowered) and the roving-stop test made deterministic
  by focusing a known plotted mark (figure-ai, $39B valuation) first.
- This ledger's false claims corrected: status corrections 5→2, the PaXini
  "tests updated" claim, the humanoidindex.com→.org citations, the method
  paragraph, the commit range, and the e2e rows above.

Full-suite result on the follow-up commit (port 3200 killed before the run, 10.0m; this file is the only edit after that run, test-oracle content only): 572 passed / 0 failed / 1 skipped.

## Second-sourcing the two single-source records (2026-08-18)

rhoda-ai and wonik-robotics each carried exactly one source URL — compliant
with the dataset rules, but the two most fragile cells (rhoda-ai's sole
source sits on Yahoo, a host with a demonstrated flakiness history in this
project). Each record gained additional live sources for claims already
recorded. rhoda-ai gained one independent source (techfundingnews.com, a
different publisher). wonik-robotics gained two, and only one of them is
independent: wonikrobotics.com is the manufacturer's OWN corporate site and
allegrohand.com is its OWN product site, so that pair is a durability
addition (a second machine-live host) and not independent provenance; the
independent source is therobotreport.com, a trade outlet with no ownership
or authorship relationship to Wonik (added 2026-08-18 by the evidence-tier
correction pass; see the row below). No figure changed, no existing source
was replaced, and no record carries a duplicate URL (checked per-record
against the research file before and after).

| Record | Claim already recorded | Source added (fetched live with the gate's browser user agent, 2026-08-18) | Verdict | Note |
|---|---|---|---|---|
| rhoda-ai | Series A $450M at $1.7B valuation, 2026-03-10; Palo Alto HQ; FutureVision video-predictive platform | https://techfundingnews.com/rhoda-ai-450m-series-a-stealth-exit-robotics/ (curl, HTTP 200; states "$450 million in Series A funding", "$1.7B valuation", "Palo Alto", "FutureVision") | verified | Second source added; Yahoo (Reuters wire) source retained unchanged. Reuters and Bloomberg originals were probed and rejected: reuters.com returns HTTP 401, bloomberg.com is a documented bot-wall host — neither is machine-verifiable without an exception entry, so neither was written. |
| wonik-robotics | Builds Allegro Hand, robotic hand for research and automation | (a) https://wonikrobotics.com/index.php (curl, HTTP 200 after redirect from https://www.wonikrobotics.com/; page text: "Wonik Robotics is a robotics automation comp[any]" offering "Allegro Hand solutions") — issuer: Wonik Robotics, SAME publisher as allegrohand.com, so a durability addition, NOT independent. (b) https://www.therobotreport.com/gelsight-meta-ai-release-digit-360-tactile-sensor-for-robotic-fingers/ (curl with the gate's browser user agent, HTTP 200, 2026-08-18; fetched body text: "Meta AI also partnered with South Korea-based Wonik Robotics to develop the Allegro Hand", "Wonik Robotics will manufacture and distribute the Allegro Hand, which will be made available next year") — issuer: The Robot Report (WTWH Media), an independent trade publisher. | verified | Two sources added: (a) durability only, same publisher as the existing source; (b) the independent corroboration of the recorded claim. Existing source retained unchanged. |

Gate totals after the additions, from `npm run check:dataset-sources`
(two consecutive runs, exit 0 both times, each reporting the same totals
plus one transient coindesk 429 block):
209 URLs across 111 records — 198 live, 0 dead, 0 error, 10 documented
exceptions. The "1 blocked" in both runs is a transient HTTP 429 from
coindesk.com on the neura-robotics URL (pre-existing, unrelated to this
change, not dead on any run). The prior reproducible baseline was 207
URLs / 197 live; the +2 URL delta is exactly the two added URLs, but the
+1 live delta (197 -> 198) is the net of two new live URLs plus
coindesk.com (neura-robotics) flipping live -> blocked with an HTTP 429
between the baseline and these runs, as recorded three lines above.

Gates run this session for this change (source-entry additions only; no
dataset field or count changed, so no full e2e was required — the
targeted market-map specs plus the unit suite are the documented
sufficient evidence):

| Gate | Command | Result |
|---|---|---|
| dataset-source gate (×2) | `npm run check:dataset-sources` | exit 0 both runs, identical summaries: 209 URLs / 111 records — 198 live, 0 dead, 0 error, 10 exceptions (one run also showed 1 transient 429 blocked, see above) |
| content validator | `npm run validate:content` | PASS (42 modules, 307 citations, 111 companies; duplicate-source gate green) |
| regeneration | `npm run generate:companies` | "wrote 111 rows" |
| targeted unit specs | `npm run test -- companies market-map structured-search` | 8 files / 111 tests PASS |
| full unit suite | `npm run test` | 168 files / 1727 passed, 1 skipped |
| typecheck | `npm run typecheck` | PASS |
| lint | `npm run lint` | PASS (no output) |
| build | `npm run build` | PASS (static export, 135 structured documents, no-slop clean) |
| targeted e2e (port 3200 killed first) | `npx playwright test tests/e2e/market-map.spec.ts tests/e2e/market-map-data.spec.ts tests/e2e/market-map-static.spec.ts tests/e2e/market-map-deep-links.spec.ts` | 23 passed |

## Provenance transparency pass (2026-08-18)

Scope, re-derived from `research/04-market-map-companies.json` at HEAD
(2255090) before acting: 111 records, source-count distribution
1:40 / 2:49 / 3:17 / 4:5, totalling 209 source entries — every integer
counted from the committed file with `node` over `sources.length`, not
copied from the feature description. Single-sourcing is compliant with
the dataset rules and is not a defect. Two patterns inside the 40
single-sourced records are correlated or self-reported dependencies and
were worked; the rest were deliberately left alone.

### (1) The humanoidindex.org aggregator concentration

Seven single-sourced records rested solely on humanoidindex.org. For
each, the primary or an independent secondary was hunted; where
independent reporting could not be found, the record keeps its sole
aggregator source and the reason is stated here — a documented weak
source beats a padded one.

| Record | Claims on the sole source | Source added (probed live with the gate's browser user agent, 2026-08-18) | Verdict | Note |
|---|---|---|---|---|
| mentee-robotics | Seed $17M total raised | https://www.startuphub.ai/mentee-robotics-raised-17-million-for-their-humanoid-robot-menteebot/ (curl, HTTP 200; fetched text: "raised $17 million in funding led by Ahren Innovation Capital") | verified | Independent secondary added. Corroborating primaries found but rejected for machine-verification reasons: Reuters (bot-wall 401) and TechCrunch. Also noted for a future pass: Reuters 2026-01-06 reports Mobileye agreed to acquire Mentee for ~$900M and a later ~$21M round; the record still says status private / $17M — figure and status NOT touched here (provenance-only rule). |
| kepler-robot | totalRaised $100M, Series A, valuation $400M | none | unresolved (no source added) | Independent reporting found states the OPPOSITE direction: Hangzhou Kelin agreed in May 2026 to acquire a 41.57–51% stake in Shanghai Kepler Robotics for up to ~CNY 300M–722M (~$106M for 51%, implying a whole-company valuation near $208M, gasgoo.com and finance.biggo.com, snippet-grade 2026-08-18). No fetched primary or secondary states $100M raised or a $400M valuation. Figures NOT adjusted (provenance-only rule); flagged here as the record's weakest cell. |
| clone-robotics | Seed $5M | none | unresolved (no source added) | Independent secondary (aparobot.com, snippet-grade 2026-08-18) states "$6.5 million in seed", not $5M; no fetched source states $5M. Figure NOT adjusted; flagged. |
| booster-robotics | Seed $10M | none | unresolved (no source added) | Independent reporting disagrees on scale: Caixin (snippet-grade 2026-08-18) "raised over 100 million yuan (~$14M) across multiple rounds", tracxn.com profile "$27.9M". No fetched source states $10M. Figure NOT adjusted; flagged. |
| leju-robotics | Series B $50M | none | unresolved (no source added) | The Robot Report (fetched-live title 2026-08-18) and Bloomberg (snippet-grade) report a $200M round in Oct 2025 ahead of a planned listing; Wikipedia corroborates CNY 50M Tencent strategic investment in 2017. No fetched source states a $50M Series B. Figure NOT adjusted; flagged. |
| hanson-robotics | totalRaised $50M | none | unresolved (no source added) | getlatka.com (snippet-grade 2026-08-18) states "$21.7M across 2 rounds". No fetched source states $50M. Figure NOT adjusted; flagged. |
| paxini | Series A $20M, JD.com lead | none | unresolved (no source added) | Independent reporting is far larger and later: Caixin 2026-03-07 (snippet-grade 2026-08-18) "$145M round, valuation over $1.4B"; Yicai Global (snippet-grade 2026-08-18) reports JD.com leading an investment round. No fetched source states a $20M Series A. Figure NOT adjusted; flagged. |

Six of the seven aggregator-only figures remain uncorroborated, and five
of those have independent reporting pointing at different numbers. They
stay as recorded under this pass's provenance-only rule; the honest state
of the dataset is that these six cells rest on one aggregator whose
figures no independent source confirms. Correcting the figures is
per-record audit work for a future pass (each correction moves a rendered
figure and requires the full e2e suite).

Convention gap, recorded rather than back-filled: the six snippet-grade
rows above carry their tier and date but not the web search queries the
convention requires, and the queries were not recorded at the time, so
they cannot be reproduced here. The next pass must re-run its own
searches from the claim rather than trusting these leads as reproducible
pointers.

### (2) First-party-only single-sourced records

Thirteen single-sourced records cite only the company's own domain
(identified by comparing each sole source's host against the company
name/domain): micro1, humanoid-uk, farm-ng, avidbots, shadow-robot,
sharpa, xela-robotics, mytra, starship-technologies, knightscope,
brain-corp, pollen-robotics, zebra-robotics-automation.

| Record | Self-reported claims | Disposition | Source added (gate's user agent, 2026-08-18) | Verdict |
|---|---|---|---|---|
| humanoid-uk | $152M Series A, $1.35B valuation, 2026-07-21, Prime Movers Lab | corroborated | https://www.therobotreport.com/uk-based-humanoid-secures-152m-in-series-a-funding/ (HTTP 200) | verified |
| avidbots | $70M Series C, 2022-09-27, Jeneration Capital | corroborated | https://techcrunch.com/2022/09/27/avidbots-maker-of-autonomous-industrial-cleaning-robots-nabs-70m/ (HTTP 200) | verified |
| mytra | $120M Series C, 2026-01-15, Avenir Growth | wire copy of the company's own release added (durability, not independence) | https://www.prnewswire.com/news-releases/mytra-raises-120m-series-c-to-scale-operating-system-for-supply-chain-302661685.html (HTTP 200; the wire the first-party post mirrors, issuer: Mytra, "SOURCE Mytra") | verified |
| sharpa | (i) NVIDIA Isaac GR00T Reference Robot uses Sharpa hands; (ii) CES 2026 North robot | corroborated by independent publishers, per claim | (a) https://www.prnewswire.com/news-releases/sharpa-brings-dexterous-tactile-manipulation-to-the-nvidia-isaac-gr00t-reference-humanoid-robot-302787201.html (HTTP 200) — issuer: SHARPA. This is Sharpa's own release on a wire ("Sharpa today announced...", "SOURCE Sharpa", Singapore dateline, About-Sharpa boilerplate), so it is first-party content: a durability addition, NOT independent corroboration, and it does not mention the CES 2026 North robot at all. (b) claim (i): https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design (curl with the gate's browser user agent, HTTP 200, 2026-08-18; NVIDIA's own newsroom, an independent publisher with no ownership or authorship relationship to Sharpa) states "Dual Sharpa Wave tactile five-finger hands, enabling dexterous manipulation with 22 degrees of freedom and bringing the robot to 75 degrees of freedom across the body and hands". (c) claim (ii): https://roboticsandautomationnews.com/2026/01/31/sharpa-showcases-autonomous-fine-manipulation-robot-and-new-ai-model-at-ces-2026/ (curl with the gate's browser user agent, HTTP 200, 2026-08-18; independent robotics trade outlet) states "At the event in Las Vegas, Sharpa's newly introduced robot, North, played fully autonomous games of ping-pong against human opponents throughout the show". | verified (both claims, each against an independent publisher) |
| brain-corp | leadInvestors Qualcomm Ventures, SoftBank | wire copy of the company's own release added (durability, not independence) | https://vcnewsdaily.com/brain-corp/venture-capital-funding/klcvvqtpvz (HTTP 200; wire text: "led by returning investor SoftBank Vision Fund 1 ... an additional investment from Qualcomm Ventures LLC", a verbatim mirror of Brain Corp's own 2020 release; braincorp.com's own copy of the 2020 release is gone from its site, 404) | verified |
| zebra-robotics-automation | Divestiture to Skild AI, 2026-04-15 | corroborated-in-principle, source NOT added | none — the claim is corroborated by five independent outlets (Bloomberg, Businesswire, Skild's own announcement, Yahoo Finance, roboticsandautomationnews; fetched titles and snippets, 2026-08-18), but every independent wire is bot-walled (403) and would need its own exception entry to be machine-verified, so adding one buys no verifiability. The record keeps its single live first-party pressroom source; the limit is named above. | verified (classification only; no source added) |
| micro1 | first-party by nature | left | none — product description (expert-demonstrated teleoperation data); no funding/valuation/headcount figure recorded, so nothing needs corroboration | first-party by nature |
| farm-ng | first-party by nature | left | none — product description (modular farm robots); no figure recorded | first-party by nature |
| shadow-robot | first-party by nature | left | none — product identity (dexterous hands, founded 1987); no figure recorded | first-party by nature |
| xela-robotics | first-party by nature | left | none — product description (3D tactile sensors); no figure recorded | first-party by nature |
| starship-technologies | first-party by nature | left | none — product description (sidewalk delivery robots, founded 2014); no figure recorded | first-party by nature |
| knightscope | first-party by nature | left | none — the only non-descriptive claim, NASDAQ: KSCP public status, is verifiable from the company's own IR page the record cites (first-party by nature for listing status; an exchange listing is a regulated fact, not a self-reported valuation) | first-party by nature |
| pollen-robotics | first-party by nature | left | none — product names (Reachy, Reachy Mini), open-source status and the Hugging Face partnership are first-party claims about what the company makes and releases | first-party by nature |

Counted from the two tables above: 13 first-party records classified —
5 with a second source added, of which 3 are corroborated by an independent
publisher (humanoid-uk / therobotreport.com, avidbots / techcrunch.com,
sharpa / nvidianews.nvidia.com and roboticsandautomationnews.com) and 2 rest
only on a wire copy of the company's own release (mytra, "SOURCE Mytra";
brain-corp, a verbatim mirror of its own 2020 release) — a durability
addition on a second machine-live host, not independent corroboration;
7 first-party by nature (justified in the table), 1
(zebra-robotics-automation) classified as
corroborated-in-principle but left with a single source, because its sole
source is a Zebra pressroom URL and the obvious independent wires
(Bloomberg 403; Businesswire 403, would need a new exception entry) are
bot-walled; adding a third bot-walled URL buys no machine-verifiability.
The claim (Skild AI acquired Zebra's robotics automation business,
April 15 2026) is corroborated by five independent fetched titles
recorded above. Honest state: this record's liveness rests on one live
first-party URL.

### (3) Provenance distribution (recounted after parts 1 and 2)

Recounted from the committed file with `node` over `sources.length` per
record, 2026-08-18: 111 records; distribution 1-source: 34, 2-source: 55,
3-source: 17, 4-source: 5; 34 + 55 + 17 + 5 = 111; total source entries
(1×34) + (2×55) + (3×17) + (4×5) = 34 + 110 + 51 + 20 = 215. Before this
pass: 40 / 49 / 17 / 5 = 209. The deltas are the 6 added source entries
(mentee-robotics, humanoid-uk, avidbots, sharpa, mytra, brain-corp), each
moving one record from 1 to 2 sources: singles 40→34, doubles 49→55.

Known limits, stated plainly:
- **Aggregator concentration:** 6 records (kepler-robot, clone-robotics,
  booster-robotics, leju-robotics, hanson-robotics, paxini) remain solely
  sourced to humanoidindex.org, and 5 of those 6 carry figures no fetched
  independent source confirms (see part 1).
- **First-party-only records:** 7 records remain solely sourced to the
  company's own site (micro1, farm-ng, shadow-robot, xela-robotics,
  starship-technologies, knightscope, pollen-robotics) — all classified
  first-party by nature, no self-reported valuation/headcount among them —
  plus zebra-robotics-automation (see part 2).

### (4) neura-robotics CoinDesk 429

The coindesk.com URL returned HTTP 429 on 7 consecutive machine probes
this session (4 curl + 3 gate runs with the gate's own browser user
agent, gate exit 0 throughout, reported as blocked) — the intermittent
429 recorded earlier on 2026-08-18 has hardened into a persistent
rate-limit bot-wall. An independent fetch client (web fetch, 2026-08-18)
retrieved the full article: "Tether leads $1.4 billion funding round in
German robotics company Neura", Jun 11 2026, matching the record. Per the
feature rule, a documented exception entry was added to
`data/dataset-source-exceptions.ts` (its reason records the accurate
diagnosis: a persistent rate-limit bot-wall, not link rot and not
transient) rather than replacing the live
source; the record's other 2 sources are machine-verified live.

### Gates run this pass (transcript)

The diff adds only source entries (6 in the research file, regenerating
`data/companies.ts`) plus one exception entry; no dataset field or count
changed and no rendered figure moved, so per the documented rule the
targeted market-map specs plus the unit suite are sufficient.

| Gate | Command | Result |
|---|---|---|
| payload integrity | `node` strip-sources diff vs HEAD | identical: stripping every `sources` array leaves all 111 records byte-identical to HEAD |
| duplicate URLs | per-record URL check | none |
| dataset-source gate (×2) | `npm run check:dataset-sources` | exit 0 both runs, identical summaries: 215 URLs / 111 records — 204 live, 0 dead, 0 blocked, 0 error, 11 documented exceptions |
| regeneration | `npm run generate:companies` | "wrote 111 rows" |
| content validator | `npm run validate:content` | PASS (42 modules, 307 citations, 111 companies; no-slop source-only OK) |
| typecheck | `npm run typecheck` | PASS |
| lint | `npm run lint` | PASS (no output) |
| full unit suite | `npm run test` | 1727 passed, 1 skipped |
| build | `npm run build` | PASS (static export, 135 structured documents, no-slop rendered sweep OK) |
| targeted e2e (port 3200 killed first) | `npx playwright test tests/e2e/market-map.spec.ts tests/e2e/market-map-data.spec.ts tests/e2e/market-map-static.spec.ts tests/e2e/market-map-deep-links.spec.ts` | 23 passed |

## Evidence-tier correction pass (2026-08-18)

This is a registry/tooling audit of the ledger's own prose, repairing the
three blocking evidence-tier defects the oss-readiness scrutiny round found.
No article's `lastReviewed` was bumped, no humanizer pass was required (no
reader-facing article prose changed), and no `auditLedger` claim inventory
applies (no per-claim audit was run). It supersedes the 215 figure in
"(3) Provenance distribution" above, which is a dated snapshot of the
2026-08-18 provenance pass and stays as written.

### B1 — wonik-robotics

The second-sourcing pass wrote "One additional independent live source was
added to each record" while adding wonikrobotics.com — Wonik's own corporate
site — beside allegrohand.com, Wonik's own product site. Same publisher, so
nothing independent was added, and the row's own note already said "the
manufacturer's own corporate site": the ledger contradicted itself on the
page. Both halves fixed: the wonikrobotics.com entry (a) in the row above is
relabelled a durability addition with Wonik named as the issuer of both it
and allegrohand.com, and a genuinely independent source (b) was added. The
independent source is The Robot Report (WTWH Media), probed live with the
gate's own browser user agent (`curl -L` with `BROWSER_UA` from
`lib/citation-links.ts:15-16` and the gate's Accept header, HTTP 200,
2026-08-18), and the quoted sentences come from this session's own fetch:
"Meta AI also partnered with South Korea-based Wonik Robotics to develop the
Allegro Hand" and "Wonik Robotics will manufacture and distribute the Allegro
Hand, which will be made available next year."

### B2 — sharpa

The provenance pass classified a PRNewswire page as independent
corroboration while believing it was NVIDIA's release. The fetched page says
"Sharpa today announced..." and "SOURCE Sharpa" with a Singapore dateline and
About-Sharpa boilerplate: it is Sharpa's own release on a wire, first-party.
It also covers only one of the row's two claims — it never mentions the CES
2026 North robot. Fixed: the PRNewswire entry (a) is relabelled a first-party
wire copy with SHARPA named as issuer and the CES 2026 gap recorded; claim
(i) gained NVIDIA's own newsroom and claim (ii) gained Robotics & Automation
News. Both were probed live with the gate's browser user agent (HTTP 200,
2026-08-18) and quoted from this session's own fetches: "Dual Sharpa Wave
tactile five-finger hands, enabling dexterous manipulation with 22 degrees
of freedom and bringing the robot to 75 degrees of freedom across the body
and hands" (NVIDIA newsroom) and "At the event in Las Vegas, Sharpa's newly
introduced robot, North, played fully autonomous games of ping-pong against
human opponents throughout the show" (Robotics & Automation News). The two
aggregates the mislabel fed are restated by disposition: the part-2 count
above and the audit/README.md "6 independent source entries" sentence, both
now naming the 3-independent / 3-wire-copy split.

### B3 — the exceptions count

`audit/README.md` said `data/dataset-source-exceptions.ts` held "(now 11
entries)". The file holds 13. Eleven was real but it was the gate RUN's "11
documented exceptions", legitimately smaller because an exception entry
whose URL answers live in a given run counts as live. Both integers are now
in the README sentence with their units named and the counting method quoted.
Established this session, two independent methods agreeing:

- `npx tsx -e "import {DATASET_SOURCE_EXCEPTIONS} from './data/dataset-source-exceptions.ts'; console.log(DATASET_SOURCE_EXCEPTIONS.length)"` → 13 (runtime truth)
- `grep -c "^    url: '" data/dataset-source-exceptions.ts` → 13 (cross-check)

The naive `grep -c 'url:'` returns 14 because it matches the interface field
declaration `url: string;`, not an entry.

### Recount (observed, not predicted)

Re-derived with `node` over `sources.length` per record from the committed
`research/04-market-map-companies.json` after the edit: **111 records —
1 source: 34, 2 sources: 53, 3 sources: 18, 4 sources: 6; 34 + 53 + 18 + 6
= 111; total source entries (1x34) + (2x53) + (3x18) + (4x6) = 34 + 106 +
54 + 24 = 218.** Baseline at f8f4930, same method: 34/55/17/5 = 215. Deltas:
doubles 55 → 53, triples 17 → 18, quadruples 5 → 6, exactly the 3 added
entries (wonik-robotics 2 → 3 sources, sharpa 2 → 4). This matches the fix
spec's prediction; these are the observed numbers.

### Gate transcripts (two consecutive runs, this session)

Run 1: `npm run check:dataset-sources` — exit 0 — "Checked 218 dataset
source URLs across 111 records: 207 live, 0 dead, 0 blocked, 0 error, 11
documented exceptions."
Run 2 (immediately consecutive): `npm run check:dataset-sources` — exit 0 —
"Checked 218 dataset source URLs across 111 records: 207 live, 0 dead, 0
blocked, 0 error, 11 documented exceptions."
The two runs agree on every count; no disagreement to report.

### Integrity check

`node` script: parse `research/04-market-map-companies.json` at HEAD and at
f8f4930, delete every record's `sources` array, serialize both payloads,
`diff` them. Result: **byte-identical** — no figure moved with its
provenance. Transcript: `diff /tmp/payload-f8f4930.json /tmp/payload-HEAD.json`
→ no output, exit 0. Per-record duplicate-URL check over the committed file:
0 duplicates. Every pre-existing source URL is retained; exactly 3 source
entries were added.

### Non-blocking sweep applied

Items 1–6 of the fix spec: the live-delta misattribution in the
second-sourcing gate paragraph (the +1 live delta is now explained as the
net of two new live URLs plus coindesk flipping to 429-blocked); the
"identical summaries" contradiction in the same paragraph (replaced with the
consistent "same totals plus one transient coindesk 429 block" framing); the
one-word "Every corpus count" scoping fix in `README.md:7`; the paxini
snippet-tier tag (both leads now carry "snippet-grade 2026-08-18"); the
mytra and brain-corp dispositions (both now "wire copy of the company's own
release added (durability, not independence)" with issuers named); and the
"transient-error exception" wording at the neura-robotics paragraph (now
"a documented exception entry" whose reason records the accurate diagnosis).
Items 7 and 8 were deliberately NOT done, per the spec: no hashing added to
postinstall's `sameTree()`, and no history rewrite for the em dash in a code
comment no repo rule covers.

### Snippet-query gap

`rg -c 'snippet-grade' audit/market-map.md` → 11; `rg -c
'snippet-grade.*query:' audit/market-map.md` → 1. Both counts include this
subsection's own self-referential prose and the convention-gap paragraph
under the part-1 table, so the file-wide integers are not the evidence-row
counts. Scoped to the evidence rows themselves (the six part-1 table rows,
lines 338–343 at this pass's HEAD): every one carries `snippet-grade` with
a date, and none carries a `query:` marker — 6 rows, 0 queries. The counts
do not match, and the explanation is the convention-gap paragraph above:
the six pre-existing snippet-grade rows were written before the `query:`
marker convention existed, the queries were never recorded, and no query is
invented for them. This pass adds no new snippet rows, so the two-grep
equality check does not bind here.

### Gates run this pass (transcript)

The diff adds only source entries and audit prose; no dataset field or count
changed and no rendered figure moved (proven by the byte-identical
strip-sources check above), so per the documented rule the targeted
market-map specs plus the unit suite are sufficient and no full e2e is
required.

| Gate | Command | Result |
|---|---|---|
| dataset-source gate (×2) | `npm run check:dataset-sources` | exit 0 both runs, identical summaries: 218 URLs / 111 records — 207 live, 0 dead, 0 blocked, 0 error, 11 documented exceptions |
| payload integrity | `node` strip-sources diff vs f8f4930 | byte-identical (no output, exit 0) |
| regeneration | `npm run generate:companies` | "wrote 111 rows" |
| duplicate URLs | per-record URL check over the committed file | 0 duplicates |
| content validator | `npm run validate:content` | PASS (42 modules, 307 citations, 111 companies; no-slop source-only OK) |
| typecheck | `npm run typecheck` | PASS |
| lint | `npm run lint` | PASS (no output) |
| full unit suite | `npm run test` | 168 files / 1727 passed, 1 skipped |
| build | `npm run build` | PASS (static export, 135 structured documents, no-slop rendered sweep OK) |
| targeted e2e (port 3200 killed first) | `npx playwright test tests/e2e/market-map.spec.ts tests/e2e/market-map-data.spec.ts tests/e2e/market-map-static.spec.ts tests/e2e/market-map-deep-links.spec.ts` | 23 passed |

## Figure corrections for the contradicted aggregator-only records (2026-08-18)

Scope: the six records the provenance-transparency pass (f8f4930) left with
figures resting solely on humanoidindex.org and flagged as contradicted by
independent reporting. That pass was provenance-only by rule; this pass
fetched primaries/secondaries and corrected the figures. Field semantics
applied consistently: `latestRound` is the most recent disclosed funding
event (a round, IPO, or controlling-stake acquisition), `totalRaisedUsd` is
a company funding total stated by a fetched source, never an aggregator
figure and never a lower bound promoted to a total. Every source below was
fetched this session with the gate's browser user agent
(`lib/citation-links.ts` BROWSER_UA) and probed live (all 200) before
being written in. Snippet-grade leads from the prior pass were used only
to direct searches, never as evidence.

| Record | Claim (shipped value) | Source checked (fetched, curl + browser UA, 2026-08-18) | Verdict | Note |
|---|---|---|---|---|
| kepler-robot | totalRaisedUsd $100M; latestRound Series A 2024-01-01 at $400M valuation | https://finance.biggo.com/news/2jvSSp4BmHHDnbgy1rv1 (200, body: Kelin to buy 41.57% for up to CNY 300M, 51% control total, "Kepler Robot's total valuation stands at approximately 722 million yuan (approximately $106.3 million)"; also: April 2026 A++ round at the 100-million-yuan level led by SAIF; May 14 strategic round); https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml (200, YICAI syndication: 41.6% stake, up to USD 44.1M, 51% after completion) | C | WRONG figure, and a wrong event class: no fetched source states $100M raised or a $400M valuation; the reported "CNY 300M-722M" range in the prior pass's lead was two different quantities (deal size vs whole-company valuation). Corrected: totalRaisedUsd nulled (no source states a company total); latestRound set to Acquisition (controlling stake), 2026-05-20, valuation $106.3M (the 722M yuan whole-company valuation both fetched sources state), lead Hangzhou Kelin; acquisition noted in deployments. Status stays private (deal announced, not confirmed closed). Sources added: biggo + SSE/YICAI; humanoidindex retained. Confidence low -> medium. Kepler remains plotted in the bubble chart via the $106.3M valuation. |
| leju-robotics | totalRaisedUsd $50M; latestRound Series B 2024-01-01 | https://www.therobotreport.com/leju-raises-200m-humanoid-production-unitree-unveils-h2/ (200, fetched body text: "Leju Robotics Technology Co. this week reportedly raised 1.5 billion yuan, or about $200 million U.S."; "The company raised 36.2 million in Series B funding in June 2019"; investors CITIC Goldstone, Shenzhen Investment Holdings et al.; IPO reportedly planned) | C | STALE figure: the shipped "$50M Series B" matches no fetched source (TRR prints the actual Series B as $36.2M in 2019). Corrected: latestRound set to Pre-IPO $200M, 2025-10-22 (1.5B yuan as reported); totalRaisedUsd nulled (no fetched source states a company total). TRR added as source of record; humanoidindex retained. Confidence low -> medium. |
| booster-robotics | totalRaisedUsd $10M; latestRound Seed 2024-01-01 | https://www.sohu.com/a/975073436_116132 (200, TMTPost piece, fetched body: "raised more than 100 million yuan ($14 million) in a new funding round ... The round was led by venture capital firm IDG Capital"; "total Series A financing to nearly 500 million yuan" across five rounds) | C | WRONG figure: nothing states a $10M seed. The field-semantics question (one round vs total) is resolved per the stated rule. Corrected: latestRound set to Series A+ $14M (over 100M yuan), 2026-01-12, lead IDG Capital; totalRaisedUsd nulled (the "nearly 500 million yuan Series A" is a series aggregate in yuan, not a company total in USD; no USD total stated). TMTPost added; humanoidindex retained. Confidence low -> medium. |
| clone-robotics | totalRaisedUsd $5M; latestRound Seed 2024-01-01 | https://www.aparobot.com/companies/clone-robotics (200, fetched body: "Clone Robotics has raised $6.5 million in seed funding"); searches this session for a primary (clonecompany.com unreachable, republic.com bot-walled, Crunchbase/Tracxn/PitchBook aggregator pages only, tracxn self-contradicts $80M vs $6.5M-class figures) | C (nulled) | GENUINE CONFLICT, no primary resolves it: humanoidindex says $5M, aparobot says $6.5M, aggregators disagree with each other, no first-party or named-wire primary is reachable. Figure NULLED (totalRaisedUsd null; round date nulled; type Seed retained as uncontested). Both secondary profiles retained as sources so the disagreement is visible in the record; confidence stays low. The honest gap is the publishable state; a confident $5M or $6.5M would not be. |
| hanson-robotics | totalRaisedUsd $50M; latestRound Series B 2021-01-01 | https://getlatka.com/companies/hanson-robotics-limited (200, fetched body: "has raised $21.7M in total funding across 2 rounds, with its most recent round in 2018"); searches for a primary (hansonrobotics.com funding page none, Crunchbase/PitchBook/Seedtable bot-walled or aggregator-only) | C (nulled) | GENUINE CONFLICT, no primary: humanoidindex says $50M, getlatka says $21.7M, neither is a primary, no fetched source supports $50M at all. Figure NULLED (totalRaisedUsd null; the fabricated "Series B 2021" round nulled wholesale, type null). getlatka retained beside humanoidindex so the disagreement is documented in the record; confidence stays low. |
| paxini | totalRaisedUsd $20M; latestRound Series A 2024-01-01 led JD.com; HQ Tokyo/JP; founded 2020 | https://equalocean.com/news/2026030921782-pacini-completes-rmb-1-billion-series-b-financing (200, fetched body: "completed a Series B financing round exceeding RMB 1 billion, bringing the company's valuation to over RMB 10 billion"; jointly led by Whampoa Capital, Caitai Capital, Xin'an Capital); https://cnevpost.com/2026/06/03/robotics-firm-paxini-weighs-hk-ipo/ (200, fetched body: "raised more than 1 billion yuan ($148 million) in a funding round in March"; "founded in June 2021"; Shenzhen-based; BYD backer); https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/ (200, fetched body: Aug 3 RMB1B strategic round, "cumulative fundraising to RMB3.5 billion") | C | The feature premise said paxini had no contradicting reporting and to leave it alone if confirmed; the committed ledger's own part-1 row already contradicted that premise (Caixin $145M/$1.4B), and this session's fetches confirm the contradiction, so the tree wins and paxini was corrected. Corrected: latestRound set to Series B $148M (RMB1B+ at CnEVPost's own conversion), 2026-03-09, valuation $1.4B (RMB10B+), leads Whampoa/Caitai/Xin'an; totalRaisedUsd nulled (RMB3.5B cumulative is yuan-denominated and company-stated via TechNode; kept in deployments note rather than converted into a USD total field); HQ Tokyo/JP -> Shenzhen/CN and founded 2020 -> 2021 (June 2021, CnEVPost) — the prior pass's Tokyo/2020 "correction" was itself wrong; JD.com lead dropped (JD is a backer per CnEVPost, not a named lead of the Series B). CN country-filter oracle updated 20 -> 21 in the same commit. Description and deployments updated from the fetched sources. Confidence low -> medium. |

Counted from the table above: 6 rows, 6 corrected (2 of them corrections
whose fix is a null with the conflict documented). Wrong vs stale, stated
per record: kepler WRONG, leju STALE, booster WRONG, clone CONFLICT-nulled,
hanson CONFLICT-nulled, paxini WRONG. Two records (clone, hanson) have
figures nulled; null handling was checked in the renderers: the bubble
chart skips null-y rows (`bubblePoints` in `lib/market-map.ts`), the
company card renders "not disclosed" for null funding per the dataset
convention, and filters/sorts treat null totals as absent (plotted set
36 -> 32, timeline 73 -> 72, both re-baselined below).

Snippet-tier disclosure for this pass: no row above rests on snippet-grade
evidence; every quoted sentence comes from a document fetched this session.
web search was used only to locate the documents.

Oracles updated with the counts that moved (all others re-derived and
unchanged: 111 records, humanoids 34, segment counts, IPO-status list):
timeline rows 73 -> 72 (tests/component/market-map-timeline-focus.test.tsx
x2, tests/e2e/market-map-timeline-affordances.spec.ts), bubble plotted set
36 -> 32 (tests/component/market-map-bubble-view.test.tsx), CN filter
20 -> 21 (tests/component/market-map.test.tsx x2,
tests/e2e/market-map-deep-links.spec.ts x2). Grep of old and new values
(`$100M`, `$400M`, `$5M`, `$10M`, `$50M`, `$20M`, `36`, `73`, `20 of 111`)
across tests/, scripts/, lib/, data/, README.md, audit/ found no further
stale occurrences (the $-strings appear nowhere in tests; the counts only
in the oracles updated above).

### Gates for this pass (transcript of commands actually run)

| Gate | Command | Result |
|---|---|---|
| dataset-source gate (×2) | `npm run check:dataset-sources` | exit 0 both runs, identical summaries: 227 URLs / 111 records — 216 live, 0 dead, 0 blocked, 0 error, 11 documented exceptions |
| regeneration | `npm run generate:companies` | "wrote 111 rows" |
| duplicate URLs | per-record URL check over the committed file (node, Set per record) | 0 duplicates |
| content validator | `npm run validate:content` | PASS (42 MDX files clean, 3 registered quotation exceptions) |
| typecheck | `npm run typecheck` | PASS (run again after the e2e runs to restore next-env.d.ts) |
| lint | `npm run lint` | PASS (no output) |
| targeted unit | `npm run test -- companies market-map structured-search` | 8 files / 111 tests PASS (after oracle updates) |
| full unit suite | `npm run test` | 168 files / 1727 passed, 1 skipped |
| build | `npm run build` | PASS (static export, 135 structured documents, no-slop rendered sweep OK) |
| shadow sweep | `find out -maxdepth 1 -name "* [0-9]*"` + `.next` scan | one cloud-sync shadow (`.next/cache 2`) found and removed before e2e |
| e2e (full, run 1) | `lsof -ti :3200 \| xargs kill` then `npm run test:e2e` | 571 passed / 1 failed / 1 skipped — the failure was the bubble paintedTop bound (26.11 -> 27.72 after the plotted set shrank 37 -> 32 and the log-scale floor rose; documented and re-baselined 27 -> 28 in the spec with the cause named) |
| e2e (full, run 2, after re-baseline) | `lsof -ti :3200 \| xargs kill` then `npm run test:e2e` | **572 passed / 0 failed / 1 skipped** (fresh server; the skip is the pre-existing VAL-WIKI-012 vacuous-pass skip) |
| rendered-output check | Playwright headless against the static export on 3201, six corrected cards, console-error listener | all six cards render: kepler $106M valuation, booster $14M, leju $200M, paxini $148M / $1.4B; clone and hanson figures degrade to "not disclosed"; zero console errors; screenshots at /tmp/card-<id>.png |

Note on `lastReviewed` and the humanizer: this pass changed dataset
records and test oracles only, no article prose, so per the documented
rule neither applies.

## Mentee Robotics acquisition-status correction (2026-08-18, feature market-map-mentee-acquisition-status)

Scope: one record, `mentee-robotics`, wrong on its most consequential
field. The shipped row said status `private`, $17M total raised, a Seed
round dated 2023-01-01, confidence low. Reuters (2026-01-06) had reported
Mobileye agreed to acquire Mentee for roughly $900M plus a later ~$21M
round. The deal's actual state was established from fetched primaries
before anything was written.

What actually happened, from the primaries:

- **Announcement.** Mobileye's own press release (ir.mobileye.com,
  Businesswire wire, fetched this session, 200): "Mobileye today announced
  entry into a definitive agreement to acquire Mentee Robotics Ltd."
  dated Jan 6, 2026, CES Las Vegas. Total consideration "$900 million
  (subject to certain adjustments), comprising approximately $612 million
  in cash and up to about 26.2 million shares of Mobileye Class A common
  stock". Expected close: first quarter of 2026. Approved by Mobileye's
  Board, a strategic transaction committee of independent directors, and
  Intel as sole Class B shareholder; Shashua (Mobileye CEO and Mentee
  co-founder/chairman) recused.
- **Closure — the deal CLOSED, it did not stay pending.** Mobileye Form
  8-K, SEC EDGAR, date of report February 3, 2026 (fetched this session
  with a declared user agent, full text read): "On February 3, 2026, the
  Corporation and MEIL completed the Acquisition and paid the aggregate
  purchase price of $900,000,000, consisting of $611,914,666 in cash and
  26,279,824 shares of Class A Stock." Signed by CFO Moran Shemesh
  Rojansky, February 5, 2026. URL:
  https://www.sec.gov/Archives/edgar/data/1910139/000110465926010947/tm265388d1_8k.htm
- The ~$21M March round: Reuters's body text (bot-walled on reuters.com
  and every syndication tried this session: Yahoo 404, kfgo/wmbd 403,
  investing.com served unrelated content, zawya/CNA page-not-found)
  survives only as concordant search snippets across four independent
  syndications (reuters.com, investing.com, techstartups, channelnewsasia):
  "Mentee raised about $21 million in a funding round in March, valuing
  the startup at roughly $162 million." Per the snippet-tier rule this is
  **snippet-grade (web search 2026-08-18) query: "Mentee raised about $21
  million in a funding round in March" Mobileye** — corroboration that
  some document states it, not a fetched document. It may not set a
  load-bearing numeric. It is recorded here as the lead for a future pass
  and was NOT written into the dataset.

Schema question, answered concretely: the site could already represent an
acquired company. `companyStatusSchema` accepts `private | public |
acquired | dead`; the bubble chart, grid card (`data-field="status"` →
"Acquired"), status filter (option "Acquired"), timeline, and structured
search index all consume the existing value. No schema change was needed
and none was made — the smallest honest change is the one-word data edit
the schema already supported. Ten records were already `acquired`
(covariant, irobot, berkshire-grey, abb-robotics among them), and the
house pattern for a closed acquisition is `latestRound.type:
"Acquisition"` with amountUsd = deal value and the buyer in leadInvestors
(berkshire-grey: $375M / SoftBank, set by the earlier audit from the
first-party release). Mentee now follows that pattern exactly.

Ledger rows:

| Record | Claim (shipped value) | Source checked (fetched 2026-08-18) | Verdict | Note |
|---|---|---|---|---|
| mentee-robotics | status `private` | https://ir.mobileye.com/news-releases/news-release-details/mobileye-acquire-mentee-robotics-accelerate-physical-ai (200, first-party: definitive agreement announced 2026-01-06, $900M consideration ~$612M cash + up to ~26.2M Class A shares, close expected Q1 2026); https://www.sec.gov/Archives/edgar/data/1910139/000110465926010947/tm265388d1_8k.htm (Mobileye Form 8-K, fetched in full: acquisition COMPLETED 2026-02-03 for $900,000,000 = $611,914,666 cash + 26,279,824 Class A shares) | C | status corrected `private` → `acquired`. The deal is CLOSED (8-K, Feb 3 2026), not announced-pending: today is 2026-08-18, past the Q1-2026 expected close, and the filing states completion in the past tense with the final paid consideration. So `acquired` (completed) is the correct existing enum value, and no "being-acquired" representation was needed. latestRound set to Acquisition $900M, 2026-02-03, lead `['Mobileye']` — the same convention as berkshire-grey. Record kept: still 111 records, humanoids still 34 (mentee stays in its segment; an acquired company is part of the market's history). |
| mentee-robotics | totalRaisedUsd $17M; latestRound Seed, null amount, 2023-01-01 | same two primaries; startuphub.ai piece (previously the $17M source) not re-fetchable as a full round statement this session; Reuters ~$21M March round is snippet-grade only (tier and query above) | C (nulled) | totalRaisedUsd $17M NULLED: the startuphub $17M was a single seed round, not a stated company total, and the only newer round figure (~$21M, March, ~$162M valuation per Reuters) is snippet-grade and may not set a load-bearing numeric — it stays a recorded lead, not a dataset figure. Consistent with the sibling feature's reading: totalRaisedUsd is a stated company total, never a round figure promoted to a total. The old Seed/2023-01-01 round is replaced by the acquisition event. Confidence low → high (two fetched primaries: first-party announcement + SEC filing). Description and deployments updated from the fetched release ("operates as an independent unit within Mobileye; first on-site proof-of-concept deployments expected 2026, series production targeted 2028"). |

Counted from the table above: 2 rows, 2 corrected (1 status+round, 1
figure nulled with the acquisition event written in). Sources added: 2
(Mobileye IR release, SEC 8-K); existing 2 retained; no URLs lost; no
duplicates (checked per-record after regeneration).

Cascade sweep, old and new values greped across tests/, scripts/, lib/,
data/, README.md, audit/, schema doc comments (`'private'`, `'acquired'`,
`$17M`, `$900M`, `17000000`, `900000000`, `mentee`): no prose surface
quotes a private/acquired company count, so no README or landing copy
moved; the status label "Acquired" is data-driven, not hardcoded per
count. Counts that moved, with the oracles updated in the same commit:

- status partition: private 82 → 81, acquired 10 → 11 (no hardcoded
  oracle; verified by re-derivation, command below).
- bubble plotted set 32 → 31 (mentee's y-value source, the $17M total,
  became null and the $900M acquisition is not a valuation/total, so the
  row no longer plots): tests/component/market-map-bubble-view.test.tsx
  re-baselined with the cause named.
- timeline rows 72 → 72 UNCHANGED (the old 2023-01-01 seed predates the
  2023-2026 window and never rendered; the new 2026-02-03 acquisition
  event enters the window). Verified by re-derivation.
- 111 total, humanoids 34, US∩humanoids 6, US∩humanoids∩high 4: all
  unchanged (mentee is IL, was already low-confidence, already counted).
- status-filter membership: 'mentee-robotics' added to the
  acquired-status expectations in tests/unit/market-map.test.ts and
  tests/e2e/market-map.spec.ts (VAL-MKT-022).

Re-derivation commands (run this session, after the edit):
`npx tsx -e "import {COMPANIES} from './data/companies.ts'; ..."` →
total 111, timeline events 72, acquired 11, private 81, humanoids 34,
plotted 31 (mentee absent).

### Gates for this pass (transcript of commands actually run)

| Gate | Command | Result |
|---|---|---|
| dataset-source gate (×2) | `npm run check:dataset-sources` | exit 0 both runs, identical summaries: "Checked 229 dataset source URLs across 111 records: 218 live, 0 dead, 0 blocked, 0 error, 11 documented exceptions." (227 → 229 URLs: the 2 added primaries) |
| regeneration | `npm run generate:companies` | "wrote 111 rows" |
| duplicate URLs | per-record URL check | 0 duplicates |
| content validator | `npm run validate:content` | PASS (no-slop source-only OK) |
| typecheck | `npm run typecheck` | PASS |
| lint | `npm run lint` | PASS (no output) |
| targeted unit | `npm run test -- companies market-map structured-search` | 8 files / 111 tests PASS |
| full unit suite | `npm run test` | 168 files / 1727 passed, 1 skipped (the pre-existing VAL-WIKI-012 vacuous-pass skip) |
| build | `npm run build` | PASS (static export, 135 structured documents, no-slop rendered sweep OK) |
| shadow sweep | `find out -maxdepth 1 -name "* [0-9]*"` + `.next` scan | no cloud-sync shadows found |
| e2e (FULL suite, run 1) | `lsof -ti :3200 \| xargs kill` then `npm run test:e2e` | 570 passed / 2 failed / 1 skipped. Failure 1: the bubble paintedTop bound (anduril 27.72 → 30.10 after the plotted set shrank 32 → 31) — re-baselined 28 → 31 in the spec with the cause named, the documented tripwire procedure. Failure 2: search-facet-pending clock flake ("Cannot fast-forward to the past", a Playwright clock.pauseAt issue in a spec my diff does not touch); it passed on targeted re-run below and in full run 2. |
| e2e (targeted re-run, port 3200 killed first) | `npx playwright test tests/e2e/market-map-bubble-affordances.spec.ts tests/e2e/search-facet-pending.spec.ts` | 11 passed |
| e2e (FULL suite, run 2, after re-baseline) | `lsof -ti :3200 \| xargs kill` then `npm run test:e2e` | **572 passed / 0 failed / 1 skipped** (fresh server; recorded below at commit time) |
| rendered-output check | Playwright headless, dev server 3200, `?status=acquired` | mentee card renders: Status "Acquired", latest round $900M, description names Mobileye; 11 acquired cards; zero console errors; screenshot /tmp/mentee-card.png |

Note on `lastReviewed` and the humanizer: this pass changed a dataset
record and test oracles only, no article prose, so per the documented
rule neither applies.

## Batch-3 re-verification: the twelve remaining Crunchbase/humanoidindex records (2026-08-18)

**Why this pass exists.** Commit b1b161f ("batch 3 — Crunchbase/humanoidindex
cluster, 24 rows") set fields on 19 records from Crunchbase news pages and
humanoidindex.org profiles. The figure-corrections pass (ba0c1e9) then checked
six of those 19 against fetched primaries and named outlets, and **all six
were wrong** (kepler-robot, leju-robotics, booster-robotics, clone-robotics,
hanson-robotics, paxini — wrong figures, wrong event classes, and one record
wrong on five fields at once, including a "correction" that was itself
wrong). Six for six is evidence about a method, not a sampling artifact: that
pass treated aggregator pages as primary sources. This pass re-verified the
twelve remaining batch-3 records against fetched primaries, so that no
field the aggregator pass touched rests on its word alone. mentee-robotics
is out of scope (sibling feature, resolved at 5d0da0d).

Method: every source below was fetched in this session with the gate's own
browser user agent (`lib/citation-links.ts` BROWSER_UA, via curl), probed
live (HTTP 200) before being written into the dataset, and the quoted
sentence comes from that fetch. A Crunchbase news page or humanoidindex
profile was read only as a lead; no field below is evidenced by either.
Dispositions per the publisher-independence procedure (issuer resolved, not
host): `independent (different publisher: X)` for named outlets and wires
with their own editorial responsibility; `durability addition (first-party,
issuer: X)` for the companies' own releases; aggregator sources already on
the records were retained (no URL removals this pass) but never counted as
evidence. The three outcomes are per-record: CONFIRMED (a fetched primary
states the recorded value), CORRECTED (it states something different),
NULLED (nothing reachable supports it, or fetched sources genuinely conflict
with no primary to resolve it).

| Record | Claim (shipped value) | Source checked (fetched, browser UA, 2026-08-18) | Disposition | Note |
|---|---|---|---|---|
| spirit-ai | latestRound Series A extension $145M, 2026-04-01, $1.5B valuation, leads [Chaos Investment, YF Capital] | https://www.prnewswire.com/news-releases/spirit-ai-lands-280m-to-scale-embodied-ai-through-dirty-data-302697085.html (200, first-party, 2026-02-25: "Spirit AI has raised $280 million USD to scale the deployment of general-purpose embodied models"; "This Beijing-based company"); https://stackfutures.com/blog/spirit-ai-roboarena-china-nvidia/ (200, independent: StackFutures, 2026-06-03: "Spirit AI announced the RoboArena result alongside a 1.5 billion yuan ($222 million) Series A+ financing on June 3 — its fourth round in three months"); https://news.pedaily.cn/202606/564786.shtml (200, independent: PEdaily, 2026-06-03: "今日（6月3日），千寻智能宣布完成15亿元A+轮融资" — ¥1.5B A+ round announced June 3); https://eu.36kr.com/en/p/3701216103281408 (200, independent: 36Kr, 2026-02-27: "On February 24th, Spirit AI announced that it had completed two consecutive rounds of financing totaling nearly 2 billion yuan"; "Spirit AI, founded in 2024") | CORRECTED | The April "$145M extension" exists in no fetched source, and the aggregator's Spirit figures ($290M + $145M ext = $435M) are a mirror of its Galaxea figures ($145M + $290M ext = $435M) — the two records were contaminated with each other's numbers in the same Crunchbase article. Corrected to the real latest event: Series A+ $222M (¥1.5B at TNW's own conversion), 2026-06-03, lead investors unnamed in every fetched body ("一线美元基金以及大型产业投资方"), valuation null (only ">¥10B (≈$1.4B)" is stated, a bound; $1.5B is stated by no fetched source). Chaos Investment/YF Capital appear as round tags in DealStreetAsia's paywalled listing and in the STCN/QbitAI coverage as Feb-round participants, but no fetched body names a lead, so leadInvestors is emptied rather than kept on aggregator word. Founded 2024 CONFIRMED (PEdaily: founded January 2024, founders Han Fengtao/Gao Yang/Zheng Lingyin). HQ Beijing CONFIRMED by the company's own release ("This Beijing-based company", Beijing dateline); TNW's same-week characterization "a startup from Hangzhou" is noted as a disagreement — the company's own self-description wins over a secondary's. Sources added: 4 (1 first-party-adjacent wire, 3 independent). Access note: TNW's article was also fetched this session (200) and states the same $222M conversion, but thenextweb.com answers HEAD with 404 while serving GET 200 — the gate HEADs first and dead is never exceptable — so StackFutures, which states the identical figure and HEADs clean, is the URL carried in the dataset. |
| engineai | latestRound Series B $200M, 2026-05-01, $1.5B valuation, leads [Henan CICC Huirong Fund Management, Luxshare-ICT] | https://cryptobriefing.com/engineai-hong-kong-ipo-filing/ (200, independent: Crypto Briefing, 2026-06-11: "a $200 million Series B funding round that valued the company at $1.5 billion. That round was led by Henan CICC Huirong Fund Management and Luxshare-ICT"; "The $200 million Series B that followed in April 2026"); https://www.lanjinger.com/d/1778055085697120105 (200, independent: Blue Whale Finance, 2026-05-06: "此前4月9日，众擎机器人完成了B轮融资的交割。据官方介绍，B轮融资由河南投资集团汇融基金与立讯精密联合领投" — Series B closing on April 9, co-led by Henan Investment Group Huirong Fund and Luxshare Precision; "已完成B+轮融资，具体融资规模及投资方仍有待公布" — a B+ round has since completed, terms unannounced) | CONFIRMED + CORRECTED (date) | Amount $200M, valuation $1.5B and both co-leads confirmed by fetched bodies (Blue Whale adds the official Chinese naming: 河南投资集团汇融基金 = Henan CICC Huirong Fund Management, 立讯精密 = Luxshare). Date corrected 2026-05-01 → 2026-04-09 (the closing date Blue Whale states; the batch-3 date was the aggregator's "last month" guess). The May 2026 Series B+ (terms undisclosed) is recorded in the description rather than displacing the fully-disclosed April round. founded 2024 retained (predates batch 3; not contradicted by any fetched source). totalRaisedUsd null retained (no fetched total; Blue Whale/Crypto Briefing give only round pieces). Confidence medium → high. Sources added: 2 (both independent). |
| tars-robotics | latestRound Seed $513M, 2026-05-01, $1.9B valuation, leads [Hillhouse Capital, HSG] | https://olachina.org/tars-ai/ (200, independent: Ola China, 2026-04-16: "TARS AI (它石智航), a Shanghai-based embodied intelligence startup... On April 16, 2026, the company announced the completion of a $455 million Pre-A round"; "TARS AI officially launched in February 2025"; "On the financial investor side, Hillhouse Ventures and Sequoia China co-led the round. Meituan Dragon Ball, CICC Capital... followed") | CORRECTED | Wrong amount, wrong round class, wrong date: the real event is a $455M Pre-A announced 2026-04-16, not a $513M seed in May. (The aggregator's "$513M seed" also collides with a different Houston company's $513M seed in the same search space.) Corrected: Seed → Pre-A, $513M → $455M, 2026-05-01 → 2026-04-16. Valuation $1.9B NULLED: stated by no fetched body (the unicorn-board framing in the aggregator's own unicorn post is snippet-grade; snippet-grade (web search, no fetched document) query: "TARS Robotics 它石智航 seed round $513 million Hillhouse HSG 2026"). Leads kept [Hillhouse Capital, HSG] — the fetched body names Hillhouse and Sequoia China as co-leads, and Sequoia China = HongShan = HSG (CNBC's fetched gloss: "HongShan, formerly Sequoia Capital China"). Recorded disagreement: investor Grishin Robotics' post (snippet-grade, same query) says the round was "co-led by GL Ventures, HSG, and Meituan" — GL Ventures appears in no fetched body; Meituan's strategic arm co-led per the fetched body. founded 2025 CONFIRMED ("officially launched in February 2025"). HQ Shanghai CONFIRMED. Source added: 1 (independent). |
| galaxea-ai | latestRound Series B extension $290M, 2026-04-01, $1.4B valuation, lead [Jinding Capital] | https://www.cxodigitalpulse.com/chinas-galaxea-ai-raises-290-4-million-in-series-b-round-to-accelerate-robotics-push/ (200, independent: CXO Digitalpulse, 2026-04-03: "Chinese embodied AI startup Galaxea AI has raised $290.4 million in a Series B+ funding round"; "Founded in 2023 and based in Beijing"); https://theaiinsider.tech/2026/04/04/chinese-robotics-startup-galaxea-ai-raises-290m-usd-in-series-b-funding-valued-at-29b-usd/ (200, independent: The AI Insider citing Yicai Global, 2026-04-04: "raised about $290 million in a Series B+ round... following a separate funding round of about $140 million completed in February") | CORRECTED | Round class corrected: Series B extension → Series B+ (both fetched bodies; the February predecessor was the ~$140M/¥1B Series B, which is what the aggregator's "led by Jinding Capital" sentence described — no fetched source names the B+ lead, so leadInvestors is emptied). Amount $290M confirmed within reporting variance ($290M / $290.4M fetched; Caixin's headline says $291M, unfetched). Date corrected 2026-04-01 → 2026-04-02; basis disclosed as snippet-grade (web search, no fetched document) query: "Yicai Galaxea AI Series B+ $290 million 星海图 humanoid funding" — Yicai's body snippet reads "announced today" under its 2026-04-02 13:44 timestamp and Caixin's piece is dated 2026-04-02 by URL; the date is non-load-bearing (it only orders the timeline). Valuation $1.4B NULLED: the fetched sources genuinely disagree and no primary resolves it — Yicai reports "roughly $29 billion" (uncorroborated by any other fetched body and inconsistent with the sector's valuations), the aggregator's $1.4B described the February round, and humanoidindex's $700M is an Aug-2025 snapshot; naming all three rather than preferring one. founded 2023 CONFIRMED (CXO Digitalpulse). HQ Beijing CONFIRMED. Sources added: 2 (both independent). |
| robot-era | latestRound $200M, 2026-04-01, type null, leads [] | https://pulse2.com/robotera-raises-over-200-million-to-scale-humanoid-robotics-commercialization/ (200, independent: Pulse 2.0, 2026-05-08: "ROBOTERA announced it has raised more than $200 million in a new financing round led by SF Group"); https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/ (200, independent: Frontier Enterprise, 2026-05-15: "RobotEra has raised over US$200 million in a new financing round led by SF Group, following its RMB1 billion strategic round in March"); https://www.therobotreport.com/robotera-gets-series-a-funding-partners-unido-embodied-intelligence/ (200, independent: The Robot Report, 2025-12-01: "ROBOTERA last week secured nearly RMB 1 billion, or about $140 million U.S., in Series A+ financing... Geeley Capital led Robotera's round"; "The Beijing-based company") | CORRECTED (figure NULLED) | The round is real but its size is a bound in every fetched body: "more than $200 million" / "over US$200 million" is a lower bound the reporters did not make exact, so amountUsd is nulled rather than promoted to a flat $200M (the Skild rule; contrast booster-robotics, where the outlet itself printed a flat USD parenthetical). Lead corrected [] → [SF Group] (both fetched bodies: "led by SF Group"; HSG, IDG, Hillhouse participated). Date NULLED: no fetched body states the day; Caixin's piece is dated 2026-04-27 by URL but is unfetchable this session (snippet-grade (web search, no fetched document) query: "site:caixinglobal.com Robot Era raises more than $200 million SF Express"), so the aggregator-only 2026-04-01 comes out and the row leaves the timeline. Type stays null ("a new financing round"; the March ¥1B strategic round and the Dec 2025 Series A+ precede it). HQ city null → Beijing (The Robot Report). Sources added: 2 (both independent). |
| rhoda-ai | latestRound Series A $450M, 2026-03-10, $1.7B valuation, leads []; HQ Palo Alto; founded null; totalRaisedUsd null | https://finance.yahoo.com/news/rhoda-ai-raises-450-million-160945418.html (200, independent: Reuters via Yahoo, 2026-03-10: "Rhoda AI on Tuesday said it has raised $450 million in a Series A funding round that values the company at $1.7 billion"; "emerged from stealth"; backers "Khosla Ventures, Temasek, Mayfield, Premji Invest and Capricorn Investment Group, among others" — none named as lead); https://techfundingnews.com/rhoda-ai-450m-series-a-stealth-exit-robotics/ (200, independent: TechFundingNews: "Based in Palo Alto, Rhoda AI") | CONFIRMED | Every batch-3-adjacent field verified against the fetched wire and secondary: amount, round class, date, valuation, empty lead list (backers named, no lead), Palo Alto HQ, null founded (no fetched source states a year; "emerged from stealth after 18 months" is not a founding date), null total (no source states a company total). No edit made. This is the one Tier-2 record whose non-aggregator sources already said exactly what the record says. |
| mind-robotics | latestRound $400M, 2026-05-13, $3.4B valuation, lead [Kleiner Perkins]; totalRaisedUsd null; founded null | https://finance.yahoo.com/news/rivian-spinout-mind-robotics-valued-154827510.html (200, independent: Reuters via Yahoo, 2026-05-13: "Mind Robotics, a spinout from Rivian, was valued at $3.4 billion in a new funding round, up from the $2 billion valuation it secured during its Series A raise in March"; "raised $400 million in the Kleiner Perkins-led round"); https://techcrunch.com/2026/05/13/rivian-spinoff-mind-robotics-raises-another-400m/ (200, independent: TechCrunch: "after it was created in 2025"; "brings the total raised to more than $1 billion"); https://www.therobotreport.com/mind-robotics-raises-400m-scale-ai-powered-robots-in-manufacturing/ (200, independent: The Robot Report: "spun out Mind Robotics in November 2025") | CONFIRMED + CORRECTED (founded) | Amount, date, lead, and the $3.4B valuation confirmed by the fetched Reuters syndication (the valuation's source of record, now added to the record; b1b161f had dropped the bot-walled reuters.com original while keeping its figure). totalRaisedUsd null confirmed correct ("more than $1 billion" is a bound, not a total). One correction: founded null → 2025 (TechCrunch "created in 2025"; The Robot Report "spun out... in November 2025"). Source added: 1 (independent). |
| agibot | latestRound Series B, null amount, 2024-01-01, $1B valuation, lead [CATL]; HQ Suzhou; totalRaisedUsd $83.8M; deployments "Backdoor listing via Swancor ($290M for 63.62%)" | https://finance.yahoo.com/news/chinese-robot-maker-agibot-completes-104808083.html (200, independent: Reuters via Yahoo, 2025-08-01: "AGIBot has completed a new round of strategic financing with investors including LG Electronics and Mirae Asset, the company said in a statement to Reuters... declined to disclose the size of the fundraising round"); https://en.tmtpost.com/post/7620691 (200, independent: TMTPost, 2025-07-09: "will acquire control of the listed company by purchasing at least 63.62% of its shares"; "2.1 billion yuan, or around $290 million"; "AgiBot Robotics emphasized that the acquisition is not a backdoor listing under current Chinese capital market regulations"); https://agibot.com/ (200, first-party: site title "AGIBOT Innovation (Shanghai) Technology Co., Ltd."); https://finance.yahoo.com/news/exclusive-chinese-robot-maker-agibot-092020928.html (200, independent: Reuters via Yahoo, 2025-10-10: "The Shanghai-based company"; "backed by investors such as Tencent and HongShan Capital Group (HSG)"; "According to PitchBook, it reached a valuation of $2.07 billion as of March"); https://futurism.com/robots-and-machines/robot-agibot-humanoid-walking (200, independent: Futurism, 2025-11: "completed a 66-mile pilgrimage from Jinji Lake in Suzhou to Shanghai... set a new Guinness world record"); https://www.prnewswire.com/news-releases/omdia-ranks-agibot-no1-worldwide-in-humanoid-robot-shipments-in-2025-302656788.html (200, durability addition, first-party, issuer: AgiBot, PR Newswire 2026-01-08: "shipped more than 5,100 humanoid robots during the year, capturing 39% of global market share") | CORRECTED | HQ corrected Suzhou → Shanghai (company's own site title + two Reuters wires; no fetched source says Suzhou). latestRound corrected: the "Series B (2024) at $1B led CATL" framing is humanoidindex-derived and supported by no fetched body; the most recent disclosed funding event is the 2025-08-01 strategic round (LG Electronics and Mirae Asset participating, size declined), recorded as type Strategic with null figures. CATL dropped as lead: no fetched source names CATL leading anything at AgiBot (its fetched backers are Tencent and HongShan; the March 2025 round was Tencent-led at ¥15B ≈ $2.07B per PitchBook-via-Reuters — kept in the ledger, not in the round fields, since that round is not the latest). totalRaisedUsd $83.8M NULLED: aggregator-derived (Tracxn-style "$83.8M over 3 rounds"); no fetched primary states a company total. Deployments rewritten from fetched sources: the "backdoor listing" framing is the company's explicitly denied characterization ("emphasized that the acquisition is not a backdoor listing"), so the text now states the deal (≥63.62% for ¥2.1B ≈ $290M) and the denial; the 66-mile Guinness walk and the Omdia No.1 shipment rank are kept with fetched sources. Description updated the same way and notes the HK IPO preparation (Reuters). founded 2023 retained (predates batch 3; not contradicted). Status stays private (IPO filing, not priced). Confidence medium → high. Sources added: 5 (4 independent, 1 first-party durability). |
| neura-robotics | latestRound Series C $1.4B, 2026-06-10, lead [Tether]; valuation null | https://neura-robotics.com/record-series-c/ (200, first-party, 2026-06-10: "Metzingen, Germany: June 10, 2026 – NEURA Robotics... today announced a landmark Series C financing with a total round size of up to $1.4 billion"); https://www.coindesk.com/business/2026/06/11/tether-leads-usd1-4-billion-funding-round-in-german-robotics-company-neura/ (fetched this session via an independent client after its curl 429s: HTTP 200, CoinDesk, 2026-06-11: "Tether Investments led a $1.4 billion funding round for Neura Robotics, a German startup developing AI-powered humanoid robots"); https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html (200, independent: CNBC: "raised a round of up to $1.4 billion, the company said on Wednesday"; valuation "around $7 billion, according to a source... The company declined to comment") | CORRECTED (amount NULLED) | Type (Series C), date (2026-06-10) and lead (Tether) confirmed by fetched bodies. amountUsd $1.4B → null: the company's own release — the primary — phrases the round as "up to $1.4 billion", and every fetched body repeats the hedge; a bound is never promoted to a precise value (the Skild rule; the same discipline that nulled generalist-ai's "more than half a billion"). The bound stays visible to readers in the first-party source title carried on the record ("Series C of up to $1.4B"). valuationUsd null retained as correct: the only figures in fetched bodies are "around/approximately $7 billion" from anonymous sources, which the company declined to confirm — and CoinDesk's own caption says "raised $1.5 billion" while its body says "$1.4 billion", so the secondary flat figures cannot settle what the primary hedges. founded 2019 / HQ Metzingen retained (dateline confirms HQ; founded predates batch 3). Sources added: 0 net — the fetched TNW corroboration ("Tether led the round") was withheld from the dataset because thenextweb.com answers HEAD 404 / GET 200 and the gate would classify it dead (dead is never exceptable); the CoinDesk URL already on the record, re-fetched this session, carries the lead attribution. |
| x-square-robot | latestRound Series B $293M, 2026-04-01, leads [Xiaomi, HSG]; HQ city null; founded null | https://kr-asia.com/xiaomi-hongshan-back-x-square-robot-in-series-b-round (200, independent: KrASIA, 2026-04-21: "X Square Robot has completed a Series B funding round, raising nearly RMB 2 billion (USD 292.8 million), 36Kr reported. Xiaomi and HongShan co-led the investment"); https://theaiinsider.tech/2026/04/22/x-square-robot-raises-276m-in-series-b-funding-for-household-robots/ (200, independent: The AI Insider citing China Daily, 2026-04-22: "raised nearly $276 million in a Series B round led by Xiaomi's strategic investment arm"); https://www.cnbc.com/2025/09/08/alibaba-leads-100-million-investment-in-chinese-humanoid-robot-startup.html (200, independent: CNBC, 2025-09-07: "the Shenzhen-based startup's eighth round of financing since the company launched less than two years ago in December 2023, according to Chief Operating Officer Yang Qian") | CORRECTED (amount NULLED on conflict) | The batch-3 "correction" moved this record away from the truth: the pre-batch $276M / 2026-04-21 matched fetched reporting; batch-3 rewrote it to $293M / 2026-04-01 from the aggregator. The underlying round is ~¥2B, and the two fetched named outlets convert it inconsistently — KrASIA prints "(USD 292.8 million)" (a stale-rate conversion) while China Daily via The AI Insider prints "nearly $276 million" — so amountUsd is NULLED with the disagreement named rather than either figure promoted. Date restored to 2026-04-21 (KrASIA's report date). Leads [Xiaomi, HSG] CONFIRMED (Xiaomi and HongShan co-led; HSG = HongShan). HQ city null → Shenzhen and founded null → 2023 from the fetched CNBC piece (COO statement: launched December 2023). Deployments "Home trials targeted by May 2026" confirmed (The AI Insider: launch "starting in late May" with 58.com home trials). Sources added: 2 (both independent). |
| limx-dynamics | latestRound Series B $200M, 2026-02-03; HQ city null; founded 2022 | https://technode.com/2026/02/03/limx-dynamics-raises-200-million-in-series-b-to-scale-humanoid-robotics/ (200, independent: TechNode, 2026-02-03: "Shenzhen-based humanoid robot maker LimX Dynamics said on Monday it had raised $200 million in a Series B funding round"); https://finance.biggo.com/news/269a54b1 (200, independent: BigGo Finance, 2026-07-14: "announced on July 14 the completion of a nearly $200 million Pre-IPO funding round, pushing its post-money valuation to 15 billion yuan (approximately $2.2 billion)"; "Founded in 2022 by... Zhang Wei"); https://eu.36kr.com/en/p/3893976502287618 (200, independent: 36Kr EN, 2026-07-14: "announced the completion of its Pre-IPO funding round, raising nearly $200 million... post-money valuation has reached 15 billion RMB"); https://cryptobriefing.com/limx-dynamics-ipo-200m-pre-ipo-funding/ (200, independent: Crypto Briefing, 2026-07-14: "founded in January 2022"; "The pre-IPO round, completed on July 14, 2026") | CORRECTED | The February Series B was flat-verified at TechNode ($200M, Shenzhen-based) — but it is no longer the latest event: a pre-IPO round completed 2026-07-14 supersedes it, and its figures are bounds in every fetched body ("nearly $200 million"; the ¥15B post-money converts to "approximately $2.2 billion" at BigGo and "about $2.21 billion" at Crypto Briefing — FX-rate disagreement), so the round is recorded as Pre-IPO 2026-07-14 with amountUsd and valuationUsd null and both bases documented here. HQ city null → Shenzhen (TechNode, BigGo). founded 2022 CONFIRMED (January 2022, Crypto Briefing). Confidence low → medium. Sources added: 2 (both independent). |
| switchbot | latestRound IPO $206M, 2025-12-30; status public; HQ Shenzhen; founded 2015 | https://www.caixinglobal.com/2025-12-31/smart-home-startup-onerobotics-lands-206-million-in-hk-ipo-bets-big-on-ai-bots-102398920.html (200, independent: Caixin Global, 2025-12-31: "OneRobotics (Shenzhen) Co., a smart-home device maker, debuted flat in Hong Kong trading on Tuesday after raising HK$1.64 billion ($206 million) in its initial public offering. Founded in 2015 by two graduates of the Harbin Institute of Technology, OneRobotics is best known for its SwitchBot line of home-automation gadgets") | CONFIRMED | Every batch-3-set field verified against the fetched Caixin piece: HK$1.64B ($206M) IPO, debut Tuesday 2025-12-30 (the piece is dated Wednesday Dec 31 and says "on Tuesday"), status public, Shenzhen, founded 2015. One addition: aka [] → ["OneRobotics (Shenzhen) Co."] so the registered listing entity is findable from the brand-name record (named in the same fetched sentence). humanoidindex's "$50M+ raised / Series B 2023" is a pre-IPO snapshot, not a conflict. No figure changed. |

Counted from the table above: **12 rows — 2 CONFIRMED (rhoda-ai, switchbot;
engineai confirmed on amount/valuation/leads with a date correction), 10
CORRECTED (spirit-ai, tars-robotics, galaxea-ai, robot-era, mind-robotics,
agibot, neura-robotics, x-square-robot, limx-dynamics, engineai's date), 8
of the corrections null at least one figure on bound or conflict grounds
(spirit-ai valuation, tars-robotics valuation, galaxea-ai valuation,
robot-era amount+date, agibot totalRaised, neura-robotics amount,
x-square-robot amount, limx-dynamics amount+valuation on the newer
round).** Under the wrong-vs-stale taxonomy:
spirit-ai WRONG (fabricated extension round; cross-contaminated figures),
tars-robotics WRONG (amount, class, date), galaxea-ai WRONG class + stale
valuation, robot-era WRONG precision + missing lead, mind-robotics gap
filled, agibot WRONG (HQ, round record, total, denied-framing kept as fact),
neura-robotics bound over-precision, x-square-robot WRONG (the batch-3 move
was away from the truth), limx-dynamics STALE (superseded round), rhoda-ai
and switchbot clean.

Pattern finding, stated per the skill's rule on reporting batch size: this
pass found defects on 10 of 12 records from the same aggregator-sourced
batch (b1b161f touched 19; 6 were already corrected at ba0c1e9, 12 here, 1
was mentee's sibling feature). The batch's cumulative defect rate is 16 of
18 verified records wrong or imprecise. The mechanism was visible twice
this session: the aggregator contaminated Spirit's paragraph with Galaxea's
numbers, and its X Square "correction" pushed a verified value to a
stale-FX conversion. No field sourced solely to news.crunchbase.com or
humanoidindex.org should be treated as verified.

Snippet-grade rows in this section: 2 cells carry snippet-tier material
(both disclosed inline with their queries above) — tars-robotics'
valuation-null note and lead disagreement, and galaxea-ai's round date. No
load-bearing numeric on any row rests on a snippet; every figure that
survives in the dataset is stated by a fetched body quoted above.

### Batch-3 re-verification gates (2026-08-18)

| Gate | Command | Result |
|---|---|---|
| dataset-source gate (×2) | `npm run check:dataset-sources` | exit 0 both runs, identical summaries: "Checked 249 dataset source URLs across 111 records: 238 live, 0 dead, 0 blocked, 0 error, 11 documented exceptions." (229 → 249 URLs: +20 net — 22 added, of which the two thenextweb.com additions were swapped out because that host answers HEAD 404 / GET 200 and the gate, which HEADs first, would classify it dead; dead is never exceptable. Every added URL was HEAD-probed with the gate's browser UA before writing.) |
| content validation | `npm run validate:content` | exit 0 (no-slop sweeps over 42 MDX files, 3 registered quotation exceptions unchanged) |
| typecheck | `npm run typecheck` | exit 0 (route types regenerated) |
| lint | `npm run lint` | exit 0 |
| build | `npm run build` | exit 0 (no Turbopack postcss failure; 58 exported HTML files swept clean) |
| unit suite | `npm run test` | exit 0 — 168 files, 1727 passed, 1 skipped (same skip as the ba0c1e9 baseline) |
| full e2e | `npm run test:e2e` (port 3200 killed first) | exit 0 — 573 tests: 572 passed, 0 failed, 1 skipped (identical counts to the ba0c1e9 baseline; all 43 market-map specs green). Bubble paintedTop measured on the rendered page post-change: anduril 30.0957, unchanged from the mentee-pass baseline, so the < 31 drift bound held without re-baselining (comment added at the assertion). |

Outcome summary for this pass: 111 records (unchanged), 12 rows above, 2
CONFIRMED / 10 CORRECTED / 8 with a nulled figure. The mentee-robotics
record was not touched (sibling feature owns its status). Timeline rows
72 → 71 (robot-era round date nulled), bubble focusable cards 31 → 28
(spirit-ai, tars-robotics, galaxea-ai valuations nulled; agibot valuation
corrected off the fabricated figure; mind-robotics enters on its
confirmed valuation), aka entries 26 → 27 (SwitchBot's listed entity).
Every moved oracle carries a cause comment at its assertion.

## Funding-round source pointers (2026-08-24)

The timeline now cites the source attached to `latestRound.sourceUrl` when
present. The `sources` arrays remain in append order, so the company card's
freshness date and the audit trail do not move. Each replacement below was
read in this session with the browser user agent from
`lib/citation-links.ts`. No amount, valuation, date, status, or record count
changed.

| Record | Previously cited source | Round source now cited | Supporting sentence from the fetched body |
|---|---|---|---|
| spirit-ai | `Spirit AI raises $290M Series A + $145M extension` (Crunchbase) | `Spirit AI's Spirit v1.6 Tops RoboArena` (StackFutures) | “Spirit AI announced the RoboArena result alongside a 1.5 billion yuan ($222 million) Series A+ financing on June 3 — its fourth round in three months.” |
| tars-robotics | `TARS Robotics raises $513M seed` (Crunchbase) | `China's TARS AI Raises $455M in Embodied Intelligence Round` (Ola China) | “On April 16, 2026, the company announced the completion of a $455 million Pre-A round — the largest single-round and the largest Pre-A round in China's embodied intelligence history.” |
| carbon-robotics | `Carbon Robotics Raises $70 Million Series D` (Business Wire, 2024) | `Carbon Robotics raises $20M as LaserWeeder maker plans secretive new 'AI robot' for farms` (GeekWire) | “Seattle agriculture-tech startup Carbon Robotics raised $20 million in new funding to support the creation of another piece of AI-powered machinery for farms.” The same body calls it a “Series D-2 extension round” and is dated October 23, 2025. |
| standard-bots | `Standard Bots raises $63M` (first-party Series B) | `Standard Bots raises $200 million Series C at $1 billion valuation` (Robotics 24/7) | “New York-based AI-native, industrial robotics manufacturer Standard Bots announced a $200 million Series C led by RoboStrategy and existing investors. The funding positions the company at a $1 billion valuation.” |
| limx-dynamics | `LimX Dynamics raises $200 million in Series B` (TechNode, February 2026) | `LimX Dynamics $200M Pre-IPO Financing` (36Kr) | “36Kr has learned that LimX Dynamics, a general-purpose humanoid robotics company, has announced the completion of its Pre-IPO funding round, raising nearly $200 million.” The numeric fields remain null because “nearly” is a bound, not an exact value. |
| unitree-robotics | `China robot maker Unitree files for $610 million Shanghai IPO` (Rest of World) | `Chinese humanoid robot maker Unitree prices IPO at $9 billion valuation` (CNBC/Reuters) | “China's Unitree has priced its Shanghai initial public offering at 150.8 yuan ($22.34) per share, valuing the company at around 61 billion yuan ($9.04 billion)”; the next sentence says it was “seeking to raise 6.1 billion yuan.” The recorded $904M is the 6.1B-yuan raise converted at the article's own stated exchange-rate basis. |

### Nimble valuation correction and round pointer (2026-08-24)

The earlier pass left `nimble-robotics.latestRound.valuationUsd` at $1.1B
because the record's three sources did not support that value. This follow-up
fetched all three bodies again with the browser user agent from
`lib/citation-links.ts` and found Nimble's own announcement. The evidence is
consistent:

- Nimble, first-party, dated 2024-10-23: “Nimble ... today announced the
  successful closure of a $106 million Series C funding round elevating the
  company to a $1 billion valuation.” The page also says, “The funding round
  was led by FedEx and co-led by existing shareholder Cedar Pine LLC.”
- The Robot Report: “Nimble announced the successful closure of a $106
  million Series C funding round, bringing its valuation to $1 billion.”
- Pulse 2.0: “Nimble ... announced the closing of a $106 million Series C
  funding round, elevating the company to a $1 billion valuation.”
- The FedEx announcement states that FedEx made a strategic investment on
  2024-09-05, but it gives no round amount or valuation.

No fetched source supports $1.1B. A search result from the aggregator
SalesTools states $1.1B, but it conflicts with the issuer's announcement and
the two fetched round reports, so it was not added as provenance.

| Field | Before | After |
|---|---:|---:|
| `latestRound.valuationUsd` | $1.1B | $1B |
| `latestRound.sourceUrl` | absent | Nimble first-party Series C announcement |
| `sources` | 3 entries | 4 entries, with the first-party announcement appended |

`latestRound.type` remains Series C, `amountUsd` remains $106M, `date` remains
2024-10-23, and `leadInvestors` remains `["FedEx"]`. Existing source order is
unchanged. The new pointer belongs to Nimble's own `sources` array and supports
the amount, type, date, valuation, and lead shown by the timeline.

### Dataset invariance transcript

The comparison removed every `sources` array and every
`latestRound.sourceUrl` field from both the working dataset and the `HEAD`
dataset before comparing them:

```text
stripped_payload_cmp_exit=0
source_arrays_cmp_exit=0
records=111
sources=249
roundPointers=6
timelineEligible=71
```

Exit 0 on both comparisons means the remaining dataset payload is
byte-identical after normalized JSON serialization, and every source array is
byte-identical to `HEAD`. The timeline event count remains 71.

### Gate mutation proof

A temporary `unitree-robotics` pointer to
`https://example.com/not-a-unitree-source` produced:

```text
validate:content: FAILED (1 issue(s))
  data/companies.ts: unitree-robotics: latestRound.sourceUrl https://example.com/not-a-unitree-source is not present in sources[]
```

After restoring the exact pre-plant file:

```text
validate:content: OK (47 registry modules, 47 published, 412 citations, 119 terms, 118 images, 111 companies)
```

This check lives in `validate:content`, not `check:dataset-sources`, because
same-record membership is deterministic offline data integrity and should
fail every build. The network sweep remains responsible for URL liveness.

## Unitree shipment-literal qualification (2026-09-24, VAL-MKT-009)

Scope: round-2 independent user testing (2026-09-24) failed the Unitree
card for publishing shipment and volume-rank literals under a
high-confidence badge, and the owner's 05:05 VAL-MKT-009 ruling required
the 2025 shipment quantity to read as not verified from an inspected
company body — never ~5,500, zero, `n/a`, a 2026 target, or a
proved-unpublished P4 absence. The 2026-08-18 pass (row above) had
verified these deployment strings against Rest of World's fetched body;
that verdict is superseded for these figures by the primary-claimant
rule: Rest of World is a repeater whose "five key metrics from its
363-page prospectus" all originate in Unitree's own SSE prospectus, which
this mission has never inspected (the retained four-anchor packet's
`source-008.txt` is an explicit empty no-fetch Unitree marker).

| Record | Claim (shipped value) | Source checked (fetched 2026-09-24) | Verdict | Note |
|---|---|---|---|---|
| unitree-robotics | description "profitable since 2025 with 5,500 humanoids sold that year"; deployments "5,500 humanoids sold in 2025", "30,000+ quadrupeds sold", "~33% of global humanoid sales"; confidence high | https://restofworld.org/2026/unitree-china-humanoid-robot-shanghai-ipo/ (200: "Unitree sold 5,500 humanoid robots in 2025"; "shipped more than 30,000 quadruped robots" 2022–Sep 2025; "roughly a third of global humanoid robot sales"; all under "five key metrics from its 363-page prospectus"; the same body self-contradicts the profitability year — text "its first profitable year" for 2025 vs its own chart caption "turned profitable in 2024"); https://www.cnbc.com/2026/08/06/chinese-humanoid-robot-maker-unitree-prices-ipo-at-9-billion-valuation.html (200: 150.8 yuan/share, ~61B yuan/$9.04B valuation, 6.1B yuan raise, "DeepSeek is among the strategic investors") | C (qualified) | Shipment/rank literals WITHDRAWN: the figures are press-repeated prospectus numbers and the prospectus itself is uninspected, so the card discloses scope instead of asserting counts. Description -> "Builds G1/H1 humanoids and quadruped robots; 2025 humanoid shipment volume not verified from an inspected Unitree company body; priced its Shanghai STAR Market IPO in Aug 2026 at a $9.04B valuation." ("profitable since 2025" dropped with them: the only supporting body contradicts itself on the year, and the metric is again prospectus-derived.) Deployments -> ["2025 humanoid shipments, cumulative quadruped shipments, and global sales-share rank not verified from an inspected Unitree company body", "DeepSeek strategic investment"]. Confidence high -> medium so the badge cannot imply the withdrawn metric was verified. IPO amount/date/valuation, status `public`, the three sources and the CNBC round pointer are unchanged and CNBC-supported; no `n/a`, zero, future target or P4 "not disclosed" disposition was introduced, and no replacement count was invented. research/04-market-map-companies.json updated identically and data/companies.ts regenerated via `npm run generate:companies` (111 rows unchanged, no duplicate source URLs). |

Dataset-only pass: no article prose changed, so no `lastReviewed` moved
and the humanizer does not apply (the new strings are data-field
disclosures, not narrative prose; no humanizer skill is available in this
worker session).

### Gates for this pass (transcript of commands actually run)

Sequential, `NODE_DISABLE_COMPILE_CACHE=1`:

| Gate | Command | Result |
|---|---|---|
| Targeted unit/component | `npm run test -- companies market-map` | pass, 7 files / 104 tests |
| Full unit suite | `npm run test` | 423 files: 414 passed / 9 failed; 5268 tests: 5097 passed / 162 failed / 9 skipped. All 162 failures are inside the 9 `brand-v2-*-evidence` readers, staled by this companies edit through the documented shell/apparatus closure fingerprint (`data/companies.ts` sits in the `app/layout.tsx` import closure via the search index); the same 9 files (229 tests) pass at clean HEAD 1d1bb1f. The prescribed remedy `npm run refresh:brand-v2-evidence` (ungated build + 13-spec full browser sweep) is outside this worker's bounded scope by the parent live boundary, so it is recorded, not run. |
| Typecheck | `npm run typecheck` | pass (exit 0) |
| Lint | `npm run lint` | pass (exit 0) |
| Content | `npm run validate:content` | pass — validate:content OK (57 registry modules, 57 published, 443 citations, 119 terms, 118 images, 111 companies); no-slop OK; chart-descriptions OK; audit-coverage OK (57/57, 1080 claim rows) |
| Targeted e2e (port 3200 killed first) | `npx playwright test tests/e2e/market-map.spec.ts` | 12 passed / 1 failed. The failure is VAL-DESIGN-010 on `/manipulation/hierarchical/` (micro-label count 7 > 5), reproduced identically at clean HEAD 1d1bb1f with the edits stashed — pre-existing and unrelated to this change. The updated Unitree assertions passed: the "not verified from an inspected Unitree company body" disclosure renders on the card, and 5,500 / 30,000+ / 33% / "profitable since 2025" are absent. |

## Dead source link replaced by its dated capture (2026-10-15, launch sweep)

The launch sweep of the live site checked every external link once. One
market-map source no longer answers: the Startup Hub AI piece on Mentee
Robotics' $17M round redirects (308) to a 404. No figure rests on it any
more (the $17M total was nulled on 2026-08-18, rows above), but it is still
listed as a source, so it now points at the Wayback Machine capture of
2025-07-24, whose page carries the same headline ("Mentee Robotics Raised
$17 million for their Humanoid Robot, MenteeBot", published 2024-04-17).
The title says it is an archived capture; `asOf` keeps the date the record
was last read.

| Record | Field | Old URL (live 2026-10-15: 308 then 404) | New URL | Note |
|---|---|---|---|---|
| mentee-robotics | sources[3] | https://www.startuphub.ai/mentee-robotics-raised-17-million-for-their-humanoid-robot-menteebot/ | https://web.archive.org/web/20250724144907/https://www.startuphub.ai/mentee-robotics-raised-17-million-for-their-humanoid-robot-menteebot/ | edited in research/04-market-map-companies.json, data/companies.ts regenerated with `npm run generate:companies`; no value, status or count moves |

## Market-map redesign: source dates, unknown values and the logo policy (2026-10-19)

Owner request of 2026-10-19: "start the market map and playground". The page
now shows the 111 companies as a map of tiles in the six segments, and one
company at a time in a detail view. No record, value, status, source or count
moves: `data/companies.ts`, `data/logos.ts`, `data/logo-images.ts` and
`public/images/logos` are unchanged. What changed is how the records are read
and drawn.

**Round dates.** A record's latest-round figures are now dated by the source
the round itself cites (`latestRound.sourceUrl`, `lib/market-map.ts`
`roundSource`), the same source the timeline already cited. The old card
printed `sources[0].asOf` beside them. The two differ for two records:

| Record | `sources[0].asOf` (old label) | Round source `asOf` (now) | Round source |
|---|---|---|---|
| tars-robotics | 2026-08-18 | 2026-08-25 | Pandaily, "TARS Raises $455M Pre-A Round" |
| nimble-robotics | 2026-08-18 | 2026-08-24 | Nimble, "Nimble Closes $106 Million Series C at $1B Valuation" |

Five more records (unitree-robotics, spirit-ai, limx-dynamics,
carbon-robotics, standard-bots) cite a round source other than `sources[0]`
with the same date, so only the cited title changed.

**Unknown values.** Unchanged in meaning and now pinned on every surface: a
figure no fetched source states reads "not disclosed" and is never drawn at
zero (a map tile leaves its figure blank and says so to a screen reader; the
bubble chart and the timeline plot leave such records off the axis, the
timeline on a separate "Undisclosed" lane); an empty list or missing website
reads "n/a". A tile shows the status of a company that is no longer private
(Acquired, Public, IPO, Shut down) instead of a round amount, so an
acquisition is never read as current funding.

**Logo policy.** Every mark keeps the one logo tile (plate, 3 px padding, the
registered threshold). Two rendering changes, no file edited:

- *Placement by artwork.* `scripts/measure-logo-marks.ts` drew every file in
  Chromium and recorded the box of every pixel with any opacity
  (`lib/market-map-marks.ts`, keyed to each file's SHA-256, checked by
  `tests/unit/market-map-marks.test.ts`). 44 files carry fully transparent
  margin outside that box; the tile is sized to the box, so only empty margin
  falls outside it and no artwork pixel is cut. The square Boston Dynamics
  file holds its wordmark in the middle 24% of its height, which drew it
  7.1 px high in the old tile; it now fills its plate at 11.1 px. Files
  with their own opaque background are placed whole, as before.
- *Legible size.* Each mark gets about the same area within a 10 to 16 px
  height range. Apptronik's 12:1 wordmark drew 7.4 px high in the old fixed
  96 x 36 tile; it now draws 10.8 px.

**Withheld marks (gaps to fix in the data).** Three registered files do not
show the company's own mark. They are withheld by file hash
(`WITHHELD_MARKS`): no page draws the file. The map shows the name as text,
the detail view says why no logo is shown, and /credits, which credits what
the site shows, leaves the three out. The registry entries stay because the
data is locked; each needs a correct official mark with recorded provenance,
after which the withholding must be removed (the unit test fails once the
file changes).

| Logo id | What the file shows | Checked |
|---|---|---|
| nimble-robotics-logo | The "Lisa Says Gah" wordmark, another company's | 2026-10-19 |
| assured-robot-intelligence-logo | "TD.", the icon of the domain-sale page now at ari.bot (page title "Ari.bot – Domain Showcase – TopDomains") | 2026-10-19, ari.bot fetched |
| farm-ng-logo | The Bonsai Robotics wordmark; farm-ng.com now redirects to bonsairobotics.ai | 2026-10-19, farm-ng.com fetched |

Follow-ups for the dataset, not made here because the records are locked: the
assured-robot-intelligence `website` (https://ari.bot) now serves a domain-sale
page; farm-ng.com redirects to Bonsai Robotics, so the Farm-ng record's status
needs a sourced review; the Harmonic Drive Systems and Wonik Robotics marks are
their group companies' marks ("Harmonic Drive AG", "WONIK Corporation USA").


## Market-map marks and company status, sourced (2026-10-19)

Queue item market-data-1019, owner session of 2026-10-19, with the owner's
review of the live map the same day ("the market map has weird background and
borders"). Every web request in this pass used the user agent
`robot-wiki-research/1.0`; each download went to its own empty directory, and
every SVG was scanned for script, event handlers, foreignObject and external
references before use (none of the files below has any). Each company's own
site was read first; a brand-data lookup by domain (Brand.dev, one lookup per
company, all 111) was used to cross-check every mark and to supply two files
the companies' sites would not serve. Records changed in
`research/04-market-map-companies.json`, `data/companies.ts` regenerated with
`npm run generate:companies`; marks changed in `public/images/logos`,
`data/logo-images.ts` (provenance) and `data/logos.ts` (file and size).

**How marks are drawn now.** The grey logo plate and its monochrome threshold
are gone. Every mark is a single-ink silhouette: its file's alpha masks one
element filled with the secondary ink token (`--color-text-dim`), on
`/market-map/` and `/credits/` alike (`components/ui/logo-mark.tsx`;
`VAL-B2-MAP-007` and `VAL-B2-MAP-010` successor rows of 2026-10-19). A mask is
only as good as its alpha, so every file whose alpha was a solid block (an
opaque ground, or a badge read by its colours) was replaced by an official
transparent or one-colour version, below. `scripts/measure-logo-marks.ts` now
records each mask's ink (how much of its artwork box it fills); no drawn mark
reaches the block fill (0.88), and marks are sized by area weighted by that
ink so the grid reads even.

### Company records

| Record | Field | Old | New | Source (fetched 2026-10-19) | Verdict |
|---|---|---|---|---|---|
| farm-ng | status, latestRound | private; no round | acquired; Acquisition 2025-07-24, amount not disclosed, lead Bonsai Robotics | Bonsai Robotics release, https://bonsairobotics.ai/news/bonsai-robotics-acquires-farm-ng-to-lead-the-future-of-autonomous-farming/ ("today announced its acquisition of farm-ng Inc.", July 24, 2025; "Financial terms of this acquisition were not disclosed"); The Robot Report, https://www.therobotreport.com/bonsai-robotics-and-farm-ng-unite-for-intelligent-farming-solutions/ (2025-07-24); AgFunderNews, https://agfundernews.com/bonsai-robotics-acquires-farm-ng-to-herald-new-era-of-ai-first-machines-that-will-transform-crop-management (2025-07-24) | C |
| farm-ng | hq.city, founded, description, confidence | null, null, generic, low | Watsonville, 2020, the Amiga and the acquisition, medium | the release ("Based in Watsonville, California, farm-ng inc."; the Amiga "modular, electric, open-architecture robot designed to serve small- and mid-sized farms"); AgFunderNews ("Watsonville, CA-based farm-ng, founded by Ethan Rublee in 2020") | C |
| assured-robot-intelligence | website | https://ari.bot | null | ari.bot was a domain for sale in the Wayback Machine captures of 2025-08-06 and 2025-10-14 ("Ari dot Bot: premium domain name"), before the logo pass of 2026-08-21, and still is ("Domain Showcase"); TechCrunch links the company to https://www.arirobots.com/, whose capture of 2026-05-05 (added as a source) is the company's site ("ARI - Frontier AI for Robots") and which no longer resolves. Status `acquired` (Meta, TechCrunch 2026-05-01) unchanged | C |
| tars-robotics | website | https://www.tars.bot | null | tars.bot redirects to a parked-domain lander, as in the Wayback Machine capture of 2024-09-27; TARS's own pages are on tars-ai.com (https://wiyh.tars-ai.com/, "Copyright @2025 Shanghai TARS Robotics Co., Ltd."), whose root does not resolve | C |
| foundry-robotics | website | https://www.foundryrobotics.com | https://foundryrobotics.ai | foundryrobotics.com redirects to a parked-domain lander (Wayback capture of 2024-08-15 likewise); https://foundryrobotics.ai/ is "Foundry Robotics", "AI-first, assembly-focused robotics", matching the record's Business Insider source ("developing robots to automate factory assembly"); added as a source | C |
| wonik-robotics | website | https://www.wonikrobotics.com | https://wonikrobotics.com | www.wonikrobotics.com does not resolve; the apex serves the company site the record already cites | C |

### Marks replaced

Each new file is the company's official mark, fetched on 2026-10-19 and
registered as `unlicensed` (official identification use, no reuse grant
named), the way the existing official marks are. Inline SVGs are saved as
standalone files with only what a standalone file needs (listed).

| Logo id | Old file (SHA-256 prefix) and why it was replaced | New file and SHA-256 | Fetched from | Standalone wrapping |
|---|---|---|---|---|
| nimble-robotics-logo | `nimble-robotics.svg` (85383cb32a5d2ff2…) withheld: showed another company's wordmark | `nimble-robotics.svg` `6919f3a3da946bf42595d946a79b74578a9fc78b552069e74c8e7616431bf14c` | inline header SVG of https://nimble.ai/ (link named "Nimble Logo") | added xmlns; added width=105; added height=32; final newline |
| harmonic-drive-logo | `harmonic-drive.svg` (b669c836dcbbdfd9…) group mark: Harmonic Drive AG | `harmonic-drive-systems.png` `9d3fef6d80f0549acd842e055f811675f6b08c28ff2568355b1cedf7e4ac4117` | https://www.hds.co.jp/Portals/0/files/common/images/logo_blue_en.png | byte for byte |
| wonik-logo | `wonik.png` (13196cf95870b316…) group mark: WONIK Corporation USA | `wonik-robotics.svg` `38b3b2f6d95e5e832c402c3a6bf20478124eff3694ebca9d61a50b460008cf2a` | https://wonikrobotics.com/img/svg/img_logo.svg | byte for byte |
| covariant-logo | `covariant.png` (387078f439e917d5…) opaque white ground | `covariant.svg` `f3b4b71e2da692e1e7646066a2cdce3a3b19ea1db5b1372f16bf1aeae5a75833` | https://covariant.ai/covariant-c.svg | byte for byte |
| cmr-surgical-logo | `cmr-surgical.png` (372d76bc8915307a…) opaque white ground | `cmr-surgical.svg` `18121d407b7da687efaba35878a6c4d9ae7653d038efee7f085ae8f81b4fd973` | https://cmrsurgical.com/wp-content/uploads/2022/04/cmr-surgical-logo-web-white.svg (same mark as the press kit's Logo-CMRSurgical-White.png) | byte for byte |
| limx-dynamics-logo | `limx-dynamics.png` (ebc4f8bb44e3d368…) opaque grey ground (a sharing image) | `limx-dynamics.svg` `0322dd27750096f9151a6a122741a1f084116dcc8bcc8d4ec427230b035246b2` | symbol icon-a-zhujidongli-yingwenLogozuhe1caise1 of https://www.limxdynamics.com/iconfont/iconfont.js (the header logo) | symbol icon-a-zhujidongli-yingwenLogozuhe1caise1 wrapped in an svg element with its viewBox; added width=3232; added height=1024; final newline |
| agibot-logo | `agibot.png` (3f5a555727f78471…) opaque ground | `agibot.png` `83535ee96d57a776b05e4f8f0c3b0c65014ea7994ff1bab96d18b173f87f5aa9` | https://www.agibot.com/public/static/index/en/images/logo2.png | byte for byte |
| figure-ai-logo | `figure-ai.svg` (3a190c6601c047e0…) symbol on a black square | `figure-ai.svg` `01566fa8768852f29fb60c27fe603f6715f4eaeadc18dcd03eeaaafac36b4682` | header image of https://www.figure.ai/, https://images.ctfassets.net/qx5k8y1u9drj/3ygvPaiOiIX62OhZ7oNO2h/d50ccd3bc449eab7ae098d87aa0cd040/figure-logo.svg | byte for byte |
| fox-robotics-logo | `fox-robotics.svg` (e97014a3c766bd96…) type on an opaque white panel | `fox-robotics.png` `21fb2728292a852d655f42c0e1ddaec449b99acb1743441105516dabf6327561` | https://foxrobotics.com/hubfs/fox-logo-wht.png | byte for byte |
| genesis-ai-logo | `genesis-ai.svg` (3ab079634a7d6394…) drew as a solid disc | `genesis-ai.svg` `f68da5b54cd5ff7415e835279ebcd47e7fbd3ddb6eaee45bd6bb67c790652b34` | inline SVG of https://www.genesis.ai/ (ring and wordmark) | final newline |
| galbot-logo | `galbot.gif` (9fb5943976af066b…) icon on a black square | `galbot.svg` `78ff7309207722d2d76d16b37ea60f00c37aaaec6f5806a978e503fe94f85179` | inline header SVG of https://galbot.com/ (class brand-logo) | viewbox spelled viewBox; final newline |
| hugging-face-logo | `hugging-face.svg` (fc95837e1bacb9b2…) colour face drew as a solid shape | `hugging-face.svg` `87ac947dc4f0a9146fcd42aad52b657909bef9860eb284c651a6690e935e0595` | https://huggingface.co/datasets/huggingface/brand-assets/resolve/main/hf-logo-monochrome.svg (official brand page https://huggingface.co/brand) | byte for byte |
| micro1-logo | `micro1.png` (3c80d0ffe1f9633d…) icon on a black square | `micro1.svg` `d47e282dc81a77947898972fbc5846de22d56ad81999fa338cf036d69ec73e97` | inline header SVG of https://www.micro1.ai/ | width 100% set to 89; height 100% set to 20; final newline |
| mind-robotics-logo | `mind-robotics.png` (a11a9b7d8b4caff0…) opaque ground | `mind-robotics.svg` `032c5a7e937091711817ae998ea536f201080a1907db5b4f99aac89664c6ae82` | inline SVG of https://www.mindrobotics.com/ | added width=80; added height=64; final newline |
| saronic-logo | `saronic.png` (d52613b5c59e8bf1…) icon on a lime square | `saronic.svg` `fc59d18b3f78246c1e300d43f28da466ec1cbbffdd2d39b2dc306d2488c00cd6` | inline header SVG of https://www.saronic.com/ | added width=140; added height=28; final newline |
| serve-robotics-logo | `serve-robotics.svg` (6227552fc552e78f…) icon on a white square | `serve-robotics.svg` `0d564558c00258447b9cf24711d7f4dcb2cf373d05c48ebf7dc15ea34b67c5ab` | inline header SVG of https://www.serverobotics.com/ | added width=255; added height=51; final newline |
| sunday-robotics-logo | `sunday-robotics.svg` (3416dab04da25856…) icon on a yellow square | `sunday-robotics.svg` `afbe6d1eb3fd3f54c23c1addf0cfc56669b135731dab2baf8ce9785688ae1914` | inline header SVG of https://www.sunday.ai/ | final newline |
| weave-robotics-logo | `weave-robotics.png` (a0211fc10f670b01…) opaque ground | `weave-robotics.svg` `fadd6aab37e07d0dc3ab065371f6ed73ccd84d1e8920fe9f02a919620c070025` | inline header SVG of https://www.weaverobotics.com/ | added width=158.34; added height=32.09; final newline |
| humanoid-uk-logo | `humanoid-uk.png` (cd92590a15a0edaf…) icon on a rounded square | `humanoid-uk.svg` `0a86825d0538deb58434e567d00a9739a84f243702de6ed599a5b9de9a2696a9` | https://thehumanoid.ai/wp-content/themes/SKLTech/src/assets/images/footer-logo.svg | byte for byte |
| collaborative-robotics-logo | `collaborative-robotics.png` (ca8090ec535f0c5e…) opaque ground | `collaborative-robotics.svg` `812ff81760dea8dc71fabf42e1de1d17d25da78298c6a0056c35f7ae288cd755` | brand-data copy for co.bot, https://media.brand.dev/5464ba3d-049e-4500-a3ed-42ab07ab4944.svg (co.bot draws its logo by script; the wordmark reads "cobot", the label of the site's logo link) | byte for byte |
| robot-era-logo | `robot-era.png` (e5ca9950532f5d38…) avatar on a black square | `robot-era.png` `621f1d9593021fe92d222c1f71943a4b07a3e8c3d6be22e0dd1ecc0d9d7090ea` | brand-data copy for robotera.com, https://media.brand.dev/83d34286-0941-4e2a-b869-c84f8ca40830.png (robotera.com reset every request for its own logo files; the wordmark reads "ROBOTERA 星动纪元") | byte for byte |
| formic-logo | `formic.svg` (11e0a8a37e32b683…) icon on an orange square | `formic.svg` `2321647ef9c5751d19e3b34bf0b55986b08a2c6ea7b3fc90fabb9ae25a9f8247` | https://formic.co/formic-logo.svg (the logo the site declares for itself) | byte for byte |

### Luminance-derived masks (no official one-colour version found)

Four files are badges whose alpha is a solid square, and neither the
company's site nor a brand page offered a transparent or one-colour version
(Sanhua's site did not resolve on 2026-10-19). The files are unchanged; their
mask reads their colours instead of their alpha (`LUMINANCE_MASKS`, bound to
each file's SHA-256), checked on a contact sheet at tile size:

| Logo id | Mask | What the reader sees |
|---|---|---|
| k-scale-labs-logo | light (luminance x alpha) | the white K-Scale mark; the black square drops out |
| miso-robotics-logo | dark (alpha less luminance) | the purple badge as ink with its white onion cut out, beside the wordmark |
| rainbow-robotics-logo | dark | the red badge as ink with its white "rb" cut out, beside the wordmark |
| sanhua-logo | dark | the blue badge as ink with its three white flowers cut out |

### Still withheld

- **assured-robot-intelligence-logo.** The file is the "TD." icon of the
  ari.bot domain-sale page. The company's own site (arirobots.com, capture
  of 2026-05-05) showed its name in type and a plain circle favicon, with no
  logo file, and the brand-data lookup for arirobots.com failed (the domain
  no longer resolves). No official mark exists to register; the map shows
  the name.

### Farm-ng's mark from the archived farm-ng.com (owner-session decision of 2026-10-19)

farm-ng.com and www.farm-ng.com redirect to bonsairobotics.ai; amiga.farm-ng.com,
the developer site, shows only the ">_" symbol; the brand-data lookup for
farm-ng.com returns Bonsai's icon; Bonsai's pages hold no farm-ng logo file.
By the owner session's decision of 2026-10-19 the mark comes from the
company's own domain as the Wayback Machine archived it before the redirect:
the header of the farm-ng.com capture of 2025-06-18
(https://web.archive.org/web/20250618065341/https://farm-ng.com/, footer
"© 2025 Farm-ng, Inc.") shows https://farm-ng.com/wp-content/uploads/2025/05/farm-ng-logo.svg,
fetched from its capture of 2025-07-10 13:44:07 UTC
(https://web.archive.org/web/20250710134407/https://farm-ng.com/wp-content/uploads/2025/05/farm-ng-logo.svg),
before Bonsai's announcement of 2025-07-24. Saved byte for byte as
`farm-ng.svg` (135 x 57; SHA-256
`afce0abf0c8a8fbb1a833c44c0eef2dee44cc60a2d12150e08aa4a942469286f`; no script,
handler, foreignObject or external reference, one internal clip path),
retrieved 2026-10-19, registered `unlicensed` like the other official marks.
It replaces the Bonsai Robotics wordmark, and the withholding ends.

### Checked and kept

Every other mark was compared, as the site now draws it, with the
brand-data candidates for the company's domain on contact sheets: each is
the right company and already a clean transparent mark, so it was kept.
Two observations, no change: Mentee Robotics' site now shows a newer lockup
(three dots and "mentee robotics") than the registered official mark; and
the Harmonic Drive Systems record's website, https://www.harmonicdrive.net,
is the site of Harmonic Drive LLC, the US group company (the parent's site is
https://www.hds.co.jp/english/, where its mark now comes from).

## Field audit of the company dataset (2026-10-19)

Owner request of 2026-10-19: "start the market map and playground". The audit of 2026-08-18 above checked each
record against its sources, but about 40 of its 98 rows rested on search-snippet corroboration (the method
paragraph at the top), and 21 records were checked for identity only, with no founded year re-fetched (the
identity-only row of the corrections ledger). This pass reads the page body of every source a record cites
(its `sources`, its round's `sourceUrl` and its website) and checks every field the map renders, one row per
field, in `audit/market-map-ledger.json`: the value, the URL, how the body was read, when, and the passage that
states the value.

The rules of 2026-08-18 hold, on fetched bodies only. A value no fetched body states is cut, never guessed. A
floor ("more than $1B") is never promoted to an amount or a total. A description says only what its sources
say. Where the sources disagree about the same round, or state only a floor, the card shows a caveat that cites
the sources instead of dropping either figure.

**Progress.** 111 of 111 records are audited: physical-intelligence, skild-ai, generalist-ai, dyna-robotics, sunday-robotics, field-ai, covariant, genesis-ai, rhoda-ai, mind-robotics, nvidia-robotics, google-deepmind-robotics, hugging-face-lerobot, applied-intuition, xdof, encord, micro1, figure-ai, 1x-technologies, agility-robotics, apptronik, tesla-optimus, boston-dynamics, unitree-robotics, ubtech-robotics, fourier-intelligence, galbot, agibot, sanctuary-ai, neura-robotics, humanoid-uk, spirit-ai, galaxea-ai, engineai, robot-era, tars-robotics, x-square-robot, deep-robotics, kepler-robot, limx-dynamics, wandercraft, clone-robotics, mentee-robotics, persona-ai, rainbow-robotics, symbotic, dexterity, berkshire-grey, amazon-robotics, nimble-robotics, locus-robotics, mujin, righthand-robotics, ambirobotics, plus-one-robotics, carbon-robotics, monarch-tractor, farm-ng, bedrock-robotics, chef-robotics, simbe-robotics, intuitive-surgical, cmr-surgical, moon-surgical, nuro, serve-robotics, gecko-robotics, standard-bots, collaborative-robotics, the-bot-company, weave-robotics, irobot, k-scale-labs, automata, lila-sciences, avidbots, harmonic-drive-systems, nabtesco, leaderdrive, sanhua, shadow-robot, sharpa, wonik-robotics, xela-robotics, openai-robotics, meta-robotics, assured-robot-intelligence, saronic, eka-robotics, foundry-robotics, mytra, formic, astribot, booster-robotics, leju-robotics, switchbot, hanson-robotics, paxini, miso-robotics, starship-technologies, coco-robotics, knightscope, brain-corp, pollen-robotics, diligent-robotics, fox-robotics, zebra-robotics-automation, anduril, robotphoenix, abb-robotics, mitsubishi-robotics.
No record rests on search-snippet or identity-only evidence any more.

**Ledger rows.** 1578 rows: 819 verified, 504 corrected, 168 added and 87 cut. The quoted passages come from a body fetched directly (913 rows), a page rendered in a headless browser (23) and a follow-up fetch (563).

**Empty fields.** Every rendered field a record leaves empty now carries a recorded disposition in the registry
(`absent` in `research/04-market-map-companies.json`). `not-disclosed` means a value exists but no source
publishes it, and the card prints exactly "not disclosed". `not-applicable` carries its basis and means the field
does not apply (the venture total of a division its parent funds, the valuation of a hiring-and-licensing deal, a
company with no open-source release of its own), and the card prints exactly "n/a". The schema
(`data/schemas/company.ts`) rejects an empty field without a disposition, a disposition on a populated field and
an n/a without a basis, and `tests/unit/schemas.test.ts` plants each one. This replaces the redesign's rule
above, under which every empty list and a missing website read "n/a" whatever the reason. Across the 111 records:

| Field | not disclosed | n/a |
|---|---:|---:|
| HQ city | 9 | 0 |
| founded | 15 | 0 |
| website | 1 | 3 |
| aka | 1 | 60 |
| deployments | 29 | 1 |
| open source | 0 | 96 |
| total raised | 91 | 8 |
| round type | 30 | 7 |
| round amount | 46 | 7 |
| round date | 24 | 7 |
| round valuation | 73 | 11 |
| lead investors | 39 | 11 |

**Round caveats.** A caveat shows under the round on the card, with links to the sources it cites:

| Record | Round | Caveat | Sources |
|---|---|---|---|
| Skild AI | Series C | TechCrunch, citing Bloomberg, puts the valuation at more than $14 billion; no exact figure is given. | https://techcrunch.com/2026/01/14/robotic-software-maker-skild-ai-hits-14b-valuation/ |
| Field AI | type not disclosed | The $405M is two funding rounds announced together; the sources do not give the latest round on its own. | https://www.cnbc.com/2025/08/20/gates-nvidia-fieldai-robotics.html |
| Applied Intuition | Series F | The $600M covers the Series F and a tender offer together; the company does not say how much is new money. | https://www.appliedintuition.com/press-releases/series-f |
| Figure AI | Series C | Figure says the Series C exceeded $1B; it gives no exact amount. | https://www.figure.ai/news/series-c |
| Fourier | Series E | Fourier's Series E was reported as nearly 800 million yuan, about $109M; no exact amount is given. | https://www.sixthtone.com/news/1016947, https://humanoidroboticstechnology.com/articles/humanoid-funding-rounds-in-2025/ |
| Galbot | type not disclosed | Galbot says the round exceeded $300 million; it gives no exact amount. | https://finance.yahoo.com/news/galbot-secures-over-300-million-190800748.html, https://www.therobotreport.com/galbot-brings-in-300m-to-scale-mobile-manipulator-deployments/ |
| NEURA Robotics | Series C | NEURA gives its Series C as up to $1.4 billion; no closed amount is given. | https://neura-robotics.com/record-series-c/, https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html |
| Spirit AI | Series A+ | This A+ round is Spirit AI's fourth in three months. For the February round, Crunchbase News gives a $290 million Series A, followed by a $145 million extension in April, while the company's release gives $280 million. | https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/, https://www.prnewswire.com/news-releases/spirit-ai-lands-280m-to-scale-embodied-ai-through-dirty-data-302697085.html, https://news.pedaily.cn/202606/564786.shtml |
| Galaxea AI | Series B+ | The AI Insider, citing Yicai Global, puts the valuation at roughly $29 billion, while The Paper reports more than 20 billion yuan; the card gives no valuation. | https://theaiinsider.tech/2026/04/04/chinese-robotics-startup-galaxea-ai-raises-290m-usd-in-series-b-funding-valued-at-29b-usd/, https://m.thepaper.cn/newsDetail_forward_32878036 |
| EngineAI | Series B | Blue Whale Finance reported on 6 May 2026, citing a person familiar with the deal, that a Series B+ round had closed; its size and investors were not published. | https://www.lanjinger.com/d/1778055085697120105 |
| RobotEra | type not disclosed | RobotEra says the round raised more than $200 million; it gives no exact amount or round name. | https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/, https://pulse2.com/robotera-raises-over-200-million-to-scale-humanoid-robotics-commercialization/ |
| TARS Robotics | Pre-A | Crunchbase News reports this round as a $513 million seed round at a $1.9 billion valuation; the company's announcement, as Pandaily and Xinhua report it, gives $455 million in a Pre-A round and no valuation. | https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/, https://pandaily.com/tars-raises-455-m-pre-a-round-setting-record-in-china-s-embodied-ai-sector, https://www.news.cn/tech/20260417/aa7c5116da7648fc99470a6b4a56ef35/c.html |
| X Square Robot | Series C | X Square says the four rounds that ended with the Series C value it at more than $2.8 billion; it gives no amount for the round and no exact valuation. | https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/, https://en.wikipedia.org/wiki/X_Square_Robot |
| Deep Robotics | Series C | Deep Robotics calls the round over 500 million yuan; the South China Morning Post reports 500 million yuan (US$70 million). | https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html, https://www.deeprobotics.cn/en |
| Kepler Robot | Acquisition (controlling stake) | Kelin Electric will pay up to 300 million yuan (US$44.1 million) for 41.6% of Kepler; Blue Whale News works this out as a valuation of about 722 million yuan. No exact price is given. | https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml, https://www.lanjinger.com/d/1779274842637520212 |
| Clone Robotics | type not disclosed | The Rundown (9 April 2026) mentions a reported $50M raise but gives no date, round type or source for it; no cited source states a round or a total raised, so the card gives neither. | https://robotnews.therundown.ai/p/clone-20k-synthetic-human |
| Symbotic | Public offering | Symbotic sold 6.5 million new shares at $55.00 each and a SoftBank affiliate sold 3.5 million of its own; the release gives no total for the raise. | https://www.globenewswire.com/news-release/2025/12/05/3200430/0/en/Symbotic-Announces-Pricing-of-Primary-and-Secondary-Offering-of-Class-A-Common-Stock.html |
| Locus Robotics | Series G | The Series G is still open: Locus has raised $41.6 million from existing investors so far, and its Form D reports $41,599,804 sold. | https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding, https://www.sec.gov/Archives/edgar/data/1676668/000167666826000004/xslFormDX01/primary_doc.xml |
| Mujin | Series D | The US$233 million first close is $133 million of equity and $100 million of debt; in June 2026 Mujin's CEO said an extension values it at more than $1 billion. | https://finance.yahoo.com/news/mujin-raises-us-233-million-140000051.html, https://www.ttnews.com/articles/mujin-robot-software-warehouse |
| Bedrock Robotics | Series B | Bedrock says the Series B brings its total funding to over $350 million; it gives no exact total. | https://finance.yahoo.com/news/bedrock-robotics-raises-270-million-140000467.html |
| Simbe Robotics | Series C | The Series C took Simbe's total raised to over $100 million; it has published no exact total. | https://www.globenewswire.com/news-release/2024/10/24/2968475/0/en/Simbe-Raises-50-Million-in-Series-C-Funding-Led-by-Growth-Equity-at-Goldman-Sachs-Alternatives.html, https://www.grocerydive.com/news/simbe-raises-50-million-series-c/731116/ |
| CMR Surgical | Strategic investment | Stryker's investment of about $400 million (£300 million) is preferred equity, subject to closing conditions and regulatory approvals, and gives Stryker an exclusive option to buy all of CMR Surgical. | https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery, https://www.therobotreport.com/stryker-invests-400m-into-cmr-surgical/ |
| Nuro | Series E | The $203 million Series E closed in two tranches: $106 million announced in April 2025 and $97 million in August 2025. | https://finance.yahoo.com/news/nuro-closes-203-million-series-123000194.html |
| The Bot Company | type not disclosed | Bloomberg reported in October 2025 that the round was set to raise $250 million at a valuation of more than $4 billion, citing people familiar; no close has been announced. Its March 2025 round raised $150 million. | https://news.bloomberglaw.com/private-equity/cruise-founders-robot-startup-is-in-talks-for-4-billion-value, https://www.therobotreport.com/the-bot-company-led-by-kyle-vogt-brings-in-another-150m/ |
| Lila Sciences | Series A | Reuters reported in October 2025 that new Nvidia backing valued Lila at more than $1.3 billion; Lila has not published a valuation. | https://www.lila.ai/news/exclusive-ai-lab-lila-sciences-tops-1-3-billion-valuation-with-new-nvidia-backing, https://www.lila.ai/news/announcing-the-close-of-our-series-a |
| Avidbots | Series C | Avidbots said the Series C took its total raised to more than $107 million; it has published no exact total. | https://avidbots.com/news/avidbots-raises-70m-in-series-c-funding/ |
| Sanhua | type not disclosed | Reports in October 2025 said Tesla had ordered Optimus actuators from Sanhua worth about $685 million (over 5 billion yuan); the company declined to comment on market rumors and has never confirmed it supplies Optimus. | https://eu.36kr.com/en/p/3510288514980998, https://news.metal.com/newscontent/103570985-sanhua-intelligent-control-lands-over-5-billion-yuan-tesla-humanoid-robot-order |
| Astribot | Series B | Pandaily reports that the Series B pushed Astribot's valuation past 10 billion yuan (about $1.4 billion) and that its three rounds in three months raised over 1 billion yuan; no exact amount or valuation is given. | https://pandaily.com/astribot-billion-dollar-valuation-series-b-jun2026/ |
| Booster Robotics | type not disclosed | Booster says its April 2026 round raised nearly $150 million; it gives no exact amount. | https://www.booster.tech/about-us?target=en |
| PaXini | Strategic | PaXini says its August 2026 strategic round raised RMB1 billion, taking its total to RMB3.5 billion, and that an unnamed consumer-electronics and semiconductor group co-led it; no dollar figures are given. | https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/ |
| Starship Technologies | Series C | Starship says it has raised more than $280 million in total; it gives no exact figure. | https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html |
| Diligent Robotics | Acquisition | Serve's filing says the $29.0 million it paid in stock includes a potential $5.3 million earnout and is subject to adjustments; The Robot Report described the earnout as coming on top of the $29 million. | https://www.sec.gov/Archives/edgar/data/1832483/000121390026009480/ea0274698-8k_serve.htm, https://www.therobotreport.com/serve-robotics-acquires-diligent-robotics/ |
| Anduril | Series H | TechCrunch reports that Anduril has raised more than $11 billion in total; it gives no exact figure. | https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/ |
| ABB Robotics | Acquisition | SoftBank agreed on 8 October 2025 to buy ABB's robotics business; both companies expected the deal to close in mid-to-late 2026, and no fetched source reports that it has closed. | https://group.softbank/en/news/press/20251008, https://www.abb.com/global/en/news/129685/abb-to-divest-robotics-division-to-softbank-group |

### Changes, by record

Every value the ledger does not mark verified, against the record at the audit's base commit
(0c6a02b3). A cut field shows the disposition the card now prints.

| Record | Field | Was | Now | Basis |
|---|---|---|---|---|
| Physical Intelligence | description | Builds general-purpose vision-language-action foundation models (π0 series) that control any robot manipulator for contact-rich tasks. | Builds vision-language-action models for robots in its π0 series, and open-sourced the code and weights of π0. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Physical Intelligence | round date | 2025-11-20 | not disclosed | The Robot Report (25 Nov 2025) says only "last week"; no fetched source states 20 Nov 2025 |
| Physical Intelligence | aka | Pi | removed | the sources use "Pi" only for the Pi API and the Pi0 model, never as a name for the company |
| Physical Intelligence | deployments | Pilot deployments across multiple robot embodiments | not disclosed | no fetched source describes pilot deployments by Physical Intelligence; The Robot Report's deployment sentence is about its partner AgiBot |
| Physical Intelligence | open source | openpi | π0 and π0-FAST (weights and code) | the repository name "openpi" appears in no fetched source; the release does (https://www.pi.website) |
| Skild AI | description | Builds a scalable foundation model ('Skild Brain') designed to operate any robot across any embodiment and environment. | Builds the Skild Brain: general-purpose robot foundation models meant to be retrofitted to many different robots and tasks. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Skild AI | HQ city | Pittsburgh | not disclosed | no fetched source states Pittsburgh (TechCrunch, Reuters via U.S. News and skild.ai read) |
| Skild AI | round valuation | $14B | not disclosed | a floor ("more than"), not a value; the headline's "$14B" rounds it |
| Skild AI | deployments | Acquired Zebra Technologies robotics automation business (Apr 2026) | removed | an acquisition, not a deployment, and no fetched Skild source states it |
| Skild AI | lead investors | SoftBank Group | SoftBank | "SoftBank Group" is not the name the source gives (https://techcrunch.com/2026/01/14/robotic-software-maker-skild-ai-hits-14b-valuation/) |
| Generalist AI | description | Develops AI and robotics technologies enabling robots to perform physical tasks in real-world environments. | Builds embodied foundation models for robots, GEN-1 and GEN-1.5, trained on more than half a million hours of real-world data gathered with its hand-mimicking grippers. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Generalist AI | HQ city | San Mateo | not disclosed | no fetched source states San Mateo; the careers page lists on-site roles in San Francisco and Boston |
| Dyna Robotics | description | Builds robotic foundation models for cost-effective general-purpose robots, with first system DYNA-1 targeting repetitive manual tasks. | Builds robots and the foundation models that run them, from DYNA-1 to Dyna-2.1, which it calls a general-purpose physical agent for long, dexterous workflows. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Dyna Robotics | total raised | $143.5M | not disclosed | $143.5M is the sum of two rounds; no source states a total |
| Sunday Robotics | description | Builds the Memo household robot for tasks like laundry, clearing tables, and loading dishwashers, trained on 10M+ real-world household episodes. | Builds Memo, an autonomous home robot that clears tables and loads the dishwasher, trained with data from its Skill Capture Glove. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Sunday Robotics | total raised | $200M | not disclosed | no fetched source states a $200M total |
| Sunday Robotics | deployments | 1,000+ person waitlist | removed | no fetched source mentions a waitlist |
| Field AI | total raised | $405M | not disclosed | the sources give the two rounds' sum, not a total raised to date |
| Covariant | description | Developed robotic foundation models for warehouse manipulation; founders and ~25% of staff acquired by Amazon with non-exclusive license. | Built robotic foundation models for warehouse robot arms; in 2024 Amazon hired its founders and about a quarter of its staff and took a non-exclusive license to the models. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Covariant | HQ city | Berkeley | not disclosed | no fetched source states Berkeley; Amazon calls Covariant "a Bay Area-based company" |
| Covariant | founded | 2017 | not disclosed | no fetched source states 2017 (Amazon, TechCrunch, covariant.ai renders no text) |
| Covariant | status | acquired | private | Amazon hired the founders and licensed the models "without having to fully acquire" the startup (TechCrunch) (https://techcrunch.com/2024/08/31/amazon-hires-the-founders-of-robotics-ai-startup-covariant/) |
| Covariant | round type | Acqui-hire | Hiring and licensing deal | no source calls it an acqui-hire or an acquisition (https://techcrunch.com/2024/08/31/amazon-hires-the-founders-of-robotics-ai-startup-covariant/) |
| Covariant | round date | 2024-08-31 | 2024-08-30 | Friday 30 Aug 2024 in the US; Amazon's post is stamped 2024-08-31T02:35Z (https://techcrunch.com/2024/08/31/amazon-hires-the-founders-of-robotics-ai-startup-covariant/) |
| Covariant | deployments | Amazon warehouse operations (post-acquisition) | Amazon's robot fleet, under a non-exclusive model license | stated by https://techcrunch.com/2024/08/31/amazon-hires-the-founders-of-robotics-ai-startup-covariant/ |
| Covariant | lead investors | Amazon | n/a | Amazon hired staff and licensed the models; neither source says Amazon invested, so it is no lead investor |
| Genesis AI | total raised | $105M | not disclosed | the round's amount, not a stated total |
| Genesis AI | deployments |  | Targeted customer deployments planned by the end of 2026 | stated by https://www.genesis.ai/press |
| Genesis AI | lead investors | Eclipse | Eclipse Ventures | the name the source gives (https://techfundingnews.com/genesis-ai-105m-seed-funding/) |
| Rhoda AI | description | Builds robot foundation models using video-predictive control ('FutureVision') trained on hundreds of millions of internet videos for manufacturing and logistics. | Builds FutureVision, robot AI whose Direct Video Action model is pre-trained on hundreds of millions of videos, for industrial work in manufacturing and logistics. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Mind Robotics | description | Rivian spinout building AI-enabled industrial robotics platform for automating manufacturing tasks at scale, training on data from Rivian factories. | Rivian spinoff developing industrial robots to further automate factory operations; it collects video of live work on factory lines, starting with automotive manufacturing. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Mind Robotics | deployments | Rivian factory deployment target | Rivian, its first customer | robots still in development (https://www.therobotreport.com/mind-robotics-raises-400m-scale-ai-powered-robots/) |
| NVIDIA | deployments | Isaac GR00T Reference Humanoid Robot (Unitree H2 Plus + Sharpa hands) | Isaac GR00T reference humanoid, to be used by Ai2, ETH Zurich, Stanford and UC San Diego labs | a reference design available from Unitree in late 2026 (https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design) |
| NVIDIA | deployments | Partnerships with most major humanoid and robotics companies | removed | no fetched source names partnerships with most humanoid and robotics companies |
| NVIDIA | open source | Isaac GR00T (open development platform) | Isaac GR00T N1.6 and Cosmos open models (on Hugging Face) | stated by https://techcrunch.com/2026/01/05/nvidia-wants-to-be-the-android-of-generalist-robotics/ |
| NVIDIA | open source |  | Isaac Lab-Arena (simulation framework) | stated by https://techcrunch.com/2026/01/05/nvidia-wants-to-be-the-android-of-generalist-robotics/ |
| NVIDIA | open source |  | OSMO (workflow command center) | stated by https://techcrunch.com/2026/01/05/nvidia-wants-to-be-the-android-of-generalist-robotics/ |
| Google DeepMind (Robotics) | HQ city | Mountain View | London | registered office of DeepMind Technologies Limited; no fetched source places it in Mountain View (https://find-and-update.company-information.service.gov.uk/company/07386350) |
| Google DeepMind (Robotics) | HQ country | US | UK | stated by https://find-and-update.company-information.service.gov.uk/company/07386350 |
| Google DeepMind (Robotics) | deployments | Partnership with Boston Dynamics for Atlas | Partner robots from Boston Dynamics and Agile Robots | no fetched source names Atlas (https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/) |
| Google DeepMind (Robotics) | open source | Gemini Robotics On-Device (model card published) | removed | a published model card is not an open-source release |
| Google DeepMind (Robotics) | open source |  | MuJoCo (physics simulator) | the google-deepmind/mujoco repository (https://github.com/google-deepmind/mujoco) |
| Hugging Face (LeRobot) | description | Develops the LeRobot open-source robotics platform and Reachy Mini desktop companion robot for accessible embodied AI experimentation. | Develops LeRobot, an open-source library of data-collection, training and visualization tools for robot learning, and Reachy Mini, a desktop-sized open-source robot. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Applied Intuition | HQ city | Mountain View | Sunnyvale | Semafor (July 2026) also describes its Sunnyvale headquarters; no fetched source says Mountain View (https://www.appliedintuition.com) |
| Applied Intuition | deployments | AeroVironment Mayhem 10 drone swarm collaboration | removed | no fetched source mentions AeroVironment or the Mayhem 10 |
| XDOF | open source |  | ABC-130K teleoperation dataset | stated by https://theaiinsider.tech/2026/06/18/robotics-infrastructure-startup-xdof-emerges-from-stealth-with-70m/ |
| Micro1 | description | Provides expert-demonstrated teleoperation data for frontier robotics labs, capturing human demonstrations in real working environments. | Provides expert-demonstrated data to frontier robotics labs: first-person and third-person recordings of domain experts doing real-world tasks. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Micro1 | HQ city | San Francisco | Palo Alto | no fetched source says San Francisco (https://www.latimes.com/business/story/2026-02-07/how-la-garage-sales-launched-ais-latest-20-something-billionaire) |
| Figure AI | round amount | $1B | not disclosed | a floor ("exceeds $1B"), not an amount; the card caveat carries it |
| Figure AI | deployments | BMW Spartanburg plant | BMW manufacturing partnership (announced Jan 2024) | no fetched source names the Spartanburg plant (https://en.wikipedia.org/wiki/Figure_AI) |
| 1X Technologies | description | Builds NEO, a bipedal home humanoid robot for household chores, available for pre-order at $20,000; also deploying to industrial use cases. | Builds NEO, a bipedal humanoid robot for chores at home, on pre-order at $20,000 for early adopters. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| 1X Technologies | HQ city | Oslo | Palo Alto | manufacturing in Hayward and Moss, Norway; no fetched source puts the headquarters in Oslo (https://en.wikipedia.org/wiki/1X_Technologies) |
| 1X Technologies | HQ country | NO | US | stated by https://en.wikipedia.org/wiki/1X_Technologies |
| 1X Technologies | round date | 2024-01-01 | 2024-01-11 | VentureBeat reported it on 11 Jan 2024; 1X's own post is stamped 13 Jan; no source gives 1 Jan (https://en.wikipedia.org/wiki/1X_Technologies) |
| 1X Technologies | round valuation | $500M | not disclosed | no fetched source states a $500M valuation |
| 1X Technologies | aka | Halodi | Halodi Robotics | the former name as the source gives it (https://en.wikipedia.org/wiki/1X_Technologies) |
| 1X Technologies | deployments | Pre-orders open | NEO home robot pre-orders (opened Oct 2025) | stated by https://en.wikipedia.org/wiki/1X_Technologies |
| 1X Technologies | deployments | Industrial pilots | removed | no fetched source describes industrial pilots |
| Agility Robotics | description | Builds Digit, a bipedal robot for material handling in warehouses and logistics; going public via SPAC merger with Churchill Capital Corp XI. | Builds Digit, a bipedal robot working in manufacturing, distribution and logistics; going public through a merger with the SPAC Churchill Capital Corp XI. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Agility Robotics | deployments | Amazon fulfillment centers | removed | Amazon appears only as an investor in the fetched sources |
| Agility Robotics | deployments |  | Mercado Libre | stated by https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi |
| Apptronik | description | Builds Apollo humanoid robots for industrial use, powered by Google DeepMind Gemini Robotics; scaling production and robot-training facilities in Austin. | Builds Apollo humanoid robots for manufacturing, warehouses and retail, and is working with Google DeepMind on a next generation powered by Gemini Robotics. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Tesla (Optimus) | description | Develops the Optimus humanoid robot for factory and eventually consumer tasks; Gen 3 in internal testing with several hundred units deployed internally. | Develops the Optimus humanoid robot, first for simple factory tasks and later for everyday tasks in and outside the home. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Tesla (Optimus) | aka | Bot | Tesla Bot | the alias is "Tesla Bot", not "Bot" (https://en.wikipedia.org/wiki/Optimus_(robot)) |
| Tesla (Optimus) | deployments | Several hundred units in Tesla factories (internal) | removed | no fetched source counts Optimus units in Tesla factories; Electrek (April 2026) reports Musk saying in January 2026 that none were doing useful work, and the "several hundred" figure came from a fan blog summarising other reports |
| Tesla (Optimus) | deployments | Production targeted late July 2026 at Fremont | Production to start at Fremont in late July or August 2026 | stated by https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/ |
| Boston Dynamics | description | Builds the electric Atlas humanoid for industrial deployment, partnering with Google DeepMind for embodied AI; Hyundai subsidiary. | Builds the fully electric Atlas humanoid for industrial work, with first deployments at Hyundai and Google DeepMind; a Hyundai Motor Group subsidiary. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Boston Dynamics | round amount | $1.1B | not disclosed | the release gives the deal's $1.1B as the company's value and says additional financial details were not disclosed; $1.1B was never the amount paid |
| Boston Dynamics | round valuation |  | $1.1B | stated by https://bostondynamics.com/news/hyundai-motor-group-completes-acquisition-of-boston-dynamics-from-softbank/ |
| Boston Dynamics | round date | 2021-01-01 | 2021-06-21 | the closing date; 2021-01-01 was a placeholder (https://bostondynamics.com/news/hyundai-motor-group-completes-acquisition-of-boston-dynamics-from-softbank/) |
| Boston Dynamics | deployments | Hyundai Metaplant Georgia | Hyundai Motor Group Metaplant America, Savannah (first Atlas site, from 2028) | stated by https://www.techtimes.com/articles/317005/20260522/hyundai-commits-25000-atlas-robots-own-factories.htm |
| Boston Dynamics | deployments | Hyundai committed 25,000 Atlas robots to own factories | Hyundai plans more than 25,000 Atlas robots across Hyundai and Kia plants | stated by https://www.techtimes.com/articles/317005/20260522/hyundai-commits-25000-atlas-robots-own-factories.htm |
| Unitree Robotics | deployments | DeepSeek strategic investment | removed | an investor, not a deployment: CNBC names DeepSeek among the IPO's strategic investors |
| Unitree Robotics | open source |  | UnifoLM-VLA-0 model | stated by https://www.unitree.com/opensource |
| Unitree Robotics | open source |  | G1 and Z1 manipulation datasets | stated by https://www.unitree.com/opensource |
| Unitree Robotics | open source |  | unitree_IL_lerobot | stated by https://www.unitree.com/opensource |
| UBTECH Robotics | description | Builds Walker S2 industrial humanoid robots; began mass production and delivery of several hundred units, reaching 1,000 Walker S2 milestone. | Builds Walker S2 industrial humanoid robots; began mass production and delivery in November 2025 and rolled its 1,000th Walker S2 off the line in December 2025. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| UBTECH Robotics | round type | IPO | Share placement | its sixth placement since the December 2023 listing, so the IPO is no longer its latest round; the company's announcements list no later placing (https://finance.yahoo.com/news/chinas-ubtech-robotics-eyes-us-093000717.html) |
| UBTECH Robotics | round amount | $130M | $399.6M | the US dollar figure SCMP gives; the company's announcements record the placing's completion on 2 December 2025 (https://finance.yahoo.com/news/chinas-ubtech-robotics-eyes-us-093000717.html) |
| UBTECH Robotics | round date | 2023-12-01 | 2025-11-25 | the exchange announcement of the placing (https://www.ubtrobot.com/en/announce) |
| UBTECH Robotics | round valuation | $5B | n/a | a placement by a listed company is priced per share and sets no valuation; the old $5B was a 2018 private valuation (Wikipedia), and the listing-day market value belongs to the 2023 IPO |
| UBTECH Robotics | total raised | $940M | not disclosed | no fetched source states a total raised; $940M appears in none of them |
| UBTECH Robotics | deployments | China-Vietnam border customs ($37M contract) | Border crossings in Guangxi, near Vietnam ($37M contract) | the source names border crossings in Guangxi (Fangchenggang, on the Vietnam border), not customs (https://interestingengineering.com/innovation/ubtech-secures-us37-million-deal) |
| UBTECH Robotics | deployments | 1,000 Walker S2 robots produced | removed | a production count, not a deployment; the description carries the 1,000th Walker S2 |
| Fourier | description | Builds GR-series humanoid robots (GR-1, GR-2, GR-3) originating from rehabilitation exoskeletons; GR-3 designed as care-centric companion with DeepSeek AI partnership. | Began in rehabilitation robotics, including exoskeletons, and now builds the GR series of humanoid robots; it showed its GR-3 care robot at CES 2026. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Fourier | round type | Series D | Series E | the latest round; the $62M Series D led by SoftBank Vision Fund 2 was announced in February 2022 (The Robot Report) (https://www.sixthtone.com/news/1016947) |
| Fourier | round amount | $62M | not disclosed | a bound ("nearly") in yuan, not an amount; the card caveat carries it, and $62M was the 2022 Series D |
| Fourier | round date | 2024-09-30 | 2025-01-07 | Sixth Tone (11 Apr 2025) says the round closed "In January"; 2024-09-30 matches no round (https://humanoidroboticstechnology.com/articles/humanoid-funding-rounds-in-2025/) |
| Fourier | deployments | GR-3 debuted at CES 2026 | not disclosed | a trade-show debut, not a deployment; no fetched source names a customer or site for its robots |
| Fourier | lead investors | SoftBank Vision Fund 2 | not disclosed | SoftBank Vision Fund 2 led the 2022 Series D; no fetched source says who led the Series E (the roundup names participants, not a lead) |
| Galbot | description | Builds G1 humanoid robots with embodied multimodal large models for commercial and industrial applications; deployed at CATL battery factory. | Develops embodied AI models and the G1 and S1 humanoid robots; the S1 works on CATL's battery lines and the G1 runs its Galbot Store shops in over 30 Chinese cities. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Galbot | round amount | $300M | not disclosed | a floor ("surpassed", "exceeding"), not an amount; the card caveat carries it |
| Galbot | deployments | Industrial manufacturing partnerships | Manufacturing partners Bosch, Toyota and Hyundai | the company's own release names the partners; CATL is its own row (https://finance.yahoo.com/news/galbot-secures-over-300-million-190800748.html) |
| Galbot | deployments |  | Galbot Store autonomous retail shops in over 30 cities | stated by https://www.therobotreport.com/galbot-brings-in-300m-to-scale-mobile-manipulator-deployments/ |
| AgiBot | description | Builds A2-series humanoid robots; acquired control of listed Swancor Advanced Materials (2.1B yuan for at least 63.62%, which AgiBot says is not a backdoor listing); No.1 in 2025 humanoid shipments; preparing a Hong Kong IPO. | Builds the Yuanzheng (A2) and Lingxi humanoid robot series; agreed in July 2025 to take control of listed Swancor Advanced Materials, and Omdia ranked it No.1 worldwide in 2025 humanoid shipments. | rewritten to what its sources state; each clause quoted from 5 sources in the ledger |
| AgiBot | aka | Zhiyuan Robot | Zhiyuan Robotics | Futurism also calls it Zhiyuan Robotics; "Zhiyuan Robot" appears in no source (https://en.wikipedia.org/wiki/AgiBot) |
| AgiBot | deployments | A2 66-mile Guinness world-record walk from Suzhou to Shanghai (Nov 2025) | removed | a record walk (Guinness, November 2025), not a customer, site or fleet |
| AgiBot | deployments | Acquired at least 63.62% controlling stake in Swancor Advanced Materials for 2.1B yuan (~$290M); AgiBot says it is not a backdoor listing | removed | a corporate takeover, not a deployment; the description carries it |
| AgiBot | deployments | Omdia ranks AgiBot No.1 worldwide in 2025 humanoid shipments (5,100+ units, 39% share) | removed | a shipment ranking, not a deployment; the description carries it |
| AgiBot | deployments |  | Fulin Precision Engineering: nearly 100 Yuanzheng robots for its factories | announced in August 2025 (https://finance.yahoo.com/news/exclusive-chinese-robot-maker-agibot-092020928.html) |
| AgiBot | deployments |  | ASD: 100 X2 humanoid robots across 100 retail stores | the company's news item of 29 September 2026 (https://www.agibot.com) |
| AgiBot | open source |  | AgiBot World dataset | the site's Open Source menu (https://www.agibot.com) |
| AgiBot | open source |  | AgiBot X1 (hardware design, training and inference code) | the same page lists agibot_x1_train and agibot_x1_infer; the company's site calls the X1 a full-stack open-source robot (https://github.com/AgibotTech) |
| AgiBot | open source |  | AimRT framework | the site's Open Source menu (https://www.agibot.com) |
| Sanctuary AI | description | Originally built Phoenix humanoid robots with hydraulic hands; pivoted in 2026 to selling AI software for other robots rather than building hardware. | Built the Phoenix general-purpose humanoid robots; since June 2026 it deploys its Physical AI software on existing industrial robots while it develops hydraulic robotic hands. | rewritten to what its sources state; each clause quoted from 4 sources in the ledger |
| Sanctuary AI | round date | 2024-01-01 | 2026-05-26 | Zeon's release, which Sanctuary reposted; 2024-01-01 matched no round (the BDC Capital and InBC strategic financing was announced on 3 July 2024) (https://www.zeon.co.jp/en/news/assets/pdf/260526.pdf) |
| Sanctuary AI | aka |  | Sanctuary Cognitive Systems Corporation | its legal name; its 2022 Series A release uses it (https://www.zeon.co.jp/en/news/assets/pdf/260526.pdf) |
| Sanctuary AI | deployments | Pivoted Jun 2026 to Physical AI software for third-party industrial robots | Global Tier 1 automotive supplier: a paid deployment, its first commercial purchase order (2026) | the old row described the strategy change, which the description carries (https://www.sanctuary.ai/milestones) |
| NEURA Robotics | description | Builds 4NE-1 humanoid and cognitive robots combining sensing, hearing, and learning; full-stack robotics company with edge AI capabilities. | Builds the 4NE1 humanoid and the MAiRA and LARA robot arms; its Neuraverse platform lets its robots share learned skills. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| NEURA Robotics | round valuation |  | $7B | a report from a person familiar with the matter, not a company figure (https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html) |
| NEURA Robotics | aka |  | Han's Robot Germany GmbH | its name until it rebranded as Neura Robotics in November 2020 (https://en.wikipedia.org/wiki/Neura_Robotics) |
| NEURA Robotics | deployments |  | Schaeffler: plans to put a mid-four-digit number of NEURA humanoids in its plants by 2035 | stated by https://en.wikipedia.org/wiki/Neura_Robotics |
| NEURA Robotics | deployments |  | Kawasaki Robotics CL Series cobots, built on NEURA's robot platform (2023) | stated by https://en.wikipedia.org/wiki/Neura_Robotics |
| Humanoid | description | Builds industrial humanoid robots for real-world tasks; UK's first humanoid robot for industrial use unveiled September 2025. | Builds the HMND 01 Alpha, a wheeled bimanual industrial humanoid run by its own KinetIQ AI; Schaeffler signed to deploy thousands of its robots in manufacturing. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Humanoid | aka |  | SKL Robotics Ltd | its registered name; the site's copyright line reads SKL Robotics LTD. (https://www.therobotreport.com/uk-based-humanoid-secures-152m-in-series-a-funding/) |
| Humanoid | deployments |  | Schaeffler: an agreement to deploy thousands of humanoid robots in its plants | stated by https://thehumanoid.ai/humanoid-raises-152-million-at-1-35-billion-post-money-valuation |
| Humanoid | deployments |  | Siemens: humanoids in industrial operations, with NVIDIA | a case study on the company's site (https://thehumanoid.ai) |
| Humanoid | deployments |  | SAP and Martur Fompak: an automotive manufacturing logistics proof of concept | a case study on the company's site (https://thehumanoid.ai) |
| Spirit AI | aka |  | 千寻智能 | the company's Chinese name, on its own site (https://www.spirit-ai.com) |
| Spirit AI | deployments |  | CATL: Moz robots on its battery production lines | stated by https://www.prnewswire.com/news-releases/spirit-ai-lands-280m-to-scale-embodied-ai-through-dirty-data-302697085.html |
| Spirit AI | deployments |  | JD MALL stores: its Moz robot | stated by https://news.pedaily.cn/202606/564786.shtml |
| Spirit AI | open source |  | Spirit v1.5 VLA model (weights and evaluation code) | stated by https://www.prnewswire.com/news-releases/robochallenges-top-ranked-embodied-ai-model-goes-open-source-challenging-clean-data-collection-paradigm-302658247.html |
| Galaxea AI | description | Builds humanoid robots for industrial and commercial deployment. | Develops Vision-Language-Action models, including G0 and G0 Plus, and the R1 series of robots for manufacturing, logistics and commercial services. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Galaxea AI | aka | Xinghaitu | 星海图 | the company's Chinese name on its own site; the romanised "Xinghaitu" appears in no fetched source (https://www.galaxea-ai.com) |
| Galaxea AI | open source |  | GalaxeaVLA (open-source VLA models) | stated by https://github.com/OpenGalaxea |
| Galaxea AI | open source |  | GalaxeaDP diffusion policy | stated by https://github.com/OpenGalaxea |
| EngineAI | description | Builds humanoid and quadruped robots for traffic, security, and retail deployment; a Series B+ followed in May 2026 with terms undisclosed. | Builds humanoid and quadruped robots for traffic management, security patrols, retail service and industrial work; it has filed confidentially for a Hong Kong IPO. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| EngineAI | founded | 2024 | 2023 | Crypto Briefing also gives 2023; 2024 appears in no source (https://en.wikipedia.org/wiki/EngineAI) |
| EngineAI | aka |  | Shenzhen EngineAI Robotics Technology Co., Ltd. | its registered name (https://en.wikipedia.org/wiki/EngineAI) |
| EngineAI | deployments | Traffic, security, and retail deployments planned | not disclosed | the uses its robots are designed for, not a named customer, site or fleet; the description carries them |
| EngineAI | open source |  | PM01 humanoid (open-source) | stated by https://en.wikipedia.org/wiki/EngineAI |
| RobotEra | aka | Robot Era | removed | "Robot Era" appears only in a Crunchbase News roundup; the company writes RobotEra or ROBOTERA |
| RobotEra | aka |  | 星动纪元 | the company's Chinese name on its own site (https://www.robotera.com) |
| RobotEra | deployments |  | China Post and SF Group: robots in more than ten logistics centres | stated by https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/ |
| RobotEra | deployments |  | Boston Dynamics, NVIDIA and Apple: use its robot hardware (company statement) | stated by https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/ |
| TARS Robotics | lead investors | Hillhouse Capital | Hillhouse Ventures | stated by https://pandaily.com/tars-raises-455-m-pre-a-round-setting-record-in-china-s-embodied-ai-sector |
| TARS Robotics | lead investors |  | Meituan Strategic Investment | stated by https://pandaily.com/tars-raises-455-m-pre-a-round-setting-record-in-china-s-embodied-ai-sector |
| X Square Robot | description | Builds general-purpose embodied intelligence robots for household and industrial applications, targeting home trials. | Develops the WALL embodied AI foundation models and QUANTA robots for household, industrial and logistics work; it runs a home-cleaning service with 58.com in Shenzhen and Beijing. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| X Square Robot | round type | Series B | Series C | the Series B of April 2026 (Xiaomi and HongShan) is no longer the latest round (https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/) |
| X Square Robot | round date | 2026-04-21 | 2026-06-30 | the article reports the company's announcement "today" (https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/) |
| X Square Robot | aka |  | 自变量机器人 | stated by https://en.wikipedia.org/wiki/X_Square_Robot |
| X Square Robot | deployments | Home trials targeted by May 2026 | 58.com: AI-powered home-cleaning service in Shenzhen and Beijing | in place of a plan dated May 2026 (https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/) |
| X Square Robot | deployments |  | X Family Member Program: robots live with users' families for up to one month | stated by https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/ |
| X Square Robot | open source |  | WALL-OSS | stated by https://en.wikipedia.org/wiki/X_Square_Robot |
| X Square Robot | open source |  | WALL-OSS-0.5 and WALL-WM | stated by https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/ |
| X Square Robot | open source |  | XRZero-G0 and the G0-Dataset | stated by https://en.wikipedia.org/wiki/X_Square_Robot |
| X Square Robot | lead investors | Xiaomi | not disclosed | Xiaomi's arm co-led the April 2026 Series B; The Robot Report and Wikipedia name IDG as a participant in the Series C and no lead |
| X Square Robot | lead investors | HSG | not disclosed | HongShan co-led the Series B; no fetched source names a lead for the Series C |
| Deep Robotics | description | Builds Jueying series quadruped robots and DR02 humanoid for power utility, tunnel, hazard rescue, and industrial applications; IP66-rated humanoid. | Builds Jueying and Lynx quadruped robots, used in power utility, tunnel and hazard-rescue work, and the DR01 and DR02 humanoid robots. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Deep Robotics | round date | 2025-12-10 | 2025-12-09 | the article is dated Wednesday 10 December 2025, so the company's statement came on Tuesday 9 December (https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html) |
| Deep Robotics | aka |  | 云深处科技 | stated by https://en.wikipedia.org/wiki/Deep_Robotics |
| Deep Robotics | deployments | Power utility | Power utility: fully autonomous substation inspection in China | the company says it was the first in China to inspect substations fully autonomously with quadrupeds (https://www.deeprobotics.cn) |
| Deep Robotics | deployments | Tunnel inspection | Singapore Power Group: X30 inspecting its power tunnels | a named tunnel deployment in place of the generic label (https://en.wikipedia.org/wiki/Deep_Robotics) |
| Deep Robotics | lead investors | China Merchants Bank International | CMB International | the source's name for the lead (https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html) |
| Deep Robotics | lead investors |  | China Asset Management | stated by https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html |
| Deep Robotics | lead investors |  | China Telecom and China Unicom funds | stated by https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html |
| Kepler Robot | description | Builds humanoid robots for industrial and commercial use. | Builds full-size industrial humanoid robots, including the K2, for smart manufacturing and warehouse logistics; Kelin Electric agreed in May 2026 to take a 51% controlling stake. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Kepler Robot | HQ city |  | Shanghai | stated by https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml |
| Kepler Robot | round date | 2026-05-20 | 2026-05-19 | Kelin announced the deal on the evening of 19 May; Yicai's 20 May report says "announced late yesterday" (https://www.lanjinger.com/d/1779274842637520212) |
| Kepler Robot | round valuation | $106.3M | not disclosed | BigGo's own conversion; Blue Whale News works out a valuation of about 722 million yuan and no fetched source gives a US dollar figure, so the caveat carries it |
| Kepler Robot | aka |  | Kepler Robotics | stated by https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml |
| Kepler Robot | aka |  | 上海开普勒机器人有限公司 | stated by https://www.lanjinger.com/d/1779274842637520212 |
| Kepler Robot | deployments | Hangzhou Kelin agreed in May 2026 to acquire a 51% controlling stake (41.57% for up to CNY 300M) | not disclosed | an ownership deal, not a deployment; the round and the description carry it |
| Kepler Robot | lead investors | Hangzhou Kelin | Kelin Electric | the name Yicai uses for Hangzhou Kelin Electric (688611.SH) (https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml) |
| LimX Dynamics | description | Develops humanoid robots and motion control systems. | Builds the Oli and Luna humanoid robots and the modular TRON robots, and open-sources robot-learning software such as its FluxVLA Engine. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| LimX Dynamics | round amount |  | $200M | CNBC and TNW say $200 million; 36Kr says nearly $200 million (https://www.limxdynamics.com/en/about) |
| LimX Dynamics | round valuation |  | $2.21B | stated by https://www.cnbc.com/2026/07/13/chinese-humanoid-startups-ipo-limx-unitree.html |
| LimX Dynamics | aka |  | 逐际动力 | stated by https://www.limxdynamics.com |
| LimX Dynamics | deployments |  | Luna humanoids delivered to customers in South Korea | stated by https://www.cnbc.com/2026/07/13/chinese-humanoid-startups-ipo-limx-unitree.html |
| LimX Dynamics | open source |  | FluxVLA Engine | stated by https://www.limxdynamics.com/en/about |
| LimX Dynamics | open source |  | Isaac Lab locomotion-training code for TRON 1, TRON 2 and Oli | stated by https://github.com/limxdynamics |
| LimX Dynamics | open source |  | MuJoCo simulators and the LimX SDK (limxsdk-lowlevel) | stated by https://github.com/limxdynamics |
| LimX Dynamics | lead investors |  | IDG Capital | TNW names three leads; 36Kr lists IDG Capital and Lens Technology first among the investors without naming a lead (https://thenextweb.com/news/limx-dynamics-2-2-billion-humanoid-pre-ipo) |
| LimX Dynamics | lead investors |  | Lens Technology | stated by https://thenextweb.com/news/limx-dynamics-2-2-billion-humanoid-pre-ipo |
| LimX Dynamics | lead investors |  | Stone Venture | TNW says Stone Venture co-led; CNBC calls it a participant and 36Kr says it followed on (https://thenextweb.com/news/limx-dynamics-2-2-billion-humanoid-pre-ipo) |
| Wandercraft | description | Builds self-balancing exoskeletons (Eve) for rehabilitation and personal mobility, with Renault partnership for industrial humanoid applications. | Builds self-balancing exoskeletons, Atalante X for rehabilitation and Eve for home use, and the Calvin-40 humanoid, which works on Renault's Douai line; it acquired Ekso Bionics in October 2026. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Wandercraft | deployments | Renault Group partnership | Renault Group: Calvin-40 on the line at its Douai plant, 350 robots committed by 2027 | the named site and fleet in place of a generic partnership label (https://www.wandercraft.eu/about-us) |
| Wandercraft | deployments | Clinical rehabilitation deployments | Atalante X at more than 150 clinical and research sites | the company's current count; the June 2025 release said more than 100 rehabilitation centers (https://www.wandercraft.eu/about-us) |
| Clone Robotics | description | Develops biomimetic humanoid robots with musculoskeletal design and artificial muscles. | Develops biomimetic, musculoskeletal androids moved by its Myofiber artificial muscles; it takes reservations for the first 279 Clone Alpha units. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Clone Robotics | round type | Seed | not disclosed | only an aggregator profile called a seed round; The Rundown mentions a "reported $50M raise" with no date, type or source |
| Clone Robotics | round caveat |  | The Rundown (9 April 2026) mentions a reported $50M raise but gives no date, round type or source for it; no cited source states a round or a total raised, so the card gives neither. | added 2026-10-22 (map-playground user testing round 1, VAL-B2-MAP-009): the raise was dropped with the round type and shown nowhere on the card; the live page, fetched again on 2026-10-22 (HTTP 200), still carries the passage. The page gives no date, round type, amount source or total, so total raised and every round field stay not disclosed (https://robotnews.therundown.ai/p/clone-20k-synthetic-human) |
| Mentee Robotics | round amount | $900M | not disclosed | the $900 million is the purchase price for the whole company, so it is the deal value, not money raised; it moves to the valuation |
| Mentee Robotics | round valuation |  | $900M | the purchase price for 100% of the shares, in cash and Mobileye Class A stock (https://www.sec.gov/Archives/edgar/data/1910139/000110465926010947/tm265388d1_8k.htm) |
| Mentee Robotics | aka |  | Mentee by Mobileye | stated by https://www.menteebot.com |
| Mentee Robotics | deployments | Operates as an independent unit within Mobileye; first on-site proof-of-concept deployments targeted 2026, series production 2028 | Customer proof-of-concept deployments expected in 2026; series production targeted for 2028 | the plans only; running as a unit inside Mobileye is ownership, not a deployment (https://ir.mobileye.com/news-releases/news-release-details/mobileye-acquire-mentee-robotics-accelerate-physical-ai) |
| Persona AI | description | Builds purpose-built humanoid robots for shipyards and heavy-duty industrial sites, founded by NASA/Nauticus veterans. | Builds industrial humanoid robots that weld, fit and fabricate in shipyards, steel shops and energy sites; its founders came from NASA, Nauticus Robotics and Figure AI. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Persona AI | round type | Pre-seed | not disclosed | the Daiwa House Group Growth Fund's investment of 2 October 2026 is the latest round and its release names no round type; the $27M pre-seed was May 2025 and POSCO invested $3M in December 2025 |
| Persona AI | round amount | $27M | not disclosed | $27M was the May 2025 pre-seed; the October 2026 investment's amount is not disclosed |
| Persona AI | round date | 2025-05-14 | 2026-10-02 | the release date of the Daiwa House Group Growth Fund's investment (https://prtimes.jp/main/html/rd/p/000000087.000097774.html) |
| Persona AI | deployments |  | POSCO Group: joint development and planned pilot deployments at its sites | stated by https://theaiinsider.tech/2025/12/29/posco-group-invests-3m-in-persona-ai-for-industrial-humanoid-robot-development/ |
| Persona AI | lead investors | Unity Growth | not disclosed | Unity Growth co-led the May 2025 pre-seed; the October 2026 release names the Daiwa House Group Growth Fund as an investor, not a lead |
| Persona AI | lead investors | Tides Ventures | not disclosed | Tides Ventures co-led the May 2025 pre-seed, not the latest round |
| Rainbow Robotics | description | Builds collaborative robots and humanoid robots; became Samsung subsidiary after Samsung exercised call option to 35% stake. | Builds collaborative, mobile and humanoid robots and grew out of KAIST's HUBO lab; Samsung Electronics raised its stake to 35% in March 2025 and made it a subsidiary. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Rainbow Robotics | HQ city | Seoul | Daejeon | Daejeon, not Seoul (https://en.wikipedia.org/wiki/Rainbow_Robotics) |
| Rainbow Robotics | round type | Acquisition | Acquisition (controlling stake) | Samsung bought control, not all of the company (https://news.samsung.com/global/samsung-electronics-to-become-largest-shareholder-in-rainbow-robotics) |
| Rainbow Robotics | aka |  | 레인보우로보틱스 | stated by https://en.wikipedia.org/wiki/Rainbow_Robotics |
| Rainbow Robotics | deployments | Samsung factory automation | Samsung Electronics: collaborative, dual-arm and autonomous mobile robots in its production and logistics operations | what the robots do at Samsung in place of a generic label (https://www.techtimes.com/articles/317465/20260531/samsung-lg-robotics-investment-drives-117-revenue-surge.htm) |
| Rainbow Robotics | deployments | 117% revenue surge in Q1 2026 | removed | a revenue figure, not a deployment |
| Rainbow Robotics | deployments | Samsung Electronics subsidiary (35% target stake via call option); still KOSDAQ-listed (277810) | removed | ownership and listing, carried by the round, the status and the description; not a deployment |
| Symbotic | description | Builds AI-driven warehouse automation systems using autonomous mobile robots for case handling and palletization; $22.5B backlog primarily from Walmart. | Builds AI-driven warehouse automation systems in which autonomous robots store and retrieve cases; it bought the autonomous-forklift maker Fox Robotics in 2026. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Symbotic | round type |  | Public offering | the latest raise found; the 2021 SPAC merger with SVF Investment Corp. 3 came before it (https://www.globenewswire.com/news-release/2025/12/05/3200430/0/en/Symbotic-Announces-Pricing-of-Primary-and-Secondary-Offering-of-Class-A-Common-Stock.html) |
| Symbotic | round date |  | 2025-12-04 | stated by https://www.globenewswire.com/news-release/2025/12/05/3200430/0/en/Symbotic-Announces-Pricing-of-Primary-and-Secondary-Offering-of-Class-A-Common-Stock.html |
| Symbotic | aka |  | CasePick Systems | stated by https://en.wikipedia.org/wiki/Symbotic |
| Symbotic | deployments | Acquired Fox Robotics (autonomous forklifts, Feb 2026) | removed | an acquisition, not a deployment; the description carries it |
| Dexterity | HQ city | Dover | Redwood City | the company's own site also gives Redwood City, California; Dover is only a Delaware registration (https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/) |
| Dexterity | founded | 2019 | 2017 | stated by https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/ |
| Dexterity | total raised | $296M | $291M | GlobalData says nearly $300 million; no fetched source states $296 million (https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/) |
| Dexterity | aka |  | Dexterity AI | stated by https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/ |
| Dexterity | deployments | Commercial partners testing trailer unloading | FedEx, Sagawa Express and GXO Logistics: testing DexR | the named partners in place of a generic label (https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/) |
| Dexterity | deployments |  | Sumitomo: 1,500 robots for Japanese warehouses by 2026 (2022 contract) | stated by https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/ |
| Dexterity | deployments |  | UPS (customer) | stated by https://finance.yahoo.com/news/dexterity-secures-95m-reaching-1-110002439.html |
| Dexterity | lead investors |  | Lightspeed Venture Partners | The Robot Report, citing Bloomberg; TechCrunch and GlobalData describe both only as backers (https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/) |
| Dexterity | lead investors |  | Sumitomo Corp. | stated by https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/ |
| Berkshire Grey | description | Built AI and robotics for supply chain and logistics operations; acquired by SoftBank and taken private. | Builds robotic picking, sorting and trailer-unloading systems for warehouses, including the Scoop unloader; SoftBank agreed in 2023 to take it private and now owns it. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Berkshire Grey | round amount | $375M | not disclosed | the $375 million is the deal value of an acquisition, not money raised; it moves to the valuation |
| Berkshire Grey | round valuation |  | $375M | the deal value at $1.40 a share for the shares SoftBank did not already own (https://www.berkshiregrey.com/resources/press-release/berkshire-grey-enters-into-definitive-merger-agreement-with-softbank) |
| Berkshire Grey | deployments | FedEx partnership (2026) | FedEx: Scoop bulk unloaders, rolling out to its warehouses in a pilot program | the named product and rollout in place of a generic label (https://techcrunch.com/2026/03/31/fedex-chooses-partnerships-over-proprietary-tech-for-its-automation-strategy/) |
| Berkshire Grey | deployments | Supply chain operations | Walmart and Target (customers) | named customers in place of a generic label (https://en.wikipedia.org/wiki/Berkshire_Grey) |
| Amazon Robotics | description | Operates 1M+ robot fleet in fulfillment centers; launched Blue Jay multi-arm picking system and Project Eluna agentic AI for operations. | Amazon's robotics business, formerly Kiva Systems: it designs and builds the robots in Amazon's fulfillment network, which passed one million robots in July 2025, and pilots the Project Eluna agentic AI for operations. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Amazon Robotics | HQ city | Seattle | North Reading | Business Insider (May 2025) describes the North Reading, Massachusetts plant, Kiva's old home, with corporate offices and labs; no fetched source puts it in Seattle (https://en.wikipedia.org/wiki/Amazon_Robotics) |
| Amazon Robotics | founded | 2012 | 2003 | 2012 is the year Amazon bought it (https://en.wikipedia.org/wiki/Amazon_Robotics) |
| Amazon Robotics | website | https://www.amazon.com | https://amazon.jobs/amazon-robotics | the unit's own page; amazon.com is the retail store (https://en.wikipedia.org/wiki/Amazon_Robotics) |
| Amazon Robotics | aka |  | Kiva Systems | stated by https://en.wikipedia.org/wiki/Amazon_Robotics |
| Amazon Robotics | deployments | 1M+ robots in fulfillment centers | More than 1 million robots deployed across Amazon's operations since 2012 | a cumulative count, not a simultaneous fleet (https://awsinsider.net/articles/2025/11/05/the-rise-of-amazon-ai-robots.aspx) |
| Amazon Robotics | deployments | Blue Jay ceiling-mounted picking system | removed | Amazon's own page says it stopped using Blue Jay in operations (update of 25 February 2026) |
| Amazon Robotics | deployments | Project Eluna agentic AI | Project Eluna agentic AI: pilot at a Tennessee fulfillment center | stated by https://www.aboutamazon.com/news/operations/new-robots-amazon-fulfillment-agentic-ai |
| Nimble | description | Builds fully autonomous AI robotics fulfillment systems operating as a robotic 3PL; 2025 revenue tripled year-over-year. | Builds AI robots that run fully autonomous fulfillment centers, sold as a robotic third-party logistics (3PL) service; FedEx led its 2024 Series C and uses it to scale FedEx Fulfillment. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Nimble | deployments | FedEx Fulfillment service across North America | FedEx Fulfillment: Nimble's autonomous 3PL model, scaling across North America | stated by https://newsroom.fedex.com/newsroom/global-english/fedex-announces-expansion-of-fedex-fulfillment-with-nimble-alliance |
| Nimble | lead investors |  | Cedar Pine | The Robot Report also says FedEx co-led with Cedar Pine (https://nimble.ai/news/nimble-closes-106-million-series-c-funding-round-at-1b-valuation-scales-fully-autonomous-fulfillment-with-fedex) |
| Locus Robotics | description | Builds autonomous mobile robots (AMRs) for warehouse fulfillment and distribution; launched Locus Array autonomous fulfillment system. | Builds autonomous mobile robots for warehouse fulfillment and, since April 2026, the Locus Array robots-to-goods system; it bought the gripper maker Nexera Robotics in May 2026. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Locus Robotics | round type | Series F | Series G | the Series F of November 2022 came before it (https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding) |
| Locus Robotics | round amount | $117M | $41.6M | the Form D reports $41,599,804 sold (https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding) |
| Locus Robotics | round date | 2022-12-01 | 2026-09-01 | the CEO told Axios; Supply Chain 24/7 reported it the same day, and the Form D gives the first sale as 10 August 2026 (https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding) |
| Locus Robotics | total raised | $523M | not disclosed | no fetched source states a current total; Supply Chain 24/7 says the 2022 Series F took total funding to more than $400 million, a floor |
| Locus Robotics | deployments | Acquired Nexera Robotics (May 2026) for grasping technology | removed | an acquisition, not a deployment; the description carries it |
| Locus Robotics | deployments |  | More than 22,000 robots deployed at more than 360 sites worldwide | stated by https://locusrobotics.com/company/about-us/ |
| Locus Robotics | deployments |  | DHL Supply Chain: committed to deploying 5,000 Locus robots in its warehouses worldwide | stated by https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding |
| Locus Robotics | deployments |  | GEODIS, CEVA Logistics, FedEx and Cardinal Health (customers) | stated by https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding |
| Mujin | description | Builds robot software for factory and logistics automation; plans IPO by 2030, raising Series D extension above $1B valuation. | Builds MujinOS, software that runs industrial robots loading, unloading and moving goods in factories and warehouses; it plans to go public by 2030. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Mujin | total raised | $233M | $411M | the $233 million is this round alone (https://finance.yahoo.com/news/mujin-raises-us-233-million-140000051.html) |
| Mujin | deployments | Warehouse and factory automation in Japan | Toyota Motor Corp. and Fast Retailing (Uniqlo): robots run on Mujin's operating systems | named users in place of a generic label (https://www.ttnews.com/articles/mujin-robot-software-warehouse) |
| Mujin | deployments |  | Accenture: joint venture for AI and robotics in manufacturing and logistics (January 2024) | stated by https://mujin-corp.com/resources/news |
| Mujin | lead investors |  | NTT Group | stated by https://finance.yahoo.com/news/mujin-raises-us-233-million-140000051.html |
| Mujin | lead investors |  | Qatar Investment Authority | stated by https://finance.yahoo.com/news/mujin-raises-us-233-million-140000051.html |
| RightHand Robotics | description | Builds RightPick AI-powered piece-picking solution for warehouse order fulfillment using combined suction and gripper technology. | Builds RightPick, an AI-driven robotic piece-picking system for warehouse order fulfillment; Rockwell Automation made a strategic investment in it in March 2025. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| RightHand Robotics | HQ city | Somerville | Boston | The Robot Report (March 2025) visited its new office in Charlestown, Mass.; the Somerville office on its about page is the old one (https://righthandrobotics.com/contact-us) |
| RightHand Robotics | founded | 2014 | 2015 | The Robot Report (2025) says a co-founder started it "10 years ago" (https://righthandrobotics.com/about-us) |
| RightHand Robotics | deployments | Rockwell Automation partnership (Mar 2025) | Apotea, PALTAC and Staples (RightPick 4 customers) | customers in place of the investor, which is not a deployment (https://www.therobotreport.com/righthand-robotics-receives-investment-from-rockwell-automation/) |
| RightHand Robotics | deployments |  | Fleets picking millions of items a month across North America and Eastern Europe | stated by https://www.therobotreport.com/righthand-robotics-receives-investment-from-rockwell-automation/ |
| Ambi Robotics | description | Builds AI-powered robotic parcel sorting and picking systems for logistics operations. | Builds AI-powered AmbiSort parcel-sorting and AmbiStack package-stacking robots, run on its AmbiOS software; Pitney Bowes is a customer and an investor. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Ambi Robotics | founded | 2017 | 2019 | the company's own timeline puts the founding in 2019; The Robot Report says 2018 (https://www.ambirobotics.com/about/) |
| Ambi Robotics | round type | Series B | not disclosed | both sources call it "$32 million in additional funding"; neither names a series |
| Ambi Robotics | aka |  | Ambidextrous Laboratories | its name at founding (https://www.ambirobotics.com/about/) |
| Ambi Robotics | deployments |  | Pitney Bowes: more than 80 AmbiSort A-Series systems across the U.S. ($23 million deal, 2022) | stated by https://www.therobotreport.com/ambi-robotics-32m-sorting-robots/ |
| Ambi Robotics | deployments |  | OSM Worldwide (partnership, 2023) | stated by https://www.ambirobotics.com/about/ |
| Ambi Robotics | deployments |  | More than 100 million packages sorted in commercial operations (2024) | stated by https://www.ambirobotics.com/about/ |
| Ambi Robotics | lead investors |  | Tiger Global | stated by https://www.ambirobotics.com/media/ambi-robotics-secures-32m-infusion-to-deploy-its-item-sorting-robots/ |
| Ambi Robotics | lead investors |  | Bow Capital | stated by https://www.ambirobotics.com/media/ambi-robotics-secures-32m-infusion-to-deploy-its-item-sorting-robots/ |
| Plus One Robotics | description | Builds AI-powered piece-picking systems with human-in-the-loop verification for warehouse automation. | Builds vision-guided robots that pick, induct, depalletize and palletize parcels, with its Yonder platform letting remote people resolve edge cases. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Plus One Robotics | total raised |  | $94M | as of March 2023; no later round was found (https://techcrunch.com/2023/03/07/plusone-raises-50m-for-its-parcel-robotics-vision-systems/) |
| Plus One Robotics | deployments |  | FedEx and DHL (clients) | stated by https://techcrunch.com/2023/03/07/plusone-raises-50m-for-its-parcel-robotics-vision-systems/ |
| Plus One Robotics | deployments |  | Pitney Bowes (customer, 2023) | stated by https://techcrunch.com/2023/03/07/plusone-raises-50m-for-its-parcel-robotics-vision-systems/ |
| Plus One Robotics | deployments |  | Over 1.5 billion picks across 15 countries | stated by https://www.plusonerobotics.com |
| Carbon Robotics | description | Builds AI-powered LaserWeeder for chemical-free weed control using computer vision and lasers, plus Carbon Autonomy autonomous farming platform. | Builds the LaserWeeder, which finds weeds with computer vision and kills them with lasers instead of herbicides, and Carbon Autonomy kits that let existing tractors drive themselves. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Carbon Robotics | round type | Series D | Series D-2 extension | the 2024 $70 million round was the Series D itself (https://www.geekwire.com/2025/carbon-robotics-raises-20m-as-laserweeder-maker-plans-secretive-new-ai-robot-for-farms/) |
| Carbon Robotics | deployments | LaserWeeder deployed across North American farms | LaserWeeder and Carbon Autonomy: more than 200 growers in 15 countries | the company's current count; GeekWire (October 2025) said hundreds of customers across the U.S. and 14 countries (https://carbonrobotics.com) |
| Carbon Robotics | lead investors | NVIDIA NVentures | Giant Ventures | NVentures invested in May 2024 and joined the 2024 Series D led by BOND; GeekWire names Giant Ventures as this round's lead (https://www.geekwire.com/2025/carbon-robotics-raises-20m-as-laserweeder-maker-plans-secretive-new-ai-robot-for-farms/) |
| Monarch Tractor | description | Built fully electric, driver-optional autonomous tractors; had mass layoffs and was acquired by Caterpillar after burning through ~$250M. | Built the MK-V, a fully electric, driver-optional tractor for farms; after layoffs and dealer lawsuits, Caterpillar acquired its assets in April 2026. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Monarch Tractor | founded | 2016 | 2018 | Bloomberg (via Transport Topics) also says 2018 (https://techcrunch.com/2026/04/15/monarch-tractors-collapse-ends-in-with-an-acquisition-by-caterpillar/) |
| Monarch Tractor | website | https://www.monarchtractor.com | n/a | monarchtractor.com no longer serves a page ("This page is unavailable", 20 October 2026) after the company's collapse |
| Monarch Tractor | deployments | Acquired by Caterpillar after mass layoffs | removed | an acquisition, not a deployment; the round and the description carry it |
| Monarch Tractor | deployments | Collapsed and sold assets to Caterpillar (2026-04) | removed | the collapse and sale, not a deployment; the description carries it |
| Monarch Tractor | deployments |  | Commercial operations across 12 U.S. states at its peak | stated by https://igrownews.com/monarch-tractor-news/ |
| Farm-ng | deployments |  | Axis Ag, Yuma, Arizona: Amiga data-capture platform characterising lettuce | stated by https://www.hortidaily.com/article/9508057/robot-amiga-assists-farms-of-all-sizes/ |
| Farm-ng | open source |  | farm-ng-core: C++ and Python library for the farm-ng logging format | stated by https://github.com/farm-ng |
| Farm-ng | open source |  | Amiga development kits (amiga-dev-kit, farm-ng-amiga) and an Amiga ROS bridge | stated by https://github.com/farm-ng |
| Bedrock Robotics | description | Builds autonomous construction technology for heavy equipment like excavators, founded by ex-Waymo engineers. | Builds autonomy that retrofits existing heavy equipment, starting with excavators, for construction sites; its founders came from Waymo. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Bedrock Robotics | HQ city |  | San Francisco | stated by https://finance.yahoo.com/news/bedrock-robotics-raises-270-million-140000467.html |
| Bedrock Robotics | total raised | $350M | not disclosed | the company's release and Construction Dive both say total funding is "over $350 million", a floor |
| Bedrock Robotics | deployments | 65,000+ cubic yards moved on 130-acre site (supervised autonomy) | Sundt Construction: supervised-autonomy mass excavation on a 130-acre manufacturing site (November 2025) | the named site and partner; the 65,000 cubic yards appear only in a headline on its about page (https://finance.yahoo.com/news/bedrock-robotics-raises-270m-red-131800649.html) |
| Bedrock Robotics | deployments |  | Champion Site Prep: Bedrock Operator on a manufacturing campus in central Texas | stated by https://finance.yahoo.com/news/bedrock-robotics-raises-270-million-140000467.html |
| Chef Robotics | description | Builds AI-powered robotic arms for assembling cooked, ready-to-eat food on high-volume production lines under RaaS model. | Builds AI-powered robots that assemble meals on high-volume, high-mix food production lines, leased to food manufacturers as robotics-as-a-service. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Simbe Robotics | description | Builds the Tally robot for autonomous shelf auditing and inventory analytics in retail stores. | Builds Tally, an autonomous shelf-scanning robot, plus fixed and RFID sensors that track inventory, pricing and product location in retail stores. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Simbe Robotics | HQ city | Chicago | Burlingame | its only listed address; the 2024 release is datelined San Francisco and no fetched source puts it in Chicago (https://www.simberobotics.com/about/contact-us) |
| Simbe Robotics | founded | 2015 | 2014 | its own timeline starts in 2014, when the three cofounders began their research (https://www.therobotreport.com/simbe-robotics-raises-26m-series-a-for-tally-retail-robot/) |
| Simbe Robotics | deployments | Retail store shelf auditing | Hundreds of Tally robots in chains including Schnuck Markets, BJ's Wholesale Club and Albertsons (2024) | stated by https://finance.yahoo.com/news/goldman-sachs-backed-simbe-raises-100000154.html |
| Simbe Robotics | deployments |  | Wakefern Food Corp. (ShopRite): more than 90 stores | stated by https://www.simberobotics.com |
| Simbe Robotics | deployments |  | Tally in stores of 29 retail brands, more than half past the pilot stage (2024) | stated by https://finance.yahoo.com/news/goldman-sachs-backed-simbe-raises-100000154.html |
| Intuitive Surgical | description | Builds da Vinci surgical robotic systems for minimally invasive robotic-assisted surgery; da Vinci 5 generation shipping with 100+ improvements. | Builds the da Vinci robotic systems for minimally invasive surgery and the Ion endoluminal system; it has led the robotic-surgery market for more than two decades. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Intuitive Surgical | aka |  | Intuitive | the name the company uses for itself (https://www.nasdaq.com/press-release/intuitive-announces-second-quarter-earnings-2026-07-16) |
| Intuitive Surgical | deployments | da Vinci 5 shipping | 11,710 da Vinci surgical systems installed (June 30, 2026) | stated by https://www.nasdaq.com/press-release/intuitive-announces-second-quarter-earnings-2026-07-16 |
| Intuitive Surgical | deployments | Dominant surgical robotics market leader | 1,096 Ion endoluminal systems installed (June 30, 2026) | stated by https://www.nasdaq.com/press-release/intuitive-announces-second-quarter-earnings-2026-07-16 |
| Intuitive Surgical | deployments |  | 468 da Vinci systems placed in the second quarter of 2026, 246 of them da Vinci 5 | stated by https://www.nasdaq.com/press-release/intuitive-announces-second-quarter-earnings-2026-07-16 |
| CMR Surgical | description | Builds Versius surgical robot system for minimal access surgery, competing with da Vinci. | Builds Versius, a surgical robot with independent modular arms for keyhole soft-tissue surgery; in October 2026 Stryker agreed to invest about $400 million with an option to buy the company. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| CMR Surgical | round type |  | Strategic investment | stated by https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery |
| CMR Surgical | round amount |  | $400M | stated by https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery |
| CMR Surgical | round date |  | 2026-10-12 | stated by https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery |
| CMR Surgical | aka |  | Cambridge Medical Robotics | stated by https://en.wikipedia.org/wiki/CMR_Surgical |
| CMR Surgical | deployments | Versius Plus system | Versius: adopted in hospitals in more than 30 countries and used in 45,000 cases | stated by https://www.therobotreport.com/stryker-invests-400m-into-cmr-surgical/ |
| CMR Surgical | deployments |  | 20 NHS hospital partnerships in the UK (October 2023) | stated by https://en.wikipedia.org/wiki/CMR_Surgical |
| CMR Surgical | lead investors |  | Stryker | stated by https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery |
| Moon Surgical | description | Builds Maestro, a surgical assistant robot for laparoscopic surgery. | Builds Maestro, a robotic system that assists surgeons in laparoscopic surgery; the FDA cleared its ScoPilot AI capability in March 2025. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Moon Surgical | founded | 2017 | 2019 | no fetched source gives 2017 (https://sofinnovapartners.com/news/mastor-secures-seed-funding-from-sofinnova-partners-to-develop-its-laparoscopy-assistance-platform) |
| Moon Surgical | round type |  | Series B | stated by https://moonsurgical.com/company |
| Moon Surgical | round amount |  | $55.4M | stated by https://moonsurgical.com/company |
| Moon Surgical | round date |  | 2023-05-17 | stated by https://sofinnovapartners.com/news/moon-surgical-appoints-fred-moll-md-board-chair-raises-usd55-4-million |
| Moon Surgical | aka |  | MastOR | stated by https://moonsurgical.com/company |
| Moon Surgical | deployments | Maestro system | Lee Health's Gulf Coast Medical Center, Florida: over 100 procedures (July 2025) | stated by https://www.prnewswire.com/news-releases/moon-surgical-launches-maestro-platform-at-lee-health-302505548.html |
| Moon Surgical | deployments |  | Over 1,600 Maestro procedures worldwide across 60 types of surgery (July 2025) | stated by https://www.prnewswire.com/news-releases/moon-surgical-launches-maestro-platform-at-lee-health-302505548.html |
| Moon Surgical | lead investors |  | Sofinnova Partners | stated by https://sofinnovapartners.com/news/moon-surgical-appoints-fred-moll-md-board-chair-raises-usd55-4-million |
| Moon Surgical | lead investors |  | NVentures (NVIDIA) | stated by https://sofinnovapartners.com/news/moon-surgical-appoints-fred-moll-md-board-chair-raises-usd55-4-million |
| Nuro | description | Builds autonomous vehicle technology for last-mile goods delivery, pivoting from custom delivery robots to AI-first autonomous driving licensing. | Develops the Nuro Driver, an autonomous driving system it licenses to automakers and mobility providers; it began by testing driverless food delivery and is building a robotaxi service with Uber and Lucid. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Nuro | deployments | Lucid Motors robotaxi partnership | Uber and Lucid robotaxi partnership: 20,000 or more Lucid vehicles with the Nuro Driver planned | stated by https://finance.yahoo.com/news/nuro-closes-203-million-series-123000194.html |
| Nuro | deployments | Autonomous delivery pilots | Houston: second planned market for the Uber and Lucid robotaxi service, expected mid-2027 | stated by https://www.nuro.ai/blog/uber-nuro-and-lucid-to-bring-robotaxi-service-to-houston-in-2027 |
| Serve Robotics | description | Builds autonomous sidewalk delivery robots; acquired Diligent Robotics for hospital logistics expansion. | Builds and operates autonomous sidewalk robots that deliver food in US cities for DoorDash and Grubhub; it bought the hospital-robot maker Diligent Robotics in 2026, the year Uber sold its stake. | rewritten to what its sources state; each clause quoted from 4 sources in the ledger |
| Serve Robotics | HQ city | Los Angeles | San Carlos | its SEC filings give 1360 Bayport Avenue, San Carlos; The Robot Report (January 2026) and Wikipedia still say Redwood City, and no fetched source puts it in Los Angeles (https://www.serverobotics.com) |
| Serve Robotics | deployments | Acquired Diligent Robotics (Jan 2026) | DoorDash: robot deliveries in Chicago, Los Angeles and Miami, expanding to Washington and San Jose (August 2026) | an acquisition is not a deployment; the description carries the Diligent deal (https://www.spokesman.com/stories/2026/aug/17/serve-robotics-expands-doordash-deal-adds-grubhub-/) |
| Serve Robotics | deployments | Moxi hospital robots | Diligent Robotics' Moxi robots in more than 25 hospitals (acquired January 2026) | stated by https://www.therobotreport.com/serve-robotics-acquires-diligent-robotics/ |
| Serve Robotics | deployments | Uber divested its entire stake (Q2 2026); partnership not expected to renew in early 2027 | About 2,000 sidewalk robots; 792 in daily use on average in the second quarter of 2026 | the Uber exit is not a deployment; the description carries it (https://www.spokesman.com/stories/2026/aug/17/serve-robotics-expands-doordash-deal-adds-grubhub-/) |
| Serve Robotics | deployments | New Grubhub partnership and DoorDash expansion announced 2026-08-17 | Grubhub (Wonder): robot deliveries in Los Angeles, Chicago and Alexandria, Virginia (from August 2026) | stated by https://www.spokesman.com/stories/2026/aug/17/serve-robotics-expands-doordash-deal-adds-grubhub-/ |
| Gecko Robotics | description | Builds climbing, flying, and swimming robots with AI for inspecting and monitoring critical infrastructure like power plants and military facilities. | Builds robots that climb, fly and swim to inspect critical infrastructure such as Navy warships and power plants, and feeds their data to its Cantilever AI platform. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Gecko Robotics | total raised |  | $347M | stated by https://www.cnbc.com/2025/06/12/gecko-robotics-raises-125-million-surpassing-billion-dollar-valuation.html |
| Gecko Robotics | deployments | Largest-ever Navy contract (2026) | U.S. Navy: five-year contract with a $71 million ceiling, starting with 18 Pacific Fleet ships (March 2026) | stated by https://www.geckorobotics.com/news/navy-idiq |
| Gecko Robotics | deployments | Power plant inspections | NAES, the largest US independent power operator: power plant modernization | stated by https://www.cnbc.com/2025/06/12/gecko-robotics-raises-125-million-surpassing-billion-dollar-valuation.html |
| Gecko Robotics | deployments |  | Abu Dhabi National Oil Company: robots inspect gas facilities and tanks | stated by https://www.cnbc.com/2025/06/12/gecko-robotics-raises-125-million-surpassing-billion-dollar-valuation.html |
| Gecko Robotics | lead investors |  | Cox Enterprises | stated by https://www.geckorobotics.com/news/gecko-reaches-unicorn-status |
| Standard Bots | description | Builds collaborative robot arms designed to be easier to buy and deploy for industrial automation. | Designs and assembles AI-native industrial robot arms, including the RO1 collaborative arm, and industrial humanoids in Glen Cove, New York; its June 2026 Series C valued it at $1 billion. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Standard Bots | HQ city |  | Glen Cove | stated by https://www.therobotreport.com/standard-bots-raises-63m-to-bring-cobot-arms-to-market/ |
| Standard Bots | founded | 2016 | not disclosed | no fetched source gives a founding year |
| Standard Bots | round date | 2026-06-10 | 2026-06-09 | announced that day; Robotics 24/7 published on 9 June too (https://www.therobotreport.com/standard-bots-raises-200m-expand-u-s-manufacturing-footprint/) |
| Standard Bots | deployments |  | Users include Sunoco, Lockheed Martin, Amazon, NASA and the U.S. Army | stated by https://pulse2.com/standard-bots-raises-200-million-series-c-at-1-billion-valuation-to-scale-ai-native-american-robotics/ |
| Standard Bots | lead investors |  | RoboStrategy | stated by https://www.therobotreport.com/standard-bots-raises-200m-expand-u-s-manufacturing-footprint/ |
| Standard Bots | lead investors |  | General Catalyst | the corrected release names General Catalyst as co-lead (https://pulse2.com/standard-bots-raises-200-million-series-c-at-1-billion-valuation-to-scale-ai-native-american-robotics/) |
| Collaborative Robotics | description | Builds practical collaborative robots (Proxie) for logistics, manufacturing, and healthcare with focus on human-robot interaction. | Builds Proxie, a wheeled mobile manipulator designed to work alongside people in manufacturing, supply-chain and healthcare settings. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Collaborative Robotics | founded | 2021 | 2022 | no fetched source gives 2021 (https://www.therobotreport.com/collaborative-robotics-unveils-proxie-mobile-manipulator/) |
| Collaborative Robotics | aka |  | Cobot | the name it trades under, on its site and in its releases (https://www.co.bot/news/robots-come-to-life) |
| Collaborative Robotics | deployments |  | Pilot customers including Moderna, Mayo Clinic, Owens & Minor and Tampa General Hospital (November 2024) | stated by https://www.therobotreport.com/collaborative-robotics-unveils-proxie-mobile-manipulator/ |
| The Bot Company | description | Builds wheeled household robots for everyday chores, founded by Cruise/Twitch co-founder Kyle Vogt. | Builds robots to do household chores; Cruise founder Kyle Vogt started it in 2024, and it had not shown a prototype publicly as of 2025. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| The Bot Company | founded |  | 2024 | Bloomberg wrote this on 28 October 2025 (https://news.bloomberglaw.com/private-equity/cruise-founders-robot-startup-is-in-talks-for-4-billion-value) |
| The Bot Company | round valuation | $4B | not disclosed | "more than $4 billion" is a floor, not a figure |
| The Bot Company | lead investors |  | Eclipse | stated by https://news.bloomberglaw.com/private-equity/cruise-founders-robot-startup-is-in-talks-for-4-billion-value |
| Weave Robotics | description | Builds Isaac 1, a personal home robot for folding laundry, tidying, and home care tasks; available for preorder at $7,999. | Builds home robots: Isaac 0, a stationary laundry-folding robot shipping in California, and Isaac 1, a mobile robot for laundry and tidying, on preorder at $7,999 with first shipments planned for fall 2026. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Weave Robotics | HQ city |  | San Francisco | stated by https://www.ycombinator.com/companies/weave-robotics |
| Weave Robotics | founded |  | 2024 | stated by https://www.ycombinator.com/companies/weave-robotics |
| Weave Robotics | deployments | Isaac 1 preorders open | Isaac 0 laundry-folding robot: shipping to homes across California | stated by https://www.weaverobotics.com |
| Weave Robotics | deployments |  | Isaac 1: preorders at $7,999 or $449 a month; first shipments planned for fall 2026 | stated by https://www.businessinsider.com/weave-robotics-isaac-1-8000-home-robot-chores-2026-7 |
| iRobot | description | Pioneer of consumer robot vacuums (Roomba); filed Chapter 11 bankruptcy in Dec 2025, acquired by Picea Robotics (Chinese manufacturer). | Maker of the Roomba robot vacuum, launched in 2002; after a Chapter 11 filing in December 2025, its contract manufacturer Shenzhen Picea Robotics acquired it in January 2026. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| iRobot | round type | Acquisition (bankruptcy) | Acquisition | bought out of a pre-packaged Chapter 11 (https://media.irobot.com/2026-01-23-iRobot-Completes-Court-Supervised-Transaction-with-Picea,-Enabling-the-Next-Chapter-of-Growth) |
| iRobot | round date | 2025-12-14 | 2026-01-23 | completion; the transaction was announced with the Chapter 11 filing on 14 December 2025 (https://media.irobot.com/2026-01-23-iRobot-Completes-Court-Supervised-Transaction-with-Picea,-Enabling-the-Next-Chapter-of-Growth) |
| iRobot | deployments | Roomba product line continues post-bankruptcy | Roomba: about 42% of the US and 65% of the Japanese robot-vacuum market (December 2025) | stated by https://www.bbc.com/news/articles/c1lr75lp239o |
| K-Scale Labs | description | Built open-source K-Bot humanoid robot; shut down Nov 2025 after failing to secure funding, open-sourced all IP. | Built K-Bot, an open-source humanoid robot priced from under $10,000; it shut down in November 2025 after failing to raise enough money, refunding K-Bot deposits and open-sourcing its technology. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| K-Scale Labs | total raised |  | $6.3M | stated by https://eu.36kr.com/en/p/3558501366315912 |
| K-Scale Labs | round type |  | Strategic investment | its last round before the shutdown; 36Kr gives only the month (https://eu.36kr.com/en/p/3558501366315912) |
| K-Scale Labs | round amount |  | $2M | stated by https://eu.36kr.com/en/p/3558501366315912 |
| K-Scale Labs | deployments | Shut down Nov 2025; CEO announced refunds and liquidation | At least two K-Bot humanoids shipped before the shutdown; the first preorder batch was limited to 100 units | the shutdown itself is not a deployment; the description carries it (https://mikekalil.com/blog/k-scale-labs-shuts-down/) |
| K-Scale Labs | open source | K-Bot (all IP open-sourced post-shutdown) | K-Bot humanoid design and the rest of its technology, open-sourced at the November 2025 shutdown | stated by https://eu.36kr.com/en/p/3558501366315912 |
| Automata | description | Builds fully integrated, AI-ready lab automation platforms for pharma, biotech, and research labs. | Builds LINQ, a fully integrated, AI-ready lab automation platform of benches and orchestration software for pharma, biotech and research labs; Danaher joined its January 2026 Series C as a strategic partner. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Automata | aka |  | Automata Technologies | its registered name, which its site's footer also uses (https://find-and-update.company-information.service.gov.uk/company/09384597) |
| Automata | deployments | Danaher partnership | Five top pharma companies among its customers, with repeat deployments (January 2026) | the Danaher partnership is an investment, not a deployment; the description carries it (https://www.automata.tech/company-news/automata-raises-45m-series-c-funding) |
| Lila Sciences | description | Builds scientific 'superintelligence' through fully autonomous AI-powered labs for scientific discovery. | Builds what it calls scientific superintelligence: AI models that run autonomous labs, its AI Science Factories, for life, chemical and materials science; Flagship Pioneering founded it in 2023. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Lila Sciences | HQ city | Boston | Cambridge | its contact page lists Cambridge, MA among three locations; no fetched source puts it in Boston (https://www.flagshippioneering.com/news/press-release/flagship-pioneering-unveils-lila-sciences-to-build-superintelligence-in-science) |
| Lila Sciences | founded |  | 2023 | stated by https://www.lila.ai/about |
| Lila Sciences | round valuation | $1.3B | not disclosed | "tops $1.3 billion" is a floor, not a figure |
| Lila Sciences | lead investors |  | Braidwell | co-leads of the first close (https://www.lila.ai/news/announcing-the-close-of-our-series-a) |
| Lila Sciences | lead investors |  | Collective Global | stated by https://www.lila.ai/news/announcing-the-close-of-our-series-a |
| Avidbots | description | Builds Neo 2 fully autonomous floor cleaning robots for commercial facilities using AI autonomy platform. | Builds Neo, Neo 2W and Kas, autonomous floor-scrubbing robots for commercial spaces such as airports, warehouses and shopping malls. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Avidbots | deployments | Commercial floor cleaning globally | More than 1,000 robots deployed across North America, Asia, Europe, the Middle East and Australia (September 2022) | stated by https://techcrunch.com/2022/09/27/avidbots-maker-of-autonomous-industrial-cleaning-robots-nabs-70m/ |
| Avidbots | deployments |  | Neo 2 at the Huntsville and Cincinnati/Northern Kentucky airports and with Singapore rail operator SMRT Trains (2022) | stated by https://techcrunch.com/2022/09/27/avidbots-maker-of-autonomous-industrial-cleaning-robots-nabs-70m/ |
| Harmonic Drive Systems | description | Undisputed global leader in strain wave (harmonic) gearing technology foundational for humanoid robot joints. | Makes HarmonicDrive strain wave gears and other precision speed reducers, plus actuators and motors, for industrial robots, semiconductor manufacturing equipment and other systems. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Harmonic Drive Systems | website | https://www.harmonicdrive.net | https://www.hds.co.jp/english/ | the cited harmonicdrive.net is the site of Harmonic Drive LLC, its US group company (https://www.hds.co.jp/english/company/about/) |
| Harmonic Drive Systems | aka | HDS | HDSI | stated by https://www.hds.co.jp/english/company/establishment/ |
| Harmonic Drive Systems | deployments | Supplies harmonic reducers to most major humanoid manufacturers | not disclosed | no fetched source names its customers |
| Nabtesco | description | Builds precision cycloidal and planetary reducers for industrial and humanoid robot joints. | Makes precision reduction gears, including its RV line, for the joints of industrial robots, alongside railway, aircraft, marine and commercial-vehicle equipment and automatic doors. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Nabtesco | deployments | Supplies reducers to major robot manufacturers | Precision reduction gears in the joints of industrial robots from Japanese and overseas makers: about 60% of the global market for medium-size to large robot joints (Nabtesco's estimate) | stated by https://www.nabtesco.com/en/products/robot/ |
| Leaderdrive | description | Chinese manufacturer of harmonic reducers positioned as domestic alternative to Japanese suppliers for humanoid robot joints. | Makes strain wave gears, rotary actuators, frameless torque motors and rotary tables for robots and automation; it claims more than 60% of China's market for its reducers and showed humanoid solutions at iREX 2025. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Leaderdrive | status | private | public | stated by https://www.leaderdrive.com |
| Leaderdrive | aka | Leader Drive | Leader Harmonious Drive Systems | its registered English name, on its contact page (https://www.leaderdrive.com/contact.html) |
| Leaderdrive | aka | Lide Drive | removed | no fetched source uses "Lide Drive" |
| Leaderdrive | deployments | Supplies harmonic reducers to Chinese humanoid manufacturers | More than 300,000 strain wave reducers sold in 2025, across 21 series | stated by https://www.leaderdrive.com |
| Leaderdrive | deployments |  | More than 1,800 clients worldwide | stated by https://www.leaderdrive.com |
| Sanhua | description | Supplies thermal management and actuator components to Tesla for Optimus; $685M order from Tesla reported. | Makes refrigeration and air-conditioning control components and automotive thermal-management parts, supplying Tesla's cars, and is developing electromechanical actuators for robots. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Sanhua | HQ city | Hangzhou | not disclosed | no fetched source names its headquarters city; its group site lists production bases and R&D centres in Xinchang and Hangzhou |
| Sanhua | aka |  | Sanhua Holding Group | the group's name on its own site (https://www.sanhuagroup.com/about.html) |
| Sanhua | deployments | Tesla Optimus supply chain ($685M order) | Thermal-management components for Tesla's electric cars, as a Tier 1 supplier | stated by https://news.metal.com/newscontent/103570985-sanhua-intelligent-control-lands-over-5-billion-yuan-tesla-humanoid-robot-order |
| Sanhua | deployments |  | Tier 1 supplier to Mercedes-Benz, BMW, Audi, BYD, Geely, Li Auto and NIO | stated by https://eu.36kr.com/en/p/3234007375625857 |
| Shadow Robot | description | Builds dexterous robotic hands and teleoperated robots with advanced dexterity for research and mission-critical applications. | Builds dexterous robot hands, including the Shadow Dexterous Hand and the DEX-EE hands developed with Google DeepMind, and teleoperated robots for research and mission-critical work. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Shadow Robot | founded | 1987 | 1997 | its incorporation; its story page says the business was formed on its first order, after years as a hobbyist group, and no fetched source gives 1987 (https://find-and-update.company-information.service.gov.uk/company/03308007) |
| Shadow Robot | deployments | Research institutions | OpenAI used the Shadow Dexterous Hand to study learning dexterity | stated by https://shadowrobot.com/dex-ee_series/ |
| Shadow Robot | deployments | Mission-critical teleoperation | DEX-EE hands built with and for Google DeepMind's machine-learning research | stated by https://shadowrobot.com/dex-ee_series/ |
| Shadow Robot | deployments |  | Clients including NASA, GSK, Siemens, Google Brain, Honda, MIT and Qualcomm | stated by https://shadowrobot.com/our-story/ |
| Sharpa | description | Builds SharpaWave dexterous humanoid hands with 22 DoF and tactile sensing, plus foundation models for contact-rich manipulation; mass production achieved. | Builds tactile dexterous robot hands, including the 22-degree-of-freedom Wave, in mass production since October 2025, plus dexterous robots and the CraftNet manipulation model; its own release calls it a unicorn. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Sharpa | founded |  | 2024 | stated by https://www.prnewswire.com/news-releases/sharpa-brings-dexterous-tactile-manipulation-to-the-nvidia-isaac-gr00t-reference-humanoid-robot-302787201.html |
| Sharpa | deployments | NVIDIA Isaac GR00T Reference Robot uses Sharpa hands | Wave hands on the NVIDIA Isaac GR00T Reference Humanoid Robot, used by research labs including Ai2, ETH Zurich, Stanford Robotics Center and UC San Diego (2026) | stated by https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design |
| Sharpa | deployments | Unveiled North full-body robot at CES 2026 | removed | a product unveiling at CES, not a deployment |
| Wonik Robotics | description | Builds Allegro Hand, a high-performance robotic hand optimized for research, automation, and intelligent manipulation. | Makes the Allegro Hand robotic hand for manipulation research and humanoid development, plus autonomous mobile robots and mobile manipulators for factory automation; it joined the WONIK Group in 2016. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Wonik Robotics | HQ city | Seoul | Seongnam | no fetched source puts it in Seoul (https://wonikrobotics.com/en/sub/company/location.php) |
| Wonik Robotics | founded | 1991 | 2004 | no fetched source gives 1991 (https://wonikrobotics.com/en/sub/company/history.php) |
| Wonik Robotics | aka | Wonik | SimLab | its name until 2016; "Wonik" is its group's name (https://wonikrobotics.com/en/sub/company/history.php) |
| Wonik Robotics | deployments | Research institutions worldwide | Allegro Hand with Meta FAIR's Digit Plexus tactile platform, which Wonik manufactures and distributes (announced November 2024) | stated by https://www.therobotreport.com/gelsight-meta-ai-release-digit-360-tactile-sensor-for-robotic-fingers/ |
| Wonik Robotics | deployments |  | Airporter cart robots at Incheon International Airport (2019) | stated by https://wonikrobotics.com/en/sub/company/history.php |
| Wonik Robotics | deployments |  | Allegro Dog quadruped supplied to the U.S. Naval Research Laboratory (2013) | stated by https://wonikrobotics.com/en/sub/company/history.php |
| XELA Robotics | description | Builds advanced 3D tactile sensors providing human sense of touch for humanoid and industrial robots. | Builds uSkin 3D tactile sensors and uAi software that give robot hands and grippers a sense of touch, for humanoid and industrial robots; a 2018 spin-out of Waseda University. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| XELA Robotics | founded |  | 2018 | stated by https://xelarobotics.com/about/ |
| XELA Robotics | round type |  | Strategic investment | stated by https://sg.finance.yahoo.com/news/xela-robotics-deepens-u-market-123000348.html |
| XELA Robotics | round date |  | 2026-04-29 | stated by https://sg.finance.yahoo.com/news/xela-robotics-deepens-u-market-123000348.html |
| XELA Robotics | deployments | Humanoid and industrial robot tactile sensing | More than 170 clients (2026) | stated by https://www.xelarobotics.com |
| XELA Robotics | deployments |  | uSkin integrations for robot hands and grippers from Wonik Robotics, Sake Robotics, Weiss Robotics and Robotiq | stated by https://xelarobotics.com/press-release/xela-robotics-unlocks-enhanced-automation-for-humanoid-and-industrial |
| XELA Robotics | lead investors |  | Plug and Play | stated by https://sg.finance.yahoo.com/news/xela-robotics-deepens-u-market-123000348.html |
| OpenAI (Robotics) | description | Re-entered robotics field with hiring push across hardware, simulation, data, and ML roles to develop robots for physical tasks. | Shut its first robotics effort in 2021 and is building a new robotics team: it has hired researchers who work on AI for humanoid and other robots, and its job listings seek teleoperation, simulation and robot-hardware skills. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Meta (Robotics) | description | Entered humanoid robotics by acquiring Assured Robot Intelligence, folding team into Superintelligence Labs to build foundational physical AI models. | Bought the humanoid-robot AI startup Assured Robot Intelligence in May 2026 to build up its AI models for robots; ARI's team joined Meta's Superintelligence Labs. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Meta (Robotics) | aka | Meta Superintelligence Labs | Meta Platforms | its registered name; Meta Superintelligence Labs is a division of Meta, not another name for it (https://en.wikipedia.org/wiki/Meta_Platforms) |
| Meta (Robotics) | aka |  | Facebook | its name from 2005 until 2021 (https://en.wikipedia.org/wiki/Meta_Platforms) |
| Meta (Robotics) | deployments | Acquired Assured Robot Intelligence (May 2026) | not disclosed | an acquisition, not a deployment; the round and the description carry it |
| Assured Robot Intelligence | description | Built AI models for robots to address critical challenges in high-value labor markets; acquired by Meta for Superintelligence Labs. | Built foundation models for humanoid robots to do physical labor such as household chores; Meta bought it in May 2026 and its team joined Meta's Superintelligence Labs. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Saronic | description | Designs and manufactures autonomous unmanned surface vehicles (USVs) for maritime security and domain awareness. | Designs and builds autonomous surface vessels for defense and commercial use, from the 24-foot Corsair to the 180-foot Marauder, in its own shipyards. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Saronic | deployments | Maritime security | U.S. Navy production contract for its vessels, worth $392 million (2025) | "maritime security" is a use, not a deployment (https://www.prnewswire.com/news-releases/saronic-closes-1-75b-series-d-at-9-25b-valuation-to-accelerate-a-new-era-of-maritime-autonomy-302729238.html) |
| Eka Robotics | description | Builds robot foundation models for dexterous manipulation, co-founded by MIT professor Pulkit Agrawal and DeepMind researcher Tuomas Haarnoja. | Teaches robots dexterous manipulation by having them practise in simulation and carry the skill to real robots; co-founded by MIT professor Pulkit Agrawal and former Google DeepMind researcher Tuomas Haarnoja. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Eka Robotics | HQ city |  | Cambridge | stated by https://www.wired.me/story/ive-covered-robots-for-years-this-one-is-different |
| Eka Robotics | lead investors | Obvious Ventures | not disclosed | Business Insider says Obvious Ventures' Kahini Shah invested in Eka; no fetched source says the firm led a round |
| Foundry Robotics | round type |  | Seed | stated by https://www.remixreality.com/foundry-robotics-raises-19-million-to-build-ai-first-robotics-for-manufacturing/ |
| Foundry Robotics | round amount |  | $19M | its seed funding in total (https://www.remixreality.com/foundry-robotics-raises-19-million-to-build-ai-first-robotics-for-manufacturing/) |
| Foundry Robotics | lead investors | Red Glass Ventures | not disclosed | Remix Reality lists Red Glass Ventures among its seed investors with Khosla Ventures, Hanabi Capital and Zero Shot Fund; no fetched source names a lead |
| Mytra | description | Builds warehouse robots that move goods across a modular 3D storage system without requiring facility rebuilds. | Builds software-defined warehouse automation: a pallet-size robot that moves goods through a matrix of three-dimensional storage cells. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Mytra | HQ city |  | Brisbane | Brisbane, California (https://mytra.ai/news/mytra-raises-120m-series-c) |
| Mytra | total raised |  | $200M | its company page; its releases give $78 million through the Series B and the $120 million Series C (https://mytra.ai/company/) |
| Mytra | deployments |  | Customers include a Fortune 100 food company and a Fortune 500 industrial-supply distributor (January 2026) | stated by https://mytra.ai/news/mytra-raises-120m-series-c |
| Mytra | deployments |  | Albertsons Companies, among the grocers and retailers it serves | stated by https://mytra.ai/news/mytra-announces-expansion-and-new-headquarters-with-brisbane-california-campus |
| Formic | HQ city |  | Chicago | stated by https://formic.co/about |
| Formic | founded |  | 2020 | stated by https://formic.co/about |
| Formic | round type | Series A | Series A extension | it builds on the January 2022 round; together they make a $52 million Series A (https://www.therobotreport.com/formic-brings-in-27-4m-to-expand-its-global-fleet-increase-support-network/) |
| Formic | round amount | $26.5M | $27.4M | stated by https://www.therobotreport.com/formic-brings-in-27-4m-to-expand-its-global-fleet-increase-support-network/ |
| Formic | round date | 2022-01-18 | 2024-06-25 | stated by https://www.therobotreport.com/formic-brings-in-27-4m-to-expand-its-global-fleet-increase-support-network/ |
| Formic | deployments | Manufacturing deployments | not disclosed | no fetched source names a customer, site or fleet size; its site names sectors only |
| Formic | lead investors | Lux Capital | Blackhorn Ventures | stated by https://www.therobotreport.com/formic-brings-in-27-4m-to-expand-its-global-fleet-increase-support-network/ |
| Astribot | description | Cable-driven AI robotics company building humanoid robots. | Builds cable-driven humanoid robots, the Astribot S1 and T1, which run its own Lumo AI foundation model. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Astribot | HQ city | Munich | Shenzhen | no fetched source puts it in Munich (https://pandaily.com/astribot-billion-dollar-valuation-series-b-jun2026/) |
| Astribot | HQ country | DE | CN | stated by https://www.astribot.com |
| Astribot | founded |  | 2022 | stated by https://www.astribot.com |
| Astribot | round amount | $138M | not disclosed | Pandaily gives no amount for the Series B; "over 1 billion RMB" is a floor for three rounds together |
| Astribot | round valuation | $1.38B | not disclosed | "past the 10 billion RMB (≈$1.4 billion) mark" is a floor |
| Astribot | aka |  | 星尘智能 | its Chinese name, on its own site (https://www.astribot.com) |
| Astribot | deployments |  | Deliveries in the thousands by the end of 2025 | stated by https://pandaily.com/astribot-billion-dollar-valuation-series-b-jun2026/ |
| Booster Robotics | description | Builds humanoid robots for commercial deployment. | Builds humanoid robots, the K1 and T2 among them, for developers, schools, research labs and robot-soccer teams; teams using its robots won RoboCup humanoid titles in 2025 and 2026. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Booster Robotics | round type | Series A+ | not disclosed | no fetched page names the type of its April 2026 round; "Series A+" was the name of an earlier round |
| Booster Robotics | round amount | $14M | not disclosed | "nearly $150 million" is a bound, not an amount; the caveat carries it |
| Booster Robotics | round date | 2026-01-12 | 2026-04-17 | the date of its news post "Booster Robotics Raises Nearly $150M" (https://www.booster.tech/news?target=en) |
| Booster Robotics | deployments |  | More than 700 humanoid robots delivered to more than 200 customers, over half of them outside China (November 2025) | stated by https://www.booster.tech/about-us?target=en |
| Booster Robotics | lead investors | IDG Capital | Beijing High-Tech Industries Investment Fund | stated by https://www.booster.tech/about-us?target=en |
| Booster Robotics | lead investors |  | Jingguosheng Fund | stated by https://www.booster.tech/about-us?target=en |
| Booster Robotics | lead investors |  | Huakong Fund | stated by https://www.booster.tech/about-us?target=en |
| Leju Robotics | description | Builds humanoid and educational robots for commercial and research applications. | Builds humanoid robots, from the small AELOS and ROBAN models to the full-size KUAVO, as well as robots for education; it was spun out of the Harbin Institute of Technology in 2016. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Leju Robotics | round type | Pre-IPO | not disclosed | The Robot Report says only that it raised funding "toward an IPO"; no fetched page names the round |
| Leju Robotics | round date | 2025-10-22 | not disclosed | The Robot Report of 25 October 2025 says it raised the money "this week"; no fetched page states the day |
| Leju Robotics | aka |  | Leju (Shenzhen) Robotics Co., Ltd. | its company name, in its own site's footer (https://www.lejurobot.com) |
| SwitchBot | description | Builds smart home robots and devices for home automation. | Makes the SwitchBot line of home-automation gadgets, such as curtain openers and door locks, and has added AI home robots, among them a wheeled humanoid for household tasks. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| SwitchBot | aka | OneRobotics (Shenzhen) Co. | OneRobotics (Shenzhen) Co., Ltd. | the full name of the company behind the SwitchBot brand (https://www.caixinglobal.com/2025-12-31/smart-home-startup-onerobotics-lands-206-million-in-hk-ipo-bets-big-on-ai-bots-102398920.html) |
| Hanson Robotics | description | Builds expressive humanoid robots like Sophia for research, entertainment, and human-robot interaction studies. | Builds expressive humanoid robots for research, demonstrations and public engagement with AI; its best-known robot is Sophia. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Hanson Robotics | founded | 2003 | 2007 | it moved to Hong Kong Science Park in 2013; its own site: "Pioneering Human-Robot Interaction Since 2007"; no fetched source gives 2003 (https://en.wikipedia.org/wiki/Hanson_Robotics) |
| Hanson Robotics | deployments | Sophia robot demonstrations | not disclosed | Sophia's demonstrations are appearances of its own robot, not a customer deployment |
| PaXini | round type | Series B | Strategic | its latest round; the March 2026 Series B came before it (https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/) |
| PaXini | round amount | $148M | not disclosed | RMB1 billion, with no dollar figure or exchange rate in the source; the caveat carries it |
| PaXini | round date | 2026-03-09 | 2026-08-03 | stated by https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/ |
| PaXini | round valuation | $1.4B | not disclosed | no fetched source gives a valuation for the August round; the March figure, "above 10 billion yuan", is a floor with no dollar figure |
| PaXini | aka |  | PaXini Tech | stated by https://cnevpost.com/2026/06/03/robotics-firm-paxini-weighs-hk-ipo/ |
| PaXini | aka |  | 帕西尼感知科技 | its Chinese name (https://equalocean.com/news/2026030921782-pacini-completes-rmb-1-billion-series-b-financing) |
| PaXini | deployments | Nearly 1 million tactile-sensing chips shipped in the year to Aug 2026; BYD strategic investment (Apr 2025) | Nearly 1 million tactile-sensing chips shipped in the year to August 2026 | BYD's 2025 investment is an investment, not a deployment (https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/) |
| PaXini | deployments |  | Tora-One humanoid deployed at Geely's Qiantang plant on wiring-harness assembly (2026) | stated by https://cnevpost.com/2026/06/03/robotics-firm-paxini-weighs-hk-ipo/ |
| PaXini | lead investors | Whampoa Capital | BOC International Investment | stated by https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/ |
| PaXini | lead investors | Caitai Capital | Kunpeng Fund | stated by https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/ |
| PaXini | lead investors | Xin'an Capital | Hexin Fangce | stated by https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/ |
| Miso Robotics | description | Builds autonomous robotic kitchen assistants like Flippy for fast-food and commercial kitchen automation. | Makes Flippy, an AI-powered robotic arm that cooks fried food in fast-food kitchens, and Zippy, a restaurant operations dashboard built from Zignyl, which it bought in 2026. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Miso Robotics | HQ city | Atlanta | Los Angeles | no fetched source puts it in Atlanta (https://www.restaurantbusinessonline.com/technology/flippy-maker-miso-robotics-acquires-operations-app-zignyl) |
| Miso Robotics | deployments | Fast-food brand partnerships | Flippy working in seven US states after about a dozen installations in a year (February 2026) | "fast-food brand partnerships" named none (https://www.restaurantbusinessonline.com/technology/flippy-maker-miso-robotics-acquires-operations-app-zignyl) |
| Miso Robotics | deployments | Acquired restaurant-operations app Zignyl (2026-02-26, per Fortune) | removed | buying Zignyl is an acquisition, not a deployment, and Restaurant Business, not Fortune, reported it |
| Starship Technologies | description | Builds autonomous sidewalk delivery robots for food and package delivery. | Builds and runs sidewalk robots for last-mile delivery of food and groceries; Skype co-founders Ahti Heinla and Janus Friis founded it in Tallinn in 2014. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Starship Technologies | HQ city | London | San Francisco | its first headquarters, in London, moved to San Francisco in 2018 (Wikipedia) (https://en.wikipedia.org/wiki/Starship_Technologies) |
| Starship Technologies | HQ country | UK | US | stated by https://en.wikipedia.org/wiki/Starship_Technologies |
| Starship Technologies | round type |  | Series C | stated by https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html |
| Starship Technologies | round amount |  | $50M | stated by https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html |
| Starship Technologies | round date |  | 2025-10-15 | stated by https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html |
| Starship Technologies | deployments | Food and package delivery across multiple cities | More than 2,700 robots at more than 270 locations in seven countries, with over 9 million deliveries (October 2025) | stated by https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html |
| Starship Technologies | deployments |  | Delivery partnerships with Grubhub in the US and with Bolt, Wolt and Foodora in Europe | stated by https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html |
| Starship Technologies | lead investors |  | Plural | stated by https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html |
| Coco | description | Builds autonomous delivery robots for last-mile food and goods delivery. | Runs a fleet of sidewalk delivery robots that drive themselves under remote human supervision, carrying orders for platforms such as Uber and DoorDash. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Coco | HQ city | Los Angeles | Santa Monica | stated by https://www.therobotreport.com/coco-robotics-raises-80m-to-scale-sidewalk-delivery-robots/ |
| Coco | round type | Series B | Strategic | no fetched source calls it a Series B (https://www.therobotreport.com/coco-robotics-raises-80m-to-scale-sidewalk-delivery-robots/) |
| Coco | round date | 2025-06-11 | not disclosed | The Robot Report of 13 June 2025 says it raised the money "this week"; no fetched page states the day |
| Coco | deployments | Food delivery in multiple US cities | More than 500,000 deliveries in Los Angeles, Chicago, Miami and Helsinki (June 2025) | stated by https://www.therobotreport.com/coco-robotics-raises-80m-to-scale-sidewalk-delivery-robots/ |
| Coco | deployments |  | Its robots take DoorDash orders in Los Angeles and Chicago (2025) | stated by https://www.therobotreport.com/coco-robotics-raises-80m-to-scale-sidewalk-delivery-robots/ |
| Knightscope | description | Builds autonomous security robots for patrolling and monitoring public and private spaces. | Builds autonomous security robots, such as the K5, and runs them with software and human agents to patrol sites such as retail lots, hospital campuses and casinos. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Knightscope | deployments | Security patrolling at malls, hospitals, corporate campuses | Deployed in 42 U.S. states | stated by https://www.knightscope.com/ |
| Knightscope | deployments |  | Sites include retail lots, hospital campuses, residential communities, casinos and utility sites | stated by https://www.knightscope.com/ |
| Knightscope | deployments |  | Clients have included Microsoft, Uber, Juniper Networks, the Sacramento Kings, LaGuardia Airport and NBC Universal (as of 2017) | stated by https://en.wikipedia.org/wiki/Knightscope |
| Brain Corp | description | Builds AI software platform powering autonomous commercial floor cleaning robots. | Makes BrainOS, autonomy software that robot makers such as Tennant and Nilfisk license to build floor-cleaning, inventory-scanning and other autonomous robots. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Brain Corp | deployments | Commercial floor cleaning robots in retail and warehouse | More than 50,000 BrainOS-powered robots worldwide (2026) | "retail and warehouse" floor cleaning named no deployment (https://www.braincorp.com/) |
| Brain Corp | deployments |  | Customers include Walmart and Kroger (2020) | stated by https://vcnewsdaily.com/brain-corp/venture-capital-funding/klcvvqtpvz |
| Brain Corp | lead investors | Qualcomm Ventures | not disclosed | SoftBank Vision Fund 1 led its April 2020 Series D, but an aggregator lists a later round (February 2024) that no fetched source states, so no lead of its latest round is known |
| Brain Corp | lead investors | SoftBank | not disclosed | Qualcomm Ventures made "an additional investment" in the 2020 Series D; it led no round a fetched source names |
| Pollen Robotics | description | Builds Reachy and Reachy Mini open-source humanoid robots for research and education, partnered with Hugging Face. | Builds open-source expressive robots, among them the Reachy 2 humanoid, the Reachy Mini companion robot and the Microduck biped; Hugging Face bought it in 2025. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Pollen Robotics | status | private | acquired | its own site: "now part of Hugging Face" (https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition) |
| Pollen Robotics | round type |  | Acquisition | stated by https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition |
| Pollen Robotics | round date |  | 2025-04-14 | stated by https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition |
| Pollen Robotics | deployments | Reachy Mini powered by Hugging Face | More than 10,000 robots shipped worldwide, by its own count (2026) | "Reachy Mini powered by Hugging Face" was a product, not a deployment (https://www.pollen-robotics.com) |
| Pollen Robotics | deployments |  | Reachy 2 in use in labs such as Cornell and Carnegie Mellon (2025) | stated by https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition |
| Pollen Robotics | open source | Reachy | Reachy 2 | the Reachy robot the source names as open source (https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition) |
| Pollen Robotics | lead investors |  | Hugging Face | stated by https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition |
| Diligent Robotics | deployments | Moxi robots in 30+ hospitals | Nearly 100 Moxi robots in more than 25 hospitals, with over 1.25 million deliveries (January 2026) | "30+ hospitals" appears in no fetched source (https://www.sec.gov/Archives/edgar/data/1832483/000121390026005920/ea027345401ex99-1_serve.htm) |
| Diligent Robotics | deployments | 22 health system clients | Customers include Northwestern Medicine, ChristianaCare and Rochester General Hospital | "22 health system clients" appears in no fetched source (https://www.sec.gov/Archives/edgar/data/1832483/000121390026005920/ea027345401ex99-1_serve.htm) |
| Fox Robotics | description | Builds autonomous forklifts and lift trucks for warehouse dock operations; acquired by Symbotic. | Builds the FoxBot, an autonomous forklift that loads and unloads trailers at warehouse docks; Symbotic bought it in 2026. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Fox Robotics | round date | 2026-02-10 | not disclosed | The Robot Report of 10 February 2026 says Symbotic announced the deal on its first-quarter earnings call and gives no day; no fetched source dates the deal |
| Fox Robotics | deployments | Warehouse dock operations | More than 100 FoxBot forklifts at 54 customer sites in the US and Canada, by its own count; Symbotic's CEO put it at 25 customers, mostly pilots (February 2026) | the two counts disagree, and both are given (https://www.therobotreport.com/symbotic-acquires-autonomous-forklift-maker-fox-robotics/) |
| Zebra Technologies (Robotics Automation) | description | Built robotics automation business including Symmetry Fulfillment orchestration platform; sold to Skild AI in April 2026. | Zebra's robotics automation business, whose Symmetry Fulfillment platform coordinates tasks between robots and frontline workers using Zebra wearable devices; Skild AI bought it in April 2026. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Zebra Technologies (Robotics Automation) | deployments | Symmetry Fulfillment platform sold to Skild AI | not disclosed | selling its Symmetry Fulfillment platform to Skild AI is the deal itself, not a deployment |
| Anduril | description | Builds autonomous systems for defense including drones, counter-drone systems, and AI-powered military platforms. | Builds autonomous systems for the U.S. and allied militaries, such as drones, autonomous submarines and sentry towers, run by its Lattice software. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| Anduril | round type |  | Series H | stated by https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/ |
| Anduril | round amount |  | $5B | stated by https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/ |
| Anduril | round date |  | 2026-05-13 | TechCrunch's article of Wednesday 13 May 2026 (https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/) |
| Anduril | deployments | Active in Middle East conflict | Its president has said it is a heavy participant in the Middle East conflict (2026) | stated by https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6 |
| Anduril | deployments | US military contracts | A U.S. Army contract for Lattice battle-manager software and a Dutch Ministry of Defence contract (May 2026) | stated by https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/ |
| Anduril | lead investors | Founders Fund | Thrive Capital | Founders Fund led its June 2025 round, not this one (https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/) |
| Anduril | lead investors |  | Andreessen Horowitz | stated by https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/ |
| Robotphoenix | description | Makes lightweight industrial robots; listed on HKEX in May 2026, raising ~$86M. | Makes industrial robots, among them delta, SCARA and six-axis models, and robotics systems for light-industry production lines; it listed in Hong Kong in May 2026. | rewritten to what its sources state; each clause quoted from 3 sources in the ledger |
| Robotphoenix | HQ city | Shanghai | Yuhuan | Yuhuan, a city in Taizhou, Zhejiang; no fetched source puts it in Shanghai (https://www.robotphoenix.com) |
| Robotphoenix | founded |  | 2012 | stated by https://www.robotphoenix.com |
| Robotphoenix | round amount | $86M | $96M | no fetched source gives the ~$86M the record carried (https://www.bakermckenzie.com/en/newsroom/2026/05/robotphoenix-hk-ipo) |
| Robotphoenix | aka |  | Robotphoenix Intelligent Technology Co., Ltd. | stated by https://www.bakermckenzie.com/en/newsroom/2026/05/robotphoenix-hk-ipo |
| Robotphoenix | aka |  | 浙江翼菲智能科技股份有限公司 | its registered Chinese name (https://news.pedaily.cn/202605/563989.shtml) |
| ABB Robotics | description | Major industrial robot manufacturer; robotics business acquired by SoftBank for $5.4B in October 2025. | Makes industrial and collaborative robots, autonomous mobile robots and controllers; SoftBank agreed in October 2025 to buy the business from ABB for $5.375 billion. | rewritten to what its sources state; each clause quoted from 2 sources in the ledger |
| ABB Robotics | status | acquired | public | still a division of ABB Ltd; both releases expect the sale to close in mid-to-late 2026, and no fetched source reports that it has (https://www.abb.com/global/en/news/129685/abb-to-divest-robotics-division-to-softbank-group) |
| ABB Robotics | deployments | Industrial robot installations worldwide | not disclosed | "industrial robot installations worldwide" names no installation, and no fetched source gives a count |
| Mitsubishi (Robotics) | description | Mass-producing AI humanoid robots in Japan, converting an idle engine plant into a high-volume robot factory targeting 1,000 humanoids per month. | Mitsubishi Motors plans to mass-produce AI humanoid robots designed by the Tokyo startup Highlanders on an unused engine line at its Kyoto plant from the first half of 2027, up to 1,000 a month. | rewritten to what its sources state; each clause quoted from one source in the ledger |
| Mitsubishi (Robotics) | name | Mitsubishi (Robotics) | Mitsubishi Motors | corrected 2026-10-21: each cited source and the website name Mitsubishi Motors (the website row's passage: "Global Website- MITSUBISHI MOTORS"); the id stays mitsubishi-robotics (https://www.assemblymag.com/articles/100290-mitsubishi-to-mass-produce-humanoid-robots-at-former-engine-plant) |
| Mitsubishi (Robotics) | founded |  | 1970 | Mitsubishi Motors' founding; the robot programme has none of its own (https://en.wikipedia.org/wiki/Mitsubishi_Motors) |
| Mitsubishi (Robotics) | website | https://www.mitsubishielectric.com | https://www.mitsubishi-motors.com/en/ | the plan is Mitsubishi Motors', not Mitsubishi Electric's (https://www.mitsubishi-motors.com/en/) |
| Mitsubishi (Robotics) | deployments | 1,000 humanoids/month production target | n/a | a production target, not a deployment; the robots are to go first to its own plants once production starts in 2027 |

## /credits marks as their registered images (2026-10-19, market-data-1019c)

The release run of 2026-10-19 21:40 failed `tests/e2e/brand-v2-figures.spec.ts`
("sweeps every figure-bearing route at both widths", VAL-B2-IMG-005) on
`/credits/`: the plate-less marks of market-data-1019 drew each credited file
as a CSS mask on a `<span>`, so the figure the sweep enumerates by
`data-image-id` held no `<img>`, no alt, no declared size and no decoded file.
It passed at the released head 97e16fcd, where the marks were `<img>`
elements on the grey plate.

The fix keeps the one treatment and puts the credited file back in the page:
on `/credits/` the mark's ink layer is the registered `<img>` of the file
(`components/ui/logo-mark.tsx`, `registered`), with the registry alt and
intrinsic width and height, loaded lazily like every other credited image. It
fills the measured artwork box, and the crop moved from a negative offset into
the mask's size and position, so the image never reaches past its figure. It
paints only its ink fill (`--color-text-dim`) through the mask of its own file,
and `object-position` sets its own pixels outside the element, which clips
them. No plate, border, padding or filter returns; the market map is unchanged.
Showing the files as plain images was measured and rejected: 29 of the 110
credited files are white or near-white (most of their opaque pixels under
1.5:1 on the paper), so they would vanish without the plate the owner removed.

Farm-ng's alt, new in market-data-1019b, said most of its caption again
(0.86 of its words over three letters, above the 0.85 limit); it now describes the mark: "Farm-ng company mark, a
prompt symbol over its name, from the archived company website" (0.55).

## Field audit close-out (2026-10-20): records 85 to 111, contradictions, empty fields and gates

Feature market-map-dataset-audit-completion. Earlier attempts committed records 1 to 84 (85944e02, db70c150,
898e18b2 with its pin ecb4a4a2, 21e9aaf5, b8915dd5, b52e0a2a). This session audited the last 27 in three
batches, with the same decisions grammar and scripts, and repaired the source checker in between (69c06481:
stale entries removed from `data/dataset-source-exceptions.ts`, and a HEAD 404 or 410 confirmed with a GET before
a URL counts as dead). Row counts are the rows the committed ledger holds for each batch's records:

| Batch | Records | Commit | Ledger rows |
|---|---|---|---|
| 14 | 85-93, openai-robotics to astribot | 05525ad2 | 104: 54 verified, 31 corrected, 13 added, 6 cut |
| 15 | 94-102, booster-robotics to knightscope | 556d90ec | 115: 48 verified, 43 corrected, 15 added, 9 cut |
| 16 | 103-111, brain-corp to mitsubishi-robotics | 435f7d27 | 120: 59 verified, 42 corrected, 13 added, 6 cut |

**Where the ledger stands.** At 435f7d27, `audit/market-map-ledger.json` holds 111 records and 1,576 field rows:
819 verified, 503 corrected, 167 added and 87 cut. 1,497 rows quote a passage from a fetched body. The other 79
are all cuts, where no fetched body states the value. No row rests on a search snippet: the committed JSON
contains no occurrence of "snippet". The roughly 40 snippet-corroborated rows and the 21 identity-only records
of the 2026-08-18 pass (the method paragraph at the top and the identity-only row of its corrections ledger) are
superseded: each of those records now has a full field ledger. Counted with `git show
HEAD:audit/market-map-ledger.json`, tallying `rows[].verdict` and the rows with a `source` over all
`companies[]` in Node.

**Same-round contradictions (VAL-B2-MAP-009).** Spirit AI's card shows the 1.5 billion yuan ($222M) Series A+ the
company announced on 3 June 2026 (PEdaily; The Next Web). Its caveat keeps the other figures for its February
round: Crunchbase News gives a $290 million Series A followed by a $145 million extension, while the
company's release gives $280 million. The caveat links all three sources. TARS's card shows the $455M Pre-A the
company announced (Pandaily; Xinhua), and its caveat keeps Crunchbase News' reading of the same round as a $513
million seed at a $1.9 billion valuation. Carbon Robotics' latest round is the $20M that GeekWire calls a
"Series D-2 extension", led by Giant Ventures on 23 October 2025, corrected from "Series D". The 2024 $70M Series
D is its earlier round, and the two no longer share a label. `tests/component/market-map.test.tsx` ("keeps
same-round contradictions visible on the card (VAL-B2-MAP-009)") opens the three cards and checks the round
type, the amount, the caveat's figures and its source links.

**Empty fields (VAL-B2-BASE-005).** The registry records 569 dispositions across the 111 records (`absent` in
`research/04-market-map-companies.json`; per-field table in the field-audit section above). The feature brief
counted 84 empty aka lists, 33 empty deployment lists, 105 empty open-source lists, 1 missing website, 23
missing founded years and 96 missing totals. After the audit, 61, 30, 96, 4, 15 and 99 are empty, and each
has a disposition. The schema rejects an empty field without one (`tests/unit/schemas.test.ts`, "rejects an
empty field with no recorded disposition (VAL-B2-BASE-005)"), and the card prints exactly "not disclosed" or
"n/a" (`components/market-map/company-card.tsx`).

**Sources.** `npm run check:dataset-sources` on the batch-16 data: 375 dataset source URLs across 111 records,
364 live, 0 dead, 3 blocked, 4 error and 4 documented exceptions. The three blocked URLs (SupplyChain247 for
Locus, GeekWire for Carbon, GovConWire for Saronic) answered 403 to the checker. The audit read them through a
follow-up fetch or a headless render, and 9, 9 and 2 ledger rows quote them. The four errors were network
failures in that run ("fetch failed" or "This operation was aborted"). `data/dataset-source-exceptions.ts`
holds 8 entries: the runtime `DATASET_SOURCE_EXCEPTIONS.length`, `rg -c "^    url: '"` and
`rg -c "^    verifiedOn: '"` each return 8. The run reports 4 documented exceptions because an entry whose URL
answered live in that run counts as live.

**Access facts.** Serve Robotics' investor site (ir.serverobotics.com) answers 403 to every fetch tried. Serve's
SEC filings carry the same release (exhibit 99.1 of its 8-K of 21 January 2026) and the completion 8-K. EDGAR
served them to a Node (undici) fetch with a generic user agent, while curl got 403. Both filing dates come from
EDGAR's filing indexes, read on 20 October 2026: accession 0001213900-26-005920, which holds the exhibit, was
filed on 2026-01-21, and the completion 8-K, 0001213900-26-009480, on 2026-01-29. new.abb.com timed out after
60 s. The same ABB release at www.abb.com/global/en/news/129685/ answered 200.

**Carve-outs.** This is a dataset pass: no article prose changed, so no `lastReviewed` moved. The card
descriptions are reader-facing, so the 27 written for records 85 to 111 were re-read against the humanizer's
patterns (contrast framing, staged openers, closing one-liners, superlatives a source does not license). None
needed a change. The humanizer skill was not run as a tool.

**Notes for future audits.**
- The brand-v2 identity runtime evidence (`evidence/brand-v2/identity-runtime.json`, last written by 81d4ee90)
  is stale. Its fingerprint covers every file a public route reaches, and every audit batch since db70c150
  changed `data/companies.ts`, as did the landing of d3cc89c3. So `npm run build` completes the export and then
  exits 1 at `check:brand-v2-enforcement` until `npm run refresh:brand-v2-evidence` runs, or the release autofix
  runs it (owner directive of 2026-10-12 13:40 in the mission's AGENTS.md). This pass did not run it.
- The 16 e2e failures listed in the gates below are on article routes this pass did not touch: the A-Z index,
  the ACT and behaviour-cloning correction specs, reading time, author truncation, and two micro-label checks
  in `market-map.spec.ts` that sweep `/manipulation/action-chunking/` and `/world-models/generative-video/`.
  They need their own owner.
- ABB Robotics: ABB and SoftBank expected the sale to close in mid-to-late 2026. When a source reports the
  close, the status goes back to acquired with that source, and the caveat goes.
- Fox Robotics: The Robot Report dates Symbotic's announcement only to its first-quarter earnings call. Symbotic's
  own earnings release would date the round.
- Brain Corp: an aggregator lists a February 2024 round of $32.1M that no fetched source states. A primary source
  for it would fill the latest-round fields, which the audit left undisclosed.

### Gates (transcript of commands run in this session)

Batch 14's gate output was not written down when it was committed. The gates below ran on later trees, which
include its data.

| Gate | Command | Result |
|---|---|---|
| Batch 15: unit and component | `npx vitest run` on the 16 dataset-related test files | pass, 291 passed |
| Batch 15: content, types, lint | `npm run validate:content`, `npm run typecheck`, `npm run lint` | pass, exit 0 each |
| Batch 15: sources | `npm run check:dataset-sources` | exit 0: 366 URLs, 350 live, 0 dead, 3 blocked, 9 error, 4 documented exceptions |
| Batch 16: reader-first pin | `node scripts/record-reader-first-continuity.ts tests/e2e/market-map.spec.ts` | recorded: 237 successors, review 2,785,526 bytes |
| Batch 16: unit and component | `npx vitest run` on 21 files: every unit and component test that mentions the company data, the ledger, the registry or the dataset sources, every `*market-map*`, `*compan*` and `*dataset*` test, `tests/unit/reader-first-continuity.test.ts` and `tests/unit/main-merge-approved-deltas.test.ts` | pass, 21 files, 369 passed |
| Batch 16: content | `npm run validate:content` | pass, exit 0 (audit coverage OK: 57/57 published articles, 1080 claim rows, 1375/1375 citations) |
| Batch 16: types | `npm run typecheck` | pass, exit 0 |
| Batch 16: lint | `npm run lint` | pass, exit 0 |
| Batch 16: sources | `npm run check:dataset-sources` | exit 0: 375 URLs, 364 live, 0 dead, 3 blocked, 4 error, 4 documented exceptions |
| Build | `npm run build` at 435f7d27 | exit 1 at `check:brand-v2-enforcement`: "identity runtime evidence is stale" (see the notes above). Before it, both `next build` passes and the post-build checks passed: reading times, export pruning, 404 guard, search index, no-slop, figure system, SEO, discovery prose, internal links and the census ("OK (75 public routes + separate 404, 87 sources, 86 mounts, 267 assets)"). `generate:og-cards` and `check:og-card-bytes` come after it and did not run. |
| Close-out: contradiction test | `npx vitest run tests/component/market-map.test.tsx -t "same-round contradictions"` | pass, 1 passed |
| Full e2e | `lsof -ti :3200 \| xargs kill`, then `npx playwright test` at 435f7d27 | stopped at test 149 of 1,992 after 10 minutes (13:46:51 to 13:57:30), because at that pace it would end near 16:30, after this feature's 15:00 stop. 14 failures by then, none on a route this pass changed: `a-z-index.spec.ts:183` (the `aside` A-Z link never appears), `act-convention.spec.ts:9` x2 (4 expected, 3 received), `act-final-model-papers.spec.ts:6` x2 and `act-five-sources.spec.ts:6` x2 (element not found), `article-header.spec.ts:230` (bc-foundations reading time 4.81 min off), `author-truncation.spec.ts:150` and `:173` (5 line boxes; 29.7% growth against 30%), `bc-foundations-corrections.spec.ts:10` and `:101` x2 each. No full-suite count is claimed. |
| Targeted e2e | port 3200 cleared, then `npx playwright test` on the seven `market-map*.spec.ts` files, `figure-system-marks`, `credits-about`, `imagery` and `search-structured` | 78 passed, 3 failed (5.1 min). `market-map.spec.ts:431` and `:472` fail on article routes the spec also sweeps: `/manipulation/action-chunking/` has 7 uppercase micro-labels (limit 5), and `/world-models/generative-video/` renders "listens to the action" in lowercase. The only commit since the release refresh that touched those articles' components is d3cc89c3, and the lowercase label came in with commits of 12 and 13 October. `market-map-logos.spec.ts:83` timed out at 30 s while screenshotting each of more than 100 marks, and again when run alone. |
| Logo test, longer budget | `npx playwright test --timeout=180000 "tests/e2e/market-map-logos.spec.ts:83"` | pass, 1 passed in 55.9 s: every mark lays down ink and none is a block. The 30 s failure is the time limit on this loaded host. The test reads only the logo files, which this pass did not change. |
| Visual check | dev server on port 3200, then a headless Chromium script opening the ABB Robotics, Anduril, Pollen Robotics, Spirit AI, TARS Robotics and Carbon Robotics cards at 1440 and 390 px | 12 screenshots, each examined: status, round, amount, date and caveat match the records above, with no horizontal overflow, no "$0" and 0 console errors |
| Close-out: final gates | `npm run typecheck`, `npm run lint`, `npm run validate:content`, then `npx vitest run` on `tests/component/market-map.test.tsx`, `tests/unit/schemas.test.ts`, `companies.test.ts`, `market-map.test.ts`, `main-merge-approved-deltas.test.ts` and `reader-first-continuity.test.ts` | pass: exit 0 each; vitest 6 files, 190 passed |
| Close-out: generated section | `node <mission library>/market-map-audit-20261019-report.mjs --check` | pass: the field-audit section matches the ledger (111 audited, 0 pending, 1576 rows, 533 changes, 33 caveats) |

## Mitsubishi Motors' display name (2026-10-21)

The close-out left one record under a name none of its sources uses. `mitsubishi-robotics` was shown as
"Mitsubishi (Robotics)", but its three sources name the company Mitsubishi Motors: Assembly Magazine ("TOKYO —
Mitsubishi Motors plans to begin mass-producing artificial intelligence-powered humanoid robots"), the website it
links ("Global Website- MITSUBISHI MOTORS") and Wikipedia's Mitsubishi Motors article. Its funding dispositions
still called the plan Mitsubishi Electric's robotics business, which the audit's website correction had already
ruled out.

| Record | Field | Was | Now | Basis |
|---|---|---|---|---|
| Mitsubishi Motors | name | Mitsubishi (Robotics) | Mitsubishi Motors | Assembly Magazine and the website name the company (the ledger's new name row) |
| Mitsubishi Motors | aka basis (n/a) | its sources "call it Mitsubishi" | its sources "call it Mitsubishi Motors" | the same sources |
| Mitsubishi Motors | total raised and the five round bases (n/a) | "Mitsubishi Electric's robotics business, funded by Mitsubishi Electric" | "A production plan of Mitsubishi Motors, a listed carmaker (TYO: 7211)" | the website row and the status row ("TYO : 7211") |

The id stays `mitsubishi-robotics`, so `#company-mitsubishi-robotics` links keep working. No rendered value, state
or source changes except the name; the bases are provenance and do not render. `audit/market-map-ledger.json`
gains a `name` row (corrected, `was` the old name) quoting the Assembly Magazine passage, and
`contract/brand-v2-approved-deltas.json` gains one plain edge from the field audit's endpoint,
`market-map-views-20261021-market-playground-company-mitsubishi-robotics`. The field audit's rows above keep the
name it checked.

The same follow-up gives the "every drawn mark lays down ink" test in `tests/e2e/market-map-logos.spec.ts` its own
120 s budget with its assertions unchanged: it screenshots more than 100 marks, and took 55.9 s in the close-out's
run and 41.5 s in this one, both past the 30 s default.

## Clone Robotics' reported raise (2026-10-22)

The map-playground user testing of 2026-10-22 (round 1, `VAL-B2-MAP-009`) found a figure dropped without a caveat.
Clone Robotics cites The Rundown of 9 April 2026, which says "A Mountain View office and a reported $50M raise put
Clone in the same conversation as Figure and 1X, but not on the same timeline." The field audit cut the record's
round type ("Seed", from an aggregator profile only) and left every funding field not disclosed, but nothing on the
card said a cited source mentions a raise. The live page was fetched again on 2026-10-22 (HTTP 200) and still
carries the sentence; it gives no date, round type, source or total for the raise.

| Record | Field | Was | Now | Basis |
|---|---|---|---|---|
| Clone Robotics | round caveat | none | The Rundown (9 April 2026) mentions a reported $50M raise but gives no date, round type or source for it; no cited source states a round or a total raised, so the card gives neither. | The Rundown's sentence above (the ledger's new `round.caveat` row) |

The caveat cites The Rundown, one of the record's four sources, and the card prints it under the round with a link
to that page. Total raised and the five round fields still read "not disclosed": a reported raise with no date or
type is not a round, and one raise is not a total. `audit/market-map-ledger.json` gains the `round.caveat` row
(added, quoting the sentence), the field-audit section above is regenerated from the ledger (1578 rows, 34
caveats), and `contract/brand-v2-approved-deltas.json` gains one plain edge from the field audit's endpoint,
`market-map-round1-fixes-20261022-market-playground-company-clone-robotics`. The generated section also picks up
the ledger's Mitsubishi `name` row of 2026-10-21, under the name the audit checked; the close-out's gate row for
the generated section, which had been left after the previous section, is back in its table.