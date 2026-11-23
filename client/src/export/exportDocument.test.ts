import { AGE_BANDS } from '../content/activities';
import { filledDraft, FICTIONAL_NARRATIVE } from '../test/draftFixture';
import {
  EXPORT_HEADINGS,
  EXPORT_LABEL,
  NOT_ANSWERED,
  PARENT_DOES_NOT_KNOW,
  buildExportDocument,
  localIsoDate,
  type ExportBlock,
} from './exportDocument';

const NOW = new Date(2026, 10, 22, 9, 30); // 22 Nov 2026, local time

const texts = (blocks: ExportBlock[]) => blocks.map((b) => b.text);
const headings = (blocks: ExportBlock[]) => blocks.filter((b) => b.kind === 'heading').map((b) => b.text);

describe('AC-12: export content (spec 4.8 order)', () => {
  it('AC-12: has title, age, date and the parent-reported / AI-assistance label first', () => {
    const blocks = buildExportDocument(filledDraft(), NOW);
    expect(blocks.slice(0, 4)).toEqual([
      { kind: 'title', text: 'My Child’s Story' },
      { kind: 'meta', text: 'Child’s age: 2.5 years' },
      { kind: 'meta', text: 'Date: 2026-11-22' },
      { kind: 'label', text: EXPORT_LABEL },
    ]);
    expect(EXPORT_LABEL).toBe(
      'Parent-reported; not independently verified. Organized with AI assistance and reviewed by the parent.',
    );
  });

  it('AC-12: lists populated categories in the fixed order, then questions, parent fields and activity', () => {
    const blocks = buildExportDocument(filledDraft(), NOW);
    expect(headings(blocks)).toEqual([
      'Main Concerns',
      'Strengths',
      'Medical and Health',
      'Other',
      EXPORT_HEADINGS.clarifications,
      EXPORT_HEADINGS.parentQuestions,
      EXPORT_HEADINGS.visitExpectations,
      EXPORT_HEADINGS.activity,
    ]);
    expect(blocks).toContainEqual({ kind: 'bullet', text: 'He was born at 36 weeks.' });
    expect(texts(blocks).join('\n')).not.toMatch(/\bnormal\b|\bdelayed\b|\babsent\b/i);
  });

  it('AC-12: marks clarification answers: answered, I don’t know, and not answered', () => {
    const draft = filledDraft({
      clarificationAnswers: {
        q1: { status: 'answered', answer: 'Mama, dede and ball.' },
        q2: { status: 'unknown' },
      },
    });
    let blocks = buildExportDocument(draft, NOW);
    expect(texts(blocks)).toContain('Answer: Mama, dede and ball.');
    expect(texts(blocks)).toContain(PARENT_DOES_NOT_KNOW);

    blocks = buildExportDocument(filledDraft({ clarificationAnswers: { q2: { status: 'skipped' } } }), NOW);
    expect(texts(blocks).filter((t) => t === NOT_ANSWERED)).toHaveLength(2);

    // An "answered" choice with no text counts as not answered.
    blocks = buildExportDocument(filledDraft({ clarificationAnswers: { q1: { status: 'answered', answer: '  ' } } }), NOW);
    expect(texts(blocks).filter((t) => t === NOT_ANSWERED)).toHaveLength(2);
  });

  it('AC-12: copies parent questions and expectations verbatim, line by line', () => {
    const blocks = buildExportDocument(filledDraft(), NOW);
    expect(texts(blocks)).toEqual(
      expect.arrayContaining([
        'How can we help him talk more?',
        'Should we change anything at home?',
        'A plan we can use at home.',
      ]),
    );
  });

  it('AC-12: omits empty parent fields and an unselected activity', () => {
    const blocks = buildExportDocument(
      filledDraft({ parentQuestions: ' ', visitExpectations: '', activity: null }),
      NOW,
    );
    expect(headings(blocks)).not.toContain(EXPORT_HEADINGS.parentQuestions);
    expect(headings(blocks)).not.toContain(EXPORT_HEADINGS.visitExpectations);
    expect(headings(blocks)).not.toContain(EXPORT_HEADINGS.activity);
  });

  it('AC-17: records the chosen option, its age-band example, status and notes exactly', () => {
    const blocks = buildExportDocument(filledDraft(), NOW);
    expect(texts(blocks)).toEqual(
      expect.arrayContaining([
        'Chosen: Connect',
        `Example for 2 years (24 to 35 months): ${AGE_BANDS.find((b) => b.id === '24_35m')?.examples.connect}`,
        'Status: Tried it',
        'Notes: He pointed at the ball.',
      ]),
    );
    expect(headings(blocks)).toContain('In the meantime, connect, play and talk');

    const couldNot = buildExportDocument(
      filledDraft({ ageText: '14', activity: { activityId: 'play', status: 'could_not_try', notes: '' } }),
      NOW,
    );
    expect(texts(couldNot)).toEqual(
      expect.arrayContaining([
        'Chosen: Play',
        'Example for 13 to 18 years: Do something together that your teen enjoys, such as cooking, a game, music or a walk, and let them lead.',
        'Status: Couldn’t try it',
      ]),
    );
    expect(texts(couldNot).some((t) => t.startsWith('Notes:'))).toBe(false);
    expect(texts(couldNot).join('\n')).not.toContain('{');
  });

  it('uses singular units for an age of 1', () => {
    expect(texts(buildExportDocument(filledDraft({ ageText: '1', ageUnit: 'years' }), NOW))).toContain(
      'Child’s age: 1 year',
    );
    expect(texts(buildExportDocument(filledDraft({ ageText: '18', ageUnit: 'months' }), NOW))).toContain(
      'Child’s age: 18 months',
    );
  });
});

describe('AC-13: original narrative appendix', () => {
  it('AC-13: is absent when the checkbox is unchecked (the default)', () => {
    const blocks = buildExportDocument(filledDraft(), NOW);
    expect(headings(blocks)).not.toContain(EXPORT_HEADINGS.appendix);
    expect(texts(blocks).join('\n')).not.toContain('Señor Niño is his favorite song.');
  });

  it('AC-13: when checked, appends the exact original text at the end', () => {
    const blocks = buildExportDocument(filledDraft({ includeOriginalNarrative: true }), NOW);
    const start = blocks.findIndex((b) => b.text === EXPORT_HEADINGS.appendix);
    expect(start).toBeGreaterThan(0);
    const appendix = blocks.slice(start + 1);
    expect(appendix.every((b) => b.kind === 'paragraph')).toBe(true);
    expect(texts(appendix).join('\n')).toBe(FICTIONAL_NARRATIVE);
  });
});

describe('AC-14: local date', () => {
  it('AC-14: formats the browser-local date as YYYY-MM-DD', () => {
    expect(localIsoDate(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-22');
    expect(localIsoDate(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});
