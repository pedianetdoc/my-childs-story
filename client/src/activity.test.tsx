import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { App } from './App';
import {
  ACTIVITY_HEADING,
  ACTIVITY_NOTES_PROMPT,
  AGE_BANDS,
  WHY_IT_MATTERS,
  ageBandFor,
  fillPronouns,
} from './content/activities';
import { NO_AGE_BAND } from './preview/ActivityPicker';
import { field, fillValidStory, jsonResponse, mockFetch, sampleResult } from './test/helpers';

afterEach(() => vi.unstubAllGlobals());

async function toPreview(ageValue = '2.5', unit: 'months' | 'years' = 'years', ...more: Response[]) {
  const fetchMock = mockFetch(jsonResponse(200, sampleResult()), ...more);
  render(<App />);
  fillValidStory(undefined, ageValue, unit);
  fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
  await screen.findByRole('heading', { name: 'Your organized story' });
  return fetchMock;
}

const section = () => screen.getByRole('region', { name: ACTIVITY_HEADING });
const choices = () => within(section()).getByRole('group', { name: 'Choose one way to try it this week' });

describe('Age band (age chooses example text only)', () => {
  it.each([
    ['0', 'months', 'under_12m'],
    ['11.9', 'months', 'under_12m'],
    ['12', 'months', '12_23m'],
    ['23.5', 'months', '12_23m'],
    ['24', 'months', '24_35m'],
    ['2.5', 'years', '24_35m'],
    ['35.9', 'months', '24_35m'],
    ['36', 'months', '3_5y'],
    ['3', 'years', '3_5y'],
    ['5.9', 'years', '3_5y'],
    ['6', 'years', '6_12y'],
    ['155', 'months', '6_12y'],
    ['12.9', 'years', '6_12y'],
    ['13', 'years', '13_18y'],
    ['216', 'months', '13_18y'],
    ['18', 'years', '13_18y'],
  ] as const)('%s %s → %s', (age, unit, band) => {
    expect(ageBandFor(age, unit)?.id).toBe(band);
  });

  it.each([
    ['', 'years'],
    ['abc', 'years'],
    ['19', 'years'],
    ['217', 'months'],
  ] as const)('no band for %j %s', (age, unit) => {
    expect(ageBandFor(age, unit)).toBeNull();
  });

  it('every band has connect, play and talk examples', () => {
    for (const band of AGE_BANDS) {
      expect(Object.keys(band.examples).sort()).toEqual(['connect', 'play', 'talk']);
    }
  });
});

describe('fillPronouns', () => {
  it('replaces only {them} and {their} (default: them / their)', () => {
    expect(fillPronouns('let {them} lead in {their} own way')).toBe('let them lead in their own way');
  });

  it('leaves no placeholder in any example or step', () => {
    for (const band of AGE_BANDS) {
      for (const text of Object.values(band.examples)) expect(fillPronouns(text)).not.toContain('{');
    }
  });
});

describe('AC-17: In the meantime, connect, play and talk', () => {
  it('AC-17: shows the heading, intro and a collapsible serve-and-return explanation', async () => {
    await toPreview();
    const s = section();
    expect(within(s).getByText(/Waiting for your child's appointment can feel long/)).toBeInTheDocument();
    const details = s.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    expect(within(s).getByText('What is serve and return?').tagName).toBe('SUMMARY');
  });

  it('AC-17: links to the Center on the Developing Child in a new tab, safely', async () => {
    await toPreview();
    const link = within(section()).getByRole('link', { name: /Center on the Developing Child at Harvard University/ });
    expect(link).toHaveAttribute('href', WHY_IT_MATTERS.link.href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('AC-17: offers Connect / Play / Talk with none chosen by default', async () => {
    await toPreview();
    const radios = within(choices()).getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['None for now', 'Connect', 'Play', 'Talk']);
    expect(within(choices()).getByRole('radio', { name: 'None for now' })).toBeChecked();
    expect(screen.queryByLabelText(ACTIVITY_NOTES_PROMPT)).not.toBeInTheDocument();
  });

  it('AC-17: shows only the chosen option’s example for the child’s age band', async () => {
    await toPreview('2.5', 'years');
    fireEvent.click(within(choices()).getByRole('radio', { name: 'Play' }));
    const band = AGE_BANDS.find((b) => b.id === '24_35m');
    expect(within(section()).getByText('Example for 2 years (24 to 35 months)')).toBeInTheDocument();
    expect(within(section()).getByText(fillPronouns(band?.examples.play ?? ''))).toBeInTheDocument();
    expect(within(section()).queryByText(fillPronouns(band?.examples.talk ?? ''))).not.toBeInTheDocument();
    // Other age bands are never shown.
    const other = AGE_BANDS.find((b) => b.id === '13_18y');
    expect(within(section()).queryByText(fillPronouns(other?.examples.play ?? ''))).not.toBeInTheDocument();
  });

  it('AC-17: 36 months shows the 3 to 5 years example', async () => {
    await toPreview('36', 'months');
    fireEvent.click(within(choices()).getByRole('radio', { name: 'Talk' }));
    expect(within(section()).getByText('Example for 3 to 5 years')).toBeInTheDocument();
  });

  it('AC-17: records status Not yet / Tried it / Couldn’t try it and notes', async () => {
    await toPreview();
    fireEvent.click(within(choices()).getByRole('radio', { name: 'Connect' }));
    const status = within(section()).getByRole('group', { name: 'After you try it' });
    expect(within(status).getByRole('radio', { name: 'Not yet' })).toBeChecked();
    for (const label of ['Tried it', 'Couldn’t try it', 'Not yet']) {
      fireEvent.click(within(status).getByRole('radio', { name: label }));
      expect(within(status).getByRole('radio', { name: label })).toBeChecked();
    }
    const notes = screen.getByLabelText(ACTIVITY_NOTES_PROMPT);
    fireEvent.change(notes, { target: { value: 'He laughed and pointed at the dog.' } });
    expect(notes).toHaveValue('He laughed and pointed at the dog.');
  });

  it('allows at most one option; switching keeps status and notes; None clears it', async () => {
    await toPreview();
    fireEvent.click(within(choices()).getByRole('radio', { name: 'Play' }));
    fireEvent.click(within(section()).getByRole('radio', { name: 'Tried it' }));
    fireEvent.change(screen.getByLabelText(ACTIVITY_NOTES_PROMPT), { target: { value: 'Ten minutes.' } });

    fireEvent.click(within(choices()).getByRole('radio', { name: 'Talk' }));
    expect(within(choices()).getByRole('radio', { name: 'Play' })).not.toBeChecked();
    expect(within(section()).getByRole('radio', { name: 'Tried it' })).toBeChecked();
    expect(screen.getByLabelText(ACTIVITY_NOTES_PROMPT)).toHaveValue('Ten minutes.');

    fireEvent.click(within(choices()).getByRole('radio', { name: 'None for now' }));
    expect(screen.queryByLabelText(ACTIVITY_NOTES_PROMPT)).not.toBeInTheDocument();
  });

  it('explains when the age cannot choose an example', async () => {
    await toPreview();
    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    fireEvent.change(field.age(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Back to my organized story' }));
    fireEvent.click(within(choices()).getByRole('radio', { name: 'Connect' }));
    expect(within(section()).getByText(NO_AGE_BAND)).toBeInTheDocument();
  });

  it('no placeholder ever reaches the screen', async () => {
    await toPreview();
    section().querySelector('details')?.setAttribute('open', '');
    for (const name of ['Connect', 'Play', 'Talk']) {
      fireEvent.click(within(choices()).getByRole('radio', { name }));
      expect(document.body.textContent).not.toMatch(/\{(them|their)\}/);
    }
  });

  it('AC-11: regeneration keeps the activity, parent questions and expectations', async () => {
    const regenerated = sampleResult();
    regenerated.categories.strengths = [{ text: 'He also likes music.', sourceQuote: 'He also likes music.' }];
    await toPreview('2.5', 'years', jsonResponse(200, regenerated));
    fireEvent.click(within(choices()).getByRole('radio', { name: 'Connect' }));
    fireEvent.click(within(section()).getByRole('radio', { name: 'Tried it' }));
    fireEvent.change(screen.getByLabelText(ACTIVITY_NOTES_PROMPT), { target: { value: 'At lunch.' } });
    fireEvent.change(screen.getByLabelText('Questions you want to ask the doctor'), { target: { value: 'Q?' } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    fireEvent.change(field.story(), { target: { value: `${field.story().value} He also likes music.` } });
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story again' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/activity will be kept/);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, organize again' }));
    await screen.findByText('He also likes music.');

    expect(within(choices()).getByRole('radio', { name: 'Connect' })).toBeChecked();
    expect(within(section()).getByRole('radio', { name: 'Tried it' })).toBeChecked();
    expect(screen.getByLabelText(ACTIVITY_NOTES_PROMPT)).toHaveValue('At lunch.');
    expect(screen.getByLabelText('Questions you want to ask the doctor')).toHaveValue('Q?');
  });
});
