import { fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { FICTIONAL_DATA_NOTICE, SAFETY_NOTICE } from './content/notices';
import { FICTIONAL_EXAMPLE } from './content/fictionalExample';
import { GUIDING_PROMPTS } from './content/guidingPrompts';
import { LIMIT_MESSAGE } from './input/StoryForm';

function story() {
  return screen.getByLabelText('Your child’s story') as HTMLTextAreaElement;
}
function age() {
  return screen.getByLabelText('Age') as HTMLInputElement;
}
function organize() {
  return screen.getByRole('button', { name: 'Organize My Story' });
}

describe('Start screen', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: "My Child's Story" })).toBeInTheDocument();
  });

  it('AC-19: shows the fictional-data notice and the exact static safety notice', () => {
    render(<App />);
    expect(screen.getByText(FICTIONAL_DATA_NOTICE)).toBeVisible();
    expect(screen.getByText(SAFETY_NOTICE)).toBeVisible();
    expect(SAFETY_NOTICE).toBe(
      'This tool does not check for urgent problems. If your child has lost skills they used to have, has a seizure, or you are worried about their safety, contact a doctor now instead of waiting for your appointment.',
    );
  });

  it('shows each guiding prompt in English with Filipino underneath', () => {
    render(<App />);
    for (const prompt of GUIDING_PROMPTS) {
      const en = screen.getByText(prompt.en);
      const fil = screen.getByText(prompt.fil);
      expect(fil).toHaveAttribute('lang', 'fil');
      expect(en.parentElement).toBe(fil.parentElement);
    }
  });

  it('has labelled age, unit and story fields', () => {
    render(<App />);
    expect(age()).toBeInTheDocument();
    expect(screen.getByLabelText('Age unit')).toHaveValue('years');
    expect(story()).toBeInTheDocument();
  });
});

describe('Story counter and limit', () => {
  it('shows a live X / 5000 counter in Unicode code points after trimming', () => {
    render(<App />);
    expect(screen.getByText('0 / 5000')).toBeInTheDocument();
    fireEvent.change(story(), { target: { value: '  Mahilig siyang sumayaw 🎵  ' } });
    // 24 code points: the emoji counts as one (it is two UTF-16 units), and the
    // surrounding spaces are trimmed.
    expect(screen.getByText('24 / 5000')).toBeInTheDocument();
  });

  it('accepts exactly 5000 characters', () => {
    render(<App />);
    fireEvent.change(story(), { target: { value: 'a'.repeat(5000) } });
    expect(story().value).toHaveLength(5000);
    expect(screen.getByText('5000 / 5000')).toBeInTheDocument();
  });

  it('blocks input past 5000 characters without truncating, and explains the limit', () => {
    render(<App />);
    fireEvent.change(story(), { target: { value: 'a'.repeat(4990) } });
    fireEvent.change(story(), { target: { value: 'a'.repeat(5001) } });
    expect(story().value).toHaveLength(4990);
    expect(screen.getByRole('alert')).toHaveTextContent(LIMIT_MESSAGE);
  });
});

describe('Fictional example', () => {
  it('fills a clearly labelled fictional Taglish story and age', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Use a fictional example' }));
    expect(story().value).toBe(FICTIONAL_EXAMPLE.narrative);
    expect(age().value).toBe('2.5');
    expect(screen.getByRole('note')).toHaveTextContent(/Fictional example — not a real child/);
  });

  it('never replaces text the parent already typed', () => {
    render(<App />);
    fireEvent.change(story(), { target: { value: 'My own made-up story.' } });
    expect(screen.getByRole('button', { name: 'Use a fictional example' })).toBeDisabled();
  });
});

describe('AC-02: client-side validation', () => {
  const validStory = 'He loves stacking blocks and can do it for a long time.';

  function submitWith(ageValue: string, unit: 'months' | 'years', narrative: string) {
    render(<App />);
    fireEvent.change(age(), { target: { value: ageValue } });
    fireEvent.change(screen.getByLabelText('Age unit'), { target: { value: unit } });
    fireEvent.change(story(), { target: { value: narrative } });
    fireEvent.click(organize());
  }

  it.each([
    ['', 'years', 'Please enter your child’s age.'],
    ['abc', 'years', 'Please enter the age as a number, for example 2.5.'],
    ['-1', 'years', 'Please enter the age as a number, for example 2.5.'],
    ['2.55', 'years', 'Please use at most one decimal place (for example, 2.5).'],
    ['19', 'years', 'Please enter an age from 0 to 18 years.'],
    ['217', 'months', 'Please enter an age from 0 to 216 months.'],
  ] as const)('AC-02: age "%s" %s shows an actionable error', (ageValue, unit, message) => {
    submitWith(ageValue, unit, validStory);
    expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    expect(age()).toHaveAttribute('aria-invalid', 'true');
    expect(age()).toHaveFocus();
  });

  it.each([
    ['', 'Please write or dictate your child’s story.'],
    ['     ', 'Please write or dictate your child’s story.'],
    ['Too short story.', 'Please write at least 20 characters.'],
  ])('AC-02: story "%s" shows an actionable error', (narrative, message) => {
    submitWith('3', 'years', narrative);
    expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    expect(story()).toHaveAttribute('aria-invalid', 'true');
  });

  it('AC-02: accepts boundary ages (0, 216 months, 18 years, 2.5 years) without errors', () => {
    for (const [ageValue, unit] of [
      ['0', 'months'],
      ['216', 'months'],
      ['18', 'years'],
      ['2.5', 'years'],
    ] as const) {
      const { unmount } = render(<App />);
      fireEvent.change(age(), { target: { value: ageValue } });
      fireEvent.change(screen.getByLabelText('Age unit'), { target: { value: unit } });
      fireEvent.change(story(), { target: { value: validStory } });
      fireEvent.click(organize());
      expect(screen.queryByText('Please check the highlighted fields:')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('clears a field error once the parent edits that field', () => {
    submitWith('', 'years', validStory);
    fireEvent.change(age(), { target: { value: '3' } });
    expect(age()).not.toHaveAttribute('aria-invalid');
  });
});
