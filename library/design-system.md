# Robot Wiki design system

Status: **locked v1.0**

Owner: Josef Chen

Last revised: 23 August 2026

This is the canonical visual and interaction specification for Robot Wiki. It is an implementation contract, not a moodboard. The product should feel like a well-made technical reference: paper, ink, hairlines, a literal engineering grid, and one blue signal colour.

## Droid execution contract

Read this file in full before changing a page, component, visualization, navigation surface, social card, font, colour, or visual asset.

- Treat **MUST** and **MUST NOT** as release requirements.
- Audit the current implementation against this system and converge it. Do not propose parallel visual directions inside the product.
- Preserve content, routes, data integrity, citations, accessibility, and working interactions while changing presentation.
- Do not invent a logo. The approved identity is the plain wordmark plus the engineering grid.
- A shared visual change MUST update this document, `app/globals.css`, affected primitives, Open Graph artwork, and tests in the same change.
- If code and this document disagree, that is design drift. Do not silently choose one. Fix the mismatch or ask the owner when the decision changes a locked foundation.
- The measurable release contract is in [`contract/design-integrity.md`](../contract/design-integrity.md).

## 1. Brand foundation

### Audience

Robot Wiki is for robotics and machine-learning engineers, researchers, builders, and technically literate readers arriving from X. They judge credibility quickly and notice fake precision.

### Promise

A current, inspectable reference to modern robotics, with every non-obvious claim tied to a primary source and every diagram built to explain something real.

### Character

- Exact
- Calm
- Hardware-literate
- Current
- Skeptical of unsupported claims
- Useful before impressive

### It is not

- An AI startup landing page
- A toy-robot blog
- A cyberpunk control room
- An academic PDF copied into a browser
- A product catalogue
- A collection of decorative dashboards

## 2. Sources of truth

| Concern | Canonical source |
| --- | --- |
| Brand and interaction intent | `library/design-system.md` |
| Measurable visual limits | `contract/design-integrity.md` |
| Runtime colour, type, and radius tokens | `app/globals.css` |
| Font loading | `app/layout.tsx` |
| Shared component behaviour | `components/ui/` and `components/nav/` |
| Social-card geometry | `lib/og-card-artwork.ts` |
| Enforced implementation | `tests/unit/design-system-contract.test.ts` and design E2E specs |

`research/design-spike-candidates.md` records earlier exploration. It is historical evidence, not current authority.

## 3. Identity

### Name and wordmark

The public name and wordmark are exactly:

> robot-wiki

- Lowercase.
- One hyphen.
- No spaces.
- No terminal punctuation.
- Set in IBM Plex Sans, weight 600, with tight but readable tracking.
- Use ink (`--color-text`) on paper or surface.
- The small descriptor is exactly `Robotics encyclopaedia`.

The wordmark is type, not a drawn mark. It MUST remain legible as HTML text wherever possible. It MUST NOT be rebuilt from custom polygon letters, outlined, skewed, distressed, chromed, or placed inside a badge.

### No logo rule

Robot Wiki has no separate symbol. Do not create or introduce:

- a robot head or face;
- an `RW` monogram;
- a circuit, bolt, gear, chip, cube, hexagon, crosshair, or mascot;
- an asymmetrical pseudo-industrial glyph;
- a generated icon presented as brand identity.

A future favicon or symbol requires explicit owner approval. Until then, absence is better than a weak mark.

### Lockups

| Placement | Wordmark | Descriptor |
| --- | --- | --- |
| Home hero | 48px mobile, 60px from `sm`; weight 600 | 10px mono, uppercase, 0.14em tracking |
| Desktop sidebar | 17px; weight 600 | 9px mono, uppercase, 0.14em tracking |
| Mobile header | 15px; weight 600 | Omit |
| Open Graph card | Plain sans wordmark | Omit or use factual metadata instead |

Do not add slogans to the lockup. Product copy belongs in the page, not in the identity.

## 4. Engineering grid

The grid is the one graphic device in the identity. It should look like drafting paper, not a sci-fi HUD.

### Web grid

- A literal 32px by 32px square SVG tile.
- One-pixel lines in `--color-border` on `--color-surface`.
- No perspective, distortion, depth, glow, numbering, coordinates, or animated sweep.
- Home hero only: the field is 13rem wide from the `md` breakpoint and an 80px-high band below it on smaller screens.
- Home hero only: one vertical and one horizontal centre axis in `--color-border-strong`, with one 8px square registration point in `--color-accent` at their intersection.

### Social-card grid

- Eight columns by twelve rows.
- 34px square cells.
- Grid line `#c8c5bc`.
- Neutral and identical on every card.
- No selected cell, plotted series, domain glyph, or fake data encoding.

### Allowed placements

- Home title sheet
- Open Graph and X cards
- A future section title sheet only after an explicit design review

The grid MUST NOT become a whole-page background, sit behind reading text, or decorate every card. Repetition turns the identity into noise.

## 5. Colour

Robot Wiki is light-first and has one theme. There is no automatic dark variant.

| Token | Hex | Role | Contrast on page ground |
| --- | --- | --- | ---: |
| `--color-bg` | `#f4f3ef` | Warm paper page | n/a |
| `--color-surface` | `#fbfaf7` | Cards, tables, input ground | n/a |
| `--color-surface-2` | `#eceae4` | Quiet selected or header ground | n/a |
| `--color-border` | `#d9d6cd` | Standard hairline | Decorative only |
| `--color-border-strong` | `#b3afa4` | Axes, active rules, strong separators | Decorative only |
| `--color-text` | `#1a1c1e` | Primary ink | 15.39:1 |
| `--color-text-dim` | `#55595d` | Secondary copy and metadata | 6.36:1 |
| `--color-accent` | `#245edb` | Signal blue | 5.11:1 |
| `--color-logo-plate` | `#7d7a73` | Uniform ground behind third-party marks | Asset utility only |
| `--color-ok` | `#1a6f45` | Verified, available, successful | 5.56:1 |
| `--color-warn` | `#8a5a00` | Caveat, claimed, under-specified | 5.34:1 |
| `--color-err` | `#a52a1e` | Error, failed, corrupting path | 6.41:1 |

Contrast ratios are against `--color-bg` and rounded down to two decimals. Text uses WCAG AA as the minimum.

### Signal blue

Blue is an instrument signal, not decoration. Use it for:

- links and link hover confirmation;
- keyboard focus;
- active navigation;
- the hero registration point;
- one selected state or primary data series;
- a small amount of factual social-card metadata.

Do not use it for full panels, large background floods, every heading, decorative outlines, or warning states. A page SHOULD have an obvious reason for every blue mark.

### Semantic colours

`ok`, `warn`, and `err` communicate state. They are not alternate brand accents. Never substitute blue for warning amber, or green for a selected state. State MUST also be expressed by words, shape, line style, or an accessible label. Colour alone is insufficient.

### Gradients

Visible colour gradients are prohibited. The dot-raster article rule described under Exceptions is a rendering technique, not a colour-gradient aesthetic.

## 6. Typography

Only three families are loaded.

| Role | Family | Weights | Use |
| --- | --- | --- | --- |
| Interface | IBM Plex Sans | 400, 500, 600 | Navigation, headings, controls, labels, wordmark |
| Reading | Newsreader | 400 | Long-form article prose |
| Data | IBM Plex Mono | 400, 500 | Code, values, dates, technical metadata, compact labels |

### Type scale

| Element | Size / line height | Notes |
| --- | --- | --- |
| Home wordmark | 48/48 mobile, 60/60 from `sm` | Sans 600, tracking -0.035em |
| Article h1 | 32/35.8 mobile, 40/44.8 from `sm` | Sans 600, tracking -0.025em |
| Prose h2 | 22/27.5 | Sans 600 |
| Prose h3 | 18/22.5 | Sans 600 |
| Long-form body | 17/29.75 | Newsreader, maximum 65ch |
| UI body | 14 to 16px | Sans |
| Data and control text | 11 to 14px | Mono where the value benefits from fixed width |
| Micro-label | 9 to 11px | Mono, uppercase, 0.14em tracking |

Micro-labels are scarce. The home page MUST render no more than five visible uppercase letterspaced labels. Do not put an eyebrow above every heading. Use sentence case for ordinary labels, buttons, headings, captions, and navigation.

Use tabular numbers for changing numeric readouts and aligned numerical columns. Do not set paragraphs in mono. Do not use wide letterspacing on body copy.

## 7. Layout and spacing

The base spacing unit is 4px. Prefer existing Tailwind increments rather than one-off values.

### Shell

- Desktop shell begins at `lg` (1024px).
- Desktop sidebar width: 18rem (`w-72`).
- Sidebar is full-height, sticky, and independently scrollable.
- Mobile header is compact and fixed to the document flow.
- Mobile navigation uses an 85vw drawer capped at 20rem, with an opaque paper panel and an 80% page scrim.
- The drawer edge is separated by the scrim, not an extra border or shadow.

### Content widths

- Home and broad indexes: `max-w-5xl` (64rem), with 24px side padding.
- Articles and reading pages: `max-w-[65ch]`, with 24px side padding.
- Article vertical padding: 48px.
- Long-form prose never expands to fill a widescreen content column.
- Tables may scroll horizontally inside their own frame. They MUST NOT widen the page.

### Vertical rhythm

- Related control rows: 4 to 12px.
- Component internal padding: usually 12 to 20px.
- Heading to supporting copy: 8 to 12px.
- Major page sections: 32 to 48px.
- Do not solve weak hierarchy by inserting more rules or containers.

### Home composition

- The hero, domain index, featured interactive, tools, and guidance are direct sections in the page flow.
- All seven domain links appear in the first 900px at a 1440 by 900 viewport.
- The domain index is a dense list with row rules, not seven cards.
- The featured interactive begins within the first 1200px.
- There are no more than six fully bordered boxes of at least 80px height inside home `main`.

## 8. Shape and surfaces

- Borders are 1px hairlines unless a 2px focus or active marker has a functional reason.
- Radius scale is fixed at 2px, 3px, and 4px.
- Surfaces are flat. No shadows, glows, glass, blur, bevels, inset chrome, or soft floating cards.
- Cards group a real unit of content or interaction. They are not the default wrapper for every section.
- Do not nest a bordered control inside an already bordered chrome container.
- Do not create a universal bento grid.
- A dense article may render no more than two full-width section rules. Tables, callouts, and framed figures are containers, not section rules.

Whitespace and typography should do most of the separation work.

## 9. Components

### Navigation

- Active desktop navigation uses one flat 2px full-height blue rule at a consistent left depth.
- Active state MUST use `aria-current="page"`.
- Links change colour or underline; they do not lift, glow, or scale.
- The mobile drawer traps focus, closes on Escape, restores focus, and keeps the obscured page inert.

### Links and actions

- Text links are blue and underlined in prose.
- A principal editorial call to action is usually a text link with a clear verb.
- Bordered buttons are for independent controls such as toggles, reset, sorting, and submit actions.
- Filled blue buttons are not a default pattern. Use one only when the action hierarchy cannot be communicated with type and border.
- Press feedback may move a control down by 1px. No spring or bounce.

### Inputs

- Every input has a visible label, usually a 10 to 11px mono label when it is technical metadata.
- Inputs use `--color-surface`, a 1px border, and the global focus ring.
- Placeholder text cannot replace a label.
- Search icons and clear buttons are functional, not ornamental.

### Cards

- `--color-surface`, 1px `--color-border`, 4px radius, no shadow.
- Linked cards may strengthen the border and title colour on hover.
- Keep one level of framing. Do not put small bordered cards inside a large bordered card unless the inner frame is a real data table or control.

### Badges

- Badges identify compact state or provenance, not categories that ordinary text can carry.
- Default is neutral. Accent is selected or primary. `ok`, `warn`, and `err` use their matching semantic tokens.
- No pill-shaped marketing tags. Radius remains 2px.

### Callouts

- Flat surface, one standard frame, one 2px semantic left edge.
- `info` is neutral, `warn` is amber, and `error` is red.
- A warning is a caveat, not a promotional highlight.

### Article title block

- Title, summary, then a quiet metadata grid.
- Metadata uses mono labels and narrow vertical rules.
- No badges, chips, emoji, cover image, repeated domain eyebrow, or author portrait.
- Domain context belongs in the breadcrumb above.

### Tables

- One outer frame and horizontal row rules.
- Headers use `--color-surface-2`.
- Numeric cells are right-aligned and tabular mono where useful.
- Missing published values read `not disclosed`. Never coerce them to zero.
- Sort controls are real buttons with `aria-sort` on the relevant header.
- Selected destination rows may use a 2px inset blue rule plus a quiet surface change.

### Citations and references

- Citation markers remain legible inline and keyboard reachable.
- Source links say what the source is. Avoid generic `learn more` labels.
- Reference metadata is quieter than article prose but never too faint to read.

### Icons

- Use the existing Phosphor icon set.
- Typical size: 14 to 20px.
- Icons support a labelled action. They do not replace the wordmark or become decoration.
- No emoji in product chrome.

## 10. Data visualization and interactives

An interactive is an explanatory instrument. It needs a claim, a visible state, and an accessible textual account of that state.

- Signal blue is the primary selected state, active path, or lead series.
- Neutral ink and borders carry context and comparison.
- Green, amber, and red are reserved for their semantic meanings.
- Every series or state MUST have a non-colour distinction: label, dash pattern, marker, position, or shape.
- Legends MUST name the colour actually rendered. Prefer the state name over the colour name when possible.
- Use source-backed values only. If a source does not disclose a value, write `not disclosed`.
- A schematic MUST call itself a schematic and MUST NOT imply a published mapping.
- Every stateful chart uses `ChartDescription` or an equivalent live textual description.
- Native controls, keyboard operation, visible focus, deterministic first render, and a working reset are required.
- Do not autoplay teaching sequences.
- Do not add decorative charts, fake telemetry, arbitrary waveforms, progress counters, or loading spinners to make a page look technical.

## 11. Imagery and diagrams

Use imagery only when it teaches, documents hardware, or establishes provenance.

Allowed:

- licensed photographs of real robots, hardware, labs, and field deployments;
- source-backed paper figures when licence and attribution permit;
- purpose-built diagrams that accurately expose a mechanism;
- truthful renders of the shipped SO-101 model.

Not allowed:

- AI-generated robots or synthetic lab photography;
- stock humanoids, glowing brains, chrome heads, circuit wallpaper, or fake blueprints;
- cinematic hardware imagery used only to make a page feel expensive;
- diagrams whose precision exceeds the source evidence.

Every external image needs creator, source, and licence data. Third-party company marks retain their identity and use the shared `--color-logo-plate`; never redraw them in the Robot Wiki style.

## 12. Open Graph and X cards

- Canvas: 1200 by 630px.
- Paper ground, ink title, factual mono metadata, plain wordmark, neutral engineering grid.
- Article cards show the real domain, review year, title, reference count, and wordmark.
- The site card states what Robot Wiki is without a slogan.
- Title is the dominant element and remains readable in a small X timeline preview.
- The grid is identical on every card and carries no data.
- No logo, domain-specific ornament, fake chart, screenshot collage, tiny UI, robot render, gradient, glow, or progress state.
- Regenerate the complete set with `npm run generate:og-cards` after card logic, palette, or typography changes.

The OG renderer may mirror hex values because Satori does not resolve CSS custom properties. The drift test MUST keep those mirrors aligned with the runtime tokens.

## 13. Motion

- Motion is functional and brief: colour transitions, drawer entry, disclosure, or direct manipulation feedback.
- No ambient animation, scanning line, parallax, logo animation, looping chart, or autoplay sequence.
- Do not animate layout to attract attention.
- The global `prefers-reduced-motion` rule is mandatory and applies to new components.

## 14. Accessibility

- WCAG 2.2 AA is the minimum.
- Use semantic HTML before ARIA.
- Every interactive path works with a keyboard.
- Global focus is a visible 2px blue outline with a 2px offset.
- Interactive targets SHOULD be at least 24 by 24px; inline text links are exempt.
- Colour never carries meaning alone.
- Charts expose current state and takeaways in text.
- Scrollable table regions are keyboard focusable.
- Respect reduced motion and forced colours.
- Desktop and mobile navigation use distinct IDs and valid landmarks.

## 15. Voice and copy

Write like an engineer explaining a system to another engineer.

- Lead with the fact or mechanism.
- Prefer short concrete sentences.
- Name uncertainty and source limitations directly.
- Use primary-source language and real quantities.
- Distinguish measured, reported, claimed, inferred, and schematic.
- Use British spelling where established in the product, including `encyclopaedia`.

Avoid hype and synthetic authority. Do not write `revolutionary`, `cutting-edge`, `game-changing`, `seamless`, `unlock`, `supercharge`, `next-generation`, `at the forefront`, `in today's rapidly evolving`, or `the future is here` unless it appears in a clearly attributed quotation.

## 16. Hard bans

These are release failures:

- invented logo, monogram, mascot, or favicon;
- AI-generated robot imagery;
- colour gradients, glow, glass, blur, or heavy shadow;
- neon cyberpunk palette or black control-room skin;
- generic bento-card landing page;
- random floating icons, glyph clouds, particles, or decorative telemetry;
- a full-page grid or grid behind prose;
- blue warning states;
- semantic states expressed by colour alone;
- pill overload;
- repeated uppercase eyebrows;
- nested boxes and redundant dividers;
- fake numbers, fake charts, or treating unknown as zero;
- progress, draft, or build-state metadata on public pages or social cards;
- small illegible UI reproduced inside marketing artwork;
- uncredited stock or third-party imagery.

## 17. Current implementation map

| System element | Implementation |
| --- | --- |
| Runtime tokens and grid | `app/globals.css` |
| Font loading and metadata | `app/layout.tsx` |
| Home title sheet | `app/page.tsx` |
| Wordmark and shell | `components/nav/site-shell.tsx` |
| Article title block | `components/article/article-header.tsx` |
| UI primitives | `components/ui/` |
| Interactive figures | `components/interactive/` |
| Company-logo treatment | `components/market-map/company-logo.tsx` |
| OG/X composition | `lib/og-card-artwork.ts` |
| Generated cards | `public/og/` |
| Visual checks | `tests/e2e/design-chrome.spec.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/paper-theme.spec.ts`, `tests/e2e/og-cards.spec.ts` |

## 18. Narrow exceptions

1. **Article dot rule.** `article > hr` uses layered radial gradients to raster three rows of near-paper dots. It is the only textured article placement and is not permission to add visible colour gradients elsewhere.
2. **Satori colours.** `lib/og-card-artwork.ts` repeats runtime hex values because the offline renderer cannot read CSS custom properties. Tests pin parity.
3. **WebGL colours.** A WebGL implementation may need resolved colour values. Keep mirrors explicit, documented, and tested.
4. **OG display font.** The network-free OG renderer uses bundled Geist for large display type because `next/font` emits hashed WOFF2 files that Satori cannot consume. The site itself remains IBM Plex Sans.
5. **Third-party logos.** Company marks are external identity assets and may use their source colours. They all receive the same neutral logo plate.

An exception is local. It does not create a new general pattern.

## 19. Change governance

The wordmark, no-logo rule, engineering grid, palette, and three font families are locked foundations. Changing one requires explicit owner approval.

For an approved foundation change:

1. Update this specification.
2. Update executable tokens and shared primitives.
3. Update OG artwork and regenerate all cards.
4. Update unit and browser contracts.
5. Review rendered desktop and mobile pages, not screenshots from an isolated component.
6. Record any narrow exception in this file.

Do not leave a transition half-complete. Old colour names, stale legends, and mixed identity assets count as failures even when the page compiles.

## 20. Release checklist

The exact measurable bounds live in [`contract/design-integrity.md`](../contract/design-integrity.md). At minimum, a visual-system change is complete only when:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test tests/e2e/home.spec.ts tests/e2e/design-chrome.spec.ts tests/e2e/paper-theme.spec.ts tests/e2e/article-header.spec.ts tests/e2e/og-cards.spec.ts
```

Then review these routes at 1440 by 900 and 375 by 812:

- `/`
- `/manipulation/action-chunking/`
- `/market-map/`
- `/playground/`
- `/search/`

Check hierarchy, wordmark, grid restraint, actual rendered colours, overflow, focus, drawer behaviour, table scrolling, chart legends, and social-card output. A green test run is necessary, but it is not visual approval by itself.
