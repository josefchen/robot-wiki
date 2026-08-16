import { describe, expect, it } from 'vitest';
import {
  applyTitleMismatchException,
  compareTitles,
  decodeHtmlEntities,
  extractHtmlTitle,
  formatRedirectChain,
  isAuditFailure,
  parseArchivalCapture,
  pdfFirstPageTitle,
  type CitationAuditResult,
} from '@/lib/citation-audit';
import type { LinkCheckException } from '@/lib/citation-links';

describe('parseArchivalCapture', () => {
  it('recognizes a dated capture of an http-only canonical source', () => {
    // The sanctioned Bitter Lesson pattern (library/content-quality.md).
    expect(
      parseArchivalCapture(
        'https://web.archive.org/web/20241231102234/http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
      ),
    ).toEqual({
      timestamp: '20241231102234',
      originalUrl: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
    });
  });

  it('recognizes captures of https originals and id_ timestamps', () => {
    expect(
      parseArchivalCapture('https://web.archive.org/web/20260115093000id_/https://arxiv.org/abs/2304.13705'),
    ).toEqual({
      timestamp: '20260115093000',
      originalUrl: 'https://arxiv.org/abs/2304.13705',
    });
  });

  it('rejects ordinary https URLs', () => {
    expect(parseArchivalCapture('https://arxiv.org/abs/2304.13705')).toBeNull();
    expect(parseArchivalCapture('https://web.archive.org/web/*/http://example.com')).toBeNull();
  });
});

describe('formatRedirectChain', () => {
  it('renders a direct fetch as its status alone', () => {
    expect(formatRedirectChain([{ status: 200, url: 'https://a.org/p' }], 'https://a.org/p')).toBe(
      '200',
    );
  });

  it('renders every hop and the final url', () => {
    const chain = [
      { status: 302, url: 'https://doi.org/10.1/x' },
      { status: 301, url: 'https://pub.org/doi/10.1/x' },
      { status: 200, url: 'https://pub.org/article/x' },
    ];
    expect(formatRedirectChain(chain, 'https://pub.org/article/x')).toBe(
      '302 -> 301 -> 200 https://pub.org/article/x',
    );
  });

  it('renders an empty chain as status 0', () => {
    expect(formatRedirectChain([], '')).toBe('0');
  });
});

describe('compareTitles', () => {
  it('matches an exact arXiv abs title', () => {
    expect(
      compareTitles(
        'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
        '[2304.13705] Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
      ),
    ).toBe('match');
  });

  it('matches a site-suffixed page title by containment', () => {
    expect(
      compareTitles(
        'Yann LeCun\'s AMI Labs raises $1.03B to build world models',
        "Yann LeCun's AMI Labs raises $1.03B to build world models | TechCrunch",
      ),
    ).toBe('match');
  });

  it('matches a short page title inside a descriptive registry label', () => {
    expect(
      compareTitles(
        'Helix (System 1 / System 2 humanoid VLA announcement)',
        'Helix',
        'blog',
      ),
    ).toBe('match');
  });

  it('rejects a page that serves a different paper', () => {
    expect(
      compareTitles(
        'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
        'Diffusion Policy: Visuomotor Policy Learning via Action Diffusion',
      ),
    ).toBe('mismatch');
  });

  it('rejects sibling papers that differ only in a number', () => {
    // RT-1 vs RT-2 share every word except the digit; word overlap alone
    // would pass the wrong sibling.
    expect(
      compareTitles(
        'RT-1: Robotics Transformer for Real-World Control at Scale',
        'RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control',
      ),
    ).toBe('mismatch');
  });

  it('accepts matching numbers across punctuation drift', () => {
    expect(compareTitles('V-JEPA 2: Self-Supervised Video Models', 'V-JEPA 2: self-supervised video models')).toBe(
      'match',
    );
  });

  it('is unavailable for generic interstitial titles', () => {
    for (const generic of ['Just a moment...', 'Client Challenge', 'Redirecting', '']) {
      expect(compareTitles('Some Paper Title', generic)).toBe('unavailable');
    }
  });

  it('is unavailable when the registry title has no comparable tokens', () => {
    expect(compareTitles('—', 'Some Page')).toBe('unavailable');
  });

  it('gives docs/blog/press label titles a lighter bar than papers', () => {
    // A docs label ("LeRobot Documentation") against the page's own title
    // ("LeRobot · Hugging Face") matches for docs but not for a paper.
    expect(compareTitles('LeRobot Documentation', 'LeRobot · Hugging Face', 'docs')).toBe('match');
    expect(compareTitles('LeRobot Documentation', 'LeRobot · Hugging Face', 'paper')).toBe('mismatch');
  });

  it('still rejects a docs label with no overlap at all', () => {
    expect(compareTitles('GTSAM: Georgia Tech Smoothing and Mapping', 'GTSAM | Open-source robotics toolbox and tutorials', 'docs')).toBe(
      'mismatch',
    );
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes the entities that appear in real titles', () => {
    expect(decodeHtmlEntities('A &amp; B &lt;C&gt; &#x27;D&#39; &quot;E&quot;')).toBe(
      "A & B <C> 'D' \"E\"",
    );
  });

  it('leaves unknown entities intact', () => {
    expect(decodeHtmlEntities('A &nosuchentity; B')).toBe('A &nosuchentity; B');
  });
});

describe('extractHtmlTitle', () => {
  it('prefers the scholarly citation_title meta tag', () => {
    const html =
      '<title>Some Journal</title><meta name="citation_title" content="The Real Paper Title">';
    expect(extractHtmlTitle(html)).toBe('The Real Paper Title');
  });

  it('falls back to the title tag, then og:title', () => {
    expect(extractHtmlTitle('<title>Page Title</title>')).toBe('Page Title');
    expect(
      extractHtmlTitle(
        '<meta property="og:title" content="Og Title"><html><body>no title tag</body></html>',
      ),
    ).toBe('Og Title');
  });

  it('decodes entities and collapses whitespace', () => {
    expect(extractHtmlTitle('<title>  A &amp;\n  B </title>')).toBe('A & B');
  });

  it('returns undefined when no title exists', () => {
    expect(extractHtmlTitle('<html><body>nothing</body></html>')).toBeUndefined();
    expect(extractHtmlTitle('<title>   </title>')).toBeUndefined();
  });
});

describe('pdfFirstPageTitle', () => {
  it('joins the opening content lines of a paper first page', () => {
    const text = '\n1\nMEM: Multi-Scale Embodied Memory\nfor Vision Language Action Models\nMarcel Torne\n';
    const title = pdfFirstPageTitle(text);
    expect(title).toContain('MEM: Multi-Scale Embodied Memory for Vision Language Action Models');
  });

  it('undoes PDF small-caps letterspacing', () => {
    const text =
      'Published as a conference paper at ICLR 2026\nROBO C ASA 365: A L ARGE -S CALE S IMULATION F RAMEWORK\nSoroush Nasiriany\n';
    const title = pdfFirstPageTitle(text);
    expect(title).toContain('ROBO CASA 365: A LARGE -SCALE SIMULATION FRAMEWORK');
  });

  it('rejects garbled text from PDFs without a usable text layer', () => {
    // Early-LaTeX Type 3 fonts extract as symbol soup: a candidate dominated
    // by characters no real title uses is not a title.
    const gibberish = '±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏ ÐÑÒÓÔÕÖ×ØÙÚÛÜÝ';
    expect(pdfFirstPageTitle(gibberish)).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(pdfFirstPageTitle('')).toBeUndefined();
    expect(pdfFirstPageTitle('2\n')).toBeUndefined();
  });
});

const OK_RESULT: CitationAuditResult = {
  id: 'x',
  url: 'https://example.com/paper',
  verdict: 'live',
  status: 200,
  chain: [{ status: 200, url: 'https://example.com/paper' }],
  finalUrl: 'https://example.com/paper',
  titleComparison: 'match',
};

describe('isAuditFailure', () => {
  it('passes a live entry with a matching title', () => {
    expect(isAuditFailure(OK_RESULT)).toBe(false);
  });

  it('fails dead, unresolved blocked/error, and unexcepted mismatches', () => {
    expect(isAuditFailure({ ...OK_RESULT, verdict: 'dead', status: 404 })).toBe(true);
    expect(isAuditFailure({ ...OK_RESULT, verdict: 'blocked', status: 403 })).toBe(true);
    expect(isAuditFailure({ ...OK_RESULT, verdict: 'error', status: 0 })).toBe(true);
    expect(isAuditFailure({ ...OK_RESULT, titleComparison: 'mismatch' })).toBe(true);
  });

  it('passes entries resolved by crossref or a documented exception', () => {
    expect(
      isAuditFailure({
        ...OK_RESULT,
        verdict: 'blocked',
        status: 403,
        resolvedBy: 'crossref',
      }),
    ).toBe(false);
    expect(
      isAuditFailure({
        ...OK_RESULT,
        titleComparison: 'mismatch',
        resolvedBy: 'exception',
      }),
    ).toBe(false);
  });

  it('passes an honest title-unavailable (no evidence either way)', () => {
    expect(isAuditFailure({ ...OK_RESULT, titleComparison: 'unavailable' })).toBe(false);
  });
});

const TITLE_EXCEPTION: LinkCheckException = {
  id: 'x',
  covers: ['title-mismatch'],
  reason: 'Page title tag is a tagline; the registry cites the project name.',
  verifiedBy: 'Page body states the project name (fetched 2026-08-16).',
  verifiedOn: '2026-08-16',
};

describe('applyTitleMismatchException', () => {
  const mismatch: CitationAuditResult = { ...OK_RESULT, titleComparison: 'mismatch' };

  it('resolves a covered mismatch with its recorded evidence', () => {
    const resolved = applyTitleMismatchException(mismatch, TITLE_EXCEPTION);
    expect(resolved.resolvedBy).toBe('exception');
    expect(resolved.resolutionNote).toContain('tagline');
  });

  it('never touches non-mismatch results or uncovered exceptions', () => {
    expect(applyTitleMismatchException(OK_RESULT, TITLE_EXCEPTION)).toBe(OK_RESULT);
    const blockedOnly: LinkCheckException = { ...TITLE_EXCEPTION, covers: ['blocked'] };
    expect(applyTitleMismatchException(mismatch, blockedOnly)).toBe(mismatch);
  });

  it('ignores exceptions written for another entry', () => {
    const other: LinkCheckException = { ...TITLE_EXCEPTION, id: 'someone-else' };
    expect(applyTitleMismatchException(mismatch, other)).toBe(mismatch);
    expect(applyTitleMismatchException(mismatch, undefined)).toBe(mismatch);
  });
});
