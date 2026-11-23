import { afterEach, vi } from 'vitest';
import { filledDraft } from '../test/draftFixture';
import { emptyDraft } from './draft';
import { STORAGE_KEY, clearDraft, hasContent, isDraft, loadDraft, saveDraft } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('AC-15: sessionStorage draft', () => {
  it('AC-15: saves and restores the full draft', () => {
    const draft = filledDraft({ includeOriginalNarrative: true, exportBaseName: 'visit' });
    expect(saveDraft(draft)).toBe(true);
    expect(loadDraft()).toEqual(draft);
  });

  it('uses sessionStorage only (tab-scoped), never localStorage', () => {
    saveDraft(filledDraft());
    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it('AC-15: clearDraft removes it', () => {
    saveDraft(filledDraft());
    clearDraft();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadDraft()).toBeNull();
  });

  it('returns null when nothing is saved', () => {
    expect(loadDraft()).toBeNull();
  });

  it('reopens the story screen if a saved preview has no result', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...filledDraft(), result: null, screen: 'preview' }));
    expect(loadDraft()?.screen).toBe('input');
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong shape', JSON.stringify({ hello: 'world' })],
    ['an invalid result', JSON.stringify({ ...filledDraft(), result: { categories: {} } })],
    ['an unknown activity', JSON.stringify({ ...filledDraft(), activity: { activityId: 'x', status: 'tried', notes: '' } })],
    ['a bad answer id', JSON.stringify({ ...filledDraft(), clarificationAnswers: { q9: { status: 'unknown' } } })],
  ])('discards %s instead of repairing it', (_label, raw) => {
    window.sessionStorage.setItem(STORAGE_KEY, raw);
    expect(loadDraft()).toBeNull();
  });

  it('handles storage that throws (blocked or full) without crashing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(saveDraft(filledDraft())).toBe(false);
    expect(loadDraft()).toBeNull();
    expect(() => clearDraft()).not.toThrow();
  });

  it('isDraft accepts the empty draft', () => {
    expect(isDraft(emptyDraft())).toBe(true);
  });

  it('hasContent is false only for an untouched draft', () => {
    expect(hasContent(emptyDraft())).toBe(false);
    expect(hasContent({ ...emptyDraft(), originalNarrative: 'x' })).toBe(true);
    expect(hasContent({ ...emptyDraft(), ageText: '3' })).toBe(true);
  });
});
