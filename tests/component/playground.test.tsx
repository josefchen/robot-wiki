import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlaygroundPage from '@/app/playground/page';
import { PlaygroundCanvas } from '@/components/three/playground-canvas';

describe('/playground page', () => {
  it('renders the playground heading inside a labeled region', () => {
    render(<PlaygroundPage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /3D Kinematics Playground/,
      }),
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
  });
});
