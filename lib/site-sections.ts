/**
 * The site's sections as data: the sibling pages a data page links to under
 * its title. A page is listed by the change that ships its route, never
 * before, so the header cannot link to a page that does not exist
 * (tests/unit/site-sections.test.ts resolves every route to a page file).
 */
export type SiteSectionPage = {
  label: string;
  /** The page's address as the site serves it, with both slashes. */
  route: `/${string}/`;
};

export type SiteSection = {
  /** Names the section's links for assistive technology. */
  label: string;
  pages: readonly SiteSectionPage[];
};

export const MARKET_SECTION: SiteSection = {
  label: 'Market',
  pages: [{ label: 'Private companies', route: '/market-map/' }],
};

export const SITE_SECTIONS: readonly SiteSection[] = [MARKET_SECTION];
