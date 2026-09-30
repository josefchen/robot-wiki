/**
 * Contact sheets for the capture test: plain HTML grids of the captured
 * visuals, screenshotted by the capture script. A pair sheet sets each
 * route's before and after captures side by side, matched per visual.
 */
import type { VisualEntry } from './visual-capture.ts';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `
  body { margin: 0; padding: 24px; background: #F5F6F7; color: #0B0B0C; font: 13px/1.35 system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  h2 { font-size: 15px; margin: 28px 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .pairs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; align-items: start; }
  figure { margin: 0; }
  img { display: block; max-width: 100%; max-height: 420px; border: 1px solid #D9DADB; background: #fff; }
  figcaption { margin-top: 4px; color: #3a3f44; word-break: break-word; }
  .none { padding: 24px; border: 1px dashed #7D7A73; color: #3a3f44; }
  .col { font-weight: 600; margin-bottom: 4px; }
`;

function tile(entry: VisualEntry | undefined, prefix: string): string {
  if (!entry) return '<div class="none">no visual</div>';
  const note = `${entry.route ?? ''} #${entry.idx} ${entry.kind}${entry.scene ? ` ${entry.scene}` : ''} ${entry.w}x${entry.h}`;
  const img = entry.file ? `<img src="${escape(prefix + entry.file)}" alt="">` : `<div class="none">${escape(entry.error ?? 'not captured')}</div>`;
  return `<figure>${img}<figcaption>${escape(note)}<br>${escape(entry.label)}</figcaption></figure>`;
}

/** One contact sheet: a titled grid of captured visuals. */
export function sheetHtml(title: string, entries: VisualEntry[], prefix: string): string {
  return `<!doctype html><meta charset="utf-8"><style>${STYLE}</style><h1>${escape(title)}</h1>` +
    `<div class="grid">${entries.map((entry) => tile(entry, prefix)).join('')}</div>`;
}

const key = (entry: VisualEntry) =>
  entry.scene ?? entry.label.toLowerCase().replace(/\d+(\.\d+)?/g, '#').replace(/\s+/g, ' ').trim();

/** Match a route's before and after visuals: scene id or label first, then order. */
export function pairVisuals(before: VisualEntry[], after: VisualEntry[]): [VisualEntry | undefined, VisualEntry | undefined][] {
  const pairs: [VisualEntry | undefined, VisualEntry | undefined][] = [];
  const left = [...before];
  const unmatched: VisualEntry[] = [];
  for (const entry of after) {
    const at = left.findIndex((candidate) => key(candidate) === key(entry));
    if (at >= 0) pairs.push([left.splice(at, 1)[0], entry]);
    else unmatched.push(entry);
  }
  for (const entry of unmatched) pairs.push([left.shift(), entry]);
  for (const entry of left) pairs.push([entry, undefined]);
  return pairs.sort((a, b) => (a[1]?.idx ?? a[0]?.idx ?? 0) - (b[1]?.idx ?? b[0]?.idx ?? 0));
}

/** One pair sheet: per route, before on the left and after on the right. */
export function pairHtml(
  title: string,
  routes: { route: string; pairs: [VisualEntry | undefined, VisualEntry | undefined][] }[],
  beforePrefix: string,
  afterPrefix: string,
): string {
  const body = routes.map(({ route, pairs }) =>
    `<h2>${escape(route)}</h2><div class="pairs"><div class="col">Before</div><div class="col">After</div>` +
    pairs.map(([b, a]) => tile(b, beforePrefix) + tile(a, afterPrefix)).join('') + '</div>').join('');
  return `<!doctype html><meta charset="utf-8"><style>${STYLE}</style><h1>${escape(title)}</h1>${body}`;
}
