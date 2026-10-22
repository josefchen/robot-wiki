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

Automation verifies records; it does not issue an independent legal opinion. Every visual asset uses exactly one owner-approved legal-basis enum value: `owned`, `cc-by`, `cc-by-sa`, `cc0`, `public-domain`, `press-kit-editorial-reuse`, `documented-permission`, or `official-identification-use`. Each record includes the official source URL, retrieval date, content hash, creator/owner, attribution text, licence or permission reference, and byte/style preservation policy. Company marks use `official-identification-use` and must preserve official bytes and style except registered contain-fit placement on a neutral plate and the logo tile's one registered monochrome threshold (owner visual audit 2026-09-29, `owner-visual-audit-20260929.md`).

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

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`): the web wordmark and the home h1 render in the DM Sans display family; Tektur stays in the offline Open Graph renderer. The identity strings are unchanged.

| ID | Requirement |
| --- | --- |
| `VAL-B2-ID-001` | Every public brand display text is exactly `Robot Wiki`, with one space, capital `R`, capital `W`, and no hyphen or punctuation. |
| `VAL-B2-ID-002` | Every descriptor surface is exactly `Citation-first encyclopedia of modern robot learning.` |
| `VAL-B2-ID-003` | The visible product identity never renders `robot-wiki`, `ROBOT WIKI`, `Robot-Wiki`, `Robotics encyclopaedia`, or any descriptor paraphrase. |
| `VAL-B2-ID-004` | Technical uses of `robot-wiki`, `robot-wiki.com`, and `robot-atlas-trajectory` remain technical and are not altered merely to satisfy public-display sweeps. |
| `VAL-B2-ID-005` | Wordmark text renders in the DM Sans display family on web identity surfaces (home, top bar, and mobile header); OG/X artwork renders the registered static Tektur instance mapped to the approved web role. |
| `VAL-B2-ID-006` | The repository introduces no first-party symbol, monogram, mascot, robot-head logo, or alternate brand glyph. |
| `VAL-B2-ID-007` | The home hero contains one dominant `Robot Wiki` DM Sans h1 and one exact descriptor as its Geist lead; duplicate hero lockups are prohibited. |
| `VAL-B2-ID-008` | Mobile header contains the compact `Robot Wiki` wordmark and the two top-bar controls `Articles` (the panel trigger, so named) and `How robots work`, each exactly once, no other text, and omits the descriptor. |
| `VAL-B2-ID-009` | Article OG cards contain compact `Robot Wiki` identity but omit the descriptor; the site card contains both exact strings. |

## 3. Colour

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`, recorded in `library/design-system.md`): the rows below carry the research-page palette of paper, ink, grayscale chart tones and one muted blue accent in place of the brand-v2 lime and signal blue.

| ID | Requirement |
| --- | --- |
| `VAL-B2-COL-001` | Runtime highlight token and all renderer mirrors resolve exactly to `#A3A39E`. |
| `VAL-B2-COL-002` | Runtime signal token and all renderer mirrors resolve exactly to `#3B6EA8`. |
| `VAL-B2-COL-003` | Runtime foundation tokens resolve to ink `#1C1C1A`, graphite `#3F3F3B`, concrete `#DEDEDB`, paper `#FAFAF8`, and white `#FFFFFF`. |
| `VAL-B2-COL-004` | Every primary action has ink/black fill and an accessible light label; signal-blue-filled primary actions are absent. |
| `VAL-B2-COL-005` | Persistent selection uses ink weight with a 1 px ink rule or underline plus a non-colour indicator, exposes state semantically, and is never carried by a colour fill. |
| `VAL-B2-COL-006` | The muted blue signal is used only for registration, active information paths, or the one highlighted series of a figure and is not substituted for warning state; links and focus are ink. The keyboard focus ring is a 1 px solid ink outline offset 2 px on every keyboard stop; only a registered inset ring, where an outset ring would draw over the next stacked control or be clipped by its stage, may draw the same 1 px ink ring inside the box, and its style, width and colour are still measured. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row required signal-blue links and focus. Same strength: every public route at 375, 768 and 1440 px, thirty real Tab stops each.) |
| `VAL-B2-COL-007` | Neither the neutral highlight grey nor the signal blue is used as a success semantic, and colour is never the sole carrier of state. |
| `VAL-B2-COL-008` | Normal text contrast is at least 4.5:1; large text and essential graphical boundaries are at least 3:1. |
| `VAL-B2-COL-009` | Decorative UI gradients are absent. A scientific scale is exempt only when labelled, source-appropriate, bounded to the visualization, and textually described. |
| `VAL-B2-COL-010` | Colour-name legends, labels, documentation, and accessible descriptions agree with the actual rendered tokens. |

## 4. Type

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`, recorded in `library/design-system.md` and `data/type-roles.json`): the type rows below carry the research-page roles. DM Sans is the display family, Geist carries interface and reading text, Geist Mono carries data, code and registration labels, and all three load through `next/font`. Tektur Variable stays only in the offline Open Graph renderer. Each row moved at the same strength; the brand-v2 values it replaced were Tektur Variable display, Newsreader prose at 18–21px / 1.60–1.80 in 62–68ch, IBM Plex Sans interface, IBM Plex Mono data, and a signal-blue section-link underline.

| ID | Requirement |
| --- | --- |
| `VAL-B2-TYPE-001` | First-party brand/UI/editorial/data typography uses exactly three web families across the four registered roles: DM Sans (display), Geist (interface and reading) and Geist Mono (data), each published by framework-bundled `next/font` `@font-face` rules the browser is seen to fetch. Tektur Variable and IBM Plex Mono are the offline Open Graph renderer faces. KaTeX math fonts and the licensed icon font/system are scoped content/functional exceptions and never substitute for a first-party role. |
| `VAL-B2-TYPE-002` | Every runtime font is a same-origin, framework-bundled `/_next/static/media/` payload; no runtime route produces a third-party font request or requests either Tektur binary, identified by checksum or file name. |
| `VAL-B2-TYPE-003` | Wordmark, page h1, article h1, and major display headings compute to DM Sans after `document.fonts.ready`. |
| `VAL-B2-TYPE-004` | Long-form prose computes to Geist at 16px and 1.60–1.65 line height, in a reading column 880–960px wide at the 1440px viewport. |
| `VAL-B2-TYPE-005` | Interface copy and controls compute to Geist; code, source metadata, technical values, and registration labels compute to Geist Mono where specified. |
| `VAL-B2-TYPE-006` | The home `Robot Wiki` h1 is the shared DM Sans 400 display h1: 40–48px on 375px and 84–92px on 1440px, line-height 0.90–0.96, matching the registered `home-wordmark` role instance. |
| `VAL-B2-TYPE-007` | Article h1 renders in DM Sans 400 at 40–48px on the 375px viewport and 84–92px on the 1440px viewport with line-height between 0.90 and 0.96. |
| `VAL-B2-TYPE-008` | No prose paragraph computes to the display family DM Sans or to Geist Mono. |
| `VAL-B2-TYPE-009` | Linked article section headings read as ink DM Sans type and expose a non-colour link affordance, a copy-link glyph that stays rendered at opacity 0.3 or more at rest, and remain keyboard focusable. |
| `VAL-B2-TYPE-010` | Registration labels use a single site-wide tracking ratio within 0.01em for equivalent label classes. |
| `VAL-B2-TYPE-011` | The checked-in Tektur Latin-subset variable WOFF2 keeps exactly the `wght` and `wdth` axes but is retired from the website: no stylesheet declares it and no runtime route requests it, while the web families load through `next/font` with no runtime third-party font request. |
| `VAL-B2-TYPE-012` | OG/X Tektur is a separate checked-in static TTF consumed only by the offline card renderer; it is not loaded by website CSS, `next/font/local`, or any runtime route. |
| `VAL-B2-TYPE-013` | Checked-in Tektur assets include the applicable OFL license text and metadata recording upstream source URL and revision, SHA-256 checksum for each binary, format and subset, `wght`/`wdth` ranges and defaults for the variable file, and style/weight for the static file. |
| `VAL-B2-TYPE-014` | Automated font inspection verifies every recorded checksum and binary property, rejects an undocumented variable axis, rejects a variable OG TTF, and records `wdth` with the label `width axis`. |

## 5. Grid, rails, and registration

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`, recorded in `library/design-system.md`): every rule and rail is a 1 px hairline in the `--line` token (`rgba(28, 28, 26, 0.14)` over paper), the current state is a 1 px ink rule, and the one muted accent stays the registration colour. `VAL-B2-GRID-008` below moved at the same strength; the brand-v2 row it replaced made concrete the default rail colour and allowed lime on an active measured interval. The standard sets pages in one centred column inside a registered page frame rather than on a 12, 8 or 4-column grid, so `VAL-B2-GRID-001` moved to the lines of that frame at the same strength, and `VAL-B2-GRID-002` names the shared treatment the standard keeps: the registered hairline devices (section rule, apparatus rule, footer rule, registration cross) that every surface and every generated card draws.

| ID | Requirement |
| --- | --- |
| `VAL-B2-GRID-001` | At 375, 768 and 1440px every major block (the page h1, each direct child of the page frame that owns it, and each direct child of the prose column) starts, ends or centres within 4px of a line of that frame: its content edges, its centre line, or a track edge or track centre of its own grid; spacing keeps the 8px base rhythm with 4px fine alignment of the `VAL-B2-SPACE-001` ladder. The owner-frozen `/how-robots-work/` explainers (Josef, 12 October 2026) are measured and reported, not realigned. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`: "Content column centred, 960 px"; the brand-v2 row aligned composition to 12, 8 and 4 columns. Same strength: every major block of every public route at every frame width.) |
| `VAL-B2-GRID-002` | Home, shell, articles, discovery, market map, playground, and OG/X cards each contain at least one intentional shared grid, rail, or registration treatment: under the research-page standard a registered hairline device (`contract/brand-v2-registries.json#gridDevices`) that is aria-hidden, pointer-inert and on its registered anchor at every width on every route of the surface, and on every generated card. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 treatments were the engineering grid, lime rail and signal registration.) |
| `VAL-B2-GRID-003` | Grid/device layers never reduce body-text contrast below WCAG AA and never appear between prose glyphs and their background. |
| `VAL-B2-GRID-004` | Decorative grid/device layers are `aria-hidden`, pointer-inert, and absent from the accessibility tree. |
| `VAL-B2-GRID-005` | Registration crosses, crop marks, axes, ticks, and sequence labels align within 2px of a real column, boundary, baseline, axis, or state anchor. |
| `VAL-B2-GRID-006` | No page contains random unanchored technical glyphs, fabricated coordinates, or decorative data labels. |
| `VAL-B2-GRID-007` | Mobile evidence contains fewer or equal decorative registration devices than the corresponding desktop surface and preserves all content. |
| `VAL-B2-GRID-008` | Grid lines and neutral rails are 1 px hairlines in the `--line` token by default; registration uses the muted accent (`#3B6EA8`); an active measured interval or current-state rail is a 1 px ink rule, never a thicker or coloured accent bar; focus is the 1 px ink outline of `VAL-B2-COL-006`. (Owner decision of 10 October 2026; the brand-v2 row made concrete the default rail and allowed lime on an active measured interval.) |

## 6. Shape, borders, and surfaces

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`, recorded in `library/design-system.md`): "Radius 0 on figure frames; 7 px only on code blocks", and no shadows anywhere. `VAL-B2-SURF-001` below moved at the same strength or stronger (a narrower radius set and no capsule exception); the surface registry rows (`contract/brand-v2-registries.json#surfaces`) carry the same geometry, so every level records square corners and a zero shadow tolerance, which `VAL-B2-SURF-004` already bounds.

| ID | Requirement |
| --- | --- |
| `VAL-B2-SURF-001` | First-party surface corner radii are 0px; the one exception is the code block, which uses the `--code-radius` token (7px); no surface, control, chip or label takes a full capsule radius; circles and meaningful data marks are exempt. A surface frozen by owner decision (the `/how-robots-work/` explainers, Josef, 12 October 2026) keeps its approved geometry and is reported, not restyled. (Owner decision of 10 October 2026; the brand-v2 row allowed 0, 2, 4, 8, 16 or 24px and a registered capsule exception.) |
| `VAL-B2-SURF-002` | Every first-party border and rule outside a data figure is 1px: focus is the 1px ink outline of `VAL-B2-COL-006`, and active, selected and current states are a 1px ink rule or underline, so no state takes a 2px border. A single-sided rule is drawn in the `--line` hairline, its 0.22 strong variant or ink, never an accent bar. A data figure's marks, axes and encodings and the owner-frozen `/how-robots-work/` explainers are exempt and reported. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`: "Rules: 1 px, never heavier"; the brand-v2 row allowed 2px for focus, active, selected or semantic emphasis.) |
| `VAL-B2-SURF-003` | No first-party surface outside a data figure has a dashed or dotted border; inside a figure a dashed line is a data encoding (a provisional, comparison or projected series) the figure's legend names. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row allowed dashed boundaries for provisional, comparison, drop or inactive states.) |
| `VAL-B2-SURF-004` | No first-party surface, control, overlay or pseudo-element has a box shadow, text shadow or drop-shadow filter at any width; the surface registry (`contract/brand-v2-registries.json#surfaces`) names every variant with its stacking purpose and a zero shadow tolerance. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`: "No shadows"; the brand-v2 row allowed neutral raised shadows up to 8px blur and floating shadows up to 20px.) |
| `VAL-B2-SURF-005` | No first-party surface uses coloured shadow, glow, backdrop blur, glass, bevel, neumorphism, or chrome treatment. |
| `VAL-B2-SURF-006` | No product surface other than an action, a compact control, media or a data figure paints a dark ground (relative luminance under 0.2): the research-page standard has no bounded dark instrument, and code blocks sit on `--paper-deep`. Body, main, header, footer, navigation, article, aside, prose and content-card grounds stay paper/light (luminance 0.8 or more), the root declares no dark `color-scheme`, and no stylesheet switches to a dark theme under `prefers-color-scheme: dark`. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row allowed bounded dark instruments.) |
| `VAL-B2-SURF-007` | No first-party surface paints paper grain, concrete texture, halftone, dither or any other background image or pattern; the one material is the registered flat `material:paper` (`lib/brand-v2-materials.ts`), declared deterministic, first-party and owned, with its text clearing 4.5:1 on its ground. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`: "Paper `#FAFAF8`"; the brand-v2 row allowed contrast-safe grain, texture, halftone and dither.) |
| `VAL-B2-SURF-008` | No first-party control, status, filter, metadata, category, action or navigation label takes a fully rounded capsule; circles and meaningful data marks are exempt. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`: "No pills"; the brand-v2 row allowed a registered compact toggle, status or filter capsule.) |
| `VAL-B2-SURF-009` | No shared component contains redundant nested borders unless the inner object is a real table, plot, media frame, or control group. |

## 7. Components

| ID | Requirement |
| --- | --- |
| `VAL-B2-COMP-001` | Primary actions are ink filled with accessible light text. Secondary actions are outlined/transparent by default and tertiary actions remain quiet; no action carries a colour fill (no lime, retired signal blue or accent fill). Disabled actions may use documented neutral treatments and are exempt from active-action colour requirements. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row allowed lime on a registered emphasized secondary, which the research-page standard retires. Same strength: every primary, secondary and disabled action on every public route at 375, 768 and 1440 px.) |
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

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`): the home hero follows the research-page masthead, and selection and highlight move from lime fills to ink weight and 1 px ink rules.

| ID | Requirement |
| --- | --- |
| `VAL-B2-SHELL-001` | Desktop shell, mobile header, drawer, and footer render the v2 identity and share palette, display type, grid/rail, shape, and focus language. |
| `VAL-B2-SHELL-002` | Active navigation uses ink and/or lime plus a non-colour marker. A route with a corresponding navigation item has exactly one `aria-current="page"` on that matching link; a route without a corresponding navigation item has none. A heading or unrelated element never receives `aria-current` merely to satisfy a count. The `Robot Wiki` wordmark lockups are exempt from the marker requirement and MUST NOT render the lime active-interval rail or any other accent bar on any route, including `/`, where the wordmark link keeps `aria-current="page"` without a marker (owner decision 2026-09-25, `owner-decision-no-wordmark-rail-20260925.md`); the exemption does not extend to taxonomy or standalone navigation entries. |
| `VAL-B2-SHELL-003` | The skip link is the first keyboard destination and becomes visible on focus. |
| `VAL-B2-SHELL-004` | Mobile drawer traps focus, closes on Escape, restores focus to its trigger, and makes obscured content inert. |
| `VAL-B2-SHELL-005` | Existing navigation hierarchy, accessible names, and href destinations remain unchanged except the visible product lockup string. |
| `VAL-B2-SHELL-006` | Home renders one dominant hero with a DM Sans h1, the exact descriptor as the Geist lead, an ink primary action with a white label, selection and highlight in ink weight and 1 px ink rules with no lime or accent fill, and the research-page structure without fabricated metrics. |
| `VAL-B2-SHELL-007` | All seven existing domain destinations remain visible, correctly named, and reachable from home. |
| `VAL-B2-SHELL-008` | Home and domain surfaces use indexed editorial rows/modules rather than a universal grid of equal marketing cards. |
| `VAL-B2-SHELL-009` | At 375px, 768px, 1024px, and 1440px widths, shell and home have no unintended horizontal document overflow. |

## 9. Article

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`): the article masthead uses one DM Sans h1, the reading column is held in pixels at the standard's 960px cap, and citations are numbered superscripts with margin sidenotes. The brand-v2 values replaced were a Tektur h1 and a 62–68ch measure.

| ID | Requirement |
| --- | --- |
| `VAL-B2-ART-001` | `/manipulation/action-chunking/` renders breadcrumb/domain context, one DM Sans h1, one summary, and its existing factual review date, reading time, and citation count. |
| `VAL-B2-ART-002` | Article prose sits in a reading column 880–960px wide at the 1440px viewport, with at least 20px mobile side padding and at least 32px desktop breathing room. |
| `VAL-B2-ART-003` | Article section links, inline citations, glossary definitions, and external sources have distinguishable treatments matching their semantics: links are ink or muted and carry an underline, and citations are numbered superscripts that open a margin sidenote. |
| `VAL-B2-ART-004` | Dark article diagrams are bounded instruments with accessible inverse labels, a visible boundary, and an equivalent textual description. |
| `VAL-B2-ART-005` | Every figure caption states a takeaway and every external figure/texture credit exposes creator, source, and license. |
| `VAL-B2-ART-006` | Schematics identify themselves and do not imply a source-published mapping or measurement. |
| `VAL-B2-ART-007` | Equations expose accessible text or an equivalent explanation. |
| `VAL-B2-ART-008` | Tables remain inside the viewport through internal horizontal scrolling without reducing the prose measure below readable bounds. |
| `VAL-B2-ART-009` | Article title blocks contain no fabricated badge, author portrait, decorative cover image, or repeated domain eyebrow. |
| `VAL-B2-ART-010` | Existing article text, citation markers, references, see-also relationships, and linked-from relationships are unchanged by the v2 rollout. |

## 10. Discovery

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`): selected facets move from a lime fill to the research-page selected state.

| ID | Requirement |
| --- | --- |
| `VAL-B2-DISC-001` | Search exposes deterministic empty/default, query-results, filtered, no-results, loading, and error treatments where those states exist. |
| `VAL-B2-DISC-002` | Search-result titles, excerpts, facets, counts, and routes remain data-derived and do not fabricate context. |
| `VAL-B2-DISC-003` | Selected facets are unfilled, with an ink label and a 1 px ink rule plus semantic/shape confirmation, and can be cleared and reset by keyboard. |
| `VAL-B2-DISC-004` | Search status updates are announced without moving focus unexpectedly. |
| `VAL-B2-DISC-005` | `/a-z/` and `/glossary/` retain deep links, keyboard reachability, source wording, and the shared v2 index treatment. |
| `VAL-B2-DISC-006` | Result/index rows use rules and editorial rhythm; they are not converted into a universal bento-card grid. |
| `VAL-B2-DISC-007` | At 375px, result titles, excerpts, filter controls, and clear/reset actions fit without document overflow. |

## 11. Visualizations and interactives

Owner decision of 19 October 2026 (owner session, queue item polish-1019), on the research-page standard of 10 October 2026 (`PANTHEON-SPEC.md`: one muted blue accent, `#3B6EA8`, for the one highlighted series of a figure, which is the runtime signal token of `VAL-B2-COL-002`) and the isometric figure directive of 12 October 2026 (each isometric figure has one lit part): the brand-v2 rule that kept the bright signal blue off figure marks moves to the accent. `VAL-B2-VIZ-003` below moved at the same strength or stronger, and the light-stage sweep (`tests/e2e/figure-light-stage.spec.ts`) enforces it on every figure at 375 and 1440 px, with planted marks that prove each clause fails.

| ID | Requirement |
| --- | --- |
| `VAL-B2-VIZ-001` | Every stateful chart or interactive provides a visible or screen-reader-accessible current-state description. |
| `VAL-B2-VIZ-002` | Every series/state remains distinguishable without colour through label, marker, dash, geometry, or position. |
| `VAL-B2-VIZ-003` | The one muted accent (`#3B6EA8`) marks the lead active path/series or the one lit part of a figure and reaches a figure geometry only through the highlight role (`--role-highlight-*`) or the isometric kit's lit part (`--anatomy-lit`); any other accent paint on a figure geometry fails, a retired signal blue (`#245FFF`, or `#245EDB` of `VAL-B2-RES-003`) appears on no figure geometry, links included, and selection is ink weight, never a colour fill or an unlabeled second series. (Owner decisions of 10 October 2026 and 19 October 2026; the brand-v2 row made signal blue the lead active path/series and lime the selection/highlight.) |
| `VAL-B2-VIZ-004` | Legends agree with actual rendered tokens and name the state or series rather than relying on colour names alone. |
| `VAL-B2-VIZ-005` | Source values remain source-backed and unknowns remain explicitly unknown. |
| `VAL-B2-VIZ-006` | Every schematic labels itself and every generated/non-source signal labels its generative status. |
| `VAL-B2-VIZ-007` | Native or equivalent controls work by keyboard, expose state, render visible focus, and return to a deterministic default through reset. |
| `VAL-B2-VIZ-008` | No explanatory sequence autoplays and no visualization contains decorative fake telemetry. |
| `VAL-B2-VIZ-009` | Reduced motion produces an immediate, understandable state without losing data, controls, or direct manipulation. |

## 12. Market map

Owner decision of 19 October 2026 (owner-session review of the live market map, "the market map has weird background and borders", on the owner's standing bar of 12 October 2026, "extremely premium"): company marks leave the grey logo plate and its monochrome threshold. Every mark is drawn plate-less as a single-ink silhouette: the file's alpha, or for a mark recorded with its file hash in `LUMINANCE_MASKS` (`lib/market-map-marks.ts`) its luminance, masks one element filled with the secondary ink token, and a file whose mask would draw a block is replaced by an official transparent or one-colour version. `VAL-B2-MAP-007` below and `VAL-B2-MAP-010` (§24.5) moved at the same strength or stronger: the market-map logo spec and the figure-system sweep assert on every rendered mark that no plate, background, padding, border, filter or shadow paints, that the ink is the token and clears 3:1, and that no mark is blank or a block, and the chrome sweep now allows no filter anywhere.

| ID | Requirement |
| --- | --- |
| `VAL-B2-MAP-001` | Company count, record values, categories, source dates, funding values, and deep-link destinations match the canonical data registry. |
| `VAL-B2-MAP-002` | Every visible bubble size, position, colour, line, and timeline encoding has a labelled legend and textual equivalent. |
| `VAL-B2-MAP-003` | Selected company/filter state uses the research-page selected state: selected segment, filter and view controls read in ink text with a 1 px ink rule or underline and expose `aria-pressed` (or the native equivalent); a selected company tile or timeline row reads in ink weight with a 1 px ink rule, exposes `aria-expanded` and names its open details, and has no colour fill, tinted ground, accent bar or lime; a selected plotted mark (Bubble/scatter, timeline plot) is distinguished without colour (larger radius or an ink ring) and may carry the one muted accent `#3B6EA8` only as that figure's single highlight under `VAL-B2-VIZ-003`. Fail on any lime (`#C6FF19`) paint, any colour fill or tint carrying selection, any accent bar, selection carried by colour alone, or a selected state without its semantic attribute. Same strength: at least two independent cues, one of them semantic, in Grid, Bubble/scatter and Funding timeline at 375 and 1440 px. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`, `VAL-B2-COL-005`; the brand-v2 row required lime plus text/shape/semantic confirmation.) |
| `VAL-B2-MAP-004` | The one muted accent `#3B6EA8` (the runtime signal token of `VAL-B2-COL-002`) appears on the map only for the selected or highlighted company mark, an active timeline signal, or the focus path inside a chart, is never the sole cue, and never encodes warning; links are underlined ink, control focus is the 1 px ink ring of `VAL-B2-A11Y-002`, and no lime or retired signal blue (`#245FFF`, `#245EDB`) appears. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row had signal blue identify an active relationship, link, focus path or timeline signal. Same strength: no warning encoding, and the accent confined to its semantic roles.) |
| `VAL-B2-MAP-005` | Hover facts are also reachable through keyboard focus and persistent selection. |
| `VAL-B2-MAP-006` | A selected-company detail surface does not obscure required controls, remains dismissible, and does not trap focus unless implemented as a modal. |
| `VAL-B2-MAP-007` | Third-party company marks retain source identity and take one consistent treatment; no mark is redrawn in first-party style. Every mark on `/credits/` and `/market-map/` is drawn plate-less as a single-ink silhouette: the official file's alpha (or a reviewed luminance-derived mask recorded with the file's hash) masks one element filled with the secondary ink token (`--color-text-dim`), so white and dark marks read alike and clear 3:1 against the page, with no plate, background, border, padding, filter or shadow; a file whose mask would draw a solid block is replaced by an official transparent or one-colour version from the company's own site or press kit. (Owner decision of 19 October 2026; the owner visual audit of 2026-09-29, `owner-visual-audit-20260929.md`, put every mark on one neutral plate in a monochrome threshold.) |
| `VAL-B2-MAP-008` | At 375px the map provides a readable list/detail or simplified plot state with equivalent records and controls rather than an illegibly shrunken desktop canvas. |
| `VAL-B2-MAP-009` | Missing disclosures render `not disclosed`; contradictory source pointers remain visibly caveated rather than silently dropped. |

## 13. Playground

Owner decision of 19 October 2026 (the owner's request to start the playground, on the light, page-integrated figures of 2 October 2026 and the research-page standard of 10 October 2026, `PANTHEON-SPEC.md`): the playground's stage is light and takes the look of the `/how-robots-work/` 3D explainers, with the page paper as its ground, the arm in clay with motor-grey servos, one soft key-light shadow and one muted accent. The graphite instrument and the lime selection of the brand-v2 rows are retired; each row below moved at the same strength.

| ID | Requirement |
| --- | --- |
| `VAL-B2-PLAY-001` | The 3D canvas is a bounded light stage on the page ground: it clears to exactly the runtime paper token, sits between the page's 1 px rules with no dark panel and no full-page dark UI, and draws the arm in the explainers' clay and motor greys; the light-stage sweep probes it with every other figure. (Owner decision of 19 October 2026; the brand-v2 row required a bounded ink/graphite instrument inside a light shell.) |
| `VAL-B2-PLAY-002` | The rendered model, joint limits, kinematic relationships, and trajectory values match the existing implementation and canonical data. |
| `VAL-B2-PLAY-003` | Passive geometry uses the clay and motor greys mixed from concrete and graphite; the joint being worked and the reach target use the one muted accent plus a non-colour marker (the joint row's bold label and square, the target's dot and ring, a dashed gap line when it is out of reach). (Owner decision of 19 October 2026; the brand-v2 row used signal blue for focus and lime for selection.) |
| `VAL-B2-PLAY-004` | Controls use the site's ink, outlined and text-action hierarchy, persistent plain-language labels, semantic values, visible focus, and keyboard operation, the canvas included (arrow keys turn it, + and - zoom). (Owner decisions of 10 and 19 October 2026; the brand-v2 row named a black/lime/outlined hierarchy.) |
| `VAL-B2-PLAY-005` | Reset returns camera, model, controls, state description, and trajectory to one deterministic documented default. |
| `VAL-B2-PLAY-006` | Current joint/target/trajectory state is available as text and updates when manipulation occurs. |
| `VAL-B2-PLAY-007` | Reduced motion constrains non-essential camera/model transitions without removing direct manipulation, controls, or immediate state feedback. |
| `VAL-B2-PLAY-008` | The visible product never presents `robot-atlas-trajectory` as brand identity; technical data/export contexts may retain it. |
| `VAL-B2-PLAY-009` | No particles, bloom, fake telemetry, ambient scanning, or unlabelled HUD is rendered. |
| `VAL-B2-PLAY-010` | WebGL-resolved colour mirrors exactly match runtime brand tokens and are parity-tested. |
| `VAL-B2-PLAY-011` | A static playground fallback is used only when WebGL is unavailable; reduced-motion preference alone never selects the static fallback. |

## 14. Imagery and licensing

Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`): the research-page standard is plain paper, so the concrete micro-texture and the halftone dot field are retired from the material registry. `material:paper` is the one registered material. `VAL-B2-IMG-004` grades it, and still refuses any tile, remote source, animation or reading-contrast ink planted on it.

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
| `VAL-B2-OG-001` | The generated OG/X corpus contains exactly 58 PNG files: one site card plus one card for each of the 57 published articles listed in the sealed matrix below. The separate 4:3 and square search structured-image assets are not part of this corpus. |
| `VAL-B2-OG-002` | Every PNG is exactly 1200×630, uses a 1.9047619:1 aspect ratio, is at least 5KB, and serves from the static export with `image/png`. |
| `VAL-B2-OG-003` | Site card contains exact `Robot Wiki` and exact descriptor. |
| `VAL-B2-OG-004` | Every article card contains the real title, domain, review year, reference count, and compact `Robot Wiki`; it omits the descriptor. |
| `VAL-B2-OG-005` | Every article route points to a unique slug-bearing asset URL; every article asset is byte-distinct from every other article asset and the site card. |
| `VAL-B2-OG-006` | Non-article destinations point to the single site card. |
| `VAL-B2-OG-007` | Every card renders the registered static Tektur instance mapped to the approved web Tektur Variable role, plus exact v2 palette/grid/rail/registration language with runtime/renderer parity. |
| `VAL-B2-OG-008` | Cards contain no v1 public identity, old descriptor, fake chart, random ornament, screenshot collage, tiny UI, progress state, AI robot, or unlicensed image. |
| `VAL-B2-OG-009` | Every audited route declares one `twitter:card=summary_large_image`, absolute apex-domain image URL, 1200/630 metadata, and meaningful alt text of at least 15 characters. |
| `VAL-B2-OG-010` | Card generation is deterministic: two clean generations from identical inputs produce identical hashes for all 58 OG/X files. |

## 16. Accessibility and responsive behavior

| ID | Requirement |
| --- | --- |
| `VAL-B2-A11Y-001` | Every exported public route derived from the canonical route/content registries has zero Axe violations after its required state settles. |
| `VAL-B2-A11Y-002` | Every interactive element shows a visible keyboard focus ring: a 1 px ink outline offset 2 px on `:focus-visible` only, or an equally visible component-specific treatment where an offset outline cannot show (an inset 1 px ink outline on a clipped map tile or timeline row, or the ring drawn around a focused chart mark); no element lacks a visible focus state, and no lime or retired signal blue (`#245FFF`, `#245EDB`) focus paint remains. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row required a 2px signal-blue outline with at least 2px offset. Same strength: every interactive element, visible focus, keyboard only.) |
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
| `VAL-B2-CONT-004` | Ink primary actions with white text, ink-weight selection with a 1 px ink rule or underline (never a colour fill), underlined ink links, the 1 px ink keyboard focus ring, and the one muted accent `#3B6EA8` reserved for the highlighted series, registration and active information paths remain semantically consistent across all audited routes; no lime or retired signal-blue paint appears. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`, `VAL-B2-COL-005`; the brand-v2 row required black primary actions, lime selection/highlight and signal-blue link/focus behaviour. Same strength: every audited route.) |
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
| `B2-EV-018` | `/market-map/` | 1440×900 | In Bubble/scatter, select the first keyboard-reachable company mark; capture lime-plus-marker selection, persistent details, the official mark drawn plate-less in one ink, source facts, and dismiss control. |
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

## 20. Exact 58-OG matrix

The current published registry contains 57 articles. The release OG/X corpus is exactly the following 58 files.

| # | Route owner | Required exported asset |
| ---: | --- | --- |
| 1 | Site and all non-article destinations | `/og/robot-wiki.png` |
| 2 | `/adjacent/autonomous-vehicles/` | `/og/adjacent/autonomous-vehicles.png` |
| 3 | `/adjacent/drones/` | `/og/adjacent/drones.png` |
| 4 | `/adjacent/space/` | `/og/adjacent/space.png` |
| 5 | `/adjacent/surgical/` | `/og/adjacent/surgical.png` |
| 6 | `/classical/calibration/` | `/og/classical/calibration.png` |
| 7 | `/classical/control/` | `/og/classical/control.png` |
| 8 | `/classical/grasp-planning/` | `/og/classical/grasp-planning.png` |
| 9 | `/classical/kinematics/` | `/og/classical/kinematics.png` |
| 10 | `/classical/motion-planning/` | `/og/classical/motion-planning.png` |
| 11 | `/classical/perception/` | `/og/classical/perception.png` |
| 12 | `/classical/ros2-for-ml-engineers/` | `/og/classical/ros2-for-ml-engineers.png` |
| 13 | `/classical/scene-representation/` | `/og/classical/scene-representation.png` |
| 14 | `/classical/state-estimation/` | `/og/classical/state-estimation.png` |
| 15 | `/data-hardware/data-bottleneck/` | `/og/data-hardware/data-bottleneck.png` |
| 16 | `/data-hardware/datasets/` | `/og/data-hardware/datasets.png` |
| 17 | `/data-hardware/evaluation-crisis/` | `/og/data-hardware/evaluation-crisis.png` |
| 18 | `/data-hardware/hardware-taxonomy/` | `/og/data-hardware/hardware-taxonomy.png` |
| 19 | `/data-hardware/industrial-deployment/` | `/og/data-hardware/industrial-deployment.png` |
| 20 | `/data-hardware/robot-learning-stack/` | `/og/data-hardware/robot-learning-stack.png` |
| 21 | `/data-hardware/teleop-rigs/` | `/og/data-hardware/teleop-rigs.png` |
| 22 | `/frontier/bear-case/` | `/og/frontier/bear-case.png` |
| 23 | `/frontier/competing-theses/` | `/og/frontier/competing-theses.png` |
| 24 | `/frontier/dexterity/` | `/og/frontier/dexterity.png` |
| 25 | `/frontier/generalization/` | `/og/frontier/generalization.png` |
| 26 | `/frontier/reliability-gap/` | `/og/frontier/reliability-gap.png` |
| 27 | `/frontier/safety-and-assurance/` | `/og/frontier/safety-and-assurance.png` |
| 28 | `/manipulation/action-chunking/` | `/og/manipulation/action-chunking.png` |
| 29 | `/manipulation/action-spaces/` | `/og/manipulation/action-spaces.png` |
| 30 | `/manipulation/bc-foundations/` | `/og/manipulation/bc-foundations.png` |
| 31 | `/manipulation/comparison-matrix/` | `/og/manipulation/comparison-matrix.png` |
| 32 | `/manipulation/cross-embodiment/` | `/og/manipulation/cross-embodiment.png` |
| 33 | `/manipulation/diffusion-policy/` | `/og/manipulation/diffusion-policy.png` |
| 34 | `/manipulation/foundation-models/` | `/og/manipulation/foundation-models.png` |
| 35 | `/manipulation/generalist-policies/` | `/og/manipulation/generalist-policies.png` |
| 36 | `/manipulation/hierarchical/` | `/og/manipulation/hierarchical.png` |
| 37 | `/manipulation/knowledge-insulation/` | `/og/manipulation/knowledge-insulation.png` |
| 38 | `/manipulation/pi-line/` | `/og/manipulation/pi-line.png` |
| 39 | `/manipulation/realtime-execution/` | `/og/manipulation/realtime-execution.png` |
| 40 | `/manipulation/rl-finetuning/` | `/og/manipulation/rl-finetuning.png` |
| 41 | `/manipulation/robot-learning-roadmap/` | `/og/manipulation/robot-learning-roadmap.png` |
| 42 | `/manipulation/vla-models/` | `/og/manipulation/vla-models.png` |
| 43 | `/rl-sim2real/humanoid-wbc/` | `/og/rl-sim2real/humanoid-wbc.png` |
| 44 | `/rl-sim2real/legged-locomotion/` | `/og/rl-sim2real/legged-locomotion.png` |
| 45 | `/rl-sim2real/offline-rl/` | `/og/rl-sim2real/offline-rl.png` |
| 46 | `/rl-sim2real/parallel-sim-rl/` | `/og/rl-sim2real/parallel-sim-rl.png` |
| 47 | `/rl-sim2real/reward-design-mpc/` | `/og/rl-sim2real/reward-design-mpc.png` |
| 48 | `/rl-sim2real/rl-for-robotics/` | `/og/rl-sim2real/rl-for-robotics.png` |
| 49 | `/rl-sim2real/sim2real-transfer/` | `/og/rl-sim2real/sim2real-transfer.png` |
| 50 | `/rl-sim2real/why-rl-locomotion/` | `/og/rl-sim2real/why-rl-locomotion.png` |
| 51 | `/world-models/evaluation/` | `/og/world-models/evaluation.png` |
| 52 | `/world-models/generative-sim/` | `/og/world-models/generative-sim.png` |
| 53 | `/world-models/generative-video/` | `/og/world-models/generative-video.png` |
| 54 | `/world-models/jepa/` | `/og/world-models/jepa.png` |
| 55 | `/world-models/latent-dynamics/` | `/og/world-models/latent-dynamics.png` |
| 56 | `/world-models/model-based-robot-learning/` | `/og/world-models/model-based-robot-learning.png` |
| 57 | `/world-models/taxonomy/` | `/og/world-models/taxonomy.png` |
| 58 | `/world-models/world-models-vs-simulators/` | `/og/world-models/world-models-vs-simulators.png` |

The site card at row 1 MUST be used by exactly these 18 non-article destinations:

1. `/`
2. `/a-z/`
3. `/market-map/`
4. `/playground/`
5. `/how-robots-work/`
6. `/glossary/`
7. `/credits/`
8. `/editorial-policy/`
9. `/about/`
10. `/privacy/`
11. `/search/`
12. `/adjacent/`
13. `/classical/`
14. `/data-hardware/`
15. `/frontier/`
16. `/manipulation/`
17. `/rl-sim2real/`
18. `/world-models/`

The search structured-image corpus is separate from OG/X: it contains exactly 114 article assets, one 1200×900 4:3 image and one 1200×1200 square image for each of the same 57 article owners, under `/structured-images/<domain>/<slug>-4x3.png` and `/structured-images/<domain>/<slug>-square.png`. Those assets are referenced by article structured data and image sitemap entries; no site-card variants exist in that directory.

The generator MUST also derive the registry population and fail if registry truth no longer equals this sealed 57-article list. A future publish requires an owner-approved contract update before the expected OG/X corpus can exceed 58.

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
| `VAL-B2-RES-009` | Generated corpus drift: stale site card, missing article card, extra draft card, duplicate article hash, old font/palette/text | Zero findings across exactly 58 OG/X PNGs and the separate exact 114-file search structured-image corpus. |
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
- exactly 58 OG/X cards pass dimensions, text, font, palette, uniqueness, route ownership, and deterministic-hash checks, and the separate 114-file search structured-image corpus passes its registered dimensions and ownership checks;
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
| `VAL-B2-TYPE-015` | A checked-in type-role registry assigns measurable weights to home wordmark, shell wordmark, page h1, article h1, section display, and display numerals; at every declared viewport each rendered role computes the DM Sans display family at the registered weight and width with no variation-axis override. (Owner decision of 10 October 2026; the brand-v2 row required Tektur `wght`/`wdth` variation values.) |
| `VAL-B2-TYPE-016` | The static OG TTF is mapped to one specific registered web Tektur role instance, and binary inspection proves its style/weight/width instance matches that mapping. |
| `VAL-B2-TYPE-017` | Font `cmap` inspection covers every code point in every assigned web and OG string in the checked-in Tektur binaries; a glyph-probe render in the runtime display family proves no assigned string uses per-glyph fallback. OCR is secondary evidence only. (Owner decision of 10 October 2026; the brand-v2 probe rendered in web Tektur.) |
| `VAL-B2-TYPE-018` | Page h1, article h1, section display, supporting h2/h3, UI body, data/control, and registration-label populations each stay inside their sealed mobile/desktop size, line-height, family, weight, and measure ranges, with non-empty populations or an explicit inapplicable verdict. The sealed ranges are the research-page roles: page and article h1 in DM Sans 400 at 40–48 px on phones and 84–92 px at 1440 px, line height 0.90–0.96; section display in DM Sans 600 uppercase at 20–20.5 px, tracked 0.05–0.06 em; supporting heads in DM Sans 600 at 14–18 px; UI body in Geist 400–600 at 11–16 px (or a listed entry title in DM Sans 600 at 15–16 px); data/control in Geist Mono at 11–24 px; registration labels in Geist 500 uppercase at 11–14 px, tracked about 0.08 em. Every other rendered text run belongs to a sealed population too: the 16 px / 1.62 Geist reading body, sub- and superscripts at 0.60–0.85 of their line, home's featured title and dek, and the DM Sans wordmark instance, so no text falls outside every range. The 768 px tablet frame takes the union of the phone and desktop h1 ranges. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row sealed Tektur display, IBM Plex Sans and IBM Plex Mono ranges. Same strength: every rendered text run on every public route at 375, 768 and 1440 px, each population non-empty.) |
| `VAL-B2-SPACE-001` | Executable spacing tokens expose exactly the fixed ladder `4, 8, 12, 16, 24, 32, 48, 64, 96, 128` px; every first-party spacing value resolves to the ladder unless a registered canvas/viewport or one-pixel optical exception names its geometry reason. The ladder's half-steps (2, 6, 10, 14, 20, 28, 40, 56, 80 and 112 px), on which the research-page template sets tight label stacks, table cells and block rhythm, resolve to it; every other value needs an entry in the checked-in register naming its selector, property, exact values and geometry reason (viewport-derived clamps, em-derived insets, one-pixel optical corrections, the reference rhythm and audit-pinned margins), and an entry or value the sweep never needs is refused. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`. Same strength: every computed margin, padding and gap on every public route at 375, 768 and 1440 px.) |
| `VAL-B2-SPACE-002` | Page-inline padding is at least 20px mobile, 32px tablet, and 48px desktop on every public destination, except a registered full-bleed canvas whose controls/text retain those insets. |
| `VAL-B2-SPACE-003` | Major section separation is 48–80px mobile and 64–128px desktop; component interiors are 12–24px and related-control gaps 4–12px, measured from registered section/control populations. The 768 px tablet frame, which the row does not bound, takes the union of the two: 48–128 px. |
| `VAL-B2-SPACE-004` | The wide editorial frame remains within 1280–1440px on desktop, reading columns remain 62–68ch, and full-frame index/map/playground exceptions are registered and keep readable inner rails. Under the research-page standard the article reading column is the 960 px column (880–960 px measured; `PANTHEON-SPEC.md`: "Content column centred, 960 px.") inside the 1280–1440 px wide frame, a sheet page's column is 880–960 px, a narrow prose page (about, credits, editorial policy, privacy) measures 62–68ch, and the market map, playground and how-robots-work explainer are registered full-frame pages whose paragraphs stay within the 960 px rail. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row measured every reading column in characters. Same strength: every public route at 1440 px, and no paragraph wider than 960 px at any width.) |
| `VAL-B2-SPACE-005` | A page-frame registry identifies frame owner, full-bleed exceptions, optical corrections, and canvas-derived dimensions; missing ownership, unregistered off-ladder geometry, or content/control collision fails. |
| `VAL-B2-SPACE-006` | Collision sweeps cover page h1, section headings, UI/data labels, rails/devices, overlays, focused controls, and full-bleed figures at every layout breakpoint; any overlap, clipping, focus obscuration, or unreadable wrap fails. |

### 24.3 Registries, surfaces, controls, semantics, and material

| ID | Requirement |
| --- | --- |
| `VAL-B2-GRID-009` | Every grid, rail, registration, texture, and decorative-device layer carries a stable annotation/registry ID naming owner surface, structural purpose, anchor geometry, decorative/semantic classification, pointer/ARIA behavior, and allowed viewports. |
| `VAL-B2-GRID-010` | Computed rendered casing (`innerText` plus `text-transform`) is audited for every registered label, so CSS case conversion cannot hide identity, notation, or natural-language drift. Under the research-page standard the audit reads every painted text run whose `text-transform` or `font-variant-caps` changes its case, on every public route at every width, and fails any that rewrites the public identity `Robot Wiki`, a lowercase Greek letter or a unit after a number (`lib/notation-case.ts`). (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`, which keeps uppercase eyebrows and section heads. Same strength.) |
| `VAL-B2-SURF-010` | Every product surface carries a stable variant ID whose registry row names flat/raised/floating/bounded-dark level, stacking purpose, radius, border, shadow tolerance, and allowed owners; source, registry, and rendered populations are equal. |
| `VAL-B2-SURF-011` | Named representative surfaces on home, article, discovery, market map, playground, and social artwork satisfy the §1.12 material predicates: declared deterministic treatment, passing text/graphic contrast, texture-free prose glyph grounds, and the §1.13 ownership/legal-basis/provenance record when external. Under the research-page standard the one material is the flat, first-party `material:paper`: every route of each browser-read surface declares it at every width with text clearing 4.5:1 and nothing behind prose, and every generated card renders byte-identically twice from registered font binaries with no off-palette or translucent pixel. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`. Same strength.) |
| `VAL-B2-COMP-012` | Semantic tokens `ok`, `warn`, `error`, and `destructive` exist separately from brand accents; each has distinct meaning, text/icon/shape cue, measured contrast, and renderer parity wherever used. |
| `VAL-B2-COMP-013` | A control/state registry assigns stable IDs, owner route/mount, action, persistent ARIA, disabled exceptions, target-size requirement, pointer alternative, and supported states; DOM-discovered controls and registered controls/actions reconcile exactly. |
| `VAL-B2-COMP-014` | Interactive targets meet WCAG 2.2 target-size requirements or register an accepted inline/spacing exception with an equivalent pointer alternative; keyboard operation never substitutes for a required pointer alternative. |
| `VAL-B2-COMP-015` | Transient hover and active paint is never serialized as persistent selected/pressed/current ARIA; disabled actions expose native or valid ARIA disabled state, remain out of activation paths, and use their registered neutral exception treatment. |
| `VAL-B2-COMP-016` | Anti-bento and nested-frame rubrics use the §1.12 thresholds: at most three adjacent siblings with one repeated surface/heading/action signature, zero redundant four-sided nested frames, frame depth at most two with the inner-frame exception limited to registered tables/plots/media/control groups, and only registered pill/capsule exceptions; every population is non-empty. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`: no filled pills and no big rounded buttons, so the register holds no pill or capsule exception, and radius is 0 except 7 px on code blocks.) |

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

Owner decision of 19 October 2026 (§12): `VAL-B2-MAP-010` below moved with `VAL-B2-MAP-007`, at the same strength or stronger.

| ID | Requirement |
| --- | --- |
| `VAL-B2-MAP-010` | Canonical company population is derived from the market registry; each company mark has the owner-approved `official-identification-use` legal-basis value, official source URL, retrieval date, file hash, attribution/owner fields and contain fit, with byte/style preservation and no recolour, filter, distortion or crop: its one rendering is the single-ink mask of `VAL-B2-MAP-007`, which reads the file's alpha (or its luminance, for a mask recorded with the file's hash) and edits no byte. Automation verifies the closed record and preservation predicates, not an independent legal opinion. (Owner decision of 19 October 2026; the row allowed the logo tile's one registered monochrome threshold on a neutral plate.) |
| `VAL-B2-MAP-011` | Market-map coverage applies §1.15 to Grid, Bubble/scatter, Funding timeline, every discrete filter/view option, selected/unselected/details/dismiss, URL/history restoration, tooltip parity, one witness per implemented empty/error/loading/unavailable state, deterministic pairwise independent-filter combinations, and only registered higher-order combinations; exact non-zero expected/observed counts must match. |
| `VAL-B2-PLAY-012` | With WebGL available, validation proves an active context, deterministic nonblank model pixels, canonical landmarks/kinematics/material colours, live reduced-motion manipulation, deterministic DPR/resize/reset, and separate unavailable-WebGL fallback; fallback pixels cannot satisfy available-WebGL assertions. |
| `VAL-B2-PLAY-013` | The canonical two-keyframe trajectory fixture imports and plays through intermediate state; `Reset pose` restores pose/camera while preserving trajectory, and `Clear` (named "Clear the recorded poses") removes keyframes/path without changing the reset/default semantics. (Owner decision of 19 October 2026: the control is labelled in plain words; the brand-v2 row named it `Clear trajectory`.) |
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
| `VAL-B2-CONT-007` | Set equality holds among module registry, fixed-route registry, app route inventory, export files, and metadata ledger: 57 article routes plus 18 non-article public destinations = 75 public destinations. The sitemap equals the 73 indexable destinations after the registered `/privacy/` and `/search/` noindex exceptions are removed; 404 is separately registered and never counted as public content. |
| `VAL-B2-CONT-008` | The metadata ledger covers canonicals, titles/descriptions, all OG/X fields, JSON-LD, manifest, favicon/touch icons, theme-colour, and 404 policy for every owning route; owner and rendered/exported values agree. |
| `VAL-B2-CONT-009` | Residue sweeps normalize CSS/SVG/WebGL colours, inspect source literals, raw attributes, computed states, generated pixels with declared tolerance, resource/font requests, provenance, and an explicit v1→v2 migration map; active runtime documentation is in scope while exact-path historical archives are allowlisted. |
| `VAL-B2-EVID-013` | The named suites `brand-v2-route-flows`, `brand-v2-article-interactions`, `brand-v2-market-map-states`, and `brand-v2-playground-states` preserve latest-request-wins, partial errors, URL sync, focus retention, deep-link/history restoration, tooltip parity, table keyboard behavior, and FK/IK/import/error/fallback states through ordered `steps[]`/`captures[]` and exact bounded §1.15 case counts. |
| `VAL-B2-EVID-014` | Evidence uses one common result/failure envelope plus schema-specific payloads for source/build, browser-state, generated-image, and autonomous-reference-comparison results. Non-applicable fields are omitted and accompanied by typed `notApplicableReason`; foreign payload fields cannot substitute for a schema's required fields. Multi-phase evidence uses ordered `steps[]` and `captures[]`. |
| `VAL-B2-EVID-015` | Autonomous comparison records every §1.12 anchor against both references, including identity/hierarchy ratios, grid alignment, purposeful-device counts, bounded light/dark area, repetition/nested-frame metrics, palette/type parity, and material treatment. All applicable anchors pass independently; “looks right”, averaging, or raw cross-composition pixel similarity fails. |
| `VAL-B2-EVID-016` | Every failed result uses the common envelope: assertion ID, population member, expected, actual, selector/registry ID, exception verdict, and applicable route/interactive/state/viewport context; schema-specific screenshot, computed/ARIA, Axe, console/network, source/build, image, rubric, `steps[]`, and `captures[]` fields are required only by their payload schema. Non-applicable fields are omitted with typed `notApplicableReason`; mutation tests prove required fields. |
| `VAL-B2-GOV-002` | The assertion-enforcement-map schema requires assertion ID, canonical population source, `enforcementTargets[]`, enforcement mode, machine predicate, and tagged produced result. Each target names an exact existing test file/title or mandatory evidence row; composite assertions list every target, and multi-phase targets may bind ordered `steps[]`/`captures[]`. Targets must exist; machine claims require automation and visual claims require visual evidence. |
| `VAL-B2-GOV-003` | Mutation tests prove the enforcement map and exhaustive gates fail when an assertion row, target, tagged result, population member, registry entry, evidence record, or entire applicable population is omitted or empty. |
| `VAL-B2-GOV-004` | Milestone 1 creates suites, registries, clean-source/tree-hash baseline manifests, enforcement map, temporary-fixture mutation tests, archived expected-red v1 drift, the §1.12 rubric, and a static-export Playwright fixture/config using a checked-in dependency-free server or direct pinned dependency. Required image/font/OCR tooling is direct/versioned or checked-in deterministic before claims rely on it. Visual suites may remain red until their milestone; all are green by milestone 8. |
