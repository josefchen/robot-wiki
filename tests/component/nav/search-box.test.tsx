import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { SearchBox } from '@/components/nav/search-box';

describe('SearchBox', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders a labeled search form', () => {
    render(<SearchBox idPrefix="test" />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search' }),
    ).toBeInTheDocument();
  });

  it('navigates to /search with the encoded query on submit', async () => {
    const user = userEvent.setup();
    render(<SearchBox idPrefix="test" />);
    await user.type(
      screen.getByRole('searchbox', { name: 'Search' }),
      'compounding error',
    );
    await user.click(screen.getByRole('button', { name: 'Search the atlas' }));
    expect(mockPush).toHaveBeenCalledWith('/search?q=compounding%20error');
  });

  it('submits on Enter', async () => {
    const user = userEvent.setup();
    render(<SearchBox idPrefix="test" />);
    const input = screen.getByRole('searchbox', { name: 'Search' });
    await user.type(input, 'GR00T{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/search?q=GR00T');
  });

  it('navigates to bare /search for an empty query', async () => {
    const user = userEvent.setup();
    render(<SearchBox idPrefix="test" />);
    await user.click(screen.getByRole('button', { name: 'Search the atlas' }));
    expect(mockPush).toHaveBeenCalledWith('/search');
  });

  it('falls back to a native GET form when JS is unavailable', () => {
    render(<SearchBox idPrefix="test" />);
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/search/');
    expect(form).toHaveAttribute('method', 'get');
  });

  it('calls onNavigate after submit so a drawer can close', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SearchBox idPrefix="test" onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'Search the atlas' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
