import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_INTERVAL_RAIL_DEVICE_ID,
  INK_RGB,
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
const DEVICE_IDS = REGISTRY.gridDevices.map(({ id }) => id);

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
        // A fixed replacement digit silently stops being a mutation
        // whenever the real fingerprint already ends in it.
        fingerprint: `${current.slice(0, 63)}${current.endsWith('0') ? '1' : '0'}`,
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
      [...currentRouteVerdicts(evidence, DEVICE_IDS).values()].flatMap(
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
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the title is a stable id. The current entry is ink plus
    // weight, so signal blue, the retired lime, or any other paint on it
    // fails by name.
    const index = markedRouteIndex(committed());
    for (const colour of ['rgb(36, 95, 255)', SELECTION_LIME_RGB]) {
      const painted = [
        ...currentRouteVerdicts(
          accept(
            mutate((evidence) => {
              const entry = evidence.observations[index].navEntries.find(
                ({ ariaCurrent }) => ariaCurrent === 'page',
              );
              if (entry) entry.colour = colour;
            }),
          ),
          DEVICE_IDS,
        ).values(),
      ]
        .flatMap(({ failures }) => failures)
        .join(' ');
      expect(painted, colour).toMatch(
        new RegExp(`paints the current entry ${colour.replace(/[()]/g, '\\$&')}, not ink`),
      );
      expect(painted, colour).toMatch(/signal blue or the retired lime/);
    }

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
      DEVICE_IDS,
    );
    expect(
      [...colourOnly.values()].flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/colour is the only difference/);
  });

  it('fails an unregistered mark, a clipped mark, and a mark that names the link', () => {
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the title is a stable id. The rail is retired, so the
    // committed sweep carries no mark, and a mark planted on the current
    // entry fails whatever it is: unregistered, the former rail, another
    // registered device, an invented one, or one placed and hidden exactly
    // as the rail used to be.
    const index = markedRouteIndex(committed());
    type Marker = NonNullable<
      ShellRuntimeEvidence['observations'][number]['navEntries'][number]['marker']
    >;
    const planted: Marker = {
      deviceId: ACTIVE_INTERVAL_RAIL_DEVICE_ID,
      anchorSelector: null,
      ariaHidden: 'true',
      pointerEvents: 'none',
      borderLeftColour: INK_RGB,
      borderLeftWidthPx: 1,
      leftPx: 0,
      heightPx: 26,
      alignmentErrorPx: 0,
      ownerHeightPx: 26,
      contributedText: '',
    };
    const withMarker = (change: (marker: Marker) => void) =>
      [
        ...currentRouteVerdicts(
          accept(
            mutate((evidence) => {
              const entry = evidence.observations[index].navEntries.find(
                ({ ariaCurrent }) => ariaCurrent === 'page',
              );
              if (!entry) throw new Error('the marked route has no current entry');
              const marker = { ...planted };
              change(marker);
              entry.marker = marker;
            }),
          ),
          DEVICE_IDS,
        ).values(),
      ]
        .flatMap(({ failures }) => failures)
        .join(' ');
    expect(withMarker(() => {})).toMatch(
      new RegExp(
        `marks the current entry with ${ACTIVE_INTERVAL_RAIL_DEVICE_ID} where the research-page standard sets it in ink and weight alone`,
      ),
    );

    expect(
      withMarker((marker) => {
        marker.deviceId = null;
      }),
    ).toMatch(/unregistered element/);
    expect(
      withMarker((marker) => {
        marker.deviceId = 'device:section-rule';
      }),
    ).toMatch(/marks the current entry with device:section-rule where/);
    expect(
      withMarker((marker) => {
        marker.deviceId = 'device:invented-for-this-mark';
      }),
    ).toMatch(/device:invented-for-this-mark, which is not in the device registry/);
    // A device can still only be named against a registry that exists.
    expect(() => currentRouteVerdicts(accept(committed()), [])).toThrow(
      /device registry is empty/,
    );
    // The wordmark keeps its own exemption wording, with no device at all.
    expect(
      [
        ...currentRouteVerdicts(
          accept(
            mutate((evidence) => {
              for (const observation of evidence.observations) {
                const lockup = observation.navEntries.find(
                  (entry) => entry.category === 'lockup' && entry.ariaCurrent === 'page',
                );
                if (lockup) lockup.marker = { ...planted };
              }
            }),
          ),
          DEVICE_IDS,
        ).values(),
      ]
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/on the wordmark lockup, which the owner decision of 2026-09-25 excludes/);
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
      DEVICE_IDS,
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
      [...currentRouteVerdicts(accept(orphan), DEVICE_IDS).values()]
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
    // hole in the comparison. Approved additions to the taxonomy are a
    // different category: they carry the missing-member sentinel as their
    // sealed hash and never move a sealed member.
    const lockup = sealed.find(({ id }) => id === 'nav:/');
    expect(lockup?.approvedDeltaId).toBe('brand-v2-id-home-link-navigation-entry');
    expect(lockup?.hash).not.toBe(lockup?.sealedHash);
    const missingHash = createHash('sha256').update('missing').digest('hex');
    const moved = sealed.filter(
      ({ hash, sealedHash }) => sealedHash !== missingHash && hash !== sealedHash,
    );
    // Every move of a sealed member has to be an approved delta; an
    // unapproved move would surface here with approvedDeltaId null and fail
    // the rendered-taxonomy comparison downstream.
    expect(moved.length).toBeGreaterThan(0);
    expect(
      moved.filter(({ approvedDeltaId }) => approvedDeltaId === null),
    ).toHaveLength(0);
    // Additions to the taxonomy arrive the same way: approved deltas whose
    // sealed side is the missing-member sentinel.
    for (const member of sealed) {
      if (member.sealedHash === missingHash) {
        expect(member.approvedDeltaId).not.toBeNull();
      }
    }
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
    // Owner-approved successor (Josef, 2026-10-10, the research-page
    // standard): the title is a stable id. The sweep carries no current-route
    // mark anywhere, and every current entry is set in ink.
    const evidence = accept(committed());
    const entries = evidence.observations.flatMap(({ navEntries }) => navEntries);
    expect(entries.filter(({ marker }) => marker !== null)).toEqual([]);
    const current = entries.filter(({ ariaCurrent }) => ariaCurrent === 'page');
    expect(current.length).toBeGreaterThan(0);
    for (const entry of current) {
      expect(entry.colour, entry.href).toBe(INK_RGB);
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
