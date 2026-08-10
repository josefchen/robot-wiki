import type { MDXComponents } from 'mdx/types';
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
import { TermRef } from '@/components/mdx/term-ref';

// Global MDX component registry. Design-system primitives are available in
// every module without imports. Cite is the registry-backed resolver
// (components/mdx/cite-ref): MDX authors pass a citation id, never raw props.
// Term resolves glossary ids the same way (components/mdx/term-ref).
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Aside,
    Badge,
    Callout,
    Card,
    Cite: CiteRef,
    CodeBlock,
    Figure,
    KeyValue,
    Stat,
    Term: TermRef,
    ...components,
  };
}
