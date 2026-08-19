/**
 * The shared in-page definitions from contract/design-integrity.md.
 *
 * Single source of truth for `doublyBoxed` and friends: design-chrome.spec.ts
 * (the sealed VAL-DESIGN-019 gate) and chart-state-descriptions.spec.ts (the
 * VAL-EDU-031 regression guard) must grade boxing with the SAME definition,
 * which is this repo's encoding of the VAL-DESIGN-019 wording. It has been
 * verified to agree with an independent implementation hit-for-hit; do not
 * paraphrase it into something weaker.
 */
export const DESIGN_DEFS = `
function alpha(color) {
  const m = color.match(/rgba?\\(([^)]+)\\)/);
  if (!m) return 1;
  const parts = m[1].split(',').map((s) => parseFloat(s));
  return parts.length === 4 ? parts[3] : 1;
}
function visible(el) {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
}
function fullyBordered(el) {
  const cs = getComputedStyle(el);
  return ['Top', 'Right', 'Bottom', 'Left'].every(
    (s) => parseFloat(cs['border' + s + 'Width']) >= 1 && alpha(cs['border' + s + 'Color']) > 0,
  );
}
function realInput(el) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.hasAttribute('contenteditable');
}
function microLabels() {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (text.length < 3) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs > 15) continue;
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    if (ls / fs < 0.02) continue;
    const upper = cs.textTransform === 'uppercase' || (text === text.toUpperCase() && /[A-Z]/.test(text));
    if (!upper || !visible(el)) continue;
    out.push({ text, em: Math.round((ls / fs) * 1000) / 1000 });
  }
  return out;
}
function eyebrows() {
  const headings = [...document.querySelectorAll('h1, h2, h3')];
  return microLabels().filter((l) => {
    const el = [...document.querySelectorAll('*')].find(
      (e) => e.children.length === 0 && (e.textContent || '').trim() === l.text,
    );
    if (!el) return false;
    if (el.tagName === 'LABEL') return false; // a control's own label is not an eyebrow
    const r = el.getBoundingClientRect();
    return headings.some((h) => {
      const hr = h.getBoundingClientRect();
      return hr.top - r.bottom >= -1 && hr.top - r.bottom <= 48 && Math.abs(hr.left - r.left) <= 8;
    });
  });
}
// doublyBoxedAmong: the doubly-boxed test restricted to a given element
// list. Identical logic to doublyBoxed(); the sealed gate calls
// doublyBoxed() with the site-wide selector list.
function doublyBoxedAmong(els) {
  const out = [];
  for (const el of els) {
    if (!visible(el) || realInput(el) || !fullyBordered(el)) continue;
    let anc = el.parentElement;
    let nested = false;
    while (anc) {
      const cs = getComputedStyle(anc);
      const any = ['Top', 'Right', 'Bottom', 'Left'].some(
        (s) => parseFloat(cs['border' + s + 'Width']) >= 1 && alpha(cs['border' + s + 'Color']) > 0,
      );
      if (any) { nested = fullyBordered(anc); break; }
      anc = anc.parentElement;
    }
    let flush = false;
    const r = el.getBoundingClientRect();
    for (const sib of [el.previousElementSibling, el.nextElementSibling]) {
      if (!sib || realInput(sib) || !fullyBordered(sib)) continue;
      const sr = sib.getBoundingClientRect();
      const hGap = Math.max(r.left - sr.right, sr.left - r.right);
      const vGap = Math.max(r.top - sr.bottom, sr.top - r.bottom);
      if (hGap < 4 && vGap < 4) flush = true;
    }
    if (nested || flush) out.push(el.tagName + '.' + (el.getAttribute('class') || '').slice(0, 40));
  }
  return out;
}
function doublyBoxed() {
  return doublyBoxedAmong(
    document.querySelectorAll('button, a, [role="button"], [aria-hidden="true"]'),
  );
}
`;
