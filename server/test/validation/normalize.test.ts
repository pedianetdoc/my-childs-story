import { describe, expect, it } from 'vitest';
import {
  isContiguousWordSequence,
  normalize,
  toComparableWords,
} from '../../src/validation/normalize.js';

describe('normalize (spec 4.6.1)', () => {
  it('converts curly double and single quotes to straight', () => {
    expect(normalize('“mama” and ‘dede’ – he’s')).toBe('"mama" and \'dede\' - he\'s');
  });

  it('converts en and em dashes to hyphen-minus', () => {
    expect(normalize('a – b — c')).toBe('a - b - c');
  });

  it('converts the ellipsis character to three dots', () => {
    expect(normalize('shy…')).toBe('shy...');
  });

  it('collapses whitespace runs, including newlines and non-breaking spaces', () => {
    expect(normalize('  one \n\n two\t three  ')).toBe('one two three');
  });

  it('applies Unicode NFC (decomposed ñ equals composed ñ)', () => {
    expect(normalize('Señor')).toBe('Señor');
  });

  it('does not change letter case', () => {
    expect(normalize('He Said')).toBe('He Said');
  });
});

describe('word comparison helpers (spec 4.6.2)', () => {
  it('lowercases and removes punctuation', () => {
    expect(toComparableWords('He holds, the "spoon".')).toEqual(['he', 'holds', 'the', 'spoon']);
  });

  it('keeps Filipino letters such as ñ', () => {
    expect(toComparableWords('Niño, kumain!')).toEqual(['niño', 'kumain']);
  });

  it('finds contiguous sequences only', () => {
    const hay = ['a', 'b', 'c', 'd'];
    expect(isContiguousWordSequence(['b', 'c'], hay)).toBe(true);
    expect(isContiguousWordSequence(['b', 'd'], hay)).toBe(false);
    expect(isContiguousWordSequence([], hay)).toBe(false);
  });
});
