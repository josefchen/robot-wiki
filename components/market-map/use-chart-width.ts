'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The width a market-map chart is drawn at, in CSS pixels, measured from
 * its frame. Charts draw in their own pixels (viewBox = rendered size), so
 * axis labels keep their reading size on a phone instead of shrinking with
 * a fixed drawing. Before the first measurement (and where ResizeObserver
 * is missing) the fallback width is used.
 */
export function useChartWidth(fallback: number, minimum = 300) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(Math.max(minimum, next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [minimum]);
  return [ref, width] as const;
}
