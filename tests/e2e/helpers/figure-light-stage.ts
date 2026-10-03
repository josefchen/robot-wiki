export type StagePaint = { share: number; colour: string; at: string };
export type StageRow = {
  figure: string;
  /** The stage's composited background, 'raster' for a canvas, video or image stage, or null when not laid out. */
  stage: string | null;
  stageArea: number;
  /** The largest dark paint that is not a data mark in its role colour, by share of the stage. */
  dark: StagePaint | null;
  /** The largest dark data mark in its role colour; allowed, recorded for review. */
  mark: StagePaint | null;
  signal: string[];
  rasters: { id: string; area: number; dark?: number | null }[];
};

/**
 * Runs in the page. The figures are the ones lib/figure-system-check.ts finds
 * (frames, and visuals outside any frame other than photographs); each one's
 * stage is its [data-figure-stage], or the figure itself. A paint is dark when
 * its colour, composited over the stage with its own and its ancestors'
 * opacity, has a WCAG relative luminance at or below 0.1: graphite reads
 * 0.023 and ink 0.004, while every role colour on paper reads about 0.15.
 */
export function readStages({ limit, roles }: { limit: number; roles: string[] }): StageRow[] {
  const main = document.querySelector('main') ?? document.body;
  const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const rgba = (colour: string): number[] | null => {
    if (!colour || colour === 'none' || colour.startsWith('url(')) return null;
    const plain = colour.match(/^rgba?\(([^)]+)\)$/);
    if (plain) {
      const [r, g, b, a = 1] = plain[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return a === 0 ? null : [r, g, b, a];
    }
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = colour;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
    return a === 0 ? null : [r, g, b, a / 255];
  };
  const hex = (c: number[]) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const linear = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const luminance = (c: number[]) => 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
  const over = (top: number[], alpha: number, base: number[]) => top.slice(0, 3).map((v, i) => v * alpha + base[i] * (1 - alpha));
  const token = (name: string) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = `var(${name})`;
    document.body.append(probe);
    const colour = rgba(getComputedStyle(probe).backgroundColor);
    probe.remove();
    return colour ? hex(colour) : null;
  };
  const LIGHT = new Set(['--color-paper', '--color-white', '--color-bg', '--color-surface', '--color-surface-2', '--color-concrete'].map(token).filter(Boolean));
  const SIGNAL = token('--color-signal') ?? '#245FFF';
  const DARK = 0.1;
  const backdrop = (el: Element) => {
    const chain: number[][] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const colour = rgba(getComputedStyle(node).backgroundColor);
      if (colour) chain.push(colour);
      if (colour && colour[3] >= 1) break;
    }
    return chain.reverse().reduce((base, colour) => over(colour, colour[3], base), [255, 255, 255]);
  };
  const opacity = (el: Element, root: Element) => {
    let value = 1;
    for (let node: Element | null = el; node && node !== root.parentElement; node = node.parentElement) value *= Number(getComputedStyle(node).opacity);
    return value;
  };
  const clip = (r: DOMRect, boxes: DOMRect[]) => {
    let [l, t, right, bottom] = [r.left, r.top, r.right, r.bottom];
    for (const b of boxes) { l = Math.max(l, b.left); t = Math.max(t, b.top); right = Math.min(right, b.right); bottom = Math.min(bottom, b.bottom); }
    return right > l && bottom > t ? { l, t, w: right - l, h: bottom - t } : null;
  };
  const filled = (el: SVGGeometryElement, box: { l: number; t: number; w: number; h: number }) => {
    const ctm = el.getScreenCTM();
    if (!ctm) return 1;
    const inverse = ctm.inverse();
    let hit = 0;
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      if (el.isPointInFill(new DOMPoint(box.l + ((i + 0.5) * box.w) / 16, box.t + ((j + 0.5) * box.h) / 16).matrixTransform(inverse))) hit++;
    }
    return hit / 256;
  };
  const describe = (el: Element) => {
    const data = [...el.attributes].filter((a) => a.name.startsWith('data-') && a.name !== 'data-light-probe').slice(0, 2).map((a) => (a.value ? `${a.name}="${a.value.slice(0, 40)}"` : a.name));
    const classes = typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 3) : [];
    return `<${[el.tagName.toLowerCase() + classes.map((c) => `.${c}`).join(''), ...data].join(' ')}>`;
  };
  // A gradient's stops count as solid paints, and a pseudo-element as large as its owner: both upper bounds.
  const boxPaints = (s: CSSStyleDeclaration, alpha: number): [string, number][] => [[s.backgroundColor, alpha],
    ...(s.backgroundImage.includes('gradient(') ? s.backgroundImage.match(/rgba?\([^)]+\)/g) ?? [] : []).map((stop): [string, number] => [stop, alpha])];
  const isPhoto = (el: Element) => el.tagName === 'FIGURE' && !!el.querySelector('img') && !el.querySelector('svg, canvas, video');
  const explains = (el: Element) => {
    if (el.closest('a, button, summary, label, [data-brand-device-id]')) return false;
    if (el.getAttribute('role') === 'img' || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return true;
    const [, , w, h] = (el.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    return w >= 160 && h >= 90;
  };
  const candidates = '[data-motion-scene], [data-brand-module-signature="instrument-frame"], [data-brand-surface-id*="instrument"], [data-instrument], figure, canvas, video, svg';
  const loose = [...main.querySelectorAll(candidates)].filter((el) => !el.closest('[data-figure-frame]') && !el.querySelector('[data-figure-frame]')
    && !isPhoto(el) && !el.closest('table') && (el.tagName.toLowerCase() !== 'svg' || explains(el)));
  const all = [...main.querySelectorAll('[data-figure-frame]'), ...loose];
  const figures = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));

  return figures.map((figure, index) => {
    const stage = figure.querySelector('[data-figure-stage]') ?? figure;
    const box = stage.getBoundingClientRect();
    const area = box.width * box.height;
    const ground = backdrop(stage);
    const name = figure.getAttribute('data-figure-frame') ?? figure.getAttribute('data-motion-scene') ?? describe(figure);
    // A canvas, video or image that is its own stage paints pixels no computed style sees.
    const raster = /^(img|canvas|video)$/i.test(stage.tagName);
    const row: StageRow = { figure: name, stage: area > 0 ? (raster ? 'raster' : hex(ground)) : null, stageArea: Math.round(area), dark: null, mark: null, signal: [], rasters: [] };
    if (!area) return row;
    if (raster) {
      stage.setAttribute('data-light-probe', `${index}-stage`);
      row.rasters.push({ id: `${index}-stage`, area: 1 });
    }
    const frameBox = figure.getBoundingClientRect();
    const keep = (slot: 'dark' | 'mark', share: number, colour: number[], at: string) => {
      if (share > (row[slot]?.share ?? 0)) row[slot] = { share: Math.round(share * 1000) / 1000, colour: hex(colour), at };
    };
    for (const el of figure.querySelectorAll('*')) {
      if ((raster && el === stage) || el.closest('.sr-only, defs, pattern, clipPath, mask') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const svg = el instanceof SVGElement ? el.closest('svg') : null;
      const visible = clip(el.getBoundingClientRect(), svg && svg !== el ? [frameBox, svg.getBoundingClientRect()] : [frameBox]);
      if (!visible) continue;
      const share = (visible.w * visible.h) / area;
      const style = getComputedStyle(el);
      if (/^(img|canvas|video|image)$/i.test(el.tagName)) {
        if (share >= limit) {
          const id = `${index}-${row.rasters.length}`;
          el.setAttribute('data-light-probe', id);
          row.rasters.push({ id, area: Math.round(share * 1000) / 1000 });
        }
        continue;
      }
      const geometry = el instanceof SVGGeometryElement;
      const mark = !!el.closest('[data-chart-mark], [data-scene-mark]');
      if (geometry && !el.closest('a[href]')) {
        for (const paint of [style.fill, style.stroke]) {
          const colour = rgba(paint);
          if (colour && hex(colour) === SIGNAL) row.signal.push(describe(el));
        }
      }
      if (share < limit) continue;
      const paints: [string, number][] = el instanceof SVGSVGElement
        ? boxPaints(style, 1)
        : el instanceof SVGElement
          ? ((geometry && el.tagName !== 'line') || el.tagName === 'use' ? [[style.fill, Number(style.fillOpacity)]] : [])
          : [...boxPaints(style, 1), ...(['::before', '::after'] as const)
            .map((pseudo) => getComputedStyle(el, pseudo))
            .filter((p) => p.content !== 'none' && p.content !== 'normal')
            .flatMap((p) => boxPaints(p, Number(p.opacity)))];
      for (const [paint, alpha] of paints) {
        const colour = rgba(paint);
        if (!colour) continue;
        const shown = over(colour, colour[3] * alpha * opacity(el, figure), ground);
        if (LIGHT.has(hex(shown)) || luminance(shown) > DARK) continue;
        const covered = geometry ? share * filled(el as SVGGeometryElement, visible) : share;
        if (mark && roles.includes(hex(colour))) keep('mark', covered, colour, describe(el));
        else keep('dark', covered, colour, describe(el));
      }
    }
    return row;
  });
}
