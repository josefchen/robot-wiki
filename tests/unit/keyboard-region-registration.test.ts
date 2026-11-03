import { describe, expect, it } from 'vitest';
import { toHtml } from 'hast-util-to-html';
import { scrollRegionAttributes, scrollRegionHastProperties } from '../../lib/scroll-region.mjs';
import rehypeScrollRegions from '../../lib/rehype-scroll-regions.mjs';

describe('named keyboard-region registration', () => {
  it('registers the actual React tab stop while preserving its native region name', () => {
    expect(scrollRegionAttributes({ label: 'Results table' })).toEqual({
      role: 'region', tabIndex: 0, 'aria-label': 'Results table',
      'data-brand-control-id': 'control:keyboard-region',
    });
    expect(scrollRegionAttributes({ labelledBy: 'code-title' })).toEqual({
      role: 'region', tabIndex: 0, 'aria-labelledby': 'code-title',
      'data-brand-control-id': 'control:keyboard-region',
    });
  });

  it('serializes the same control ID through the actual hast property mapping', () => {
    // The JS plugin accepts the raw string spelling that hast serializes
    // into the same space-separated attribute as its typed array form.
    const html = toHtml({ type: 'element', tagName: 'pre',
      properties: scrollRegionHastProperties({ labelledBy: 'listing-title' }), children: [] } as Parameters<typeof toHtml>[0]);
    const root = document.createElement('div');
    root.innerHTML = html;
    const pre = root.querySelector('pre')!;
    expect(pre.getAttribute('data-brand-control-id')).toBe('control:keyboard-region');
    expect(pre.getAttribute('aria-labelledby')).toBe('listing-title');
    expect(pre.tabIndex).toBe(0);
  });

  it('puts markers on the equation and code owners, preserving their names and no action semantics', () => {
    const tree = { type: 'root', children: [
      { type: 'element', tagName: 'span', properties: { className: ['katex-display'] }, children: [] },
      { type: 'element', tagName: 'pre', properties: { 'data-language': 'python' }, children: [] },
    ] };
    rehypeScrollRegions()(tree);
    const root = document.createElement('div');
    root.innerHTML = toHtml(tree as Parameters<typeof toHtml>[0]);
    const regions = [...root.querySelectorAll('[data-brand-control-id="control:keyboard-region"]')];
    expect(regions.map((region) => region.tagName)).toEqual(['SPAN', 'PRE']);
    expect(regions.map((region) => region.getAttribute('aria-label'))).toEqual(['Display equation 1', 'python code sample 1']);
    expect(regions.every((region) => region.getAttribute('role') === 'region' && region.getAttribute('tabindex') === '0')).toBe(true);
    expect(regions.every((region) => !region.hasAttribute('aria-pressed') && !region.hasAttribute('href'))).toBe(true);
  });
});
