import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ChildPronoun } from '@my-childs-story/shared';
import { afterEach, vi } from 'vitest';
import { App } from './App';
import {
  ACTIVITY_HEADING,
  ACTIVITY_OPTIONS,
  AGE_BANDS,
  FIVE_STEPS,
  fillPronouns,
} from './content/activities';
import { buildDraftText } from './draft/draftText';
import { loadDraft, STORAGE_KEY } from './draft/storage';
import { buildExportDocument } from './export/exportDocument';
import { filledDraft } from './test/draftFixture';
import { fillValidStory, jsonResponse, mockFetch, sampleResult } from './test/helpers';

afterEach(() => vi.unstubAllGlobals());

const NOW = new Date(2026, 10, 22);
const childSelect = () => screen.getByLabelText('My child is:') as HTMLSelectElement;
const PRONOUNS: Array<ChildPronoun | null> = ['she', 'he', null];

async function organizeAs(choice: '' | 'she' | 'he', age = '14', unit: 'months' | 'years' = 'months') {
  const fetchMock = mockFetch(jsonResponse(200, sampleResult()));
  render(<App />);
  fillValidStory(undefined, age, unit);
  if (choice) fireEvent.change(childSelect(), { target: { value: choice } });
  fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
  await screen.findByRole('heading', { name: 'Your organized story' });
  return fetchMock;
}

function chooseOption(name: string) {
  const s = screen.getByRole('region', { name: ACTIVITY_HEADING });
  fireEvent.click(within(s).getByRole('radio', { name }));
  return s;
}

describe('“My child is:” selector (spec 4.1)', () => {
  it('is optional, next to the age, and defaults to prefer not to say', () => {
    render(<App />);
    expect(childSelect()).toHaveValue('');
    expect(within(childSelect()).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'prefer not to say',
      'a girl',
      'a boy',
    ]);
  });

  it('is not required: a valid story organizes without choosing', async () => {
    const fetchMock = await organizeAs('');
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty('childPronoun');
  });

  it.each([
    ['she', 'she'],
    ['he', 'he'],
  ] as const)('sends childPronoun "%s" when chosen', async (choice, sent) => {
    const fetchMock = await organizeAs(choice);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.childPronoun).toBe(sent);
  });
});

describe('Example text pronouns', () => {
  // 12–23 months, Talk: "...answer in {their} own way."
  const talk = AGE_BANDS.find((b) => b.id === '12_23m')?.examples.talk ?? '';

  it.each([
    ['she', 'answer in her own way'],
    ['he', 'answer in his own way'],
    ['', 'answer in their own way'],
  ] as const)('choice %j fills {their} as %j and changes no other word', async (choice, expected) => {
    await organizeAs(choice);
    const s = chooseOption('Talk');
    const shown = within(s).getByText(/Pause and let your child answer in/);
    expect(shown).toHaveTextContent(expected);
    // Every other word stays exactly as written.
    expect(shown.textContent?.replace(/\b(her|his|their)\b/, '{their}')).toContain(talk);
  });

  it.each([
    ['she', 'let her lead'],
    ['he', 'let him lead'],
    ['', 'let them lead'],
  ] as const)('choice %j fills {them} as %j (13–18 years, Play)', async (choice, expected) => {
    await organizeAs(choice, '15', 'years');
    const s = chooseOption('Play');
    expect(within(s).getByText(/your teen enjoys/)).toHaveTextContent(expected);
  });

  it('fillPronouns maps girl → her/her, boy → him/his, default → them/their', () => {
    const text = 'let {them} go in {their} own way';
    expect(fillPronouns(text, 'she')).toBe('let her go in her own way');
    expect(fillPronouns(text, 'he')).toBe('let him go in his own way');
    expect(fillPronouns(text, 'they')).toBe('let them go in their own way');
    expect(fillPronouns(text)).toBe('let them go in their own way');
  });

  it('no "{" placeholder reaches the screen for any option and choice', async () => {
    for (const choice of ['she', 'he', ''] as const) {
      await organizeAs(choice, '5', 'months');
      document.querySelector('details')?.setAttribute('open', '');
      for (const option of ACTIVITY_OPTIONS) {
        chooseOption(option.label);
        expect(document.body.textContent).not.toContain('{');
      }
      document.body.innerHTML = '';
      window.sessionStorage.clear();
    }
  });
});

describe('Export and draft', () => {
  it.each([
    ['she', 'Child’s age: 2.5 years · Girl'],
    ['he', 'Child’s age: 2.5 years · Boy'],
    [null, 'Child’s age: 2.5 years'],
  ] as const)('export header for %j is %j', (childPronoun, header) => {
    const blocks = buildExportDocument(filledDraft({ childPronoun }), NOW);
    expect(blocks[1]).toEqual({ kind: 'meta', text: header });
  });

  it('no "{" placeholder reaches any export, for every band, option and choice', () => {
    for (const band of AGE_BANDS) {
      const months = { under_12m: '6', '12_23m': '18', '24_35m': '30', '3_5y': '48', '6_12y': '100', '13_18y': '200' }[band.id];
      for (const option of ACTIVITY_OPTIONS) {
        for (const childPronoun of PRONOUNS) {
          const draft = filledDraft({
            ageText: months,
            ageUnit: 'months',
            childPronoun,
            activity: { activityId: option.id, status: 'tried', notes: '' },
          });
          const text = buildExportDocument(draft, NOW)
            .map((b) => b.text)
            .join('\n');
          expect(text).not.toContain('{');
          expect(text).toContain(fillPronouns(band.examples[option.id], childPronoun ?? 'they'));
          expect(buildDraftText(draft, NOW)).not.toContain('{');
        }
      }
    }
    for (const step of FIVE_STEPS.steps) {
      for (const p of ['she', 'he', 'they'] as const) expect(fillPronouns(step.text, p)).not.toContain('{');
    }
  });

  it('keeps the choice in the tab draft (sessionStorage)', () => {
    render(<App />);
    fireEvent.change(childSelect(), { target: { value: 'he' } });
    expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}').childPronoun).toBe('he');
    expect(loadDraft()?.childPronoun).toBe('he');
  });

  it('treats an older saved draft without the field as prefer not to say', () => {
    const { childPronoun: _omit, ...old } = filledDraft();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(old));
    expect(loadDraft()?.childPronoun).toBeNull();
  });
});
