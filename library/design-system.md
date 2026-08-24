# Robot Wiki brand and design system

Status: **locked v2.0**

Owner: Josef Chen

Authority: **owner-approved literal brand-v2**

Last revised: 23 August 2026

This is the executable visual and interaction specification for the product repository. It is not a moodboard and it is not optional guidance. The approved brand board applies to the entire website and every first-party visual surface.

Approved visual references:

- [`brand-reference-board.jpeg`](./brand-reference-board.jpeg) — the literal brand identity board
- [`brand-reference-article.png`](./brand-reference-article.png) — the literal article composition reference

When a reference, this specification, and an implementation detail appear to disagree, use this order:

1. explicit owner decisions recorded in this file;
2. measurable requirements in [`contract/design-integrity.md`](../contract/design-integrity.md);
3. the two approved references;
4. current implementation.

Current implementation is never evidence that drift is acceptable.

## 0. Worker execution contract

Before changing any page, component, visualization, navigation surface, social card, font, colour, texture, illustration, photograph, or generated visual asset, a worker MUST read this file and `contract/design-integrity.md` completely and inspect both approved references.

- `MUST`, `MUST NOT`, and sealed `VAL-B2*` criteria are release requirements.
- Apply this direction literally across the whole product. Do not propose or preserve a parallel paper-system direction.
- Preserve routes, content, citations, source meaning, data truth, accessibility, and working interactions.
- Validation is autonomous. A worker MUST run the required tests, capture the required visual evidence, compare the rendered result with both references, and resolve drift without waiting for a human visual-review pass.
- A shared visual change MUST update the executable tokens, affected primitives, Open Graph/X artwork, generated assets, and validation coverage together.
- A locked foundation may change only with explicit owner approval. The decisions recorded here already have that approval and do not require re-confirmation.
- Technical identifiers remain stable unless a separate engineering task explicitly changes them.

## 1. Brand foundation

### 1.1 Audience

Robot Wiki is for robotics and machine-learning engineers, researchers, builders, and technically literate readers. They assess credibility quickly, inspect citations, notice fake precision, and expect interfaces to reveal system structure.

### 1.2 Promise

Robot Wiki is a current, inspectable encyclopedia of modern robot learning. Non-obvious claims lead to primary sources; diagrams explain real mechanisms; uncertainty remains visible.

### 1.3 Character

- technical precision;
- editorial structure;
- material authenticity;
- signal over noise;
- engineered, not decorated;
- direct, current, and source-conscious.

### 1.4 It is not

- a generic AI startup landing page;
- a toy-robot blog;
- a glossy SaaS bento template;
- an academic PDF pasted into a browser;
- a cyberpunk control room;
- a product catalogue;
- a decorative dashboard collection.

### 1.5 Literal visual thesis

The approved visual world combines:

- a squared, technical display face;
- paper, concrete, graphite, ink, highlight lime, and signal blue;
- strong black actions;
- engineering rails, fine grids, registration marks, indices, and measured rules;
- flat editorial structures with occasional bounded raised or dark instrument surfaces;
- truthful technical linework, material photography, and signal-like data graphics;
- visibly licensed and attributed visual evidence.

These are a system, not a menu of optional effects. Each product surface MUST carry enough of the system to be recognizably Robot Wiki while protecting readability and task completion.

## 2. Sources of truth

| Concern | Canonical source |
| --- | --- |
| Owner-approved visual reference | `library/brand-reference-board.jpeg` |
| Owner-approved article reference | `library/brand-reference-article.png` |
| Brand, component, and interaction intent | `library/design-system.md` |
| Measurable repository acceptance | `contract/design-integrity.md` |
| Runtime colour, type, spacing, shape, grid, and elevation tokens | `app/globals.css` |
| Font loading and site metadata | `app/layout.tsx` |
| Shared behavior and primitives | `components/ui/`, `components/nav/`, `components/article/` |
| Visualization and interactive behavior | `components/interactive/`, `components/market-map/`, playground implementation |
| Social-card geometry | `lib/og-card-artwork.ts` |
| Generated social cards | `public/og/` |
| Enforced implementation | unit, browser, accessibility, image, and residue tests |

Earlier design spikes and the v1 paper-system wording in repository history are superseded evidence. They may explain prior implementation choices but MUST NOT direct new work.

## 3. Identity and naming

### 3.1 Public display identity

The public product name and wordmark are exactly:

> Robot Wiki

- Capital `R`.
- Capital `W`.
- One literal space.
- No hyphen.
- No terminal punctuation.
- No forced all-caps or all-lowercase rendering.
- No alternate spelling in visible brand lockups, metadata titles, image alt text, or social artwork.

The descriptor is exactly:

> Citation-first encyclopedia of modern robot learning.

The period is part of the descriptor. Do not shorten, title-case, uppercase, paraphrase, or use the previous descriptor.

### 3.2 Technical identifiers are not display identity

Stable technical identifiers MUST remain unchanged when visual identity changes. Examples include:

- repository or package references containing `robot-wiki`;
- the production domain `robot-wiki.com`;
- filesystem names and generated paths;
- code symbols, IDs, analytics keys, and test fixtures;
- the technical identifier `robot-atlas-trajectory`.

`robot-wiki` and `robot-atlas-trajectory` MUST NOT be promoted as visible public brand lockups. Conversely, the display string `Robot Wiki` MUST NOT be used to rename stable technical paths without a separately approved migration.

### 3.3 Wordmark

The wordmark is live type set in Tektur Variable. It is not an image logo.

- Use Tektur Variable at a weight and width-axis setting that preserve the squared, engineered silhouette visible in the board.
- Preserve the two-word line break only when composition benefits; both one-line and stacked lockups are valid.
- Keep custom tracking tight but legible. Do not overlap glyphs.
- Use ink on light surfaces and paper/white on dark bounded surfaces.
- The wordmark MUST remain selectable HTML text wherever the medium permits.

### 3.4 No invented symbol

The board approves a typographic wordmark plus structural devices, not a separate icon. Do not introduce:

- an `RW` monogram;
- a robot head, face, mascot, gear, chip, cube, circuit, bolt, or crosshair logo;
- a fabricated favicon presented as a new identity;
- a distorted, outlined, chromed, extruded, or distressed wordmark.

Registration crosses, rails, arrows, sequence numbers, and literal grids are compositional devices, not standalone logos.

### 3.5 Lockups

| Placement | Wordmark | Descriptor |
| --- | --- | --- |
| Home hero | Stacked where space allows; dominant Tektur display | Exact descriptor, sentence case, IBM Plex Mono |
| Desktop shell | Compact one-line `Robot Wiki`; Tektur | Exact descriptor may appear once at the shell origin if it does not crowd navigation |
| Mobile header | Compact one-line `Robot Wiki`; Tektur | Omit |
| Article chrome | Compact `Robot Wiki`; Tektur | Omit |
| Site OG/X card | Dominant `Robot Wiki`; Tektur | Exact descriptor |
| Article OG/X card | Compact `Robot Wiki`; Tektur | Omit; article facts take precedence |

## 4. Typography

### 4.1 Licensed family roles

| Role | Family | Required use |
| --- | --- | --- |
| Display identity | **Tektur Variable** | Wordmark, page h1, major section titles, selected navigation emphasis, display numerals |
| Interface | **IBM Plex Sans** | Navigation, body UI, controls, labels, captions, supporting headings |
| Reading | **Newsreader** | Long-form article prose, quotations, equation-bearing explanation |
| Data | **IBM Plex Mono** | Code, values, source metadata, labels, coordinates, sequence numbers, chart annotations |

Tektur Variable is the approved licensed display family and MUST use this sealed delivery split:

- Web rendering uses a checked-in Latin-subset variable WOFF2 with exactly the `wght` and `wdth` axes, loaded through `next/font/local`.
- OG/X rendering uses a separate checked-in static TTF. The static TTF is an offline-renderer asset only and MUST NOT be loaded by the website.
- The web WOFF2 and OG-only TTF MUST ship with the applicable OFL license text and checked-in metadata recording the upstream source URL and revision, SHA-256 checksum for each shipped binary, file format and subset, axis tags/ranges/defaults for the variable file, and style/weight represented by the static file.
- Automated validation MUST inspect the binaries and metadata, verify checksums, verify that the web file exposes `wght` and `wdth` and no undocumented axis, verify that the OG file is static, verify `next/font/local` web loading, and verify that neither path makes a runtime third-party font request.

This split replaces IBM Plex Sans as the public display identity, but not as the supporting interface family. `wdth` is the width axis.

### 4.2 Display behavior

- Tektur is for short, high-value strings. It MUST NOT set long paragraphs.
- Display headings use sentence case unless the content itself requires another case.
- Prefer broad one- to three-line editorial headings. Avoid narrow six-line headline stacks on desktop.
- Display numerals may be oversized as editorial wayfinding, never as fabricated metrics.
- The angular Tektur silhouette MUST remain crisp; no outline, bevel, skew, glow, or faux bitmap filter.

### 4.3 Type scale

The implementation MAY use fluid `clamp()` values, but rendered sizes MUST stay within these bounds:

| Element | Mobile | Desktop | Family / notes |
| --- | ---: | ---: | --- |
| Home wordmark | 52–68px | 88–120px | Tektur, 520–650, line-height 0.88–0.98 |
| Page h1 | 38–52px | 56–80px | Tektur, line-height 0.95–1.06 |
| Article h1 | 34–44px | 48–64px | Tektur, line-height 1.00–1.10 |
| Section display | 26–34px | 32–46px | Tektur |
| Supporting h2 | 22–28px | 26–34px | Tektur or IBM Plex Sans by density |
| Supporting h3 | 18–22px | 20–24px | IBM Plex Sans 600 |
| Long-form body | 18px / 1.65–1.80 | 19–21px / 1.60–1.75 | Newsreader, 62–68ch |
| UI body | 14–17px | 14–17px | IBM Plex Sans |
| Data/control | 11–14px | 11–14px | IBM Plex Mono where fixed-width scanning helps |
| Registration label | 9–11px | 9–11px | Mono, uppercase permitted, 0.08–0.14em |

### 4.4 Editorial link treatment

The article reference is authoritative:

- linked section headings use a thin signal-blue underline aligned to the text baseline;
- inline citations and source links use signal blue plus underline;
- dotted or dashed underlines may distinguish glossary definitions from outbound links;
- link icons remain small and secondary;
- underline, label, or icon MUST supplement colour.

### 4.5 Typography discipline

- Use tabular numerals for aligned changing values.
- Use true typographic minus, multiplication, and mathematical symbols when semantically correct.
- Do not set prose paragraphs in mono or Tektur.
- Do not letterspace ordinary body copy.
- Uppercase mono labels are allowed as technical registration metadata, but repeated eyebrow clutter is not.
- Headings, captions, labels, and buttons use natural, concrete language.

## 5. Palette and semantic roles

### 5.1 Core brand palette

The highlight and signal values below are explicit owner decisions and override colour variation caused by JPEG compression in the reference board.

| Token | Hex | Role |
| --- | --- | --- |
| `--color-ink` | `#0B0B0C` | Primary text, strongest rules, primary actions, inverse grounds |
| `--color-graphite` | `#242D33` | Body UI text, dark panels, secondary dark marks |
| `--color-concrete` | `#D9DADB` | Borders, rails, inactive structure, neutral plotting |
| `--color-paper` | `#F5F6F7` | Page ground |
| `--color-white` | `#FFFFFF` | Flat and raised reading surfaces |
| `--color-highlight` | `#C6FF19` | Selection, highlight, active chip, annotation strike, controlled emphasis |
| `--color-signal` | `#245FFF` | Links, focus, registration, selected data series, live signal |

Near colours MAY be introduced only as named tonal derivatives calculated from these foundations and documented as tokens. They MUST NOT displace the exact foundation values.

### 5.2 Action hierarchy

- Primary actions are ink/black filled with white text.
- Selected, toggled, or highlighted states use highlight lime with ink text.
- Signal blue is for links, focus, registration, and active information paths.
- A secondary call to action may use highlight lime only as an optional registered emphasized secondary when it cannot be confused with a persistent selected state; ordinary secondary actions are outlined or transparent.
- Tertiary actions are white or transparent with an ink hairline.
- Never use lime text on white or paper as the sole carrier of meaning.
- Never default primary buttons to blue.

### 5.3 Semantic colours

Success, warning, and error require dedicated accessible tokens distinct from the brand accents. Their exact runtime values MUST meet WCAG 2.2 AA in context and be mirrored in visualizations where applicable.

- Lime does not mean success.
- Blue does not mean warning.
- Semantic state MUST also be expressed by words, iconography, line style, or shape.

### 5.4 Light and dark usage

The website is light-led, not light-only.

- Paper is the default page ground.
- White is the default reading and component surface.
- Ink or graphite dark surfaces are allowed as bounded instruments: technical diagrams, code, featured simulations, selected visualizations, media frames, and the 3D playground.
- Dark fills on actions and compact controls are governed by the action/control hierarchy and are excluded from the bounded-dark-instrument classification. A black primary button or compact ink active segment does not need to qualify as an instrument.
- A dark instrument surface MUST have a clear boundary and MUST NOT turn the entire shell or article into a generic control-room theme.
- Dark surfaces use paper/white text, concrete secondary marks, and restrained lime/blue signals.
- Dark panels MAY occupy substantial space when the content is itself an instrument, as in the approved article reference, but prose surrounding them remains on paper.

### 5.5 Contrast

- Normal text meets at least 4.5:1.
- Large text and essential graphic boundaries meet at least 3:1.
- Focus, selected controls, and meaningful chart marks remain distinguishable against adjacent colours.
- Lime surfaces carry ink text; blue surfaces carry white only when the measured contrast passes, otherwise use ink/blue outlines instead.

### 5.6 Gradients

Decorative colour gradients are prohibited. Tone may come from material photography, dither, halftone, alpha overlays, WebGL lighting, or data-density rendering when they communicate structure. A gradient required by a scientific scale MUST be source-appropriate, labelled, accessible, and confined to that visualization.

## 6. Structural grid, rails, and registration devices

The literal engineering structure in the board replaces the v1 “home-only grid” restriction.

### 6.1 Base grid

- Use an 8px visual grid with 4px fine alignment.
- Major compositions align to a 12-column desktop grid, 8-column tablet grid, and 4-column mobile grid.
- Grid lines are 1px concrete at low contrast.
- A fine dot or line grid may appear in hero, navigation, index, chart, playground, market-map, and social-artwork surfaces.
- Grid structure MUST NOT reduce prose contrast or create moiré behind reading text.

### 6.2 Rails

Rails are literal structural rules that organize content:

- vertical outer rails;
- section-start rules;
- baseline-aligned metadata rails;
- chart axes and table rules;
- bounded header/footer rails.

Rails use concrete by default, ink for a major division, signal blue for focus/registration, and lime only for an active measured interval.

### 6.3 Registration devices

Allowed registration devices include:

- small `+` crosses;
- corner crop marks;
- axis ticks;
- sequence labels such as `01`, `02`, and `M07`;
- short coordinate labels;
- one-pixel leader lines;
- directional northeast arrows.

They MUST align to real layout geometry or identify real sequence/state. Do not scatter them randomly.

### 6.4 Density limits

- No registration device may obscure reading text or a control.
- A content section SHOULD use no more than one dominant registration motif.
- Decorative marks MUST be `aria-hidden`.
- Grid and rail layers MUST not intercept pointer events.
- The mobile composition simplifies devices rather than scaling every desktop mark down.

## 7. Spacing and composition

### 7.1 Spacing ladder

Use the 4px base and this fixed ladder:

`4, 8, 12, 16, 24, 32, 48, 64, 96, 128`

Values outside the ladder require a documented geometry reason such as a one-pixel optical correction or a viewport-derived interactive canvas.

### 7.2 Page frame

- Desktop content uses a wide editorial frame, typically 1280–1440px maximum, with persistent shell structure.
- Major page sections receive 64–128px vertical separation on desktop and 48–80px on mobile.
- Reading columns remain 62–68ch even when diagrams and figures break wider.
- Broad indexes, market maps, and playgrounds may use the full content frame.
- Page padding is at least 20px mobile, 32px tablet, and 48px desktop.

### 7.3 Composition

- Prefer asymmetric editorial balance over uniformly centered card grids.
- Use whitespace, rails, display type, and material contrast for hierarchy.
- Keep related controls tight: 4–12px gaps.
- Keep component interiors deliberate: 12–24px.
- Allow selected imagery or instruments to break the reading column into a wider figure rail.
- Do not create space by stacking empty decorative containers.

## 8. Shape, borders, and elevation

### 8.1 Radius ladder

The approved radius ladder is:

`0, 2, 4, 8, 16, 24px`

- `0`: rails, tables, technical frames, segmented controls, dark instruments.
- `2`: compact controls, labels, code actions.
- `4`: default cards, inputs, callouts.
- `8`: featured modules and media frames.
- `16`: rare large raised/floating panels.
- `24`: circular or near-circular compact marks only, or a large bounded object explicitly shown as such.
- Pills and full capsules are reserved for compact toggles, status, or filters where the geometry communicates grouping. They are not decorative tags.

### 8.2 Border styles

- Hairline: 1px solid concrete.
- Strong: 1px solid ink or graphite.
- Dashed: 1px concrete dash for provisional, comparison, drop, or inactive boundaries.
- Registration: 1–2px signal blue for focus or selected geometry.
- Highlight: 2px lime only when the state is selected/highlighted and remains clear without colour.

### 8.3 Elevation

The board approves three surface levels:

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | No shadow; hairline optional | Tables, rails, inputs, most editorial sections |
| Raised | Small neutral hard/soft shadow with ≤8px blur and low alpha | Actionable card, calculator, active module |
| Floating | Stronger but still neutral shadow with ≤20px blur | Temporary overlay, menu, modal, dragged object |

- Elevation MUST correspond to interaction or stacking.
- No coloured shadows, glow, glass blur, bevel, or neumorphism.
- Do not make every card raised.
- Focus is never communicated by shadow alone.

## 9. Texture and material rules

Texture gives material authenticity, not vintage decoration.

Allowed:

- subtle monochrome paper grain;
- concrete photography or scans with documented rights;
- low-opacity halftone/dither;
- technical linework;
- high-frequency signal plots when backed by real data or clearly labelled generative rendering;
- light print/registration imperfections confined to artwork.

Requirements:

- Texture opacity remains low enough to preserve text contrast.
- Texture assets are deterministic, optimized, and credited when external.
- Texture does not animate ambiently.
- No fake stains, torn-paper edges, photocopy grunge over prose, chrome, lens flare, or film burn.
- No texture may impersonate evidence, sensor output, or a measured signal.

## 10. Component language

### 10.1 Actions

- Primary: ink fill, white text, compact Tektur or IBM Plex Sans label, directional arrow when it clarifies navigation.
- Secondary: outlined/transparent by default; optional lime fill with ink text only for a registered emphasized secondary that cannot be confused with selection.
- Tertiary: white/transparent, ink hairline, ink text.
- Destructive: dedicated error colour and explicit language.
- Pressed/selected states change fill, border, and/or icon; colour is not the sole signal. Transient hover/pressed paint does not receive persistent selected/pressed/current ARIA. Disabled actions use explicit neutral exceptions and remain non-activatable.
- No bounce, glow, or scale-up hover.

### 10.2 Tabs and segmented controls

- Use contiguous, squared or 2px-radius segments.
- Active segment is ink with white text or lime with ink text according to whether it represents navigation or selection.
- The group has one outer border; segments do not become separate floating pills.
- Use `aria-selected`, `aria-pressed`, or the native equivalent.

### 10.3 Inputs and search

- Every input has a persistent visible label.
- Inputs use white or paper ground, 1px concrete border, 2–4px radius, and signal-blue focus.
- Search may include a keyboard shortcut label and a functional clear action.
- Placeholder text never replaces the label.
- Results update states are announced without stealing focus.

### 10.4 Cards and modules

- Cards group a real article, source, tool, company, or interaction.
- Cards use one clear level of framing.
- A module card may carry a sequence label, factual status, source count, and directional arrow.
- Hover strengthens an existing structural cue; it does not lift every object indiscriminately.
- Avoid nested bordered cards except where an inner table, plot, or control is a real instrument.

### 10.5 Badges, chips, and status

- Chips are for filters, compact provenance, state, or taxonomy.
- Selected filters use lime plus an independent selected indicator.
- Status uses semantic colour and text.
- Do not convert ordinary category or metadata prose into pill rows.

### 10.6 Callouts and citations

- Citation callouts use a white or paper surface, signal-blue left registration rule, source icon, and explicit source language.
- Every non-obvious claim MUST remain traceable to a primary source.
- Warning and error callouts use semantic tokens, never lime or signal blue as substitutes.
- Copyable commands use a mono dashed/solid frame and a labelled copy button.

### 10.7 Tables

- Tables use one outer frame where needed, horizontal row rules, and clear column alignment.
- Headers use paper/concrete tonal separation, not heavy fill by default.
- Numeric values use tabular figures and align by meaning.
- Published values render their source value; existing but undisclosed values read `not disclosed`; genuinely inapplicable fields read `n/a`.
- Sort controls are real buttons; `aria-sort` reflects state.
- Tables scroll within their own region at narrow widths and do not widen the document.

### 10.8 Icons

- Use the existing licensed icon system for functional icons.
- Typical size is 14–20px.
- Icons support labels; they do not replace the wordmark.
- Northeast arrows are a recurring navigation/action cue, not universal decoration.
- No emoji in product chrome.

## 11. Navigation and shell

- The shell MUST present `Robot Wiki`, not the technical identifier.
- Desktop navigation uses a disciplined structural rail and preserves existing route hierarchy.
- Active navigation uses ink and/or lime selection with an independent rule, weight, or marker.
- Signal blue is reserved for keyboard focus and link behavior, not a default full navigation fill.
- Navigation group labels use mono registration style sparingly.
- The mobile header remains compact and keeps the wordmark legible.
- The mobile drawer is opaque, traps focus, closes on Escape, restores focus, and makes obscured content inert.
- Skip navigation remains the first keyboard destination.
- Hover, current, expanded, and focus states are visually distinct.
- `aria-current="page"` appears exactly once only when the current route has a corresponding navigation item. Routes without a corresponding item expose no `aria-current="page"`. It MUST remain on the matching navigation link and MUST NOT be placed on a heading or unrelated element to satisfy a count.

## 12. Home and domain surfaces

### 12.1 Home

The home page is an editorial brand statement and working index, not a card marketplace.

- Lead with the dominant Tektur `Robot Wiki` lockup and exact descriptor.
- Use a literal grid/rail composition derived from the board.
- Surface the seven domain routes without changing their names or destinations.
- Pair strong editorial type with a small number of truthful modules, technical imagery, and live explanatory instruments.
- Black primary action and lime selection/highlight behavior MUST be visible in the first major composition.
- Avoid fabricated counts, build progress, or marketing claims.

### 12.2 Domain landing pages

- Carry the same shell, rail, display type, palette, and registration logic.
- Make domain sequence, scope, and article relationships visible.
- Prefer indexed editorial rows or modules over homogeneous card grids.
- Preserve current article inventory and source-backed descriptions.

## 13. Articles

The approved article reference is the baseline for long-form composition.

### 13.1 Article structure

- Breadcrumb/domain context precedes the title.
- Tektur sets the article title and high-level section display.
- Newsreader sets long-form explanatory prose at 62–68ch.
- IBM Plex Mono sets equations-as-text, source metadata, diagram labels, values, and code.
- Linked headings use the signal-blue underline behavior from the reference.
- Title blocks preserve existing factual metadata: review date, reading time, and citation count where available.

### 13.2 Figures and diagrams

- Wide figures may extend beyond the prose measure while remaining inside the page frame.
- A dark bounded diagram is an approved article pattern.
- Dark diagrams use clear labels, truthful geometry, accessible descriptions, and a visible boundary against paper.
- Captions state the takeaway before provenance.
- Credit lines name creator, source, and license, with a working license link.
- A schematic identifies itself and does not imply published measurements.

### 13.3 Prose and evidence

- Citation markers remain inline, keyboard reachable, and unambiguous.
- Definitions may use a dotted underline but remain available without hover.
- Equations need accessible text or an equivalent explanation.
- Callouts do not interrupt every paragraph.
- Unknown data remains unknown; never coerce missing evidence to zero.
- Existing article content and citation meaning MUST not change during visual rollout.

## 14. Discovery: search, A–Z, glossary, and indexes

- Search, A–Z, glossary, and domain indexes share the same display, rail, filter, and selection language.
- Search empty, loading, results, filtered, no-results, and error states are explicit.
- Selected filters use lime with text/icon confirmation.
- Search-result titles remain links using signal blue or a strong ink treatment with an explicit hover/focus underline.
- Match excerpts preserve source wording and never fabricate context.
- Keyboard users can reach, change, clear, and reset every filter.
- A–Z and glossary anchors remain deep-linkable.
- Dense result lists use rules and rhythm before cards.

## 15. Visualizations and interactives

An interactive is an explanatory instrument.

- Every visualization begins with a claim or question and exposes its current state in text.
- Signal blue is the lead data signal or active path.
- Lime is selection/highlight, not a second unlabeled series.
- Ink, graphite, and concrete carry context and comparison.
- Semantic colours retain semantic meaning.
- Every series/state has a non-colour distinction: label, shape, marker, dash, geometry, or position.
- Values are source-backed; unknowns read `not disclosed`.
- Schematics label themselves.
- First render is deterministic.
- Keyboard controls, visible focus, a working reset, and a current-state description are mandatory.
- No autoplay teaching sequence, fake telemetry, decorative waveform, or fabricated progress.
- Dark instrument surfaces are allowed and SHOULD echo the article reference when they improve signal clarity.

## 16. Market map

- The market map is a research instrument, not a logo wall.
- Preserve company records, category truth, source dates, funding data, and deep links.
- Use the editorial grid for axes, grouping, timelines, and details.
- Selected companies or filters use lime plus a textual/shape marker.
- Signal blue identifies an active relationship, timeline trace, or link.
- Third-party company marks retain source identity and sit on a consistent neutral plate.
- Missing disclosed values remain `not disclosed`.
- Bubble size, position, line, and colour MUST have explicit legends and accessible equivalents.
- Hover-only facts must also be reachable by focus and selection.
- A selected-company detail surface may be raised; it must not obscure map controls or trap keyboard users.
- Mobile uses a readable list/detail or simplified plot state rather than shrinking the desktop map beyond comprehension.

## 17. 3D playground

- The 3D playground is a bounded dark or graphite technical instrument inside the light product shell.
- The shipped SO-101 geometry, joint limits, kinematic relationships, and trajectory data remain truthful.
- `robot-atlas-trajectory` remains a stable technical identifier and is not public display branding.
- Ink/graphite establish the canvas; concrete carries passive geometry; signal blue carries active path/focus; lime carries selected joint/target.
- Controls use the shared black/lime/outlined hierarchy.
- Keyboard operation, labelled sliders/inputs, deterministic reset, and a textual state summary are required.
- Reduced motion constrains non-essential camera/model transitions while retaining direct playground manipulation and immediate state feedback.
- A static playground fallback is permitted only when WebGL is unavailable; reduced-motion preference alone MUST NOT replace the interactive instrument with a static fallback.
- Do not add ambient particles, cinematic bloom, fake telemetry, or an unlabelled HUD.
- If WebGL requires resolved colour constants, mirrors MUST be documented and tested against runtime tokens.

## 18. Imagery, art direction, and licensing

### 18.1 Approved directions

- technical precision: truthful line drawings, exploded views, mechanism diagrams;
- material authenticity: licensed concrete, hardware, lab, and fabrication photography;
- editorial structure: measured crops, index labels, rails, and captions;
- signal over noise: source-backed traces, sparse high-contrast plotting, deterministic generative signals.

### 18.2 Allowed imagery

- licensed photographs of real robots, hardware, labs, and deployments;
- source-backed paper figures when license and attribution permit;
- purpose-built diagrams that accurately explain a mechanism;
- truthful renders of the shipped model and data;
- owned or properly licensed material textures.

### 18.3 Prohibited imagery

- AI-generated robots or synthetic lab photography;
- stock humanoids, glowing brains, chrome heads, fake blueprints, or circuit wallpaper;
- decorative technical imagery that implies nonexistent evidence;
- diagrams more precise than their sources;
- unlicensed third-party marks or photographs.

### 18.4 Required metadata

Every external image or texture uses the owner-approved closed legal-basis enum and records creator/owner, official source URL, retrieval date, content hash, attribution, licence/permission reference, and byte/style preservation policy. Company marks use the distinct `official-identification-use` path, preserve official bytes/style, and are not redrawn in Robot Wiki style. Automation verifies those records and preservation predicates; it does not issue an independent legal opinion.

## 19. Open Graph and X

- Canvas is exactly 1200×630px.
- Every card uses the registered static Tektur instance mapped to the approved web Tektur Variable role and follows the same palette, grid, rails, and registration logic as the website.
- Site card: `Robot Wiki` plus the exact descriptor.
- Article cards: real article title, domain, review year, reference count, and compact `Robot Wiki` identity.
- Article cards remain byte-distinct through factual text and deterministic composition, never random ornament.
- The title remains legible in a small X timeline preview.
- Cards may use paper or a bounded dark instrument region, but no generic screenshot collage, fake chart, tiny UI, or unlicensed image.
- The required corpus is exactly 48 PNGs for the current 47 published articles plus the site card; the exact matrix is sealed in `contract/design-integrity.md`.
- Non-article destinations use the site card unless the contract is deliberately revised after owner approval.
- Regenerate the complete corpus after font, palette, identity, grid, or artwork changes.

Satori or another offline renderer may mirror resolved font and colour values. Every mirror MUST be explicit and parity-tested.

## 20. Motion

- Motion is functional, brief, and mechanical.
- Allowed: menu entry, disclosure, filter/state change, direct manipulation, focus transition, measured plot update.
- Use linear or restrained ease-out timing; avoid elastic and spring behavior.
- No ambient scanning line, parallax, logo animation, floating particles, looping charts, or autoplay narrative.
- Layout MUST not animate merely to attract attention.
- `prefers-reduced-motion` disables non-essential movement and substitutes immediate state changes while preserving direct manipulation and control. It does not trigger a static playground fallback.

## 21. Accessibility and responsive behavior

- WCAG 2.2 AA is the minimum.
- Use semantic HTML before ARIA.
- Every interaction works with keyboard and visible focus.
- Global focus uses a 2px signal-blue outline with at least 2px offset or an equally visible component-specific treatment.
- Interactive targets SHOULD be at least 24×24px; 44×44px is preferred for isolated touch controls.
- Colour never carries meaning alone.
- Charts, diagrams, market-map states, and 3D states expose textual equivalents.
- Scrollable regions are keyboard reachable and labelled.
- Respect reduced motion, forced colours, zoom, text resizing, and high contrast.
- At 375px, 768px, 1024px, and 1440px widths there is no unintended document overflow.
- Mobile simplifies registration density and complex plots without hiding content or capability.
- Desktop and mobile navigation use valid landmarks, unique IDs, correct current-state semantics, focus trapping, and focus restoration.
- Current-route semantics follow navigation truth: exactly one matching navigation link uses `aria-current="page"` when such an item exists, and routes without a matching navigation item use none.

## 22. Voice and copy

Write like an engineer explaining a system to another engineer.

- Lead with the mechanism, fact, or uncertainty.
- Prefer short, concrete sentences.
- Name sources and limitations.
- Distinguish measured, reported, claimed, inferred, generated, and schematic.
- Use real quantities and units.
- Preserve established article terminology unless a content task changes it.

Avoid hype and synthetic authority. Do not write `revolutionary`, `cutting-edge`, `game-changing`, `seamless`, `unlock`, `supercharge`, `next-generation`, `at the forefront`, `in today's rapidly evolving`, or `the future is here` unless clearly attributed to a source.

## 23. Anti-generic release bans

These are release failures:

- displaying `robot-wiki` or `robot-atlas-trajectory` as the public product name;
- using any descriptor other than `Citation-first encyclopedia of modern robot learning.`;
- retaining the v1 IBM-Plex-Sans wordmark;
- inventing a logo, mascot, monogram, or brand icon;
- blue primary-action buttons;
- using lime as success or blue as warning;
- generic bento-card landing pages;
- full-site black control-room styling;
- glass, coloured glow, neon chrome, or decorative gradients;
- rounded-everything pill systems;
- random crop marks, axes, numbers, or technical glyphs with no structural alignment;
- nested boxes and redundant dividers;
- repeated eyebrow labels above ordinary headings;
- ambient scanning, particles, parallax, or fake telemetry;
- AI-generated robot imagery;
- uncredited imagery or texture;
- fake numbers, fake charts, or unknown values shown as zero;
- inaccessible colour-only state;
- small illegible UI reproduced in social artwork;
- mixed v1/v2 identity, fonts, hex values, or generated cards.

## 24. Implementation map

| System element | Expected implementation area |
| --- | --- |
| Runtime tokens, type roles, grids, rails, radius, elevation, texture | `app/globals.css` |
| Font loading, public identity metadata | `app/layout.tsx` |
| Home composition | `app/page.tsx` |
| Shell, wordmark, navigation | `components/nav/` |
| Shared actions, inputs, cards, tabs, callouts, tables | `components/ui/` |
| Article title, prose, citations, figures | `components/article/`, `mdx-components.tsx` |
| Search and discovery | `app/search/`, `app/a-z/`, `app/glossary/`, related components |
| Interactive figures | `components/interactive/` |
| Market map | `app/market-map/`, `components/market-map/` |
| 3D playground | `app/playground/`, related components and trajectory helpers |
| OG/X composition | `lib/og-card-artwork.ts` |
| Generated cards | `public/og/` |
| Executable acceptance | unit tests, E2E tests, accessibility checks, image checks, residue sweeps |

This map assigns responsibility; it does not authorize route, content, citation, or data changes.

## 25. Narrow implementation exceptions

1. **Renderer mirrors.** Offline OG and WebGL renderers may repeat resolved values when they cannot consume CSS variables. Mirrors remain explicit and parity-tested.
2. **Scientific scales.** A source-appropriate continuous colour scale may appear inside a labelled scientific visualization when the data requires it and an accessible equivalent exists.
3. **Third-party identity.** Company marks may retain source colours on the standardized neutral plate.
4. **Material assets.** Licensed material photography may contain natural tonal gradients; this does not permit decorative UI gradients.
5. **Technical identifiers.** Stable strings such as `robot-wiki`, `robot-wiki.com`, and `robot-atlas-trajectory` remain in technical contexts and are exempt only from public-display identity sweeps.

An exception is local. It does not create a general pattern.

## 26. Governance

Locked foundations:

- public identity `Robot Wiki`;
- exact descriptor;
- Tektur Variable display role;
- IBM Plex Sans, Newsreader, and IBM Plex Mono support roles;
- highlight `#C6FF19`;
- signal `#245FFF`;
- black primary actions and lime selection/highlight;
- literal structural grid/rail/registration language;
- the two approved references;
- truth, citation, accessibility, and route-preservation requirements.

Changing a locked foundation requires explicit owner approval. For an approved change:

1. update this specification;
2. update the measurable contract;
3. update executable tokens and shared primitives;
4. update all affected routes and states;
5. update OG/X artwork and regenerate all 48 cards;
6. update automated validation and zero-residue sweeps;
7. run autonomous visual evidence review at every matrix row;
8. leave no mixed-system residue.

Workers MUST NOT stop at “tests pass.” They must compare rendered evidence with the approved references and fix visible drift.

## 27. Autonomous release review

A brand-v2 release is complete only when the worker:

1. runs lint, typecheck, unit tests, production build, and the relevant browser suites;
2. generates the complete 48-card OG/X corpus;
3. captures every route/viewport/state row in the sealed matrix;
4. derives every exported public route from the canonical route/content registries and runs browser, computed-style, Axe, responsive-overflow, and rendered/source residue sweeps across that complete population;
5. derives every interactive and its declared visual states from the canonical interactive registry and runs the exact bounded state cases: each discrete option independently, slider min/default/max plus registered discontinuities/source anchors, reset/default/focus/meaningful hover/selected, one witness per implemented loading/error/empty/unavailable state, deterministic pairwise independent-control combinations, and only registered higher-order combinations; expected and observed non-zero case counts must match and a full Cartesian product is not required;
6. checks actual rendered font family, colour, geometry, overflow, focus, and interaction states;
7. runs named automated evidence for search loading/error, reduced motion, forced colours, literal 320 CSS px reflow, the sealed halved-CSS-viewport/DPR-2 200% zoom-equivalent profile, and injected 200% text-only resizing even where those states are not separate deep-screenshot rows;
8. runs source and generated-output zero-residue sweeps;
9. compares home, article, market map, playground, discovery, and social cards with both references;
10. records pass/fail evidence and resolves every failure autonomously.

The exact 27-row matrix remains the mandatory deep screenshot matrix. It supplements rather than limits the registry-derived exhaustive sweeps. The five-route home/article/search/market-map/playground set is an iterative smoke set only and is never acceptable as final release evidence. The exact matrix, named suites, assertion-to-evidence mapping, and pass conditions live in `contract/design-integrity.md`.

## 28. Eight-milestone rollout

The rollout is sequential. A later milestone MUST NOT ship on top of an incomplete earlier foundation.

### Milestone 1 — Authority and validation migration

- Land the two approved reference files.
- Replace v1 authority with this v2 specification and sealed contract.
- Establish residue terms, evidence naming, the assertion-to-enforcement map, and registry-derived exhaustive sweep requirements.
- Deliver `brand-v2.spec.ts` and `brand-v2-og.spec.ts`.
- Milestone 1 starts from a clean tracked tree or records the exact Git tree hash, manifest root hashes, and pinned tool/runtime versions; creates registries, enforcement map, temporary/in-memory mutation tests where feasible, the checked-in reference-feature rubric, both new suites, and a static-export Playwright fixture/config using an existing dependency-free server or direct pinned dependency; then archives expected-red v1 drift. Required image/font/OCR tooling is direct/versioned or a checked-in deterministic script before any claim relies on it. Existing functional/accessibility gates stay green. Brand-v2 visual suites do not need to be green to close milestone 1; each assertion becomes green in its responsible later feature/milestone, and all are green by milestone 8.

### Milestone 2 — Foundations and shared primitives

- Implement the sealed Tektur web/OG delivery split.
- Implement identity, palette, typography, spacing, radius, border, elevation, grid, rail, texture, focus, and motion tokens.
- Convert shared actions, inputs, tabs, cards, chips, callouts, citations, tables, and icons.
- Add token/renderer parity tests.

### Milestone 3 — Shell and home

- Convert desktop shell, mobile header, drawer, wordmark, descriptors, active states, search entry, and global footer.
- Recompose home with the literal board language and preserve all seven domain destinations.
- Validate current route hierarchy, semantics, focus, and responsive behavior.

### Milestone 4 — Editorial articles and diagrams

- Convert article headers, prose, linked headings, metadata, citations, figures, dark diagrams, captions, references, tables, and related-content structures.
- Use the approved article reference as the comparison baseline.

### Milestone 5 — Discovery and indexes

- Convert domain landings, search, A–Z, glossary, indexes, filters, and all search states.
- Verify route inventory, source wording, data truth, keyboard behavior, and deep links.

### Milestone 6 — Interactive instrument system

- Convert every stateful chart and explanatory interactive.
- Validate deterministic defaults, keyboard paths, reset, textual alternatives, registry completeness, and reduced motion.

### Milestone 7 — Market map and 3D playground

- Convert market-map controls, marks, timelines, plots, legends, details, company plates, and mobile equivalents.
- Convert the 3D playground canvas and controls while preserving direct manipulation under reduced motion and using a static fallback only when WebGL is unavailable.
- Verify data truth, deep links, deterministic reset, textual state, and WebGL token parity.

### Milestone 8 — Social assets and corpus convergence

- Convert OG/X artwork and regenerate exactly 48 cards.
- Run the 27-row deep matrix, registry-derived exhaustive route and interactive sweeps, visual captures, accessibility gates, named special-state suites, and zero-residue sweeps.
- Resolve mixed-system drift and archive evidence.

No milestone authorizes content, citation, data, route, or interaction regressions.

## 29. First-pass review corrections (sealed)

This section is approved brand-v2 authority and resolves ambiguities elsewhere in this file.

### 29.1 Immutable migration baseline

Milestone 1 implementation MUST start from a clean tracked worktree or record the exact Git tree hash used, plus manifest root hashes and pinned tool/runtime versions. It then deterministically generates manifests for routes; normalized visible article prose and accessible names; citations, References, See also and Linked from; navigation names/hrefs; market-map records/semantics; playground constants, trajectory schema/defaults; photo/logo bytes and uses; normalized original-SVG semantic geometry/text; interactive source exports and production mounts; and current behavioral defaults. No baseline is claimed created by documentation alone. Post-baseline changes pass only through the exact approved-delta allowlist defined by `VAL-B2-BASE-010`.

The approved migration may change public brand strings and fact-preserving caption/attribution copy. A visible first-party creator label may change from `robot-wiki` to `Robot Wiki` while preserving factual authorship. Other article text and accessible names remain baseline-identical unless explicitly approved.

### 29.2 Type, spacing, and frames

Tektur roles use measurable registered instances. The default approved home-wordmark instance is `wght=600`, `wdth=100`; shell wordmark, page h1, article h1, section display, and display numerals each receive registered values. The static OG TTF maps to one registered instance. `cmap` and glyph-probe validation covers every assigned string with no per-glyph fallback. Only the four first-party role families are permitted; KaTeX math and licensed functional icon fonts/systems are scoped exceptions.

The fixed spacing ladder is `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`. Page padding is at least 20px mobile, 32px tablet, and 48px desktop. Major sections separate by 48–80px mobile and 64–128px desktop. Related controls use 4–12px gaps; component interiors use 12–24px. Desktop frames remain 1280–1440px and reading columns 62–68ch. Canvas-derived dimensions and one-pixel optical corrections require registered reasons. Page h1, section, UI, and data ranges are those sealed in `VAL-B2-TYPE-*` and `VAL-B2-SPACE-*`.

### 29.3 Registries and semantic state

Stable annotations/registries are mandatory for grid/devices, surface variants and stacking purpose, neutral-shadow tolerances, controls and states, route ownership, interactive source/mount IDs, and visual assets. Source, registry, and rendered populations must reconcile. Rendered casing checks use computed `innerText` and `text-transform`.

Capsules remain limited to the compact toggle/status/filter exception. Primary actions are black. Lime is selection/highlight and only an optional emphasized secondary. Disabled actions use documented neutral exceptions. Hover/pressed visuals never receive false persistent ARIA. Semantic `ok`, `warn`, `error`, and `destructive` tokens remain distinct from brand accents, carry text/icon/shape cues, pass contrast, and match renderer mirrors.

### 29.4 Accessibility and contrast

Validate three independent profiles: a literal `320×800` CSS-px viewport at DPR 1; a 200% zoom-equivalent profile using each sealed base viewport at half CSS width/height and DPR 2 unless a pinned true-browser-zoom mechanism is proven; and 200% text-only resizing through an injected final author layer that doubles the registered text population's baseline computed sizes within 0.5px without hiding, clipping, overlap, or lost controls. Do not claim Playwright operates browser chrome zoom. Enforce target size/pointer alternatives, logical focus order, focus-not-obscured, overlay trapping/restoration, async focus retention, exactly one main landmark, named regions, unique IDs, label-in-name, heading order, complete live regions, table captions/header associations, and bound SVG/canvas textual alternatives across the exact bounded route/state cases for Axe, keyboard, forced colours, and reflow. Live-region validation checks roles, politeness, text, timing/order, deduplication, and focus behavior rather than claiming actual speech output across every AT/browser combination. Every foreground/background pair is measured, including dark instruments. Small signal-blue text on graphite requires a measured alternate or dual treatment because the foundation pair alone is insufficient.

### 29.5 Material, assets, interactives, metadata, and evidence

Controlled material treatment appears on registered representative web surfaces and social artwork. It is deterministic, contrast-safe, and owned/licensed; prose remains clear.

Current baseline expectations are 52 interactive source files and 62 production mounts, but automation derives these populations and proves three-way equality with the registry. Every source and materially distinct mount receives the exact bounded state-case construction: each discrete option, slider min/default/max plus discontinuities/source anchors, reset/default/focus/meaningful hover/selected, one witness per implemented loading/error/empty/unavailable state, deterministic pairwise independent-control combinations, and only named higher-order cases. Expected and observed non-zero counts must match. Bounded mobile/desktop default/changed captures and contact-sheet review remain required. WebGL proves active context, nonblank deterministic model pixels, landmarks/kinematics/material colours, live reduced-motion manipulation, unavailable fallback, and deterministic DPR/resize/reset.

Visual assets reconcile physical files, imports/CSS URLs, inline-SVG dependencies, registries, rendered use, and credits. The owner-approved legal-basis enum is closed; automation checks enum membership, official source URL, retrieval date, hashes, attribution fields, and byte/style preservation rather than issuing a legal opinion. Company marks use `official-identification-use`, contain fit, neutral plates, and no recolour/filter/mask/distortion/crop. `unlicensed` is never an approved reusable-content licence. Favicon, manifest/touch icons, masks, inline symbols, and unused first-party symbol assets are swept.

Route/metadata release truth is set equality among module registry, fixed-route registry, app inventory, sitemap, export files, and metadata ledger: currently 47 articles plus 14 non-article public destinations = 61; 404 is separate. The ledger covers canonicals, JSON-LD, manifest, favicons/touch icons, theme-colour, and all OG/X fields.

Evidence uses one common result/failure envelope plus source/build, browser-state, generated-image, and autonomous-comparison payloads. Non-applicable fields are omitted with typed `notApplicableReason`; multi-phase rows use ordered `steps[]` and `captures[]`; composite assertions map through `enforcementTargets[]`. Countable anti-bento, nested-frame, device-density/alignment, and reference-feature rubrics replace unstructured taste claims. Required fields are payload-specific and mutation-proven.

### 29.6 Bounded autonomous comparison and OG publication

Milestone 1 checks in one executable reference-feature rubric. Contract literals override image text/hex variation. Cross-composition raw pixel similarity is prohibited; pixels may be compared only for deterministic same-input/same-output equality. Every applicable anchor passes independently:

- identity and descriptor exactness, with web Tektur Variable and the registered static OG instance;
- home/site-card identity at least `1.50×` the next supporting heading, article h1 at least `1.35×` body, and no desktop primary heading over three lines;
- every registered grid/device within `2px` of its anchor and zero unregistered/intercepting/obscuring devices;
- dark non-action area at most `40%` of the first viewport on home/article/discovery and `75%` on market-map/playground, with shell/prose remaining light;
- no more than three adjacent repeated module signatures, zero redundant nested four-sided frames, and frame depth at most two only for registered table/plot/media/control interiors;
- exact palette/type-role parity and deterministic, contrast-safe, provenance-backed material treatment.

Terms such as purposeful, truthful, meaningful, and readable require registry annotations plus executable alignment/source/non-generic-text/contrast-and-geometry predicates.

OG/X publication validates the complete staging corpus before canonical mutation, then performs journalled per-tree swaps with rollback on caught failure. Crash recovery detects and repairs or rejects an incomplete journal; this is not described as a crash-atomic multi-tree transaction. Final staging, checked-in/public, served, `out/og`, and committed bytes must match, and release never accepts a partial corpus.
