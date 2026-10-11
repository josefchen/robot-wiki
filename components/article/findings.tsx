import type { ReactNode } from 'react';

/**
 * Numbered findings, the research-page list for a section's main results:
 * "01", "02" in Geist Mono at left, a one-line claim in weight 600, a short
 * paragraph, and a hairline between items. Authors write
 *
 *   <Findings>
 *     <Finding claim="Measure the delay before training.">
 *       A policy trained on misaligned frames learns the lag into its actions.
 *     </Finding>
 *   </Findings>
 *
 * The list is an <ol>, so assistive technology reads the order; the
 * two-digit numerals are a CSS counter (app/globals.css, `.findings`).
 */
export function Findings({ children }: { children: ReactNode }) {
  return <ol className="findings">{children}</ol>;
}

export function Finding({ claim, children }: { claim: ReactNode; children?: ReactNode }) {
  return (
    <li>
      <span aria-hidden="true" className="finding-index" />
      <div className="finding-body">
        <strong className="finding-claim">{claim}</strong>
        {children}
      </div>
    </li>
  );
}
