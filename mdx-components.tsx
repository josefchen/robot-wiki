import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { PredictThenReveal, SelfCheck } from '@/components/article/commit-to-reveal';
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
import { CiteRef } from '@/components/mdx/cite-ref';
import { ImageRef } from '@/components/mdx/image-ref';
import { ProseH2, ProseH3 } from '@/components/mdx/prose-heading';
import { TermRef } from '@/components/mdx/term-ref';

// Global MDX component registry. Design-system primitives are available in
// every module without imports. Cite is the registry-backed resolver
// (components/mdx/cite-ref): MDX authors pass a citation id, never raw props.
// Term resolves glossary ids and Image resolves image-registry ids the same
// way (components/mdx/term-ref, components/mdx/image-ref). SelfCheck and
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
    a: (props: ComponentPropsWithoutRef<'a'>) => (
      <a data-brand-control-id="control:link-focus" {...props} />
    ),
    // rehype-pretty-code emits the highlighted block's title bar and its
    // bordered <pre>; both are painted planes the surface registry governs,
    // and neither passes through a first-party component where the
    // annotation could otherwise live.
    figcaption: (props: ComponentPropsWithoutRef<'figcaption'>) => (
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
    h2: ProseH2,
    h3: ProseH3,
    ...components,
  };
}
