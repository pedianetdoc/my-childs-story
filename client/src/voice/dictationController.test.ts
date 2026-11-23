import { afterEach, beforeEach, vi } from 'vitest';
import {
  createDictationController,
  fitChunk,
  getRecognitionConstructor,
  type DictationCallbacks,
} from './dictationController';
import { FakeRecognition } from './fakeRecognition';

function setup(initial = '', max?: number) {
  let text = initial;
  const callbacks = {
    getText: () => text,
    appendText: vi.fn((chunk: string) => {
      text += chunk;
    }),
    onInterim: vi.fn(),
    onListeningChange: vi.fn(),
    onError: vi.fn(),
    onLimitReached: vi.fn(),
  } satisfies DictationCallbacks;
  const controller = createDictationController(FakeRecognition, callbacks, max);
  return { controller, callbacks, text: () => text };
}

beforeEach(() => FakeRecognition.reset());
afterEach(() => FakeRecognition.reset());

describe('feature detection (AC-09)', () => {
  it('finds SpeechRecognition or webkitSpeechRecognition', () => {
    expect(getRecognitionConstructor({ SpeechRecognition: FakeRecognition })).toBe(FakeRecognition);
    expect(getRecognitionConstructor({ webkitSpeechRecognition: FakeRecognition })).toBe(FakeRecognition);
  });

  it('returns null when the browser has neither (e.g. Firefox)', () => {
    expect(getRecognitionConstructor({})).toBeNull();
    expect(getRecognitionConstructor(undefined)).toBeNull();
  });
});

describe('AC-08: dictation controller', () => {
  it('AC-08: starts with continuous, interimResults and the chosen language', () => {
    const { controller, callbacks } = setup();
    controller.start('fil-PH');
    const rec = FakeRecognition.last();
    expect(rec.continuous).toBe(true);
    expect(rec.interimResults).toBe(true);
    expect(rec.lang).toBe('fil-PH');
    expect(rec.startCalls).toBe(1);
    expect(callbacks.onListeningChange).toHaveBeenLastCalledWith(true);
    expect(controller.isListening()).toBe(true);
  });

  it('AC-08: shows interim text separately and appends only final text, with a space', () => {
    const { controller, callbacks, text } = setup('He likes trains.');
    controller.start('en-PH');
    const rec = FakeRecognition.last();
    rec.emitInterim('and he');
    expect(callbacks.onInterim).toHaveBeenLastCalledWith('and he');
    expect(text()).toBe('He likes trains.');

    rec.emitFinal('and he sings a lot');
    expect(text()).toBe('He likes trains. and he sings a lot');
    rec.emitFinal('tapos sumasayaw siya');
    expect(text()).toBe('He likes trains. and he sings a lot tapos sumasayaw siya');
  });

  it('AC-08: does not add a space to an empty field or after existing whitespace', () => {
    const empty = setup('');
    empty.controller.start('en-PH');
    FakeRecognition.last().emitFinal(' He loves puzzles ');
    expect(empty.text()).toBe('He loves puzzles');

    FakeRecognition.reset();
    const spaced = setup('First line.\n');
    spaced.controller.start('en-PH');
    FakeRecognition.last().emitFinal('Second line');
    expect(spaced.text()).toBe('First line.\nSecond line');
  });

  it('AC-08: restarts automatically after silence while the parent has not pressed Stop', () => {
    const { controller, callbacks } = setup();
    controller.start('en-PH');
    const rec = FakeRecognition.last();
    rec.emitEnd();
    expect(rec.startCalls).toBe(2);
    rec.emitEnd();
    expect(rec.startCalls).toBe(3);
    expect(controller.isListening()).toBe(true);
    expect(callbacks.onListeningChange).toHaveBeenCalledTimes(1);
  });

  it('AC-08: Stop ends listening and does not restart; late final results are still kept', () => {
    const { controller, callbacks, text } = setup();
    controller.start('en-PH');
    const rec = FakeRecognition.last();
    controller.stop();
    expect(rec.stopCalls).toBe(1);
    expect(callbacks.onListeningChange).toHaveBeenLastCalledWith(false);

    rec.emitFinal('last words');
    expect(text()).toBe('last words');
    rec.emitEnd();
    expect(rec.startCalls).toBe(1);
    expect(callbacks.onInterim).toHaveBeenLastCalledWith('');
  });

  it('AC-08: stops at 5000 characters and reports the limit', () => {
    const { controller, callbacks, text } = setup('a'.repeat(4990));
    controller.start('en-PH');
    const rec = FakeRecognition.last();
    rec.emitFinal('one two three');
    // " one two" is 8 code points (4998 total); " three" would pass 5000.
    expect(text()).toBe(`${'a'.repeat(4990)} one two`);
    expect(callbacks.onLimitReached).toHaveBeenCalledWith(true);
    expect(controller.isListening()).toBe(false);
    rec.emitEnd();
    expect(rec.startCalls).toBe(1);
  });

  it('AC-08: stops when the text lands exactly on the limit', () => {
    const { controller, callbacks, text } = setup('a'.repeat(4996));
    controller.start('en-PH');
    FakeRecognition.last().emitFinal('abc');
    expect(text()).toHaveLength(5000);
    expect(callbacks.onLimitReached).toHaveBeenCalledWith(false);
    expect(controller.isListening()).toBe(false);
  });

  it('AC-08: does not start when the story is already full', () => {
    const { controller, callbacks } = setup('a'.repeat(5000));
    controller.start('en-PH');
    expect(FakeRecognition.instances).toHaveLength(0);
    expect(callbacks.onLimitReached).toHaveBeenCalledWith(false);
  });

  it('AC-08: never submits — the controller only appends text', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { controller } = setup();
    controller.start('en-PH');
    FakeRecognition.last().emitFinal('He loves puzzles and can finish them himself.');
    FakeRecognition.last().emitEnd();
    controller.stop();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('dispose detaches handlers and aborts', () => {
    const { controller, text } = setup();
    controller.start('en-PH');
    const rec = FakeRecognition.last();
    controller.dispose();
    expect(rec.abortCalls).toBe(1);
    expect(rec.onresult).toBeNull();
    expect(text()).toBe('');
  });
});

describe('AC-09: errors', () => {
  it.each([
    ['not-allowed', 'not-allowed'],
    ['service-not-allowed', 'not-allowed'],
    ['no-speech', 'no-speech'],
    ['network', 'network'],
    ['audio-capture', 'audio-capture'],
    ['language-not-supported', 'other'],
  ])('AC-09: "%s" reports %s, stops, and keeps the text', (error, kind) => {
    const { controller, callbacks, text } = setup('Typed text stays.');
    controller.start('en-PH');
    const rec = FakeRecognition.last();
    rec.emitError(error);
    expect(callbacks.onError).toHaveBeenCalledWith(kind);
    expect(controller.isListening()).toBe(false);
    rec.emitEnd();
    expect(rec.startCalls).toBe(1);
    expect(text()).toBe('Typed text stays.');
  });

  it('ignores "aborted" (caused by our own stop/dispose)', () => {
    const { controller, callbacks } = setup();
    controller.start('en-PH');
    FakeRecognition.last().emitError('aborted');
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it('reports a failed start without listening', () => {
    const { controller, callbacks } = setup();
    FakeRecognition.failNextStart = true;
    controller.start('en-PH');
    expect(callbacks.onError).toHaveBeenCalledWith('other');
    expect(controller.isListening()).toBe(false);
  });

  it('reports a failed automatic restart and stops listening', () => {
    const { controller, callbacks } = setup();
    controller.start('en-PH');
    FakeRecognition.failNextStart = true;
    FakeRecognition.last().emitEnd();
    expect(callbacks.onError).toHaveBeenCalledWith('other');
    expect(controller.isListening()).toBe(false);
  });
});

describe('fitChunk', () => {
  it('adds whole words only, counting code points', () => {
    expect(fitChunk('ab', 'cd ef', 8)).toEqual({ chunk: ' cd ef', fits: true });
    expect(fitChunk('ab', 'cd ef', 7)).toEqual({ chunk: ' cd', fits: false });
    expect(fitChunk('', '🎵 hi', 4)).toEqual({ chunk: '🎵 hi', fits: true });
  });
});
