/**
 * Text normalization for source-quote matching — spec.md rule 4.6.1.
 *
 * Applied identically to the narrative and to every sourceQuote:
 *   - Unicode NFC
 *   - curly double quotes → "   curly single quotes/apostrophes → '
 *   - en/em dashes → -
 *   - … → ...
 *   - runs of whitespace → one space (and trimmed)
 *
 * Matching stays case-sensitive: normalize() never changes letter case.
 */

import { isLeadingConnector } from './leadingConnectors.js';

const DOUBLE_QUOTES = /[“”„‟″]/g; // “ ” „ ‟ ″
const SINGLE_QUOTES = /[‘’‚‛′]/g; // ‘ ’ ‚ ‛ ′
const DASHES = /[–—]/g; // – —
const ELLIPSIS = /…/g; // …
const WHITESPACE_RUN = /\s+/gu;

export function normalize(value: string): string {
  return value
    .normalize('NFC')
    .replace(DOUBLE_QUOTES, '"')
    .replace(SINGLE_QUOTES, "'")
    .replace(DASHES, '-')
    .replace(ELLIPSIS, '...')
    .replace(WHITESPACE_RUN, ' ')
    .trim();
}

/**
 * Splits text into lowercase words with all punctuation removed — used for the
 * rule 4.6.2 check that `text` has the same words as its sourceQuote.
 * Punctuation becomes a word boundary, applied the same way to both strings.
 */
export function toComparableWords(value: string): string[] {
  return normalize(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/u)
    .filter((word) => word.length > 0);
}

/**
 * Rule 4.6.2: the words of `text` must equal the words of `sourceQuote`, or equal
 * them minus ONE leading connector from LEADING_CONNECTORS. Both arguments come
 * from toComparableWords(). Dropping any other word (e.g. a negation such as
 * "not" or "hindi", or trailing words) fails.
 */
export function isMinimallyCleaned(textWords: string[], quoteWords: string[]): boolean {
  if (textWords.length === 0) return false;
  if (wordsEqual(textWords, quoteWords)) return true;
  const [first, ...rest] = quoteWords;
  return first !== undefined && isLeadingConnector(first) && wordsEqual(textWords, rest);
}

function wordsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((word, i) => word === b[i]);
}

/** True when `needle` is a non-empty contiguous run of words inside `haystack`. */
export function isContiguousWordSequence(needle: string[], haystack: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    for (let i = 0; i < needle.length; i += 1) {
      if (haystack[start + i] !== needle[i]) continue outer;
    }
    return true;
  }
  return false;
}
