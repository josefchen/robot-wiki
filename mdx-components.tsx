import type { MDXComponents } from 'mdx/types';

// Global MDX component registry. Design-system primitives (Callout, Cite,
// Figure, ...) are added here by their respective features.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
