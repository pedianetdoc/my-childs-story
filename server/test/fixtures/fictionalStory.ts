/**
 * FICTIONAL test data only. No real child, family, school or place.
 */
import type { HistoryCategory, OrganizeStoryResponse, ReportedItem } from '@my-childs-story/shared';
import { CATEGORY_KEYS } from '@my-childs-story/shared';

export const FICTIONAL_NARRATIVE = [
  'My main worry is that he says only a few words, like "mama" and "dede".',
  'He loves stacking blocks and can do it for a long time.',
  'Tapos he holds the spoon in his fist when he eats - sometimes he gives up and uses his hands.',
  'His teacher said he plays alone at recess... maybe he is just shy?',
  'He was born at 36 weeks and had ear infections last year.',
  'Mahilig siyang sumayaw kapag may music.',
  'We moved to a new house in June.',
].join(' ');

export function emptyCategories(): Record<HistoryCategory, ReportedItem[]> {
  return Object.fromEntries(CATEGORY_KEYS.map((k) => [k, []])) as unknown as Record<
    HistoryCategory,
    ReportedItem[]
  >;
}

/** A response that passes every rule for FICTIONAL_NARRATIVE. */
export function validResponse(): OrganizeStoryResponse {
  const categories = emptyCategories();
  categories.main_concerns.push({
    text: 'My main worry is that he says only a few words, like "mama" and "dede".',
    sourceQuote: 'My main worry is that he says only a few words, like "mama" and "dede".',
  });
  categories.strengths.push(
    {
      text: 'He loves stacking blocks and can do it for a long time.',
      sourceQuote: 'He loves stacking blocks and can do it for a long time.',
    },
    {
      text: 'Mahilig siyang sumayaw kapag may music.',
      sourceQuote: 'Mahilig siyang sumayaw kapag may music.',
    },
  );
  categories.movement.push({
    // Minimal cleaning: leading "Tapos" removed, first letter capitalized, period added.
    text: 'He holds the spoon in his fist when he eats.',
    sourceQuote: 'Tapos he holds the spoon in his fist when he eats',
  });
  categories.daily_living.push({
    text: 'Sometimes he gives up and uses his hands.',
    sourceQuote: 'sometimes he gives up and uses his hands.',
  });
  categories.social_interaction_play.push({
    text: 'His teacher said he plays alone at recess... maybe he is just shy?',
    sourceQuote: 'His teacher said he plays alone at recess... maybe he is just shy?',
  });
  categories.medical_health.push({
    text: 'He was born at 36 weeks and had ear infections last year.',
    sourceQuote: 'He was born at 36 weeks and had ear infections last year.',
  });
  categories.other.push({
    text: 'We moved to a new house in June.',
    sourceQuote: 'We moved to a new house in June.',
  });
  return {
    categories,
    clarificationQuestions: [
      {
        id: 'q1',
        question: 'Which words does he say most often at home?',
        reason: 'The story mentions a few words but not which ones are used daily.',
      },
      {
        id: 'q2',
        question: 'Does he play alone at home too, or only at school?',
        reason: 'The teacher’s report covers recess only.',
      },
    ],
  };
}
