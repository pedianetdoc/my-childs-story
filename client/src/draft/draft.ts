/**
 * The parent-owned draft held in the browser — spec 4.7. One object, so the
 * preview, the exports and session storage all read the same state.
 */
import type {
  ActivityId,
  ActivityStatus,
  AgeUnit,
  ChildPronoun,
  OrganizeStoryResult,
} from '@my-childs-story/shared';
import type { ClarificationAnswers } from '../preview/ClarificationQuestions';
import type { DictationLanguage } from '../voice/dictationController';

export type ActivityResponse = { activityId: ActivityId; status: ActivityStatus; notes: string };

export type Draft = {
  /** Age as typed; validated into a number on submit. */
  ageText: string;
  ageUnit: AgeUnit;
  /** Optional "My child is" choice; null = prefer not to say (the default). Never inferred. */
  childPronoun: ChildPronoun | null;
  /** The parent's own story. Never overwritten by the LLM. */
  originalNarrative: string;
  dictationLanguage: DictationLanguage;
  /** Validated server result (categories, questions, meta), or null before organizing. */
  result: OrganizeStoryResult | null;
  clarificationAnswers: ClarificationAnswers;
  parentQuestions: string;
  visitExpectations: string;
  /** At most one optional activity; null = none selected. */
  activity: ActivityResponse | null;
  includeOriginalNarrative: boolean;
  /** Editable export file name; '' means use the default story-YYYY-MM-DD. */
  exportBaseName: string;
  screen: 'input' | 'preview';
};

export function emptyDraft(): Draft {
  return {
    ageText: '',
    ageUnit: 'years',
    childPronoun: null,
    originalNarrative: '',
    dictationLanguage: 'en-PH',
    result: null,
    clarificationAnswers: {},
    parentQuestions: '',
    visitExpectations: '',
    activity: null,
    includeOriginalNarrative: false,
    exportBaseName: '',
    screen: 'input',
  };
}
