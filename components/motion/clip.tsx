'use client';

/**
 * Clip: tier (b) of the motion language, a prerecorded cinematic clip.
 *
 * The clip is a plain native video: controls come from the browser, the
 * poster is the prerendered final frame, and preload is none so a page
 * view downloads a poster image, never video bytes. Playback starts only
 * on the reader's click, the clip ships without an audio track (so it can
 * never autoplay with sound), and the intrinsic width and height keep the
 * stage box identical at every viewport width. Captions ship as a WebVTT
 * track on the element and the whole transcript is an sr-only block bound
 * through aria-describedby, so the clip has a complete text alternative
 * without playing it.
 *
 * The clip sits in the shared figure frame, like the live scenes: a
 * one-line title, the video on the graphite stage, one caption, and the
 * status note as the source line. Its beat captions play inside the video,
 * so the frame exports their word counts for the figure check the way a
 * scene does. A playing clip pauses when it leaves the viewport or the tab
 * hides, matching the player contract the live scenes keep.
 */
import { useEffect, useRef, useState } from 'react';
import { FigureStage } from '@/components/motion/figure-frame';
import { InstrumentFigure } from '@/components/ui/instrument';
import { words } from '@/lib/figure-system-paint';
import { getMotionClip } from '@/lib/motion-clips';

export interface ClipProps {
  /** The clip to mount, by id in motion-clips.json. */
  id: string;
  className?: string;
}

export function Clip({ id, className }: ClipProps) {
  const clip = getMotionClip(id);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [posterVisible, setPosterVisible] = useState(true);

  // Pause offscreen and on hidden tabs: the reader's attention, and the
  // machine's frame budget, are not spent on a clip nobody is watching.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const pauseIfPlaying = () => {
      if (!video.paused) video.pause();
    };
    const onVisibility = () => {
      if (document.hidden) pauseIfPlaying();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // The scene player made this exact call before: environments without
    // an IntersectionObserver (older embedders, test runners) still get
    // the visibility pause, they just lose the offscreen pause.
    if (typeof IntersectionObserver === 'undefined') {
      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) pauseIfPlaying();
        }
      },
      { threshold: 0 },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const alternativeId = `motion-clip-${clip.id}-text`;

  return (
    <InstrumentFigure
      as="div"
      figureId={`clip:${clip.id}`}
      data-motion-clip={clip.id}
      data-figure-beat-words={clip.beats
        .map((beat) => words(beat.caption))
        .join(' ')}
      data-pagefind-ignore
      role="region"
      aria-label={`Cinematic clip: ${clip.title}`}
      aria-describedby={alternativeId}
      className={className}
      heading={clip.title}
      stage={
        <FigureStage data-motion-clip-stage>
          <div className="relative">
            <video
              ref={videoRef}
              controls
              preload="none"
              poster={clip.files.poster}
              onLoadedData={() => setPosterVisible(false)}
              width={clip.width}
              height={clip.height}
              playsInline
              aria-label={`${clip.title} (${clip.status})`}
              className="block h-auto w-full"
            >
              <source src={clip.files.webm} type="video/webm" />
              <source src={clip.files.mp4} type="video/mp4" />
              <track
                kind="captions"
                src={clip.files.vtt}
                srcLang="en"
                label="Captions"
              />
            </video>
            {posterVisible && (
              // Chrome can draw an idle spinner over a native poster even
              // after the PNG has loaded. Keep its controls exposed below
              // this inert still until the first frame has decoded.
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[78%] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-motion-clip-poster
                  src={clip.files.poster}
                  alt=""
                  aria-hidden="true"
                  className="block h-auto w-full"
                />
              </div>
            )}
          </div>
        </FigureStage>
      }
      caption={clip.teaches}
      captionProps={{ 'data-testid': 'motion-clip-caption' }}
      source={clip.statusNote}
    >
      <div id={alternativeId} className="sr-only">
        {clip.textAlternative}
      </div>
    </InstrumentFigure>
  );
}
