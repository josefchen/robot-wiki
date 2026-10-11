<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Robot Wiki research-page standard (current authority)

Owner decision, Josef, 10 October 2026: every page and every first-party
figure follows the research-page standard (`PANTHEON-SPEC.md`), which
replaced the brand-v2 visual identity. Take the feel of that publication,
never its brand: no copied logo, name, wordmark or copy.

Before modifying any page, component, visualization, navigation surface,
social card, font, colour, texture, image, or visual asset, read these files
completely:

1. `library/design-system.md`: the owner-decision block at its top governs
   wherever an older brand-v2 section below it disagrees.
2. `contract/design-integrity.md`: the sealed, measurable `VAL-B2*` release
   criteria, with the colour and type rows carrying the new values.
3. `data/type-roles.json`: the web type roles.

- The public display identity is exactly `Robot Wiki`.
- The descriptor is exactly
  `Citation-first encyclopedia of modern robot learning.`
- Type: DM Sans is the display family (H1 at weight 400, section heads and the
  wordmark at 600). Geist carries body and interface text (16 px / 1.62).
  Geist Mono carries numerals, code and tabular readouts. All three load
  through `next/font`. Tektur stays only in the offline Open Graph renderer.
- Colour: paper `#FAFAF8` and ink `#1C1C1A`; hairline rules
  `rgba(28, 28, 26, 0.14)` and `rgba(28, 28, 26, 0.22)`, always 1 px;
  grayscale chart tones `#DEDEDB`, `#A3A39E` and `#3F3F3B`; one muted blue
  accent `#3B6EA8` for the one highlighted series, registration and active
  information paths. Green and red are outcome marks only.
- Primary actions are ink with white text. Selected and current states use
  ink, weight and a 1 px ink rule or underline, never a colour fill. Links
  are ink and underlined. The focus ring is a 1 px ink outline offset 2 px,
  keyboard only.
- No shadows, no gradients, no coloured panels behind text, no rounded pills
  and no accent bars. Radius is 0 everywhere except 7 px on code blocks.
- Layout: one top bar (wordmark left, "Articles" and "How robots work"
  right), a 960 px reading column, a sticky contents rail at wide widths
  that becomes a "Contents" disclosure on narrow screens, citations as
  numbered margin sidenotes that open inline on phones, numbered findings,
  and booktabs tables.
- Preserve routes, content, citations, data truth, accessibility, and working
  interactions while changing presentation.
- Keep stable technical identifiers such as repository/domain `robot-wiki`
  and `robot-atlas-trajectory` unchanged and distinct from public display
  identity.
- Do not invent a logo, monogram, mascot, favicon, or alternate symbol.
- Treat `MUST`, `MUST NOT`, the exact validation matrix, the 48-card OG/X
  matrix, and zero-residue sweeps as release requirements.
- A shared visual change must update executable tokens, affected primitives,
  all affected routes/states, Open Graph/X artwork, the complete generated
  card corpus, and tests together. A test that pins a superseded look moves
  to the new look as a recorded owner-approved successor at the same
  strength; it is never deleted or loosened.
- Validation is fully autonomous. Run the required automated gates, capture
  every required route/viewport/state, compare the result with the standard,
  and resolve drift before reporting completion.
- If implementation and the standard disagree, implementation is drift. Fix
  it. Ask the owner only when a proposed change would alter a locked
  foundation the standard does not already settle.

## Superseded visual history

Brand-v2 (October 2026 and earlier) is superseded historical evidence: the
Tektur web display and wordmark, IBM Plex Sans, Newsreader and IBM Plex Mono
roles, highlight lime `#C6FF19`, signal blue `#245FFF`, the concrete/graphite
palette, the sidebar rail with its lime current-route mark, tooltip
citations, the monospace article header list, rounded pills and accent bars.
`library/brand-reference-board.jpeg` and `library/brand-reference-article.png`
are that direction's references and are no longer literal targets. The
earlier paper-system direction before it (the lowercase hyphenated public
wordmark, `Robotics encyclopaedia` descriptor, home-only engineering-grid
restriction, IBM-Plex-Sans display identity and old blue/paper tokens) is
superseded too. Either may explain existing code or tests but is not
actionable design guidance. Workers must remove active residue while
preserving design-neutral truth, accessibility, route, citation, data, and
interaction constraints.
