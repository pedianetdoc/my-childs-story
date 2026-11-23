import { useEffect, useRef, useState } from 'react';
import type { ClarificationId, OrganizeStoryRequest } from '@my-childs-story/shared';
import { organizeStoryRequest, type OrganizeOutcome } from './api/organizeStory';
import { Notices } from './components/Notices';
import { emptyDraft, type Draft } from './draft/draft';
import { ExportPanel } from './export/ExportPanel';
import { StoryForm } from './input/StoryForm';
import type { ClarificationAnswer } from './preview/ClarificationQuestions';
import { Preview } from './preview/Preview';

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

export const REGENERATE_WARNING =
  'Organizing again will replace your organized story and your answers to the optional ' +
  'questions. Your questions for the doctor, what you hope to get from the visit and your ' +
  'activity will be kept.';

export function App() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [request, setRequest] = useState<RequestState>({ status: 'idle' });
  /** A validated request waiting for the parent to confirm regeneration. */
  const [pendingRegenerate, setPendingRegenerate] = useState<OrganizeStoryRequest | null>(null);
  // Guards against a second submission before React re-renders the disabled button.
  const inFlight = useRef(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

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
      // Regeneration replaces categories and clarification answers only; parent
      // questions, visit expectations and the activity are kept.
      update({ result: outcome.result, clarificationAnswers: {}, screen: 'preview' });
      setRequest({ status: 'idle' });
    } else {
      // A failed regeneration keeps the previous organized story.
      setRequest({ status: 'error', message: outcome.message });
    }
  };

  const handleSubmit = (body: OrganizeStoryRequest) => {
    if (draft.result) {
      setPendingRegenerate(body);
      return;
    }
    void organize(body);
  };

  const showScreen = (screen: Draft['screen']) => {
    setRequest({ status: 'idle' });
    update({ screen });
  };

  const loading = request.status === 'loading';
  const { result } = draft;

  return (
    <main className="app">
      <header className="app-header">
        <h1>My Child&apos;s Story</h1>
        <p className="subtitle">Make the most of your developmental assessment appointment.</p>
      </header>
      <Notices />

      {draft.screen === 'preview' && result ? (
        <Preview
          result={result}
          answers={draft.clarificationAnswers}
          onAnswerChange={(id: ClarificationId, answer: ClarificationAnswer) =>
            setDraft((d) => ({ ...d, clarificationAnswers: { ...d.clarificationAnswers, [id]: answer } }))
          }
          parentQuestions={draft.parentQuestions}
          onParentQuestionsChange={(parentQuestions) => update({ parentQuestions })}
          visitExpectations={draft.visitExpectations}
          onVisitExpectationsChange={(visitExpectations) => update({ visitExpectations })}
          activity={draft.activity}
          onActivityChange={(activity) => update({ activity })}
          onEdit={() => showScreen('input')}
        >
          <ExportPanel draft={draft} onChange={update} />
        </Preview>
      ) : (
        <StoryForm
          ageText={draft.ageText}
          unit={draft.ageUnit}
          narrative={draft.originalNarrative}
          onAgeTextChange={(ageText) => update({ ageText })}
          onUnitChange={(ageUnit) => update({ ageUnit })}
          onNarrativeChange={(originalNarrative) => update({ originalNarrative })}
          dictationLanguage={draft.dictationLanguage}
          onDictationLanguageChange={(dictationLanguage) => update({ dictationLanguage })}
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
              onClick={() => showScreen('preview')}
            >
              Back to my organized story
            </button>
          )}
        </StoryForm>
      )}
    </main>
  );
}
