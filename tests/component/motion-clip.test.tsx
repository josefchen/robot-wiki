import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('describes the video itself and gives its poster still an alt text', () => {
    render(<Clip id="kalman-episode" />);
    const video = document.querySelector('video');
    const describedBy = video?.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy ?? '')?.textContent).toContain(
      clip.textAlternative,
    );
    const poster = document.querySelector('img[data-motion-clip-poster]');
    expect(poster?.getAttribute('alt')).toBe(`${clip.title}: final frame`);
  });

  it('shows the status vocabulary and the teaching sentence', () => {
    render(<Clip id="kalman-episode" />);
    expect(screen.getByText(clip.teaches)).toBeVisible();
    expect(screen.getByText(clip.statusNote)).toBeVisible();
    expect(clip.statusNote.toLowerCase()).toContain(clip.status);
  });

  it('heads the frame with the kicker and the takeaway headline', () => {
    render(<Clip id="kalman-episode" />);
    const frame = screen.getByRole('region', {
      name: `Cinematic clip: ${clip.title}`,
    });
    expect(
      frame.querySelector('[data-figure-kicker]')?.textContent,
    ).toBe(clip.kicker);
    expect(
      frame.querySelector('[data-figure-heading]')?.textContent,
    ).toContain(clip.headline);
  });

  it('keeps the method in the "How this was made" fold', () => {
    render(<Clip id="kalman-episode" />);
    const fold = screen.getByText('How this was made').closest('details');
    expect(fold).not.toBeNull();
    expect(fold).not.toHaveAttribute('open');
    for (const paragraph of clip.method) {
      expect(fold?.textContent).toContain(paragraph);
    }
  });

  it('plays and pauses the native video from one plain-words button', () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(function (this: HTMLMediaElement) {
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
      });
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(function (this: HTMLMediaElement) {
        this.dispatchEvent(new Event('pause'));
      });
    try {
      render(<Clip id="kalman-episode" />);
      const button = screen.getByRole('button', { name: 'Play the run' });
      expect(button).toHaveTextContent('Play the run');
      fireEvent.click(button);
      expect(play).toHaveBeenCalledTimes(1);
      // jsdom keeps paused true, so the pause path is driven by the event.
      const playing = screen.getByRole('button', { name: 'Pause the run' });
      expect(playing).toHaveTextContent('Pause');
      fireEvent(document.querySelector('video')!, new Event('pause'));
      expect(
        screen.getByRole('button', { name: 'Play the run' }),
      ).toBeInTheDocument();
      expect(document.querySelector('video')).toHaveAttribute('controls');
    } finally {
      play.mockRestore();
      pause.mockRestore();
    }
  });

  it('throws on an unknown clip id rather than rendering nothing', () => {
    expect(() => render(<Clip id="no-such-clip" />)).toThrow();
  });
});
