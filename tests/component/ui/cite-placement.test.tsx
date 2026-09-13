import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Cite } from '@/components/ui/cite';

const props = { citeId: 'example', label: 'Example 2026', title: 'A complete reference.',
  meta: 'The full author list remains readable.', href: 'https://example.org/source',
  referenceHref: '#ref-example' };
const box = (x: number, y: number, width: number, height: number) =>
  ({ x, y, left: x, top: y, right: x + width, bottom: y + height, width, height, toJSON() {} });
let anchor = box(100, 350, 60, 24);
let tipHeight = 120;
let headerHeight = 0;
let resizeCallback: ResizeObserverCallback;

beforeEach(() => {
  anchor = box(100, 350, 60, 24);
  tipHeight = 120;
  headerHeight = 0;
  vi.stubGlobal('innerWidth', 375);
  vi.stubGlobal('innerHeight', 812);
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
    observe() {}
    disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.tagName === 'HEADER') return box(0, 0, 375, headerHeight);
    if (this.getAttribute('role') === 'tooltip') return box(100, 0, 256, tipHeight);
    return anchor;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mount() {
  render(<><header style={{ position: 'sticky', top: 0 }} /><Cite {...props} /></>);
  const link = screen.getAllByRole('link')[0];
  const tip = screen.getByRole('tooltip');
  return { link, tip };
}
async function frame() {
  await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); });
}

describe('Cite placement lifecycle', () => {
  it('prefers above when the entire definition fits there', () => {
    const { link, tip } = mount();
    fireEvent.focus(link);
    expect(parseFloat(tip.style.top)).toBe(224);
  });

  it('uses below rather than occluding the actual sticky header', () => {
    headerHeight = 100;
    anchor = box(100, 150, 60, 24);
    const { link, tip } = mount();
    fireEvent.mouseEnter(link);
    expect(parseFloat(tip.style.top)).toBe(anchor.bottom + 6);
  });

  it('clamps horizontally at both viewport edges', () => {
    anchor = box(340, 350, 30, 24);
    const { link, tip } = mount();
    fireEvent.focus(link);
    expect(parseFloat(tip.style.left)).toBe(107);
  });

  it('keeps neither-side-fit content accessible in a keyboard-scrollable tooltip', () => {
    tipHeight = 900;
    const { link, tip } = mount();
    fireEvent.focus(link);
    expect(parseFloat(tip.style.maxHeight)).toBeGreaterThan(0);
    expect(parseFloat(tip.style.maxHeight)).toBeLessThan(812);
    expect(tip).toHaveAttribute('tabindex', '0');
    expect(tip).toHaveTextContent(props.meta);
    expect(tip.style.overflowY).toBe('auto');
  });

  it('repositions on normal scroll while focus remains after mouse leave', async () => {
    const { link, tip } = mount();
    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    fireEvent.mouseLeave(link);
    anchor = box(100, 20, 60, 24);
    fireEvent.scroll(window);
    await frame();
    expect(parseFloat(tip.style.top)).toBe(anchor.bottom + 6);
  });

  it('repositions on window resize without another reveal', async () => {
    const { link, tip } = mount();
    fireEvent.focus(link);
    vi.stubGlobal('innerWidth', 320);
    fireEvent.resize(window);
    await frame();
    expect(parseFloat(tip.style.left)).toBe(52);
  });

  it('remeasures a changed definition or sticky header through ResizeObserver', async () => {
    const { link, tip } = mount();
    fireEvent.focus(link);
    headerHeight = 300;
    act(() => resizeCallback([], {} as ResizeObserver));
    await frame();
    expect(parseFloat(tip.style.top)).toBe(anchor.bottom + 6);
  });

  it('does not remove positioning listeners when focus moves into an overflowing definition', async () => {
    tipHeight = 900;
    const { link, tip } = mount();
    fireEvent.focus(link);
    fireEvent.blur(link, { relatedTarget: tip });
    fireEvent.focus(tip, { relatedTarget: link });
    anchor = box(100, 20, 60, 24);
    fireEvent.scroll(window);
    await frame();
    expect(parseFloat(tip.style.top)).toBe(anchor.bottom + 6);
    expect(tip).toHaveTextContent(props.meta);
  });
  it('clamps a trigger near the left edge back into the viewport', () => {
    anchor = box(-10, 350, 60, 24);
    const { link, tip } = mount();
    fireEvent.focus(link);
    expect(parseFloat(tip.style.left)).toBe(12);
  });

  it('keeps placement active after blur while the pointer still hovers', async () => {
    const { link, tip } = mount();
    fireEvent.mouseEnter(link);
    fireEvent.focus(link);
    fireEvent.blur(link);
    anchor = box(100, 20, 60, 24);
    fireEvent.scroll(window);
    await frame();
    expect(parseFloat(tip.style.top)).toBe(anchor.bottom + 6);
  });

  it('ignores a hidden sticky header', () => {
    headerHeight = 300;
    const { link, tip } = mount();
    document.querySelector('header')!.style.visibility = 'hidden';
    fireEvent.focus(link);
    expect(parseFloat(tip.style.top)).toBe(224);
  });

  it('releases scroll and resize listeners when the term is no longer revealed', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { link } = mount();
    fireEvent.focus(link);
    fireEvent.blur(link);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });

});

describe('Cite dismissal and overflow access', () => {
  it('Escape dismisses without losing the source focus or reopening on scroll', async () => {
    const { link, tip } = mount();
    act(() => link.focus());
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(link).toHaveFocus();
    expect(tip.style.display).toBe('none');
    expect(tip.tabIndex).toBe(-1);
    fireEvent.scroll(window);
    await frame();
    expect(tip.style.display).toBe('none');
    fireEvent.blur(link);
    fireEvent.focus(link);
    expect(tip.style.display).not.toBe('none');
  });

  it('removes the overflow tab stop when no input keeps the tooltip open', () => {
    tipHeight = 900;
    const { link, tip } = mount();
    fireEvent.focus(link);
    expect(tip.tabIndex).toBe(0);
    fireEvent.blur(link);
    expect(tip.tabIndex).toBe(-1);
  });

  it('neutralizes legacy offsets only for measured placement', () => {
    const { link, tip } = mount();
    fireEvent.focus(link);
    expect(tip.style.position).toBe('fixed');
    expect(tip.style.translate).toBe('none');
    expect(tip.style.transform).toBe('none');
    expect(tip.style.margin).toBe('0px');
    expect(tip).toHaveTextContent(props.title);
    expect(tip).toHaveTextContent(props.meta);
  });

  it('responds to visual viewport offsets and removes those listeners', async () => {
    const viewport = Object.assign(new EventTarget(), { offsetLeft: 30, offsetTop: 40, width: 300, height: 500 });
    vi.stubGlobal('visualViewport', viewport);
    const remove = vi.spyOn(viewport, 'removeEventListener');
    const { link, tip } = mount();
    fireEvent.focus(link);
    expect(parseFloat(tip.style.left)).toBe(62);
    viewport.offsetTop = 300;
    viewport.dispatchEvent(new Event('resize'));
    await frame();
    expect(parseFloat(tip.style.top)).toBe(380);
    fireEvent.blur(link);
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
