import type { AgeUnit } from '@my-childs-story/shared';

/**
 * A FICTIONAL Taglish story for trying the app. Not a real child, family,
 * school or place. Shown with a clear "fictional example" label when loaded.
 */
export const FICTIONAL_EXAMPLE: {
  age: { value: string; unit: AgeUnit };
  narrative: string;
} = {
  age: { value: '2.5', unit: 'years' },
  narrative: [
    'Nag-aalala ako kasi 2 and a half years old na siya pero konti pa lang ang words niya, mga 10 words siguro.',
    'He says "mama", "dede" and "ball".',
    'Minsan tinuturo niya yung gusto niya, pero madalas umiiyak na lang siya.',
    'He loves puzzles and can finish a 12-piece puzzle by himself.',
    'Sabi ng lola niya hindi siya masyadong nakikipaglaro sa mga pinsan niya.',
    'Tapos hindi pa siya marunong uminom sa cup nang hindi natatapon.',
    'He sleeps around 9 pm and wakes up at 6 am.',
    'Ipinanganak siya at 37 weeks.',
    'Sa bahay, Tagalog at English ang gamit namin.',
  ].join(' '),
};
