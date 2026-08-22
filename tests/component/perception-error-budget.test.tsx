import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PerceptionErrorBudget } from '@/components/interactive/perception-error-budget';
import { SLIDER_SPECS } from '@/lib/perception-error';

function slider(name: RegExp) {
  return screen.getByRole('slider', { name });
}

const total = () =>
  Number.parseFloat(
    screen.getByTestId('perception-total-readout').textContent ?? '',
  );

describe('PerceptionErrorBudget', () => {
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
    expect(label).toHaveTextContent(/square of distance/i);
    expect(label).toHaveTextContent(/compose/i);
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

  it('names the target surface and its failure mode as visible text', async () => {
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
      /saturates/i,
    );
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
