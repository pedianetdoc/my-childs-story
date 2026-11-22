import { useRef, useState } from 'react';
import type { AgeUnit, OrganizeStoryRequest, OrganizeStoryResult } from '@my-childs-story/shared';
import { organizeStoryRequest, type OrganizeOutcome } from './api/organizeStory';
import { Notices } from './components/Notices';
import { StoryForm } from './input/StoryForm';

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

export function App() {
  const [ageText, setAgeText] = useState('');
  const [unit, setUnit] = useState<AgeUnit>('years');
  const [narrative, setNarrative] = useState('');
  const [request, setRequest] = useState<RequestState>({ status: 'idle' });
  const [result, setResult] = useState<OrganizeStoryResult | null>(null);
  // Guards against a second submission before React re-renders the disabled button.
  const inFlight = useRef(false);

  const organize = async (body: OrganizeStoryRequest) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRequest({ status: 'loading' });
    let outcome: OrganizeOutcome;
    try {
      outcome = await organizeStoryRequest(body);
    } finally {
      inFlight.current = false;
    }
    if (outcome.ok) {
      setResult(outcome.result);
      setRequest({ status: 'idle' });
    } else {
      setRequest({ status: 'error', message: outcome.message });
    }
  };

  const loading = request.status === 'loading';

  return (
    <main className="app">
      <header className="app-header">
        <h1>My Child&apos;s Story</h1>
        <p className="subtitle">Make the most of your developmental assessment appointment.</p>
      </header>
      <Notices />
      <StoryForm
        ageText={ageText}
        unit={unit}
        narrative={narrative}
        onAgeTextChange={setAgeText}
        onUnitChange={setUnit}
        onNarrativeChange={setNarrative}
        onSubmit={(body) => void organize(body)}
        busy={loading}
      >
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
        {result && request.status === 'idle' && (
          <p className="status" role="status">
            Your story has been organized.
          </p>
        )}
      </StoryForm>
    </main>
  );
}
