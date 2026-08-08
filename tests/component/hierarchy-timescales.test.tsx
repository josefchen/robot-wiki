import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HierarchyTimescales } from '@/components/interactive/hierarchy-timescales';
import { HIERARCHY_SYSTEMS, getSystem } from '@/lib/hierarchy-timescales';

function scrubTo(value: number) {
  fireEvent.change(screen.getByRole('slider', { name: /playhead/i }), {
    target: { value: String(value) },
  });
}

describe('HierarchyTimescales', () => {
  it('renders a selector button for every system overlay', () => {
    render(<HierarchyTimescales />);
    for (const system of HIERARCHY_SYSTEMS) {
      expect(
        screen.getByRole('button', { name: new RegExp(system.name, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('renders one lane row per lane of the selected system', () => {
    render(<HierarchyTimescales />);
    const pi05 = getSystem('pi05');
    for (const lane of pi05.lanes) {
      expect(screen.getByTestId(`lane-row-${lane.id}`)).toBeInTheDocument();
    }
  });

  it('exposes a keyboard-operable playhead slider with a visible readout', () => {
    render(<HierarchyTimescales />);
    const slider = screen.getByRole('slider', { name: /playhead/i });
    expect(slider).toHaveAttribute('aria-label');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '2000');
    expect(screen.getByTestId('playhead-readout')).toHaveTextContent('0 ms');
  });

  it('switching to Helix 02 changes the lane structure to S2/S1/S0', async () => {
    const user = userEvent.setup();
    render(<HierarchyTimescales />);
    await user.click(screen.getByRole('button', { name: /Helix 02/i }));
    expect(screen.getByTestId('lane-row-s0')).toHaveTextContent('1 kHz');
    expect(screen.getByTestId('lane-row-s1')).toHaveTextContent('200 Hz');
    expect(screen.queryByTestId('lane-row-subtask')).not.toBeInTheDocument();
  });

  it('switching to GO-2 shows the planner/follower split', async () => {
    const user = userEvent.setup();
    render(<HierarchyTimescales />);
    await user.click(screen.getByRole('button', { name: /GO-2/i }));
    expect(screen.getByTestId('lane-row-planner')).toBeInTheDocument();
    expect(screen.getByTestId('lane-row-follower')).toBeInTheDocument();
    expect(screen.getByTestId('system-detail')).toHaveTextContent(
      /asynchronous/i,
    );
  });

  it('scrubbing the playhead updates the readout and per-lane counters', () => {
    render(<HierarchyTimescales />);
    scrubTo(20);
    expect(screen.getByTestId('playhead-readout')).toHaveTextContent('20 ms');
    expect(screen.getByTestId('lane-row-control')).toHaveTextContent(
      'last update: 20 ms',
    );
    // The ~1 Hz subtask lane has not fired yet.
    expect(screen.getByTestId('lane-row-subtask')).toHaveTextContent(
      'waiting',
    );
  });

  it('a slow lane holds its last update while a fast lane advances', () => {
    render(<HierarchyTimescales />);
    scrubTo(1020);
    expect(screen.getByTestId('lane-row-subtask')).toHaveTextContent(
      'last update: 1000 ms',
    );
    expect(screen.getByTestId('lane-row-control')).toHaveTextContent(
      'last update: 1020 ms',
    );
    // Advancing within the subtask period moves control only.
    scrubTo(1060);
    expect(screen.getByTestId('lane-row-subtask')).toHaveTextContent(
      'last update: 1000 ms',
    );
    expect(screen.getByTestId('lane-row-control')).toHaveTextContent(
      'last update: 1060 ms',
    );
  });

  it('the instruction lane fires exactly once at t=0', () => {
    render(<HierarchyTimescales />);
    expect(screen.getByTestId('lane-row-instruction')).toHaveTextContent(
      'last update: 0 ms',
    );
    scrubTo(2000);
    expect(screen.getByTestId('lane-row-instruction')).toHaveTextContent(
      'last update: 0 ms',
    );
  });

  it('reset restores the default system and playhead', async () => {
    const user = userEvent.setup();
    render(<HierarchyTimescales />);
    await user.click(screen.getByRole('button', { name: /Helix 02/i }));
    scrubTo(200);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('playhead-readout')).toHaveTextContent('0 ms');
    expect(screen.getByTestId('lane-row-subtask')).toBeInTheDocument();
    expect(screen.queryByTestId('lane-row-s0')).not.toBeInTheDocument();
  });

  it('the system detail links to the primary source', async () => {
    const user = userEvent.setup();
    render(<HierarchyTimescales />);
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://arxiv.org/abs/2504.16054',
    );
    await user.click(screen.getByRole('button', { name: /GO-2/i }));
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://www.agibot.com/article/231/detail/56.html',
    );
  });

  it('schematic lanes are labeled as such', async () => {
    const user = userEvent.setup();
    render(<HierarchyTimescales />);
    await user.click(screen.getByRole('button', { name: /GO-2/i }));
    expect(screen.getByTestId('lane-row-planner')).toHaveTextContent(
      /schematic/i,
    );
  });
});
