import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ControlLabel,
  InstrumentFrame,
  InstrumentHeader,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';

describe('InstrumentFrame', () => {
  it('renders a flat instrument surface with frame annotations', () => {
    const { container } = render(<InstrumentFrame>plot</InstrumentFrame>);
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.tagName).toBe('DIV');
    expect(frame).toHaveAttribute('data-brand-surface-id', 'surface:flat');
    expect(frame).toHaveAttribute(
      'data-brand-module-signature',
      'instrument-frame',
    );
    expect(frame).toHaveAttribute('data-brand-frame-depth', '1');
    expect(frame.textContent).toBe('plot');
  });

  it('renders the flat instrument surface only', () => {
    render(<InstrumentFrame>plot</InstrumentFrame>);
    expect(screen.getByText('plot')).toHaveAttribute(
      'data-brand-surface-id',
      'surface:flat',
    );
  });

  it('keeps extra props on the frame element', () => {
    render(<InstrumentFrame data-testid="frame">plot</InstrumentFrame>);
    expect(screen.getByTestId('frame')).toBeInTheDocument();
  });
});

describe('InstrumentHeader', () => {
  it('renders controls, an optional registration label, and trailing meta', () => {
    render(
      <InstrumentHeader label="ACT ablation" meta="two tasks">
        <button type="button">toggle</button>
      </InstrumentHeader>,
    );
    expect(screen.getByRole('button', { name: 'toggle' })).toBeInTheDocument();
    expect(screen.getByText('ACT ablation')).toBeInTheDocument();
    expect(screen.getByText('two tasks')).toBeInTheDocument();
  });

  it('passes group semantics through when the band groups controls', () => {
    render(
      <InstrumentHeader role="group" aria-label="Select a system overlay">
        <button type="button">toggle</button>
      </InstrumentHeader>,
    );
    expect(
      screen.getByRole('group', { name: 'Select a system overlay' }),
    ).toBeInTheDocument();
  });
});

describe('ControlLabel', () => {
  it('labels its control and shows the inline value readout', () => {
    render(
      <>
        <ControlLabel htmlFor="dial" value="k = 100">
          Chunk size
        </ControlLabel>
        <input id="dial" type="range" readOnly />
      </>,
    );
    expect(screen.getByText('Chunk size')).toHaveAttribute('for', 'dial');
    expect(screen.getByText('k = 100')).toBeInTheDocument();
  });

  it('renders a ReactNode value so callers keep test ids and live regions', () => {
    render(
      <ControlLabel
        htmlFor="dial"
        value={<span data-testid="dial-readout">t = 40 ms</span>}
      >
        Playhead
      </ControlLabel>,
    );
    expect(screen.getByTestId('dial-readout')).toHaveTextContent('t = 40 ms');
  });
});

describe('InstrumentReadout', () => {
  it('announces state changes politely', () => {
    render(
      <InstrumentReadout>
        <span data-testid="value-readout">44%</span>
      </InstrumentReadout>,
    );
    const live = screen.getByTestId('value-readout').closest('p');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });
});

describe('InstrumentLegend', () => {
  it('renders named series entries with their swatches', () => {
    render(
      <InstrumentLegend>
        <LegendItem swatch={<svg aria-hidden />}>measured</LegendItem>
        <LegendItem swatch={<svg aria-hidden />}>interpolated</LegendItem>
      </InstrumentLegend>,
    );
    expect(screen.getByText('measured')).toBeInTheDocument();
    expect(screen.getByText('interpolated')).toBeInTheDocument();
  });
});

describe('InstrumentReset', () => {
  it('exposes a keyboard button named Reset that restores state', () => {
    const onReset = vi.fn();
    render(<InstrumentReset onClick={onReset} />);
    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toHaveAttribute('data-brand-control-id', 'control:secondary-action');
    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('supports a caller-supplied label', () => {
    render(<InstrumentReset onClick={() => {}} label="Reset view" />);
    expect(
      screen.getByRole('button', { name: 'Reset view' }),
    ).toBeInTheDocument();
  });
});

describe('PlotStage', () => {
  it('exposes an accessible image wired to its description', () => {
    render(
      <PlotStage
        viewBox="0 0 640 260"
        aria-label="Success rate against chunk size"
        aria-describedby="stage-description"
      >
        <path d="M0,0" />
      </PlotStage>,
    );
    const stage = screen.getByRole('img', {
      name: 'Success rate against chunk size',
    });
    expect(stage.tagName).toBe('svg');
    expect(stage).toHaveAttribute('aria-describedby', 'stage-description');
    expect(stage).toHaveAttribute('viewBox', '0 0 640 260');
  });
});
