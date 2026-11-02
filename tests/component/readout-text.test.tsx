import { act, render, screen } from '@testing-library/react';
import { createRef, useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { LiveReadoutText } from '@/components/iso/readout-text';

describe('readout DOM ownership', () => {
  it('restores exact numeral markup synchronously when React updates a plain readout', () => {
    const stage = (readout: string) => <AnatomyStage viewWidth={100} readout={readout}><svg /></AnatomyStage>;
    const { container, rerender } = render(stage('20 minutes · still'));
    const before = container.innerHTML;
    rerender(stage('20 minutes · tracing, 40% of the path'));
    expect([...container.querySelectorAll('[data-readout-number]')].map((number) => number.textContent)).toEqual(['20', '40']);
    rerender(stage('20 minutes · still'));
    // No await: the commit itself must restore the deterministic baseline.
    expect(container.innerHTML).toBe(before);
  });

  it('keeps plain → rich → updated rich → plain updates safe across real observer delivery', async () => {
    // act and flushSync flush passive effects before observer delivery, hiding
    // the plain-to-rich race. Exercise subsequent renders on the normal root
    // scheduler with the real MutationObserver and no fake timers.
    const testGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const originalActEnvironment = testGlobal.IS_REACT_ACT_ENVIRONMENT;
    testGlobal.IS_REACT_ACT_ENVIRONMENT = false;
    const container = document.createElement('div');
    document.body.append(container);
    const errors: unknown[] = [];
    const root = createRoot(container, { onUncaughtError: (error) => errors.push(error) });
    const stage = (value: ReactNode) => <AnatomyStage viewWidth={100} readout={value}><svg /></AnatomyStage>;
    try {
      flushSync(() => root.render(stage('Plain 12')));
      expect(container.querySelector('[data-readout-number]')).toHaveTextContent('12');

      root.render(stage(<a href="#reference">Rich 13</a>));
      await vi.waitFor(() => expect(container.querySelector('[data-readout] a')).toHaveTextContent('Rich 13'));
      const link = container.querySelector('[data-readout] a');
      expect(link).toHaveAttribute('href', '#reference');
      expect(link?.querySelector('[data-numeral-run]')).toHaveTextContent('13');

      root.render(stage(<a href="#reference">Rich 14</a>));
      await vi.waitFor(() => expect(link).toHaveTextContent('Rich 14'));
      expect(container.querySelector('[data-readout] a')).toBe(link);

      root.render(stage('Plain 15'));
      await vi.waitFor(() => expect(container.querySelector('[data-readout-number]')).toHaveTextContent('15'));
      expect(container.querySelector('[data-readout]')).toHaveTextContent('Plain 15');
      expect(container.querySelector('[data-readout] a')).toBeNull();
      expect(errors).toEqual([]);
    } finally {
      flushSync(() => root.unmount());
      container.remove();
      testGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
    }
  });

  it('updates imperative phases and rich siblings without replacing their owners', async () => {
    const phase = createRef<HTMLSpanElement>();
    const custom = createRef<HTMLButtonElement>();
    function Custom({ value }: { value: number }) {
      return <button ref={custom}>Custom {value}</button>;
    }
    function MixedReadout({ value }: { value: number }) {
      const local = useRef<HTMLSpanElement>(null);
      return <AnatomyStage viewWidth={100} readout={<>
        <LiveReadoutText ref={phase} data-phase="">Waiting 2</LiveReadoutText>
        {' · '}<span ref={local} data-static="">distance {value} cm</span>
        {' · '}<a href="#source">source {value}</a>
        {' · '}<Custom value={value} />
      </>}><svg /></AnatomyStage>;
    }
    const { container, rerender, unmount } = render(<MixedReadout value={12} />);
    const phaseNode = phase.current!;
    const staticNode = container.querySelector('[data-static]');
    const customNode = custom.current;
    expect(phaseNode.querySelector('[data-readout-number]')).toHaveTextContent('2');
    expect(staticNode?.querySelector('[data-numeral-run]')).toHaveTextContent('12');
    expect(customNode?.querySelector('[data-numeral-run]')).toBeNull();

    await act(async () => {
      phaseNode.textContent = 'Writing move 3 of 16 · ';
      await Promise.resolve();
    });
    expect([...phaseNode.querySelectorAll('[data-readout-number]')].map((node) => node.textContent)).toEqual(['3', '16']);
    rerender(<MixedReadout value={14} />);
    expect(phase.current).toBe(phaseNode);
    expect(phaseNode).toHaveTextContent('Writing move 3 of 16');
    expect(container.querySelector('[data-static]')).toBe(staticNode);
    expect(staticNode).toHaveTextContent('distance 14 cm');
    expect(staticNode?.querySelector('[data-numeral-run]')).toHaveTextContent('14');
    expect(screen.getByRole('link', { name: 'source 14' })).toHaveAttribute('href', '#source');
    expect(custom.current).toBe(customNode);
    expect(customNode).toHaveTextContent('Custom 14');
    expect(customNode?.querySelector('[data-numeral-run]')).toBeNull();

    unmount();
    phaseNode.textContent = 'Detached 19';
    await Promise.resolve();
    expect(phaseNode.querySelector('[data-readout-number]')).toBeNull();
  });
});
