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

describe('history-organizer prompt (spec 3, 4.4, 4.6)', () => {
  const raw = fs.readFileSync(DEFAULT_PROMPT_PATH, 'utf8');
  const prompt = loadSystemPrompt();

  it('is marked DRAFT in the file and in the version string', () => {
    expect(raw).toMatch(/DRAFT — PENDING CLINICIAN REVIEW/);
    expect(PROMPT_VERSION).toBe('history-organizer.v1-draft');
  });

  it('strips the maintainer comment before sending', () => {
    expect(prompt).not.toContain('<!--');
    expect(prompt).not.toContain('PENDING CLINICIAN REVIEW');
  });

  it('lists every category key, in the fixed order', () => {
    const positions = CATEGORY_KEYS.map((key) => prompt.indexOf(`\`${key}\``));
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
