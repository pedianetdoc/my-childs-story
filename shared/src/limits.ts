/** Numeric limits from spec.md sections 4.1, 4.3 and 4.5. */

export const NARRATIVE_MIN_CHARS = 20;
export const NARRATIVE_MAX_CHARS = 5000;

export const AGE_MAX = { months: 216, years: 18 } as const;

export const REPORTED_ITEM_MAX_CHARS = 1000;
export const CLARIFICATION_FIELD_MAX_CHARS = 200;
export const MAX_CLARIFICATION_QUESTIONS = 3;

export const CLARIFICATION_IDS = ['q1', 'q2', 'q3'] as const;

/** Length in Unicode code points (not UTF-16 code units), as the spec requires. */
export function codePointLength(value: string): number {
  let count = 0;
  for (const _ of value) count += 1;
  return count;
}

/** True when the number has at most one decimal place (e.g. 2.5, not 2.55). */
export function hasAtMostOneDecimal(value: number): boolean {
  const scaled = value * 10;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}
