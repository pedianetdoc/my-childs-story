import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { App } from './App';
import { field } from './test/helpers';
import { FakeRecognition } from './voice/fakeRecognition';
import { VOICE_MESSAGES } from './voice/VoiceInput';

const startButton = () => screen.getByRole('button', { name: /Start speaking/ });

beforeEach(() => {
  FakeRecognition.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  FakeRecognition.reset();
});

describe('AC-09: browser without speech recognition', () => {
  it('AC-09: hides the microphone and shows typing guidance; typing works', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: /Start speaking/ })).not.toBeInTheDocument();
    expect(screen.getByText(VOICE_MESSAGES.unsupported)).toBeInTheDocument();
    fireEvent.change(field.story(), { target: { value: 'Typed story works fine here.' } });
    expect(field.story().value).toBe('Typed story works fine here.');
  });
});

describe('AC-08 / AC-10: dictation in the app', () => {
  beforeEach(() => {
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
  });

  it('AC-10: offers English (Philippines) by default and Filipino, with the Taglish caveat', () => {
    render(<App />);
    const select = screen.getByLabelText('Language to listen for');
    expect(select).toHaveValue('en-PH');
    expect(screen.getByRole('option', { name: 'Filipino' })).toHaveValue('fil-PH');
    expect(screen.getByText(/Taglish may need some corrections/)).toBeInTheDocument();
  });

  it('AC-08: Start shows Listening…, interim text is separate, final text joins the same editable field', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<App />);
    fireEvent.change(field.story(), { target: { value: 'He likes trains.' } });
    fireEvent.change(screen.getByLabelText('Language to listen for'), { target: { value: 'fil-PH' } });
    fireEvent.click(startButton());

    const rec = FakeRecognition.last();
    expect(rec.lang).toBe('fil-PH');
    expect(screen.getByRole('status')).toHaveTextContent('Listening…');
    expect(screen.getByRole('button', { name: /Stop/ })).toHaveAttribute('aria-pressed', 'true');

    act(() => rec.emitInterim('mahilig siyang'));
    expect(screen.getByLabelText('Words being heard (not yet added)')).toHaveTextContent('mahilig siyang');
    expect(field.story().value).toBe('He likes trains.');

    act(() => rec.emitFinal('Mahilig siyang sumayaw.'));
    expect(field.story().value).toBe('He likes trains. Mahilig siyang sumayaw.');
    expect(screen.getByText('40 / 5000')).toBeInTheDocument();

    // The parent can keep editing; the next final result appends after the edit.
    fireEvent.change(field.story(), { target: { value: 'He likes trains a lot. Mahilig siyang sumayaw.' } });
    act(() => rec.emitFinal('Tapos kumakanta.'));
    expect(field.story().value).toBe('He likes trains a lot. Mahilig siyang sumayaw. Tapos kumakanta.');

    // Continues after a pause until Stop.
    act(() => rec.emitEnd());
    expect(rec.startCalls).toBe(2);
    expect(screen.getByRole('status')).toHaveTextContent('Listening…');

    fireEvent.click(screen.getByRole('button', { name: /Stop/ }));
    act(() => rec.emitEnd());
    expect(screen.queryByText('Listening…')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('AC-08: never submits automatically, even when dictation fills a valid story', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<App />);
    fireEvent.change(field.age(), { target: { value: '3' } });
    fireEvent.click(startButton());
    act(() => FakeRecognition.last().emitFinal('He loves puzzles and can finish them by himself.'));
    act(() => FakeRecognition.last().emitEnd());
    fireEvent.click(screen.getByRole('button', { name: /Stop/ }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Organize My Story' })).toBeEnabled();
  });

  it('AC-08: stops at 5000 characters and shows the limit message', () => {
    render(<App />);
    fireEvent.change(field.story(), { target: { value: 'a'.repeat(4995) } });
    fireEvent.click(startButton());
    act(() => FakeRecognition.last().emitFinal('word another'));
    expect(field.story().value).toBe(`${'a'.repeat(4995)} word`);
    expect(screen.getByRole('alert')).toHaveTextContent(VOICE_MESSAGES.limitPartial);
    expect(screen.queryByText('Listening…')).not.toBeInTheDocument();
  });

  it.each([
    ['not-allowed', VOICE_MESSAGES['not-allowed']],
    ['service-not-allowed', VOICE_MESSAGES['not-allowed']],
    ['no-speech', VOICE_MESSAGES['no-speech']],
    ['network', VOICE_MESSAGES.network],
    ['audio-capture', VOICE_MESSAGES['audio-capture']],
  ])('AC-09: "%s" shows a friendly message and keeps typed text', (error, message) => {
    render(<App />);
    fireEvent.change(field.story(), { target: { value: 'Typed text stays here.' } });
    fireEvent.click(startButton());
    act(() => FakeRecognition.last().emitError(error));
    act(() => FakeRecognition.last().emitEnd());
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(field.story().value).toBe('Typed text stays here.');
    fireEvent.change(field.story(), { target: { value: 'Typed text stays here. More typing.' } });
    expect(field.story().value).toBe('Typed text stays here. More typing.');
  });

  it('pressing Organize My Story stops listening first', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<App />);
    fireEvent.change(field.age(), { target: { value: '3' } });
    fireEvent.click(startButton());
    const rec = FakeRecognition.last();
    act(() => rec.emitFinal('He loves puzzles and can finish them by himself.'));
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
    expect(rec.stopCalls).toBeGreaterThan(0);
  });
});
