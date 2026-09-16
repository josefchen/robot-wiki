'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

type IntentLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch'>;

/**
 * A resource-conscious internal link for dense navigation surfaces.
 *
 * Next's default prefetches every static route as soon as its link enters the
 * viewport. That is wasteful in indexes where only one of many destinations
 * will be opened. Keep viewport prefetch disabled, then restore it for the
 * destination signalled by pointer hover or keyboard focus.
 */
export function IntentLink({
  onFocus,
  onMouseEnter,
  ...props
}: IntentLinkProps) {
  const [hasIntent, setHasIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={hasIntent ? null : false}
      onFocus={(event) => {
        setHasIntent(true);
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        setHasIntent(true);
        onMouseEnter?.(event);
      }}
    />
  );
}
