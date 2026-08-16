import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ActionTokenization } from '@/components/interactive/action-tokenization';
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
    render(<ActionTokenization />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    for (const dim of ACTION_DIMS) {
      expect(
        screen.getByRole('button', { name: dim.label }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('token-stream')).toBeInTheDocument();
    expect(valueReadout()).toBeInTheDocument();
    expect(binReadout()).toBeInTheDocument();
    expect(tokenReadout()).toBeInTheDocument();
  });

  it('labels the binning grid as 256 bins per dimension', () => {
    render(<ActionTokenization />);
    expect(screen.getByRole('img', { name: /256 bins/i })).toBeInTheDocument();
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
    expect(binReadout()).toHaveTextContent(`bin ${bin} of 255`);
    expect(tokenReadout()).toHaveTextContent(tokenForBin(bin));
  });

  it('updates the bin and token when the control step changes', () => {
    render(<ActionTokenization defaultStep={0} defaultDim={0} />);
    const before = tokenReadout().textContent;
    fireEvent.change(slider(), { target: { value: '9' } });
    const value = chunk[0][9];
    const bin = binIndex(value);
    expect(binReadout()).toHaveTextContent(`bin ${bin} of 255`);
    expect(tokenReadout()).toHaveTextContent(tokenForBin(bin));
    expect(tokenReadout().textContent).not.toBe(before);
  });

  it('serializes the whole action vector as a stream of vocabulary tokens', () => {
    render(<ActionTokenization defaultStep={3} />);
    const stream = screen.getByTestId('token-stream');
    for (const dim of ACTION_DIMS) {
      const bin = binIndex(chunk[ACTION_DIMS.indexOf(dim)][3]);
      expect(stream).toHaveTextContent(tokenForBin(bin));
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
    await user.click(screen.getByRole('button', { name: 'Δy' }));
    expect(valueReadout()).toHaveTextContent(chunk[1][4].toFixed(3));
    expect(valueReadout().textContent).not.toBe(before);
  });

  it('reset restores the default step and dimension', async () => {
    const user = userEvent.setup();
    render(<ActionTokenization />);
    fireEvent.change(slider(), { target: { value: '12' } });
    await user.click(screen.getByRole('button', { name: 'Δz' }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('7');
    expect(valueReadout()).toHaveTextContent(chunk[0][7].toFixed(3));
  });

  it('labels the visualization as an illustrative model', () => {
    render(<ActionTokenization />);
    expect(screen.getByText(/illustrative/i)).toBeInTheDocument();
  });
});
