# Robot Wiki design-integrity contract

Status: **sealed against design system v1.0**

Canonical intent: [`library/design-system.md`](../library/design-system.md)

This file turns the design system into countable acceptance criteria. Tests may encode stricter route-specific behaviour, but they MUST NOT weaken these definitions.

## Shared definitions

### Visible

An element is visible when it has a non-zero rendered box and computed `display` is not `none` and `visibility` is not `hidden`.

### Fully bordered box

An element is a fully bordered box when all four computed border widths are at least 1px and all four border colours have non-zero alpha.

### Full-width section rule

A full-width section rule is an `hr` or a horizontal border that:

1. spans at least 80% of its own text column;
2. has no visible side borders;
3. is not a table row or cell border;
4. is not a `note`, `alert`, `aside`, or other framed content container;
5. is not an edge inside a fully bordered ancestor.

The text column is the nearest `[data-prose-column]`, then the nearest `article`, then the nearest ancestor with a computed maximum width, then `main`.

### Micro-label

A micro-label is a visible leaf element with at least three characters, a font size no larger than 15px, letterspacing of at least 0.02em, and uppercase text through content or `text-transform`.

A real form-control label is a micro-label for population counting but is not an editorial eyebrow.

### Doubly boxed control

A doubly boxed control is a visible bordered `button`, link, button role, or decorative control element that is either:

- inside the nearest fully bordered ancestor; or
- less than 4px from an adjacent fully bordered control.

`input`, `textarea`, `select`, and editable fields are real inputs and are exempt from this definition.

## Locked identity checks

| ID | Requirement |
| --- | --- |
| `VAL-BRAND-001` | The public wordmark is exactly `robot-wiki`, lowercase and hyphenated. |
| `VAL-BRAND-002` | The descriptor is exactly `Robotics encyclopaedia`. |
| `VAL-BRAND-003` | The UI contains no Robot Wiki symbol, monogram, mascot, robot-head logo, or brand glyph. |
| `VAL-BRAND-004` | The home title sheet uses the literal `.engineering-grid` device. |
| `VAL-BRAND-005` | The engineering grid is 32px square on the web and is not applied to `body`, `main`, `article`, or prose containers. |
| `VAL-BRAND-006` | Signal blue is `#245edb`; runtime and OG constants agree. |
| `VAL-BRAND-007` | Warning UI uses `--color-warn`, never `--color-accent`. |
| `VAL-BRAND-008` | Visible legends do not call signal-blue marks green. |

## Typography checks

| ID | Requirement |
| --- | --- |
| `VAL-TYPE-001` | The site loads only IBM Plex Sans, Newsreader, and IBM Plex Mono as first-party interface families. |
| `VAL-TYPE-002` | Long-form `.prose` uses Newsreader at 17px, 1.75 line height, and no more than 65ch. |
| `VAL-TYPE-003` | Interface headings and the wordmark use IBM Plex Sans. |
| `VAL-TYPE-004` | Code, technical metadata, and tabular readouts use IBM Plex Mono where fixed-width scanning helps. |
| `VAL-TYPE-005` | Visible micro-labels on a page share the same tracking ratio within 0.01em. |
| `VAL-TYPE-006` | An editorial heading has no more than one eyebrow immediately above it. |

## Surface and chrome checks

| ID | Requirement |
| --- | --- |
| `VAL-DESIGN-016` | Active desktop navigation uses a flat 2px full-height rule with no shadow or radius. |
| `VAL-DESIGN-017` | The active rule has one left offset across module, domain, and standalone entries, within 1px. |
| `VAL-DESIGN-018` | A dense article has no more than two full-width section rules. |
| `VAL-DESIGN-019` | Chrome contains no doubly boxed controls. |
| `VAL-DESIGN-020` | The mobile drawer uses a scrim for separation and has no left or right border. |
| `VAL-DESIGN-021` | Components use the 2px, 3px, and 4px radius scale only, except data marks whose geometry carries meaning. |
| `VAL-DESIGN-022` | Product surfaces have no visible gradient, glow, glass blur, or floating-card shadow. |

## Home-page checks

At 1440 by 900 unless noted:

| ID | Requirement |
| --- | --- |
| `VAL-HOME-001` | The wordmark, substantive overview, and all seven domain links appear before y=900px. |
| `VAL-HOME-002` | The domain index has seven list rows and is not a grid of fully bordered cards. |
| `VAL-HOME-003` | The first featured interactive SVG begins before y=1200px. |
| `VAL-HOME-004` | The playground entry contains a real visual with at least three SVG geometry elements. |
| `VAL-HOME-005` | `main` contains no more than six fully bordered boxes at least 80px high. |
| `VAL-HOME-006` | The page contains no more than five visible micro-labels. |
| `VAL-HOME-007` | Each domain display name appears as exact anchor text no more than twice. |
| `VAL-HOME-008` | No public build progress, draft state, completion counter, or fabricated metric appears. |
| `VAL-HOME-009` | At 375 by 812, the hero grid becomes an 80px bottom band and the page has no horizontal overflow. |

## Article checks

| ID | Requirement |
| --- | --- |
| `VAL-ARTICLE-001` | The reading column is no wider than 65ch and retains 24px side padding. |
| `VAL-ARTICLE-002` | The title block contains one h1, one summary, and derived review-date, reading-time, and citation-count values. |
| `VAL-ARTICLE-003` | The title block contains no badge, pill, emoji, image, repeated domain eyebrow, or author portrait. |
| `VAL-ARTICLE-004` | Missing table data renders `not disclosed`, not zero or an invented substitute. |
| `VAL-ARTICLE-005` | Tables remain inside the viewport through horizontal scrolling. |
| `VAL-ARTICLE-006` | Source links are keyboard reachable and external links use safe relationship attributes. |

## Interactive and chart checks

| ID | Requirement |
| --- | --- |
| `VAL-CHART-001` | Every stateful chart provides a visible or screen-reader-accessible current-state description. |
| `VAL-CHART-002` | State remains distinguishable without colour through labels, markers, line style, geometry, or position. |
| `VAL-CHART-003` | A rendered colour name in a legend agrees with the underlying token. |
| `VAL-CHART-004` | Unknown source values remain explicitly unknown. |
| `VAL-CHART-005` | Schematics identify themselves and do not claim a published mapping. |
| `VAL-CHART-006` | Native controls work by keyboard, expose state, render visible focus, and return to a deterministic default. |
| `VAL-CHART-007` | No explanatory sequence autoplays. |

## Open Graph and X checks

| ID | Requirement |
| --- | --- |
| `VAL-OG-001` | Every generated card is a 1200 by 630 PNG. |
| `VAL-OG-002` | Every article card uses its real title, domain, review year, and reference count. |
| `VAL-OG-003` | Every card uses the plain wordmark and the same neutral 8 by 12 grid of 34px cells. |
| `VAL-OG-004` | The grid has no highlighted cell or domain-specific ornament. |
| `VAL-OG-005` | Cards contain no logo, robot image, fake chart, screenshot collage, progress state, or tiny reproduced UI. |
| `VAL-OG-006` | Generated card files are byte-distinct through factual text, not decorative randomization. |

## Accessibility and responsive checks

| ID | Requirement |
| --- | --- |
| `VAL-A11Y-001` | Audited routes have zero Axe violations in the standard browser gate. |
| `VAL-A11Y-002` | Every interactive element has a visible 2px focus outline or an equally visible component-specific treatment. |
| `VAL-A11Y-003` | The skip link is the first keyboard destination and becomes visible on focus. |
| `VAL-A11Y-004` | Mobile navigation traps focus, closes on Escape, restores focus, and makes the obscured page inert. |
| `VAL-A11Y-005` | Reduced-motion preferences disable non-essential transitions and animation. |
| `VAL-A11Y-006` | At 375px, 768px, 1024px, and 1440px widths, pages have no unintended horizontal document overflow. |

## Required visual review

Tests do not approve composition. Before calling a system change complete, inspect these routes at 1440 by 900 and 375 by 812:

- `/`
- `/manipulation/action-chunking/`
- `/market-map/`
- `/playground/`
- `/search/`

Review the rendered wordmark, grid, colour semantics, type hierarchy, reading measure, drawer, focus, table overflow, chart legends, and any modified interaction state.

## Release commands

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test tests/e2e/home.spec.ts tests/e2e/design-chrome.spec.ts tests/e2e/paper-theme.spec.ts tests/e2e/article-header.spec.ts tests/e2e/og-cards.spec.ts
```

Any failed criterion is a release blocker for a design-system change. If a deliberate new direction invalidates a criterion, update the design system and this contract only after owner approval.
