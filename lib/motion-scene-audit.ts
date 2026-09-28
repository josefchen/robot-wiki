/** Rendered scene audit shared by the capture command and browser tests. */
export interface SceneAudit {
  textCount: number;
  markCount: number;
  intersections: string[];
  overflow: string[];
  contrast: Array<{ control: string; ratio: number; foreground: string; background: string }>;
  lowContrast: string[];
}

/**
 * Runs inside the page, after fonts and the named beat have settled.
 * `getBoundingClientRect` includes SVG transforms but not stroke paint.
 * Expand visible geometry by its stroke in CSS pixels, including lines
 * whose geometric rectangle has zero width or height. Axes, grid and label
 * leaders remain structural rather than observations.
 */
export function auditSceneElement(root: Element): SceneAudit {
  const intersections: string[] = [];
  const overflow: string[] = [];
  const contrast: SceneAudit['contrast'] = [];
  const lowContrast: string[] = [];
  const svg = root.querySelector<SVGSVGElement>('[data-motion-stage] svg');
  if (!svg) throw new Error('scene stage SVG is missing');
  const stage = svg.getBoundingClientRect();
  const visible = (element: Element) => {
    for (let node: Element | null = element; node && node !== root.parentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.01) return false;
    }
    return true;
  };
  const boxes = (selector: string) =>
    [...svg.querySelectorAll<Element>(selector)]
      .filter(visible)
      .map((element, index) => ({
        name: `${element.getAttribute('data-scene-label') ?? element.getAttribute('data-scene-mark') ?? element.textContent?.trim() ?? element.tagName}#${index}`,
        rect: element.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.width > 0.01 && rect.height > 0.01);
  const text = boxes('text, [data-scene-equation]');
  const paintedRect = (element: SVGGraphicsElement): DOMRect | null => {
    const geometry = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const line = element instanceof SVGLineElement;
    // A zero-length line, or a zero-area filled shape, paints nothing.
    if (geometry.width <= 0.01 && geometry.height <= 0.01) return null;
    const filled = !line && style.fill !== 'none' && Number(style.fillOpacity) > 0.01 &&
      geometry.width > 0.01 && geometry.height > 0.01;
    const stroked = style.stroke !== 'none' && Number(style.strokeOpacity) > 0.01 &&
      Number.parseFloat(style.strokeWidth) > 0;
    if (!filled && !stroked) return null;
    if (!stroked) return geometry;
    const matrix = element.getScreenCTM();
    if (!matrix) return null;
    const half = Number.parseFloat(style.strokeWidth) / 2;
    const nonScaling = style.vectorEffect === 'non-scaling-stroke';
    let dx: number;
    let dy: number;
    if (line) {
      const lengthX = element.x2.baseVal.value - element.x1.baseVal.value;
      const lengthY = element.y2.baseVal.value - element.y1.baseVal.value;
      const length = Math.hypot(lengthX, lengthY);
      if (length <= 0.01) return null;
      const nx = -lengthY / length;
      const ny = lengthX / length;
      if (nonScaling) {
        const screenLength = Math.hypot(matrix.a * lengthX + matrix.c * lengthY,
          matrix.b * lengthX + matrix.d * lengthY);
        dx = half * Math.abs((matrix.b * lengthX + matrix.d * lengthY) / screenLength);
        dy = half * Math.abs((matrix.a * lengthX + matrix.c * lengthY) / screenLength);
      } else {
        dx = half * Math.abs(matrix.a * nx + matrix.c * ny);
        dy = half * Math.abs(matrix.b * nx + matrix.d * ny);
      }
      if (style.strokeLinecap !== 'butt') {
        // Round/square caps extend by half a stroke along the tangent.
        const scale = nonScaling ? 1 / Math.hypot(matrix.a * lengthX + matrix.c * lengthY,
          matrix.b * lengthX + matrix.d * lengthY) * length : 1;
        dx += half * Math.abs(matrix.a * lengthX / length + matrix.c * lengthY / length) * scale;
        dy += half * Math.abs(matrix.b * lengthX / length + matrix.d * lengthY / length) * scale;
      }
    } else {
      dx = half * (nonScaling ? 1 : Math.hypot(matrix.a, matrix.c));
      dy = half * (nonScaling ? 1 : Math.hypot(matrix.b, matrix.d));
    }
    return new DOMRect(geometry.left - dx, geometry.top - dy,
      geometry.width + 2 * dx, geometry.height + 2 * dy);
  };
  const marks = [...svg.querySelectorAll<Element>('circle, ellipse, line, path, polygon, polyline, rect')]
    .filter((element) => !element.closest('[data-scene-structure]') && visible(element))
    .map((element, index) => ({
      name: `${element.getAttribute('data-scene-mark') ?? element.tagName.toLowerCase()}#${index}`,
      rect: paintedRect(element as SVGGraphicsElement),
    }))
    .filter((item): item is { name: string; rect: DOMRect } => item.rect !== null);
  const intersects = (a: DOMRect, b: DOMRect) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.1;
  for (let i = 0; i < text.length; i += 1) {
    for (let j = i + 1; j < text.length; j += 1) {
      if (intersects(text[i].rect, text[j].rect)) {
        intersections.push(`text ${text[i].name} / text ${text[j].name}`);
      }
    }
    for (const mark of marks) {
      if (intersects(text[i].rect, mark.rect)) {
        intersections.push(`text ${text[i].name} / mark ${mark.name}`);
      }
    }
  }
  for (const item of [...text, ...marks]) {
    const { rect } = item;
    if (
      rect.left < stage.left + 4 - 0.1 ||
      rect.top < stage.top + 4 - 0.1 ||
      rect.right > stage.right - 4 + 0.1 ||
      rect.bottom > stage.bottom - 4 + 0.1
    ) {
      overflow.push(`${item.name}: ${[rect.left - stage.left, rect.top - stage.top, stage.right - rect.right, stage.bottom - rect.bottom].map((n) => n.toFixed(1)).join('/')} px`);
    }
  }

  const rgba = (value: string): [number, number, number, number] => {
    const values = value.match(/[\d.]+/g)?.map(Number) ?? [];
    if (values.length < 3) throw new Error(`unresolved control color: ${value}`);
    const scale = value.startsWith('color(srgb ') ? 255 : 1;
    return [values[0] * scale, values[1] * scale, values[2] * scale, values[3] ?? 1];
  };
  const over = (top: number[], bottom: number[]): number[] => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);
    return [
      ...[0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha),
      alpha,
    ];
  };
  const background = (element: Element): number[] => {
    const layers: number[][] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      layers.push(rgba(getComputedStyle(node).backgroundColor));
    }
    return layers.reverse().reduce((base, layer) => over(layer, base), [255, 255, 255, 1]);
  };
  const luminance = (color: number[]) => {
    const linear = color.slice(0, 3).map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const ratio = (a: number[], b: number[]) => {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
  };
  const controls = root.querySelectorAll<HTMLElement>('[data-brand-control-id]');
  for (const control of controls) {
    if (!visible(control)) continue;
    const label = control.getAttribute('aria-label') ?? control.textContent?.trim() ?? control.tagName;
    const bg = background(control);
    const style = getComputedStyle(control);
    const foreground = control instanceof HTMLInputElement && control.type === 'range'
      ? style.accentColor
      : style.color;
    let alpha = 1;
    for (let node: Element | null = control; node && node !== root.parentElement; node = node.parentElement) {
      alpha *= Number(getComputedStyle(node).opacity);
    }
    const ink = rgba(foreground);
    ink[3] *= alpha;
    const effective = over(ink, bg);
    const measured = Number(ratio(effective, bg).toFixed(2));
    contrast.push({
      control: label,
      ratio: measured,
      foreground,
      background: `rgb(${bg.slice(0, 3).map((v) => Math.round(v)).join(', ')})`,
    });
    if (measured < 4.5) lowContrast.push(`${label}: ${measured}:1`);
  }
  return { textCount: text.length, markCount: marks.length, intersections, overflow, contrast, lowContrast };
}
