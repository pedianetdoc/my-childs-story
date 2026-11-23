/**
 * Optional voice dictation UI — spec 4.2 (AC-08, AC-09, AC-10).
 * The microphone button appears only when the browser supports speech
 * recognition. Dictation appends to the story field and never submits.
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import {
  createDictationController,
  getRecognitionConstructor,
  type DictationController,
  type DictationErrorKind,
  type DictationLanguage,
} from './dictationController';

export const VOICE_MESSAGES = {
  unsupported: 'Voice input isn’t available in this browser; please type.',
  'not-allowed':
    'The microphone is blocked. To use voice, allow the microphone for this site in your browser settings (often the lock icon next to the address), then press Start again. You can keep typing.',
  'no-speech': 'We didn’t hear anything. Press Start to try again, or type. Your text is kept.',
  network:
    'Voice input lost its connection to the browser’s speech service. Press Start to try again, or type. Your text is kept.',
  'audio-capture':
    'No microphone was found. Check that one is connected, or type your story. Your text is kept.',
  other: 'Voice input stopped. Press Start to try again, or type. Your text is kept.',
  limit: 'Listening stopped: the story has reached 5000 characters.',
  limitPartial:
    'Listening stopped: the story has reached 5000 characters. Your last words did not fit and were not added.',
} as const;

export const LANGUAGE_OPTIONS: ReadonlyArray<{ value: DictationLanguage; label: string }> = [
  { value: 'en-PH', label: 'English (Philippines)' },
  { value: 'fil-PH', label: 'Filipino' },
];

export type VoiceInputHandle = { stop(): void };

type Props = {
  language: DictationLanguage;
  onLanguageChange: (language: DictationLanguage) => void;
  /** Always returns the latest story text. */
  getText: () => string;
  appendText: (chunk: string) => void;
  disabled?: boolean;
  controlRef?: Ref<VoiceInputHandle>;
  /** Injectable for tests; defaults to window feature detection. */
  recognitionWindow?: unknown;
};

export function VoiceInput(props: Props) {
  const Recognition = useMemo(
    () => getRecognitionConstructor(props.recognitionWindow ?? globalThis.window),
    [props.recognitionWindow],
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const controllerRef = useRef<DictationController | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (!Recognition) return undefined;
    const controller = createDictationController(Recognition, {
      getText: () => propsRef.current.getText(),
      appendText: (chunk) => propsRef.current.appendText(chunk),
      onInterim: setInterim,
      onListeningChange: setListening,
      onError: (kind: DictationErrorKind) => setMessage(VOICE_MESSAGES[kind]),
      onLimitReached: (partial) => setMessage(partial ? VOICE_MESSAGES.limitPartial : VOICE_MESSAGES.limit),
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [Recognition]);

  useImperativeHandle(props.controlRef, () => ({ stop: () => controllerRef.current?.stop() }), []);

  useEffect(() => {
    if (props.disabled) controllerRef.current?.stop();
  }, [props.disabled]);

  if (!Recognition) {
    return (
      <p className="voice-unsupported hint" id="voice-unsupported">
        {VOICE_MESSAGES.unsupported}
      </p>
    );
  }

  const toggle = () => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (listening) {
      controller.stop();
    } else {
      setMessage(null);
      controller.start(props.language);
    }
  };

  return (
    <section className="voice" aria-labelledby="voice-heading">
      <h2 id="voice-heading" className="voice-heading">
        Or speak your story
      </h2>
      <div className="field">
        <label htmlFor="voice-language">Language to listen for</label>
        <select
          id="voice-language"
          value={props.language}
          disabled={listening}
          onChange={(e) => props.onLanguageChange(e.target.value as DictationLanguage)}
          aria-describedby="voice-language-hint"
        >
          {LANGUAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="hint" id="voice-language-hint">
          The microphone listens for one language at a time, so Taglish may need some corrections.
          Please read your story before you organize it.
        </p>
      </div>
      <button
        type="button"
        className={`button mic-button${listening ? ' is-listening' : ''}`}
        onClick={toggle}
        disabled={props.disabled && !listening}
        aria-pressed={listening}
      >
        <span aria-hidden="true" className="mic-icon">
          {listening ? '■' : '●'}
        </span>{' '}
        {listening ? 'Stop' : 'Start speaking'}
      </button>
      {listening && (
        <p className="status listening" role="status">
          Listening…
        </p>
      )}
      {interim && (
        <p className="interim" aria-label="Words being heard (not yet added)">
          {interim}
        </p>
      )}
      {message && (
        <p className="field-error voice-message" role="alert">
          {message}
        </p>
      )}
      <p className="hint">
        This app stores no audio. Some browsers send your voice to their own speech service, so do
        not speak real names or real personal or medical information.
      </p>
    </section>
  );
}
