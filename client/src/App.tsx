import { useEffect, useRef, useState } from 'react';
import type { ClarificationId, OrganizeStoryRequest } from '@my-childs-story/shared';
import { organizeStoryRequest, type OrganizeOutcome } from './api/organizeStory';
import { Notices } from './components/Notices';
import { emptyDraft, type Draft } from './draft/draft';
import { DraftControls } from './draft/DraftControls';
import { clearDraft, hasContent, loadDraft, saveDraft } from './draft/storage';
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
  const [restored] = useState(loadDraft);
  const [draft, setDraft] = useState<Draft>(() => restored ?? emptyDraft());
  const [storageWorks, setStorageWorks] = useState(true);
  const [cleared, setCleared] = useState(false);
  /** Bumped on Clear My Information so every form remounts empty. */
  const [resetKey, setResetKey] = useState(0);
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

  // Autosave to this tab's sessionStorage after every change (AC-15).
  const content = hasContent(draft);
  useEffect(() => {
    if (content) {
      setStorageWorks(saveDraft(draft));
      setCleared(false);
    } else {
      clearDraft();
    }
  }, [draft, content]);

  // Warn before closing the tab while there is a story; recovery is not guaranteed.
  useEffect(() => {
    if (!content) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [content]);

  const clearEverything = () => {
    clearDraft();
    setDraft(emptyDraft());
    setRequest({ status: 'idle' });
    setPendingRegenerate(null);
    setResetKey((k) => k + 1);
    setCleared(true);
  };

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
      {restored && hasContent(restored) && !cleared && draft === restored && (
        <p className="status restored" role="status">
          We brought back the draft from this tab.
        </p>
      )}
      {cleared && (
        <p className="status" role="status">
          Your information has been cleared from this tab.
        </p>
      )}

      <div key={resetKey} className="screen">
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
            ageText={draft.ageText}
            ageUnit={draft.ageUnit}
            childPronoun={draft.childPronoun}
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
            childPronoun={draft.childPronoun}
            onChildPronounChange={(childPronoun) => update({ childPronoun })}
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
      </div>

      <DraftControls draft={draft} storageWorks={storageWorks} onClear={clearEverything} />
    </main>
  );
}
