import { describe, expect, it } from 'vitest';
import {
  WORDS_PER_MINUTE,
  countVisibleWords,
  countWordsInMdxSource,
  readingTimeMinutes,
} from '@/lib/reading-time';

describe('WORDS_PER_MINUTE', () => {
  it('is the documented rate of 200 words per minute', () => {
    // Single named constant: every reading-time derivation (template,
    // tests, validators) must go through this value, never a per-article
    // number. Changing it here changes every article's estimate.
    expect(WORDS_PER_MINUTE).toBe(200);
  });
});

describe('readingTimeMinutes', () => {
  it('derives minutes directly from the documented rate', () => {
    expect(readingTimeMinutes(WORDS_PER_MINUTE)).toBe(1);
    expect(readingTimeMinutes(5 * WORDS_PER_MINUTE)).toBe(5);
    expect(readingTimeMinutes(20 * WORDS_PER_MINUTE)).toBe(20);
  });

  it('rounds to the nearest whole minute, never to a coarser unit', () => {
    expect(readingTimeMinutes(299)).toBe(1); // 1.495 -> 1
    expect(readingTimeMinutes(300)).toBe(2); // 1.5 -> 2
    expect(readingTimeMinutes(450)).toBe(2); // 2.25 -> 2
    expect(readingTimeMinutes(499)).toBe(2); // 2.495 -> 2
    expect(readingTimeMinutes(500)).toBe(3); // 2.5 -> 3, no even-minute bias
  });

  it('never reports zero or a fractional value', () => {
    expect(readingTimeMinutes(0)).toBe(1);
    expect(readingTimeMinutes(1)).toBe(1);
    expect(readingTimeMinutes(WORDS_PER_MINUTE - 1)).toBe(1);
    for (const words of [0, 37, 250, 1001, 4321]) {
      expect(Number.isInteger(readingTimeMinutes(words))).toBe(true);
      expect(readingTimeMinutes(words)).toBeGreaterThanOrEqual(1);
    }
  });

  it('stays within one minute of the exact rate for any word count', () => {
    for (const words of [0, 1, 100, 199, 200, 201, 999, 1234, 5000, 12345]) {
      const minutes = readingTimeMinutes(words);
      expect(Math.abs(minutes - words / WORDS_PER_MINUTE)).toBeLessThanOrEqual(1);
    }
  });

  it('word counts two full minutes apart never collapse to the same value', () => {
    for (let words = 0; words < 6000; words += 137) {
      expect(
        readingTimeMinutes(words + 2 * WORDS_PER_MINUTE),
      ).toBeGreaterThan(readingTimeMinutes(words));
    }
  });
});

describe('countVisibleWords', () => {
  it('counts whitespace-separated tokens across block elements', () => {
    expect(
      countVisibleWords(
        '<h2>ACT: chunking with a CVAE</h2><p>The encoder reads the sequence.</p>',
      ),
    ).toBe(10);
  });

  it('treats nested elements and line breaks as one text flow', () => {
    expect(
      countVisibleWords('<p>one <strong>two three</strong><br/>four</p>'),
    ).toBe(4);
  });

  it('ignores script, style and template content', () => {
    const markup =
      '<style>.x { color: red; }</style>' +
      '<p>visible words here</p>' +
      '<script>var hidden = 1;</script>' +
      '<template><p>never rendered</p></template>';
    expect(countVisibleWords(markup)).toBe(3);
  });

  it('excludes subtrees hidden at rest via the hidden attribute', () => {
    expect(
      countVisibleWords(
        '<p>count me</p><div hidden>do not count these words</div>',
      ),
    ).toBe(2);
  });

  it('excludes citation tooltips hidden with the Tailwind hidden class', () => {
    // Mirrors components/ui/cite.tsx: the tooltip is display:none until
    // hover or focus, so a reader never reads it. Counting it would add
    // ~20 words per citation. Nested spans inside the tooltip stay
    // excluded too.
    const markup =
      '<p>claim ' +
      '<span class="group relative inline-block align-baseline">' +
      '<span class="inline-flex items-stretch overflow-hidden">' +
      '<a href="https://example.com">Zhao 2023</a>' +
      '</span>' +
      '<span role="tooltip" class="absolute bottom-full left-0 z-20 mb-1.5 hidden w-64 group-hover:block group-focus-within:block">' +
      '<span class="block font-medium">Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware</span>' +
      '<span class="mt-0.5 block text-text-dim">Zhao et al., RSS, 2023.</span>' +
      '</span>' +
      '</span>' +
      ' supported.</p>';
    expect(countVisibleWords(markup)).toBe(4); // claim Zhao 2023 supported.
  });

  it('counts elements hidden only below a breakpoint (hidden sm:block)', () => {
    // Visible at the desktop viewport the estimates are verified against.
    expect(
      countVisibleWords(
        '<span class="hidden sm:block">desktop visible label</span> tail',
      ),
    ).toBe(4);
  });

  it('counts KaTeX the way innerText does: both rendered layers, once each', () => {
    // The browser's innerText is rendering-based, not accessibility-based:
    // it reports the aria-hidden visual layer too, and skips only what is
    // not rendered (the TeX <annotation>, handled by the walker). So each
    // formula contributes its MathML copy plus its visual copy.
    expect(
      countVisibleWords(
        '<span class="katex"><span class="katex-mathml">a plus b</span>' +
          '<span aria-hidden="true" class="katex-html">a plus b</span></span>',
      ),
    ).toBe(6);
  });

  it('counts aria-hidden text that is still rendered (innerText semantics)', () => {
    expect(
      countVisibleWords(
        '<p>before <span aria-hidden="true">icon glyph noise</span> after</p>',
      ),
    ).toBe(5);
  });

  it('decodes HTML entities before tokenizing', () => {
    // &nbsp; is whitespace to a word split once decoded; &amp; is a word.
    expect(countVisibleWords('<p>Zhao &amp; Fu&nbsp;et&nbsp;al.</p>')).toBe(5);
    expect(countVisibleWords('<p>a&#160;b &#x26; c</p>')).toBe(4);
  });

  it('counts SVG text labels but not SVG metadata', () => {
    expect(
      countVisibleWords(
        '<svg role="img"><title>not rendered</title><desc>also not rendered</desc>' +
          '<text>axis label</text></svg><p>body</p>',
      ),
    ).toBe(3);
  });

  it('excludes annotation TeX but keeps the rendered MathML', () => {
    expect(
      countVisibleWords(
        '<math><semantics><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow>' +
          '<annotation encoding="application/x-tex">a + b</annotation>' +
          '</semantics></math>',
      ),
    ).toBe(3);
  });

  it('returns zero for empty markup', () => {
    expect(countVisibleWords('')).toBe(0);
    expect(countVisibleWords('<div><span></span></div>')).toBe(0);
  });
});

describe('countWordsInMdxSource', () => {
  it('counts prose text with markdown syntax removed', () => {
    expect(
      countWordsInMdxSource('## ACT: chunking\n\nThe encoder reads the sequence.'),
    ).toBe(7);
  });

  it('drops import and export lines', () => {
    const body =
      "import { ChunkSizeCurve } from '@/components/interactive/chunk-size-curve';\n\n" +
      'export const unused = 1;\n\nReal prose here.';
    expect(countWordsInMdxSource(body)).toBe(3);
  });

  it('keeps link text but drops the URL', () => {
    expect(
      countWordsInMdxSource('See [the playground](/playground) for more.'),
    ).toBe(5);
  });

  it('keeps fenced and inline code content', () => {
    const body = 'Run `npm install` then:\n\n```bash\nnode scripts/run.ts\n```\n';
    expect(countWordsInMdxSource(body)).toBe(6);
  });

  it('drops JSX tags but keeps their children', () => {
    expect(
      countWordsInMdxSource('<Callout variant="info">Chunking commits early.</Callout>'),
    ).toBe(3);
  });

  it('strips emphasis markers without losing the words', () => {
    expect(countWordsInMdxSource('This is **very** important _indeed_ now.')).toBe(6);
  });

  it('returns zero for an empty body', () => {
    expect(countWordsInMdxSource('')).toBe(0);
  });
});


