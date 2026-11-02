import { useLayoutEffect, type HTMLAttributes, type RefObject } from 'react';
import { NUMERAL_CLASS, NUMERAL_RUN } from '@/components/ui/number-text';

export { NumberText as ReadoutText } from '@/components/ui/number-text';

/**
 * Animation writers replace a plain readout's textContent without a React
 * render. Decorate that text after each write; rich React children use the
 * declarative numberText formatter instead, keeping their node ownership.
 */
export function usePlainReadoutType(
  ref: { current: HTMLSpanElement | null },
  plain: boolean,
  renderedText: string | number | undefined,
) {
  useLayoutEffect(() => {
    const slot = ref.current;
    if (!slot || !plain) return;
    const options = { childList: true, characterData: true, subtree: true };
    const observer = new MutationObserver(typeset);
    function typeset() {
      if (!slot) return;
      observer.disconnect();
      const text = slot.textContent ?? '';
      const fragment = document.createDocumentFragment();
      text.split(NUMERAL_RUN).forEach((part, index) => {
        if (index % 2) {
          const number = document.createElement('span');
          number.dataset.readoutNumber = '';
          number.className = NUMERAL_CLASS;
          number.textContent = part;
          fragment.append(number);
        } else fragment.append(document.createTextNode(part));
      });
      slot.replaceChildren(fragment);
      observer.observe(slot, options);
    }
    // React writes a new plain child during this commit. Re-typeset that
    // value synchronously as well: waiting for observer delivery leaves a
    // reset temporarily different from its exact initial DOM.
    typeset();
    // A plain-to-rich update must disconnect during the commit. Passive
    // cleanup runs after MutationObserver delivery and could erase the new
    // React-owned children before React next tries to update or remove them.
    return () => observer.disconnect();
  }, [ref, plain, renderedText]);
}

/**
 * A named boundary for a phase written through a ref's textContent. React
 * owns only the span and its plain initial value; the observer owns the
 * numeral wrappers inside it. Rich siblings keep their own React nodes.
 */
export function LiveReadoutText({
  ref,
  children = '',
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'dangerouslySetInnerHTML'> & {
  ref: RefObject<HTMLSpanElement | null>;
  children?: string | number;
}) {
  usePlainReadoutType(ref, true, children);
  return <span {...props} ref={ref}>{children}</span>;
}
