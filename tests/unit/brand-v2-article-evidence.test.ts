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
      titleSheetVerdicts(evidence),
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

  it('refuses an artifact that is not an object or not version 1', () => {
    expect(() => accept(null)).toThrow(/not an object/);
    expect(() => accept(mutate((e) => Object.assign(e, { version: 2 })))).toThrow(
      /version 2 is not 1/,
    );
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
    const failures = [...titleSheetVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.length).toBeGreaterThanOrEqual(4);
  });

  it('fails a reading sheet measured in the wrong font', () => {
    // The trap this row exists for: the column caps at 65ch while wearing a
    // different face than the prose inside it, so the paragraph renders
    // narrower than the cap says. Widening the advance is the same shape of
    // error as widening the column.
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const paragraph of observation.proseParagraphs) {
            paragraph.zeroAdvancePx = paragraph.zeroAdvancePx * 1.3;
          }
        }
      }),
    );
    const failures = [...readingSheetVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(/ch/);
  });

  it('fails an article title outside the sealed sizes or the registered axes', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const role of observation.tekturRoles) {
            if (role.tag !== 'h1') continue;
            role.face.sizePx = 20;
            role.face.variationSettings = '"wdth" 100, "wght" 400';
            role.face.weight = 400;
          }
        }
      }),
    );
    const failures = [...articleTitleVerdicts(evidence).values()].flatMap(
      ({ failures: own }) => own,
    );
    expect(failures.join('\n')).toMatch(/outside 48-64px/);
    expect(failures.join('\n')).toMatch(/not the registered instance/);
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
    expect(failures.join('\n')).toMatch(/draws no underline/);
    expect(failures.join('\n')).toMatch(/no non-colour link affordance/);
    expect(failures.join('\n')).toMatch(/not reachable by keyboard/);
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
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          for (const label of observation.registrationLabels) {
            label.trackingEm = 0.02;
          }
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

  it('refuses to decide a family whose population emptied', () => {
    const evidence = accept(
      mutate((e) => {
        for (const observation of e.observations) {
          observation.registrationLabels = [];
        }
      }),
    );
    expect(() => registrationTrackingVerdicts(evidence)).toThrow(
      /found no registration label/,
    );
  });

  it('names every addressable heading as a member, not only the linked ones', () => {
    const evidence = accept(committed());
    const members = sectionHeadingMembers(evidence);
    expect(members.length).toBeGreaterThan(0);
    expect(new Set(members).size).toBe(members.length);
    expect(members).toEqual([...sectionHeadingVerdicts(evidence).keys()].sort());
  });
});
