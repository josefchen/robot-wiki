import type { ReleaseInteractionDetails } from '../../../lib/brand-v2-release-interaction-details';

/** Self-contained browser function: execute with page.evaluate. It discovers
 * controls structurally, then reads annotations only to reconcile owners. */
export function collectReleaseInteractionDetails(): ReleaseInteractionDetails {
  const system = new OffscreenCanvas(1, 1).getContext('2d')!;
  system.fillStyle = 'CanvasText';
  const systemText = system.fillStyle;
  system.fillStyle = 'Canvas';
  const systemCanvas = system.fillStyle;
  const visible = (node: Element) => {
    for (let details = node.closest('details'); details; details = details.parentElement?.closest('details') ?? null) if (!details.open && node.closest('summary')?.closest('details') !== details) return false;
    return node.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true
    }) && node.getClientRects().length > 0 && !node.closest('[inert]');
  };
  const clean = (node: Element) => {
    const clone = node.cloneNode(true) as Element;
    clone.querySelectorAll('[aria-hidden=true],.sr-only,[data-sidenote]').forEach(child => child.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
  };
  const id = (node: Element, index: number) => `${node.tagName.toLowerCase()}:${index}:${node.id || node.getAttribute('data-testid') || node.getAttribute('data-brand-control-id') || ''}`;
  const labelled = (node: Element) => (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(key => document.getElementById(key)).filter((label): label is HTMLElement => Boolean(label));
  const name = (node: Element) => labelled(node).map(label => label.textContent ?? '').join(' ').trim() || node.getAttribute('aria-label') || clean(node);
  const inputs = [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type=hidden]),select,textarea')].filter(visible).map((node, index) => {
    const labels = [...(node.labels ?? []), ...labelled(node)].filter(label => visible(label) && !label.closest('.sr-only,[aria-hidden=true]')).map(clean).filter(Boolean);
    return {
      id: id(node, index),
      kind: node instanceof HTMLInputElement ? node.type : node.tagName.toLowerCase(),
      name: labels.join(' ') || name(node),
      labels,
      value: node.value,
      disabled: node.disabled
    };
  });
  const tables = [...document.querySelectorAll<HTMLTableElement>('main table')].filter(visible).map((table, index) => {
    const headers = [...table.querySelectorAll('thead th')].map(clean),
      rows = [...table.querySelectorAll('tbody tr')],
      cells: ReleaseInteractionDetails['tables'][number]['cells'] = [];
    rows.forEach((row, rowIndex) => {
      let column = 0;
      for (const cell of row.children) {
        if (cell.tagName === 'TD') cells.push({
          rowIndex,
          row: clean(row.querySelector('th,td') ?? cell),
          column: headers[column] ?? String(column + 1),
          text: clean(cell),
          align: getComputedStyle(cell).textAlign
        });
        column += Number(cell.getAttribute('colspan') ?? 1);
      }
    });
    let parent = table.parentElement;
    while (parent && parent !== document.body && !/auto|scroll/.test(getComputedStyle(parent).overflowX)) parent = parent.parentElement;
    return {
      id: 'table:' + index,
      frame: table.closest('[data-figure-frame]')?.getAttribute('data-figure-frame') ?? '',
      name: table.querySelector('caption') ? clean(table.querySelector('caption')!) : name(table),
      headers,
      unassociated: [...table.querySelectorAll('th')].filter(cell => !cell.hasAttribute('scope') && !cell.id).map(clean),
      sortButtons: table.querySelectorAll('th button').length,
      ariaSort: table.querySelectorAll('th[aria-sort]').length,
      cells,
      scroll: parent && parent !== document.body ? {
        width: parent.clientWidth,
        scrollWidth: parent.scrollWidth,
        tabIndex: parent.tabIndex,
        name: name(parent)
      } : null
    };
  });
  const borders = (style: CSSStyleDeclaration) => ['Top', 'Right', 'Bottom', 'Left'].map(side => Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) || 0);
  const segmented = [...document.querySelectorAll('[data-brand-control-id="control:segmented"],[role=tablist]')].filter(visible).map((node, index) => {
    const controls = [...node.querySelectorAll<HTMLButtonElement>('button,[role=tab],input[type=radio]')].filter(visible).map((button, i) => {
      const style = getComputedStyle(button);
      const attribute = ['aria-selected', 'aria-pressed', 'aria-checked'].find(key => button.hasAttribute(key));
      const semantic = attribute ?? (button instanceof HTMLInputElement ? 'checked' : null);
      return {
        id: id(button, i),
        text: clean(button) || name(button),
        semantic,
        selected: attribute ? button.getAttribute(attribute) === 'true' : button instanceof HTMLInputElement && button.checked,
        disabled: button.matches(':disabled'),
        paint: {
          foreground: style.color,
          background: style.backgroundColor,
          weight: Number(style.fontWeight),
          underline: style.textDecorationLine.includes('underline'),
          borders: borders(style),
          radius: parseFloat(style.borderTopLeftRadius)
        }
      };
    });
    const owner = node.closest('[role=group],[role=radiogroup],[role=tablist]') ?? node;
    return {
      id: id(node, index),
      name: name(owner),
      borders: borders(getComputedStyle(node)),
      nestedFrames: controls.filter(control => control.paint.borders.every(width => width > 0)).length,
      controls
    };
  });
  const selector = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=checkbox],[role=radio],[role=slider],[role=switch],[role=menuitem],[role=option],[data-testid=playground-viewport] canvas[tabindex]';
  const controls = [...document.querySelectorAll(selector)].filter(node => visible(node) && !node.matches(':disabled') && node.getAttribute('aria-disabled') !== 'true');
  const measured = controls.map((node, index) => {
    let fragments = [...node.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
    if (node instanceof SVGGeometryElement) {
      let rect = node.getBoundingClientRect();
      const style = getComputedStyle(node),
        matrix = node.getScreenCTM(),
        stroke = parseFloat(style.strokeWidth) || 0;
      if (style.stroke !== 'none' && style.pointerEvents !== 'none' && stroke > 0 && matrix) {
        const sx = style.vectorEffect === 'non-scaling-stroke' ? 1 : Math.hypot(matrix.a, matrix.b),
          sy = style.vectorEffect === 'non-scaling-stroke' ? 1 : Math.hypot(matrix.c, matrix.d);
        rect = new DOMRect(rect.x - stroke * sx / 2, rect.y - stroke * sy / 2, rect.width + stroke * sx, rect.height + stroke * sy);
      }
      fragments = [rect];
    }
    // getBoundingClientRect is the union of inline fragments: a wrapped
    // title's union includes large areas that never accept a pointer. Use
    // actual fragment rectangles for collisions and a real rectangular
    // hit region for the 24px-square minimum.
    const fit = fragments.find(rect => {
      if (rect.width < 24 || rect.height < 24) return false;
      if (!(node instanceof SVGGeometryElement)) return true;
      const matrix = node.getScreenCTM(),
        style = getComputedStyle(node);
      if (!matrix) return false;
      return [-12, 12].every(dx => [-12, 12].every(dy => {
        const point = new DOMPoint(rect.x + rect.width / 2 + dx, rect.y + rect.height / 2 + dy).matrixTransform(matrix.inverse());
        return style.fill !== 'none' && node.isPointInFill(point) || style.stroke !== 'none' && node.isPointInStroke(point);
      }));
    });
    const box = fit ?? [...fragments].sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? node.getBoundingClientRect();
    return {
      node,
      index,
      box,
      fragments,
      squareFits: Boolean(fit)
    };
  });
  const large = measured.filter(entry => entry.squareFits);
  const inlineDisplay = (node: Element) => /^(inline|contents|ruby)/.test(getComputedStyle(node).display);
  const formatBlock = (node: Element | null) => {
    while (node && inlineDisplay(node)) node = node.parentElement;
    return node;
  };
  const small = measured.filter(entry => !entry.squareFits).map(({
    node,
    index,
    box,
    fragments
  }) => {
    const parent = formatBlock(node.parentElement);
    let inlineText = '';
    const inInlineFlow = inlineDisplay(node) || Boolean(node.parentElement && inlineDisplay(node.parentElement));
    if (parent && inInlineFlow) {
      const words: string[] = [];
      const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        const owner = text.parentElement;
        if (!owner || !text.textContent?.trim() || node.contains(text) || owner.closest(selector + ',script,style,.sr-only,[aria-hidden=true]') || formatBlock(owner) !== parent) continue;
        words.push(text.textContent.trim());
      }
      inlineText = words.join(' ').replace(/\s+/g, ' ').trim();
    }
    const others = measured.filter(other => other.node !== node && !node.contains(other.node) && !other.node.contains(node));
    const pieces = others.flatMap(other => other.fragments.map(fragment => ({
      ...other,
      box: fragment
    })));
    const distances = pieces.map(({
      box: b
    }) => Math.min(...fragments.map(own => {
      const ox = own.x + own.width / 2,
        oy = own.y + own.height / 2;
      return Math.hypot(Math.max(b.left, Math.min(ox, b.right)) - ox, Math.max(b.top, Math.min(oy, b.bottom)) - oy);
    })));
    const nearest = pieces[distances.indexOf(Math.min(...distances))];
    const centres = others.filter(other => !other.squareFits).flatMap(other => other.fragments.flatMap(b => fragments.map(own => Math.hypot(b.x + b.width / 2 - own.x - own.width / 2, b.y + b.height / 2 - own.y - own.height / 2))));
    return {
      id: id(node, index),
      registeredId: node.getAttribute('data-brand-control-id'),
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute('role'),
      width: box.width,
      height: box.height,
      inlineText,
      parentWidth: parent?.getBoundingClientRect().width ?? 0,
      nearestTargetClearance: distances.length ? Math.min(...distances) : null,
      nearestSmallCentre: centres.length ? Math.min(...centres) : null,
      nativePointer: node.matches('a[href],button,input,select,textarea,summary'),
      nonRectangular: node instanceof SVGGeometryElement,
      fragmented: fragments.length > 1,
      fragments: fragments.map(rect => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      })),
      name: name(node).slice(0, 160),
      x: box.x,
      y: box.y,
      nearestTarget: nearest ? {
        id: id(nearest.node, nearest.index),
        name: name(nearest.node).slice(0, 160),
        tag: nearest.node.tagName.toLowerCase(),
        x: nearest.box.x,
        y: nearest.box.y,
        width: nearest.box.width,
        height: nearest.box.height
      } : null
    };
  });
  const instruments = [...document.querySelectorAll('[data-figure-frame],[data-playground-workbench],[data-testid=playground]')].filter(visible).map((node, index) => {
    const descriptions = [...node.querySelectorAll('[data-figure-readout],[data-chart-description],[role=status],[aria-live=polite],[data-testid=tech-telemetry],output,[aria-valuetext]')].filter(item => visible(item) || item.classList.contains('sr-only')).flatMap(item => {
      const text = (item.getAttribute('aria-valuetext') ?? item.textContent ?? '').replace(/\s+/g, ' ').trim();
      return text ? [{
        text,
        binding: item.getAttribute('data-testid') ?? (item.hasAttribute('aria-valuetext') ? 'native control aria-valuetext' : item.hasAttribute('data-figure-readout') ? 'figure-readout' : 'same instrument named description'),
        role: item.getAttribute('role'),
        live: item.getAttribute('aria-live')
      }] : [];
    });
    return {
      id: id(node, index),
      component: node.getAttribute('data-figure-frame') ?? '',
      name: name(node),
      controls: node.querySelectorAll('button,input,select,textarea').length,
      descriptions
    };
  });
  return {
    forcedColors: matchMedia('(forced-colors: active)').matches,
    systemText,
    systemCanvas,
    inputs,
    tables,
    segmented,
    targets: {
      count: measured.length,
      large: {
        count: large.length,
        minWidth: large.length ? Math.min(...large.map(({
          box
        }) => box.width)) : null,
        minHeight: large.length ? Math.min(...large.map(({
          box
        }) => box.height)) : null
      },
      small
    },
    instruments
  };
}
