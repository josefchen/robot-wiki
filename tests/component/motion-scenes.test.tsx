import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KalmanPredictUpdate, KALMAN_SCENE, KALMAN_STEP_DETAIL, covarianceEllipse, kalmanFrameAt } from '@/components/motion/scenes/kalman-predict-update';
import {
  DiffusionDenoising,
  DIFFUSION_SCENE,
} from '@/components/motion/scenes/diffusion-denoising';
import { ScenePlayer } from '@/components/motion/scene-player';
import {
  DENOISING_STEPS,
  SAMPLE_COUNT,
  generateDenoisingTrajectory,
  meanDistanceToMode,
  samplesAtStep,
} from '@/lib/denoising';

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function mountPlayer(scene = KALMAN_SCENE) {
  return render(
    <ScenePlayer scene={scene} textAlternative="test alternative">
      <svg viewBox="0 0 340 240" />
    </ScenePlayer>,
  );
}

/** The keydown-handling wrapper inside the mounted player. */
function sceneShell() {
  const frame = screen.getByRole('group', { name: /^motion scene:/i });
  const shell = frame.querySelector('div');
  expect(shell).not.toBeNull();
  return shell as HTMLElement;
}

describe('motion scene mount', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('prerenders the poster as the final beat still, with Play the only visible control', () => {
    render(<KalmanPredictUpdate />);
    const poster = screen.getByTestId('motion-poster');
    expect(poster).toHaveAccessibleName(/play the motion scene: kalman filter/i);
    // The poster frame carries the full chrome statically: the stage svg
    // at the final frame and the recap caption, with no scrubber. Play is
    // the one control in the header; the step and reset controls wait in
    // the closed "Adjust more" fold, and none of them is disabled.
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/written out/i);
    expect(screen.queryByTestId('motion-scrubber')).not.toBeInTheDocument();
    expect((poster as HTMLButtonElement).disabled).toBe(false);
    const fold = document.querySelector('[data-figure-fold="adjust"]') as HTMLDetailsElement;
    expect(fold.open).toBe(false);
    expect(fold.querySelector('summary')).toHaveTextContent('Adjust more');
    expect(fold).not.toContainElement(poster);
    for (const name of [/step back one beat/i, /step forward one beat/i, /reset the scene/i]) {
      expect(fold).toContainElement(screen.getByRole('button', { name }));
    }
    const disabled = screen
      .getAllByRole('button')
      .filter((button) => (button as HTMLButtonElement).disabled);
    expect(disabled.length).toBe(0);
    // The poster belief ellipse is exactly the posterior's.
    const posterFrame = kalmanFrameAt(8000);
    expect(covarianceEllipse(posterFrame.belief.cov).rx).toBeCloseTo(
      covarianceEllipse(KALMAN_STEP_DETAIL.posterior.cov).rx,
      6,
    );
  });

  it('links the complete alternative in SSR and remains unique across poster mounts', () => {
    const html = renderToString(<><KalmanPredictUpdate /><KalmanPredictUpdate /><DiffusionDenoising /></>);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const groups = [...doc.querySelectorAll<HTMLElement>('[data-motion-scene]')];
    expect(groups).toHaveLength(3);
    const ids = groups.map((group) => group.getAttribute('aria-describedby'));
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(groups.length);
    for (const [index, group] of groups.entries()) {
      const alternative = doc.getElementById(ids[index]!);
      expect(alternative?.getAttribute('class')).toContain('sr-only');
      const beats = index === 2 ? DIFFUSION_SCENE.beats : KALMAN_SCENE.beats;
      for (const beat of beats) expect(alternative?.textContent).toContain(beat.caption);
      expect(group.querySelector('[data-motion-stage] svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(group.querySelector('[data-testid="motion-caption"]')?.textContent).toContain(beats.at(-1)!.caption);
    }
    expect(doc.querySelectorAll('[data-testid="motion-scrubber"]')).toHaveLength(0);
  });

  it('exposes full reference equations before and after activation', async () => {
    render(<><KalmanPredictUpdate /><DiffusionDenoising /></>);
    const groups = screen.getAllByRole('group', { name: /^motion scene:/i });
    const descriptions = () => screen.getAllByRole('group', { name: /^motion scene:/i }).map((group) =>
      document.getElementById(group.getAttribute('aria-describedby')!)?.textContent ?? '');
    const assertRelations = () => {
      expect(descriptions()[0]).toMatch(/posterior.*predicted.*gain K.*reading z.*predicted/i);
      expect(descriptions()[1]).toMatch(/action.*distribution.*conditioned on.*observed state/i);
    };
    assertRelations();
    fireEvent.click(groups[0].querySelector('[data-testid="motion-poster"]')!);
    fireEvent.click(groups[1].querySelector('[data-testid="motion-poster"]')!);
    await waitFor(() => expect(screen.getAllByTestId('motion-scrubber')).toHaveLength(2));
    assertRelations();
    for (const group of screen.getAllByRole('group', { name: /^motion scene:/i })) {
      expect(group.querySelector('[data-motion-stage] svg')).toHaveAttribute('aria-hidden', 'true');
      expect(group.querySelector('[data-scene-equation] .katex')).not.toBeNull();
    }
  });

  it('the poster click mounts the player with the full control set', async () => {
    render(<KalmanPredictUpdate />);
    fireEvent.click(
      screen.getByRole('button', { name: /play the motion scene: kalman filter/i }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('motion-scrubber')).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: /pause the scene|play the scene/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /step back one beat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /step forward one beat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reset the scene to its poster still/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /scene timeline/i })).toBeInTheDocument();
  });

  it('a step from the poster fold opens the player paused one beat away', async () => {
    render(<KalmanPredictUpdate />);
    fireEvent.click(screen.getByRole('button', { name: /step back one beat/i }));
    await waitFor(() =>
      expect(screen.getByTestId('motion-scrubber')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /play the scene/i })).toBeInTheDocument();
    expect(screen.getByTestId('motion-beat-count')).toHaveTextContent('beat 4 / 5');
    const fold = document.querySelector('[data-figure-fold="adjust"]') as HTMLDetailsElement;
    expect(fold.open).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /step back one beat/i }),
    );
  });

  it('keeps the diffusion scene code-split behind the same poster pattern', () => {
    render(<DiffusionDenoising />);
    expect(screen.getByTestId('motion-poster')).toHaveAccessibleName(
      /play the motion scene: diffusion policy/i,
    );
    expect(screen.queryByTestId('motion-scrubber')).not.toBeInTheDocument();
  });

  it('under reduced motion, activation stays paused on the poster still', async () => {
    mockReducedMotion(true);
    render(<KalmanPredictUpdate />);
    fireEvent.click(
      screen.getByRole('button', { name: /play the motion scene: kalman filter/i }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('motion-scrubber')).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: /play the scene/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/written out/i);
  });
});

describe('motion scene player', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens on the poster still, captioned by the recap beat', () => {
    mountPlayer();
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/written out/i);
    expect(screen.getByTestId('motion-beat-count')).toHaveTextContent('beat 5 / 5');
    expect(
      screen.getByRole('button', { name: /play the scene/i }),
    ).toBeInTheDocument();
  });

  it('plays from the top on activation and the caption walks the beats', () => {
    vi.useFakeTimers();
    render(
      <ScenePlayer scene={KALMAN_SCENE} autoPlayOnMount textAlternative="alt">
        <svg viewBox="0 0 340 240" />
      </ScenePlayer>,
    );
    act(() => {});
    expect(
      screen.getByRole('button', { name: /pause the scene/i }),
    ).toBeInTheDocument();
    const caption = screen.getByTestId('motion-caption');
    expect(caption).toHaveTextContent(/prior belief/i);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(caption).toHaveTextContent(/predict/i);
    expect(screen.getByTestId('motion-beat-count')).toHaveTextContent('beat 2 / 5');
  });

  it('a finished run ends on the poster frame with a hint, which a step clears', () => {
    vi.useFakeTimers();
    render(
      <ScenePlayer scene={KALMAN_SCENE} autoPlayOnMount textAlternative="alt">
        <svg viewBox="0 0 340 240" />
      </ScenePlayer>,
    );
    act(() => {});
    expect(document.querySelector('[data-scene-hint]')).toBeNull();
    for (let i = 0; i < 120; i += 1) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(screen.getByRole('button', { name: /play the scene/i })).toBeInTheDocument();
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/written out/i);
    expect(document.querySelector('[data-scene-hint]')).toHaveTextContent(
      'Drag the timeline to look again',
    );
    fireEvent.click(screen.getByRole('button', { name: /step back one beat/i }));
    expect(document.querySelector('[data-scene-hint]')).toBeNull();
  });

  it('keyboard: K toggles, arrows step one beat, Home and End land on the ends', () => {
    mountPlayer();
    const shell = sceneShell();
    const caption = screen.getByTestId('motion-caption');
    // K plays from the poster.
    fireEvent.keyDown(shell, { key: 'k' });
    expect(
      screen.getByRole('button', { name: /pause the scene/i }),
    ).toBeInTheDocument();
    fireEvent.keyDown(shell, { key: 'k' });
    expect(
      screen.getByRole('button', { name: /play the scene/i }),
    ).toBeInTheDocument();
    // Home, then step forward through the beats.
    fireEvent.keyDown(shell, { key: 'Home' });
    expect(caption).toHaveTextContent(/prior belief/i);
    fireEvent.keyDown(shell, { key: 'ArrowRight' });
    expect(caption).toHaveTextContent(/prior belief/i);
    fireEvent.keyDown(shell, { key: 'ArrowRight' });
    expect(caption).toHaveTextContent(/predict/i);
    expect(screen.getByTestId('motion-beat-count')).toHaveTextContent('beat 2 / 5');
    fireEvent.keyDown(shell, { key: 'ArrowRight' });
    expect(caption).toHaveTextContent(/measurement arrives/i);
    fireEvent.keyDown(shell, { key: 'ArrowLeft' });
    expect(caption).toHaveTextContent(/predict/i);
    fireEvent.keyDown(shell, { key: 'End' });
    expect(caption).toHaveTextContent(/written out/i);
    // Space toggles when focus is off the buttons.
    fireEvent.keyDown(shell, { key: ' ' });
    expect(
      screen.getByRole('button', { name: /pause the scene/i }),
    ).toBeInTheDocument();
  });

  it('scrubber is a labelled slider whose aria-valuetext is the caption', () => {
    mountPlayer();
    const scrubber = screen.getByTestId('motion-scrubber');
    expect(scrubber).toHaveAttribute('aria-label', 'Scene timeline');
    const caption = screen.getByTestId('motion-caption');
    fireEvent.change(scrubber, { target: { value: '5000' } });
    expect(caption).toHaveTextContent(/update/i);
    expect(scrubber.getAttribute('aria-valuetext')).toBe(caption.textContent);
    fireEvent.change(scrubber, { target: { value: '2500' } });
    expect(caption).toHaveTextContent(/predict/i);
  });

  it('step buttons walk the diffusion beats and clamp at the ends', () => {
    mountPlayer(DIFFUSION_SCENE);
    const forward = screen.getByRole('button', { name: /step forward one beat/i });
    const back = screen.getByRole('button', { name: /step back one beat/i });
    const caption = screen.getByTestId('motion-caption');
    expect(caption).toHaveTextContent(/recap/i);
    fireEvent.click(back);
    expect(caption).toHaveTextContent(/ten denoising steps/i);
    fireEvent.click(back);
    expect(caption).toHaveTextContent(/noising/i);
    fireEvent.click(back);
    expect(caption).toHaveTextContent(/demonstrations/i);
    fireEvent.click(back);
    expect(caption).toHaveTextContent(/demonstrations/i);
    fireEvent.click(forward);
    fireEvent.click(forward);
    fireEvent.click(forward);
    fireEvent.click(forward);
    expect(caption).toHaveTextContent(/recap/i);
    expect(screen.getByTestId('motion-beat-count')).toHaveTextContent('beat 4 / 4');
  });

  it('announces the caption politely and carries the text alternative', () => {
    render(
      <ScenePlayer scene={DIFFUSION_SCENE} textAlternative="the full alternative">
        <svg viewBox="0 0 340 240" />
      </ScenePlayer>,
    );
    const caption = screen.getByTestId('motion-caption');
    expect(caption).toHaveAttribute('aria-live', 'polite');
    const frame = screen.getByRole('group', {
      name: /motion scene: diffusion policy/i,
    });
    const alternative = document.getElementById(
      frame.getAttribute('aria-describedby') ?? '',
    );
    expect(alternative).not.toBeNull();
    expect(alternative).toHaveClass('sr-only');
    expect(alternative?.textContent).toContain('the full alternative');
  });

  it('reset returns to the poster still and stops', () => {
    mountPlayer();
    fireEvent.change(screen.getByTestId('motion-scrubber'), {
      target: { value: '1500' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /reset the scene to its poster still/i }),
    );
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/written out/i);
    expect(
      screen.getByRole('button', { name: /play the scene/i }),
    ).toBeInTheDocument();
  });

  it('under reduced motion, playback holds beat end-states and the scrubber works', () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    render(
      <ScenePlayer scene={KALMAN_SCENE} autoPlayOnMount textAlternative="alt">
        <svg viewBox="0 0 340 240" />
      </ScenePlayer>,
    );
    act(() => {});
    // The click that activated the scene was the play consent; under
    // reduced motion the clock advances in held beat end-states from the
    // top, never tweened.
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/prior belief/i);
    act(() => {
      vi.advanceTimersByTime(850);
    });
    // The first held end-state completes beat 1; the second beat 2.
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/prior belief/i);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/predict/i);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/measurement arrives/i);
    // The scrubber still works under reduced motion.
    fireEvent.click(screen.getByRole('button', { name: /pause the scene/i }));
    fireEvent.change(screen.getByTestId('motion-scrubber'), {
      target: { value: '1000' },
    });
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(/prior belief/i);
  });

  it('is deterministic: the frame functions are pure and keep the models\' numbers', () => {
    for (const t of [0, 400, 1000, 3300, 7999, 8000]) {
      expect(kalmanFrameAt(t)).toEqual(kalmanFrameAt(t));
    }
    // The demonstrated step keeps the filter's own numbers.
    expect(KALMAN_STEP_DETAIL.gain.toFixed(2)).toBe('0.62');
    expect(KALMAN_STEP_DETAIL.measurement).not.toBeNull();
    // Diffusion samples: the end state is the model's target set.
    const trajectory = generateDenoisingTrajectory();
    expect(trajectory.targets).toHaveLength(SAMPLE_COUNT);
    const dispersion = meanDistanceToMode(samplesAtStep(trajectory, DENOISING_STEPS));
    expect(dispersion).toBeLessThan(
      meanDistanceToMode(samplesAtStep(trajectory, 0)) / 2,
    );
  });
});
