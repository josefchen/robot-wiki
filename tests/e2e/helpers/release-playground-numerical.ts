import type { Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { playgroundReadingSchema, type PlaygroundReading } from '../../../lib/brand-v2-release-playground';

/** Read the default framebuffer, restoring every binding changed by the
 * sampler. The SHA covers actual RGBA bytes, not a model/state digest. */
async function pixels(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return null;
    const gl = canvas.getContext('webgl2');
    if (!gl || gl.isContextLost()) throw Error('No active WebGL2 context');
    const w = gl.drawingBufferWidth,
      h = gl.drawingBufferHeight,
      read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
      draw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
      texture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const tex = gl.createTexture(),
      fb = gl.createFramebuffer();
    const bytes = new Uint8Array(w * h * 4);
    try {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    } finally {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.deleteFramebuffer(fb);
      gl.deleteTexture(tex);
    }
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim().replace('#', '');
    const paper = [0, 2, 4].map(at => parseInt(hex.slice(at, at + 2), 16));
    let nonPaper = 0,
      accent = 0,
      miss = 0;
    for (let i = 0; i < bytes.length; i += 4) {
      const [r, g, b] = [bytes[i], bytes[i + 1], bytes[i + 2]];
      if (Math.abs(r - paper[0]) > 3 || Math.abs(g - paper[1]) > 3 || Math.abs(b - paper[2]) > 3) nonPaper++;
      if (b > r + 35 && b > g + 15) accent++;
      if (r > g + 60 && r > b + 60) miss++;
    }
    // Chunked binary conversion avoids call-stack overflow at DPR 2.
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
    return {
      total: w * h,
      nonPaper,
      accent,
      miss,
      base64: btoa(binary)
    };
  });
  if (!data) return null;
  const {
    base64,
    ...counts
  } = data;
  return {
    ...counts,
    hash: createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex')
  };
}
export async function collectPlaygroundNumericalReading(page: Page, id: string, profile: PlaygroundReading['profile'], steps: string[], waitCamera?: {
  position: number[];
  target: number[];
}): Promise<PlaygroundReading> {
  const observedState = () => page.getByTestId('playground-viewport').evaluate(node => {
    const data = (node as HTMLElement).dataset;
    const model = data.renderedModel ? JSON.parse(data.renderedModel) as {
      joints: Array<{
        name: string;
        angle: number;
      }>;
    } : null;
    const sliders = [...document.querySelectorAll<HTMLInputElement>('input[data-testid^="joint-slider-"]')].map(input => ({
      name: input.dataset.testid!.replace('joint-slider-', ''),
      value: Number(input.value) * Math.PI / 180
    }));
    return {
      signature: JSON.stringify([data.renderedModel, data.cameraPosition, data.cameraTarget, sliders]),
      coherent: Boolean(model && sliders.length && sliders.every(slider => model.joints.some(joint => joint.name === slider.name && Math.abs(joint.angle - slider.value) < 1e-6))),
      camera: (data.cameraPosition ?? '').split(',').map(Number),
      target: (data.cameraTarget ?? '').split(',').map(Number)
    };
  });
  const settle = async () => {
    if (profile === 'unavailable') return;
    let previous = '',
      stableSince = Date.now();
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const state = await observedState();
      const cameraReady = !waitCamera || state.camera.length === waitCamera.position.length && state.camera.every((value, index) => Math.abs(value - waitCamera.position[index]) < .001) && state.target.every((value, index) => Math.abs(value - waitCamera.target[index]) < .001);
      if (!state.coherent || !cameraReady || state.signature !== previous) stableSince = Date.now();
      previous = state.signature;
      if (state.coherent && cameraReady && Date.now() - stableSince >= 1000) return;
      await page.waitForTimeout(100);
    }
    throw Error('Rendered playground graph/camera did not settle coherently: ' + id);
  };
  const measure = async () => page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('[data-testid=playground-viewport]')!,
      canvas = viewport.querySelector('canvas');
    const triple = (testId: string): [number, number, number] | null => {
      const text = document.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
      const match = /x\s+([+-]?[\d.]+)\s+y\s+([+-]?[\d.]+)\s+z\s+([+-]?[\d.]+)/.exec(text);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    };
    const nums = (text: string | undefined) => text ? text.split(/[x,]/).map(Number) : [];
    const opaque = (node: Element | null): string => {
      if (!node) return '';
      const value = getComputedStyle(node).backgroundColor;
      return !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(value) ? value : opaque(node.parentElement);
    };
    const stage = canvas?.getBoundingClientRect() ?? viewport.getBoundingClientRect(),
      style = getComputedStyle(viewport);
    const sliders = [...document.querySelectorAll<HTMLInputElement>('input[data-testid^="joint-slider-"]')].map(input => ({
      name: input.dataset.testid!.replace('joint-slider-', ''),
      min: Number(input.min),
      max: Number(input.max),
      value: Number(input.value),
      label: [...(input.labels ?? [])].map(label => label.textContent ?? '').join(' ').trim(),
      spoken: input.getAttribute('aria-valuetext') ?? ''
    }));
    const jointText = Object.fromEntries([...document.querySelectorAll('[data-testid^="tech-joint-"]')].map(node => [node.getAttribute('data-testid')!.replace('tech-joint-', ''), node.textContent?.trim() ?? '']));
    const progress = document.querySelector<HTMLElement>('[data-testid=trajectory-progress]');
    const active = document.querySelector<HTMLElement>('.pg-joint[data-active]');
    const activeLabel = active?.querySelector('label'),
      marker = activeLabel ? getComputedStyle(activeLabel, '::before') : null;
    const copy = document.querySelector('main')!.cloneNode(true) as Element;
    copy.querySelectorAll('textarea,input,code,pre,[data-testid=technical-names]').forEach(node => node.remove());
    const residualText = document.querySelector('[data-testid=tech-residual]')?.textContent ?? '';
    return {
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio
      },
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      state: document.querySelector('[data-testid=playground]')?.getAttribute('data-playground-state') ?? '',
      canvasCount: document.querySelectorAll('canvas').length,
      canvasLabel: canvas?.getAttribute('aria-label') ?? '',
      canvasTabIndex: canvas?.tabIndex ?? -1,
      model: viewport.dataset.renderedModel ? JSON.parse(viewport.dataset.renderedModel) : null,
      camera: nums(viewport.dataset.cameraPosition),
      cameraTarget: nums(viewport.dataset.cameraTarget),
      fov: viewport.dataset.cameraFov ? Number(viewport.dataset.cameraFov) : null,
      rendererDpr: viewport.dataset.dpr ? Number(viewport.dataset.dpr) : null,
      buffer: nums(viewport.dataset.drawingBuffer),
      stage: {
        width: stage.width,
        height: stage.height,
        background: opaque(viewport),
        pageBackground: opaque(document.querySelector('main')),
        borders: ['top', 'right', 'bottom', 'left'].map(side => parseFloat(style.getPropertyValue('border-' + side + '-width')) || 0)
      },
      runtimeTokens: Object.fromEntries(['paper', 'signal', 'error'].map(token => [token, getComputedStyle(document.documentElement).getPropertyValue('--color-' + token).trim()])),
      sliders,
      hand: triple('tech-hand'),
      target: triple('tech-target'),
      reachState: document.querySelector('[data-testid=reach-status]')?.getAttribute('data-state') ?? '',
      reachText: document.querySelector('[data-testid=reach-status]')?.textContent?.trim() ?? '',
      residualMm: /^[\d.]+ mm$/.test(residualText) ? parseFloat(residualText) : null,
      jointText,
      activeJoint: active && activeLabel ? {
        name: active.querySelector<HTMLInputElement>('input')?.dataset.testid?.replace('joint-slider-', '') ?? '',
        weight: Number(getComputedStyle(activeLabel).fontWeight),
        markerWidth: parseFloat(marker?.width ?? '0') || 0,
        markerHeight: parseFloat(marker?.height ?? '0') || 0
      } : null,
      poseCount: document.querySelectorAll('[data-testid^="trajectory-keyframe-"]').length,
      progress: progress ? {
        t: Number(progress.dataset.t),
        duration: Number(progress.dataset.duration)
      } : null,
      message: document.querySelector('[data-testid=trajectory-message]')?.textContent?.trim() ?? '',
      exportedTrajectory: document.querySelector<HTMLTextAreaElement>('[data-testid=trajectory-export-json]')?.value ?? null,
      publicText: copy.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      resources: performance.getEntriesByType('resource').map(entry => entry.name).filter(url => /\/models\/so101\//.test(url))
    };
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    await settle();
    const before = profile === 'unavailable' ? null : await observedState();
    const measured = await measure();
    const first = await pixels(page);
    await page.waitForTimeout(250);
    const second = await pixels(page);
    const after = profile === 'unavailable' ? null : await observedState();
    if (profile !== 'unavailable' && (!after?.coherent || before?.signature !== after.signature || first?.hash !== second?.hash)) continue;
    return playgroundReadingSchema.parse({
      ...measured,
      id,
      profile,
      steps,
      pixels: first ? {
        ...first,
        repeatHash: second?.hash ?? ''
      } : null
    });
  }
  throw Error('Rendered graph, controls and framebuffer did not form a stable reading: ' + id);
}
