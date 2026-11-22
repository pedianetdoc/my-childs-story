/**
 * Question screening deny-list — spec.md rule 4.6.5.
 *
 * Applies ONLY to clarification `question` and `reason`. It must never be used to
 * filter or alter the parent's own words (`text` / `sourceQuote`).
 *
 * The spec's examples are listed first; the rest are their plain inflections and
 * a few terms from the same classes (diagnostic labels, severity/urgency words,
 * treatment advice). PENDING CLINICIAN REVIEW — do not add clinical terms without it.
 *
 * Matching is case-insensitive and whole-word/phrase (so "normally" is not blocked
 * by "normal", but "Normal" is).
 */
export const QUESTION_DENY_LIST: readonly string[] = [
  // Spec 4.6.5 examples
  'autism',
  'asd',
  'adhd',
  'delay',
  'disorder',
  'normal',
  'abnormal',
  'red flag',
  'urgent',
  'therapy',
  'medication',
  // Inflections of the spec examples
  'autistic',
  'delays',
  'delayed',
  'disorders',
  'abnormality',
  'abnormalities',
  'red flags',
  'urgently',
  'urgency',
  'therapies',
  'therapist',
  'medications',
  'medicine',
  // Same classes: diagnosis, severity, urgency
  'diagnosis',
  'diagnose',
  'diagnosed',
  'severe',
  'severity',
  'emergency',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DENY_PATTERNS: readonly RegExp[] = QUESTION_DENY_LIST.map(
  (term) =>
    new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(term).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`,
      'iu',
    ),
);

export function containsDeniedTerm(value: string): boolean {
  const text = value.normalize('NFC');
  return DENY_PATTERNS.some((pattern) => pattern.test(text));
}

const URL_PATTERNS: readonly RegExp[] = [
  /[a-z][a-z0-9+.-]*:\/\//i, // any scheme://
  /\bwww\./i,
  /\bmailto:/i,
  // Bare domains with a common TLD, e.g. "example.com" or "site.com.ph/page"
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|ph|io|gov|edu|info|co|me|app|ly|link|xyz)\b/i,
];

export function containsUrl(value: string): boolean {
  return URL_PATTERNS.some((pattern) => pattern.test(value));
}
