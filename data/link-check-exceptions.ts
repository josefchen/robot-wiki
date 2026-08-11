/**
 * Known exceptions for the citation link-liveness sweep
 * (scripts/check-citation-links.ts).
 *
 * Every entry here is a citation URL that is confirmed live but cannot be
 * verified by the sweep's machine checks: either no client we can run gets
 * past the bot-wall and no DOI exists (DOI-bearing URLs are verified through
 * Crossref metadata instead; that is the durable path), or the Crossref
 * record provably cannot corroborate the registry entry for a documented
 * reason (see ziegler-nichols-1942 below).
 *
 * An exception is evidence, not suppression: each entry must record WHY the
 * URL cannot be machine-verified, HOW a human last confirmed it is live, and
 * WHEN that happened. The sweep validates the list before making a single
 * request and fails if any entry lacks its justification. Matching is on the
 * failure mode, not the URL alone: if a listed URL starts genuinely 404ing,
 * it is still reported dead.
 *
 * Type-only relative import so this file loads under plain node, Vitest, and
 * Next.js alike.
 */
import type { LinkCheckException } from '../lib/citation-links.ts';

export const LINK_CHECK_EXCEPTIONS: LinkCheckException[] = [
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
];
