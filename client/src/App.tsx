import { useState } from 'react';
import type { AgeUnit } from '@my-childs-story/shared';
import { Notices } from './components/Notices';
import { StoryForm } from './input/StoryForm';

export function App() {
  const [ageText, setAgeText] = useState('');
  const [unit, setUnit] = useState<AgeUnit>('years');
  const [narrative, setNarrative] = useState('');

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
        onSubmit={() => {
          // Organize My Story request is wired up in the next step.
        }}
      />
    </main>
  );
}
