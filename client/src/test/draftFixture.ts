/** A filled, FICTIONAL draft for export tests. */
import { emptyDraft, type Draft } from '../draft/draft';
import { sampleResult } from './helpers';

export const FICTIONAL_NARRATIVE =
  'My main worry is that he says only a few words. He loves stacking blocks.\n' +
  'Mahilig siyang sumayaw. Señor Niño is his favorite song.\n\n' +
  'He was born at 36 weeks. We moved to a new house in June.';

export function filledDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    ...emptyDraft(),
    ageText: '2.5',
    ageUnit: 'years',
    originalNarrative: FICTIONAL_NARRATIVE,
    result: sampleResult(),
    clarificationAnswers: { q1: { status: 'answered', answer: 'Mama, dede and ball.' } },
    parentQuestions: 'How can we help him talk more?\nShould we change anything at home?',
    visitExpectations: 'A plan we can use at home.',
    activity: { activityId: 'connect', status: 'tried', notes: 'He pointed at the ball.' },
    screen: 'preview',
    ...overrides,
  };
}
