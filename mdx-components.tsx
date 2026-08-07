import type { MDXComponents } from 'mdx/types';
import {
  Aside,
  Badge,
  Callout,
  Card,
  Cite,
  CodeBlock,
  Figure,
  KeyValue,
  Stat,
} from '@/components/ui';

// Global MDX component registry. Design-system primitives are available in
// every module without imports.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Aside,
    Badge,
    Callout,
    Card,
    Cite,
    CodeBlock,
    Figure,
    KeyValue,
    Stat,
    ...components,
  };
}
