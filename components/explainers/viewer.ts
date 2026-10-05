import { explainerBrand as brand } from './brand';
import {
  EXPLAINER_ORDER,
  type ExplainerInstance,
  type ExplainerModule,
} from './catalog';

type KitStage = { clear: () => void; dispose: () => void; moving: boolean };
type KitUI = { predictEl: HTMLElement; _pending: (() => void) | null; reset: () => void };

const SITE_ORIGIN = /^https:\/\/robot-wiki\.com(?=\/)/;

/**
 * Drives one explainer at a time inside `root`: the rail marks the open
 * scene, the step rail walks its steps, and the summary, self-check and
 * "How this was made" fold fill from the scene module. The hash names the
 * open scene so every explainer is deep-linkable.
 */
export async function startExplainers(root: HTMLElement): Promise<() => void> {
  const $ = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-x="${name}"]`)!;
  const kit = await import('./kit.js');
  const status = $('status');
  let stage: KitStage | null = null;
  try {
    stage = new kit.Stage($('stage'), { brand }) as KitStage;
  } catch {
    status.textContent = 'This browser cannot show 3D. Each step below still explains the idea in words.';
  }
  const ui = new kit.TeachUI($('explainer'), { brand }) as unknown as KitUI;
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
    ui.predictEl.hidden = true;
    ui.predictEl.replaceChildren();
    ui._pending = null;
    cur = i;
    dots.querySelectorAll('button').forEach((b, k) => {
      b.setAttribute('aria-pressed', String(k === i));
      b.classList.toggle('done', k < i);
    });
    $('stepText').textContent = inst.steps[i].text;
    prev.disabled = i === 0;
    next.textContent = i === inst.steps.length - 1 ? 'Done' : 'Next';
    $('summary').hidden = i !== inst.steps.length - 1;
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
    if (ui._pending) return ui._pending();
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

  async function open(requested: string) {
    const entry = EXPLAINER_ORDER.find(({ id }) => id === requested) ?? EXPLAINER_ORDER[0];
    const my = ++token;
    root.querySelectorAll<HTMLElement>('[data-rail-id]').forEach((a) => {
      a.toggleAttribute('data-current', a.dataset.railId === entry.id);
    });
    try {
      await inst?.dispose?.();
    } catch {}
    inst = null;
    cur = 0;
    stage?.clear();
    ui.reset();
    status.hidden = false;
    if (stage) status.textContent = 'Loading…';
    const mod: ExplainerModule = (await entry.load()).default;
    if (my !== token || closed) return;
    $('kicker').textContent = mod.kicker;
    $('question').textContent = mod.question;
    $('sentence').textContent = mod.takeaway;
    const concept = $('concept');
    const link = document.createElement('a');
    link.href = mod.concept.href.replace(SITE_ORIGIN, '');
    link.textContent = mod.concept.article;
    brand.link(link);
    concept.replaceChildren(`${mod.concept.name}. Read more in `, link, '.');
    $('checkQ').textContent = `Check yourself: ${mod.selfCheck.q}`;
    $('checkA').textContent = mod.selfCheck.a;
    const how = $('how');
    how.innerHTML = mod.how;
    how.querySelectorAll('a').forEach((a) => {
      brand.link(a);
      if (a.target === '_blank') a.rel = 'noopener noreferrer';
    });
    const idx = EXPLAINER_ORDER.indexOf(entry);
    const before = EXPLAINER_ORDER[idx - 1];
    const after = EXPLAINER_ORDER[idx + 1];
    $('pagerPrev').replaceChildren(...(before ? [pagerLink(before, 'Previous')] : []));
    $('pagerNext').replaceChildren(...(after ? [pagerLink(after, 'Next')] : []));
    if (!stage) {
      inst = { steps: mod.fallbackSteps ?? [] };
      renderDots();
      return go(0);
    }
    try {
      inst = await mod.mount(stage, ui);
    } catch (e) {
      console.error(e);
      status.textContent = 'This scene could not load.';
      return;
    }
    if (my !== token || closed) return;
    status.hidden = true;
    renderDots();
    await go(0);
  }

  const onHash = () => {
    void open(location.hash.slice(1));
    const top = $('explainer').getBoundingClientRect().top + window.scrollY - 16;
    if (window.scrollY > top) window.scrollTo({ top });
  };
  window.addEventListener('hashchange', onHash);
  const hook = {
    go: (i: number) => go(i),
    get steps() { return inst?.steps.length ?? 0; },
    get ready() { return inst !== null; },
    get busy() { return entering; },
    get moving() { return stage?.moving ?? false; },
    get stage() { return stage; },
  };
  (window as unknown as { __explainer?: typeof hook }).__explainer = hook;
  void open(location.hash.slice(1));

  return () => {
    closed = true;
    token += 1;
    window.removeEventListener('hashchange', onHash);
    prev.removeEventListener('click', onPrev);
    next.removeEventListener('click', onNext);
    void Promise.resolve(inst?.dispose?.()).catch(() => {});
    stage?.dispose();
  };
}
