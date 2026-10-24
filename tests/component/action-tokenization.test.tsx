import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionTokenization, motionGloss, needleOffset, zoomStartFor } from '@/components/interactive/action-tokenization';
import { HALF, NOTCHES, notchX } from '@/components/iso/figures/token-rack-bank';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import {
  ACTION_DIMS,
  BIN_COUNT,
  binCenter,
  binIndex,
  generateActionChunk,
  tokenForBin,
} from '@/lib/action-tokenization';

function slider() {
  return screen.getByRole('slider', { name: 'Moment in the movement' });
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

  it('says the same one-based moment in the slider value text, the value readout and the stage readout', () => {
    const { container } = render(<ActionTokenization />);
    expect(slider()).toHaveAttribute('aria-valuetext', '8 of 16');
    expect(container.querySelector('label[for="at-step"] [data-figure-control-value]')).toHaveTextContent('8 of 16');
    expect(container.querySelector('[data-readout]')!.textContent).toMatch(/^At moment 8 of 16, /);
    fireEvent.change(slider(), { target: { value: '8' } });
    expect(slider()).toHaveAttribute('aria-valuetext', '9 of 16');
    expect(container.querySelector('label[for="at-step"] [data-figure-control-value]')).toHaveTextContent('9 of 16');
    // The stage readout is what is spoken when "Write the next moment" moves
    // the value without a slider press, so it says the whole value too.
    expect(container.querySelector('[data-readout]')!.textContent).toMatch(/^At moment 9 of 16, /);
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

  it('glosses the seven motions on the rack stage and names the slot in the close-up', () => {
    render(<ActionTokenization />);
    // The drawing that replaced the gripper and its list: one rack per
    // motion, each slider named for its motion, the chosen one marked.
    const hand = screen.getByRole('img', { name: /continuous action chunk/i });
    for (const [i] of ACTION_DIMS.entries()) {
      expect(hand).toHaveAttribute('aria-label', expect.stringContaining(motionGloss(i)));
      expect(hand.querySelector(`[data-motion="${motionGloss(i)}"]`)).toHaveAttribute('data-word', String(binIndex(chunk[i][7])));
    }
    const bin = binIndex(chunk[0][7]);
    expect(hand.querySelector('[data-selection="selected motion"]')).toHaveAttribute('data-motion', 'forward/back');
    // The close-up names the slot and the word, and shows fifteen notches with the assigned one marked.
    const ruler = screen.getByRole('img', { name: /binning detail/i });
    expect(ruler).toHaveAttribute('aria-label', expect.stringContaining(`slot ${bin} of 256,`));
    expect(ruler).toHaveAttribute('aria-label', expect.stringContaining(`written as word ${bin}`));
    expect(ruler.querySelectorAll('[data-notch]').length).toBe(15);
    expect(ruler.querySelector('[data-selection="assigned bin"]')).toHaveAttribute('data-notch', String(bin));
  });

  it('names each drawing more briefly than the description it points to, at every motion', () => {
    // VAL-EDU-021: the accessible name is a short name; the numbers live in the description.
    // VAL-EDU-036 (chart-coverage-sweep): name and description still share two quantity words.
    const stopwords = ['with', 'from', 'over', 'against', 'versus', 'each', 'this', 'that', 'than', 'time'];
    const words = (text: string) =>
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((word) => word.replace(/s$/, ''))
        .filter((word) => word.length >= 4 && !stopwords.includes(word));
    for (const [dim] of ACTION_DIMS.entries()) {
      for (const step of [0, 7, 15]) {
        const { container, unmount } = render(<ActionTokenization defaultStep={step} defaultDim={dim} />);
        for (const name of [/continuous action chunk/i, /binning detail/i]) {
          const drawing = screen.getByRole('img', { name });
          const label = drawing.getAttribute('aria-label') ?? '';
          const id = drawing.getAttribute('aria-describedby') ?? '';
          const description = (container.querySelector(`[id="${id}"]`)?.textContent ?? '').trim();
          expect(description.length).toBeGreaterThan(0);
          expect(label.length, `${name} at motion ${dim}, step ${step}`).toBeLessThan(description.length);
          const shared = new Set(words(label).filter((word) => words(description).includes(word)));
          expect(shared.size, `${name} at motion ${dim}, step ${step}`).toBeGreaterThanOrEqual(2);
        }
        unmount();
      }
    }
  });

  it('describes the traces root with a sampled table and the bin chart with a state list', () => {
    const { container } = render(<ActionTokenization />);
    const desc = container.querySelector('[data-chart-description]');
    expect(desc?.textContent).toMatch(/slider on the forward\/back rack sits in that notch/i);
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

describe('ActionTokenization rack model', () => {
  it('cuts each rack with one notch per bin, so a slider sits where its word is', () => {
    expect(NOTCHES).toBe(BIN_COUNT);
    // Notch n's centre on the rack is the bin's centre value, scaled to the rack.
    for (const bin of [0, 120, 255]) expect(notchX(bin)).toBeCloseTo(binCenter(bin) * HALF);
    // At every moment every slider stands in the notch of its own word.
    render(<ActionTokenization defaultStep={11} />);
    const hand = screen.getByRole('img', { name: /continuous action chunk/i });
    for (const [i] of ACTION_DIMS.entries()) {
      expect(hand.querySelector(`[data-motion="${motionGloss(i)}"]`)).toHaveAttribute('data-word', String(binIndex(chunk[i][11])));
    }
  });

  it('puts the needle inside the assigned notch of the close-up, at most half a notch from its centre', () => {
    for (const [i] of ACTION_DIMS.entries()) {
      for (let t = 0; t < 16; t++) {
        const value = chunk[i][t];
        const bin = binIndex(value);
        const start = zoomStartFor(bin);
        expect(bin - start).toBeGreaterThanOrEqual(0);
        expect(bin - start).toBeLessThan(15);
        const offset = needleOffset(value, start);
        expect(Math.abs(offset - (bin - start + 0.5))).toBeLessThanOrEqual(0.5 + 1e-9);
      }
    }
  });

  it('writes the next moment from the one button, and still shows seven words', () => {
    render(<ActionTokenization />);
    const write = screen.getByTestId('tok-write');
    expect(write).toHaveTextContent('Write the next moment');
    // A secondary action carries no pressed state: its label and disabled state show the write in progress.
    expect(write).not.toHaveAttribute('aria-pressed');
    expect(write).not.toHaveAttribute('aria-disabled');
    write.focus();
    fireEvent.click(write);
    expect(write).toHaveTextContent('Writing the seven words');
    // Disabled for assistive technology but still focusable, so the press does not drop focus to the page.
    expect(write).toHaveAttribute('aria-disabled', 'true');
    expect(write).not.toBeDisabled();
    expect(write).toHaveFocus();
    expect(write).not.toHaveAttribute('aria-pressed');
    // A second press during the write changes nothing.
    const during = slider().getAttribute('aria-valuetext');
    expect(during).toBe('8 of 16');
    fireEvent.click(write);
    expect(slider().getAttribute('aria-valuetext')).toBe(during);
    expect(write).toHaveTextContent('Writing the seven words');
    // Scrubbing takes over from a write in progress.
    fireEvent.change(slider(), { target: { value: '3' } });
    expect(write).toHaveTextContent('Write the next moment');
    expect(write).not.toHaveAttribute('aria-disabled');
    expect(within(screen.getByTestId('token-stream')).getAllByRole('listitem')).toHaveLength(7);
  });
});

describe('ActionTokenization served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<ActionTokenization />)}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/vla-models/');
    expect(figures).toEqual(['action-tokenization']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
