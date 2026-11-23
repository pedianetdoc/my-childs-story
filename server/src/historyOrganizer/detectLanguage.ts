/**
 * Decides, in code, which language the clarification questions use — spec 4.5.
 * Deterministic: no model involvement.
 *
 * Counts common Filipino function words as a share of all words. At least 15%
 * → 'fil' (so Taglish counts as Filipino); otherwise 'en'. A Filipino name or
 * kinship word in an English story (e.g. "Lola") does not change the result,
 * because only function words are counted.
 */

export type QuestionLanguage = 'en' | 'fil';

export const FILIPINO_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  'ang', 'ng', 'mga', 'sa', 'na', 'si', 'siya', 'niya', 'ko', 'ako', 'ka', 'mo', 'po',
  'hindi', 'wala', 'ayaw', 'kasi', 'pero', 'tapos', 'din', 'rin', 'lang', 'naman',
  'yung', 'ito', 'iyon', 'ba',
]);

export const FILIPINO_SHARE_THRESHOLD = 0.15;

/** Words: runs of letters (incl. accents), keeping inner hyphens/apostrophes ("nag-aalala", "don't"). */
const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

export function words(text: string): string[] {
  return (text.normalize('NFC').toLowerCase().match(WORD) ?? []);
}

/** Share of words that are Filipino function words (0 for text with no words). */
export function filipinoShare(text: string): number {
  const all = words(text);
  if (all.length === 0) return 0;
  const filipino = all.filter((w) => FILIPINO_FUNCTION_WORDS.has(w)).length;
  return filipino / all.length;
}

export function detectLanguage(text: string): QuestionLanguage {
  return filipinoShare(text) >= FILIPINO_SHARE_THRESHOLD ? 'fil' : 'en';
}

/** The explicit instruction sent to the model for each language. */
export const LANGUAGE_INSTRUCTIONS: Record<QuestionLanguage, string> = {
  en: 'Write every question and reason in English.',
  fil: "Write every question and reason in Filipino, matching the parent's mix of Filipino and English, using polite 'po'.",
};
