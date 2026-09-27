'use client';

/**
 * Scene time plumbing. One timeline owns t: the player holds it as a Motion
 * value and every animated attribute in the stage subscribes to it. No
 * React state is updated per frame.
 *
 * A stage rendered outside a player (the prerendered poster) gets no motion
 * value; it renders statically at the static time, which the poster mount
 * pins to the final frame of the last beat. That is what makes the poster a
 * deterministic server-rendered SVG.
 */
import { createContext, useContext } from 'react';
import type { MotionValue } from 'motion/react';

const SceneTimeContext = createContext<MotionValue<number> | null>(null);
const StaticTimeContext = createContext<number>(0);

export const SceneTimeProvider = SceneTimeContext.Provider;
export const StaticTimeProvider = StaticTimeContext.Provider;

/** The scene clock, or null when rendering the static poster. */
export function useSceneTime(): MotionValue<number> | null {
  return useContext(SceneTimeContext);
}

/**
 * The time a context-free render evaluates bindings at. Inside a player
 * this is the poster time, so server HTML and hydration agree before the
 * first effect syncs to the live clock.
 */
export function useStaticTime(): number {
  return useContext(StaticTimeContext);
}
