/**
 * The in-page half of the global convergence sweep
 * (`tests/e2e/brand-v2-global-convergence.spec.ts`). Each function here is
 * handed to `page.evaluate`, so it is self-contained: no imports, no
 * closures over module state, plain syntax only.
 *
 * The collector discovers its populations structurally, from computed
 * styles and the accessibility tree, before it reads any annotation; an
 * annotation the page could simply omit never shrinks a population. Every
 * finding is recorded, including the ones a registered exemption covers,
 * so the reader can refuse an exemption that is not registered for that
 * predicate or that route.
 */

export type CollectorExemption = {
  id: string;
  selector: string;
  predicates: readonly string[];
  /** Spacing exemptions only: the computed properties the geometry reason covers. */
  properties?: readonly string[];
  /** Spacing exemptions only: the exact used values the geometry reason covers. */
  valuesPx?: readonly number[];
};

export type GlobalConvergenceCollectorInput = {
  minimumInlinePaddingPx: number;
  exemptions: readonly CollectorExemption[];
  figureSelector: string;
  /** Text set in the featured-article and featured-scene roles. */
  featureSelector: string;
  frameOwners: ReadonlyArray<{ id: string; selector: string }>;
  ladderPx: readonly number[];
  /** The registered grid devices, each with the alignment tolerance its row declares. */
  registeredDevices: ReadonlyArray<{ id: string; tolerancePx: number }>;
  /** The registered materials a surface may declare. */
  materialIds: readonly string[];
  /** Text whose case is its meaning (lib/notation-case.ts), as a regex source. */
  caseSensitivePattern: string;
  /** Strings whose case is the public identity and is never converted. */
  identityStrings: readonly string[];
  /** How far a major block may sit from a line of its frame (`VAL-B2-GRID-001`). */
  compositionTolerancePx: number;
  /** The text contrast a declared material's ground has to clear for its own text. */
  materialContrastFloor: number;
};

export type CollectedFinding = {
  predicate: string;
  element: string;
  detail: string;
  exemption: string | null;
};

export type CollectedTypeTuple = {
  population: string;
  family: string;
  weight: number;
  sizePx: number;
  lineHeightRatio: number;
  trackingEm: number;
  transform: string;
  /** Sub- and superscripts only: their size over the size of the line they sit on. */
  parentSizeRatio: number;
  /** The widest rendered line of the element's text. */
  maxLineWidthPx: number;
  count: number;
  element: string;
  text: string;
  exemption: string | null;
};

export type CollectedSpacingValue = {
  valuePx: number;
  property: string;
  count: number;
  element: string;
  exemption: string | null;
};

export type CollectedPage = {
  counts: Record<string, number>;
  findings: CollectedFinding[];
  typeTuples: CollectedTypeTuple[];
  spacingTokens: Array<{ name: string; valuePx: number }>;
  /** Every first-party spacing value that is neither on the ladder nor an `auto` margin. */
  offLadderSpacing: CollectedSpacingValue[];
  frame: {
    owners: string[];
    wideFrameWidthPx: number | null;
    readingColumnWidthPx: number | null;
    /** The content box of the frame that owns the page's h1. */
    frameContentWidthPx: number | null;
    /** The width of a `0` in the owning frame's font: the `ch` its measure is read in. */
    frameCh: number | null;
    widestParagraphPx: number;
  };
  sectionGaps: Array<{ element: string; gapPx: number; exemption: string | null }>;
  componentInteriors: Array<{ element: string; paddingPx: number[]; exemption: string | null }>;
  controlGaps: Array<{ element: string; gapPx: number; exemption: string | null }>;
  /**
   * Every string a reader can reach in `main`, painted or behind a
   * disclosure, folded into one order-free digest, so two widths of a route
   * can be compared for lost content (`VAL-B2-GRID-007`).
   */
  content: { strings: number; digest: string };
};

export type CollectedFocusStop = {
  element: string;
  outlineStyle: string;
  outlineWidthPx: number;
  outlineColour: string;
  outlineOffsetPx: number;
  obscuredBy: string | null;
  /** A register entry that excuses this stop from the ring entirely. */
  exemption: string | null;
  /** A register entry that excuses only the ring's offset. */
  offsetExemption: string | null;
};

/** Runs in the page: every population the global rows quantify over. */
export function collectGlobalConvergence(
  input: GlobalConvergenceCollectorInput,
): CollectedPage {
  type RGBA = { r: number; g: number; b: number; a: number };
  const styles = new Map<Element, CSSStyleDeclaration>();
  const style = (element: Element) => {
    let computed = styles.get(element);
    if (!computed) {
      computed = getComputedStyle(element);
      styles.set(element, computed);
    }
    return computed;
  };
  const rgba = (value: string): RGBA | null => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (c: RGBA) =>
    0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  const contrast = (left: RGBA, right: RGBA) => {
    const [high, low] = [luminance(left), luminance(right)].sort((a, b) => b - a);
    return (high + 0.05) / (low + 0.05);
  };
  const blend = (top: RGBA, under: RGBA): RGBA => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });
  const chroma = (c: RGBA) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  const near = (c: RGBA | null, r: number, g: number, b: number, tolerance = 3) =>
    !!c &&
    c.a > 0 &&
    Math.abs(c.r - r) <= tolerance &&
    Math.abs(c.g - g) <= tolerance &&
    Math.abs(c.b - b) <= tolerance;
  const isAccent = (c: RGBA | null) => near(c, 59, 110, 168);
  const isHighlightGrey = (c: RGBA | null) => near(c, 163, 163, 158);
  const isRetired = (c: RGBA | null) =>
    near(c, 36, 95, 255, 1) || near(c, 36, 94, 219, 1) || near(c, 198, 255, 25, 1);
  const isPaperLike = (c: RGBA | null) =>
    !c || c.a === 0 || (c.r >= 246 && c.g >= 246 && c.b >= 244 && chroma(c) <= 6);
  const isInk = (c: RGBA | null) =>
    !!c && c.a >= 0.99 && c.r < 48 && c.g < 48 && c.b < 48 && chroma(c) <= 12;
  const PAPER: RGBA = { r: 250, g: 250, b: 248, a: 1 };
  const ground = (element: Element | null): RGBA => {
    const layers: RGBA[] = [];
    for (let node = element; node; node = node.parentElement) {
      const c = rgba(style(node).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let base = PAPER;
    for (const layer of layers.reverse()) base = blend(layer, base);
    return base;
  };
  const name = (element: Element) => {
    const id = element.id ? `#${element.id}` : '';
    const data = [...element.attributes]
      .filter((attribute) => attribute.name.startsWith('data-'))
      .slice(0, 2)
      .map(
        (attribute) =>
          `[${attribute.name}${attribute.value ? `="${attribute.value.slice(0, 32)}"` : ''}]`,
      )
      .join('');
    const className =
      typeof (element as HTMLElement).className === 'string' &&
      (element as HTMLElement).className.trim()
        ? `.${(element as HTMLElement).className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : '';
    return `${element.tagName.toLowerCase()}${id}${data}${className}`.slice(0, 140);
  };
  const textOf = (element: Element) =>
    (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const px = (value: string) => parseFloat(value) || 0;
  const family = (element: Element) =>
    style(element).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  /**
   * Painted: rendered, with area, not clipped away by a visually-hidden
   * pattern or an ancestor with no area, and not parked outside the
   * document where no scroll can reach it (the skip link at rest). This is
   * what keeps hidden KaTeX MathML, closed folds, screen-reader-only titles
   * and the resting skip link out of every visual population.
   */
  const paintedCache = new Map<Element, boolean>();
  const painted = (element: Element): boolean => {
    const cached = paintedCache.get(element);
    if (cached !== undefined) return cached;
    let result = true;
    const checkable = element as Element & {
      checkVisibility?: (options: Record<string, boolean>) => boolean;
    };
    if (
      checkable.checkVisibility &&
      !checkable.checkVisibility({
        contentVisibilityAuto: true,
        opacityProperty: true,
        visibilityProperty: true,
      })
    ) {
      result = false;
    }
    const rect = element.getBoundingClientRect();
    if (result && (rect.width === 0 || rect.height === 0)) result = false;
    if (result && (rect.bottom + scrollY <= 0 || rect.right + scrollX <= 0)) {
      result = false;
    }
    if (result) {
      for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
        const s = style(node);
        if (s.clip && s.clip !== 'auto') {
          result = false;
          break;
        }
        if (/inset\(\s*50%/.test(s.clipPath)) {
          result = false;
          break;
        }
        if (node !== element && (s.overflowX !== 'visible' || s.overflowY !== 'visible')) {
          const box = node.getBoundingClientRect();
          if (box.width <= 1 || box.height <= 1) {
            result = false;
            break;
          }
        }
      }
    }
    paintedCache.set(element, result);
    return result;
  };
  const inFigure = (element: Element) => !!element.closest(input.figureSelector);
  const exemptionFor = (
    element: Element,
    predicate: string,
    property?: string,
    valuePx?: number,
  ): string | null => {
    for (const exemption of input.exemptions) {
      if (!exemption.predicates.includes(predicate)) continue;
      if (property && exemption.properties && !exemption.properties.includes(property)) continue;
      if (valuePx !== undefined && exemption.valuesPx && !exemption.valuesPx.includes(valuePx)) continue;
      if (element.closest(exemption.selector)) return exemption.id;
    }
    return null;
  };
  const findings: CollectedFinding[] = [];
  const seenFindings = new Set<string>();
  const find = (predicate: string, element: Element, detail: string) => {
    const key = `${predicate} ${name(element)} ${detail}`;
    if (seenFindings.has(key)) return;
    seenFindings.add(key);
    findings.push({
      predicate,
      element: name(element),
      detail,
      exemption: exemptionFor(element, predicate),
    });
  };
  const counts: Record<string, number> = {};
  const count = (key: string, by = 1) => {
    counts[key] = (counts[key] ?? 0) + by;
  };

  const everything = [...document.querySelectorAll('body *')].filter(
    (element) =>
      !element.closest('template, noscript, script, style, [hidden]') &&
      painted(element),
  );
  count('paintedElements', everything.length);

  // ---- Actions (VAL-B2-COL-004, VAL-B2-COMP-001) -------------------------
  const disabled = (element: Element) =>
    (element as HTMLButtonElement).disabled === true ||
    element.getAttribute('aria-disabled') === 'true';
  const actionSelector =
    'button, [role="button"], a[data-brand-control-id], input[type="submit"], input[type="button"], input[type="reset"]';
  for (const action of document.querySelectorAll(actionSelector)) {
    if (!painted(action)) continue;
    const s = style(action);
    const fill = rgba(s.backgroundColor);
    const ink = rgba(s.color);
    const control = action.getAttribute('data-brand-control-id');
    count('actions');
    if (disabled(action)) {
      count('disabledActions');
      if ((fill && fill.a > 0 && chroma(fill) > 30) || (ink && chroma(ink) > 30)) {
        find('disabled-neutral', action, `disabled action paints ${s.backgroundColor} / ${s.color}`);
      }
      continue;
    }
    if (control === 'control:primary-action') {
      count('primaryActions');
      const under = fill && fill.a > 0 ? blend(fill, ground(action.parentElement)) : ground(action.parentElement);
      const label = ink ? blend(ink, under) : null;
      const ratio = label ? contrast(label, under) : 0;
      if (!isInk(fill) || ratio < 4.5 || luminance(label ?? PAPER) < luminance(under)) {
        find(
          'primary-ink-fill',
          action,
          `fill ${s.backgroundColor}, label ${s.color}, contrast ${ratio.toFixed(2)}`,
        );
      }
      continue;
    }
    if (fill && fill.a > 0 && chroma(fill) > 30) {
      find('action-colour-fill', action, `action filled ${s.backgroundColor}`);
    }
    if (control === 'control:secondary-action') {
      count('secondaryActions');
      if (!isPaperLike(fill) && !(fill && fill.a > 0 && chroma(fill) <= 12 && luminance(fill) > 0.8)) {
        find('secondary-quiet', action, `secondary action filled ${s.backgroundColor}`);
      } else if (ink && chroma(ink) > 30) {
        find('secondary-quiet', action, `secondary action label ${s.color}`);
      }
    }
  }

  // ---- Persistent state (VAL-B2-COL-005, VAL-B2-COL-007) -----------------
  const statefulSelector =
    '[aria-pressed="true"], [aria-selected="true"], [aria-checked="true"], [aria-current]:not([aria-current="false"]), [data-map-tile][aria-expanded="true"]';
  const stateAttributes = ['aria-pressed', 'aria-selected', 'aria-checked', 'aria-current'];
  const cues = (element: Element) => {
    const s = style(element);
    const rules = ['top', 'right', 'bottom', 'left']
      .filter((side) => {
        const width = px(s.getPropertyValue(`border-${side}-width`));
        const kind = s.getPropertyValue(`border-${side}-style`);
        const colour = rgba(s.getPropertyValue(`border-${side}-color`));
        return width >= 1 && kind !== 'none' && kind !== 'hidden' && !!colour && colour.a > 0.5;
      })
      .join('');
    const underline = s.textDecorationLine.includes('underline') ? 'underline' : '';
    const outline = s.outlineStyle !== 'none' && px(s.outlineWidth) >= 1 ? 'outline' : '';
    const marker =
      [...element.querySelectorAll('svg, [aria-hidden="true"]')].some(painted) ? 'glyph' : '';
    return { weight: Number(s.fontWeight), rules, underline, outline, marker };
  };
  for (const element of document.querySelectorAll(statefulSelector)) {
    if (!painted(element)) continue;
    if (element.tagName === 'HTML' || element.tagName === 'BODY') continue;
    count('persistentStates');
    const s = style(element);
    const fill = rgba(s.backgroundColor);
    const ink = rgba(s.color);
    const figure = inFigure(element);
    if (!figure && fill && fill.a > 0 && !isPaperLike(fill) && !isInk(fill)) {
      find('selection-fill', element, `selected state filled ${s.backgroundColor}`);
    }
    if (!figure && ink && (isAccent(ink) || chroma(ink) > 40)) {
      find('selection-colour-text', element, `selected state text ${s.color}`);
    }
    const attribute = stateAttributes.find((key) => element.hasAttribute(key)) ?? 'aria-expanded';
    const own = cues(element);
    const peer = [...(element.parentElement?.parentElement?.querySelectorAll(element.tagName) ?? [])].find(
      (candidate) =>
        candidate !== element &&
        painted(candidate) &&
        !candidate.matches(statefulSelector) &&
        candidate.parentElement?.parentElement === element.parentElement?.parentElement,
    );
    const ownHasCue = own.weight >= 500 || own.rules || own.underline || own.outline || own.marker;
    let distinct = !!ownHasCue;
    if (peer) {
      const other = cues(peer);
      distinct =
        own.weight !== other.weight ||
        own.rules !== other.rules ||
        own.underline !== other.underline ||
        own.outline !== other.outline ||
        own.marker !== other.marker;
    }
    if (!distinct && !figure) {
      find(
        'state-non-colour-cue',
        element,
        `${attribute}="${element.getAttribute(attribute)}" differs from ${peer ? name(peer) : 'nothing'} only by colour (weight ${own.weight}, rules "${own.rules}", ${own.underline || 'no underline'})`,
      );
    }
  }

  // ---- Paint, links, gradients, shape ----------------------------------
  const paintProperties = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
  ] as const;
  const successWords = /(^|\s)(✓|✔|success(ful|fully)?|succeeded|passed|correct)(\s|[.,!]|$)/i;
  const warningSelector =
    '[role="alert"], [data-tone="warn"], [data-tone="warning"], [data-tone="error"], [data-state="warning"], [data-state="error"], .warning, .callout-warning';
  for (const element of everything) {
    const s = style(element);
    const figure = inFigure(element);
    for (const property of paintProperties) {
      const c = rgba(s[property]);
      if (!c || c.a === 0) continue;
      if (property.startsWith('border')) {
        const side = property.replace('border', '').replace('Color', '').toLowerCase();
        if (px(s.getPropertyValue(`border-${side}-width`)) === 0 || s.getPropertyValue(`border-${side}-style`) === 'none') continue;
      }
      if (property === 'outlineColor' && (s.outlineStyle === 'none' || px(s.outlineWidth) === 0)) continue;
      if (property === 'textDecorationColor' && !s.textDecorationLine.includes('underline')) continue;
      if (isRetired(c)) {
        find('retired-paint', element, `${property} ${s[property]}`);
      } else if (isAccent(c) && !figure) {
        find('accent-outside-figure', element, `${property} ${s[property]}`);
      }
      if ((isAccent(c) || isHighlightGrey(c)) && (property === 'color' || property === 'backgroundColor')) {
        const own = [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? '')
          .join(' ');
        const label = `${own} ${element.getAttribute('aria-label') ?? ''}`;
        if (successWords.test(label)) {
          find('success-in-grey-or-accent', element, `"${label.trim().slice(0, 30)}" paints ${property} ${s[property]}`);
        }
      }
      if (isAccent(c) && element.matches(warningSelector)) {
        find('accent-as-warning', element, `warning state paints ${property} ${s[property]}`);
      }
    }
    if (/gradient\(/.test(s.backgroundImage)) {
      count('gradients');
      const host = element.closest('figure');
      const caption = host?.querySelector('figcaption');
      const described = !!caption && (caption.textContent ?? '').trim().length > 0;
      if (!figure || !described) {
        find('gradient', element, s.backgroundImage.slice(0, 80));
      }
    }
    const radius = Math.max(
      px(s.borderTopLeftRadius),
      px(s.borderTopRightRadius),
      px(s.borderBottomLeftRadius),
      px(s.borderBottomRightRadius),
    );
    if (radius > 0 && !figure) {
      const native =
        element.tagName === 'INPUT' &&
        ['range', 'radio', 'checkbox'].includes((element as HTMLInputElement).type);
      if (!native) {
        const rect = element.getBoundingClientRect();
        const capsule = radius >= Math.min(rect.width, rect.height) / 2 - 0.5;
        find(capsule ? 'capsule' : 'rounded-corner', element, `${radius}px radius on ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }
  }
  for (const gradient of document.querySelectorAll('svg linearGradient, svg radialGradient')) {
    count('svgGradients');
    const host = gradient.closest('figure');
    const caption = host?.querySelector('figcaption');
    if (!host || !caption || (caption.textContent ?? '').trim().length === 0) {
      find('gradient', gradient, 'an SVG gradient outside a captioned figure');
    }
  }
  for (const link of document.querySelectorAll('a[href]')) {
    if (!painted(link) || inFigure(link)) continue;
    count('links');
    const c = rgba(style(link).color);
    if (c && chroma(c) > 30) {
      find('link-hue', link, `link ${style(link).color} "${textOf(link)}"`);
    }
  }

  // ---- Text and boundary contrast (VAL-B2-COL-008) -----------------------
  const contrastSeen = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    if (!element || contrastSeen.has(element) || !(node.textContent ?? '').trim()) continue;
    contrastSeen.add(element);
    if (element.closest('svg, canvas, script, style, noscript, template, [hidden], [aria-hidden="true"]')) continue;
    if (!painted(element)) continue;
    // WCAG 1.4.3 exempts the text of an inactive control; it is counted so a
    // control that is merely faded, not disabled, still meets 4.5:1.
    if (element.closest(':disabled, [aria-disabled="true"]')) {
      count('disabledTextRuns');
      continue;
    }
    const s = style(element);
    const fg = rgba(s.color);
    if (!fg) continue;
    let opacity = 1;
    for (let n: Element | null = element; n; n = n.parentElement) opacity *= Number(style(n).opacity);
    count('textRuns');
    const under = ground(element);
    const effective = blend({ ...fg, a: fg.a * opacity }, under);
    const size = px(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const ratio = contrast(effective, under);
    if (ratio < need) {
      find(
        'text-contrast',
        element,
        `${ratio.toFixed(2)} < ${need}: ${s.color} at opacity ${opacity.toFixed(2)} on rgb(${Math.round(under.r)}, ${Math.round(under.g)}, ${Math.round(under.b)}) "${textOf(element)}"`,
      );
    }
  }
  for (const field of document.querySelectorAll(
    'input:not([type="hidden"]):not([type="range"]):not([type="radio"]):not([type="checkbox"]), select, textarea',
  )) {
    if (!painted(field)) continue;
    count('fields');
    const s = style(field);
    const under = ground(field.parentElement);
    let best = 0;
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const width = px(s.getPropertyValue(`border-${side}-width`));
      const kind = s.getPropertyValue(`border-${side}-style`);
      const colour = rgba(s.getPropertyValue(`border-${side}-color`));
      if (width < 1 || kind === 'none' || !colour) continue;
      best = Math.max(best, contrast(blend(colour, under), under));
    }
    const fill = rgba(s.backgroundColor);
    if (fill && fill.a > 0) best = Math.max(best, contrast(blend(fill, under), under));
    if (best < 3) {
      find('boundary-contrast', field, `strongest boundary ${best.toFixed(2)} < 3`);
    }
  }

  // ---- Frames, cards, repetition (VAL-B2-COMP-006, VAL-B2-COMP-016) ------
  const shell = 'html, body, main, header, footer, nav, article, aside';
  const fourSided = (element: Element) => {
    const s = style(element);
    return ['top', 'right', 'bottom', 'left'].every((side) => {
      const width = px(s.getPropertyValue(`border-${side}-width`));
      const kind = s.getPropertyValue(`border-${side}-style`);
      const colour = rgba(s.getPropertyValue(`border-${side}-color`));
      return width >= 1 && kind !== 'none' && kind !== 'hidden' && !!colour && colour.a > 0;
    });
  };
  const filled = (element: Element) => {
    const fill = rgba(style(element).backgroundColor);
    if (!fill || fill.a === 0) return false;
    const under = ground(element.parentElement);
    return contrast(blend(fill, under), under) > 1.04;
  };
  const isFrame = (element: Element) => {
    if (element.matches(shell)) return false;
    if (element.matches('button, a, input, select, textarea, summary, label, option, kbd, code, mark, sup, sub, span')) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width * rect.height < 2_000) return false;
    return fourSided(element) || filled(element);
  };
  const frames = everything.filter(isFrame);
  const frameSet = new Set(frames);
  count('frames', frames.length);
  const codeBlock = '[data-rehype-pretty-code-figure], pre';
  const registeredInterior = (element: Element) =>
    !!element.closest(codeBlock) ||
    element.matches(
      'table, figure, svg, canvas, img, video, iframe, fieldset, [role="group"], [role="radiogroup"], [role="tablist"], [role="toolbar"], [data-figure-frame]',
    ) ||
    !!element.querySelector(':scope > table, :scope > pre, :scope > svg, :scope > canvas, :scope > img, :scope > video');
  for (const frame of frames) {
    let depth = 1;
    let parentFrame: Element | null = null;
    for (let node = frame.parentElement; node; node = node.parentElement) {
      if (frameSet.has(node)) {
        depth += 1;
        parentFrame = parentFrame ?? node;
      }
    }
    if (depth > 2) {
      find('frame-depth', frame, `frame depth ${depth}`);
    } else if (depth === 2 && parentFrame) {
      if (fourSided(frame) && fourSided(parentFrame) && !registeredInterior(frame)) {
        find('nested-frame', frame, `a four-sided frame inside ${name(parentFrame)}`);
      }
    }
  }
  const signature = (element: Element) => {
    const s = style(element);
    const surface = `${fourSided(element) ? 'border' : ''}${filled(element) ? `fill:${s.backgroundColor}` : ''}`;
    const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
    const headingForm = heading ? `${heading.tagName}:${style(heading).fontSize}` : 'none';
    const action = element.matches('a, button')
      ? element.tagName
      : element.querySelector('a, button')?.tagName ?? 'none';
    return `${surface}|${headingForm}|${action}`;
  };
  const parents = new Set(frames.map((frame) => frame.parentElement).filter(Boolean) as Element[]);
  for (const parent of parents) {
    let run = 0;
    let previous = '';
    let longest = 0;
    let first: Element | null = null;
    for (const child of parent.children) {
      if (!frameSet.has(child)) {
        run = 0;
        previous = '';
        continue;
      }
      const current = signature(child);
      run = current === previous ? run + 1 : 1;
      previous = current;
      if (run > longest) {
        longest = run;
        first = child;
      }
    }
    if (longest > 3 && first) {
      find('repeated-signature', first, `${longest} adjacent sibling frames share ${signature(first)}`);
    }
    const cards = [...parent.children].filter((child) => frameSet.has(child));
    if (cards.length >= 4) {
      const sizes = cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      });
      const tops = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)));
      const lefts = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left)));
      if (new Set(sizes).size === 1 && tops.size >= 2 && lefts.size >= 2) {
        find('bento-grid', parent, `${cards.length} equal ${sizes[0]} cards in a ${lefts.size}-column grid`);
      }
    }
  }
  for (const frame of frames) {
    if (inFigure(frame) || registeredInterior(frame)) continue;
    count('cards');
    const content =
      !!frame.querySelector('h1, h2, h3, h4, h5, h6, a[href], button, input, select, textarea, table, figure, dl, ul, ol, p, pre, blockquote') ||
      (frame.textContent ?? '').trim().length >= 24;
    if (!content) {
      find('empty-card', frame, `framed box with no heading, action, list, table or prose: "${textOf(frame)}"`);
    }
  }

  // ---- Citations (VAL-B2-COMP-008) --------------------------------------
  for (const mark of document.querySelectorAll('.cite-mark a')) {
    count('citationMarks');
    const accessible = (mark.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!/^Source \d+$/.test(accessible)) {
      find('citation-language', mark, `numbered mark reads "${accessible}"`);
    }
    const href = mark.getAttribute('href') ?? '';
    const target = href.startsWith('#') ? document.getElementById(decodeURIComponent(href.slice(1))) : null;
    const targetSources = target
      ? [...target.querySelectorAll('a[href^="http"]')].map((link) => link.getAttribute('href'))
      : [];
    if (!target || targetSources.length === 0) {
      find('citation-target', mark, `${href} resolves to ${target ? 'an entry with no source link' : 'nothing on the page'}`);
    }
    const noteId = mark.getAttribute('aria-describedby') ?? '';
    const note = noteId ? document.getElementById(noteId) : null;
    const noteSource = note?.querySelector('a[href^="http"]')?.getAttribute('href') ?? null;
    if (!note || !noteSource) {
      find('citation-target', mark, `the margin note ${noteId || '(none)'} carries no source link`);
    } else if (targetSources.length > 0 && !targetSources.includes(noteSource)) {
      find('citation-target', mark, `the margin note cites ${noteSource}, which the reference entry ${href} does not`);
    }
  }
  for (const label of document.querySelectorAll('.cite > a.cite-label')) {
    count('citationLabels');
    const href = label.getAttribute('href') ?? '';
    const noteId = label.getAttribute('aria-describedby') ?? '';
    const note = noteId ? document.getElementById(noteId) : null;
    if (!/^https?:\/\//.test(href) || !note || (note.textContent ?? '').trim().length === 0) {
      find('citation-target', label, `author-year citation ${href || '(no href)'} has no described source`);
    }
  }

  // ---- Page-inline padding (VAL-B2-SPACE-002) ---------------------------
  const viewportWidth = document.documentElement.clientWidth;
  const minimum = input.minimumInlinePaddingPx;
  const paddingWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const scrollerCache = new Map<Element, boolean>();
  const insideScroller = (element: Element) => {
    for (let n: Element | null = element; n && n !== document.body; n = n.parentElement) {
      const cached = scrollerCache.get(n);
      if (cached !== undefined) {
        if (cached) return true;
        continue;
      }
      const s = style(n);
      const scrolls = (s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth;
      scrollerCache.set(n, scrolls);
      if (scrolls) return true;
    }
    return false;
  };
  for (let node = paddingWalker.nextNode(); node; node = paddingWalker.nextNode()) {
    const element = node.parentElement;
    if (!element || !(node.textContent ?? '').trim()) continue;
    if (element.closest('svg, canvas, script, style, noscript, template, [hidden], [role="dialog"], dialog')) continue;
    if (!painted(element) || insideScroller(element)) continue;
    count('insetTextRuns');
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width < 1) continue;
      const left = rect.left;
      const right = viewportWidth - rect.right;
      if (left < minimum - 0.5 || right < minimum - 0.5) {
        find('inline-padding', element, `text ${Math.round(left)}px / ${Math.round(right)}px from the edges, under ${minimum}px: "${textOf(element)}"`);
        break;
      }
    }
  }

  // ---- Collisions (VAL-B2-SPACE-006) ------------------------------------
  const textBoxes: Array<{ element: Element; rect: DOMRect }> = [];
  const collisionWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = collisionWalker.nextNode(); node; node = collisionWalker.nextNode()) {
    const element = node.parentElement;
    if (!element || !(node.textContent ?? '').trim()) continue;
    if (element.closest('svg, canvas, script, style, noscript, template, [hidden], [aria-hidden="true"]')) continue;
    if (!painted(element)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width < 2 || rect.height < 2) continue;
      textBoxes.push({ element, rect });
    }
  }
  count('collisionTextBoxes', textBoxes.length);
  const bucketSize = 64;
  const buckets = new Map<string, number[]>();
  textBoxes.forEach(({ rect }, index) => {
    const top = Math.floor((rect.top + scrollY) / bucketSize);
    const bottom = Math.floor((rect.bottom + scrollY) / bucketSize);
    for (let row = top; row <= bottom; row += 1) {
      const key = String(row);
      const list = buckets.get(key) ?? [];
      list.push(index);
      buckets.set(key, list);
    }
  });
  const reported = new Set<string>();
  for (const list of buckets.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = textBoxes[list[i]];
        const b = textBoxes[list[j]];
        if (a.element === b.element) continue;
        if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
        const width = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const height = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (width <= 2 || height <= Math.min(a.rect.height, b.rect.height) * 0.3) continue;
        const key = `${list[i]}:${list[j]}`;
        if (reported.has(key)) continue;
        reported.add(key);
        find('text-collision', a.element, `overlaps ${name(b.element)} by ${Math.round(width)}x${Math.round(height)}px: "${textOf(a.element)}" / "${textOf(b.element)}"`);
      }
    }
  }
  for (const element of everything) {
    if (element.closest('svg, canvas')) continue;
    const s = style(element);
    const clipsX = s.overflowX === 'hidden' || s.overflowX === 'clip';
    if (!clipsX || s.textOverflow === 'ellipsis') continue;
    const own = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim(),
    );
    if (!own) continue;
    if (element.scrollWidth > element.clientWidth + 1) {
      find('clipped-text', element, `scrollWidth ${element.scrollWidth} > clientWidth ${element.clientWidth}: "${textOf(element)}"`);
    }
  }
  for (const heading of document.querySelectorAll('h1, h2, h3')) {
    if (!painted(heading) || heading.closest('svg')) continue;
    count('headings');
    if (heading.scrollWidth > heading.clientWidth + 1 && style(heading).overflowX !== 'visible') {
      find('clipped-text', heading, `heading scrolls ${heading.scrollWidth} in ${heading.clientWidth}`);
    }
    // A word may wrap at its own hyphen, dash or slash; a break inside one
    // of the pieces between them is the unreadable wrap.
    const headingWalker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    for (let node = headingWalker.nextNode(); node; node = headingWalker.nextNode()) {
      const text = node.textContent ?? '';
      const pattern = /[^\s\-‐‑–—/]+/g;
      for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        if (match[0].length < 2) continue;
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const lines = new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top)));
        if (lines.size > 1) {
          find('broken-word', heading, `"${match[0]}" breaks across ${lines.size} lines`);
        }
      }
    }
  }

  // ---- Frame geometry and ownership (VAL-B2-SPACE-004, VAL-B2-SPACE-005) --
  const main = document.querySelector('main');
  const anchor = main?.querySelector('h1') ?? main?.firstElementChild ?? null;
  const owners = anchor
    ? input.frameOwners.filter(({ selector }) => !!anchor.closest(selector)).map(({ id }) => id)
    : [];
  const proseColumn = document.querySelector('[data-prose-column]');
  let wideFrameWidthPx: number | null = null;
  if (proseColumn && painted(proseColumn)) {
    const s = style(proseColumn);
    wideFrameWidthPx = Math.round(proseColumn.getBoundingClientRect().width - px(s.paddingLeft) - px(s.paddingRight));
  }
  const prose = document.querySelector('[data-prose-column] .prose, article .prose');
  const readingColumnWidthPx = prose && painted(prose) ? Math.round(prose.getBoundingClientRect().width) : null;
  const ownerElement = anchor
    ? input.frameOwners.map(({ selector }) => anchor.closest(selector)).find(Boolean) ?? null
    : null;
  let frameContentWidthPx: number | null = null;
  let frameCh: number | null = null;
  if (ownerElement) {
    const s = style(ownerElement);
    frameContentWidthPx = Math.round(
      ownerElement.getBoundingClientRect().width - px(s.paddingLeft) - px(s.paddingRight),
    );
    const context = document.createElement('canvas').getContext('2d');
    if (context) {
      context.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      frameCh = Math.round(context.measureText('0').width * 100) / 100;
    }
  }
  let widestParagraphPx = 0;
  for (const paragraph of document.querySelectorAll('main p')) {
    if (!painted(paragraph) || inFigure(paragraph)) continue;
    count('paragraphs');
    widestParagraphPx = Math.max(widestParagraphPx, Math.round(paragraph.getBoundingClientRect().width));
  }

  // ---- Separation, interiors, control gaps (VAL-B2-SPACE-003) ----------
  // A major section is opened by an h2 set at section size (18 px or more);
  // the smaller h2s that label a glossary entry, a map segment or a tool
  // panel are sub-heads inside a section.
  const sectionGaps: CollectedPage['sectionGaps'] = [];
  for (const heading of document.querySelectorAll('main h2')) {
    if (!painted(heading) || inFigure(heading) || heading.closest('aside, nav, [role="dialog"]')) continue;
    if (px(style(heading).fontSize) < 18) continue;
    count('sectionHeads');
    let previous: Element | null = null;
    for (let node: Element | null = heading; node && node !== main && !previous; node = node.parentElement) {
      for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
        const s = style(sibling);
        if (painted(sibling) && s.position !== 'absolute' && s.position !== 'fixed' && s.float === 'none') {
          previous = sibling;
          break;
        }
      }
    }
    if (!previous) continue;
    const gap = heading.getBoundingClientRect().top - previous.getBoundingClientRect().bottom;
    sectionGaps.push({ element: name(heading), gapPx: Math.round(gap * 10) / 10, exemption: exemptionFor(heading, 'section-separation') });
  }
  const componentInteriors: CollectedPage['componentInteriors'] = [];
  for (const frame of frames) {
    if (frame.closest(codeBlock) || frame.matches('table, img, video, canvas, svg')) continue;
    if (inFigure(frame) && !frame.matches('figure')) continue;
    const s = style(frame);
    const padding = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((value) => Math.round(px(value) * 10) / 10);
    componentInteriors.push({ element: name(frame), paddingPx: padding, exemption: exemptionFor(frame, 'component-interior') });
  }
  const controlGaps: CollectedPage['controlGaps'] = [];
  const controlish = 'button, input:not([type="hidden"]), select, [role="tab"], [role="radio"], [role="switch"]';
  const groupSelector = '[role="group"], [role="radiogroup"], [role="tablist"], [role="toolbar"], [data-brand-control-id="control:segmented"]';
  const measuredPairs = new Set<string>();
  for (const group of document.querySelectorAll(groupSelector)) {
    if (!painted(group) || inFigure(group)) continue;
    const controls = [...group.querySelectorAll(controlish)].filter((control) => painted(control) && control.closest(groupSelector) === group);
    for (let i = 1; i < controls.length; i += 1) {
      const left = controls[i - 1];
      const right = controls[i];
      if (left.parentElement !== right.parentElement) continue;
      const a = left.getBoundingClientRect();
      const b = right.getBoundingClientRect();
      if (Math.abs(a.top - b.top) > 2) continue;
      const gap = b.left - a.right;
      // Segments of one outer frame share their edge (VAL-B2-COMP-003): a
      // joined pair is one control, not two related ones.
      if (gap <= 0.5) {
        count('joinedSegments');
        continue;
      }
      const key = `${name(left)}|${name(right)}`;
      if (measuredPairs.has(key)) continue;
      measuredPairs.add(key);
      controlGaps.push({ element: name(right), gapPx: Math.round(gap * 10) / 10, exemption: exemptionFor(right, 'control-gap') });
    }
  }

  // ---- Spacing ladder (VAL-B2-SPACE-001) --------------------------------
  const spacingTokens: CollectedPage['spacingTokens'] = [];
  const rootStyle = getComputedStyle(document.documentElement);
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    const visit = (list: CSSRuleList) => {
      for (const rule of list) {
        if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules && !(rule instanceof CSSStyleRule)) {
          visit((rule as CSSGroupingRule).cssRules);
          continue;
        }
        if (!(rule instanceof CSSStyleRule)) continue;
        for (const property of rule.style) {
          if (!property.startsWith('--space-')) continue;
          if (spacingTokens.some((token) => token.name === property)) continue;
          spacingTokens.push({ name: property, valuePx: px(rootStyle.getPropertyValue(property).trim()) });
        }
      }
    };
    visit(rules);
  }
  const ladder = new Set(input.ladderPx);
  const spacing = new Map<string, CollectedSpacingValue>();
  const spacingProperties = [
    ['paddingTop', 'padding-top'],
    ['paddingRight', 'padding-right'],
    ['paddingBottom', 'padding-bottom'],
    ['paddingLeft', 'padding-left'],
    ['marginTop', 'margin-top'],
    ['marginRight', 'margin-right'],
    ['marginBottom', 'margin-bottom'],
    ['marginLeft', 'margin-left'],
    ['rowGap', 'row-gap'],
    ['columnGap', 'column-gap'],
  ] as const;
  for (const element of everything) {
    if (inFigure(element) || element.closest('svg, canvas, .katex, pre, [data-rehype-pretty-code-figure]')) continue;
    const s = style(element);
    let typed: StylePropertyMapReadOnly | null = null;
    for (const [property, cssProperty] of spacingProperties) {
      const raw = s[property];
      if (raw === 'normal' || raw === 'auto') continue;
      const value = Math.round(Math.abs(px(raw)) * 100) / 100;
      if (value === 0) continue;
      count('spacingValues');
      if (ladder.has(value)) continue;
      if (property.startsWith('margin')) {
        // An auto margin is resolved from the viewport by layout (centring
        // a column, pushing a group to the far edge); its used value is not
        // a spacing choice. The typed computed value still says `auto`.
        typed = typed ?? (element as Element & { computedStyleMap?: () => StylePropertyMapReadOnly }).computedStyleMap?.() ?? null;
        const declared = typed?.get(cssProperty);
        if (declared && String(declared) === 'auto') {
          count('autoMargins');
          continue;
        }
      }
      const exemption = exemptionFor(element, 'spacing-ladder', property, value);
      const key = `${value}|${property}|${exemption ?? ''}`;
      const existing = spacing.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }
      spacing.set(key, { valuePx: value, property, count: 1, element: name(element), exemption });
    }
  }

  // ---- Type populations (VAL-B2-TYPE-018) -------------------------------
  const tuples = new Map<string, CollectedTypeTuple>();
  const recorded = new Set<Element>();
  // The measure is the widest rendered line, not the box: a short heading in
  // a wide container still reads as a short line.
  // Only text in the element's own flow counts: a margin note or an
  // off-screen accessible label is positioned out of the line it sits in.
  const inFlow = (node: Element | null, root: Element) => {
    for (let n = node; n && n !== root; n = n.parentElement) {
      const position = style(n).position;
      if (position === 'absolute' || position === 'fixed') return false;
      if (n.matches('.sidenote, [data-sidenote]')) return false;
    }
    return !!node && painted(node);
  };
  const widestLine = (element: Element) => {
    const lines = new Map<number, { left: number; right: number }>();
    const textWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rects: DOMRect[] = [];
    for (let node = textWalker.nextNode(); node; node = textWalker.nextNode()) {
      if (!(node.textContent ?? '').trim() || !inFlow(node.parentElement, element)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...range.getClientRects());
    }
    for (const rect of rects) {
      if (rect.width < 1 || rect.height < 1) continue;
      const key = Math.round(rect.top + rect.height / 2);
      const line = [...lines.entries()].find(([middle]) => Math.abs(middle - key) <= rect.height / 3);
      if (line) {
        line[1].left = Math.min(line[1].left, rect.left);
        line[1].right = Math.max(line[1].right, rect.right);
      } else {
        lines.set(key, { left: rect.left, right: rect.right });
      }
    }
    let widest = 0;
    for (const { left, right } of lines.values()) widest = Math.max(widest, right - left);
    return Math.round(widest);
  };
  const record = (population: string, element: Element, predicate = 'type-range') => {
    if (!painted(element)) return;
    recorded.add(element);
    const s = style(element);
    const size = px(s.fontSize);
    const lineHeight = s.lineHeight === 'normal' ? 0 : Math.round((px(s.lineHeight) / size) * 100) / 100;
    const tracking = s.letterSpacing === 'normal' ? 0 : Math.round((px(s.letterSpacing) / size) * 1000) / 1000;
    const width = widestLine(element);
    const line = (element.closest('sub, sup') ?? element).parentElement;
    const parentSize = line ? px(style(line).fontSize) : size;
    const parentSizeRatio =
      population === 'script' && parentSize > 0 ? Math.round((size / parentSize) * 100) / 100 : 1;
    const exemption = exemptionFor(element, predicate);
    const key = `${population}|${family(element)}|${s.fontWeight}|${size}|${lineHeight}|${tracking}|${s.textTransform}|${parentSizeRatio}|${exemption ?? ''}`;
    const existing = tuples.get(key);
    if (existing) {
      existing.count += 1;
      existing.maxLineWidthPx = Math.max(existing.maxLineWidthPx, width);
      return;
    }
    tuples.set(key, {
      population,
      family: family(element),
      weight: Number(s.fontWeight),
      sizePx: size,
      lineHeightRatio: lineHeight,
      trackingEm: tracking,
      transform: s.textTransform,
      parentSizeRatio,
      maxLineWidthPx: width,
      count: 1,
      element: name(element),
      text: textOf(element),
      exemption,
    });
  };
  const ownText = (element: Element) =>
    [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim());
  const typeScope = (element: Element) =>
    !inFigure(element) && !element.closest('svg, .katex, pre, [data-rehype-pretty-code-figure], [aria-hidden="true"]');
  for (const heading of document.querySelectorAll('main h1')) {
    if (!typeScope(heading)) continue;
    record(heading.closest('article, [data-prose-column]') ? 'article-h1' : 'page-h1', heading);
  }
  for (const heading of document.querySelectorAll('main h2, main h3, main h4')) {
    if (!typeScope(heading) || recorded.has(heading)) continue;
    const sectionDisplay =
      heading.matches('.section-h2, .font-display-section, [data-tektur-role="section-display"]') ||
      (heading.tagName === 'H2' && !!heading.closest('.prose'));
    record(sectionDisplay ? 'section-display' : 'supporting-heading', heading);
  }
  // Reading body is the prose flow itself: its paragraphs and list items,
  // not a note or table caption a component sets inside the prose.
  const inProseFlow = (element: Element) => {
    if (!element.matches('.prose p, .prose li') || element.closest('.sidenote, [data-sidenote]')) return false;
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (node.classList.contains('prose')) return true;
      if (!['UL', 'OL', 'LI', 'BLOCKQUOTE'].includes(node.tagName)) return false;
    }
    return false;
  };
  for (const element of everything) {
    if (recorded.has(element) || !typeScope(element) || !ownText(element)) continue;
    if (element.closest('h1, h2, h3, h4, h5, h6')) continue;
    const s = style(element);
    const tracking = s.letterSpacing === 'normal' ? 0 : px(s.letterSpacing) / px(s.fontSize);
    const face = family(element);
    if (element.closest('sub, sup')) {
      record('script', element);
    } else if (element.closest(input.featureSelector)) {
      record('feature', element);
    } else if (s.textTransform === 'uppercase' && tracking >= 0.03 && px(s.fontSize) <= 14) {
      record('registration-label', element);
    } else if (/Mono/.test(face) || element.matches('code, kbd, samp')) {
      record('data-control', element);
    } else if (element.closest('[data-tektur-role]')) {
      record('display-instance', element);
    } else if (inProseFlow(element)) {
      record('reading-body', element);
    } else {
      record('ui-body', element);
    }
  }

  // ---- Devices and decorative layers (VAL-B2-GRID-002/-004/-005/-006) ---
  const edgeOf = (rect: DOMRect, edge: string) =>
    edge === 'right'
      ? rect.right
      : edge === 'top'
        ? rect.top
        : edge === 'bottom'
          ? rect.bottom
          : edge === 'center-x'
            ? rect.left + rect.width / 2
            : edge === 'center-y'
              ? rect.top + rect.height / 2
              : rect.left;
  const focusable =
    'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const tolerance = new Map(input.registeredDevices.map(({ id, tolerancePx }) => [id, tolerancePx]));
  /** A list item's ordinal as its list numbers it. */
  const ordinalOf = (item: Element | null) => {
    if (!item || item.tagName !== 'LI') return null;
    const list = item.parentElement;
    if (!list || list.tagName !== 'OL') return null;
    const start = Number(list.getAttribute('start') ?? '1') || 1;
    return start + [...list.children].filter((child) => child.tagName === 'LI').indexOf(item);
  };
  const deviceElements = [...document.querySelectorAll('[data-brand-device-id]')].filter(painted);
  for (const device of deviceElements) {
    count('registeredDevices');
    const id = device.getAttribute('data-brand-device-id') ?? '';
    let sound = true;
    if (!tolerance.has(id)) {
      find('unregistered-device', device, `${id} is not a registered grid device`);
      sound = false;
    }
    if (!device.getAttribute('data-brand-purpose') || !device.getAttribute('data-brand-owner')) {
      find('unregistered-device', device, `${id} states no structural purpose or owner`);
      sound = false;
    }
    const s = style(device);
    const exposed: string[] = [];
    if (!device.closest('[aria-hidden="true"]')) exposed.push('not aria-hidden');
    if (s.pointerEvents !== 'none') exposed.push(`pointer-events ${s.pointerEvents}`);
    if (device.matches(`${focusable}, [role]`) || device.querySelector(focusable)) exposed.push('focusable or given a role');
    if (exposed.length > 0) {
      find('device-exposed', device, `${id}: ${exposed.join(', ')}`);
      sound = false;
    }
    const selector = device.getAttribute('data-brand-anchor-selector') ?? '';
    let anchorElement: Element | null = null;
    try {
      anchorElement = selector ? document.querySelector(selector) : null;
    } catch {
      anchorElement = null;
    }
    if (!anchorElement || !painted(anchorElement)) {
      find('device-misaligned', device, `${id} names the anchor "${selector}", which is not painted on the page`);
      continue;
    }
    const error = Math.abs(
      edgeOf(device.getBoundingClientRect(), device.getAttribute('data-brand-device-edge') ?? 'left') -
        edgeOf(anchorElement.getBoundingClientRect(), device.getAttribute('data-brand-anchor-edge') ?? 'left'),
    );
    if (error > (tolerance.get(id) ?? 0) + 0.01) {
      find('device-misaligned', device, `${id} sits ${error.toFixed(1)}px off ${selector}`);
      sound = false;
    }
    // A sequence label is the reading position of the row it labels, never
    // a decorative number.
    const label = (device.textContent ?? '').trim();
    if (label) {
      const ordinal = ordinalOf(anchorElement.closest('li'));
      if (!/^\d+$/.test(label) || ordinal === null || Number(label) !== ordinal) {
        find('technical-glyph', device, `${id} reads "${label}", not the position ${ordinal ?? '(none)'} of the row it labels`);
        sound = false;
      }
    }
    if (sound) count('alignedDevices');
  }
  // Decorative layers: every aria-hidden subtree outside a figure. None may
  // hold a keyboard stop, and a thin empty rule or a repeated pattern in one
  // has to be a registered device.
  for (const element of everything) {
    if (inFigure(element) || element.closest('.katex')) continue;
    if (element.getAttribute('aria-hidden') === 'true' && !element.parentElement?.closest('[aria-hidden="true"]')) {
      count('decorativeLayers');
      const stop = element.matches(focusable) ? element : element.querySelector(focusable);
      if (stop && !stop.closest('[inert]')) {
        find('device-exposed', element, `an aria-hidden layer holds the keyboard stop ${name(stop)}`);
      }
    }
    if (element.hasAttribute('data-brand-device-id')) continue;
    if ((element.textContent ?? '').trim()) continue;
    if (element.matches('input, img, svg, canvas, video, iframe, hr, button, a, select, textarea, [role]')) continue;
    const s = style(element);
    const rect = element.getBoundingClientRect();
    const sides = ['top', 'right', 'bottom', 'left'].filter(
      (side) =>
        px(s.getPropertyValue(`border-${side}-width`)) > 0 &&
        !['none', 'hidden'].includes(s.getPropertyValue(`border-${side}-style`)),
    ).length;
    const fill = rgba(s.backgroundColor);
    const thin = (rect.width <= 4 || rect.height <= 4) && Math.max(rect.width, rect.height) >= 24;
    const rule = thin && (sides === 1 || (!!fill && fill.a > 0));
    const pattern =
      s.backgroundImage !== 'none' && s.backgroundRepeat !== 'no-repeat' && rect.width * rect.height >= 2_000;
    if (rule || pattern) {
      find(
        'unregistered-device',
        element,
        `an unregistered ${rule ? `${Math.round(rect.width)}x${Math.round(rect.height)} rule` : 'repeated pattern'} with no content`,
      );
    }
  }
  // Text kept from assistive technology outside a figure: punctuation, a
  // numeral that repeats the position of the list item it sits in, or the
  // visible readout of a form control in the same field whose spoken value
  // or description already carries it. Anything else is a label drawn for
  // decoration.
  const spokenBy = (control: Element) =>
    [
      control.getAttribute('aria-valuetext') ?? '',
      ...(control.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .map((id) => (id ? document.getElementById(id)?.textContent ?? '' : '')),
    ]
      .join(' ')
      .trim();
  const readsOutControl = (element: Element, text: string) => {
    for (let field = element.parentElement, depth = 0; field && depth < 2; field = field.parentElement, depth += 1) {
      const controls = field.querySelectorAll('input, select, textarea, [role="slider"], [role="spinbutton"]');
      if (controls.length !== 1) continue;
      const spoken = spokenBy(controls[0]);
      if (!spoken) return false;
      const numerals = text.match(/\d+(?:\.\d+)?/g) ?? [];
      return numerals.every((numeral) => spoken.includes(numeral));
    }
    return false;
  };
  const hiddenSeen = new Set<Element>();
  const hiddenWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = hiddenWalker.nextNode(); node; node = hiddenWalker.nextNode()) {
    const element = node.parentElement;
    const text = (node.textContent ?? '').trim();
    if (!element || !text || hiddenSeen.has(element)) continue;
    if (!element.closest('[aria-hidden="true"]') || element.closest('[data-brand-device-id]')) continue;
    if (inFigure(element) || element.closest('.katex, pre, code, script, style, template, noscript')) continue;
    if (!painted(element)) continue;
    hiddenSeen.add(element);
    count('hiddenTextRuns');
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    const ordinal = ordinalOf(element.closest('li'));
    if (/^\d+$/.test(text) && ordinal !== null && Number(text) === ordinal) continue;
    if (readsOutControl(element, text)) continue;
    find('technical-glyph', element, `aria-hidden label "${text.slice(0, 30)}" repeats nothing on the page`);
  }
  // Animation that runs on its own, outside a figure a reader drives.
  for (const animation of document.getAnimations()) {
    const target = (animation.effect as KeyframeEffect | null)?.target ?? null;
    if (!target) continue;
    count('animations');
    const timing = animation.effect?.getComputedTiming();
    if (animation.playState === 'running' && timing?.iterations === Infinity && !inFigure(target)) {
      find('ambient-animation', target, `${(animation as CSSAnimation).animationName ?? 'an animation'} loops for ever`);
    }
  }

  // ---- Prose grounds (VAL-B2-GRID-003) ---------------------------------
  const layers: Element[] = [...deviceElements];
  for (const element of everything) {
    if (inFigure(element)) continue;
    if (style(element).backgroundImage !== 'none') layers.push(element);
  }
  const layerRects = layers.map((layer) => ({ layer, rect: layer.getBoundingClientRect() }));
  const proseWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = proseWalker.nextNode(); node; node = proseWalker.nextNode()) {
    const element = node.parentElement;
    if (!element || !(node.textContent ?? '').trim() || !element.closest('.prose')) continue;
    if (inFigure(element) || element.closest('.katex, pre, script, style, template')) continue;
    if (!painted(element)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const glyphs of range.getClientRects()) {
      if (glyphs.width < 1 || glyphs.height < 1) continue;
      count('proseRuns');
      for (const { layer, rect } of layerRects) {
        const width = Math.min(rect.right, glyphs.right) - Math.max(rect.left, glyphs.left);
        const height = Math.min(rect.bottom, glyphs.bottom) - Math.max(rect.top, glyphs.top);
        if (width <= 0 || height <= 0) continue;
        find(
          layer.hasAttribute('data-brand-device-id') ? 'device-under-prose' : 'texture',
          element,
          `prose glyphs "${textOf(element)}" sit over ${name(layer)}`,
        );
      }
    }
  }

  // ---- Rules, borders, elevation and texture (VAL-B2-GRID-008, VAL-B2-SURF-002/-003/-004/-005/-009)
  const ruleInk = (c: RGBA | null) =>
    !!c && near(c, 28, 28, 26, 2) && [0.14, 0.22, 1].some((alpha) => Math.abs(c.a - alpha) <= 0.011);
  const sideOf = (rect: DOMRect, side: string) =>
    side === 'top' ? rect.top : side === 'bottom' ? rect.bottom : side === 'left' ? rect.left : rect.right;
  const paintedSides = (element: Element) => {
    const s = style(element);
    return ['top', 'right', 'bottom', 'left'].filter((side) => {
      const colour = rgba(s.getPropertyValue(`border-${side}-color`));
      return (
        px(s.getPropertyValue(`border-${side}-width`)) > 0 &&
        !['none', 'hidden'].includes(s.getPropertyValue(`border-${side}-style`)) &&
        !!colour &&
        colour.a > 0
      );
    });
  };
  const realInterior = 'table, figure, pre, [data-rehype-pretty-code-figure], fieldset, [role="group"], [role="radiogroup"], [role="tablist"], [role="toolbar"], video, iframe, canvas, img';
  for (const element of everything) {
    const s = style(element);
    if (s.boxShadow !== 'none') find('shadow', element, `box-shadow ${s.boxShadow.slice(0, 80)}`);
    if (/drop-shadow/.test(s.filter)) find('shadow', element, `filter ${s.filter.slice(0, 80)}`);
    const glow = [
      s.textShadow !== 'none' ? `text-shadow ${s.textShadow}` : '',
      s.filter !== 'none' && !/drop-shadow/.test(s.filter) ? `filter ${s.filter}` : '',
      s.backdropFilter && s.backdropFilter !== 'none' ? `backdrop-filter ${s.backdropFilter}` : '',
      s.mixBlendMode !== 'normal' ? `mix-blend-mode ${s.mixBlendMode}` : '',
    ].filter(Boolean);
    if (glow.length > 0) find('glow', element, glow.join('; ').slice(0, 120));
    for (const pseudo of ['::before', '::after'] as const) {
      const p = getComputedStyle(element, pseudo);
      if (p.content === 'none' || p.content === 'normal') continue;
      if (p.boxShadow !== 'none') find('shadow', element, `${pseudo} box-shadow ${p.boxShadow.slice(0, 80)}`);
      if (p.textShadow !== 'none' || (p.backdropFilter && p.backdropFilter !== 'none')) {
        find('glow', element, `${pseudo} ${p.textShadow} ${p.backdropFilter}`.slice(0, 120));
      }
      if (p.backgroundImage !== 'none' && !inFigure(element)) {
        find('texture', element, `${pseudo} paints ${p.backgroundImage.slice(0, 80)}`);
      }
    }
    if (inFigure(element) || element.closest('.katex')) continue;
    if (s.backgroundImage !== 'none') find('texture', element, `paints ${s.backgroundImage.slice(0, 80)}`);
    const sides = paintedSides(element);
    if (sides.length === 0) continue;
    count('borderedSides', sides.length);
    const rect = element.getBoundingClientRect();
    const device = element.getAttribute('data-brand-device-id');
    for (const side of sides) {
      const width = px(s.getPropertyValue(`border-${side}-width`));
      const kind = s.getPropertyValue(`border-${side}-style`);
      const colour = rgba(s.getPropertyValue(`border-${side}-color`));
      if (Math.abs(width - 1) > 0.01) find('border-weight', element, `a ${width}px ${kind} ${side} border`);
      if (kind === 'dashed' || kind === 'dotted') find('dashed-border', element, `a ${kind} ${side} border`);
      if (['double', 'groove', 'ridge', 'inset', 'outset'].includes(kind)) {
        find('glow', element, `a ${kind} ${side} border bevels the surface`);
      }
      if (sides.length < 4) {
        count('rails');
        const registration = device === 'device:registration-cross' && isAccent(colour);
        // A text field's underline is its boundary, which has to clear 3:1
        // against the ground (WCAG 1.4.11), so it cannot be a hairline.
        const fieldBoundary =
          element.matches('input, select, textarea') &&
          !!colour &&
          contrast(blend(colour, ground(element)), ground(element)) >= 3;
        if (!ruleInk(colour) && !registration && !fieldBoundary) {
          find('rail-colour', element, `the ${side} rule paints ${s.getPropertyValue(`border-${side}-color`)}`);
        }
      }
      if (element.closest(realInterior)) continue;
      // A rule drawn on top of another: an ancestor's rule on the same side
      // within a pixel and a half, or the touching edge of the sibling before.
      const edge = sideOf(rect, side);
      for (let node = element.parentElement, depth = 0; node && depth < 4; node = node.parentElement, depth += 1) {
        if (node.matches('html, body') || !paintedSides(node).includes(side)) continue;
        if (Math.abs(sideOf(node.getBoundingClientRect(), side) - edge) <= 1.5) {
          find('double-rule', element, `its ${side} rule doubles the one ${name(node)} draws`);
        }
        break;
      }
      if (side === 'top') {
        let previous = element.previousElementSibling;
        while (previous && !painted(previous)) previous = previous.previousElementSibling;
        if (previous && paintedSides(previous).includes('bottom') && Math.abs(previous.getBoundingClientRect().bottom - edge) <= 1.5) {
          find('double-rule', element, `its top rule touches the bottom rule of ${name(previous)}`);
        }
      }
    }
  }

  // ---- Dark surfaces and the light shell (VAL-B2-SURF-006) ---------------
  // An action may be ink at any size, and a compact control may show its
  // state in ink; media paints its own pixels, and so does a fill shown only
  // through an image mask (a logo's ink layer).
  const actionOrControl =
    'button, a, input, select, textarea, summary, label, [role="button"], [role="tab"], [role="slider"], [role="switch"], [role="radio"], [role="checkbox"], [role="option"]';
  for (const element of everything) {
    if (inFigure(element) || element.matches(`img, picture, video, canvas, iframe, ${actionOrControl}`)) continue;
    const masked = style(element).maskImage || style(element).getPropertyValue('-webkit-mask-image');
    if (masked && masked !== 'none') continue;
    const fill = rgba(style(element).backgroundColor);
    if (!fill || fill.a < 0.5) continue;
    const shade = blend(fill, ground(element.parentElement));
    if (luminance(shade) >= 0.2) continue;
    const rect = element.getBoundingClientRect();
    find('dark-surface', element, `a ${Math.round(rect.width)}x${Math.round(rect.height)} surface paints ${style(element).backgroundColor}`);
  }
  for (const element of document.querySelectorAll(
    'html, body, main, header, footer, nav, article, aside, [data-prose-column], .prose',
  )) {
    if (element !== document.documentElement && element !== document.body && !painted(element)) continue;
    if (inFigure(element)) continue;
    count('shellGrounds');
    const under = ground(element);
    if (luminance(under) < 0.8) {
      find('dark-shell', element, `the ${element.tagName.toLowerCase()} ground is rgb(${Math.round(under.r)}, ${Math.round(under.g)}, ${Math.round(under.b)})`);
    }
  }
  if (/dark/.test(getComputedStyle(document.documentElement).colorScheme)) {
    find('dark-shell', document.documentElement, `color-scheme ${getComputedStyle(document.documentElement).colorScheme}`);
  }
  const themeRules: string[] = [];
  const scanThemes = (list: CSSRuleList) => {
    for (const rule of list) {
      if (rule instanceof CSSMediaRule && /prefers-color-scheme:\s*dark/.test(rule.conditionText)) {
        themeRules.push(rule.conditionText);
      }
      if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules && !(rule instanceof CSSStyleRule)) {
        scanThemes((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      scanThemes(sheet.cssRules);
    } catch {
      continue;
    }
  }
  if (themeRules.length > 0) {
    find('dark-shell', document.documentElement, `${themeRules.length} stylesheet rule(s) switch to a dark theme`);
  }

  // ---- Materials (VAL-B2-SURF-007, VAL-B2-SURF-011) ---------------------
  for (const surface of document.querySelectorAll('[data-brand-material-id]')) {
    if (!painted(surface)) continue;
    const id = surface.getAttribute('data-brand-material-id') ?? '';
    const problems: string[] = [];
    if (!input.materialIds.includes(id)) problems.push(`${id} is not a registered material`);
    if (surface.getAttribute('data-brand-material-deterministic') !== 'true') problems.push('not declared deterministic');
    if (surface.getAttribute('data-brand-material-contrast') !== 'pass') problems.push('its declared contrast does not pass');
    const external = surface.getAttribute('data-brand-material-external');
    if (external !== 'false' && !surface.getAttribute('data-brand-material-provenance')) {
      problems.push('external with no provenance record');
    }
    if (surface.getAttribute('data-brand-material-owned') !== 'owned' && external === 'false') {
      problems.push('first-party but not declared owned');
    }
    const s = style(surface);
    if (s.backgroundImage !== 'none') problems.push(`paints ${s.backgroundImage.slice(0, 60)}`);
    const under = ground(surface);
    const ink = rgba(s.color);
    const ratio = ink ? contrast(blend(ink, under), under) : 0;
    if (ratio < input.materialContrastFloor) problems.push(`its text reaches ${ratio.toFixed(2)}:1 on its ground`);
    if (surface.closest('.prose') || surface.querySelector('.prose')) problems.push('sits behind article prose');
    if (problems.length > 0) {
      find('material', surface, problems.join('; '));
      continue;
    }
    count('materialSurfaces');
  }

  // ---- Rendered casing (VAL-B2-GRID-010) --------------------------------
  const caseSensitive = new RegExp(input.caseSensitivePattern, 'gu');
  const casingSeen = new Set<Element>();
  const casingWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = casingWalker.nextNode(); node; node = casingWalker.nextNode()) {
    const element = node.parentElement;
    const text = node.textContent ?? '';
    if (!element || !text.trim() || element.closest('svg, .katex, pre, code, script, style, template, noscript')) continue;
    const s = style(element);
    const transformed = s.textTransform !== 'none' || s.fontVariantCaps !== 'normal';
    if (!transformed || !painted(element)) continue;
    if (!casingSeen.has(element)) {
      casingSeen.add(element);
      count('transformedLabels');
    }
    const drift = [...text.matchAll(caseSensitive)].map(([match]) => match);
    drift.push(...input.identityStrings.filter((identity) => text.includes(identity)));
    if (s.textTransform === 'lowercase') drift.push(...(text.match(/\b[A-Z]{2,}\b/g) ?? []));
    if (drift.length > 0) {
      find(
        'casing-drift',
        element,
        `${s.textTransform === 'none' ? s.fontVariantCaps : s.textTransform} rewrites "${drift.join('", "')}" in "${text.trim().slice(0, 60)}"`,
      );
    }
  }

  // ---- Major composition (VAL-B2-GRID-001) -------------------------------
  if (ownerElement && anchor) {
    const s = style(ownerElement);
    const box = ownerElement.getBoundingClientRect();
    const left = box.left + px(s.paddingLeft) + px(s.borderLeftWidth);
    const right = box.right - px(s.paddingRight) - px(s.borderRightWidth);
    const lines = [left, right];
    const centres = [(left + right) / 2];
    if (s.display === 'grid' || s.display === 'inline-grid') {
      const tracks = s.gridTemplateColumns.split(/\s+/).map(px);
      const gap = px(s.columnGap);
      let x = left;
      tracks.forEach((track, index) => {
        lines.push(x, x + track);
        centres.push(x + track / 2);
        x += track + (index < tracks.length - 1 ? gap : 0);
      });
    }
    const blocks = new Set<Element>([anchor, ...ownerElement.children]);
    for (const prose of ownerElement.querySelectorAll('.prose')) for (const child of prose.children) blocks.add(child);
    for (const block of blocks) {
      if (!painted(block) || block.closest('svg')) continue;
      const b = style(block);
      if (b.position === 'absolute' || b.position === 'fixed' || b.float !== 'none') continue;
      count('compositionBlocks');
      const r = block.getBoundingClientRect();
      const offset = Math.min(
        ...lines.map((line) => Math.abs(r.left - line)),
        ...lines.map((line) => Math.abs(r.right - line)),
        ...centres.map((centre) => Math.abs(r.left + r.width / 2 - centre)),
      );
      if (offset > input.compositionTolerancePx) {
        find('composition-offgrid', block, `starts, ends and centres ${offset.toFixed(1)}px from every line of ${name(ownerElement)}`);
      }
    }
  }

  // ---- Reachable content (VAL-B2-GRID-007) ------------------------------
  const disclosed = new Set<Element>();
  for (const control of document.querySelectorAll('[aria-controls], [aria-describedby], [popovertarget]')) {
    for (const attribute of ['aria-controls', 'aria-describedby', 'popovertarget']) {
      for (const id of (control.getAttribute(attribute) ?? '').split(/\s+/)) {
        const target = id ? document.getElementById(id) : null;
        if (target) disclosed.add(target);
      }
    }
  }
  const reachable = (element: Element) => {
    if (element.getClientRects().length > 0) return true;
    if (element.closest('details:not([open])')) return true;
    for (let n: Element | null = element; n; n = n.parentElement) if (disclosed.has(n)) return true;
    return false;
  };
  const strings = new Set<string>();
  const contentRoot = document.querySelector('main') ?? document.body;
  const contentWalker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT);
  for (let node = contentWalker.nextNode(); node; node = contentWalker.nextNode()) {
    const element = node.parentElement;
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!element || !text) continue;
    if (element.closest('script, style, template, noscript, [hidden], svg title, [aria-hidden="true"]')) continue;
    if (reachable(element)) strings.add(text);
  }
  let digest = 0;
  for (const text of strings) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    digest = (digest + hash) >>> 0;
  }

  return {
    counts,
    findings,
    typeTuples: [...tuples.values()],
    spacingTokens,
    offLadderSpacing: [...spacing.values()],
    frame: {
      owners,
      wideFrameWidthPx,
      readingColumnWidthPx,
      frameContentWidthPx,
      frameCh,
      widestParagraphPx,
    },
    sectionGaps,
    componentInteriors,
    controlGaps,
    content: { strings: strings.size, digest: digest.toString(16).padStart(8, '0') },
  };
}

/** Runs in the page: the element keyboard focus is on, and how it shows. */
export function collectFocusStop(input: {
  exemptions: ReadonlyArray<{ id: string; selector: string; predicates: readonly string[] }>;
}): CollectedFocusStop | null {
  const element = document.activeElement;
  if (!element || element === document.body || element === document.documentElement) return null;
  // A ring that eases in (an outline-colour transition) is read where it
  // settles, not on its first frame.
  for (const animation of element.getAnimations()) {
    try {
      animation.finish();
    } catch {
      // An infinite animation cannot finish; it is read as it stands.
    }
  }
  const s = getComputedStyle(element);
  const id = element.id ? `#${element.id}` : '';
  const data = [...element.attributes]
    .filter((attribute) => attribute.name.startsWith('data-'))
    .slice(0, 2)
    .map((attribute) => `[${attribute.name}${attribute.value ? `="${attribute.value.slice(0, 32)}"` : ''}]`)
    .join('');
  const label = `${element.tagName.toLowerCase()}${id}${data}`.slice(0, 140);
  // A link that wraps has one box per line, and the centre of its bounding
  // box can fall on the text beside it; each line box is probed instead.
  let obscuredBy: string | null = null;
  for (const rect of element.getClientRects()) {
    if (rect.width < 1 || rect.height < 1) continue;
    const x = Math.min(Math.max(rect.left + rect.width / 2, 0), document.documentElement.clientWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (hit && hit !== element && !element.contains(hit) && !hit.contains(element)) {
      obscuredBy = `${hit.tagName.toLowerCase()}${hit.id ? `#${hit.id}` : ''}${typeof hit.className === 'string' && hit.className ? `.${hit.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
      break;
    }
  }
  const exemptionFor = (predicate: string) =>
    input.exemptions.find(
      (candidate) => candidate.predicates.includes(predicate) && !!element.closest(candidate.selector),
    )?.id ?? null;
  return {
    element: label,
    outlineStyle: s.outlineStyle,
    outlineWidthPx: parseFloat(s.outlineWidth) || 0,
    outlineColour: s.outlineColor,
    outlineOffsetPx: parseFloat(s.outlineOffset) || 0,
    obscuredBy,
    exemption: exemptionFor('focus-ring'),
    offsetExemption: exemptionFor('focus-offset'),
  };
}
