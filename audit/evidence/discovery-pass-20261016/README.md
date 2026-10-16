# Discovery pass: measures and before/after captures

The discovery pass of 2026-10-16 rewrote the seven domain hubs, `/glossary/`,
`/a-z/`, `/search/`, `/credits/`, `/editorial-policy/` and `/about/`. It left
`/` alone; the home page keeps its own budget (VAL-OPUS-021).

- Start: the export of `40c0947c`, the commit before `1624fa98`, which
  landed the first hub changes of this pass. It was built outside the
  repository.
- End: the export of `30532df0`, built by `npm run refresh:brand-v2-evidence`.
  The commits after it change no page.

Every measure below reads the exported HTML; `words-browser.json` repeats
the word counts on the DOM Chromium renders, for both exports. Prose words follow
`lib/discovery-prose.ts`: paragraphs, definitions and list items written as
sentences, without navigation, captions, hidden text, form labels or index
entries that are only a link. A word is a token that holds a letter or digit.

## Files

| File | What it holds |
|---|---|
| `words-start.json`, `words-end.json` | Per page: prose words, first paragraph and its words, average sentence length, phrase-sweep hits |
| `words-browser.json` | The same counts from the Chromium-rendered DOM at 1440 px, Start and End |
| `hub-summaries.json` | Per hub card at End: summary, sentence count, and any number or name missing from its exported article |
| `overflow-320-375.txt` | Each page at 320 and 375 px in Chromium: document width against the viewport, and horizontal scroll regions |
| `glossary-first-paragraphs.json` | Per glossary term at End: paragraphs, first-paragraph words, first sentence, whether it opens "term is/are" |
| `number-citation-diff.txt` | The number and citation diff per page, Start against End |
| `glossary-diff.txt` | Each `data/glossary.ts` entry at `40c0947c` against End: numbers, names and citations lost, words grown |
| `structural-detector.txt` | The `lint-no-slop` structural detector over each page's exported prose |
| `humanizer-start.txt`, `humanizer-end.txt` | The humanizer v3 scan of each page at Start and at End |
| `budget-plants.txt` | The budget check with one planted sentence in a hub, the glossary and `/about/`, then clean |
| `captures/pair-<page>-<width>.jpg` | Start left, End right, at 1440 px (scaled to half) and 375 px |

## Words (VAL-OPUS-107)

| Page | Start | End | End / Start | First paragraph, words |
|---|---:|---:|---:|---:|
| `/manipulation/` | 288 | 207 | 71.9% | 24 |
| `/rl-sim2real/` | 162 | 120 | 74.1% | 39 |
| `/world-models/` | 167 | 125 | 74.9% | 34 |
| `/data-hardware/` | 155 | 116 | 74.8% | 37 |
| `/classical/` | 201 | 149 | 74.1% | 50 |
| `/frontier/` | 133 | 96 | 72.2% | 31 |
| `/adjacent/` | 91 | 68 | 74.7% | 22 |
| `/glossary/` | 9971 | 8203 | 82.3% | 22 |
| `/a-z/` | 31 | 22 | 71.0% | 16 |
| `/search/` | 20 | 12 | 60.0% | 12 |
| `/credits/` | 185 | 128 | 69.2% | 38 |
| `/editorial-policy/` | 234 | 173 | 73.9% | 20 |
| `/about/` | 256 | 185 | 72.3% | 36 |

The Chromium counts in `words-browser.json` equal these on every page but
`/search/`, whose idle hint ("Type a query to search every published
article and the methods, companies and datasets." and "Try: ...") renders
only in the browser: 48 words at Start and 32 at End (66.7%). The budget
check reads the exported HTML, so it does not hold that hint.

`/glossary/` misses the 75% target. Its 119 definitions are reference
text: 118 were rewritten so each opens by defining its term, and each
entry keeps its numbers, names and citations, except the ADD-S locators
and the success-rate caveat listed under the diff below. In `glossary-diff.txt`, "names lost: A" is a
false positive (the old opening "A ..." counted as a name). A trim study
of the 54 longest definitions found 55 words across 29 of them, mostly
single words whose loss blurred a term or a qualifier ("Image-based visual
servoing" to "Image-based servoing"). It was not applied; in full it would
leave the glossary at 81.7% of Start. The remaining sentences each state a
fact, number, mechanism or source.

`data/discovery-budgets.json` holds the End counts, and
`npm run check:discovery-prose` (in `postbuild` and `vercel-build`) fails
when a page exceeds its budget. `budget-plants.txt`: a planted sentence
makes it exit 1 on `/manipulation/` (218 words over 207), `/glossary/` (8214
over 8203) and `/about/` (196 over 185); the clean copy exits 0.

## First paragraphs (VAL-OPUS-105, VAL-OPUS-110)

Each hub opens by defining its domain: "Manipulation is ...",
"Reinforcement learning (RL) is ...", "World models are ...", "Data,
hardware and evaluation are ...", "Classical robotics is ...", "Frontier
problems are ..." and "Adjacent domains are ...". The longest first
paragraph on any page is 50 words (`/classical/`).

All 119 glossary definitions open "term is ..." or "term are ...", and
every first paragraph is 60 words or fewer (the longest is 60). A definition
over 60 words is set as two paragraphs, split at a sentence boundary, so the
entry's text still equals the registry definition
(`tests/unit/discovery-prose.test.ts` rebuilds every definition from its
paragraphs). 82 definitions have two paragraphs.

## Style (VAL-OPUS-108)

Average sentence length at End runs from 6.0 words (`/search/`) to 18.8
(`/glossary/`). The phrase sweep finds nothing on any page. The structural
detector finds no paper-internal reference and no not-X disclaimer on any
page (`structural-detector.txt`).

## Number and citation diff (VAL-OPUS-106)

`number-citation-diff.txt` passes on `/` and the 13 pages of this pass:
no pair of a number and the citation its sentence carries at Start, and no
citation id cited at Start, is missing at End. No external link is lost.
The hubs gain citations: a cited lead fact on four hubs (RL and
sim-to-real, data and hardware, classical, frontier) and the adjacent
evidence table (8 sources).

Numbers that carried no citation and left a page, listed for the read:

- `/data-hardware/`: "N-of-10", "95%" and "30 steps" left the Evaluation
  Crisis summary and "BridgeData V2" the Major Datasets summary. Each
  summary is now one sentence (VAL-OPUS-034); the Evaluation Crisis article
  states the 95 percent per-step and 30-step example and the N-of-10 trials.
- `/frontier/`: "pi0.7" left the Generalization summary; the article
  names pi0.7 six times.
- `/manipulation/`, `/world-models/`: a "2" inside a model name. "Gemini
  Robotics ER 2" left one summary and a second "TD-MPC2" left another;
  RT-2, GO-2, GR-2, V-JEPA 2 and one TD-MPC2 stay.
- `/glossary/`: "Equation (1)", "Equation (2)" and "Table 1" left the ADD-S
  definition. They are paper-internal locators (VAL-OPUS-108); the 0.1
  threshold, the "chosen coefficient" and the citation stay. Its closing
  not-X caveat ("..., not a guarantee that every visually
  indistinguishable rotation has zero error") now reads "The score and
  threshold are evaluation choices, so a visually indistinguishable
  rotation can still score a nonzero error."
- `/glossary/`, success-rate: "An inconclusive comparison does not
  establish policy equivalence." moved out of the tooltip gloss, a hedge
  the frontier pass routed here. The Evaluation Crisis article states it,
  attributed to Snyder et al., and the gloss ends with the same source's
  STEP result (up to 32% fewer trials), which the article also states.
- `/`: the source count (1,256 at Start, 1,364 at End) and two
  2026-10-15 dates in the recently updated list changed with other
  commits' articles and the date refresh. This pass edited no home file.
- `/credits/`: "76k trajectories from 13 institutions" left with a DROID
  photo caption that `7e3cea90` (data and hardware photos) removed.

## Captures (VAL-OPUS-112)

Each pair puts Start left and End right, from the top of the page down to
3200 px (1440) or 5200 px (375); the capture scrolls first so lazy images
load. What each pair shows:

- `/manipulation/`: the dek and the "This domain overview lists 15
  articles" paragraph give way to "Manipulation is ...", the article count
  with its order, and a Related line of three links. The fifteen card
  summaries drop to one short line each (two at 375 px; up to five at
  Start).
- `/rl-sim2real/`: the lead ends with the ANYmal sentence and its "Rudin
  et al. 2021" link; Related and "Further reading" (Gu et al. 2026) follow.
- `/world-models/`, `/classical/`: defining leads; the classical lead
  carries the Intrinsic 2026 challenge result with its link. Cards are one
  line at 1440 px.
- `/data-hardware/`, `/frontier/`: the IFR 2026 facts and their links; at
  375 px the citation wraps onto its own line inside the column. Before
  `e5208736` it ran past the column edge.
- `/adjacent/`: under the lead and Related line, "How each field shows it
  is safe enough": a booktabs table with eight author-year citations. At
  375 px it shows Field and Scale and scrolls sideways, in a labelled,
  focusable region, as article tables do.
- `/glossary/`: definitions open "Action chunking is ...", "Admittance
  control is ..." where Start had fragments ("Predicting a sequence ...",
  "The dual of impedance control ..."). Split definitions show as two
  paragraphs. The byline, term column and source links keep their layout;
  nothing passes the 375 px column.
- `/a-z/`, `/search/`: one-line leads; the letter strip, entries, search
  field and idle hint keep their places. The idle hint still restates the
  lead.
- `/credits/`: two short intro paragraphs; the bio ends "and cites the
  source of every claim." Every image card is unchanged.
- `/editorial-policy/`: the lead loses its "not a product ranking service"
  and "rather than" phrasing; all five sections stay, shorter.
- `/about/`: the scope paragraph, "Reading the wiki" (three short
  paragraphs with the ACT and glossary links) and "Reading paths" (three
  lists, without the one-line blurbs).

`overflow-320-375.txt`: no page is wider than the viewport at 320 or 375
px, and the only horizontal scroll region is the adjacent table.
