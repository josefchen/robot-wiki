'use client';

/**
 * ScenePlayer: the shared playback shell for every motion scene.
 *
 * Contract (docs/design/motion-language.md):
 * - Click-to-play, never autoplay. The poster is the prerendered final
 *   frame of the last beat; play is a click.
 * - Two visible controls: play/pause and a native range scrubber whose
 *   aria-valuetext is the current beat's caption. Step back, step forward
 *   and reset sit in the frame's "Adjust more" fold. A finished run ends
 *   on the final frame with a hint that hands the timeline to the reader.
 * - Keys: Space or K play/pause, arrows step a beat, Home and End.
 * - The scene renders in the shared figure frame: title and controls, the
 *   stage with its legend, readout and timeline, then the caption.
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
  InstrumentReset,
  INSTRUMENT_PRIMARY_CONTROL_CLASS,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
} from '@/components/ui/instrument';
import { FigureFrame, FigureStage } from './figure-frame';
import {
  SCENE_SCRUBBER_CLASS,
  SceneReadout,
  SceneStageFooter,
  sceneBeatWords,
  sceneFigureId,
  useSceneSource,
} from './scene-chrome';
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
  /** Legend entries (LegendItem), drawn on the stage. */
  legend?: ReactNode;
  /** Scene-specific numbers in the readout row. */
  readout?: (state: ScenePlaybackState) => ReactNode;
  /** Status vocabulary line (schematic / illustrative / authored...). */
  statusLine?: ReactNode;
  /** Scene summary + the captions in order; the text alternative. */
  textAlternative: string;
  /** Method, sources and caveats for the "How this was made" fold. */
  method?: ReactNode;
  /** Start playing on mount (used by the poster activation click). */
  autoPlayOnMount?: boolean;
  /** Step once on mount (a step pressed in the poster's fold). */
  initialStep?: 1 | -1;
  className?: string;
}


export function ScenePlayer({
  scene,
  children,
  legend,
  readout,
  statusLine,
  textAlternative,
  method,
  autoPlayOnMount = false,
  initialStep,
  className,
}: ScenePlayerProps) {
  const descriptionId = `${useId()}-motion-alt`;
  const spans = useMemo(() => beatSpans(scene.beats), [scene.beats]);
  const total = totalDuration(spans);
  const poster = posterTime(spans);
  const time = useMotionValue(
    initialStep ? stepTarget(spans, poster, initialStep) : poster,
  );
  const [playing, setPlaying] = useState(autoPlayOnMount);
  // Set once a reader-started run reaches the end; it shows the hint that
  // hands the timeline to the reader.
  const [finished, setFinished] = useState(false);
  const [beatIndex, setBeatIndex] = useState(() =>
    Math.max(0, spans.length - 1),
  );
  const [lastScrub, setLastScrub] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const source = useSceneSource();

  // Poster activation with play consent starts from the top; a plain
  // mount ( SSR, tests, reduced motion) keeps the poster still.
  useEffect(() => {
    if (autoPlayOnMount) time.set(0);
  }, [autoPlayOnMount, time]);

  const frameRef = useRef<HTMLElement | null>(null);
  const scrubberRef = useRef<HTMLInputElement | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const stepBackRef = useRef<HTMLButtonElement | null>(null);
  const stepForwardRef = useRef<HTMLButtonElement | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);

  // Poster activation replaces the focused poster button with the player;
  // focus follows the reader's click into the matching control so the
  // keyboard contract works immediately. The focus must not scroll: the
  // reader's viewport stays where it was.
  useEffect(() => {
    const target = initialStep === -1 ? stepBackRef.current
      : initialStep === 1 ? stepForwardRef.current
        : autoPlayOnMount ? playButtonRef.current : null;
    target?.focus({ preventScroll: true });
  }, [autoPlayOnMount, initialStep]);

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
        setFinished(true);
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
      if (next >= total) {
        setPlaying(false);
        setFinished(true);
      }
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
    setFinished(false);
    setPlaying((wasPlaying) => {
      if (wasPlaying) return false;
      if (time.get() >= total) time.set(0);
      return true;
    });
  }, [time, total]);

  const step = useCallback(
    (delta: 1 | -1) => {
      setPlaying(false);
      setFinished(false);
      time.set(stepTarget(spans, time.get(), delta));
    },
    [spans, time],
  );

  const reset = useCallback(() => {
    setPlaying(false);
    setFinished(false);
    time.set(poster);
  }, [poster, time]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    // A fold summary or a link inside the frame keeps its own Space.
    const onButton = target.closest('button, summary, a') !== null;
    switch (event.key) {
      case ' ':
        if (onButton) return; // the control's native activation
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
    <FigureFrame
      as="div"
      figureId={sceneFigureId(scene.id)}
      data-motion-scene={scene.id}
      data-figure-beat-words={sceneBeatWords(scene)}
      role="group"
      aria-label={`Motion scene: ${scene.title}`}
      aria-describedby={descriptionId}
      className={className}
      ref={frameRef}
      onKeyDown={onKeyDown}
      kicker={scene.kicker}
      heading={scene.headline ?? scene.title}
      controls={
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
      }
      adjustOpen={initialStep !== undefined}
      adjust={
        <>
          <button
            ref={stepBackRef}
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
            ref={stepForwardRef}
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
        </>
      }
      stage={
        <SceneTimeProvider value={time}>
          <StaticTimeProvider value={poster}>
            <FigureStage
              footer={
                <SceneStageFooter
                  legend={legend}
                  readout={<SceneReadout state={state} readout={readout} />}
                  statusLine={statusLine}
                  hint={finished ? 'Drag the timeline to look again' : undefined}
                />
              }
              timeline={
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
                    setFinished(false);
                    time.set(Number(event.target.value));
                  }}
                  aria-label="Scene timeline"
                  aria-valuetext={caption}
                  className={SCENE_SCRUBBER_CLASS}
                />
              }
            >
              <div data-motion-stage="">{children}</div>
            </FigureStage>
          </StaticTimeProvider>
        </SceneTimeProvider>
      }
      caption={caption}
      captionProps={{
        ref: captionRef,
        'aria-live': 'polite',
        'data-testid': 'motion-caption',
      }}
      method={method}
      source={source}
    >
      <div id={descriptionId} className="sr-only">
        {textAlternative}
      </div>
    </FigureFrame>
  );
}

export default ScenePlayer;
