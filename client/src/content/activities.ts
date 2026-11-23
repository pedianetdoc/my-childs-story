/**
 * The three fixed, optional preparation activities — spec 3 and section 5 step 5.
 * Never AI-generated. At most one is selected.
 *
 * PENDING CLINICIAN REVIEW: titles are the spec's own wording. `instructions`
 * is deliberately null until the clinician supplies the reviewed text; do not
 * write clinical instructions here without that review.
 */
import type { ActivityId, ActivityStatus } from '@my-childs-story/shared';

export type ActivityDefinition = {
  id: ActivityId;
  title: string;
  /** Clinician-reviewed instructions, or null until supplied. */
  instructions: string | null;
};

export const ACTIVITIES: readonly ActivityDefinition[] = [
  { id: 'communication_moment', title: 'Notice a communication moment', instructions: null },
  { id: 'child_led_interaction', title: 'Try a brief child-led interaction', instructions: null },
  { id: 'difficult_moment', title: 'Observe a naturally occurring difficult moment', instructions: null },
];

/** Spec section 5 step 5: never suggest provoking distress; not therapy. */
export const ACTIVITY_NOTE =
  'Optional. Choose at most one small thing to notice before your visit. This is not therapy. ' +
  'Never try to upset your child to see how they react.';

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  not_yet: 'Not yet',
  tried: 'Tried it',
  could_not_try: 'Couldn’t try it',
};

export function activityTitle(id: ActivityId): string {
  return ACTIVITIES.find((a) => a.id === id)?.title ?? id;
}
