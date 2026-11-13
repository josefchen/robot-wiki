import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HINT, NOISE_PRESETS, TOUR, TeacherStudent, WALKING, gapCm, readoutFor } from '@/components/interactive/teacher-student';
import { HEADS, LOWER_PINS, PARK, PIN_LENGTH, STOP_TIP, TRUE_Z, carriageShift, groundAt, pinRest, pinShift, pinX } from '@/components/iso/figures/contour-gauge-track';
import { CitationRecordsProvider } from '@/components/article/citation-records';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { DEFAULT_DEGRADATION, TERRAIN_CELLS, occludedCells, reconstructionMae } from '@/lib/sim2real';
import { widgetCitationRecords } from '@/lib/widget-citations';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('TeacherStudent');

const slider = () => screen.getByRole('slider', { name: /proprioceptive degradation/i });
const num = (id: string) => Number((screen.getByTestId(id).textContent ?? '0').replace(/[^0-9.]/g, ''));

describe('contour gauge model', () => {
  it('stands one pin over every terrain cell, and the ground passes through the true height under each pin', () => {
    expect(LOWER_PINS).toHaveLength(TERRAIN_CELLS);
    expect(HEADS).toHaveLength(TERRAIN_CELLS);
    expect(pinX(TERRAIN_CELLS - 1)).toBe(-pinX(0));
    for (let i = 0; i < TERRAIN_CELLS; i++) expect(groundAt(pinX(i))).toBeCloseTo(TRUE_Z[i]!, 6);
    expect(PARK.left).toBeLessThan(pinX(0));
    expect(PARK.right).toBeGreaterThan(pinX(TERRAIN_CELLS - 1));
  });

  it('drops every pin onto the true ground with clean readings', () => {
    const rest = pinRest(0);
    expect(rest.missing.every((lost) => !lost)).toBe(true);
    rest.tip.forEach((tip, i) => expect(tip).toBeCloseTo(TRUE_Z[i]!, 6));
  });

  it('hangs a pin at the top of its travel for every missing reading, and sets the rest off the ground by the noise', () => {
    const rest = pinRest(DEFAULT_DEGRADATION);
    const missing = occludedCells(DEFAULT_DEGRADATION);
    expect(missing.filter(Boolean)).toHaveLength(3);
    rest.tip.forEach((tip, i) => {
      if (missing[i]) expect(tip).toBe(STOP_TIP);
      else expect(tip).toBeLessThan(STOP_TIP);
    });
    expect(rest.tip.some((tip, i) => !missing[i] && Math.abs(tip - TRUE_Z[i]!) > 1)).toBe(true);
    // A head that hangs from a missing reading clears every true-ground head.
    expect(STOP_TIP + PIN_LENGTH).toBeGreaterThan(Math.max(...TRUE_Z) + PIN_LENGTH);
  });

  it('reads the average gap in centimeters from the model, and tours the three presets', () => {
    expect(gapCm(DEFAULT_DEGRADATION)).toBe((reconstructionMae(DEFAULT_DEGRADATION) * 100).toFixed(1));
    expect(readoutFor(DEFAULT_DEGRADATION)).toBe('Guess off the real ground by 1.0 cm on average · 3 of 24 readings missing');
    expect(readoutFor(0)).toBe('Guess matches the real ground · no readings missing');
    expect(readoutFor(0.6)).toBe('Guess off the real ground by 8.2 cm on average · 17 of 24 readings missing');
    expect([...TOUR].sort()).toEqual(NOISE_PRESETS.map((p) => p.id).sort());
    expect(TOUR[TOUR.length - 1]).toBe('some');
  });
});

describe('TeacherStudent', () => {
  it('opens on some noise: the guess close to the ground, three pins left hanging', () => {
    const { container } = render(<TeacherStudent />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent('A blind robot feels the ground through its legs');
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Teacher-student training');
    expect(screen.getByRole('button', { name: 'Some noise' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(DEFAULT_DEGRADATION));
    expect(screen.getByTestId('contour-gauge')).toHaveAttribute('data-missing', '3');
    expect(screen.getByTestId('pin-heads').querySelectorAll('[data-missing]')).toHaveLength(3);
    expect(screen.getByTestId('carriage').getAttribute('transform')).toBe(carriageShift(PARK.right));
    const rest = pinRest(DEFAULT_DEGRADATION);
    const lower = screen.getByTestId('lower-pins').children;
    expect(lower).toHaveLength(TERRAIN_CELLS);
    expect(lower[2]!.getAttribute('transform')).toBe(pinShift(rest.tip[2]!));
    // The pin heads are the one lit part (24 heads), and the drawing carries no words.
    expect(container.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(TERRAIN_CELLS);
    expect(screen.getByTestId('pin-heads').querySelectorAll('.iso-solid[data-lit]')).toHaveLength(TERRAIN_CELLS);
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    // Three lines under the drawing: the hint, the readout and the status note.
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent(HINT);
    expect(container.querySelector('[data-anatomy-keys]')).toBeNull();
    expect(WALKING).not.toMatch(/\d/);
  });

  it('moves the readout with the presets: clean matches, very noisy loses most readings', async () => {
    const user = userEvent.setup();
    const { container } = render(<TeacherStudent />);
    await user.click(screen.getByRole('button', { name: 'Clean' }));
    // The carriage walks the track before the readout settles.
    await waitFor(() => expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(0)), { timeout: 8000 });
    expect(num('mae-readout')).toBe(0);
    expect(screen.getByTestId('contour-gauge')).toHaveAttribute('data-missing', '0');
    await user.click(screen.getByRole('button', { name: 'Very noisy' }));
    expect(slider()).toHaveValue('60');
    await waitFor(() => expect(container.querySelector('[data-readout]')).toHaveTextContent(readoutFor(0.6)), { timeout: 8000 });
    expect(screen.getByTestId('pin-heads').querySelectorAll('[data-missing]')).toHaveLength(17);
  });

  it('keeps the slider and Reset in Adjust more and the model numbers in How this was made', () => {
    const { container } = render(<TeacherStudent />);
    expect(container.querySelector('details[data-figure-fold="adjust"]')).toContainElement(slider());
    expect(container.querySelector('details[data-figure-fold="method"]')).toContainElement(screen.getByTestId('mae-readout'));
    expect(container.querySelector('details[data-figure-fold="method"]')).toHaveTextContent('mean absolute error');
    fireEvent.change(slider(), { target: { value: '0' } });
    expect(num('mae-readout')).toBe(0);
    expect(num('divergence-readout')).toBe(0);
    fireEvent.change(slider(), { target: { value: '40' } });
    const mid = num('divergence-readout');
    expect(mid).toBeGreaterThan(0);
    fireEvent.change(slider(), { target: { value: '90' } });
    expect(num('divergence-readout')).toBeGreaterThan(mid);
    expect(screen.getByTestId('occluded-readout')).not.toHaveTextContent('3/24');
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('15');
    expect(screen.getByTestId('occluded-readout')).toHaveTextContent('3/24');
  });

  it('describes the gauge and the model in words, and links the source of the idea', () => {
    const { container } = render(<TeacherStudent />);
    const img = screen.getByRole('img', { name: /A contour gauge over a test track/ });
    expect(img).toHaveAccessibleName(/3 of 24 pins did not drop, and the guess is off by 1\.0 cm on average/);
    const description = container.querySelector(`[id="${CSS.escape(img.getAttribute('aria-describedby')!)}"]`);
    expect(description?.textContent).toMatch(/15 percent proprioceptive degradation/);
    fireEvent.change(slider(), { target: { value: '90' } });
    expect(container.querySelector('[data-chart-description]')?.textContent).toMatch(/90 percent/);
    expect(screen.getByTestId('teacher-student-sources').querySelectorAll('a')).toHaveLength(1);
  });
});

describe('TeacherStudent served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <CitationRecordsProvider records={widgetCitationRecords('TeacherStudent')}>
      <TeacherStudent />
    </CitationRecordsProvider>,
  )}</main></body></html>`;
  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/rl-sim2real/sim2real-transfer/');
    expect(figures).toEqual(['teacher-student']);
    expect(violations.map(formatViolation)).toEqual([]);
  });
  it('shows no symbol, formula or bare unit in the main view', () => {
    expect(mainViewSymbolHits(new JSDOM(html).window.document.querySelector('[data-figure-frame]')!)).toEqual([]);
  });
});
