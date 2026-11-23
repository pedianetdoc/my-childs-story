/**
 * Read-only categorized preview — spec 4.4, 4.7 and section 5 step 4
 * (AC-03, AC-07, AC-11). Only populated categories, in the fixed order, with
 * their display labels. Empty categories are omitted and never described.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { CATEGORIES, type ClarificationId, type OrganizeStoryResult } from '@my-childs-story/shared';
import { PARENT_REPORTED_LABEL } from '../content/notices';
import type { ActivityResponse } from '../draft/draft';
import { ActivityPicker } from './ActivityPicker';
import {
  ClarificationQuestions,
  type ClarificationAnswer,
  type ClarificationAnswers,
} from './ClarificationQuestions';

type Props = {
  result: OrganizeStoryResult;
  answers: ClarificationAnswers;
  onAnswerChange: (id: ClarificationId, answer: ClarificationAnswer) => void;
  parentQuestions: string;
  onParentQuestionsChange: (value: string) => void;
  visitExpectations: string;
  onVisitExpectationsChange: (value: string) => void;
  activity: ActivityResponse | null;
  onActivityChange: (activity: ActivityResponse | null) => void;
  onEdit: () => void;
  /** Rendered after the parent's fields (e.g. downloads). */
  children?: ReactNode;
};

export function Preview(props: Props) {
  const { result } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const populated = CATEGORIES.filter((c) => result.categories[c.key].length > 0);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="preview" aria-labelledby="preview-heading">
      <h2 id="preview-heading" ref={headingRef} tabIndex={-1}>
        Your organized story
      </h2>
      <p className="parent-reported-label">{PARENT_REPORTED_LABEL}</p>
      <p className="hint">
        These are your own words, sorted into topics. Please check them. To change anything, use
        Edit My Story.
      </p>

      {populated.length === 0 ? (
        <p className="empty-result">
          None of your sentences were placed into topics. You can use Edit My Story and try again.
        </p>
      ) : (
        <div className="categories">
          {populated.map((category) => (
            <section
              key={category.key}
              className="category"
              aria-labelledby={`category-${category.key}`}
              data-category={category.key}
            >
              <h3 id={`category-${category.key}`}>{category.label}</h3>
              <ul>
                {result.categories[category.key].map((item, index) => (
                  <li key={index}>{item.text}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ClarificationQuestions
        questions={result.clarificationQuestions}
        answers={props.answers}
        onChange={props.onAnswerChange}
      />

      <section className="parent-notes" aria-labelledby="parent-notes-heading">
        <h3 id="parent-notes-heading">For your appointment</h3>
        <div className="field">
          <label htmlFor="parent-questions">Questions you want to ask the doctor</label>
          <textarea
            id="parent-questions"
            rows={4}
            value={props.parentQuestions}
            onChange={(e) => props.onParentQuestionsChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="visit-expectations">What you hope to get from this visit</label>
          <textarea
            id="visit-expectations"
            rows={4}
            value={props.visitExpectations}
            onChange={(e) => props.onVisitExpectationsChange(e.target.value)}
          />
        </div>
      </section>

      <ActivityPicker activity={props.activity} onChange={props.onActivityChange} />

      {props.children}

      <button type="button" className="button button-secondary" onClick={props.onEdit}>
        Edit My Story
      </button>
    </section>
  );
}
