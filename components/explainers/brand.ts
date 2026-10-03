/**
 * Registry annotations for the elements the explainer kit builds at run
 * time. The kit stays plain JavaScript; it calls these hooks on every
 * control and surface it creates, so the rendered population carries the
 * same registered IDs the source scan reads here.
 */
export type ExplainerBrandHooks = {
  surface: (element: HTMLElement) => void;
  segmented: (element: HTMLElement) => void;
  selection: (element: HTMLElement) => void;
  secondary: (element: HTMLElement) => void;
  input: (element: HTMLElement) => void;
  link: (element: HTMLElement) => void;
};

export const explainerBrand: ExplainerBrandHooks = {
  surface(element) {
    element.dataset.brandSurfaceId = 'surface:flat';
  },
  segmented(element) {
    element.dataset.brandControlId = 'control:segmented';
    element.dataset.brandSurfaceId = 'surface:flat';
  },
  selection(element) {
    element.dataset.brandControlId = 'control:selection';
  },
  secondary(element) {
    element.dataset.brandControlId = 'control:secondary-action';
  },
  input(element) {
    element.dataset.brandControlId = 'control:input';
  },
  link(element) {
    element.dataset.brandControlId = 'control:link-focus';
  },
};
