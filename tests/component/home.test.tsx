import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '@/app/page';

describe('Home page', () => {
  it('renders the atlas heading', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'robot-atlas' }),
    ).toBeInTheDocument();
  });

  it('describes the atlas in one sentence', () => {
    render(<Home />);
    expect(
      screen.getByText(/encyclopedic interactive guide to modern robotics/),
    ).toBeInTheDocument();
  });
});
