# Market-map company dataset audit (VAL-AUDIT-007)

Date of audit: 2026-08-18. Scope: all 112 company rows in
`research/04-market-map-companies.json` (the declared source of truth;
`data/companies.ts` is generated from it by `npm run generate:companies` and is
never hand-edited), plus the funding timeline, which `timelineEvents` in
`lib/market-map.ts` derives from the same `latestRound` fields, so
record-timeline consistency holds by construction and is re-checked after every
batch.

Method, stated exactly (corrected on 2026-08-18 follow-up; the original
paragraph overstated it): sources were verified two ways. Directly fetched
sources were retrieved in-session with FetchUrl using a browser user agent
(a majority of rows, including every first-party press release and every URL
marked 200 above). The remaining roughly 40 of 98 rows rest on search-snippet
corroboration: WebSearch results whose headline or snippet stated the claim,
used chiefly for bot-walled outlets (Bloomberg, Forbes) and paywalled wires;
each such row discloses "fetched via search" inline in its Source column.
A search snippet is weaker evidence than a fetched document, and those rows
should be re-verified against the full source before being promoted to V.
WebSearch was also used to locate moved or live replacements when a URL was
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
rows above carry their tier and date but not the WebSearch queries the
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
rate-limit bot-wall. An independent fetch client (FetchUrl, 2026-08-18)
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
WebSearch was used only to locate the documents.

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
  **snippet-grade (WebSearch 2026-08-18) query: "Mentee raised about $21
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
| tars-robotics | latestRound Seed $513M, 2026-05-01, $1.9B valuation, leads [Hillhouse Capital, HSG] | https://olachina.org/tars-ai/ (200, independent: Ola China, 2026-04-16: "TARS AI (它石智航), a Shanghai-based embodied intelligence startup... On April 16, 2026, the company announced the completion of a $455 million Pre-A round"; "TARS AI officially launched in February 2025"; "On the financial investor side, Hillhouse Ventures and Sequoia China co-led the round. Meituan Dragon Ball, CICC Capital... followed") | CORRECTED | Wrong amount, wrong round class, wrong date: the real event is a $455M Pre-A announced 2026-04-16, not a $513M seed in May. (The aggregator's "$513M seed" also collides with a different Houston company's $513M seed in the same search space.) Corrected: Seed → Pre-A, $513M → $455M, 2026-05-01 → 2026-04-16. Valuation $1.9B NULLED: stated by no fetched body (the unicorn-board framing in the aggregator's own unicorn post is snippet-grade; snippet-grade (WebSearch, no fetched document) query: "TARS Robotics 它石智航 seed round $513 million Hillhouse HSG 2026"). Leads kept [Hillhouse Capital, HSG] — the fetched body names Hillhouse and Sequoia China as co-leads, and Sequoia China = HongShan = HSG (CNBC's fetched gloss: "HongShan, formerly Sequoia Capital China"). Recorded disagreement: investor Grishin Robotics' post (snippet-grade, same query) says the round was "co-led by GL Ventures, HSG, and Meituan" — GL Ventures appears in no fetched body; Meituan's strategic arm co-led per the fetched body. founded 2025 CONFIRMED ("officially launched in February 2025"). HQ Shanghai CONFIRMED. Source added: 1 (independent). |
| galaxea-ai | latestRound Series B extension $290M, 2026-04-01, $1.4B valuation, lead [Jinding Capital] | https://www.cxodigitalpulse.com/chinas-galaxea-ai-raises-290-4-million-in-series-b-round-to-accelerate-robotics-push/ (200, independent: CXO Digitalpulse, 2026-04-03: "Chinese embodied AI startup Galaxea AI has raised $290.4 million in a Series B+ funding round"; "Founded in 2023 and based in Beijing"); https://theaiinsider.tech/2026/04/04/chinese-robotics-startup-galaxea-ai-raises-290m-usd-in-series-b-funding-valued-at-29b-usd/ (200, independent: The AI Insider citing Yicai Global, 2026-04-04: "raised about $290 million in a Series B+ round... following a separate funding round of about $140 million completed in February") | CORRECTED | Round class corrected: Series B extension → Series B+ (both fetched bodies; the February predecessor was the ~$140M/¥1B Series B, which is what the aggregator's "led by Jinding Capital" sentence described — no fetched source names the B+ lead, so leadInvestors is emptied). Amount $290M confirmed within reporting variance ($290M / $290.4M fetched; Caixin's headline says $291M, unfetched). Date corrected 2026-04-01 → 2026-04-02; basis disclosed as snippet-grade (WebSearch, no fetched document) query: "Yicai Galaxea AI Series B+ $290 million 星海图 humanoid funding" — Yicai's body snippet reads "announced today" under its 2026-04-02 13:44 timestamp and Caixin's piece is dated 2026-04-02 by URL; the date is non-load-bearing (it only orders the timeline). Valuation $1.4B NULLED: the fetched sources genuinely disagree and no primary resolves it — Yicai reports "roughly $29 billion" (uncorroborated by any other fetched body and inconsistent with the sector's valuations), the aggregator's $1.4B described the February round, and humanoidindex's $700M is an Aug-2025 snapshot; naming all three rather than preferring one. founded 2023 CONFIRMED (CXO Digitalpulse). HQ Beijing CONFIRMED. Sources added: 2 (both independent). |
| robot-era | latestRound $200M, 2026-04-01, type null, leads [] | https://pulse2.com/robotera-raises-over-200-million-to-scale-humanoid-robotics-commercialization/ (200, independent: Pulse 2.0, 2026-05-08: "ROBOTERA announced it has raised more than $200 million in a new financing round led by SF Group"); https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/ (200, independent: Frontier Enterprise, 2026-05-15: "RobotEra has raised over US$200 million in a new financing round led by SF Group, following its RMB1 billion strategic round in March"); https://www.therobotreport.com/robotera-gets-series-a-funding-partners-unido-embodied-intelligence/ (200, independent: The Robot Report, 2025-12-01: "ROBOTERA last week secured nearly RMB 1 billion, or about $140 million U.S., in Series A+ financing... Geeley Capital led Robotera's round"; "The Beijing-based company") | CORRECTED (figure NULLED) | The round is real but its size is a bound in every fetched body: "more than $200 million" / "over US$200 million" is a lower bound the reporters did not make exact, so amountUsd is nulled rather than promoted to a flat $200M (the Skild rule; contrast booster-robotics, where the outlet itself printed a flat USD parenthetical). Lead corrected [] → [SF Group] (both fetched bodies: "led by SF Group"; HSG, IDG, Hillhouse participated). Date NULLED: no fetched body states the day; Caixin's piece is dated 2026-04-27 by URL but is unfetchable this session (snippet-grade (WebSearch, no fetched document) query: "site:caixinglobal.com Robot Era raises more than $200 million SF Express"), so the aggregator-only 2026-04-01 comes out and the row leaves the timeline. Type stays null ("a new financing round"; the March ¥1B strategic round and the Dec 2025 Series A+ precede it). HQ city null → Beijing (The Robot Report). Sources added: 2 (both independent). |
| rhoda-ai | latestRound Series A $450M, 2026-03-10, $1.7B valuation, leads []; HQ Palo Alto; founded null; totalRaisedUsd null | https://finance.yahoo.com/news/rhoda-ai-raises-450-million-160945418.html (200, independent: Reuters via Yahoo, 2026-03-10: "Rhoda AI on Tuesday said it has raised $450 million in a Series A funding round that values the company at $1.7 billion"; "emerged from stealth"; backers "Khosla Ventures, Temasek, Mayfield, Premji Invest and Capricorn Investment Group, among others" — none named as lead); https://techfundingnews.com/rhoda-ai-450m-series-a-stealth-exit-robotics/ (200, independent: TechFundingNews: "Based in Palo Alto, Rhoda AI") | CONFIRMED | Every batch-3-adjacent field verified against the fetched wire and secondary: amount, round class, date, valuation, empty lead list (backers named, no lead), Palo Alto HQ, null founded (no fetched source states a year; "emerged from stealth after 18 months" is not a founding date), null total (no source states a company total). No edit made. This is the one Tier-2 record whose non-aggregator sources already said exactly what the record says. |
| mind-robotics | latestRound $400M, 2026-05-13, $3.4B valuation, lead [Kleiner Perkins]; totalRaisedUsd null; founded null | https://finance.yahoo.com/news/rivian-spinout-mind-robotics-valued-154827510.html (200, independent: Reuters via Yahoo, 2026-05-13: "Mind Robotics, a spinout from Rivian, was valued at $3.4 billion in a new funding round, up from the $2 billion valuation it secured during its Series A raise in March"; "raised $400 million in the Kleiner Perkins-led round"); https://techcrunch.com/2026/05/13/rivian-spinoff-mind-robotics-raises-another-400m/ (200, independent: TechCrunch: "after it was created in 2025"; "brings the total raised to more than $1 billion"); https://www.therobotreport.com/mind-robotics-raises-400m-scale-ai-powered-robots-in-manufacturing/ (200, independent: The Robot Report: "spun out Mind Robotics in November 2025") | CONFIRMED + CORRECTED (founded) | Amount, date, lead, and the $3.4B valuation confirmed by the fetched Reuters syndication (the valuation's source of record, now added to the record; b1b161f had dropped the bot-walled reuters.com original while keeping its figure). totalRaisedUsd null confirmed correct ("more than $1 billion" is a bound, not a total). One correction: founded null → 2025 (TechCrunch "created in 2025"; The Robot Report "spun out... in November 2025"). Source added: 1 (independent). |
| agibot | latestRound Series B, null amount, 2024-01-01, $1B valuation, lead [CATL]; HQ Suzhou; totalRaisedUsd $83.8M; deployments "Backdoor listing via Swancor ($290M for 63.62%)" | https://finance.yahoo.com/news/chinese-robot-maker-agibot-completes-104808083.html (200, independent: Reuters via Yahoo, 2025-08-01: "AGIBot has completed a new round of strategic financing with investors including LG Electronics and Mirae Asset, the company said in a statement to Reuters... declined to disclose the size of the fundraising round"); https://en.tmtpost.com/post/7620691 (200, independent: TMTPost, 2025-07-09: "will acquire control of the listed company by purchasing at least 63.62% of its shares"; "2.1 billion yuan, or around $290 million"; "AgiBot Robotics emphasized that the acquisition is not a backdoor listing under current Chinese capital market regulations"); https://agibot.com/ (200, first-party: site title "AGIBOT Innovation (Shanghai) Technology Co., Ltd."); https://finance.yahoo.com/news/exclusive-chinese-robot-maker-agibot-092020928.html (200, independent: Reuters via Yahoo, 2025-10-10: "The Shanghai-based company"; "backed by investors such as Tencent and HongShan Capital Group (HSG)"; "According to PitchBook, it reached a valuation of $2.07 billion as of March"); https://futurism.com/robots-and-machines/robot-agibot-humanoid-walking (200, independent: Futurism, 2025-11: "completed a 66-mile pilgrimage from Jinji Lake in Suzhou to Shanghai... set a new Guinness world record"); https://www.prnewswire.com/news-releases/omdia-ranks-agibot-no1-worldwide-in-humanoid-robot-shipments-in-2025-302656788.html (200, durability addition, first-party, issuer: AgiBot, PR Newswire 2026-01-08: "shipped more than 5,100 humanoid robots during the year, capturing 39% of global market share") | CORRECTED | HQ corrected Suzhou → Shanghai (company's own site title + two Reuters wires; no fetched source says Suzhou). latestRound corrected: the "Series B (2024) at $1B led CATL" framing is humanoidindex-derived and supported by no fetched body; the most recent disclosed funding event is the 2025-08-01 strategic round (LG Electronics and Mirae Asset participating, size declined), recorded as type Strategic with null figures. CATL dropped as lead: no fetched source names CATL leading anything at AgiBot (its fetched backers are Tencent and HongShan; the March 2025 round was Tencent-led at ¥15B ≈ $2.07B per PitchBook-via-Reuters — kept in the ledger, not in the round fields, since that round is not the latest). totalRaisedUsd $83.8M NULLED: aggregator-derived (Tracxn-style "$83.8M over 3 rounds"); no fetched primary states a company total. Deployments rewritten from fetched sources: the "backdoor listing" framing is the company's explicitly denied characterization ("emphasized that the acquisition is not a backdoor listing"), so the text now states the deal (≥63.62% for ¥2.1B ≈ $290M) and the denial; the 66-mile Guinness walk and the Omdia No.1 shipment rank are kept with fetched sources. Description updated the same way and notes the HK IPO preparation (Reuters). founded 2023 retained (predates batch 3; not contradicted). Status stays private (IPO filing, not priced). Confidence medium → high. Sources added: 5 (4 independent, 1 first-party durability). |
| neura-robotics | latestRound Series C $1.4B, 2026-06-10, lead [Tether]; valuation null | https://neura-robotics.com/record-series-c/ (200, first-party, 2026-06-10: "Metzingen, Germany: June 10, 2026 – NEURA Robotics... today announced a landmark Series C financing with a total round size of up to $1.4 billion"); https://www.coindesk.com/business/2026/06/11/tether-leads-usd1-4-billion-funding-round-in-german-robotics-company-neura/ (fetched this session via an independent client after its curl 429s: HTTP 200, CoinDesk, 2026-06-11: "Tether Investments led a $1.4 billion funding round for Neura Robotics, a German startup developing AI-powered humanoid robots"); https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html (200, independent: CNBC: "raised a round of up to $1.4 billion, the company said on Wednesday"; valuation "around $7 billion, according to a source... The company declined to comment") | CORRECTED (amount NULLED) | Type (Series C), date (2026-06-10) and lead (Tether) confirmed by fetched bodies. amountUsd $1.4B → null: the company's own release — the primary — phrases the round as "up to $1.4 billion", and every fetched body repeats the hedge; a bound is never promoted to a precise value (the Skild rule; the same discipline that nulled generalist-ai's "more than half a billion"). The bound stays visible to readers in the first-party source title carried on the record ("Series C of up to $1.4B"). valuationUsd null retained as correct: the only figures in fetched bodies are "around/approximately $7 billion" from anonymous sources, which the company declined to confirm — and CoinDesk's own caption says "raised $1.5 billion" while its body says "$1.4 billion", so the secondary flat figures cannot settle what the primary hedges. founded 2019 / HQ Metzingen retained (dateline confirms HQ; founded predates batch 3). Sources added: 0 net — the fetched TNW corroboration ("Tether led the round") was withheld from the dataset because thenextweb.com answers HEAD 404 / GET 200 and the gate would classify it dead (dead is never exceptable); the CoinDesk URL already on the record, re-fetched this session, carries the lead attribution. |
| x-square-robot | latestRound Series B $293M, 2026-04-01, leads [Xiaomi, HSG]; HQ city null; founded null | https://kr-asia.com/xiaomi-hongshan-back-x-square-robot-in-series-b-round (200, independent: KrASIA, 2026-04-21: "X Square Robot has completed a Series B funding round, raising nearly RMB 2 billion (USD 292.8 million), 36Kr reported. Xiaomi and HongShan co-led the investment"); https://theaiinsider.tech/2026/04/22/x-square-robot-raises-276m-in-series-b-funding-for-household-robots/ (200, independent: The AI Insider citing China Daily, 2026-04-22: "raised nearly $276 million in a Series B round led by Xiaomi's strategic investment arm"); https://www.cnbc.com/2025/09/08/alibaba-leads-100-million-investment-in-chinese-humanoid-robot-startup.html (200, independent: CNBC, 2025-09-07: "the Shenzhen-based startup's eighth round of financing since the company launched less than two years ago in December 2023, according to Chief Operating Officer Yang Qian") | CORRECTED (amount NULLED on conflict) | The batch-3 "correction" moved this record away from the truth: the pre-batch $276M / 2026-04-21 matched fetched reporting; batch-3 rewrote it to $293M / 2026-04-01 from the aggregator. The underlying round is ~¥2B, and the two fetched named outlets convert it inconsistently — KrASIA prints "(USD 292.8 million)" (a stale-rate conversion) while China Daily via The AI Insider prints "nearly $276 million" — so amountUsd is NULLED with the disagreement named rather than either figure promoted. Date restored to 2026-04-21 (KrASIA's report date). Leads [Xiaomi, HSG] CONFIRMED (Xiaomi and HongShan co-led; HSG = HongShan). HQ city null → Shenzhen and founded null → 2023 from the fetched CNBC piece (COO statement: launched December 2023). Deployments "Home trials targeted by May 2026" confirmed (The AI Insider: launch "starting in late May" with 58.com home trials). Sources added: 2 (both independent). |
| limx-dynamics | latestRound Series B $200M, 2026-02-03; HQ city null; founded 2022 | https://technode.com/2026/02/03/limx-dynamics-raises-200-million-in-series-b-to-scale-humanoid-robotics/ (200, independent: TechNode, 2026-02-03: "Shenzhen-based humanoid robot maker LimX Dynamics said on Monday it had raised $200 million in a Series B funding round"); https://finance.biggo.com/news/269a54b1-070f-49ab-bce0-ff7a5776dd0f (200, independent: BigGo Finance, 2026-07-14: "announced on July 14 the completion of a nearly $200 million Pre-IPO funding round, pushing its post-money valuation to 15 billion yuan (approximately $2.2 billion)"; "Founded in 2022 by... Zhang Wei"); https://eu.36kr.com/en/p/3893976502287618 (200, independent: 36Kr EN, 2026-07-14: "announced the completion of its Pre-IPO funding round, raising nearly $200 million... post-money valuation has reached 15 billion RMB"); https://cryptobriefing.com/limx-dynamics-ipo-200m-pre-ipo-funding/ (200, independent: Crypto Briefing, 2026-07-14: "founded in January 2022"; "The pre-IPO round, completed on July 14, 2026") | CORRECTED | The February Series B was flat-verified at TechNode ($200M, Shenzhen-based) — but it is no longer the latest event: a pre-IPO round completed 2026-07-14 supersedes it, and its figures are bounds in every fetched body ("nearly $200 million"; the ¥15B post-money converts to "approximately $2.2 billion" at BigGo and "about $2.21 billion" at Crypto Briefing — FX-rate disagreement), so the round is recorded as Pre-IPO 2026-07-14 with amountUsd and valuationUsd null and both bases documented here. HQ city null → Shenzhen (TechNode, BigGo). founded 2022 CONFIRMED (January 2022, Crypto Briefing). Confidence low → medium. Sources added: 2 (both independent). |
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

### Re-derivation finding that blocks a seventh pointer

`nimble-robotics` is another timeline row whose first source does not support
the displayed round. The FedEx page states only that FedEx made a strategic
investment and gives no amount. The two remaining sources both state a $106M
Series C at a **$1B valuation**, while the record holds **$1.1B**:

- The Robot Report: “Nimble announced the successful closure of a $106
  million Series C funding round, bringing its valuation to $1 billion.”
- Pulse 2.0: “Nimble ... announced the closing of a $106 million Series C
  funding round, elevating the company to a $1 billion valuation.”

No source on the record supports $1.1B. This pass does not change that figure
or attach a misleading pointer. The valuation needs a separate evidence pass
and may need correction or nulling before the timeline can cite a round source
honestly.

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
