import { describe, expect, it } from 'vitest';
import {
  foldGreekToAscii,
  hasGreekLetter,
} from '@/lib/greek-transliteration';

describe('foldGreekToAscii', () => {
  it('folds the wiki model family to the spelling a reader types', () => {
    expect(foldGreekToAscii('\u03c00')).toBe('pi0');
    expect(foldGreekToAscii('\u03c00-FAST')).toBe('pi0-fast');
    expect(foldGreekToAscii('\u03c00.5')).toBe('pi0.5');
    expect(foldGreekToAscii('\u03c00.6')).toBe('pi0.6');
    expect(foldGreekToAscii('\u03c00.7')).toBe('pi0.7');
  });

  it('folds the letters the wiki uses in symbols and prose', () => {
    expect(foldGreekToAscii('\u03bc')).toBe('mu');
    expect(foldGreekToAscii('\u0394q')).toBe('deltaq');
    expect(foldGreekToAscii('\u03c3')).toBe('s');
    // Final sigma folds to the same letter as medial sigma.
    expect(foldGreekToAscii('\u03c2')).toBe('s');
  });

  it('is idempotent on already-ASCII input beyond lowercasing', () => {
    expect(foldGreekToAscii('pi0.5')).toBe('pi0.5');
    expect(foldGreekToAscii('GR00T N1.7')).toBe('gr00t n1.7');
    expect(foldGreekToAscii(foldGreekToAscii('\u03c00.7'))).toBe('pi0.7');
  });

  it('leaves non-Greek punctuation and digits intact', () => {
    expect(foldGreekToAscii('sim-to-real')).toBe('sim-to-real');
    expect(foldGreekToAscii('v1.1')).toBe('v1.1');
  });
});

describe('hasGreekLetter', () => {
  it('detects a Greek letter regardless of case', () => {
    expect(hasGreekLetter('\u03c00.5')).toBe(true);
    expect(hasGreekLetter('\u03a0')).toBe(true);
    expect(hasGreekLetter('\u0394q')).toBe(true);
  });

  it('is false for pure ASCII', () => {
    expect(hasGreekLetter('pi0.5')).toBe(false);
    expect(hasGreekLetter('')).toBe(false);
  });
});
