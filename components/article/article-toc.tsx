'use client';

import { useEffect, useState } from 'react';
import type { OutlineItem } from '@/lib/article-outline';

type ArticleTocProps = {
  /** The server outline: every H2 with its rehype-slug id. */
  items: readonly OutlineItem[];
  /** The id of the body start, linked as "Introduction". */
  startId: string;
};

const BODY_HEADINGS = '[data-article-body] h2[id]';

/**
 * The article's contents: a sticky left rail from 1200px and a "Contents"
 * disclosure at the head of the body below that. Plain Geist, muted, with
 * the section being read in ink (aria-current="location").
 *
 * The server outline is the prerendered list, so the rail works without
 * script. After hydration the rail re-reads the rendered headings, which
 * are the ids the links must hit.
 */
export function ArticleToc({ items: initial, startId }: ArticleTocProps) {
  const [items, setItems] = useState<readonly OutlineItem[]>(initial);
  const [current, setCurrent] = useState<string>(startId);

  useEffect(() => {
    // Read once the hydrated body has painted, from a frame callback rather
    // than the effect body, so the rail never renders twice in one commit.
    const frame = requestAnimationFrame(() => {
      const rendered = [...document.querySelectorAll<HTMLElement>(BODY_HEADINGS)].map(
        (heading) => ({
          id: heading.id,
          text: (heading.getAttribute('aria-label') ?? heading.textContent ?? '').trim(),
        }),
      );
      const same =
        rendered.length === initial.length &&
        rendered.every((item, index) => item.id === initial[index].id);
      if (!same && rendered.length > 0) setItems(rendered);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = Math.min(window.innerHeight * 0.3, 220);
      let active = startId;
      for (const item of items) {
        const heading = document.getElementById(item.id);
        if (heading && heading.getBoundingClientRect().top <= line) active = item.id;
      }
      setCurrent(active);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [items, startId]);

  if (items.length === 0) return null;

  const entries = [{ id: startId, text: 'Introduction' }, ...items];
  const list = (
    <ol>
      {entries.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={current === item.id ? 'location' : undefined}
            data-brand-control-id="control:link-focus"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div data-article-rail data-pagefind-ignore>
      <nav aria-label="Contents" className="article-toc">
        {list}
      </nav>
      <details className="article-contents">
        <summary data-brand-control-id="control:secondary-action">Contents</summary>
        <nav aria-label="Contents">{list}</nav>
      </details>
    </div>
  );
}
