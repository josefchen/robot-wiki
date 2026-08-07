import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '@/components/ui/card';

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

  it('renders as a link when href is given', () => {
    render(
      <Card href="/manipulation/action-chunking" title="Action chunking">
        Body
      </Card>,
    );
    const link = screen.getByRole('link', { name: /Action chunking/ });
    expect(link).toHaveAttribute('href', '/manipulation/action-chunking');
  });
});
