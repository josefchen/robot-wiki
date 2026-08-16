import { describe, expect, it } from 'vitest';
import {
  dashLines,
  findBannedVocabulary,
  findPlaceholderMarkers,
  ruleOfThreeDensity,
  RULE_OF_THREE_LIMIT,
} from '@/lib/no-slop';

describe('findPlaceholderMarkers (VAL-BUILD-004)', () => {
  it('finds each placeholder marker in rendered HTML', () => {
    const html = '<main><p>lorem ipsum</p><p>TODO: fix</p></main>';
    expect(findPlaceholderMarkers(html)).toContain('lorem');
    expect(findPlaceholderMarkers(html)).toContain('TODO');
  });

  it('finds FIXME and coming soon', () => {
    const html = '<p>FIXME later</p><p>More modules coming soon</p>';
    expect(findPlaceholderMarkers(html)).toEqual(
      expect.arrayContaining(['FIXME', 'coming soon']),
    );
  });

  it('finds raw un-rendered MDX component tags', () => {
    const html = '<p>See &lt;Figure id="x" /&gt; below.</p>';
    expect(findPlaceholderMarkers(html)).toContain('raw <Figure> tag');
  });

  it('ignores markers inside script and style blocks', () => {
    const html =
      '<script>const x = "lorem";</script><style>/* TODO */</style><p>Real prose.</p>';
    expect(findPlaceholderMarkers(html)).toEqual([]);
  });

  it('passes clean HTML', () => {
    expect(
      findPlaceholderMarkers(
        '<p>Diffusion policies denoise action chunks.</p>',
      ),
    ).toEqual([]);
  });
});

describe('banned vocabulary (VAL-BUILD-007)', () => {
  it('flags promotional vocabulary in prose with a line number', () => {
    const body =
      'First line.\nThis game-changing approach unlocks new capabilities.\n';
    const findings = findBannedVocabulary(body);
    expect(findings.map((f) => f.word)).toEqual(
      expect.arrayContaining(['game-changing', 'unlocks']),
    );
    expect(findings[0].line).toBe(2);
  });

  it('flags inflated-significance and vague-attribution markers', () => {
    const body = 'A testament to progress. Critics say otherwise.';
    const words = findBannedVocabulary(body).map((f) => f.word);
    expect(words).toContain('testament');
    expect(words).toContain('critics');
  });

  it('ignores banned words inside code spans and fenced code', () => {
    const body =
      'Use `unlock()` to open it.\n\n```\nconst landscape = 1; // delve\n```\n';
    expect(findBannedVocabulary(body)).toEqual([]);
  });

  it('ignores banned words inside URLs', () => {
    expect(findBannedVocabulary('See https://example.com/delve/now')).toEqual(
      [],
    );
  });

  it('passes clean technical prose', () => {
    expect(
      findBannedVocabulary(
        'The policy executes at 50 Hz with a chunk size of 100.',
      ),
    ).toEqual([]);
  });
});

describe('dash ban in prose (VAL-BUILD-007)', () => {
  it('reports the line of an em dash in prose', () => {
    expect(dashLines('line one\nan em dash — here')).toEqual([2]);
  });

  it('reports en dashes too', () => {
    expect(dashLines('a range 3–5 in prose')).toEqual([1]);
  });

  it('ignores dashes inside code and JSX attributes', () => {
    expect(dashLines('`a — b`\n\n```\nx — y\n```')).toEqual([]);
  });
});

describe('rule-of-three density (VAL-BUILD-007)', () => {
  it('returns zero for short bodies', () => {
    expect(ruleOfThreeDensity('short body')).toBe(0);
  });

  it('scores a triad-heavy text above a normal one', () => {
    const triads = Array.from(
      { length: 40 },
      () =>
        'It covers a, b, and c for readers who want d, e, and f across g, h, and i quickly.',
    ).join(' ');
    const plain = Array.from(
      { length: 40 },
      () =>
        'The policy predicts action chunks and executes them at a fixed rate with measured latency.',
    ).join(' ');
    expect(ruleOfThreeDensity(triads)).toBeGreaterThan(
      ruleOfThreeDensity(plain),
    );
    expect(ruleOfThreeDensity(triads)).toBeGreaterThan(RULE_OF_THREE_LIMIT);
    expect(ruleOfThreeDensity(plain)).toBeLessThan(RULE_OF_THREE_LIMIT);
  });
});
