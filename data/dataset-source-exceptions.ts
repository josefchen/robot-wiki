/**
 * Known exceptions for the market-map dataset source-URL liveness sweep
 * (scripts/check-dataset-sources.ts).
 *
 * An entry exists for a dataset source URL that is confirmed live but cannot
 * be verified by any machine client we can run — a hard bot-wall with no DOI
 * to verify through, or a client-level fetch limitation. Each entry must
 * record WHY the URL cannot be machine-verified, HOW a human last confirmed
 * it is live, and WHEN.
 *
 * Matching is on the failure mode, not the URL alone: 'dead' is never
 * excepted, so a listed URL that starts genuinely 404ing still fails the
 * sweep.
 */
export interface DatasetSourceException {
  /** The exact source URL from research/04-market-map-companies.json. */
  url: string;
  /** Why this URL cannot be verified by machine. */
  reason: string;
  /** How a human last confirmed the link is live (tool, status, evidence). */
  verifiedBy: string;
  /** ISO calendar date (YYYY-MM-DD) of that verification. */
  verifiedOn: string;
}

export const DATASET_SOURCE_EXCEPTIONS: DatasetSourceException[] = [
  {
    url: 'https://www.businesswire.com/news/home/20260114335623/en/Skild-AI-Raises-$1.4B',
    reason:
      'Businesswire serves HTTP 403 to every non-browser client we can run (node fetch and curl, regardless of headers): a bot-wall, not link rot.',
    verifiedBy:
      'Independent fetch client (FetchUrl, 2026-08-18): HTTP 200, full release text served — "Skild AI Raises $1.4B, Now Valued Over $14B", SoftBank-led round announced Jan 14, 2026, matching the record.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.businesswire.com/news/home/20251202560677/en/Mujin-Raises-US$-233-Million-to-Accelerate-Global-Growth-and-Drive-Industrial-Autonomy',
    reason:
      'Businesswire serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Web search index (queried 2026-08-18): the release is indexed at the exact URL, dated 2025-12-02, titled "Mujin Raises US$ 233 Million to Accelerate Global Growth and Drive Industrial Autonomy", matching the record; the same announcement is corroborated by the live first-party mirror mujin-corp.com and Pulse2.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.businesswire.com/news/home/20250821665495/en/Nuro-Closes-203-Million-Series-E-Financing-to-Advance-Its-AI-First-Autonomy-Platform',
    reason:
      'Businesswire serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Web search index (queried 2026-08-18): the release is indexed at the exact URL, dated 2025-08-21, titled "Nuro Closes $203 Million Series E Financing to Advance Its AI-First Autonomy Platform" ($6B valuation), matching the record; corroborated by the live Yahoo Finance and Morningstar copies of the same wire.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.businesswire.com/news/home/20241021330997/en/Carbon-Robotics-Raises-70-Million-Series-D-Investment-Round',
    reason:
      'Businesswire serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Web search index (queried 2026-08-18): the release is indexed at the exact URL, dated 2024-10-21, titled "Carbon Robotics Raises $70 Million Series D Investment Round", matching the record; the same round is corroborated by the live The Robot Report coverage now carried in the record.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.businesswire.com/news/home/20260129548625/en/Automata-Raises-45M-Series-C-to-Build-the-Operating-System-for-Life-Sciences',
    reason:
      'Businesswire serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Web search index (queried 2026-08-18): the release is indexed at the exact URL, dated 2026-01-29, titled "Automata Raises 45M Series C to Build the Operating System for Life Sciences", matching the record; the record also carries the live first-party automata.tech announcement.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.bloomberg.com/news/articles/2026-03-12/dishwashing-home-robot-maker-sunday-hits-1-15-billion-valuation',
    reason:
      'Bloomberg serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Independent fetch client (FetchUrl, 2026-08-18): HTTP 200, article text served — "Dishwashing Home Robot Maker Sunday Hits $1.15 Billion Valuation", $165M Series B led by Coatue, March 12 2026, matching the record.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.bloomberg.com/news/articles/2025-10-28/cruise-founder-kyle-vogt-s-robotics-startup-eyes-4-billion-valuation',
    reason:
      'Bloomberg serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Independent fetch client (FetchUrl, 2026-08-18): HTTP 200, article text served — "Cruise Founder Kyle Vogt\'s Robotics Startup Eyes $4 Billion Valuation", The Bot Company raising $250M, Oct 28 2025, matching the record.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://qz.com/generalist-ai-funding-robotics-nvidia-bezos-060526',
    reason:
      'Quartz serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Independent fetch client (FetchUrl, 2026-08-18): HTTP 200, full article served — "Robotics startup Generalist AI is raising $400 million at a $2 billion valuation", Radical Ventures led, matching the record.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://kelo.com/2026/01/21/ubtech-agrees-airbus-deal-to-expand-robot-use-in-aviation-manufacturing/',
    reason:
      'kelo.com serves HTTP 403 to every non-browser client we can run (node fetch and curl): a bot-wall, not link rot.',
    verifiedBy:
      'Independent fetch client (FetchUrl, 2026-08-18): HTTP 200, full Reuters wire text served — "UBTech agrees Airbus deal to expand robot use in aviation manufacturing", Walker S2 purchase and aviation-manufacturing cooperation, Jan 21 2026, matching the record.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.therobotreport.com/tag/miso-robotics/',
    reason:
      'The Robot Report tag hubs answer HTTP 403 to node fetch with the sweep user agent (its article pages answer 200): a bot-wall on the hub route, not link rot.',
    verifiedBy:
      'Text-extraction proxy fetch (r.jina.ai, 2026-08-18): HTTP 200, page title "Miso Robotics Archives - The Robot Report" — the live coverage hub, including the Feb 2026 Zignyl acquisition coverage the record cites it for.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.allegrohand.com/',
    reason:
      'allegrohand.com intermittently fails at the network layer for node fetch from this network (ENETUNREACH on some probes, 200 on others; curl succeeds consistently): a transient routing flake against this host, not link rot. The sweep\'s single retry does not reliably absorb it.',
    verifiedBy:
      'curl HEAD/GET with the sweep user agent, three consecutive runs (2026-08-18): HTTP 200 every time; node fetch succeeded on 2 of 3 probes with the same URL.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.chinadailyhk.com/hk/article/369019',
    reason:
      'chinadailyhk.com intermittently fails at the network layer for node fetch from this network ("fetch failed" on some probes, 200 on others): a transient routing flake against this host, not link rot. The sweep\'s single retry does not reliably absorb it.',
    verifiedBy:
      'node fetch HEAD with the sweep user agent (2026-08-18): HTTP 200; curl GET with the same user agent: HTTP 200. Article: "UBTech makes HK trading debut amid gloomy market" (2023-12-29), matching the record.',
    verifiedOn: '2026-08-18',
  },
  {
    url: 'https://www.coindesk.com/business/2026/06/11/tether-leads-usd1-4-billion-funding-round-in-german-robotics-company-neura/',
    reason:
      'coindesk.com serves HTTP 429 to every machine client we can run: a persistent rate-limit bot-wall, not link rot and not transient. First observed 2026-08-18 as an intermittent 429 (2 of 4 runs, exit 0); on 2026-08-18 later the same day it returned 429 on 7 consecutive probes (4 curl + 3 gate runs, gate exit 0 throughout, reported as blocked). The record carries 2 other live sources, so no claim rests on this URL alone; it is retained rather than replaced.',
    verifiedBy:
      'Independent fetch client (FetchUrl, 2026-08-18): HTTP 200, full article served — "Tether leads $1.4 billion funding round in German robotics company Neura", Jun 11 2026, Tether-led $1.4B round with Qualcomm, Amazon and NVIDIA participation, matching the record.',
    verifiedOn: '2026-08-18',
  },
];
