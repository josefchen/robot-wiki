/**
 * The phone fit of an isometric figure: the window of its viewBox that the
 * machine itself fills, for a figure whose desktop viewBox is wider than the
 * machine (its height bounds the fit, so the machine sits between two empty
 * margins). On a wide page those margins are the figure's breathing room;
 * on a phone they are width the drawing cannot use. The window is computed
 * from the same extreme points and projection that place the drawing, so it
 * holds every part, plus a pad on each side, and never cuts one.
 *
 * IsoFigure takes the result as `fit` and writes it as two CSS values that
 * components/iso/iso.css applies only below the phone breakpoint: the svg
 * takes the window's proportions and one transform scales the drawing so the
 * window fills it. The viewBox, the paths and the desktop picture are
 * unchanged, and nothing depends on JavaScript, so the server's HTML and the
 * hydrated page agree at every width.
 */
import { iso, type Point3, type Projection } from './iso-kit.ts';

export interface PhoneFit {
  /** The window in viewBox units: x, y, width, height. */
  view: readonly [number, number, number, number];
  /** The window's proportions, as a CSS aspect-ratio. */
  aspect: string;
  /** The transform that scales the window to fill the svg box. */
  transform: string;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/** The phone fit for a drawing of `points` placed by `projection` in a width by height viewBox. */
export function phoneFitOf(points: Point3[], projection: Projection, width: number, height: number, { pad = 12 }: { pad?: number } = {}): PhoneFit {
  const flat = points.map((point) => iso(point, projection));
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  const left = Math.max(0, Math.min(...xs) - pad);
  const right = Math.min(width, Math.max(...xs) + pad);
  const top = Math.max(0, Math.min(...ys) - pad);
  const bottom = Math.min(height, Math.max(...ys) + pad);
  return phoneFitOfWindow([left, top, right - left, bottom - top], width, height);
}

/**
 * The fit for a given window. With `preserveAspectRatio` meet, an svg box of
 * the window's proportions shows a region of user space centred on the
 * viewBox and as large as the viewBox in the bounding direction; scaling the
 * window by k about that centre fills the region exactly.
 */
export function phoneFitOfWindow([x, y, w, h]: readonly [number, number, number, number], width: number, height: number): PhoneFit {
  const shownWidth = Math.max(width, (height * w) / h);
  const k = shownWidth / w;
  const tx = width / 2 - k * (x + w / 2);
  const ty = height / 2 - k * (y + h / 2);
  return {
    view: [round(x), round(y), round(w), round(h)],
    aspect: `${round(w)} / ${round(h)}`,
    transform: `translate(${round(tx)}px, ${round(ty)}px) scale(${round(k)})`,
  };
}
