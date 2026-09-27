'use client';

/**
 * Animated SVG elements for the scene kit.
 *
 * An animated element declares its geometry as pure functions of scene
 * time. At render time each binding is evaluated at the static poster
 * time (which is what the server prerenders and what hydration renders);
 * once mounted, the element subscribes to the scene clock and writes
 * attributes directly through its ref, before the browser paints. Per-
 * frame updates never touch React state.
 */
import {
  useLayoutEffect,
  useRef,
  type ReactNode,
  type SVGAttributes,
} from 'react';
import { useSceneTime, useStaticTime } from './scene-context';

export type AnimatedTag =
  | 'g'
  | 'path'
  | 'ellipse'
  | 'circle'
  | 'rect'
  | 'line'
  | 'text'
  | 'polygon'
  | 'polyline';

export type AnimatedBindings = Record<string, (t: number) => number | string>;

type AnimatedElementProps = Omit<SVGAttributes<SVGElement>, 'children'> & {
  as: AnimatedTag;
  /** Attribute values as pure functions of scene time, in milliseconds. */
  bindings?: AnimatedBindings;
  children?: ReactNode;
};

export function AnimatedElement({
  as,
  bindings = {},
  children,
  ...attributes
}: AnimatedElementProps) {
  const time = useSceneTime();
  const staticTime = useStaticTime();
  const ref = useRef<SVGElement | null>(null);

  // The rendered markup always carries the static (poster-time) values,
  // so server HTML, hydration and the pre-activation poster agree.
  const initial: Record<string, string> = {};
  for (const [attribute, select] of Object.entries(bindings)) {
    initial[attribute] = String(select(staticTime));
  }

  // The live clock writes attributes through the ref in a layout effect,
  // before paint, so a re-render never flashes the poster values.
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || time === null) return;
    const entries = Object.entries(bindings);
    if (entries.length === 0) return;
    const apply = (t: number) => {
      for (const [attribute, select] of entries) {
        element.setAttribute(attribute, String(select(t)));
      }
    };
    apply(time.get());
    return time.on('change', apply);
  }, [time, bindings]);

  const Tag = as;
  return (
    <Tag
      ref={(node: SVGElement | null) => {
        ref.current = node;
      }}
      {...attributes}
      {...initial}
    >
      {children}
    </Tag>
  );
}

/** Convenience wrappers keep scene markup declarative. */
export function AnimatedGroup(props: Omit<AnimatedElementProps, 'as'>) {
  return <AnimatedElement as="g" {...props} />;
}

export function AnimatedPath(props: Omit<AnimatedElementProps, 'as'>) {
  return <AnimatedElement as="path" {...props} />;
}

export function AnimatedEllipse(props: Omit<AnimatedElementProps, 'as'>) {
  return <AnimatedElement as="ellipse" {...props} />;
}

export function AnimatedCircle(props: Omit<AnimatedElementProps, 'as'>) {
  return <AnimatedElement as="circle" {...props} />;
}

export function AnimatedLine(props: Omit<AnimatedElementProps, 'as'>) {
  return <AnimatedElement as="line" {...props} />;
}

export function AnimatedText(props: Omit<AnimatedElementProps, 'as'>) {
  return <AnimatedElement as="text" {...props} />;
}
