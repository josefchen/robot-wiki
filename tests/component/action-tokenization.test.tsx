import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ActionTokenization, motionGloss } from '@/components/interactive/action-tokenization';
import {
  ACTION_DIMS,
  binIndex,
  generateActionChunk,
  tokenForBin,
} from '@/lib/action-tokenization';

function slider() {
  return screen.getByRole('slider', { name: /control step/i });
}

function binReadout() {
  return screen.getByTestId('tok-bin-readout');
}

function tokenReadout() {
  return screen.getByTestId('tok-token-readout');
}

function valueReadout() {
  return screen.getByTestId('tok-value-readout');
}

const chunk = generateActionChunk();

describe('ActionTokenization', () => {
  it('renders the slider, dimension buttons, readouts, token stream, and reset', () => {
    const { container } = render(<ActionTokenization />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    // One scrubber in the main view; the motion buttons wait in "Adjust more".
    const adjust = container.querySelector('[data-figure-fold="adjust"]') as HTMLElement;
    for (const [i] of ACTION_DIMS.entries()) {
      expect(
        within(adjust).getByRole('button', { name: motionGloss(i) }),
      ).toBeInTheDocument();
    }
    expect(within(adjust).getByTestId('tok-bin-strip').querySelectorAll('rect')).toHaveLength(256);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('token-stream')).toBeInTheDocument();
    expect(valueReadout()).toBeInTheDocument();
    expect(binReadout()).toBeInTheDocument();
    expect(tokenReadout()).toBeInTheDocument();
  });

  it('labels the binning grid as 256 bins per dimension', () => {
    render(<ActionTokenization />);
    expect(
      screen.getByRole('img', { name: /256 bins/i }),
    ).toBeInTheDocument();
  });

  it('spans the full chunk (16 control steps)', () => {
    render(<ActionTokenization />);
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '15');
  });

  it('shows the continuous value, its bin, and its token for the selected step', () => {
    render(<ActionTokenization defaultStep={4} defaultDim={1} />);
    const value = chunk[1][4];
    const bin = binIndex(value);
    expect(valueReadout()).toHaveTextContent(value.toFixed(3));
    expect(binReadout()).toHaveTextContent(`slot ${bin} of 256`);
    expect(tokenReadout()).toHaveTextContent(`word ${bin}`);
    expect(screen.getByText(new RegExp(`token ${tokenForBin(bin)}`))).toBeInTheDocument();
  });

  it('updates the bin and token when the control step changes', () => {
    render(<ActionTokenization defaultStep={0} defaultDim={0} />);
    const before = tokenReadout().textContent;
    fireEvent.change(slider(), { target: { value: '9' } });
    const value = chunk[0][9];
    const bin = binIndex(value);
    expect(binReadout()).toHaveTextContent(`slot ${bin} of 256`);
    expect(tokenReadout()).toHaveTextContent(`word ${bin}`);
    expect(tokenReadout().textContent).not.toBe(before);
  });

  it('serializes the whole action vector as a stream of vocabulary tokens', () => {
    render(<ActionTokenization defaultStep={3} />);
    const stream = screen.getByTestId('token-stream');
    const words = within(stream).getAllByRole('listitem');
    expect(words).toHaveLength(ACTION_DIMS.length);
    for (const [i] of ACTION_DIMS.entries()) {
      const bin = binIndex(chunk[i][3]);
      expect(words[i]).toHaveTextContent(`${motionGloss(i)}word ${bin}`);
    }
  });

  it('frames the decode cost as one sequential pass per dimension', () => {
    render(<ActionTokenization />);
    expect(screen.getByTestId('decode-order')).toHaveTextContent(
      `${ACTION_DIMS.length} sequential decodes`,
    );
  });

  it('switches the detailed binning view when another dimension is selected', async () => {
    const user = userEvent.setup();
    render(<ActionTokenization defaultStep={4} defaultDim={0} />);
    const before = valueReadout().textContent;
    await user.click(screen.getByRole('button', { name: 'left/right' }));
    expect(valueReadout()).toHaveTextContent(chunk[1][4].toFixed(3));
    expect(valueReadout().textContent).not.toBe(before);
  });

  it('reset restores the default step and dimension', async () => {
    const user = userEvent.setup();
    render(<ActionTokenization />);
    fireEvent.change(slider(), { target: { value: '12' } });
    await user.click(screen.getByRole('button', { name: 'up/down' }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('7');
    expect(valueReadout()).toHaveTextContent(chunk[0][7].toFixed(3));
  });

  it('labels the visualization as an illustrative model', () => {
    render(<ActionTokenization />);
    expect(screen.getByText(/illustrative/i)).toBeInTheDocument();
  });

  it('glosses the seven motions on the gripper stage and names the slot in the note', () => {
    render(<ActionTokenization />);
    const hand = screen.getByRole('img', { name: /continuous action chunk/i });
    for (const [i] of ACTION_DIMS.entries()) {
      expect(within(hand).getByText(motionGloss(i))).toBeInTheDocument();
    }
    const bin = binIndex(chunk[0][7]);
    expect(hand.querySelector('[data-selection="selected motion"]')).toHaveTextContent('forward/back');
    const ruler = screen.getByRole('img', { name: /binning detail/i });
    expect(ruler).toHaveTextContent(`in slot ${bin} of 256,`);
    expect(ruler).toHaveTextContent(`written as word ${bin}`);
    expect(ruler.querySelectorAll('rect').length).toBe(15);
  });

  it('describes the traces root with a sampled table and the bin chart with a state list', () => {
    const { container } = render(<ActionTokenization />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/dashed rule under the trace/i);
    expect(desc?.textContent).toMatch(/action/i);
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'table');
    const rowCount = details?.querySelectorAll('tbody tr').length ?? 0;
    expect(rowCount).toBeGreaterThanOrEqual(5);
    expect(rowCount).toBeLessThanOrEqual(10);
    const imgs = screen.getAllByRole('img');
    expect(imgs[0]).toHaveAttribute('aria-describedby');
    expect(imgs[1]).toHaveAttribute('aria-describedby');
    const binDetails = container.querySelector(
      'details[data-chart-data][data-chart-form="state"]',
    );
    expect(binDetails?.querySelectorAll('dt').length).toBeGreaterThanOrEqual(3);
  });
});
