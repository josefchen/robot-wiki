'use client';

/**
 * SceneMount: the lazy entry point every scene page uses.
 *
 * Code-splitting: each scene loads through the article's lazy mount. The
 * placeholder is the poster frame, which prerenders the scene's final frame
 * server-side inside the same figure frame (header, stage with its
 * legend, readout and timeline, caption). The poster draws the timeline at
 * its end and the player swaps in the live scrubber at the same height, so
 * activation moves nothing the reader is looking at.
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
import {
  InstrumentReset,
  INSTRUMENT_PRIMARY_CONTROL_CLASS,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
} from '@/components/ui/instrument';
import { FigureFrame, FigureStage } from './figure-frame';
import {
  SceneReadout,
  SceneStageFooter,
  SceneTimelineAtEnd,
  sceneBeatWords,
  sceneFigureId,
  useSceneSource,
} from './scene-chrome';
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
  /** Method, sources and caveats for the "How this was made" fold. */
  method?: ReactNode;
  /** An id on the frame, for a scene that needs a stable anchor URL. */
  anchorId?: string;
  className?: string;
}

export function SceneMount({
  scene,
  stage,
  legend,
  readout,
  statusLine,
  textAlternative,
  method,
  anchorId,
  className: frameClassName,
}: SceneMountProps) {
  // An anchored frame clears the sticky mobile header when its link is followed.
  const className = anchorId
    ? ['scroll-mt-16 lg:scroll-mt-4', frameClassName].filter(Boolean).join(' ')
    : frameClassName;
  const [active, setActive] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [initialStep, setInitialStep] = useState<1 | -1 | undefined>();
  const descriptionId = `${useId()}-motion-poster-alt`;
  const reducedMotion = usePrefersReducedMotion();
  const source = useSceneSource();
  const poster = posterTime(beatSpans(scene.beats));
  const beatCount = scene.beats.length;
  const posterBeat = scene.beats[beatCount - 1];

  const activate = () => {
    setActive(true);
    // The click is the play consent; reduced motion keeps it a pause on
    // the poster still, with the step controls doing the teaching.
    setAutoPlay(!reducedMotion);
  };
  // A step pressed in the poster's fold activates the player paused, one
  // beat away from the poster, with the fold still open.
  const activateStep = (delta: 1 | -1) => {
    setActive(true);
    setInitialStep(delta);
  };

  const posterState = {
    beatIndex: beatCount - 1,
    beatCount,
    playing: false,
    beatLabel: `${beatCount} / ${beatCount}`,
  };
  const posterView = (
    <FigureFrame
      as="div"
      id={anchorId}
      figureId={sceneFigureId(scene.id)}
      data-motion-scene={scene.id}
      data-figure-beat-words={sceneBeatWords(scene)}
      role="group"
      aria-label={`Motion scene: ${scene.title}`}
      aria-describedby={descriptionId}
      className={className}
      kicker={scene.kicker}
      heading={scene.headline ?? scene.title}
      controls={
        <button
          data-brand-control-id="control:primary-action"
          data-pagefind-ignore
          data-testid="motion-poster"
          type="button"
          onClick={activate}
          aria-label={`Play the motion scene: ${scene.title}`}
          className={INSTRUMENT_PRIMARY_CONTROL_CLASS}
        >
          Play
        </button>
      }
      // The poster's fold holds the same transport as the player's. A step
      // activates the player one beat away; reset finds the poster already
      // at its settle still.
      adjust={
        <>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => activateStep(-1)}
            aria-label="Step back one beat"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step back
          </button>
          <button
            data-brand-control-id="control:secondary-action"
            data-pagefind-ignore
            type="button"
            onClick={() => activateStep(1)}
            aria-label="Step forward one beat"
            className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
          >
            Step forward
          </button>
          <InstrumentReset
            onClick={() => {}}
            aria-label="Reset the scene to its poster still"
          />
        </>
      }
      stage={
        <StaticTimeProvider value={poster}>
          <FigureStage
            footer={
              <SceneStageFooter
                legend={legend}
                readout={<SceneReadout state={posterState} readout={readout} />}
                statusLine={statusLine}
              />
            }
            timeline={<SceneTimelineAtEnd />}
          >
            <div data-motion-stage="">{stage}</div>
          </FigureStage>
        </StaticTimeProvider>
      }
      // The poster's caption is the final beat's caption: the still the
      // reader is looking at, in the same slot the live caption uses.
      caption={posterBeat.caption}
      captionProps={{ 'data-testid': 'motion-caption' }}
      method={method}
      source={source}
    >
      <div id={descriptionId} className="sr-only" hidden>
        {textAlternative}
      </div>
    </FigureFrame>
  );

  if (!active) return posterView;

  return (
    <ScenePlayer
      scene={scene}
      legend={legend}
      readout={readout}
      statusLine={statusLine}
      textAlternative={textAlternative}
      method={method}
      autoPlayOnMount={autoPlay}
      initialStep={initialStep}
      anchorId={anchorId}
      className={className}
    >
      {stage}
    </ScenePlayer>
  );
}
