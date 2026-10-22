import type { ReactNode } from 'react';
import { Children, cloneElement, isValidElement } from 'react';
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

/**
 * The h2 is set in tracked capitals (app/globals.css), and an uppercase
 * transform turns a lowercase Greek letter into its capital: the model
 * name π0.7 would read Π0.7, another symbol. A word that holds lowercase
 * Greek keeps its case inside the heading; every other word is untouched.
 * The whole word is wrapped, so the span starts and ends where the word
 * does and the reading-time count sees the same words as before.
 */
const LOWER_GREEK = /(\S*[\u03B1-\u03C9\u03D1\u03D5\u03D6]\S*)/;

function keepGreekCase(node: ReactNode): ReactNode {
  if (typeof node === 'string') {
    if (!LOWER_GREEK.test(node)) return node;
    return node.split(LOWER_GREEK).map((part, index) =>
      index % 2 === 1 ? (
        <span key={index} className="normal-case">
          {part}
        </span>
      ) : (
        part
      ),
    );
  }
  if (Array.isArray(node)) return Children.map(node, keepGreekCase);
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    return cloneElement(node, undefined, keepGreekCase(node.props.children));
  }
  return node;
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
        {level === 2 ? keepGreekCase(children) : children}
        <HeadingPermalink headingId={id} headingText={text} />
      </Tag>
    );
  };
}

export const ProseH2 = heading(2);
export const ProseH3 = heading(3);
