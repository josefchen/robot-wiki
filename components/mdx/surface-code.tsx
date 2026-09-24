import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * Hand-written JSX `<code>` elements in MDX bypass the registered markdown
 * `code` component, so they render the flat content plane without its
 * `data-brand-surface-id` annotation and fail the surface-registry sweep.
 * This wrapper clones the annotation onto its child so the literal element
 * stays authored inline while the rendered node carries the registry id.
 */
export function SurfaceCode({ children }: { children: ReactNode }) {
  return (
    <>
      {Children.map(children, (child) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<Record<string, unknown>>, {
              'data-brand-surface-id': 'surface:flat',
            })
          : child,
      )}
    </>
  );
}
