import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MOBILE_SHELL_EVIDENCE_PATH,
  MOBILE_VIEWPORT,
  SCRIM_SEPARATION_FLOOR,
  SELECTION_LIME_RGB,
  contrastRatio,
  descriptorFragments,
  drawerVerdicts,
  mobileHeaderVerdicts,
  mobileShellEvidenceFingerprint,
  readMobileShellEvidence,
  relativeLuminance,
  type MobileShellEvidence,
} from '@/lib/brand-v2-mobile-shell-evidence';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as {
  routes: { public: Array<{ path: string }> };
  gridDevices: Array<{ id: string; fingerprint: string }>;
};

const ROUTES = REGISTRY.routes.public.map(({ path }) => path);

function fingerprint(): string {
  return mobileShellEvidenceFingerprint({
    root: ROOT,
    deviceRegistryRows: REGISTRY.gridDevices,
  });
}

function committed(): MobileShellEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, MOBILE_SHELL_EVIDENCE_PATH), 'utf8'),
  ) as MobileShellEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: MobileShellEvidence) => void,
): MobileShellEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as MobileShellEvidence;
  change(copy);
  return copy;
}

function accept(evidence: MobileShellEvidence): MobileShellEvidence {
  return readMobileShellEvidence({
    artifact: evidence,
    routes: ROUTES,
    fingerprint: fingerprint(),
  });
}

function headerFailures(
  change: (evidence: MobileShellEvidence) => void,
): string {
  return [...mobileHeaderVerdicts(accept(mutate(change))).values()]
    .flatMap(({ failures }) => failures)
    .join(' ');
}

function drawerFailures(
  change: (evidence: MobileShellEvidence) => void,
): string {
  return [...drawerVerdicts(accept(mutate(change))).values()]
    .flatMap(({ failures }) => failures)
    .join(' ');
}

describe('mobile shell evidence', () => {
  it('accepts the committed sweep for the tree it was measured against', () => {
    const evidence = accept(committed());
    expect(evidence.viewport).toBe(MOBILE_VIEWPORT.id);
    expect(evidence.routes).toHaveLength(ROUTES.length);
    expect(evidence.observations).toHaveLength(ROUTES.length);
  });

  it('refuses stale, incomplete, and unmeasured mobile shell evidence', () => {
    const current = fingerprint();
    // Each case is one way the artifact can stop describing this tree.
    expect(() =>
      readMobileShellEvidence({
        artifact: committed(),
        routes: ROUTES,
        // A fixed replacement digit silently stops being a mutation
        // whenever the real fingerprint already ends in it.
        fingerprint: `${current.slice(0, 63)}${current.endsWith('0') ? '1' : '0'}`,
      }),
    ).toThrow(/stale/);
    expect(() =>
      readMobileShellEvidence({
        artifact: null,
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/not an object/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.version = 2 as unknown as 1;
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/version/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.viewport = '1440x900';
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/swept at 1440x900/);
    expect(() =>
      readMobileShellEvidence({
        artifact: committed(),
        routes: ROUTES.slice(0, ROUTES.length - 1),
        fingerprint: current,
      }),
    ).toThrow(/registered public routes/);
    expect(() =>
      readMobileShellEvidence({
        artifact: committed(),
        routes: [],
        fingerprint: current,
      }),
    ).toThrow(/population is empty/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.observations = evidence.observations.slice(1);
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/missing 1 route observations/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[1] = evidence.observations[0];
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/twice/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].visibleTextLength = 0;
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/empty rendered page/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].header.present = false;
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/discovered no compact header/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].focus.tabStopCount = 0;
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/no tab stops/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].focus.forwardWrap.focused = null;
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/no focus destination/);
    expect(() =>
      readMobileShellEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].dismissals =
            evidence.observations[0].dismissals.filter(
              ({ via }) => via !== 'scrim',
            );
        }),
        routes: ROUTES,
        fingerprint: current,
      }),
    ).toThrow(/dismissal paths/);
  });

  it('passes the committed sweep on every header and drawer reading', () => {
    const evidence = accept(committed());
    expect(
      [...mobileHeaderVerdicts(evidence).values()].flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    expect(
      [...drawerVerdicts(evidence).values()].flatMap(({ failures }) => failures),
    ).toEqual([]);
  });

  it('fails a trap that only wraps one way, and one focus can leave', () => {
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].focus.backwardWrap.landedOnLastStop = false;
      }),
    ).toMatch(/sends a Shift\+Tab off the first drawer stop/);
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].focus.forwardWrap.insideDrawer = false;
      }),
    ).toMatch(/outside the drawer/);
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].focus.focusOnOpenInsideDrawer = false;
      }),
    ).toMatch(/opens the drawer with focus on/);
  });

  it('fails an inert set that misses the skip link, and a page still reachable behind', () => {
    expect(
      drawerFailures((evidence) => {
        const region = evidence.observations[0].inert.regions.find(
          ({ id }) => id === 'the skip link',
        );
        if (region) region.inert = false;
      }),
    ).toMatch(/leaves the skip link outside the open drawer's inert set/);
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].inert.reachableOutsideDrawer = [
          'a[Skip to content]',
        ];
      }),
    ).toMatch(/reachable behind the drawer, starting with a\[Skip to content\]/);
  });

  it('fails an inert reading that stopped looking at a required region', () => {
    // The input that used to pass: the verdict iterated the rows the
    // artifact supplied, so a sweep that stopped querying `main`, the footer
    // and the skip link recorded a shorter list and the route passed on it
    // without any of the three ever being checked.
    const shortened = drawerFailures((evidence) => {
      for (const observation of evidence.observations) {
        observation.inert.regions = observation.inert.regions.filter(({ id }) =>
          ['header', 'the desktop sidebar'].includes(id),
        );
      }
    });
    for (const id of ['main', 'the site footer', 'the skip link']) {
      expect(shortened, id).toContain(
        `recorded no reading for ${id}`,
      );
    }
    // A region the shell stopped rendering is absent, not exempt.
    expect(
      drawerFailures((evidence) => {
        const region = evidence.observations[0].inert.regions.find(
          ({ id }) => id === 'the site footer',
        );
        if (region) region.present = false;
      }),
    ).toMatch(/renders no the site footer \(footer\) to make inert/);
    // And a row the required set does not name cannot pad the reading.
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].inert.regions.push({
          id: 'a region nobody asked for',
          present: true,
          inert: true,
        });
      }),
    ).toMatch(/not one of the required background regions/);
  });

  it('fails a descriptor the compact header paints through a pseudo-element', () => {
    // The input that used to pass: `::after { content: ... }` renders the
    // locked descriptor while the DOM stores none of it, so the leaf-text
    // scan, the descriptor scan and the lockup's own text were all
    // byte-identical to a compliant header's.
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.pseudoTexts = [
          {
            selector: 'header',
            position: '::after',
            text: PUBLIC_DESCRIPTOR,
          },
        ];
      }),
    ).toMatch(/through header::after in the compact header, which is the locked descriptor/);
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.pseudoTexts = [
          {
            selector: 'a[data-tektur-role="mobile-wordmark"]',
            position: '::before',
            text: 'The robotics wiki',
          },
        ];
      }),
    ).toMatch(/which the document stores nowhere/);
    // Generated punctuation says nothing and is not prose.
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.pseudoTexts = [
          { selector: 'span', position: '::after', text: '/' },
        ];
      }),
    ).not.toMatch(/stores nowhere/);
    expect(() =>
      accept(
        mutate((evidence) => {
          delete (
            evidence.observations[0].header as Partial<
              MobileShellEvidence['observations'][number]['header']
            >
          ).pseudoTexts;
        }),
      ),
    ).toThrow(/no pseudo-element reading/);
  });

  it('fails a dismissal path that does not close or does not restore the trigger', () => {
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].dismissals[2].closed = false;
      }),
    ).toMatch(/does not close the drawer on scrim/);
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].dismissals[1].focusedTrigger = false;
      }),
    ).toMatch(/after closing via close-control, not on the trigger/);
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].closedDrawerTabStops = 3;
      }),
    ).toMatch(/reachable while the drawer is closed/);
  });

  it('fails a scrim that composites to the panel colour, and a panel that adds a border', () => {
    // The paper-on-paper scrim this replaced: the panel and the composited
    // scrim were the same colour, so the boundary was 1.00:1.
    const collapsed = drawerFailures((evidence) => {
      const separation = evidence.observations[0].separation;
      separation.scrimCompositedRgb = [...separation.panelRgb];
      separation.contrastRatio = 1;
    });
    expect(collapsed).toMatch(
      new RegExp(`below the ${SCRIM_SEPARATION_FLOOR}:1`),
    );
    expect(
      drawerFailures((evidence) => {
        evidence.observations[0].separation.panelBorderLeftPx = 1;
      }),
    ).toMatch(/side border on the drawer panel as well as the scrim/);
  });

  it('fails a descriptor, a wrapped wordmark, and a wrong name in the compact header', () => {
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.leafTexts.push(PUBLIC_DESCRIPTOR);
      }),
    ).toMatch(/which is the locked descriptor/);
    // A truncation is still the descriptor as far as a reader is concerned.
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.leafTexts.push(
          'Citation-first encyclopedia of modern',
        );
      }),
    ).toMatch(/which is the locked descriptor/);
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.leafTexts.push('The robotics wiki');
      }),
    ).toMatch(/neither the identity nor a control label/);
    expect(
      headerFailures((evidence) => {
        const lockup = evidence.observations[0].header.lockups[0];
        lockup.lineBoxes = 2;
      }),
    ).toMatch(/wraps the compact wordmark across 2 line boxes/);
    expect(
      headerFailures((evidence) => {
        const lockup = evidence.observations[0].header.lockups[0];
        lockup.text = 'robot-wiki';
      }),
    ).toMatch(/not `Robot Wiki`/);
    expect(
      headerFailures((evidence) => {
        const lockup = evidence.observations[0].header.lockups[0];
        lockup.fontFamilyHead = 'IBM Plex Sans';
      }),
    ).toMatch(/not Tektur/);
    expect(
      headerFailures((evidence) => {
        const lockup = evidence.observations[0].header.lockups[0];
        lockup.tekturRole = null;
      }),
    ).toMatch(/without a registered display role/);
    expect(
      headerFailures((evidence) => {
        const header = evidence.observations[0].header;
        header.lockups = [...header.lockups, header.lockups[0]];
      }),
    ).toMatch(/not exactly one/);
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.display = 'none';
      }),
    ).toMatch(/renders no compact header at 375x812/);
    expect(
      headerFailures((evidence) => {
        evidence.observations[0].header.trigger = null;
      }),
    ).toMatch(/no drawer trigger/);
  });

  it('holds the sweep to the sealed lime and the fingerprint to the rail registrations', () => {
    const evidence = accept(committed());
    const marked = evidence.observations.filter(
      ({ currentRoute }) => currentRoute.markerDeviceId !== null,
    );
    expect(marked.length).toBeGreaterThan(0);
    for (const { route, currentRoute } of marked) {
      expect(currentRoute.markerColour, route).toBe(SELECTION_LIME_RGB);
      expect(currentRoute.markerDeviceId, route).toBe(
        'device:active-interval-rail',
      );
      expect(currentRoute.markerAlignmentErrorPx ?? 99, route).toBeLessThanOrEqual(2);
    }
    expect(() =>
      mobileShellEvidenceFingerprint({ root: ROOT, deviceRegistryRows: [] }),
    ).toThrow(/no rail device/);
    // The registered rail geometry is inside the fingerprint, so a registry
    // edit alone makes the committed sweep stale.
    expect(
      mobileShellEvidenceFingerprint({
        root: ROOT,
        deviceRegistryRows: REGISTRY.gridDevices.map((row) =>
          row.id.endsWith('rail') ? { ...row, fingerprint: 'mutated' } : row,
        ),
      }),
    ).not.toBe(fingerprint());
  });

  it('derives descriptor fragments and the contrast maths it judges the scrim with', () => {
    const fragments = descriptorFragments();
    expect(fragments[0]).toBe(PUBLIC_DESCRIPTOR.replace(/[.]$/, ''));
    expect(fragments.at(-1)?.split(' ')).toHaveLength(3);
    expect(fragments.every((fragment) => PUBLIC_DESCRIPTOR.startsWith(fragment))).toBe(
      true,
    );
    expect(PUBLIC_IDENTITY).toBe('Robot Wiki');
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 2);
    expect(contrastRatio([245, 246, 247], [245, 246, 247])).toBeCloseTo(1, 5);
    // The shipped scrim, against the shipped panel.
    expect(contrastRatio([105, 105, 106], [245, 246, 247])).toBeGreaterThanOrEqual(
      SCRIM_SEPARATION_FLOOR,
    );
  });
});
