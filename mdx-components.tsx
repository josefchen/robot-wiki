import type { MDXComponents } from 'mdx/types';
import { SelfCheck } from '@/components/article/commit-to-reveal';
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
import { TermRef } from '@/components/mdx/term-ref';

// Global MDX component registry. Design-system primitives are available in
// every module without imports. Cite is the registry-backed resolver
// (components/mdx/cite-ref): MDX authors pass a citation id, never raw props.
// Term resolves glossary ids and Image resolves image-registry ids the same
// way (components/mdx/term-ref, components/mdx/image-ref). SelfCheck is the
// author-facing export of the internal CommitToReveal primitive
// (components/article/commit-to-reveal); the primitive itself is never
// registered here.
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
    SelfCheck,
    Stat,
    Term: TermRef,
    ...components,
  };
}
