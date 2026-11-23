/**
 * Guiding prompts shown above the story field — spec section 4.1.
 * Optional prompts, not required fields. Filipino translations PENDING
 * native-speaker review.
 */
export type GuidingPrompt = { en: string; fil: string };

export const GUIDING_PROMPTS: readonly GuidingPrompt[] = [
  { en: 'What worries you most?', fil: 'Ano po ang pinakaikinababahala ninyo?' },
  { en: 'When did you first notice it?', fil: 'Kailan po ninyo ito unang napansin?' },
  {
    en: 'What does your child enjoy or do well?',
    fil: 'Ano po ang hilig o magaling gawin ng inyong anak?',
  },
  {
    en: 'How do everyday routines go?',
    fil: 'Kumusta po ang mga pang-araw-araw na gawain ng inyong anak?',
  },
];
