import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card } from '@/components/ui/card';

// Internal navigation must go through next/link (AGENTS.md convention:
// next/link for internal routes, native <a> only for external links). The
// mock keeps the anchor semantics (role/href assertions still work) while
// recording every internal href Link is asked to render.
const linkCalls: Array<{ href: string }> = [];
vi.mock('next/link', () => ({
  default: ({ href, ...props }: { href: string; [key: string]: unknown }) => {
    linkCalls.push({ href });
    return <a href={href} {...props} />;
  },
}));

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card body</Card>);
    expect(screen.getByText('Card body')).toBeInTheDocument();
  });

  it('renders the title as a heading', () => {
    render(<Card title="Forward kinematics">Body</Card>);
    expect(
      screen.getByRole('heading', { name: 'Forward kinematics' }),
    ).toBeInTheDocument();
  });

  it('renders as a next/link when href is given', () => {
    linkCalls.length = 0;
    render(
      <Card href="/manipulation/action-chunking" title="Action chunking">
        Body
      </Card>,
    );
    const link = screen.getByRole('link', { name: /Action chunking/ });
    expect(link).toHaveAttribute('href', '/manipulation/action-chunking');
    // The internal href variant renders through next/link, not a native
    // anchor (client-side routing, prefetch).
    expect(linkCalls).toEqual([{ href: '/manipulation/action-chunking' }]);
  });
});
