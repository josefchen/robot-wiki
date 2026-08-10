/**
 * Date formatting for the wiki's scholarly surfaces. The article header
 * shows each module's `lastReviewed` frontmatter value (architecture.md
 * section 6b), and the format must be unambiguous: a spelled-out month in
 * day-month-year order, never a numeric-only form that a reader could
 * misread as month/day.
 */

const MONTH_NAMES = [
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
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Render an ISO `YYYY-MM-DD` date as unambiguous prose, e.g.
 * `2026-08-09` -> `9 August 2026`. The parts are parsed structurally from
 * the string, never through a `Date` round-trip, so the local timezone can
 * never shift the calendar day. Throws on anything that is not a valid ISO
 * date: published frontmatter is schema-gated (isoDateSchema), so a throw
 * here means the content pipeline let something through, and failing the
 * build is the honest response.
 */
export function formatLongDate(iso: string): string {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    throw new Error(`expected an ISO YYYY-MM-DD date, got "${iso}"`);
  }
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const dayNumber = Number(day);
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`month out of range in "${iso}"`);
  }
  if (dayNumber < 1 || dayNumber > 31) {
    throw new Error(`day out of range in "${iso}"`);
  }
  return `${dayNumber} ${MONTH_NAMES[monthIndex]} ${year}`;
}
