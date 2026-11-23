import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORY_KEYS } from '@my-childs-story/shared';
import {
  DEFAULT_PROMPT_PATH,
  PROMPT_VERSION,
  buildUserMessage,
  loadSystemPrompt,
} from '../src/historyOrganizer/index.js';
import { loadConfig } from '../src/config.js';
import { LEADING_CONNECTORS } from '../src/validation/index.js';

describe('history-organizer prompt (spec 3, 4.4, 4.6)', () => {
  const raw = fs.readFileSync(DEFAULT_PROMPT_PATH, 'utf8');
  const prompt = loadSystemPrompt();

  it('is the clinician-reviewed version, and the file names the same version string', () => {
    expect(raw).toMatch(/CLINICIAN-REVIEWED/);
    expect(raw).not.toMatch(/DRAFT/);
    expect(PROMPT_VERSION).toBe('history-organizer.v1.1');
    expect(raw).toContain(`Prompt version: ${PROMPT_VERSION} (`);
  });

  it('names exactly the validator\'s leading connectors and forbids dropping negations', () => {
    const line = prompt.split('\n').find((l) => l.startsWith('- `text` is the same span'));
    expect(line).toBeDefined();
    const listed = [...(line ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const connectors = listed.slice(0, LEADING_CONNECTORS.length);
    expect(connectors).toEqual([...LEADING_CONNECTORS]);
    expect(line).not.toMatch(/"at"/);
    for (const negation of ['not', 'no', 'never', 'hindi', 'wala', 'ayaw', 'di']) {
      expect(line).toContain(`"${negation}"`);
    }
  });

  it('strips the maintainer comment before sending', () => {
    expect(prompt).not.toContain('<!--');
    expect(prompt).not.toContain('CLINICIAN-REVIEWED');
    expect(prompt).not.toContain('Prompt version:');
  });

  it('lists every category key, in the fixed order', () => {
    // Positions of the numbered list entries ("1. `main_concerns` — …"), not the
    // first mention: the prompt also names keys in prose (e.g. "put it in `other`").
    const positions = CATEGORY_KEYS.map((key, i) => prompt.indexOf(`\n${i + 1}. \`${key}\``));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('describes the narrative delimiters used by buildUserMessage', () => {
    expect(prompt).toContain('<<<BEGIN_PARENT_NARRATIVE id=');
    expect(prompt).toContain('<<<END_PARENT_NARRATIVE id=');
  });
});

describe('buildUserMessage', () => {
  it('wraps the narrative in markers with a per-request random id', () => {
    const req = { childAge: { value: 2.5, unit: 'years' as const }, narrative: 'Fictional story text here.' };
    const a = buildUserMessage(req);
    const b = buildUserMessage(req);
    const idA = /BEGIN_PARENT_NARRATIVE id=(\w+)/.exec(a)?.[1];
    const idB = /BEGIN_PARENT_NARRATIVE id=(\w+)/.exec(b)?.[1];
    expect(idA).toMatch(/^[0-9a-f]{16}$/);
    expect(idA).not.toBe(idB);
    expect(a).toContain(`<<<BEGIN_PARENT_NARRATIVE id=${idA}>>>\nFictional story text here.\n<<<END_PARENT_NARRATIVE id=${idA}>>>`);
    expect(a).toContain('2.5 years');
    expect(a).toContain("Child's pronoun: not given");
  });

  it.each([
    ['she', 'she/her'],
    ['he', 'he/him'],
    ['they', 'they/them'],
  ] as const)('passes the parent-chosen pronoun %s as %s', (childPronoun, words) => {
    const message = buildUserMessage({
      childAge: { value: 3, unit: 'years' },
      narrative: 'Fictional story text here.',
      childPronoun,
    });
    expect(message).toContain(`Child's pronoun (chosen by the parent): ${words}`);
  });
});

describe('prompt pronoun rule (spec 4.3)', () => {
  it('tells the model to use the given pronoun and never guess gender', () => {
    expect(loadSystemPrompt()).toContain(
      "In questions and reasons, refer to the child using the pronoun given. If none is given, say 'your child' in English, or 'siya' or 'anak ninyo' in Filipino. Never guess the child's gender.",
    );
  });
});

describe('loadConfig', () => {
  it('uses spec defaults', () => {
    const c = loadConfig({});
    expect(c).toEqual({ llm: null, llmTimeoutMs: 60000, rateLimitMax: 10, trustProxy: false });
  });

  it('reads LLM_* and limits; base URL is optional', () => {
    const c = loadConfig({
      LLM_API_KEY: 'k',
      LLM_MODEL: 'm',
      LLM_TIMEOUT_MS: '5000',
      RATE_LIMIT_MAX: '3',
      NODE_ENV: 'production',
    });
    expect(c.llm).toEqual({ apiKey: 'k', model: 'm', baseUrl: 'https://api.openai.com/v1' });
    expect(c.llmTimeoutMs).toBe(5000);
    expect(c.rateLimitMax).toBe(3);
    expect(c.trustProxy).toBe(1);
  });

  it('ignores invalid numbers', () => {
    const c = loadConfig({ LLM_TIMEOUT_MS: 'soon', RATE_LIMIT_MAX: '-4' });
    expect(c.llmTimeoutMs).toBe(60000);
    expect(c.rateLimitMax).toBe(10);
  });
});
