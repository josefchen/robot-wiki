/**
 * First Tab stop on every page. Styled by .skip-link in globals.css:
 * off-screen until focused, then pinned top-left. Activation moves focus to
 * <main id="main-content">, bypassing navigation.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      data-brand-control-id="control:link-focus"
      className="skip-link"
    >
      Skip to content
    </a>
  );
}
