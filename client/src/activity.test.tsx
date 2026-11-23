import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { App } from './App';
import { ACTIVITIES, ACTIVITY_NOTE } from './content/activities';
import { field, fillValidStory, jsonResponse, mockFetch, sampleResult } from './test/helpers';

afterEach(() => vi.unstubAllGlobals());

async function toPreview(...more: Response[]) {
  const fetchMock = mockFetch(jsonResponse(200, sampleResult()), ...more);
  render(<App />);
  fillValidStory();
  fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
  await screen.findByRole('heading', { name: 'Your organized story' });
  return fetchMock;
}

const activitySection = () => screen.getByRole('region', { name: 'One small activity (optional)' });

describe('AC-17: one optional fixed activity', () => {
  it('AC-17: offers exactly the three fixed activities, with none selected by default', async () => {
    await toPreview();
    const section = activitySection();
    expect(within(section).getByText(ACTIVITY_NOTE)).toBeInTheDocument();
    const radios = within(section).getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual([
      'No activity',
      ...ACTIVITIES.map((a) => a.title),
    ]);
    expect(within(section).getByRole('radio', { name: 'No activity' })).toBeChecked();
    expect(within(section).queryByLabelText('Notes (optional)')).not.toBeInTheDocument();
  });

  it('AC-17: records status Not yet / Tried it / Couldn’t try it and notes', async () => {
    await toPreview();
    const section = activitySection();
    fireEvent.click(within(section).getByRole('radio', { name: 'Notice a communication moment' }));
    const status = within(section).getByRole('group', { name: 'How did it go?' });
    expect(within(status).getByRole('radio', { name: 'Not yet' })).toBeChecked();
    for (const label of ['Tried it', 'Couldn’t try it', 'Not yet']) {
      fireEvent.click(within(status).getByRole('radio', { name: label }));
      expect(within(status).getByRole('radio', { name: label })).toBeChecked();
    }
    fireEvent.change(within(section).getByLabelText('Notes (optional)'), {
      target: { value: 'He pointed at the ball and looked at me.' },
    });
    expect(within(section).getByLabelText('Notes (optional)')).toHaveValue(
      'He pointed at the ball and looked at me.',
    );
  });

  it('allows at most one activity; switching keeps status and notes; None clears it', async () => {
    await toPreview();
    const section = activitySection();
    fireEvent.click(within(section).getByRole('radio', { name: 'Try a brief child-led interaction' }));
    fireEvent.click(within(section).getByRole('radio', { name: 'Tried it' }));
    fireEvent.change(within(section).getByLabelText('Notes (optional)'), { target: { value: 'Ten minutes.' } });

    fireEvent.click(within(section).getByRole('radio', { name: 'Notice a communication moment' }));
    expect(within(section).getByRole('radio', { name: 'Try a brief child-led interaction' })).not.toBeChecked();
    expect(within(section).getByRole('radio', { name: 'Tried it' })).toBeChecked();
    expect(within(section).getByLabelText('Notes (optional)')).toHaveValue('Ten minutes.');

    fireEvent.click(within(section).getByRole('radio', { name: 'No activity' }));
    expect(within(section).queryByLabelText('Notes (optional)')).not.toBeInTheDocument();
  });

  it('AC-11: regeneration keeps the activity, parent questions and expectations', async () => {
    const regenerated = sampleResult();
    regenerated.categories.strengths = [{ text: 'He also likes music.', sourceQuote: 'He also likes music.' }];
    await toPreview(jsonResponse(200, regenerated));
    fireEvent.click(within(activitySection()).getByRole('radio', { name: 'Notice a communication moment' }));
    fireEvent.click(within(activitySection()).getByRole('radio', { name: 'Tried it' }));
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'At lunch.' } });
    fireEvent.change(screen.getByLabelText('Questions you want to ask the doctor'), { target: { value: 'Q?' } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit My Story' }));
    fireEvent.change(field.story(), { target: { value: `${field.story().value} He also likes music.` } });
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story again' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/activity will be kept/);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, organize again' }));
    await screen.findByText('He also likes music.');

    expect(within(activitySection()).getByRole('radio', { name: 'Notice a communication moment' })).toBeChecked();
    expect(within(activitySection()).getByRole('radio', { name: 'Tried it' })).toBeChecked();
    expect(screen.getByLabelText('Notes (optional)')).toHaveValue('At lunch.');
    expect(screen.getByLabelText('Questions you want to ask the doctor')).toHaveValue('Q?');
  });
});
