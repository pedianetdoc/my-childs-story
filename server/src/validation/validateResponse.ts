/**
 * Full validator for the LLM response — spec.md sections 4.5 and 4.6.
 *
 * Rejects the WHOLE response if any rule fails. Never repairs, filters or returns
 * a partial result. Issues carry a category and a path only — never the offending
 * text — so they are safe to count or log.
 */
import {
  CATEGORY_KEYS,
  OrganizeStoryResponseSchema,
  type OrganizeStoryResponse,
} from '@my-childs-story/shared';
import { containsDeniedTerm, containsUrl } from './questionDenyList.js';
import { isContiguousWordSequence, normalize, toComparableWords } from './normalize.js';

export type ValidationIssueCode =
  | 'schema' // rule 4.6.4: keys, types, length caps, question count, duplicate ids
  | 'source_quote_not_found' // rule 4.6.1
  | 'text_not_in_source_quote' // rule 4.6.2
  | 'question_blocked_term' // rule 4.6.5
  | 'question_contains_url'; // rule 4.6.5

export type ValidationIssue = {
  code: ValidationIssueCode;
  /** Location in the response, e.g. ["categories", "movement", 0, "sourceQuote"]. */
  path: Array<string | number>;
};

export type ValidationResult =
  | { ok: true; value: OrganizeStoryResponse }
  | { ok: false; issues: ValidationIssue[] };

export function validateOrganizeStoryResponse(
  candidate: unknown,
  narrative: string,
): ValidationResult {
  const parsed = OrganizeStoryResponseSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'schema',
        path: issue.path.map((segment) =>
          typeof segment === 'number' ? segment : String(segment),
        ),
      })),
    };
  }

  const response = parsed.data;
  const issues: ValidationIssue[] = [];
  const normalizedNarrative = normalize(narrative);

  for (const key of CATEGORY_KEYS) {
    response.categories[key].forEach((item, index) => {
      const basePath = ['categories', key, index];

      // Rule 4.6.1: sourceQuote must be a contiguous, case-sensitive substring
      // of the narrative after normalization of both.
      const normalizedQuote = normalize(item.sourceQuote);
      if (normalizedQuote.length === 0 || !normalizedNarrative.includes(normalizedQuote)) {
        issues.push({ code: 'source_quote_not_found', path: [...basePath, 'sourceQuote'] });
      }

      // Rule 4.6.2: text, lowercased with punctuation removed, must be a
      // contiguous word sequence within its sourceQuote (no paraphrase/translation).
      if (
        !isContiguousWordSequence(
          toComparableWords(item.text),
          toComparableWords(item.sourceQuote),
        )
      ) {
        issues.push({ code: 'text_not_in_source_quote', path: [...basePath, 'text'] });
      }
    });
  }

  // Rule 4.6.5: screening applies to question and reason ONLY.
  response.clarificationQuestions.forEach((q, index) => {
    for (const field of ['question', 'reason'] as const) {
      const path = ['clarificationQuestions', index, field];
      if (containsDeniedTerm(q[field])) issues.push({ code: 'question_blocked_term', path });
      if (containsUrl(q[field])) issues.push({ code: 'question_contains_url', path });
    }
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: response };
}
