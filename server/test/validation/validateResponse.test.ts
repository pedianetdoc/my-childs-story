import { describe, expect, it } from 'vitest';
import type { OrganizeStoryResponse } from '@my-childs-story/shared';
import { validateOrganizeStoryResponse } from '../../src/validation/index.js';
import { FICTIONAL_NARRATIVE, emptyCategories, validResponse } from '../fixtures/fictionalStory.js';

function validate(candidate: unknown, narrative = FICTIONAL_NARRATIVE) {
  return validateOrganizeStoryResponse(candidate, narrative);
}

function expectRejected(candidate: unknown, code: string, narrative = FICTIONAL_NARRATIVE) {
  const result = validate(candidate, narrative);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.issues.map((i) => i.code)).toContain(code);
  return result;
}

/** Deep clone so mutations never leak between tests. */
function response(): OrganizeStoryResponse {
  return structuredClone(validResponse());
}

describe('AC-03: valid response', () => {
  it('AC-03: accepts a valid response with all ten keys', () => {
    const result = validate(response());
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.value.categories)).toHaveLength(10);
  });

  it('AC-03: accepts a response with all categories empty and no questions', () => {
    const r = response();
    for (const key of Object.keys(r.categories) as Array<keyof typeof r.categories>) {
      r.categories[key] = [];
    }
    r.clarificationQuestions = [];
    expect(validate(r).ok).toBe(true);
  });

  it('AC-03: does not mutate or repair the input', () => {
    const r = response();
    const before = JSON.stringify(r);
    validate(r);
    expect(JSON.stringify(r)).toBe(before);
  });
});

describe('AC-04: original narrative', () => {
  it('AC-04: accepts medical details in Medical and Health, leftovers in Other, without changing the narrative', () => {
    const narrative = FICTIONAL_NARRATIVE;
    const copy = String(narrative);
    const result = validate(response(), narrative);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.categories.medical_health[0]?.sourceQuote).toContain('36 weeks');
      expect(result.value.categories.other[0]?.sourceQuote).toContain('new house');
    }
    expect(narrative).toBe(copy);
  });
});

describe('AC-05: hostile responses are rejected whole', () => {
  it('AC-05: rejects an invented quote', () => {
    const r = response();
    r.categories.communication.push({
      text: 'He says ten words.',
      sourceQuote: 'He says ten words.',
    });
    expectRejected(r, 'source_quote_not_found');
  });

  it('AC-05: rejects a composite quote stitched from two separate passages', () => {
    const r = response();
    r.categories.strengths.push({
      text: 'He loves stacking blocks and dancing.',
      sourceQuote: 'He loves stacking blocks and dancing.',
    });
    expectRejected(r, 'source_quote_not_found');
  });

  it('AC-05: rejects a quote whose only difference is letter case (matching is case-sensitive)', () => {
    const r = response();
    r.categories.other[0] = {
      text: 'We moved to a new house in June.',
      sourceQuote: 'we moved to a new house in june.',
    };
    expectRejected(r, 'source_quote_not_found');
  });

  it('AC-05: rejects a paraphrased text', () => {
    const r = response();
    r.categories.strengths[0] = {
      text: 'He enjoys building with blocks for a long time.',
      sourceQuote: 'He loves stacking blocks and can do it for a long time.',
    };
    expectRejected(r, 'text_not_in_source_quote');
  });

  it('AC-05: rejects a clinical rewording of the parent’s words', () => {
    const r = response();
    r.categories.movement[0] = {
      text: 'Immature palmar grasp.',
      sourceQuote: 'Tapos he holds the spoon in his fist when he eats',
    };
    expectRejected(r, 'text_not_in_source_quote');
  });

  it('AC-05: rejects a translated text', () => {
    const r = response();
    r.categories.strengths[1] = {
      text: 'He likes to dance when there is music.',
      sourceQuote: 'Mahilig siyang sumayaw kapag may music.',
    };
    expectRejected(r, 'text_not_in_source_quote');
  });

  it('AC-05: rejects a text that adds words not in its sourceQuote', () => {
    const r = response();
    r.categories.other[0] = {
      text: 'We moved to a new house in June last year.',
      sourceQuote: 'We moved to a new house in June.',
    };
    expectRejected(r, 'text_not_in_source_quote');
  });

  it('AC-05: rejects a text that drops an English negation ("does not point" → "point")', () => {
    const narrative = 'He does not point at things he wants. He likes trains.';
    const r = response();
    r.categories = emptyCategories();
    r.categories.communication.push({
      text: 'Point at things he wants.',
      sourceQuote: 'He does not point at things he wants.',
    });
    r.clarificationQuestions = [];
    expectRejected(r, 'text_not_in_source_quote', narrative);
  });

  it('AC-05: rejects a text that drops a Filipino negation ("hindi pa nagsasalita" → "nagsasalita")', () => {
    const narrative = 'Ang anak ko ay hindi pa nagsasalita. Mahilig siyang sumayaw.';
    const r = response();
    r.categories = emptyCategories();
    r.categories.communication.push({
      text: 'Nagsasalita.',
      sourceQuote: 'Ang anak ko ay hindi pa nagsasalita.',
    });
    r.clarificationQuestions = [];
    expectRejected(r, 'text_not_in_source_quote', narrative);
  });

  it('AC-05: rejects a text that drops trailing words', () => {
    const r = response();
    r.categories.movement[0] = {
      text: 'He holds the spoon in his fist.',
      sourceQuote: 'Tapos he holds the spoon in his fist when he eats',
    };
    expectRejected(r, 'text_not_in_source_quote');
  });

  it('AC-05: rejects a text that drops a leading word that is not a listed connector', () => {
    const r = response();
    r.categories.social_interaction_play[0] = {
      text: 'Teacher said he plays alone at recess.',
      sourceQuote: 'His teacher said he plays alone at recess',
    };
    expectRejected(r, 'text_not_in_source_quote');
  });

  it('AC-05: rejects dropping "at", which is not a connector ("At home he cries" → "Home he cries")', () => {
    const narrative = 'At home he cries when the music stops. He likes trains.';
    const r = response();
    r.categories = emptyCategories();
    r.categories.behavior.push({ text: 'Home he cries.', sourceQuote: 'At home he cries' });
    r.clarificationQuestions = [];
    expectRejected(r, 'text_not_in_source_quote', narrative);
  });

  it('AC-05: rejects a text that drops two leading connectors', () => {
    const narrative = 'And then he cries when the music stops. He likes trains.';
    const r = response();
    r.categories = emptyCategories();
    r.categories.behavior.push({
      text: 'He cries when the music stops.',
      sourceQuote: 'And then he cries when the music stops.',
    });
    r.clarificationQuestions = [];
    expectRejected(r, 'text_not_in_source_quote', narrative);
  });

  it.each(['and', 'then', 'also', 'so', 'tapos', 'saka'])(
    'AC-05: accepts dropping ONE allowed leading connector ("%s") (must PASS)',
    (connector) => {
      const quote = `${connector} umiiyak siya kapag tumigil ang music`;
      const narrative = `Mahilig siyang sumayaw. ${quote}. He likes trains.`;
      const r = response();
      r.categories = emptyCategories();
      r.categories.behavior.push({ text: 'Umiiyak siya kapag tumigil ang music.', sourceQuote: quote });
      r.clarificationQuestions = [];
      expect(validate(r, narrative).ok).toBe(true);
    },
  );

  it('AC-05: rejects a text that is only punctuation after dropping a connector', () => {
    const narrative = 'He likes trains. Tapos. He sleeps well.';
    const r = response();
    r.categories = emptyCategories();
    r.categories.other.push({ text: '.', sourceQuote: 'Tapos.' });
    r.clarificationQuestions = [];
    expectRejected(r, 'text_not_in_source_quote', narrative);
  });

  it('AC-05: rejects an extra category key', () => {
    const r = response() as unknown as { categories: Record<string, unknown> };
    r.categories.diagnosis = [];
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects an extra top-level key', () => {
    expectRejected({ ...response(), summary: 'x' }, 'schema');
  });

  it('AC-05: rejects an extra key on an item', () => {
    const r = response() as unknown as {
      categories: { strengths: Array<Record<string, unknown>> };
    };
    r.categories.strengths[0] = { ...r.categories.strengths[0], severity: 'mild' };
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects a missing category key', () => {
    const r = response() as unknown as { categories: Record<string, unknown> };
    delete r.categories.behavior;
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects a category that is not an array', () => {
    const r = response() as unknown as { categories: Record<string, unknown> };
    r.categories.behavior = { text: 'x', sourceQuote: 'x' };
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects non-object and invalid-JSON-shaped input', () => {
    expectRejected(null, 'schema');
    expectRejected('{"categories":{}}', 'schema');
    expectRejected([], 'schema');
  });

  it('AC-05: rejects four questions', () => {
    const r = response();
    r.clarificationQuestions = [
      { id: 'q1', question: 'One?', reason: 'Unclear.' },
      { id: 'q2', question: 'Two?', reason: 'Unclear.' },
      { id: 'q3', question: 'Three?', reason: 'Unclear.' },
      { id: 'q3', question: 'Four?', reason: 'Unclear.' },
    ];
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects duplicate question ids', () => {
    const r = response();
    r.clarificationQuestions = [
      { id: 'q1', question: 'One?', reason: 'Unclear.' },
      { id: 'q1', question: 'Two?', reason: 'Unclear.' },
    ];
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects a question id outside q1–q3', () => {
    const r = response() as unknown as { clarificationQuestions: Array<Record<string, string>> };
    r.clarificationQuestions = [{ id: 'q4', question: 'One?', reason: 'Unclear.' }];
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects text and sourceQuote over 1000 characters', () => {
    const long = 'a'.repeat(1001);
    const r = response();
    r.categories.other.push({ text: long, sourceQuote: long });
    expectRejected(r, 'schema', `${FICTIONAL_NARRATIVE} ${long}`);
  });

  it('AC-05: rejects question or reason over 200 characters', () => {
    const r = response();
    r.clarificationQuestions = [{ id: 'q1', question: `${'a'.repeat(200)}?`, reason: 'Unclear.' }];
    expectRejected(r, 'schema');
    r.clarificationQuestions = [{ id: 'q1', question: 'One?', reason: 'b'.repeat(201) }];
    expectRejected(r, 'schema');
  });

  it('AC-05: rejects empty text or sourceQuote', () => {
    const r = response();
    r.categories.other.push({ text: '', sourceQuote: '' });
    expectRejected(r, 'schema');
  });

  it.each([
    'Has a doctor checked him for autism?',
    'Is his speech delayed compared with other children?',
    'Is this NORMAL for his age?',
    'Have you tried speech therapy?',
    'Is this a red flag?',
    'Does he take any medication?',
    'Has he been evaluated for ADHD?',
  ])('AC-05: rejects a blocked term in a question: %s', (question) => {
    const r = response();
    r.clarificationQuestions = [{ id: 'q1', question, reason: 'Unclear.' }];
    expectRejected(r, 'question_blocked_term');
  });

  it('AC-05: rejects a blocked term in a reason', () => {
    const r = response();
    r.clarificationQuestions = [
      { id: 'q1', question: 'Which words does he say?', reason: 'Few words can suggest a delay.' },
    ];
    expectRejected(r, 'question_blocked_term');
  });

  it.each([
    'See https://example.org for more.',
    'Visit www.example.org',
    'Read example.com/help first.',
  ])('AC-05: rejects a URL in a question or reason: %s', (withUrl) => {
    const r = response();
    r.clarificationQuestions = [{ id: 'q1', question: withUrl, reason: 'Unclear.' }];
    expectRejected(r, 'question_contains_url');
    r.clarificationQuestions = [{ id: 'q1', question: 'Which words?', reason: withUrl }];
    expectRejected(r, 'question_contains_url');
  });

  it('AC-05: one bad item rejects the whole response (no partial result)', () => {
    const r = response();
    r.categories.behavior.push({ text: 'Invented.', sourceQuote: 'Invented.' });
    const result = validate(r);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('value');
  });

  it('AC-05: issues never contain the offending text', () => {
    const r = response();
    r.categories.behavior.push({ text: 'SECRET-INVENTED', sourceQuote: 'SECRET-INVENTED' });
    const result = validate(r);
    expect(JSON.stringify(result)).not.toContain('SECRET-INVENTED');
  });
});

describe('AC-06: punctuation-only differences are accepted', () => {
  it('AC-06: accepts curly quotes where the narrative has straight quotes (must PASS)', () => {
    const r = response();
    r.categories.main_concerns[0] = {
      text: 'My main worry is that he says only a few words, like “mama” and “dede”.',
      sourceQuote: 'My main worry is that he says only a few words, like “mama” and “dede”.',
    };
    expect(validate(r).ok).toBe(true);
  });

  it('AC-06: accepts straight quotes where the narrative has curly quotes and apostrophes', () => {
    const narrative = 'She can’t sleep unless we sing “Bahay Kubo” twice.';
    const r = response();
    for (const key of Object.keys(r.categories) as Array<keyof typeof r.categories>) {
      r.categories[key] = [];
    }
    r.categories.daily_living.push({
      text: 'She can\'t sleep unless we sing "Bahay Kubo" twice.',
      sourceQuote: 'She can\'t sleep unless we sing "Bahay Kubo" twice.',
    });
    r.clarificationQuestions = [];
    expect(validate(r, narrative).ok).toBe(true);
  });

  it('AC-06: accepts an em dash or en dash where the narrative has a hyphen', () => {
    const r = response();
    r.categories.movement[0] = {
      text: 'He holds the spoon in his fist when he eats — sometimes he gives up.',
      sourceQuote: 'he holds the spoon in his fist when he eats – sometimes he gives up',
    };
    r.categories.daily_living = [];
    expect(validate(r).ok).toBe(true);
  });

  it('AC-06: accepts an ellipsis character where the narrative has three dots', () => {
    const r = response();
    r.categories.social_interaction_play[0] = {
      text: 'His teacher said he plays alone at recess… maybe he is just shy?',
      sourceQuote: 'His teacher said he plays alone at recess… maybe he is just shy?',
    };
    expect(validate(r).ok).toBe(true);
  });

  it('AC-06: accepts whitespace differences (line breaks, double spaces)', () => {
    const r = response();
    r.categories.strengths[0] = {
      text: 'He loves stacking blocks and can do it for a long time.',
      sourceQuote: 'He loves  stacking\nblocks and can do it\tfor a long time.',
    };
    expect(validate(r).ok).toBe(true);
  });

  it('AC-06: accepts minimal cleaning (connector removed, capitalized, period added)', () => {
    const r = response();
    r.categories.movement[0] = {
      text: 'He holds the spoon in his fist when he eats.',
      sourceQuote: 'Tapos he holds the spoon in his fist when he eats',
    };
    expect(validate(r).ok).toBe(true);
  });

  it('AC-06: keeps the parent’s own words even if they contain deny-listed terms', () => {
    const narrative = 'His cousin has autism and I worry he has a speech delay too. He likes trains.';
    const r = response();
    for (const key of Object.keys(r.categories) as Array<keyof typeof r.categories>) {
      r.categories[key] = [];
    }
    r.categories.main_concerns.push({
      text: 'I worry he has a speech delay too.',
      sourceQuote: 'I worry he has a speech delay too.',
    });
    r.categories.other.push({
      text: 'His cousin has autism.',
      sourceQuote: 'His cousin has autism',
    });
    r.clarificationQuestions = [];
    expect(validate(r, narrative).ok).toBe(true);
  });

  it('AC-06: does not block words that merely contain a deny-listed term ("normally")', () => {
    const r = response();
    r.clarificationQuestions = [
      { id: 'q1', question: 'What does he normally eat for breakfast?', reason: 'Meals are described only at dinner.' },
    ];
    expect(validate(r).ok).toBe(true);
  });
});
