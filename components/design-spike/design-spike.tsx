'use client';

import { useEffect } from 'react';
import { isSpikeThemeId, SPIKE_FONT_CLASSES } from './spike-fonts';
import './design-spike.css';

/**
 * Mounts one candidate treatment of the visual-elevation design spike.
 *
 * Renders nothing. Its whole job is to put `data-design-spike="<candidate>"`
 * and the candidate font variables on the document element when the URL asks
 * for a candidate by name, so the scoped rules in design-spike.css resolve.
 *
 * Reading the candidate from `window.location.search` rather than from
 * `useSearchParams` is what keeps the spike off every other surface: the site
 * is a static export, so the query string exists only in the browser, no
 * prerendered HTML carries a candidate, and no link anywhere in the site
 * chrome or in any article writes `?theme=`. The only way to reach a
 * candidate is to type its URL.
 *
 * Unmounting removes both, so navigating away from the review route restores
 * the shipped theme without a reload.
 */
export function DesignSpike() {
  useEffect(() => {
    const theme = new URLSearchParams(window.location.search).get('theme');
    if (!isSpikeThemeId(theme)) return;
    const root = document.documentElement;
    root.dataset.designSpike = theme;
    root.classList.add(...SPIKE_FONT_CLASSES);
    return () => {
      delete root.dataset.designSpike;
      root.classList.remove(...SPIKE_FONT_CLASSES);
    };
  }, []);

  return null;
}
