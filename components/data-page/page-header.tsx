import Link from 'next/link';
import { isValidElement, type ReactNode } from 'react';
import { formatLongDate } from '@/lib/dates';
import type { SiteSection } from '@/lib/site-sections';
import { cx } from '@/lib/utils';

export type PageAnchor = {
  label: string;
  /** The id of a section on this page, without the hash. */
  id: string;
};

type PageHeaderProps = {
  title: string;
  /**
   * One sentence without its closing full stop. The header ends it, on the
   * date when `asOf` is given, so no page types a date or picks a format.
   */
  lead: ReactNode;
  /** The day the page's figures were read, as ISO `YYYY-MM-DD`. */
  asOf?: string;
  /**
   * The page's site section. `current` is this page's own route; a page that
   * belongs to the section without being listed in it (a company profile)
   * leaves it out and gets every entry as a link.
   */
  section?: SiteSection & { current?: string };
  /** The page's own sections, in page order. */
  anchors?: readonly PageAnchor[];
};

// Navigation type: the size and leading of the site navigation's entries,
// in a 24px-tall box (WCAG 2.2 target size).
const link = 'inline-block py-0.5 font-sans text-[14px] leading-5 transition-colors';
const idle = 'text-text-dim hover:text-text';
// The site navigation's mark for the page being read.
const current = 'font-medium text-text underline decoration-1 underline-offset-[3px]';
const row = 'flex flex-wrap gap-x-5 gap-y-1';

/** The last characters of a node's text, to check how a lead ends. */
function trailingText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    for (let index = node.length - 1; index >= 0; index -= 1) {
      const text = trailingText(node[index]);
      if (text.trim() !== '') return text;
    }
    return '';
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return trailingText(node.props.children);
  }
  return '';
}

/**
 * The header every data page opens with, in one fixed order: the title, the
 * section's pages, one lead sentence that ends on the date, the page's own
 * sections. Nothing sits above the title.
 *
 * The section's pages show only when there are two or more, so a section
 * with one page prints no link to itself.
 */
export function PageHeader({ title, lead, asOf, section, anchors }: PageHeaderProps) {
  if (/[.,;:!?]\s*$/.test(trailingText(lead))) {
    throw new Error(`"${title}": pass the lead without its closing punctuation`);
  }
  if (section?.current && !section.pages.some((page) => page.route === section.current)) {
    throw new Error(`"${title}": ${section.current} is not a page of ${section.label}`);
  }
  const pages = section && section.pages.length > 1 ? section.pages : [];
  const sections = anchors ?? [];

  return (
    <header data-page-header>
      <h1 data-tektur-role="page-h1" className="font-display-page display-h1">
        {title}
      </h1>
      {section && pages.length > 0 ? (
        <nav aria-label={section.label} data-pagefind-ignore className="mt-4">
          <ul className={row}>
            {pages.map((page) => (
              <li key={page.route}>
                {page.route === section.current ? (
                  <span aria-current="page" className={cx(link, current)}>
                    {page.label}
                  </span>
                ) : (
                  <Link
                    href={page.route}
                    data-brand-control-id="control:link-focus"
                    className={cx(link, idle)}
                  >
                    {page.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <p data-page-lead className="page-lead mt-3">
        {lead}
        {asOf ? (
          <>
            , as of{' '}
            <time dateTime={asOf} className="whitespace-nowrap">
              {formatLongDate(asOf)}
            </time>
          </>
        ) : null}
        .
      </p>
      {sections.length > 0 ? (
        <nav aria-label="On this page" data-pagefind-ignore className="mt-3">
          <ul className={row}>
            {sections.map((anchor) => (
              <li key={anchor.id}>
                <a
                  href={`#${anchor.id}`}
                  data-brand-control-id="control:link-focus"
                  className={cx(link, idle, 'underline decoration-1 underline-offset-[3px]')}
                >
                  {anchor.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
