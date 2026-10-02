/**
 * Resolves the internal links of an exported page the way the static host
 * serves them with `trailingSlash: true`: a page path without its trailing
 * slash answers 308 to the slashed path, a file path with a trailing slash
 * answers 308 to the bare file, and anything else answers 200 when the
 * export holds the file and 404 when it does not.
 */

export type LinkStatus = 200 | 308 | 404;

export interface LinkResolution {
  status: LinkStatus;
  /** The redirect target of a 308. */
  location?: string;
}

export interface LinkProblem {
  page: string;
  href: string;
  status: Exclude<LinkStatus, 200>;
  location?: string;
}

/** The last path segment names a file: it ends in a dot and an extension. */
const FILE_SEGMENT = /\.\w+$/;

/**
 * The pathname of an internal href, or null for an external, non-HTTP or
 * same-page link. `siteUrl` is the canonical origin, whose absolute links
 * count as internal.
 */
export function internalPathname(href: string, siteUrl: string): string | null {
  const value = href.trim();
  if (!value || value.startsWith('#')) return null;
  const origin = new URL(siteUrl).origin;
  let url: URL;
  try {
    url = new URL(value, `${origin}/`);
  } catch {
    return null;
  }
  if (url.origin !== origin || !/^https?:$/.test(url.protocol)) return null;
  return url.pathname;
}

/** Where the export file for a request path lives, relative to the export root. */
export function exportFileFor(pathname: string): string {
  return pathname.endsWith('/') ? `${pathname}index.html` : pathname;
}

/** How the host answers a request for `pathname`, given which export files exist. */
export function resolveExportPath(pathname: string, exists: (file: string) => boolean): LinkResolution {
  const path = decodeURI(pathname);
  if (path !== '/' && path.endsWith('/')) {
    const segment = path.slice(0, -1).split('/').at(-1) ?? '';
    if (FILE_SEGMENT.test(segment)) return { status: 308, location: path.slice(0, -1) };
  }
  if (!path.endsWith('/')) {
    const segment = path.split('/').at(-1) ?? '';
    if (!FILE_SEGMENT.test(segment)) return { status: 308, location: `${path}/` };
  }
  return { status: exists(exportFileFor(path)) ? 200 : 404 };
}

/** Every `href` attribute value in the document, in document order. */
export function documentHrefs(document: Document): string[] {
  return [...document.querySelectorAll('[href]')].map((element) => element.getAttribute('href') ?? '');
}

/** The internal links of one page that redirect or do not resolve. */
export function inspectPageLinks(
  page: string,
  hrefs: readonly string[],
  siteUrl: string,
  exists: (file: string) => boolean,
): LinkProblem[] {
  const problems: LinkProblem[] = [];
  for (const href of hrefs) {
    const pathname = internalPathname(href, siteUrl);
    if (pathname === null) continue;
    const resolution = resolveExportPath(pathname, exists);
    if (resolution.status !== 200) problems.push({ page, href, ...resolution } as LinkProblem);
  }
  return problems;
}

export function formatLinkProblem(problem: LinkProblem): string {
  const target = problem.status === 308 ? ` redirects to ${problem.location}` : ' is not in the export';
  return `${problem.page}: ${problem.href} (${problem.status})${target}`;
}
