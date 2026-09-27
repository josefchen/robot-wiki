import type { ReactNode } from 'react';
import { SCENE_EQUATIONS } from '@/lib/motion-equations';
import { AnimatedGroup } from './animated';

/** Pre-typeset KaTeX HTML, centred in the header lane of the SVG stage. */
export function SceneEquation({
  equation,
  x,
  width,
  progress,
  children,
}: {
  equation: keyof typeof SCENE_EQUATIONS;
  x: number;
  width: number;
  progress: (t: number) => number;
  children?: ReactNode;
}) {
  const { tex, html } = SCENE_EQUATIONS[equation];
  return (
    <AnimatedGroup bindings={{ opacity: progress }}>
      <foreignObject
        x={x}
        y={7}
        width={width}
        height={24}
        data-scene-equation={equation}
        aria-label={tex}
      >
        <div
          {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
          className="motion-equation flex h-full items-center justify-center text-[16px] leading-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </foreignObject>
      {children}
    </AnimatedGroup>
  );
}
