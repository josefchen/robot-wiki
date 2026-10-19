import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlaygroundPage from '@/app/playground/page';
import { PlaygroundCanvas } from '@/components/three/playground-canvas';

// The page stylesheet is plain CSS; jsdom has no layout, and the test
// transform does not run the site's PostCSS pipeline.
vi.mock('@/components/three/playground.css', () => ({}));

describe('/playground page', () => {
  it('renders the playground heading inside a labeled region', () => {
    render(<PlaygroundPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /3D Kinematics Playground/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /3D robot playground/i }),
    ).toBeInTheDocument();
  });

  it('attributes the SO-101 model and license', () => {
    render(<PlaygroundPage />);
    const attribution = screen.getByText(/TheRobotStudio/);
    expect(attribution.closest('a')).toHaveAttribute(
      'href',
      'https://github.com/TheRobotStudio/SO-ARM100',
    );
  });
});

describe('PlaygroundCanvas without WebGL (jsdom has no GL context)', () => {
  it('shows the WebGL-unavailable fallback instead of crashing', async () => {
    render(<PlaygroundCanvas />);
    expect(
      await screen.findByText(/WebGL is not available/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // The fallback is the only branch: no loading state, no controls, and
    // the root says so for tests that wait on it.
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByTestId('playground')).toHaveAttribute(
      'data-playground-state',
      'unavailable',
    );
  });
});
