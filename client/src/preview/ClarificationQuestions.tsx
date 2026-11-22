/**
 * Optional clarification questions — spec section 5 step 4, AC-07.
 * Each question offers answer / I don't know / skip; its reason is helper text.
 * All generated text is rendered as plain text.
 */
import type { Clarification, ClarificationAnswerStatus, ClarificationId } from '@my-childs-story/shared';

/** `answer` is kept while switching status, but only counts when status is "answered". */
export type ClarificationAnswer = { status: ClarificationAnswerStatus; answer?: string };
export type ClarificationAnswers = Partial<Record<ClarificationId, ClarificationAnswer>>;

const OPTIONS: ReadonlyArray<{ status: ClarificationAnswerStatus; label: string }> = [
  { status: 'answered', label: 'Answer' },
  { status: 'unknown', label: 'I don’t know' },
  { status: 'skipped', label: 'Skip' },
];

type Props = {
  questions: Clarification[];
  answers: ClarificationAnswers;
  onChange: (id: ClarificationId, answer: ClarificationAnswer) => void;
};

export function ClarificationQuestions({ questions, answers, onChange }: Props) {
  if (questions.length === 0) return null;
  return (
    <section className="clarifications" aria-labelledby="clarifications-heading">
      <h3 id="clarifications-heading">Optional questions</h3>
      <p className="hint">
        These may help your doctor understand your story. Answer, choose “I don’t know”, or skip.
      </p>
      {questions.map((q) => {
        const current = answers[q.id];
        const reasonId = `${q.id}-reason`;
        return (
          <fieldset key={q.id} className="clarification" aria-describedby={reasonId}>
            <legend>{q.question}</legend>
            <p className="hint" id={reasonId}>
              {q.reason}
            </p>
            <div className="choice-row">
              {OPTIONS.map((option) => (
                <label key={option.status} className="choice">
                  <input
                    type="radio"
                    name={`${q.id}-status`}
                    value={option.status}
                    checked={current?.status === option.status}
                    onChange={() =>
                      // Keep any typed answer when switching, so the parent's text is never
                      // lost; it only counts while the status is "answered".
                      onChange(q.id, {
                        status: option.status,
                        ...(current?.answer !== undefined && { answer: current.answer }),
                      })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {current?.status === 'answered' && (
              <div className="field">
                <label htmlFor={`${q.id}-answer`}>Your answer</label>
                <textarea
                  id={`${q.id}-answer`}
                  rows={3}
                  value={current.answer ?? ''}
                  onChange={(e) => onChange(q.id, { status: 'answered', answer: e.target.value })}
                />
              </div>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}
