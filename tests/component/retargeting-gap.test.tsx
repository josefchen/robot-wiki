import { fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import {
  PERSON_HIP_CM,
  RATIO_MAX,
  RATIO_MIN,
  RetargetingGap,
  UNITS_PER_CM,
  footGapCm,
  readoutFor,
  soleGapUnits,
} from '@/components/interactive/retargeting-gap';
import { FLOOR, HIPS, HIP_Z, WALK, jointsOf, legDrop } from '@/components/iso/figures/retarget-frame';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { widgetCitationRecords } from '@/lib/widget-citations';

const records = widgetCitationRecords('RetargetingGap');
const Wrapper = ({ children }: { children: ReactNode }) => (
  <CitationRecordsProvider records={records}>{children}</CitationRecordsProvider>
);
const renderFigure = () => render(<RetargetingGap />, { wrapper: Wrapper });

describe('RetargetingGap', () => {
  it('leads with the kicker, the takeaway headline and a one-sentence caption', () => {
    const { container } = renderFigure();
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Motion retargeting');
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent("Copied human poses misplace a robot's feet");
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "Joint-for-joint copies onto other proportions leave robot feet floating or sunk, which hurts tracking policies.",
    );
  });

  it('floats shorter legs, sinks longer ones and lands equal ones', () => {
    expect(footGapCm(75)).toBe(23);
    expect(footGapCm(100)).toBe(0);
    expect(footGapCm(120)).toBe(-18);
  });

  it('hangs both bodies at one hip height and measures the drawn gap with the model', () => {
    // The mannequin's planted foot stands on the floor; both hips hang from the beam at its hip height.
    expect(jointsOf(HIPS.mannequin, 1, 'near').sole[2]).toBeCloseTo(FLOOR, 9);
    expect(jointsOf(HIPS.robot, 0.8, 'near').hip[2]).toBe(HIP_Z);
    expect(jointsOf(HIPS.mannequin, 1, 'far').hip[2]).toBe(HIP_Z);
    // Same joint angles: the robot's thigh and shin point the same way as the mannequin's at any length.
    for (const leg of ['near', 'far'] as const) {
      const person = jointsOf(HIPS.mannequin, 1, leg);
      const robot = jointsOf(HIPS.robot, 1.2, leg);
      const slope = (a: number[], b: number[]) => (b[2] - a[2]) / (b[0] - a[0]);
      expect(slope(robot.hip, robot.knee)).toBeCloseTo(slope(person.hip, person.knee), 9);
      expect(slope(robot.knee, robot.sole)).toBeCloseTo(slope(person.knee, person.sole), 9);
    }
    // The drawn gap under the planted foot, read on the gauge's centimetre scale, is the model's gap.
    expect(UNITS_PER_CM).toBeCloseTo(legDrop(WALK, 1) / PERSON_HIP_CM, 9);
    for (let ratio = RATIO_MIN; ratio <= RATIO_MAX; ratio += 5) {
      const drawnCm = soleGapUnits(ratio / 100) / UNITS_PER_CM;
      expect(drawnCm).toBeCloseTo(PERSON_HIP_CM * (1 - ratio / 100), 9);
      expect(Math.abs(drawnCm - footGapCm(ratio))).toBeLessThanOrEqual(0.5 + 1e-9);
    }
    expect(readoutFor(75)).toBe('feet float 23 cm');
    expect(readoutFor(100)).toBe('feet land');
    expect(readoutFor(120)).toBe('feet sink 18 cm');
  });

  it('opens with floating feet and drives the gap from the one slider', () => {
    const { container } = renderFigure();
    expect(screen.getByTestId('retargeting-gap')).toHaveAttribute('data-gap', '23');
    expect(container.querySelector('[data-readout]')).toHaveTextContent('feet float 23 cm');
    // The robot's planted foot is the one lit part.
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(1);
    expect(screen.getByTestId('retargeting-robot').querySelector('.iso-solid[data-lit]')).not.toBeNull();
    const slider = screen.getByRole('slider', { name: /leg length as a percentage/ });
    fireEvent.change(slider, { target: { value: '100' } });
    expect(screen.getByTestId('retargeting-ratio')).toHaveTextContent('100% as long');
    expect(screen.getByTestId('retargeting-gap')).toHaveAttribute('data-gap', '0');
    expect(screen.getByRole('img', { name: /legs 100% as long.*Same proportions: the feet land/ })).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '120' } });
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('feet sink 18 cm into the floor'));
  });

  it('describes the stage and links both sources', () => {
    renderFigure();
    const stage = screen.getByRole('img', { name: /person walking, and a robot/ });
    expect(document.getElementById(stage.getAttribute('aria-describedby') ?? '')).toHaveTextContent('float 23 cm above the floor');
    const links = [...screen.getByTestId('retargeting-source').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(records.map((r) => r.url));
  });
});

describe('RetargetingGap served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<Wrapper><RetargetingGap /></Wrapper>)}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/humanoid-wbc/');
    expect(figures).toEqual(['retargeting-gap']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
