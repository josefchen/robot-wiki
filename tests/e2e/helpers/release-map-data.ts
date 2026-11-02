import type { MapDataRecord, MapDataView } from '../../../lib/brand-v2-release-map-data';
export function collectMapCompanyRecord(input: {
  companyId: string;
  viewport: '1440x900' | '375x812';
}): MapDataRecord {
  const detail = document.querySelector('[data-company-detail]');
  if (!detail) throw Error('No opened company detail');
  const clean = (node: Element | null) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const heading = detail.querySelector('h2')!,
    box = detail.getBoundingClientRect();
  const sources = [...detail.querySelectorAll('section[aria-labelledby$="-sources"] li')].map(li => {
    const a = li.querySelector('a')!;
    return {
      url: a.getAttribute('href') ?? '',
      title: clean(a),
      date: clean(a.nextElementSibling)
    };
  });
  const texts = [...detail.querySelectorAll('p,dt,dd,a,h2,h3')].filter(node => node.checkVisibility({
    visibilityProperty: true
  }));
  const panel = detail.closest('[data-company-sheet]')!.getBoundingClientRect();
  const overflowPx = Math.max(0, ...texts.map(node => {
    const r = node.getBoundingClientRect();
    return Math.max(panel.left - r.left, r.right - panel.right);
  }));
  return {
    id: input.viewport + '|' + input.companyId,
    ...input,
    hash: location.hash,
    heading: clean(heading),
    context: clean(heading.nextElementSibling),
    description: clean(detail.querySelector(':scope > p')),
    fields: Object.fromEntries([...detail.querySelectorAll('[data-field]')].map(node => [node.getAttribute('data-field')!, clean(node)])),
    sources,
    caveat: clean(detail.querySelector('[data-round-caveat]')),
    roundSource: clean(detail.querySelector('[data-round-source]')),
    detailWidth: box.width,
    overflowPx,
    minimumTextPx: Math.min(...texts.map(node => parseFloat(getComputedStyle(node).fontSize)))
  };
}
export function collectMapDataView(input: {
  viewport: '1440x900' | '375x812';
  view: 'grid' | 'bubble' | 'timeline';
  state: 'default' | 'filtered' | 'selected' | 'focused';
}): MapDataView {
  const visible = (node: Element) => node.checkVisibility({
    visibilityProperty: true,
    opacityProperty: true
  }) && node.getClientRects().length > 0;
  const clean = (node: Element | null) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const box = (node: Element) => {
    const r = node.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height
    };
  };
  const detail = document.querySelector('[data-company-detail]'),
    selected = detail?.getAttribute('data-company-detail') ?? null;
  const plot = document.querySelector<SVGSVGElement>(input.view === 'bubble' ? '[data-bubble-chart] svg[role=group]' : '[data-timeline-plot]');
  const marks = [...(plot?.querySelectorAll<SVGCircleElement>(input.view === 'bubble' ? '[data-mark-ink]' : '[data-timeline-round]') ?? [])].map(mark => {
    const control = mark.parentElement?.querySelector('[data-company-id]');
    const style = getComputedStyle(mark);
    return {
      companyId: input.view === 'bubble' ? control?.getAttribute('data-company-id') ?? '' : mark.getAttribute('data-timeline-round') ?? '',
      cx: mark.cx.baseVal.value,
      cy: mark.cy.baseVal.value,
      r: mark.r.baseVal.value,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: parseFloat(style.strokeWidth) || 0,
      kind: mark.getAttribute('data-mark-kind') ?? '',
      label: control?.getAttribute('aria-label') ?? ''
    };
  });
  const selector = input.view === 'grid' ? 'button[data-map-tile]' : input.view === 'bubble' ? 'circle[data-company-id]' : '[data-timeline-id]';
  const renderedIds = [...document.querySelectorAll(selector)].filter(visible).map(node => node.getAttribute('data-map-tile') ?? node.getAttribute('data-company-id') ?? '').sort();
  const selections = [...document.querySelectorAll('[aria-pressed=true],[aria-selected=true],[aria-expanded=true][aria-controls="market-map-company"]')].filter(visible).map((node, index) => {
    const style = getComputedStyle(node),
      mark = node instanceof SVGCircleElement ? node.parentElement?.querySelector<SVGCircleElement>('[data-mark-ink]') : null;
    const row = node.closest('[data-timeline-id]'),
      cue = getComputedStyle(row ?? node),
      label = node.querySelector('[data-timeline-name]');
    return {
      id: node.getAttribute('data-map-tile') ?? node.getAttribute('data-company-id') ?? row?.getAttribute('data-company-id') ?? (node.id || String(index)),
      tag: node.tagName.toLowerCase(),
      semantic: ['aria-pressed', 'aria-selected', 'aria-expanded'].find(attr => node.getAttribute(attr) === 'true') ?? null,
      expanded: node.getAttribute('aria-expanded'),
      controls: node.getAttribute('aria-controls'),
      foreground: style.color,
      background: style.backgroundColor,
      weight: Number(label ? getComputedStyle(label).fontWeight : style.fontWeight),
      underline: style.textDecorationLine.includes('underline'),
      borders: ['top', 'right', 'bottom', 'left'].map(side => parseFloat(cue.getPropertyValue('border-' + side + '-width')) || 0),
      borderColours: ['top', 'right', 'bottom', 'left'].map(side => cue.getPropertyValue('border-' + side + '-color')),
      radius: parseFloat(style.borderRadius) || 0,
      markRadius: mark?.r.baseVal.value ?? null,
      selectedMark: Boolean(mark)
    };
  });
  const accents: MapDataView['accents'] = [],
    retired: string[] = [];
  for (const node of document.querySelectorAll('*')) {
    if (!visible(node)) continue;
    const style = getComputedStyle(node),
      paints: Array<[string, string]> = [];
    const ownText = [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent?.trim());
    if (ownText) paints.push(['colour', style.color]);
    paints.push(['background', style.backgroundColor]);
    for (const side of ['top', 'right', 'bottom', 'left']) if (parseFloat(style.getPropertyValue('border-' + side + '-width')) > 0) paints.push(['border-' + side, style.getPropertyValue('border-' + side + '-color')]);
    if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) paints.push(['outline', style.outlineColor]);
    if (ownText && style.textDecorationLine !== 'none') paints.push(['decoration', style.textDecorationColor]);
    if (node instanceof SVGElement) {
      if (style.fill !== 'none' && Number(style.fillOpacity) > 0) paints.push(['fill', style.fill]);
      if (style.stroke !== 'none' && parseFloat(style.strokeWidth) > 0 && Number(style.strokeOpacity) > 0) paints.push(['stroke', style.stroke]);
    }
    const describe = node.tagName.toLowerCase() + ' ' + [...node.attributes].filter(attr => attr.name.startsWith('data-')).map(attr => attr.name + '=' + attr.value).join(' ');
    for (const [property, value] of paints) if (/rgb\((198, 255, 25|36, 95, 255|36, 94, 219)\)/.test(value)) retired.push(describe + ' ' + property + '=' + value);
    const properties = paints.filter(([, value]) => value === 'rgb(59, 110, 168)').map(([name]) => name);
    if (!properties.length) continue;
    let role: MapDataView['accents'][number]['role'] = null;
    if (node.matches('circle[data-focus-ring]')) role = 'focus-ring';else if (node.matches('[data-legend-key="open-company"]')) role = 'legend-key';else if (selected && node.matches('circle[data-mark-ink]') && node.parentElement?.querySelector(`circle[data-company-id="${selected}"][aria-expanded=true]`)) role = 'selected-mark';else if (selected && node.getAttribute('data-timeline-round') === selected) role = 'selected-round';
    accents.push({
      element: describe,
      properties,
      role
    });
  }
  const dialog = document.querySelector('[data-company-sheet]'),
    dialogBox = dialog ? box(dialog) : null;
  const controls = [...document.querySelectorAll('[data-market-map-search],#filter-country,#filter-status,[role=group][aria-label=View] button,button[data-map-tile],[data-timeline-id] > button,circle[data-company-id]')].filter(visible);
  const sheet = dialog && dialogBox ? {
    modal: dialog.getAttribute('aria-modal') === 'true',
    box: dialogBox,
    closeName: detail?.querySelector('button')?.getAttribute('aria-label') ?? '',
    controlGeometry: controls.map((control, index) => {
      const bounds = box(control);
      return {
        id: control.id || control.getAttribute('data-map-tile') || control.getAttribute('data-company-id') || String(index),
        box: bounds,
        overlaps: bounds.left < dialogBox.right && bounds.right > dialogBox.left && bounds.top < dialogBox.bottom && bounds.bottom > dialogBox.top
      };
    }),
    tabEscaped: false,
    closeWorked: false,
    focusRestored: false
  } : null;
  const plotBox = plot?.viewBox.baseVal;
  const legend = input.view === 'bubble' ? document.querySelector('[data-bubble-chart] > div') : plot?.previousElementSibling;
  const legendSwatches = [...(legend?.querySelectorAll('span') ?? [])].flatMap(item => {
    const circle = item.querySelector('circle');
    if (!circle) return [];
    const style = getComputedStyle(circle);
    return [{
      label: clean(item),
      fill: style.fill,
      stroke: style.stroke,
      r: circle.r.baseVal.value,
      strokeWidth: parseFloat(style.strokeWidth) || 0
    }];
  });
  return {
    id: input.viewport + '|' + input.view + '|' + input.state,
    ...input,
    countText: clean(document.querySelector('[data-result-count]')),
    renderedIds,
    legendText: input.view === 'bubble' ? clean(document.querySelector('[data-bubble-chart] > div')) : clean(plot?.previousElementSibling ?? null),
    legendSwatches,
    plotViewBox: plotBox ? [plotBox.x, plotBox.y, plotBox.width, plotBox.height] : [],
    plotText: clean(plot),
    marks,
    timelineRows: [...document.querySelectorAll('[data-timeline-id]')].map(node => ({
      companyId: node.getAttribute('data-company-id') ?? '',
      text: clean(node)
    })),
    selections,
    accents,
    retired,
    sheet,
    links: [...(detail?.querySelectorAll('a') ?? [])].map(node => ({
      text: clean(node),
      colour: getComputedStyle(node).color,
      underline: getComputedStyle(node).textDecorationLine.includes('underline')
    })),
    documentOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth)
  };
}
