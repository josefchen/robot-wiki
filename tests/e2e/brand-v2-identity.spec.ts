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
});
