import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  BAR_THICKNESS,
  ExpoFtResults,
  GROUPS,
  METHODS,
  barLength,
  barTop,
  panelLeft,
} from '@/components/interactive/expo-ft-results';

describe('ExpoFtResults', () => {
  it('leads with the plain headline, kicker, caption and one note on the EXPO-FT row', () => {
    const { container } = render(<ExpoFtResults />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'One method succeeded every time on all four tasks',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent(
      'EXPO-FT vs four other methods',
    );
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'copying demonstrations alone managed 14 to 23 of 30',
    );
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe('Perfect score: 30 of 30 on every task');
    expect(container.querySelector('details[data-figure-fold="adjust"]')).toBeNull();
  });

  it('gives each method a plain description under its name', () => {
    render(<ExpoFtResults />);
    const stage = screen.getByRole('img');
    expect(stage).toHaveTextContent('copying demos only');
    expect(stage).toHaveTextContent('human steps in to correct');
    expect(stage).toHaveTextContent('practice by trial and error');
  });

  it('draws every published count at its recomputed bar geometry, EXPO-FT at full strength', () => {
    const { container } = render(<ExpoFtResults />);
    METHODS.forEach((method, mi) => {
      GROUPS.forEach((_, gi) => {
        const group = screen.getByTestId(`expo-ft-bar-${method.id}-${gi}`);
        expect(group).toHaveTextContent(String(method.values[gi]));
        const rect = group.querySelector('rect')!;
        expect(Number(rect.getAttribute('x'))).toBe(panelLeft(gi));
        expect(Number(rect.getAttribute('y'))).toBe(barTop(mi));
        expect(Number(rect.getAttribute('width'))).toBe(barLength(method.values[gi]));
        expect(Number(rect.getAttribute('height'))).toBe(BAR_THICKNESS);
        expect(rect.getAttribute('fill-opacity')).toBe(method.id === 'expo-ft' ? '1' : '0.4');
      });
    });
    expect(container.querySelector('[data-expo-lead-row]')).not.toBeNull();
  });

  it('keeps the method notes and the full table, with the HIL-SERL caveat, in How this was made', () => {
    const { container } = render(<ExpoFtResults />);
    const method = container.querySelector('details[data-figure-fold="method"]')!;
    expect(method).toContainElement(screen.getByTestId('expo-ft-methods'));
    expect(method.querySelector('[data-chart-description]')?.textContent).toMatch(
      /randomizes a substantially larger initial-state space/,
    );
    expect(method.querySelectorAll('[data-chart-data] tbody tr')).toHaveLength(GROUPS.length);
  });
});
