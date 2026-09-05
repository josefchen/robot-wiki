import { COMPANIES } from '../data/companies.ts';
import { DOMAINS } from '../data/domains.ts';
import { glossaryTermsAlphabetical } from '../data/glossary.ts';
import { DOMAIN_META, publishedModules } from '../data/modules.ts';
import {
  HOME_COMPOSITION_ANCHORS,
  heroLockupMemberId,
} from './brand-v2-home-evidence.ts';
import type { SurfaceCountExpectation } from './brand-v2-home-tools-evidence.ts';
import { SEGMENT_ORDER } from './market-map.ts';

/**
 * Canonical populations for the three home-composition assertions.
 *
 * None of them quantifies over public routes. `VAL-B2-ID-007` is a claim
 * about the hero lockups home renders, `VAL-B2-SHELL-006` is a claim about
 * the six independent anchors its own sentence names, and `VAL-B2-SHELL-007`
 * is a claim about the seven canonical domain destinations. Recording any of
 * them per public route would emit sixty-one rows for a claim never checked
 * against sixty of them, which is the proxy-population failure R8(a) names,
 * and it is exactly what the pending rows these replace did.
 */
export const HOME_HERO_LOCKUP_POPULATION_SOURCE =
  'evidence/brand-v2/home-composition.json#heroLockups';
export const HOME_COMPOSITION_ANCHOR_POPULATION_SOURCE =
  'contract/design-integrity.md#VAL-B2-SHELL-006:composition-anchors';
export const HOME_DOMAIN_DESTINATION_POPULATION_SOURCE =
  'data/domains.ts#DOMAINS';

/**
 * `VAL-B2-SHELL-009` is the one home assertion that does quantify over
 * public routes: the shell it bounds is on every one of them, so measuring
 * home alone would leave the shell claim decided by a single page.
 */
export const HOME_RESPONSIVE_POPULATION_SOURCE =
  'contract/brand-v2-registries.json#routes.public';

export const HOME_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-ID-007': HOME_HERO_LOCKUP_POPULATION_SOURCE,
  'VAL-B2-SHELL-006': HOME_COMPOSITION_ANCHOR_POPULATION_SOURCE,
  'VAL-B2-SHELL-007': HOME_DOMAIN_DESTINATION_POPULATION_SOURCE,
  'VAL-B2-SHELL-009': HOME_RESPONSIVE_POPULATION_SOURCE,
};

/**
 * The surfaces `VAL-DESIGN-015` names: the shell (measured on home, which
 * every sweep already loads), the seven domain landings, the A-Z index, and
 * the glossary. Derived from the taxonomy so an eighth domain becomes an
 * eighth swept surface rather than a route nobody checked.
 */
export type ProgressCounterSurface = {
  id: string;
  path: string;
  /**
   * What each counted noun this surface may print has to equal. Every
   * printed count has to match one of these, and the required ones have to
   * be printed: a surface whose totals stopped being expressible used to
   * park them in `unreconciledCounts` and still pass, so an index could
   * print any number of articles it liked as long as one other count on the
   * page still reconciled.
   */
  countExpectations: SurfaceCountExpectation[];
};

export function progressCounterSurfaces(): ProgressCounterSurface[] {
  const published = publishedModules();
  const glossaryTerms = glossaryTermsAlphabetical();
  const surfaces: ProgressCounterSurface[] = [
    {
      id: 'route:/',
      path: '/',
      countExpectations: [
        {
          memberId: 'count:/:companies',
          noun: 'companies',
          nounPattern: '^compan',
          expected: COMPANIES.length,
          required: false,
        },
        {
          memberId: 'count:/:segments',
          noun: 'market map segments',
          nounPattern: '^segment',
          expected: SEGMENT_ORDER.length,
          required: false,
        },
      ],
    },
    ...DOMAINS.map((domain) => ({
      id: `route:/${domain}/`,
      path: `/${domain}/`,
      countExpectations: [
        {
          memberId: `count:/${domain}/:articles`,
          noun: 'published articles in this domain',
          nounPattern: '^(article|module)',
          expected: published.filter((module) => module.domain === domain)
            .length,
          required: false,
        },
      ],
    })),
    {
      id: 'route:/a-z/',
      path: '/a-z/',
      // Both totals are required, and independently: the A-Z index prints
      // the whole published corpus and the whole glossary, and one of them
      // reconciling says nothing about the other.
      countExpectations: [
        {
          memberId: 'count:/a-z/:articles',
          noun: 'published articles',
          nounPattern: '^(article|module)',
          expected: published.length,
          required: true,
        },
        {
          memberId: 'count:/a-z/:glossary-terms',
          noun: 'glossary terms',
          nounPattern: '^(term|entr)',
          expected: glossaryTerms.length,
          required: true,
        },
      ],
    },
    {
      id: 'route:/glossary/',
      path: '/glossary/',
      countExpectations: [
        {
          memberId: 'count:/glossary/:terms',
          noun: 'glossary terms',
          nounPattern: '^(term|entr)',
          expected: glossaryTerms.length,
          required: true,
        },
      ],
    },
  ];
  if (surfaces.length < 3) {
    throw new Error(
      'the progress-counter surface population collapsed: VAL-DESIGN-015 would quantify over almost nothing',
    );
  }
  return surfaces;
}

export type CanonicalDomainDestination = {
  id: string;
  domain: string;
  name: string;
  href: string;
  description: string;
};

/**
 * The seven top-level destinations `VAL-B2-SHELL-007` quantifies over,
 * derived from the taxonomy rather than listed. An eighth domain added to
 * `data/domains.ts` becomes an eighth member that home has to render,
 * instead of escaping a hard-coded seven.
 */
export function canonicalDomainDestinations(): CanonicalDomainDestination[] {
  const members = DOMAINS.map((domain) => {
    const meta = DOMAIN_META[domain];
    if (!meta) {
      throw new Error(`the taxonomy lists ${domain} with no registry metadata`);
    }
    return {
      id: `domain-destination:/${domain}/`,
      domain,
      name: meta.name,
      href: `/${domain}/`,
      description: meta.description,
    };
  });
  if (members.length === 0) {
    throw new Error(
      'the taxonomy is empty: VAL-B2-SHELL-007 would quantify over nothing',
    );
  }
  return members;
}

/**
 * The hero lockups the sweep discovered, as population ids. Derived from the
 * evidence rather than fixed at one, because `VAL-B2-ID-007` forbids a
 * duplicate lockup: a second one has to enter the population and fail there,
 * not vanish because the population said there could only ever be one.
 */
export function homeHeroLockupMembers(evidence: {
  heroLockups: ReadonlyArray<{ index: number }>;
}): string[] {
  if (evidence.heroLockups.length === 0) {
    throw new Error(
      'the home sweep discovered no hero lockup: VAL-B2-ID-007 would quantify over nothing',
    );
  }
  return evidence.heroLockups.map(({ index }) => heroLockupMemberId(index));
}

/** The anchor members `VAL-B2-SHELL-006` decomposes into, as population ids. */
export function homeCompositionAnchorMembers(): string[] {
  return [...HOME_COMPOSITION_ANCHORS];
}
