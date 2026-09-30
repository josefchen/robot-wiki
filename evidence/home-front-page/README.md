# Home front page evidence

Before and after evidence for the encyclopedia front page on `/`
(VAL-OPUS-009 and VAL-OPUS-014 to 022) and for `/about/`, which took the
scope statement and the reading guide off home (VAL-WIKI-028, VAL-NAV-005).
"Before" is the static export of `11cebdf7`, the commit this work started
from. "After" is the export of `04165fc6`; the commit that adds this
folder changes only evidence. Both exports were built on 2026-09-30, the
date that picks the featured article.

## How it was made

| Step | Command | Result |
| --- | --- | --- |
| After export and brand-v2 evidence | `npm run refresh:brand-v2-evidence` | Exit 0. 151 browser tests passed, one of them the archived expected failure; renderer parity 25 passed; the enforcement map holds 238 rows and 4760 results |
| Captures, both exports | Playwright at 1440×900 and 375×812, after `networkidle` and `document.fonts.ready` | `before/` and `after/`: first-screen and full-page JPEGs of `/`, full-page JPEGs of `/about/` and `measurements.json` |
| Front page spec | `tests/e2e/home-front-page.spec.ts` | 8 of 8 passed |
| Unit tests | `tests/unit/featured-article.test.ts`, `content-dates`, `did-you-know`, `home-counts`, `tests/component/home.test.tsx` | 48 of 48 passed |

`measurements.json` holds, per viewport, every block's words and box, the
contents domain links, the scene stage box, the search input box, the
graphic census, the featured article, the three facts, the five updates,
the tools line and, for `/about/`, the scope statement with its computed
borders and text transform. The before export has no `/about/` (404).

## Word count (VAL-OPUS-021)

The count is `main.innerText` split on white space, with the 57 contents
title links left out. `budgetBlocks` in `after/measurements.json` counts
each block with those links hidden; `runsJoinFree` records that every
article run in the contents reads as its titles' own words, so subtracting
the titles from the whole of `<main>` gives the same total. The two
viewports give the same numbers.

| Block | Words | What they are |
| --- | ---: | --- |
| Introduction | 16 | `Robot Wiki`, the descriptor, `57 articles 434 sources 119 glossary terms`, the `Search` button |
| Contents | 52 | The heading, seven domain names and their seven short descriptions (VAL-NAV-002); the 176 title words are not counted |
| Featured article | 25 | The heading, `Major Datasets` and its 21-word lead |
| Featured scene | 62 | The heading, the scene's title, controls, labels, readout, status line and caption, and `From The Reliability Gap` |
| Did you know | 56 | The heading and three facts of 18, 19 and 16 words, each with its citation label |
| Recently updated | 25 | The heading and five rows of an ISO date and a title |
| Tools | 4 | `Tools Playground Market Map` |
| **Total** | **240** | Limit 250 |

Before, `<main>` held 941 words in seven other blocks: Introduction 89,
Domain index 114, Featured interactive 217, Real hardware 71, Interactive
tools 156, Learning paths 145 and How to read this wiki 149.

Two blocks change without an edit to home: the featured article with the
build date, and "Recently updated" with each content commit. Between them
they get `HOME_ROTATING_WORDS`, 54 words of titles, lead and dates
(`lib/featured-article.ts`). Here they use 23 and 23. The other blocks take
194, so the page stays at 248 words or fewer on any date. The featured
pick passes over a lead that does not fit what the updates leave: today all
18 leads in the pool fit the 31 words left, and with the five longest titles
in the corpus as the updates (35 words) 8 still fit. The spec checks both
halves of the split, and the unit test checks the worst case.

Three fixes to the rendered text came with the count. The contents runs set
their separating dot as generated content, so each item after the first now
opens with a real space; without it `innerText` read two titles as one word.
The citation chip in the facts is an inline block on home; as an
inline-flex box it made `innerText` set the full stop after it apart as a
word of its own. The updates print the ISO date their JSON-LD states, one
word each, where the long form took three.

## Graphic census (VAL-OPUS-021, VAL-OPUS-009)

Every `img`, `svg`, `canvas`, `picture`, `video`, `iframe`, `object` or
`embed` in `<main>`, and every element with a background image. The device
IDs are the `gridDevices` rows of `contract/brand-v2-registries.json`.

| After | Where | Why it may stay |
| --- | --- | --- |
| `div#home-engineering-grid`, dot-grid background | Introduction | `device:dot-grid`, registered as `registered-grid-boundary`; `aria-hidden`, `pointer-events: none` (VAL-B2-GRID-002, 004, 009) |
| Scene stage `svg`, 974×688 at 1440 | Featured scene | The featured scene, `reliability-threshold`; `aria-hidden`, with the scene's text alternative bound to it |
| Play icon `svg`, 14×14 | Featured scene | Inside the button named "Play the motion scene: The last stretch of episode reliability" |

The two rules and the square inside the grid (`device:section-rule`,
`device:registration-cross`) are borders and a filled box, not images. The
lime example of VAL-B2-SHELL-006 is `mark[data-brand-highlight="home-source-count"]`
on the source count.

Before, there were seven: the same grid, scene stage and Play icon, and four
more. The calculator's line chart (`role="img"`, "Line chart of episode
success against episode length at 95.0 percent per-step success"), the
Boston Dynamics Spot photograph in "Real hardware", the SO-101 arm preview
and the Market Map poster in "Interactive tools". The calculator component
and its figure-system allowlist entries are gone, and the settled home shows
no skeleton or placeholder at either width.

## What left home, and where it went

| On home before | After |
| --- | --- |
| The lime premise, "traceable to cited evidence" | `/about/`: "Technical claims trace to cited evidence." The lime example on home marks the source count. |
| "a citation is not a guarantee of verification" | `/about/`: "a citation tells you where a claim comes from, and the kind of source tells you how far to trust it." |
| "The centre of gravity is robot learning, not a catalogue of the industry." | The `/about/` scope statement: "The industry appears as data in the Market Map. Company news and investment advice are out of scope." |
| "How to read this wiki" | `/about/`, "Reading the wiki" |
| "Learning paths" | `/about/`, "Reading paths" |
| "Featured interactive", the calculator and its copy | Removed. The featured scene shows the same compounding. |
| "Real hardware", the Spot photograph | Removed; VAL-OPUS-022 allows no such block. |
| "Interactive tools", two previews and their copy | The tools line: `Playground · Market Map` |
| "Start reading" | The search box submit, `Search`, is the black primary action. |

## Featured scene (VAL-OPUS-017, VAL-DESIGN-004)

`reliability-threshold` from The Reliability Gap waits for Play. Its stage
top is at 1,139 px at 1440×900 (limit 1,200; 1,766 before) and 2,044 px at
375×812. The four beats read:

1. "At 95% success per decision, this thirty-decision toy episode succeeds about 21.5% of the time."
2. "Raising conditional success from 95% to 99% changes the thirty-step outcome from 21.5% to 74.0%."
3. "At 99.9% per decision, the same model gives 97.0% for thirty steps."
4. "The same horizon exposes the last stretch."

The status line is "Illustrative model: all 30 decisions succeed
independently at the same rate."

## Did you know (VAL-OPUS-018)

Each fact links to the article that states it and cites the source that
article cites at that sentence. Word counts include the citation label.

| Fact | Words | Article and line | Source |
| --- | ---: | --- | --- |
| An ANYmal quadruped learned to walk on flat ground in under four minutes on one GPU | 18 | `content/rl-sim2real/why-rl-locomotion.mdx:27` | `rudin-2021`, arXiv 2109.11978 |
| ACT reached 80 to 90% success on six bimanual tasks, each from about 10 minutes of demonstrations | 19 | `content/data-hardware/teleop-rigs.mdx:48` | `act-aloha-2023`, arXiv 2304.13705 |
| By 1961, Heinrich Ernst had a computer-controlled arm and hand stacking blocks at MIT | 16 | `content/frontier/dexterity.mdx:44` | `brooks-dexterity-2025`, rodneybrooks.com |

`tests/unit/did-you-know.test.ts` holds each fact to its article's passage
and citation; the spec follows each link and finds the source cited there.
On home the fact's last plain word, the chip and the full stop share one
unbreakable run, so no line holds the chip alone.

## /about/ (VAL-WIKI-028, VAL-NAV-005)

`/about/` returns 200 and the footer links to it on every page. Its scope
statement is 44 words with no border and no text transform:

> Robot Wiki covers modern robot learning for engineers who already know
> machine learning, from Manipulation & Learned Policies and World Models to
> the Classical Foundations underneath. The industry appears as data in the
> Market Map. Company news and investment advice are out of scope.

It names three sidebar domains and matches `/\bout of scope\b/i`. "Reading
the wiki" covers reading order, the one prerequisite and the citation
conventions, and links to Action Chunking (ACT and ALOHA) and the glossary.
"Reading paths" holds the three paths that were on home.

## Where each assertion's evidence is

| Assertion | Evidence |
| --- | --- |
| VAL-OPUS-009 | The census above; `after/home-*-first.jpg` and `after/home-*-full.jpg` show each visual's real content at settle |
| VAL-OPUS-014 | `home-*-first.jpg`: the `Robot Wiki` h1, the descriptor, `57 articles`, `434 sources`, `119 glossary terms` and the search box, whose input top is at 254 px at 1440 and 393 px at 375 |
| VAL-OPUS-015 | `domainLinks` and the Contents block: seven domains, each with its description, and 57 article links equal to the published registry |
| VAL-OPUS-016 | `featured`: `Major Datasets`, a 21-word lead that is the article's opening sentence |
| VAL-OPUS-017 | The scene section above |
| VAL-OPUS-018 | `facts` and the table above |
| VAL-OPUS-019 | `recent`: five rows whose dates equal each article's JSON-LD `dateModified` |
| VAL-OPUS-020, VAL-DESIGN-013 | `tools`: one line, `Playground` to `/playground/` and `Market Map` to `/market-map/`, with no image |
| VAL-OPUS-021 | The word count and census above |
| VAL-OPUS-022, VAL-DESIGN-011 | `sections`: the seven blocks and nothing else; none of the removed texts |
| VAL-NAV-001 | The first-screen captures: the h1, the descriptor, the black `Search` action, the lime mark, the registered grid and all seven domain links (lowest at 820 px at 1440) |
| VAL-NAV-005, VAL-WIKI-028 | `after/about-*-full.jpg` and the `/about/` fields of `after/measurements.json` |
| VAL-DESIGN-008 | Only Contents names four or more domains; the featured lead is held to three at most by `lib/featured-article.ts` |
