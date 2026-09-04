import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brandV2Registry, test, expect } from './brand-v2-static-fixture';
import {
  IDENTITY_RUNTIME_EVIDENCE_PATH,
  IDENTITY_VIEWPORTS,
  identityEvidenceFingerprint,
  readIdentityRuntimeEvidence,
  type IdentityRouteObservation,
} from '../../lib/brand-v2-identity-evidence';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';

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
const LOCKUP_SOURCE_PATHS = [
  'components/nav/site-shell.tsx',
  'components/nav/site-footer.tsx',
  'lib/identity.ts',
  'lib/og-cards.ts',
];

/**
 * Runs inside the page. Discovery is structural: it walks every rendered
 * element and keeps the deepest ones whose whole text is any spelling in the
 * `robot wiki` family, so a v1 lockup that carries no annotation is found
 * rather than skipped. The wordmark-role annotation is then read off what
 * was found, and the caller reconciles.
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

  const all = Array.from(document.querySelectorAll('*'));
  const nameCandidates = all.filter(
    (el) => visible(el) && BRAND_FAMILY.test((el.textContent ?? '').trim()),
  );
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
      .map((child) => (child.textContent ?? '').trim())
      .filter((text) => text.length > 0);
    return {
      role: el.getAttribute('data-tektur-role'),
      selector: selectorOf(el),
      text: (el.textContent ?? '').trim(),
      fontFamilyHead: unquote((style.fontFamily.split(',')[0] ?? '').trim()),
      fontVariationSettings: style.fontVariationSettings,
      textTransform: style.textTransform,
      symbolChildren: Array.from(el.querySelectorAll('img, svg, picture, canvas')).map(
        (child) => child.tagName.toLowerCase(),
      ),
      descriptorTexts,
    };
  });

  const bodyText = (document.body as HTMLElement).innerText ?? '';
  const exactDescriptorNodes = all
    .filter(
      (el) =>
        visible(el) &&
        (el.textContent ?? '').trim() === descriptor &&
        !Array.from(el.children).some(
          (child) => (child.textContent ?? '').trim() === descriptor,
        ),
    )
    .map(selectorOf);

  const meta = (selector: string): string | null =>
    document.querySelector(selector)?.getAttribute('content') ?? null;
  const linkHref = (selector: string): string | null =>
    document.querySelector(selector)?.getAttribute('href') ?? null;

  return {
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

    // Enforced here as well as in the generator, so a red identity surface
    // fails the suite that measured it rather than only the artifact check.
    const wrongNames = observations.flatMap(({ route, viewport, brandDisplayTexts }) =>
      brandDisplayTexts
        .filter(({ text }) => text !== PUBLIC_IDENTITY)
        .map(({ selector, text }) => `${route} @ ${viewport}: ${selector} renders "${text}"`),
    );
    expect(wrongNames).toEqual([]);
    const unannotated = observations.flatMap(({ route, viewport, brandDisplayTexts }) =>
      brandDisplayTexts
        .filter(({ role }) => !role?.endsWith('wordmark'))
        .map(({ selector }) => `${route} @ ${viewport}: ${selector} carries no wordmark role`),
    );
    expect(unannotated).toEqual([]);
    const v1Residue = observations.flatMap(({ route, viewport, v1DescriptorMatches, technicalIdentifierVisibleMatches }) =>
      [...v1DescriptorMatches, ...technicalIdentifierVisibleMatches].map(
        (line) => `${route} @ ${viewport}: ${line}`,
      ),
    );
    expect(v1Residue).toEqual([]);
    const symbols = observations.flatMap(({ route, symbolNodesInLockups, iconDeclarations }) =>
      [...symbolNodesInLockups, ...iconDeclarations].map((entry) => `${route}: ${entry}`),
    );
    expect(symbols).toEqual([]);
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
    };
    const artifactPath = join(ROOT, IDENTITY_RUNTIME_EVIDENCE_PATH);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    // Fails here rather than in the generator if the artifact this run just
    // wrote would not satisfy the reader that has to accept it.
    readIdentityRuntimeEvidence({
      artifact,
      routes,
      fingerprint: artifact.fingerprint,
    });
  });
});
