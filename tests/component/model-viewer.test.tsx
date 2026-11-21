import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelViewer, failedText, loadingText } from '@/components/model-viewer/model-viewer';
import { UrdfModelError } from '@/components/three/load-urdf-model';

vi.mock('@/components/model-viewer/model-viewer.css', () => ({}));

const webgl = vi.hoisted(() => ({ available: true }));
vi.mock('@/lib/webgl', () => ({ isWebGLAvailable: () => webgl.available }));

// The scene needs WebGL; in its place a canvas with the label, and a button
// that reports the first fitted frame the way the real scene's onDrawn does.
vi.mock('next/dynamic', () => ({
  default: () =>
    function SceneStandIn({ label, onDrawn }: { label: string; onDrawn: () => void }) {
      return (
        <>
          <canvas role="img" aria-label={label} />
          <button type="button" onClick={onDrawn}>
            Report drawn
          </button>
        </>
      );
    },
}));

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
  still: {
    wide: { src: '/models/fixture/still-16x10.webp', width: 1600, height: 1000, media: '(min-width: 640px)' },
    square: { src: '/models/fixture/still-1x1.webp', width: 616, height: 616 },
    alt: 'The fixture robot, rendered.',
  },
};

const root = () => document.querySelector('[data-model-viewer="fixture"]') as HTMLElement;
const still = () => root().querySelector('[data-model-still]') as HTMLImageElement | null;

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

  it('shows the still before loading: the square file, the wide one from 640 px, and the alt text', () => {
    render(<ModelViewer {...PROPS} />);
    const image = screen.getByRole('img', { name: PROPS.still.alt });
    expect(image).toBe(still());
    expect(image.getAttribute('src')).toBe(PROPS.still.square.src);
    expect([image.getAttribute('width'), image.getAttribute('height')]).toEqual(['616', '616']);
    const source = image.closest('picture')?.querySelector('source');
    expect(source?.getAttribute('srcset')).toBe(PROPS.still.wide.src);
    expect(source?.getAttribute('media')).toBe(PROPS.still.wide.media);
    // "Load model" sits over the still, described by the name and size.
    const button = screen.getByRole('button', { name: 'Load model' });
    expect(button.getAttribute('aria-describedby')).toBe('fixture-name fixture-summary');
    expect(document.getElementById('fixture-summary')?.textContent).toBe(PROPS.summary);
    expect(document.querySelector('canvas')).toBeNull();
  });

  it('keeps the still while loading and after load, and swaps it for the canvas once a frame has drawn', async () => {
    render(<ModelViewer {...PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load model' }));
    await vi.waitFor(() => expect(loader.calls).toHaveLength(1));
    expect(still()).not.toBeNull();
    act(() => loader.calls[0].progress?.(3, 3));
    await act(async () => loader.calls[0].settle.resolve({ robot: {}, meshes: 3 }));
    expect(root().getAttribute('data-state')).toBe('loaded');
    expect(root().hasAttribute('data-drawn')).toBe(false);
    // Until the fitted frame has drawn, the still is the only picture: the
    // canvas is mounted but hidden, the loading line stays, and neither the
    // hint nor "Reset view" is shown.
    const canvas = root().querySelector('canvas');
    expect(canvas?.getAttribute('aria-label')).toBe(PROPS.alt);
    expect(canvas).not.toBeVisible();
    expect(screen.queryByRole('img', { name: PROPS.alt })).toBeNull();
    expect(screen.getByTestId('model-scene')).not.toBeVisible();
    expect(still()).toBeVisible();
    expect(screen.getByRole('status').textContent).toBe('Loading meshes, 3 of 3');
    expect(root().querySelector('.mv-hint')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reset view' })).toBeNull();

    fireEvent.click(screen.getByText('Report drawn'));
    expect(root().hasAttribute('data-drawn')).toBe(true);
    expect(still()).toBeNull();
    expect(root().querySelector('picture')).toBeNull();
    expect(screen.getByRole('img', { name: PROPS.alt })).toBeVisible();
    expect(screen.queryByRole('status')).toBeNull();
    expect(root().querySelector('.mv-hint')).not.toBeNull();
    const reset = screen.getByRole('button', { name: 'Reset view' });
    await vi.waitFor(() => expect(document.activeElement).toBe(reset));
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
    // A still beside "the model is not drawn" would contradict it.
    expect(still()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await vi.waitFor(() => expect(loader.calls).toHaveLength(2));
    expect(root().getAttribute('data-state')).toBe('loading');
  });

  it('focuses each committed control through a failed load and retry without waiting for an animation frame', async () => {
    render(<ModelViewer {...PROPS} />);
    expect(document.activeElement).toBe(document.body);
    const load = screen.getByRole('button', { name: 'Load model' });
    load.focus();
    fireEvent.click(load);
    expect(screen.getByRole('status')).toHaveFocus();
    await vi.waitFor(() => expect(loader.calls).toHaveLength(1));
    await act(async () => loader.calls[0].settle.reject(new UrdfModelError(0, 0)));
    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(retry).toHaveFocus();
    fireEvent.click(retry);
    expect(screen.getByRole('status')).toHaveFocus();
    await vi.waitFor(() => expect(loader.calls).toHaveLength(2));
    await act(async () => loader.calls[1].settle.resolve({ robot: {}, meshes: 3 }));
    fireEvent.click(screen.getByText('Report drawn'));
    expect(screen.getByRole('button', { name: 'Reset view' })).toHaveFocus();
  });

  it.each(['error', 'drawn'])('leaves the next link focused when a pending model reaches %s', async (outcome) => {
    render(<><ModelViewer {...PROPS} /><a href="/">Next page</a></>);
    const load = screen.getByRole('button', { name: 'Load model' });
    load.focus();
    fireEvent.click(load);
    await vi.waitFor(() => expect(loader.calls).toHaveLength(1));
    const next = screen.getByRole('link', { name: 'Next page' });
    next.focus();
    act(() => loader.calls[0].progress?.(2, 3));
    if (outcome === 'error') {
      await act(async () => loader.calls[0].settle.reject(new UrdfModelError(1, 3)));
      expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    } else {
      await act(async () => loader.calls[0].settle.resolve({ robot: {}, meshes: 3 }));
      fireEvent.click(screen.getByText('Report drawn'));
      expect(screen.getByRole('button', { name: 'Reset view' })).toBeVisible();
    }
    expect(next).toHaveFocus();
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
    expect(screen.getByTestId('webgl-unavailable').closest('[tabindex]')).toHaveFocus();
    expect(loader.calls).toHaveLength(0);
  });
});
