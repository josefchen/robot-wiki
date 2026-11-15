import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelViewer, failedText, loadingText } from '@/components/model-viewer/model-viewer';
import { UrdfModelError } from '@/components/three/load-urdf-model';

vi.mock('@/components/model-viewer/model-viewer.css', () => ({}));

const webgl = vi.hoisted(() => ({ available: true }));
vi.mock('@/lib/webgl', () => ({ isWebGLAvailable: () => webgl.available }));

const loader = vi.hoisted(() => ({
  calls: [] as { url: string; progress?: (loaded: number, total: number) => void; settle: { resolve: (v: unknown) => void; reject: (e: unknown) => void } }[],
}));
vi.mock('@/components/three/load-urdf-model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/three/load-urdf-model')>();
  return {
    ...actual,
    loadUrdfModel: (url: string, progress?: (loaded: number, total: number) => void) =>
      new Promise((resolve, reject) => {
        loader.calls.push({ url, progress, settle: { resolve, reject } });
      }),
  };
});

/**
 * The viewer's states other than loaded (which needs a real WebGL context
 * and is checked in the browser): before loading, loading with progress, a
 * mesh that fails, and no WebGL. Fixture props, not a record: the page test
 * holds the props to MODELS_3D.
 */
const PROPS = {
  id: 'fixture',
  product: 'Fixture robot',
  summary: '3 meshes, 0.1 MB',
  heading: 'Fixture robot at the zero pose of its URDF',
  caption: 'A caption.',
  alt: 'A fixture model.',
  urdf: '/models/fixture/robot.urdf',
};

const root = () => document.querySelector('[data-model-viewer="fixture"]') as HTMLElement;

describe('ModelViewer', () => {
  beforeEach(() => {
    webgl.available = true;
    loader.calls = [];
  });

  it('fetches nothing until "Load model" is pressed, then loads the URDF it was given', async () => {
    render(<ModelViewer {...PROPS} />);
    expect(root().getAttribute('data-state')).toBe('idle');
    expect(loader.calls).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Load model' }));
    expect(root().getAttribute('data-state')).toBe('loading');
    await vi.waitFor(() => expect(loader.calls).toHaveLength(1));
    expect(loader.calls[0].url).toBe(PROPS.urdf);
  });

  it('says how far the files have come while loading', async () => {
    render(<ModelViewer {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load model' }));
    await vi.waitFor(() => expect(loader.calls).toHaveLength(1));
    expect(screen.getByRole('status').textContent).toBe(loadingText({ loaded: 0, total: 0 }));
    act(() => loader.calls[0].progress?.(2, 4));
    expect(screen.getByRole('status').textContent).toBe('Loading meshes, 2 of 4');
  });

  it('names how many meshes failed, draws nothing, and offers to try again', async () => {
    render(<ModelViewer {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load model' }));
    await vi.waitFor(() => expect(loader.calls).toHaveLength(1));
    await act(async () => loader.calls[0].settle.reject(new UrdfModelError(1, 3)));
    expect(root().getAttribute('data-state')).toBe('failed');
    expect(screen.getByRole('status').textContent).toBe('1 of 3 mesh files did not load, so the model is not drawn.');
    expect(document.querySelector('canvas')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await vi.waitFor(() => expect(loader.calls).toHaveLength(2));
    expect(root().getAttribute('data-state')).toBe('loading');
  });

  it('says when the URDF itself did not load', () => {
    expect(failedText({ failed: 0, meshes: 0 })).toBe('The URDF did not load, so the model is not drawn.');
  });

  it('shows the WebGL message in the stage and loads nothing without WebGL', () => {
    webgl.available = false;
    render(<ModelViewer {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load model' }));
    expect(root().getAttribute('data-state')).toBe('unavailable');
    expect(screen.getByTestId('webgl-unavailable')).toBeInTheDocument();
    expect(loader.calls).toHaveLength(0);
  });
});
