import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImpedanceContactLab } from '@/components/interactive/impedance-contact-lab';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits, mainViewText } from '@/lib/figure-main-view';
import { DEFAULT_PARAMS, SLIDER_SPECS, classifyOutcome, simulateContact, type LabParams } from '@/lib/impedance';
import { PRESS, PRESS_SECONDS, pressAt, stillPose, stillReadout } from '@/components/interactive/impedance-contact-lab';
import { CRUSH_N, PARK_LIFT, SCALE_N, SQUEEZE_PER_MM, STOP_N, dialAngle, knobAngle, liftOf, needleAt } from '@/components/iso/figures/press-test-stand';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('ImpedanceContactLab');

describe('ImpedanceContactLab served HTML', () => {
  const markup = renderToStaticMarkup(
    <CitationRecordsProvider records={widgetCitationRecords('ImpedanceContactLab')}>
      <ImpedanceContactLab />
    </CitationRecordsProvider>,
  );
  const html = `<!doctype html><html><body><main>${markup}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/control/');
    expect(figures).toEqual(['impedance-contact-lab']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
    const { lines } = mainViewText(frame);
    expect(lines).toContain(
      'The pointer stays at the first bump; past the shaded arc the glass cracksFirst bump 23.7 newtons · just under the crushing force',
    );
    // The pain limit is off the gauge's scale; it is stated, with its citation, in the method fold.
    expect(lines.some((line) => /pain limit|Han et al/i.test(line))).toBe(false);
    expect(lines.some((line) => /stiffness|damping|impedance law/i.test(line))).toBe(false);
    // No words in the drawing itself.
    const drawing = frame.querySelector('[data-testid="impedance-chart"]')!;
    expect(drawing.querySelector('text, title, desc, foreignObject')).toBeNull();
    expect(drawing.textContent).toBe('');
  });
});

/** The rendered numeric peak-force readout, parsed, when numeric. */
function parsePeak(): number | null {
  const text =
    screen.getByTestId('impedance-peak-readout').textContent ?? '';
  const value = Number.parseFloat(text.replace(' N', ''));
  return Number.isFinite(value) ? value : null;
}

describe('ImpedanceContactLab', () => {
  it('renders on first paint with readouts, defaulting to torque control', () => {
    render(<ImpedanceContactLab />);
    expect(
      screen.getByTestId('impedance-hardware-torque'),
    ).toBeChecked();
    expect(screen.getByTestId('impedance-needle')).toBeTruthy();
    const peak = screen.getByTestId('impedance-peak-readout').textContent;
    expect(peak ?? '').toMatch(/\d/);
    expect(peak).not.toContain('NaN');
    expect(screen.getByTestId('impedance-steady-readout').textContent).toMatch(
      /\d/,
    );
  });

  it('stiffness slider moves the peak-force readout upward across its range', () => {
    render(<ImpedanceContactLab />);
    const slider = screen.getByTestId(
      'impedance-stiffness-slider',
    ) as HTMLInputElement;
    fireEventChange(slider, String(SLIDER_SPECS.stiffness.min));
    const soft = parsePeak();
    fireEventChange(slider, String(SLIDER_SPECS.stiffness.max));
    const hard = parsePeak();
    expect(soft).not.toBeNull();
    expect(hard).not.toBeNull();
    expect(soft!).toBeLessThan(hard!);
  });

  it('position mode disables K and D natively and reads unbounded; torque restores both', async () => {
    const user = userEvent.setup();
    render(<ImpedanceContactLab />);
    // torque -> position
    await user.click(screen.getByTestId('impedance-hardware-position'));
    const kPos = screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement;
    const dPos = screen.getByTestId('impedance-damping-slider') as HTMLInputElement;
    expect(kPos.disabled).toBe(true);
    expect(dPos.disabled).toBe(true);
    expect(
      screen.getByTestId('impedance-peak-readout').textContent,
    ).not.toMatch(/\d/);
    expect(
      screen.getByTestId('impedance-peak-readout').textContent,
    ).toContain('unbounded');
    // position -> torque, same page load
    await user.click(screen.getByTestId('impedance-hardware-torque'));
    const kTor = screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement;
    const dTor = screen.getByTestId('impedance-damping-slider') as HTMLInputElement;
    expect(kTor.disabled).toBe(false);
    expect(dTor.disabled).toBe(false);
    expect(
      screen.getByTestId('impedance-peak-readout').textContent,
    ).toMatch(/\d/);
  });

  it('reset restores the default hardware, gains and depth', async () => {
    const user = userEvent.setup();
    render(<ImpedanceContactLab />);
    await user.click(screen.getByTestId('impedance-hardware-position'));
    const depth = screen.getByTestId('impedance-depth-slider') as HTMLInputElement;
    fireEventChange(depth, '0.006');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('impedance-hardware-torque')).toBeChecked();
    expect(
      (
        screen.getByTestId('impedance-depth-slider') as HTMLInputElement
      ).value,
    ).toBe(String(DEFAULT_PARAMS.depthM));
    expect(
      (
        screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement
      ).value,
    ).toBe(String(DEFAULT_PARAMS.stiffnessKNPerM));
    expect(
      (
        screen.getByTestId('impedance-damping-slider') as HTMLInputElement
      ).value,
    ).toBe(String(DEFAULT_PARAMS.dampingNPerM));
  });

  it('native slider contract: range inputs with labels and accessible names', () => {
    render(<ImpedanceContactLab />);
    for (const id of ['depth', 'stiffness', 'damping']) {
      const input = screen.getByTestId(`impedance-${id}-slider`);
      expect(input.getAttribute('type')).toBe('range');
      expect(input.getAttribute('min')).toBeTruthy();
      expect(input.getAttribute('max')).toBeTruthy();
      expect(input.getAttribute('aria-label')).toMatch(/\d/);
    }
    // Hardware options all present in one radio group.
    for (const hw of ['position', 'torque', 'sea']) {
      expect(screen.getByTestId(`impedance-hardware-${hw}`).getAttribute('type')).toBe('radio');
    }
  });

  it('the force-limit reference line label names its research basis', () => {
    render(<ImpedanceContactLab />);
    const label =
      screen.getByTestId('impedance-limit-label').textContent ?? '';

    expect(label).toContain('contact-force limit');
    expect(label).toMatch(/research basis/i);
    // The caption carries a resolving citation chip for the basis.
    const chip = screen
      .getByTestId('impedance-lab')
      .querySelector('[data-cite-id="han-force-pain-2024"]');
    expect(chip).toBeTruthy();
  });

  // Han et al. (2024), Table 4: 255.0 N is the thigh value for the W-R5
  // wedge impactor; their cylindrical CS-R40 impactor gives 310.8 N there.
  it('says the pain limit was measured with a wedge-shaped impactor', () => {
    render(<ImpedanceContactLab />);
    const method = screen.getByTestId('impedance-limit-label').parentElement?.textContent ?? '';
    expect(method).toMatch(
      /human pain limit is about 10 times the crush force: contact-force limit 255 N \(thigh,[^)]*\), measured with a wedge-shaped impactor/,
    );
  });

  it('opens on the still pose: fingertip on the glass, needle settled, pointer at a first bump just under the crush mark', () => {
    const { container } = render(<ImpedanceContactLab />);
    const run = simulateContact(DEFAULT_PARAMS);
    expect(screen.getByTestId('impedance-press')).toHaveAttribute('data-arm', 'torque');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('First bump 23.7 newtons · just under the crushing force');
    expect(screen.getByTestId('impedance-needle')).toHaveAttribute('data-newtons', run.steadyForceN.toFixed(1));
    expect(screen.getByTestId('impedance-needle').getAttribute('d')).toBe(needleAt(run.steadyForceN));
    expect(screen.getByTestId('impedance-peak-pointer')).toHaveAttribute('data-newtons', run.peakForceN.toFixed(1));
    expect(run.peakForceN).toBeLessThan(CRUSH_N);
    expect(screen.getByTestId('impedance-head')).toHaveAttribute('transform', liftOf(0));
    expect(screen.getByTestId('impedance-crack').style.opacity).toBe('0');
    expect(screen.getByTestId('impedance-knob')).toHaveAttribute('data-stiffness', '800');
    expect(container.querySelector('[data-figure-status]')).toHaveTextContent('Illustrative model, not measured');
    expect(screen.getByTestId('impedance-outcome-readout')).toHaveTextContent('object intact');
    // The arm choice and Softness are the main view; depth, damping and the
    // exact readouts sit in "Adjust more".
    const fold = container.querySelector('[data-figure-fold="adjust"]')!;
    expect(fold.contains(screen.getByTestId('impedance-hardware-torque'))).toBe(false);
    expect(fold.contains(screen.getByTestId('impedance-stiffness-slider'))).toBe(false);
    expect(fold.contains(screen.getByTestId('impedance-depth-slider'))).toBe(true);
    expect(fold.contains(screen.getByTestId('impedance-damping-slider'))).toBe(true);
    expect(fold.contains(screen.getByTestId('impedance-peak-readout'))).toBe(true);
  });

  it('starts each slider name with the label it prints', () => {
    render(<ImpedanceContactLab />);
    for (const [label, id] of [
      ['Softness', 'stiffness'],
      ['How far it presses in', 'depth'],
      ['Calm the bounce', 'damping'],
    ] as const) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: new RegExp(`^${label}: `) })).toBe(
        screen.getByTestId(`impedance-${id}-slider`),
      );
    }
  });

  it('a stiff setting sends the first bump past the crush mark and cracks the glass', () => {
    stillMotion();
    const { container } = render(<ImpedanceContactLab />);
    fireEventChange(screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement, '1500');
    expect(container.querySelector('[data-readout]')?.textContent).toBe('First bump 34.7 newtons · past the crushing force');
    expect(screen.getByTestId('impedance-crack').style.opacity).toBe('1');
    expect(Number(screen.getByTestId('impedance-peak-pointer').getAttribute('data-newtons'))).toBeGreaterThan(CRUSH_N);
    expect(screen.getByTestId('impedance-outcome-readout')).toHaveTextContent('object crushed');
    fireEventChange(screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement, '20000');
    expect(container.querySelector('[data-readout]')?.textContent).toBe(
      'First bump 166.2 newtons · off the scale, far past the crushing force',
    );
    expect(screen.getByTestId('impedance-peak-pointer')).toHaveAttribute('data-newtons', STOP_N.toFixed(1));
  });

  it('the spring arm squeezes its spring and stays gentle; the stiff arm has no knob and pushes off the scale', async () => {
    stillMotion();
    const user = userEvent.setup();
    const { container } = render(<ImpedanceContactLab />);
    await user.click(screen.getByTestId('impedance-hardware-sea'));
    expect(screen.getByTestId('impedance-press')).toHaveAttribute('data-arm', 'sea');
    expect(container.querySelector('[data-readout]')?.textContent).toBe('First bump 1.3 newtons · well under the crushing force');
    expect(screen.getByTestId('impedance-spring')).toBeInTheDocument();
    expect(screen.getByTestId('impedance-knob')).toBeInTheDocument();
    const sea = simulateContact({ ...DEFAULT_PARAMS, hardware: 'sea' });
    const squeeze = stillPose('sea', sea, 'success').squeeze;
    expect(squeeze).toBeGreaterThan(0);
    for (const head of screen.getAllByTestId('impedance-head')) expect(head).toHaveAttribute('transform', liftOf(-squeeze));
    for (const tip of screen.getAllByTestId('impedance-fingertip')) expect(tip).toHaveAttribute('transform', liftOf(0));
    await user.click(screen.getByTestId('impedance-hardware-position'));
    expect(screen.queryByTestId('impedance-knob')).toBeNull();
    expect(screen.queryByTestId('impedance-spring')).toBeNull();
    expect(container.querySelector('[data-readout]')?.textContent).toBe('No force control: the push runs off the scale');
    expect(screen.getByTestId('impedance-needle')).toHaveAttribute('data-newtons', STOP_N.toFixed(1));
    expect(screen.getByTestId('impedance-crack').style.opacity).toBe('1');
    expect(screen.getByTestId('impedance-outcome-readout')).toHaveTextContent('no force control');
  });
});

describe('ImpedanceContactLab pressing again', () => {
  it('presses again after a change, slowed, and comes to rest on the new still pose', async () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const { container } = render(<ImpedanceContactLab />);
    fireEventChange(screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement, '1500');
    const readout = () => container.querySelector('[data-readout]')?.textContent ?? '';
    await waitFor(() => expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('Pressing, slowed for the eye'), { timeout: 2000 });
    expect(readout()).toMatch(/^Pressing · /);
    await waitFor(() => expect(readout()).toBe('First bump 34.7 newtons · past the crushing force'), { timeout: (PRESS_SECONDS + 2) * 1000 });
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('The pointer stays at the first bump');
    expect(screen.getByTestId('impedance-crack').style.opacity).toBe('1');
  }, 15000);
});

describe('ImpedanceContactLab press model', () => {
  const settings: LabParams[] = [
    DEFAULT_PARAMS,
    { ...DEFAULT_PARAMS, stiffnessKNPerM: 400 },
    { ...DEFAULT_PARAMS, stiffnessKNPerM: 1500 },
    { ...DEFAULT_PARAMS, stiffnessKNPerM: 20000 },
    { ...DEFAULT_PARAMS, hardware: 'sea' },
    { ...DEFAULT_PARAMS, hardware: 'sea', stiffnessKNPerM: 20000, depthM: 0.006 },
    { ...DEFAULT_PARAMS, hardware: 'position' },
  ];

  it('plays the simulated contact on the gauge and ends exactly on the still pose', () => {
    for (const params of settings) {
      const run = simulateContact(params);
      const outcome = classifyOutcome(params, run);
      const from = stillPose(params.hardware, run, outcome);
      const end = stillPose(params.hardware, run, outcome);
      expect(pressAt(PRESS_SECONDS + 0.01, params.hardware, run, outcome, from)).toEqual(end);
      // The head lifts to its park first, then comes down to touch.
      const parked = pressAt(PRESS.lift, params.hardware, run, outcome, from);
      expect(parked.lift).toBeCloseTo(PARK_LIFT, 6);
      expect(parked.newtons).toBeCloseTo(0, 6);
      let peak = 0;
      let cracked = false;
      for (let t = PRESS.lift + PRESS.descend; t <= PRESS_SECONDS; t += 0.01) {
        const pose = pressAt(t, params.hardware, run, outcome, from);
        // The pointer never falls back while it presses, and never lags the needle.
        expect(pose.peak).toBeGreaterThanOrEqual(peak - 1e-9);
        expect(pose.peak).toBeGreaterThanOrEqual(Math.min(pose.newtons, STOP_N) - 1e-9);
        peak = pose.peak;
        if (pose.crack > 0) cracked = true;
        if (params.hardware === 'torque') {
          // While the contact plays, the needle is the simulated push at that instant.
          const runT = (t - PRESS.lift - PRESS.descend) / PRESS.slow;
          if (runT < 0.6) {
            const step = run.steps[Math.min(run.steps.length - 1, Math.floor(runT * 1000 + 1e-9))]!;
            expect(pose.newtons).toBeCloseTo(Math.min(step.forceN, STOP_N), 6);
            if (step.forceN > 0) expect(pose.lift).toBe(0);
          }
        }
        if (params.hardware === 'sea' && pose.newtons > 0 && pose.lift === 0) {
          // The spring's squeeze is the push over its 800 N/m stiffness, drawn SQUEEZE_PER_MM a millimetre.
          expect(pose.squeeze).toBeCloseTo((pose.newtons / 800) * 1000 * SQUEEZE_PER_MM, 6);
        }
      }
      // The glass cracks exactly when the push passes the crush force (or the stiff arm has no force control).
      expect(cracked).toBe(outcome !== 'success');
      expect(end.crack).toBe(outcome === 'success' ? 0 : 1);
      expect(end.peak).toBeCloseTo(params.hardware === 'position' ? STOP_N : Math.min(run.peakForceN, STOP_N), 6);
      expect(end.newtons).toBeCloseTo(params.hardware === 'position' ? STOP_N : run.steadyForceN, 6);
    }
  });

  it('turns the gauge with the push and the knob with the softness', () => {
    expect(dialAngle(0)).toBeCloseTo((-135 * Math.PI) / 180, 9);
    expect(dialAngle(SCALE_N)).toBeCloseTo((135 * Math.PI) / 180, 9);
    expect(dialAngle(CRUSH_N)).toBeCloseTo(0, 9);
    expect(dialAngle(1000)).toBe(dialAngle(STOP_N));
    expect(knobAngle(100)).toBeCloseTo((-135 * Math.PI) / 180, 9);
    expect(knobAngle(20000)).toBeCloseTo((135 * Math.PI) / 180, 9);
    expect(knobAngle(800)).toBeGreaterThan(knobAngle(400));
    expect(stillReadout('torque', simulateContact(DEFAULT_PARAMS))).toBe('First bump 23.7 newtons · just under the crushing force');
  });
});

/** Reduced motion: a change of setting goes straight to its still pose instead of pressing again. */
function stillMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'), media: query, onchange: null, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom does not fire real change events from userEvent.type on range
// inputs the way browsers do; set value + dispatch directly.
function fireEventChange(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
}
