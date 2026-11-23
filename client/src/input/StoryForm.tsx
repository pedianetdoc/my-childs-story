/**
 * Start screen form — spec 4.1 and section 5 steps 1–2 (AC-02).
 * Age + unit, story field with live "X / 5000" counter, guiding prompts and a
 * fictional example. Input past the limit is blocked, never silently truncated.
 */
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  NARRATIVE_MAX_CHARS,
  codePointLength,
  type AgeUnit,
  type ChildPronoun,
  type OrganizeStoryRequest,
} from '@my-childs-story/shared';
import { CHILD_OPTIONS } from '../content/activities';
import { FICTIONAL_EXAMPLE } from '../content/fictionalExample';
import { GUIDING_PROMPTS } from '../content/guidingPrompts';
import { validateStoryInput, type StoryInputErrors } from './validateStoryInput';
import type { DictationLanguage } from '../voice/dictationController';
import { VoiceInput, type VoiceInputHandle } from '../voice/VoiceInput';

export const LIMIT_MESSAGE =
  `The story can be at most ${NARRATIVE_MAX_CHARS} characters. ` +
  'Nothing was cut; please shorten it before adding more.';

export type StoryFormProps = {
  ageText: string;
  unit: AgeUnit;
  narrative: string;
  onAgeTextChange: (value: string) => void;
  onUnitChange: (value: AgeUnit) => void;
  childPronoun: ChildPronoun | null;
  onChildPronounChange: (value: ChildPronoun | null) => void;
  onNarrativeChange: (value: string) => void;
  dictationLanguage: DictationLanguage;
  onDictationLanguageChange: (value: DictationLanguage) => void;
  /** Called only with input that passed validation. */
  onSubmit: (request: OrganizeStoryRequest) => void;
  busy?: boolean;
  submitLabel?: string;
  busyLabel?: string;
  /** Rendered below the submit button (status, errors, confirmations). */
  children?: ReactNode;
};

export function StoryForm(props: StoryFormProps) {
  const { ageText, unit, narrative, busy = false } = props;
  const [errors, setErrors] = useState<StoryInputErrors>({});
  const [limitHit, setLimitHit] = useState(false);
  const ageRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef<VoiceInputHandle>(null);
  /** Latest story text, updated synchronously so dictation never appends to stale text. */
  const textRef = useRef(narrative);
  textRef.current = narrative;

  const count = codePointLength(narrative.trim());
  const isExample = narrative === FICTIONAL_EXAMPLE.narrative;

  const handleNarrative = (value: string) => {
    if (codePointLength(value) > NARRATIVE_MAX_CHARS) {
      // Block the change entirely (typing or pasting); never truncate.
      setLimitHit(true);
      return;
    }
    setLimitHit(false);
    if (errors.narrative) setErrors(({ narrative: _n, ...rest }) => rest);
    textRef.current = value;
    props.onNarrativeChange(value);
  };

  /** Dictated text goes at the end of the same field; the controller keeps it within the limit. */
  const appendDictation = (chunk: string) => {
    textRef.current += chunk;
    if (errors.narrative) setErrors(({ narrative: _n, ...rest }) => rest);
    props.onNarrativeChange(textRef.current);
  };

  const handleAge = (value: string) => {
    if (errors.age) setErrors(({ age: _a, ...rest }) => rest);
    props.onAgeTextChange(value);
  };

  const loadExample = () => {
    props.onAgeTextChange(FICTIONAL_EXAMPLE.age.value);
    props.onUnitChange(FICTIONAL_EXAMPLE.age.unit);
    props.onNarrativeChange(FICTIONAL_EXAMPLE.narrative);
    setErrors({});
    setLimitHit(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Submitting is always the parent's action; stop listening first.
    voiceRef.current?.stop();
    if (busy) return;
    const result = validateStoryInput({ ageText, unit, narrative, childPronoun: props.childPronoun });
    if (!result.ok) {
      setErrors(result.errors);
      (result.errors.age ? ageRef : storyRef).current?.focus();
      return;
    }
    setErrors({});
    props.onSubmit(result.request);
  };

  return (
    <form className="story-form" onSubmit={submit} noValidate aria-busy={busy}>
      <fieldset className="field age-field">
        <legend>Child’s age</legend>
        <p className="hint" id="age-hint">
          For context only. You can use one decimal, for example 2.5.
        </p>
        <div className="age-row">
          <label className="visually-hidden" htmlFor="age-value">
            Age
          </label>
          <input
            id="age-value"
            ref={ageRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={ageText}
            onChange={(e) => handleAge(e.target.value)}
            aria-invalid={errors.age ? true : undefined}
            aria-describedby={errors.age ? 'age-hint age-error' : 'age-hint'}
          />
          <label className="visually-hidden" htmlFor="age-unit">
            Age unit
          </label>
          <select
            id="age-unit"
            value={unit}
            onChange={(e) => props.onUnitChange(e.target.value as AgeUnit)}
          >
            <option value="months">months</option>
            <option value="years">years</option>
          </select>
        </div>
        {errors.age && (
          <p className="field-error" id="age-error">
            {errors.age}
          </p>
        )}
      </fieldset>

      <div className="field child-field">
        <label htmlFor="child-pronoun">My child is:</label>
        <select
          id="child-pronoun"
          value={props.childPronoun ?? ''}
          onChange={(e) => props.onChildPronounChange((e.target.value || null) as ChildPronoun | null)}
          aria-describedby="child-pronoun-hint"
        >
          {CHILD_OPTIONS.map((option) => (
            <option key={option.label} value={option.value ?? ''}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="hint" id="child-pronoun-hint">
          Optional. Only used to say “her”, “him” or “them” in suggested questions and examples.
        </p>
      </div>

      <section className="guiding-prompts" aria-labelledby="prompts-heading">
        <h2 id="prompts-heading">Things you might mention</h2>
        <p className="hint">Optional. Write in English, Filipino or Taglish. About five minutes is enough.</p>
        <ul>
          {GUIDING_PROMPTS.map((prompt) => (
            <li key={prompt.en}>
              <span className="prompt-en">{prompt.en}</span>
              <span className="prompt-fil" lang="fil">
                {prompt.fil}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="field story-field">
        <label htmlFor="story">Your child’s story</label>
        <textarea
          id="story"
          ref={storyRef}
          rows={10}
          value={narrative}
          onChange={(e) => handleNarrative(e.target.value)}
          aria-invalid={errors.narrative ? true : undefined}
          aria-describedby={
            ['story-counter', errors.narrative && 'story-error', limitHit && 'story-limit']
              .filter(Boolean)
              .join(' ')
          }
        />
        <p className="counter" id="story-counter">
          {count} / {NARRATIVE_MAX_CHARS}
        </p>
        {limitHit && (
          <p className="field-error" id="story-limit" role="alert">
            {LIMIT_MESSAGE}
          </p>
        )}
        {errors.narrative && (
          <p className="field-error" id="story-error">
            {errors.narrative}
          </p>
        )}
        <VoiceInput
          language={props.dictationLanguage}
          onLanguageChange={props.onDictationLanguageChange}
          getText={() => textRef.current}
          appendText={appendDictation}
          disabled={busy}
          controlRef={voiceRef}
        />
        {isExample && (
          <p className="example-label" role="note">
            Fictional example — not a real child. You can edit it or replace it with your own
            made-up story.
          </p>
        )}
        <button
          type="button"
          className="button button-secondary"
          onClick={loadExample}
          disabled={narrative.trim() !== '' || busy}
          aria-describedby="example-hint"
        >
          Use a fictional example
        </button>
        <p className="hint" id="example-hint">
          {narrative.trim() === ''
            ? 'Fills in a made-up Taglish story so you can try the app.'
            : 'Available when the story box is empty, so your text is never replaced.'}
        </p>
      </div>

      {(errors.age || errors.narrative) && (
        <div className="form-error" role="alert">
          <p>Please check the highlighted fields:</p>
          <ul>
            {errors.age && <li>{errors.age}</li>}
            {errors.narrative && <li>{errors.narrative}</li>}
          </ul>
        </div>
      )}

      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? (props.busyLabel ?? 'Organizing your story…') : (props.submitLabel ?? 'Organize My Story')}
      </button>
      {props.children}
    </form>
  );
}
