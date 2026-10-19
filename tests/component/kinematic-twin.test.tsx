import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KinematicTwin } from '@/components/interactive/kinematic-twin';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { REACH_POSE, RUN_SECONDS, STILL_POSE, readoutFor, valueTextFor } from '@/lib/kinematic-twin';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const still = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
const readout = () => screen.getByTestId('twin-stage-frame').querySelector('[data-readout]');
const pair = (pose: { shoulder: number; elbow: number }) => `${pose.shoulder},${pose.elbow}`;

describe('KinematicTwin', () => {
  it('draws the still pose: two arms of different sizes in one pose, both dials reading the same', () => {
    render(<KinematicTwin />);
    expect(screen.getByText('The robot copies the leader arm joint for joint')).toBeInTheDocument();
    const drawing = screen.getByTestId('twin-drawing');
    expect(drawing).toHaveAttribute('data-leader', pair(STILL_POSE));
    expect(drawing).toHaveAttribute('data-robot', pair(STILL_POSE));
    expect(readout()).toHaveTextContent('Shoulder 28 degrees · elbow 100 degrees');
    expect(screen.getByTestId('twin-stage-frame')).toHaveTextContent(/Schematic: the copy is exact/);
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject, tspan')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    // The one lit part is the leader's handle, in the leader's group.
    const lit = [...svg.querySelectorAll('[data-lit], [data-tone="lit"]')];
    expect(lit).toHaveLength(1);
    expect(lit[0]!.closest('[data-part]')).toHaveAttribute('data-part', 'leader');
    expect(svg.getAttribute('aria-label')).toMatch(/shoulder reads 28 degrees and its elbow 100 degrees, and the robot's dials read the same/);
  });

  it('describes the drawing with the method paragraph that explains the bench', () => {
    render(<KinematicTwin />);
    const svg = screen.getByTestId('twin-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The drawing is a leader and its robot on one bench\./,
    );
  });

  it('sets the leader’s joints from the sliders, in words, and the robot copies them at once under reduced motion', () => {
    still();
    render(<KinematicTwin />);
    const shoulder = screen.getByRole('slider', { name: "Leader's shoulder" });
    const elbow = screen.getByRole('slider', { name: "Leader's elbow" });
    expect(shoulder).toHaveValue('28');
    expect(elbow).toHaveValue('100');
    fireEvent.change(shoulder, { target: { value: '40' } });
    fireEvent.change(elbow, { target: { value: '75' } });
    const drawing = screen.getByTestId('twin-drawing');
    expect(drawing).toHaveAttribute('data-leader', '40,75');
    expect(drawing).toHaveAttribute('data-robot', '40,75');
    expect(readout()).toHaveTextContent(readoutFor({ shoulder: 40, elbow: 75 }));
    expect(elbow).toHaveAttribute('aria-valuetext', valueTextFor({ shoulder: 40, elbow: 75 }));
    expect(elbow).toHaveAttribute('aria-valuetext', "Leader's shoulder 40 degrees and elbow 75 degrees; the robot is sent 40 and 75");
    expect(screen.getByTestId('twin-shoulder')).toHaveTextContent('40 degrees');
    // The sliders stop where the joints stop.
    fireEvent.change(elbow, { target: { value: '170' } });
    expect(drawing).toHaveAttribute('data-leader', '40,140');
  });

  it('eases the leader to a new setting and the robot follows it a moment later, to the same angles', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<KinematicTwin />);
    fireEvent.change(screen.getByRole('slider', { name: "Leader's shoulder" }), { target: { value: '42' } });
    const drawing = screen.getByTestId('twin-drawing');
    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    const leader = Number(drawing.getAttribute('data-leader')!.split(',')[0]);
    const robot = Number(drawing.getAttribute('data-robot')!.split(',')[0]);
    expect(leader).toBeGreaterThan(28);
    expect(leader).toBeLessThan(42);
    expect(robot).toBeGreaterThan(28);
    expect(robot).toBeLessThan(leader);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(drawing).toHaveAttribute('data-leader', '42,100');
    expect(drawing).toHaveAttribute('data-robot', '42,100');
  });

  it('moves the leader only when asked, with no pressed state, and ends reaching out; reduced motion jumps there', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { unmount } = render(<KinematicTwin />);
    const run = screen.getByTestId('twin-run');
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(run).not.toHaveAttribute('disabled');
    expect(run).toHaveTextContent('Move the leader');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the leader');
    expect(run).not.toHaveAttribute('aria-pressed');
    const drawing = screen.getByTestId('twin-drawing');
    await act(async () => {
      vi.advanceTimersByTime(RUN_SECONDS * 400);
    });
    expect(drawing.getAttribute('data-leader')).not.toBe(pair(STILL_POSE));
    await act(async () => {
      vi.advanceTimersByTime(RUN_SECONDS * 1000 + 3000);
    });
    expect(drawing).toHaveAttribute('data-leader', pair(REACH_POSE));
    expect(drawing).toHaveAttribute('data-robot', pair(REACH_POSE));
    expect(run).toHaveTextContent('Move the leader');
    expect(readout()).toHaveTextContent(readoutFor(REACH_POSE));
    unmount();
    vi.useRealTimers();
    still();
    render(<KinematicTwin />);
    fireEvent.click(screen.getByTestId('twin-run'));
    expect(screen.getByTestId('twin-drawing')).toHaveAttribute('data-leader', pair(REACH_POSE));
    expect(screen.getByTestId('twin-drawing')).toHaveAttribute('data-robot', pair(REACH_POSE));
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<KinematicTwin />);
    expect(html).toContain('data-figure-frame="kinematic-twin"');
    expect(html).toContain('Shoulder 28 degrees · elbow 100 degrees');
  });
});

describe('KinematicTwin served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<KinematicTwin />)}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/data-hardware/teleop-rigs/');
    expect(figures).toEqual(['kinematic-twin']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
