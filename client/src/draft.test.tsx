import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { App } from './App';
import { CLEAR_WARNING, DRAFT_NOTE, STORAGE_UNAVAILABLE } from './draft/DraftControls';
import { DRAFT_HEADER, buildDraftText } from './draft/draftText';
import { STORAGE_KEY } from './draft/storage';
import { saveBlob } from './export/exporters';
import { filledDraft } from './test/draftFixture';
import { STORY, field, fillValidStory, jsonResponse, mockFetch, sampleResult } from './test/helpers';

vi.mock('./export/exporters', () => ({
  downloadWord: vi.fn(),
  downloadPdf: vi.fn(),
  saveBlob: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 22, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(saveBlob).mockClear();
});

/** Simulates a page refresh in the same tab: unmount, then mount a fresh App. */
function refresh(view: ReturnType<typeof render>) {
  view.unmount();
  return render(<App />);
}

async function organize() {
  mockFetch(jsonResponse(200, sampleResult()));
  fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
  await screen.findByRole('heading', { name: 'Your organized story' });
}

describe('AC-15: draft continuity', () => {
  it('AC-15: restores the story after a refresh in the same tab', () => {
    const view = render(<App />);
    fillValidStory();
    refresh(view);
    expect(field.story().value).toBe(STORY);
    expect(field.age().value).toBe('3');
    expect(screen.getByRole('status')).toHaveTextContent('We brought back the draft from this tab.');
  });

  it('AC-15: restores the organized preview, answers, parent fields and activity', async () => {
    const view = render(<App />);
    fillValidStory();
    await organize();
    fireEvent.change(screen.getByLabelText('Questions you want to ask the doctor'), { target: { value: 'Q?' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Connect' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Tried it' }));
    const q1 = screen.getByRole('group', { name: 'Which words does he say now?' });
    fireEvent.click(within(q1).getByRole('radio', { name: 'I don’t know' }));

    refresh(view);
    expect(screen.getByRole('heading', { name: 'Your organized story' })).toBeInTheDocument();
    expect(screen.getByText('He loves stacking blocks.')).toBeInTheDocument();
    expect(screen.getByLabelText('Questions you want to ask the doctor')).toHaveValue('Q?');
    expect(screen.getByRole('radio', { name: 'Tried it' })).toBeChecked();
    const q1After = screen.getByRole('group', { name: 'Which words does he say now?' });
    expect(within(q1After).getByRole('radio', { name: 'I don’t know' })).toBeChecked();
  });

  it('AC-15: Clear My Information asks first, then clears the draft and storage', async () => {
    render(<App />);
    fillValidStory();
    await organize();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear My Information' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Clear your information?' });
    expect(dialog).toHaveTextContent(CLEAR_WARNING);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Your organized story' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear My Information' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear everything' }));

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(field.story().value).toBe('');
    expect(field.age().value).toBe('');
    expect(screen.getByText('Your information has been cleared from this tab.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organize My Story' })).toBeInTheDocument();
  });

  it('AC-15: after Clear, a refresh starts empty', async () => {
    const view = render(<App />);
    fillValidStory();
    fireEvent.click(screen.getByRole('button', { name: 'Clear My Information' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear everything' }));
    refresh(view);
    expect(field.story().value).toBe('');
    expect(screen.queryByText('We brought back the draft from this tab.')).not.toBeInTheDocument();
  });

  it('never claims the work is safely or permanently saved', () => {
    render(<App />);
    expect(screen.getByText(DRAFT_NOTE)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/safely saved|permanently saved|saved permanently/i);
  });

  it('says so when this browser cannot keep the draft', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    render(<App />);
    fireEvent.change(field.story(), { target: { value: 'Something typed.' } });
    expect(screen.getByText(STORAGE_UNAVAILABLE)).toBeInTheDocument();
    expect(field.story().value).toBe('Something typed.');
  });
});

describe('Leave-page warning', () => {
  it('warns when closing the tab with a story, not when empty', () => {
    render(<App />);
    const empty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(empty);
    expect(empty.defaultPrevented).toBe(false);

    fireEvent.change(field.story(), { target: { value: 'A story in progress.' } });
    const withStory = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(withStory);
    expect(withStory.defaultPrevented).toBe(true);
  });
});

describe('Download My Draft (.txt)', () => {
  it('downloads a plain-text file marked as a draft, with everything in it', async () => {
    render(<App />);
    fillValidStory();
    await organize();
    fireEvent.change(screen.getByLabelText('Questions you want to ask the doctor'), { target: { value: 'Q?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download My Draft (.txt)' }));

    expect(saveBlob).toHaveBeenCalledTimes(1);
    const [blob, fileName] = vi.mocked(saveBlob).mock.calls[0] as [Blob, string];
    expect(fileName).toBe('story-2026-11-22-draft.txt');
    expect(blob.type).toBe('text/plain;charset=utf-8');
    const text = await blob.text();
    expect(text.startsWith(DRAFT_HEADER[0] as string)).toBe(true);
    expect(text).toContain('He loves stacking blocks.');
    expect(text).toContain('Q?');
    expect(text).toContain(STORY);
  });

  it('works before organizing, with just the age and story', () => {
    const text = buildDraftText({ ...filledDraft(), result: null, activity: null }, new Date(2026, 10, 22));
    expect(text).toContain('DRAFT — not a final document.');
    expect(text).toContain('Child’s age: 2.5 years');
    expect(text).toContain('Señor Niño is his favorite song.');
  });
});
