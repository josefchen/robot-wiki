/**
 * Canonical populations for the figure, imagery and original-SVG assertions.
 *
 * Five of the ten are decided by what a browser painted and five by what the
 * registry and the files on disk record, and they do not quantify over the
 * same things. Giving all ten the article-route population would emit a row
 * per route for claims never checked against a route (R8a): a licence is not
 * a property of a page, and a page is not where an SVG's semantic geometry
 * lives.
 *
 * - `VAL-B2-ART-005` and `VAL-B2-IMG-005` are about a figure as the reader
 *   meets it, caption and credit and alt text together, so their members are
 *   the rendered figure occurrences. A route with four sound figures and one
 *   uncredited one is not a route that passes, and grading by route would
 *   let the four outvote the one.
 * - `VAL-B2-ART-004`, `VAL-B2-ART-006` and `VAL-B2-IMG-003` are about the
 *   dark diagrams specifically, so their members are the schematic
 *   occurrences. The sweep proves the two descriptions pick out the same
 *   set: it refuses evidence in which a figure is mounted on the dark
 *   instrument without being a registered schematic, or the reverse.
 * - `VAL-B2-IMG-002` and `VAL-B2-IMG-008` are about the provenance record of
 *   a reusable editorial asset, so their members are the editorial images.
 *   The 111 company marks are deliberately excluded: their provenance row is
 *   `VAL-B2-MAP-010`, and restating it here would claim approvals this
 *   feature did not make.
 * - `VAL-B2-IMG-001` is about every first-party visual surface, so it
 *   quantifies over the whole asset census, marks and models included.
 * - `VAL-B2-IMG-004` is about material treatment, whose members are the
 *   registered materials, not files.
 * - `VAL-B2-VIZ-014` is about the original SVGs, so its members are the
 *   first-party vector assets that carry a normalized semantic hash.
 */
export const FIGURE_OCCURRENCE_POPULATION_SOURCE =
  'evidence/brand-v2/figures.json#figures';
export const SCHEMATIC_OCCURRENCE_POPULATION_SOURCE =
  'evidence/brand-v2/figures.json#schematics';
export const EDITORIAL_IMAGE_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#assets:editorial-image';
export const FIRST_PARTY_SVG_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#assets:first-party-svg';
export const MATERIAL_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#materials';
export const ASSET_CENSUS_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#assets';

/** The five rows a browser decides, from the two-width figure sweep. */
export const FIGURE_RUNTIME_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-ART-004': SCHEMATIC_OCCURRENCE_POPULATION_SOURCE,
  'VAL-B2-ART-005': FIGURE_OCCURRENCE_POPULATION_SOURCE,
  'VAL-B2-ART-006': SCHEMATIC_OCCURRENCE_POPULATION_SOURCE,
  'VAL-B2-IMG-003': SCHEMATIC_OCCURRENCE_POPULATION_SOURCE,
  'VAL-B2-IMG-005': FIGURE_OCCURRENCE_POPULATION_SOURCE,
};

/** The five rows the registry and the shipped bytes decide. */
export const FIGURE_RECORD_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-IMG-001': ASSET_CENSUS_POPULATION_SOURCE,
  'VAL-B2-IMG-002': EDITORIAL_IMAGE_POPULATION_SOURCE,
  'VAL-B2-IMG-004': MATERIAL_POPULATION_SOURCE,
  'VAL-B2-IMG-008': EDITORIAL_IMAGE_POPULATION_SOURCE,
  'VAL-B2-VIZ-014': FIRST_PARTY_SVG_POPULATION_SOURCE,
};

export const FIGURE_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  ...FIGURE_RUNTIME_ASSERTION_POPULATION_SOURCES,
  ...FIGURE_RECORD_ASSERTION_POPULATION_SOURCES,
};
