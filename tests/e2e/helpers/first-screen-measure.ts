import type { FirstScreenMeasurement } from '../../helpers/first-screen-contract.ts';

/**
 * Owner-authorized successor, 2026-11-02: use the earliest real control
 * region, including scenes and control-only tables/checks. A closed fold's
 * SVG cannot displace its visible parent stage, and hidden method prose is
 * never an operating cue. Every DOM mount is returned before grading so
 * registry omissions cannot shrink the measured population.
 *
 * Self-contained for page.evaluate; componentNames only resolves a frame's
 * independently rendered identifier to its canonical export spelling.
 */
export function measureFirstScreen({ route, componentNames }: {
  route: string;
  componentNames: Record<string, string>;
}): FirstScreenMeasurement | null {
  const prose = document.querySelector<HTMLElement>('div[data-pagefind-body].prose');
  if (!prose) return null;
  const ROOTS = '[data-figure-frame], [data-article-interactive], [data-self-check], [data-predict]:not([data-explainer-predict])';
  const CONTROLS = 'input:not([type="hidden"]), select, button:not([data-heading-permalink]), [role="button"], [role="slider"], [role="checkbox"], [role="radio"], [role="switch"], [role="combobox"], [role="tab"]';
  const decorative = (element: Element) => element.closest('[aria-hidden="true"], [inert]') !== null;
  const enabled = (element: Element) => !element.matches(':disabled, [aria-disabled="true"]');
  const visible = (element: Element) => element.checkVisibility({ checkVisibilityCSS: true }) && !decorative(element);
  const copyApparatus = (element: Element) => element.tagName === 'BUTTON'
    && element.getAttribute('aria-label') === 'Copy code to clipboard'
    && element.closest('[data-code-copy], [data-brand-frame-interior-registered="code"]') !== null;
  const normalize = (name: string) => name.replace(/-/g, '').toLowerCase();
  const roots = [...prose.querySelectorAll<HTMLElement>(ROOTS)];
  const ordinals = new Map<string, number>();
  const identityOf = (element: HTMLElement): string => {
    if (element.hasAttribute('data-self-check')) return 'SelfCheck';
    if (element.hasAttribute('data-predict')) return 'PredictThenReveal';
    const named = element.getAttribute('data-article-interactive');
    if (named) return componentNames[normalize(named)] ?? `unregistered:${named}`;
    const scene = element.getAttribute('data-motion-scene');
    if (scene) return `scene:${scene}`;
    const explainer = element.getAttribute('data-explainer-mount');
    if (explainer) return `explainer:${explainer}`;
    const clip = element.getAttribute('data-motion-clip');
    if (clip) return `clip:${clip}`;
    const diagram = element.getAttribute('data-image-id');
    if (element.getAttribute('data-figure-kind') === 'original-schematic' && diagram
      && element.getAttribute('data-figure-frame') === diagram) return `diagram:${diagram}`;
    const frame = element.getAttribute('data-figure-frame') ?? '';
    return componentNames[normalize(frame)] ?? `unregistered:${frame}`;
  };
  const selectorOf = (element: HTMLElement) => {
    for (const attribute of ['data-self-check', 'data-predict', 'data-article-interactive', 'data-figure-frame']) {
      if (element.hasAttribute(attribute)) {
        const value = element.getAttribute(attribute);
        const selector = value ? `[${attribute}="${CSS.escape(value)}"]` : `[${attribute}]`;
        if (prose.querySelectorAll(selector).length === 1) return `div[data-pagefind-body].prose ${selector}`;
      }
    }
    const path: string[] = [];
    let node: HTMLElement | null = element;
    while (node && node !== prose) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      path.unshift(`${node.tagName.toLowerCase()}:nth-child(${[...parent.children].indexOf(node) + 1})`);
      node = parent;
    }
    return `div[data-pagefind-body].prose > ${path.join(' > ')}`;
  };
  // A prediction's radios belong to it; its child's sliders belong to the
  // child frame. No parent can borrow a nested widget's controls.
  const ownedControls = (element: HTMLElement) => [...element.querySelectorAll<HTMLElement>(CONTROLS)]
    .filter((control) => control.closest(ROOTS) === element && !decorative(control) && !copyApparatus(control));
  const mounts = roots.map((element) => {
    const identity = identityOf(element);
    const ordinal = (ordinals.get(identity) ?? 0) + 1;
    ordinals.set(identity, ordinal);
    const controls = ownedControls(element);
    return {
      id: `mount:${route}:${identity}:${ordinal}`,
      identity,
      selector: selectorOf(element),
      operable: controls.some(enabled),
      visibleControl: controls.some((control) => enabled(control) && visible(control)),
    };
  });
  const unboundControls = [...prose.querySelectorAll<HTMLElement>(CONTROLS)]
    .filter((control) => enabled(control) && visible(control) && !control.closest(ROOTS) && !copyApparatus(control))
    .map((control) => control.getAttribute('aria-label') ?? control.innerText.trim() ?? control.tagName);
  const apparatusControls = [...prose.querySelectorAll<HTMLElement>(CONTROLS)].filter(copyApparatus)
    .map((control) => ({ name: control.getAttribute('aria-label')!, reason: 'The registered code listing copy action is article apparatus, like a heading permalink, rather than an educational interactive.' }));
  const firstIndex = mounts.findIndex((mount) => mount.visibleControl);
  if (firstIndex < 0) return { route, mounts, unboundControls, apparatusControls, first: null };
  const region = roots[firstIndex];
  const svg = [...region.querySelectorAll('svg')].find((candidate) => visible(candidate)) ?? null;
  let topLevel = region;
  while (topLevel.parentElement && topLevel.parentElement !== prose) topLevel = topLevel.parentElement;
  // Read the actual rendered children rather than an offscreen clone that
  // loses the article's citation/layout selectors. Closed details naturally
  // exclude their bodies from their parent's innerText.
  const preceding: HTMLElement[] = [];
  for (const element of prose.children) {
    if (element === topLevel) break;
    if (element instanceof HTMLElement && visible(element)) preceding.push(element);
  }
  const precedingWords = preceding.map((element) => element.innerText).join(' ').trim().split(/\s+/).filter(Boolean).length;
  const headings = [...prose.querySelectorAll('h2')].filter((heading) =>
    visible(heading) && (region.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING) !== 0);
  const paragraphs = [...prose.querySelectorAll<HTMLParagraphElement>('p')].filter((paragraph) =>
    visible(paragraph) && !region.contains(paragraph) && paragraph.innerText.trim().length > 0);
  const before = paragraphs.filter((paragraph) => (region.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_PRECEDING) !== 0);
  const after = paragraphs.filter((paragraph) => (region.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
  const labels: string[] = [];
  for (const control of [...region.querySelectorAll<HTMLElement>(CONTROLS)].filter((element) => !decorative(element))) {
    const aria = control.getAttribute('aria-label');
    if (aria) labels.push(aria);
    for (const id of (control.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)) {
      const label = document.getElementById(id);
      if (label) labels.push(label.innerText.trim());
    }
    if (control.id) {
      const label = region.querySelector<HTMLElement>(`label[for="${CSS.escape(control.id)}"]`);
      if (label) labels.push(label.innerText.trim());
    }
    const own = control.innerText.trim();
    if (own) labels.push(own);
    const wrapping = control.closest('label');
    if (wrapping) labels.push(wrapping.innerText.trim());
  }
  return {
    route, mounts, unboundControls, apparatusControls,
    first: {
      mountId: mounts[firstIndex].id,
      regionSelector: mounts[firstIndex].selector,
      precedingWords,
      precedingH2: headings.length,
      precedingH2Texts: headings.map((heading) => (heading as HTMLElement).innerText),
      topEdge: svg ? svg.getBoundingClientRect().top + window.scrollY : null,
      ...(svg ? {} : { noSvgReason: 'This operable mount has no rendered non-decorative SVG in its default state; clause (c) is inapplicable.' }),
      adjacentParagraphs: [...before.slice(-2), ...after.slice(0, 2)].map((paragraph) => ({
        text: paragraph.innerText,
        cited: paragraph.querySelector('[data-cite-id]') !== null,
      })),
      controlLabels: [...new Set(labels)].filter(Boolean),
    },
  };
}
