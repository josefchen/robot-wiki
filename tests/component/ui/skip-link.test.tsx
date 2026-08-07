import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkipLink } from '@/components/ui/skip-link';

describe('SkipLink', () => {
  it('links to the main content landmark', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: /skip to content/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });
});
