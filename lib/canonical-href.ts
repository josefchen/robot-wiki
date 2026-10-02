/**
 * The export is served with `trailingSlash: true`, so an internal page path
 * without its trailing slash answers with a 308 to the slashed form. Paths
 * that name a file (`/feed.xml`, `/images/a.png`) are served as they are.
 */
export function isFilePath(pathname: string): boolean {
  return /\.[a-z0-9]{1,8}$/i.test(pathname.split('/').at(-1) ?? '');
}

/** Whether an href is a root-relative path on this site. */
export function isInternalPath(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * The canonical form of an internal href: a page path gains its trailing
 * slash ahead of any query or fragment. Every other href is returned as is.
 */
export function canonicalInternalHref(href: string): string {
  if (!isInternalPath(href)) return href;
  const cut = href.search(/[?#]/);
  const pathname = cut === -1 ? href : href.slice(0, cut);
  const suffix = cut === -1 ? '' : href.slice(cut);
  if (pathname.endsWith('/') || isFilePath(pathname)) return href;
  return `${pathname}/${suffix}`;
}
