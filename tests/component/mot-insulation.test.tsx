import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { MotInsulation } from '@/components/interactive/mot-insulation';
import { READOUT_CLEAR_MS, READOUT_SETTLE_MS } from '@/components/motion/settled-speech';
import { needlePath } from '@/components/iso/figures/tray-columns';
import {
  LANGUAGE_SCORE_MAX,
  LANGUAGE_SCORE_MIN,
  LAYER_COUNT,
  backboneSupervision,
  gradientBarrier,
  languageScore,
  layerStates,
  type Pass,
} from '@/lib/knowledge-insulation';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('MotInsulation');

function passButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

function stopGradientToggle() {
  return screen.getByRole('button', { name: /protect language skills/i });
}

/** Reduced motion: every change lands on its rest pose at once, so the drawn shapes can be read. */
function askForStillness() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const realMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

/** Reach a pass, protection and depth with the reader's controls. */
function goTo(pass: Pass, stop: boolean, step: number) {
  if ((stopGradientToggle().getAttribute('aria-pressed') === 'true') !== stop) fireEvent.click(stopGradientToggle());
  fireEvent.click(passButton(pass === 'forward' ? /forward pass/i : /backward pass/i));
  fireEvent.change(screen.getByRole('slider'), { target: { value: String(step) } });
}

const STATES: Array<[Pass, boolean, number]> = [];
for (const pass of ['forward', 'backward'] as const) {
  for (const stop of [true, false]) for (let step = 0; step <= LAYER_COUNT; step++) STATES.push([pass, stop, step]);
}

describe('MotInsulation', () => {
  it('renders the pass controls, stop-gradient toggle, layer slider, readouts, and reset', () => {
    render(<MotInsulation />);
    expect(passButton(/forward pass/i)).toBeInTheDocument();
    expect(passButton(/backward pass/i)).toBeInTheDocument();
    expect(stopGradientToggle()).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('language-score')).toBeInTheDocument();
    expect(screen.getByTestId('speedup-readout')).toHaveTextContent('7.5');
    expect(screen.getByTestId('mot-diagram')).toBeInTheDocument();
  });

  it('starts on the insulated backward pass at full depth, with the shut valves and their note in view', () => {
    const { container } = render(<MotInsulation />);
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveTextContent('Protect language skills: On');
    expect(screen.getByTestId('gradient-barrier')).toBeInTheDocument();
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.getByTestId('step-readout')).toHaveTextContent(
      `${LAYER_COUNT} / ${LAYER_COUNT}`,
    );
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Shield the language brain while teaching the robot to move',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Knowledge insulation');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'training needed 7.5 times fewer steps than π0',
    );
    // The one note now leads the hint under the drawing, beside the shut valves it names.
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe(
      "Shut valves stop movement lessons, so they can't overwrite what the model knows",
    );
    expect(notes[0].closest('[data-figure-stage]')).not.toBeNull();
    expect(notes[0].closest('svg')).toBeNull();
    // The two columns' names left the drawing for the legend on the stage.
    const legend = screen.getByTestId('mot-legend');
    expect(legend.closest('[data-figure-stage]')).not.toBeNull();
    expect(legend).toHaveTextContent(/understands words and pictures/i);
    expect(legend).toHaveTextContent(/moves the arm/i);
    expect(legend).toHaveTextContent(/wide column/i);
    expect(legend).toHaveTextContent(/slim column/i);
    // The score is labelled illustrative where it is shown.
    expect(screen.getByTestId('language-score').closest('.basis-full')).toHaveTextContent(
      /illustrative, not measured/,
    );
  });

  it('keeps the depth slider, pass buttons and Reset in Adjust more; method holds the measured result', () => {
    const { container } = render(<MotInsulation />);
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).toContainElement(screen.getByRole('slider'));
    expect(adjust).toContainElement(passButton(/forward pass/i));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    expect(adjust).not.toContainElement(stopGradientToggle());
    const method = container.querySelector('details[data-figure-fold="method"]')!;
    expect(method).toContainElement(screen.getByTestId('speedup-readout'));
    expect(method).toHaveTextContent('2B language-model backbone and a 300M flow-matching action expert');
    expect(method).toHaveTextContent('FAST action tokens');
    expect(method).toHaveTextContent('cross-sections in the ratio of their sizes');
  });

  it('forward pass opens the sideways passages into the expert', () => {
    render(<MotInsulation />);
    fireEvent.click(passButton(/forward pass/i));
    const passage = screen.getByTestId(`attention-${LAYER_COUNT - 1}`);
    expect(passage).toHaveAttribute('data-valve', 'open');
    expect(screen.getByTestId('mot-diagram')).toContainElement(passage);
    expect(screen.queryByTestId('gradient-barrier')).not.toBeInTheDocument();
  });

  it('backward pass with insulation shows the barrier and the FAST cross-entropy supervision', () => {
    render(<MotInsulation />);
    fireEvent.click(passButton(/forward pass/i));
    fireEvent.click(passButton(/backward pass/i));
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-barrier')).toBeInTheDocument();
    // The FAST-token feed into the backbone's head is the part that carries the label's meaning now.
    const feed = screen.getByTestId('fast-loss-label');
    expect(feed).toHaveAttribute('data-part', 'fast-feed');
    expect(feed).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('supervision-readout')).toHaveTextContent('FAST-token cross-entropy only');
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.queryByTestId(/gradient-cross-/)).not.toBeInTheDocument();
  });

  it('toggling the stop-gradient off switches to the backward view with crossing gradients and a dropping meter', () => {
    render(<MotInsulation />);
    fireEvent.click(stopGradientToggle());
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('gradient-barrier')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fast-loss-label')).not.toBeInTheDocument();
    expect(screen.getByTestId('gradient-cross-0')).toBeInTheDocument();
    expect(screen.getByTestId('gradient-cross-0')).toHaveAttribute('data-valve', 'open');
    // At full depth the uninsulated gradient has corrupted the whole stack.
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MIN),
    );
  });

  it('meter falls as the uninsulated backward pass steps deeper', () => {
    render(<MotInsulation />);
    fireEvent.click(stopGradientToggle());
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '2' } });
    const shallow = Number(
      screen.getByTestId('language-score').textContent,
    );
    fireEvent.change(slider, { target: { value: String(LAYER_COUNT) } });
    const deep = Number(screen.getByTestId('language-score').textContent);
    expect(deep).toBeLessThan(shallow);
    expect(shallow).toBeLessThan(LANGUAGE_SCORE_MAX);
  });

  it('reset restores the insulated backward pass at full depth', async () => {
    const user = userEvent.setup();
    render(<MotInsulation />);
    fireEvent.click(stopGradientToggle());
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(passButton(/backward pass/i)).toHaveAttribute('aria-pressed', 'true');
    expect(stopGradientToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('language-score')).toHaveTextContent(
      String(LANGUAGE_SCORE_MAX),
    );
    expect(screen.getByTestId('step-readout')).toHaveTextContent(
      `${LAYER_COUNT} / ${LAYER_COUNT}`,
    );
  });

  it('says the depth in the slider value text, with a name that is its visible label', () => {
    render(<MotInsulation />);
    const slider = screen.getByRole('slider', { name: 'Pass depth' });
    expect(slider).toHaveAttribute('aria-valuetext', `${LAYER_COUNT} of ${LAYER_COUNT} layers`);
    fireEvent.change(slider, { target: { value: '0' } });
    expect(slider).toHaveAttribute('aria-valuetext', `0 of ${LAYER_COUNT} layers`);
    expect(screen.getByTestId('step-readout')).toHaveTextContent(`0 / ${LAYER_COUNT}`);
  });

  describe('speaking the stage readout', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const announcer = () => document.querySelector('[data-anatomy-announcer]')!;
    const stageReadout = () => document.querySelector('[data-figure-stage] [data-figure-readout]')!;
    async function settle() {
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        vi.advanceTimersByTime(READOUT_SETTLE_MS + 60);
      });
    }

    it('speaks the new pass sentence once it settles after a pass button or the protection toggle', async () => {
      vi.useFakeTimers();
      render(<MotInsulation />);
      expect(announcer()).toHaveAttribute('role', 'status');
      expect(announcer().textContent).toBe('');
      fireEvent.click(passButton(/forward pass/i));
      await settle();
      expect(stageReadout().textContent).toBe(`forward · ${LAYER_COUNT} of ${LAYER_COUNT} trays · ${LAYER_COUNT} valves open`);
      expect(announcer().textContent).toBe(stageReadout().textContent);
      act(() => {
        vi.advanceTimersByTime(READOUT_CLEAR_MS);
      });
      fireEvent.click(stopGradientToggle());
      await settle();
      expect(announcer().textContent).toBe(stageReadout().textContent);
      expect(announcer().textContent).toMatch(/^backward/);
    });

    it('leaves a depth change to the slider value text, which says every number of the readout', async () => {
      vi.useFakeTimers();
      render(<MotInsulation />);
      const slider = screen.getByRole('slider');
      slider.focus();
      fireEvent.change(slider, { target: { value: '0' } });
      await settle();
      expect(stageReadout().textContent).toBe(`backward · 0 of ${LAYER_COUNT} trays · valves shut`);
      expect(announcer().textContent).toBe('');
    });
  });
});

describe('MotInsulation tray columns', () => {
  it('keeps every word out of the drawing', () => {
    render(<MotInsulation />);
    const svg = screen.getByTestId('mot-diagram');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg.textContent).toBe('');
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-series]')).toHaveLength(0);
    expect(screen.getAllByRole('slider')).toHaveLength(1);
  });

  it('draws every pass, protection and depth exactly as the model says', { timeout: 60_000 }, () => {
    // Reduced motion lands every change on its rest pose at once, so the drawn shapes can be read.
    askForStillness();
    render(<MotInsulation />);
    const svg = screen.getByTestId('mot-diagram');
    for (const [pass, stop, step] of STATES) {
      goTo(pass, stop, step);
      const where = `${pass} ${stop ? 'protected' : 'open'} ${step}`;
      const states = layerStates(pass, stop, step);
      const barrier = gradientBarrier(pass, stop);
      // One sweep of the drawing per state: its test ids and its filled sight glasses.
      const ids = new Map([...svg.querySelectorAll('[data-testid]')].map((el) => [el.getAttribute('data-testid')!, el]));
      const filled = new Set(
        [...svg.querySelectorAll('[data-live="fluid"]')]
          .filter((el) => (el.getAttribute('d') ?? '') !== '')
          .map((el) => `${el.getAttribute('data-column')}-${el.getAttribute('data-index')}`),
      );
      for (const state of states) {
        // Trays: active exactly as the model says, and their sight glasses hold fluid exactly then.
        for (const [column, active] of [['backbone', state.backboneActive], ['expert', state.expertActive]] as const) {
          expect(ids.get(`${column}-layer-${state.index}`)?.getAttribute('data-active'), where).toBe(String(active));
          expect(filled.has(`${column}-${state.index}`), where).toBe(active);
        }
        // Passages: the forward draw and the backward seep sit on the valve that carries them.
        expect(ids.has(`attention-${state.index}`), where).toBe(state.sidewaysAttention);
        expect(ids.has(`gradient-cross-${state.index}`), where).toBe(state.gradientCrosses);
      }
      // Valves: shut exactly when the model puts up the barrier, open exactly where the pass runs through.
      const valves = [...svg.querySelectorAll('[data-valve]')];
      expect(valves).toHaveLength(LAYER_COUNT);
      valves.forEach((valve, index) => {
        expect(valve.getAttribute('data-valve') === 'shut', where).toBe(barrier);
        expect(valve.getAttribute('data-valve') === 'open', where).toBe(states[index]!.sidewaysAttention || states[index]!.gradientCrosses);
      });
      const wall = ids.get('gradient-barrier');
      expect(wall !== undefined, where).toBe(barrier);
      if (wall) for (const valve of valves) expect(wall.contains(valve), where).toBe(true);
      // The FAST-token feed is open exactly when it is what supervises the backbone.
      const feed = svg.querySelector('[data-part="fast-feed"]')!;
      expect(feed.getAttribute('data-open') === 'true', where).toBe(backboneSupervision(pass, stop) === 'fast-cross-entropy');
      expect(ids.get('fast-loss-label') === (barrier ? feed : undefined), where).toBe(true);
      // The language gauge's needle reads the model's score.
      const score = languageScore(pass, stop, step);
      const needle = ids.get('language-needle')!;
      expect(needle.getAttribute('data-score'), where).toBe(String(score));
      expect(needle.getAttribute('d'), where).toBe(needlePath(score));
      expect(screen.getByTestId('language-score').textContent, where).toBe(String(score));
      // One lit part: the open valves going forward, the gradient going back.
      const lit = [...svg.querySelectorAll('.iso-solid[data-lit], [data-tone="lit"], [data-fluid="gradient"][data-live="fluid"]')].filter(
        (el) => el.matches('.iso-solid') || (el.getAttribute('d') ?? '') !== '',
      );
      const names = new Set(lit.map((el) => el.closest('[data-lit-part]')?.getAttribute('data-lit-part') ?? 'unnamed'));
      if (step === 0) expect(names.size, where).toBeLessThanOrEqual(1);
      else expect([...names], where).toEqual([pass === 'forward' ? 'open-valves' : 'gradient']);
    }
  });
});

describe('MotInsulation served HTML', () => {
  const records = widgetCitationRecords('MotInsulation');
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <CitationRecordsProvider records={records}>
      <MotInsulation />
    </CitationRecordsProvider>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/knowledge-insulation/');
    expect(figures).toEqual(['mot-insulation']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
