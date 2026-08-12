import { cx } from '@/lib/utils';

/**
 * DhParameterTable: the Denavit-Hartenberg parameters of the planar 3R arm
 * shown in the module's FK visualizer. Static, server-renderable, no client
 * state. The overflow-x-auto wrapper keeps the table inside its own scroll
 * container on narrow viewports (no page-level horizontal scroll).
 */

const ROWS = [
  { joint: '1 (base)', theta: 'θ1', d: '0', a: '1.00', alpha: '0' },
  { joint: '2 (elbow)', theta: 'θ2', d: '0', a: '0.75', alpha: '0' },
  { joint: '3 (wrist)', theta: 'θ3', d: '0', a: '0.55', alpha: '0' },
];

// The four DH parameters are mathematical notation, not prose labels: the
// header row's uppercase transform would render θi as ΘI and αi as ΑΙ
// (indistinguishable from the ai column's AI), and DH convention writes d and
// a lowercase. Exempt the math tokens; only the prose header uppercases.
const HEADER: { text: string; math?: boolean }[] = [
  { text: 'joint i' },
  { text: 'θi', math: true },
  { text: 'di', math: true },
  { text: 'ai', math: true },
  { text: 'αi', math: true },
];

export function DhParameterTable({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'overflow-x-auto rounded-md border border-border bg-surface',
        className,
      )}
    >
      <table className="w-full min-w-[420px] border-collapse text-left">
        <caption className="sr-only">
          Denavit-Hartenberg parameters of the planar three-joint arm. All
          twists and offsets are zero, so only the link lengths and joint
          angles remain.
        </caption>
        <thead>
          <tr className="border-b border-border">
            {HEADER.map((h) => (
              <th
                key={h.text}
                scope="col"
                className="px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-dim"
              >
                {h.math ? (
                  <span className="normal-case tracking-normal">{h.text}</span>
                ) : (
                  h.text
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.joint} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs font-medium text-text"
              >
                {row.joint}
              </th>
              <td className="px-4 py-2.5 align-top font-mono text-xs text-text">
                {row.theta}
              </td>
              <td className="px-4 py-2.5 align-top font-mono text-xs text-text">
                {row.d}
              </td>
              <td className="px-4 py-2.5 align-top font-mono text-xs text-text">
                {row.a}
              </td>
              <td className="px-4 py-2.5 align-top font-mono text-xs text-text">
                {row.alpha}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
