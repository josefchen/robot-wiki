import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionTokenization } from '@/components/interactive/action-tokenization';
import { AdvantageScrubber } from '@/components/interactive/advantage-scrubber';
import { CompoundingError } from '@/components/interactive/compounding-error';
import { CrossEmbodimentStrategies } from '@/components/interactive/cross-embodiment-strategies';
import { DenoisingLoop } from '@/components/interactive/denoising-loop';
import { FlowMatchingTrajectory } from '@/components/interactive/flow-matching-trajectory';
import { GraspWrenchLab } from '@/components/interactive/grasp-wrench-lab';
import { HierarchyTimescales } from '@/components/interactive/hierarchy-timescales';
import { MotInsulation } from '@/components/interactive/mot-insulation';
import { PendulumController } from '@/components/interactive/pendulum-controller';
import { PlanarFkArm } from '@/components/interactive/planar-fk-arm';
import { RecedingHorizon } from '@/components/interactive/receding-horizon';
import { RrtExplorer } from '@/components/interactive/rrt-explorer';

function mockReducedMotion(matches = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function digitOrRegime(value: string): boolean {
  return /\d/.test(value) || /[A-Za-z]{3,}/.test(value);
}

function assertStateDisclosure(
  details: Element,
  opts: { minPairs?: number } = {},
) {
  const minPairs = opts.minPairs ?? 3;
  expect(details).toHaveAttribute('data-chart-form', 'state');
  expect(details.querySelector('table')).toBeNull();
  expect(details.querySelectorAll('dl')).toHaveLength(1);
  const terms = [...details.querySelectorAll('dt')].map(
    (el) => (el.textContent ?? '').trim(),
  );
  const values = [...details.querySelectorAll('dd')].map(
    (el) => (el.textContent ?? '').trim(),
  );
  expect(terms.length).toBe(values.length);
  expect(terms.length).toBeGreaterThanOrEqual(minPairs);
  expect(terms.every((t) => t.length > 0)).toBe(true);
  expect(values.every((v) => v.length > 0)).toBe(true);
  expect(values.filter(digitOrRegime).length).toBeGreaterThanOrEqual(2);
}

function assertDescribed(
  img: HTMLElement,
  container: HTMLElement,
): { text: string; details: Element } {
  const id = img.getAttribute('aria-describedby');
  expect(id, 'aria-describedby is set').toBeTruthy();
  const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
  expect(desc, 'describedby target exists').toBeTruthy();
  const text = (desc!.textContent ?? '').trim();
  expect(text.length).toBeGreaterThanOrEqual(60);
  const label = (img.getAttribute('aria-label') ?? '').trim();
  const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
  expect(norm(label).includes(norm(text))).toBe(false);
  const details = desc!.parentElement?.querySelector(
    'details[data-chart-data]',
  );
  expect(details).toBeTruthy();
  assertStateDisclosure(details!);
  return { text, details: details! };
}

describe('state-form chart descriptions', () => {
  beforeEach(() => mockReducedMotion(false));

  it('PendulumController describes the scene and lives the readout', () => {
    const { container } = render(<PendulumController />);
    const img = screen.getByTestId('pendulum-scene');
    const { text } = assertDescribed(img, container);
    expect(text).toMatch(/Kp 25\.0/);
    expect(text).toMatch(/holding at release/);
    const readout = screen.getByTestId('pendulum-angle-readout').closest('p');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    fireEvent.change(screen.getByRole('slider', { name: /proportional gain kp/i }), {
      target: { value: '9.5' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).toMatch(/Kp 9\.5/);
    expect(moved).not.toBe(text);
  });

  it('PendulumController prediction mount uses a structurally different takeaway', () => {
    const { container: lab } = render(<PendulumController />);
    const { container: pred } = render(<PendulumController defaultKp={9.5} />);
    const labText = lab.querySelector('[data-chart-description]')?.textContent ?? '';
    const predText = pred.querySelector('[data-chart-description]')?.textContent ?? '';
    const norm = (s: string) => s.replace(/\d/g, '#').replace(/\s+/g, ' ').toLowerCase();
    expect(labText.length).toBeGreaterThan(60);
    expect(predText.length).toBeGreaterThan(60);
    expect(norm(labText)).not.toBe(norm(predText));
  });

  it('GraspWrenchLab describes both roots and lives the readout', () => {
    const { container } = render(<GraspWrenchLab />);
    const object = screen.getByTestId('grasp-object-view');
    const wrench = screen.getByTestId('grasp-wrench-view');
    const a = assertDescribed(object, container);
    const b = assertDescribed(wrench, container);
    expect(a.text).not.toBe(b.text);
    expect(screen.getByTestId('grasp-epsilon-readout').closest('p')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    fireEvent.change(screen.getByRole('slider', { name: /friction coefficient mu/i }), {
      target: { value: '0.20' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(a.text);
  });

  it('RrtExplorer describes the tree state', () => {
    const { container } = render(<RrtExplorer />);
    const { text } = assertDescribed(screen.getByTestId('rrt-scene'), container);
    expect(text).toMatch(/tree not started|iteration 0/);
    fireEvent.change(screen.getByRole('slider', { name: /exploration iteration/i }), {
      target: { value: '40' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('PlanarFkArm describes the pose', () => {
    const { container } = render(<PlanarFkArm />);
    const img = screen.getByRole('img');
    const { text } = assertDescribed(img, container);
    expect(text).toMatch(/110/);
    fireEvent.change(screen.getByRole('slider', { name: /base joint/i }), {
      target: { value: '40' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('CompoundingError describes the rollout root as state', () => {
    const { container } = render(<CompoundingError />);
    const rollout = screen.getByRole('img', { name: /rollout trace/i });
    const { text } = assertDescribed(rollout, container);
    expect(text).toMatch(/rollout/i);
    fireEvent.change(screen.getByRole('slider', { name: /per-step error/i }), {
      target: { value: '10' },
    });
    const moved =
      container.querySelector(
        `[id="${CSS.escape(rollout.getAttribute('aria-describedby')!)}"]`,
      )?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('DenoisingLoop describes the cloud', () => {
    const { container } = render(<DenoisingLoop />);
    const { text } = assertDescribed(screen.getByRole('img'), container);
    expect(text).toMatch(/Gaussian noise|step 0/);
    fireEvent.change(screen.getByRole('slider', { name: /denoising step/i }), {
      target: { value: '10' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('RecedingHorizon describes the plan', () => {
    const { container } = render(<RecedingHorizon />);
    const { text } = assertDescribed(screen.getByRole('img'), container);
    expect(text).toMatch(/T_p 16/);
    fireEvent.change(screen.getByRole('slider', { name: /predicted horizon/i }), {
      target: { value: '24' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('ActionTokenization describes the bin-detail root as state', () => {
    const { container } = render(<ActionTokenization />);
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(2);
    const { text } = assertDescribed(imgs[1], container);
    expect(text).toMatch(/bin/i);
    fireEvent.change(screen.getByRole('slider', { name: /control step/i }), {
      target: { value: '0' },
    });
    const moved =
      container.querySelector(
        `[id="${CSS.escape(imgs[1].getAttribute('aria-describedby')!)}"]`,
      )?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('FlowMatchingTrajectory describes the transport', () => {
    const { container } = render(<FlowMatchingTrajectory />);
    const { text } = assertDescribed(screen.getByRole('img'), container);
    expect(text).toMatch(/Euler/);
    fireEvent.change(screen.getByRole('slider', { name: /integration steps/i }), {
      target: { value: '1' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('MotInsulation describes the pass', () => {
    const { container } = render(<MotInsulation />);
    const { text } = assertDescribed(screen.getByTestId('mot-diagram'), container);
    expect(text).toMatch(/Forward pass|backbone/);
    fireEvent.change(screen.getByRole('slider', { name: /pass depth/i }), {
      target: { value: '3' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('CrossEmbodimentStrategies shares one description across every strip', () => {
    const { container } = render(<CrossEmbodimentStrategies />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(1);
    const ids = imgs.map((img) => img.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(1);
    const { text } = assertDescribed(imgs[0], container);
    expect(container.querySelectorAll('[data-chart-description]')).toHaveLength(1);
    expect(text).toMatch(/Padded|human video/i);
    fireEvent.click(screen.getByRole('button', { name: /relative/i }));
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('HierarchyTimescales describes the Gantt and lives the playhead', () => {
    const { container } = render(<HierarchyTimescales />);
    const { text } = assertDescribed(screen.getByRole('img'), container);
    expect(text).toMatch(/playhead 0 ms/);
    expect(screen.getByTestId('playhead-readout')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    fireEvent.change(screen.getByRole('slider', { name: /playhead position/i }), {
      target: { value: '400' },
    });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).not.toBe(text);
  });

  it('AdvantageScrubber lives the episode readout', () => {
    render(<AdvantageScrubber />);
    const live = screen.getByTestId('time-readout').closest('[aria-live]');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });
});
