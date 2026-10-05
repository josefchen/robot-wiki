import { explainerBrand as brand } from './brand';
import {
  EXPLAINER_ORDER,
  type ExplainerInstance,
  type ExplainerModule,
} from './catalog';
import { EXPLAINER_WORDS } from './words';

type Box = { x: number; y: number; w: number; h: number };
type KitStage = {
  clear: () => void;
  dispose: () => void;
  warm: () => Promise<void>;
  paused: boolean;
  moving: boolean;
  frames: number;
  subject: unknown[] | null;
  subjectBox: () => Box | null;
  stopCamera: () => void;
  exploded: { state: () => { id: string; name: string; explode: number }[] } | null;
};
type KitUI = { predictEl: HTMLElement; _pending: (() => void) | null; reset: () => void };

const SITE_ORIGIN = /^https:\/\/robot-wiki\.com(?=\/)/;
const GL_ATTRIBUTES: WebGLContextAttributes = { alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true };
// How close to the viewport the stage must come before the 3D scene loads.
const NEAR_MARGIN_PX = 300;
const NO_WEBGL = 'This browser cannot show 3D. Each step below still explains the idea in words.';
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Drives one explainer at a time inside `root`: the rail marks the open
 * scene, the step rail walks its steps, and the summary, self-check and
 * "How this was made" fold fill from the scene module. The hash names the
 * open scene so every explainer is deep-linkable.
 *
 * Until the 3D scene runs, the stage shows the explainer's poster and the
 * steps read as text. The scene, the 3D kit and the page's one WebGL context
 * load only once the stage comes near the viewport or the reader picks an
 * explainer, and under reduced motion only once the reader presses Start.
 */
export async function startExplainers(root: HTMLElement): Promise<() => void> {
  const $ = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-x="${name}"]`)!;
  const stageEl = $('stage');
  const status = $('status');
  const poster = $<HTMLImageElement>('poster');
  const startBtn = $<HTMLButtonElement>('start');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stage: KitStage | null = null;
  let ui: KitUI | null = null;
  let stageReady: Promise<KitStage | null> | null = null;
  let webgl = true;
  let started = !reduce;
  let live = false;
  let openId = '';
  // The token of the open() call that is bringing its explainer to life, so it is not started twice.
  let mounting = -1;
  const nearViewport = () => {
    const r = stageEl.getBoundingClientRect();
    return r.bottom > -NEAR_MARGIN_PX && r.top < window.innerHeight + NEAR_MARGIN_PX;
  };
  let near = nearViewport();

  // The first call probes for WebGL with the canvas the renderer then uses, so the page never holds two contexts.
  function ensureStage() {
    stageReady ??= (async () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2', GL_ATTRIBUTES);
      if (!context) {
        webgl = false;
        return null;
      }
      const kit = await import('./kit.js');
      await nextTask();
      stage = new kit.Stage(stageEl, { brand, canvas, context, paused: true }) as KitStage;
      ui = new kit.TeachUI($('explainer'), { brand }) as unknown as KitUI;
      return stage;
    })().catch(() => {
      webgl = false;
      return null;
    });
    return stageReady;
  }

  function showPoster(show: boolean) {
    stageEl.dataset.mode = show ? 'poster' : 'live';
    startBtn.hidden = !show || !webgl || started;
  }
  const dots = $('dots');
  const prev = $<HTMLButtonElement>('prev');
  const next = $<HTMLButtonElement>('next');
  let inst: ExplainerInstance | null = null;
  let cur = 0;
  let token = 0;
  let closed = false;
  let entering = false;

  function renderDots() {
    dots.replaceChildren(
      ...(inst?.steps ?? []).map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = String(i + 1);
        b.setAttribute('aria-label', `Step ${i + 1}`);
        b.setAttribute('aria-pressed', 'false');
        brand.selection(b);
        b.addEventListener('click', () => void go(i));
        return b;
      }),
    );
  }

  async function go(i: number) {
    if (!inst || i < 0 || i >= inst.steps.length) return;
    const my = ++token;
    await inst.steps[cur]?.leave?.();
    if (my !== token) return;
    if (ui) {
      ui.predictEl.hidden = true;
      ui.predictEl.replaceChildren();
      ui._pending = null;
    }
    cur = i;
    dots.querySelectorAll('button').forEach((b, k) => {
      b.setAttribute('aria-pressed', String(k === i));
      b.classList.toggle('done', k < i);
    });
    $('stepText').textContent = inst.steps[i].text;
    prev.disabled = i === 0;
    next.textContent = i === inst.steps.length - 1 ? 'Done' : 'Next';
    $('summary').hidden = i !== inst.steps.length - 1;
    if (stage) {
      stage.subject = null;
      stage.stopCamera();
    }
    entering = true;
    try {
      await inst.steps[i].enter?.();
    } catch (e) {
      console.error(e);
    }
    if (my === token) entering = false;
  }

  const onPrev = () => void go(cur - 1);
  const onNext = () => {
    if (live && ui?._pending) return ui._pending();
    if (inst && cur < inst.steps.length - 1) void go(cur + 1);
    else $('summary').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  prev.addEventListener('click', onPrev);
  next.addEventListener('click', onNext);

  function pagerLink(entry: { id: string; label: string }, lab: string) {
    const a = document.createElement('a');
    a.href = `#${entry.id}`;
    brand.link(a);
    const span = document.createElement('span');
    span.className = 'lab';
    span.textContent = lab;
    a.append(span, entry.label);
    return a;
  }

  // The "How this was made" fold comes from the scene module, so in poster mode it loads when opened.
  const howFold = root.querySelector<HTMLDetailsElement>('[data-explainer-fold="how"]')!;
  let howFor = '';
  async function fillHow(entry: (typeof EXPLAINER_ORDER)[number], mod?: ExplainerModule) {
    if (howFor === entry.id) return;
    const loaded = mod ?? (await entry.load()).default;
    if (entry.id !== openId) return;
    howFor = entry.id;
    const how = $('how');
    how.innerHTML = loaded.how;
    how.querySelectorAll('a').forEach((a) => {
      brand.link(a);
      if (a.target === '_blank') a.rel = 'noopener noreferrer';
    });
  }
  const onHowToggle = () => {
    const entry = EXPLAINER_ORDER.find(({ id }) => id === openId);
    if (howFold.open && entry) void fillHow(entry).catch(() => {});
  };
  howFold.addEventListener('toggle', onHowToggle);

  async function open(requested: string, at = 0) {
    const entry = EXPLAINER_ORDER.find(({ id }) => id === requested) ?? EXPLAINER_ORDER[0];
    const my = ++token;
    if (entry.id !== openId && reduce) started = false;
    openId = entry.id;
    root.querySelectorAll<HTMLElement>('[data-rail-id]').forEach((a) => {
      a.toggleAttribute('data-current', a.dataset.railId === entry.id);
    });
    const old = inst;
    inst = null;
    live = false;
    try {
      await old?.dispose?.();
    } catch {}
    cur = 0;
    stage?.clear();
    ui?.reset();
    const words = EXPLAINER_WORDS[entry.id];
    poster.src = `/explainers/posters/${entry.id}.webp`;
    poster.alt = words.steps[0];
    if (howFor !== entry.id) $('how').replaceChildren();
    const runs = webgl && started && near;
    if (runs) mounting = my;
    showPoster(true);
    status.hidden = !runs;
    status.textContent = 'Loading…';
    const st = runs ? await ensureStage() : null;
    if (st) await nextTask();
    const mod: ExplainerModule | null = st ? (await entry.load()).default : null;
    if (my !== token || closed) return;
    if (!webgl) {
      status.hidden = false;
      status.textContent = NO_WEBGL;
    }
    $('kicker').textContent = words.kicker;
    $('question').textContent = words.question;
    $('sentence').textContent = words.takeaway;
    const concept = $('concept');
    const { name, term, href } = words.concept;
    const termAt = name.lastIndexOf(term);
    const link = document.createElement('a');
    link.href = href.replace(SITE_ORIGIN, '');
    link.textContent = term;
    brand.link(link);
    concept.replaceChildren(name.slice(0, termAt), link, `${name.slice(termAt + term.length)}.`);
    $('checkQ').textContent = `Check yourself: ${words.selfCheck.q}`;
    $('checkA').textContent = words.selfCheck.a;
    if (mod || howFold.open) void fillHow(entry, mod ?? undefined).catch(() => {});
    const idx = EXPLAINER_ORDER.indexOf(entry);
    const before = EXPLAINER_ORDER[idx - 1];
    const after = EXPLAINER_ORDER[idx + 1];
    $('pagerPrev').replaceChildren(...(before ? [pagerLink(before, 'Previous')] : []));
    $('pagerNext').replaceChildren(...(after ? [pagerLink(after, 'Next')] : []));
    if (!st || !mod || !ui) {
      inst = { steps: words.steps.map((text) => ({ text })) };
      renderDots();
      return go(Math.min(at, inst.steps.length - 1));
    }
    // The scene builds behind its poster without drawing, and its shaders compile before the first
    // frame. Each piece runs in its own task so mounting never holds the page for long.
    st.paused = true;
    try {
      await nextTask();
      inst = await mod.mount(st, ui);
      await nextTask();
      if (my === token && !closed) await st.warm();
    } catch (e) {
      console.error(e);
      status.textContent = 'This scene could not load.';
      return;
    } finally {
      if (my === token) st.paused = false;
    }
    if (my !== token || closed) return;
    live = true;
    status.hidden = true;
    showPoster(false);
    renderDots();
    await go(Math.min(at, inst.steps.length - 1));
  }

  // Bring the open explainer to life where the reader is, once it may run.
  const goLive = () => {
    if (!live && mounting !== token && webgl && started && near) void open(openId, cur);
  };
  const viewObserver = new IntersectionObserver(
    ([e]) => {
      near = e.isIntersecting;
      goLive();
    },
    { rootMargin: `${NEAR_MARGIN_PX}px 0px` },
  );
  viewObserver.observe(stageEl);
  const onStart = () => {
    started = true;
    near = true;
    goLive();
  };
  startBtn.addEventListener('click', onStart);

  const onHash = () => {
    near = true;
    void open(location.hash.slice(1));
    const top = $('explainer').getBoundingClientRect().top + window.scrollY - 16;
    if (window.scrollY > top) window.scrollTo({ top });
  };
  window.addEventListener('hashchange', onHash);
  const hook = {
    go: (i: number) => go(i),
    start: onStart,
    get id() { return openId; },
    get steps() { return inst?.steps.length ?? 0; },
    get ready() { return inst !== null; },
    get live() { return live; },
    get busy() { return entering; },
    get moving() { return stage?.moving ?? false; },
    get frames() { return stage?.frames ?? 0; },
    get stage() { return stage; },
    get subject() { return stage?.subjectBox() ?? null; },
    get parts() { return stage?.exploded?.state() ?? null; },
  };
  (window as unknown as { __explainer?: typeof hook }).__explainer = hook;
  void open(location.hash.slice(1));

  return () => {
    closed = true;
    token += 1;
    viewObserver.disconnect();
    startBtn.removeEventListener('click', onStart);
    howFold.removeEventListener('toggle', onHowToggle);
    window.removeEventListener('hashchange', onHash);
    prev.removeEventListener('click', onPrev);
    next.removeEventListener('click', onNext);
    void Promise.resolve(inst?.dispose?.()).catch(() => {});
    stage?.dispose();
  };
}
