import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hiddenByClosedDisclosure } from '@/lib/brand-v2-primitive-discovery';

/**
 * The closed-disclosure exclusion for the primitive population
 * (VAL-B2-SURF-010 / VAL-B2-COMP-013 / VAL-B2-COMP-014).
 *
 * The defect this pins: Chromium gives content inside a closed
 * `<details>` `content-visibility` rather than `display: none`, so the
 * discovery's naive visibility box test counted the commit-to-reveal second
 * mounts (a full interactive figure per article) as rendered controls whose
 * stale geometry overlapped headings thousands of pixels away, failing
 * SC 2.5.8 for targets no reader can point at.
 */
function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe('hiddenByClosedDisclosure', () => {
  it('keeps the module copy and the in-page copy identical', () => {
    // page.evaluate serializes discoverBrandPrimitives alone, so its nested
    // predicate is a verbatim copy of the exported one. The markers make any
    // divergence a test failure instead of a silent measurement change.
    const source = readFileSync(
      join(process.cwd(), 'lib', 'brand-v2-primitive-discovery.ts'),
      'utf8',
    );
    const bodies = [
      ...source.matchAll(/\/\* disclosure-predicate-begin \*\/([\s\S]*?)\/\* disclosure-predicate-end \*\//g),
    ].map((match) =>
      match[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n'),
    );
    expect(bodies.length, 'exactly two marked predicate copies').toBe(2);
    expect(bodies[0]).toBe(bodies[1]);
  });

  it('hides content inside a closed details and keeps the disclosure summary', () => {
    const host = mount(`
      <details>
        <summary data-brand-control-id="control:secondary-action">chart data</summary>
        <p><input type="range" data-brand-control-id="control:input" /></p>
      </details>
    `);
    try {
      const summary = host.querySelector('summary')!;
      const slider = host.querySelector('input')!;
      expect(hiddenByClosedDisclosure(summary)).toBe(false);
      expect(hiddenByClosedDisclosure(slider)).toBe(true);
    } finally {
      host.remove();
    }
  });

  it('treats an open details as rendered', () => {
    const host = mount(`
      <details open>
        <summary>revealed</summary>
        <p><input type="range" /></p>
      </details>
    `);
    try {
      expect(hiddenByClosedDisclosure(host.querySelector('input')!)).toBe(false);
    } finally {
      host.remove();
    }
  });

  it('hides a nested disclosure summary behind an outer closed details', () => {
    // The bc-foundations rollout figure: the inner chart-data summary is the
    // own summary of a closed inner details, but the whole figure sits in an
    // outer closed disclosure, so nothing of it renders.
    const host = mount(`
      <details class="outer">
        <summary>outer summary</summary>
        <div>
          <details class="inner">
            <summary id="inner-summary">inner summary</summary>
            <input type="range" />
          </details>
        </div>
      </details>
    `);
    try {
      const outerSummary = host.querySelector('summary:not(#inner-summary)')!;
      const innerSummary = host.querySelector('#inner-summary')!;
      const slider = host.querySelector('input')!;
      expect(hiddenByClosedDisclosure(outerSummary)).toBe(false);
      expect(hiddenByClosedDisclosure(innerSummary)).toBe(true);
      expect(hiddenByClosedDisclosure(slider)).toBe(true);
    } finally {
      host.remove();
    }
  });

  it('keeps an inner summary when only the inner details is closed and the outer is open', () => {
    const host = mount(`
      <details open>
        <summary>outer</summary>
        <details>
          <summary id="inner">inner</summary>
          <input type="range" />
        </details>
      </details>
    `);
    try {
      expect(hiddenByClosedDisclosure(host.querySelector('#inner')!)).toBe(false);
      expect(hiddenByClosedDisclosure(host.querySelector('input')!)).toBe(true);
    } finally {
      host.remove();
    }
  });

  it('leaves ordinary content outside any disclosure alone', () => {
    const host = mount(`<p><a href="#x">link</a></p>`);
    try {
      expect(hiddenByClosedDisclosure(host.querySelector('a')!)).toBe(false);
    } finally {
      host.remove();
    }
  });
});
