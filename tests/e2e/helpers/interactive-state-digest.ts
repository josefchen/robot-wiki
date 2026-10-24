import { createHash } from 'node:crypto';
import type { Locator } from '@playwright/test';

/**
 * A mount's state: a canonical walk of its tree, plus every control's
 * current value, which markup does not carry.
 *
 * The walk reads what a re-render can change without changing the state as
 * the same thing: attributes sorted (React writes them in another order when
 * the client re-renders a server-rendered element), inline styles in their
 * CSSOM serialisation (`opacity:0` from the server, `opacity: 0;` from the
 * client) with an emptied one dropped, text without the server's `<!-- -->`
 * separators, and React's generated ids folded (a re-mounted subtree gets a
 * client id). Live announcements are emptied: an announcement of the last
 * action is not state the reader returns to.
 *
 * The capture sweep and the keyboard ledger both compare states by it, so a
 * default the ledger returns to is the default the captures recorded. The
 * ledger's own `data-ledger-*` marks (the mount it drives, the index of each
 * control) are not the figure's state and are left out, and neither is a
 * stage's `data-inview`, which says whether the reader has scrolled it into
 * view.
 */
export async function stateDigest(root: Locator): Promise<string> {
  const state = await root.evaluate((element) => {
    const fold = (value: string) => value.replace(/_[rR]_[A-Za-z0-9]*_/g, '_id_').replace(/:[rR][A-Za-z0-9]*:/g, ':id:');
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      const current = node as HTMLElement | SVGElement;
      const attributes = [...current.attributes]
        .filter(({ name }) => name !== 'style' && name !== 'data-inview' && !name.startsWith('data-ledger-'))
        .map(({ name, value }) => `${name}="${fold(value)}"`);
      const style = current.style?.cssText.trim();
      if (style) attributes.push(`style="${style}"`);
      const tag = current.tagName.toLowerCase();
      const live = current.matches('[aria-live], [role="status"], [role="alert"]');
      const children = live ? '' : [...current.childNodes].map(walk).join('');
      return `<${tag} ${attributes.sort().join(' ')}>${children}</${tag}>`;
    };
    const controls = [...element.querySelectorAll('input, select, textarea')].map((control) =>
      control instanceof HTMLInputElement
        ? `${control.type}:${control.value}:${control.checked}`
        : (control as HTMLSelectElement | HTMLTextAreaElement).value,
    );
    return `${walk(element)}\n${controls.join('|')}`;
  });
  return createHash('sha256').update(state).digest('hex');
}
