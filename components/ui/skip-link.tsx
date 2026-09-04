/**
 * First Tab stop on every page. Styled by .skip-link in globals.css:
 * off-screen until focused, then pinned top-left. Activation moves focus to
 * <main id="main-content">, bypassing navigation.
 *
 * The link sits outside the shell's content column, so it is not part of
 * the region a modal drawer makes inert. `inert` is how the shell takes it
 * out of the tab order for as long as the drawer owns focus.
 */
export function SkipLink({ inert = false }: { inert?: boolean }) {
  return (
    <a
      href="#main-content"
      inert={inert}
      data-brand-control-id="control:link-focus"
      className="skip-link"
    >
      Skip to content
    </a>
  );
}
