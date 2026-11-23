import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CATEGORIES } from '@my-childs-story/shared';
import { afterEach, vi } from 'vitest';
import { App, REGENERATE_WARNING } from './App';
import { FICTIONAL_DATA_NOTICE, PARENT_REPORTED_LABEL, SAFETY_NOTICE } from './content/notices';
import { STORY, emptyCategories, field, fillValidStory, jsonResponse, mockFetch, sampleResult } from './test/helpers';
import type { OrganizeStoryResult } from '@my-childs-story/shared';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function organizeTo(result: OrganizeStoryResult = sampleResult(), ...more: Response[]) {
  const fetchMock = mockFetch(jsonResponse(200, result), ...more);
  render(<App />);
  fillValidStory();
  fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
  await screen.findByRole('heading', { name: 'Your organized story' });
  return fetchMock;
}

function categoryHeadings() {
  return within(screen.getByRole('region', { name: 'Your organized story' }))
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);
}

describe('AC-03: preview shows populated categories only, in the fixed order', () => {
  it('AC-03: renders only populated categories with their display labels, in spec order', async () => {
    await organizeTo();
    expect(categoryHeadings()).toEqual([
      'Main Concerns',
      'Strengths',
      'Medical and Health',
      'Other',
      'Optional questions',
      'For your appointment',
    ]);
    expect(screen.getByText('He was born at 36 weeks.')).toBeInTheDocument();
  });

  it('AC-03: keeps the fixed order even when the response lists items for every category', async () => {
    const result = sampleResult();
    for (const c of CATEGORIES) {
      result.categories[c.key] = [{ text: `${c.label} item.`, sourceQuote: `${c.label} item.` }];
    }
    result.clarificationQuestions = [];
    await organizeTo(result);
    expect(categoryHeadings().slice(0, 10)).toEqual(CATEGORIES.map((c) => c.label));
  });

  it('AC-03: never describes empty categories as normal, delayed or absent', async () => {
    await organizeTo();
    expect(document.body).not.toHaveTextContent(/\bnormal\b|\bdelayed\b|\babsent\b/i);
    expect(screen.queryByRole('heading', { name: 'Movement' })).not.toBeInTheDocument();
  });

  it('shows a calm message when nothing was placed into categories', async () => {
    const result = sampleResult();
    result.categories = emptyCategories();
    result.clarificationQuestions = [];
    await organizeTo(result);
    expect(screen.getByText(/None of your sentences were placed into topics/)).toBeInTheDocument();
  });

  it('renders generated text as plain text, never as HTML', async () => {
    const result = sampleResult();
    result.categories.strengths = [{ text: '<b>He loves</b> <img src=x onerror=alert(1)>', sourceQuote: 'x' }];
    await organizeTo(result);
    expect(screen.getByText('<b>He loves</b> <img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('.preview img, .preview b')).toBeNull();
  });

  it('shows the parent-reported label (spec 5 step 4)', async () => {
    await organizeTo();
    expect(screen.getByText(PARENT_REPORTED_LABEL)).toBeVisible();
  });

  it('AC-19: shows the fictional-data notice and safety notice on the preview screen', async () => {
    await organizeTo();
    expect(screen.getByText(FICTIONAL_DATA_NOTICE)).toBeVisible();
    expect(screen.getByText(SAFETY_NOTICE)).toBeVisible();
  });

  it('is read-only: no editable field holds the organized statements', async () => {
    await organizeTo();
    for (const box of screen.getAllByRole('textbox')) {
      expect((box as HTMLTextAreaElement).value).not.toContain('He loves stacking blocks.');
    }
  });
});

describe('AC-07: clarification questions', () => {
  it('AC-07: shows each question with its reason as helper text', async () => {
    await organizeTo();
    const group = screen.getByRole('group', { name: 'Which words does he say now?' });
    expect(group).toHaveAccessibleDescription('The story says “a few words” but not which ones.');
    expect(screen.getByRole('group', { name: 'When did you first notice this?' })).toBeInTheDocument();
  });

  it('AC-07: answer, I don’t know and skip all work', async () => {
    await organizeTo();
    const q1 = screen.getByRole('group', { name: 'Which words does he say now?' });

    fireEvent.click(within(q1).getByRole('radio', { name: 'Answer' }));
    const answer = within(q1).getByLabelText('Your answer');
    fireEvent.change(answer, { target: { value: 'Mama, dede and ball.' } });
    expect(answer).toHaveValue('Mama, dede and ball.');

    fireEvent.click(within(q1).getByRole('radio', { name: 'I don’t know' }));
    expect(within(q1).getByRole('radio', { name: 'I don’t know' })).toBeChecked();
    expect(within(q1).queryByLabelText('Your answer')).not.toBeInTheDocument();

    fireEvent.click(within(q1).getByRole('radio', { name: 'Answer' }));
    expect(within(q1).getByLabelText('Your answer')).toHaveValue('Mama, dede and ball.');

    fireEvent.click(within(q1).getByRole('radio', { name: 'Skip' }));
    expect(within(q1).getByRole('radio', { name: 'Skip' })).toBeChecked();

    const q2 = screen.getByRole('group', { name: 'When did you first notice this?' });
    expect(within(q2).getByRole('radio', { name: 'Skip' })).not.toBeChecked();
  });

  it('AC-07: shows no question section when there are no questions', async () => {
    const result = sampleResult();
    result.clarificationQuestions = [];
    await organizeTo(result);
    expect(screen.queryByRole('heading', { name: 'Optional questions' })).not.toBeInTheDocument();
  });
});

describe('AC-11: Edit My Story and regeneration', () => {
  async function organizedWithNotes() {
    const regenerated = sampleResult();
    regenerated.categories.strengths = [{ text: 'He also likes music.', sourceQuote: 'He also likes music.' }];
    const fetchMock = await organizeTo(sampleResult(), jsonResponse(200, regenerated));
    fireEvent.change(screen.getByLabelText('Questions you want to ask the doctor'), {
      target: { value: 'How can we help him talk more?' },
    });
    fireEvent.change(screen.getByLabelText('What you hope to get from this visit'), {
      target: { value: 'A plan for home.' },
    });
    const q1 = screen.getByRole('group', { name: 'Which words does he say now?' });
    fireEvent.click(within(q1).getByRole('radio', { name: 'I don’t know' }));
    return fetchMock;
  }

  it('AC-11: Edit My Story returns to the filled-in story', async () => {
    await organizedWithNotes();
    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    expect(field.story().value).toBe(STORY);
    expect(field.age().value).toBe('3');
  });

  it('AC-11: warns before regenerating and sends nothing until confirmed', async () => {
    const fetchMock = await organizedWithNotes();
    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    fireEvent.change(field.story(), { target: { value: `${STORY} He also likes music.` } });
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story again' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Organize your story again?' });
    expect(dialog).toHaveTextContent(REGENERATE_WARNING);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(field.story().value).toBe(`${STORY} He also likes music.`);
  });

  it('AC-11: regenerating replaces categories and answers but keeps parent questions and expectations', async () => {
    const fetchMock = await organizedWithNotes();
    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    fireEvent.change(field.story(), { target: { value: `${STORY} He also likes music.` } });
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, organize again' }));

    await screen.findByText('He also likes music.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('He loves stacking blocks.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Questions you want to ask the doctor')).toHaveValue(
      'How can we help him talk more?',
    );
    expect(screen.getByLabelText('What you hope to get from this visit')).toHaveValue('A plan for home.');
    const q1 = screen.getByRole('group', { name: 'Which words does he say now?' });
    expect(within(q1).getByRole('radio', { name: 'I don’t know' })).not.toBeChecked();
  });

  it('AC-11: a failed regeneration keeps the previous organized story', async () => {
    mockFetch(jsonResponse(200, sampleResult()), jsonResponse(504, {}));
    render(<App />);
    fillValidStory();
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
    await screen.findByRole('heading', { name: 'Your organized story' });

    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, organize again' }));
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: 'Back to my organized story' }));
    await waitFor(() => expect(screen.getByText('He loves stacking blocks.')).toBeInTheDocument());
  });

  it('Back to my organized story returns without a new request', async () => {
    const fetchMock = await organizedWithNotes();
    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to my organized story' }));
    expect(screen.getByRole('heading', { name: 'Your organized story' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const q1 = screen.getByRole('group', { name: 'Which words does he say now?' });
    expect(within(q1).getByRole('radio', { name: 'I don’t know' })).toBeChecked();
  });
});
