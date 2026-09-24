import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    ...props
  }: {
    href: string;
    prefetch: boolean | null;
    [key: string]: unknown;
  }) => (
    <a
      href={href}
      data-prefetch={prefetch === false ? 'off' : 'auto'}
      {...props}
    />
  ),
}));

import { IntentLink } from '@/components/ui/intent-link';

describe('IntentLink', () => {
  it('avoids viewport prefetch until pointer intent', () => {
    render(<IntentLink href="/glossary">Glossary</IntentLink>);
    const link = screen.getByRole('link', { name: 'Glossary' });

    expect(link).toHaveAttribute('data-prefetch', 'off');
    fireEvent.mouseEnter(link);
    expect(link).toHaveAttribute('data-prefetch', 'auto');
  });

  it('enables prefetch for keyboard focus and preserves event handlers', () => {
    const onFocus = vi.fn();
    render(
      <IntentLink href="/a-z" onFocus={onFocus}>
        A-Z Index
      </IntentLink>,
    );
    const link = screen.getByRole('link', { name: 'A-Z Index' });

    fireEvent.focus(link);
    expect(link).toHaveAttribute('data-prefetch', 'auto');
    expect(onFocus).toHaveBeenCalledOnce();
  });
});
