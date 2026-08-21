import type { ReactNode } from 'react';
import { isValidElement } from 'react';
import { HeadingPermalink } from '@/components/article/heading-permalink';

/**
 * Article h2 and h3 in MDX prose, with a copy-link control attached.
 *
 * rehype-slug puts the id on the heading and rehype-autolink-headings
 * (behavior: wrap) turns the heading text into an anchor to that id, so the
 * fragment navigation already worked; what was missing was any sign that the
 * heading addresses a section and any way to put that address on the
 * clipboard. The control needs the heading's own text for its accessible
 * name, which is why the text is recovered from the children here rather
 * than duplicated in the MDX.
 */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return '';
}

type ProseHeadingProps = {
  id?: string;
  children?: ReactNode;
};

function heading(level: 2 | 3) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return function ProseHeading({ id, children, ...rest }: ProseHeadingProps) {
    // A heading the slug plugin could not name has no address to copy, so it
    // renders exactly as before rather than offering a broken control.
    if (!id) {
      return (
        <Tag {...rest}>
          {children}
        </Tag>
      );
    }
    const text = textOf(children).trim();
    return (
      // The affordance sits inside the heading so it can ride the heading's
      // hover, which would fold its label into the heading's accessible name.
      // aria-label pins the heading to its own text instead, so the heading
      // still announces as the section it names.
      <Tag id={id} aria-label={text} className="group/heading" {...rest}>
        {children}
        <HeadingPermalink headingId={id} headingText={text} />
      </Tag>
    );
  };
}

export const ProseH2 = heading(2);
export const ProseH3 = heading(3);
