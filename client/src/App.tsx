import { useEffect, useRef, useState } from 'react';
import type {
  AgeUnit,
  ClarificationId,
  OrganizeStoryRequest,
  OrganizeStoryResult,
} from '@my-childs-story/shared';
import { organizeStoryRequest, type OrganizeOutcome } from './api/organizeStory';
import { Notices } from './components/Notices';
import { StoryForm } from './input/StoryForm';
import type { ClarificationAnswer, ClarificationAnswers } from './preview/ClarificationQuestions';
import { Preview } from './preview/Preview';
import type { DictationLanguage } from './voice/dictationController';

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

type Screen = 'input' | 'preview';

export const REGENERATE_WARNING =
  'Organizing again will replace your organized story and your answers to the optional ' +
  'questions. Your questions for the doctor and what you hope to get from the visit will be kept.';

export function App() {
  const [ageText, setAgeText] = useState('');
  const [unit, setUnit] = useState<AgeUnit>('years');
  const [narrative, setNarrative] = useState('');
  const [dictationLanguage, setDictationLanguage] = useState<DictationLanguage>('en-PH');
  const [request, setRequest] = useState<RequestState>({ status: 'idle' });
  const [result, setResult] = useState<OrganizeStoryResult | null>(null);
  const [answers, setAnswers] = useState<ClarificationAnswers>({});
  const [parentQuestions, setParentQuestions] = useState('');
  const [visitExpectations, setVisitExpectations] = useState('');
  const [screen, setScreen] = useState<Screen>('input');
  /** A validated request waiting for the parent to confirm regeneration. */
  const [pendingRegenerate, setPendingRegenerate] = useState<OrganizeStoryRequest | null>(null);
  // Guards against a second submission before React re-renders the disabled button.
  const inFlight = useRef(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingRegenerate) confirmRef.current?.focus();
  }, [pendingRegenerate]);

  const organize = async (body: OrganizeStoryRequest) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingRegenerate(null);
    setRequest({ status: 'loading' });
    let outcome: OrganizeOutcome;
    try {
      outcome = await organizeStoryRequest(body);
    } finally {
      inFlight.current = false;
    }
    if (outcome.ok) {
      // Regeneration replaces categories and clarification answers only;
      // parent questions and visit expectations are kept.
      setResult(outcome.result);
      setAnswers({});
      setRequest({ status: 'idle' });
      setScreen('preview');
    } else {
      // A failed regeneration keeps the previous organized story.
      setRequest({ status: 'error', message: outcome.message });
    }
  };

  const handleSubmit = (body: OrganizeStoryRequest) => {
    if (result) {
      setPendingRegenerate(body);
      return;
    }
    void organize(body);
  };

  const editStory = () => {
    setRequest({ status: 'idle' });
    setScreen('input');
  };

  const loading = request.status === 'loading';

  return (
    <main className="app">
      <header className="app-header">
        <h1>My Child&apos;s Story</h1>
        <p className="subtitle">Make the most of your developmental assessment appointment.</p>
      </header>
      <Notices />

      {screen === 'preview' && result ? (
        <Preview
          result={result}
          answers={answers}
          onAnswerChange={(id: ClarificationId, answer: ClarificationAnswer) =>
            setAnswers((prev) => ({ ...prev, [id]: answer }))
          }
          parentQuestions={parentQuestions}
          onParentQuestionsChange={setParentQuestions}
          visitExpectations={visitExpectations}
          onVisitExpectationsChange={setVisitExpectations}
          onEdit={editStory}
        />
      ) : (
        <StoryForm
          ageText={ageText}
          unit={unit}
          narrative={narrative}
          onAgeTextChange={setAgeText}
          onUnitChange={setUnit}
          onNarrativeChange={setNarrative}
          dictationLanguage={dictationLanguage}
          onDictationLanguageChange={setDictationLanguage}
          onSubmit={handleSubmit}
          busy={loading}
          {...(result && { submitLabel: 'Organize My Story again' })}
        >
          {pendingRegenerate && (
            <div
              className="confirm"
              role="alertdialog"
              aria-labelledby="confirm-heading"
              aria-describedby="confirm-text"
              tabIndex={-1}
              ref={confirmRef}
            >
              <h2 id="confirm-heading">Organize your story again?</h2>
              <p id="confirm-text">{REGENERATE_WARNING}</p>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void organize(pendingRegenerate)}
                >
                  Yes, organize again
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setPendingRegenerate(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {loading && (
            <p className="status" role="status">
              Organizing your story. This can take up to a minute.
            </p>
          )}
          {request.status === 'error' && (
            <div className="request-error" role="alert">
              <p>{request.message}</p>
              {/* Submits the story as it is now, through the same validation. */}
              <button type="submit" className="button button-secondary">
                Try again
              </button>
            </div>
          )}
          {result && !pendingRegenerate && !loading && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setRequest({ status: 'idle' });
                setScreen('preview');
              }}
            >
              Back to my organized story
            </button>
          )}
        </StoryForm>
      )}
    </main>
  );
}
