'use client';

/**
 * SceneMount: the lazy entry point every scene page uses.
 *
 * Code-splitting: each scene loads through the article's lazy mount. The
 * placeholder is the poster frame, which prerenders the scene's final frame
 * server-side inside the same instrument
 * chrome (header row, bounded-dark stage, caption, legend, readout) with
 * the transport controls disabled. The stage occupies the identical box
 * before and after activation, so nothing the reader is looking at shifts;
 * the only thing activation adds is the live scrubber below the stage.
 *
 * No autoplay, ever: the poster's play control is the click. Under reduced
 * motion the click activates the scene paused on the poster still; the
 * reader then steps between beat end-states.
 */
import { useId, useState, type ReactNode } from 'react';
import { StaticTimeProvider } from './scene-context';
import {
  beatSpans,
  posterTime,
  type SceneDefinition,
} from './timeline';
import { usePrefersReducedMotion } from './use-reduced-motion';
import { Play } from '@phosphor-icons/react';
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
import ScenePlayer from './scene-player';

export interface SceneMountProps {
  scene: SceneDefinition;
  /** The stage: one <svg> owned by the scene; renders statically too. */
  stage: ReactNode;
  legend?: ReactNode;
  readout?: (state: {
    beatIndex: number;
    beatCount: number;
    playing: boolean;
    beatLabel: string;
  }) => ReactNode;
  statusLine?: ReactNode;
  textAlternative: string;
  className?: string;
}

export function SceneMount({
  scene,
  stage,
  legend,
  readout,
  statusLine,
  textAlternative,
  className,
}: SceneMountProps) {
  const [active, setActive] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const descriptionId = `${useId()}-motion-poster-alt`;
  const reducedMotion = usePrefersReducedMotion();
  const poster = posterTime(beatSpans(scene.beats));
  const beatCount = scene.beats.length;
  const posterBeat = scene.beats[beatCount - 1];

  const activate = () => {
    setActive(true);
    // The click is the play consent; reduced motion keeps it a pause on
    // the poster still, with the step controls doing the teaching.
    setAutoPlay(!reducedMotion);
  };

  const posterState = {
    beatIndex: beatCount - 1,
    beatCount,
    playing: false,
    beatLabel: `${beatCount} / ${beatCount}`,
  };
  const posterView = (
      <InstrumentFrame
        data-motion-scene={scene.id}
        role="group"
        aria-label={`Motion scene: ${scene.title}`}
        aria-describedby={descriptionId}
        className={className}
      >
        <InstrumentHeader
          meta={
            <span data-testid="motion-beat-count">
              beat {posterState.beatLabel}
            </span>
          }
        >
          <button
            data-brand-control-id="control:primary-action"
            data-pagefind-ignore
            data-testid="motion-poster"
            type="button"
            onClick={activate}
            aria-label={`Play the motion scene: ${scene.title}`}
            className={INSTRUMENT_PRIMARY_CONTROL_CLASS}
          >
            <Play size={14} weight="bold" aria-hidden />
            Play
          </button>
          {/* Transport controls exist but wait for the play click, so the
              header row is the same height before and after activation.
              The disabled controls keep their registry annotations: the
              control census sweeps the poster too. */}
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            disabled
            aria-label="Step back one beat"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step back
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            disabled
            aria-label="Step forward one beat"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step forward
          </button>
          <InstrumentReset
            onClick={() => {}}
            disabled
            aria-label="Reset the scene to its poster still"
          />
        </InstrumentHeader>

        <Surface
          level="bounded-dark"
          data-motion-stage
          className="mt-4 overflow-hidden"
        >
          <StaticTimeProvider value={poster}>{stage}</StaticTimeProvider>
        </Surface>

        {/* The poster's caption is the final beat's caption: the still the
            reader is looking at, in the same slot the live caption uses. */}
        <p data-testid="motion-caption" className="mt-3 font-sans text-sm leading-relaxed text-text">
          {posterBeat.caption}
        </p>

        {legend ? (
          <InstrumentLegend className="mt-3">{legend}</InstrumentLegend>
        ) : null}

        <StaticTimeProvider value={poster}>
          <InstrumentReadout data-testid="motion-readout">
            <span className="text-text-dim">beat</span>{' '}
            <span data-testid="motion-beat-readout" className="text-text">
              {posterState.beatLabel}
            </span>{' '}
            {readout ? readout(posterState) : null}
          </InstrumentReadout>
        </StaticTimeProvider>

        {statusLine ? (
          <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
            {statusLine}
          </p>
        ) : null}
        <p id={descriptionId} className="sr-only" hidden>
          {textAlternative}
        </p>
      </InstrumentFrame>
  );

  if (!active) return posterView;

  return (
    <ScenePlayer
      scene={scene}
      legend={legend}
      readout={readout}
      statusLine={statusLine}
      textAlternative={textAlternative}
      autoPlayOnMount={autoPlay}
      className={className}
    >
      {stage}
    </ScenePlayer>
  );
}
