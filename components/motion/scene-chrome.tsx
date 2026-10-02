'use client';

/**
 * The scene pieces the poster and the live player share, so both paint the
 * same frame: the stage footer (legend, readout, status line) and the
 * timeline band. The poster draws the timeline at its end, because the
 * poster is the final frame; the player swaps in the live scrubber at the
 * same height, so activation moves nothing below the stage.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { words } from '@/lib/figure-system-paint';
import { StageLegend, StageReadout } from './figure-frame';
import type { SceneDefinition } from './timeline';

export interface SceneReadoutState {
  beatIndex: number;
  beatCount: number;
  playing: boolean;
  beatLabel: string;
}

/**
 * The frame's source line for a scene placement. A page that reuses a scene
 * outside its canonical article states the reuse here, without the scene
 * module needing a prop for it.
 */
const SceneSourceContext = createContext<ReactNode>(null);

export function SceneSource({
  source,
  children,
}: {
  source: ReactNode;
  children: ReactNode;
}) {
  return (
    <SceneSourceContext.Provider value={source}>
      {children}
    </SceneSourceContext.Provider>
  );
}

export function useSceneSource(): ReactNode {
  return useContext(SceneSourceContext);
}

export function sceneFigureId(sceneId: string): string {
  return `scene:${sceneId}`;
}

/**
 * The word count of every beat caption, in beat order. Only one caption is
 * on the page at a time, so the export carries the counts for the
 * figure-system check to hold each beat to the caption limit.
 */
export function sceneBeatWords(scene: Pick<SceneDefinition, 'beats'>): string {
  return scene.beats.map((beat) => words(beat.caption)).join(' ');
}

export function SceneReadout({
  state,
  readout,
}: {
  state: SceneReadoutState;
  readout?: (state: SceneReadoutState) => ReactNode;
}) {
  return (
    <StageReadout data-testid="motion-readout">
      {/* The beat position is announced, not shown: a reader watches the
          timeline, and "beat 2 / 4" is player bookkeeping. */}
      <span data-testid="motion-beat-count" className="sr-only">
        <span>beat</span>{' '}
        <span data-testid="motion-beat-readout">{state.beatLabel}</span>
      </span>{' '}
      {readout ? readout(state) : null}
    </StageReadout>
  );
}

export function SceneStageFooter({
  legend,
  readout,
  statusLine,
  hint,
}: {
  legend?: ReactNode;
  readout: ReactNode;
  statusLine?: ReactNode;
  /** Shown when a reader-started run has ended on the final frame. */
  hint?: string;
}) {
  return (
    <>
      {legend ? <StageLegend>{legend}</StageLegend> : null}
      {readout}
      {hint ? (
        <span
          data-scene-hint=""
          className="font-sans text-sm leading-snug text-text"
        >
          {hint}
        </span>
      ) : null}
      {statusLine ? (
        <p
          data-scene-status=""
          className="basis-full font-sans text-sm leading-snug text-text-dim"
        >
          {statusLine}
        </p>
      ) : null}
    </>
  );
}

/** The timeline at the poster's position: the end of the last beat. */
export function SceneTimelineAtEnd() {
  return (
    <div
      aria-hidden="true"
      data-scene-timeline="poster"
      className="flex h-11 items-center"
    >
      <span className="block h-1 w-full rounded-xs bg-highlight" />
    </div>
  );
}

/** The live scrubber: a 44px touch target over the same track. */
export const SCENE_SCRUBBER_CLASS =
  'block h-11 w-full cursor-pointer accent-highlight';
