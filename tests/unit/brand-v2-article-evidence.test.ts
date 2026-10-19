import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ARTICLE_RUNTIME_EVIDENCE_PATH,
  ARTICLE_VIEWPORTS,
  articleEvidenceFingerprint,
  articleRuleVerdicts,
  articleTitleVerdicts,
  displayFaceVerdicts,
  homeWordmarkVerdicts,
  linkTreatmentVerdicts,
  proseFaceVerdicts,
  proseResidueVerdicts,
  readArticleRuntimeEvidence,
  readingSheetVerdicts,
  registrationTrackingVerdicts,
  roleFaceVerdicts,
  sectionHeadingMembers,
  sectionHeadingVerdicts,
  titleSheetResidueVerdicts,
  titleSheetSourceFacts,
  titleSheetVerdicts,
  type ArticleRuntimeEvidence,
} from '@/lib/brand-v2-article-evidence';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as {
  routes: { public: Array<{ path: string; routeKind: string }> };
};

const ROUTES = REGISTRY.routes.public.map(({ path }) => path);
const ARTICLE_ROUTES = REGISTRY.routes.public
  .filter(({ routeKind }) => routeKind === 'article')
  .map(({ path }) => path);

function committed(): ArticleRuntimeEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, ARTICLE_RUNTIME_EVIDENCE_PATH), 'utf8'),
  ) as ArticleRuntimeEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: ArticleRuntimeEvidence) => void,
): ArticleRuntimeEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as ArticleRuntimeEvidence;
  change(copy);
  return copy;
}

function accept(evidence: unknown): ArticleRuntimeEvidence {
  return readArticleRuntimeEvidence({
    artifact: evidence,
    routes: ROUTES,
    articleRoutes: ARTICLE_ROUTES,
    fingerprint: articleEvidenceFingerprint({ root: ROOT }),
  });
}

const DESKTOP = ARTICLE_VIEWPORTS[1].id;

function articleObservation(evidence: ArticleRuntimeEvidence, viewport: string) {
  const observation = evidence.observations.find(
    (candidate) => candidate.isArticle && candidate.viewport === viewport,
  );
  expect(observation, 'the sweep recorded no article observation').toBeDefined();
  return observation!;
}

describe('the article evidence reader', () => {
  it('accepts the committed sweep and finds every verdict family green', () => {
    const evidence = accept(committed());
    expect(evidence.routes).toEqual(expect.arrayContaining(ARTICLE_ROUTES));

    const families = [
      titleSheetVerdicts(evidence, titleSheetSourceFacts(ROOT)),
      readingSheetVerdicts(evidence),
      linkTreatmentVerdicts(evidence),
      titleSheetResidueVerdicts(evidence),
      displayFaceVerdicts(evidence),
      proseFaceVerdicts(evidence),
      roleFaceVerdicts(evidence),
      homeWordmarkVerdicts(evidence),
      articleTitleVerdicts(evidence),
      proseResidueVerdicts(evidence),
      sectionHeadingVerdicts(evidence),
      registrationTrackingVerdicts(evidence),
      articleRuleVerdicts(evidence),
    ];
    for (const family of families) {
      expect(family.size).toBeGreaterThan(0);
      expect(
        [...family.values()].flatMap(({ failures }) => failures),
      ).toEqual([]);
    }
  });

  it('refuses evidence whose fingerprint no longer matches the tree', () => {
    expect(() =>
      readArticleRuntimeEvidence({
        artifact: committed(),
        routes: ROUTES,
        articleRoutes: ARTICLE_ROUTES,
        fingerprint: 'not-the-fingerprint-this-tree-derives',
      }),
    ).toThrow(/stale/);
  });

  // Successor of the version-1 case: version 2 added the planted registration label.
  it('refuses an artifact that is not an object or not version 2', () => {
    expect(() => accept(null)).toThrow(/not an object/);
    expect(() => accept(mutate((e) => Object.assign(e, { version: 1 })))).toThrow(
      /version 1 is not 2/,
    );
  });

  it('refuses a planted registration label on a page the sweep never read', () => {
    expect(() =>
      accept(
        mutate((e) => {
          e.registrationLabelProbe.route = '/not-a-swept-route/';
        }),
      ),
    ).toThrow(/planted its registration-label probe on \/not-a-swept-route\//);
  });

  it('refuses a sweep taken at viewports other than the declared two', () => {
    expect(() =>
      accept(
        mutate((e) => {
          e.viewports = [e.viewports[0]!];
        }),
      ),
    ).toThrow(/not 375x812, 1440x900/);
  });

  it('refuses a route set that does not equal the registered one', () => {
    expect(() =>
      accept(
        mutate((e) => {
          e.routes = e.routes.slice(1);
        }),
      ),
    ).toThrow(/registered public routes/);
    expect(() =>
      accept(
        mutate((e) => {
          e.articleRoutes = e.articleRoutes.slice(1);
        }),
      ),
    ).toThrow(/registered ones/);
  });

  it('refuses a reading of a page that rendered nothing', () => {
    expect(() =>
      accept(
        mutate((e) => {
          e.observations[0]!.visibleTextLength = 0;
        }),
      ),
    ).toThrow(/empty page/);
  });

  it('refuses a sweep and a registry that disagree about what an article is', () => {
    expect(() =>
      accept(
        mutate((e) => {
          const observation = articleObservation(e, DESKTOP);
          observation.isArticle = false;
        }),
      ),
    ).toThrow(/disagrees with the registry/);
  });

  it('refuses an article whose reading column never rendered', () => {
    expect(() =>
      accept(
        mutate((e) => {
          articleObservation(e, DESKTOP).sheet.columnFound = false;
        }),
      ),
    ).toThrow(/found no reading column/);
  });

  it('refuses a duplicated route and viewport pair', () => {
    expect(() =>
      accept(
        mutate((e) => {
          e.observations.push(
            JSON.parse(JSON.stringify(e.observations[0])) as never,
          );
        }),
      ),
    ).toThrow(/twice/);
  });

  it('refuses a sweep that skipped a route at one viewport', () => {
    expect(() =>
      accept(
        mutate((e) => {
          const target = articleObservation(e, DESKTOP);
          e.observations = e.observations.filter(
            (candidate) => candidate !== target,
          );
        }),
      ),
    ).toThrow(/missing 1 route\/viewport reading/);
  });
});

describe('the article verdict families', () => {
  it('fails a title sheet that lost its context, its title, or a fact', () => {
    const evidence = accept(
      mutate((e) => {
        const block = articleObservation(e, DESKTOP).titleBlock;
        block.breadcrumbLabels = [];
        block.h1Count = 2;
        block.lastReviewed = null;
        block.readingMinutes = null;
      }),
    );
    const failures = [
      ...titleSheetVerdicts(evidence, titleSheetSourceFacts(ROOT)).values(),
    ].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.length).toBeGreaterThanOrEqual(4);
  });

  it('fails a title sheet whose three facts are plausible and wrong', () => {
    // Every one of these is well-formed, non-empty and of the right type,
    // so a presence check reads the sheet as complete. The date is a date,
    // the reading time is a positive number of minutes, and the count is a
    // non-negative integer - they are simply not this article's.
    const facts = titleSheetSourceFacts(ROOT);
    const route = ARTICLE_ROUTES[0];
    const truth = facts.get(route)!;
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          if (observation.route !== route) continue;
          const block = observation.titleBlock;
          block.lastReviewed = '2026-01-01';
          block.reviewDateTime = '2026-01-01';
          block.reviewDateText = '1 January 2026';
          block.readingMinutes = (truth.readingMinutes ?? 1) + 3;
          block.readingTimeText = `${(truth.readingMinutes ?? 1) + 3} min`;
          block.citationCount = truth.citationIds.length + 2;
          block.citationCountText = String(truth.citationIds.length + 2);
        }
      }),
    );
    const failures = [
      ...titleSheetVerdicts(evidence, facts).values(),
    ].flatMap(({ failures: own }) => own);
    expect(failures.join('\n')).toMatch(
      new RegExp(
        `${route} prints review date 2026-01-01 where content/.+\\.mdx records ${truth.lastReviewed}`,
      ),
    );
    expect(failures.join('\n')).toMatch(
      /shows the reader review date "1 January 2026", not/,
    );
    expect(failures.join('\n')).toMatch(
      /prints a \d+ min read where data\/reading-times\.json measured \d+/,
    );
    expect(failures.join('\n')).toMatch(
      /claims \d+ citation\(s\) where its resolved References list holds \d+/,
    );
  });

  it('fails a sheet whose rendered words disagree with its own attributes', () => {
    // The half a data-attribute sweep cannot see: the machine-readable
    // values stay correct and the reader is shown something else.
    const facts = titleSheetSourceFacts(ROOT);
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          const block = observation.titleBlock;
          if (!observation.isArticle) continue;
          block.reviewDateText = 'Reviewed recently';
          block.readingTimeText = 'a short read';
          block.citationCountText = 'several';
        }
      }),
    );
    const failures = [
      ...titleSheetVerdicts(evidence, facts).values(),
    ].flatMap(({ failures: own }) => own);
    expect(failures.join('\n')).toMatch(
      /shows the reader review date "Reviewed recently"/,
    );
    expect(failures.join('\n')).toMatch(/shows the reader "a short read"/);
    expect(failures.join('\n')).toMatch(/shows the reader "several" citations/);
  });

  it('fails a header count that no longer matches the bibliography below it', () => {
    const facts = titleSheetSourceFacts(ROOT);
    const route = ARTICLE_ROUTES[0];
    const truth = facts.get(route)!;
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          if (observation.route !== route) continue;
          observation.titleBlock.bibliographyIds =
            observation.titleBlock.bibliographyIds.slice(1);
        }
      }),
    );
    const failures = [
      ...titleSheetVerdicts(evidence, facts).values(),
    ].flatMap(({ failures: own }) => own);
    expect(failures.join('\n')).toMatch(
      new RegExp(
        `${route} renders a bibliography of ${
          truth.citationIds.length - 1
        } entries that is not its resolved References list \\(missing ${
          truth.citationIds[0]
        }`,
      ),
    );
  });

  it('reads the three facts from the sources the template reads', () => {
    const facts = titleSheetSourceFacts(ROOT);
    expect(facts.size).toBe(ARTICLE_ROUTES.length);
    for (const route of ARTICLE_ROUTES) {
      const fact = facts.get(route);
      expect(fact, `${route} has no title-sheet source fact`).toBeDefined();
      // A published article with no review date, no measurement or no
      // citations would make its own row unfalsifiable, so the facts
      // themselves are asserted rather than only the comparison.
      expect(fact!.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fact!.readingMinutes).toBeGreaterThan(0);
      expect(fact!.citationIds.length).toBeGreaterThan(0);
      expect(new Set(fact!.citationIds).size).toBe(fact!.citationIds.length);
    }
  });

  it('fails a reading sheet measured in the wrong font', () => {
    // The trap this row exists for: the column caps at 65ch while wearing a
    // different face than the prose inside it, so the paragraph renders
    // narrower than the cap says. Widening the advance is the same shape of
    // error as widening the column.
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the title is a stable id. The measure is the 960px column
    // in pixels, so the same trap now arrives as prose in another face at
    // the width a character cap gave it: the column falls under the pixel
    // floor and the face check names the family.
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const paragraph of observation.proseParagraphs) {
            paragraph.familyHead = 'newsreader';
            paragraph.widthPx = Math.round(paragraph.widthPx * 0.75);
          }
        }
      }),
    );
    const failures = [...readingSheetVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(/sets its prose measure at \d+px, outside 880-960px/);
    const faces = [...proseFaceVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(faces.join('\n')).toMatch(/in newsreader, not Geist/);
  });

  it('fails an article title outside the sealed sizes or the registered axes', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const role of observation.tekturRoles) {
            if (role.tag !== 'h1') continue;
            // Owner-approved successor (Josef, 2026-10-10): the registered
            // title instance is DM Sans 400, selected by weight, so the
            // drift is weight 600 with no axis override.
            role.face.sizePx = 20;
            role.face.variationSettings = 'normal';
            role.face.weight = 600;
          }
        }
      }),
    );
    const failures = [...articleTitleVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(/at 20px on 1440x900, outside 84-92px/);
    expect(failures.join('\n')).toMatch(/at 20px on 375x812, outside 40-48px/);
    expect(failures.join('\n')).toMatch(/at wght=600 wdth=100 .*not the registered instance wght=400/);
  });

  it('fails a section heading that lost its underline, its affordance, or its link', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const link of observation.sectionLinks) {
            link.linked = false;
            link.decorationLine = 'none';
            link.affordance = null;
            link.keyboardFocusable = false;
          }
        }
      }),
    );
    const failures = [...sectionHeadingVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(/carries no self-link/);
    expect(failures.join('\n')).toMatch(/no non-colour link affordance/);
    expect(failures.join('\n')).toMatch(/not reachable by keyboard/);
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the title is a stable id. Section heads carry a quiet
    // affordance in place of a drawn underline, and the self-link keeps the
    // heading's ink, so a repainted link fails where the underline clause
    // used to.
    const repainted = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const link of observation.sectionLinks) {
            link.colour = 'rgb(36, 95, 255)';
          }
        }
      }),
    );
    expect(
      [...sectionHeadingVerdicts(repainted).values()]
        .flatMap(({ failures: own }) => own)
        .join('\n'),
    ).toMatch(/paints its self-link rgb\(36, 95, 255\), not the ink of the heading it names/);
  });

  it('fails a citation class repainted a colour no source path uses', () => {
    // The class stays internally consistent and stays distinct from every
    // other class, so a collision check sees nothing; only holding the
    // citation occurrences to their own locked treatment catches it.
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): citations are ink or muted text, so both a foreign red and
    // the retired signal blue fail.
    for (const [colour, pattern] of [
      ['rgb(165, 42, 30)', 'rgb\\(165, 42, 30\\)'],
      ['rgb(36, 95, 255)', 'rgb\\(36, 95, 255\\)'],
    ] as const) {
      const evidence = accept(
        mutate((e) => {
          for (const observation of e.observations) {
            for (const treatment of observation.linkTreatments) {
              if (treatment.kind !== 'citation') continue;
              treatment.colour = colour;
              for (const variant of treatment.variants) {
                variant.colour = colour;
                variant.signature = `${variant.signature}|replanted`;
              }
            }
          }
        }),
      );
      const failures = [...linkTreatmentVerdicts(evidence).values()].flatMap(
        ({ failures: own }) => own,
      );
      expect(failures.join('\n')).toMatch(
        new RegExp(
          `paints \\d+ citation link\\(s\\) ${pattern}, not the ink or muted text tone §4\\.4 locks for inline citations and source links`,
        ),
      );
      expect(failures.length).toBeGreaterThanOrEqual(ARTICLE_ROUTES.length);
    }
  });

  it('fails a generated References entry that keeps the colour and loses the underline', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const treatment of observation.linkTreatments) {
            if (treatment.kind !== 'reference') continue;
            treatment.decorationLine = 'none';
            for (const variant of treatment.variants) {
              variant.decorationLine = 'none';
            }
          }
        }
      }),
    );
    const failures = [...linkTreatmentVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(
      // Owner-approved successor (Josef, 2026-10-10): a superscript is the
      // other admitted non-colour mark, and this entry has neither.
      /draws \d+ reference link\(s\) with text-decoration-line "none" and no superscript, so colour is the only mark separating a source path from surrounding text/,
    );
  });

  it('fails a route whose source-path population emptied instead of passing', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const treatment of observation.linkTreatments) {
            if (!['citation', 'external', 'reference'].includes(treatment.kind)) {
              continue;
            }
            treatment.variants = [];
          }
        }
      }),
    );
    const failures = [...linkTreatmentVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(
      /graded no citation, external or reference occurrence, so its source-path treatment was decided by an empty population/,
    );
  });

  it('fails an action control set in the data face at a size the old band allowed', () => {
    // 12px is inside the 9-14px `Data/control` band, so the size-only
    // exemption passed this outright. "Reset" is an instruction, not a
    // value: nothing about it is fixed-width data to scan.
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const control of observation.interfaceControls) {
            if (control.controlId !== 'control:secondary-action') continue;
            control.familyHead = 'ibm plex mono';
            control.sizePx = 12;
          }
        }
      }),
    );
    const failures = [...roleFaceVerdicts(evidence, ROOT).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(
      // Owner-approved successor (Josef, 2026-10-10): the interface face is
      // Geist where brand-v2 had IBM Plex Sans.
      /sets the control ".*" \(<button>, 12px, control:secondary-action\) in ibm plex mono: a control registered to act carries an instruction, not a value, and computes to Geist at every size/,
    );
  });

  it('keeps the data-face allowance for the controls that carry a value', () => {
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the data face is Geist Mono where brand-v2 had IBM Plex
    // Mono, so the allowance is granted to Geist Mono inside the band, and
    // the retired mono no longer earns it at any size.
    const withSelection = (familyHead: string, sizePx: number) =>
      [
        ...roleFaceVerdicts(
          accept(
            mutate((e) => {
              for (const observation of e.observations) {
                for (const control of observation.interfaceControls) {
                  if (control.controlId !== 'control:selection') continue;
                  control.familyHead = familyHead;
                  control.sizePx = sizePx;
                }
              }
            }),
          ),
          ROOT,
        ).values(),
      ].flatMap(({ failures }) => failures);
    expect(withSelection('geist mono', 12)).toEqual([]);
    // The same control outside the band is still wrong, so the allowance is
    // the §4.3 row and not a blanket exemption.
    expect(withSelection('geist mono', 20).join('\n')).toMatch(
      /which is neither Geist nor the specified 9-14px Geist Mono/,
    );
    expect(withSelection('ibm plex mono', 12).join('\n')).toMatch(
      /\(<button>, 12px\) in ibm plex mono, which is neither Geist nor the specified 9-14px/,
    );
  });

  it('refuses a control sweep that stopped reading which control it measured', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const control of observation.interfaceControls) {
            control.controlId = '';
          }
        }
      }),
    );
    expect(() => roleFaceVerdicts(evidence, ROOT)).toThrow(
      /the instructionControls population of the role-face rows is empty/,
    );
  });

  it('fails a prose paragraph set in the display or the data face', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const paragraph of observation.proseParagraphs) {
            paragraph.insideRegisteredFrame = false;
            paragraph.familyHead = 'ibm plex mono';
          }
        }
      }),
    );
    const failures = [...proseResidueVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.length).toBeGreaterThan(0);
  });

  it('moves the compared tracking ratio when a second ratio appears, rather than exempting it', () => {
    // The site renders no registration label, so the labels are planted rather than retracked.
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          observation.registrationLabels.push({
            text: 'Planted', familyHead: 'geist mono', sizePx: 10, trackingEm: 0.02,
          });
        }
      }),
    );
    const failures = [...registrationTrackingVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(/outside 0.08-0.14em/);
  });

  it('fails a rule that no registry owns', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const rule of observation.rules) {
            rule.deviceId = null;
            rule.anchorSelector = null;
          }
        }
      }),
    );
    const failures = [...articleRuleVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(/no registry owns/);
  });

  // Successor of "refuses to decide a family whose population emptied": the
  // standard permits a site with no registration label, so an empty population
  // passes only while the collector finds the label the sweep planted.
  it('decides an empty registration-label population once the collector found the planted label', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          observation.registrationLabels = [];
        }
      }),
    );
    const tracking = [...registrationTrackingVerdicts(evidence).values()];
    expect(tracking.map(({ observed }) => observed.labelCount)).toEqual(
      tracking.map(() => 0),
    );
    expect(tracking.flatMap(({ failures }) => failures)).toEqual([]);
    expect([...roleFaceVerdicts(evidence, ROOT).values()].flatMap(({ failures }) => failures)).toEqual([]);
  });

  it('refuses to decide the registration-label families when the collector missed or mismeasured the planted label', () => {
    const missed = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          observation.registrationLabels = [];
        }
        e.registrationLabelProbe.collected = [];
      }),
    );
    expect(() => registrationTrackingVerdicts(missed)).toThrow(
      /found 0 copies of the registration label it planted/,
    );
    expect(() => roleFaceVerdicts(missed, ROOT)).toThrow(
      /found 0 copies of the registration label it planted/,
    );

    // Real labels do not stand in for a collector that missed the planted one.
    const missedBesideReal = accept(
      mutate((e) => {
        e.observations[0]!.registrationLabels.push({
          text: 'Planted', familyHead: 'geist mono', sizePx: 10, trackingEm: 0.1,
        });
        e.registrationLabelProbe.collected = [];
      }),
    );
    expect(() => registrationTrackingVerdicts(missedBesideReal)).toThrow(/found 0 copies/);

    for (const [change, reading] of [
      [{ trackingEm: 0.2 }, /at 10px and 0.2em, not Geist Mono at 10px and 0.1em/],
      [{ sizePx: 12 }, /at 12px and 0.1em, not Geist Mono at 10px and 0.1em/],
      [{ familyHead: 'ibm plex mono' }, /as ibm plex mono at 10px/],
    ] as const) {
      const mismeasured = accept(
        mutate((e) => {
          const probe = e.registrationLabelProbe;
          probe.collected = probe.collected.map((label) =>
            label.text === probe.text ? { ...label, ...change } : label,
          );
        }),
      );
      expect(() => registrationTrackingVerdicts(mismeasured)).toThrow(reading);
    }
  });

  it('names every addressable heading as a member, not only the linked ones', () => {
    const evidence = accept(committed());
    const members = sectionHeadingMembers(evidence);
    expect(members.length).toBeGreaterThan(0);
    expect(new Set(members).size).toBe(members.length);
    expect(members).toEqual([...sectionHeadingVerdicts(evidence).keys()].sort());
  });
});
