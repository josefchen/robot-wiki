# Robot Wiki brand-v2 design-integrity contract

Status: **sealed against brand and design system v2.0**

Canonical intent: [`library/design-system.md`](../library/design-system.md)

Literal references:

- [`library/brand-reference-board.jpeg`](../library/brand-reference-board.jpeg)
- [`library/brand-reference-article.png`](../library/brand-reference-article.png)

This contract turns brand-v2 into measurable repository acceptance criteria. Every ID is collision-free within the `VAL-B2*` namespace. Tests may be stricter, but they MUST NOT weaken these definitions. A failure blocks a brand-v2 release.

## 0. Scope and invariant truth

Brand-v2 changes presentation, not product truth.

| ID | Requirement |
| --- | --- |
| `VAL-B2-BASE-001` | Existing public route paths and trailing-slash behavior remain intact. |
| `VAL-B2-BASE-002` | Against the immutable brand-v2 migration baseline, visible article prose, accessible names, factual claims, citation targets/source labels/dates/quantities, References, See also, and Linked from relationships are byte- or semantics-identical except approved brand-string migration and fact-preserving caption/attribution additions; visible first-party creator labels may change from `robot-wiki` to `Robot Wiki` without changing factual authorship. |
| `VAL-B2-BASE-003` | Market-map records, funding values, company relationships, dates, source pointers, and deep links remain semantically identical. |
| `VAL-B2-BASE-004` | Playground model identity, geometry, joint constraints, kinematic calculations, and trajectory data remain semantically identical. |
| `VAL-B2-BASE-005` | Published values render their source value; an existing but undisclosed value renders exactly `not disclosed`; only a genuinely inapplicable field renders exactly `n/a`; none is coerced to zero, blank ambiguity, or an invented substitute. |
| `VAL-B2-BASE-006` | Against the immutable migration baseline, existing keyboard paths, accessible names, landmarks, navigation names/hrefs, current-state semantics, table/search behavior, resets, defaults, and working interactions remain available except entries named by the approved-delta allowlist. |
| `VAL-B2-BASE-007` | External links preserve safe relationship attributes and citation links remain keyboard reachable. |
| `VAL-B2-BASE-008` | Stable technical identifiers, including `robot-wiki`, `robot-wiki.com`, and `robot-atlas-trajectory`, remain unchanged in technical contexts unless a separate migration is approved. |

## 1. Shared measurable definitions

### 1.1 Visible

An element is visible when it has a non-zero rendered box and computed `display` is not `none`, `visibility` is not `hidden`, and effective opacity is greater than zero.

### 1.2 Public identity surface

A public identity surface is visible brand text in the shell, home hero, footer, page title lockup, metadata title/description, structured social metadata, image alternative text describing first-party artwork, or generated OG/X artwork. Source code identifiers, URLs, package names, filesystem paths, and documented technical identifiers are excluded.

### 1.3 Brand display text

Brand display text is a visible element whose complete normalized text identifies the product. The only valid normalized public value is `Robot Wiki`.

### 1.4 Descriptor surface

A descriptor surface is visible or metadata copy immediately associated with the first-party product identity. The only valid descriptor is `Citation-first encyclopedia of modern robot learning.` including its terminal period.

### 1.5 Brand grid/device

A brand grid/device is a decorative or structural layer that draws repeated grid lines/dots, registration crosses, crop marks, sequence labels, axes, or rails. It is compliant only when aligned to layout or real state, pointer-inert when decorative, and non-obscuring.

### 1.6 Product surface

A product surface is any visible first-party container with a background, border, elevation, texture, or clipping geometry. Semantic data marks and third-party logo artwork are not surfaces.

### 1.7 Bounded dark instrument

A bounded dark instrument has an ink/graphite background, a visibly closed edge or clear spatial boundary, accessible inverse text, and content that is a diagram, chart, simulation, code/data view, media frame, or interactive tool. A page body, full shell, ordinary prose section, or marketing card cannot qualify. Dark fills on actions and compact controls are governed by component-state requirements and are excluded from both the bounded-dark-instrument test and the dark-product-surface population.

### 1.8 Selected state

A selected state is a persistent user or route state expressed by at least two of: lime ground/border, text label, icon, weight, check/marker, geometry, or `aria-selected`/`aria-pressed`/`aria-current`.

### 1.9 Raised and floating surfaces

A raised surface is an actionable or selected bounded surface with a neutral shadow whose blur is at most 8px. A floating surface is a temporary overlay, menu, modal, or dragged object with a neutral shadow whose blur is at most 20px. Any coloured shadow, glow, backdrop blur, or shadow without stacking meaning is non-compliant.

### 1.10 Registration-label population

A registration label is visible text no larger than 11px set in IBM Plex Mono with tracking between 0.08em and 0.14em, normally used for sequence, coordinate, category, or instrument metadata. Real form labels are counted separately and are never considered decorative.

### 1.11 Visual evidence

Visual evidence is a deterministic full-page or bounded-state capture produced after fonts load, transitions settle, async data stabilizes, and the required state is reached. Evidence is invalid if clipped, captured during animation, missing fonts, or produced from stale generated output.


### 1.12 Milestone-1 reference-feature rubric

Milestone 1 MUST check in one versioned reference-feature rubric used by every autonomous comparison. Contract literals override text, font naming, and hex variation visible in the compressed reference images. Raw pixel similarity, perceptual-distance scores, and screenshot-to-reference image matching are prohibited for cross-composition review; pixel equality is permitted only for deterministic same-input/same-output checks.

Each comparison row records pass/fail for every applicable anchor below. Scores are not averaged, and one failed applicable anchor fails the row.

| Feature | Executable anchor and threshold |
| --- | --- |
| Identity | Exact public identity/descriptor placement passes; web identity computes to Tektur Variable; OG/X identity uses the registered static Tektur instance; no alternate symbol or v1 identity exists. |
| Hierarchy | Home/site-card primary identity is at least `1.50×` the next-largest supporting heading by computed font size or measured cap-height; article h1 is at least `1.35×` article body size; no desktop primary heading exceeds three rendered lines. |
| Grid and alignment | `100%` of registered rails/devices are within `2px` of their registered column, boundary, baseline, axis, or state anchor; unregistered devices count as failures. |
| Purposeful devices | Every device has a registry purpose and owner; a section has at most one dominant registration motif; decorative device count on mobile is no greater than its desktop counterpart; zero devices obscure content or intercept input. |
| Light/dark balance | Body, shell, and prose remain light. Dark non-action surfaces are registered bounded instruments. Their union occupies at most `40%` of the first viewport on home/article/discovery and at most `75%` on market-map/playground; no dark instrument intersects shell navigation or prose text. |
| Repetition and frames | No more than three adjacent sibling modules share the same surface/heading/action signature; redundant four-sided nested frames count is `0`; frame depth is at most `2`, and depth `2` is permitted only when the inner object is a registered table, plot, media frame, or control group. |
| Palette and type | `100%` of audited foundation/accent colours and first-party text roles resolve to the sealed tokens/families/registered Tektur instances; no unregistered role or fallback glyph is present. |
| Material treatment | Every registered representative surface has its declared deterministic material treatment, passes contrast, and carries ownership/licence metadata when external; prose glyph backgrounds remain texture-free. |

### 1.13 Provenance, legal-basis, and qualitative terms

Automation verifies records; it does not issue an independent legal opinion. Every visual asset uses exactly one owner-approved legal-basis enum value: `owned`, `cc-by`, `cc-by-sa`, `cc0`, `public-domain`, `press-kit-editorial-reuse`, `documented-permission`, or `official-identification-use`. Each record includes the official source URL, retrieval date, content hash, creator/owner, attribution text, licence or permission reference, and byte/style preservation policy. Company marks use `official-identification-use` and must preserve official bytes and style except registered contain-fit placement on a neutral plate.

Terms such as `purposeful`, `truthful`, `meaningful`, and `readable` never pass through prose judgment alone:

- `purposeful` requires a registry owner, structural/state purpose, anchor, allowed count, and executable alignment/input predicate;
- `truthful` requires a source or assumption ID plus an independently derived expected value/geometry/text predicate;
- `meaningful` requires a registered content/function annotation and an executable non-empty, non-generic, non-duplicative text predicate;
- `readable` requires executable contrast, font-size/line-height/measure, clipping, overlap, and overflow predicates.

### 1.14 Reproducible accessibility profiles

- **320 CSS px reflow** uses a literal Playwright viewport of `320×800` CSS px at device scale factor `1`.
- **200% zoom-equivalent** does not claim to operate browser-chrome zoom. For each sealed base viewport `W×H`, it uses a separate context with CSS viewport `W/2 × H/2` and device scale factor `2`. A true browser-zoom profile may replace this only when its browser build, launch flags/preferences, zoom command, and observed zoom value are pinned and checked in.
- **200% text-only** first records baseline computed font sizes for the non-empty registered text population, then injects a final author-layer stylesheet assigning each registered selector exactly `2×` its recorded baseline computed size while leaving viewport and non-text geometry unchanged. Every member must compute to the doubled size within `0.5px`; no member may be hidden, clipped, overlapped, or made unreachable, and no required content/control may disappear.

### 1.15 Bounded state-case construction

The state registry computes an exact expected case count per source and materially distinct mount. Coverage is non-empty and includes:

- every discrete tab, radio, toggle, select option, and disclosure state independently;
- every slider at minimum, documented default, maximum, every registered discontinuity, and every source anchor;
- reset/default, focus, meaningful hover, selected/unselected, and one deterministic witness for each implemented loading, error, empty, and unavailable state;
- deterministic pairwise combinations across independent controls, generated from a pinned algorithm and seed;
- only the explicitly registered higher-order combinations needed for a named invariant.

Full Cartesian products are neither required nor implied. The runner records expected and observed case counts and fails on zero cases, a missing case, an extra unregistered case, nondeterministic ordering, or count disagreement.

## 2. Identity

| ID | Requirement |
| --- | --- |
| `VAL-B2-ID-001` | Every public brand display text is exactly `Robot Wiki`, with one space, capital `R`, capital `W`, and no hyphen or punctuation. |
| `VAL-B2-ID-002` | Every descriptor surface is exactly `Citation-first encyclopedia of modern robot learning.` |
| `VAL-B2-ID-003` | The visible product identity never renders `robot-wiki`, `ROBOT WIKI`, `Robot-Wiki`, `Robotics encyclopaedia`, or any descriptor paraphrase. |
| `VAL-B2-ID-004` | Technical uses of `robot-wiki`, `robot-wiki.com`, and `robot-atlas-trajectory` remain technical and are not altered merely to satisfy public-display sweeps. |
| `VAL-B2-ID-005` | Wordmark text renders in Tektur Variable on web identity surfaces (home, desktop shell, and mobile header); OG/X artwork renders the registered static Tektur instance mapped to the approved web role. |
| `VAL-B2-ID-006` | The repository introduces no first-party symbol, monogram, mascot, robot-head logo, or alternate brand glyph. |
| `VAL-B2-ID-007` | The home hero contains one dominant `Robot Wiki` h1 and one exact descriptor; duplicate hero lockups are prohibited. |
| `VAL-B2-ID-008` | Mobile header contains the compact `Robot Wiki` wordmark and omits the descriptor. |
| `VAL-B2-ID-009` | Article OG cards contain compact `Robot Wiki` identity but omit the descriptor; the site card contains both exact strings. |

## 3. Colour

| ID | Requirement |
| --- | --- |
| `VAL-B2-COL-001` | Runtime highlight token and all renderer mirrors resolve exactly to `#C6FF19`. |
| `VAL-B2-COL-002` | Runtime signal token and all renderer mirrors resolve exactly to `#245FFF`. |
| `VAL-B2-COL-003` | Runtime foundation tokens resolve to ink `#0B0B0C`, graphite `#242D33`, concrete `#D9DADB`, paper `#F5F6F7`, and white `#FFFFFF`. |
| `VAL-B2-COL-004` | Every primary action has ink/black fill and an accessible light label; signal-blue-filled primary actions are absent. |
| `VAL-B2-COL-005` | Persistent selection/highlight uses lime plus a non-colour indicator and exposes state semantically. |
| `VAL-B2-COL-006` | Signal blue is used for links, focus, registration, or active information paths and is not substituted for warning state. |
| `VAL-B2-COL-007` | Lime is not used as a success semantic and is never the sole carrier of state. |
| `VAL-B2-COL-008` | Normal text contrast is at least 4.5:1; large text and essential graphical boundaries are at least 3:1. |
| `VAL-B2-COL-009` | Decorative UI gradients are absent. A scientific scale is exempt only when labelled, source-appropriate, bounded to the visualization, and textually described. |
| `VAL-B2-COL-010` | Colour-name legends, labels, documentation, and accessible descriptions agree with the actual rendered tokens. |

## 4. Type

| ID | Requirement |
| --- | --- |
| `VAL-B2-TYPE-001` | First-party brand/UI/editorial/data typography uses exactly four role families: Tektur Variable, IBM Plex Sans, Newsreader, and IBM Plex Mono. KaTeX math fonts and the licensed icon font/system are scoped content/functional exceptions and never substitute for a first-party role. |
| `VAL-B2-TYPE-002` | Tektur font files are locally or framework bundled and produce no runtime third-party font request. |
| `VAL-B2-TYPE-003` | Wordmark, page h1, article h1, and major display headings compute to Tektur Variable after `document.fonts.ready`. |
| `VAL-B2-TYPE-004` | Long-form prose computes to Newsreader at 18–21px, 1.60–1.80 line height, and 62–68ch maximum measure. |
| `VAL-B2-TYPE-005` | Interface copy and controls compute to IBM Plex Sans; code, source metadata, technical values, and registration labels compute to IBM Plex Mono where specified. |
| `VAL-B2-TYPE-006` | Home wordmark renders at 52–68px on 375px and 88–120px on 1440px, line-height 0.88–0.98, with the approved `wght=600` and `wdth=100` role instance unless a checked-in role registry records an owner-approved replacement. |
| `VAL-B2-TYPE-007` | Article h1 renders at 34–44px on 375px viewport and 48–64px on 1440px viewport with line-height between 1.00 and 1.10. |
| `VAL-B2-TYPE-008` | No prose paragraph computes to Tektur or IBM Plex Mono. |
| `VAL-B2-TYPE-009` | Linked article section headings expose a signal-blue underline plus a non-colour link affordance and remain keyboard focusable. |
| `VAL-B2-TYPE-010` | Registration labels use a single site-wide tracking ratio within 0.01em for equivalent label classes. |
| `VAL-B2-TYPE-011` | Web Tektur is a checked-in Latin-subset variable WOFF2 exposing exactly the `wght` and `wdth` axes and is loaded through `next/font/local`; it produces no runtime third-party font request. |
| `VAL-B2-TYPE-012` | OG/X Tektur is a separate checked-in static TTF consumed only by the offline card renderer; it is not loaded by website CSS, `next/font/local`, or any runtime route. |
| `VAL-B2-TYPE-013` | Checked-in Tektur assets include the applicable OFL license text and metadata recording upstream source URL and revision, SHA-256 checksum for each binary, format and subset, `wght`/`wdth` ranges and defaults for the variable file, and style/weight for the static file. |
| `VAL-B2-TYPE-014` | Automated font inspection verifies every recorded checksum and binary property, rejects an undocumented variable axis, rejects a variable OG TTF, and records `wdth` with the label `width axis`. |

## 5. Grid, rails, and registration

| ID | Requirement |
| --- | --- |
| `VAL-B2-GRID-001` | Desktop major composition aligns to 12 columns, tablet to 8, and mobile to 4, with 8px base rhythm and 4px fine alignment. |
| `VAL-B2-GRID-002` | Home, shell, articles, discovery, market map, playground, and OG/X cards each contain at least one intentional shared grid, rail, or registration treatment. |
| `VAL-B2-GRID-003` | Grid/device layers never reduce body-text contrast below WCAG AA and never appear between prose glyphs and their background. |
| `VAL-B2-GRID-004` | Decorative grid/device layers are `aria-hidden`, pointer-inert, and absent from the accessibility tree. |
| `VAL-B2-GRID-005` | Registration crosses, crop marks, axes, ticks, and sequence labels align within 2px of a real column, boundary, baseline, axis, or state anchor. |
| `VAL-B2-GRID-006` | No page contains random unanchored technical glyphs, fabricated coordinates, or decorative data labels. |
| `VAL-B2-GRID-007` | Mobile evidence contains fewer or equal decorative registration devices than the corresponding desktop surface and preserves all content. |
| `VAL-B2-GRID-008` | Grid lines and neutral rails use concrete by default; focus/registration uses signal; active measured intervals may use lime. |

## 6. Shape, borders, and surfaces

| ID | Requirement |
| --- | --- |
| `VAL-B2-SURF-001` | First-party surface corner radii are only 0, 2, 4, 8, 16, or 24px; a full capsule radius is permitted only for a registered compact toggle, status, or filter whose geometry communicates grouping; circles and meaningful data marks are exempt. |
| `VAL-B2-SURF-002` | Standard borders are 1px; 2px borders occur only for focus, active, selected, or semantic emphasis. |
| `VAL-B2-SURF-003` | Dashed borders identify provisional, comparison, drop, or inactive boundaries and never decorate ordinary cards. |
| `VAL-B2-SURF-004` | Flat surfaces have no shadow. Raised shadows are neutral with blur ≤8px and floating shadows neutral with blur ≤20px; a checked-in surface registry names every variant, stacking purpose, and numeric neutral-colour/alpha tolerance. |
| `VAL-B2-SURF-005` | No first-party surface uses coloured shadow, glow, backdrop blur, glass, bevel, neumorphism, or chrome treatment. |
| `VAL-B2-SURF-006` | Every dark product surface other than an action or compact control qualifies as a bounded dark instrument; body, main, shell, ordinary prose, and ordinary content-card backgrounds remain paper/light. |
| `VAL-B2-SURF-007` | Paper grain, concrete texture, halftone, or dither preserves text contrast, is deterministic, and has documented ownership/license when external. |
| `VAL-B2-SURF-008` | Fully rounded capsules are limited to controls satisfying the registered compact toggle/status/filter exception; ordinary metadata, categories, actions, and navigation labels do not become pills. |
| `VAL-B2-SURF-009` | No shared component contains redundant nested borders unless the inner object is a real table, plot, media frame, or control group. |

## 7. Components

| ID | Requirement |
| --- | --- |
| `VAL-B2-COMP-001` | Primary actions are black filled with accessible light text. Secondary actions are outlined/transparent by default and may use lime only as a registered emphasized secondary that cannot be confused with selection; tertiary actions remain quiet. Disabled actions may use documented neutral treatments and are exempt from active-action colour requirements. |
| `VAL-B2-COMP-002` | Hover, pressed, disabled, selected, and focus-visible action states are visually distinct; only persistent states use persistent ARIA. Transient hover/pressed paint does not receive false `aria-selected`, `aria-pressed`, or `aria-current`. |
| `VAL-B2-COMP-003` | Segmented controls use one outer frame; active segments use ink/white or lime/ink and expose `aria-selected`, `aria-pressed`, or native state. |
| `VAL-B2-COMP-004` | Every input has a persistent visible label; placeholder text is not the label. |
| `VAL-B2-COMP-005` | Search clear, copy, sort, reset, and disclosure icons perform the labelled action and are keyboard operable. |
| `VAL-B2-COMP-006` | Cards group real content/interaction and do not create a homogeneous universal bento layout. |
| `VAL-B2-COMP-007` | Selected chips use lime plus text/icon/semantic confirmation. Status chips use dedicated semantic colours. |
| `VAL-B2-COMP-008` | Citation callouts use explicit source language and preserve claim-to-source relationships. |
| `VAL-B2-COMP-009` | Tables preserve semantic headers, use `aria-sort` where sortable, keep numeric alignment, and scroll within a labelled focusable region at narrow widths. |
| `VAL-B2-COMP-010` | Tables distinguish source states exactly: published value, `not disclosed` for an undisclosed value, and `n/a` only when genuinely inapplicable; `0`, blank ambiguity, and invented substitutes fail. |
| `VAL-B2-COMP-011` | Functional icons have an accessible label through adjacent text or explicit naming; decorative icons are hidden. |

## 8. Home and shell

| ID | Requirement |
| --- | --- |
| `VAL-B2-SHELL-001` | Desktop shell, mobile header, drawer, and footer render the v2 identity and share palette, display type, grid/rail, shape, and focus language. |
| `VAL-B2-SHELL-002` | Active navigation uses ink and/or lime plus a non-colour marker. A route with a corresponding navigation item has exactly one `aria-current="page"` on that matching link; a route without a corresponding navigation item has none. A heading or unrelated element never receives `aria-current` merely to satisfy a count. |
| `VAL-B2-SHELL-003` | The skip link is the first keyboard destination and becomes visible on focus. |
| `VAL-B2-SHELL-004` | Mobile drawer traps focus, closes on Escape, restores focus to its trigger, and makes obscured content inert. |
| `VAL-B2-SHELL-005` | Existing navigation hierarchy, accessible names, and href destinations remain unchanged except the visible product lockup string. |
| `VAL-B2-SHELL-006` | Home renders one dominant v2 hero, the exact descriptor, black primary action treatment, lime selection/highlight treatment, and board-derived structure without fabricated metrics. |
| `VAL-B2-SHELL-007` | All seven existing domain destinations remain visible, correctly named, and reachable from home. |
| `VAL-B2-SHELL-008` | Home and domain surfaces use indexed editorial rows/modules rather than a universal grid of equal marketing cards. |
| `VAL-B2-SHELL-009` | At 375px, 768px, 1024px, and 1440px widths, shell and home have no unintended horizontal document overflow. |

## 9. Article

| ID | Requirement |
| --- | --- |
| `VAL-B2-ART-001` | `/manipulation/action-chunking/` renders breadcrumb/domain context, one Tektur h1, one summary, and its existing factual review date, reading time, and citation count. |
| `VAL-B2-ART-002` | Article prose measure is 62–68ch with at least 20px mobile side padding and at least 32px desktop breathing room. |
| `VAL-B2-ART-003` | Article section links, inline citations, glossary definitions, and external sources have distinguishable treatments matching their semantics. |
| `VAL-B2-ART-004` | Dark article diagrams are bounded instruments with accessible inverse labels, a visible boundary, and an equivalent textual description. |
| `VAL-B2-ART-005` | Every figure caption states a takeaway and every external figure/texture credit exposes creator, source, and license. |
| `VAL-B2-ART-006` | Schematics identify themselves and do not imply a source-published mapping or measurement. |
| `VAL-B2-ART-007` | Equations expose accessible text or an equivalent explanation. |
| `VAL-B2-ART-008` | Tables remain inside the viewport through internal horizontal scrolling without reducing the prose measure below readable bounds. |
| `VAL-B2-ART-009` | Article title blocks contain no fabricated badge, author portrait, decorative cover image, or repeated domain eyebrow. |
| `VAL-B2-ART-010` | Existing article text, citation markers, references, see-also relationships, and linked-from relationships are unchanged by the v2 rollout. |

## 10. Discovery

| ID | Requirement |
| --- | --- |
| `VAL-B2-DISC-001` | Search exposes deterministic empty/default, query-results, filtered, no-results, loading, and error treatments where those states exist. |
| `VAL-B2-DISC-002` | Search-result titles, excerpts, facets, counts, and routes remain data-derived and do not fabricate context. |
| `VAL-B2-DISC-003` | Selected facets use lime plus semantic/shape confirmation and can be cleared and reset by keyboard. |
| `VAL-B2-DISC-004` | Search status updates are announced without moving focus unexpectedly. |
| `VAL-B2-DISC-005` | `/a-z/` and `/glossary/` retain deep links, keyboard reachability, source wording, and the shared v2 index treatment. |
| `VAL-B2-DISC-006` | Result/index rows use rules and editorial rhythm; they are not converted into a universal bento-card grid. |
| `VAL-B2-DISC-007` | At 375px, result titles, excerpts, filter controls, and clear/reset actions fit without document overflow. |

## 11. Visualizations and interactives

| ID | Requirement |
| --- | --- |
| `VAL-B2-VIZ-001` | Every stateful chart or interactive provides a visible or screen-reader-accessible current-state description. |
| `VAL-B2-VIZ-002` | Every series/state remains distinguishable without colour through label, marker, dash, geometry, or position. |
| `VAL-B2-VIZ-003` | Signal blue is the lead active path/series; lime is selection/highlight and is not an unlabeled second series. |
| `VAL-B2-VIZ-004` | Legends agree with actual rendered tokens and name the state or series rather than relying on colour names alone. |
| `VAL-B2-VIZ-005` | Source values remain source-backed and unknowns remain explicitly unknown. |
| `VAL-B2-VIZ-006` | Every schematic labels itself and every generated/non-source signal labels its generative status. |
| `VAL-B2-VIZ-007` | Native or equivalent controls work by keyboard, expose state, render visible focus, and return to a deterministic default through reset. |
| `VAL-B2-VIZ-008` | No explanatory sequence autoplays and no visualization contains decorative fake telemetry. |
| `VAL-B2-VIZ-009` | Reduced motion produces an immediate, understandable state without losing data, controls, or direct manipulation. |

## 12. Market map

| ID | Requirement |
| --- | --- |
| `VAL-B2-MAP-001` | Company count, record values, categories, source dates, funding values, and deep-link destinations match the canonical data registry. |
| `VAL-B2-MAP-002` | Every visible bubble size, position, colour, line, and timeline encoding has a labelled legend and textual equivalent. |
| `VAL-B2-MAP-003` | Selected company/filter state uses lime plus text/shape/semantic confirmation. |
| `VAL-B2-MAP-004` | Signal blue identifies an active relationship, link, focus path, or timeline signal and does not encode warning. |
| `VAL-B2-MAP-005` | Hover facts are also reachable through keyboard focus and persistent selection. |
| `VAL-B2-MAP-006` | A selected-company detail surface does not obscure required controls, remains dismissible, and does not trap focus unless implemented as a modal. |
| `VAL-B2-MAP-007` | Third-party company marks retain source identity and use one consistent neutral plate; no mark is redrawn in first-party style. |
| `VAL-B2-MAP-008` | At 375px the map provides a readable list/detail or simplified plot state with equivalent records and controls rather than an illegibly shrunken desktop canvas. |
| `VAL-B2-MAP-009` | Missing disclosures render `not disclosed`; contradictory source pointers remain visibly caveated rather than silently dropped. |

## 13. Playground

| ID | Requirement |
| --- | --- |
| `VAL-B2-PLAY-001` | The 3D canvas is a bounded ink/graphite instrument inside a light shell; body and shell do not become full-page dark UI. |
| `VAL-B2-PLAY-002` | The rendered model, joint limits, kinematic relationships, and trajectory values match the existing implementation and canonical data. |
| `VAL-B2-PLAY-003` | Passive geometry uses concrete/neutral tones, active path/focus uses signal blue, and selected joint/target uses lime plus a non-colour marker. |
| `VAL-B2-PLAY-004` | Controls use the shared black/lime/outlined hierarchy, persistent labels, semantic values, visible focus, and keyboard operation. |
| `VAL-B2-PLAY-005` | Reset returns camera, model, controls, state description, and trajectory to one deterministic documented default. |
| `VAL-B2-PLAY-006` | Current joint/target/trajectory state is available as text and updates when manipulation occurs. |
| `VAL-B2-PLAY-007` | Reduced motion constrains non-essential camera/model transitions without removing direct manipulation, controls, or immediate state feedback. |
| `VAL-B2-PLAY-008` | The visible product never presents `robot-atlas-trajectory` as brand identity; technical data/export contexts may retain it. |
| `VAL-B2-PLAY-009` | No particles, bloom, fake telemetry, ambient scanning, or unlabelled HUD is rendered. |
| `VAL-B2-PLAY-010` | WebGL-resolved colour mirrors exactly match runtime brand tokens and are parity-tested. |
| `VAL-B2-PLAY-011` | A static playground fallback is used only when WebGL is unavailable; reduced-motion preference alone never selects the static fallback. |

## 14. Imagery and licensing

| ID | Requirement |
| --- | --- |
| `VAL-B2-IMG-001` | First-party surfaces contain no AI-generated robots, synthetic labs, stock chrome heads, glowing brains, circuit wallpaper, or fake blueprints. |
| `VAL-B2-IMG-002` | Every external photograph, figure, or texture uses one §1.13 closed legal-basis enum value and records creator/owner, official source URL, retrieval date, content hash, attribution text, licence/permission reference, and preservation policy in canonical metadata and visible credit where required; automation verifies the record and bytes, not a legal opinion. |
| `VAL-B2-IMG-003` | Every technical diagram is truthful to its source or explicitly labelled as an original schematic/render. |
| `VAL-B2-IMG-004` | Material texture never impersonates evidence, sensor output, or measured data. |
| `VAL-B2-IMG-005` | Image alt text communicates content/function and does not repeat adjacent captions or use technical repository identity as public branding. |
| `VAL-B2-IMG-006` | Third-party marks retain required attribution and are not modified beyond consistent sizing, placement, and neutral-plate treatment. |

## 15. Open Graph and X

| ID | Requirement |
| --- | --- |
| `VAL-B2-OG-001` | The generated corpus contains exactly 48 PNG files: one site card plus one card for each of the 47 published articles listed in the sealed matrix below. |
| `VAL-B2-OG-002` | Every PNG is exactly 1200×630, uses a 1.9047619:1 aspect ratio, is at least 5KB, and serves from the static export with `image/png`. |
| `VAL-B2-OG-003` | Site card contains exact `Robot Wiki` and exact descriptor. |
| `VAL-B2-OG-004` | Every article card contains the real title, domain, review year, reference count, and compact `Robot Wiki`; it omits the descriptor. |
| `VAL-B2-OG-005` | Every article route points to a unique slug-bearing asset URL; every article asset is byte-distinct from every other article asset and the site card. |
| `VAL-B2-OG-006` | Non-article destinations point to the single site card. |
| `VAL-B2-OG-007` | Every card renders the registered static Tektur instance mapped to the approved web Tektur Variable role, plus exact v2 palette/grid/rail/registration language with runtime/renderer parity. |
| `VAL-B2-OG-008` | Cards contain no v1 public identity, old descriptor, fake chart, random ornament, screenshot collage, tiny UI, progress state, AI robot, or unlicensed image. |
| `VAL-B2-OG-009` | Every audited route declares one `twitter:card=summary_large_image`, absolute apex-domain image URL, 1200/630 metadata, and meaningful alt text of at least 15 characters. |
| `VAL-B2-OG-010` | Card generation is deterministic: two clean generations from identical inputs produce identical hashes for all 48 files. |

## 16. Accessibility and responsive behavior

| ID | Requirement |
| --- | --- |
| `VAL-B2-A11Y-001` | Every exported public route derived from the canonical route/content registries has zero Axe violations after its required state settles. |
| `VAL-B2-A11Y-002` | Every interactive element has a visible 2px signal-blue focus outline with at least 2px offset or an equally visible component-specific treatment. |
| `VAL-B2-A11Y-003` | Every interaction in the state matrix can be reached, operated, and exited with keyboard alone. |
| `VAL-B2-A11Y-004` | Colour is never the only state distinction, including links, navigation, filters, charts, market map, and playground. |
| `VAL-B2-A11Y-005` | Reduced-motion preference disables non-essential movement and preserves understandable final states. |
| `VAL-B2-A11Y-006` | Forced-colours mode preserves content, focus, selected state, controls, and essential chart boundaries. |
| `VAL-B2-A11Y-007` | Three independent §1.14 gates pass: literal `320×800` CSS-px reflow at DPR 1, sealed halved-CSS-viewport/DPR-2 200% zoom-equivalent (or a proven pinned true-zoom profile), and injected author-layer 200% text-only resizing with doubled computed sizes. Content remains available without two-dimensional document scrolling except registered bounded tables/visualizations. |
| `VAL-B2-A11Y-008` | Every exported public route has no unintended horizontal document overflow at each applicable 375, 768, 1024, and 1440px sweep width. |
| `VAL-B2-A11Y-009` | Decorative brand devices are absent from the accessibility tree and do not alter accessible names. |
| `VAL-B2-A11Y-010` | Scrollable tables, map regions, diagrams, and playground canvases have names, keyboard access where interactive, and textual alternatives. |

## 17. Cross-surface continuity

| ID | Requirement |
| --- | --- |
| `VAL-B2-CONT-001` | Home, shell, domain landing, article, discovery, market map, playground, and OG/X evidence all share the same public identity, type roles, palette, structural-device grammar, shape ladder, and action hierarchy. |
| `VAL-B2-CONT-002` | No audited surface mixes a v1 wordmark, descriptor, old blue, old paper token, or IBM-Plex-Sans brand display with v2 identity. |
| `VAL-B2-CONT-003` | Light surfaces dominate editorial reading; dark surfaces remain bounded instruments across articles, market map, playground, and social artwork. |
| `VAL-B2-CONT-004` | Black primary actions, lime selection/highlight, and signal-blue link/focus behavior remain semantically consistent across all audited routes. |
| `VAL-B2-CONT-005` | Grid/rail/registration devices vary by composition but retain shared line weight, alignment, colour semantics, and purposeful placement. |
| `VAL-B2-CONT-006` | Route, content, citation, data, accessibility, and interaction baselines pass alongside visual checks; visual parity cannot waive a truth regression. |

## 18. Autonomous visual evidence

| ID | Requirement |
| --- | --- |
| `VAL-B2-EVID-001` | Every row in the route/viewport/state matrix produces deterministic evidence after fonts, data, and transitions settle, with ordered `steps[]` and `captures[]` when a row has multiple phases. |
| `VAL-B2-EVID-002` | Evidence includes the registered full-page capture plus bounded close-ups for identity, action states, article type/figure, map state, playground state, and OG card; each capture is a typed `captures[]` member tied to the step that produced it. |
| `VAL-B2-EVID-003` | Computed-style evidence records public text, font family, font size/line height, core token values, radii, shadow/filter values, focus treatment, overflow, and relevant ARIA state. |
| `VAL-B2-EVID-004` | The worker compares captures against both approved references using the checked-in milestone-1 reference-feature rubric in §1.12 and autonomously resolves every failed applicable anchor; contract literals override image text/hex variation and raw cross-composition pixel similarity is prohibited. |
| `VAL-B2-EVID-005` | Evidence is rejected if fallback fonts are active, async state is incomplete, animation is in flight, the viewport differs, or the state sequence was not followed. |
| `VAL-B2-EVID-006` | The final evidence index records every matrix ID, route, viewport, state, capture path, automated result, and any approved local exception. |
| `VAL-B2-EVID-007` | A green automated run without a complete §1.12 rubric result is insufficient; an unstructured visual judgment, averaged score that hides a failed anchor, raw cross-composition pixel score, or comparison without automated truth/accessibility gates is also insufficient. |
| `VAL-B2-EVID-008` | The public-route suite derives a non-empty population by set equality among module registry, fixed-route registry, app route inventory, sitemap, and export files; it runs browser render, computed-style, Axe, keyboard, forced-colours, reflow, overflow, resource/font, and residue checks for every route × declared state. The 404 is registered separately and cannot inflate the public-destination count. |
| `VAL-B2-EVID-009` | The interactive-state suite derives non-empty source exports and rendered production mounts, proves three-way equality with the interactive registry using stable mount IDs/config fingerprints, reconciles DOM controls/actions, then runs the exact bounded cases from §1.15 for every source and materially distinct mount; expected and observed case counts must match and full Cartesian coverage is not required. |
| `VAL-B2-EVID-010` | The 27-row route/viewport/state matrix remains the mandatory deep screenshot and reference-comparison matrix and supplements, rather than bounds or replaces, registry-derived exhaustive sweeps. |
| `VAL-B2-EVID-011` | Named automated evidence suites cover deterministic search loading/error, reduced motion, forced colours, literal `320×800` CSS-px reflow, sealed halved-CSS-viewport/DPR-2 200% zoom-equivalent profiles, and injected 200% text-only resizing even when those states are not separate deep-screenshot rows; Playwright is not described as controlling browser-chrome zoom. |
| `VAL-B2-EVID-012` | The five-route home/article/search/market-map/playground set may be used only as an iterative smoke set and is never sufficient final release evidence. |

## 19. Exact route, viewport, and state matrix

Every row is mandatory. A “default” state means a clean navigation with no persisted local state. Interaction steps use accessible names rather than implementation selectors.

| Evidence ID | Route | Viewport | Required state and capture |
| --- | --- | --- | --- |
| `B2-EV-001` | `/` | 1440×900 | Default at top: full home, dominant identity, exact descriptor, black primary action, lime selection/highlight example, domain index, shared shell. |
| `B2-EV-002` | `/` | 375×812 | Default at top: compact identity, simplified registered devices, domain index, no overflow. |
| `B2-EV-003` | `/` | 375×812 | Open the navigation drawer from its trigger; prove focus enters the close control then the first taxonomy action, Tab and Shift+Tab stay trapped at both boundaries, background is inert, Escape closes, and focus returns to the trigger. |
| `B2-EV-004` | `/` | 1440×900 | Capture three realistic keyboard subflows from fresh state: skip link → main; shell wordmark → search entry; hero primary action → first domain link. Record focus order and focus-not-obscured for each rather than asserting one artificial uninterrupted sequence. |
| `B2-EV-005` | `/manipulation/` | 1440×900 | Default domain landing: current navigation, domain title, complete indexed article inventory, shared structural language. |
| `B2-EV-006` | `/manipulation/` | 375×812 | Default domain landing: all content and links available, reduced device density, no overflow. |
| `B2-EV-007` | `/manipulation/action-chunking/` | 1440×900 | Article top: breadcrumb, title, summary, factual metadata, opening prose, and inline citation treatment. |
| `B2-EV-008` | `/manipulation/action-chunking/` | 1440×900 | Scroll to `Temporal ensembling and its limits`; focus the heading copy-link affordance and capture heading treatment, bounded dark diagram, caption, creator/source/licence credit, and bound textual alternative. Citation-chip interaction is graded by `brand-v2-article-interactions`, not this heading row. |
| `B2-EV-009` | `/manipulation/comparison-matrix/` | 375×812 | Use the real comparison table: capture labelled internal horizontal scroll, associated caption/headers, keyboard focus, a non-zero scroll position, and zero document overflow. |
| `B2-EV-010` | `/manipulation/action-chunking/` | 1024×768 | Article top and first wide figure boundary: expected desktop shell breakpoint, reading measure, figure rail, no collision. |
| `B2-EV-011` | `/search/` | 1440×900 | Clean default/empty query: labelled search, discovery structure, no fabricated results. |
| `B2-EV-012` | `/search/` | 1440×900 | Enter `action chunking`; deterministically select the `Methods` entity-type facet; capture populated results, lime-plus-marker selection, live status, clear/reset, URL sync, and retained input focus. |
| `B2-EV-013` | `/search/` | 375×812 | Query `action chunking`; capture result title/excerpt, Methods facet, clear/reset, keyboard focus, and no overflow. |
| `B2-EV-014` | `/search/` | 375×812 | Enter neutral deterministic unmatched query `quartz-lantern-7319`; capture no-results wording and keyboard-reachable recovery without using a brand-residue string. |
| `B2-EV-015` | `/a-z/` | 1440×900 | Default index: alphabet/deep-link structure, row rhythm, focus on first available letter anchor. |
| `B2-EV-016` | `/a-z/` → `/glossary/` | 375×812 | Click the first glossary-term entry from A–Z (or, if A–Z exposes article-only rows, enter an article and activate its first inline Term-to-glossary link); capture the glossary fragment target, focus/scroll restoration, and definition/link distinction. |
| `B2-EV-017` | `/market-map/` | 1440×900 | From no selection, capture Grid (default), Bubble/scatter, and Funding timeline views in order; each has complete controls, view state, legends, URL state, and current-state description. |
| `B2-EV-018` | `/market-map/` | 1440×900 | In Bubble/scatter, select the first keyboard-reachable company mark; capture lime-plus-marker selection, persistent details, official neutral logo plate, source facts, and dismiss control. |
| `B2-EV-019` | `/market-map/` | 1440×900 | Dismiss the selected company, prove no selected mark/details remain and focus returns logically; then select and clear one deterministic filter, proving URL/state/legend restoration. |
| `B2-EV-020` | `/market-map/` | 375×812 | Select then deselect the first company in the mobile list/detail or simplified plot; capture equivalent facts/controls, logical focus restoration, and no overflow. |
| `B2-EV-021` | `/playground/` | 1440×900 | With WebGL available, deterministic default: active nonblank canvas, light shell, bounded dark instrument, labelled controls, canonical model landmarks, and default textual state. |
| `B2-EV-022` | `/playground/` | 1440×900 | Change the first keyboard-operable joint/target control by one step; capture lime selection, signal path, model-pixel change, and numeric/text state update. |
| `B2-EV-023` | `/playground/` | 1440×900 | Import the canonical valid two-keyframe `robot-atlas-trajectory` fixture, then play it; capture two-keyframe count, truthful path/intermediate geometry, legend/labels, and textual playback state. |
| `B2-EV-024` | `/playground/` | 1440×900 | After changed pose and imported trajectory, activate `Reset pose` and prove pose/camera/default state restore while the trajectory remains; then activate `Clear trajectory` and prove keyframes/path clear without conflating the two actions. |
| `B2-EV-025` | `/playground/` | 375×812 | With WebGL available, require a visible nonblank canvas plus one control change and textual update; the unavailable-WebGL fallback is tested separately and cannot satisfy this row. |
| `B2-EV-026` | `/` → `/credits/` | 1440×900 | Reach Credits by a visible site-chrome link, then capture imagery/texture/company-mark provenance, licence/legal-basis fields, and keyboard-reachable source links. |
| `B2-EV-027` | `/` | 768×1024 | Tablet default: 8-column composition with the expected compact-header/drawer shell mode (desktop sidebar absent), identity and domain routes present, drawer operable, no overflow. |

For every row:

1. wait for `document.fonts.ready`;
2. wait for network/data idle appropriate to the app;
3. disable or settle non-essential transitions;
4. perform the exact interaction sequence;
5. run Axe;
6. capture full-page and required close-up evidence;
7. record computed-style and semantic-state evidence;
8. complete every applicable §1.12 rubric anchor against both references; contract literals override image variation and raw cross-composition pixel similarity is prohibited;
9. fail on any contract violation.

These 27 rows are the deep screenshot matrix, not the complete route inventory. Final release additionally requires the registry-derived exhaustive suites in `VAL-B2-EVID-008` and `VAL-B2-EVID-009`. The home/article/search/market-map/playground subset is permitted only for iterative smoke checks.

The following named suites provide mandatory non-row evidence:

| Suite | Required evidence |
| --- | --- |
| `brand-v2-route-flows` | Every derived public destination plus separately registered 404: latest route state, metadata/resource/font instrumentation, Axe, keyboard, forced colours, reflow/zoom/text resize, overflow, history/deep-link restoration, and residue. |
| `brand-v2-article-interactions` | Every article heading copy-link, citation/Term hover-focus parity, table keyboard associations, async focus retention, References/See also/Linked from behavior, and bound SVG/canvas alternatives. |
| `brand-v2-market-map-states` | All three views; every filter/toggle/radio state; URL sync and history; selected/unselected/details/dismiss; hover-focus-tooltip parity; loading/error/empty/unavailable where implemented; mobile/desktop breakpoints. |
| `brand-v2-playground-states` | FK, IK, keyboard target, import/export, malformed/mismatched import error, two-keyframe playback, separate Reset pose/Clear trajectory, active WebGL, unavailable fallback, deterministic DPR/resize, reduced-motion live manipulation. |
| `brand-v2-search-states` | Latest-request-wins, partial-group errors, loading, neutral no-result, Methods facet, URL sync/history restoration, live status, focus retention, recovery, Axe, computed styles, and residue. |
| `brand-v2-reduced-motion` | All registered motion-bearing interactives under `reduce`, including direct playground manipulation and active live canvas; proves immediate state feedback with no static-fallback substitution. |
| `brand-v2-forced-colours` | Every registered interactive plus every route × declared state; preserves content, focus, selection, controls, semantics, and essential boundaries. |
| `brand-v2-reflow-320-200` | Separate literal `320×800` CSS-px/DPR-1 reflow, halved-CSS-viewport/DPR-2 200% zoom-equivalent (or proven pinned true zoom), and injected author-layer 200% text-only runs across every destination and exact bounded declared-state case. |

## 20. Exact 48-OG matrix

The current published registry contains 47 articles. The release corpus is exactly the following 48 files.

| # | Route owner | Required exported asset |
| ---: | --- | --- |
| 1 | Site and all non-article destinations | `/og/robot-wiki.png` |
| 2 | `/adjacent/autonomous-vehicles/` | `/og/adjacent/autonomous-vehicles.png` |
| 3 | `/adjacent/drones/` | `/og/adjacent/drones.png` |
| 4 | `/adjacent/space/` | `/og/adjacent/space.png` |
| 5 | `/adjacent/surgical/` | `/og/adjacent/surgical.png` |
| 6 | `/classical/control/` | `/og/classical/control.png` |
| 7 | `/classical/grasp-planning/` | `/og/classical/grasp-planning.png` |
| 8 | `/classical/kinematics/` | `/og/classical/kinematics.png` |
| 9 | `/classical/motion-planning/` | `/og/classical/motion-planning.png` |
| 10 | `/classical/perception/` | `/og/classical/perception.png` |
| 11 | `/classical/scene-representation/` | `/og/classical/scene-representation.png` |
| 12 | `/classical/state-estimation/` | `/og/classical/state-estimation.png` |
| 13 | `/data-hardware/data-bottleneck/` | `/og/data-hardware/data-bottleneck.png` |
| 14 | `/data-hardware/datasets/` | `/og/data-hardware/datasets.png` |
| 15 | `/data-hardware/evaluation-crisis/` | `/og/data-hardware/evaluation-crisis.png` |
| 16 | `/data-hardware/hardware-taxonomy/` | `/og/data-hardware/hardware-taxonomy.png` |
| 17 | `/data-hardware/industrial-deployment/` | `/og/data-hardware/industrial-deployment.png` |
| 18 | `/data-hardware/teleop-rigs/` | `/og/data-hardware/teleop-rigs.png` |
| 19 | `/frontier/bear-case/` | `/og/frontier/bear-case.png` |
| 20 | `/frontier/competing-theses/` | `/og/frontier/competing-theses.png` |
| 21 | `/frontier/dexterity/` | `/og/frontier/dexterity.png` |
| 22 | `/frontier/generalization/` | `/og/frontier/generalization.png` |
| 23 | `/frontier/reliability-gap/` | `/og/frontier/reliability-gap.png` |
| 24 | `/frontier/safety-and-assurance/` | `/og/frontier/safety-and-assurance.png` |
| 25 | `/manipulation/action-chunking/` | `/og/manipulation/action-chunking.png` |
| 26 | `/manipulation/bc-foundations/` | `/og/manipulation/bc-foundations.png` |
| 27 | `/manipulation/comparison-matrix/` | `/og/manipulation/comparison-matrix.png` |
| 28 | `/manipulation/cross-embodiment/` | `/og/manipulation/cross-embodiment.png` |
| 29 | `/manipulation/diffusion-policy/` | `/og/manipulation/diffusion-policy.png` |
| 30 | `/manipulation/generalist-policies/` | `/og/manipulation/generalist-policies.png` |
| 31 | `/manipulation/hierarchical/` | `/og/manipulation/hierarchical.png` |
| 32 | `/manipulation/knowledge-insulation/` | `/og/manipulation/knowledge-insulation.png` |
| 33 | `/manipulation/pi-line/` | `/og/manipulation/pi-line.png` |
| 34 | `/manipulation/realtime-execution/` | `/og/manipulation/realtime-execution.png` |
| 35 | `/manipulation/rl-finetuning/` | `/og/manipulation/rl-finetuning.png` |
| 36 | `/manipulation/vla-models/` | `/og/manipulation/vla-models.png` |
| 37 | `/rl-sim2real/humanoid-wbc/` | `/og/rl-sim2real/humanoid-wbc.png` |
| 38 | `/rl-sim2real/legged-locomotion/` | `/og/rl-sim2real/legged-locomotion.png` |
| 39 | `/rl-sim2real/parallel-sim-rl/` | `/og/rl-sim2real/parallel-sim-rl.png` |
| 40 | `/rl-sim2real/reward-design-mpc/` | `/og/rl-sim2real/reward-design-mpc.png` |
| 41 | `/rl-sim2real/rl-for-robotics/` | `/og/rl-sim2real/rl-for-robotics.png` |
| 42 | `/rl-sim2real/sim2real-transfer/` | `/og/rl-sim2real/sim2real-transfer.png` |
| 43 | `/rl-sim2real/why-rl-locomotion/` | `/og/rl-sim2real/why-rl-locomotion.png` |
| 44 | `/world-models/generative-sim/` | `/og/world-models/generative-sim.png` |
| 45 | `/world-models/generative-video/` | `/og/world-models/generative-video.png` |
| 46 | `/world-models/jepa/` | `/og/world-models/jepa.png` |
| 47 | `/world-models/latent-dynamics/` | `/og/world-models/latent-dynamics.png` |
| 48 | `/world-models/taxonomy/` | `/og/world-models/taxonomy.png` |

The site card at row 1 MUST be used by exactly these 14 non-article destinations:

1. `/`
2. `/a-z/`
3. `/market-map/`
4. `/playground/`
5. `/glossary/`
6. `/credits/`
7. `/search/`
8. `/adjacent/`
9. `/classical/`
10. `/data-hardware/`
11. `/frontier/`
12. `/manipulation/`
13. `/rl-sim2real/`
14. `/world-models/`

The generator MUST also derive the registry population and fail if registry truth no longer equals this sealed 47-article list. A future publish requires an owner-approved contract update before the expected corpus can exceed 48.

## 21. Zero-residue sweeps

Residue checks run over authored source, metadata, static export HTML/CSS/JS where practical, generated OG text sources, visual snapshots, and generated card pixels/OCR.

| ID | Sweep | Required result |
| --- | --- | --- |
| `VAL-B2-RES-001` | Public identity strings: `robot-wiki`, `Robot-Wiki`, `ROBOT WIKI` | Zero public-display matches. Technical identifiers, URLs, paths, historical docs, and this contract are allowlisted by exact path/context. |
| `VAL-B2-RES-002` | Previous descriptor: `Robotics encyclopaedia` and US-spelling variant | Zero runtime, metadata, generated-artwork, and public-image matches. Historical evidence and this contract are allowlisted. |
| `VAL-B2-RES-003` | Previous signal values: `#245edb`, `#245EDB`, `rgb(36, 94, 219)` | Zero runtime/generated matches except explicitly archived historical evidence. |
| `VAL-B2-RES-004` | Previous paper/surface values and token names that conflict with v2 semantics, including `#f4f3ef`, `#fbfaf7`, and `#eceae4` | Zero active visual-token or renderer matches; data/content literals require review rather than blind replacement. |
| `VAL-B2-RES-005` | IBM Plex Sans computed on public wordmark, page h1, article h1, or major display heading | Zero rendered matches. |
| `VAL-B2-RES-006` | Blue-filled primary actions and lime-as-success semantics | Zero rendered matches across the matrix. |
| `VAL-B2-RES-007` | v1-only restrictions encoded as active tests, such as home-only grid, no bounded dark surfaces, no permitted elevation, or 2/3/4-only radius | Zero active acceptance assertions after replacement by `VAL-B2*` criteria. Historical comments must be labelled superseded. |
| `VAL-B2-RES-008` | Generic visual residue: glass, glow, coloured shadow, universal bento, random registration glyphs, decorative telemetry, AI robot imagery | Zero rendered matches or asset inventory hits. |
| `VAL-B2-RES-009` | Generated corpus drift: stale site card, missing article card, extra draft card, duplicate article hash, old font/palette/text | Zero findings across exactly 48 PNGs. |
| `VAL-B2-RES-010` | Mixed identity in accessible names, alt text, structured metadata, page titles, manifests, and social metadata | Zero public-facing mixed-system matches; technical URL values remain allowlisted. |

Allowlisting MUST be exact and documented. Broad directory exclusions are prohibited for runtime code, tests, generated assets, or exported output.

## 22. Assertion enforcement map

| ID | Requirement |
| --- | --- |
| `VAL-B2-GOV-001` | Every `VAL-B2*` assertion has a non-vacuous checked-in enforcement-map row satisfying the sealed schema in `VAL-B2-GOV-002`; an unmapped assertion, nonexistent target, untagged result, omitted member, or empty applicable population blocks release. |

Milestone 1 MUST create the checked-in assertion-enforcement map for the complete contract. Documentation does not claim that implementation artifact already exists. Every row uses this exact schema:

| Field | Requirement |
| --- | --- |
| Assertion ID | One existing `VAL-B2*` ID, unique in the map. |
| Canonical population source | Exact registry, manifest, inventory, or evidence-matrix source; a prose description or hard-coded sample is insufficient. |
| `enforcementTargets[]` | Non-empty array of exact existing test file plus reporter-visible test title entries and/or exact mandatory evidence-row IDs. Composite assertions list every required target; multi-phase targets may bind ordered `steps[]` and `captures[]`. |
| Enforcement mode | `automated-machine`, `generated-image`, `browser-state`, or `autonomous-visual`; machine claims cannot use visual-only mode and visual claims cannot use source-only mode. |
| Machine predicate | Executable expected/actual predicate, including non-empty population and omission behavior. |
| Produced result | Machine-readable result tagged with the assertion ID and population member. |

Targets MUST exist when the map is validated. File-only references, future test names, broad suite names without an exact test title, untagged pass lines, and evidence rows that do not prove the assertion fail the schema. Mutation tests remove one row, target, result, population member, evidence member, and the entire applicable population in turn; every mutation MUST fail.

## 23. Release commands and evidence gate

Milestone 1, **Authority and validation migration**, MUST create `brand-v2.spec.ts`, `brand-v2-og.spec.ts`, the canonical registries, immutable baseline SHA/manifests, assertion-enforcement map, mutation tests, expected-red v1 drift archive, and a static-export Playwright fixture/config. That fixture MUST use either an existing checked-in dependency-free static server or a direct pinned project dependency; it MUST NOT rely on an unpinned machine-global server. Existing functional/accessibility gates remain green; brand-v2 visual suites are expected red where implementation still carries v1 drift and need not be green to close milestone 1. Each assertion turns green only in the feature/milestone responsible for it. Every suite and assertion MUST be green by milestone 8 final release, and every milestone 2–8 worker runs the suites while owning only its assigned convergence.

Before a claim may depend on image decoding, OCR, font inspection/subsetting, or raster generation, the required tool MUST be either a direct versioned project dependency or a checked-in deterministic script whose runtime and inputs are pinned. Current acceptance MUST NOT depend on machine-only Tesseract, fontTools, sharp, or equivalent undeclared binaries. A tool version and checksum/lockfile identity is recorded in the evidence envelope.

The release run starts from a clean tracked worktree, or from a recorded Git tree hash when unrelated owner changes make a clean worktree impossible. In both cases it records the Git commit/tree identity, manifest root hashes, and all tool/runtime versions. Mutation tests use in-memory or temporary fixtures wherever feasible; a tracked-repository mutation is allowed only with an explicit pre-mutation hash, automatic restoration, and post-restoration equality proof.

Until the milestone-1 suites, registries, baseline manifests, and enforcement map exist, there is no valid dedicated brand-v2 release command. Milestone 1 proves the expected-red migration baseline without misreporting it as release-ready. Once the infrastructure exists, a dedicated release command MUST include both core suites and every named exhaustive/special-state suite; it becomes fully green only by milestone 8.

At minimum, run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run generate:og-cards
npx playwright test
```

Then run `brand-v2.spec.ts`, `brand-v2-og.spec.ts`, the registry-derived public-route and interactive-state sweeps, `brand-v2-search-states`, `brand-v2-reduced-motion`, `brand-v2-forced-colours`, `brand-v2-reflow-320-200`, and the dedicated computed-style, residue, image-dimension/hash, accessibility, keyboard, responsive-overflow, and visual-evidence suites introduced by the implementation.

A release passes only when:

- every `VAL-B2*` criterion passes;
- all 27 visual-evidence rows pass;
- every exported public route passes registry-derived browser, computed-style, Axe, overflow, and residue sweeps;
- every registered interactive passes the exact non-zero bounded §1.15 visual-state/contract cases with matching expected/observed counts;
- search loading/error, reduced motion, forced colours, and 320px/200% reflow named suites pass;
- exactly 48 OG/X cards pass dimensions, text, font, palette, uniqueness, route ownership, and deterministic-hash checks;
- source and generated-output residue sweeps return zero unallowlisted matches;
- the complete assertion-enforcement map contains no unmapped `VAL-B2*` assertion;
- every applicable §1.12 reference-feature anchor passes independently;
- no truth, route, citation, data, accessibility, or interaction baseline regresses.

No human approval step is required for routine validation. The implementing worker owns the autonomous comparison and correction loop. A locked-foundation change still requires explicit owner approval before this contract is revised.

## 24. Review-corrected sealed assertions

These assertions close the first-pass review gaps. They are additive, collision-free, and pending until their responsible milestone supplies tagged automation/evidence.

### 24.1 Baseline and approved deltas

| ID | Requirement |
| --- | --- |
| `VAL-B2-BASE-009` | Milestone 1 starts from a clean tracked worktree or records the exact Git tree hash used, then records the immutable baseline commit/tree identity, manifest root hashes, pinned tool/runtime versions, and generated hashed manifests for routes, prose, accessible names, relationship graphs, navigation, market-map/playground truth, assets/SVG semantics, interactive sources/mounts, and behavioral defaults. Baseline creation is implementation work and is not claimed complete by this document. |
| `VAL-B2-BASE-010` | Every post-baseline difference is rejected unless a checked-in approved-delta allowlist entry names the baseline manifest/member, old/new value or hash, reason, owner approval, responsible milestone, affected assertions, and expiry/permanence; broad path, wildcard, or “visual redesign” allowances fail. |
| `VAL-B2-BASE-011` | Baseline generators are deterministic and mutation-proven: deleting a route, prose block, relationship, navigation entry, market record, playground constant, asset usage, SVG semantic node, source export, mount, or behavioral default causes a tagged failure. Mutations use in-memory/temporary fixtures where feasible; any tracked-tree mutation proves pre/post hash equality and automatic restoration. |
| `VAL-B2-BASE-012` | The baseline preserves accessible names and article text except the exact approved public brand-string migration and fact-preserving caption/attribution additions; changing visible first-party creator labels from `robot-wiki` to `Robot Wiki` is permitted while factual authorship remains unchanged. |
| `VAL-B2-BASE-013` | Baseline comparison distinguishes published values, undisclosed values (`not disclosed`), and genuinely inapplicable values (`n/a`) and fails any migration that collapses those states. |

### 24.2 Typography and spacing

| ID | Requirement |
| --- | --- |
| `VAL-B2-TYPE-015` | A checked-in type-role registry assigns measurable Tektur `wght`/`wdth` values to home wordmark, shell wordmark, page h1, article h1, section display, and display numerals; rendered computed axis values match the registry at every declared viewport. |
| `VAL-B2-TYPE-016` | The static OG TTF is mapped to one specific registered web Tektur role instance, and binary inspection proves its style/weight/width instance matches that mapping. |
| `VAL-B2-TYPE-017` | Font `cmap` inspection covers every code point in every assigned web and OG string; a glyph-probe render proves no assigned string uses per-glyph fallback. OCR is secondary evidence only. |
| `VAL-B2-TYPE-018` | Page h1, article h1, section display, supporting h2/h3, UI body, data/control, and registration-label populations each stay inside their sealed mobile/desktop size, line-height, family, weight, and measure ranges, with non-empty populations or an explicit inapplicable verdict. |
| `VAL-B2-SPACE-001` | Executable spacing tokens expose exactly the fixed ladder `4, 8, 12, 16, 24, 32, 48, 64, 96, 128` px; every first-party spacing value resolves to the ladder unless a registered canvas/viewport or one-pixel optical exception names its geometry reason. |
| `VAL-B2-SPACE-002` | Page-inline padding is at least 20px mobile, 32px tablet, and 48px desktop on every public destination, except a registered full-bleed canvas whose controls/text retain those insets. |
| `VAL-B2-SPACE-003` | Major section separation is 48–80px mobile and 64–128px desktop; component interiors are 12–24px and related-control gaps 4–12px, measured from registered section/control populations. |
| `VAL-B2-SPACE-004` | The wide editorial frame remains within 1280–1440px on desktop, reading columns remain 62–68ch, and full-frame index/map/playground exceptions are registered and keep readable inner rails. |
| `VAL-B2-SPACE-005` | A page-frame registry identifies frame owner, full-bleed exceptions, optical corrections, and canvas-derived dimensions; missing ownership, unregistered off-ladder geometry, or content/control collision fails. |
| `VAL-B2-SPACE-006` | Collision sweeps cover page h1, section headings, UI/data labels, rails/devices, overlays, focused controls, and full-bleed figures at every layout breakpoint; any overlap, clipping, focus obscuration, or unreadable wrap fails. |

### 24.3 Registries, surfaces, controls, semantics, and material

| ID | Requirement |
| --- | --- |
| `VAL-B2-GRID-009` | Every grid, rail, registration, texture, and decorative-device layer carries a stable annotation/registry ID naming owner surface, structural purpose, anchor geometry, decorative/semantic classification, pointer/ARIA behavior, and allowed viewports. |
| `VAL-B2-GRID-010` | Computed rendered casing (`innerText` plus `text-transform`) is audited for every registered label, so CSS case conversion cannot hide identity, notation, or natural-language drift. |
| `VAL-B2-SURF-010` | Every product surface carries a stable variant ID whose registry row names flat/raised/floating/bounded-dark level, stacking purpose, radius, border, shadow tolerance, and allowed owners; source, registry, and rendered populations are equal. |
| `VAL-B2-SURF-011` | Named representative surfaces on home, article, discovery, market map, playground, and social artwork satisfy the §1.12 material predicates: declared deterministic treatment, passing text/graphic contrast, texture-free prose glyph grounds, and the §1.13 ownership/legal-basis/provenance record when external. |
| `VAL-B2-COMP-012` | Semantic tokens `ok`, `warn`, `error`, and `destructive` exist separately from brand accents; each has distinct meaning, text/icon/shape cue, measured contrast, and renderer parity wherever used. |
| `VAL-B2-COMP-013` | A control/state registry assigns stable IDs, owner route/mount, action, persistent ARIA, disabled exceptions, target-size requirement, pointer alternative, and supported states; DOM-discovered controls and registered controls/actions reconcile exactly. |
| `VAL-B2-COMP-014` | Interactive targets meet WCAG 2.2 target-size requirements or register an accepted inline/spacing exception with an equivalent pointer alternative; keyboard operation never substitutes for a required pointer alternative. |
| `VAL-B2-COMP-015` | Transient hover and active paint is never serialized as persistent selected/pressed/current ARIA; disabled actions expose native or valid ARIA disabled state, remain out of activation paths, and use their registered neutral exception treatment. |
| `VAL-B2-COMP-016` | Anti-bento and nested-frame rubrics use the §1.12 thresholds: at most three adjacent siblings with one repeated surface/heading/action signature, zero redundant four-sided nested frames, frame depth at most two with the inner-frame exception limited to registered tables/plots/media/control groups, and only registered pill/capsule exceptions; every population is non-empty. |

### 24.4 Interactive corpus and source/render truth

| ID | Requirement |
| --- | --- |
| `VAL-B2-VIZ-010` | Milestone 1 baselines the current 52 interactive source files and 62 production mounts, but release checks derive both counts from source exports and rendered mounts; source exports, production mounts, and registry entries have three-way equality, stable mount IDs/config fingerprints, and omission/empty-population mutation tests. |
| `VAL-B2-VIZ-011` | Every source and materially distinct mount declares the exact bounded §1.15 case set: each discrete option independently; slider min/default/max plus registered discontinuities/source anchors; reset/default/focus/meaningful hover/selected; one witness per implemented loading/error/empty/unavailable state; deterministic pairwise independent-control combinations; and only listed higher-order combinations. Expected case count is exact and non-zero; unsupported states use typed `notApplicableReason`. |
| `VAL-B2-VIZ-012` | Every source and materially distinct mount produces the registered bounded default/changed mobile/desktop `captures[]`, a deterministic contact sheet, exact expected/observed case counts, and the §1.12 rubric; root computed styles alone cannot satisfy visual coverage. |
| `VAL-B2-VIZ-013` | Source/render parity uses independent expected-value-to-coordinate/label/readout checks, legend-to-mark bijection, and source/assumption IDs; an expected value copied from rendered output is vacuous and fails. |
| `VAL-B2-VIZ-014` | Original SVGs compare against the immutable normalized semantic geometry/text baseline while excluding only allowlisted style attributes; missing/reordered semantic nodes, labels, geometry, legends, or textual alternatives fail. |
| `VAL-B2-VIZ-015` | Canvas renderers expose deterministic coordinate/label/readout probes and bound textual alternatives; resize/DPR changes preserve semantic coordinates, reset/default state, and source-backed values. |
| `VAL-B2-VIZ-016` | Tooltips, legends, and table equivalents have pointer/keyboard parity, logical focus order, retained focus across async updates, unique IDs, label-in-name, and complete live-region state announcements. |

### 24.5 Market map, playground, assets, and OG

| ID | Requirement |
| --- | --- |
| `VAL-B2-MAP-010` | Canonical company population is derived from the market registry; each company mark has the owner-approved `official-identification-use` legal-basis value, official source URL, retrieval date, file hash, attribution/owner fields, contain fit, and neutral plate, with byte/style preservation and no recolour, filter, mask, distortion, or crop. Automation verifies the closed record and preservation predicates, not an independent legal opinion. |
| `VAL-B2-MAP-011` | Market-map coverage applies §1.15 to Grid, Bubble/scatter, Funding timeline, every discrete filter/view option, selected/unselected/details/dismiss, URL/history restoration, tooltip parity, one witness per implemented empty/error/loading/unavailable state, deterministic pairwise independent-filter combinations, and only registered higher-order combinations; exact non-zero expected/observed counts must match. |
| `VAL-B2-PLAY-012` | With WebGL available, validation proves an active context, deterministic nonblank model pixels, canonical landmarks/kinematics/material colours, live reduced-motion manipulation, deterministic DPR/resize/reset, and separate unavailable-WebGL fallback; fallback pixels cannot satisfy available-WebGL assertions. |
| `VAL-B2-PLAY-013` | The canonical two-keyframe trajectory fixture imports and plays through intermediate state; `Reset pose` restores pose/camera while preserving trajectory, and `Clear trajectory` removes keyframes/path without changing the reset/default semantics. |
| `VAL-B2-IMG-007` | Visual-asset parity holds among physical files, JS/TS imports, CSS URLs, inline-SVG dependencies, asset registries, rendered uses, and credits; orphan files, missing files, unregistered uses, stale credits, extras, and symlinks fail except narrow documented generated/tooling exceptions. |
| `VAL-B2-IMG-008` | Reusable editorial photographs/figures/textures require one approved reusable-content value from the §1.13 closed enum; `unlicensed` is never approved. Official company marks use only the distinct `official-identification-use` path in `VAL-B2-MAP-010`. Validation checks enum membership, official URLs, hashes, attribution fields, and preservation; it does not independently decide legality. |
| `VAL-B2-IMG-009` | Photo and logo binaries are byte-hash preserved against baseline except approved-delta entries; SVGs use normalized semantic comparison; every asset and rendered use carries a stable registry/ownership ID. |
| `VAL-B2-IMG-010` | Favicon, web manifest icons, touch icons, inline symbols, CSS masks, and unused first-party symbol assets are swept; any invented first-party mark, unregistered icon byte, orphan symbol, or stale v1 identity asset fails. |
| `VAL-B2-OG-011` | A renderer-input manifest records every card string, fact, source ID, route owner, asset hash, and resolved style token; generated text/facts must equal that manifest rather than relying on OCR. |
| `VAL-B2-OG-012` | OG validation records font checksum/registration, mapped static instance, `cmap` coverage, and rendered glyph probes for every assigned string with no per-glyph fallback; OCR is secondary only. |
| `VAL-B2-OG-013` | Generation builds the complete corpus in a clean staging directory, validates it before canonical mutation, records the full input manifest and pinned generator/runtime/font/image tool versions, then performs journalled per-tree swaps for checked-in/public and export trees. This is rollback-capable staging, not a claim of crash-atomic multi-tree replacement. |
| `VAL-B2-OG-014` | After all journalled swaps complete, the validated staging corpus, checked-in/public corpus, standalone served files, `out/og`, and committed bytes are byte-for-byte equal; extras, missing files, symlinks, duplicate hashes, partial output, or an incomplete journal fail release. |
| `VAL-B2-OG-015` | A caught generation, validation, or swap failure rolls every mutated tree back from the journal and preserves the prior complete corpus. Crash recovery must detect and repair or reject an incomplete journal before validation; release can never accept a partial or mixed corpus and does not claim crash-atomicity across trees. |

### 24.6 Accessibility, route metadata, evidence, and governance

| ID | Requirement |
| --- | --- |
| `VAL-B2-A11Y-011` | Keyboard order is logical; focused elements are not obscured; overlays trap and restore focus; async updates retain appropriate focus; every page has exactly one main landmark, named regions, unique IDs, valid heading order, and label-in-name. |
| `VAL-B2-A11Y-012` | Complete live-region coverage verifies roles, politeness, text, deterministic timing/order, deduplication, focus retention, and non-flooding behavior for search, filters, self-checks, chart/readout changes, market-map selection/details, playground state/errors, and loading/error/empty/unavailable transitions. Automation does not claim to verify actual spoken output across every screen reader/AT/browser combination. |
| `VAL-B2-A11Y-013` | Tables expose captions/names and complete header associations; every meaningful SVG/canvas has a bound textual alternative and every interactive graphic exposes keyboard-operable equivalent controls where applicable. |
| `VAL-B2-A11Y-014` | Contrast is measured for every foreground/background pair in every declared state, including bounded dark surfaces. Because `#245FFF` is insufficient for small text on graphite, such contexts use an approved measured alternate or dual treatment while retaining signal semantics. |
| `VAL-B2-A11Y-015` | Route × declared-state coverage for Axe, keyboard, forced colours, and the three §1.14 profiles is registry-derived and non-empty, using the exact bounded §1.15 case counts rather than a full Cartesian product; hand-picked samples, missing cases, or count disagreement cannot pass. |
| `VAL-B2-CONT-007` | Set equality holds among module registry, fixed-route registry, app route inventory, sitemap, export files, and metadata ledger: 47 article routes plus 14 non-article public destinations = 61 public destinations at baseline; 404 is separately registered and never counted as public content. |
| `VAL-B2-CONT-008` | The metadata ledger covers canonicals, titles/descriptions, all OG/X fields, JSON-LD, manifest, favicon/touch icons, theme-colour, and 404 policy for every owning route; owner and rendered/exported values agree. |
| `VAL-B2-CONT-009` | Residue sweeps normalize CSS/SVG/WebGL colours, inspect source literals, raw attributes, computed states, generated pixels with declared tolerance, resource/font requests, provenance, and an explicit v1→v2 migration map; active runtime documentation is in scope while exact-path historical archives are allowlisted. |
| `VAL-B2-EVID-013` | The named suites `brand-v2-route-flows`, `brand-v2-article-interactions`, `brand-v2-market-map-states`, and `brand-v2-playground-states` preserve latest-request-wins, partial errors, URL sync, focus retention, deep-link/history restoration, tooltip parity, table keyboard behavior, and FK/IK/import/error/fallback states through ordered `steps[]`/`captures[]` and exact bounded §1.15 case counts. |
| `VAL-B2-EVID-014` | Evidence uses one common result/failure envelope plus schema-specific payloads for source/build, browser-state, generated-image, and autonomous-reference-comparison results. Non-applicable fields are omitted and accompanied by typed `notApplicableReason`; foreign payload fields cannot substitute for a schema's required fields. Multi-phase evidence uses ordered `steps[]` and `captures[]`. |
| `VAL-B2-EVID-015` | Autonomous comparison records every §1.12 anchor against both references, including identity/hierarchy ratios, grid alignment, purposeful-device counts, bounded light/dark area, repetition/nested-frame metrics, palette/type parity, and material treatment. All applicable anchors pass independently; “looks right”, averaging, or raw cross-composition pixel similarity fails. |
| `VAL-B2-EVID-016` | Every failed result uses the common envelope: assertion ID, population member, expected, actual, selector/registry ID, exception verdict, and applicable route/interactive/state/viewport context; schema-specific screenshot, computed/ARIA, Axe, console/network, source/build, image, rubric, `steps[]`, and `captures[]` fields are required only by their payload schema. Non-applicable fields are omitted with typed `notApplicableReason`; mutation tests prove required fields. |
| `VAL-B2-GOV-002` | The assertion-enforcement-map schema requires assertion ID, canonical population source, `enforcementTargets[]`, enforcement mode, machine predicate, and tagged produced result. Each target names an exact existing test file/title or mandatory evidence row; composite assertions list every target, and multi-phase targets may bind ordered `steps[]`/`captures[]`. Targets must exist; machine claims require automation and visual claims require visual evidence. |
| `VAL-B2-GOV-003` | Mutation tests prove the enforcement map and exhaustive gates fail when an assertion row, target, tagged result, population member, registry entry, evidence record, or entire applicable population is omitted or empty. |
| `VAL-B2-GOV-004` | Milestone 1 creates suites, registries, clean-source/tree-hash baseline manifests, enforcement map, temporary-fixture mutation tests, archived expected-red v1 drift, the §1.12 rubric, and a static-export Playwright fixture/config using a checked-in dependency-free server or direct pinned dependency. Required image/font/OCR tooling is direct/versioned or checked-in deterministic before claims rely on it. Visual suites may remain red until their milestone; all are green by milestone 8. |
