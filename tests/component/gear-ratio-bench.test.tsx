import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GearRatioBench, SLOW, figuresOf, readoutFor, swingRate } from '@/components/interactive/gear-ratio-bench';
import {
  DRIVES,
  HIGH_DEG,
  LOW_DEG,
  MOTOR,
  cassetteSvg,
  driveOf,
  hangerAt,
  jointOf,
  leverSvg,
  pushAngle,
  tachAngle,
} from '@/components/iso/figures/gear-ratio-bench';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

describe('GearRatioBench model', () => {
  it('uses the real designs’ ratios', () => {
    expect(DRIVES.map((drive) => drive.ratio)).toEqual([5.8, 36, 100]);
  });

  it('multiplies torque by ratio and efficiency, divides speed by the ratio, and squares the ratio for felt inertia', () => {
    for (const drive of DRIVES) {
      const joint = jointOf(drive);
      expect(joint.torque).toBeCloseTo(MOTOR.peakTorque * drive.ratio * drive.efficiency, 9);
      expect(joint.speedRpm).toBeCloseTo(MOTOR.topSpeedRpm / drive.ratio, 9);
      expect(joint.heavier).toBeCloseTo(drive.ratio ** 2, 9);
      expect(joint.reflected).toBeCloseTo(MOTOR.rotorInertia * drive.ratio ** 2, 12);
    }
  });

  it('reproduces the MIT Cheetah’s reflected inertia of 0.0102 kg m² at 5.8 to 1', () => {
    expect(jointOf(driveOf('leg')).reflected).toBeCloseTo(0.0102, 4);
  });

  it('trades speed for torque: a higher ratio holds more weights, turns slower and feels heavier', () => {
    const [leg, humanoid, arm] = DRIVES.map(jointOf);
    expect(leg!.weights).toBeLessThan(humanoid!.weights);
    expect(humanoid!.weights).toBeLessThan(arm!.weights);
    expect(leg!.speedRpm).toBeGreaterThan(humanoid!.speedRpm);
    expect(humanoid!.speedRpm).toBeGreaterThan(arm!.speedRpm);
    expect(arm!.heavier / leg!.heavier).toBeGreaterThan(arm!.torque / leg!.torque);
    expect(figuresOf(driveOf('arm'))).toEqual({ torque: '188', speed: '30', heavier: '10,000', holds: '76' });
  });

  it('swings every lever at its own top speed, slowed by one shared factor', () => {
    for (const drive of DRIVES) expect(swingRate(drive) * SLOW).toBeCloseTo(jointOf(drive).speedRpm * 6, 9);
  });

  it('rests the hanger on its pedestal only at the bottom of the swing', () => {
    expect(hangerAt(LOW_DEG).onPedestal).toBe(true);
    expect(hangerAt(HIGH_DEG).onPedestal).toBe(false);
  });

  it('moves the dial needles with the model', () => {
    expect(tachAngle(0)).toBeLessThan(tachAngle(jointOf(driveOf('leg')).speedRpm));
    expect(pushAngle(34)).toBeLessThan(pushAngle(1296));
    expect(pushAngle(1296)).toBeLessThan(pushAngle(10000));
  });

  it('draws one lit part per pose: the lever', () => {
    const svg = `${cassetteSvg(driveOf('arm'), 1, 0.01)}${leverSvg(0, 15)}`;
    expect(svg.match(/data-lit=""/g)).toHaveLength(1);
  });
});

describe('GearRatioBench', () => {
  it('opens on the leg cassette with its readout', () => {
    const { container } = render(<GearRatioBench />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('Gearing down trades speed and give for torque');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(driveOf('leg')));
    expect(screen.getByTestId('gear-drive-leg')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(1);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('The blue lever is the joint; each weight is 5 kg · left dial: speed · right dial: how hard the joint is to push back');
  });

  it('swaps to the strain-wave cassette and reads its torque, speed and push-back', () => {
    const { container } = render(<GearRatioBench />);
    fireEvent.click(screen.getByTestId('gear-drive-arm'));
    expect(screen.getByTestId('gear-drive-arm')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('188 newton-meters at the joint · 30 turns a minute · motor feels 10,000 times heavier');
    expect(screen.getByTestId('gear-cassette')).toHaveAttribute('data-drive', 'arm');
    expect(screen.getByRole('img', { name: /holds 15 weights of 5 kg/ })).toBeInTheDocument();
  });

  it('describes the drawing with a table of all three cassettes', () => {
    const { container } = render(<GearRatioBench />);
    const rows = [...container.querySelectorAll('[data-chart-data] tbody tr')].map((row) => row.textContent);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('1,296');
  });
});

describe('GearRatioBench served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<GearRatioBench />)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/hardware-taxonomy/');
    expect(figures).toEqual(['gear-ratio-bench']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
