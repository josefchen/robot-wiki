/** Compact reading for every activated release profile. This function is
 * self-contained because Playwright serializes it into the page. */
export function collectReleaseResidueState() {
  const findings: string[] = [];
  let elements = 0;
  const colours = new Map<string, string>();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) throw Error('No sRGB canvas for residue colour normalization');
  const normalize = (value: string) => {
    const known = colours.get(value);
    if (known) return known;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const bytes = context.getImageData(0, 0, 1, 1).data;
    const hex = bytes[3] === 0 ? 'transparent' : '#' + [bytes[0], bytes[1], bytes[2]].map(x => x.toString(16).padStart(2, '0')).join('');
    colours.set(value, hex);
    return hex;
  };
  for (const element of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) continue;
    const css = getComputedStyle(element);
    if (css.display === 'none' || css.visibility === 'hidden' || !element.getClientRects().length) continue;
    elements++;
    const label = element.id ? '#' + element.id : element.tagName.toLowerCase() + ' ' + (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 70);
    const text = [...element.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent ?? '').join(' ').trim();
    const technical = Boolean(element.closest('pre,code')) || Boolean(element.closest('a[href]') && /^(https?:\/\/|www\.|[\w.-]+\.(com|org|io)\/)/i.test(text));
    for (const name of ['aria-label', 'aria-description', 'alt', 'title', 'placeholder']) {
      const value = element.getAttribute(name);
      if (value && !/^(https?:\/\/|\/)/.test(value) && (/\brobot-wiki\b|\bRobot-Wiki\b|\bROBOT WIKI\b/.test(value) || /robotics\s+encyclopa?edia/i.test(value))) findings.push('mixed-accessible-identity: ' + label + ' ' + name);
    }
    if (!technical && /\brobot-wiki\b|\bRobot-Wiki\b|\bROBOT WIKI\b/.test(text)) findings.push('legacy-public-identity: ' + label);
    if (/robotics\s+encyclopa?edia/i.test(text)) findings.push('legacy-descriptor: ' + label);
    if (element.matches('h1,h2,h3,[data-tektur-role*="wordmark"]') && /IBM Plex Sans/i.test(css.fontFamily)) findings.push('legacy-display-face: ' + label);
    for (const [property, value] of Object.entries({
      color: css.color,
      background: css.backgroundColor,
      border: css.borderTopColor,
      fill: css.fill,
      stroke: css.stroke
    })) {
      if (!value || value === 'none') continue;
      const hex = normalize(value);
      if (['#245edb', '#245fff'].includes(hex)) findings.push('legacy-signal: ' + label + ' ' + property + ' ' + hex);
      if (['#f4f3ef', '#fbfaf7', '#eceae4'].includes(hex)) findings.push('legacy-surface: ' + label + ' ' + property + ' ' + hex);
      if (hex === '#c6ff19') findings.push('retired-lime: ' + label + ' ' + property);
    }
    if (element.matches('button,[role="button"],input[type="submit"]') && ['#245edb', '#245fff', '#3b6ea8'].includes(normalize(css.backgroundColor))) findings.push('blue-filled-action: ' + label);
    if (css.backdropFilter && css.backdropFilter !== 'none') findings.push('glass: ' + label);
  }
  return {
    elements,
    colourValues: colours.size,
    findings: [...new Set(findings)].sort()
  };
}
