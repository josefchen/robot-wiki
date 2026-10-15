import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { PerceptionErrorBudget } from '@/components/interactive/perception-error-budget';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits, mainViewText } from '@/lib/figure-main-view';
import { SLIDER_SPECS, handEyeErrorMm } from '@/lib/perception-error';
import { LENS_X, LENS_Z, M, SCALE_MM, SLEEVE_TOP, U, carriageAt, drawnTilt, onPeg, overTop, spindleTop, spotAt, spotPoint, staffX } from '@/components/iso/figures/tilt-miss-bench';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('PerceptionErrorBudget');

const foldOf = (container: HTMLElement, kind: 'adjust' | 'method') =>
  container.querySelector(`details[data-figure-fold="${kind}"]`) as HTMLElement;

describe('PerceptionErrorBudget main view', () => {
  it('leads with the kicker, the takeaway headline, a status line and a one-sentence caption', () => {
    const { container } = render(<PerceptionErrorBudget />);
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Camera alignment');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'A tiny camera tilt becomes a bigger miss farther away',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'Robots reach for what their camera sees, so a camera angle off by a fraction of a degree puts the hand beside the object.',
    );
    expect(container.querySelector('[data-figure-status]')).toHaveTextContent(
      'Schematic: the tilt and the miss are drawn far larger than they are',
    );
  });

  it('shows two plainly labelled sliders and keeps every other control in "Adjust more"', () => {
    const { container } = render(<PerceptionErrorBudget />);
    const adjust = foldOf(container, 'adjust');
    const controls = container.querySelector('[data-figure-controls]') as HTMLElement;
    const visible = Array.from(controls.querySelectorAll('input, button')).filter((el) => !adjust.contains(el));
    expect(visible.map((el) => el.getAttribute('data-testid'))).toEqual([
      'perception-handeye-slider',
      'perception-distance-slider',
    ]);
    expect(controls).toHaveTextContent('How far the camera is tilted0.5 degrees');
    expect(controls).toHaveTextContent('Distance to the object0.50 metres');
    const ends = Array.from(controls.querySelectorAll('[data-slider-ends]'))
      .filter((el) => !adjust.contains(el))
      .map((el) => Array.from(el.children).map((end) => end.textContent));
    expect(ends).toEqual([['not at all', '3 degrees'], ['15 centimetres', '1.5 metres']]);
    expect(slider(/^How far the camera is tilted: /)).toBe(screen.getByTestId('perception-handeye-slider'));
    expect(slider(/^Distance to the object: /)).toBe(screen.getByTestId('perception-distance-slider'));
    for (const id of ['perception-target-opaque', 'perception-depth-slider', 'perception-pose-slider',
      'perception-chart', 'perception-total-readout', 'perception-target-note']) {
      expect(adjust).toContainElement(screen.getByTestId(id));
    }
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset the error budget/i }));
    expect(foldOf(container, 'method')).toContainElement(screen.getByTestId('perception-simplification-label'));
  });

  it('lands the beam the miss above the peg and says the miss in the readout', async () => {
    stillMotion();
    const { container } = render(<PerceptionErrorBudget />);
    const readout = () => container.querySelector('[data-readout]')?.textContent;
    const spot = () => {
      const dot = screen.getByTestId('perception-spot');
      return [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))];
    };
    const expectSpot = (tilt: number, distance: number) => {
      const [x, y] = spotPoint(handEyeErrorMm(tilt, distance), distance);
      expect(spot()[0]).toBeCloseTo(x, 0);
      expect(spot()[1]).toBeCloseTo(y, 0);
    };
    expect(readout()).toBe('0.5 degrees at 0.50 metres · misses by 4.4 millimetres');
    expect(screen.getByTestId('perception-beam')).toHaveAttribute('data-miss', handEyeErrorMm(0.5, 0.5).toFixed(2));
    await frame();
    expectSpot(0.5, 0.5);
    fireEvent.change(slider(/working distance/i), { target: { value: '1.5' } });
    await frame();
    expect(readout()).toBe('0.5 degrees at 1.50 metres · misses by 13.1 millimetres');
    expectSpot(0.5, 1.5);
    expect(screen.getByTestId('perception-staff').getAttribute('transform')).toBe(carriageAt(1.5));
    fireEvent.change(slider(/hand-eye rotation error/i), { target: { value: '3' } });
    await frame();
    expect(readout()).toBe('3.0 degrees at 1.50 metres · misses by 78.6 millimetres, past the scale');
    expect(screen.getByTestId('perception-spot').style.display).toBe('none');
    fireEvent.change(slider(/hand-eye rotation error/i), { target: { value: '0' } });
    await frame();
    expect(readout()).toBe('0.0 degrees at 1.50 metres · the beam lands on the peg');
    expectSpot(0, 1.5);
    const drawing = screen.getByTestId('perception-sight-view');
    expect(drawing.querySelector('text, title, desc, foreignObject')).toBeNull();
    expect(drawing.textContent).toBe('');
  });
});

describe('PerceptionErrorBudget served HTML', () => {
  const records = widgetCitationRecords('PerceptionErrorBudget');
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <CitationRecordsProvider records={records}>
      <PerceptionErrorBudget />
    </CitationRecordsProvider>,
  )}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/perception/');
    expect(figures).toEqual(['perception-error-budget']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
    const { lines } = mainViewText(frame);
    expect(lines).toContain('Slide the target away: the same tilt misses by more0.5 degrees at 0.50 metres · misses by 4.4 millimetres');
    expect(lines.some((line) => line.includes('root-sum-of-squares'))).toBe(false);
  });
});

/** Reduced motion: the bench jumps to each setting on its next frame. */
function stillMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'), media: query, onchange: null, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const frame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

function slider(name: RegExp) {
  return screen.getByRole('slider', { name });
}

const total = () =>
  Number.parseFloat(
    screen.getByTestId('perception-total-readout').textContent ?? '',
  );

describe('PerceptionErrorBudget', () => {
  it('labels the named-model reference without guaranteeing opaque-target accuracy', () => {
    render(<PerceptionErrorBudget />);
    expect(screen.getByTestId('perception-target-note')).toHaveTextContent(
      'not a measured property of that material',
    );
    const budget = screen.getByTestId('perception-budget');
    for (const text of ['D410/D415 and D43x', 'up to 2 m', '80% ROI',
      'HD resolution', 'not an opaque-object measurement or a standard deviation', '150 mW', 'auto exposure']) {
      expect(budget).toHaveTextContent(text);
    }
    expect(budget).not.toHaveTextContent('sensor meets its published spec');
  });

  it('renders four sliders, the target selector, readouts, and reset', () => {
    render(<PerceptionErrorBudget />);
    expect(slider(/hand-eye rotation error/i)).toBeInTheDocument();
    expect(slider(/working distance/i)).toBeInTheDocument();
    expect(slider(/depth error/i)).toBeInTheDocument();
    expect(slider(/object-pose translation error/i)).toBeInTheDocument();
    for (const id of ['opaque', 'specular', 'transparent']) {
      expect(screen.getByTestId(`perception-target-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('perception-total-readout')).toBeInTheDocument();
    expect(screen.getByTestId('perception-depth-readout')).toBeInTheDocument();
    expect(screen.getByTestId('perception-verdict-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('discloses the range-independent depth simplification and why', () => {
    render(<PerceptionErrorBudget />);
    const label = screen.getByTestId('perception-simplification-label');
    expect(label).toHaveTextContent(/range-independent/i);
    expect(label).toHaveTextContent(/chosen ray-to-plane term/i);
    expect(label).toHaveTextContent(/Root-sum-of-squares is an authored rule/i);
    expect(label).toHaveTextContent(/not established standard deviations/i);
    expect(label).toHaveTextContent(/does not establish independence or a real-system error bound/i);
  });

  it('increases the composed error as the working distance grows', () => {
    render(<PerceptionErrorBudget />);
    const distance = slider(/working distance/i);
    const seen: number[] = [];
    for (const value of ['0.15', '0.60', '1.10', '1.50']) {
      fireEvent.change(distance, { target: { value } });
      seen.push(total());
    }
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
  });

  it('holds the composed error flat across distance at zero hand-eye error', () => {
    render(<PerceptionErrorBudget />);
    fireEvent.change(slider(/hand-eye rotation error/i), {
      target: { value: '0' },
    });
    const distance = slider(/working distance/i);
    const seen: number[] = [];
    for (const value of ['0.15', '0.60', '1.10', '1.50']) {
      fireEvent.change(distance, { target: { value } });
      seen.push(total());
    }
    expect(new Set(seen).size).toBe(1);
  });

  it('changes the depth contribution and the verdict when the target turns transparent', async () => {
    const user = userEvent.setup();
    render(<PerceptionErrorBudget />);
    const depthBefore = screen.getByTestId('perception-depth-readout')
      .textContent;
    const verdictBefore = screen.getByTestId('perception-verdict-readout')
      .textContent;
    await user.click(screen.getByTestId('perception-target-transparent'));
    expect(screen.getByTestId('perception-depth-readout').textContent).not.toBe(
      depthBefore,
    );
    expect(
      screen.getByTestId('perception-verdict-readout').textContent,
    ).not.toBe(verdictBefore);
  });

  it('names the target case and discloses the authored floor as visible text', async () => {
    const user = userEvent.setup();
    render(<PerceptionErrorBudget />);
    expect(screen.getByTestId('perception-target-note')).toHaveTextContent(
      /opaque box/i,
    );
    await user.click(screen.getByTestId('perception-target-specular'));
    expect(screen.getByTestId('perception-target-note')).toHaveTextContent(
      /specular metal part/i,
    );
    expect(screen.getByTestId('perception-target-note')).toHaveTextContent(
      /authored depth floor of 6%/i,
    );
    expect(screen.getByTestId('perception-target-note')).not.toHaveTextContent(/saturates/i);
    expect(screen.getByTestId('perception-verdict-readout')).toHaveTextContent('above model band');
  });

  it('exposes native range inputs whose bounds match the shared specs', () => {
    render(<PerceptionErrorBudget />);
    const pairs: Array<[RegExp, { min: number; max: number; step: number }]> = [
      [/hand-eye rotation error/i, SLIDER_SPECS.handEye],
      [/working distance/i, SLIDER_SPECS.distance],
      [/depth error/i, SLIDER_SPECS.depth],
      [/object-pose translation error/i, SLIDER_SPECS.pose],
    ];
    for (const [name, spec] of pairs) {
      const el = slider(name);
      expect(el).toHaveAttribute('type', 'range');
      expect(el).toHaveAttribute('min', String(spec.min));
      expect(el).toHaveAttribute('max', String(spec.max));
      expect(el).toHaveAttribute('step', String(spec.step));
    }
  });

  it('reset restores all four sliders and the target selection', async () => {
    const user = userEvent.setup();
    render(<PerceptionErrorBudget />);
    const opening = {
      handEye: (slider(/hand-eye rotation error/i) as HTMLInputElement).value,
      distance: (slider(/working distance/i) as HTMLInputElement).value,
      depth: (slider(/depth error/i) as HTMLInputElement).value,
      pose: (slider(/object-pose translation error/i) as HTMLInputElement).value,
    };
    fireEvent.change(slider(/hand-eye rotation error/i), {
      target: { value: '2.5' },
    });
    fireEvent.change(slider(/working distance/i), { target: { value: '1.5' } });
    fireEvent.change(slider(/depth error/i), { target: { value: '12' } });
    fireEvent.change(slider(/object-pose translation error/i), {
      target: { value: '15' },
    });
    await user.click(screen.getByTestId('perception-target-transparent'));
    expect(screen.getByTestId('perception-target-transparent')).toBeChecked();

    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect((slider(/hand-eye rotation error/i) as HTMLInputElement).value).toBe(
      opening.handEye,
    );
    expect((slider(/working distance/i) as HTMLInputElement).value).toBe(
      opening.distance,
    );
    expect((slider(/depth error/i) as HTMLInputElement).value).toBe(
      opening.depth,
    );
    expect(
      (slider(/object-pose translation error/i) as HTMLInputElement).value,
    ).toBe(opening.pose);
    expect(screen.getByTestId('perception-target-opaque')).toBeChecked();
  });
});

describe('PerceptionErrorBudget bench model', () => {
  it('lands the beam the miss above the peg on the staff the slider puts at that distance', () => {
    for (const tilt of [0.1, 0.5, 1, 2, 3]) {
      for (const distance of [0.15, 0.5, 1, 1.5]) {
        const miss = handEyeErrorMm(tilt, distance);
        const spot = spotAt(miss, distance);
        // The beam leaves the lens at the camera's drawn tilt, so the camera's axis is the beam.
        expect((spot[2] - LENS_Z) / (LENS_X - spot[0])).toBeCloseTo(Math.tan(drawnTilt(miss, distance)), 9);
        if (onPeg(miss)) {
          // A miss smaller than the peg lands on the peg's own face, in front of the staff.
          expect(spot[0]).toBeGreaterThan(staffX(distance));
        } else {
          // Otherwise on the staff's face, the miss above the peg on the scale.
          expect(spot[0]).toBeCloseTo(staffX(distance), 9);
          expect(spot[2] - LENS_Z).toBeCloseTo(miss * M, 9);
        }
        expect(overTop(miss)).toBe(miss > SCALE_MM + 2);
        // The micrometer's spindle still reaches the camera's underside at every tilt.
        expect(spindleTop(drawnTilt(miss, distance))).toBeGreaterThan(SLEEVE_TOP + 1);
      }
      // The same tilt misses three times as far at three times the distance.
      expect(handEyeErrorMm(tilt, 1.5) * M).toBeCloseTo(3 * handEyeErrorMm(tilt, 0.5) * M, 9);
      // The drawn tilt depends only on the tilt, not on where the staff stands.
      expect(drawnTilt(handEyeErrorMm(tilt, 0.15), 0.15)).toBeCloseTo(drawnTilt(handEyeErrorMm(tilt, 1.5), 1.5), 9);
    }
    // The rail's ruler reads the distance from the lens: one metre is U units of rail.
    expect(LENS_X - staffX(1)).toBe(U);
  });
});
