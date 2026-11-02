/** Runs in the page. Every member is selected by structure before its value
 * is checked; renaming a label or removing an annotation cannot omit it. */
export function collectReleaseResiduePage() {
  const visible = (e: Element) => {
    const s = getComputedStyle(e);
    return s.display !== 'none' && s.visibility !== 'hidden' && e.getClientRects().length > 0;
  };
  const selector = (e: Element) => {
    const p: string[] = [];
    for (let n: Element | null = e; n && p.length < 5; n = n.parentElement) {
      if (n.id) {
        p.unshift('#' + CSS.escape(n.id));
        break;
      }
      let s = n.tagName.toLowerCase();
      if (n.parentElement) s += ':nth-child(' + ([...n.parentElement.children].indexOf(n) + 1) + ')';
      p.unshift(s);
    }
    return p.join(' > ');
  };
  const nodes = [...document.body.querySelectorAll('*')];
  const texts: Array<{
    selector: string;
    kind: string;
    value: string;
    technicalContext: boolean;
  }> = [];
  const rawPaints: Array<{
    selector: string;
    attribute: string;
    value: string;
  }> = [];
  const computedPaints: Record<string, number> = {};
  const effects: Array<{
    selector: string;
    backdrop: string;
    shadow: string;
    filter: string;
    mask: string;
    logoId: string | null;
  }> = [];
  const assets: Array<{
    selector: string;
    url: string;
    imageId: string | null;
  }> = [];
  for (const e of nodes) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(e.tagName)) continue;
    const sel = selector(e);
    const rendered = visible(e);
    const own = [...e.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent ?? '').join(' ').trim();
    const technical = Boolean(e.closest('pre,code')) || Boolean(e.closest('a[href]') && /^(https?:\/\/|www\.|[\w.-]+\.(com|org|io)\/)/i.test(own));
    if (rendered && own) texts.push({
      selector: sel,
      kind: 'visible',
      value: own,
      technicalContext: technical
    });
    for (const key of ['aria-label', 'aria-description', 'alt', 'title', 'placeholder']) if (e.hasAttribute(key)) texts.push({
      selector: sel,
      kind: key,
      value: e.getAttribute(key)!,
      technicalContext: false
    });
    if (e.hasAttribute('aria-labelledby')) for (const id of e.getAttribute('aria-labelledby')!.split(/\s+/)) {
      const target = document.getElementById(id);
      texts.push({
        selector: sel,
        kind: 'aria-labelledby',
        value: target?.textContent ?? 'missing:' + id,
        technicalContext: false
      });
    }
    for (const key of ['fill', 'stroke', 'color', 'bgcolor', 'style']) if (e.hasAttribute(key)) rawPaints.push({
      selector: sel,
      attribute: key,
      value: e.getAttribute(key)!
    });
    const s = getComputedStyle(e);
    if (rendered) {
      for (const key of ['color', 'backgroundColor', 'borderTopColor', 'outlineColor', 'fill', 'stroke'] as const) {
        const value = s[key];
        if (value) computedPaints[value] = (computedPaints[value] ?? 0) + 1;
      }
    }
    const mask = s.maskImage;
    const logo = e.closest('[data-logo-mark]');
    if (rendered && (s.backdropFilter !== 'none' || s.boxShadow !== 'none' || s.filter !== 'none' || mask !== 'none')) effects.push({
      selector: sel,
      backdrop: s.backdropFilter,
      shadow: s.boxShadow,
      filter: s.filter,
      mask,
      logoId: logo?.getAttribute('data-logo-src') ?? null
    });
    const imageId = e.closest('[data-image-id]')?.getAttribute('data-image-id') ?? null;
    for (const key of ['src', 'poster', 'data-logo-src', ...(['image', 'use'].includes(e.tagName.toLowerCase()) ? ['href', 'xlink:href'] : [])]) {
      const value = e.getAttribute(key);
      if (value && !value.startsWith('data:')) assets.push({
        selector: sel,
        url: value,
        imageId
      });
    }
    for (const image of [s.backgroundImage, mask]) for (const match of image.matchAll(/url\(["']?([^"')]+)["']?\)/g)) assets.push({
      selector: sel,
      url: match[1],
      imageId
    });
  }
  const logos = [...document.querySelectorAll('[data-logo-mark]')].filter(visible).map(e => {
    const outer = getComputedStyle(e);
    const ink = e.querySelector('[data-logo-ink]');
    if (!ink) throw Error('Logo has no ink node');
    const inner = getComputedStyle(ink);
    const box = e.getBoundingClientRect();
    return {
      id: e.getAttribute('data-company-logo') ?? e.getAttribute('data-logo-src') ?? selector(e),
      file: e.getAttribute('data-logo-src') ?? '',
      ink: inner.backgroundColor,
      mask: inner.maskImage,
      maskMode: inner.maskMode,
      maskComposite: inner.maskComposite,
      filter: outer.filter,
      inkFilter: inner.filter,
      background: outer.backgroundColor,
      shadow: outer.boxShadow,
      border: [outer.borderTopWidth, outer.borderRightWidth, outer.borderBottomWidth, outer.borderLeftWidth].map(parseFloat),
      padding: [outer.paddingTop, outer.paddingRight, outer.paddingBottom, outer.paddingLeft].map(parseFloat),
      width: box.width,
      height: box.height
    };
  });
  const displayFaces = [...document.querySelectorAll('h1,h2,h3,[data-tektur-role*="wordmark"]')].filter(visible).map(e => ({
    selector: selector(e),
    family: getComputedStyle(e).fontFamily,
    text: e.textContent ?? ''
  }));
  const resources = performance.getEntriesByType('resource').map(x => x.name);
  const fonts = resources.filter(url => /\.(woff2?|ttf|otf)(?:[?#]|$)/i.test(url));
  const iconDeclarations = [...document.querySelectorAll('link[rel]')].filter(e => /icon|manifest/i.test(e.getAttribute('rel') ?? '')).map(e => (e.getAttribute('rel') ?? '') + '=' + (e.getAttribute('href') ?? ''));
  return {
    elementCount: nodes.length,
    texts,
    rawPaints,
    computedPaints,
    resources,
    fonts,
    displayFaces,
    effects,
    assets,
    logos,
    iconDeclarations
  };
}
