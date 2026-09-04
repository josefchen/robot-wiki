/**
 * The text a reader actually meets, installed into the page so that every
 * brand-v2 sweep reads one definition of "rendered".
 *
 * `textContent` is blind to CSS. `text-transform: lowercase` puts the v1
 * wordmark back on the page while the DOM still stores `Robot Wiki`, and a
 * `::after { content: ... }` renders a descriptor, a hyphen or a whole
 * paraphrase that the DOM stores nowhere at all. Any predicate that compares
 * stored text against a locked string therefore accepts a visibly wrong
 * surface. Two sweeps had that hole in different clothes — the identity
 * lockup comparison and the compact-header descriptor scan — so the reader
 * lives here once rather than being re-derived beside each of them.
 *
 * Install with `page.addInitScript(installRenderedTextProbe)`; it must not
 * reference anything outside its own body, because Playwright ships it to
 * the browser as source.
 */
declare global {
  interface Window {
    /** `::before` + rendered own text + `::after`, trimmed. */
    __brandRenderedText?: (element: Element) => string;
    /** Text the two pseudo-elements contribute, each already unquoted. */
    __brandPseudoText?: (element: Element) => { before: string; after: string };
    /** `textContent`, trimmed: what the DOM stores, for provenance only. */
    __brandDomText?: (element: Element) => string;
  }
}

export function installRenderedTextProbe(): void {
  const EMPTY_CONTENT = ['none', 'normal', 'normal none', ''];

  /**
   * Chromium serializes `content` as a space-separated list whose string
   * parts are quoted. Quoted runs are the text; an unquoted part that is not
   * an image or a quote keyword (`attr()`, `counter()`) still renders
   * something, so it is reported verbatim rather than dropped.
   */
  const contentText = (value: string): string => {
    const trimmed = value.trim();
    if (EMPTY_CONTENT.includes(trimmed)) return '';
    let out = '';
    let index = 0;
    let sawQuoted = false;
    while (index < trimmed.length) {
      const char = trimmed[index];
      if (char === '"' || char === "'") {
        const end = trimmed.indexOf(char, index + 1);
        if (end === -1) break;
        out += trimmed.slice(index + 1, end);
        sawQuoted = true;
        index = end + 1;
        continue;
      }
      index += 1;
    }
    if (sawQuoted) return out;
    if (trimmed.startsWith('url(') || trimmed.startsWith('image-set(')) {
      return '';
    }
    return trimmed;
  };

  const pseudoText = (element: Element): { before: string; after: string } => ({
    before: contentText(getComputedStyle(element, '::before').content),
    after: contentText(getComputedStyle(element, '::after').content),
  });

  const ownText = (element: Element): string => {
    const rendered = (element as HTMLElement).innerText;
    return typeof rendered === 'string' ? rendered : (element.textContent ?? '');
  };

  window.__brandPseudoText = pseudoText;
  window.__brandDomText = (element: Element): string =>
    (element.textContent ?? '').trim();
  window.__brandRenderedText = (element: Element): string => {
    const pseudo = pseudoText(element);
    return `${pseudo.before}${ownText(element)}${pseudo.after}`.trim();
  };
}
