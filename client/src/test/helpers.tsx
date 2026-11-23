/** Test helpers. FICTIONAL data only. */
import { fireEvent, screen } from '@testing-library/react';
import { CATEGORY_KEYS, type HistoryCategory, type OrganizeStoryResult, type ReportedItem } from '@my-childs-story/shared';
import { vi } from 'vitest';

export const STORY =
  'My main worry is that he says only a few words. He loves stacking blocks. ' +
  'He was born at 36 weeks. We moved to a new house in June.';

export function emptyCategories(): Record<HistoryCategory, ReportedItem[]> {
  return Object.fromEntries(CATEGORY_KEYS.map((k) => [k, []])) as unknown as Record<
    HistoryCategory,
    ReportedItem[]
  >;
}

export function sampleResult(): OrganizeStoryResult {
  const categories = emptyCategories();
  categories.main_concerns.push({
    text: 'My main worry is that he says only a few words.',
    sourceQuote: 'My main worry is that he says only a few words.',
  });
  categories.strengths.push({ text: 'He loves stacking blocks.', sourceQuote: 'He loves stacking blocks.' });
  categories.medical_health.push({ text: 'He was born at 36 weeks.', sourceQuote: 'He was born at 36 weeks.' });
  categories.other.push({ text: 'We moved to a new house in June.', sourceQuote: 'We moved to a new house in June.' });
  return {
    categories,
    clarificationQuestions: [
      { id: 'q1', question: 'Which words does he say now?', reason: 'The story says “a few words” but not which ones.' },
      { id: 'q2', question: 'When did you first notice this?', reason: 'The story does not say when it started.' },
    ],
    meta: { promptVersion: 'history-organizer.v1', model: 'mock-model' },
  };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Stubs global fetch; each call resolves with the next queued response. */
export function mockFetch(...responses: Array<Response | (() => Promise<Response>)>) {
  const fn = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('unexpected fetch');
    return typeof next === 'function' ? next() : next;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** A fetch that stays pending until resolve() is called. */
export function deferredResponse() {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export const field = {
  story: () => screen.getByLabelText('Your child’s story') as HTMLTextAreaElement,
  age: () => screen.getByLabelText('Age') as HTMLInputElement,
  unit: () => screen.getByLabelText('Age unit') as HTMLSelectElement,
};

export function fillValidStory(narrative = STORY, ageValue = '3', unit: 'months' | 'years' = 'years') {
  fireEvent.change(field.age(), { target: { value: ageValue } });
  fireEvent.change(field.unit(), { target: { value: unit } });
  fireEvent.change(field.story(), { target: { value: narrative } });
}
