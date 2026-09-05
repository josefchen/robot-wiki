import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPARATUS_RUNTIME_EVIDENCE_PATH,
  APPARATUS_DESKTOP_VIEWPORT_ID,
  APPARATUS_MOBILE_VIEWPORT_ID,
  apparatusAssertionMembers,
  apparatusEvidenceFingerprint,
  breadcrumbTruthVerdicts,
  citationChipVerdicts,
  expectedApparatusGraph,
  furnitureReachVerdicts,
  readApparatusRuntimeEvidence,
  referenceSheetVerdicts,
  relationshipPreservationVerdicts,
  termAffordanceVerdicts,
  type ApparatusRuntimeEvidence,
} from '@/lib/brand-v2-apparatus-evidence';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as { routes: { public: Array<{ path: string; routeKind: string }> } };

const ARTICLE_ROUTES = REGISTRY.routes.public
  .filter(({ routeKind }) => routeKind === 'article')
  .map(({ path }) => path);

function committed(): ApparatusRuntimeEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, APPARATUS_RUNTIME_EVIDENCE_PATH), 'utf8'),
  ) as ApparatusRuntimeEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: ApparatusRuntimeEvidence) => void,
): ApparatusRuntimeEvidence {
  const copy = JSON.parse(
    JSON.stringify(committed()),
  ) as ApparatusRuntimeEvidence;
  change(copy);
  return copy;
}

function accept(evidence: unknown): ApparatusRuntimeEvidence {
  return readApparatusRuntimeEvidence({
    artifact: evidence,
    articleRoutes: ARTICLE_ROUTES,
    fingerprint: apparatusEvidenceFingerprint({ root: ROOT }),
    root: ROOT,
  });
}

function desktop(evidence: ApparatusRuntimeEvidence, route?: string) {
  const observation = evidence.observations.find(
    (candidate) =>
      candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID &&
      (route === undefined || candidate.route === route),
  );
  expect(observation, 'the sweep recorded no desktop observation').toBeDefined();
  return observation!;
}

/** The first route whose sweep actually carries the family under test. */
function routeWith(
  evidence: ApparatusRuntimeEvidence,
  has: (observation: ReturnType<typeof desktop>) => boolean,
): ReturnType<typeof desktop> {
  const observation = evidence.observations.find(
    (candidate) =>
      candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID && has(candidate),
  );
  expect(
    observation,
    'no article in the corpus carries the family under test, so this case would pass vacuously',
  ).toBeDefined();
  return observation!;
}

describe('the derived apparatus graph', () => {
  it('names every published article route and nothing else', () => {
    const members = apparatusAssertionMembers(ROOT);
    expect(members).toEqual([...ARTICLE_ROUTES].sort());
    expect(members.length).toBeGreaterThan(5);
  });

  it('derives a non-empty bibliography and a breadcrumb trail for every article', () => {
    for (const [route, expected] of expectedApparatusGraph(ROOT)) {
      expect(expected.references.length, route).toBeGreaterThan(0);
      expect(expected.breadcrumb.map(({ label }) => label)[0]).toBe('Home');
      expect(expected.breadcrumb).toHaveLength(3);
      expect(expected.breadcrumb[2]?.href, route).toBeNull();
      expect(expected.breadcrumb[1]?.href, route).toMatch(/^\/[^/]+\/$/);
    }
  });

  it('derives the further-reading set as a subset of the bibliography', () => {
    for (const [route, expected] of expectedApparatusGraph(ROOT)) {
      for (const id of expected.furtherReading) {
        expect(expected.references, route).toContain(id);
      }
    }
  });
});

describe('the apparatus evidence reader', () => {
  it('accepts the committed sweep and finds every verdict family green', () => {
    const evidence = accept(committed());
    expect(evidence.articleRoutes).toEqual(
      expect.arrayContaining(ARTICLE_ROUTES),
    );

    const families = [
      relationshipPreservationVerdicts(evidence, ROOT),
      breadcrumbTruthVerdicts(evidence, ROOT),
      referenceSheetVerdicts(evidence),
      furnitureReachVerdicts(evidence),
      termAffordanceVerdicts(evidence),
      citationChipVerdicts(evidence),
    ];
    for (const family of families) {
      expect(family.size).toBeGreaterThan(0);
      expect(
        [...family.values()].flatMap(({ failures }) => failures),
      ).toEqual([]);
    }
  });

  it('refuses a stale fingerprint', () => {
    expect(() =>
      readApparatusRuntimeEvidence({
        artifact: committed(),
        articleRoutes: ARTICLE_ROUTES,
        fingerprint: 'not-the-fingerprint',
        root: ROOT,
      }),
    ).toThrow(/stale/);
  });

  it('refuses a sweep taken at viewports other than the declared two', () => {
    expect(() =>
      accept(
        mutate((evidence) => {
          evidence.viewports = [APPARATUS_DESKTOP_VIEWPORT_ID];
        }),
      ),
    ).toThrow(/swept at/);
  });

  it('refuses a route set that does not equal the registered one', () => {
    expect(() =>
      accept(
        mutate((evidence) => {
          evidence.articleRoutes = evidence.articleRoutes.slice(1);
        }),
      ),
    ).toThrow(/article routes/);
  });

  it('refuses a sweep that skipped a route at one viewport', () => {
    expect(() =>
      accept(
        mutate((evidence) => {
          const victim = evidence.observations.findIndex(
            (candidate) => candidate.viewport === APPARATUS_MOBILE_VIEWPORT_ID,
          );
          evidence.observations.splice(victim, 1);
        }),
      ),
    ).toThrow(/missing 1 route\/viewport reading/);
  });

  it('refuses a duplicated route and viewport pair', () => {
    expect(() =>
      accept(
        mutate((evidence) => {
          evidence.observations.push(
            JSON.parse(JSON.stringify(evidence.observations[0])),
          );
        }),
      ),
    ).toThrow(/twice/);
  });

  it('refuses a reading of a page that rendered nothing', () => {
    expect(() =>
      accept(
        mutate((evidence) => {
          evidence.observations[0].visibleTextLength = 0;
        }),
      ),
    ).toThrow(/empty page/);
  });

  it('refuses an article whose breadcrumb trail never rendered', () => {
    expect(() =>
      accept(
        mutate((evidence) => {
          evidence.observations[0].breadcrumb.items = [];
        }),
      ),
    ).toThrow(/no breadcrumb trail/);
  });

  it('refuses an article whose bibliography never rendered', () => {
    expect(() =>
      accept(
        mutate((evidence) => {
          evidence.observations[0].references.present = false;
        }),
      ),
    ).toThrow(/no References section/);
  });
});

describe('the apparatus verdict families', () => {
  it('fails a bibliography whose entries were reordered', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.references.entries.length > 1,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
        )!;
        observation.references.entries.reverse();
      }),
    );
    const failures = relationshipPreservationVerdicts(mutated, ROOT).get(
      target.route,
    )!.failures;
    expect(failures.join(' ')).toMatch(/renders references/);
  });

  it('fails an article that dropped a curated See also edge', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.seeAlso.keys.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        for (const observation of copy.observations) {
          if (observation.route !== target.route) continue;
          observation.seeAlso.keys.pop();
        }
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT).get(target.route)!
        .failures.join(' '),
    ).toMatch(/renders See also/);
  });

  it('fails an article that dropped an inline citation marker the body declares', () => {
    const evidence = accept(committed());
    const graph = expectedApparatusGraph(ROOT);
    const target = routeWith(
      evidence,
      (observation) =>
        (graph.get(observation.route)?.citationMarkers.length ?? 0) > 0,
    );
    const declared = graph.get(target.route)!.citationMarkers[0];
    const mutated = accept(
      mutate((copy) => {
        for (const observation of copy.observations) {
          if (observation.route !== target.route) continue;
          const victim = observation.citations.findIndex(
            (chip) => chip.id === declared,
          );
          if (victim >= 0) observation.citations.splice(victim, 1);
        }
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT).get(target.route)!
        .failures.join(' '),
    ).toMatch(/no longer renders the inline citation marker/);
  });

  it('fails an article that rendered a chip the citation registry does not hold', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.citations.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        for (const observation of copy.observations) {
          if (observation.route !== target.route) continue;
          observation.citations.push({
            ...observation.citations[0],
            id: 'a-citation-nobody-registered',
          });
        }
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT).get(target.route)!
        .failures.join(' '),
    ).toMatch(/the citation registry does not hold/);
  });

  it('fails a template that renders a different apparatus at 375px than at 1440px', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.linkedFrom.keys.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const mobile = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_MOBILE_VIEWPORT_ID,
        )!;
        mobile.linkedFrom.keys = [];
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT).get(target.route)!
        .failures.join(' '),
    ).toMatch(/different linked-from list at 375px/);
  });

  it('fails a current crumb that became a link', () => {
    const mutated = accept(
      mutate((evidence) => {
        const items = evidence.observations[0].breadcrumb.items;
        const last = items[items.length - 1];
        last.isLink = true;
        last.href = '/somewhere/';
      }),
    );
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}`;
    expect(
      breadcrumbTruthVerdicts(mutated, ROOT).get(id)!.failures.join(' '),
    ).toMatch(/current crumb as a link/);
  });

  it('fails a domain crumb pointed at the wrong route', () => {
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].breadcrumb.items[1].href = '/not-a-domain/';
      }),
    );
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}`;
    expect(
      breadcrumbTruthVerdicts(mutated, ROOT).get(id)!.failures.join(' '),
    ).toMatch(/crumb at \/not-a-domain\//);
  });

  it('fails an ancestor crumb whose link affordance is colour alone', () => {
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].breadcrumb.items[0].decorationLine = 'none';
      }),
    );
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}`;
    expect(
      breadcrumbTruthVerdicts(mutated, ROOT).get(id)!.failures.join(' '),
    ).toMatch(/no non-colour link affordance/);
  });

  it('fails a second aria-current="page" anywhere in the document', () => {
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].ariaCurrentPage = [
          '<a aria-current="page">one</a>',
          '<h1 aria-current="page">two</h1>',
        ];
      }),
    );
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}`;
    expect(
      breadcrumbTruthVerdicts(mutated, ROOT).get(id)!.failures.join(' '),
    ).toMatch(/aria-current="page"/);
  });

  it('fails a reference entry below the AA contrast floor', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.references.entries.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
        )!;
        observation.references.entries[0].contrast = 2.1;
      }),
    );
    const id = `${target.route}|${APPARATUS_DESKTOP_VIEWPORT_ID}|${target.references.entries[0].id}`;
    expect(
      referenceSheetVerdicts(mutated).get(id)!.failures.join(' '),
    ).toMatch(/below the 4.5:1 floor/);
  });

  it('fails a reference entry that overflows the article column', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.references.entries.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_MOBILE_VIEWPORT_ID,
        )!;
        observation.references.entries[0].overflowPx = 41;
      }),
    );
    const id = `${target.route}|${APPARATUS_MOBILE_VIEWPORT_ID}|${target.references.entries[0].id}`;
    expect(
      referenceSheetVerdicts(mutated).get(id)!.failures.join(' '),
    ).toMatch(/overflows the article column by 41/);
  });

  it('fails a source link that stopped being signal blue', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.references.entries.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
        )!;
        observation.references.entries[0].colour = 'rgb(11, 11, 12)';
      }),
    );
    const id = `${target.route}|${APPARATUS_DESKTOP_VIEWPORT_ID}|${target.references.entries[0].id}`;
    expect(
      referenceSheetVerdicts(mutated).get(id)!.failures.join(' '),
    ).toMatch(/not signal blue/);
  });

  it('fails a document that widened past its own viewport', () => {
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].documentScrollWidth =
          evidence.observations[0].viewportWidth + 18;
      }),
    );
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}|document`;
    expect(referenceSheetVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /scrolls to/,
    );
  });

  it('fails a furniture link that fell out of the Tab order', () => {
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].furnitureLinks[0].tabIndex = -1;
      }),
    );
    const link = mutated.observations[0].furnitureLinks[0];
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}|${link.section}|${link.href}`;
    expect(furnitureReachVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /not in the sequential focus order/,
    );
  });

  it('fails a furniture link whose focus state paints nothing new', () => {
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].furnitureLinks[0].focusVisible = false;
      }),
    );
    const link = mutated.observations[0].furnitureLinks[0];
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}|${link.section}|${link.href}`;
    expect(furnitureReachVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /no focus indicator/,
    );
  });

  it('refuses a furniture sweep that lost a whole family', () => {
    expect(() =>
      furnitureReachVerdicts(
        accept(
          mutate((evidence) => {
            for (const observation of evidence.observations) {
              observation.furnitureLinks = observation.furnitureLinks.filter(
                (link) => link.section !== 'references',
              );
            }
          }),
        ),
      ),
    ).toThrow(/never found a references link/);
  });

  it('fails a term whose definition target went missing', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.terms.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
        )!;
        observation.terms[0].describedByResolves = false;
      }),
    );
    const id = `${target.route}|${APPARATUS_DESKTOP_VIEWPORT_ID}|${target.terms[0].id}#0`;
    expect(termAffordanceVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /aria-describedby/,
    );
  });

  it('fails a term that renders as indistinguishable prose', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.terms.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
        )!;
        observation.terms[0].distinguishedWithoutColour = false;
      }),
    );
    const id = `${target.route}|${APPARATUS_DESKTOP_VIEWPORT_ID}|${target.terms[0].id}#0`;
    expect(termAffordanceVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /renders as prose/,
    );
  });

  it('fails a citation chip whose metadata carries no year', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.citations.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
        )!;
        observation.citations[0].tooltipText =
          'A title with no publication date at all in it';
      }),
    );
    const id = `${target.route}|${APPARATUS_DESKTOP_VIEWPORT_ID}|${target.citations[0].id}#0`;
    expect(citationChipVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /no year/,
    );
  });

  it('fails a citation chip that stopped pointing at an external source', () => {
    const evidence = accept(committed());
    const target = routeWith(
      evidence,
      (observation) => observation.citations.length > 0,
    );
    const mutated = accept(
      mutate((copy) => {
        const observation = copy.observations.find(
          (candidate) =>
            candidate.route === target.route &&
            candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
        )!;
        observation.citations[0].href = '#ref-broken';
      }),
    );
    const id = `${target.route}|${APPARATUS_DESKTOP_VIEWPORT_ID}|${target.citations[0].id}#0`;
    expect(citationChipVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /not an external source URL/,
    );
  });

  it('refuses to decide a family whose population emptied', () => {
    const emptied = accept(
      mutate((evidence) => {
        for (const observation of evidence.observations) {
          observation.citations = [];
        }
      }),
    );
    expect(() => citationChipVerdicts(emptied)).toThrow(/vacuously/);
  });
});
