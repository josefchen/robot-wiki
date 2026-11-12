/**
 * Editor's notes on what changed in an article, shown under "Latest" on
 * home. Newest first. The lead editor adds a row when a change is worth
 * naming; an article without a row still appears under "Latest" by the date
 * git records for it (data/content-dates.json), with no note.
 *
 * - `date`: the calendar day of the change, `YYYY-MM-DD`.
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
