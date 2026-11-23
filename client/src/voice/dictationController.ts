/**
 * Voice dictation controller — spec 4.2 (AC-08, AC-09, AC-10).
 *
 * Framework-free so it can be unit-tested with a fake recognition object.
 * Speech recognition runs in the browser; this code never stores or sends audio.
 * Dictation only appends text; it never submits anything.
 */
import { NARRATIVE_MAX_CHARS, codePointLength } from '@my-childs-story/shared';

export type DictationLanguage = 'en-PH' | 'fil-PH';

/** The subset of the Web Speech API's SpeechRecognition that we use. */
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface RecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

export type RecognitionConstructor = new () => RecognitionLike;

/** Feature detection: SpeechRecognition or webkitSpeechRecognition, else null. */
export function getRecognitionConstructor(
  win: unknown = typeof window === 'undefined' ? undefined : window,
): RecognitionConstructor | null {
  if (typeof win !== 'object' || win === null) return null;
  const w = win as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === 'function' ? (ctor as RecognitionConstructor) : null;
}

export type DictationErrorKind = 'not-allowed' | 'no-speech' | 'network' | 'audio-capture' | 'other';

export type DictationCallbacks = {
  /** Current story text (read when final results arrive, for the limit check). */
  getText(): string;
  /** Append to the end of the story field. `chunk` already includes any leading space. */
  appendText(chunk: string): void;
  /** Interim (not yet final) words, for display only. '' clears. */
  onInterim(text: string): void;
  onListeningChange(listening: boolean): void;
  onError(kind: DictationErrorKind): void;
  /** Listening stopped because the story reached the limit. `partial` = some words did not fit. */
  onLimitReached(partial: boolean): void;
};

export type DictationController = {
  start(language: DictationLanguage): void;
  stop(): void;
  isListening(): boolean;
  /** Stops immediately and detaches all handlers (e.g. on unmount). */
  dispose(): void;
};

const ERROR_KINDS: Record<string, DictationErrorKind> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'no-speech': 'no-speech',
  network: 'network',
  'audio-capture': 'audio-capture',
};

/**
 * Returns the text to append so that `existing + chunk` stays within `max` code
 * points, adding whole words only. `fits` is false when some words were left out.
 */
export function fitChunk(existing: string, addition: string, max = NARRATIVE_MAX_CHARS) {
  const words = addition.trim().split(/\s+/u).filter(Boolean);
  const needsSpace = existing.length > 0 && !/\s$/u.test(existing);
  let chunk = '';
  let used = codePointLength(existing);
  let added = 0;
  for (const word of words) {
    const piece = (chunk === '' ? (needsSpace ? ' ' : '') : ' ') + word;
    const length = codePointLength(piece);
    if (used + length > max) break;
    chunk += piece;
    used += length;
    added += 1;
  }
  return { chunk, fits: added === words.length };
}

export function createDictationController(
  Recognition: RecognitionConstructor,
  callbacks: DictationCallbacks,
  maxChars = NARRATIVE_MAX_CHARS,
): DictationController {
  let recognition: RecognitionLike | null = null;
  /** True while the parent wants to listen (pressed Start and not Stop). */
  let wanted = false;
  let listening = false;

  const setListening = (value: boolean) => {
    if (listening !== value) {
      listening = value;
      callbacks.onListeningChange(value);
    }
  };

  const halt = () => {
    wanted = false;
    setListening(false);
    recognition?.stop();
  };

  const atLimit = () => codePointLength(callbacks.getText()) >= maxChars;

  const handleResult = (event: RecognitionResultEventLike) => {
    let finals = '';
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const transcript = result[0].transcript;
      if (result.isFinal) finals += ` ${transcript}`;
      else interim += ` ${transcript}`;
    }
    if (finals.trim()) {
      const before = callbacks.getText();
      const { chunk, fits } = fitChunk(before, finals, maxChars);
      if (chunk) callbacks.appendText(chunk);
      if (!fits || codePointLength(before) + codePointLength(chunk) >= maxChars) {
        callbacks.onInterim('');
        callbacks.onLimitReached(!fits);
        halt();
        return;
      }
    }
    callbacks.onInterim(listening ? interim.trim() : '');
  };

  const handleError = (event: { error: string }) => {
    if (event.error === 'aborted') return;
    callbacks.onError(ERROR_KINDS[event.error] ?? 'other');
    halt();
  };

  const handleEnd = () => {
    if (wanted && recognition) {
      // Browsers end recognition after silence; restart once per end event.
      try {
        recognition.start();
        return;
      } catch {
        callbacks.onError('other');
        wanted = false;
      }
    }
    callbacks.onInterim('');
    setListening(false);
  };

  return {
    start(language) {
      if (wanted) return;
      if (atLimit()) {
        callbacks.onLimitReached(false);
        return;
      }
      if (!recognition) {
        recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = handleResult;
        recognition.onerror = handleError;
        recognition.onend = handleEnd;
      }
      recognition.lang = language;
      wanted = true;
      try {
        recognition.start();
      } catch {
        wanted = false;
        callbacks.onError('other');
        return;
      }
      setListening(true);
    },
    stop() {
      // Final results that arrive after Stop are still appended (never lost).
      halt();
    },
    isListening: () => listening,
    dispose() {
      wanted = false;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
        recognition = null;
      }
      listening = false;
    },
  };
}
