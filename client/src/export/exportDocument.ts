/**
 * Builds the export content once, as plain blocks, from the draft — spec 4.8.
 * Both the DOCX and the PDF render these same blocks, so the two files always
 * match (AC-12, AC-13, AC-17). All text is the parent's or the validated
 * result's, copied as plain text; nothing is generated here.
 */
import { CATEGORIES } from '@my-childs-story/shared';
import {
  ACTIVITY_HEADING,
  ACTIVITY_STATUS_LABELS,
  CHILD_OPTIONS,
  activityLabel,
  ageBandFor,
  fillPronouns,
} from '../content/activities';
import type { Draft } from '../draft/draft';

export type ExportBlock =
  | { kind: 'title'; text: string }
  | { kind: 'meta'; text: string }
  | { kind: 'label'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string };

/** Spec 4.8 item 2, exact wording. */
export const EXPORT_LABEL =
  'Parent-reported; not independently verified. Organized with AI assistance and reviewed by the parent.';

export const EXPORT_HEADINGS = {
  title: 'My Child’s Story',
  clarifications: 'Clarification questions',
  parentQuestions: 'My questions for the doctor',
  visitExpectations: 'What I hope to get from this visit',
  activity: ACTIVITY_HEADING,
  appendix: 'Appendix: Everything I originally wrote',
} as const;

export const NOT_ANSWERED = 'Not answered.';
export const PARENT_DOES_NOT_KNOW = 'Parent doesn’t know.';

/** YYYY-MM-DD in the browser's local time zone. */
export function localIsoDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatAge(draft: Draft): string {
  const value = draft.ageText.trim();
  const singular = value === '1' || value === '1.0';
  const unit = draft.ageUnit === 'months' ? (singular ? 'month' : 'months') : singular ? 'year' : 'years';
  const child = CHILD_OPTIONS.find((o) => o.value === draft.childPronoun)?.exportLabel;
  return child ? `${value} ${unit} · ${child}` : `${value} ${unit}`;
}

/** Splits free text on line breaks so each line stays its own paragraph. */
function lines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

/** Free text the parent typed, verbatim, without leading/trailing blank lines. */
function verbatimParagraphs(text: string): ExportBlock[] {
  const all = lines(text);
  while (all.length > 0 && all[0]?.trim() === '') all.shift();
  while (all.length > 0 && all.at(-1)?.trim() === '') all.pop();
  return all.map((line) => ({ kind: 'paragraph', text: line }));
}

export function buildExportDocument(draft: Draft, now: Date): ExportBlock[] {
  const blocks: ExportBlock[] = [
    { kind: 'title', text: EXPORT_HEADINGS.title },
    { kind: 'meta', text: `Child’s age: ${formatAge(draft)}` },
    { kind: 'meta', text: `Date: ${localIsoDate(now)}` },
    { kind: 'label', text: EXPORT_LABEL },
  ];

  const result = draft.result;
  if (result) {
    for (const category of CATEGORIES) {
      const items = result.categories[category.key];
      if (items.length === 0) continue; // empty categories are omitted, never described
      blocks.push({ kind: 'heading', text: category.label });
      for (const item of items) blocks.push({ kind: 'bullet', text: item.text });
    }

    if (result.clarificationQuestions.length > 0) {
      blocks.push({ kind: 'heading', text: EXPORT_HEADINGS.clarifications });
      for (const q of result.clarificationQuestions) {
        const answer = draft.clarificationAnswers[q.id];
        blocks.push({ kind: 'subheading', text: q.question });
        if (answer?.status === 'answered' && answer.answer?.trim()) {
          blocks.push(...verbatimParagraphs(`Answer: ${answer.answer}`));
        } else if (answer?.status === 'unknown') {
          blocks.push({ kind: 'paragraph', text: PARENT_DOES_NOT_KNOW });
        } else {
          blocks.push({ kind: 'paragraph', text: NOT_ANSWERED });
        }
      }
    }
  }

  if (draft.parentQuestions.trim()) {
    blocks.push({ kind: 'heading', text: EXPORT_HEADINGS.parentQuestions });
    blocks.push(...verbatimParagraphs(draft.parentQuestions));
  }
  if (draft.visitExpectations.trim()) {
    blocks.push({ kind: 'heading', text: EXPORT_HEADINGS.visitExpectations });
    blocks.push(...verbatimParagraphs(draft.visitExpectations));
  }

  if (draft.activity) {
    blocks.push({ kind: 'heading', text: EXPORT_HEADINGS.activity });
    blocks.push({ kind: 'paragraph', text: `Chosen: ${activityLabel(draft.activity.activityId)}` });
    // Age only chooses which example text is shown; it is never interpreted.
    const band = ageBandFor(draft.ageText, draft.ageUnit);
    if (band) {
      blocks.push({
        kind: 'paragraph',
        text: `Example for ${band.label}: ${fillPronouns(band.examples[draft.activity.activityId], draft.childPronoun ?? 'they')}`,
      });
    }
    blocks.push({ kind: 'paragraph', text: `Status: ${ACTIVITY_STATUS_LABELS[draft.activity.status]}` });
    if (draft.activity.notes.trim()) blocks.push(...verbatimParagraphs(`Notes: ${draft.activity.notes}`));
  }

  if (draft.includeOriginalNarrative) {
    blocks.push({ kind: 'heading', text: EXPORT_HEADINGS.appendix });
    // The exact original text, line by line, as written.
    for (const line of lines(draft.originalNarrative)) blocks.push({ kind: 'paragraph', text: line });
  }

  return blocks;
}
