import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SELECTION_LIME_RGB,
  SHELL_RUNTIME_EVIDENCE_PATH,
  SHELL_VIEWPORT,
  currentRouteVerdicts,
  ledgerByBaselineMember,
  readShellRuntimeEvidence,
  sameDestination,
  shellEvidenceFingerprint,
  skipLinkVerdicts,
  type ShellRuntimeEvidence,
} from '@/lib/brand-v2-shell-evidence';
import {
  navigationBaselineMembers,
} from '@/lib/shell-populations';
import { sha256, stableJson } from '@/lib/brand-v2-baseline';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as {
  routes: { public: Array<{ path: string }> };
  gridDevices: Array<{ id: string; fingerprint: string }>;
};

const ROUTES = REGISTRY.routes.public.map(({ path }) => path);

function fingerprint(): string {
  return shellEvidenceFingerprint({
    root: ROOT,
    deviceRegistryRows: REGISTRY.gridDevices,
  });
}

function committed(): ShellRuntimeEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, SHELL_RUNTIME_EVIDENCE_PATH), 'utf8'),
  ) as ShellRuntimeEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: ShellRuntimeEvidence) => void,
): ShellRuntimeEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as ShellRuntimeEvidence;
  change(copy);
  return copy;
}

function accept(evidence: ShellRuntimeEvidence): ShellRuntimeEvidence {
  return readShellRuntimeEvidence({
    artifact: evidence,
    routes: ROUTES,
    fingerprint: fingerprint(),
  });
}

/**
 * The first observation whose marked entry has idle siblings in its own
 * category, so the weight-step reading has something to compare against.
 */
function markedRouteIndex(evidence: ShellRuntimeEvidence): number {
  const index = evidence.observations.findIndex(({ navEntries }) => {
    const marked = navEntries.find((entry) => entry.ariaCurrent === 'page');
    if (!marked) return false;
    return navEntries.some(
      (entry) =>
        entry.category === marked.category && entry.ariaCurrent !== 'page',
    );
  });
  expect(index, 'the sweep recorded no marked route').toBeGreaterThanOrEqual(0);
  return index;
}

describe('shell runtime evidence', () => {
  it('accepts the committed sweep for the tree it was measured against', () => {
    const evidence = accept(committed());
    expect(evidence.viewport).toBe(SHELL_VIEWPORT.id);
    expect(evidence.routes).toHaveLength(ROUTES.length);
    expect(evidence.observations).toHaveLength(ROUTES.length);
    expect(evidence.expandedLedger.length).toBeGreaterThan(0);
  });

  it('refuses stale, incomplete, and unmeasured shell evidence', () => {
    const current = fingerprint();
    // Each case is one way the artifact can stop describing this tree.
    expect(() =>
      readShellRuntimeEvidence({
        artifact: committed(),
        routes: ROUTES,
        fingerprint: `${current.slice(0, 63)}0`,
      }),
    ).toThrow(/stale/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.version = 2 as unknown as 1;
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/version/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.viewport = '375x812';
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/swept at 375x812/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: committed(),
        routes: ROUTES.slice(0, ROUTES.length - 1),
        fingerprint: current,
      }),
    ).toThrow(/registered public routes/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: committed(),
        routes: [],
        fingerprint: current,
      }),
    ).toThrow(/population is empty/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.observations = evidence.observations.slice(1);
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/missing 1 route observations/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].visibleTextLength = 0;
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/empty rendered page/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].navEntries = [];
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/discovered no navigation entry/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].skipLink.firstTabStopTag = '';
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/no first keyboard destination/);
    expect(() =>
      readShellRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.expandedLedger = [];
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/empty expanded taxonomy ledger/);
  });

  it('passes the committed sweep on every current-route and skip-link reading', () => {
    const evidence = accept(committed());
    expect(
      [...currentRouteVerdicts(evidence).values()].flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    expect(
      [...skipLinkVerdicts(evidence).values()].flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
  });

  it('fails a current-route mark that only colour carries, or that colour carries in signal blue', () => {
    const index = markedRouteIndex(committed());
    const signal = currentRouteVerdicts(
      accept(
        mutate((evidence) => {
          const entry = evidence.observations[index].navEntries.find(
            ({ ariaCurrent }) => ariaCurrent === 'page',
          );
          if (entry?.marker) entry.marker.borderLeftColour = 'rgb(36, 95, 255)';
        }),
      ),
    );
    expect(
      [...signal.values()].flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/signal blue|not the sealed/);

    const colourOnly = currentRouteVerdicts(
      accept(
        mutate((evidence) => {
          const observation = evidence.observations[index];
          const entry = observation.navEntries.find(
            ({ ariaCurrent }) => ariaCurrent === 'page',
          );
          if (!entry) return;
          for (const sibling of observation.navEntries) {
            if (sibling.category !== entry.category) continue;
            sibling.fontWeight = entry.fontWeight;
          }
        }),
      ),
    );
    expect(
      [...colourOnly.values()].flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/colour is the only difference/);
  });

  it('fails an unregistered mark, a clipped mark, and a mark that names the link', () => {
    const index = markedRouteIndex(committed());
    const withMarker = (
      change: (marker: NonNullable<
        ShellRuntimeEvidence['observations'][number]['navEntries'][number]['marker']
      >) => void,
    ) =>
      [
        ...currentRouteVerdicts(
          accept(
            mutate((evidence) => {
              const entry = evidence.observations[index].navEntries.find(
                ({ ariaCurrent }) => ariaCurrent === 'page',
              );
              if (entry?.marker) change(entry.marker);
            }),
          ),
        ).values(),
      ]
        .flatMap(({ failures }) => failures)
        .join(' ');

    expect(
      withMarker((marker) => {
        marker.deviceId = null;
      }),
    ).toMatch(/unregistered element/);
    expect(
      withMarker((marker) => {
        marker.alignmentErrorPx = 9;
      }),
    ).toMatch(/from its registered anchor/);
    expect(
      withMarker((marker) => {
        marker.heightPx = 2;
        marker.ownerHeightPx = 26;
      }),
    ).toMatch(/not full-row/);
    expect(
      withMarker((marker) => {
        marker.contributedText = 'current page';
      }),
    ).toMatch(/contribute "current page"/);
    expect(
      withMarker((marker) => {
        marker.ariaHidden = null;
      }),
    ).toMatch(/exposed or pointer-active/);
  });

  it('fails aria-current parked on a heading, and a route that keeps it with no navigation item', () => {
    const heading = currentRouteVerdicts(
      accept(
        mutate((evidence) => {
          evidence.observations[0].ariaCurrentNodes.push({
            tag: 'h1',
            href: null,
            navigationLink: false,
            accessibleName: 'Search',
            outline: '<h1 aria-current="page">Search</h1>',
          });
        }),
      ),
    );
    expect(
      [...heading.values()].flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/h1 carries aria-current/);

    const orphan = mutate((evidence) => {
      // A route with no taxonomy entry: drop every ledger destination that
      // matches it, then leave its aria-current node in place.
      const observation = evidence.observations.find(
        ({ ariaCurrentNodes }) => ariaCurrentNodes.length === 1,
      );
      if (!observation) return;
      evidence.expandedLedger = evidence.expandedLedger.filter(
        ({ href }) => !sameDestination(href, observation.route),
      );
    });
    expect(
      [...currentRouteVerdicts(accept(orphan)).values()]
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/no taxonomy entry yet exposes/);
  });

  it('fails a skip link that is not the first Tab stop or does not move focus', () => {
    const cases: Array<[(evidence: ShellRuntimeEvidence) => void, RegExp]> = [
      [
        (evidence) => {
          evidence.observations[0].skipLink.firstTabStopTag = 'button';
        },
        /not a link/,
      ],
      [
        (evidence) => {
          evidence.observations[0].skipLink.firstTabStopHref = '/';
        },
        /not the skip destination/,
      ],
      [
        (evidence) => {
          evidence.observations[0].skipLink.restTopPx = 12;
        },
        /before it is focused/,
      ],
      [
        (evidence) => {
          evidence.observations[0].skipLink.visibleWhenFocused = false;
        },
        /off-screen while focused/,
      ],
      [
        (evidence) => {
          evidence.observations[0].skipLink.activatedFocusId = null;
        },
        /leaves focus on/,
      ],
    ];
    for (const [change, pattern] of cases) {
      expect(
        [...skipLinkVerdicts(accept(mutate(change))).values()]
          .flatMap(({ failures }) => failures)
          .join(' '),
      ).toMatch(pattern);
    }
  });

  it('reconciles the rendered taxonomy against the sealed navigation baseline', () => {
    const sealed = navigationBaselineMembers(
      JSON.parse(
        readFileSync(
          join(ROOT, 'evidence', 'brand-v2', 'baseline', 'baseline.json'),
          'utf8',
        ),
      ),
      JSON.parse(
        readFileSync(
          join(ROOT, 'contract', 'brand-v2-approved-deltas.json'),
          'utf8',
        ),
      ),
    );
    // The lockup string is the one change VAL-B2-SHELL-005 admits, and it is
    // admitted through a reviewable approved delta rather than through a
    // hole in the comparison.
    const lockup = sealed.find(({ id }) => id === 'nav:/');
    expect(lockup?.approvedDeltaId).toBe('brand-v2-id-home-link-navigation-entry');
    expect(lockup?.hash).not.toBe(lockup?.sealedHash);
    expect(
      sealed.filter(({ approvedDeltaId }) => approvedDeltaId !== null),
    ).toHaveLength(1);
    expect(() =>
      navigationBaselineMembers(
        JSON.parse(
          readFileSync(
            join(ROOT, 'evidence', 'brand-v2', 'baseline', 'baseline.json'),
            'utf8',
          ),
        ),
        {
          entries: [
            {
              id: 'fabricated',
              manifest: 'navigation',
              memberId: 'nav:/',
              oldHash: 'f'.repeat(64),
              newHash: '0'.repeat(64),
            },
          ],
        },
      ),
    ).toThrow(/the baseline does not record/);
    const rendered = ledgerByBaselineMember(accept(committed()));
    expect([...rendered.keys()].sort()).toEqual(sealed.map(({ id }) => id));
    for (const { id, hash } of sealed) {
      const entry = rendered.get(id);
      expect(entry, id).toBeDefined();
      expect(
        sha256(
          stableJson({
            index: entry?.index ?? -1,
            href: entry?.href ?? '',
            name: entry?.name ?? '',
          }),
        ),
        id,
      ).toBe(hash);
    }
    expect(() =>
      ledgerByBaselineMember(
        accept(
          mutate((evidence) => {
            evidence.expandedLedger.push({
              ...evidence.expandedLedger[0],
            });
          }),
        ),
      ),
    ).toThrow(/twice/);
    expect(() => navigationBaselineMembers({ manifests: {} })).toThrow(
      /empty population/,
    );
  });

  it('holds the sweep to the sealed lime, and the fingerprint to the rail registrations', () => {
    const evidence = accept(committed());
    const markers = evidence.observations
      .flatMap(({ navEntries }) => navEntries)
      .map(({ marker }) => marker)
      .filter((marker) => marker !== null);
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) {
      expect(marker.borderLeftColour).toBe(SELECTION_LIME_RGB);
    }
    expect(() =>
      shellEvidenceFingerprint({ root: ROOT, deviceRegistryRows: [] }),
    ).toThrow(/no rail device/);
    // The registered rail geometry is inside the fingerprint, so a registry
    // edit alone makes the committed sweep stale.
    expect(
      shellEvidenceFingerprint({
        root: ROOT,
        deviceRegistryRows: REGISTRY.gridDevices.map((row) =>
          row.id.endsWith('rail') ? { ...row, fingerprint: 'mutated' } : row,
        ),
      }),
    ).not.toBe(fingerprint());
  });
});
