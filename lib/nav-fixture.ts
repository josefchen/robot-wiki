/**
 * Derivation of the sidebar accessible-name fixture
 * (tests/fixtures/nav-accessible-names.json).
 *
 * The fixture is the baseline for tests/e2e/design-chrome.spec.ts:
 * every sidebar link's href and accessible name, in DOM
 * order, after every taxonomy section is expanded. Until 2026-08-15 every
 * module publish regenerated it with a throwaway visual-*.mts script, each
 * worker writing a slightly different one. scripts/regen-nav-fixture.ts is
 * the checked-in replacement; this module is its pure logic so the
 * derivation and its ordering rules can be unit-tested without a build.
 *
 * How the derivation reads the export: the sidebar is a client component,
 * and SSR leaves every taxonomy group collapsed on the root page (buttons
 * only), while each domain landing page server-renders its own group
 * expanded. The generator therefore scans out/index.html for the brand
 * link, the group-button order (the canonical section order) and the
 * top-level entries, then each out/<domain>/index.html for its expanded
 * group, and assembles the all-expanded order the spec observes after
 * clicking every section open. Because the fixture must reproduce
 * byte-identically, hrefs and names are taken from the rendered export,
 * not recomputed from the registry: the export is the thing the spec
 * compares against.
 *
 * DOM access is injected (a Document in, a scan out) so this module runs
 * under Node with JSDOM, under Vitest's jsdom environment, and in any
 * future browser context without changing a line.
 */

export type NavFixtureLink = { href: string; name: string };

export type NavFixture = {
  capturedFrom: string;
  route: string;
  viewport: [number, number];
  linkCount: number;
  links: NavFixtureLink[];
};

/** One expanded taxonomy group: its ul id and its links in DOM order. */
export type SidebarGroup = { id: string; links: NavFixtureLink[] };

/**
 * What one exported page says about the sidebar. `groupOrder` is the
 * canonical section order (the group buttons in DOM order); `groups`
 * holds the expanded ones (zero on the root export, one on a domain
 * landing page).
 */
export type SidebarScan = {
  brand: NavFixtureLink;
  groupOrder: string[];
  groups: SidebarGroup[];
  topLevel: NavFixtureLink[];
};

/** The capture metadata the committed fixture documents. */
const CAPTURED_FROM = 'static export on :3201, sidebar sections expanded';

/** Normalizes whitespace the way an accessible name collapses it. */
function accessibleName(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function fail(message: string): never {
  throw new Error(`regen:nav: ${message}`);
}

function linkOf(a: Element): NavFixtureLink {
  const href = a.getAttribute('href') ?? fail(`sidebar <a> without href`);
  const name = accessibleName(a);
  if (!name) fail(`link ${href} renders an empty accessible name`);
  return { href, name };
}

/**
 * Scans one exported page's sidebar.
 *
 * Structural invariants it enforces (each throws, because a silently
 * wrong fixture is exactly the sync-shadow risk this tool exists to
 * retire): exactly one <aside> (the sidebar), a brand link to "/",
 * group buttons carrying aria-controls, and no link with an empty
 * accessible name. The active marker (an empty aria-hidden span inside
 * the active link) contributes nothing to textContent, so names match
 * ariaSnapshot whether or not the link is active.
 */
export function scanSidebarDocument(doc: Document): SidebarScan {
  const asides = doc.querySelectorAll('aside');
  if (asides.length === 0) fail('no <aside> sidebar found in the export');
  if (asides.length > 1) fail(`expected one sidebar <aside>, found ${asides.length}`);
  const aside = asides[0];

  const brandAnchor = Array.from(aside.querySelectorAll('a[href="/"]'))[0];
  if (!brandAnchor) fail('no brand link to "/" at the top of the sidebar');
  const brand = linkOf(brandAnchor);

  const nav = aside.querySelector('nav');
  if (!nav) fail('no <nav> taxonomy inside the sidebar');

  // Structural contract of components/nav/nav-tree.tsx: the nav has
  // exactly two direct-child uls — the taxonomy container (one li per
  // domain, each holding the group button and, when expanded, the group
  // ul) and the top-level entries ul (A-Z, Market Map, ...).
  const directUls = Array.from(nav.querySelectorAll(':scope > ul'));
  if (directUls.length !== 2) {
    fail(`expected 2 direct-child <ul>s in the sidebar nav, found ${directUls.length}`);
  }
  const [groupContainer, topLevelUl] = directUls;

  const groupOrder: string[] = [];
  const groups: SidebarGroup[] = [];
  for (const li of Array.from(groupContainer.querySelectorAll(':scope > li'))) {
    const controlled = li
      .querySelector(':scope > button[aria-controls]')
      ?.getAttribute('aria-controls');
    if (!controlled) fail(`taxonomy li without a group button (aria-controls)`);
    groupOrder.push(controlled);
    const expanded = li.querySelector(':scope > ul');
    if (!expanded) continue; // collapsed on this page
    const links = Array.from(expanded.querySelectorAll(':scope > li > a[href]')).map(
      linkOf,
    );
    if (links.length === 0) fail(`group ${controlled} expanded with no links`);
    groups.push({ id: controlled, links });
  }
  if (groupOrder.length === 0) fail('no taxonomy group buttons in the sidebar');

  const topLevel = Array.from(topLevelUl.querySelectorAll(':scope > li > a[href]')).map(
    linkOf,
  );
  if (topLevel.length === 0) fail('no top-level entries ul in the sidebar');

  return { brand, groupOrder, groups, topLevel };
}

/**
 * Assembles the all-expanded fixture in canonical order: brand, then each
 * domain group in the order the root export's buttons list them, then the
 * top-level entries. Domain scans may arrive in any order; the root
 * export's button order is the single ordering authority.
 */
export function buildNavFixture(
  root: SidebarScan,
  domains: Array<{ domain: string; scan: SidebarScan }>,
): NavFixture {
  if (root.groups.length > 0) {
    fail(
      `expected every group collapsed on the root export, found ${root.groups.length} expanded`,
    );
  }

  const byId = new Map<string, SidebarGroup>();
  for (const { domain, scan } of domains) {
    if (scan.groups.length !== 1) {
      fail(
        `domain page ${domain} expanded ${scan.groups.length} groups, expected exactly 1`,
      );
    }
    const [group] = scan.groups;
    const expectedId = `sidebar-group-${domain}`;
    if (group.id !== expectedId) {
      fail(
        `domain page ${domain} expanded group ${group.id}, which does not match ${expectedId}`,
      );
    }
    if (byId.has(group.id)) fail(`group ${group.id} scanned more than once`);
    byId.set(group.id, group);
  }

  const ordered: SidebarGroup[] = [];
  for (const id of root.groupOrder) {
    const group = byId.get(id);
    if (!group) fail(`no expanded group scan for root button ${id}`);
    ordered.push(group);
  }

  const links: NavFixtureLink[] = [root.brand];
  const seen = new Set<string>([root.brand.href]);
  for (const group of ordered) {
    const domain = group.id.replace(/^sidebar-group-/, '');
    const [overview, ...modules] = group.links;
    if (!overview || overview.href !== `/${domain}/`) {
      fail(`group ${group.id} does not start with its domain overview link`);
    }
    for (const link of [overview, ...modules]) {
      const second = domain ? link.href.split('/')[1] : '';
      if (second !== domain) {
        fail(`group ${group.id} contains links that escape their domain (${link.href})`);
      }
      if (seen.has(link.href)) fail(`duplicate href in assembled fixture: ${link.href}`);
      seen.add(link.href);
      links.push(link);
    }
  }
  links.push(...root.topLevel);
  for (const link of root.topLevel) {
    if (seen.has(link.href)) fail(`duplicate href in assembled fixture: ${link.href}`);
    seen.add(link.href);
  }

  return {
    capturedFrom: CAPTURED_FROM,
    route: '/',
    viewport: [1440, 900],
    linkCount: links.length,
    links,
  };
}

/**
 * Serializes in the committed fixture's exact format: 2-space JSON with
 * this key order and a single trailing newline. Byte identity with the
 * committed file is the tool's contract, so the format is fixed here
 * rather than left to JSON.stringify's defaults.
 */
export function serializeNavFixture(fixture: NavFixture): string {
  const { capturedFrom, route, viewport, linkCount, links } = fixture;
  return `${JSON.stringify({ capturedFrom, route, viewport, linkCount, links }, null, 2)}\n`;
}
