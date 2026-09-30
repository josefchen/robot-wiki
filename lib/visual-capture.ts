/**
 * The capture test's page-side census, ported from the owner's visual-audit
 * capture script (owner-visual-audit-20260929/capture.cjs): the same
 * selectors, the same 160x90 floor, outermost visuals only, and the same
 * manifest fields. The functions below run inside the page through
 * page.evaluate, so each one is self-contained.
 */
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

export type VisualEntry = {
  idx: number;
  tag: string;
  kind: 'scene' | 'image' | 'table' | 'figure/instrument';
  scene: string | null;
  surface: string | null;
  label: string;
  w: number;
  h: number;
  colours: Record<string, number>;
  fonts: Record<string, number>;
  file?: string;
  route?: string;
  offpal?: string[];
  error?: string;
};

/** Mark and describe every visual on the page; returns the manifest rows. */
export function censusVisuals(mark: boolean): VisualEntry[] {
  const main = document.querySelector('main') || document.body;
  const cand = new Set<Element>();
  const sel = ['[data-motion-scene]', 'figure', '[data-brand-surface-id*="instrument"]', '[data-instrument]', 'svg', 'canvas', 'img', 'video', 'table'];
  for (const s of sel) main.querySelectorAll(s).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width >= 160 && r.height >= 90) cand.add(el);
  });
  const list = [...cand].filter((el) => ![...cand].some((o) => o !== el && o.contains(el)));
  const toHex = (c: string) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length === 4 && p[3] === 0) return null;
    const hex = '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    return p.length === 4 && p[3] < 1 ? hex + '@' + p[3].toFixed(2) : hex;
  };
  return list.map((el, i) => {
    if (mark) el.setAttribute('data-audit-id', String(i));
    const colours: Record<string, number> = {}; const fonts: Record<string, number> = {};
    for (const n of [el, ...el.querySelectorAll('*')]) {
      const cs = getComputedStyle(n);
      const props = n instanceof SVGElement ? ['fill', 'stroke', 'color', 'stop-color'] : ['color', 'background-color', 'border-top-color'];
      for (const p of props) {
        const v = cs.getPropertyValue(p);
        if (!v || v === 'none' || v.startsWith('url(')) continue;
        if (p === 'border-top-color' && parseFloat(cs.borderTopWidth) === 0) continue;
        if (p === 'color' && n instanceof SVGElement) continue;
        const hx = toHex(v); if (hx) colours[hx] = (colours[hx] || 0) + 1;
      }
      if (n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? '').trim())) {
        const f = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() + ' ' + cs.fontSize;
        fonts[f] = (fonts[f] || 0) + 1;
      }
    }
    const r = el.getBoundingClientRect();
    let label = el.getAttribute('aria-label') || el.querySelector('figcaption, [data-instrument-title], h3, h4')?.textContent || '';
    if (!label) { let p: Element | null = el; while (p && !label) { p = p.previousElementSibling || p.parentElement; if (p && /^H[2-3]$/.test(p.tagName)) label = 'after: ' + p.textContent; } }
    const scene = el.getAttribute('data-motion-scene') || el.querySelector('[data-motion-scene]')?.getAttribute('data-motion-scene') || null;
    return {
      idx: i, tag: el.tagName.toLowerCase(),
      kind: scene ? 'scene' : el.tagName === 'IMG' || el.querySelector('img') ? 'image' : el.tagName === 'TABLE' ? 'table' : 'figure/instrument',
      scene,
      surface: el.getAttribute('data-brand-surface-id') || el.querySelector('[data-brand-surface-id]')?.getAttribute('data-brand-surface-id') || null,
      label: label.trim().slice(0, 120), w: Math.round(r.width), h: Math.round(r.height), colours, fonts,
    };
  });
}

/** Every colour token the page declares, resolved to hex: the palette. */
export function tokenPalette(): string[] {
  const names = new Set<string>();
  for (const sheet of [...document.styleSheets]) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of [...rules]) {
      const text = rule.cssText;
      for (const m of text.matchAll(/(--(?:color|role)-[a-z0-9-]+)\s*:/g)) names.add(m[1]);
    }
  }
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const out = new Set<string>();
  for (const name of names) {
    probe.style.color = `var(${name})`;
    const m = getComputedStyle(probe).color.match(/rgba?\(([^)]+)\)/);
    if (!m) continue;
    const p = m[1].split(',').map((x) => parseFloat(x));
    out.add('#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase());
  }
  probe.remove();
  return [...out].sort();
}

/**
 * Clone every element matching `selector` into one labelled grid laid over
 * the page (#tile-sheet), for a contact sheet of marks too small for the
 * census floor. Clones keep their classes, so each renders with the page's
 * own treatment. Returns the number of tiles.
 */
export async function tileSheet({ selector, labelAttr }: { selector: string; labelAttr: string }): Promise<number> {
  const sheet = document.createElement('div');
  sheet.id = 'tile-sheet';
  sheet.style.cssText = 'position:absolute;left:0;top:0;z-index:2147483647;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:16px 12px;width:1408px;padding:16px;background:#F5F6F7';
  const tiles = [...document.querySelectorAll(selector)];
  for (const tile of tiles) {
    const cell = document.createElement('div');
    cell.style.cssText = 'display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:4px;font:11px/1.2 monospace;color:#0B0B0C';
    const clone = tile.cloneNode(true) as HTMLElement;
    const label = document.createElement('span');
    label.textContent = (tile.closest(`[${labelAttr}]`) ?? tile).getAttribute(labelAttr) ?? '';
    cell.append(clone, label);
    sheet.append(cell);
  }
  document.body.append(sheet);
  await Promise.all([...sheet.querySelectorAll('img')].map((img) => { img.loading = 'eager'; return img.decode().catch(() => undefined); }));
  window.scrollTo(0, 0);
  return tiles.length;
}

/** Standard deviation of a screenshot's luminance; near zero means blank. */
export async function imageSpread(dataUrl: string): Promise<number> {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let sum = 0; let sq = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; sum += l; sq += l * l; }
  return Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2));
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary', '.stl': 'model/stl', '.urdf': 'application/xml', '.wasm': 'application/wasm',
};

/** Serve a static export the way the host does: /route/ reads route/index.html. */
export function serveExport(root: string, port = 0): Promise<{ server: Server; base: string }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    const tries = [join(root, path), join(root, path, 'index.html'), join(root, `${path}.html`)];
    const file = tries.find((p) => p.startsWith(root) && existsSync(p) && statSync(p).isFile());
    if (!file) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    resolve({ server, base: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : port}` });
  }));
}

/** The Sitemap URLs of an export, as routes. */
export function sitemapRoutes(root: string): string[] {
  const xml = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}
