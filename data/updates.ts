/**
 * Editor's notes on what changed in an article, shown under "Latest" on
 * home. Newest first. The lead editor adds a row when a change is worth
 * naming; an article without a row still appears under "Latest" by the date
 * git records for it (data/content-dates.json), with no note.
 *
 * - `date`: the calendar day of the change in UTC, `YYYY-MM-DD`.
 * - `domain`, `slug`: a published article.
 * - `note`: one plain line of 10 words or fewer saying what changed, with no
 *   dash and nothing the home wording screen refuses. A number in a note
 *   must be one the article itself cites.
 *
 * tests/unit/home-updates.test.ts holds every row to this.
 */
export type ArticleUpdate = {
  date: string;
  domain: string;
  slug: string;
  note: string;
};

export const ARTICLE_UPDATES: readonly ArticleUpdate[] = [
  { date: '2026-11-14', domain: 'data-hardware', slug: 'research-arms-compared', note: 'New page comparing eleven research arms on control and software.' },
  { date: '2026-11-14', domain: 'data-hardware', slug: 'data-market', note: 'New article on what an hour of robot data costs.' },
  { date: '2026-11-14', domain: 'frontier', slug: 'reliability-gap', note: "Adds the F.02 fleet's retirement to the BMW row." },
  { date: '2026-11-14', domain: 'data-hardware', slug: 'industrial-deployment', note: "Adds the F.02 retirement; Optimus row follows Tesla's Q3 letter." },
  { date: '2026-11-14', domain: 'manipulation', slug: 'diffusion-policy', note: 'States the 46.9% as a relative gain in success.' },
  { date: '2026-11-14', domain: 'frontier', slug: 'bear-case', note: "Names Crunchbase's $18.8B by late June in the funding heading." },
  { date: '2026-11-14', domain: 'frontier', slug: 'safety-and-assurance', note: 'Adds Inspect Robots and the implied-harm study of π0.5.' },
  { date: '2026-11-14', domain: 'manipulation', slug: 'pi-line', note: 'Says the 52% Robot Olympics average covers 11 attempted tasks.' },
  { date: '2026-11-14', domain: 'world-models', slug: 'generative-video', note: 'RISE now shows 85 to 95% success on three tasks.' },
  { date: '2026-11-14', domain: 'data-hardware', slug: 'data-bottleneck', note: "Says Sunday's 90% is the glove-to-robot conversion rate." },
  { date: '2026-11-14', domain: 'data-hardware', slug: 'datasets', note: 'Renames the 50,000-hour corpus to Open-HumanWAM-50K.' },
  { date: '2026-11-14', domain: 'data-hardware', slug: 'evaluation-crisis', note: 'Dates the RoboDojo figures to the July 2026 paper.' },
  { date: '2026-11-14', domain: 'world-models', slug: 'model-based-robot-learning', note: "Adds RISE's real-task success, 35 points above the best baseline." },
  { date: '2026-11-14', domain: 'frontier', slug: 'competing-theses', note: 'Marks the Mercedes-Benz kitting result as a proof of concept.' },
  { date: '2026-11-14', domain: 'manipulation', slug: 'foundation-models', note: 'Calls the Mercedes-Benz pilot a proof of concept.' },
  { date: '2026-11-14', domain: 'manipulation', slug: 'generalist-policies', note: 'Credits the 85.6% RoboLab-120 score to Gemini 4 Argon.' },
  { date: '2026-11-14', domain: 'manipulation', slug: 'hierarchical', note: "Describes Apple's AMP1 as a harness around a generalist model." },
  { date: '2026-11-14', domain: 'manipulation', slug: 'vla-models', note: 'Names the models behind the AMP1 and top VLA scores.' },
  { date: '2026-11-14', domain: 'frontier', slug: 'dexterity', note: 'Matches the touch and hand figures to their sources.' },
  { date: '2026-11-12', domain: 'frontier', slug: 'bear-case', note: 'Updated with third quarter funding, filings and skeptic statements.' },
  { date: '2026-11-12', domain: 'adjacent', slug: 'autonomous-vehicles', note: 'Shorter, with third quarter robotaxi mileage and a recall query.' },
  { date: '2026-11-12', domain: 'data-hardware', slug: 'hardware-taxonomy', note: 'Prices rechecked, with humanoid production and new tactile models.' },
  { date: '2026-11-12', domain: 'frontier', slug: 'safety-and-assurance', note: 'Adds the ISO 13482 revision and new EU dates.' },
  { date: '2026-11-12', domain: 'classical', slug: 'motion-planning', note: 'Adds GPU planners and the corrected optimality proof.' },
  { date: '2026-11-12', domain: 'world-models', slug: 'taxonomy', note: 'Rewritten for newcomers, with the November world model releases.' },
  { date: '2026-11-12', domain: 'manipulation', slug: 'vla-models', note: 'Now explains what a model does each time it runs.' },
  { date: '2026-11-12', domain: 'rl-sim2real', slug: 'humanoid-wbc', note: "Explains motion tracking first, then this year's three designs." },
  { date: '2026-11-12', domain: 'frontier', slug: 'reliability-gap', note: 'Adds autumn deployment records and a worked compounding example.' },
];
