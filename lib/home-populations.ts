import { DOMAINS } from '../data/domains.ts';
import { DOMAIN_META } from '../data/modules.ts';
import {
  HOME_COMPOSITION_ANCHORS,
  heroLockupMemberId,
} from './brand-v2-home-evidence.ts';

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

export const HOME_ASSERTION_POPULATION_SOURCES: Readonly<
  Record<string, string>
> = {
  'VAL-B2-ID-007': HOME_HERO_LOCKUP_POPULATION_SOURCE,
  'VAL-B2-SHELL-006': HOME_COMPOSITION_ANCHOR_POPULATION_SOURCE,
  'VAL-B2-SHELL-007': HOME_DOMAIN_DESTINATION_POPULATION_SOURCE,
};

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
