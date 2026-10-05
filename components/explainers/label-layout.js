// Stage label layout, shared by every explainer.
// Each label prefers to sit centred above its anchor. A spot that runs past the stage edge is pulled
// back inside the margin, and a spot that covers an earlier label, a fixed overlay (the interaction
// prompt, the part card) or an anchor gives way to the next spot around the anchor. The leader always
// runs from the label to its own anchor.

/** @typedef {{ x: number, y: number, w: number, h: number }} Box */
/** @typedef {{ ax: number, ay: number, w: number, h: number }} LabelItem */
/** @typedef {{ x1: number, y1: number, x2: number, y2: number }} Leader */

export const LABEL_MARGIN = 6; // px kept clear inside every stage edge
const GAP = 10; // px between a label and its anchor
const SPACE = 4; // px kept clear between two boxes

const clampTo = (x, lo, hi) => (hi < lo ? lo : Math.min(hi, Math.max(lo, x)));

function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w + SPACE) - Math.max(a.x, b.x - SPACE);
  const h = Math.min(a.y + a.h, b.y + b.h + SPACE) - Math.max(a.y, b.y - SPACE);
  return w > 0 && h > 0 ? w * h : 0;
}

const covers = (box, x, y) => x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h;

// Lexicographic: the first differing entry decides.
function better(a, b) {
  for (let k = 0; k < a.length; k += 1) if (a[k] !== b[k]) return a[k] < b[k];
  return false;
}

// Spots around the anchor, best first: above, below, beside, on the diagonals, then stacked further out.
function spots({ ax, ay, w, h }) {
  const above = ay - GAP - h, below = ay + GAP, beside = ay - h / 2;
  const centre = ax - w / 2, right = ax + GAP, left = ax - GAP - w;
  const list = [[centre, above], [centre, below], [right, beside], [left, beside],
    [right, above], [left, above], [right, below], [left, below]];
  for (let k = 1; k <= 4; k += 1) {
    list.push([centre, above - k * (h + SPACE)], [centre, below + k * (h + SPACE)]);
  }
  return list;
}

function leaderFor(box, { ax, ay }) {
  const x = clampTo(ax, box.x, box.x + box.w), y = clampTo(ay, box.y, box.y + box.h);
  return Math.hypot(x - ax, y - ay) < 2 ? null : { x1: ax, y1: ay, x2: x, y2: y };
}

/**
 * Each item is a label's anchor and box size in stage pixels, in priority order (earlier labels keep
 * the better spots). Each returned box is given by its top-left corner.
 * @param {LabelItem[]} items
 * @param {{ width: number, height: number, obstacles?: Box[] }} stage
 * @returns {{ box: Box, leader: Leader | null }[]}
 */
export function layoutLabels(items, { width, height, obstacles = [] }) {
  const placed = [...obstacles];
  return items.map((item, index) => {
    const anchors = items.filter((_, j) => j !== index);
    /** @type {{ box: Box, score: number[] } | null} */
    let best = null;
    for (const [sx, sy] of spots(item)) {
      const box = {
        x: clampTo(sx, LABEL_MARGIN, width - LABEL_MARGIN - item.w),
        y: clampTo(sy, LABEL_MARGIN, height - LABEL_MARGIN - item.h),
        w: item.w,
        h: item.h,
      };
      const area = placed.reduce((sum, o) => sum + overlapArea(box, o), 0);
      const score = [area > 0 ? 1 : 0, covers(box, item.ax, item.ay) ? 1 : 0,
        anchors.filter((o) => covers(box, o.ax, o.ay)).length, area];
      if (!best || better(score, best.score)) best = { box, score };
      if (score.every((s) => s === 0)) break;
    }
    const { box } = /** @type {{ box: Box }} */ (best);
    placed.push(box);
    return { box, leader: leaderFor(box, item) };
  });
}
