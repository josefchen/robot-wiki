import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildTypeScript,
  loadManifest,
} from '../../scripts/generate-motion-clips';
import { MOTION_CLIPS } from '../../lib/motion-clips';

const ROOT = join(__dirname, '../..');

/** The manifest stores only the beats; the duration is their sum. */
function durationMsOf(clipId: string): number {
  const clip = loadManifest().clips.find((entry) => entry.id === clipId);
  expect(clip).toBeDefined();
  return clip!.beats.reduce((sum, beat) => sum + beat.durationMs, 0);
}

function committed(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8');
}

function artifactPaths(id: string) {
  return {
    webm: join(ROOT, 'public', 'clips', `${id}.webm`),
    mp4: join(ROOT, 'public', 'clips', `${id}.mp4`),
    poster: join(ROOT, 'public', 'clips', `${id}.png`),
    vtt: join(ROOT, 'public', 'clips', `${id}.vtt`),
    text: join(ROOT, 'public', 'clips', `${id}.txt`),
  } as const;
}

/** Minimal WebVTT parse: header plus cue blocks with timing lines. */
function parseVtt(text: string): Array<{
  start: number;
  end: number;
  text: string;
}> {
  const lines = text.split(/\r?\n/);
  expect(lines[0]).toBe('WEBVTT');
  const cues: Array<{ start: number; end: number; text: string }> = [];
  let index = 1;
  while (index < lines.length) {
    if (lines[index].trim() === '') {
      index += 1;
      continue;
    }
    const timing = lines[index].match(
      /^(\d{2,}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2,}):(\d{2}):(\d{2})\.(\d{3})$/,
    );
    expect(timing).not.toBeNull();
    const parts = timing!.slice(1).map(Number);
    const seconds = (h: number, m: number, s: number, ms: number) =>
      h * 3600 + m * 60 + s + ms / 1000;
    const start = seconds(parts[0], parts[1], parts[2], parts[3]);
    const end = seconds(parts[4], parts[5], parts[6], parts[7]);
    index += 1;
    const body: string[] = [];
    while (index < lines.length && lines[index].trim() !== '') {
      body.push(lines[index]);
      index += 1;
    }
    cues.push({ start, end, text: body.join(' ') });
  }
  return cues;
}

describe('motion clips manifest', () => {
  it('declares at least one clip with beats that add up to its duration', () => {
    const manifest = loadManifest();
    expect(manifest.clips.length).toBeGreaterThanOrEqual(1);
    for (const clip of manifest.clips) {
      expect(clip.beats.length).toBeGreaterThanOrEqual(3);
      const total = clip.beats.reduce(
        (sum, beat) => sum + beat.durationMs,
        0,
      );
      // The generated registry is where the derived duration lives.
      const registered = Object.values(MOTION_CLIPS).find(
        (entry) => entry.id === clip.id,
      );
      expect(registered?.durationMs).toBe(total);
    }
  });

  it('pins the budget at three mebibytes', () => {
    expect(loadManifest().budgetBytes).toBe(3 * 1024 * 1024);
  });

  it('carries the toy-status vocabulary on every clip', () => {
    const vocabulary = [
      'schematic',
      'authored',
      'toy',
      'illustrative',
      'not measured',
    ];
    for (const clip of loadManifest().clips) {
      expect(vocabulary).toContain(clip.status);
    }
  });

  it('generates the committed TypeScript registry without drift', () => {
    expect(buildTypeScript(loadManifest())).toBe(
      committed('lib/motion-clips.ts'),
    );
  });

  it('regenerates identical bytes end to end', () => {
    const before = committed('lib/motion-clips.ts');
    execFileSync('node', ['scripts/generate-motion-clips.ts'], {
      cwd: ROOT,
    });
    expect(committed('lib/motion-clips.ts')).toBe(before);
  });
});

describe('motion clip artifacts', () => {
  for (const clip of loadManifest().clips) {
    describe(clip.id, () => {
      const paths = artifactPaths(clip.id);

      it('ships webm, mp4, poster, captions and a text alternative', () => {
        for (const [name, path] of Object.entries(paths)) {
          expect(existsSync(path), `${name} at ${path}`).toBe(true);
        }
      });

      it('ships a real PNG poster of the declared stage size', () => {
        const bytes = readFileSync(paths.poster);
        expect(bytes.subarray(0, 8)).toEqual(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        );
      });

      it('writes one caption cue per beat, in order, covering the run', () => {
        const cues = parseVtt(readFileSync(paths.vtt, 'utf8'));
        expect(cues.length).toBe(clip.beats.length);
        let cursor = 0;
        clip.beats.forEach((beat, index) => {
          expect(cues[index].start).toBeCloseTo(cursor, 2);
          expect(cues[index].end).toBeCloseTo(
            cursor + beat.durationMs / 1000,
            2,
          );
          expect(cues[index].text).toBe(beat.caption);
          cursor += beat.durationMs / 1000;
        });
        expect(cursor).toBeCloseTo(durationMsOf(clip.id) / 1000, 2);
      });

      it('writes the text alternative as a readable transcript file', () => {
        const text = readFileSync(paths.text, 'utf8');
        expect(text).toContain(clip.title);
        for (const beat of clip.beats) {
          expect(text).toContain(beat.caption);
        }
      });
    });
  }
});
