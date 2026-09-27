import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Clip } from '@/components/motion/clip';
import { getMotionClip } from '@/lib/motion-clips';

/**
 * The clip player contract (VAL-MOTION-018): native controls, preload
 * none, a poster so the reader never downloads video bytes unasked, fixed
 * intrinsic dimensions so activation cannot shift layout, a captions
 * track, a visible status line, and an sr-only transcript. The clip never
 * autoplays and ships without an audio track, so it can never autoplay
 * with sound.
 */
describe('<Clip>', () => {
  const clip = getMotionClip('kalman-episode');

  it('renders a native video with controls and preload none', () => {
    render(<Clip id="kalman-episode" />);
    const video = screen.getByRole('region', {
      name: `Cinematic clip: ${clip.title}`,
    }).querySelector('video');
    expect(video).not.toBeNull();
    expect(video).not.toHaveAttribute('role');
    expect(video).toHaveAttribute('aria-label', `${clip.title} (${clip.status})`);
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('preload', 'none');
  });

  it('never sets an autoplay attribute', () => {
    render(<Clip id="kalman-episode" />);
    const video = document.querySelector('video');
    expect(video?.hasAttribute('autoplay')).toBe(false);
  });

  it('pins the poster and the intrinsic stage size', () => {
    render(<Clip id="kalman-episode" />);
    const video = document.querySelector('video');
    expect(video?.getAttribute('poster')).toBe(clip.files.poster);
    expect(video?.getAttribute('width')).toBe(String(clip.width));
    expect(video?.getAttribute('height')).toBe(String(clip.height));
  });

  it('offers webm and mp4 sources with a captions track', () => {
    render(<Clip id="kalman-episode" />);
    const video = document.querySelector('video');
    const sources = Array.from(video?.querySelectorAll('source') ?? []);
    expect(sources.map((source) => source.getAttribute('type'))).toEqual([
      'video/webm',
      'video/mp4',
    ]);
    expect(sources.map((source) => source.getAttribute('src'))).toEqual([
      clip.files.webm,
      clip.files.mp4,
    ]);
    const track = video?.querySelector('track');
    expect(track?.getAttribute('kind')).toBe('captions');
    expect(track?.getAttribute('src')).toBe(clip.files.vtt);
    expect(track?.getAttribute('srclang')).toBe('en');
  });

  it('carries the whole transcript as a screen-reader alternative', () => {
    render(<Clip id="kalman-episode" />);
    const frame = screen.getByRole('region', {
      name: `Cinematic clip: ${clip.title}`,
    });
    const describedBy = frame.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const alternative = document.getElementById(describedBy ?? '');
    expect(alternative).not.toBeNull();
    expect(alternative).toHaveClass('sr-only');
    expect(alternative?.textContent).toContain(clip.textAlternative);
  });

  it('shows the status vocabulary and the teaching sentence', () => {
    render(<Clip id="kalman-episode" />);
    expect(screen.getByText(clip.teaches)).toBeVisible();
    expect(document.body.textContent).toContain(clip.status);
  });

  it('throws on an unknown clip id rather than rendering nothing', () => {
    expect(() => render(<Clip id="no-such-clip" />)).toThrow();
  });
});
