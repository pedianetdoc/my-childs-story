/**
 * "In the meantime, connect, play and talk" — the optional serve-and-return
 * activity (spec section 5 step 5, AC-17).
 *
 * CLINICIAN-APPROVED wording (serve-and-return-activities.md). Do not edit the
 * text without clinician review. Never AI-generated.
 *
 * Age is used ONLY to choose which example text to show. It is never used to
 * interpret the child's development.
 *
 * Example text may contain exactly two placeholders, {them} and {their}, which
 * fillPronouns() replaces; no other word changes.
 */
import type { ActivityId, ActivityStatus, AgeUnit } from '@my-childs-story/shared';

export const ACTIVITY_HEADING = 'In the meantime, connect, play and talk';

/** The intro's last words, "serve and return", are shown in bold as in the source. */
export const ACTIVITY_INTRO_EMPHASIS = 'serve and return';

export const ACTIVITY_INTRO =
  "Waiting for your child's appointment can feel long, and you may be wondering what you can do now. The good news: some of the most helpful things for your child happen in ordinary moments you already share, like mealtime, bath time, play and bedtime. There's nothing to buy and nothing to prepare. It starts with one simple idea called serve and return.";

export const SERVE_AND_RETURN = {
  heading: 'What is serve and return?',
  text: 'Serve and return is like a friendly game of tennis. Your child "serves" by looking at something, pointing, smiling, making a sound or saying something. You "return" it by noticing, responding warmly, and giving your child a turn. Then it goes back and forth.',
} as const;

export const WHY_IT_MATTERS = {
  heading: 'Why it matters',
  text: 'These small back-and-forth moments are one of the most powerful things you can do for your child. They help build your child\'s brain, language, learning and behavior, and they strengthen your relationship. It takes only a few minutes, it\'s free, and it needs no special toys, printables or preparation. You are your child\'s best "toy."',
  link: {
    before: 'To find out more about Serve and Return, head over to the website of the ',
    text: 'Center on the Developing Child at Harvard University',
    href: 'https://developingchild.harvard.edu/science/key-concepts/serve-and-return/',
    after: '.',
  },
} as const;

export const FIVE_STEPS = {
  heading: 'The five simple steps',
  steps: [
    {
      label: 'Notice the serve.',
      text: 'Your child looks at you, smiles, points, makes a sound or says something.',
    },
    { label: 'Return it.', text: 'Look at what your child is looking at. Smile back.' },
    {
      label: 'Say something about it.',
      text: "You can repeat your child's words, a little more clearly.",
    },
    { label: 'Pause.', text: 'Give your child time to respond in {their} own way.' },
    {
      label: 'Notice when your child is done.',
      text: 'When your child looks away or moves on, let {them} go, and follow along.',
    },
  ],
  closing: "There's no right or wrong result. Just enjoy the moment, and notice what happens.",
} as const;

export const CHOOSE_HEADING = 'Choose one way to try it this week';

export const ACTIVITY_OPTIONS: ReadonlyArray<{ id: ActivityId; label: string }> = [
  { id: 'connect', label: 'Connect' },
  { id: 'play', label: 'Play' },
  { id: 'talk', label: 'Talk' },
];

export type AgeBandId = 'under_12m' | '12_23m' | '24_35m' | '3_5y' | '6_12y' | '13_18y';

export const AGE_BANDS: ReadonlyArray<{
  id: AgeBandId;
  label: string;
  /** Upper bound in months, exclusive (the last band includes 216). */
  belowMonths: number;
  examples: Record<ActivityId, string>;
}> = [
  {
    id: 'under_12m',
    label: 'Under 12 months',
    belowMonths: 12,
    examples: {
      connect:
        'Hold your baby face to face, with your phone put away, and look into {their} eyes. When your baby smiles or coos, smile back and wait for the next "serve." When your baby cries, respond calmly. Your baby is learning that crying, cooing and smiling get a loving response.',
      play: 'Play peek-a-boo, or make funny faces together in a mirror. When your baby laughs or reaches out, do it again and wait to see what your baby does next.',
      talk: 'During a feeding or bath, look at your baby and say what\'s happening: "Here\'s the warm water… Aren\'t these bubbles fun?" When your baby coos or babbles, smile and talk back, then pause for {their} turn.',
    },
  },
  {
    id: '12_23m',
    label: '12 to 23 months',
    belowMonths: 24,
    examples: {
      connect:
        'Look through family photos together. When your child points at someone, name the person and say something about the picture: "That\'s Lola at your birthday!" Then pause for {their} turn.',
      play: 'Play "Bring Me" with a ball, cup or book, or pretend to feed a stuffed toy together. Talk about what you\'re both doing, and let your child lead.',
      talk: 'When your child points at a dog, a truck or a bird, look at it, then at your child, and say something about it: "Yes, a big brown dog!" Pause and let your child answer in {their} own way.',
    },
  },
  {
    id: '24_35m',
    label: '2 years (24 to 35 months)',
    belowMonths: 36,
    examples: {
      connect:
        'Notice and name your child\'s feelings: "You look so happy!" or "You seem upset right now." Then wait, and listen to what your child does or says next.',
      play: 'Take turns. Your child names something and you draw it, or you pretend to do something and guess what each other is doing. When your child says a word, add to it: "Ice cream!" "Yes, cold, yummy ice cream!"',
      talk: 'During play, smile and ask, "What are you doing?" Listen, then say something about what your child told you. Keep it a conversation, not a quiz.',
    },
  },
  {
    id: '3_5y',
    label: '3 to 5 years',
    belowMonths: 72,
    examples: {
      connect:
        'Snuggle up with a favorite book. Pause to ask, "How do you think the bunny feels?" or "What will happen next?" and listen to the answer. There\'s no pressure for a "right" answer.',
      play: "Join your child's pretend play or building. Let your child decide the story, and take a role that follows {their} lead.",
      talk: 'At the end of the day, ask, "What was fun today?" Listen, repeat back what you heard, and ask one more question about it. It\'s okay if your child talks about yesterday or last week instead.',
    },
  },
  {
    id: '6_12y',
    label: '6 to 12 years',
    belowMonths: 156,
    examples: {
      connect:
        'Spend a few minutes of one-on-one time with phones away, such as a bedtime chat or reading side by side. Follow whatever your child brings up.',
      play: 'Play a game your child chooses, such as a board game, ball game or drawing, and chat about it as you play.',
      talk: 'Use a car ride or a meal to talk about something your child cares about. Ask an open question, listen fully, and respond to what your child said before adding your own thoughts.',
    },
  },
  {
    id: '13_18y',
    label: '13 to 18 years',
    belowMonths: Number.POSITIVE_INFINITY,
    examples: {
      connect:
        'Notice when your teen starts a conversation, often at night or in the car, and give full attention. Listen more than you advise.',
      play: 'Do something together that your teen enjoys, such as cooking, a game, music or a walk, and let {them} lead.',
      talk: 'Ask about something your teen is reading, watching or interested in, and let {them} explain it to you.',
    },
  },
];

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  not_yet: 'Not yet',
  tried: 'Tried it',
  could_not_try: 'Couldn’t try it',
};

export const ACTIVITY_NOTES_PROMPT =
  'What did you notice? (For example, what your child did, said or enjoyed.)';

const MAX_MONTHS = 216;

/**
 * Chooses the example age band from the entered age, deterministically.
 * Years are converted to months (36 months = 3–5 band). Returns null for an
 * age that is missing or out of range. Used only to pick example text.
 */
export function ageBandFor(ageText: string, unit: AgeUnit) {
  const trimmed = ageText.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const months = unit === 'years' ? Number(trimmed) * 12 : Number(trimmed);
  if (!Number.isFinite(months) || months < 0 || months > MAX_MONTHS) return null;
  return AGE_BANDS.find((band) => months < band.belowMonths) ?? null;
}

/** The pronoun choice used to fill {them} / {their}. */
export type ExamplePronoun = 'she' | 'he' | 'they';

const PRONOUN_WORDS: Record<ExamplePronoun, { them: string; their: string }> = {
  she: { them: 'her', their: 'her' },
  he: { them: 'him', their: 'his' },
  they: { them: 'them', their: 'their' },
};

/** Replaces {them} and {their}; no other word changes. */
export function fillPronouns(text: string, pronoun: ExamplePronoun = 'they'): string {
  const words = PRONOUN_WORDS[pronoun];
  return text.replace(/\{them\}/g, words.them).replace(/\{their\}/g, words.their);
}

export function activityLabel(id: ActivityId): string {
  return ACTIVITY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
