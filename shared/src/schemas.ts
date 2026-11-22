/**
 * Zod schemas for the API request and the strict LLM response — spec.md 4.3 and 4.5.
 *
 * These schemas check shape, types and length caps only. Deterministic checks that
 * need the narrative (source-quote matching, text-within-quote) and question
 * screening live in server/src/validation/.
 *
 * Error messages never include the submitted values.
 */
import { z } from 'zod';
import { CATEGORY_KEYS, type HistoryCategory } from './categories.js';
import {
  AGE_MAX,
  CLARIFICATION_FIELD_MAX_CHARS,
  CLARIFICATION_IDS,
  MAX_CLARIFICATION_QUESTIONS,
  NARRATIVE_MAX_CHARS,
  NARRATIVE_MIN_CHARS,
  REPORTED_ITEM_MAX_CHARS,
  codePointLength,
  hasAtMostOneDecimal,
} from './limits.js';
import type {
  Clarification,
  OrganizeStoryRequest,
  OrganizeStoryResponse,
  ReportedItem,
} from './types.js';

// ---------------------------------------------------------------------------
// Request (spec 4.3)
// ---------------------------------------------------------------------------

export const ChildAgeSchema = z
  .strictObject({
    value: z
      .number({ error: 'Please enter the age as a number.' })
      .finite({ error: 'Please enter the age as a number.' })
      .min(0, { error: 'Age cannot be negative.' }),
    unit: z.enum(['months', 'years'], { error: 'Please choose months or years.' }),
  })
  .superRefine((age, ctx) => {
    if (!hasAtMostOneDecimal(age.value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Please use at most one decimal place (for example, 2.5).',
      });
    }
    const max = AGE_MAX[age.unit];
    if (age.value > max) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: `Please enter an age from 0 to ${max} ${age.unit}.`,
      });
    }
  });

export const NarrativeSchema = z
  .string({ error: 'Please write or dictate your child’s story.' })
  .superRefine((narrative, ctx) => {
    const length = codePointLength(narrative.trim());
    if (length < NARRATIVE_MIN_CHARS) {
      ctx.addIssue({
        code: 'custom',
        message: `Please write at least ${NARRATIVE_MIN_CHARS} characters.`,
      });
    } else if (length > NARRATIVE_MAX_CHARS) {
      ctx.addIssue({
        code: 'custom',
        message: `The story can be at most ${NARRATIVE_MAX_CHARS} characters.`,
      });
    }
  });

export const OrganizeStoryRequestSchema = z.strictObject({
  childAge: ChildAgeSchema,
  narrative: NarrativeSchema,
});

// ---------------------------------------------------------------------------
// LLM response (spec 4.5, rule 4.6.4)
// ---------------------------------------------------------------------------

export const ReportedItemSchema = z.strictObject({
  text: z.string().min(1).max(REPORTED_ITEM_MAX_CHARS),
  sourceQuote: z.string().min(1).max(REPORTED_ITEM_MAX_CHARS),
});

export const ClarificationSchema = z.strictObject({
  id: z.enum(CLARIFICATION_IDS),
  question: z.string().min(1).max(CLARIFICATION_FIELD_MAX_CHARS),
  reason: z.string().min(1).max(CLARIFICATION_FIELD_MAX_CHARS),
});

const categoryShape = Object.fromEntries(
  CATEGORY_KEYS.map((key) => [key, z.array(ReportedItemSchema)]),
) as Record<HistoryCategory, z.ZodArray<typeof ReportedItemSchema>>;

/** All ten keys required; any extra key is rejected. */
export const CategoriesSchema = z.strictObject(categoryShape);

export const OrganizeStoryResponseSchema = z.strictObject({
  categories: CategoriesSchema,
  clarificationQuestions: z
    .array(ClarificationSchema)
    .max(MAX_CLARIFICATION_QUESTIONS)
    .superRefine((questions, ctx) => {
      const seen = new Set<string>();
      questions.forEach((q, index) => {
        if (seen.has(q.id)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'id'],
            message: 'Duplicate clarification question id.',
          });
        }
        seen.add(q.id);
      });
    }),
});

// ---------------------------------------------------------------------------
// Compile-time guarantees that the schemas match the spec types in types.ts.
// ---------------------------------------------------------------------------

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

export type _RequestMatches = Assert<
  Equals<z.infer<typeof OrganizeStoryRequestSchema>, OrganizeStoryRequest>
>;
export type _ItemMatches = Assert<Equals<z.infer<typeof ReportedItemSchema>, ReportedItem>>;
export type _ClarificationMatches = Assert<
  Equals<z.infer<typeof ClarificationSchema>, Clarification>
>;
export type _ResponseMatches = Assert<
  Equals<z.infer<typeof OrganizeStoryResponseSchema>, OrganizeStoryResponse>
>;
