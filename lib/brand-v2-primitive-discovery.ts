/**
 * Annotation-independent discovery of the rendered surface and control
 * populations (VAL-B2-SURF-010, VAL-B2-COMP-013, VAL-B2-COMP-014).
 *
 * Querying `[data-brand-surface-id]` / `[data-brand-control-id]` and calling
 * the result the population is circular: an unregistered surface is then not
 * a failure, it is invisible, and "reconcile against the registry" compares
 * the registry with a set derived from the registry's own marker. So the
 * population here comes from structure — what natively operates, what carries
 * a widget role, what paints a bounded plane — and the annotation is checked
 * afterwards, against that independently derived set. Nodes that already
 * carry an annotation are unioned in so a stray or misspelled ID still has to
 * reconcile.
 *
 * SVG participates in control discovery. A `<circle role="button" tabindex>`
 * in a chart is a keyboard-operable product control; skipping every
 * `SVGElement` made those controls invisible to a gate whose whole claim is
 * that it sees the population without the annotation's help.
 *
 * `discoverBrandPrimitives` runs inside the page (`page.evaluate`), so it is
 * deliberately self-contained: it closes over nothing from module scope.
 */

export type DiscoveryOrigin = 'structure' | 'annotation' | 'structure+annotation';

export type SurfaceEvidence = {
  memberId: string;
  registeredId: string | null;
  tag: string;
  origin: DiscoveryOrigin;
  reason: string;
  visible: boolean;
  outline: string;
  backdropFilter: string;
  filter: string;
  boxShadow: string;
};

export type ControlEvidence = {
  memberId: string;
  registeredId: string | null;
  tag: string;
  role: string | null;
  origin: DiscoveryOrigin;
  visible: boolean;
  disabled: boolean;
  widthPx: number;
  heightPx: number;
  meetsMinimumTarget: boolean;
  /** The control is an SVG shape rather than an HTML element. */
  vector: boolean;
  inlineInTextBlock: boolean;
  spacingSatisfied: boolean;
  ariaPressed: string | null;
  ariaSelected: string | null;
  ariaCurrent: string | null;
  outline: string;
};

export type ScrollRegionEvidence = {
  memberId: string;
  tag: string;
  role: string | null;
  /** A naming attribute is present. */
  hasLabelSource: boolean;
  /** The naming attribute resolves to real text rather than a dangling id. */
  named: boolean;
  containsTable: boolean;
  focusable: boolean;
  outline: string;
};

/**
 * A bordered or painted box carrying neither text nor an element child. It
 * paints a mark — a legend swatch, a status dot — not a plane that holds
 * content, so the surface registry does not govern it. The evidence is
 * emitted so the exclusion stays falsifiable: put content in one and it
 * becomes a surface that must be registered.
 */
export type MarkEvidence = {
  memberId: string;
  tag: string;
  textLength: number;
  childElementCount: number;
  widthPx: number;
  heightPx: number;
  outline: string;
};

export type PrimitiveDiscovery = {
  minimumTargetPx: number;
  surfaces: SurfaceEvidence[];
  controls: ControlEvidence[];
  scrollRegions: ScrollRegionEvidence[];
  marks: MarkEvidence[];
};

export function discoverBrandPrimitives(): PrimitiveDiscovery {
  const MINIMUM_TARGET_PX = 24;
  const NATIVE_CONTROL =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary';
  const WIDGET_ROLES = new Set([
    'button',
    'checkbox',
    'combobox',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'slider',
    'spinbutton',
    'switch',
    'tab',
    'textbox',
  ]);
  const MEDIA_TAGS = new Set([
    'AREA',
    'AUDIO',
    'CANVAS',
    'IFRAME',
    'IMG',
    'MAP',
    'PICTURE',
    'SOURCE',
    'TRACK',
    'VIDEO',
  ]);

  type Entry = {
    element: Element;
    computed: CSSStyleDeclaration;
    rect: DOMRect;
    visible: boolean;
    exposed: boolean;
    vector: boolean;
    nativeControl: boolean;
    widgetRole: boolean;
    keyboardReachable: boolean;
    scrollContainer: boolean;
  };

  const datasetOf = (element: Element): DOMStringMap =>
    (element as HTMLElement | SVGElement).dataset;

  const transparent = (colour: string): boolean =>
    colour === 'transparent' ||
    colour === 'rgba(0, 0, 0, 0)' ||
    /^rgba\([^)]*,\s*0\)$/.test(colour);

  const signature = (element: Element): string => {
    const parts: string[] = [];
    let node: Element | null = element;
    while (node && node.tagName !== 'BODY' && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) part += `#${node.id}`;
      const classes = (node.getAttribute('class') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join('.');
      if (classes) part += `.${classes}`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join('>');
  };

  const outlineOf = (element: Element): string =>
    element.outerHTML.replace(/\s+/g, ' ').slice(0, 180);

  const entries: Entry[] = [];
  const byElement = new Map<Element, Entry>();
  for (const node of document.querySelectorAll('body *')) {
    const tag = node.tagName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE') continue;
    const vector = node instanceof SVGElement;
    const computed = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const tabIndexAttribute = node.getAttribute('tabindex');
    const role = node.getAttribute('role');
    const entry: Entry = {
      element: node,
      computed,
      rect,
      vector,
      visible:
        computed.display !== 'none' &&
        computed.visibility !== 'hidden' &&
        computed.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0,
      exposed:
        node.closest(
          '[aria-hidden="true"], [role="presentation"], [role="none"]',
        ) === null,
      nativeControl: node.matches(NATIVE_CONTROL),
      widgetRole: role !== null && WIDGET_ROLES.has(role),
      keyboardReachable:
        tabIndexAttribute !== null && !tabIndexAttribute.trim().startsWith('-'),
      scrollContainer:
        computed.overflowX === 'auto' ||
        computed.overflowX === 'scroll' ||
        computed.overflowY === 'auto' ||
        computed.overflowY === 'scroll',
    };
    entries.push(entry);
    byElement.set(node, entry);
  }

  // --- controls -----------------------------------------------------------
  const structuralControls: Entry[] = [];
  const scrollRegions: ScrollRegionEvidence[] = [];
  for (const entry of entries) {
    if (MEDIA_TAGS.has(entry.element.tagName)) continue;
    if (!entry.visible || !entry.exposed) continue;
    const operable =
      entry.nativeControl || entry.widgetRole || entry.keyboardReachable;
    if (!operable) continue;
    if (
      !entry.nativeControl &&
      !entry.widgetRole &&
      entry.scrollContainer
    ) {
      // Focusable only so a keyboard can scroll it (axe
      // scrollable-region-focusable). A scroll container is not a control:
      // it has no action, so the control registry does not govern it.
      const role = entry.element.getAttribute('role');
      scrollRegions.push({
        memberId: `scroll:${scrollRegions.length}:${signature(entry.element)}`,
        tag: entry.element.tagName.toLowerCase(),
        role,
        hasLabelSource:
          (entry.element.getAttribute('aria-label') ?? '').trim().length > 0 ||
          (entry.element.getAttribute('aria-labelledby') ?? '').trim().length >
            0,
        named:
          (entry.element.getAttribute('aria-label') ?? '').trim().length > 0 ||
          (entry.element.getAttribute('aria-labelledby') ?? '')
            .split(/\s+/)
            .filter(Boolean)
            .every(
              (id) =>
                (document.getElementById(id)?.textContent ?? '').trim()
                  .length > 0,
            ),
        containsTable: entry.element.querySelector('table') !== null,
        focusable: true,
        outline: outlineOf(entry.element),
      });
      continue;
    }
    structuralControls.push(entry);
  }

  const controlSet = new Set(structuralControls.map(({ element }) => element));
  const annotatedControls = [
    ...document.querySelectorAll('[data-brand-control-id]'),
  ];
  const controlEntries: Array<{ entry: Entry; origin: DiscoveryOrigin }> =
    structuralControls.map((entry) => ({
      entry,
      origin: datasetOf(entry.element).brandControlId
        ? ('structure+annotation' as const)
        : ('structure' as const),
    }));
  for (const node of annotatedControls) {
    if (controlSet.has(node)) continue;
    const entry = byElement.get(node);
    if (!entry) continue;
    controlEntries.push({ entry, origin: 'annotation' });
  }

  const targetRects = controlEntries
    .filter(({ entry }) => entry.visible)
    .map(({ entry }) => entry.rect);
  const undersized = targetRects.filter(
    (rect) =>
      rect.width < MINIMUM_TARGET_PX || rect.height < MINIMUM_TARGET_PX,
  );
  const circleHitsRect = (
    x: number,
    y: number,
    radius: number,
    box: DOMRect,
  ): boolean => {
    const nearestX = Math.max(box.left, Math.min(x, box.right));
    const nearestY = Math.max(box.top, Math.min(y, box.bottom));
    const dx = nearestX - x;
    const dy = nearestY - y;
    return dx * dx + dy * dy < radius * radius;
  };
  const centre = (box: DOMRect) => ({
    x: box.left + box.width / 2,
    y: box.top + box.height / 2,
  });
  /**
   * WCAG 2.2 SC 2.5.8 spacing exception: a 24px-diameter circle centred on
   * the undersized target must not intersect another target, nor the circle
   * of another undersized target.
   */
  const spacingSatisfiedFor = (box: DOMRect): boolean => {
    const own = centre(box);
    for (const other of targetRects) {
      if (other === box) continue;
      if (circleHitsRect(own.x, own.y, MINIMUM_TARGET_PX / 2, other)) {
        return false;
      }
    }
    for (const other of undersized) {
      if (other === box) continue;
      const far = centre(other);
      const dx = far.x - own.x;
      const dy = far.y - own.y;
      if (Math.hypot(dx, dy) < MINIMUM_TARGET_PX) return false;
    }
    return true;
  };

  const INLINE_OUTER_DISPLAY = new Set([
    'inline',
    'inline-block',
    'inline-flex',
    'inline-grid',
    'inline-table',
    'inline list-item',
    'contents',
    'ruby',
    'ruby-base',
    'ruby-text',
  ]);
  /**
   * The SC 2.5.8 inline exception: "the target is in a sentence, or its size
   * is otherwise constrained by the line-height of non-target text".
   *
   * Tested on the target's context, never on its own computed display: a
   * flex or grid container blockifies its children, so the citation chip
   * anchors in components/ui/cite.tsx compute as `flex` while still sitting
   * inline in a paragraph, and tag names are unreliable for the same reason
   * (a grid item <span> holding prose is a text block). What has to hold is
   * that the containing block carries non-target text and that the target
   * does not fill that block: a sort control alone in a table header cell
   * and a full-width row both fail, an inline chip that happens to wrap onto
   * its own line does not.
   */
  const inlineInTextBlockFor = (
    element: Element,
    rect: DOMRect,
  ): boolean => {
    let block = element.parentElement;
    while (block) {
      const blockEntry = byElement.get(block);
      const display = blockEntry
        ? blockEntry.computed.display
        : getComputedStyle(block).display;
      if (!INLINE_OUTER_DISPLAY.has(display)) break;
      block = block.parentElement;
    }
    if (!block) return false;
    if (rect.width >= block.getBoundingClientRect().width - 1) return false;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if ((node.textContent ?? '').trim().length === 0) continue;
      if (!element.contains(node)) return true;
    }
    return false;
  };

  const controls: ControlEvidence[] = controlEntries.map(
    ({ entry, origin }, index) => {
      const { element, rect } = entry;
      const meetsMinimumTarget =
        rect.width >= MINIMUM_TARGET_PX && rect.height >= MINIMUM_TARGET_PX;
      return {
        memberId: `control:${index}:${signature(element)}`,
        registeredId: datasetOf(element).brandControlId ?? null,
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role'),
        origin,
        visible: entry.visible,
        disabled:
          element.matches(':disabled') ||
          element.getAttribute('aria-disabled') === 'true',
        widthPx: Math.round(rect.width * 100) / 100,
        heightPx: Math.round(rect.height * 100) / 100,
        meetsMinimumTarget,
        vector: entry.vector,
        inlineInTextBlock:
          entry.visible && !meetsMinimumTarget
            ? inlineInTextBlockFor(element, rect)
            : false,
        spacingSatisfied:
          meetsMinimumTarget || (entry.visible && spacingSatisfiedFor(rect)),
        ariaPressed: element.getAttribute('aria-pressed'),
        ariaSelected: element.getAttribute('aria-selected'),
        ariaCurrent: element.getAttribute('aria-current'),
        outline: outlineOf(element),
      };
    },
  );

  // --- surfaces -----------------------------------------------------------
  const nearestPaintedBackground = (element: Element): string => {
    let parent = element.parentElement;
    while (parent) {
      const parentEntry = byElement.get(parent);
      const colour = parentEntry
        ? parentEntry.computed.backgroundColor
        : getComputedStyle(parent).backgroundColor;
      if (!transparent(colour)) return colour;
      parent = parent.parentElement;
    }
    return getComputedStyle(document.documentElement).backgroundColor;
  };

  const structuralSurfaces: Array<{ entry: Entry; reason: string }> = [];
  const marks: MarkEvidence[] = [];
  for (const entry of entries) {
    const { element, computed } = entry;
    if (MEDIA_TAGS.has(element.tagName)) continue;
    // An SVG shape paints inside a chart; the plane the surface registry
    // governs is the HTML frame that holds the chart, which this walk sees
    // separately.
    if (entry.vector) continue;
    if (!entry.visible || !entry.exposed) continue;
    // A control's plane is governed by the control registry, whose rows carry
    // the treatment, states, and target size; the surface registry's allowed
    // owners are content planes.
    if (entry.nativeControl || entry.widgetRole || controlSet.has(element)) {
      continue;
    }
    const sides = ['top', 'right', 'bottom', 'left'] as const;
    const bordered = sides.every(
      (side) =>
        Number.parseFloat(
          computed.getPropertyValue(`border-${side}-width`),
        ) > 0 &&
        computed.getPropertyValue(`border-${side}-style`) !== 'none' &&
        !transparent(computed.getPropertyValue(`border-${side}-color`)),
    );
    const radius = Math.max(
      ...[
        'border-top-left-radius',
        'border-top-right-radius',
        'border-bottom-right-radius',
        'border-bottom-left-radius',
      ].map((property) =>
        Number.parseFloat(computed.getPropertyValue(property)) || 0,
      ),
    );
    const background = computed.backgroundColor;
    const paintedPlane =
      !transparent(background) &&
      background !== nearestPaintedBackground(element) &&
      radius > 0;
    if (!bordered && !paintedPlane) continue;
    const textLength = (element.textContent ?? '').trim().length;
    if (
      textLength === 0 &&
      element.childElementCount === 0 &&
      datasetOf(element).brandSurfaceId === undefined
    ) {
      marks.push({
        memberId: `mark:${marks.length}:${signature(element)}`,
        tag: element.tagName.toLowerCase(),
        textLength,
        childElementCount: element.childElementCount,
        widthPx: Math.round(entry.rect.width * 100) / 100,
        heightPx: Math.round(entry.rect.height * 100) / 100,
        outline: outlineOf(element),
      });
      continue;
    }
    structuralSurfaces.push({
      entry,
      reason: bordered ? 'four-sided-border' : 'distinct-painted-plane',
    });
  }

  const surfaceSet = new Set(structuralSurfaces.map(({ entry }) => entry.element));
  const surfaceEntries: Array<{
    entry: Entry;
    reason: string;
    origin: DiscoveryOrigin;
  }> = structuralSurfaces.map(({ entry, reason }) => ({
    entry,
    reason,
    origin: datasetOf(entry.element).brandSurfaceId
      ? ('structure+annotation' as const)
      : ('structure' as const),
  }));
  for (const node of document.querySelectorAll('[data-brand-surface-id]')) {
    if (surfaceSet.has(node)) continue;
    const entry = byElement.get(node);
    if (!entry) continue;
    surfaceEntries.push({ entry, reason: 'annotated', origin: 'annotation' });
  }

  const surfaces: SurfaceEvidence[] = surfaceEntries.map(
    ({ entry, reason, origin }, index) => ({
      memberId: `surface:${index}:${signature(entry.element)}`,
      registeredId: datasetOf(entry.element).brandSurfaceId ?? null,
      tag: entry.element.tagName.toLowerCase(),
      origin,
      reason,
      visible: entry.visible,
      outline: outlineOf(entry.element),
      backdropFilter: entry.computed.backdropFilter,
      filter: entry.computed.filter,
      boxShadow: entry.computed.boxShadow,
    }),
  );

  return {
    minimumTargetPx: MINIMUM_TARGET_PX,
    surfaces,
    controls,
    scrollRegions,
    marks,
  };
}
