/**
 * Client-side input validation — spec 4.1, 4.3, AC-02. Uses the same shared
 * schemas as the server, so both sides agree on the limits.
 */
import {
  ChildAgeSchema,
  NarrativeSchema,
  type AgeUnit,
  type OrganizeStoryRequest,
} from '@my-childs-story/shared';

export type StoryInput = { ageText: string; unit: AgeUnit; narrative: string };
export type StoryInputErrors = { age?: string; narrative?: string };

export type StoryInputValidation =
  | { ok: true; request: OrganizeStoryRequest }
  | { ok: false; errors: StoryInputErrors };

const NUMBER_PATTERN = /^\d+(\.\d+)?$/;

export const MESSAGES = {
  ageMissing: 'Please enter your child’s age.',
  ageNotNumber: 'Please enter the age as a number, for example 2.5.',
  narrativeMissing: 'Please write or dictate your child’s story.',
} as const;

function validateAge(ageText: string, unit: AgeUnit): { value?: number; error?: string } {
  const trimmed = ageText.trim();
  if (trimmed === '') return { error: MESSAGES.ageMissing };
  if (!NUMBER_PATTERN.test(trimmed)) return { error: MESSAGES.ageNotNumber };
  const value = Number(trimmed);
  const parsed = ChildAgeSchema.safeParse({ value, unit });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? MESSAGES.ageNotNumber };
  return { value };
}

function validateNarrative(narrative: string): string | undefined {
  if (narrative.trim() === '') return MESSAGES.narrativeMissing;
  const parsed = NarrativeSchema.safeParse(narrative);
  return parsed.success ? undefined : (parsed.error.issues[0]?.message ?? MESSAGES.narrativeMissing);
}

export function validateStoryInput(input: StoryInput): StoryInputValidation {
  const age = validateAge(input.ageText, input.unit);
  const narrativeError = validateNarrative(input.narrative);
  if (age.error || narrativeError || age.value === undefined) {
    return {
      ok: false,
      errors: {
        ...(age.error && { age: age.error }),
        ...(narrativeError && { narrative: narrativeError }),
      },
    };
  }
  return {
    ok: true,
    request: { childAge: { value: age.value, unit: input.unit }, narrative: input.narrative },
  };
}
