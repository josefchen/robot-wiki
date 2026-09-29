'use client';

import { useServerInsertedHTML } from 'next/navigation';

/**
 * Counts author-list activations that arrive before the button hydrates.
 * The listener has to be in the initial HTML: the bibliography tests press
 * Enter as soon as the server button is focused, and a client effect is
 * still too late. Inserted only on the server so the client render does
 * not warn about a script tag.
 */
const AUTHOR_TOGGLE_SCRIPT =
  '(()=>{if(window.__rwAuthorToggleBound)return;window.__rwAuthorToggleBound=true;document.addEventListener("click",function(event){var node=event.target&&event.target.closest&&event.target.closest("[data-author-toggle]");if(!node)return;var id=node.getAttribute("data-author-toggle");if(!id)return;var pending=window.__rwAuthorToggle||(window.__rwAuthorToggle={});pending[id]=(pending[id]||0)+1;},true);})();';

export function AuthorToggleEarly() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: AUTHOR_TOGGLE_SCRIPT }} />
  ));
  return null;
}
