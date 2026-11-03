/** Read fonts actually requested by visible text. A failed optional local
 * fallback face is recorded separately when no visible text selects it as
 * its first family; it cannot hide a failed or still-loading painted face. */
export function readReleaseFonts() {
  const groups = new Map<string, { family: string; descriptor: string; characters: Set<string> }>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const node = text.parentElement;
    if (!node || !text.textContent?.trim() || node.closest('script,style,template,.sr-only,[aria-hidden="true"]') || !node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !node.getClientRects().length) continue;
    const style = getComputedStyle(node);
    const family = style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    const descriptor = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${JSON.stringify(family)}`;
    const group = groups.get(descriptor) ?? { family, descriptor, characters: new Set<string>() };
    for (const character of text.textContent) group.characters.add(character);
    groups.set(descriptor, group);
  }
  const used = [...groups.values()].map(({ family, descriptor, characters }) => {
    const sample = [...characters].sort().join('');
    let ready = false;
    try { ready = document.fonts.check(descriptor, sample); } catch { /* Invalid font descriptors fail closed. */ }
    return { family, descriptor, characters: sample, ready };
  }).sort((a, b) => a.descriptor.localeCompare(b.descriptor));
  const familyName = (name: string) => name.replace(/^["']|["']$/g, '');
  const usedFamilies = new Set(used.map(({ family }) => family));
  const problematic = [...document.fonts].filter(({ status }) => status === 'loading' || status === 'error')
    .map(({ family, status, weight, style }) => ({ family: familyName(family), status:status as 'loading'|'error', weight, style }));
  return { status: document.fonts.status, used,
    usedFaceFailures: problematic.filter(({ family }) => usedFamilies.has(family)),
    unusedFaceFailures: problematic.filter(({ family }) => !usedFamilies.has(family)) };
}
