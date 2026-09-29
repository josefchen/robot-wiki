'use client';

/**
 * ScenePlayer: the shared playback shell for every motion scene.
 *
 * Contract (docs/design/motion-language.md):
 * - Click-to-play, never autoplay. The poster is the prerendered final
 *   frame of the last beat; play is a click.
 * - Play/pause, step back and step forward one beat, a native range
 *   scrubber whose aria-valuetext is the current beat's caption, reset.
 * - Keys: Space or K play/pause, arrows step a beat, Home and End.
 * - The caption sits visibly under the stage and is announced politely
 *   once per beat; the captions together are the text alternative.
 * - Reduced motion jumps between beat end-states; the scrubber still works.
 * - Pauses when offscreen or when the tab is hidden.
 * - The rAF loop runs only while playing; nothing updates React state per
 *   frame (the beat index changes only at beat boundaries).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type ReactNode,
} from 'react';
import { useMotionValue } from 'motion/react';
import { Pause, Play } from '@phosphor-icons/react';
import {
  InstrumentFrame,
  InstrumentHeader,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  INSTRUMENT_PRIMARY_CONTROL_CLASS,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
} from '@/components/ui/instrument';
import { Surface } from '@/components/ui/surface';
import { SceneTimeProvider, StaticTimeProvider } from './scene-context';
import {
  beatSpans,
  locate,
  posterTime,
  stepTarget,
  totalDuration,
  type SceneDefinition,
} from './timeline';
import { MOTION_TIMING } from '@/lib/motion-tokens';
import { usePrefersReducedMotion } from './use-reduced-motion';

export interface ScenePlaybackState {
  beatIndex: number;
  beatCount: number;
  playing: boolean;
  /** Zero-padded beat ordinal for the readout row. */
  beatLabel: string;
}

export interface ScenePlayerProps {
  scene: SceneDefinition;
  /** The stage: one <svg> element owned by the scene. */
  children: ReactNode;
  /** Legend band entries (InstrumentLegend items). */
  legend?: ReactNode;
  /** Scene-specific numbers in the readout row. */
  readout?: (state: ScenePlaybackState) => ReactNode;
  /** Status vocabulary line (schematic / illustrative / authored...). */
  statusLine?: ReactNode;
  /** Scene summary + the captions in order; the text alternative. */
  textAlternative: string;
  /** Start playing on mount (used by the poster activation click). */
  autoPlayOnMount?: boolean;
  className?: string;
}


export function ScenePlayer({
  scene,
  children,
  legend,
  readout,
  statusLine,
  textAlternative,
  autoPlayOnMount = false,
  className,
}: ScenePlayerProps) {
  const descriptionId = `${useId()}-motion-alt`;
  const spans = useMemo(() => beatSpans(scene.beats), [scene.beats]);
  const total = totalDuration(spans);
  const poster = posterTime(spans);
  const time = useMotionValue(poster);
  const [playing, setPlaying] = useState(autoPlayOnMount);
  const [beatIndex, setBeatIndex] = useState(() =>
    Math.max(0, spans.length - 1),
  );
  const [lastScrub, setLastScrub] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  // Poster activation with play consent starts from the top; a plain
  // mount ( SSR, tests, reduced motion) keeps the poster still.
  useEffect(() => {
    if (autoPlayOnMount) time.set(0);
  }, [autoPlayOnMount, time]);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const scrubberRef = useRef<HTMLInputElement | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const captionRef = useRef<HTMLParagraphElement | null>(null);

  // Poster activation replaces the focused poster button with the player;
  // focus follows the reader's click into the play control so the keyboard
  // contract works immediately. The focus must not scroll: the reader's
  // viewport stays where it was.
  useEffect(() => {
    if (autoPlayOnMount) playButtonRef.current?.focus({ preventScroll: true });
  }, [autoPlayOnMount]);

  // Beat index follows the clock, but only changes at beat boundaries, so
  // captions and readouts update once per beat, never per frame.
  useEffect(() => {
    const update = (t: number) => {
      const { index } = locate(spans, t);
      setBeatIndex((previous) => (previous === index ? previous : index));
    };
    update(time.get());
    return time.on('change', update);
  }, [time, spans]);

  // Playback: one rAF loop while playing, none while paused.
  useEffect(() => {
    if (!playing || reducedMotion) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(time.get() + (now - last), total);
      last = now;
      time.set(next);
      if (next >= total) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reducedMotion, time, total]);

  // Reduced motion: no tweening. Play becomes a hold on each beat
  // end-state, so the scene reads as sampled stills.
  useEffect(() => {
    if (!playing || !reducedMotion) return;
    const timer = window.setInterval(() => {
      const next = stepTarget(spans, time.get(), 1);
      time.set(next);
      if (next >= total) setPlaying(false);
    }, MOTION_TIMING.reducedMotionHold);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, spans, time, total]);

  // Pause when the scene leaves the viewport.
  useEffect(() => {
    const element = frameRef.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          setPlaying(false);
        }
      },
      { threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Mirror the clock onto the scrubber without React state per frame. The
  // guard keeps a user drag in control until their pointer settles.
  useEffect(() => {
    return time.on('change', (t) => {
      const input = scrubberRef.current;
      if (input === null) return;
      if (document.activeElement === input && Date.now() - lastScrub < 250) {
        return;
      }
      input.value = String(Math.round(t));
    });
  }, [time, lastScrub]);

  const togglePlay = useCallback(() => {
    setPlaying((wasPlaying) => {
      if (wasPlaying) return false;
      if (time.get() >= total) time.set(0);
      return true;
    });
  }, [time, total]);

  const step = useCallback(
    (delta: 1 | -1) => {
      setPlaying(false);
      time.set(stepTarget(spans, time.get(), delta));
    },
    [spans, time],
  );

  const reset = useCallback(() => {
    setPlaying(false);
    time.set(poster);
  }, [poster, time]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    const onButton = target.closest('button') !== null;
    switch (event.key) {
      case ' ':
        if (onButton) return; // the button's native activation
        event.preventDefault();
        togglePlay();
        break;
      case 'k':
      case 'K':
        event.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        event.preventDefault();
        step(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        step(-1);
        break;
      case 'Home':
        event.preventDefault();
        setPlaying(false);
        time.set(0);
        break;
      case 'End':
        event.preventDefault();
        setPlaying(false);
        time.set(total);
        break;
      default:
        break;
    }
  };

  const caption = spans[beatIndex]?.beat.caption ?? '';
  const state: ScenePlaybackState = {
    beatIndex,
    beatCount: spans.length,
    playing,
    beatLabel: `${beatIndex + 1} / ${spans.length}`,
  };
  return (
    <InstrumentFrame
      data-motion-scene={scene.id}
      role="group"
      aria-label={`Motion scene: ${scene.title}`}
      aria-describedby={descriptionId}
      className={className}
    >
      <div ref={frameRef} onKeyDown={onKeyDown}>
        <InstrumentHeader
          meta={
            <span data-testid="motion-beat-count">
              beat {state.beatLabel}
            </span>
          }
        >
          <button
            ref={playButtonRef}
            data-brand-control-id="control:primary-action"
            data-pagefind-ignore
            data-testid="motion-play"
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause the scene' : 'Play the scene'}
            className={INSTRUMENT_PRIMARY_CONTROL_CLASS}
          >
            {playing ? (
              <Pause size={14} weight="bold" aria-hidden />
            ) : (
              <Play size={14} weight="bold" aria-hidden />
            )}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="motion-step-back"
            type="button"
            onClick={() => step(-1)}
            aria-label="Step back one beat"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step back
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            data-testid="motion-step-forward"
            type="button"
            onClick={() => step(1)}
            aria-label="Step forward one beat"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step forward
          </button>
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the scene to its poster still"
          />
        </InstrumentHeader>

        <Surface
          level="bounded-dark"
          data-motion-stage
          className="mt-4 overflow-hidden"
        >
          <SceneTimeProvider value={time}>
            <StaticTimeProvider value={poster}>{children}</StaticTimeProvider>
          </SceneTimeProvider>
        </Surface>

        <label
          className="mt-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim"
          htmlFor={`${scene.id}-scrubber`}
        >
          Scene timeline
        </label>
        <input
          ref={scrubberRef}
          id={`${scene.id}-scrubber`}
          data-brand-control-id="control:input"
          data-pagefind-ignore
          data-testid="motion-scrubber"
          type="range"
          min={0}
          max={total}
          step={50}
          defaultValue={poster}
          onChange={(event) => {
            setLastScrub(Date.now());
            time.set(Number(event.target.value));
          }}
          aria-label="Scene timeline"
          aria-valuetext={caption}
          className="mt-2 w-full accent-accent"
        />

        <p
          ref={captionRef}
          aria-live="polite"
          data-testid="motion-caption"
          className="mt-3 font-sans text-sm leading-relaxed text-text"
        >
          {caption}
        </p>

        {legend ? (
          <InstrumentLegend className="mt-3">{legend}</InstrumentLegend>
        ) : null}

        <SceneTimeProvider value={time}>
          <StaticTimeProvider value={poster}>
            <InstrumentReadout data-testid="motion-readout">
              <span className="text-text-dim">beat</span>{' '}
              <span data-testid="motion-beat-readout" className="text-text">
                {state.beatLabel}
              </span>{' '}
              {readout ? readout(state) : null}
            </InstrumentReadout>
          </StaticTimeProvider>
        </SceneTimeProvider>

        {statusLine ? (
          <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
            {statusLine}
          </p>
        ) : null}
      </div>

      <p id={descriptionId} className="sr-only">
        {textAlternative}
      </p>
    </InstrumentFrame>
  );
}

export default ScenePlayer;
