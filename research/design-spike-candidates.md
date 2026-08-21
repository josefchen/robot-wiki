# Visual elevation: three candidates for review

This is a design spike, not a roll-out. Three complete themes are built on one
article, `/manipulation/bc-foundations/`, and reaching any of them takes a
hand-typed query string. Nothing on the live site has changed: every other
route renders exactly as it did before, the shipped dark palette and the Geist
/ Source Serif / JetBrains type stack are untouched, and the 43 social cards
are as they were. Pick one and a separate piece of work rolls it out.

## How to look at them

Run the site locally and open these four URLs:

| | URL |
|---|---|
| What ships today | `http://localhost:3200/manipulation/bc-foundations/` |
| Paper | `http://localhost:3200/manipulation/bc-foundations/?theme=paper` |
| Blueprint | `http://localhost:3200/manipulation/bc-foundations/?theme=blueprint` |
| Oxide | `http://localhost:3200/manipulation/bc-foundations/?theme=oxide` |

That article was chosen because it exercises nearly everything at once: prose,
an SVG chart with sliders and toggles, citation chips, a self-check, a
disclosure and the generated apparatus at the foot of the page.

Screenshots are committed under `research/design-spike/`, full-page, at 1440x900
and 375x900. The paper candidate carries a `-light` and a `-dark` capture. The
other three are one file each because they came out byte-identical under both
system settings: the site declares its own ground, so a reader's OS preference
currently changes nothing. That matters for paper, and only for paper.

## The texture, and what was deliberately not built

All three candidates carry the same treatment in the same single place: the
hairline between an article's prose and its See also / References apparatus is
repainted as a three-tier dot lattice. A dot at every cell, a denser dot every
second cell, a brighter one every fifth. That opacity remapping across base,
mid and peak is what the sv-matrix squares are actually doing, and it is the
part worth borrowing.

The spinner is not. Those components are loading indicators, and this site is a
static export with nothing to load, so a loader here would be an animation
about a wait that never happens. The lattice is static in every state,
including under reduced motion, and it says nothing the headings on either side
of it do not already say.

I could not read the dithered-telemetry reference. `x.com/praveenisomer/status/2088274443931955457`
did not resolve for me, so rather than invent a description of it I worked from
the dot-matrix vocabulary I could actually see. If that post matters to the
direction, it is worth a second look before the roll-out.

There is only one placement, and that was a decision rather than a starting
point. A sidebar rail edge and a textured chart ground were both drafted and
cut. On a page whose job is reading, one boundary mark is the whole of what a
texture this quiet has to say, and the second one starts to read as decoration.

## Paper

**What it is for:** readers who spend twenty minutes on a long article, which
is what this site is mostly asking people to do.

A warm off-white ground at `#f4f3ef` with near-black text, a deep pine accent
at `#145c4f` replacing the amber, IBM Plex Sans for the interface, Newsreader
for prose and IBM Plex Mono for figures and code. Newsreader was drawn for
screen reading at long lengths and it shows: this is the candidate that reads
most like a printed reference and least like a dashboard.

The accent had to change. Amber on white goes either muddy or shrill depending
on how far you push it, so the pine does that job instead, and it carries more
contrast against its ground than the amber manages against the dark one.

**What it costs, and it is the most expensive of the three.** All 43 social
cards are drawn against the dark ground and would need regenerating. Every
chart in every article inverts, and while the compounding-error chart survives
the flip cleanly, the other 42 need looking at one by one, particularly
anywhere a stroke was picked to sit against black. And there is an unresolved
question underneath it: if paper wins, does it replace the dark theme or sit
beside it? Replacing is a straight roll-out. Coexisting means a mode toggle,
persistence, and doubling the surface every future visual check has to cover.
That decision is yours, not mine, and it changes the size of the roll-out by a
lot.

## Blueprint

**What it is for:** staying dark while shedding the amber, which is the single
most dated thing about the current palette.

A cool navy-charcoal ground at `#0d1117`, a muted seafoam accent at `#62cfc0`,
Space Grotesk for the interface, Spectral for prose and Roboto Mono for data.
Space Grotesk's slightly mechanical letterforms give headings a drafting-table
quality without becoming a costume, and the cool ground makes the chart strokes
sit better than the current near-neutral black does.

This is the quietest change of the three. Someone who knows the site notices
that something is different before they can name what.

**What it costs:** the least of the three. The cards keep working against a dark
ground, so regenerating them is cosmetic rather than required, though their
amber would look stale until they are redrawn. It needs no mode toggle. The
chart ground shifts cool, which means a visual pass across the charts rather
than a rebuild of them.

## Oxide

**What it is for:** keeping the warmth and the instrument character the current
palette has, and doing it properly.

A warm near-black at `#121110` with a terracotta accent at `#e07a5f`, Archivo
for the interface, Literata for prose and DM Mono for figures. This is the
closest relative of what ships today and the furthest from it in feel: the
amber is doing the same job the terracotta does, but the terracotta is a colour
rather than a warning light, and Literata gives the prose a weight the current
Source Serif does not have at this size.

Of the three it is the one most likely to be called good-looking and least
likely to be called different.

**What it costs:** somewhere between the other two. The ground stays dark, so
the cards survive and only look stale until they are redrawn. It needs no mode
toggle. The chart ground warms very slightly, the smallest chart impact of the
three.

## Measurements

Every figure below was read in Chromium after transitions settled, at 1440x900.

| | Paper | Blueprint | Oxide |
|---|---|---|---|
| Ground | `#f4f3ef` | `#0d1117` | `#121110` |
| Accent | `#145c4f` | `#62cfc0` | `#e07a5f` |
| Prose face | Newsreader | Spectral | Literata |
| Body contrast at 17px | 15.39:1 | 15.33:1 | 15.31:1 |
| Dim-text contrast at 12px | 6.36:1 | 7.37:1 | 6.93:1 |
| Texture coverage of viewport | 0.53% | 0.72% | 0.76% |
| Texture luminance delta | 0.041 | 0.057 | 0.052 |
| axe violations | 0 | 0 | 0 |

For context, body and dim text need 4.5:1, texture coverage is capped at 12%
and the luminance delta at 0.06. Every candidate clears all of them, paper
included: it was measured against the same bar as the two dark ones with no
allowance for being light. All three survive forced-colors mode with their
information intact, keep a focus ring measurably different from rest on links,
buttons and sliders, and animate nothing at all in the prose region.

Two accessibility notes so nobody reads more into the zeros than is there.
Under the default axe rule set all three report zero violations, and so does
the same article with no candidate mounted. Under the WCAG 2.2 rule set all
four report one identical finding, `target-size` on twelve citation chips,
which is a property of the chip component and predates this work. No candidate
introduced or fixed it.

## What I would pick

**Blueprint.**

You asked for a full theme change that stays extremely subtle, and those two
requirements pull against each other hard enough that most answers fail one of
them. Blueprint satisfies both. The palette and all three typefaces are new, so
it is a real theme and not a hue swap, and still nothing about it announces
itself. It reads as the same site, better made.

The practical case points the same way. It is the only candidate that neither
forces the 43 cards to be regenerated before it can ship nor reopens the
light-versus-dark question, so it can land as a single change and be judged on
the live site instead of in a screenshot.

Oxide is the better-looking page, and I would not argue with anyone who picked
it. It is a smaller step: the same warm dark, the same instrument feel, a
better accent, better prose. If what you want is a refinement rather than a
theme, that is the one.

Paper deserves a serious look if you think the site's actual problem is that a
reference work asks people to read long articles on a black ground. It is a
better reading surface than either dark candidate, and I noticed the difference
in my own eyes reviewing these. It is also two to three times the work, and it
needs an answer from you first about whether dark survives at all.
