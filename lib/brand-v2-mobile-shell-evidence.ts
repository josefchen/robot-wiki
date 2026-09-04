import { deriveEvidenceClosure } from './brand-v2-evidence-closure.ts';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from './identity.ts';

/**
 * Evidence for the two mobile shell assertions, `VAL-B2-ID-008` (the compact
 * header carries the wordmark and omits the descriptor) and
 * `VAL-B2-SHELL-004` (the drawer traps focus, closes on Escape, restores
 * focus to its trigger, and makes obscured content inert), and the
 * fail-closed reader that decides whether that evidence may grant a result.
 *
 * Neither is decidable from source. Whether the header omits the descriptor
 * is a fact about the leaf text a document rendered, not about which strings
 * a module imports: a descriptor can arrive through a shared lockup
 * component, a CSS `content` value or a paraphrase, and it can be present in
 * source and absent from the render. Whether the drawer traps focus is a
 * fact about where a real Tab and a real Shift+Tab put `document.activeElement`.
 * `inert` in particular cannot be read off a class list at all: it is an
 * attribute whose effect the browser computes, and the region that escapes a
 * drawer's inert set is usually the one that is not inside it.
 *
 * The measurement is therefore a mobile-viewport sweep of the built export
 * (`tests/e2e/brand-v2-mobile-shell.spec.ts`), persisted here. Every reader
 * below throws rather than degrade: a stale fingerprint, a missing route, an
 * empty page, a header the sweep never found, a drawer that never opened, or
 * a keyboard trace with no recorded destination all refuse the evidence
 * instead of returning a weaker claim.
 *
 * `VAL-B2-SHELL-002`'s current-route row stays desktop-scoped in
 * `lib/brand-v2-shell-evidence.ts`, because it is a claim about the shell
 * taxonomy and the sealed navigation baseline is a desktop reading. The
 * drawer's own current-route semantics are recorded here and asserted by the
 * sweep, so a drawer that stopped exposing the route fails the gate without
 * being folded into an assertion that does not name it.
 */
export const MOBILE_SHELL_EVIDENCE_PATH = 'evidence/brand-v2/mobile-shell.json';

/**
 * The one viewport this sweep covers: the mobile-header profile the identity
 * assertions already use, which is the widest width at which the compact
 * header and the drawer are the shell. Above `lg` neither renders.
 */
export const MOBILE_VIEWPORT = {
  id: '375x812',
  width: 375,
  height: 812,
} as const;

/** The exact lime the contract seals for the current-route mark. */
export const SELECTION_LIME_RGB = 'rgb(198, 255, 25)';

/**
 * How far the composited scrim has to sit from the panel it separates.
 *
 * Derived, not chosen: `VAL-DESIGN-020` requires the drawer to be separated
 * by its scrim rather than by a border, and the panel has no border, so the
 * scrim is carrying a boundary between two large adjacent areas on its own.
 * WCAG 1.4.11 sets 3:1 as the point at which a boundary between adjacent
 * areas is a visible boundary, so a scrim below that is not separating
 * anything. The paper-on-paper scrim this replaced measured 1.00:1.
 */
export const SCRIM_SEPARATION_FLOOR = 3;

/**
 * The background regions an open drawer must make inert, as a required set
 * rather than as whatever the sweep happened to look at.
 *
 * The reading this replaced iterated the rows the artifact supplied, so a
 * sweep that stopped querying `main`, the footer or the skip link recorded a
 * shorter list and the route passed on it. The set the assertion is about is
 * fixed: the shell's own regions plus the skip link, which lives outside the
 * content column and is therefore the one an inert-the-siblings
 * implementation misses. Both the sweep and the verdict quantify over this,
 * so they cannot disagree about what was supposed to be measured.
 */
export const REQUIRED_INERT_REGIONS = [
  { selector: 'header', id: 'header' },
  { selector: 'aside#sidebar-rail', id: 'the desktop sidebar' },
  { selector: 'main#main-content', id: 'main' },
  { selector: 'footer', id: 'the site footer' },
  { selector: 'a[href="#main-content"]', id: 'the skip link' },
] as const;

export type MobileLockupObservation = {
  tag: string;
  /** The rendered accessible text, normalised for whitespace. */
  text: string;
  href: string | null;
  tekturRole: string | null;
  fontFamilyHead: string;
  fontSizePx: number;
  fontWeight: number;
  /** Client rects the inline lockup produced; above one means it wrapped. */
  lineBoxes: number;
  widthPx: number;
  ariaCurrent: string | null;
};

export type MobileHeaderObservation = {
  /** Whether a compact header element exists in the document at all. */
  present: boolean;
  /** Its computed display, so a header hidden at mobile width cannot pass. */
  display: string;
  heightPx: number;
  /** The header's content box, so an overflowing lockup is not compact. */
  contentWidthPx: number;
  /**
   * Every leaf text the header renders, in DOM order, as rendered: with
   * `text-transform` applied and the leaf's own pseudo content included.
   */
  leafTexts: string[];
  /**
   * Text the header's pseudo-elements paint. The DOM stores none of it, so a
   * descriptor delivered through `::after { content: ... }` left every
   * `textContent` reading identical to a compliant header's.
   */
  pseudoTexts: Array<{ selector: string; position: string; text: string }>;
  lockups: MobileLockupObservation[];
  /** Header text carrying the locked descriptor or a leading run of it. */
  descriptorMatches: string[];
  trigger: {
    accessibleName: string;
    ariaExpanded: string | null;
    ariaControls: string | null;
  } | null;
};

export type DrawerTabStop = {
  tag: string;
  /** Accessible name or, for an unnamed control, its rendered text. */
  label: string;
};

export type DrawerFocusTrace = {
  focusOnOpen: DrawerTabStop | null;
  focusOnOpenInsideDrawer: boolean;
  /** Tab stops the drawer panel exposes on this route. */
  tabStopCount: number;
  first: DrawerTabStop | null;
  last: DrawerTabStop | null;
  /** A real Tab pressed while the last stop held focus. */
  forwardWrap: {
    focused: DrawerTabStop | null;
    insideDrawer: boolean;
    landedOnFirstStop: boolean;
  };
  /** A real Shift+Tab pressed while the first stop held focus. */
  backwardWrap: {
    focused: DrawerTabStop | null;
    insideDrawer: boolean;
    landedOnLastStop: boolean;
  };
};

export type DrawerInertObservation = {
  /** Each background region and whether the open drawer made it inert. */
  regions: Array<{ id: string; present: boolean; inert: boolean }>;
  /**
   * Tab stops outside the drawer panel that a keyboard could still reach,
   * which is what an incomplete inert set looks like from the outside.
   */
  reachableOutsideDrawer: string[];
};

export type DrawerDismissal = {
  /** How the drawer was dismissed: escape, close control, or scrim click. */
  via: 'escape' | 'close-control' | 'scrim';
  /** Whether the dialog left the document. */
  closed: boolean;
  /** What held focus afterwards. */
  focused: DrawerTabStop | null;
  /** Whether that is the trigger that opened it. */
  focusedTrigger: boolean;
};

export type DrawerSeparation = {
  scrimBackground: string;
  pageBackground: string;
  panelBackground: string;
  /** The browser's own composite of the scrim over the page ground. */
  scrimCompositedRgb: [number, number, number];
  panelRgb: [number, number, number];
  contrastRatio: number;
  /** Fraction of the viewport the scrim covers. */
  coverage: number;
  panelBorderLeftPx: number;
  panelBorderRightPx: number;
  panelBoxShadow: string;
};

export type DrawerCurrentRoute = {
  /** Whether the open drawer exposes a navigation entry for this route. */
  hasNavigationItem: boolean;
  /** aria-current nodes the drawer-open document exposes to assistive tech. */
  exposedAriaCurrent: Array<{
    tag: string;
    href: string | null;
    value: string | null;
    insideDrawer: boolean;
    accessibleName: string;
  }>;
  /** The matching entry's marker, when the route has one. */
  markerDeviceId: string | null;
  markerColour: string | null;
  markerAlignmentErrorPx: number | null;
};

export type MobileRouteObservation = {
  route: string;
  /** Length of the rendered text, so an empty page cannot pass. */
  visibleTextLength: number;
  header: MobileHeaderObservation;
  /** Tab stops the closed drawer exposes; a closed drawer exposes none. */
  closedDrawerTabStops: number;
  triggerExpandedWhenOpen: string | null;
  /**
   * Whether the trigger's `aria-controls` resolves once the drawer is open.
   * Read then rather than while it is closed: the drawer is unmounted when
   * closed, which is what makes it unreachable, so a closed-state resolution
   * check would fail the correct implementation.
   */
  triggerControlsResolvesWhenOpen: boolean;
  focus: DrawerFocusTrace;
  inert: DrawerInertObservation;
  dismissals: DrawerDismissal[];
  separation: DrawerSeparation;
  currentRoute: DrawerCurrentRoute;
};

export type MobileShellEvidence = {
  version: 1;
  fingerprint: string;
  viewport: string;
  routes: string[];
  observations: MobileRouteObservation[];
};

/**
 * The entry points the mobile shell evidence is about: the layout that
 * mounts the shell on every route, and the sweep that measures it.
 *
 * The closure of those two is the answer to "what can change this reading",
 * and it is derived rather than listed. The list this replaced named nine
 * files and missed both `lib/utils.ts`, which composes the class names the
 * drawer and header render, and the spec itself, so a class-merge change or
 * a rewritten measurement left the committed artifact looking current.
 */
export const MOBILE_SHELL_CLOSURE_ENTRIES = [
  'app/layout.tsx',
  'tests/e2e/brand-v2-mobile-shell.spec.ts',
] as const;

/**
 * The fingerprint the sweep records and the generator re-derives, over the
 * bytes of the whole mobile shell closure plus the registered geometry of
 * the rail device the drawer marks the current route with. Restyling the
 * drawer or loosening the trap without re-running the sweep is then a
 * stale-evidence failure rather than a silently preserved green row.
 */
export function mobileShellEvidenceFingerprint(input: {
  root: string;
  deviceRegistryRows: ReadonlyArray<{ id: string; fingerprint: string }>;
}): string {
  const devices = [...input.deviceRegistryRows]
    .filter(({ id }) => id.endsWith('rail'))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, fingerprint }) => `${id}:${fingerprint}`);
  if (devices.length === 0) {
    throw new Error(
      'the mobile shell fingerprint covers no rail device: the staleness check would miss a registry edit',
    );
  }
  return deriveEvidenceClosure({
    root: input.root,
    entries: MOBILE_SHELL_CLOSURE_ENTRIES,
    facts: devices,
  }).fingerprint;
}

/**
 * Accepts the persisted sweep only when it is the sweep this tree needs:
 * current fingerprint, the declared viewport, exactly the registered public
 * routes in both directions, a non-empty rendered page behind every
 * observation, a header the sweep actually found, a drawer that actually
 * opened with tab stops in it, all three dismissal paths exercised, and a
 * keyboard trace that recorded where focus went. Anything else throws.
 */
export function readMobileShellEvidence(input: {
  artifact: unknown;
  routes: string[];
  fingerprint: string;
}): MobileShellEvidence {
  const artifact = input.artifact as Partial<MobileShellEvidence>;
  if (!artifact || typeof artifact !== 'object') {
    throw new Error('mobile shell evidence is not an object');
  }
  if (artifact.version !== 1) {
    throw new Error(
      `mobile shell evidence version ${String(artifact.version)} is not 1`,
    );
  }
  if (artifact.fingerprint !== input.fingerprint) {
    throw new Error(
      'mobile shell evidence is stale: a mobile shell source or a rail device registration changed since the sweep ran. Re-run npm run refresh:brand-v2-evidence.',
    );
  }
  if (artifact.viewport !== MOBILE_VIEWPORT.id) {
    throw new Error(
      `mobile shell evidence was swept at ${String(artifact.viewport)}, not ${MOBILE_VIEWPORT.id}`,
    );
  }
  const expectedRoutes = [...input.routes].sort();
  if (expectedRoutes.length === 0) {
    throw new Error('mobile shell evidence route population is empty');
  }
  const recordedRoutes = [...(artifact.routes ?? [])].sort();
  if (JSON.stringify(recordedRoutes) !== JSON.stringify(expectedRoutes)) {
    throw new Error(
      `mobile shell evidence covers ${recordedRoutes.length} routes, not the ${expectedRoutes.length} registered public routes`,
    );
  }
  const observations = artifact.observations ?? [];
  const seen = new Set<string>();
  for (const observation of observations) {
    const { route } = observation;
    if (seen.has(route)) {
      throw new Error(`mobile shell evidence records ${route} twice`);
    }
    seen.add(route);
    if (observation.visibleTextLength <= 0) {
      throw new Error(
        `${route} recorded an empty rendered page, so nothing about it was measured`,
      );
    }
    if (!observation.header.present) {
      throw new Error(
        `${route} discovered no compact header, so the sweep did not measure what it claims`,
      );
    }
    if (!Array.isArray(observation.header.pseudoTexts)) {
      throw new Error(
        `${route} recorded no pseudo-element reading for the compact header, so a CSS-rendered descriptor was never looked for`,
      );
    }
    if (observation.focus.tabStopCount === 0) {
      throw new Error(
        `${route} recorded a drawer with no tab stops, so no focus trap was exercised on it`,
      );
    }
    if (
      observation.focus.forwardWrap.focused === null ||
      observation.focus.backwardWrap.focused === null
    ) {
      throw new Error(
        `${route} recorded a keyboard trace with no focus destination in one direction`,
      );
    }
    const paths = observation.dismissals.map(({ via }) => via).sort();
    if (
      JSON.stringify(paths) !==
      JSON.stringify(['close-control', 'escape', 'scrim'])
    ) {
      throw new Error(
        `${route} exercised ${paths.length} of the three drawer dismissal paths (${paths.join(', ') || 'none'})`,
      );
    }
  }
  const missing = expectedRoutes.filter((route) => !seen.has(route));
  if (missing.length > 0) {
    throw new Error(
      `mobile shell evidence is missing ${missing.length} route observations, starting with ${missing[0]}`,
    );
  }
  return artifact as MobileShellEvidence;
}

/**
 * The longest leading run of the locked descriptor that counts as the
 * descriptor arriving in the header. A header that renders the first four
 * words of it has rendered the descriptor as far as a reader is concerned,
 * so the check is not a byte-equality test that a truncation would pass.
 */
export function descriptorFragments(): string[] {
  const words = PUBLIC_DESCRIPTOR.replace(/[.]$/, '').split(/\s+/);
  const fragments: string[] = [];
  for (let length = words.length; length >= 3; length -= 1) {
    fragments.push(words.slice(0, length).join(' '));
  }
  return fragments;
}

export type MobileHeaderVerdict = {
  route: string;
  observation: MobileHeaderObservation;
  lockup: MobileLockupObservation | null;
  failures: string[];
};

/**
 * Decides `VAL-B2-ID-008` per route from what the sweep recorded.
 *
 * The compact header has to render, expose exactly one brand lockup whose
 * text is the locked identity byte for byte, set that lockup in the display
 * family on a single line inside the header's content box, and render no
 * descriptor: not the locked string, not a leading run of it, and no other
 * prose at all, because a header that renders a summary of the site has
 * rendered a descriptor whatever its wording.
 */
export function mobileHeaderVerdicts(
  evidence: MobileShellEvidence,
): Map<string, MobileHeaderVerdict> {
  const fragments = descriptorFragments();
  const verdicts = new Map<string, MobileHeaderVerdict>();
  for (const { route, header } of evidence.observations) {
    const failures: string[] = [];
    if (header.display === 'none') {
      failures.push(
        `${route} renders no compact header at ${MOBILE_VIEWPORT.id}`,
      );
    }
    if (header.lockups.length !== 1) {
      failures.push(
        `${route} renders ${header.lockups.length} brand lockups in the compact header, not exactly one`,
      );
    }
    const lockup = header.lockups[0] ?? null;
    if (lockup) {
      if (lockup.text !== PUBLIC_IDENTITY) {
        failures.push(
          `${route} renders "${lockup.text}" in the compact header, not \`${PUBLIC_IDENTITY}\``,
        );
      }
      if (lockup.tekturRole === null) {
        failures.push(
          `${route} renders the compact wordmark without a registered display role`,
        );
      }
      if (!/tektur/i.test(lockup.fontFamilyHead)) {
        failures.push(
          `${route} sets the compact wordmark in ${lockup.fontFamilyHead}, not Tektur`,
        );
      }
      if (lockup.lineBoxes !== 1) {
        failures.push(
          `${route} wraps the compact wordmark across ${lockup.lineBoxes} line boxes`,
        );
      }
      if (lockup.widthPx > header.contentWidthPx) {
        failures.push(
          `${route} renders a ${lockup.widthPx}px wordmark in a ${header.contentWidthPx}px header content box`,
        );
      }
    }
    for (const text of header.leafTexts) {
      if (text === PUBLIC_IDENTITY) continue;
      const fragment = fragments.find((candidate) => text.includes(candidate));
      failures.push(
        fragment
          ? `${route} renders "${fragment}" in the compact header, which is the locked descriptor`
          : `${route} renders "${text}" in the compact header, which is neither the identity nor a control label`,
      );
    }
    for (const match of header.descriptorMatches) {
      failures.push(`${route} carries descriptor text in the header: ${match}`);
    }
    for (const pseudo of header.pseudoTexts ?? []) {
      const fragment = fragments.find((candidate) =>
        pseudo.text.includes(candidate),
      );
      if (fragment) {
        failures.push(
          `${route} renders "${fragment}" through ${pseudo.selector}${pseudo.position} in the compact header, which is the locked descriptor`,
        );
        continue;
      }
      // A word is prose; a decorative glyph or rule is not, and the header
      // is allowed generated punctuation that says nothing.
      if (/[A-Za-z]{3}/.test(pseudo.text)) {
        failures.push(
          `${route} renders "${pseudo.text}" through ${pseudo.selector}${pseudo.position} in the compact header, which the document stores nowhere`,
        );
      }
    }
    if (header.trigger === null) {
      failures.push(
        `${route} renders a compact header with no drawer trigger, so the taxonomy has no mobile entry point`,
      );
    } else {
      if (header.trigger.accessibleName.length === 0) {
        failures.push(`${route} renders an unnamed drawer trigger`);
      }
      if (header.trigger.ariaExpanded !== 'false') {
        failures.push(
          `${route} reports aria-expanded=${String(header.trigger.ariaExpanded)} on a trigger whose drawer is closed`,
        );
      }
    }
    verdicts.set(route, { route, observation: header, lockup, failures });
  }
  return verdicts;
}

export type DrawerVerdict = {
  route: string;
  observation: MobileRouteObservation;
  failures: string[];
};

/** Relative luminance of an sRGB triple, per WCAG 2.x. */
export function relativeLuminance(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two sRGB triples, per WCAG 2.x. */
export function contrastRatio(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  const a = relativeLuminance(left);
  const b = relativeLuminance(right);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Decides `VAL-B2-SHELL-004` per route from what the sweep recorded.
 *
 * Four clauses, each from a real interaction rather than from an attribute
 * the source sets. The trap is two keyboard presses whose destination has to
 * be the opposite edge of the drawer and inside it, in both directions,
 * because wrapping one way is not a trap. Escape has to detach the dialog.
 * All three dismissal paths have to put focus back on the trigger, since a
 * drawer that restores focus only from Escape strands the pointer and the
 * scrim user. And the inert set has to cover every background region plus
 * the skip link, which is the region that is not inside the shell's content
 * column and so is the one an inert-the-siblings implementation misses.
 */
export function drawerVerdicts(
  evidence: MobileShellEvidence,
): Map<string, DrawerVerdict> {
  const verdicts = new Map<string, DrawerVerdict>();
  for (const observation of evidence.observations) {
    const { route, focus, inert, dismissals, separation } = observation;
    const failures: string[] = [];
    if (observation.closedDrawerTabStops !== 0) {
      failures.push(
        `${route} leaves ${observation.closedDrawerTabStops} drawer tab stop(s) reachable while the drawer is closed`,
      );
    }
    if (observation.triggerExpandedWhenOpen !== 'true') {
      failures.push(
        `${route} reports aria-expanded=${String(observation.triggerExpandedWhenOpen)} on the trigger while the drawer is open`,
      );
    }
    if (!observation.triggerControlsResolvesWhenOpen) {
      failures.push(
        `${route} points the trigger's aria-controls at an element the open drawer does not produce`,
      );
    }
    if (!focus.focusOnOpenInsideDrawer) {
      failures.push(
        `${route} opens the drawer with focus on ${focus.focusOnOpen?.label ?? 'nothing'}, outside it`,
      );
    }
    if (
      !focus.forwardWrap.insideDrawer ||
      !focus.forwardWrap.landedOnFirstStop
    ) {
      failures.push(
        `${route} sends a Tab off the last drawer stop to ${focus.forwardWrap.focused?.label ?? 'nothing'}${focus.forwardWrap.insideDrawer ? '' : ', outside the drawer'}`,
      );
    }
    if (
      !focus.backwardWrap.insideDrawer ||
      !focus.backwardWrap.landedOnLastStop
    ) {
      failures.push(
        `${route} sends a Shift+Tab off the first drawer stop to ${focus.backwardWrap.focused?.label ?? 'nothing'}${focus.backwardWrap.insideDrawer ? '' : ', outside the drawer'}`,
      );
    }
    // Quantified over the required set, not over the rows the artifact
    // supplied: a sweep that stopped looking at a region used to contribute
    // no row, and a shorter list read as a clean one.
    const observedRegions = new Map(
      inert.regions.map((region) => [region.id, region]),
    );
    for (const required of REQUIRED_INERT_REGIONS) {
      const region = observedRegions.get(required.id);
      if (!region) {
        failures.push(
          `${route} recorded no reading for ${required.id} (${required.selector}), so the open drawer's inert set was never checked against it`,
        );
        continue;
      }
      if (!region.present) {
        failures.push(
          `${route} renders no ${required.id} (${required.selector}) to make inert`,
        );
        continue;
      }
      if (!region.inert) {
        failures.push(
          `${route} leaves ${region.id} outside the open drawer's inert set`,
        );
      }
    }
    const requiredIds = new Set<string>(
      REQUIRED_INERT_REGIONS.map(({ id }) => id),
    );
    for (const region of inert.regions) {
      if (!requiredIds.has(region.id)) {
        failures.push(
          `${route} records ${region.id}, which is not one of the required background regions`,
        );
      }
    }
    if (inert.reachableOutsideDrawer.length > 0) {
      failures.push(
        `${route} leaves ${inert.reachableOutsideDrawer.length} tab stop(s) reachable behind the drawer, starting with ${inert.reachableOutsideDrawer[0]}`,
      );
    }
    for (const dismissal of dismissals) {
      if (!dismissal.closed) {
        failures.push(`${route} does not close the drawer on ${dismissal.via}`);
        continue;
      }
      if (!dismissal.focusedTrigger) {
        failures.push(
          `${route} leaves focus on ${dismissal.focused?.label ?? 'nothing'} after closing via ${dismissal.via}, not on the trigger`,
        );
      }
    }
    // Not part of the assertion's four clauses, but a drawer that is not
    // visually separated from the page it occludes is not a modal surface,
    // and this is the reading VAL-DESIGN-020 is decided on.
    if (separation.contrastRatio < SCRIM_SEPARATION_FLOOR) {
      failures.push(
        `${route} composites the scrim to ${separation.contrastRatio.toFixed(2)}:1 against the panel, below the ${SCRIM_SEPARATION_FLOOR}:1 a boundary needs to be visible`,
      );
    }
    if (
      separation.panelBorderLeftPx !== 0 ||
      separation.panelBorderRightPx !== 0
    ) {
      failures.push(
        `${route} puts a ${separation.panelBorderLeftPx}px/${separation.panelBorderRightPx}px side border on the drawer panel as well as the scrim`,
      );
    }
    verdicts.set(route, { route, observation, failures });
  }
  return verdicts;
}
