import { fireEvent, screen } from '@testing-library/react';
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
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('SceneRepresentationLadder');

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
    expect(indicator).toHaveTextContent(/Which way does the surface face\?\s*No/);
    expect(indicator).toHaveAttribute(
      'aria-label',
      'Which way does the surface face? No',
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

  it('states the takeaway as a short headline under a kicker', () => {
    const { container } = render(<SceneRepresentationLadder />);
    const title = container.querySelector('[data-figure-title]');
    expect(title).toHaveTextContent('Each way of storing a room answers different questions');
    expect(title?.textContent?.trim().split(/\s+/).length).toBeLessThanOrEqual(10);
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Scene representations');
    const caption = container.querySelector('[data-figure-caption]')?.textContent ?? '';
    expect(caption.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  it('shows two visible controls in plain words: the store and Detail', () => {
    const { container } = render(<SceneRepresentationLadder />);
    const visible = container.querySelector('[data-figure-controls]')!;
    const outside = (el: Element) => !el.closest('[data-figure-fold]');
    expect([...visible.querySelectorAll('[role="group"]')].filter(outside)).toHaveLength(1);
    expect([...visible.querySelectorAll('input[type="range"]')].filter(outside)).toHaveLength(1);
    const plain = ['Dots', 'Grid of boxes', 'Distance map', 'Triangle skin', 'Soft blobs'];
    REPRESENTATIONS.forEach((rep, i) => {
      expect(selector(rep.id)).toHaveTextContent(plain[i]!);
      // The accessible name starts with the visible label and keeps the technical name.
      expect(selector(rep.id).getAttribute('aria-label')).toMatch(new RegExp(`^${plain[i]} \\(${rep.short}\\)`));
    });
    expect(screen.getByTestId('scene-technical-name')).toHaveTextContent('Engineers call this an occupancy grid');
    expect(screen.getByLabelText(/^Detail/)).toBe(screen.getByTestId('scene-resolution-slider'));
    const ends = visible.querySelector('[data-slider-ends]');
    expect(ends).toHaveTextContent('coarse');
    expect(ends).toHaveTextContent('fine');
    expect(screen.getByTestId('scene-detail-note')).toHaveTextContent(
      'More detail: sharper picture, more storage, same answers.',
    );
  });

  it('names the three questions in plain words, each answered', () => {
    render(<SceneRepresentationLadder />);
    expect(capability('free-space')).toHaveTextContent(/Can the robot move here\?\s*Yes/);
    expect(capability('contact-normal')).toHaveTextContent(/Which way does the surface face\?\s*No/);
    expect(capability('novel-view')).toHaveTextContent(/What does it look like from here\?\s*No/);
  });

  it('points one annotation at the region hidden behind the box', async () => {
    const user = userEvent.setup();
    const { container } = render(<SceneRepresentationLadder />);
    const notes = container.querySelectorAll('[data-figure-stage] [data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent('Hidden behind the box:marked ‘unknown’, not ‘empty’');
    // An arrow, which first-time readers take for a pointer rather than for a mark in the room.
    expect(notes[0]!.querySelector('[data-annotation-pointer="arrow"] polygon')).not.toBeNull();
    expect(notes[0]!.querySelector('circle')).toBeNull();
    await user.click(selector('gaussian-splat'));
    expect(container.querySelector('[data-figure-annotation]')).toHaveTextContent(/rendered, never measured/);
  });

  it('draws the real room under every store', async () => {
    const user = userEvent.setup();
    render(<SceneRepresentationLadder />);
    for (const rep of REPRESENTATIONS) {
      await user.click(selector(rep.id));
      const room = screen.getByTestId('scene-room');
      for (const object of ['box', 'bottle', 'post', 'camera']) {
        expect(room.querySelector(`[data-scene-object="${object}"]`), `${object} on ${rep.id}`).not.toBeNull();
      }
    }
  });

  it('keeps the storage readout and reset in Adjust more, sources in How this was made', () => {
    const { container } = render(<SceneRepresentationLadder />);
    const adjust = container.querySelector('[data-figure-fold="adjust"]')!;
    const method = container.querySelector('[data-figure-fold="method"]')!;
    expect(adjust.querySelector('summary')).toHaveTextContent(/^Adjust more$/);
    expect(method.querySelector('summary')).toHaveTextContent(/^How this was made$/);
    expect(adjust).toContainElement(screen.getByTestId('scene-footprint-readout'));
    expect(adjust).toContainElement(screen.getByTestId('scene-elements-readout'));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    for (const id of ['curless-levoy-1996', 'moravec-elfes-1985']) {
      const chip = container.querySelector(`[data-cite-id="${id}"]`);
      expect(chip, id).not.toBeNull();
      expect(method).toContainElement(chip as HTMLElement);
    }
    expect(method).toHaveTextContent('3.0 by 3.0 by 2.0 m');
    expect(method).toHaveTextContent('16 cm behind its true face');
    expect(method).toHaveTextContent('log-odds');
    expect(method).toHaveTextContent('2,250 voxels (2.2 KB) at 20 cm');
    expect(container.querySelector('[data-figure-status]')).toHaveTextContent(/Schematic/);
  });
});
