import { describe, expect, it } from 'vitest';
import { formatLongDate } from '@/lib/dates';

describe('formatLongDate', () => {
  it('renders an ISO date as unambiguous day-month-year prose', () => {
    // The month is spelled out, so the day/month order can never be
    // misread (no numeric-only formats).
    expect(formatLongDate('2026-08-09')).toBe('9 August 2026');
  });

  it('drops leading zeros so the day reads as a number', () => {
    expect(formatLongDate('2026-01-05')).toBe('5 January 2026');
    expect(formatLongDate('2026-12-31')).toBe('31 December 2026');
  });

  it('names all twelve months', () => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    months.forEach((name, index) => {
      const mm = String(index + 1).padStart(2, '0');
      expect(formatLongDate(`2026-${mm}-15`)).toBe(`15 ${name} 2026`);
    });
  });

  it('keeps the same calendar day as the ISO input (no timezone drift)', () => {
    // The parse is structural (string parts), never a Date round-trip, so
    // the local timezone can never shift the day.
    expect(formatLongDate('2026-02-28')).toBe('28 February 2026');
    expect(formatLongDate('2024-02-29')).toBe('29 February 2024');
  });

  it('throws on malformed input rather than guessing', () => {
    expect(() => formatLongDate('08/09/2026')).toThrow();
    expect(() => formatLongDate('2026-13-01')).toThrow();
    expect(() => formatLongDate('2026-00-10')).toThrow();
    expect(() => formatLongDate('2026-01-32')).toThrow();
    expect(() => formatLongDate('')).toThrow();
  });
});
