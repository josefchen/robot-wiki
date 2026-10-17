/**
 * Speaking a figure's result once, when it holds still.
 *
 * One thing the reader does can rewrite a figure's text many times: a run
 * redraws its readout every frame, a slider every step. Rather than hand
 * each value to a screen reader, the text is spoken once, after it has held
 * still for READOUT_SETTLE_MS following something the reader did in the
 * figure: the result of a Run, a preset or a step. A slider whose value
 * text already carries the numbers speaks for itself, so they are not said
 * twice.
 */

/** How long the text must hold still after an action before it is spoken. */
export const READOUT_SETTLE_MS = 700;
/** How long spoken text stays in the status region before it is cleared. */
export const READOUT_CLEAR_MS = 4000;
/**
 * A change that starts this soon after an action still counts as its result:
 * some runs lead in for over a second before the readout first moves.
 */
export const ACTION_REACH_MS = 3000;
/**
 * A run that holds a phase label still mid-way is spoken pause by pause: a
 * change that follows a spoken pause within ACTION_REACH_MS continues the
 * run, up to this long after the action.
 */
export const RUN_REACH_MS = 20000;
const ACTION_EVENTS = ['click', 'keydown', 'input', 'change'] as const;

const numbersIn = (text: string) =>
  (text.replace(/[\u2212\u2013]/g, '-').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));

/** Whether a slider's value text already says every number the readout prints. */
export function valueTextCovers(valueText: string | null, readout: string): boolean {
  if (!valueText) return false;
  const spoken = new Set(numbersIn(valueText));
  return numbersIn(readout).every((n) => spoken.has(n));
}

export type SettledSpeech = {
  /** The subtree whose text changes are watched. */
  watch: Node;
  /** Where the reader acts; only a change that follows an action here is spoken. */
  scope: Element;
  /** The hidden live region that speaks. */
  status: HTMLElement;
  /** The text to speak, as the watched subtree shows it now. */
  read: () => string;
  /** How long the text must hold still; READOUT_SETTLE_MS unless given. */
  settleMs?: number;
  /** Mutations this returns true for do not count as the text moving. */
  ignore?: (record: MutationRecord) => boolean;
  /** A last check before a settled change is spoken, given the time of the latest action. */
  allow?: (lastAction: number) => boolean;
};

/** Starts watching; returns the function that stops it. */
export function speakWhenSettled({
  watch,
  scope,
  status,
  read,
  settleMs = READOUT_SETTLE_MS,
  ignore,
  allow,
}: SettledSpeech): () => void {
  let settledText = read();
  let changed = false;
  let activityStart = 0;
  let lastAction = Number.NEGATIVE_INFINITY;
  let lastCausedSettle = Number.NEGATIVE_INFINITY;
  let settleTimer: number | undefined;
  let speakTimer: number | undefined;
  let clearTimer: number | undefined;

  const speak = (text: string) => {
    window.clearTimeout(speakTimer);
    window.clearTimeout(clearTimer);
    // Emptied first, so a run that ends where the last one did is spoken again.
    status.textContent = '';
    speakTimer = window.setTimeout(() => {
      status.textContent = text;
      clearTimer = window.setTimeout(() => {
        status.textContent = '';
      }, READOUT_CLEAR_MS);
    }, 50);
  };

  const settle = () => {
    const text = read();
    const caused =
      lastAction >= activityStart - ACTION_REACH_MS ||
      (lastCausedSettle >= activityStart - ACTION_REACH_MS && lastAction >= activityStart - RUN_REACH_MS);
    const wasChanged = changed;
    changed = false;
    activityStart = 0;
    settledText = text;
    if (caused) lastCausedSettle = performance.now();
    if (!wasChanged || !caused || !text) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement &&
      active.type === 'range' &&
      scope.contains(active) &&
      valueTextCovers(active.getAttribute('aria-valuetext'), text)
    ) {
      return;
    }
    if (allow && !allow(lastAction)) return;
    speak(text);
  };

  const observer = new MutationObserver((records) => {
    if (ignore && records.every(ignore)) return;
    if (!activityStart) activityStart = performance.now();
    if (read() !== settledText) changed = true;
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, settleMs);
  });
  observer.observe(watch, { childList: true, characterData: true, subtree: true });
  const acted = () => {
    lastAction = performance.now();
  };
  for (const type of ACTION_EVENTS) scope.addEventListener(type, acted, true);
  return () => {
    observer.disconnect();
    for (const type of ACTION_EVENTS) scope.removeEventListener(type, acted, true);
    window.clearTimeout(settleTimer);
    window.clearTimeout(speakTimer);
    window.clearTimeout(clearTimer);
  };
}
