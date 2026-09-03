import { WM_PARADIGMS } from '@/lib/world-model-taxonomy';
import { cx } from '@/lib/utils';

/**
 * WmTaxonomyTable: the six-paradigm disambiguation table for the
 * world-models/taxonomy module. Static, server-renderable, no client
 * state. Row data lives in lib/world-model-taxonomy.ts next to the
 * disambiguator's model so prose, table, and interactive share one
 * source.
 */
const COLUMNS = [
  'What it predicts',
  'In what space',
  'Trained on',
  'Primary use',
  'Representative systems',
] as const;

export function WmTaxonomyTable({ className }: { className?: string }) {
  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region on narrow
      // viewports and needs keyboard access (axe scrollable-region-focusable),
      // matching the surgical/swarm/orbital table convention.
      tabIndex={0}
      role="region"
      aria-label="World model paradigms compared"
      data-brand-surface-id="surface:flat"
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[880px] border-collapse text-left">
        <caption className="px-4 pt-3 text-left font-mono text-[11px] text-text-dim">
          Six paradigms, one overloaded name
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
            >
              Paradigm
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col}
                scope="col"
                className="px-4 py-2.5 font-mono text-[11px] font-medium text-text-dim"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WM_PARADIGMS.map((p) => (
            <tr
              key={p.id}
              data-testid={`wm-row-${p.id}`}
              className="border-b border-border last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-normal px-4 py-3 align-top font-mono text-xs font-medium text-text"
              >
                {p.name}
              </th>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {p.predicts}
              </td>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {p.space}
              </td>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {p.trainedOn}
              </td>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {p.primaryUse}
              </td>
              <td className="px-4 py-3 align-top font-sans text-sm leading-relaxed text-text">
                {p.systems}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
