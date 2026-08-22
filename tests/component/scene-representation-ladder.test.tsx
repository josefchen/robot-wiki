import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SceneRepresentationLadder } from '@/components/interactive/scene-representation-ladder';
import {
  CAPABILITIES,
  DEFAULT_REPRESENTATION,
  REPRESENTATIONS,
  RESOLUTION_CM,
  representationById,
  type CapabilityId,
} from '@/lib/scene-representation';

function selector(id: string) {
  return screen.getByTestId(`scene-select-${id}`);
}

function capability(id: CapabilityId) {
  return screen.getByTestId(`scene-capability-${id}`);
}

function capabilityStates(): string[] {
  return CAPABILITIES.map(
    (c) => capability(c.id).getAttribute('data-state') ?? '',
  );
}

function footprintText(): string {
  return screen.getByTestId('scene-footprint-readout').textContent ?? '';
}

describe('SceneRepresentationLadder', () => {
  it('renders one selector per rung, the resolution slider, and a reset', () => {
    render(<SceneRepresentationLadder />);
    for (const rep of REPRESENTATIONS) {
      expect(selector(rep.id)).toBeInTheDocument();
    }
    expect(screen.getByTestId('scene-resolution-slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('opens on the occupancy grid with a drawn panel and a footprint', () => {
    render(<SceneRepresentationLadder />);
    expect(selector(DEFAULT_REPRESENTATION)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByTestId(`scene-panel-${DEFAULT_REPRESENTATION}`),
    ).toBeInTheDocument();
    expect(footprintText()).toMatch(/\d/);
    expect(screen.getByTestId('scene-elements-readout')).toHaveTextContent(
      /voxels/,
    );
  });

  it('draws only the selected representation', async () => {
    const user = userEvent.setup();
    render(<SceneRepresentationLadder />);
    await user.click(selector('gaussian-splat'));
    expect(screen.getByTestId('scene-panel-gaussian-splat')).toBeInTheDocument();
    expect(
      screen.queryByTestId('scene-panel-occupancy-grid'),
    ).not.toBeInTheDocument();
    expect(selector('occupancy-grid')).toHaveAttribute('aria-pressed', 'false');
  });

  it('two representations yield different capability sets (VAL-CLASS-050)', async () => {
    const user = userEvent.setup();
    render(<SceneRepresentationLadder />);
    const grid = capabilityStates();
    await user.click(selector('gaussian-splat'));
    const splat = capabilityStates();
    expect(splat).not.toEqual(grid);
  });

  it('renders a negative contact-normal state as visible text (VAL-CLASS-050)', async () => {
    const user = userEvent.setup();
    render(<SceneRepresentationLadder />);
    await user.click(selector('gaussian-splat'));
    const indicator = capability('contact-normal');
    expect(indicator).toHaveAttribute('data-state', 'no');
    expect(indicator).toHaveTextContent(/Surface normal for contact:\s*no/i);
    expect(indicator).toHaveAttribute(
      'aria-label',
      'Surface normal for contact: no',
    );
    // And the splat is the one rung that renders a novel view.
    expect(capability('novel-view')).toHaveAttribute('data-state', 'yes');
  });

  it('the footprint rises strictly with resolution while capabilities hold (VAL-CLASS-051)', async () => {
    render(<SceneRepresentationLadder />);
    const slider = screen.getByTestId('scene-resolution-slider');
    const before = capabilityStates();
    const readings: number[] = [];
    for (let i = 0; i < RESOLUTION_CM.length; i += 1) {
      // A range input is not editable text, so user.clear() throws on it and
      // a bare dispatchEvent bypasses React's synthetic value tracker. Only
      // fireEvent.change moves a controlled range in jsdom.
      fireEvent.change(slider, { target: { value: String(i) } });
      const bytes = screen.getByTestId('scene-footprint-readout').textContent ?? '';
      const value = Number.parseFloat(bytes);
      const unit = /GB/.test(bytes)
        ? 1024 ** 3
        : /MB/.test(bytes)
          ? 1024 ** 2
          : /KB/.test(bytes)
            ? 1024
            : 1;
      readings.push(value * unit);
      expect(capabilityStates(), `capabilities at index ${i}`).toEqual(before);
    }
    expect(readings.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < readings.length; i += 1) {
      expect(readings[i]).toBeGreaterThan(readings[i - 1]!);
    }
  });

  it('reset restores the default representation and resolution', async () => {
    const user = userEvent.setup();
    render(<SceneRepresentationLadder />);
    const opening = screen.getByTestId('scene-resolution-value').textContent;
    const openingFootprint = footprintText();

    await user.click(selector('mesh'));
    const slider = screen.getByTestId('scene-resolution-slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: String(RESOLUTION_CM.length - 1) } });
    expect(screen.getByTestId('scene-resolution-value').textContent).not.toBe(
      opening,
    );

    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(selector(DEFAULT_REPRESENTATION)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('scene-resolution-value').textContent).toBe(
      opening,
    );
    expect(footprintText()).toBe(openingFootprint);
  });

  it('exposes the panel as a described image and tracks the selection', async () => {
    const user = userEvent.setup();
    const { container } = render(<SceneRepresentationLadder />);
    const panel = screen.getByRole('img', { name: /occupancy grid/i });
    const describedBy = panel.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const description = container.querySelector(
      `[id="${CSS.escape(describedBy!)}"]`,
    );
    expect(description?.textContent).toMatch(/occupancy grid at \d+ cm/);

    await user.click(selector('tsdf'));
    expect(
      container.querySelector('[data-chart-description]')?.textContent,
    ).toMatch(/signed-distance field/);
  });

  it('names, in text, what each rung does with the unobserved region', async () => {
    const user = userEvent.setup();
    render(<SceneRepresentationLadder />);
    expect(screen.getByTestId('scene-live-summary')).toHaveTextContent(
      /unknown/i,
    );
    await user.click(selector('gaussian-splat'));
    expect(screen.getByTestId('scene-live-summary')).toHaveTextContent(
      representationById('gaussian-splat').unobserved.slice(0, 40),
    );
  });
});
