/**
 * Fixed category schema — spec.md section 4.4.
 *
 * This is the single source of truth for category keys, their order and their
 * parent-facing labels. Never hardcode category keys or labels elsewhere.
 */

/** Category keys in the exact display/export order required by the spec. */
export const CATEGORY_KEYS = [
  'main_concerns',
  'strengths',
  'communication',
  'social_interaction_play',
  'movement',
  'daily_living',
  'learning_thinking',
  'behavior',
  'medical_health',
  'other',
] as const;

export type HistoryCategory = (typeof CATEGORY_KEYS)[number];

export type CategoryDefinition = {
  key: HistoryCategory;
  /** Parent-facing display label. */
  label: string;
  /** Scope description from the spec (used for the prompt and documentation). */
  scope: string;
};

/** Full definitions, in the fixed order. */
export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    key: 'main_concerns',
    label: 'Main Concerns',
    scope: 'Only statements the parent frames as a worry or the reason for the visit',
  },
  {
    key: 'strengths',
    label: 'Strengths',
    scope: 'What the child does well or enjoys',
  },
  {
    key: 'communication',
    label: 'Communication',
    scope:
      'Understanding, speaking, gestures, and the languages used with the child at home',
  },
  {
    key: 'social_interaction_play',
    label: 'Social Interaction and Play',
    scope: 'Play, relating to others',
  },
  {
    key: 'movement',
    label: 'Movement',
    scope:
      'Gross and fine motor skills and coordination only (amount of exercise or physical activity goes in Medical and Health)',
  },
  {
    key: 'daily_living',
    label: 'Daily Living',
    scope:
      'Eating, dressing, toileting, everyday routines (sleep and screen time go in Medical and Health)',
  },
  {
    key: 'learning_thinking',
    label: 'Learning and Thinking',
    scope: 'School, learning, attention to tasks',
  },
  {
    key: 'behavior',
    label: 'Behavior',
    scope: 'Emotions, reactions, regulation',
  },
  {
    key: 'medical_health',
    label: 'Medical and Health',
    scope:
      'Only parent-volunteered details: pregnancy/birth, medical, hearing, vision, medication; sleep (including bedtime and amount); screen and gadget time; amount of exercise or physical activity; previous assessments, diagnoses or therapies',
  },
  {
    key: 'other',
    label: 'Other',
    scope:
      'Relevant statements that fit nowhere else, such as family situation, caregivers, siblings or recent changes at home',
  },
] as const;

/** Parent-facing label lookup by key. */
export const CATEGORY_LABELS: Readonly<Record<HistoryCategory, string>> = Object.freeze(
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])) as Record<HistoryCategory, string>,
);
