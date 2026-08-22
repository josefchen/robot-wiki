/**
 * Known exceptions for the citation link-liveness sweep
 * (scripts/check-citation-links.ts) and the citation audit checker
 * (scripts/check-citations.ts).
 *
 * Every entry here is a citation URL that is confirmed live and confirmed to
 * be the intended document, but cannot be verified by the machine checks:
 * either no client we can run gets past the bot-wall and no DOI exists
 * (DOI-bearing URLs are verified through Crossref metadata instead; that is
 * the durable path), or the Crossref record provably cannot corroborate the
 * registry entry for a documented reason (see ziegler-nichols-1942 and
 * kalman-1960 below), or the fetched page's <title> cannot plausibly be
 * compared to the registry title (tagline titles, journal mastheads; these
 * entries cover 'title-mismatch' for the audit checker only).
 *
 * An exception is evidence, not suppression: each entry must record WHY the
 * URL cannot be machine-verified, HOW a human last confirmed it is live and
 * is the intended document, and WHEN that happened. Both checkers validate
 * the list before making a single request and fail if any entry lacks its
 * justification. Matching is on the failure mode, not the URL alone: if a
 * listed URL starts genuinely 404ing, it is still reported dead.
 *
 * Type-only relative import so this file loads under plain node, Vitest, and
 * Next.js alike.
 */
import type { LinkCheckException } from '../lib/citation-links.ts';

export const LINK_CHECK_EXCEPTIONS: LinkCheckException[] = [
  {
    id: 'iso-ts-15066',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client (curl and node fetch, regardless of headers): a bot-wall, not link rot. The technical specification has no DOI, so Crossref cannot stand in for the fetch.',
    verifiedBy:
      'Browser check on 2026-08-20: the catalogue page for ISO/TS 15066:2016 loads and states the title "Robots and robotic devices — Collaborative robots", edition 1, matching the registry entry. Only the public catalogue metadata is cited; no clause or table from the paywalled document is quoted anywhere on the site.',
    verifiedOn: '2026-08-20',
  },
  {
    id: 'llama-3-2024',
    covers: ['error'],
    reason:
      'ai.meta.com answers HTTP 400 to every non-browser client (curl and node fetch, regardless of headers): a TLS-fingerprint bot-wall, not link rot. The post has no DOI, so Crossref cannot stand in for the fetch.',
    verifiedBy:
      'Headless Chromium (Playwright) on a real browser fingerprint: HTTP 200, page title "Introducing Meta Llama 3: The most capable openly available LLM to date" matches the registry entry.',
    verifiedOn: '2026-08-11',
  },
  {
    id: 'meta-fair-touch-2024',
    covers: ['error'],
    reason:
      'ai.meta.com answers HTTP 400 to every non-browser client (curl and node fetch, regardless of headers): a TLS-fingerprint bot-wall, not link rot. The post has no DOI, so Crossref cannot stand in for the fetch.',
    verifiedBy:
      'Headless Chromium (Playwright) on a real browser fingerprint: HTTP 200, page title "Advancing embodied AI through progress in touch perception, dexterity, and human-robot interaction" matches the registry entry.',
    verifiedOn: '2026-08-11',
  },
  {
    id: 'murray-li-sastry-1994',
    covers: ['error'],
    reason:
      'www.cds.caltech.edu serves an incomplete TLS certificate chain: node fetch aborts with UNABLE_TO_VERIFY_LEAF_SIGNATURE because Node does not fetch missing intermediates (no AIA chasing). Browsers and curl complete the chain and load the PDF fine.',
    verifiedBy:
      "curl -I with the sweep's browser user agent: HTTP 200, Content-Type application/pdf, Content-Length 2795175.",
    verifiedOn: '2026-08-11',
  },
  {
    id: 'agibot-go2-2026',
    covers: ['error'],
    reason:
      'www.agibot.com answers HTTP 500 to node fetch on every probe (7 of 7, HEAD and GET, 2026-08-11) while curl and Chromium get HTTP 200: a client-fingerprint wall, not link rot. The page has no DOI, so Crossref cannot stand in for the fetch.',
    verifiedBy:
      'curl GET with the sweep\'s browser user agent: HTTP 200, 135,961 bytes; headless Chromium (Playwright): HTTP 200, page title "The Unity of Reasoning and Action: AGIBOT Unveils Genie Operator" (the GO-2 announcement).',
    verifiedOn: '2026-08-11',
  },
  {
    id: 'ziegler-nichols-1942',
    covers: ['blocked'],
    reason:
      'ASME bot-walls the sweep behind a Cloudflare interstitial (HTTP 403, even headless Chromium). The DOI is registered by ASME against the 1993 JDSMC reprint, so Crossref reports only 1993 and the year check can never corroborate the 1942 Trans. ASME original the registry cites; the divergence is documented on the registry entry itself.',
    verifiedBy:
      'Crossref content negotiation for doi:10.1115/1.2899060: title "Optimum Settings for Automatic Controllers" matches the registry exactly, and the doi.org redirect target is the ASME page for the paper.',
    verifiedOn: '2026-08-11',
  },
  {
    id: 'maestro-tavac-2023',
    covers: ['blocked'],
    reason:
      'www.sages.org serves a Cloudflare challenge (HTTP 403, cf-mitigated: challenge) to curl, node fetch, and headless Chromium alike. The TAVAC assessment has no DOI, so Crossref cannot stand in for the fetch.',
    verifiedBy:
      'Web search index (queried 2026-08-16): the page is indexed at the exact registry URL, dated 2023-01-31, titled "Moon Surgical Maestro Surgical Robotics System - A SAGES Technology..." with authors "Ruben D. Salas Parra MD and David Pechman MD, FACS", matching the registry title, author list, and year.',
    verifiedOn: '2026-08-16',
  },
  {
    id: 'kalman-1960',
    covers: ['title-mismatch'],
    reason:
      'The cited DOI is the Wiley Online Books chapter republication (2009), so Crossref reports 2009 while the registry cites the original 1960 Bol. Soc. Mat. Mexicana paper. The title matches exactly; only the year diverges, for the same reprint-vs-original reason as ziegler-nichols-1942. The IEEE page the DOI resolves to is a JS shell whose served <title> is the chapter title without the original publication framing.',
    verifiedBy:
      'Crossref content negotiation for doi:10.1109/9780470544334.ch8: title "Contributions to the Theory of Optimal Control" matches the registry exactly; doi.org resolves to ieeexplore.ieee.org/document/5311913 (HTTP 202), the chapter record. Re-confirmed 2026-08-18.',
    verifiedOn: '2026-08-18',
  },
  {
    id: 'levenberg-1944',
    covers: ['title-mismatch'],
    reason:
      'AMS article pages serve the journal masthead ("Quarterly of Applied Mathematics") as the <title> element, with no per-article title in the served HTML, so the fetched title can never match the paper the registry cites.',
    verifiedBy:
      'Crossref content negotiation for doi:10.1090/qam/10666: title "A Method for the Solution of Certain Non-linear Problems in Least Squares" and year 1944 both match the registry entry. Re-confirmed 2026-08-18.',
    verifiedOn: '2026-08-18',
  },
  {
    id: 'knowledge-insulation-2025',
    covers: ['title-mismatch'],
    reason:
      'pi.website research pages carry the note\'s tagline as <title> ("VLAs that Train Fast, Run Fast, and Generalize Better"), not the research-note name the registry cites; the page has no DOI, so Crossref cannot stand in.',
    verifiedBy:
      'Fetched page body (2026-08-18, live): the page names "Knowledge Insulation" repeatedly, carries the ten-author byline at its foot, and lives at the research/knowledge_insulation slug; the companion paper is registry id knowledge-insulation-paper-2025 with the same tagline subtitle.',
    verifiedOn: '2026-08-18',
  },
  {
    id: 'gtsam-2026',
    covers: ['title-mismatch'],
    reason:
      'gtsam.org serves a tagline as <title> ("GTSAM | GTSAM is a BSD-licensed C++ library..."), not the project name the registry cites; the page has no DOI.',
    verifiedBy:
      'Fetched page body (2026-08-18, live): the page states "Georgia Tech Smoothing and Mapping" in its project description.',
    verifiedOn: '2026-08-18',
  },
  {
    id: 'sutton-bitter-lesson-2019',
    covers: ['error'],
    reason:
      'web.archive.org intermittently resets TLS connections for node fetch and curl from this network (observed 4 consecutive resets on 2026-08-18) while the capture itself is live and complete; a transient archive.org connectivity failure, not a dead mirror.',
    verifiedBy:
      'Independent fetch on 2026-08-18 (FetchUrl, 200): full essay text served at the exact capture URL, title "The Bitter Lesson", author Rich Sutton, dated March 13, 2019, matching the registry entry.',
    verifiedOn: '2026-08-18',
  },

  /* ------------------------------------------------------------------ *
   * The safety module's standards catalogue entries (2026-08-22).
   *
   * iso.org answers HTTP 403 to curl and node fetch regardless of headers
   * (measured on all seven URLs the same day), exactly as the existing
   * iso-ts-15066 entry above records. None of these documents has a DOI,
   * so Crossref cannot stand in. Each was read through a real browser
   * client on 2026-08-22 and the catalogue metadata quoted below is what
   * that page rendered. Only catalogue metadata is cited anywhere on the
   * site; no clause or table from any of these paywalled documents is
   * quoted or paraphrased.
   *
   * The A3 entry is a different wall: automate.org answers 403 to
   * non-browser clients and its <title> is a site masthead, so it covers
   * the title-mismatch mode as well.
   * ------------------------------------------------------------------ */
  {
    id: 'iso-12100',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client (curl and node fetch, regardless of headers): a bot-wall, not link rot. The standard has no DOI, so Crossref cannot stand in for the fetch.',
    verifiedBy:
      'Browser read on 2026-08-22: the catalogue page states "ISO 12100:2010, Safety of machinery - General principles for design - Risk assessment and risk reduction", edition 1, published 2010-11, stage 90.92, matching the registry entry.',
    verifiedOn: '2026-08-22',
  },
  {
    id: 'iso-10218-1-2025',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client: the same bot-wall as the other ISO catalogue entries. No DOI exists for the standard.',
    verifiedBy:
      'Browser read on 2026-08-22: the catalogue page states "ISO 10218-1:2025, Robotics - Safety requirements - Part 1: Industrial robots", edition 3, published 2025-02, stage 60.60, 95 pages, ISO/TC 299, matching the registry entry.',
    verifiedOn: '2026-08-22',
  },
  {
    id: 'iso-10218-2-2025',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client: the same bot-wall as the other ISO catalogue entries. No DOI exists for the standard.',
    verifiedBy:
      'Browser read on 2026-08-22: the catalogue page states "ISO 10218-2:2025, Robotics - Safety requirements - Part 2: Industrial robot applications and robot cells", edition 2, published 2025-02, stage 60.60, 223 pages, matching the registry entry.',
    verifiedOn: '2026-08-22',
  },
  {
    id: 'iso-13849-1-2023',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client: the same bot-wall as the other ISO catalogue entries. No DOI exists for the standard.',
    verifiedBy:
      'Browser read on 2026-08-22: the catalogue page states "ISO 13849-1:2023, Safety of machinery - Safety-related parts of control systems - Part 1: General principles for design", edition 4, published 2023-04, stage 60.60, matching the registry entry.',
    verifiedOn: '2026-08-22',
  },
  {
    id: 'iso-13850-2015',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client: the same bot-wall as the other ISO catalogue entries. No DOI exists for the standard.',
    verifiedBy:
      'Browser read on 2026-08-22: the catalogue page states "ISO 13850:2015, Safety of machinery - Emergency stop function - Principles for design", edition 3, published 2015-11, last confirmed 2020, matching the registry entry.',
    verifiedOn: '2026-08-22',
  },
  {
    id: 'iso-3691-4-2023',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client: the same bot-wall as the other ISO catalogue entries. No DOI exists for the standard.',
    verifiedBy:
      'Browser read on 2026-08-22: the catalogue page states "ISO 3691-4:2023, Industrial trucks - Safety requirements and verification - Part 4: Driverless industrial trucks and their systems", edition 2, published 2023-06, stage 90.92, matching the registry entry.',
    verifiedOn: '2026-08-22',
  },
  {
    id: 'iso-cd-25785-1',
    covers: ['error', 'blocked'],
    reason:
      'iso.org returns HTTP 403 to every non-browser client: the same bot-wall as the other ISO catalogue entries. A committee draft has no DOI.',
    verifiedBy:
      'Browser read on 2026-08-22: the catalogue page states "ISO/CD 25785-1", Committee Draft, "Under development", stage 30.60 (close of comment period 2026-07-08), edition 1, ISO/TC 299, with an abstract covering industrial mobile robots with actively controlled stability. The registry entry states that draft status, which is the whole point of citing it.',
    verifiedOn: '2026-08-22',
  },
  {
    id: 'a3-robot-safety-standards',
    covers: ['error', 'blocked', 'title-mismatch'],
    reason:
      'automate.org returns HTTP 403 to curl and node fetch, and its <title> is the site masthead ("Robot Safety Standard Documents | Automate") rather than a document title a machine can compare against a registry entry. The page is a catalogue listing and has no DOI.',
    verifiedBy:
      'Browser read on 2026-08-22: the page lists ANSI/RIA R15.08-1-2020 (Part 1, the industrial mobile robot) and ANSI/A3 R15.08-2-2023 (Part 2, IMR systems and applications) as available, and marks R15.06 Part 3 as forthcoming. That published-parts split is exactly what the article cites it for.',
    verifiedOn: '2026-08-22',
  },
];
