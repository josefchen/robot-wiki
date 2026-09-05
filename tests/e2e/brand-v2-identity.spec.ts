import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from '@playwright/test';
import { brandV2Registry, test, expect } from './brand-v2-static-fixture';
import {
  IDENTITY_REQUIRED_STATES,
  IDENTITY_RUNTIME_EVIDENCE_PATH,
  IDENTITY_VIEWPORTS,
  deriveTechnicalIdentifierExportWitnesses,
  identityEvidenceFingerprint,
  readIdentityRuntimeEvidence,
  sealedTechnicalIdentifiers,
  type IdentityRouteObservation,
  type IdentityStateObservation,
} from '../../lib/brand-v2-identity-evidence';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';
import {
  expectedIdentitySlots,
  identityLockupSourcePaths,
} from '../../lib/identity-populations';
import { installRenderedTextProbe } from './rendered-text-probe';

const ROOT = process.cwd();

/**
 * The sources whose bytes decide what an identity or metadata surface
 * renders, derived from the registry rather than listed: every metadata
 * owner plus the two modules that render a lockup. Editing any of them
 * without re-running this sweep makes the persisted evidence stale, and the
 * enforcement generator refuses it.
 */
const METADATA_OWNER_PATHS = [
  ...new Set(
    (
      brandV2Registry as unknown as {
        metadata: Array<{ ownerPath: string }>;
      }
    ).metadata.map(({ ownerPath }) => ownerPath),
  ),
].sort();
const LOCKUP_SOURCE_PATHS = identityLockupSourcePaths();
/** The `VAL-B2-ID-004` population, read from the contract row it belongs to. */
const TECHNICAL_IDENTIFIERS = sealedTechnicalIdentifiers(ROOT);

/**
 * Runs inside the page, and discovers identity slots from two independent
 * directions because either one alone is escapable.
 *
 * **Registration.** Every element carrying a wordmark role is recorded with
 * whatever text it holds. The annotation is written by the module, not by
 * the copy, so a lockup renamed to something absurd is still a member and is
 * then failed on its text. The reading this replaces started from the
 * `robot wiki` spelling family alone, which made the population a function
 * of the string under test: rename the shell wordmark and it left the set,
 * taking its own failure with it.
 *
 * **Spelling family.** It also walks every rendered element and keeps the
 * deepest ones whose whole text is any spelling in that family, so a v1
 * lockup that carries no annotation is found rather than skipped.
 *
 * **Structure.** Both of those still start from something the slot itself
 * supplies, and the union of them has one hole: a slot that carries no role
 * *and* renders a name outside the family is in neither. It does not stop
 * being a brand slot, because what makes it one is where the shell put it.
 * So a third population is derived from position and shape alone: links to
 * the site root inside the chrome landmarks the shell renders outside
 * `main`, leaves set in the display family inside those same landmarks, and
 * the `h1` of the site root. Each of those positions is owed both a
 * registered wordmark role and the exact locked name, and neither
 * requirement can be satisfied by removing the slot from the population.
 *
 * Both the discovery filter and the recorded text are the *rendered* string
 * (`installRenderedTextProbe`), not `textContent`. A `text-transform:
 * lowercase` on the wordmark restores the v1 spelling on screen while the
 * DOM still stores `Robot Wiki`, and none of the forbidden-spelling scans
 * see it either, because `robot wiki` with a space is not `robot-wiki`.
 * Reading stored text is reading the source, which is the one thing this
 * sweep exists not to do.
 */
function collectIdentity(
  descriptor: string,
): Omit<IdentityRouteObservation, 'route' | 'viewport'> {
  const BRAND_FAMILY = /^robot[\s\-_]*wiki$/i;
  const V1_DESCRIPTOR = /robotics\s+encyclopa?edia/i;
  const TECHNICAL_AS_DISPLAY = /robot-wiki(?!\.com|\.png|\/)/;
  // The registered display family, matched on the resolved head of the
  // stack rather than on a class name: `next/font/local` publishes the
  // sealed `Tektur Variable` face under the runtime family `tektur`, and a
  // class list says nothing about what the cascade actually resolved.
  const DISPLAY_FAMILY = /tektur/i;
  // The shell's chrome landmarks: everything it renders outside `main`.
  // `[role="dialog"]` is the mobile drawer, which is chrome that only exists
  // while it is open.
  const CHROME_LANDMARKS = 'header, footer, aside, nav, [role="dialog"]';

  // Written without a regex character class over quote marks: the repo's
  // test-target inventory tokenizes this file, and a quote inside a regex
  // literal desynchronizes it, which would hide this test's title from the
  // enforcement rows that name it.
  const unquote = (value: string): string =>
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
      ? value.slice(1, -1)
      : value;

  const visible = (el: Element): boolean =>
    typeof (el as HTMLElement).checkVisibility === 'function'
      ? (el as HTMLElement).checkVisibility({
          contentVisibilityAuto: true,
          opacityProperty: true,
          visibilityProperty: true,
        })
      : el.getBoundingClientRect().height > 0;

  const selectorOf = (el: Element): string => {
    const role = el.getAttribute('data-tektur-role');
    const id = el.id ? `#${el.id}` : '';
    return `${el.tagName.toLowerCase()}${id}${role ? `[data-tektur-role="${role}"]` : ''}`;
  };

  const renderedText = (el: Element): string =>
    window.__brandRenderedText?.(el) ?? (el.textContent ?? '').trim();
  const domText = (el: Element): string =>
    window.__brandDomText?.(el) ?? (el.textContent ?? '').trim();
  const pseudoText = (el: Element): { before: string; after: string } =>
    window.__brandPseudoText?.(el) ?? { before: '', after: '' };

  const all = Array.from(document.querySelectorAll('*'));
  // Pseudo text is one style read per element; `innerText` costs a layout of
  // the whole subtree, so the cheap reading narrows the set the expensive
  // one is asked about. An element whose stored text is empty but whose
  // `::before` renders the wordmark is still in the candidate set.
  const nameCandidates = all.filter((el) => {
    if (!visible(el)) return false;
    const stored = domText(el);
    if (BRAND_FAMILY.test(stored)) return true;
    const pseudo = pseudoText(el);
    if (!pseudo.before && !pseudo.after) return false;
    return BRAND_FAMILY.test(`${pseudo.before}${stored}${pseudo.after}`.trim());
  });
  // Keep only the deepest match in each chain: a wrapper whose sole child is
  // the wordmark carries the same text and is not a second lockup.
  const lockupElements = nameCandidates.filter(
    (el) => !nameCandidates.some((other) => other !== el && el.contains(other)),
  );

  const brandDisplayTexts = lockupElements.map((el) => {
    const style = getComputedStyle(el);
    const container = el.parentElement ?? el;
    const descriptorTexts = Array.from(container.children)
      .filter((child) => child !== el && visible(child))
      .map((child) => renderedText(child))
      .filter((text) => text.length > 0);
    return {
      role: el.getAttribute('data-tektur-role'),
      selector: selectorOf(el),
      text: renderedText(el),
      domText: domText(el),
      pseudoText: pseudoText(el),
      fontFamilyHead: unquote((style.fontFamily.split(',')[0] ?? '').trim()),
      fontVariationSettings: style.fontVariationSettings,
      textTransform: style.textTransform,
      symbolChildren: Array.from(el.querySelectorAll('img, svg, picture, canvas')).map(
        (child) => child.tagName.toLowerCase(),
      ),
      descriptorTexts,
    };
  });

  // Independent of text: found by the annotation the module writes, and
  // recorded whatever it says. Hidden slots are kept with `visible: false`
  // rather than dropped, so a slot that stopped painting is distinguishable
  // from one that was never registered.
  const wordmarkRoleSlots = Array.from(
    document.querySelectorAll('[data-tektur-role$="wordmark"]'),
  ).map((el) => {
    const style = getComputedStyle(el);
    return {
      role: el.getAttribute('data-tektur-role') ?? '',
      selector: selectorOf(el),
      text: renderedText(el),
      domText: domText(el),
      pseudoText: pseudoText(el),
      fontFamilyHead: unquote((style.fontFamily.split(',')[0] ?? '').trim()),
      textTransform: style.textTransform,
      visible: visible(el),
    };
  });

  // Derived from position and shape, with neither the annotation nor the
  // text consulted. A candidate is a brand slot because of where the shell
  // renders it, so removing its role or changing its name cannot remove it
  // from this list.
  const chromeLandmarks = Array.from(
    document.querySelectorAll(CHROME_LANDMARKS),
  ).filter(
    (landmark) => !landmark.closest('main') && visible(landmark),
  );
  const landmarkName = (landmark: Element): string => {
    const tag = landmark.tagName.toLowerCase();
    return landmark.id ? `${tag}#${landmark.id}` : tag;
  };
  const structuralCandidates: Array<{
    origin: 'chrome-home-link' | 'chrome-display-lockup' | 'root-hero-heading';
    landmark: string;
    element: Element;
  }> = [];
  for (const landmark of chromeLandmarks) {
    // The lockup is the navigation entry for "/", so every one of the
    // shell's three lockups is a link whose href is the site root. Read off
    // the attribute rather than the resolved URL, because the skip link
    // resolves to the current pathname and would join this set on home.
    for (const anchor of Array.from(landmark.querySelectorAll('a[href]'))) {
      if (anchor.getAttribute('href') !== '/') continue;
      if (!visible(anchor)) continue;
      structuralCandidates.push({
        origin: 'chrome-home-link',
        landmark: landmarkName(landmark),
        element: anchor,
      });
    }
    // Display type outside `main` is a lockup: chrome is not where headings
    // live. Deepest match only, so the container of a lockup is not counted
    // as a second one.
    const displayElements = Array.from(landmark.querySelectorAll('*')).filter(
      (el) =>
        visible(el) &&
        DISPLAY_FAMILY.test(getComputedStyle(el).fontFamily) &&
        renderedText(el).length > 0,
    );
    for (const el of displayElements) {
      if (displayElements.some((other) => other !== el && el.contains(other))) {
        continue;
      }
      structuralCandidates.push({
        origin: 'chrome-display-lockup',
        landmark: landmarkName(landmark),
        element: el,
      });
    }
  }
  if (window.location.pathname === '/') {
    // VAL-B2-ID-007: the home hero's h1 is the dominant lockup, so the site
    // root's own top-level heading is a brand slot by position.
    for (const heading of Array.from(
      document.querySelectorAll('main h1'),
    ).filter((el) => visible(el))) {
      structuralCandidates.push({
        origin: 'root-hero-heading',
        landmark: 'main',
        element: heading,
      });
    }
  }
  const seenStructural = new Set<Element>();
  const structuralBrandSlots = structuralCandidates
    .filter(({ element }) => {
      if (seenStructural.has(element)) return false;
      seenStructural.add(element);
      return true;
    })
    .map(({ origin, landmark, element }) => {
      const style = getComputedStyle(element);
      return {
        origin,
        landmark,
        selector: selectorOf(element),
        role: element.getAttribute('data-tektur-role'),
        text: renderedText(element),
        domText: domText(element),
        pseudoText: pseudoText(element),
        fontFamilyHead: unquote((style.fontFamily.split(',')[0] ?? '').trim()),
        textTransform: style.textTransform,
      };
    });

  const bodyText = (document.body as HTMLElement).innerText ?? '';
  const descriptorCandidates = all.filter((el) => {
    if (!visible(el)) return false;
    const stored = domText(el);
    if (stored === descriptor) return true;
    const pseudo = pseudoText(el);
    if (!pseudo.before && !pseudo.after) return false;
    return `${pseudo.before}${stored}${pseudo.after}`.trim() === descriptor;
  });
  const exactDescriptorNodes = descriptorCandidates
    .filter(
      (el) =>
        renderedText(el) === descriptor &&
        !descriptorCandidates.some(
          (other) =>
            other !== el && el.contains(other) && renderedText(other) === descriptor,
        ),
    )
    .map(selectorOf);

  const meta = (selector: string): string | null =>
    document.querySelector(selector)?.getAttribute('content') ?? null;
  const linkHref = (selector: string): string | null =>
    document.querySelector(selector)?.getAttribute('href') ?? null;

  return {
    wordmarkRoleSlots,
    brandDisplayTexts,
    structuralBrandSlots,
    exactDescriptorNodes,
    v1DescriptorMatches: bodyText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => V1_DESCRIPTOR.test(line)),
    technicalIdentifierVisibleMatches: bodyText
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          TECHNICAL_AS_DISPLAY.test(line) ||
          line.includes('ROBOT WIKI') ||
          line.includes('Robot-Wiki'),
      ),
    iconDeclarations: Array.from(
      document.querySelectorAll(
        'link[rel~="icon"], link[rel~="apple-touch-icon"], link[rel~="mask-icon"], link[rel~="manifest"]',
      ),
    ).map((el) => `${el.getAttribute('rel')}=${el.getAttribute('href')}`),
    symbolNodesInLockups: brandDisplayTexts.flatMap(({ selector, symbolChildren }) =>
      symbolChildren.map((tag) => `${selector} > ${tag}`),
    ),
    metadata: {
      title: document.title,
      description: meta('meta[name="description"]'),
      ogSiteName: meta('meta[property="og:site_name"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogImageAlt: meta('meta[property="og:image:alt"]'),
      ogImage: meta('meta[property="og:image"]'),
      twitterTitle: meta('meta[name="twitter:title"]'),
      twitterDescription: meta('meta[name="twitter:description"]'),
      canonical: linkHref('link[rel="canonical"]'),
    },
    repositoryHref: linkHref('footer a[href*="github.com"]'),
    authorProfileHref:
      Array.from(document.querySelectorAll('footer a[href*="github.com"]'))
        .map((el) => el.getAttribute('href'))
        .find((href) => href !== null && !href.includes('robot-wiki')) ?? null,
    visibleTextLength: bodyText.trim().length,
  };
}

/** Rendered values of visible form controls, which `innerText` never sees. */
function collectControlValues(): Array<{ selector: string; value: string }> {
  return Array.from(
    document.querySelectorAll('input, textarea, select'),
  )
    .filter((el) => {
      const control = el as HTMLElement;
      return typeof control.checkVisibility === 'function'
        ? control.checkVisibility({
            contentVisibilityAuto: true,
            opacityProperty: true,
            visibilityProperty: true,
          })
        : control.getBoundingClientRect().height > 0;
    })
    .map((el) => {
      const control = el as HTMLInputElement | HTMLTextAreaElement;
      const testId = control.getAttribute('data-testid');
      return {
        selector: `${control.tagName.toLowerCase()}${testId ? `[data-testid="${testId}"]` : ''}`,
        value: control.value ?? '',
      };
    })
    .filter(({ value }) => value.length > 0);
}

/**
 * Visits each state in `IDENTITY_REQUIRED_STATES` and reads it with exactly
 * the reading the route grid uses, plus the control values.
 *
 * The two states are provoked, not simulated. WebGL unavailability is a real
 * refusal installed before any script runs, and the trajectory export state
 * is produced by pressing the instrument's own controls, so what is recorded
 * is what a reader in that situation meets.
 */
async function sweepRequiredStates(
  page: Page,
  staticBase: string,
): Promise<IdentityStateObservation[]> {
  const observations: IdentityStateObservation[] = [];
  const viewport = IDENTITY_VIEWPORTS[0];
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });

  for (const required of IDENTITY_REQUIRED_STATES) {
    const context = await page.context().browser()?.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    if (!context) throw new Error('no browser to open the state pass in');
    const statePage = await context.newPage();
    await statePage.addInitScript(installRenderedTextProbe);
    if (required.state === 'webgl-unavailable-fallback') {
      // A real refusal rather than a stubbed component: every context
      // request the playground makes returns null, so the page takes the
      // same branch a reader with a blocked GPU driver gets.
      await statePage.addInitScript(() => {
        HTMLCanvasElement.prototype.getContext = () => null;
      });
    }
    const response = await statePage.goto(`${staticBase}${required.route}`);
    expect(response?.status(), required.state).toBe(200);
    await statePage.evaluate(() => document.fonts.ready);

    if (required.state === 'trajectory-export-format-discriminator') {
      await statePage.getByTestId('trajectory-record').click();
      await statePage.getByTestId('trajectory-add').click();
      await expect(statePage.getByTestId('trajectory-count')).toHaveText(
        /keyframe/,
      );
      await statePage.getByTestId('trajectory-export').click();
      await expect(
        statePage.getByTestId('trajectory-export-json'),
      ).toBeVisible();
    }
    if (required.state === 'webgl-unavailable-fallback') {
      await expect(
        statePage.getByText('WebGL is not available'),
      ).toBeVisible();
    }

    const collected = await statePage.evaluate(
      collectIdentity,
      PUBLIC_DESCRIPTOR,
    );
    const controlValues = await statePage.evaluate(collectControlValues);
    const renderedText = await statePage.evaluate(
      () => (document.body as HTMLElement).innerText ?? '',
    );
    observations.push({
      ...collected,
      route: required.route,
      viewport: viewport.id,
      state: required.state,
      provokedBy: required.provokedBy,
      renderedText,
      controlValues,
    });
    await context.close();
  }
  return observations;
}

test.describe('brand-v2 public identity', () => {
  /**
   * The one place the identity claims are measured. It is persisted because
   * the enforcement generator has no other way to know what a document
   * rendered: a generator that re-read the constants would be comparing
   * PUBLIC_IDENTITY with itself, which is the tautology the token and Tektur
   * evidence readers already exist to prevent.
   */
  test('every public route renders the exact v2 identity at both identity viewports', async ({
    page,
    staticBase,
  }) => {
    test.setTimeout(1_800_000);
    const routes = brandV2Registry.routes.public.map(({ path }) => path);
    expect(routes.length).toBeGreaterThan(5);
    // Derived from the used-import graph before the browser opens, so the
    // population the sweep is held to is not the population it found.
    const expectedSlots = expectedIdentitySlots(routes, { root: ROOT });
    expect(expectedSlots).toHaveLength(routes.length);
    await page.addInitScript(installRenderedTextProbe);

    const observations: IdentityRouteObservation[] = [];
    for (const viewport of IDENTITY_VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of routes) {
        const response = await page.goto(`${staticBase}${route}`);
        expect(response?.status(), `${route} @ ${viewport.id}`).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        const collected = await page.evaluate(
          collectIdentity,
          PUBLIC_DESCRIPTOR,
        );
        observations.push({ ...collected, route, viewport: viewport.id });
      }
    }

    const stateObservations = await sweepRequiredStates(page, staticBase);

    // Enforced here as well as in the generator, so a red identity surface
    // fails the suite that measured it rather than only the artifact check.
    const expectedByRoute = new Map(
      expectedSlots.map(({ route, roles }) => [route, roles]),
    );
    // Registration first: a slot that stopped rendering, and a slot that
    // renders something else, are both failures of the same population.
    const missingSlots = observations.flatMap(
      ({ route, viewport, wordmarkRoleSlots }) =>
        (expectedByRoute.get(route) ?? [])
          .filter(
            (role) =>
              !wordmarkRoleSlots.some(
                (slot) => slot.visible && slot.role === role,
              ),
          )
          .map((role) => `${route} @ ${viewport}: no ${role} slot painted`),
    );
    expect(missingSlots).toEqual([]);
    const renamedSlots = observations.flatMap(
      ({ route, viewport, wordmarkRoleSlots }) =>
        wordmarkRoleSlots
          .filter(({ visible, text }) => visible && text !== PUBLIC_IDENTITY)
          .map(
            ({ role, text }) =>
              `${route} @ ${viewport}: ${role} renders "${text}"`,
          ),
    );
    expect(renamedSlots).toEqual([]);
    const wrongNames = observations.flatMap(({ route, viewport, brandDisplayTexts }) =>
      brandDisplayTexts
        .filter(({ text }) => text !== PUBLIC_IDENTITY)
        .map(({ selector, text }) => `${route} @ ${viewport}: ${selector} renders "${text}"`),
    );
    expect(wrongNames).toEqual([]);
    // A lockup the reader meets as `Robot Wiki` only because a stylesheet
    // put it there is a compliant render over a non-compliant document.
    const cssSubstituted = observations.flatMap(({ route, viewport, brandDisplayTexts }) =>
      brandDisplayTexts
        .filter(({ text, domText }) => text === PUBLIC_IDENTITY && domText !== PUBLIC_IDENTITY)
        .map(
          ({ selector, domText }) =>
            `${route} @ ${viewport}: ${selector} renders the identity from CSS while the document stores "${domText}"`,
        ),
    );
    expect(cssSubstituted).toEqual([]);
    const unannotated = observations.flatMap(({ route, viewport, brandDisplayTexts }) =>
      brandDisplayTexts
        .filter(({ role }) => !role?.endsWith('wordmark'))
        .map(({ selector }) => `${route} @ ${viewport}: ${selector} carries no wordmark role`),
    );
    expect(unannotated).toEqual([]);
    // Structure closes the hole the two populations above share. Every route
    // renders the shell's chrome, so every route produces slots here, and
    // each of them owes both an annotation and the exact name. The two
    // requirements are checked separately: a slot that is unannotated fails
    // as unannotated even when it renders correctly, which is what a lockup
    // that is stripped *and* renamed can no longer walk between.
    const structurallyBare = observations.filter(
      ({ structuralBrandSlots }) => structuralBrandSlots.length === 0,
    );
    expect(
      structurallyBare.map(({ route, viewport }) => `${route} @ ${viewport}`),
      'routes whose structure produced no brand slot',
    ).toEqual([]);
    const unannotatedStructural = observations.flatMap(
      ({ route, viewport, structuralBrandSlots }) =>
        structuralBrandSlots
          .filter(({ role }) => !role?.endsWith('wordmark'))
          .map(
            ({ selector, origin, landmark }) =>
              `${route} @ ${viewport}: ${selector} is a ${origin} in ${landmark} carrying no wordmark role`,
          ),
    );
    expect(unannotatedStructural).toEqual([]);
    const misnamedStructural = observations.flatMap(
      ({ route, viewport, structuralBrandSlots }) =>
        structuralBrandSlots
          .filter(({ text }) => text !== PUBLIC_IDENTITY)
          .map(
            ({ selector, origin, text }) =>
              `${route} @ ${viewport}: ${selector} is a ${origin} rendering "${text}"`,
          ),
    );
    expect(misnamedStructural).toEqual([]);
    // The provoked states go through the same residue scans as the default
    // renders. That is the point of exercising them rather than listing
    // them: a legacy public string in the WebGL fallback now fails here.
    const swept = [...observations, ...stateObservations];
    const v1Residue = swept.flatMap(({ route, viewport, v1DescriptorMatches, technicalIdentifierVisibleMatches }) =>
      [...v1DescriptorMatches, ...technicalIdentifierVisibleMatches].map(
        (line) => `${route} @ ${viewport}: ${line}`,
      ),
    );
    expect(v1Residue).toEqual([]);
    const symbols = swept.flatMap(({ route, symbolNodesInLockups, iconDeclarations }) =>
      [...symbolNodesInLockups, ...iconDeclarations].map((entry) => `${route}: ${entry}`),
    );
    expect(symbols).toEqual([]);
    const stateNames = stateObservations.flatMap(({ state, wordmarkRoleSlots }) =>
      wordmarkRoleSlots
        .filter(({ visible, text }) => visible && text !== PUBLIC_IDENTITY)
        .map(({ role, text }) => `${state}: ${role} renders "${text}"`),
    );
    expect(stateNames).toEqual([]);
    // The home hero carries the descriptor exactly once (VAL-B2-ID-007), and
    // the shell repeats the wordmark without it (design-system 3.5).
    for (const observation of observations.filter(({ route }) => route === '/')) {
      expect(
        observation.exactDescriptorNodes,
        `/ @ ${observation.viewport} descriptor lockup`,
      ).toHaveLength(1);
    }

    const artifact = {
      version: 1 as const,
      fingerprint: identityEvidenceFingerprint({
        root: ROOT,
        metadataOwnerPaths: METADATA_OWNER_PATHS,
        lockupSourcePaths: LOCKUP_SOURCE_PATHS,
      }),
      identity: PUBLIC_IDENTITY,
      descriptor: PUBLIC_DESCRIPTOR,
      routes,
      viewports: IDENTITY_VIEWPORTS.map(({ id }) => id),
      observations,
      stateObservations,
      // The second population behind VAL-B2-ID-004, measured off the shipped
      // bytes rather than the sources the generator already scans, so the
      // row reconciles two independent readings and an identifier with no
      // surviving shipped use cannot report as a preserved technical one.
      technicalIdentifierWitnesses: deriveTechnicalIdentifierExportWitnesses(
        join(ROOT, 'out'),
        TECHNICAL_IDENTIFIERS,
      ),
    };
    const emptyWitnesses = artifact.technicalIdentifierWitnesses.filter(
      ({ fileCount }) => fileCount === 0,
    );
    expect(
      emptyWitnesses.map(({ literal }) => literal),
      'sealed technical identifiers with no surviving use in the built export',
    ).toEqual([]);
    const artifactPath = join(ROOT, IDENTITY_RUNTIME_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    // Fails here rather than in the generator if the artifact this run just
    // wrote would not satisfy the reader that has to accept it.
    readIdentityRuntimeEvidence({
      artifact,
      routes,
      fingerprint: artifact.fingerprint,
      technicalIdentifiers: TECHNICAL_IDENTIFIERS,
      expectedSlots,
    });
  });

  /**
   * The plant for the reading this sweep used to do. `text-transform:
   * lowercase` renders the superseded v1 wordmark while the document still
   * stores `Robot Wiki`, and no forbidden-spelling scan sees it either:
   * `robot wiki` carries a space, not the hyphen those patterns look for.
   * Against `textContent` this page was indistinguishable from a compliant
   * one.
   */
  test('reports a wordmark that CSS rewrites, which the stored text hides', async ({
    page,
    staticBase,
  }) => {
    await page.addInitScript(installRenderedTextProbe);
    const response = await page.goto(`${staticBase}/`);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);

    const clean = await page.evaluate(collectIdentity, PUBLIC_DESCRIPTOR);
    expect(clean.brandDisplayTexts.length).toBeGreaterThan(0);
    expect(
      [...new Set(clean.brandDisplayTexts.map(({ text }) => text))],
      'the shipped page renders only the locked identity',
    ).toEqual([PUBLIC_IDENTITY]);

    await page.addStyleTag({
      content: '[data-tektur-role$="wordmark"] { text-transform: lowercase; }',
    });
    const planted = await page.evaluate(collectIdentity, PUBLIC_DESCRIPTOR);
    // The plant has to actually change the render, or the case proves nothing.
    expect(planted.brandDisplayTexts.map(({ text }) => text)).toContain(
      'robot wiki',
    );
    for (const lockup of planted.brandDisplayTexts) {
      expect(lockup.domText, lockup.selector).toBe(PUBLIC_IDENTITY);
    }
    expect(
      planted.brandDisplayTexts.filter(({ text }) => text !== PUBLIC_IDENTITY),
      'a stored-text reading would have found nothing wrong here',
    ).not.toHaveLength(0);
    // And the residue scans this sweep already had stay silent on it, which
    // is why the rendered reading is the fix rather than another pattern.
    expect(planted.technicalIdentifierVisibleMatches).toEqual([]);
    expect(planted.v1DescriptorMatches).toEqual([]);
  });

  /**
   * The other half of the same hole: `::after` renders text the DOM stores
   * nowhere, so a punctuation variant of the wordmark left every reading
   * that consulted `textContent` unchanged.
   */
  test('reports a wordmark a pseudo-element extends, which the DOM stores nowhere', async ({
    page,
    staticBase,
  }) => {
    await page.addInitScript(installRenderedTextProbe);
    const response = await page.goto(`${staticBase}/`);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        '[data-tektur-role$="wordmark"]::after { content: " \\2014 the robotics wiki"; }',
    });
    const planted = await page.evaluate(collectIdentity, PUBLIC_DESCRIPTOR);
    const extended = planted.brandDisplayTexts.filter(
      ({ text }) => text !== PUBLIC_IDENTITY,
    );
    expect(extended, 'the pseudo-element text reached the recorded reading').not.toHaveLength(
      0,
    );
    for (const lockup of extended) {
      expect(lockup.pseudoText.after, lockup.selector).toContain('robotics wiki');
      expect(lockup.domText, lockup.selector).toBe(PUBLIC_IDENTITY);
    }
  });

  /**
   * The hole the union of the two earlier populations left. Each of them
   * starts from a property the slot supplies about itself, so doing both at
   * once walked out of both: strip the annotation and the role reading stops
   * seeing it, rename it past the spelling family and the text reading stops
   * seeing it too. The other lockups stay valid throughout, so every
   * aggregate this suite checked stayed green while a brand position in the
   * header rendered a name nobody approved.
   */
  test('reports a chrome brand slot that is unannotated and renamed at once', async ({
    page,
    staticBase,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(installRenderedTextProbe);
    const response = await page.goto(`${staticBase}/`);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);

    // The accepted half first: unplanted, this page satisfies both halves of
    // the structural requirement through the same reading that has to fail
    // below.
    const clean = await page.evaluate(collectIdentity, PUBLIC_DESCRIPTOR);
    expect(clean.structuralBrandSlots.length).toBeGreaterThan(0);
    expect(
      clean.structuralBrandSlots.filter(
        ({ role }) => !role?.endsWith('wordmark'),
      ),
      'every structural brand slot the shipped page renders is annotated',
    ).toEqual([]);
    expect([
      ...new Set(clean.structuralBrandSlots.map(({ text }) => text)),
    ]).toEqual([PUBLIC_IDENTITY]);
    expect(
      clean.structuralBrandSlots.some(
        ({ origin }) => origin === 'chrome-home-link',
      ),
    ).toBe(true);

    const planted = await page.evaluate(() => {
      // The chrome landmark the lockup lives in is a width decision the
      // shell makes, so the plant finds the one this width renders rather
      // than naming it. `checkVisibility` rather than `offsetParent`, which
      // is null for anything positioned `fixed`.
      const target = Array.from(
        document.querySelectorAll(
          'header a[href="/"], footer a[href="/"], aside a[href="/"], nav a[href="/"]',
        ),
      ).find(
        (el) =>
          el.getAttribute('data-tektur-role')?.endsWith('wordmark') === true &&
          !el.closest('main') &&
          (el as HTMLElement).checkVisibility({
            contentVisibilityAuto: true,
            opacityProperty: true,
            visibilityProperty: true,
          }),
      );
      if (!target) {
        throw new Error('home renders no annotated chrome lockup to plant on');
      }
      const landmark = target.closest('header, footer, aside, nav');
      const before = {
        role: target.getAttribute('data-tektur-role'),
        text: (target as HTMLElement).innerText.trim(),
        landmark: landmark
          ? `${landmark.tagName.toLowerCase()}${landmark.id ? `#${landmark.id}` : ''}`
          : null,
      };
      target.removeAttribute('data-tektur-role');
      target.textContent = 'Atlas Index';
      return {
        before,
        after: {
          role: target.getAttribute('data-tektur-role'),
          text: target.textContent,
        },
      };
    });
    // The perturbation provably changed the document it was applied to.
    expect(planted.before.role).toMatch(/wordmark$/);
    expect(planted.before.text).toBe(PUBLIC_IDENTITY);
    expect(planted.after.role).toBeNull();
    expect(planted.after.text).toBe('Atlas Index');

    const read = await page.evaluate(collectIdentity, PUBLIC_DESCRIPTOR);

    // What the two earlier populations report, which is why neither could
    // close this: the slot supplies no role, so the role reading drops it,
    // and it supplies no recognisable name, so the spelling reading drops it
    // as well. Both stay green because the lockups that remain are valid.
    expect(
      read.wordmarkRoleSlots.some(({ text }) => text === 'Atlas Index'),
      'the role population cannot see a slot carrying no role',
    ).toBe(false);
    expect(
      read.brandDisplayTexts.some(({ text }) => text === 'Atlas Index'),
      'the spelling population cannot see a name outside the family',
    ).toBe(false);
    expect(
      read.wordmarkRoleSlots
        .filter(({ visible }) => visible)
        .filter(({ text }) => text !== PUBLIC_IDENTITY),
    ).toEqual([]);
    expect(
      read.brandDisplayTexts.filter(({ text }) => text !== PUBLIC_IDENTITY),
    ).toEqual([]);
    expect(
      read.brandDisplayTexts.filter(({ role }) => !role?.endsWith('wordmark')),
    ).toEqual([]);

    // Structure keeps it, because what makes it a brand slot is the position
    // the shell renders it in, and the plant changed neither the landmark
    // nor the href.
    const caught = read.structuralBrandSlots.filter(
      ({ text }) => text === 'Atlas Index',
    );
    expect(caught, 'the structural population kept the stripped slot').toHaveLength(
      1,
    );
    expect(caught[0].origin).toBe('chrome-home-link');
    expect(caught[0].landmark).toBe(planted.before.landmark);
    expect(caught[0].role).toBeNull();

    // And it fails twice over, once as unannotated and once as misnamed, so
    // repairing either half alone leaves the other reported.
    expect(
      read.structuralBrandSlots.filter(
        ({ role }) => !role?.endsWith('wordmark'),
      ),
    ).toHaveLength(1);
    expect(
      read.structuralBrandSlots.filter(({ text }) => text !== PUBLIC_IDENTITY),
    ).toHaveLength(1);
    // The rest of the chrome is untouched, which is what made this survivable
    // before: a suite that only asks whether valid lockups exist sees no
    // change at all.
    expect(
      read.structuralBrandSlots.filter(({ text }) => text === PUBLIC_IDENTITY)
        .length,
    ).toBe(clean.structuralBrandSlots.length - 1);
  });
});
