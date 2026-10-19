import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HowRobotsWork } from '@/components/explainers/how-robots-work';
import { startExplainers } from '@/components/explainers/viewer';
import { FeaturedExplainer } from '@/components/home/featured-explainer';

// A stand-in for the 3D kit: each Stage puts the probe canvas into the stage, as the real one does,
// and disposing it loses the WebGL context.
const kit = vi.hoisted(() => {
  type Context = { lost: boolean; getExtension: (name: string) => { loseContext: () => void } | null };
  const contexts: Context[] = [];
  const stages: Stage[] = [];
  class Stage {
    disposed = false;
    paused = true;
    moving = false;
    frames = 0;
    subject = null;
    exploded = null;
    canvas: HTMLCanvasElement;
    context: Context;
    constructor(el: HTMLElement, options: { canvas: HTMLCanvasElement; context: Context }) {
      this.canvas = options.canvas;
      this.context = options.context;
      el.prepend(this.canvas);
      stages.push(this);
    }
    clear() {}
    stopCamera() {}
    subjectBox() {
      return null;
    }
    async warm() {}
    dispose() {
      this.disposed = true;
      this.context.lost = true;
      this.canvas.remove();
    }
  }
  class TeachUI {
    predictEl = document.createElement('div');
    _pending = null;
    reset() {}
  }
  const context = (): Context => {
    const made: Context = {
      lost: false,
      getExtension: (name) => (name === 'WEBGL_lose_context' ? { loseContext: () => void (made.lost = true) } : null),
    };
    contexts.push(made);
    return made;
  };
  return { contexts, stages, Stage, TeachUI, context };
});

vi.mock('@/components/explainers/kit.js', () => ({ Stage: kit.Stage, TeachUI: kit.TeachUI }));
vi.mock('@/components/explainers/scenes/arm.js', () => ({
  default: {
    id: 'arm',
    how: '<p>How this was made</p>',
    mount: async () => ({ steps: [{ text: 'One' }, { text: 'Two' }, { text: 'Three' }] }),
  },
}));
vi.mock('@/components/explainers/explainers.css', () => ({}));

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
async function settle(ticks = 12) {
  for (let i = 0; i < ticks; i += 1) await tick();
}

// The markup `startExplainers` drives, as /how-robots-work/ renders it.
function viewerRoot() {
  const root = document.createElement('div');
  root.innerHTML = `
    <section data-x="explainer">
      <div data-x="stage"><img data-x="poster" alt="" /><div data-x="status" hidden></div><button data-x="start" hidden></button></div>
      <div data-x="dots"></div><p data-x="stepText"></p>
      <button data-x="prev"></button><button data-x="next"></button>
    </section>
    <section data-x="summary" hidden><p data-x="sentence"></p><p data-x="concept"></p><p data-x="checkQ"></p><p data-x="checkA"></p></section>`;
  document.body.append(root);
  return root;
}

const liveContexts = () => kit.contexts.filter((context) => !context.lost);
const liveStages = () => kit.stages.filter((stage) => !stage.disposed);

// Renders, unmounts at once (a reader who leaves before the viewer module loads) and collects the
// promise rejections nothing handled meanwhile.
async function rejectionsAfterQuickUnmount(ui: React.ReactElement) {
  const rejections: unknown[] = [];
  const onRejection = (reason: unknown) => void rejections.push(reason);
  process.on('unhandledRejection', onRejection);
  try {
    render(ui).unmount();
    await settle();
  } finally {
    process.off('unhandledRejection', onRejection);
  }
  return rejections;
}

beforeEach(() => {
  kit.contexts.length = 0;
  kit.stages.length = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => kit.context() as unknown as ReturnType<HTMLCanvasElement['getContext']>,
  );
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: false, media, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  }));
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('the explainer viewer lifecycle', () => {
  it('builds no stage for a viewer disposed while the 3D kit loads, and releases its WebGL context', async () => {
    const root = viewerRoot();
    const dispose = await startExplainers(root);
    expect(kit.stages).toHaveLength(0);
    dispose();
    await settle();
    expect(kit.contexts).toHaveLength(1);
    expect(kit.stages).toHaveLength(0);
    expect(root.querySelectorAll('canvas')).toHaveLength(0);
    expect(liveContexts()).toHaveLength(0);
  });

  it('keeps one canvas and one WebGL context when the page starts, disposes and starts its viewer again', async () => {
    // React's StrictMode does this to the page effect on the development server.
    const root = viewerRoot();
    (await startExplainers(root))();
    await settle();
    const dispose = await startExplainers(root);
    await vi.waitFor(() => expect(root.querySelector('[data-x="stepText"]')).toHaveTextContent('One'));
    expect(root.querySelectorAll('canvas')).toHaveLength(1);
    expect(liveStages()).toHaveLength(1);
    expect(liveContexts()).toHaveLength(1);

    dispose();
    await settle();
    expect(root.querySelectorAll('canvas')).toHaveLength(0);
    expect(liveStages()).toHaveLength(0);
    expect(liveContexts()).toHaveLength(0);
  });

  it('starts no viewer for a page effect React has already cleaned up, so the page asks for one WebGL context', async () => {
    // StrictMode runs the page effect, its cleanup and the effect again, as the development server does.
    const { container, unmount } = render(
      <StrictMode>
        <HowRobotsWork />
      </StrictMode>,
    );
    const stepText = () => container.querySelector('[data-x="stepText"]')!;
    await vi.waitFor(() => expect(stepText().textContent).not.toBe(''));
    await settle();
    expect(kit.contexts).toHaveLength(1);
    expect(stepText()).toHaveTextContent('One');
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(liveStages()).toHaveLength(1);

    unmount();
    await settle();
    expect(liveStages()).toHaveLength(0);
    expect(liveContexts()).toHaveLength(0);
  });

  it('starts no viewer, and throws nothing, when the page unmounts before the viewer loads', async () => {
    expect(await rejectionsAfterQuickUnmount(<HowRobotsWork />)).toEqual([]);
    expect(kit.contexts).toHaveLength(0);
  });

  it("starts no viewer, and throws nothing, when home's featured explainer unmounts before the viewer loads", async () => {
    const featured = (
      <FeaturedExplainer scene="arm" firstStep="One" posterWidth={1200} posterHeight={750} startLabel="Start" />
    );
    expect(await rejectionsAfterQuickUnmount(featured)).toEqual([]);
    expect(kit.contexts).toHaveLength(0);
  });
});
