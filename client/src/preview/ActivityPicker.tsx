/**
 * "In the meantime, connect, play and talk" — one optional serve-and-return
 * activity (spec section 5 step 5, AC-17). Clinician-approved text from
 * content/activities.ts. The age only chooses which example to show.
 */
import type { ActivityId, ActivityStatus, AgeUnit } from '@my-childs-story/shared';
import {
  ACTIVITY_HEADING,
  ACTIVITY_INTRO,
  ACTIVITY_INTRO_EMPHASIS,
  ACTIVITY_NOTES_PROMPT,
  ACTIVITY_OPTIONS,
  ACTIVITY_STATUS_LABELS,
  CHOOSE_HEADING,
  FIVE_STEPS,
  SERVE_AND_RETURN,
  WHY_IT_MATTERS,
  ageBandFor,
  fillPronouns,
  type ExamplePronoun,
} from '../content/activities';
import type { ActivityResponse } from '../draft/draft';

export const NO_AGE_BAND =
  'Enter your child’s age on the story screen to see an example for your child’s age.';

type Props = {
  activity: ActivityResponse | null;
  onChange: (activity: ActivityResponse | null) => void;
  ageText: string;
  ageUnit: AgeUnit;
  pronoun?: ExamplePronoun;
};

const STATUSES = Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[];

export function ActivityPicker({ activity, onChange, ageText, ageUnit, pronoun = 'they' }: Props) {
  const band = ageBandFor(ageText, ageUnit);
  const fill = (text: string) => fillPronouns(text, pronoun);

  const choose = (id: ActivityId | 'none') => {
    if (id === 'none') onChange(null);
    // Switching option keeps the status and notes the parent already wrote.
    else onChange({ activityId: id, status: activity?.status ?? 'not_yet', notes: activity?.notes ?? '' });
  };

  return (
    <section className="activity" aria-labelledby="activity-heading">
      <h3 id="activity-heading">{ACTIVITY_HEADING}</h3>
      <p>
        {ACTIVITY_INTRO.slice(0, ACTIVITY_INTRO.lastIndexOf(ACTIVITY_INTRO_EMPHASIS))}
        <strong>{ACTIVITY_INTRO_EMPHASIS}</strong>.
      </p>

      <details className="serve-return">
        <summary>{SERVE_AND_RETURN.heading}</summary>
        <div className="serve-return-body">
          <p>{SERVE_AND_RETURN.text}</p>
          <h4>{WHY_IT_MATTERS.heading}</h4>
          <p>{WHY_IT_MATTERS.text}</p>
          <p>
            {WHY_IT_MATTERS.link.before}
            <a href={WHY_IT_MATTERS.link.href} target="_blank" rel="noopener noreferrer">
              {WHY_IT_MATTERS.link.text}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            {WHY_IT_MATTERS.link.after}
          </p>
          <h4>{FIVE_STEPS.heading}</h4>
          <ol>
            {FIVE_STEPS.steps.map((step) => (
              <li key={step.label}>
                <strong>{step.label}</strong> {fill(step.text)}
              </li>
            ))}
          </ol>
          <p>{FIVE_STEPS.closing}</p>
        </div>
      </details>

      <fieldset className="plain-fieldset">
        <legend className="field-legend">{CHOOSE_HEADING}</legend>
        <div className="choice-row">
          <label className="choice">
            <input
              type="radio"
              name="activity"
              value="none"
              checked={activity === null}
              onChange={() => choose('none')}
            />
            <span>None for now</span>
          </label>
          {ACTIVITY_OPTIONS.map((option) => (
            <label key={option.id} className="choice">
              <input
                type="radio"
                name="activity"
                value={option.id}
                checked={activity?.activityId === option.id}
                onChange={() => choose(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {activity && (
        <>
          {band ? (
            <div className="activity-example" aria-live="polite">
              <p className="hint">Example for {band.label}</p>
              <p>
                <strong>{ACTIVITY_OPTIONS.find((o) => o.id === activity.activityId)?.label}:</strong>{' '}
                {fill(band.examples[activity.activityId])}
              </p>
            </div>
          ) : (
            <p className="hint">{NO_AGE_BAND}</p>
          )}
          <fieldset className="plain-fieldset">
            <legend className="field-legend">After you try it</legend>
            <div className="choice-row">
              {STATUSES.map((status) => (
                <label key={status} className="choice">
                  <input
                    type="radio"
                    name="activity-status"
                    value={status}
                    checked={activity.status === status}
                    onChange={() => onChange({ ...activity, status })}
                  />
                  <span>{ACTIVITY_STATUS_LABELS[status]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="activity-notes">{ACTIVITY_NOTES_PROMPT}</label>
            <textarea
              id="activity-notes"
              rows={3}
              value={activity.notes}
              onChange={(e) => onChange({ ...activity, notes: e.target.value })}
            />
          </div>
        </>
      )}
    </section>
  );
}
