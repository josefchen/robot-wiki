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
  frontmatterFactDrift,
  furnitureReachVerdicts,
  readApparatusRuntimeEvidence,
  readRelationshipDeltas,
  readSealedFrontmatterFactMembers,
  readSealedRelationshipMembers,
  referenceSheetVerdicts,
  relationshipBaselineDrift,
  relationshipPreservationVerdicts,
  relationshipSourceDrift,
  termAffordanceVerdicts,
  type ApparatusRuntimeEvidence,
} from '@/lib/brand-v2-apparatus-evidence';
import {
  currentArticleFactFrontmatterMembers,
  currentRelationshipMembers,
} from '@/lib/relationship-manifest';
import { collectArticleTruthManifests } from '@/scripts/brand-v2-baseline';

/**
 * The rollout's own effect on the source side, rebuilt from the tree with
 * the collector the migration sealed and compared against the sealed
 * manifest. Every case below passes the real one, so a case that plants a
 * rendered defect is not also silently planting a source one.
 */
function sourceDrift(): Map<string, string[]> {
  return relationshipSourceDrift(ROOT);
}

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
      relationshipPreservationVerdicts(evidence, ROOT, sourceDrift()),
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
    const failures = relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(
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
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(target.route)!
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
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(target.route)!
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
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(target.route)!
        .failures.join(' '),
    ).toMatch(/the citation registry does not hold/);
  });

  it('fails a component that stopped rendering the chip its own source writes', () => {
    // The gap this closes: nineteen chip occurrences on six routes came from
    // mounted components, and the row asked only that the BODY's chips
    // survive. A component could drop every chip it writes and the article
    // still passed, because the body's chips were all still there.
    const graph = expectedApparatusGraph(ROOT);
    const [route, expected] = [...graph.entries()].find(
      ([, value]) => value.componentCitationSites.length > 0,
    )!;
    const site = expected.componentCitationSites[0];
    const evidence = accept(committed());
    const rendered = evidence.observations.find(
      (candidate) =>
        candidate.route === route &&
        candidate.viewport === APPARATUS_DESKTOP_VIEWPORT_ID,
    )!;
    expect(
      rendered.citations.filter((chip) => chip.id === site.id).length,
      'the corpus does not render the site under test, so the case is vacuous',
    ).toBeGreaterThan(0);
    const mutated = accept(
      mutate((copy) => {
        for (const observation of copy.observations) {
          if (observation.route !== route) continue;
          const victim = observation.citations
            .map((chip, index) => ({ chip, index }))
            .filter(({ chip }) => chip.id === site.id)
            .pop();
          if (victim) observation.citations.splice(victim.index, 1);
        }
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(route)!
        .failures.join(' '),
    ).toMatch(
      new RegExp(
        `the literal-spelled chip ${site.mountId.replace(/[/:]/g, '.')} cites is gone`,
      ),
    );
  });

  it('fails a chip that appears from a source nothing on the page holds', () => {
    const graph = expectedApparatusGraph(ROOT);
    // An id that is real in the registry, so the registry clause cannot be
    // the one that fires, on a route that mounts nothing able to reach it.
    const [route, expected] = [...graph.entries()].find(
      ([, value]) => value.mountCitationOwners.length === 0,
    )!;
    const intruder = [...graph.values()]
      .flatMap(({ citationMarkers }) => citationMarkers)
      .find((id) => !expected.citationMarkers.includes(id))!;
    const mutated = accept(
      mutate((copy) => {
        for (const observation of copy.observations) {
          if (observation.route !== route) continue;
          observation.citations.push({
            ...observation.citations[0],
            id: intruder,
          });
        }
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(route)!
        .failures.join(' '),
    ).toMatch(/that neither its body nor any component it mounts sources/);
  });

  it('fails a component chip whose id is spelled as a constant rather than quoted', () => {
    // `<CiteRef id={TRANSIENT_CONTACT_LIMIT_CITATION} />` renders exactly
    // the fixed chip a quoted id would. Recognising only the quoted
    // spelling left this occurrence with no floor: deleting it from both
    // viewport readings produced zero failures.
    const graph = expectedApparatusGraph(ROOT);
    const identifierSites = [...graph.entries()].flatMap(([route, value]) =>
      value.componentCitationSites
        .filter(({ spelling }) => spelling === 'identifier')
        .map((site) => ({ route, site })),
    );
    expect(
      identifierSites.length,
      'no constant-valued <CiteRef> site was derived, so this case is vacuous',
    ).toBeGreaterThan(0);
    const { route, site } = identifierSites[0];
    const mutated = accept(
      mutate((copy) => {
        for (const observation of copy.observations) {
          if (observation.route !== route) continue;
          const victim = observation.citations
            .map((chip, index) => ({ chip, index }))
            .filter(({ chip }) => chip.id === site.id)
            .pop();
          if (victim) observation.citations.splice(victim.index, 1);
        }
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(route)!
        .failures.join(' '),
    ).toMatch(
      new RegExp(
        `renders \\d+ chip\\(s\\) for "${site.id}" .*: the identifier-spelled chip ${site.mountId.replace(/[/:]/g, '.')} cites is gone`,
      ),
    );
  });

  it('fails a mount whose data-driven chips all disappeared', () => {
    const graph = expectedApparatusGraph(ROOT);
    const dynamic = [...graph.entries()].filter(
      ([, value]) => value.dynamicCitationSites.length > 0,
    );
    expect(
      dynamic.length,
      'no data-driven <CiteRef> site was derived, so this case is vacuous',
    ).toBeGreaterThan(0);
    const [route, expected] = dynamic[0];
    const owner = expected.mountCitationOwners.find(({ mountId }) =>
      expected.dynamicCitationSites.some((site) => site.mountId === mountId),
    )!;
    // The mount's chips repeat ids the body already cites, so removing them
    // by id removes nothing. What has to go is the surplus: every occurrence
    // above the count the body and the fixed sites already owe.
    const owed = new Map<string, number>();
    for (const id of expected.citationMarkers) {
      owed.set(id, (owed.get(id) ?? 0) + 1);
    }
    for (const site of expected.componentCitationSites) {
      owed.set(site.id, (owed.get(site.id) ?? 0) + 1);
    }
    const mutated = accept(
      mutate((copy) => {
        for (const observation of copy.observations) {
          if (observation.route !== route) continue;
          const kept = new Map<string, number>();
          observation.citations = observation.citations.filter((chip) => {
            const seen = (kept.get(chip.id) ?? 0) + 1;
            kept.set(chip.id, seen);
            return !owner.ids.includes(chip.id) || seen <= (owed.get(chip.id) ?? 0);
          });
        }
      }),
    );
    expect(
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(route)!
        .failures.join(' '),
    ).toMatch(
      new RegExp(
        `renders 0 chip\\(s\\) sourced by ${owner.sourcePath.replace(/[/.]/g, '.')} where its \\d+ data-driven site`,
      ),
    );
  });

  it('refuses a citation-site scan that stopped finding one of its spellings', () => {
    const graph = expectedApparatusGraph(ROOT);
    const spellings = [...graph.values()].flatMap(({ componentCitationSites }) =>
      componentCitationSites.map(({ spelling }) => spelling),
    );
    expect(new Set(spellings)).toEqual(new Set(['literal', 'identifier']));
    expect(
      [...graph.values()].flatMap(
        ({ dynamicCitationSites }) => dynamicCitationSites,
      ).length,
    ).toBeGreaterThan(0);
  });

  it('binds the References the frontmatter declares to the sealed frontmatter', () => {
    const sealed = readSealedFrontmatterFactMembers(ROOT);
    const current = currentArticleFactFrontmatterMembers(ROOT);
    expect(sealed.length).toBeGreaterThan(0);
    expect(current.length).toBe(sealed.length);
    // One collector, two gates: the sealed `article-metadata` manifest and
    // this row have to hash the frontmatter facts the same way.
    expect(
      collectArticleTruthManifests()
        ['article-metadata'].members.filter(({ id }) =>
          id.startsWith('article-fact-frontmatter:'),
        )
        .map(({ id, hash }) => ({ id, hash })),
    ).toEqual(current);
    expect(
      [
        ...frontmatterFactDrift({
          sealed,
          current,
          deltas: readRelationshipDeltas(ROOT, 'article-metadata'),
        }).values(),
      ].flat(),
    ).toEqual([]);

    // Appending a valid registry id to `frontmatter.citations` moves the
    // rendered References list and the derived expectation together, so the
    // rendered comparison stays green. Only the sealed side can see it.
    const moved = current.map((member, index) =>
      index === 0 ? { ...member, hash: '0'.repeat(64) } : member,
    );
    expect(
      [
        ...frontmatterFactDrift({
          sealed,
          current: moved,
          deltas: readRelationshipDeltas(ROOT, 'article-metadata'),
        }).values(),
      ]
        .flat()
        .join('\n'),
    ).toMatch(
      /changed the frontmatter review date or declared References the migration sealed \([0-9a-f]{12} -> 000000000000\), and no approved delta names the change/,
    );

    const memberId = current[0].id;
    const sealedHash = sealed.find(({ id }) => id === memberId)!.hash;
    expect(
      [
        ...frontmatterFactDrift({
          sealed,
          current: moved,
          deltas: [
            ...readRelationshipDeltas(ROOT, 'article-metadata'),
            {
              id: 'test-frontmatter-delta',
              manifest: 'article-metadata',
              memberId,
              oldHash: sealedHash,
              newHash: '0'.repeat(64),
            },
          ],
        }).values(),
      ].flat(),
    ).toEqual([]);
  });

  it('refuses a frontmatter-fact comparison with an empty side', () => {
    expect(() =>
      frontmatterFactDrift({ sealed: [], current: [], deltas: [] }),
    ).toThrow(/empty side/);
  });

  it('binds the derived graph to the sealed manifest instead of to itself', () => {
    const sealed = readSealedRelationshipMembers(ROOT);
    const current = currentRelationshipMembers(ROOT);
    expect(sealed.length).toBeGreaterThan(0);
    // One collector, two gates: the sealed manifests and this row have to
    // hash an article's relationships the same way or "unchanged" means two
    // different things depending on which gate is asked.
    expect(
      collectArticleTruthManifests().relationships.members.map(
        ({ id, hash }) => ({ id, hash }),
      ),
    ).toEqual(current);
    // The unplanted tree: every article's relationships are the sealed ones.
    expect([...sourceDrift().values()].flat()).toEqual([]);

    // The rollout edits an article's seeAlso list or drops a <Cite> from a
    // body. The derived expectation moves with it and the rendered
    // comparison stays green; only the sealed manifest can see it.
    const moved = current.map((member, index) =>
      index === 0 ? { ...member, hash: '0'.repeat(64) } : member,
    );
    const drift = relationshipBaselineDrift({
      sealed,
      current: moved,
      deltas: readRelationshipDeltas(ROOT),
    });
    expect([...drift.values()].flat().join('\n')).toMatch(
      /changed the relationships the migration sealed \([0-9a-f]{12} -> 000000000000\), and no approved delta names the change/,
    );

    // An approved delta closes it, and only for the change it names.
    const memberId = current[0].id;
    const sealedHash = sealed.find(({ id }) => id === memberId)!.hash;
    expect(
      [
        ...relationshipBaselineDrift({
          sealed,
          current: moved,
          deltas: [
            ...readRelationshipDeltas(ROOT),
            {
              id: 'test-delta',
              manifest: 'relationships',
              memberId,
              oldHash: sealedHash,
              newHash: '0'.repeat(64),
            },
          ],
        }).values(),
      ].flat(),
    ).toEqual([]);
    expect(
      [
        ...relationshipBaselineDrift({
          sealed,
          current: moved,
          deltas: [
            ...readRelationshipDeltas(ROOT),
            {
              id: 'test-delta',
              manifest: 'relationships',
              memberId,
              oldHash: sealedHash,
              newHash: '1'.repeat(64),
            },
          ],
        }).values(),
      ]
        .flat()
        .join('\n'),
    ).toMatch(/is covered by approved delta test-delta for .*but the tree moved/);
  });

  it('refuses a baseline comparison with an empty side', () => {
    expect(() =>
      relationshipBaselineDrift({ sealed: [], current: [], deltas: [] }),
    ).toThrow(/empty side/);
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
      relationshipPreservationVerdicts(mutated, ROOT, sourceDrift()).get(target.route)!
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
        const [first] = evidence.observations[0].ariaCurrentPage;
        evidence.observations[0].ariaCurrentPage = [
          first ?? {
            outline: '<a aria-current="page">one</a>',
            href: 'https://robot.wiki/one/',
            insideNavLandmark: true,
            matchesRoute: true,
          },
          {
            outline: '<h1 aria-current="page">two</h1>',
            href: null,
            insideNavLandmark: false,
            matchesRoute: false,
          },
        ];
      }),
    );
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}`;
    expect(
      breadcrumbTruthVerdicts(mutated, ROOT).get(id)!.failures.join(' '),
    ).toMatch(/aria-current="page"/);
  });

  it('fails a current-page marker parked on something that is not the navigation link for this route', () => {
    const mutated = accept(
      mutate((evidence) => {
        for (const marker of evidence.observations[0].ariaCurrentPage) {
          marker.matchesRoute = false;
          marker.href = 'https://robot.wiki/somewhere-else/';
        }
      }),
    );
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}`;
    expect(
      breadcrumbTruthVerdicts(mutated, ROOT).get(id)!.failures.join(' '),
    ).toMatch(/which is not this route/);
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

  it('fails a furniture link the Tab walk never reached', () => {
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].furnitureLinks[0].tabStop = -1;
      }),
    );
    const link = mutated.observations[0].furnitureLinks[0];
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}|${link.section}|${link.href}`;
    expect(furnitureReachVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /is never focused: \d+ Tab presses walked the page without reaching it/,
    );
  });

  it('fails a furniture link that paints the same ring focused as at rest', () => {
    const mutated = accept(
      mutate((evidence) => {
        const link = evidence.observations[0].furnitureLinks[0];
        link.focusedRing = link.restingRing;
      }),
    );
    const link = mutated.observations[0].furnitureLinks[0];
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}|${link.section}|${link.href}`;
    expect(furnitureReachVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /paints the same outline and shadow focused as at rest/,
    );
  });

  it('fails a ring that only a scripted focus would have shown', () => {
    // `:focus-visible` is the difference between a ring a keyboard reader
    // sees and one only a script ever triggers, and it is only decidable
    // under a real key press.
    const mutated = accept(
      mutate((evidence) => {
        evidence.observations[0].furnitureLinks[0].focusVisible = false;
      }),
    );
    const link = mutated.observations[0].furnitureLinks[0];
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}|${link.section}|${link.href}`;
    expect(furnitureReachVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /does not match :focus-visible under a real Tab press/,
    );
  });

  it('fails a keyboard order that contradicts the reading order', () => {
    const mutated = accept(
      mutate((evidence) => {
        const links = evidence.observations[0].furnitureLinks;
        const last = links[links.length - 1];
        last.tabStop = links[0].tabStop - 1;
      }),
    );
    const links = mutated.observations[0].furnitureLinks;
    const last = links[links.length - 1];
    const id = `${mutated.observations[0].route}|${mutated.observations[0].viewport}|${last.section}|${last.href}`;
    expect(furnitureReachVerdicts(mutated).get(id)!.failures.join(' ')).toMatch(
      /so the keyboard order contradicts the order the page reads in/,
    );
  });

  it('refuses a walk that reached no furniture link at all', () => {
    const mutated = accept(
      mutate((evidence) => {
        for (const observation of evidence.observations) {
          for (const link of observation.furnitureLinks) link.tabStop = -1;
        }
      }),
    );
    // Every link still fails individually, and the family refuses as well:
    // a walk that focused nothing graded none of its own clauses.
    expect(() => furnitureReachVerdicts(mutated)).toThrow(
      /focused no furniture link anywhere in the corpus/,
    );
  });

  it('records a real Tab walk, not a model of one', () => {
    const evidence = accept(committed());
    const links = evidence.observations.flatMap(
      ({ furnitureLinks }) => furnitureLinks,
    );
    expect(links.length).toBeGreaterThan(100);
    const reached = links.filter(({ tabStop }) => tabStop >= 0);
    expect(reached.length).toBe(links.length);
    for (const link of reached) {
      // A stop index is a count of key presses, so it cannot be the
      // document-order index the collector already knew; and the walk must
      // have pressed at least as many times as the stop it reports.
      expect(link.tabPresses).toBeGreaterThan(link.tabStop);
      expect(link.focusedRing).not.toBeNull();
    }
    // The ring the browser painted under the keyboard differs from the
    // resting one for every link, which is the fact the row is about.
    expect(
      reached.filter(({ focusedRing, restingRing }) => focusedRing === restingRing),
    ).toEqual([]);
    expect(reached.every(({ focusVisible }) => focusVisible)).toBe(true);
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
