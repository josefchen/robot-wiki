import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImpedanceContactLab } from '@/components/interactive/impedance-contact-lab';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits, mainViewText } from '@/lib/figure-main-view';
import { DEFAULT_PARAMS, SLIDER_SPECS } from '@/lib/impedance';
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
    expect(lines).toContain('crushes the object');
    expect(lines.some((line) => /^Human pain limit:\s?about 10 times higher$/.test(line))).toBe(true);
    expect(lines.some((line) => /stiffness|damping|impedance law/i.test(line))).toBe(false);
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
    expect(screen.getByTestId('impedance-force-trace')).toBeTruthy();
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
    expect(method).toMatch(/Pain limit: contact-force limit 255 N \(thigh,[^)]*\), measured with a wedge-shaped impactor,/);
  });

  it('opens on the fingertip, the crush line and a first bump just under it', () => {
    const { container } = render(<ImpedanceContactLab />);
    expect(screen.getByTestId('impedance-contact-sketch')).toHaveAttribute('data-hardware', 'torque');
    expect(screen.getByTestId('impedance-crush-label')).toHaveTextContent('crushes the object');
    expect(screen.getByTestId('impedance-pain-arrow')).toHaveTextContent(
      'Human pain limit: about 10 times higher',
    );
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toBe(
      'First bump: just underthe crushing force',
    );
    expect(screen.queryByTestId('impedance-object-crack')).toBeNull();
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

  it('a stiff setting sends the first bump past the crush line and breaks the object', () => {
    const { container } = render(<ImpedanceContactLab />);
    fireEventChange(screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement, '1500');
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toBe(
      'First bump: pastthe crushing force',
    );
    expect(screen.getByTestId('impedance-object-crack')).toBeInTheDocument();
    expect(screen.getByTestId('impedance-outcome-readout')).toHaveTextContent('object crushed');
    fireEventChange(screen.getByTestId('impedance-stiffness-slider') as HTMLInputElement, '20000');
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toBe(
      'First bump: off the chart,far past the crushing force',
    );
  });

  it('the spring arm and the stiff geared arm change the sketch and the chart', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImpedanceContactLab />);
    await user.click(screen.getByTestId('impedance-hardware-sea'));
    expect(screen.getByTestId('impedance-contact-sketch')).toHaveAttribute('data-hardware', 'sea');
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toBe(
      'First bump: well underthe crushing force',
    );
    await user.click(screen.getByTestId('impedance-hardware-position'));
    expect(screen.queryByTestId('impedance-force-trace')).toBeNull();
    expect(container.querySelector('[data-figure-annotation]')).toBeNull();
    expect(container.querySelector('[data-scene-note]')?.textContent).toBe(
      'This arm only follows a position:nothing sets how hard it pushes',
    );
    expect(screen.getByTestId('impedance-outcome-readout')).toHaveTextContent('no force control');
  });
});

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
