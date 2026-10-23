import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { PredictThenReveal, SelfCheck } from '@/components/article/commit-to-reveal';
import { Finding, Findings } from '@/components/article/findings';
import {
  Aside,
  Badge,
  Callout,
  Card,
  CodeBlock,
  Figure,
  KeyValue,
  Stat,
} from '@/components/ui';
import { CopyButton } from '@/components/ui/copy-button';
import { CiteRef } from '@/components/mdx/cite-ref';
import { FigureReuse } from '@/components/motion/figure-reuse';
import { ImageRef } from '@/components/mdx/image-ref';
import { ProseH2, ProseH3 } from '@/components/mdx/prose-heading';
import { TermRef } from '@/components/mdx/term-ref';
import { canonicalInternalHref } from '@/lib/canonical-href';

function ProseLink({ href, rel, ...props }: ComponentPropsWithoutRef<'a'>) {
  const outbound = /^(?:https?:)?\/\//i.test(href ?? '');
  const relationship = outbound
    ? [...new Set([...(rel?.split(/\s+/).filter(token => token && token !== 'opener') ?? []), 'noopener', 'noreferrer'])].join(' ')
    : rel;
  return (
    <a
      data-brand-control-id="control:link-focus"
      {...props}
      href={href === undefined ? href : canonicalInternalHref(href)}
      rel={relationship}
    />
  );
}

/** Keep authored Markdown tables inside the prose column on narrow screens. */
function ProseTable({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div
      role="region"
      aria-label="Scrollable article table"
      tabIndex={0}
      className="my-9 max-w-full overflow-x-auto"
    >
      <table
        {...props}
        className={`booktabs text-left ${className ?? ''}`}
      />
    </div>
  );
}

// Global MDX component registry. Design-system primitives are available in
// every module without imports. Cite is the registry-backed resolver
// (components/mdx/cite-ref): MDX authors pass a citation id, never raw props.
// Term resolves glossary ids and Image resolves image-registry ids the same
// way (components/mdx/term-ref, components/mdx/image-ref). FigureReuse is the
// caption line of a visual reused outside its canonical article. SelfCheck and
// PredictThenReveal are the author-facing exports of the internal
// CommitToReveal primitive (components/article/commit-to-reveal); the
// primitive itself is never registered here.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Aside,
    Badge,
    Callout,
    Card,
    Cite: CiteRef,
    CodeBlock,
    Figure,
    FigureReuse,
    Finding,
    Findings,
    Image: ImageRef,
    KeyValue,
    PredictThenReveal,
    SelfCheck,
    Stat,
    Term: TermRef,
    // Every anchor markdown produces is an information path and belongs in
    // the control registry: authored prose links, the reference-list and
    // figure-credit links, and the heading-wrapping anchors
    // rehype-autolink-headings inserts. Annotating the shared override
    // rather than each authored link is what keeps the registered
    // population equal to the rendered one.
    a: ProseLink,
    // rehype-pretty-code wraps a fenced sample in a <figure> with a
    // <figcaption> title bar. A code listing is prose, not a figure, so the
    // wrapper and its title render as plain elements that keep their data
    // hooks and the id the scroll region borrows its name from. The copy
    // control sits in the block's top-right corner, level with the title,
    // and reads the block's code when pressed.
    figure: ({ children, className, ...props }: ComponentPropsWithoutRef<'figure'>) =>
      'data-rehype-pretty-code-figure' in props ? (
        <div {...props} className={`relative ${className ?? ''}`.trim()}>
          {children}
          <span className="absolute right-6 top-[11px]">
            <CopyButton />
          </span>
        </div>
      ) : (
        <figure {...props} className={className}>
          {children}
        </figure>
      ),
    // rehype-pretty-code emits the highlighted block's title bar and its
    // bordered <pre>; both are painted planes the surface registry governs,
    // and neither passes through a first-party component where the
    // annotation could otherwise live.
    figcaption: (props: ComponentPropsWithoutRef<'figcaption'>) =>
      'data-rehype-pretty-code-title' in props ? (
        <div data-brand-surface-id="surface:flat" {...props} />
      ) : (
        <figcaption data-brand-surface-id="surface:flat" {...props} />
      ),
    pre: (props: ComponentPropsWithoutRef<'pre'>) => (
      <pre data-brand-surface-id="surface:flat" {...props} />
    ),
    // Inline prose code is a bordered painted plane of its own
    // (app/globals.css `.prose :where(code):not(pre code)`), so the shared
    // override carries the annotation rather than every authored span.
    code: (props: ComponentPropsWithoutRef<'code'>) => (
      <code data-brand-surface-id="surface:flat" {...props} />
    ),
    // GFM table syntax emits bare <th> cells with no scope, so a markdown
    // table's header row associates with nothing (VAL-B2-ART-008,
    // VAL-B2-A11Y-013). Every markdown table here is a data table whose
    // header cells are column headers, so scope="col" is the correct
    // default; an explicitly authored scope attribute still wins.
    th: (props: ComponentPropsWithoutRef<'th'>) => (
      <th scope="col" {...props} />
    ),
    h2: ProseH2,
    h3: ProseH3,
    table: ProseTable,
    ...components,
  };
}
